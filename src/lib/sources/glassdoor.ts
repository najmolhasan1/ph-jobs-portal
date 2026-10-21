import { runActor } from "@/lib/apify";
import { regionList } from "./feed";
import { pickDate, pickStr, stripHtml } from "./pick";
import type { RawItem, SourceAdapter } from "./types";

// Glassdoor: remote internship / entry-level searches via Apify bebity/glassdoor-jobs-scraper
// (~$0.0004 a job). Glassdoor blocks plain requests, so there's no free route.
export const glassdoor: SourceAdapter = {
  key: "glassdoor",
  name: "Glassdoor (remote)",
  kind: "apify",
  intervalMinutes: 12 * 60,
  enabledByDefault: true,
  defaultConfig: {
    actorId: "bebity/glassdoor-jobs-scraper",
    keywords: ["react developer", "frontend developer", "full stack developer", "node.js developer", "web developer", "qa engineer"],
    maxPerKeyword: 30,
  },
  async fetchNew({ since, config }) {
    const days = (Date.now() - since.getTime()) / 864e5;
    const posted = String([1, 3, 7, 14, 30].find((d) => d >= days) ?? 30);
    const out = new Map<string, RawItem>();
    for (const keyword of (config.keywords as string[] | undefined) ?? []) {
      const items = await runActor(String(config.actorId), {
        keyword,
        remoteOnly: true,
        postedWithinDays: posted,
        seniority: ["Internship", "Entry level"],
        maxItems: Number(config.maxPerKeyword) || 30,
        scrapeDetails: true,
        proxy: { useApifyProxy: true },
      });
      for (const it of items) out.set(String(it.job_id ?? it.job_url), it);
    }
    return [...out.values()];
  },
  normalize(raw) {
    const title = pickStr(raw, "job_title");
    const url = pickStr(raw, "job_url", "job_seo_url");
    if (!title || !url) return null;
    const where = pickStr(raw, "job_location") ?? "";
    const remote = raw.job_remote === true || /remote/i.test(where);
    return {
      source: "glassdoor",
      externalId: String(raw.job_id ?? url),
      sourceUrl: url,
      applyUrl: pickStr(raw, "job_apply_url") ?? url,
      title,
      company: pickStr(raw, "company_name"),
      location: where || (remote ? "Remote" : undefined),
      isRemote: remote,
      remoteCountries: remote ? regionList(where.replace(/remote/gi, "")) : undefined,
      level: ((raw.job_levels as string[] | undefined) ?? []).join(" / ") || undefined,
      salary: pickStr(raw, "job_salary") || undefined,
      description: (pickStr(raw, "job_description") ?? stripHtml(pickStr(raw, "job_description_html")))?.slice(0, 4000),
      postedAt: pickDate(raw, "job_posted_date"),
    };
  },
};
