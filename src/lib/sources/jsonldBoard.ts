import { decodeEntities, xmlBlocks, xmlText } from "./feed";
import { fetchText, sleep } from "./http";
import { stripHtml } from "./pick";
import type { NormalizedJob, RawItem, SourceAdapter } from "./types";
import type { SourceKey } from "@/lib/models";

// Many job boards publish a schema.org JobPosting (JSON-LD) on every job page — with who can apply
// (applicantLocationRequirements), the location, post date and salary — but their listings carry
// only titles. A board here is: list pages (RSS or HTML) → job links whose title looks like one
// of our roles → each job page's JobPosting.

// Titles worth opening (the gate decides for real; this only saves page fetches).
const DEV_TITLE = /develop|engineer|front[- ]?end|back[- ]?end|full[- ]?stack|react|next\.?js|node|javascript|typescript|web|\bqa\b|sqa|tester|test automation|software|programmer|intern/i;

export interface BoardOptions {
  key: SourceKey;
  name: string;
  intervalMinutes: number;
  /** RSS feeds or HTML list pages. */
  lists: string[];
  /** For HTML lists: job links, e.g. /\/jobs\/[a-z0-9-]+/ . */
  linkPattern?: RegExp;
  origin?: string;
  /** Most job pages opened per check. */
  maxDetails?: number;
  /** Pause between job pages (some boards serve a bot page to quick bursts). */
  delayMs?: number;
}

interface Listed {
  url: string;
  title: string;
}

async function readList(url: string, opts: BoardOptions): Promise<Listed[]> {
  const body = await fetchText(url);
  if (/^\s*(<\?xml|<rss|<feed)/i.test(body)) {
    return xmlBlocks(body, "item")
      .concat(xmlBlocks(body, "entry"))
      .map((it) => ({ url: xmlText(it, "link") ?? xmlText(it, "guid") ?? "", title: xmlText(it, "title") ?? "" }))
      .filter((l) => l.url.startsWith("http"));
  }
  const out: Listed[] = [];
  // Job cards wrap a lot of markup, so take the link and, as its "title", the URL slug
  // ("software-engineering-intern-backend-8ef3e924") — the job page has the real one.
  const re = new RegExp(`href="((?:https?://[^"]*)?${opts.linkPattern?.source ?? "/jobs?/[^\"]+"})"`, "gi");
  for (const m of body.matchAll(re)) {
    const href = (m[1].startsWith("http") ? m[1] : `${opts.origin}${m[1]}`).split("?")[0];
    // Every path segment, not just the last: "/job/frontend-engineer-earn/11569032".
    const path = href.replace(/^https?:\/\/[^/]+/, "");
    out.push({ url: href, title: decodeEntities(path).replace(/[-_/]+/g, " ").trim() });
  }
  return out;
}

