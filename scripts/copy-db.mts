// Copy all data from one Postgres database to another, e.g. local → Supabase.
// The target is DIRECT_URL (tables must exist: `npm run db:push`); the source is given as an argument.
// Safe to re-run: rows that already exist in the target are skipped.
//   npm run copy-db -- postgresql://postgres:postgres@127.0.0.1:5432/ph_jobs
import { PrismaClient, type Prisma } from "@prisma/client";

const sourceUrl = process.argv[2];
const targetUrl = process.env.DIRECT_URL;
if (!sourceUrl || !targetUrl) throw new Error("Usage: npm run copy-db -- <source database url>   (target = DIRECT_URL)");
if (sourceUrl === targetUrl) throw new Error("Source and target are the same database");

const from = new PrismaClient({ datasourceUrl: sourceUrl });
const to = new PrismaClient({ datasourceUrl: targetUrl });
// Small batches with retries: a far-away pooler drops connections on big inserts.
const BATCH = 50;

async function inBatches<T>(rows: T[], insert: (batch: T[]) => Promise<{ count: number }>) {
  let added = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    for (let attempt = 1; ; attempt++) {
      try {
        added += (await insert(rows.slice(i, i + BATCH))).count;
        break;
      } catch (e) {
        if (attempt === 4) throw e;
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
    process.stdout.write(`\r  ${Math.min(i + BATCH, rows.length)} / ${rows.length}`);
  }
  process.stdout.write("\n");
  return added;
}

// Platforms: settings, on/off, interval and schedule.
const sources = await from.source.findMany();
for (const s of sources) {
  const { key, name, enabled, intervalMinutes, lastCheckAt, lastSuccessAt, nextCheckAt, lastError, consecutiveFailures } = s;
  const data = { name, enabled, intervalMinutes, lastCheckAt, lastSuccessAt, nextCheckAt, lastError, consecutiveFailures, config: s.config as Prisma.InputJsonValue, state: "idle" };
  await to.source.upsert({ where: { key }, create: { key, ...data }, update: data });
}
console.log(`platforms: ${sources.length}`);

const jobs = await from.job.findMany();
console.log(`jobs: ${await inBatches(jobs, (data) => to.job.createMany({ data, skipDuplicates: true }))} of ${jobs.length} added`);

// Links get new ids in the target; skip jobs that already have links there (re-runs).
const linked = new Set((await to.jobSource.findMany({ select: { jobId: true }, distinct: ["jobId"] })).map((l) => l.jobId));
const links = (await from.jobSource.findMany({ orderBy: { id: "asc" } }))
  .filter((l) => !linked.has(l.jobId))
  .map((l) => ({ jobId: l.jobId, source: l.source, url: l.url, externalId: l.externalId, postedAt: l.postedAt }));
console.log(`platform links: ${await inBatches(links, (data) => to.jobSource.createMany({ data, skipDuplicates: true }))} added`);

const runs = await from.run.findMany();
console.log(`checks: ${await inBatches(runs, (data) => to.run.createMany({ data, skipDuplicates: true }))} of ${runs.length} added`);

const raws = await from.rawItem.findMany();
const rawAdded = await inBatches(raws, (data) =>
  to.rawItem.createMany({ data: data.map((r) => ({ ...r, payload: r.payload as Prisma.InputJsonValue })), skipDuplicates: true }),
);
console.log(`raw items: ${rawAdded} of ${raws.length} added`);

await from.$disconnect();
await to.$disconnect();
