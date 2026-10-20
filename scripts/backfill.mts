// Collect every post from the last N days (default 7) on each platform — e.g. to fill the portal
// for a fresh start, or after the worker was off. Reads deeper than a routine check (more pages),
// so paid (Apify) platforms cost more; skip them with --free.
//   npm run backfill               → all enabled platforms, last 7 days
//   npm run backfill -- 3 --free   → free platforms only, last 3 days (--paid: Apify ones only)
//   npm run backfill -- 7 bdjobs himalayas
import { prisma } from "../src/lib/db";
import { SOURCE_KEYS, type SourceKey } from "../src/lib/models";
import { processItems } from "../src/lib/pipeline/process";
import { ensureSources } from "../src/lib/pipeline/runner";
import { adapters } from "../src/lib/sources";
import { startOfDayDhaka } from "../src/lib/time";

const args = process.argv.slice(2);
const days = Number(args.find((a) => /^\d+$/.test(a))) || 7;
const freeOnly = args.includes("--free");
const paidOnly = args.includes("--paid");
const only = args.filter((a) => SOURCE_KEYS.includes(a as SourceKey)) as SourceKey[];

// Deeper reads than a routine check, so the whole window is covered where the platform allows it.
const DEEPER: Partial<Record<SourceKey, Record<string, unknown>>> = {
  himalayas: { maxPages: 120 },
  remoterocketship: { maxPages: 15 },
  nextjobz: { maxNewPerCheck: 200 },
  // Paid platforms: deeper, but capped — a 7-day pull of all four costs roughly $3–5 of Apify credit.
  linkedin: { limitPerSearch: 50 },
  linkedin_company: { maxPostsPerPage: 40 },
  facebook: { maxPostsPerGroup: 15 },
  reddit: { maxPostsPerSearch: 30 },
  indeed: { maxRows: 30 },
  x: { maxTweetsPerQuery: 40 },
};

await ensureSources();
const since = startOfDayDhaka(days - 1);
const sources = await prisma.source.findMany({ where: { enabled: true }, orderBy: { key: "asc" } });
console.log(`Backfilling posts since ${since.toISOString()} (${days} Dhaka days)${freeOnly ? ", free platforms only" : ""}…`);

for (const s of sources) {
  const key = s.key as SourceKey;
  const adapter = adapters[key];
  if (!adapter || (only.length && !only.includes(key)) || (freeOnly && adapter.kind === "apify") || (paidOnly && adapter.kind !== "apify")) continue;
  const t0 = Date.now();
  const run = await prisma.run.create({ data: { source: key, since } });
  try {
    const config = { ...(s.config as Record<string, unknown>), ...DEEPER[key] };
    const items = await adapter.fetchNew({ since, config });
    const stats = await processItems(key, items, run.id, { maxAgeDays: days });
    const { fetched, created, queued, merged, rejected, stale } = stats;
    await prisma.run.update({ where: { id: run.id }, data: { status: "DONE", finishedAt: new Date(), fetched, created, queued, merged, rejected, stale } });
    // Routine checks continue from here, so the worker doesn't fetch (and pay for) the same window again.
    await prisma.source.update({ where: { key }, data: { lastSuccessAt: new Date(t0), lastError: null, consecutiveFailures: 0 } });
    console.log(`${key.padEnd(17)} fetched ${fetched} → published ${created}, already had ${merged}, rejected ${rejected}, too old ${stale} (${Math.round((Date.now() - t0) / 1000)}s)`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await prisma.run.update({ where: { id: run.id }, data: { status: "FAILED", finishedAt: new Date(), error: msg } });
    console.log(`${key.padEnd(17)} FAILED: ${msg.split("\n")[0].slice(0, 140)}`);
  }
}
const live = await prisma.job.count({ where: { status: "approved" } });
console.log(`Done. ${live} jobs live on the portal.`);
await prisma.$disconnect();
