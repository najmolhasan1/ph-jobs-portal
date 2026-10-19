// One-off: copy the old MongoDB data into Postgres (local or Supabase — whatever DATABASE_URL
// points at). Job ids keep their old values, so saved jobs and shared links still work.
// Safe to re-run: rows that already exist are skipped.
//   npm run db:mongo        (in another terminal, if the old data is in the local MongoDB)
//   npm run migrate:mongo
import mongoose from "mongoose";
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/db";
import { ensureSources } from "../src/lib/pipeline/runner";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Set MONGODB_URI (the old database) in .env.local");
await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
const db = mongoose.connection.db!;
type Doc = Record<string, unknown> & { _id: unknown };
const all = (name: string, filter: object = {}, sort: Record<string, 1 | -1> = {}, limit = 0) =>
  db.collection<Doc>(name).find(filter).sort(sort).limit(limit).toArray();

const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
const date = (v: unknown) => (v instanceof Date && !Number.isNaN(v.getTime()) ? v : undefined);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const json = (v: unknown) => JSON.parse(JSON.stringify(v ?? {})) as Prisma.InputJsonValue;

// Platforms: keep settings, on/off, interval and schedule.
await ensureSources();
const sources = await all("sources");
for (const s of sources) {
  await prisma.source.updateMany({
    where: { key: String(s.key) },
    data: {
      enabled: Boolean(s.enabled),
      config: json(s.config),
      intervalMinutes: num(s.intervalMinutes) || 10,
      lastSuccessAt: date(s.lastSuccessAt),
      nextCheckAt: date(s.nextCheckAt),
      lastCheckAt: date(s.lastCheckAt),
      lastError: str(s.lastError),
      consecutiveFailures: num(s.consecutiveFailures),
      state: "idle",
    },
  });
}
console.log(`platforms: ${sources.length} updated`);

// Jobs + where each was found.
const jobs = await all("jobs");
let jobsAdded = 0;
let linksAdded = 0;
for (let i = 0; i < jobs.length; i += 200) {
  const batch = jobs.slice(i, i + 200);
  jobsAdded += (
    await prisma.job.createMany({
      skipDuplicates: true,
      data: batch.map((j) => ({
        id: String(j._id),
        fingerprint: String(j.fingerprint),
        title: String(j.title),
        company: str(j.company),
        location: str(j.location),
        isRemote: Boolean(j.isRemote),
        jobType: str(j.jobType),
        level: str(j.level),
        experience: str(j.experience),
        salary: str(j.salary),
        description: str(j.description),
        summary: str(j.summary),
        skills: (j.skills as string[] | undefined) ?? [],
        applyUrl: str(j.applyUrl),
        postedAt: date(j.postedAt) ?? new Date(),
        deadline: date(j.deadline),
        relevance: num(j.relevance),
        category: str(j.category),
        tracks: (j.tracks as string[] | undefined) ?? [],
        classifiedBy: str(j.classifiedBy),
        reason: str(j.reason),
        status: str(j.status) ?? "pending",
        publishedAt: date(j.publishedAt),
        createdAt: date(j.createdAt) ?? new Date(),
        updatedAt: date(j.updatedAt) ?? new Date(),
      })),
    })
  ).count;
  const links = batch.flatMap((j) =>
    ((j.sources as Record<string, unknown>[] | undefined) ?? []).map((l) => ({
      jobId: String(j._id),
      source: String(l.source),
      url: str(l.url),
      externalId: str(l.externalId),
      postedAt: date(l.postedAt),
    })),
  );
  // Only links of jobs inserted now (a re-run must not duplicate links without an externalId).
  const fresh = new Set(
    (await prisma.jobSource.findMany({ where: { jobId: { in: batch.map((j) => String(j._id)) } }, select: { jobId: true } })).map((l) => l.jobId),
  );
  linksAdded += (await prisma.jobSource.createMany({ skipDuplicates: true, data: links.filter((l) => !fresh.has(l.jobId)) })).count;
}
console.log(`jobs: ${jobsAdded} of ${jobs.length} added, ${linksAdded} platform links`);

// Recent check history (Admin → Checks) and raw items (for `npm run rescore`).
const runs = await all("runs", {}, { startedAt: -1 }, 500);
const runsAdded = await prisma.run.createMany({
  skipDuplicates: true,
  data: runs.map((r) => ({
    id: String(r._id),
    source: String(r.source),
    status: str(r.status) ?? "DONE",
    startedAt: date(r.startedAt) ?? new Date(),
    finishedAt: date(r.finishedAt),
    since: date(r.since),
    fetched: num(r.fetched),
    created: num(r.created),
    queued: num(r.queued),
    merged: num(r.merged),
    rejected: num(r.rejected),
    stale: num(r.stale),
    error: str(r.error),
  })),
});
console.log(`checks: ${runsAdded.count} of ${runs.length} added`);

const raws = await all("rawitems", { createdAt: { $gte: new Date(Date.now() - 14 * 864e5) } });
let rawAdded = 0;
for (let i = 0; i < raws.length; i += 200) {
  rawAdded += (
    await prisma.rawItem.createMany({
      skipDuplicates: true,
      data: raws.slice(i, i + 200).map((r) => ({
        id: String(r._id),
        source: String(r.source),
        externalId: str(r.externalId),
        runId: str(r.runId),
        payload: json(r.payload),
        createdAt: date(r.createdAt) ?? new Date(),
      })),
    })
  ).count;
}
console.log(`raw items: ${rawAdded} of ${raws.length} added`);

await mongoose.disconnect();
await prisma.$disconnect();
