import type { Job, JobSource, Run, Source } from "@prisma/client";

// Tables live in prisma/schema.prisma; this file holds the shared constants and row types.

export const SOURCE_KEYS = [
  "bdjobs", "atb", "nextjobz", "linkedin", "linkedin_company", "facebook",
  "himalayas", "remoterocketship", "arc", "wellfound", "jobright", "reddit", "indeed",
  "skilljobs", "remotive", "remoteok", "jobicy", "workingnomads", "weworkremotely", "hackernews", "greenhouse", "x",
] as const;
export type SourceKey = (typeof SOURCE_KEYS)[number];

export const JOB_STATUSES = ["approved", "pending", "rejected", "expired"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export type JobRow = Job & { sources: JobSource[] };
export type SourceRow = Omit<Source, "key" | "config" | "state"> & {
  key: SourceKey;
  config: Record<string, unknown>;
  state: "idle" | "checking" | "error";
};
export type RunRow = Run;
