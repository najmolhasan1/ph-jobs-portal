import { prisma } from "@/lib/db";
import { fetchText, jsonLd, sleep } from "./http";
import { pickStr, stripHtml } from "./pick";
import type { RawItem, SourceAdapter } from "./types";

// NextJobz (Bangladesh). The /jobs page lists the newest job URLs (JSON-LD ItemList, IDs
// increase over time); each job page carries a schema.org JobPosting with the exact post time.
// Only job pages we haven't stored yet are fetched.
export const nextjobz: SourceAdapter = {
  key: "nextjobz",
  name: "NextJobz",
  kind: "direct",
  intervalMinutes: 5,
  enabledByDefault: true,
  defaultConfig: { maxNewPerCheck: 30 },
  async fetchNew({ since, config }) {
    const list = jsonLd(await fetchText("https://nextjobz.com.bd/jobs"));
    const urls = list
      .flatMap((o) => ((o["@type"] === "ItemList" ? o.itemListElement : []) as RawItem[]) ?? [])
      .map((e) => String(e.url ?? ""))
      .filter((u) => /\/jobs\/.+-IJOB\d+$/.test(u));

    const ids = urls.map((u) => u.match(/(IJOB\d+)$/)![1]);
    const known = new Set(
      (await prisma.jobSource.findMany({ where: { source: "nextjobz", externalId: { in: ids } }, select: { externalId: true } })).map(
        (s) => s.externalId,
      ),
    );
    const fresh = urls.filter((u) => !known.has(u.match(/(IJOB\d+)$/)![1])).slice(0, Number(config.maxNewPerCheck) || 30);

    const out: RawItem[] = [];
    for (const url of fresh) {
      try {
        const posting = jsonLd(await fetchText(url)).find((o) => o["@type"] === "JobPosting");
        if (posting && new Date(String(posting.datePosted)) > new Date(since.getTime() - 3600_000)) out.push({ ...posting, url });
      } catch {
        // one broken page shouldn't stop the rest
      }
      await sleep(300); // be polite
    }
    return out;
  },
  normalize(raw) {
    const title = pickStr(raw, "title");
    const url = pickStr(raw, "url");
    if (!title || !url) return null;
    const exp = raw.experienceRequirements as RawItem | string | undefined;
    const months = typeof exp === "object" ? Number(exp?.monthsOfExperience) : NaN;
    return {
      source: "nextjobz",
      externalId: url.match(/(IJOB\d+)$/)?.[1],
      sourceUrl: url,
      applyUrl: url,
      title,
      company: pickStr(raw, "hiringOrganization.name"),
      location: pickStr(raw, "jobLocation.address.addressLocality", "jobLocation.address.addressRegion") ?? "Bangladesh",
      jobType: pickStr(raw, "employmentType"),
      experience: Number.isFinite(months) ? `${Math.round(months / 12)} years` : typeof exp === "string" ? exp : undefined,
      salary: pickStr(raw, "baseSalary.value.value"),
      description: stripHtml(pickStr(raw, "description"))?.slice(0, 4000),
      postedAt: raw.datePosted ? new Date(String(raw.datePosted)) : undefined,
      deadline: raw.validThrough ? new Date(String(raw.validThrough)) : undefined,
    };
  },
};
