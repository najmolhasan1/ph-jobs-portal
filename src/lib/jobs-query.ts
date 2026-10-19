import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { JOB_STATUSES, SOURCE_KEYS, type JobStatus } from "@/lib/models";
import { KNOWN_SKILLS } from "@/lib/pipeline/rules";
import { startOfDayDhaka, startOfTodayDhaka } from "@/lib/time";
import { TRACK_KEYS } from "@/lib/tracks";

export interface JobFilters {
  q?: string;
  source?: string;
  remote?: string; // "1" remote only, "0" onsite only
  level?: string;
  category?: string;
  skill?: string;
  /** Programming Hero track: level1 | level2 | phitron | aiml. */
  track?: string;
  /** "today" (default on the portal), "3" or "7" days — by original post time, Dhaka calendar. */
  posted?: string;
  status?: JobStatus;
  /** Specific job ids (the "Saved" tab). */
  ids?: string[];
  before?: string; // postedAt cursor (ISO) for pagination
  limit?: number;
}

/** Job ids: cuid for new rows, 24-hex ObjectId for rows migrated from MongoDB. */
export const isJobId = (id: string) => /^[a-z0-9]{20,32}$/i.test(id);

export function filtersFromParams(sp: URLSearchParams): JobFilters {
  const status = sp.get("status");
  return {
    q: sp.get("q") ?? undefined,
    source: sp.get("source") ?? undefined,
    remote: sp.get("remote") ?? undefined,
    level: sp.get("level") ?? undefined,
    category: sp.get("category") ?? undefined,
    skill: sp.get("skill") ?? undefined,
    track: sp.get("track") ?? undefined,
    posted: sp.get("posted") ?? undefined,
    status: JOB_STATUSES.includes(status as JobStatus) ? (status as JobStatus) : undefined,
    ids: sp.get("ids")?.split(",").filter(isJobId).slice(0, 100),
    before: sp.get("before") ?? undefined,
    limit: Number(sp.get("limit")) || undefined,
  };
}

// Skills are stored under their canonical names ("Next.js"), so a case-insensitive match maps
// the search text onto those names (plus the text itself, for skills the AI added).
const skillsMatching = (text: string, exact: boolean) => {
  const t = text.toLowerCase();
  const names = KNOWN_SKILLS.filter((s) => (exact ? s.toLowerCase() === t : s.toLowerCase().includes(t)));
  return [...new Set([...names, text])];
};

export function buildWhere(f: JobFilters): Prisma.JobWhereInput {
  const and: Prisma.JobWhereInput[] = [{ status: f.status ?? "approved" }];
  const q = f.q?.trim();
  if (q) {
    const contains = { contains: q, mode: "insensitive" as const };
    and.push({ OR: [{ title: contains }, { company: contains }, { location: contains }, { skills: { hasSome: skillsMatching(q, false) } }] });
  }
  if (f.source && SOURCE_KEYS.includes(f.source as never)) and.push({ sources: { some: { source: f.source } } });
  if (f.remote === "1") and.push({ isRemote: true });
  if (f.remote === "0") and.push({ isRemote: false });
  if (f.level) and.push({ level: f.level });
  if (f.category) and.push({ category: f.category });
  if (f.track) and.push({ tracks: { has: f.track } });
  if (f.ids) and.push({ id: { in: f.ids } });
  if (f.posted === "today") and.push({ postedAt: { gte: startOfTodayDhaka() } });
  else if (f.posted === "3" || f.posted === "7") and.push({ postedAt: { gte: startOfDayDhaka(Number(f.posted) - 1) } });
  if (f.skill) and.push({ skills: { hasSome: skillsMatching(f.skill, true) } });
  return { AND: and };
}

/** List views leave out the long fields; the job page loads the full row. */
export const LIST_SELECT = { omit: { description: true, fingerprint: true }, include: { sources: true } } as const;

/** Approved jobs per track for the mode cards, honouring every filter except the track itself. */
export async function trackCounts(f: JobFilters): Promise<Record<string, number>> {
  const where = buildWhere({ ...f, track: undefined, ids: undefined, before: undefined });
  const [all, ...perTrack] = await Promise.all([
    prisma.job.count({ where }),
    ...TRACK_KEYS.map((t) => prisma.job.count({ where: { AND: [where, { tracks: { has: t } }] } })),
  ]);
  return { all, ...Object.fromEntries(TRACK_KEYS.map((t, i) => [t, perTrack[i]]).filter(([, n]) => n)) };
}

export async function listJobs(f: JobFilters) {
  const where = buildWhere(f);
  // Public feed: newest original post first. Moderation views: newest arrival first.
  const sortField = (f.status ?? "approved") === "approved" ? "postedAt" : "createdAt";
  // Cursor is "<iso date>|<id>": boards give date-only post times, so many jobs tie on the date.
  if (f.before) {
    const [iso, id] = f.before.split("|");
    const at = new Date(iso);
    if (!Number.isNaN(at.getTime())) {
      const cursor: Prisma.JobWhereInput[] = [{ [sortField]: { lt: at } }];
      if (id && isJobId(id)) cursor.push({ [sortField]: at, id: { lt: id } });
      (where.AND as Prisma.JobWhereInput[]).push({ OR: cursor });
    }
  }
  const jobs = await prisma.job.findMany({
    where,
    orderBy: [{ [sortField]: "desc" }, { id: "desc" }],
    take: Math.min(f.limit ?? 30, 100),
    ...LIST_SELECT,
  });
  return jobs.map(serializeJob);
}

// Plain JSON for API responses and client components: dates as ISO strings, nulls dropped.
export function serializeJob(j: object): JobDTO {
  return JSON.parse(JSON.stringify(j, (_k, v) => (v === null ? undefined : v)));
}

export type JobDTO = {
  id: string;
  title: string;
  company?: string;
  location?: string;
  isRemote: boolean;
  jobType?: string;
  level?: string;
  experience?: string;
  salary?: string;
  summary?: string;
  description?: string;
  skills: string[];
  applyUrl?: string;
  sources: { source: string; url?: string; postedAt?: string }[];
  postedAt?: string;
  publishedAt?: string;
  createdAt?: string;
  deadline?: string;
  relevance: number;
  category?: string;
  tracks?: string[];
  classifiedBy?: string;
  reason?: string;
  status: JobStatus;
};
