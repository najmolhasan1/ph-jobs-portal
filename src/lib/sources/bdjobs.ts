import { startOfTodayDhaka } from "@/lib/time";
import { pickDate, pickStr, stripHtml } from "./pick";
import type { RawItem, SourceAdapter } from "./types";

// BDJobs' own website loads listings from this public JSON endpoint. It returns
// minute-precise publish times, so polling it every few minutes catches new posts
// as they go live — at no cost (no Apify actor needed).
const API = "https://api.bdjobs.com/Jobs/api/JobSearch/GetJobSearch";
const HEADERS = { "User-Agent": "Mozilla/5.0 (PH Jobs portal)", Origin: "https://bdjobs.com", Referer: "https://bdjobs.com/" };

async function search(params: Record<string, string>): Promise<RawItem[]> {
  const qs = new URLSearchParams({
    Icat: "", industry: "", category: "", org: "", jobNature: "", Fcat: "", location: "", Qot: "",
    jobType: "", jobLevel: "", postedWithin: "1", deadline: "", keyword: "", pg: "1", qAge: "",
    Salary: "", experience: "", gender: "", MExp: "", genderB: "", MPostings: "", MCat: "", version: "",
    rpp: "50", Newspaper: "", armyp: "", QDisablePerson: "", pwd: "", workplace: "", facilitiesForPWD: "",
    SaveFilterList: "", UserFilterName: "", HUserFilterName: "", earlyJobAccess: "", isPro: "0",
    ToggleJobs: "true", isFresher: "false",
    ...params,
  });
  const res = await fetch(`${API}?${qs}`, { headers: HEADERS, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`BDJobs API HTTP ${res.status}`);
  const json = (await res.json()) as { data?: RawItem[]; premiumData?: RawItem[] };
  return [...(json.premiumData ?? []), ...(json.data ?? [])];
}

export const bdjobs: SourceAdapter = {
  key: "bdjobs",
  name: "BDJobs",
  kind: "direct",
  intervalMinutes: 3,
  enabledByDefault: true,
  defaultConfig: {
    // 8 = "IT & Telecommunication": every dev job lands here, no fuzzy keyword matching.
    categories: ["8"],
    // Dev jobs filed under other categories (e.g. a university's "Web Developer").
    // Single words only — the API matches multi-word keywords loosely.
    keywords: ["developer", "programmer", "frontend", "backend", "react", "node", "javascript", "typescript", "mern", "nextjs", "fullstack", "qa", "sqa", "tester"],
  },
  async fetchNew({ since, config }) {
    const categories = (config.categories as string[] | undefined) ?? ["8"];
    const keywords = (config.keywords as string[] | undefined) ?? [];
    const batches = await Promise.all([
      ...categories.map((category) => search({ category })),
      ...keywords.map((keyword) => search({ keyword })),
    ]);
    const seen = new Set<string>();
    const floor = Math.min(since.getTime(), startOfTodayDhaka().getTime());
    return batches.flat().filter((j) => {
      const id = String(j.Jobid ?? "");
      if (!id || seen.has(id)) return false;
      seen.add(id);
      const at = new Date(String(j.publishDate ?? "")).getTime();
      return at > floor - 60_000; // tiny overlap; dedup absorbs repeats
    });
  },
  normalize(raw) {
    const title = pickStr(raw, "jobTitle", "JobTitleBng");
    const id = pickStr(raw, "Jobid");
    if (!title || !id) return null;
    const workplace = pickStr(raw, "WorkPlace") ?? "";
    const location = pickStr(raw, "location");
    const salary = pickStr(raw, "Salary");
    return {
      source: "bdjobs",
      externalId: id,
      sourceUrl: `https://jobs.bdjobs.com/jobdetails.asp?id=${id}`,
      applyUrl: `https://jobs.bdjobs.com/jobdetails.asp?id=${id}`,
      title,
      company: pickStr(raw, "companyName"),
      location,
      isRemote: /home|remote|anywhere/i.test(`${workplace} ${location ?? ""}`),
      jobType: pickStr(raw, "JobType"),
      experience: pickStr(raw, "experience"),
      salary: salary && salary !== "--" ? salary : undefined,
      description: stripHtml(pickStr(raw, "jobDescription", "eduRec"))?.replace(/\.{3,}$/, "…"),
      postedAt: pickDate(raw, "publishDate"),
      deadline: pickDate(raw, "deadlineDB"),
    };
  },
};
