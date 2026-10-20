import { regionList } from "./feed";
import { fetchJson } from "./http";
import { pickStr, stripHtml } from "./pick";
import type { RawItem, SourceAdapter } from "./types";

// Remotive (remote jobs) public API, software-development category. Terms: link back to
// Remotive and call it only a few times a day — its listings are published with a delay anyway.
export const remotive: SourceAdapter = {
  key: "remotive",
  name: "Remotive (remote)",
  kind: "direct",
  intervalMinutes: 360,
  enabledByDefault: true,
  defaultConfig: { category: "software-dev" },
  async fetchNew({ since, config }) {
    const res = await fetchJson<{ jobs?: RawItem[] }>(
      `https://remotive.com/api/remote-jobs?category=${encodeURIComponent(String(config.category ?? "software-dev"))}`,
    );
    return (res.jobs ?? []).filter((j) => Date.parse(`${j.publication_date}Z`) > since.getTime() - 60_000);
  },
  normalize(raw) {
    const title = pickStr(raw, "title");
    const url = pickStr(raw, "url");
    if (!title || !url) return null;
    const where = pickStr(raw, "candidate_required_location");
    const countries = regionList(where);
    return {
      source: "remotive",
      externalId: String(raw.id ?? url),
      sourceUrl: url,
      applyUrl: url,
      title,
      company: pickStr(raw, "company_name"),
      location: countries.length ? `Remote (${countries.join(", ")})` : "Remote (worldwide)",
      isRemote: true,
      remoteCountries: countries,
      jobType: pickStr(raw, "job_type"),
      salary: pickStr(raw, "salary") || undefined,
      description: stripHtml(pickStr(raw, "description"))?.slice(0, 4000),
      skills: raw.tags as string[] | undefined,
      postedAt: raw.publication_date ? new Date(`${raw.publication_date}Z`) : undefined,
    };
  },
};
