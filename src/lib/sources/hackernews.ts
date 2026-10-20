import { decodeEntities } from "./feed";
import { fetchJson } from "./http";
import { stripHtml } from "./pick";
import type { RawItem, SourceAdapter } from "./types";

// Hacker News "Ask HN: Who is hiring?" — the monthly thread where companies post one comment
// per opening, usually "Company | Role | Location | REMOTE | …" on the first line. Read through
// the free Algolia HN API; only top-level comments are job posts.
const ALGOLIA = "https://hn.algolia.com/api/v1";

/** "REMOTE (US only)", "Remote - Europe" → the regions; worldwide/anywhere → none. */
function remoteRegions(firstLine: string): string[] {
  if (!/remote/i.test(firstLine) || /worldwide|anywhere|global/i.test(firstLine)) return [];
  const m = firstLine.match(/\b(us|usa|u\.s\.|united states|north america|americas|canada|uk|united kingdom|eu|europe|emea|latam|germany|india)\b/gi);
  return m ? [...new Set(m.map((s) => s.toUpperCase()))] : [];
}

export const hackernews: SourceAdapter = {
  key: "hackernews",
  name: "Hacker News (Who is hiring)",
  kind: "direct",
  intervalMinutes: 180,
  enabledByDefault: true,
  defaultConfig: {},
  async fetchNew({ since }) {
    const stories = await fetchJson<{ hits: RawItem[] }>(`${ALGOLIA}/search_by_date?tags=story,author_whoishiring&hitsPerPage=10`);
    const thread = stories.hits.find((h) => /who is hiring/i.test(String(h.title)));
    if (!thread) return [];
    const after = Math.floor((since.getTime() - 60_000) / 1000);
    const out: RawItem[] = [];
    for (let page = 0; page < 10; page++) {
      const res = await fetchJson<{ hits: RawItem[]; nbPages: number }>(
        `${ALGOLIA}/search_by_date?tags=comment,story_${thread.objectID}&numericFilters=created_at_i>${after}&hitsPerPage=500&page=${page}`,
      );
      out.push(...res.hits.filter((c) => String(c.parent_id) === String(thread.objectID)));
      if (page + 1 >= res.nbPages) break;
    }
    return out;
  },
  normalize(raw) {
    const html = String(raw.comment_text ?? "");
    const text = stripHtml(decodeEntities(html.replace(/<p>/gi, "\n\n")));
    if (!text || text.length < 40) return null;
    const firstLine = text.split("\n")[0].trim();
    const parts = firstLine.split("|").map((s) => s.trim());
    const regions = remoteRegions(firstLine);
    const url = `https://news.ycombinator.com/item?id=${raw.objectID}`;
    return {
      source: "hackernews",
      externalId: String(raw.objectID),
      sourceUrl: url,
      applyUrl: url,
      title: firstLine.slice(0, 140),
      company: parts.length > 1 ? parts[0].slice(0, 80) : undefined,
      isRemote: /remote/i.test(firstLine),
      remoteCountries: regions,
      description: text.slice(0, 4000),
      postedAt: raw.created_at_i ? new Date(Number(raw.created_at_i) * 1000) : undefined,
      // Free text: the gate reads the whole post (role, level, location).
      unstructured: true,
    };
  },
};
