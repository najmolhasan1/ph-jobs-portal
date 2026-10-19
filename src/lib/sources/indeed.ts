import { runActor } from "@/lib/apify";
import { pickBool, pickDate, pickList, pickStr, stripHtml } from "./pick";
import type { SourceAdapter } from "./types";

// Indeed has no Bangladesh site, so this covers remote entry-level roles only. Its smallest date
// filter is one day, so every check re-fetches (and pays for) the day's results — hence every
// 2 hours with a few role searches. Remote jobs limited to one country are filtered by the gate.
export const indeed: SourceAdapter = {
  key: "indeed",
  name: "Indeed (remote)",
  kind: "apify",
  intervalMinutes: 120,
  enabledByDefault: true,
  defaultConfig: {
    actorId: "borderline/indeed-scraper",
    country: "us",
    queries: ["junior frontend developer", "junior react developer", "junior full stack developer", "junior qa engineer"],
    maxRows: 20,
  },
  async fetchNew({ config }) {
    const queries = (config.queries as string[] | undefined) ?? [String(config.query ?? "junior developer")];
    // One search at a time: the Apify account allows only a few concurrent runs.
    const out = [];
    for (const query of queries) out.push(...(await runIndeed(config, query)));
    return out;
  },
  normalize(raw) {
    return normalizeIndeed(raw);
  },
};

function runIndeed(config: Record<string, unknown>, query: string) {
  return runActor(String(config.actorId), {
    country: config.country ?? "us",
    query,
    remote: "remote", // `location: "remote"` returns nothing; this filter works
    level: "entry_level",
    fromDays: "1",
    sort: "date",
    maxRows: Number(config.maxRows) || 30,
    enableUniqueJobs: true,
    includeSimilarJobs: false,
  });
}

function normalizeIndeed(raw: Record<string, unknown>): ReturnType<SourceAdapter["normalize"]> {
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
}
