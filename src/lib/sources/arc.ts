import { fetchText, nextPageProps } from "./http";
import { pickStr } from "./pick";
import type { RawItem, SourceAdapter } from "./types";

// Arc.dev remote jobs: the listing page embeds the latest ~60 jobs (Arc's own + external),
// each with the countries it's open to (`requiredCountries`, ISO codes; empty = worldwide).
export const arc: SourceAdapter = {
  key: "arc",
  name: "Arc.dev (remote)",
  kind: "direct",
  intervalMinutes: 30,
  enabledByDefault: true,
  defaultConfig: {},
  async fetchNew({ since }) {
    const props = nextPageProps<{ arcJobs?: RawItem[]; externalJobs?: RawItem[] }>(
      await fetchText("https://arc.dev/remote-jobs"),
      "arc.dev",
    );
    return [...(props.arcJobs ?? []), ...(props.externalJobs ?? [])].filter(
      (j) => Number(j.postedAt) * 1000 > since.getTime() - 60_000,
    );
  },
  normalize(raw) {
    const title = pickStr(raw, "title");
    const key = pickStr(raw, "randomKey");
    const slug = pickStr(raw, "urlString");
    if (!title || !key) return null;
    const countries = ((raw.requiredCountries as string[] | undefined) ?? []).filter(Boolean);
    const levels = (raw.experienceLevels as string[] | undefined) ?? [];
    const url = `https://arc.dev/remote-jobs/details/${slug ? `${slug}-` : ""}${key}`;
    return {
      source: "arc",
      externalId: key,
      sourceUrl: url,
      applyUrl: url,
      title,
      company: pickStr(raw, "company.name"),
      location: countries.length ? `Remote (${countries.join(", ")})` : "Remote (worldwide)",
      isRemote: true,
      // Arc uses ISO codes; the gate checks for "BD".
      remoteCountries: countries,
      jobType: pickStr(raw, "jobType"),
      level: levels.includes("junior") || levels.includes("entry") ? "Entry level" : levels.length ? "Mid-Senior level" : undefined,
      skills: ((raw.categories as RawItem[] | undefined) ?? []).map((c) => String(c.name)),
      postedAt: raw.postedAt ? new Date(Number(raw.postedAt) * 1000) : undefined,
    };
  },
};
