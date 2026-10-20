import { decodeEntities, regionList } from "./feed";
import { eachTolerant, fetchJson } from "./http";
import { pickStr, stripHtml } from "./pick";
import type { RawItem, SourceAdapter } from "./types";

// Company career pages hosted on Greenhouse expose a free public JSON API. The list is set in
// Admin → Platforms (board tokens, e.g. "canonical" for boards.greenhouse.io/canonical).
// Defaults: remote-first companies that hire worldwide, Asia included.
export const greenhouse: SourceAdapter = {
  key: "greenhouse",
  name: "Company career pages (Greenhouse)",
  kind: "direct",
  intervalMinutes: 120,
  enabledByDefault: true,
  defaultConfig: { boards: ["canonical", "gitlab", "automatticcareers"] },
  async fetchNew({ since, config }) {
    const out: RawItem[] = [];
    await eachTolerant((config.boards as string[] | undefined) ?? [], async (board) => {
      const res = await fetchJson<{ jobs?: RawItem[] }>(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`);
      // Greenhouse gives no publish date in the list — `updated_at` (also bumped on edits) stands in.
      for (const j of res.jobs ?? []) if (Date.parse(String(j.updated_at)) > since.getTime() - 60_000) out.push({ ...j, board });
    }, 400);
    return out;
  },
  normalize(raw) {
    const title = pickStr(raw, "title");
    const url = pickStr(raw, "absolute_url");
    if (!title || !url) return null;
    const where = pickStr(raw, "location.name") ?? "";
    const remote = /remote|home based|anywhere|worldwide/i.test(where);
    return {
      source: "greenhouse",
      externalId: String(raw.id ?? url),
      sourceUrl: url,
      applyUrl: url,
      title,
      company: pickStr(raw, "company_name") ?? String(raw.board ?? ""),
      location: where || undefined,
      isRemote: remote,
      remoteCountries: remote ? regionList(where) : undefined,
      description: stripHtml(decodeEntities(pickStr(raw, "content") ?? ""))?.slice(0, 4000),
      postedAt: raw.updated_at ? new Date(String(raw.updated_at)) : undefined,
    };
  },
};
