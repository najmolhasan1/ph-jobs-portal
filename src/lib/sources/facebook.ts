import { runActor } from "@/lib/apify";
import groups from "../../../data/facebook-groups.json";
import { pickDate, pickStr } from "./pick";
import type { SourceAdapter } from "./types";

/** "&#064;" → "@", "&amp;" → "&" (group names and posts arrive HTML-escaped). */
function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// Facebook group posts are free text (often Bangla/Banglish, often in 𝗯𝗼𝗹𝗱 Unicode fonts).
// memo23's actor reads public groups without login (listed at $1.5 per 1,000 posts, the cheapest
// option found). Measured Oct 2026: ~$0.0037 per post incl. start/extra fees, ~300 posts/day across
// the active groups. Hourly checks with the hour filter keep each run to new posts (~$1/day).
// Tested Oct 2026: 36 of the 59 listed groups returned posts; the rest are private or quiet.
export const facebook: SourceAdapter = {
  key: "facebook",
  name: "Facebook Groups",
  kind: "apify",
  intervalMinutes: 60,
  enabledByDefault: true,
  defaultConfig: {
    actorId: "memo23/facebook-public-group-posts-scraper",
    groups: groups as string[],
    maxPostsPerGroup: 10,
  },
  async fetchNew({ since, config }) {
    const list = (config.groups as string[] | undefined) ?? [];
    if (!list.length) return [];
    const hours = Math.max(1, Math.ceil((Date.now() - since.getTime()) / 3600_000));
    return runActor(String(config.actorId), {
      startUrls: list.map((url) => ({ url })),
      onlyPostsNewerThanHours: hours,
      maxItems: Number(config.maxPostsPerGroup) || 15,
      viewOption: "CHRONOLOGICAL",
      // Don't use the actor's monitoringMode: measured Oct 2026, it re-reads every previously seen
      // post and bills ~740 "additional-data" events (~$0.74) per run to return a handful of new
      // posts. The hour filter alone stops pagination at older posts; our dedup handles overlap.
    });
  },
  normalize(raw) {
    const original = pickStr(raw, "text", "message", "postText", "content");
    if (!original || original.length < 40) return null;
    // NFKC turns "𝗪𝗘’𝗥𝗘 𝗛𝗜𝗥𝗜𝗡𝗚" into "WE’RE HIRING" so the filter can read it.
    const text = decodeEntities(original.normalize("NFKC"));
    // Posts often carry markdown ("**We're hiring**", "## Title") — strip it for the title.
    const firstLine = (text.split("\n").find((l) => l.trim().length > 5)?.trim() ?? text)
      .replace(/[*_#`]+/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return {
      source: "facebook",
      externalId: pickStr(raw, "legacyId", "postId", "id"),
      sourceUrl: pickStr(raw, "url", "postUrl"),
      applyUrl: pickStr(raw, "url", "postUrl"),
      title: firstLine.slice(0, 120),
      company: pickStr(raw, "groupTitle") ? `via ${decodeEntities(pickStr(raw, "groupTitle")!)}` : undefined,
      isRemote: /\b(remote|work from home|wfh|anywhere)\b|ঘরে বসে/i.test(text),
      description: text,
      postedAt: pickDate(raw, "time", "timestamp", "date", "createdAt"),
      unstructured: true,
    };
  },
};
