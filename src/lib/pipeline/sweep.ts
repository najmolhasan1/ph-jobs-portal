import { prisma } from "@/lib/db";
import type { SourceKey } from "@/lib/models";
import { adapters } from "@/lib/sources";
import { startOfDayDhaka } from "@/lib/time";
import { processItems, type ProcessStats } from "./process";

// Coverage sweep: routine checks only ask each platform for posts since the last check, so a
// missed check (worker off, network down, a platform hiccup) could leave a gap. A sweep re-reads
// every listing the platform still shows for the last `days` and adds any job that passes the
// filter but isn't stored yet — so what you'd find by searching BDJobs, LinkedIn, … is here too.
// Jobs already stored are skipped cheaply (dedup), so a sweep only adds what's missing.

export interface SweepPlan {
  /** How far back to read (the platform's open listings in this window). */
  days: number;
  everyHours: number;
  /** Deeper settings than a routine check (more pages / results). */
  config?: Record<string, unknown>;
}

const ROLE_TERMS = ["frontend developer", "react developer", "next.js", "javascript developer", "typescript", "backend developer",
  "node.js developer", "full stack developer", "mern", "web developer", "qa engineer", "software engineer"];

export const SWEEPS: Partial<Record<SourceKey, SweepPlan>> = {
  // Bangladesh boards: every open job (BDJobs lists jobs until their deadline, often 30+ days).
  bdjobs: { days: 60, everyHours: 6 },
  atb: { days: 60, everyHours: 6, config: { maxPages: 20 } },
  nextjobz: { days: 60, everyHours: 6, config: { maxNewPerCheck: 200 } },
  skilljobs: { days: 60, everyHours: 6, config: { maxPages: 10 } },
  // Remote boards and feeds (free).
  himalayas: { days: 14, everyHours: 12, config: { searchTerms: ROLE_TERMS, maxPages: 40 } },
  remoterocketship: { days: 30, everyHours: 12, config: { maxPages: 15 } },
  arc: { days: 30, everyHours: 12 },
  wellfound: { days: 30, everyHours: 12 },
  jobright: { days: 30, everyHours: 12 },
  remotive: { days: 30, everyHours: 24 },
  remoteok: { days: 30, everyHours: 12 },
  jobicy: { days: 30, everyHours: 12 },
  workingnomads: { days: 30, everyHours: 12 },
  weworkremotely: { days: 30, everyHours: 12 },
  hackernews: { days: 30, everyHours: 12 },
  greenhouse: { days: 60, everyHours: 24 },
  reddit: { days: 30, everyHours: 6 },
  // Paid (Apify): weekly, capped. LinkedIn's month window ≈ what its own search shows.
  linkedin: { days: 30, everyHours: 24 * 7, config: { limitPerSearch: 100 } },
  indeed: { days: 14, everyHours: 24 * 7, config: { maxRows: 50 } },
  // Facebook groups, X, LinkedIn company pages: the routine checks already read every new post,
  // and re-reading weeks of posts would cost a lot — no sweep.
};

/** Deeper settings for one-off backfills (`npm run backfill`) — same as the sweep's. */
export const DEEPER: Partial<Record<SourceKey, Record<string, unknown>>> = {
  ...Object.fromEntries(Object.entries(SWEEPS).map(([k, p]) => [k, p?.config ?? {}])),
  linkedin_company: { maxPostsPerPage: 40 },
  facebook: { maxPostsPerGroup: 15 },
  x: { maxTweetsPerQuery: 40 },
};

/** One sweep of one platform. Records a Run, and the sweep time on the Source. */
export async function runSweep(key: SourceKey): Promise<ProcessStats | null> {
  const plan = SWEEPS[key];
  const source = await prisma.source.findUnique({ where: { key } });
  if (!plan || !source?.enabled) return null;
  const since = startOfDayDhaka(plan.days - 1);
  const run = await prisma.run.create({ data: { source: key, since } });
  try {
    const items = await adapters[key].fetchNew({ since, config: { ...(source.config as Record<string, unknown>), ...plan.config } });
    // No age limit: the platform still lists these jobs, so they're open.
    const stats = await processItems(key, items, run.id, { maxAgeDays: 0 });
    const { fetched, created, queued, merged, rejected, stale } = stats;
    await prisma.run.update({
      where: { id: run.id },
      data: { status: "DONE", finishedAt: new Date(), fetched, created, queued, merged, rejected, stale },
    });
    await prisma.source.update({ where: { key }, data: { lastSweepAt: new Date() } });
    return stats;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await prisma.run.update({ where: { id: run.id }, data: { status: "FAILED", finishedAt: new Date(), error: `coverage sweep: ${message}` } });
    throw e;
  }
}

/** Platforms whose sweep is due now. */
export async function dueSweeps(): Promise<SourceKey[]> {
  const sources = await prisma.source.findMany({ where: { enabled: true }, select: { key: true, lastSweepAt: true } });
  return sources
    .filter((s) => {
      const plan = SWEEPS[s.key as SourceKey];
      return plan && (!s.lastSweepAt || Date.now() - s.lastSweepAt.getTime() > plan.everyHours * 3600_000);
    })
    .map((s) => s.key as SourceKey);
}
