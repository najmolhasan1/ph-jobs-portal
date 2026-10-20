// Re-apply the track, stack and level rules to stored jobs after changing them.
// Unlike `npm run rescore`, this keeps every job and moderator decision, except that:
//   - live or queued jobs built on a stack we don't teach (DevOps, .NET, Java, ERP…) are filtered out;
//   - jobs rejected only for being mid-level / senior are published in Level 2 when they're
//     hands-on engineering roles on the Next Level stack.
//   npm run retag
import { prisma } from "../src/lib/db";
import { isLevel2Experienced, matchRole, offStack, remoteArea } from "../src/lib/pipeline/rules";

const jobs = await prisma.job.findMany({
  select: {
    id: true, title: true, skills: true, description: true, tracks: true, status: true, reason: true, level: true,
    location: true, isRemote: true, sources: { select: { source: true } },
  },
});
const experienced = (level: string | null) => level === "mid" || level === "senior";
const roleKey = (title: string, description: string) =>
  matchRole(title)?.key ??
  // Social posts: the title is just the first line, so look at the opening of the post too.
  matchRole(description.slice(0, 600))?.key ??
  (/\b(developer|programmer|software)\b/i.test(title) && /javascript|typescript|react|next\.?js|node|mern|express/i.test(description)
    ? "software-js"
    : undefined);

// Identical changes are grouped into one updateMany each: a few queries instead of one per job.
const groups = new Map<string, { data: Record<string, unknown>; ids: string[] }>();
let retagged = 0;
const hidden: string[] = [];
const restored: string[] = [];
const level2: string[] = [];
for (const j of jobs) {
  const set: Record<string, unknown> = {};
  const description = j.description ?? "";
  // Fresher / junior / intern → Level 1 only; experienced roles → Level 2 only.
  const tracks = experienced(j.level) ? ["level2"] : ["level1"];
  if (tracks.join() !== (j.tracks ?? []).join()) set.tracks = tracks;
  const off = (j.status === "approved" || j.status === "pending") && offStack(j.title, description);
  if (off) {
    set.status = "rejected";
    set.reason = `not a PH stack (${off})`;
    hidden.push(`${j.title} — ${off}`);
  } else if (j.status === "rejected" && j.reason?.startsWith("not a PH stack") && !offStack(j.title, description)) {
    // Filtered by an earlier, stricter version of the stack rule → publish it again.
    set.status = "approved";
    set.reason = "restored after stack rule change";
    restored.push(j.title);
  } else if (j.status === "rejected" && /^(mid|senior) level$/.test(j.reason ?? "")) {
    const key = roleKey(j.title, description);
    // A remote LinkedIn / Indeed job limited to another country stays out (same rule as the gate).
    const area = j.isRemote ? remoteArea(j.sources[0]?.source ?? "", j.location) : undefined;
    if (key && isLevel2Experienced(key, j.title) && !offStack(j.title, description) && !area) {
      set.status = "approved";
      set.reason = `${j.level === "mid" ? "mid-level" : "senior"} · experienced role (Level 2)`;
      set.tracks = ["level2"];
      set.publishedAt = new Date();
      level2.push(j.title);
    }
  }
  if (Object.keys(set).length) {
    const key = JSON.stringify(set, (k, v) => (k === "publishedAt" ? undefined : v));
    const g = groups.get(key) ?? { data: set, ids: [] };
    g.ids.push(j.id);
    groups.set(key, g);
    if (set.tracks) retagged++;
  }
}
for (const { data, ids } of groups.values()) {
  for (let i = 0; i < ids.length; i += 500) {
    for (let attempt = 1; ; attempt++) {
      try {
        await prisma.job.updateMany({ where: { id: { in: ids.slice(i, i + 500) } }, data });
        break;
      } catch (e) {
        if (attempt === 5) throw e; // a flaky connection — retry a few times
        await new Promise((res) => setTimeout(res, 3000 * attempt));
      }
    }
  }
}
console.log(`Re-tagged ${retagged} of ${jobs.length} jobs; filtered out ${hidden.length}:`);
for (const h of hidden) console.log(`  - ${h}`);
if (restored.length) console.log(`Restored ${restored.length}: ${restored.join("; ")}`);
if (level2.length) {
  console.log(`Published ${level2.length} experienced roles in Level 2:`);
  for (const t of level2) console.log(`  + ${t}`);
}
await prisma.$disconnect();
