import { fetchJson } from "./http";
import { pickStr, stripHtml } from "./pick";
import type { RawItem, SourceAdapter } from "./types";

// atB Jobs (Bangladesh). Its site loads listings from this public API, newest first,
// with a `keyword` filter. Post times are Bangladesh local time.
const API = "https://agioek7br1.execute-api.ap-southeast-1.amazonaws.com/api/search-v4";
const HEADERS = { Origin: "https://www.atb-jobs.com", Referer: "https://www.atb-jobs.com/" };

const bdTime = (s?: string) => (s ? new Date(`${s.replace(" ", "T")}+06:00`) : undefined);

export const atb: SourceAdapter = {
  key: "atb",
  name: "atB Jobs",
  kind: "direct",
  intervalMinutes: 5,
  enabledByDefault: true,
  defaultConfig: { keywords: [""] }, // "" = all jobs (≈80 live); the gate keeps dev roles
  async fetchNew({ since, config }) {
    const keywords = (config.keywords as string[] | undefined) ?? [""];
    const out = new Map<string, RawItem>();
    for (const keyword of keywords) {
      for (let page = 1; page <= (Number(config.maxPages) || 5); page++) {
        const qs = new URLSearchParams({ page: String(page), ...(keyword && { keyword }) });
        const res = await fetchJson<{ data?: RawItem[] }>(`${API}?${qs}`, HEADERS);
        const rows = res.data ?? [];
        for (const r of rows) out.set(String(r.post_id), r);
        const oldest = bdTime(String(rows.at(-1)?.post_date ?? ""));
        if (rows.length < 30 || !oldest || oldest < since) break; // newest first → stop at old posts
      }
    }
    return [...out.values()].filter((r) => (bdTime(String(r.post_date)) ?? new Date(0)) > new Date(since.getTime() - 60_000));
  },
  normalize(raw) {
    const title = pickStr(raw, "job_title");
    const slug = pickStr(raw, "slug", "new_slug");
    if (!title || !slug) return null;
    const min = raw.minimum_experience;
    const max = raw.maximum_experience;
    const locType = pickStr(raw, "job_location_type") ?? "";
    return {
      source: "atb",
      externalId: String(raw.post_id),
      sourceUrl: `https://www.atb-jobs.com/jobs/${slug}`,
      applyUrl: `https://www.atb-jobs.com/jobs/${slug}`,
      title,
      company: pickStr(raw, "employer.company_name", "employer.name", "employer.companyName"),
      location: pickStr(raw, "district.name", "district.district_name", "district", "job_address") ?? "Bangladesh",
      isRemote: /remote|home/i.test(locType),
      jobType: pickStr(raw, "job_type"),
      level: pickStr(raw, "job_level"),
      experience: typeof min === "number" ? `${min}${typeof max === "number" ? ` to ${max}` : "+"} years` : pickStr(raw, "job_experience"),
      description: stripHtml(pickStr(raw, "job_description", "job_requirement"))?.slice(0, 4000),
      skills: Array.isArray(raw.skills) ? (raw.skills as unknown[]).map((s) => (typeof s === "string" ? s : String((s as RawItem)?.name ?? ""))).filter(Boolean) : undefined,
      postedAt: bdTime(pickStr(raw, "post_date")),
      deadline: pickStr(raw, "job_deadline") ? new Date(`${pickStr(raw, "job_deadline")}T23:59:59+06:00`) : undefined,
    };
  },
};
