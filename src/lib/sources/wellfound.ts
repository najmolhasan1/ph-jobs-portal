import { eachTolerant, fetchText, nextPageProps } from "./http";
import { pickStr } from "./pick";
import type { RawItem, SourceAdapter } from "./types";

// Wellfound (startup jobs). Remote role pages embed the job listings in Apollo state,
// with live time, remote flag, accepted remote countries and minimum years of experience.
type Apollo = Record<string, RawItem>;

export const wellfound: SourceAdapter = {
  key: "wellfound",
  name: "Wellfound",
  kind: "direct",
  intervalMinutes: 30,
  enabledByDefault: true,
  defaultConfig: { roles: ["frontend-engineer", "react-developer", "javascript-developer", "full-stack-engineer", "backend-engineer", "web-developer", "qa-engineer"] },
  async fetchNew({ since, config }) {
    const out = new Map<string, RawItem>();
    await eachTolerant((config.roles as string[] | undefined) ?? [], async (role) => {
      const props = nextPageProps<{ apolloState?: { data?: Apollo } }>(
        await fetchText(`https://wellfound.com/role/r/${role}`),
        "wellfound.com",
      );
      const data = props.apolloState?.data ?? {};
      // Company names live on StartupResult entries that point at their listings.
      const companyOf = new Map<string, string>();
      for (const [k, v] of Object.entries(data)) {
        if (!k.startsWith("StartupResult")) continue;
        for (const ref of (v.highlightedJobListings as { __ref: string }[] | undefined) ?? []) companyOf.set(ref.__ref, String(v.name ?? ""));
      }
      for (const [k, v] of Object.entries(data)) {
        if (k.startsWith("JobListingSearchResult") && Number(v.liveStartAt) * 1000 > since.getTime() - 60_000) {
          out.set(String(v.id), { ...v, companyName: companyOf.get(k) });
        }
      }
    }, 800);
    return [...out.values()];
  },
  normalize(raw) {
    const title = pickStr(raw, "title");
    const id = pickStr(raw, "id");
    if (!title || !id) return null;
    const remote = raw.remote === true;
    const accepted = ((raw.acceptedRemoteLocationNames as string[] | undefined) ?? []).filter(Boolean);
    const places = ((raw.locationNames as string[] | undefined) ?? []).filter(Boolean);
    const min = raw.yearsExperienceMin;
    const url = `https://wellfound.com/jobs/${id}-${pickStr(raw, "slug") ?? ""}`;
    return {
      source: "wellfound",
      externalId: id,
      sourceUrl: url,
      applyUrl: url,
      title,
      company: pickStr(raw, "companyName"),
      location: remote ? (accepted.length ? `Remote (${accepted.join(", ")})` : places.length ? `Remote / ${places.join(", ")}` : "Remote (worldwide)") : places.join(", "),
      isRemote: remote,
      // Conservative: a remote role with any place attached is treated as limited to that place;
      // only listings with no place at all count as worldwide.
      remoteCountries: accepted.length ? accepted : places,
      jobType: pickStr(raw, "jobType"),
      experience: typeof min === "number" ? `${min}+ years` : undefined,
      salary: pickStr(raw, "compensation"),
      postedAt: raw.liveStartAt ? new Date(Number(raw.liveStartAt) * 1000) : undefined,
    };
  },
};
