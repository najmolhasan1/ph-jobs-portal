// Career Insights data: fill or refresh the Bangladesh job market table by hand.
//   npm run market            → every open BDJobs job + Teletalk govt circulars + forces/BGB/police/BPSC sites
//   npm run market -- --reclassify → re-sort stored jobs after editing the taxonomy
import { prisma } from "../src/lib/db";
import { collectBdjobs, collectGovtSites, collectTeletalk, reclassifyAll } from "../src/lib/market/collect";

if (process.argv.includes("--reclassify")) {
  console.log(`Re-sorted ${await reclassifyAll()} jobs.`);
} else {
  console.log(`BDJobs: ${await collectBdjobs("")} new posts stored`);
  console.log(`Teletalk: ${await collectTeletalk()} new posts stored`);
  const sites = await collectGovtSites();
  console.log(`Forces / BGB / police / BPSC sites: ${sites.added} new circulars stored`, sites.errors.length ? sites.errors : "");
}
console.log(`Total stored: ${await prisma.marketJob.count()}`);
await prisma.$disconnect();
