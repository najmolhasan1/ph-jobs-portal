import { fetchText, nextPageProps, sleep } from "./http";
import { pickStr } from "./pick";
import type { RawItem, SourceAdapter } from "./types";

// Remote Rocketship: remote jobs with entry-level / junior flags. Its listing page embeds
// the jobs (Next.js page data), sorted by date added; we filter to entry-level, remote.
export const remoterocketship: SourceAdapter = {
  key: "remoterocketship",
  name: "Remote Rocketship",
  kind: "direct",
  intervalMinutes: 30,
  enabledByDefault: true,
  defaultConfig: {
    jobTitles: ["Frontend Engineer", "Full Stack Engineer", "Backend Engineer", "Web Developer", "QA Engineer", "Software Engineer"],
    maxPages: 3,
  },
  async fetchNew({ since, config }) {
    const out = new Map<string, RawItem>();
    for (const title of (config.jobTitles as string[] | undefined) ?? [""]) {
      for (let page = 1; page <= (Number(config.maxPages) || 3); page++) {
        const qs = new URLSearchParams({ page: String(page), sort: "DateAdded", seniority: "entry-level", ...(title && { jobTitle: title }) });
        const props = nextPageProps<{ initialJobOpenings?: RawItem[] }>(
          await fetchText(`https://www.remoterocketship.com/?${qs}`),
          "remoterocketship.com",
        );
        const jobs = props.initialJobOpenings ?? [];
        for (const j of jobs) out.set(String(j.id), j);
        const oldest = new Date(String(jobs.at(-1)?.created_at ?? 0));
        if (jobs.length < 20 || oldest < since) break;
        await sleep(800);
      }
    }
    return [...out.values()].filter((j) => new Date(String(j.created_at)) > new Date(since.getTime() - 60_000));
  },
  normalize(raw) {
    const title = pickStr(raw, "roleTitle");
    const url = pickStr(raw, "url");
    if (!title || !url) return null;
    const countries = ((raw.locationCountries as string[] | undefined) ?? []).filter(Boolean);
    const level = raw.isEntryLevel ? "Entry level" : raw.isJunior ? "Junior" : raw.isMidLevel ? "Mid-Senior level" : raw.isSenior || raw.isLead ? "Mid-Senior level" : undefined;
    const remote = /remote/i.test(String(raw.locationType ?? "remote"));
    return {
      source: "remoterocketship",
      externalId: String(raw.id),
      sourceUrl: url,
      applyUrl: url,
      title,
      company: pickStr(raw, "company.name"),
      location: remote ? (countries.length ? `Remote (${countries.join(", ")})` : "Remote (worldwide)") : (pickStr(raw, "location") ?? countries.join(", ")),
      isRemote: remote,
      remoteCountries: countries,
      jobType: pickStr(raw, "employmentType"),
      level,
      salary: pickStr(raw, "salaryRange"),
      description: pickStr(raw, "jobDescriptionSummary", "twoLineJobDescriptionSummary"),
      skills: raw.techStack as string[] | undefined,
      postedAt: raw.created_at ? new Date(String(raw.created_at)) : undefined,
    };
  },
};