function jobPosting(html: string): Record<string, unknown> | undefined {
  // Some sites HTML-encode the "+" in the script type (application/ld&#x2B;json).
  for (const m of html.matchAll(/<script[^>]+application\/ld(?:\+|&#x2B;)json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1]);
      const all = [data, ...(Array.isArray(data) ? data : []), ...((data?.["@graph"] as unknown[]) ?? [])].flat();
      const jp = all.find((b) => b && (b as Record<string, unknown>)["@type"] === "JobPosting");
      if (jp) return jp as Record<string, unknown>;
    } catch {
      // a broken JSON-LD block — try the next one
    }
  }
  return undefined;
}

const names = (v: unknown): string[] =>
  (Array.isArray(v) ? v : v ? [v] : [])
    .map((x) => (typeof x === "string" ? x : String((x as Record<string, unknown>)?.name ?? "")))
    .filter(Boolean);

export function jsonldBoard(opts: BoardOptions): SourceAdapter {
  return {
    key: opts.key,
    name: opts.name,
    kind: "direct",
    intervalMinutes: opts.intervalMinutes,
    enabledByDefault: true,
    defaultConfig: { lists: opts.lists, maxDetails: opts.maxDetails ?? 40 },
    async fetchNew({ since, config }) {
      const seen = new Set<string>();
      const candidates: Listed[] = [];
      for (const list of (config.lists as string[] | undefined) ?? opts.lists) {
        try {
          for (const l of await readList(list, opts)) {
            if (seen.has(l.url)) continue;
            seen.add(l.url);
            // HTML links may have no text (image cards) — the URL slug carries the title then.
            if (DEV_TITLE.test(l.title || l.url)) candidates.push(l);
          }
        } catch {
          // one list page failing shouldn't stop the others
        }
      }
      const out: RawItem[] = [];
      for (const c of candidates.slice(0, Number(config.maxDetails) || 40)) {
        try {
          const jp = jobPosting(await fetchText(c.url));
          if (jp && Date.parse(String(jp.datePosted ?? "")) > since.getTime() - 864e5) out.push({ ...jp, url: c.url });
        } catch {
          // a job page that fails to load is skipped
        }
        await sleep(opts.delayMs ?? 300);
      }
      return out;
    },
    normalize(raw): NormalizedJob | null {
      const title = typeof raw.title === "string" ? decodeEntities(raw.title).trim() : "";
      const url = String(raw.url ?? "");
      if (!title || !url) return null;
      const org = raw.hiringOrganization as Record<string, unknown> | undefined;
      const places = (Array.isArray(raw.jobLocation) ? raw.jobLocation : raw.jobLocation ? [raw.jobLocation] : []) as Record<string, unknown>[];
      const where = places
        .map((p) => p?.address as Record<string, unknown> | undefined)
        .map((a) => [a?.addressLocality, a?.addressRegion, a?.addressCountry].map((x) => (typeof x === "object" ? (x as Record<string, unknown>)?.name : x)).filter(Boolean).join(", "))
        .filter(Boolean)
        .join(" / ");
      const remote = /telecommute/i.test(String(raw.jobLocationType ?? "")) || /remote/i.test(`${title} ${where}`);
      const countries = names(raw.applicantLocationRequirements);
      const salary = raw.baseSalary as Record<string, unknown> | undefined;
      const value = salary?.value as Record<string, unknown> | undefined;
      const amount = value ? [value.minValue, value.maxValue].filter((x) => x !== undefined && x !== null).map((n) => Number(n).toLocaleString("en-US")).join(" – ") || (value.value ? Number(value.value).toLocaleString("en-US") : "") : "";
      const months = Number((raw.experienceRequirements as Record<string, unknown> | undefined)?.monthsOfExperience);
      return {
        source: opts.key,
        externalId: url,
        sourceUrl: url,
        applyUrl: url,
        title,
        company: typeof org?.name === "string" ? org.name : undefined,
        location: remote ? (countries.length ? `Remote (${countries.join(", ")})` : "Remote (worldwide)") : where || undefined,
        isRemote: remote,
        remoteCountries: remote ? countries : undefined,
        jobType: names(raw.employmentType).join(", ") || undefined,
        experience: Number.isFinite(months) && months > 0 ? `${Math.round(months / 12) || 1} years` : undefined,
        salary: amount ? `${salary?.currency ?? ""} ${amount}${value?.unitText ? ` / ${String(value.unitText).toLowerCase()}` : ""}`.trim() : undefined,
        description: stripHtml(decodeEntities(String(raw.description ?? "")))?.slice(0, 4000),
        postedAt: raw.datePosted ? new Date(String(raw.datePosted)) : undefined,
        deadline: raw.validThrough ? new Date(String(raw.validThrough)) : undefined,
      };
    },
  };
}

// ── Boards ──────────────────────────────────────────────────────────────────────────────────
export const remoteworkapp = jsonldBoard({
  key: "remoteworkapp",
  name: "Remote-Work.app",
  intervalMinutes: 60,
  lists: ["https://www.remote-work.app/api/latest-jobs-feed"],
});
export const earlytechroles = jsonldBoard({
  key: "earlytechroles",
  name: "Early Tech Roles",
  intervalMinutes: 60,
  lists: ["https://earlytechroles.com/rss.xml"],
  maxDetails: 60,
});
export const newgradai = jsonldBoard({
  key: "newgradai",
  name: "NewGrad.ai",
  intervalMinutes: 120,
  lists: ["https://newgrad.ai/"],
  linkPattern: /\/jobs\/[a-z0-9-]+-[a-f0-9]{8}/,
  origin: "https://newgrad.ai",
});
export const youhired = jsonldBoard({
  key: "youhired",
  name: "YouHired",
  intervalMinutes: 120,
  lists: ["https://youhired.me/"],
  linkPattern: /\/job\/\d+\/[a-z0-9-]+/,
  origin: "https://youhired.me",
});
export const jobpilot = jsonldBoard({
  key: "jobpilot",
  name: "JobPilot",
  intervalMinutes: 120,
  lists: ["https://jobpilot.suxrobgm.net/"],
  linkPattern: /\/jobs\/[a-z0-9-]+-[a-f0-9]{6}/,
  origin: "https://jobpilot.suxrobgm.net",
});
export const remotelyaijobs = jsonldBoard({
  key: "remotelyaijobs",
  name: "Remotely AI Jobs",
  intervalMinutes: 120,
  lists: ["https://remotelyaijobs.com/"],
  linkPattern: /\/jobs\/[a-z0-9-]+\//,
  origin: "https://remotelyaijobs.com",
});
// Built In: remote dev jobs; each job page lists every country it hires in (ISO codes, e.g. BGD).
export const builtin = jsonldBoard({
  key: "builtin",
  name: "Built In (remote)",
  intervalMinutes: 120,
  lists: [
    "https://builtin.com/jobs/remote/dev-engineering?search=react",
    "https://builtin.com/jobs/remote/dev-engineering?search=frontend",
    "https://builtin.com/jobs/remote/dev-engineering?search=full%20stack",
    "https://builtin.com/jobs/remote/dev-engineering?search=node",
    "https://builtin.com/jobs/remote/dev-engineering?search=javascript",
    "https://builtin.com/jobs/remote/dev-engineering?search=junior",
    "https://builtin.com/jobs/remote/dev-engineering?search=qa",
  ],
  linkPattern: /\/job\/[a-z0-9-]+\/\d+/,
  origin: "https://builtin.com",
  maxDetails: 60,
  delayMs: 1500,
});
