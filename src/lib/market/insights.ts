import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { ALL_CATEGORIES } from "./taxonomy";

// Aggregates the stored Bangladesh job posts into the numbers the Career Insights pages show.

export const WINDOWS = [
  { key: "today", label: "Today", days: 1 },
  { key: "d3", label: "3 days", days: 3 },
  { key: "d7", label: "7 days", days: 7 },
  { key: "d15", label: "15 days", days: 15 },
  { key: "d30", label: "30 days", days: 30 },
] as const;
export type WindowKey = (typeof WINDOWS)[number]["key"];

export interface Stats {
  /** Job posts per window. */
  counts: Record<WindowKey, number>;
  /** Seats (a post can hire several people), last 30 days. */
  vacancies: number;
  /** Posted salaries (midpoint of each range), BDT a month, last 30 days: median and middle half. */
  salary?: { avg: number; low: number; high: number; n: number };
  /** Share of posts open to freshers (0–1 year asked, or none stated). */
  fresherPct: number;
  /** Average years of experience asked, where stated. */
  expAvg?: number;
  /** Lowest education accepted: [level, share]. */
  edu: [string, number][];
  /** The 7 full days before today vs the 7 before those (percent); undefined with too little data. */
  growth?: number;
  companies: [string, number][];
}

export interface TitleStats extends Stats {
  title: string;
}
export interface SubStats extends Stats {
  key: string;
  titles: TitleStats[];
}
export interface CategoryStats extends Stats {
  key: string;
  subs: SubStats[];
}
export interface Market {
  total: Stats;
  categories: CategoryStats[];
  trackingSince?: string;
  updatedAt: string;
}

interface Row {
  category: string;
  subcategory: string;
  normTitle: string;
  company: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  expMin: number | null;
  eduLevel: string | null;
  vacancies: number;
  postedAt: Date;
}

const DHAKA_MS = 6 * 3600_000;
/** Start of the Dhaka calendar day `daysBack` days ago, as a UTC timestamp. */
function dhakaDayStart(daysBack: number): number {
  const local = Date.now() + DHAKA_MS;
  return local - (local % 86_400_000) - DHAKA_MS - daysBack * 86_400_000;
}

function stats(rows: Row[], withCompanies = false): Stats {
  const starts = Object.fromEntries(WINDOWS.map((w) => [w.key, dhakaDayStart(w.days - 1)])) as Record<WindowKey, number>;
  const counts = { today: 0, d3: 0, d7: 0, d15: 0, d30: 0 } as Record<WindowKey, number>;
  // Growth compares whole days only: the 7 days before today vs the 7 before those.
  const todayStart = dhakaDayStart(0);
  const cur7Start = dhakaDayStart(7);
  const prev7Start = dhakaDayStart(14);
  let cur7 = 0;
  let prev7 = 0;
  let vacancies = 0;
  const salaries: number[] = [];
  let fresher = 0;
  let expSum = 0;
  let expN = 0;
  const edu = new Map<string, number>();
  let eduN = 0;
  const companies = new Map<string, number>();
  let n30 = 0;
  for (const r of rows) {
    const t = r.postedAt.getTime();
    if (t >= prev7Start && t < cur7Start) prev7++;
    else if (t >= cur7Start && t < todayStart) cur7++;
    if (t < starts.d30) continue;
    n30++;
    for (const w of WINDOWS) if (t >= starts[w.key]) counts[w.key]++;
    vacancies += r.vacancies;
    if (r.salaryMin) salaries.push((r.salaryMin + (r.salaryMax ?? r.salaryMin)) / 2);
    if (r.expMin === null || r.expMin <= 1) fresher++;
    if (r.expMin !== null) {
      expSum += r.expMin;
      expN++;
    }
    if (r.eduLevel) {
      edu.set(r.eduLevel, (edu.get(r.eduLevel) ?? 0) + 1);
      eduN++;
    }
    if (withCompanies && r.company) companies.set(r.company, (companies.get(r.company) ?? 0) + 1);
  }
  salaries.sort((a, b) => a - b);
  const q = (p: number) => salaries[Math.min(salaries.length - 1, Math.floor(p * salaries.length))];
  return {
    counts,
    vacancies,
    salary: salaries.length >= 3 ? { avg: Math.round(q(0.5)), low: Math.round(q(0.25)), high: Math.round(q(0.75)), n: salaries.length } : undefined,
    fresherPct: n30 ? fresher / n30 : 0,
    expAvg: expN ? expSum / expN : undefined,
    edu: [...edu.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, v / eduN]),
    growth: prev7 >= 5 ? Math.round(((cur7 - prev7) / prev7) * 100) : undefined,
    companies: [...companies.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
  };
}

function group<T>(rows: T[], key: (r: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    let list = m.get(k);
    if (!list) m.set(k, (list = []));
    list.push(r);
  }
  return m;
}

async function load(): Promise<Market> {
  const since = new Date(dhakaDayStart(30)); // 30-day windows + the week before for growth
  const rows: Row[] = [];
  let cursor: string | undefined;
  // Paged, so a slow link never has to carry one huge result.
  for (;;) {
    const page = await prisma.marketJob.findMany({
      where: { postedAt: { gte: since } },
      orderBy: { id: "asc" },
      take: 5000,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: { id: true, category: true, subcategory: true, normTitle: true, company: true, salaryMin: true, salaryMax: true, expMin: true, eduLevel: true, vacancies: true, postedAt: true },
    });
    rows.push(...page);
    if (page.length < 5000) break;
    cursor = page[page.length - 1].id;
  }
  const first = await prisma.marketJob.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } });

  const byCat = group(rows, (r) => r.category);
  const categories = ALL_CATEGORIES.map((cat): CategoryStats => {
    const catRows = byCat.get(cat.key) ?? [];
    const bySub = group(catRows, (r) => r.subcategory);
    const subs = cat.subs.map((sub): SubStats => {
      const subRows = bySub.get(sub.key) ?? [];
      // Group spellings of one title together ("Sales Executive" / "Sales executive").
      const byTitle = group(subRows, (r) => r.normTitle.toLowerCase());
      const titles = [...byTitle.values()]
        .map((list) => ({ title: list[0].normTitle, ...stats(list) }))
        .filter((t) => t.counts.d30 > 0)
        .sort((a, b) => b.counts.d30 - a.counts.d30)
        .slice(0, 60);
      return { key: sub.key, titles, ...stats(subRows, true) };
    });
    return { key: cat.key, subs, ...stats(catRows, true) };
  });
  return { total: stats(rows), categories, trackingSince: first?.createdAt.toISOString(), updatedAt: new Date().toISOString() };
}

/** Cached for 15 minutes — the numbers move slowly and the page shouldn't hit the database on every view. */
export const getMarket = unstable_cache(load, ["career-market-v3"], { revalidate: 900 });
