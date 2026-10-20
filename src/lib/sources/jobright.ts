import { eachTolerant, fetchText, nextPageProps } from "./http";
import { ROLE_SEARCHES } from "./roles";
import { pickStr } from "./pick";
import type { RawItem, SourceAdapter } from "./types";

// Jobright AI: public search pages embed results (Next.js page data) with seniority,
// work model and publish time (UTC). Mostly US jobs, so the gate keeps only remote roles
// that aren't tied to one country. Occasionally serves a bot check — the next round retries.
export const jobright: SourceAdapter = {
  key: "jobright",
  name: "Jobright AI",
  kind: "direct",
  intervalMinutes: 30,
  enabledByDefault: true,
  // All levels: junior roles reach every track, experienced ones Level 2.
  defaultConfig: { queries: ROLE_SEARCHES },
  async fetchNew({ since, config }) {
    const out = new Map<string, RawItem>();
    await eachTolerant((config.queries as string[] | undefined) ?? [], async (q) => {
      const props = nextPageProps<{ jobList?: RawItem[] }>(
        await fetchText(`https://jobright.ai/jobs/search?value=${encodeURIComponent(q)}`),
        "jobright.ai",
      );
      for (const item of props.jobList ?? []) {
        const job = item.jobResult as RawItem | undefined;
        if (!job?.jobId) continue;
        const at = new Date(`${String(job.publishTime).replace(" ", "T")}Z`);
        if (at > new Date(since.getTime() - 60_000)) out.set(String(job.jobId), { ...job, companyName: (item.companyResult as RawItem | undefined)?.companyName });
      }
    }, 1000);
    return [...out.values()];
  },
  normalize(raw) {
    const title = pickStr(raw, "jobTitle", "jobNlpTitle");
    const id = pickStr(raw, "jobId");
    if (!title || !id) return null;
    const location = pickStr(raw, "jobLocation");
    const remote = raw.isRemote === true || /remote/i.test(String(raw.workModel ?? ""));
    const url = `https://jobright.ai/jobs/info/${id}`;
    return {
      source: "jobright",
      externalId: id,
      sourceUrl: url,
      applyUrl: url,
      title,
      company: pickStr(raw, "companyName"),
      location: remote ? `Remote${location ? ` (${location})` : ""}` : location,
      isRemote: remote,
      // A remote listing with a place attached ("Remote · United States") is tied to that place.
      remoteCountries: location && !/remote|anywhere|worldwide/i.test(location) ? [location] : [],
      jobType: pickStr(raw, "employmentType"),
      level: pickStr(raw, "jobSeniority"),
      salary: pickStr(raw, "salaryDesc"),
      description: pickStr(raw, "jobSummary"),
      postedAt: raw.publishTime ? new Date(`${String(raw.publishTime).replace(" ", "T")}Z`) : undefined,
    };
  },
};
