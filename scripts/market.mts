// Career Insights data: fill or refresh the Bangladesh job market table by hand.
//   npm run market            → every open BDJobs job + Teletalk govt circulars
//   npm run market -- --reclassify → re-sort stored jobs after editing the taxonomy
import { prisma } from "../src/lib/db";
import { collectBdjobs, collectTeletalk, reclassifyAll } from "../src/lib/market/collect";

if (process.argv.includes("--reclassify")) {
  console.log(`Re-sorted ${await reclassifyAll()} jobs.`);
} else {
  console.log(`BDJobs: ${await collectBdjobs("")} new posts stored`);
  console.log(`Teletalk: ${await collectTeletalk()} new posts stored`);
}
console.log(`Total stored: ${await prisma.marketJob.count()}`);
await prisma.$disconnect();
