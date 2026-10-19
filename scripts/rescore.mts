// Rebuild all jobs from stored raw items (last 14 days) — run after changing rules or adapters.
// No Apify cost. Moderator decisions are lost, since jobs are recreated.
//   npm run rescore
import mongoose from "mongoose";
import { connectDB } from "../src/lib/db";
import { Job, RawItem, SOURCE_KEYS } from "../src/lib/models";
import { processItems } from "../src/lib/pipeline/process";

await connectDB();
const removed = await Job.deleteMany({});
console.log(`Removed ${removed.deletedCount} jobs; rebuilding from raw items…`);

for (const source of SOURCE_KEYS) {
  const raws = await RawItem.find({ source }).sort({ createdAt: 1 }).lean();
  if (!raws.length) continue;
  const stats = await processItems(source, raws.map((r) => r.payload as Record<string, unknown>), "rescore", {
    storeRaw: false,
    // Raw items were stored only when they were fresh, so don't drop them for being from an earlier day.
    todayOnly: false,
  });
  console.log(source.padEnd(9), stats);
}

const counts = await Job.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]);
console.log("Jobs by status:", Object.fromEntries(counts.map((c) => [c._id, c.n])));
await mongoose.disconnect();
