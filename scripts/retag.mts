// Re-apply the track, stack and level rules (and salary extraction) to stored jobs after changing them.
// Only jobs that pass the filter are kept in the database, so jobs built on a stack we don't
// teach (DevOps, .NET, Java, ERP…) are deleted.
//   npm run retag
import { prisma } from "../src/lib/db";
import { extractSalary } from "../src/lib/pipeline/salary";
import { experienceVerdict, isLevel2Experienced, isSoftwareQA, matchRole, offStack, remoteArea, remoteOnlyRegion } from "../src/lib/pipeline/rules";

// Loaded in pages: one query for every job with its description times out on a slow link.
const select = {
  id: true, title: true, skills: true, description: true, tracks: true, status: true, reason: true, level: true, salary: true,
  location: true, isRemote: true, sources: { select: { source: true } },
} as const;
const jobs: Awaited<ReturnType<typeof prisma.job.findMany<{ select: typeof select }>>> = [];
for (let cursor: string | undefined; ; ) {
  const page = await prisma.job.findMany({ select, orderBy: { id: "asc" }, take: 300, ...(cursor && { cursor: { id: cursor }, skip: 1 }) });
  jobs.push(...page);
  if (page.length < 300) break;
  cursor = page[page.length - 1].id;
}
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
const toDelete: string[] = [];
const restored: string[] = [];
const level2: string[] = [];
for (const j of jobs) {
  const set: Record<string, unknown> = {};
  const description = j.description ?? "";
  const key = roleKey(j.title, description);
  // Same rule as the gate: fresher / intern / unstated → Level 1; 1–2 years on a Next Level
  // engineering role → Level 2; senior titles and 3+ years → removed.
  const verdict = experienceVerdict(j, j.level, key ?? "");
  if ("reject" in verdict) {
    toDelete.push(j.id);
    hidden.push(`${j.title} — ${verdict.reject}`);
    continue;
  }
  const tracks = [verdict.track];
  if (tracks.join() !== (j.tracks ?? []).join()) set.tracks = tracks;
  // Salary from the post text when the board gave none.
  const salary = j.salary ? undefined : extractSalary(description);
  if (salary) set.salary = salary;
  const live = j.status === "approved" || j.status === "pending";
  // A remote job whose text limits it to another country / region ("open to candidates in the US").
  const bd = /bangladesh|dhaka|chattogram|chittagong|sylhet/i.test(`${j.location ?? ""} ${j.title}`);
  const onlyFor = live && j.isRemote && !bd ? remoteOnlyRegion(description) : undefined;
  if (onlyFor && !/asia|apac|worldwide|bangladesh/i.test(onlyFor)) {
    toDelete.push(j.id);
    hidden.push(`${j.title} — remote, but only for ${onlyFor}`);
    continue;
  }
  // QA must be software testing; every other role must be on the JS/TS stack.
  const off = live && (key === "qa" ? (isSoftwareQA(j.title, description) ? false : "not software QA") : offStack(j.title, description));
  if (off) {
    // Only jobs that pass the filter are kept in the database.
    toDelete.push(j.id);
    hidden.push(`${j.title} — ${off}`);
    continue;
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
if (toDelete.length) await prisma.job.deleteMany({ where: { id: { in: toDelete } } });
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
console.log(`Re-tagged ${retagged} of ${jobs.length} jobs; removed ${hidden.length} that no longer pass the filter:`);
for (const h of hidden) console.log(`  - ${h}`);
if (restored.length) console.log(`Restored ${restored.length}: ${restored.join("; ")}`);
if (level2.length) {
  console.log(`Published ${level2.length} experienced roles in Level 2:`);
  for (const t of level2) console.log(`  + ${t}`);
}
await prisma.$disconnect();
