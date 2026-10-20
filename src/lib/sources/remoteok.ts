import { regionList } from "./feed";
import { fetchJson } from "./http";
import { pickStr, stripHtml } from "./pick";
import type { RawItem, SourceAdapter } from "./types";

// Remote OK public API: the latest ~100 remote jobs (the first element is a legal notice).
// Terms: link back to Remote OK and name it as the source — every job links to its Remote OK page.
const DEV_TAGS = /\b(dev|developer|engineer|frontend|front end|backend|full ?stack|javascript|typescript|react|node|qa|testing|web)\b/i;

export const remoteok: SourceAdapter = {
  key: "remoteok",
  name: "Remote OK (remote)",
  kind: "direct",
  intervalMinutes: 60,
  enabledByDefault: true,
  defaultConfig: {},
  async fetchNew({ since }) {
    const list = await fetchJson<RawItem[]>("https://remoteok.com/api");
    return list
      .filter((j) => j.id && j.position)
      .filter((j) => DEV_TAGS.test(`${j.position} ${((j.tags as string[]) ?? []).join(" ")}`))
      .filter((j) => Number(j.epoch) * 1000 > since.getTime() - 60_000);
  },
  normalize(raw) {
    const title = pickStr(raw, "position");
    const url = pickStr(raw, "url");
    if (!title || !url) return null;
    const countries = regionList(pickStr(raw, "location"));
    const min = Number(raw.salary_min) || 0;
    const max = Number(raw.salary_max) || 0;
    return {
      source: "remoteok",
      externalId: String(raw.id),
      sourceUrl: url,
      applyUrl: url,
      title,
      company: pickStr(raw, "company"),
      location: countries.length ? `Remote (${countries.join(", ")})` : "Remote (worldwide)",
      isRemote: true,
      remoteCountries: countries,
      salary: min || max ? `$${[min, max].filter(Boolean).map((n) => n.toLocaleString("en-US")).join(" – ")} / year` : undefined,
      description: stripHtml(pickStr(raw, "description"))?.slice(0, 4000),
      skills: raw.tags as string[] | undefined,
      postedAt: raw.epoch ? new Date(Number(raw.epoch) * 1000) : undefined,
    };
  },
};
