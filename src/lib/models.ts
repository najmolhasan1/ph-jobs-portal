import mongoose, { Schema, type Model } from "mongoose";

export const SOURCE_KEYS = [
  "bdjobs", "atb", "nextjobz", "linkedin", "linkedin_company", "facebook",
  "himalayas", "remoterocketship", "arc", "wellfound", "jobright", "reddit", "indeed",
] as const;
export type SourceKey = (typeof SOURCE_KEYS)[number];

export const JOB_STATUSES = ["approved", "pending", "rejected", "expired"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

const sourceLinkSchema = new Schema(
  {
    source: { type: String, enum: SOURCE_KEYS, required: true },
    url: String,
    externalId: String,
    postedAt: Date,
  },
  { _id: false },
);

const jobSchema = new Schema(
  {
    fingerprint: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    company: String,
    location: String,
    isRemote: { type: Boolean, default: false },
    jobType: String, // fulltime | parttime | contract | internship | freelance
    level: String, // intern | junior
    experience: String, // as the post states it, e.g. "0 to 2 years"
    salary: String,
    description: String,
    summary: String,
    skills: { type: [String], default: [] },
    applyUrl: String,
    sources: { type: [sourceLinkSchema], default: [] },
    postedAt: { type: Date, default: () => new Date() },
    deadline: Date,
    relevance: { type: Number, default: 0 },
    category: String, // frontend | backend | fullstack | mobile | qa | aiml | other
    /** Programming Hero tracks the job fits: level1 | level2 | phitron | aiml. */
    tracks: { type: [String], default: [], index: true },
    classifiedBy: String, // rules | llm
    /** Why the gate approved / queued / rejected it, e.g. "senior level", "not a dev role". */
    reason: String,
    status: { type: String, enum: JOB_STATUSES, default: "pending", index: true },
    /** When the job became visible on the portal (auto-approve or moderator approval). */
    publishedAt: Date,
  },
  { timestamps: true },
);
jobSchema.index({ status: 1, publishedAt: -1 });
jobSchema.index({ status: 1, postedAt: -1 });
jobSchema.index({ "sources.source": 1, "sources.externalId": 1 });
jobSchema.index({ title: "text", company: "text", description: "text", skills: "text" });

const sourceSchema = new Schema(
  {
    key: { type: String, enum: SOURCE_KEYS, required: true, unique: true },
    name: String,
    enabled: { type: Boolean, default: false },
    config: { type: Schema.Types.Mixed, default: {} },
    intervalMinutes: { type: Number, default: 10 },
    // Live worker status, shown in Admin.
    state: { type: String, default: "idle" }, // idle | checking | error
    lastCheckAt: Date,
    /** Start time of the last successful check; the next check asks for posts after this. */
    lastSuccessAt: Date,
    nextCheckAt: Date,
    lastError: String,
    consecutiveFailures: { type: Number, default: 0 },
  },
  { timestamps: true, minimize: false },
);

const runSchema = new Schema(
  {
    source: { type: String, enum: SOURCE_KEYS, required: true, index: true },
    status: { type: String, default: "RUNNING" }, // RUNNING | DONE | FAILED
    startedAt: { type: Date, default: () => new Date() },
    finishedAt: Date,
    since: Date,
    fetched: { type: Number, default: 0 },
    created: { type: Number, default: 0 },
    queued: { type: Number, default: 0 },
    merged: { type: Number, default: 0 },
    rejected: { type: Number, default: 0 },
    stale: { type: Number, default: 0 },
    error: String,
  },
  { timestamps: true },
);

const rawItemSchema = new Schema({
  source: { type: String, enum: SOURCE_KEYS, required: true },
  externalId: String,
  runId: String,
  payload: Schema.Types.Mixed,
  createdAt: { type: Date, default: () => new Date(), expires: 60 * 60 * 24 * 14 },
});

// Explicit interfaces: InferSchemaType makes tsc blow up on query generics.
type Id = mongoose.Types.ObjectId;

export interface SourceLink {
  source: SourceKey;
  url?: string;
  externalId?: string;
  postedAt?: Date;
}

export interface JobDoc {
  _id: Id;
  fingerprint: string;
  title: string;
  company?: string;
  location?: string;
  isRemote: boolean;
  jobType?: string;
  level?: string;
  experience?: string;
  salary?: string;
  description?: string;
  summary?: string;
  skills: string[];
  applyUrl?: string;
  sources: SourceLink[];
  postedAt: Date;
  deadline?: Date;
  relevance: number;
  category?: string;
  tracks: string[];
  classifiedBy?: string;
  reason?: string;
  status: JobStatus;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SourceDoc {
  _id: Id;
  key: SourceKey;
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
  intervalMinutes: number;
  state: "idle" | "checking" | "error";
  lastCheckAt?: Date;
  lastSuccessAt?: Date;
  nextCheckAt?: Date;
  lastError?: string;
  consecutiveFailures: number;
}

export interface RunDoc {
  _id: Id;
  source: SourceKey;
  status: string;
  startedAt: Date;
  finishedAt?: Date;
  since?: Date;
  fetched: number;
  created: number;
  queued: number;
  merged: number;
  rejected: number;
  stale: number;
  error?: string;
}

function model<T>(name: string, schema: Schema): Model<T> {
  // Cast instead of mongoose.model<T>(): the generic overload sends tsc into a memory spiral.
  return (mongoose.models[name] ?? mongoose.model(name, schema)) as unknown as Model<T>;
}

export const Job = model<JobDoc>("Job", jobSchema);
export const Source = model<SourceDoc>("Source", sourceSchema);
export const Run = model<RunDoc>("Run", runSchema);
export const RawItem = model<Record<string, unknown>>("RawItem", rawItemSchema);
