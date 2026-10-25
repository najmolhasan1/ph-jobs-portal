// One collection round, for running on a schedule in the cloud (GitHub Actions, every 15 min) —
// so jobs keep coming in when the PC worker is off or its network can't reach the database.
//   npx tsx scripts/tick.mts
// It takes the same lock as `npm run worker`: if the PC worker is running, this round does
// nothing (two collectors would double every check and every Apify bill).
import { prisma } from "../src/lib/db";
import { collectBdjobs, collectGovtSites, collectTeletalk } from "../src/lib/market/collect";
import { cleanupRawItems } from "../src/lib/pipeline/process";
import { acquireWorkerLock, ensureSources, releaseWorkerLock, runCheck } from "../src/lib/pipeline/runner";
import { dueSweeps, runSweep } from "../src/lib/pipeline/sweep";
import type { SourceKey } from "../src/lib/models";

const log = (key: string, msg: string) => console.log(`[${new Date().toISOString()}] ${key.padEnd(8)} ${msg}`);
const short = (e: unknown) => (e instanceof Error ? e.message.split("\n").filter(Boolean).pop() : String(e));
// Leave room under the job's time limit for the market step and clean-up.
const DEADLINE = Date.now() + 11 * 60_000;

const owner = `cloud-${process.env.GITHUB_RUN_ID ?? process.pid}-${Date.now()}`;
if (!(await acquireWorkerLock(owner))) {
  console.log("The PC worker is running — nothing to do this round.");
  await prisma.$disconnect();
  process.exit(0);
}
const heartbeat = setInterval(() => void acquireWorkerLock(owner).catch(() => undefined), 30_000);

try {
  await ensureSources();

  // 1. Every platform whose next check is due (same schedule as the worker).
  const due = await prisma.source.findMany({
    where: { enabled: true, OR: [{ nextCheckAt: null }, { nextCheckAt: { lte: new Date() } }] },
    select: { key: true },
  });
  await Promise.all(
    due.map(async ({ key }) => {
      const t0 = Date.now();
      try {
        const st = await runCheck(key as SourceKey);
        if (st) log(key, `fetched ${st.fetched} → new ${st.created}, review ${st.queued}, dup ${st.merged}, rejected ${st.rejected}, old ${st.stale} (${Math.round((Date.now() - t0) / 1000)}s)`);
      } catch (e) {
        log(key, `check failed: ${short(e)}`);
      }
    }),
  );

  // 2. Coverage sweeps that are due, while time allows.
  for (const key of await dueSweeps().catch(() => [] as SourceKey[])) {
    if (Date.now() > DEADLINE) break;
    try {
      const st = await runSweep(key);
      if (st) log(key, `coverage sweep: ${st.fetched} open listings → added ${st.created}, already had ${st.merged}`);
    } catch (e) {
      log(key, `coverage sweep failed: ${short(e)}`);
    }
  }

  // 3. Career Insights: today's BDJobs posts every round; every open job, Teletalk and the
  //    forces / BGB / police / BPSC sites a few times a day.
  const hour = new Date().getUTCHours();
  const firstRoundOfHour = new Date().getUTCMinutes() < 15;
  try {
    const full = firstRoundOfHour && hour % 6 === 0;
    log("market", `BDJobs ${full ? "all open jobs" : "today"}: ${await collectBdjobs(full ? "" : "1")} new posts stored`);
    if (firstRoundOfHour && hour % 2 === 0) {
      log("market", `Teletalk govt jobs: ${await collectTeletalk()} new posts stored`);
      const sites = await collectGovtSites();
      log("market", `Forces / BGB / police / BPSC sites: ${sites.added} new circulars stored${sites.errors.length ? ` (failed: ${sites.errors.join("; ")})` : ""}`);
    }
  } catch (e) {
    log("market", `failed: ${short(e)}`);
  }

  await cleanupRawItems().catch(() => undefined);
} finally {
  clearInterval(heartbeat);
  await releaseWorkerLock(owner);
  await prisma.$disconnect();
}
