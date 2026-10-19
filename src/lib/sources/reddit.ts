import { runActor } from "@/lib/apify";
import { pickDate, pickStr } from "./pick";
import type { SourceAdapter } from "./types";

// Reddit "[Hiring]" posts via Apify (Reddit isn't reachable directly from every network).
// Keyword search sorted by new. Measured ~$0.12 per run, and few junior dev posts, so it runs every
// 6 hours over the last day by default (dedup drops repeats).
export const reddit: SourceAdapter = {
  key: "reddit",
  name: "Reddit",
  kind: "apify",
  intervalMinutes: 360,
  enabledByDefault: true,
  defaultConfig: {
    actorId: "harshmaur/reddit-scraper",
    searches: ["hiring frontend developer", "hiring react developer", "hiring full stack developer", "hiring node developer", "hiring junior web developer", "hiring qa engineer"],
    maxPostsPerSearch: 10,
    searchTime: "day", // "hour" with an hourly interval is fresher but ~6x the cost
  },
  async fetchNew({ config }) {
    return runActor(String(config.actorId), {
      searchTerms: (config.searches as string[] | undefined) ?? [],
      searchPosts: true,
      searchComments: false,
      searchCommunities: false,
      searchSort: "new",
      searchTime: String(config.searchTime ?? "day"),
      crawlCommentsPerPost: false,
      maxPostsCount: Number(config.maxPostsPerSearch) || 15,
    });
  },
  normalize(raw) {
    const rawTitle = pickStr(raw, "title");
    // Only employers' posts: r/forhire-style "[Hiring]" tags (or a "Hiring" flair).
    if (!rawTitle || !(/\[\s*hiring\s*\]/i.test(rawTitle) || /^hiring$/i.test(pickStr(raw, "flair", "linkFlairText") ?? ""))) return null;
    const title = rawTitle.replace(/\[\s*hiring\s*\]\s*[-:|]?\s*/i, "").trim();
    const text = pickStr(raw, "body", "selftext", "text") ?? "";
    const url = pickStr(raw, "postUrl", "url", "link");
    return {
      source: "reddit",
      externalId: pickStr(raw, "id", "postId") ?? url,
      sourceUrl: url,
      applyUrl: url,
      title,
      company: pickStr(raw, "communityName") ? `r/${String(pickStr(raw, "communityName")).replace(/^r\//, "")}` : undefined,
      isRemote: /\b(remote|anywhere|worldwide)\b/i.test(`${title} ${text}`),
      description: text.slice(0, 4000),
      postedAt: pickDate(raw, "createdAt", "created", "createdUtc"),
    };
  },
};
