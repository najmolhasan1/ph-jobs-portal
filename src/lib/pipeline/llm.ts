import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { NormalizedJob } from "@/lib/sources";

// Stage-2 classifier + field extractor. Optional: only runs when ANTHROPIC_API_KEY is set.

const Extraction = z.object({
  isJobPost: z.boolean().describe("True only if this is an actual job/internship opening"),
  isRelevant: z
    .boolean()
    .describe("True if the role is software/web development (frontend, backend, full-stack, MERN, JS/TS, mobile, QA, DevOps)"),
  isSpam: z.boolean().describe("Fee-based, MLM, scam, or course promotion disguised as a job"),
  relevance: z.number().describe("0 to 1 confidence that this is a relevant dev job"),
  title: z.string().describe("Clean English job title"),
  company: z.string().nullable(),
  location: z.string().nullable(),
  isRemote: z.boolean(),
  jobType: z.enum(["fulltime", "parttime", "contract", "internship", "freelance"]).nullable(),
  level: z.enum(["intern", "junior", "mid", "senior"]).nullable(),
  salary: z.string().nullable(),
  skills: z.array(z.string()).describe("Tech skills, canonical names e.g. React, Node.js, MongoDB"),
  deadline: z.string().nullable().describe("Application deadline as YYYY-MM-DD, if stated"),
  category: z.enum(["frontend", "backend", "fullstack", "mobile", "other"]),
  summary: z.string().describe("2 sentence English summary for students. No phone numbers or emails."),
});
export type ExtractionResult = z.infer<typeof Extraction>;

const SYSTEM = `You screen job posts for Programming Hero, a Bangladeshi coding school whose students learn web development (MERN stack).
Posts come from LinkedIn, BDJobs, Indeed and Facebook groups and may be in English, Bangla or Banglish.
Extract the fields faithfully from the post; use null when something is not stated. Do not invent companies, salaries or deadlines.`;

let client: Anthropic | null = null;

export function llmEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function extractWithLLM(job: NormalizedJob): Promise<ExtractionResult | null> {
  if (!llmEnabled()) return null;
  client ??= new Anthropic();

  const post = [
    `Source: ${job.source}`,
    job.title && !job.unstructured ? `Title: ${job.title}` : null,
    job.company ? `Company: ${job.company}` : null,
    job.location ? `Location: ${job.location}` : null,
    job.salary ? `Salary: ${job.salary}` : null,
    `Post:\n${(job.description ?? job.title).slice(0, 6000)}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await client.messages.parse({
      model: process.env.CLAUDE_MODEL || "claude-opus-5-5",
      max_tokens: 4000,
      output_config: { effort: "low", format: zodOutputFormat(Extraction) },
      system: SYSTEM,
      messages: [{ role: "user", content: post }],
    });
    if (response.stop_reason === "refusal") return null;
    return response.parsed_output ?? null;
  } catch (error) {
    // Never let the LLM block ingestion — fall back to rules + moderation.
    if (error instanceof Anthropic.APIError) {
      console.error(`[llm] API error ${error.status}: ${error.message}`);
    } else {
      console.error("[llm] extraction failed", error);
    }
    return null;
  }
}
