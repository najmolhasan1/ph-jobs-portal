import type { Prisma } from "@prisma/client";
import { decodeEntities } from "@/lib/sources/feed";
import { bnFix, classify, normTitle } from "./taxonomy";

// Recruitment circulars that the forces, BGB, police, Ansar and BPSC publish on their own sites
// (rarely on BDJobs or Teletalk). Every source is a plain, public HTML list — no login, no API key.

type Row = Prisma.MarketJobCreateManyInput;

interface Circular {
  /** Stable id within the source (the circular's link, or its title + date). */
  id: string;
  title: string;
  postedAt: Date;
  deadline?: Date;
}

interface Site {
  source: string;
  company: string;
  url: string;
  parse: (html: string, url: string) => Circular[];
}

const UA = { "User-Agent": "Mozilla/5.0 (PH Career Insights)" };

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const toAscii = (s: string) => s.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
const text = (html: string) => decodeEntities(html.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/** "12-09-2026", "১২-০৯-২০২৬", "19/Oct/2026", "10-Jul-2025" → midday Dhaka of that date. */
function parseDate(raw: string | undefined): Date | undefined {
  if (!raw) return undefined;
  const s = toAscii(raw);
  let m = s.match(/(\d{1,2})[-/ ]([A-Za-z]{3})[a-z]*[-/ ](\d{4})/);
  if (m) return new Date(Date.UTC(Number(m[3]), MONTHS[m[2].toLowerCase()] ?? 0, Number(m[1]), 6));
  m = s.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m) return new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 6));
  return undefined;
}

// A list page mixes job circulars with results, exam schedules, appointment letters and tenders.
const IS_CIRCULAR = /নিয়োগ|ভর্তি|recruit|circular|circulation|advertisement|বিসিএস.*বিজ্ঞপ্তি|BCS|course|batch|entry|cadet|জনবল/i;
const NOT_CIRCULAR = /নিয়োগপত্র|ফলাফল|result|সময়সূচি|ভেন্যু|প্রবেশপত্র|admit|দরপত্র|tender|নিলাম|auction|পদোন্নতি|promotion|বাতিল|সংশোধন|মৌখিক পরীক্ষা|লিখিত পরীক্ষা|viva|পরীক্ষার তারিখ|স্থগিত|অপেক্ষমান|শিক্ষাবর্ষ|admission|ছাত্র|বিতরণ/i;
const isCircular = (title: string) => IS_CIRCULAR.test(title) && !NOT_CIRCULAR.test(title);

/** gov.bd national portal list (BGB, BPSC, Ansar…): a table of title / publish date / details link. */
function govPortal(html: string, url: string): Circular[] {
  const origin = new URL(url).origin;
  const out: Circular[] = [];
  for (const tr of html.match(/<tr class="table-tr">[\s\S]*?<\/tr>/g) ?? []) {
    const title = text(tr.match(/data-column="title">([\s\S]*?)<\/td>/)?.[1] ?? "");
    const date = parseDate(text(tr.match(/data-column="publish_date">([\s\S]*?)<\/td>/)?.[1] ?? ""));
    const link = tr.match(/href="(\/pages\/[^"]+)"/)?.[1];
    if (!title || !date) continue;
    out.push({ id: link ? `${origin}${link}` : `${title}|${date.toISOString()}`, title, postedAt: date });
  }
  return out;
}

const SITES: Site[] = [
  {
    source: "army",
    company: "Bangladesh Army",
    url: "https://www.army.mil.bd/Job-Circulation-List",
    parse: (html, url) =>
      [...html.matchAll(/href="(Job-Circulation-Details\/[^"]+)">([^<]+)<\/a>\s*<\/h3>\s*<div class="news-date">\s*([^<]+)</g)].flatMap((m) => {
        const postedAt = parseDate(m[3]);
        return postedAt ? [{ id: new URL(m[1], url).href, title: decodeEntities(m[2]).trim(), postedAt }] : [];
      }),
  },
  {
    source: "navy",
    company: "Bangladesh Navy",
    url: "https://www.navy.mil.bd/",
    parse: (html) => {
      const section = html.slice(html.indexOf('id="Section2"'));
      return (section.match(/<tr>[\s\S]*?<\/tr>/g) ?? []).flatMap((tr) => {
        const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => c[1]);
        const postedAt = parseDate(text(cells[0] ?? ""));
        const title = text(cells[1] ?? "");
        const pdf = tr.match(/href="([^"]+\.pdf)"/i)?.[1];
        return postedAt && title ? [{ id: pdf ?? `${title}|${postedAt.toISOString()}`, title, postedAt, deadline: parseDate(text(cells[2] ?? "")) }] : [];
      });
    },
  },
  {
    source: "airforce",
    company: "Bangladesh Air Force",
    url: "https://baf.mil.bd/index.php",
    // Only the home page's announcement ticker lists current circulars; it has no dates, but the
    // circular files are named by their upload time (…/marquees/1792406072.pdf).
    parse: (html) => {
      const seen = new Set<string>();
      return [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>\s*\*+\s*([^<]*?(?:circular|বিজ্ঞপ্তি|course|entry)[^<]*?)\s*\*+/gi)].flatMap((m) => {
        if (seen.has(m[1])) return [];
        seen.add(m[1]);
        const stamp = Number(m[1].match(/\/(\d{10})\.pdf/)?.[1]);
        const postedAt = stamp ? new Date(stamp * 1000) : new Date();
        const title = decodeEntities(m[2]).replace(/(has been published|for details click here|বিস্তারিত.*$|প্রকাশিত হয়েছে)/gi, "").replace(/[.।\s]+$/, "").trim();
        return [{ id: m[1], title, postedAt }];
      });
    },
  },
  { source: "bgb", company: "Border Guard Bangladesh (BGB)", url: "https://bgb.gov.bd/pages/notification-circulars", parse: govPortal },
  { source: "ansar", company: "Bangladesh Ansar & VDP", url: "https://ansarvdp.gov.bd/pages/notices", parse: govPortal },
  { source: "bpsc", company: "Bangladesh Public Service Commission (BPSC)", url: "https://bpsc.gov.bd/pages/notices", parse: govPortal },
  { source: "bpsc", company: "Bangladesh Public Service Commission (BPSC)", url: "https://bpsc.gov.bd/pages/notification-circulars", parse: govPortal },
  {
    source: "police",
    company: "Bangladesh Police",
    url: "https://www.police.gov.bd/en/recruitment_information",
    parse: (html) =>
      (html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) ?? []).flatMap((tr) => {
        const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => text(c[1]));
        const postedAt = parseDate(cells[2]);
        const title = cells[1];
        const pdf = tr.match(/href="(https:[^"]+\.pdf)"/i)?.[1];
        return postedAt && title ? [{ id: pdf ?? `${title}|${postedAt.toISOString()}`, title, postedAt }] : [];
      }),
  },
];

