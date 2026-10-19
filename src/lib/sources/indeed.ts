import { runActor } from "@/lib/apify";
import { pickBool, pickDate, pickList, pickStr, stripHtml } from "./pick";
import type { SourceAdapter } from "./types";

// Indeed has no Bangladesh site, so this covers remote roles only. Its smallest date filter
// is one day, so every check re-fetches (and pays for) the day's results — hence hourly and
// off by default. In tests, remote "entry level" results were mostly US senior roles.
export const indeed: SourceAdapter = {
  key: "indeed",
  name: "Indeed (remote)",
  kind: "apify",
  intervalMinutes: 60,
  enabledByDefault: false,
  defaultConfig: {
    actorId: "borderline/indeed-scraper",
    country: "us",
    query: "junior developer",
    maxRows: 30,
  },
  async fetchNew({ config }) {
    return runActor(String(config.actorId), {
      country: config.country ?? "us",
      query: config.query ?? "junior developer",
      remote: "remote", // `location: "remote"` returns nothing; this filter works
      level: "entry_level",
      fromDays: "1",
      sort: "date",
      maxRows: Number(config.maxRows) || 30,
      enableUniqueJobs: true,
      includeSimilarJobs: false,
    });
  },
  normalize(raw) {
    const title = pickStr(raw, "title", "positionName", "jobTitle");
    if (!title) return null;
    const location = pickStr(raw, "location.formattedAddressShort", "location.city", "location.fullAddress", "location");
    return {
      source: "indeed",
      externalId: pickStr(raw, "jobKey", "key", "id"),
      sourceUrl: pickStr(raw, "jobUrl", "url", "link"),
      title,
      company: pickStr(raw, "companyName", "company", "employer.name"),
      location,
      isRemote: pickBool(raw, "isRemote", "remote") ?? /remote/i.test(`${location ?? ""} ${title}`),
      jobType: pickStr(raw, "jobType", "jobTypes"),
      salary: pickStr(raw, "salary.salaryText", "salaryText", "salary"),
      description:
        pickStr(raw, "descriptionText", "description.text", "description") ??
        stripHtml(pickStr(raw, "descriptionHtml", "description.html")),
      // `attributes` mixes skills with benefits ("401(k) matching"), so skills come from the text instead.
      skills: pickList(raw, "skills"),
      applyUrl: pickStr(raw, "applyUrl", "jobUrl", "url"),
      postedAt: pickDate(raw, "datePublished", "postedAt", "pubDate", "date"),
    };
  },
};
