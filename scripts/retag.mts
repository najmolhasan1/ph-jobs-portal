// Re-apply the track and stack rules to stored jobs after changing them.
// Unlike `npm run rescore`, this keeps every job and moderator decision, except that live or
// queued jobs built on a stack we don't teach (DevOps, .NET, Java, ERP…) are filtered out.
//   npm run retag
import { prisma } from "../src/lib/db";
import { detectTracks, offStack } from "../src/lib/pipeline/rules";

const jobs = await prisma.job.findMany({ select: { id: true, title: true, skills: true, description: true, tracks: true, status: true, reason: true } });
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
    await prisma.job.update({ where: { id: j.id }, data: set });
    if (set.tracks) retagged++;
  }
}
console.log(`Re-tagged ${retagged} of ${jobs.length} jobs; filtered out ${hidden.length}:`);
for (const h of hidden) console.log(`  - ${h}`);
if (restored.length) console.log(`Restored ${restored.length}: ${restored.join("; ")}`);
await prisma.$disconnect();
