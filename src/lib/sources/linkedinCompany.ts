import { runActor } from "@/lib/apify";
import { pickDate, pickStr } from "./pick";
import type { SourceAdapter } from "./types";

// Hiring posts from specific LinkedIn company pages (e.g. recruiters like Talent Mesh Tech),
// via an Apify actor that needs no LinkedIn login. Posts are free text, like Facebook posts.
// (LinkedIn *groups* can't be read without logging in, so they aren't supported.)
export const linkedinCompany: SourceAdapter = {
  key: "linkedin_company",
  name: "LinkedIn company pages",
  kind: "apify",
  intervalMinutes: 30,
  enabledByDefault: true,
  defaultConfig: {
    actorId: "harvestapi/linkedin-company-posts",
    pages: ["https://www.linkedin.com/company/talent-mesh-tech"],
    maxPostsPerPage: 20,
  },
  async fetchNew({ since, config }) {
    const pages = (config.pages as string[] | undefined) ?? [];
    if (!pages.length) return [];
    return runActor(String(config.actorId), {
      targetUrls: pages,
      maxPosts: Number(config.maxPostsPerPage) || 20,
      postedLimitDate: new Date(since.getTime() - 10 * 60_000).toISOString(), // exact cut-off
      includeReposts: false,
      scrapeReactions: false,
      scrapeComments: false,
    });
  },
  normalize(raw) {
    const text = (pickStr(raw, "content", "text", "commentary") ?? "").normalize("NFKC");
    const url = pickStr(raw, "linkedinUrl", "url", "postUrl");
    if (!url) return null;
    const base = {
      source: "linkedin_company" as const,
      externalId: pickStr(raw, "id", "entityId") ?? url,
      sourceUrl: url,
      applyUrl: url,
      company: pickStr(raw, "author.name", "authorName", "company.name"),
      postedAt: pickDate(raw, "postedAt.date", "postedAt.timestamp", "postedAt", "createdAt"),
    };
    // Recruiter pages often post an image + short link; the job title then only lives in the
    // post URL slug: /posts/talent-mesh-tech_sr-executive-asst-manager-hr-mir-activity-…
    if (text.replace(/https?:\/\/\S+/g, "").trim().length < 40) {
      const encoded = url.match(/\/posts\/[^_]+_(.+?)-activity-\d+/)?.[1];
      if (!encoded) return null;
      let slug = encoded;
      try {
        slug = decodeURIComponent(encoded).normalize("NFKC"); // "%F0%9D%90%96…" = 𝐖… → "W…"
      } catch {}
      const title = slug
        .replace(/^(hiring|urgent-recruitment|we-are-hiring|job-opening|vacancy)-/i, "")
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      return { ...base, title, description: text || undefined };
    }
    const firstLine = text.split("\n").find((l) => l.trim().length > 5)?.trim() ?? text;
    return { ...base, title: firstLine.slice(0, 120), description: text.slice(0, 4000), unstructured: true };
  },
};
