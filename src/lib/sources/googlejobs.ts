import { runActor } from "@/lib/apify";
import { pickDate, pickStr } from "./pick";
import type { RawItem, SourceAdapter } from "./types";

// Google for Jobs: Google's job search gathers listings from most job sites at once — LinkedIn,
// Glassdoor, ZipRecruiter, JobLeads, BeBee, Jooble, Built In, Jobgether, company career pages
// (Lever / Ashby / Workday) and many more. Google doesn't serve Jobs in Bangladesh, so this
// searches remote roles ("Anywhere"); the gate drops ones limited to a country.
// Apify johnvc/Google-Jobs-Scraper: ~$0.09 per page of ~10 jobs.
export const googlejobs: SourceAdapter = {
  key: "googlejobs",
  name: "Google Jobs (all job sites)",
  kind: "apify",
  intervalMinutes: 24 * 60,
  enabledByDefault: true,
  defaultConfig: {
    actorId: "johnvc/Google-Jobs-Scraper",
    queries: [
      "remote junior react developer",
      "remote junior frontend developer",
      "remote junior full stack developer",
      "remote junior node.js developer",
      "remote junior web developer",
      "remote junior qa engineer",
    ],
    pagesPerQuery: 1,
  },
  async fetchNew({ since, config }) {
    const days = (Date.now() - since.getTime()) / 864e5;
    const posted = days <= 1 ? "24h" : days <= 3 ? "3d" : days <= 7 ? "7d" : "30d";
    const out = new Map<string, RawItem>();
    // One run per query (the actor takes a single query); runs go one at a time.
    for (const query of (config.queries as string[] | undefined) ?? []) {
      const items = await runActor(String(config.actorId), {
        query,
        country: "us",
        posted_within: posted,
        num_results: 10 * (Number(config.pagesPerQuery) || 1),
        max_pagination: Number(config.pagesPerQuery) || 1,
      });
      for (const it of items) out.set(String(it.job_id ?? `${it.title}|${it.company_name}`), it);
    }
    return [...out.values()];
  },
  normalize(raw) {
    const title = pickStr(raw, "title", "job_title");
    if (!title) return null;
    const location = pickStr(raw, "location") ?? "";
    const options = (raw.apply_options as { title?: string; link?: string }[] | undefined) ?? [];
    const url = options[0]?.link ?? pickStr(raw, "share_link", "source_link");
    const ext = (raw.detected_extensions ?? {}) as Record<string, unknown>;
    const remote = /anywhere|remote/i.test(location) || ext.work_from_home === true;
    return {
      source: "googlejobs",
      externalId: pickStr(raw, "job_id") ?? url,
      sourceUrl: url,
      applyUrl: url,
      title,
      company: pickStr(raw, "company_name"),
      location: remote ? "Remote" : location || undefined,
      isRemote: remote,
      jobType: pickStr(raw, "detected_extensions.schedule_type"),
      salary: pickStr(raw, "detected_extensions.salary"),
      description: pickStr(raw, "description")?.slice(0, 4000),
      postedAt: pickDate(raw, "detected_extensions.posted_at"),
    };
  },
};
