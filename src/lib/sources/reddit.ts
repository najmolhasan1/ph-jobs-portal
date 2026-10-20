import { xmlAttr, xmlBlocks, xmlText } from "./feed";
import { fetchText } from "./http";
import { pickDate, pickStr, stripHtml } from "./pick";
import type { RawItem, SourceAdapter } from "./types";

// Reddit "[Hiring]" posts from job subreddits, via the free public RSS feed of all of them
// combined (newest 100 posts).
// (This used an Apify actor before, ~$0.12 a run; raw items from it still normalize below.)
const JOB_ONLY = new Set(["remotejs"]); // every post there is an opening, no [Hiring] tag needed

export const reddit: SourceAdapter = {
  key: "reddit",
  name: "Reddit",
  kind: "direct",
  intervalMinutes: 60,
  enabledByDefault: true,
  defaultConfig: { subreddits: ["forhire", "remotejs", "jobbit", "hiring", "WebDeveloperJobs", "DeveloperJobs"] },
  async fetchNew({ since, config }) {
    // One combined feed (r/a+b+c) — Reddit rate-limits several feed requests in a row.
    const subs = ((config.subreddits as string[] | undefined) ?? []).join("+");
    if (!subs) return [];
    const xml = await fetchText(`https://www.reddit.com/r/${subs}/new/.rss?limit=100`);
    const out: RawItem[] = [];
    for (const entry of xmlBlocks(xml, "entry")) {
      const published = Date.parse(xmlText(entry, "published") ?? xmlText(entry, "updated") ?? "");
      if (published <= since.getTime() - 60_000) continue;
      out.push({
        format: "rss",
        subreddit: xmlAttr(entry, "category", "term"),
        id: xmlText(entry, "id"),
        title: xmlText(entry, "title"),
        url: xmlAttr(entry, "link", "href"),
        html: xmlText(entry, "content"),
        published,
      });
    }
    return out;
  },
  normalize(raw) {
    const rss = raw.format === "rss";
    const rawTitle = pickStr(raw, "title");
    const sub = rss ? String(raw.subreddit ?? "") : String(pickStr(raw, "communityName") ?? "").replace(/^r\//, "");
    const tagged = !!rawTitle && /\[\s*hiring\s*\]/i.test(rawTitle);
    const flair = /^hiring$/i.test(pickStr(raw, "flair", "linkFlairText") ?? "");
    // Only employers' posts: "[Hiring]" tags, a Hiring flair, or a jobs-only subreddit.
    if (!rawTitle || !(tagged || flair || JOB_ONLY.has(sub.toLowerCase()))) return null;
    const title = rawTitle.replace(/\[\s*hiring\s*\]\s*[-:|]?\s*/i, "").trim();
    // RSS content wraps the post body with "submitted by /u/… [link] [comments]" — drop that.
    const text = rss
      ? (stripHtml(String(raw.html ?? "")) ?? "").replace(/\s*submitted by\s+\/u\/[\s\S]*$/i, "").trim()
      : (pickStr(raw, "body", "selftext", "text") ?? "");
    const url = rss ? (raw.url as string | undefined) : pickStr(raw, "postUrl", "url", "link");
    return {
      source: "reddit",
      externalId: (rss ? String(raw.id ?? "").replace(/^t3_/, "") : pickStr(raw, "id", "postId")) || url,
      sourceUrl: url,
      applyUrl: url,
      title,
      company: sub ? `r/${sub}` : undefined,
      isRemote: /\b(remote|anywhere|worldwide)\b/i.test(`${title} ${text}`),
      description: text.slice(0, 4000),
      postedAt: rss ? new Date(Number(raw.published)) : pickDate(raw, "createdAt", "created", "createdUtc"),
      unstructured: true,
    };
  },
};
