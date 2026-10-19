import { createHash } from "node:crypto";
import type { NormalizedJob } from "@/lib/sources";

const COMPANY_NOISE = /\b(ltd|limited|pvt|private|inc|llc|plc|co|company|bd|bangladesh)\b/g;
const TITLE_NOISE = /\b(urgent|hiring|wanted|needed|required|job|vacancy|opening|position|for|we are|immediate)\b/g;

function clean(s: string | undefined, noise?: RegExp): string {
  let out = (s ?? "").toLowerCase().replace(/\(.*?\)|\[.*?\]/g, " ");
  if (noise) out = out.replace(noise, " ");
  return out.replace(/[^a-z0-9ঀ-৿]+/g, " ").trim();
}

/**
 * Same job posted on several sources → same fingerprint.
 * Location is left out on purpose: sources word it differently
 * ("Dhaka" vs "Anywhere in Bangladesh") for the very same listing.
 * Free-text posts with no company fall back to a hash of the body.
 */
export function fingerprint(job: NormalizedJob): string {
  const company = clean(job.company, COMPANY_NOISE);
  const key = company
    ? `${company}|${clean(job.title, TITLE_NOISE)}`
    : `body|${clean(job.description ?? job.title).slice(0, 300)}`;
  return createHash("sha1").update(key).digest("hex");
}
