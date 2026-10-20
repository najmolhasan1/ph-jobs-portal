import { regionList, xmlBlocks, xmlText } from "./feed";
import { eachTolerant, fetchText } from "./http";
import { stripHtml } from "./pick";
import type { RawItem, SourceAdapter } from "./types";

// We Work Remotely: public RSS feeds per category. Item titles are "Company: Job title" and
// <region> says who can apply ("Anywhere in the World", "North America Only", …).
export const weworkremotely: SourceAdapter = {
  key: "weworkremotely",
  name: "We Work Remotely",
  kind: "direct",
  intervalMinutes: 30,
  enabledByDefault: true,
  defaultConfig: {
    categories: ["remote-full-stack-programming-jobs", "remote-front-end-programming-jobs", "remote-back-end-programming-jobs"],
  },
  async fetchNew({ since, config }) {
    const out: RawItem[] = [];
    await eachTolerant((config.categories as string[] | undefined) ?? [], async (cat) => {
      const xml = await fetchText(`https://weworkremotely.com/categories/${cat}.rss`);
      for (const item of xmlBlocks(xml, "item")) {
        const pub = Date.parse(xmlText(item, "pubDate") ?? "");
        if (pub <= since.getTime() - 60_000) continue;
        out.push({
          title: xmlText(item, "title"),
          link: xmlText(item, "link") ?? xmlText(item, "guid"),
          region: xmlText(item, "region"),
          type: xmlText(item, "type"),
          category: xmlText(item, "category"),
          description: xmlText(item, "description"),
          pubDate: pub,
        });
      }
    }, 500);
    return out;
  },
  normalize(raw) {
    const full = String(raw.title ?? "");
    const url = raw.link ? String(raw.link) : undefined;
    if (!full || !url) return null;
    const i = full.indexOf(": ");
    const countries = regionList(raw.region as string | undefined);
    return {
      source: "weworkremotely",
      externalId: url,
      sourceUrl: url,
      applyUrl: url,
      title: i > 0 ? full.slice(i + 2) : full,
      company: i > 0 ? full.slice(0, i) : undefined,
      location: countries.length ? `Remote (${countries.join(", ")})` : "Remote (worldwide)",
      isRemote: true,
      remoteCountries: countries,
      jobType: raw.type as string | undefined,
      description: stripHtml(raw.description as string | undefined)?.slice(0, 4000),
      postedAt: raw.pubDate ? new Date(Number(raw.pubDate)) : undefined,
    };
  },
};
