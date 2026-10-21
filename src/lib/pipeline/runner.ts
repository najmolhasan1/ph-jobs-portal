import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { SOURCE_KEYS, type SourceKey, type SourceRow } from "@/lib/models";
import { adapters } from "@/lib/sources";
import { INGEST_DAYS, startOfDayDhaka } from "@/lib/time";
import { cleanupRawItems, processItems, type ProcessStats } from "./process";
import { dueSweeps, runSweep } from "./sweep";
import { collectBdjobs, collectGovtSites, collectTeletalk } from "@/lib/market/collect";

// Each platform is checked on its own interval by an always-on worker (scripts/worker.mts):
//   check = ask the platform for posts since the last successful check → gate → dedup → store.
// Published jobs reach open portal tabs within seconds via SSE (/api/jobs/stream).

/** Create a Source row per adapter on first boot. */
export async function ensureSources(): Promise<void> {
  const existing = new Set((await prisma.source.findMany({ select: { key: true } })).map((s) => s.key));
  const missing = SOURCE_KEYS.filter((key) => !existing.has(key));
  if (!missing.length) return;
  await prisma.source.createMany({
    data: missing.map((key) => {
      const a = adapters[key];
      return {
        key,
        name: a.name,
        config: a.defaultConfig as Prisma.InputJsonValue,
        intervalMinutes: a.intervalMinutes,
        enabled: a.enabledByDefault,
      };
    }),
    skipDuplicates: true,
  });
}

