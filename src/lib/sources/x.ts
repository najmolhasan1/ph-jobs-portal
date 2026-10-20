import { runActor } from "@/lib/apify";
import { pickDate, pickStr } from "./pick";
import type { SourceAdapter } from "./types";

// X (Twitter) hiring tweets. X has no free API, so this runs an Apify actor
// (memo23/x-twitter-search-scraper: ~$0.005 a run + $0.0004 a tweet). Search operators keep it
// to recent original hiring tweets; the gate then reads each tweet like a social post.
export const x: SourceAdapter = {
  key: "x",
  name: "X (Twitter)",
  kind: "apify",
  intervalMinutes: 180,
  enabledByDefault: true,
  defaultConfig: {
    actorId: "memo23/x-twitter-search-scraper",
    queries: [
      '("hiring" OR "we are hiring" OR "we\'re hiring") ("react developer" OR "frontend developer" OR "front-end developer" OR "full stack developer" OR "node.js developer" OR "mern stack") -filter:replies -filter:retweets lang:en',
      '("hiring" OR "job opening" OR "vacancy") (developer OR engineer OR "sqa") (bangladesh OR dhaka) -filter:replies -filter:retweets',
      '("hiring" OR "we are hiring") ("junior developer" OR "intern" OR "fresher") (javascript OR typescript OR react OR "next.js") -filter:replies -filter:retweets lang:en',
    ],
    maxTweetsPerQuery: 20,
  },
  async fetchNew({ since, config }) {
    const day = since.toISOString().slice(0, 10);
    const queries = ((config.queries as string[] | undefined) ?? []).map((q) => `${q} since:${day}`);
    if (!queries.length) return [];
    const max = Number(config.maxTweetsPerQuery) || 20;
    const items = await runActor(String(config.actorId), {
      searchQueries: queries,
      searchType: "Latest",
      maxTweetsPerQuery: max,
      maxItems: max * queries.length,
      includeProfile: false,
    });
    return items.filter((t) => (pickDate(t, "createdAt", "created_at", "date")?.getTime() ?? Date.now()) > since.getTime() - 60_000);
  },
  normalize(raw) {
    const text = pickStr(raw, "text", "fullText", "full_text", "content");
    if (!text || text.length < 30) return null;
    const handle = pickStr(raw, "authorHandle", "author.userName", "author.username", "user.screen_name", "username");
    const id = pickStr(raw, "tweetId", "id", "id_str");
    const url = pickStr(raw, "url", "tweetUrl", "twitterUrl") ?? (handle && id ? `https://x.com/${handle}/status/${id}` : undefined);
    // Title: the first meaningful line, without links.
    const lines = text.split("\n").map((l) => l.replace(/https?:\/\/\S+/g, "").trim());
    const firstLine = lines.find((l) => l.length > 8) ?? text;
    return {
      source: "x",
      externalId: id ?? url,
      sourceUrl: url,
      applyUrl: url,
      title: firstLine.slice(0, 140),
      company: pickStr(raw, "authorName", "author.name") ?? (handle ? `@${handle}` : undefined),
      isRemote: /\b(remote|anywhere|worldwide|wfh)\b/i.test(text),
      description: text.slice(0, 4000),
      postedAt: pickDate(raw, "createdAt", "created_at", "date"),
      unstructured: true,
    };
  },
};
