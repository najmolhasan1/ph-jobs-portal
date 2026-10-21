import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { searchPage } from "@/lib/sources/bdjobs";
import type { RawItem } from "@/lib/sources/types";
import { classify, normTitle, parseEducation, parseExperience, parseSalary } from "./taxonomy";

// Career Insights collector: stores every job posted in Bangladesh (not only the portal's
// target roles) with its career path, so the insights page can count openings, salaries and
// trends per field. Free sources only: BDJobs' public search API and Teletalk's govt circulars.

type Row = Prisma.MarketJobCreateManyInput;

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

function bdjobsRow(j: RawItem): Row | null {
  const id = str(j.Jobid);
  const title = str(j.jobTitle) ?? str(j.JobTitleBng);
  const posted = new Date(String(j.publishDate ?? ""));
  if (!id || !title || Number.isNaN(posted.getTime())) return null;
  const company = str(j.companyName);
  const location = str(j.location);
  const { category, subcategory } = classify({ title, company, location, source: "bdjobs", bdCat: Number(j.Cat_id) });
  const salary = parseSalary(str(j.Salary));
  const deadline = new Date(String(j.deadlineDB ?? ""));
  return {
    source: "bdjobs",
    externalId: id,
    title,
    normTitle: normTitle(title),
    company,
    location,
    category,
    subcategory,
    salaryMin: salary.min,
    salaryMax: salary.max,
    expMin: parseExperience(str(j.experience)),
    eduLevel: parseEducation(str(j.eduRec)),
    vacancies: Math.max(1, Number(j.Vacancies) || 1),
    bdCat: Number.isFinite(Number(j.Cat_id)) ? Number(j.Cat_id) : undefined,
    postedAt: posted,
    deadline: Number.isNaN(deadline.getTime()) ? undefined : deadline,
  };
}

/** BDJobs, every category. `postedWithin` "1"–"7" days, or "" for every open job. */
export async function collectBdjobs(postedWithin: string): Promise<number> {
  // isPro: include "early access" posts BDJobs shows Pro members in their first days.
  const params = { postedWithin, rpp: "100", isPro: "1" };
  const first = await searchPage(params);
  const pages = Math.min(first.totalPages, 150);
  const items = [...first.items];
  for (let pg = 2; pg <= pages; pg += 6) {
    const batch = await Promise.all(
      Array.from({ length: Math.min(6, pages - pg + 1) }, (_, i) => searchPage({ ...params, pg: String(pg + i) }).catch(() => ({ items: [] }))),
    );
    for (const b of batch) items.push(...b.items);
  }
  return save(items.map(bdjobsRow));
}

interface TeletalkOrg {
  name: string;
  job_created_at?: string;
  govt_jobs?: { id: number; job_title?: string; job_title_bn?: string }[];
}

/** Teletalk "alljobs": every live government circular. */
export async function collectTeletalk(): Promise<number> {
  const rows: (Row | null)[] = [];
  for (let page = 1; page <= 30; page++) {
    const res = await fetch(`https://alljobs.teletalk.com.bd/api/v1/govt-jobs/org-list?page=${page}&limit=20`, {
      headers: { "User-Agent": "Mozilla/5.0 (PH Career Insights)" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`Teletalk HTTP ${res.status}`);
    const json = (await res.json()) as { count?: number; govtOrgJobs?: TeletalkOrg[] };
    const orgs = json.govtOrgJobs ?? [];
    for (const org of orgs) {
      const posted = new Date(org.job_created_at ?? "");
      for (const job of org.govt_jobs ?? []) {
        const title = str(job.job_title) ?? str(job.job_title_bn);
        if (!title || Number.isNaN(posted.getTime())) continue;
        const { category, subcategory } = classify({ title, company: org.name, source: "teletalk" });
        rows.push({ source: "teletalk", externalId: String(job.id), title, normTitle: normTitle(title), company: org.name, category, subcategory, postedAt: posted });
      }
    }
    if (orgs.length < 20 || page * 20 >= (json.count ?? 0)) break;
  }
  return save(rows);
}

async function save(rows: (Row | null)[]): Promise<number> {
  const data = rows.filter((r): r is Row => r !== null);
  let added = 0;
  for (let i = 0; i < data.length; i += 500) {
    const { count } = await prisma.marketJob.createMany({ data: data.slice(i, i + 500), skipDuplicates: true });
    added += count;
  }
  return added;
}

/** Re-sort stored jobs after the taxonomy changes. */
export async function reclassifyAll(): Promise<number> {
  let changed = 0;
  let cursor: string | undefined;
  for (;;) {
    const batch = await prisma.marketJob.findMany({
      take: 1000,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      select: { id: true, source: true, title: true, company: true, location: true, bdCat: true, category: true, subcategory: true },
    });
    if (!batch.length) break;
    cursor = batch[batch.length - 1].id;
    const updates = batch
      .map((j) => ({ j, c: classify({ title: j.title, company: j.company, location: j.location, source: j.source, bdCat: j.bdCat ?? undefined }), t: normTitle(j.title) }))
      .filter(({ j, c }) => c.category !== j.category || c.subcategory !== j.subcategory);
    await prisma.$transaction(updates.map(({ j, c, t }) => prisma.marketJob.update({ where: { id: j.id }, data: { ...c, normTitle: t } })));
    changed += updates.length;
  }
  return changed;
}
