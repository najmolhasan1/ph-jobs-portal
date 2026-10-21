import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb, EmptyNote, FactsGrid, Growth, GuideCard, num, parseWindow, SalaryLine, WindowCounts, WindowTabs, windowLabel } from "@/components/careers/ui";
import { getMarket } from "@/lib/market/insights";
import { categoryByKey } from "@/lib/market/taxonomy";

export const dynamic = "force-dynamic";

type Params = Promise<{ cat: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const cat = categoryByKey((await params).cat);
  return { title: cat ? `${cat.name.replace(/ jobs$/i, "")} jobs in Bangladesh — Career Insights` : "Career Insights" };
}

export default async function CategoryPage({ params, searchParams }: { params: Params; searchParams: Promise<{ w?: string }> }) {
  const { cat: key } = await params;
  const w = parseWindow((await searchParams).w);
  const meta = categoryByKey(key);
  if (!meta) notFound();
  const market = await getMarket();
  const stats = market.categories.find((c) => c.key === key)!;
  const subs = stats.subs
    .map((s) => ({ s, sub: meta.subs.find((x) => x.key === s.key)! }))
    .filter(({ s, sub }) => s.counts.d30 > 0 || sub.guide)
    .sort((a, b) => b.s.counts[w] - a.s.counts[w] || b.s.counts.d30 - a.s.counts.d30);
  const base = `/careers/${key}`;

  return (
    <div className="pt-8 sm:pt-12">
      <Breadcrumb items={[{ href: "/careers", label: "Career Insights" }, { label: meta.name }]} />
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid size-14 place-items-center rounded-2xl border border-line bg-surface text-3xl shadow-card" aria-hidden>
            {meta.icon}
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl">{meta.name}</h1>
            <p className="mt-1 text-sm text-muted">{meta.blurb}</p>
          </div>
        </div>
        <WindowTabs active={w} base={base} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_2fr]">
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
          <div className="text-[11px] font-bold uppercase tracking-wide text-faint">Job posts {windowLabel(w)}</div>
          <div className="mt-1 text-4xl font-extrabold tabular-nums">{num(stats.counts[w])}</div>
          <div className="mt-1 text-xs text-muted">{num(stats.vacancies)} seats in the last 30 days</div>
          <div className="mt-4">
            <WindowCounts counts={stats.counts} active={w} />
          </div>
          <div className="mt-3">
            <Growth value={stats.growth} />
          </div>
        </div>
        <FactsGrid stats={stats} />
      </div>

      <div className="mt-4">
        <GuideCard guide={meta.guide} />
      </div>

      <h2 className="mt-10 text-xl font-extrabold sm:text-2xl">Sub-fields</h2>
      <p className="text-sm text-muted">Open one to see every job title, its openings and pay.</p>
      {subs.length ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subs.map(({ s, sub }) => (
            <Link
              key={sub.key}
              href={`${base}/${sub.key}${w === "d30" ? "" : `?w=${w}`}`}
              className="group flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[var(--shadow-hover)]"
            >
              <h3 className="font-extrabold group-hover:text-brand-text">{sub.name}</h3>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold tabular-nums">{num(s.counts[w])}</span>
                <span className="text-xs font-semibold text-muted">jobs {windowLabel(w)}</span>
              </div>
              <div className="mt-3">
                <WindowCounts counts={s.counts} active={w} />
              </div>
              <div className="mt-3 text-sm">
                <SalaryLine stats={s} compact />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Growth value={s.growth} />
                <span className="inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-muted">{Math.round(s.fresherPct * 100)}% fresher-friendly</span>
              </div>
              {s.titles.length > 0 && (
                <p className="mt-3 line-clamp-2 text-xs text-faint">
                  {s.titles
                    .slice(0, 4)
                    .map((t) => t.title)
                    .join(" · ")}
                </p>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-4">
          <EmptyNote>No posts in this path in the last 30 days yet — circulars appear here as soon as they&apos;re published.</EmptyNote>
        </div>
      )}

      {stats.companies.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-extrabold">Top hiring employers (30 days)</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {stats.companies.map(([name, n]) => (
              <span key={name} className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold">
                {name} <span className="text-faint">· {n}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
