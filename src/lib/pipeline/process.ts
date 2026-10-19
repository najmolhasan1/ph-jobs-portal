import { Job, RawItem, type JobStatus, type SourceKey } from "@/lib/models";
import { adapters, type NormalizedJob } from "@/lib/sources";
import { isTodayInDhaka } from "@/lib/time";
import { fingerprint } from "./fingerprint";
import { extractWithLLM } from "./llm";
import { evaluate, type Decision } from "./rules";

export interface ProcessStats {
  fetched: number;
  created: number; // published on the portal
  queued: number; // sent to moderation
  merged: number; // already known (same post, or same job on another platform)
  rejected: number;
  stale: number; // not posted today
  skipped: number;
}

const STATUS: Record<Decision, JobStatus> = { approve: "approved", review: "pending", reject: "rejected" };

/** Keep personal contact details from Facebook posts off the public portal. */
function redact(text?: string): string | undefined {
  return text
    ?.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email hidden]")
    .replace(/(\+?88[\s-]?)?01[3-9]\d{2}[\s-]?\d{6}\b/g, "[phone hidden]");
}

async function processOne(
  source: SourceKey,
  raw: Record<string, unknown>,
  runId: string | undefined,
  opts: { storeRaw: boolean; todayOnly: boolean },
): Promise<keyof Omit<ProcessStats, "fetched">> {
  const job = adapters[source].normalize(raw);
  if (!job) return "skipped";
  // Portal shows only jobs posted today (Dhaka time). Undated posts count as new.
  if (opts.todayOnly && job.postedAt && !isTodayInDhaka(job.postedAt)) return "stale";

  if (opts.storeRaw) await RawItem.create({ source, externalId: job.externalId, runId, payload: raw });

  // Same source + id already stored → nothing new (overlapping check windows).
  if (job.externalId) {
    const seen = await Job.exists({ "sources.source": source, "sources.externalId": job.externalId });
    if (seen) return "merged";
  }

  let verdict = evaluate(job);
  const fields: NormalizedJob & { level?: string } = { ...job, skills: verdict.skills, level: verdict.level, isRemote: verdict.isRemote };
  let summary: string | undefined;
  let byLLM = false;

  // The LLM (if configured) settles what rules can't: free-text posts and unstated levels.
  if (verdict.decision === "review") {
    const ai = await extractWithLLM(job);
    if (ai) {
      byLLM = true;
      summary = ai.summary;
      Object.assign(fields, {
        title: ai.title || fields.title,
        company: ai.company ?? fields.company,
        location: ai.location ?? fields.location,
        isRemote: ai.isRemote || fields.isRemote,
        jobType: ai.jobType ?? fields.jobType,
        salary: ai.salary ?? fields.salary,
        skills: [...new Set([...ai.skills, ...verdict.skills])],
        deadline: ai.deadline ? new Date(ai.deadline) : fields.deadline,
      });
      const juniorish = ai.level === "intern" || ai.level === "junior";
      const ok = ai.isJobPost && ai.isRelevant && !ai.isSpam && juniorish;
      verdict = {
        ...verdict,
        level: ai.level ?? verdict.level,
        decision: ok && ai.relevance >= 0.8 ? "approve" : ok ? "review" : "reject",
        reason: ok ? `${ai.level} dev role (AI checked)` : `AI: ${!ai.isRelevant ? "not a dev role" : !juniorish ? `${ai.level ?? "unknown"} level` : "not a job post"}`,
      };
      fields.level = verdict.level;
    }
  }

  const status = STATUS[verdict.decision];
  const link = { source, url: job.sourceUrl, externalId: job.externalId, postedAt: job.postedAt };
  const fp = fingerprint(fields);

  // Cross-platform duplicate → attach this source to the existing job.
  const existing = await Job.findOne({ fingerprint: fp });
  if (existing) {
    if (!existing.sources.some((s) => s.source === source && s.url === link.url)) {
      existing.sources.push(link);
      await existing.save();
    }
    return "merged";
  }

  const description = job.unstructured ? redact(fields.description) : fields.description;
  await Job.create({
    fingerprint: fp,
    title: fields.title,
    company: fields.company,
    location: fields.location,
    isRemote: Boolean(fields.isRemote),
    jobType: fields.jobType,
    level: fields.level,
    experience: job.experience,
    salary: fields.salary,
    description,
    summary: summary ?? description?.slice(0, 280),
    skills: fields.skills,
    applyUrl: fields.applyUrl ?? job.sourceUrl,
    sources: [link],
    postedAt: job.postedAt ?? new Date(),
    deadline: fields.deadline && !Number.isNaN(fields.deadline.getTime()) ? fields.deadline : undefined,
    relevance: verdict.score,
    category: verdict.category,
    tracks: verdict.tracks,
    classifiedBy: byLLM ? "llm" : "rules",
    reason: verdict.reason,
    status,
    publishedAt: status === "approved" ? new Date() : undefined,
  });
  return status === "approved" ? "created" : status === "pending" ? "queued" : "rejected";
}

export async function processItems(
  source: SourceKey,
  items: Record<string, unknown>[],
  runId?: string,
  { storeRaw = true, todayOnly = true } = {},
): Promise<ProcessStats> {
  const stats: ProcessStats = { fetched: items.length, created: 0, queued: 0, merged: 0, rejected: 0, stale: 0, skipped: 0 };
  for (const raw of items) {
    try {
      stats[await processOne(source, raw, runId, { storeRaw, todayOnly })]++;
    } catch (error) {
      // A duplicate-key race between overlapping checks is just a merge.
      if ((error as { code?: number }).code === 11000) stats.merged++;
      else {
        stats.skipped++;
        console.error(`[process] ${source} item failed`, error);
      }
    }
  }
  return stats;
}

/** Hide jobs past their deadline, or older than `days` (the portal is about fresh jobs). */
export async function expireJobs(days = 7): Promise<number> {
  const now = new Date();
  const res = await Job.updateMany(
    {
      status: { $in: ["approved", "pending"] },
      $or: [{ deadline: { $lt: now } }, { postedAt: { $lt: new Date(now.getTime() - days * 864e5) } }],
    },
    { $set: { status: "expired" } },
  );
  return res.modifiedCount;
}
