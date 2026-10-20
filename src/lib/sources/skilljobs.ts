import { fetchJson, sleep } from "./http";
import { pickStr } from "./pick";
import type { RawItem, SourceAdapter } from "./types";

// Skill.jobs (Bangladesh): its job board loads listings from a public JSON endpoint, newest
// first, with salary, level and workplace. Post dates are day-precision ("Oct 19, 2026").
const API = "https://studio.skill.jobs/api/job_search/";

export const skilljobs: SourceAdapter = {
  key: "skilljobs",
  name: "Skill.jobs",
  kind: "direct",
  intervalMinutes: 30,
  enabledByDefault: true,
  defaultConfig: { maxPages: 5 },
  async fetchNew({ since, config }) {
    const out: RawItem[] = [];
    for (let page = 0; page < (Number(config.maxPages) || 5); page++) {
      const res = await fetchJson<{ results?: RawItem[]; next?: string | null }>(`${API}?limit=50&offset=${page * 50}`);
      const jobs = res.results ?? [];
      out.push(...jobs);
      const oldest = Date.parse(String(jobs.at(-1)?.created_at ?? ""));
      if (!res.next || !jobs.length || oldest < since.getTime() - 864e5) break;
      await sleep(500);
    }
    // Day-precision dates: keep anything from the day of `since` on (dedup drops repeats).
    return out.filter((j) => Date.parse(`${j.created_at} 23:59:59 GMT+0600`) >= since.getTime());
  },
  normalize(raw) {
    const title = pickStr(raw, "title");
    const slug = pickStr(raw, "slug");
    if (!title || !slug) return null;
    const url = `https://skill.jobs/jobs/${slug}`;
    const min = Number(raw.min_salary) || 0;
    const max = Number(raw.max_salary) || 0;
    const salary = raw.isNegotiable ? "Negotiable" : min || max ? `BDT ${[min, max].filter(Boolean).map((n) => n.toLocaleString("en-US")).join(" – ")} / month` : undefined;
    const level = String(raw.level ?? "");
    const workplace = String(raw.workplace ?? "");
    const created = Date.parse(`${raw.created_at} 12:00:00 GMT+0600`);
    return {
      source: "skilljobs",
      externalId: String(raw.id ?? slug),
      sourceUrl: url,
      applyUrl: url,
      title,
      company: pickStr(raw, "company_info.name", "company_name"),
      location: pickStr(raw, "location", "division") ?? "Bangladesh",
      isRemote: /home|remote/i.test(workplace),
      jobType: pickStr(raw, "type"),
      // "Beginner" / "Entry" → entry level; "Mid" / "Senior" / "Expert" → experienced.
      level: /beginner|entry|fresher|intern/i.test(level) ? "Entry level" : /mid|senior|expert|lead/i.test(level) ? "Mid-Senior level" : level || undefined,
      salary,
      postedAt: Number.isFinite(created) ? new Date(created) : undefined,
      deadline: raw.end_date ? new Date(`${raw.end_date} 23:59:59 GMT+0600`) : undefined,
    };
  },
};
