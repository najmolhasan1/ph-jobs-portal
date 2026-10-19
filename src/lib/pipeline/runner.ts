import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Run, Source, SOURCE_KEYS, type SourceDoc, type SourceKey } from "@/lib/models";
import { adapters } from "@/lib/sources";
import { startOfTodayDhaka } from "@/lib/time";
import { expireJobs, processItems, type ProcessStats } from "./process";

// Each platform is checked on its own interval by an always-on worker (scripts/worker.mts):
//   check = ask the platform for posts since the last successful check → gate → dedup → store.
// Published jobs reach open portal tabs within seconds via SSE (/api/jobs/stream).

/** Create a Source row per adapter on first boot. */
export async function ensureSources(): Promise<void> {
  await connectDB();
  for (const key of SOURCE_KEYS) {
    const a = adapters[key];
    await Source.updateOne(
      { key },
      {
        $setOnInsert: {
          key,
          name: a.name,
          config: a.defaultConfig,
          intervalMinutes: a.intervalMinutes,
          enabled: a.enabledByDefault,
        },
      },
      { upsert: true },
    );
  }
}

/** One check of one platform. Safe to call while another check of the same platform is running (it no-ops). */
export async function runCheck(key: SourceKey): Promise<ProcessStats | null> {
  await connectDB();
  // Claim the source so two workers (or a worker and "Check now") never overlap.
  const staleClaim = new Date(Date.now() - 20 * 60_000);
  const source = await Source.findOneAndUpdate(
    { key, $or: [{ state: { $ne: "checking" } }, { lastCheckAt: { $lt: staleClaim } }] },
    { $set: { state: "checking", lastCheckAt: new Date() } },
    { new: true },
  ).lean<SourceDoc>();
  if (!source) return null;

  const adapter = adapters[key];
  const startedAt = new Date();
  // First check of the day starts from midnight: the portal is about today's posts.
  const today = startOfTodayDhaka();
  const since = source.lastSuccessAt && source.lastSuccessAt > today ? source.lastSuccessAt : today;
  const run = await Run.create({ source: key, startedAt, since });

  try {
    const items = await adapter.fetchNew({ since, config: source.config ?? {} });
    const stats = await processItems(key, items, String(run._id));
    await Run.updateOne({ _id: run._id }, { $set: { status: "DONE", finishedAt: new Date(), ...stats } });
    await Source.updateOne(
      { key },
      {
        $set: {
          state: "idle",
          lastSuccessAt: startedAt,
          lastError: null,
          consecutiveFailures: 0,
          nextCheckAt: new Date(Date.now() + (source.intervalMinutes ?? adapter.intervalMinutes) * 60_000),
        },
      },
    );
    return stats;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const retryMs = /usage|billing|upgrad|limit exceeded|isn't enough/i.test(message) ? 30 * 60_000 : 60_000;
    await Run.updateOne({ _id: run._id }, { $set: { status: "FAILED", finishedAt: new Date(), error: message } });
    await Source.updateOne(
      { key },
      {
        $set: { state: "error", lastError: message, nextCheckAt: new Date(Date.now() + retryMs) },
        $inc: { consecutiveFailures: 1 },
      },
    );
    throw e;
  }
}

function log(key: string, msg: string) {
  console.log(`[${new Date().toISOString()}] ${key.padEnd(8)} ${msg}`);
}

/**
 * Always-on mode: one independent loop per platform. Re-reads settings every round, so
 * enabling a source or changing its interval in Admin takes effect without a restart.
 */
const LOCK_STALE_MS = 90_000;

/**
 * Only one worker may run at a time — two would double every check (and every Apify bill).
 * The lock is a heartbeat document; a worker that dies stops refreshing it and the next one
 * can take over after ~90 s.
 */
async function acquireWorkerLock(owner: string): Promise<boolean> {
  const locks = mongoose.connection.db!.collection<{ _id: string; owner: string; pid: number; heartbeatAt: Date }>("locks");
  try {
    await locks.findOneAndUpdate(
      { _id: "worker", $or: [{ owner }, { heartbeatAt: { $lt: new Date(Date.now() - LOCK_STALE_MS) } }] },
      { $set: { owner, pid: process.pid, heartbeatAt: new Date() } },
      { upsert: true },
    );
    return true;
  } catch (e) {
    if ((e as { code?: number }).code === 11000) return false; // held by a live worker
    throw e;
  }
}