/**
 * A short job title from a long circular heading: "…১০৬তম ব্যাচে সিপাহী (জিডি) পদে পুরুষ ও মহিলা
 * প্রার্থী ভর্তির বিজ্ঞপ্তি" → "সিপাহী (জিডি)"; "Job Circular for 98Th BMA Long Course" → "98Th BMA Long Course".
 */
export function circularTitle(heading: string): string {
  const h = heading.replace(/\s+/g, " ").trim();
  const post = h.match(/((?:[^\s,।:]+\s){0,5}[^\s,।:]+(?:\s\([^)]*\))?)\s+(?:পদে|পদের|পদসমূহে)/);
  if (post) {
    // Drop the lead-in words before the post name ("বাংলাদেশ-এ ১০৬তম ব্যাচে সিপাহী (জিডি)" → "সিপাহী (জিডি)").
    const words = post[1].split(" ");
    while (words.length > 1 && LEAD_IN.test(words[0])) words.shift();
    while (words.length > 1 && TRAIL.test(words[words.length - 1])) words.pop();
    const name = words.join(" ");
    if (!LEAD_IN.test(name)) return name;
  }
  return h
    .replace(/^(?:(?:job circula(?:tion|r)|circular|advertisement|recruitment)\s*(?:of|for)?\s*[-:]?\s*)+/i, "")
    .replace(/^(?:জরুরী\s*)?নি[য়য়]?[োো]গ বিজ্ঞপ্তি\s*[:ঃ]?\s*/, "")
    .replace(/\b(in )?(summer |winter )?[AB]?-?\d{4}(-?[AB])?\s*batch\b/gi, "")
    .replace(/^\d+\s*(th|st|nd|rd)\b\s*/i, "")
    .replace(/\s*এর বিজ্ঞপ্তি$/, "")
    .replace(/\s*নিয়োগ$/, "")
    .replace(/[\s-]+$/, "")
    .slice(0, 90)
    .trim();
}

const TRAIL = /^(শুন্য|শূন্য|জরুরী|নিম্নবর্ণিত|বিভিন্ন|সরাসরি)$/;
const LEAD_IN = /^(এর|এ|ও|-এ|বর্ডার|গার্ড|পুলিশের|জরুরী|বাংলাদেশ\S*|\S*বাহিনী\S*|\S*তম|ব্যাচে|\(অতিরিক্ত\)|বিভিন্ন|ট্রেডে|শুন্য|শূন্য|সরাসরি|\S*শ্রেণীর\S*|৩য়|৪র্থ|নিম্নবর্ণিত|নিম্নোক্ত|বিজিবি\S*|সীমান্ত|অধীনে)$/;

/** Every circular from the forces, BGB, police, Ansar and BPSC sites, as MarketJob rows. */
export async function fetchGovtSites(): Promise<{ rows: Row[]; errors: string[] }> {
  const rows: Row[] = [];
  const errors: string[] = [];
  await Promise.all(
    SITES.map(async (site) => {
      try {
        const res = await fetch(site.url, { headers: UA, signal: AbortSignal.timeout(45_000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        for (const raw of site.parse(bnFix(await res.text()), site.url)) {
          const c = { ...raw, title: bnFix(raw.title) };
          if (!isCircular(c.title)) continue;
          const title = circularTitle(c.title);
          const { category, subcategory } = classify({ title: c.title, company: site.company, source: site.source });
          rows.push({
            source: site.source,
            externalId: c.id.slice(0, 500),
            title,
            normTitle: normTitle(title),
            company: site.company,
            category,
            subcategory,
            postedAt: c.postedAt,
            deadline: c.deadline,
          });
        }
      } catch (e) {
        errors.push(`${site.source}: ${e instanceof Error ? e.message : e}`);
      }
    }),
  );
  return { rows, errors };
}