/** One check of one platform. Safe to call while another check of the same platform is running (it no-ops). */
export async function runCheck(key: SourceKey): Promise<ProcessStats | null> {
  // Claim the source so two workers (or a worker and "Check now") never overlap.
  const staleClaim = new Date(Date.now() - 20 * 60_000);
  const claimed = await prisma.source.updateMany({
    where: { key, OR: [{ state: { not: "checking" } }, { lastCheckAt: { lt: staleClaim } }] },
    data: { state: "checking", lastCheckAt: new Date() },
  });
  if (!claimed.count) return null;
  const source = (await prisma.source.findUniqueOrThrow({ where: { key } })) as SourceRow;

  const adapter = adapters[key];
  const startedAt = new Date();
  // Ask for posts since the last successful check, but never further back than the collection window.
  const floor = startOfDayDhaka(INGEST_DAYS - 1);
  const since = source.lastSuccessAt && source.lastSuccessAt > floor ? source.lastSuccessAt : floor;
  const run = await prisma.run.create({ data: { source: key, startedAt, since } });

  try {
    const items = await adapter.fetchNew({ since, config: source.config ?? {} });
    const stats = await processItems(key, items, run.id);
    const { fetched, created, queued, merged, rejected, stale } = stats; // Run has no "skipped" column
    const counts = { fetched, created, queued, merged, rejected, stale };
    await prisma.run.update({ where: { id: run.id }, data: { status: "DONE", finishedAt: new Date(), ...counts } });
    await prisma.source.update({
      where: { key },
      data: {
        state: "idle",
        lastSuccessAt: startedAt,
        lastError: null,
        consecutiveFailures: 0,
        nextCheckAt: new Date(Date.now() + (source.intervalMinutes ?? adapter.intervalMinutes) * 60_000),
      },
    });
    return stats;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const billing = /usage|billing|upgrad|limit exceeded|isn't enough/i.test(message) && !/concurrent/i.test(message);
    const retryMs = billing ? 30 * 60_000 : 60_000;
    await prisma.run.update({ where: { id: run.id }, data: { status: "FAILED", finishedAt: new Date(), error: message } });
    await prisma.source.update({
      where: { key },
      data: {
        state: "error",
        lastError: message,
        nextCheckAt: new Date(Date.now() + retryMs),
        consecutiveFailures: { increment: 1 },
      },
    });
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
  const now = new Date();
  const data = { owner, pid: process.pid, heartbeatAt: now };
  // Take over the lock if it's ours or its holder stopped heartbeating…
  const taken = await prisma.lock.updateMany({
    where: { id: "worker", OR: [{ owner }, { heartbeatAt: { lt: new Date(now.getTime() - LOCK_STALE_MS) } }] },
    data,
  });
  if (taken.count) return true;
  // …or create it if nobody holds one. The primary key makes two simultaneous creates impossible.
  try {
    await prisma.lock.create({ data: { id: "worker", ...data } });
    return true;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return false; // held by a live worker
    throw e;
  }
}

async function releaseWorkerLock(owner: string) {
  await prisma.lock.deleteMany({ where: { id: "worker", owner } }).catch(() => undefined);
}

export async function runWorkers(signal?: AbortSignal): Promise<void> {
  await ensureSources();
  const owner = `${process.pid}-${Date.now()}`;
  if (!(await acquireWorkerLock(owner))) {
    const held = await prisma.lock.findUnique({ where: { id: "worker" } });
    throw new Error(
      `Another worker is already running (pid ${held?.pid}, last heartbeat ${held?.heartbeatAt.toISOString()}). ` +
        "Stop it first — two workers would double every check and every Apify bill.",
    );
  }
  const lost = new AbortController();
  const heartbeat = setInterval(async () => {
    let held: boolean;
    try {
      held = await acquireWorkerLock(owner);
    } catch {
      return; // database unreachable for a moment — try again on the next beat
    }
    if (!held) {
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
      let s: Awaited<ReturnType<typeof prisma.source.findUnique>>;
      try {
        s = await prisma.source.findUnique({ where: { key } });
      } catch (e) {
        // A dropped database connection must not take the whole worker down.
        log(key, `database unreachable (${e instanceof Error ? e.message.split("\n").filter(Boolean).pop() : e}) — retrying in 30 s`);
        await sleep(30_000);
        continue;
      }
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
        const billing = /usage|billing|upgrad|limit exceeded|isn't enough/i.test(msg) && !/concurrent/i.test(msg);
        log(key, `check failed: ${msg} — retrying in ${billing ? "30 min" : "1 min"}`);
        await sleep(billing ? 30 * 60_000 : 60_000);
        continue;
      }
      await sleep(Math.max(5_000, minutes * 60_000 - (Date.now() - t0)));
    }
  };

  // Housekeeping: drop old raw items every 10 minutes.
  const housekeeping = async () => {
    while (!signal?.aborted) {
      await cleanupRawItems().catch(() => undefined);
      await sleep(10 * 60_000);
    }
  };

  // Coverage sweeps: re-read each platform's open listings on its schedule (sweep.ts), one
  // platform at a time, and add anything the routine checks missed.
  const sweeps = async () => {
    await sleep(60_000); // let the routine checks start first
    while (!signal?.aborted) {
      let due: SourceKey[] = [];
      try {
        due = await dueSweeps();
      } catch {
        // database unreachable for a moment — try again next round
      }
      for (const key of due) {
        if (signal?.aborted) break;
        const t0 = Date.now();
        try {
          const st = await runSweep(key);
          if (st) log(key, `coverage sweep: ${st.fetched} open listings → added ${st.created}, already had ${st.merged} (${Math.round((Date.now() - t0) / 1000)}s)`);
        } catch (e) {
          log(key, `coverage sweep failed: ${e instanceof Error ? e.message.split("\n").filter(Boolean).pop() : e}`);
        }
      }
      await sleep(10 * 60_000);
    }
  };

  // Career Insights: every Bangladesh job (all fields) from BDJobs and Teletalk govt circulars.
  // New posts every 30 min; a full re-read of open listings every 6 h; Teletalk and the forces' /
  // BGB / police / BPSC sites every 2 h.
  const market = async () => {
    let lastFull = 0;
    let lastGovt = 0;
    while (!signal?.aborted) {
      const t0 = Date.now();
      const full = t0 - lastFull > 6 * 3600_000;
      try {
        const added = await collectBdjobs(full ? "" : "1");
        if (full) lastFull = t0;
        log("market", `BDJobs ${full ? "all open jobs" : "today"}: ${added} new posts stored (${Math.round((Date.now() - t0) / 1000)}s)`);
      } catch (e) {
        log("market", `BDJobs failed: ${e instanceof Error ? e.message.split("\n").filter(Boolean).pop() : e}`);
      }
      if (Date.now() - lastGovt > 2 * 3600_000) {
        try {
          const added = await collectTeletalk();
          lastGovt = Date.now();
          log("market", `Teletalk govt jobs: ${added} new posts stored`);
          const sites = await collectGovtSites();
          log("market", `Forces / BGB / police / BPSC sites: ${sites.added} new circulars stored${sites.errors.length ? ` (failed: ${sites.errors.join("; ")})` : ""}`);
        } catch (e) {
          log("market", `Teletalk failed: ${e instanceof Error ? e.message.split("\n").filter(Boolean).pop() : e}`);
        }
      }
      await sleep(30 * 60_000);
    }
  };

  await Promise.all([...SOURCE_KEYS.map(loop), housekeeping(), sweeps(), market()]);
}

/** Serverless fallback (e.g. Vercel Cron): run every platform that is due right now. */
export async function tick(): Promise<{ checked: SourceKey[]; errors: string[] }> {
  await ensureSources();
  const result = { checked: [] as SourceKey[], errors: [] as string[] };
  const due = (await prisma.source.findMany({
    where: { enabled: true, OR: [{ nextCheckAt: null }, { nextCheckAt: { lte: new Date() } }] },
  })) as SourceRow[];
  await Promise.all(
    due.map(async (s) => {
      try {
        if (await runCheck(s.key)) result.checked.push(s.key);
      } catch (e) {
        result.errors.push(`${s.key}: ${e instanceof Error ? e.message : e}`);
      }
    }),
  );
  await cleanupRawItems();
  return result;
}
