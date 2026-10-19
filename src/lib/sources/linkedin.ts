import { runActor } from "@/lib/apify";
import { ROLE_SEARCHES } from "./roles";
import { pickBool, pickDate, pickList, pickStr, stripHtml } from "./pick";
import type { SourceAdapter } from "./types";

// LinkedIn's f_TPR filter takes any number of seconds ("posted in the last N seconds"),
// so each check asks only for posts since the previous check (+ a margin for LinkedIn's
// indexing lag) — we pay mostly for new jobs.
//
// Tested: the public search ignores the remote filter (f_WT) and returns onsite jobs worldwide,
// and its data has no workplace field. So "remote" searches here only feed the gate, which
// keeps a job as remote only when its title/location explicitly says Remote/Worldwide/Anywhere.
const search = (q: string, location: string, secs: number) =>
  `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(q)}&location=${encodeURIComponent(location)}&f_TPR=r${secs}`;

export const linkedin: SourceAdapter = {
  key: "linkedin",
  name: "LinkedIn Jobs",
  kind: "apify",
  intervalMinutes: 15,
  enabledByDefault: true,
  defaultConfig: {
    actorId: "curious_coder/linkedin-jobs-scraper",
    bangladesh: ROLE_SEARCHES,
    // Worldwide searches are off by default: ~100 jobs per 30 min worldwide, nearly all onsite
    // abroad, so ~$20/day of Apify items for ~1 genuine remote job a day. Add keywords to opt in.
    remote: [] as string[],
    limitPerSearch: 25,
    /** Look-back added to each window, for posts LinkedIn indexes late. */
    marginMinutes: 30,
  },
  async fetchNew({ since, config }) {
    const margin = (Number(config.marginMinutes) || 30) * 60;
    const secs = Math.ceil((Date.now() - since.getTime()) / 1000) + margin;
    const urls = [
      ...((config.bangladesh as string[]) ?? []).map((q) => search(q, "Bangladesh", secs)),
      ...((config.remote as string[]) ?? []).map((q) => search(q, "Worldwide", secs)),
    ];
    if (!urls.length) return [];
    return runActor(String(config.actorId), {
      urls,
      autoConvertToAiSearch: false,
      scrapeCompany: false,
      limitPerSource: Number(config.limitPerSearch) || 25,
    });
  },
  normalize(raw) {
    let title = pickStr(raw, "title", "jobTitle", "position");
    if (!title) return null;
    let company = pickStr(raw, "companyName", "company.name", "company");
    // BDJobs cross-posts to LinkedIn as "Title - (For Real Company) - Job ID - 1545997".
    // Recover the real company so dedup can merge it with the BDJobs listing.
    const relist = title.match(/^(.*?)\s*-\s*\(For (.+?)\)\s*-\s*Job ID\s*-\s*\d+\s*$/i);
    if (relist && /bdjobs/i.test(company ?? "")) {
      title = relist[1];
      company = relist[2];
    }
    const location = pickStr(raw, "location", "formattedLocation", "jobLocation");
    const description = pickStr(raw, "descriptionText", "description") ?? stripHtml(pickStr(raw, "descriptionHtml"));
    return {
      source: "linkedin",
      externalId: pickStr(raw, "id", "jobId"),
      sourceUrl: pickStr(raw, "link", "url", "jobUrl"),
      title,
      company,
      location,
      isRemote: pickBool(raw, "isRemote", "remote") ?? /\b(remote|worldwide|anywhere)\b/i.test(`${location ?? ""} ${title}`),
      jobType: pickStr(raw, "employmentType", "contractType", "jobType"),
      level: pickStr(raw, "seniorityLevel", "experienceLevel"),
      salary: pickStr(raw, "salaryInfo", "salary", "salaryRange"),
      description,
      skills: pickList(raw, "skills"),
      applyUrl: pickStr(raw, "applyUrl", "link", "url"),
      postedAt: pickDate(raw, "postedAt", "postedDate", "listedAt", "publishedAt"),
    };
  },
};
