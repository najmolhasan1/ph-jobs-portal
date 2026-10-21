import { regionList } from "./feed";
import { eachTolerant, fetchJson } from "./http";
import { pickStr } from "./pick";
import type { RawItem, SourceAdapter } from "./types";

// Company career pages on Ashby (jobs.ashbyhq.com/<company>) have a free public job-board API.
// The company list is editable in Admin → Platforms. Defaults: remote-first product companies.
export const ashby: SourceAdapter = {
  key: "ashby",
  name: "Company career pages (Ashby)",
  kind: "direct",
  intervalMinutes: 120,
  enabledByDefault: true,
  defaultConfig: { companies: ["linear", "zapier", "ashby", "supabase", "posthog", "resend"] },
  async fetchNew({ since, config }) {
    const out: RawItem[] = [];
    await eachTolerant((config.companies as string[] | undefined) ?? [], async (company) => {
      const res = await fetchJson<{ jobs?: RawItem[] }>(`https://api.ashbyhq.com/posting-api/job-board/${company}`);
      for (const j of res.jobs ?? []) if (Date.parse(String(j.publishedAt)) > since.getTime() - 60_000) out.push({ ...j, company });
    }, 400);
    return out;
  },
  normalize(raw) {
    const title = pickStr(raw, "title");
    const url = pickStr(raw, "jobUrl", "applyUrl");
    if (!title || !url) return null;
    const where = pickStr(raw, "location") ?? "";
    const remote = raw.isRemote === true || /remote/i.test(where);
    return {
      source: "ashby",
      externalId: String(raw.id ?? url),
      sourceUrl: url,
      applyUrl: pickStr(raw, "applyUrl") ?? url,
      title,
      company: String(raw.company ?? ""),
      location: where || undefined,
      isRemote: remote,
      remoteCountries: remote ? regionList(where) : undefined,
      jobType: pickStr(raw, "employmentType"),
      description: pickStr(raw, "descriptionPlain")?.slice(0, 4000),
      postedAt: raw.publishedAt ? new Date(String(raw.publishedAt)) : undefined,
    };
  },
};
