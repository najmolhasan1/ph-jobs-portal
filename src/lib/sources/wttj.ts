import { runActor } from "@/lib/apify";
import { pickStr, stripHtml } from "./pick";
import type { RawItem, SourceAdapter } from "./types";

// Welcome to the Jungle: Apify shahidirfan/Jungle-Job-Scraper (~$0.001 a job). Mostly
// European / US offices, so only fully remote jobs are kept; the gate checks who can apply.
export const wttj: SourceAdapter = {
  key: "wttj",
  name: "Welcome to the Jungle",
  kind: "apify",
  intervalMinutes: 24 * 60,
  enabledByDefault: true,
  defaultConfig: {
    actorId: "shahidirfan/Jungle-Job-Scraper",
    keywords: ["junior frontend developer", "junior react developer", "junior full stack developer", "junior web developer"],
    maxPerKeyword: 25,
  },
  async fetchNew({ since, config }) {
    const days = (Date.now() - since.getTime()) / 864e5;
    const posted = days <= 1 ? "24h" : days <= 7 ? "7d" : "30d";
    const out = new Map<string, RawItem>();
    for (const keyword of (config.keywords as string[] | undefined) ?? []) {
      const items = await runActor(String(config.actorId), {
        keyword,
        location: "",
        posted_within: posted,
        results_wanted: Number(config.maxPerKeyword) || 25,
        max_pages: 2,
      });
      for (const it of items) if (it.remote === "full") out.set(String(it.job_id ?? it.url), it);
    }
    return [...out.values()];
  },
  normalize(raw) {
    const title = pickStr(raw, "title");
    const url = pickStr(raw, "url");
    if (!title || !url) return null;
    const country = pickStr(raw, "country");
    return {
      source: "wttj",
      externalId: String(raw.job_id ?? url),
      sourceUrl: url,
      applyUrl: url,
      title,
      company: pickStr(raw, "company"),
      location: `Remote${country ? ` (${country})` : ""}`,
      isRemote: true,
      // A WTTJ remote job is tied to its office's country unless the text says otherwise.
      remoteCountries: country ? [country] : undefined,
      jobType: pickStr(raw, "contract_type"),
      salary: raw.salary_minimum ? `${raw.salary_currency ?? ""} ${raw.salary_minimum}${raw.salary_period ? ` / ${raw.salary_period}` : ""}`.trim() : undefined,
      description: (pickStr(raw, "description_text") ?? stripHtml(pickStr(raw, "description_html")))?.slice(0, 4000),
      postedAt: raw.date_posted ? new Date(String(raw.date_posted)) : undefined,
    };
  },
};
