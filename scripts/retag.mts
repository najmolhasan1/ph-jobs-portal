// Re-apply the track and stack rules to stored jobs after changing them.
// Unlike `npm run rescore`, this keeps every job and moderator decision, except that live or
// queued jobs built on a stack we don't teach (DevOps, .NET, Java, ERP…) are filtered out.
//   npm run retag
import mongoose from "mongoose";
import { connectDB } from "../src/lib/db";
import { Job } from "../src/lib/models";
import { detectTracks, offStack } from "../src/lib/pipeline/rules";

await connectDB();
const jobs = await Job.find({}, { title: 1, skills: 1, description: 1, tracks: 1, status: 1, reason: 1 }).lean();
let retagged = 0;
const hidden: string[] = [];
const restored: string[] = [];
for (const j of jobs) {
  const set: Record<string, unknown> = {};
  const tracks = detectTracks(j.title, j.skills ?? [], j.description ?? "");
  if (tracks.join() !== (j.tracks ?? []).join()) set.tracks = tracks;
  const off = (j.status === "approved" || j.status === "pending") && offStack(j.title, j.description ?? "");
  if (off) {
    set.status = "rejected";
    set.reason = `not a PH stack (${off})`;
    hidden.push(`${j.title} — ${off}`);
  } else if (j.status === "rejected" && j.reason?.startsWith("not a PH stack") && !offStack(j.title, j.description ?? "")) {
    // Filtered by an earlier, stricter version of the stack rule → publish it again.
    set.status = "approved";
    set.reason = "restored after stack rule change";
    restored.push(j.title);
  }
  if (Object.keys(set).length) {
    await Job.updateOne({ _id: j._id }, { $set: set });
    if (set.tracks) retagged++;
  }
}
console.log(`Re-tagged ${retagged} of ${jobs.length} jobs; filtered out ${hidden.length}:`);
for (const h of hidden) console.log(`  - ${h}`);
if (restored.length) console.log(`Restored ${restored.length}: ${restored.join("; ")}`);
await mongoose.disconnect();
