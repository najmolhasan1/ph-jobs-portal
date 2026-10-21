import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb, EmptyNote, FactsGrid, Growth, GuideCard, num, parseWindow, tk, WindowCounts, WindowTabs, windowLabel } from "@/components/careers/ui";
import { getMarket, WINDOWS } from "@/lib/market/insights";
import { categoryByKey } from "@/lib/market/taxonomy";

export const dynamic = "force-dynamic";

type Params = Promise<{ cat: string; sub: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { cat, sub } = await params;
  const s = categoryByKey(cat)?.subs.find((x) => x.key === sub);
  return { title: s ? `${s.name} jobs in Bangladesh — Career Insights` : "Career Insights" };
}

export default async function SubCategoryPage({ params, searchParams }: { params: Params; searchParams: Promise<{ w?: string }> }) {
  const { cat: catKey, sub: subKey } = await params;
  const w = parseWindow((await searchParams).w);
  const cat = categoryByKey(catKey);
  const sub = cat?.subs.find((x) => x.key === subKey);
  if (!cat || !sub) notFound();
  const market = await getMarket();
  const stats = market.categories.find((c) => c.key === catKey)!.subs.find((s) => s.key === subKey)!;
  const titles = [...stats.titles].sort((a, b) => b.counts[w] - a.counts[w] || b.counts.d30 - a.counts.d30);
  const base = `/careers/${catKey}/${subKey}`;

  return (
    <div className="pt-8 sm:pt-12">
      <Breadcrumb items={[{ href: "/careers", label: "Career Insights" }, { href: `/careers/${catKey}`, label: cat.name }, { label: sub.name }]} />
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-brand-text">
            {cat.icon} {cat.name}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-4xl">{sub.name}</h1>
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
        <GuideCard guide={sub.guide ?? cat.guide} title={sub.guide ? "How to get in" : `How to get in (${cat.name})`} />
      </div>

      <h2 className="mt-10 text-xl font-extrabold sm:text-2xl">Job titles</h2>
      <p className="text-sm text-muted">Actual titles employers posted, sorted by openings {windowLabel(w)}.</p>
      {titles.length ? (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-surface shadow-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-2/60 text-left text-[11px] font-bold uppercase tracking-wide text-faint">
                <th className="px-4 py-3">Job title</th>
                {WINDOWS.map((x) => (
                  <th key={x.key} className={`px-2 py-3 text-right ${x.key === w ? "text-brand-text" : ""}`}>
                    {x.key === "today" ? "Today" : x.label.replace(" days", "d")}
                  </th>
                ))}
                <th className="px-3 py-3 text-right">Typical salary</th>
                <th className="px-3 py-3 text-right">Exp. asked</th>
                <th className="px-4 py-3 text-right">Fresher-friendly</th>
              </tr>
            </thead>
            <tbody>
              {titles.map((t) => (
                <tr key={t.title} className="border-b border-line last:border-0 hover:bg-surface-2/50">
                  <td className="px-4 py-2.5 font-semibold">
                    {t.title}
                  </td>
                  {WINDOWS.map((x) => (
                    <td key={x.key} className={`px-2 py-2.5 text-right tabular-nums ${x.key === w ? "font-extrabold text-brand-text" : "text-muted"}`}>
                      {t.counts[x.key] || <span className="text-faint">–</span>}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right tabular-nums">{t.salary ? tk(t.salary.avg) : <span className="text-faint">–</span>}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{t.expAvg !== undefined ? `${t.expAvg.toFixed(1)} yrs` : <span className="text-faint">–</span>}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{Math.round(t.fresherPct * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4">
          <EmptyNote>No posts here in the last 30 days yet — they&apos;ll show up as soon as a circular or job is published.</EmptyNote>
        </div>
      )}

      {stats.companies.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-extrabold">Who is hiring (30 days)</h2>
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
