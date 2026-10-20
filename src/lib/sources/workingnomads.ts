import { regionList } from "./feed";
import { fetchJson } from "./http";
import { pickStr, stripHtml } from "./pick";
import type { RawItem, SourceAdapter } from "./types";

// Working Nomads public feed of remote jobs; we keep the Development category.
// Locations list regions ("Europe, LATAM, APAC") — APAC / Asia count as open to Bangladesh.
export const workingnomads: SourceAdapter = {
  key: "workingnomads",
  name: "Working Nomads (remote)",
  kind: "direct",
  intervalMinutes: 60,
  enabledByDefault: true,
  defaultConfig: { category: "Development" },
  async fetchNew({ since, config }) {
    const list = await fetchJson<RawItem[]>("https://www.workingnomads.com/api/exposed_jobs/");
    const category = String(config.category ?? "Development");
    return list.filter((j) => j.category_name === category && Date.parse(String(j.pub_date)) > since.getTime() - 60_000);
  },
  normalize(raw) {
    const title = pickStr(raw, "title");
    const url = pickStr(raw, "url");
    if (!title || !url) return null;
    const countries = regionList(pickStr(raw, "location"));
    return {
      source: "workingnomads",
      externalId: url,
      sourceUrl: url,
      applyUrl: url,
      title,
      company: pickStr(raw, "company_name"),
      location: countries.length ? `Remote (${countries.join(", ")})` : "Remote (worldwide)",
      isRemote: true,
      remoteCountries: countries,
      description: stripHtml(pickStr(raw, "description"))?.slice(0, 4000),
      skills: pickStr(raw, "tags")?.split(",").map((s) => s.trim()).filter(Boolean),
      postedAt: raw.pub_date ? new Date(String(raw.pub_date)) : undefined,
    };
  },
};
