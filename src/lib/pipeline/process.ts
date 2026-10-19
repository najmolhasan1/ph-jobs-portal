import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { JobStatus, SourceKey } from "@/lib/models";
import { adapters, type NormalizedJob } from "@/lib/sources";
import { INGEST_DAYS, startOfDayDhaka } from "@/lib/time";
import { fingerprint } from "./fingerprint";
import { extractWithLLM } from "./llm";
import { evaluate, type Decision } from "./rules";

export interface ProcessStats {
  fetched: number;
  created: number; // published on the portal
  queued: number; // sent to moderation
  merged: number; // already known (same post, or same job on another platform)
  rejected: number;
  stale: number; // posted before the collection window
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
  opts: { storeRaw: boolean; maxAgeDays: number },
): Promise<keyof Omit<ProcessStats, "fetched">> {
  const job = adapters[source].normalize(raw);
  if (!job) return "skipped";
  // Only pick up recent posts (last INGEST_DAYS Dhaka days). Undated posts count as new.
  if (opts.maxAgeDays && job.postedAt && job.postedAt < startOfDayDhaka(opts.maxAgeDays - 1)) return "stale";

  if (opts.storeRaw) await prisma.rawItem.create({ data: { source, externalId: job.externalId, runId, payload: raw as Prisma.InputJsonValue } });

  // Same source + id already stored → nothing new (overlapping check windows).
  if (job.externalId) {
    const seen = await prisma.jobSource.findUnique({ where: { source_externalId: { source, externalId: job.externalId } }, select: { id: true } });
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
  const existing = await prisma.job.findUnique({ where: { fingerprint: fp }, include: { sources: true } });
  if (existing) {
    if (!existing.sources.some((s) => s.source === source && s.url === (link.url ?? null))) {
      await prisma.jobSource.create({ data: { ...link, jobId: existing.id } });
    }
    return "merged";
  }

  const description = job.unstructured ? redact(fields.description) : fields.description;
  await prisma.job.create({
    data: {
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
      sources: { create: [link] },
      postedAt: job.postedAt ?? new Date(),
      deadline: fields.deadline && !Number.isNaN(fields.deadline.getTime()) ? fields.deadline : undefined,
      relevance: verdict.score,
      category: verdict.category,
      tracks: verdict.tracks,
      classifiedBy: byLLM ? "llm" : "rules",
      reason: verdict.reason,
      status,
      publishedAt: status === "approved" ? new Date() : undefined,
    },
  });
  return status === "approved" ? "created" : status === "pending" ? "queued" : "rejected";
}

export async function processItems(
  source: SourceKey,
  items: Record<string, unknown>[],
  runId?: string,
  { storeRaw = true, maxAgeDays = INGEST_DAYS } = {},
): Promise<ProcessStats> {
  const stats: ProcessStats = { fetched: items.length, created: 0, queued: 0, merged: 0, rejected: 0, stale: 0, skipped: 0 };
  for (const raw of items) {
    try {
      stats[await processOne(source, raw, runId, { storeRaw, maxAgeDays })]++;
    } catch (error) {
      // A duplicate-key race between overlapping checks is just a merge.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") stats.merged++;
      else {
        stats.skipped++;
        console.error(`[process] ${source} item failed`, error);
      }
    }
  }
  return stats;
}

/**
 * Housekeeping: drop raw items older than 14 days. Jobs themselves are never hidden automatically —
 * once published, a job stays on the portal (newest first) until a moderator rejects it.
 */
export async function cleanupRawItems(): Promise<number> {
  const res = await prisma.rawItem.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 14 * 864e5) } } });
  return res.count;
}
