import { regionList } from "./feed";
import { eachTolerant, fetchJson } from "./http";
import { pickStr } from "./pick";
import type { RawItem, SourceAdapter } from "./types";

// Company career pages on Lever (jobs.lever.co/<company>) have a free public postings API.
// The company list is editable in Admin → Platforms.
export const lever: SourceAdapter = {
  key: "lever",
  name: "Company career pages (Lever)",
  kind: "direct",
  intervalMinutes: 120,
  enabledByDefault: true,
  defaultConfig: { companies: ["toptal", "binance", "spotify"] },
  async fetchNew({ since, config }) {
    const out: RawItem[] = [];
    await eachTolerant((config.companies as string[] | undefined) ?? [], async (company) => {
      const list = await fetchJson<RawItem[]>(`https://api.lever.co/v0/postings/${company}?mode=json`);
      for (const j of list) if (Number(j.createdAt) > since.getTime() - 60_000) out.push({ ...j, company });
    }, 400);
    return out;
  },
  normalize(raw) {
    const title = pickStr(raw, "text");
    const url = pickStr(raw, "hostedUrl", "applyUrl");
    if (!title || !url) return null;
    const where = pickStr(raw, "categories.location") ?? "";
    const workplace = pickStr(raw, "workplaceType") ?? "";
    const remote = /remote/i.test(`${workplace} ${where} ${pickStr(raw, "categories.commitment") ?? ""}`);
    return {
      source: "lever",
      externalId: String(raw.id ?? url),
      sourceUrl: url,
      applyUrl: pickStr(raw, "applyUrl") ?? url,
      title,
      company: String(raw.company ?? ""),
      location: where || undefined,
      isRemote: remote,
      remoteCountries: remote ? regionList(where) : undefined,
      jobType: pickStr(raw, "categories.commitment"),
      description: pickStr(raw, "descriptionPlain", "description")?.slice(0, 4000),
      postedAt: raw.createdAt ? new Date(Number(raw.createdAt)) : undefined,
    };
  },
};
