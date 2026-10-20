import { regionList } from "./feed";
import { fetchJson } from "./http";
import { pickStr, stripHtml } from "./pick";
import type { RawItem, SourceAdapter } from "./types";

// Jobicy (remote jobs) public API, development industry, with level, region and salary.
// Terms: link back to Jobicy and don't poll more than about once an hour.
export const jobicy: SourceAdapter = {
  key: "jobicy",
  name: "Jobicy (remote)",
  kind: "direct",
  intervalMinutes: 60,
  enabledByDefault: true,
  defaultConfig: { industry: "dev", count: 100 },
  async fetchNew({ since, config }) {
    const res = await fetchJson<{ jobs?: RawItem[] }>(
      `https://jobicy.com/api/v2/remote-jobs?count=${Number(config.count) || 100}&industry=${encodeURIComponent(String(config.industry ?? "dev"))}`,
    );
    return (res.jobs ?? []).filter((j) => Date.parse(String(j.pubDate)) > since.getTime() - 60_000);
  },
  normalize(raw) {
    const title = pickStr(raw, "jobTitle");
    const url = pickStr(raw, "url");
    if (!title || !url) return null;
    const countries = regionList(pickStr(raw, "jobGeo"));
    const min = Number(raw.salaryMin) || 0;
    const max = Number(raw.salaryMax) || 0;
    const cur = pickStr(raw, "salaryCurrency") ?? "";
    return {
      source: "jobicy",
      externalId: String(raw.id ?? url),
      sourceUrl: url,
      applyUrl: url,
      title,
      company: pickStr(raw, "companyName"),
      location: countries.length ? `Remote (${countries.join(", ")})` : "Remote (worldwide)",
      isRemote: true,
      remoteCountries: countries,
      jobType: ((raw.jobType as string[] | undefined) ?? []).join(", ") || undefined,
      level: pickStr(raw, "jobLevel"),
      salary:
        min || max
          ? `${cur} ${[...new Set([min, max].filter(Boolean))].map((n) => n.toLocaleString("en-US")).join(" – ")} / ${raw.salaryPeriod === "monthly" ? "month" : raw.salaryPeriod === "hourly" ? "hour" : "year"}`.trim()
          : undefined,
      description: stripHtml(pickStr(raw, "jobDescription", "jobExcerpt"))?.slice(0, 4000),
      postedAt: raw.pubDate ? new Date(String(raw.pubDate)) : undefined,
    };
  },
};