async function releaseWorkerLock(owner: string) {
  await mongoose.connection.db?.collection<{ _id: string; owner: string }>("locks").deleteOne({ _id: "worker", owner }).catch(() => undefined);
}

export async function runWorkers(signal?: AbortSignal): Promise<void> {
  await ensureSources();
  const owner = `${process.pid}-${Date.now()}`;
  if (!(await acquireWorkerLock(owner))) {
    const held = await mongoose.connection.db!.collection("locks").findOne({ _id: "worker" as never });
    throw new Error(
      `Another worker is already running (pid ${held?.pid}, last heartbeat ${held?.heartbeatAt?.toISOString?.()}). ` +
        "Stop it first — two workers would double every check and every Apify bill.",
    );
  }
  const lost = new AbortController();
  const heartbeat = setInterval(async () => {
    if (!(await acquireWorkerLock(owner).catch(() => false))) {
      console.error("Worker lock lost to another process — stopping this worker.");
      lost.abort();
    }
  }, 30_000);
  signal?.addEventListener("abort", () => lost.abort(), { once: true });
  signal = lost.signal;
  signal.addEventListener("abort", () => {
    clearInterval(heartbeat);
    void releaseWorkerLock(owner);
  }, { once: true });
  const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
      const t = setTimeout(resolve, ms);
      signal?.addEventListener("abort", () => (clearTimeout(t), resolve()), { once: true });
    });

  const loop = async (key: SourceKey) => {
    while (!signal?.aborted) {
      const s = await Source.findOne({ key }).lean<SourceDoc>();
      const minutes = s?.intervalMinutes ?? adapters[key].intervalMinutes;
      if (!s?.enabled) {
        await sleep(30_000); // check again soon in case it gets switched on
        continue;
      }
      // Respect the schedule across restarts — restarting the worker shouldn't re-run (and
      // re-bill) every platform at once. "Check now" in Admin still runs immediately.
      const wait = s.nextCheckAt ? new Date(s.nextCheckAt).getTime() - Date.now() : 0;
      if (wait > 1000) {
        await sleep(Math.min(wait, minutes * 60_000, 60_000)); // re-read settings at least every minute
        continue;
      }
      const t0 = Date.now();
      try {
        const st = await runCheck(key);
        if (st)
          log(key, `fetched ${st.fetched} → new ${st.created}, review ${st.queued}, dup ${st.merged}, rejected ${st.rejected}, old ${st.stale} (${Math.round((Date.now() - t0) / 1000)}s)`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // Out of Apify credit won't fix itself in a minute — back off instead of hammering the API.
        const billing = /usage|billing|upgrad|limit exceeded|isn't enough/i.test(msg);
        log(key, `check failed: ${msg} — retrying in ${billing ? "30 min" : "1 min"}`);
        await sleep(billing ? 30 * 60_000 : 60_000);
        continue;
      }
      await sleep(Math.max(5_000, minutes * 60_000 - (Date.now() - t0)));
    }
  };

  // Housekeeping: hide expired jobs every 10 minutes.
  const housekeeping = async () => {
    while (!signal?.aborted) {
      await expireJobs().catch(() => undefined);
      await sleep(10 * 60_000);
    }
  };

  await Promise.all([...SOURCE_KEYS.map(loop), housekeeping()]);
}

/** Serverless fallback (e.g. Vercel Cron): run every platform that is due right now. */
export async function tick(): Promise<{ checked: SourceKey[]; errors: string[] }> {
  await ensureSources();
  const result = { checked: [] as SourceKey[], errors: [] as string[] };
  const due = await Source.find({
    enabled: true,
    $or: [{ nextCheckAt: null }, { nextCheckAt: { $lte: new Date() } }],
  }).lean<SourceDoc[]>();
  await Promise.all(
    due.map(async (s) => {
      try {
        if (await runCheck(s.key)) result.checked.push(s.key);
      } catch (e) {
        result.errors.push(`${s.key}: ${e instanceof Error ? e.message : e}`);
      }
    }),
  );
  await expireJobs();
  return result;
}
