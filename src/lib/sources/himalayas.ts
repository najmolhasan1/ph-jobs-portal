import { fetchJson, sleep } from "./http";
import { pickStr, stripHtml } from "./pick";
import type { RawItem, SourceAdapter } from "./types";

// Himalayas (remote jobs) public API: newest first, real-time, with seniority and the
// countries a job is open to ("locationRestrictions" empty = worldwide).
// Terms: link back to Himalayas — we link every job to its Himalayas page.
export const himalayas: SourceAdapter = {
  key: "himalayas",
  name: "Himalayas (remote)",
  kind: "direct",
  intervalMinutes: 10,
  enabledByDefault: true,
  defaultConfig: { maxPages: 15 },
  async fetchNew({ since, config }) {
    const out: RawItem[] = [];
    const maxPages = Number(config.maxPages) || 15;
    // Coverage sweep: role searches (newest first) reach older openings the general feed doesn't.
    const terms = config.searchTerms as string[] | undefined;
    if (terms?.length) {
      const seen = new Set<string>();
      for (const q of terms) {
        for (let page = 1; page <= maxPages; page++) {
          const res = await fetchJson<{ jobs?: RawItem[] }>(
            `https://himalayas.app/jobs/api/search?q=${encodeURIComponent(q)}&sort=recent&page=${page}`,
          );
          const jobs = res.jobs ?? [];
          for (const j of jobs) {
            if (seen.has(String(j.guid))) continue;
            seen.add(String(j.guid));
            out.push(j);
          }
          const oldest = Number(jobs.at(-1)?.pubDate ?? 0) * 1000;
          if (jobs.length < 20 || oldest < since.getTime()) break;
          await sleep(400);
        }
      }
      return out.filter((j) => Number(j.pubDate) * 1000 > since.getTime() - 60_000);
    }
    for (let page = 0; page < maxPages; page++) {
      const res = await fetchJson<{ jobs?: RawItem[] }>(`https://himalayas.app/jobs/api?limit=20&offset=${page * 20}`);
      const jobs = res.jobs ?? [];
      out.push(...jobs);
      const oldest = Number(jobs.at(-1)?.pubDate ?? 0) * 1000;
      if (jobs.length < 20 || oldest < since.getTime()) break;
      await sleep(500);
    }
    return out.filter((j) => Number(j.pubDate) * 1000 > since.getTime() - 60_000);
  },
  normalize(raw) {
    const title = pickStr(raw, "title");
    const url = pickStr(raw, "guid", "applicationLink");
    if (!title || !url) return null;
    const countries = ((raw.locationRestrictions as string[] | undefined) ?? []).filter(Boolean);
    return {
      source: "himalayas",
      externalId: url,
      sourceUrl: url,
      applyUrl: url,
      title,
      company: pickStr(raw, "companyName"),
      location: countries.length ? `Remote (${countries.join(", ")})` : "Remote (worldwide)",
      isRemote: true,
      remoteCountries: countries,
      jobType: pickStr(raw, "employmentType"),
      level: ((raw.seniority as string[] | undefined) ?? []).join(" / "),
      salary: raw.minSalary ? `${raw.currency ?? ""} ${raw.minSalary}–${raw.maxSalary ?? ""} ${raw.salaryPeriod ?? ""}`.trim() : undefined,
      description: stripHtml(pickStr(raw, "description", "excerpt"))?.slice(0, 4000),
      skills: (raw.categories as string[] | undefined)?.map((c) => c.replace(/-/g, " ")),
      postedAt: raw.pubDate ? new Date(Number(raw.pubDate) * 1000) : undefined,
      deadline: raw.expiryDate ? new Date(Number(raw.expiryDate) * 1000) : undefined,
    };
  },
};
