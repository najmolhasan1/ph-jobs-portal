// Run the stored raw items (last 14 days) through the pipeline again, adding any job that's
// missing — e.g. after an adapter fix. No Apify cost. Never deletes anything: every job that
// ever reached the database stays there. To re-apply changed rules to stored jobs, use
// `npm run retag`.
//   npm run rescore
import { prisma } from "../src/lib/db";
import { SOURCE_KEYS } from "../src/lib/models";
import { processItems } from "../src/lib/pipeline/process";

for (const source of SOURCE_KEYS) {
  const raws = await prisma.rawItem.findMany({ where: { source }, orderBy: { createdAt: "asc" } });
  if (!raws.length) continue;
  const stats = await processItems(source, raws.map((r) => r.payload as Record<string, unknown>), "rescore", {
    storeRaw: false,
    // Raw items were stored only when they were fresh, so don't drop them for their age now.
    maxAgeDays: 0,
  });
  console.log(source.padEnd(9), `added ${stats.created + stats.queued + stats.rejected}, already stored ${stats.merged}`);
}

const counts = await prisma.job.groupBy({ by: ["status"], _count: { _all: true } });
console.log("Jobs by status:", Object.fromEntries(counts.map((c) => [c.status, c._count._all])));
await prisma.$disconnect();
