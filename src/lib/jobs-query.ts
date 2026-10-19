import { isValidObjectId, Types } from "mongoose";
import { Job, JOB_STATUSES, SOURCE_KEYS, type JobStatus } from "@/lib/models";
import { startOfDayDhaka, startOfTodayDhaka } from "@/lib/time";

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
    ids: sp.get("ids")?.split(",").filter((id) => isValidObjectId(id)).slice(0, 100),
    before: sp.get("before") ?? undefined,
    limit: Number(sp.get("limit")) || undefined,
  };
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Plain object rather than mongoose's FilterQuery<T>, whose generics are very slow to typecheck.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MongoFilter = Record<string, any>;

export function buildQuery(f: JobFilters): MongoFilter {
  const query: MongoFilter = { status: f.status ?? "approved" };
  if (f.q?.trim()) {
    const re = new RegExp(escape(f.q.trim()), "i");
    query.$or = [{ title: re }, { company: re }, { skills: re }, { location: re }];
  }
  if (f.source && SOURCE_KEYS.includes(f.source as never)) query["sources.source"] = f.source;
  if (f.remote === "1") query.isRemote = true;
  if (f.remote === "0") query.isRemote = false;
  if (f.level) query.level = f.level;
  if (f.category) query.category = f.category;
  if (f.track) query.tracks = f.track;
  if (f.ids) query._id = { $in: f.ids.map((id) => new Types.ObjectId(id)) };
  if (f.posted === "today") query.postedAt = { $gte: startOfTodayDhaka() };
  else if (f.posted === "3" || f.posted === "7") query.postedAt = { $gte: startOfDayDhaka(Number(f.posted) - 1) };
  if (f.skill) query.skills = new RegExp(`^${escape(f.skill)}$`, "i");
  return query;
}

const LIST_FIELDS = "-description -fingerprint -__v";

/** Approved jobs per track for the mode cards, honouring every filter except the track itself. */
export async function trackCounts(f: JobFilters): Promise<Record<string, number>> {
  const query = buildQuery({ ...f, track: undefined, ids: undefined, before: undefined });
  const [all, rows] = await Promise.all([
    Job.countDocuments(query),
    Job.aggregate<{ _id: string; n: number }>([{ $match: query }, { $unwind: "$tracks" }, { $group: { _id: "$tracks", n: { $sum: 1 } } }]),
  ]);
  return { all, ...Object.fromEntries(rows.map((r) => [r._id, r.n])) };
}

export async function listJobs(f: JobFilters) {
  const query = buildQuery(f);
  // Public feed: newest original post first. Moderation views: newest arrival first.
  const sortField = (f.status ?? "approved") === "approved" ? "postedAt" : "createdAt";
  // Cursor is "<iso date>|<id>": boards give date-only post times, so many jobs tie on the date.
  if (f.before) {
    const [iso, id] = f.before.split("|");
    const at = new Date(iso);
    if (!Number.isNaN(at.getTime())) {
      const cursor: MongoFilter[] = [{ [sortField]: { $lt: at } }];
      if (id && isValidObjectId(id)) cursor.push({ [sortField]: at, _id: { $lt: new Types.ObjectId(id) } });
      query.$and = [...(query.$and ?? []), { $or: cursor }];
    }
  }
  const limit = Math.min(f.limit ?? 30, 100);
  const jobs = await Job.find(query)
    .sort({ [sortField]: -1, _id: -1 })
    .limit(limit)
    .select(LIST_FIELDS)
    .lean();
  return jobs.map(serializeJob);
}

// Plain JSON for API responses and client components.
export function serializeJob(j: object) {
  return JSON.parse(JSON.stringify({ ...j, id: String((j as { _id: unknown })._id), _id: undefined }));
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
