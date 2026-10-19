// Rebuild all jobs from stored raw items (last 14 days) — run after changing rules or adapters.
// No Apify cost. Moderator decisions are lost, since jobs are recreated.
//   npm run rescore
import { prisma } from "../src/lib/db";
import { SOURCE_KEYS } from "../src/lib/models";
import { processItems } from "../src/lib/pipeline/process";

const removed = await prisma.job.deleteMany({});
console.log(`Removed ${removed.count} jobs; rebuilding from raw items…`);

for (const source of SOURCE_KEYS) {
  const raws = await prisma.rawItem.findMany({ where: { source }, orderBy: { createdAt: "asc" } });
  if (!raws.length) continue;
  const stats = await processItems(source, raws.map((r) => r.payload as Record<string, unknown>), "rescore", {
    storeRaw: false,
    // Raw items were stored only when they were fresh, so don't drop them for their age now.
    maxAgeDays: 0,
  });
  console.log(source.padEnd(9), stats);
}

const counts = await prisma.job.groupBy({ by: ["status"], _count: { _all: true } });
console.log("Jobs by status:", Object.fromEntries(counts.map((c) => [c.status, c._count._all])));
await prisma.$disconnect();
