import type { Metadata } from "next";
import Link from "next/link";
import { CareerSearch } from "@/components/careers/CareerSearch";
import { Growth, num, parseWindow, SalaryLine, tk, WindowCounts, WindowTabs, windowLabel } from "@/components/careers/ui";
import { getMarket } from "@/lib/market/insights";
import { ALL_CATEGORIES } from "@/lib/market/taxonomy";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Career Insights — Bangladesh job market | Programming Hero",
  description: "Which careers in Bangladesh have the most jobs, what they pay, what it takes to get in, and how fast they're growing — from real job posts.",
};

export default async function CareersPage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const w = parseWindow((await searchParams).w);
  const market = await getMarket();
  const cats = market.categories
    .map((c) => ({ stats: c, meta: ALL_CATEGORIES.find((x) => x.key === c.key)! }))
    .filter((c) => c.stats.counts.d30 > 0 || c.meta.key === "bcs")
    .sort((a, b) => b.stats.counts[w] - a.stats.counts[w] || b.stats.counts.d30 - a.stats.counts.d30);
  const top = cats[0];
  const searchIndex = market.categories.flatMap((c) =>
    c.subs.flatMap((s) => s.titles.map((t) => ({ title: t.title, cat: c.key, sub: s.key, d30: t.counts.d30, salary: t.salary?.avg }))),
  );
  const withSalary = cats.filter((c) => c.stats.salary && c.stats.salary.n >= 10).sort((a, b) => b.stats.salary!.avg - a.stats.salary!.avg)[0];
  const freshest = cats.filter((c) => c.stats.counts.d30 >= 50).sort((a, b) => b.stats.fresherPct - a.stats.fresherPct)[0];

  return (
    <div className="pt-8 sm:pt-12">
      <section className="relative overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-card sm:p-10">
        <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-brand/10 blur-3xl" aria-hidden />
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand-text">🇧🇩 Bangladesh job market</span>
        <h1 className="mt-4 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          Choose your career with <span className="text-brand">real numbers.</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          How many jobs each career has, what it pays, what it takes to get in and whether it&apos;s growing — counted from every job posted on BDJobs and
          government circulars on Teletalk.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Highlight label={`Job posts ${windowLabel(w)}`} value={num(market.total.counts[w])} note={`${num(market.total.vacancies)} seats in 30 days`} />
          <Highlight label="Most openings" value={top ? `${top.meta.icon} ${top.meta.name}` : "—"} note={top ? `${num(top.stats.counts[w])} posts ${windowLabel(w)}` : ""} />
          <Highlight
            label={withSalary ? "Highest typical pay" : "Most fresher-friendly"}
            value={withSalary ? `${withSalary.meta.icon} ${withSalary.meta.name}` : freshest ? `${freshest.meta.icon} ${freshest.meta.name}` : "—"}
            note={withSalary ? `${tk(withSalary.stats.salary!.avg)}/month typical` : freshest ? `${Math.round(freshest.stats.fresherPct * 100)}% open to freshers` : ""}
          />
        </div>
        <div className="mt-6">
          <CareerSearch index={searchIndex} />
        </div>
      </section>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold sm:text-2xl">Career paths</h2>
          <p className="text-sm text-muted">Sorted by openings {windowLabel(w)}. Open one for sub-fields and real job titles.</p>
        </div>
        <WindowTabs active={w} base="/careers" />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cats.map(({ stats, meta }) => (
          <Link
            key={meta.key}
            href={`/careers/${meta.key}${w === "d30" ? "" : `?w=${w}`}`}
            className="group flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[var(--shadow-hover)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-surface-2 text-2xl" aria-hidden>
                  {meta.icon}
                </span>
                <div>
                  <h3 className="font-extrabold leading-tight group-hover:text-brand-text">{meta.name}</h3>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted">{meta.blurb}</p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tabular-nums">{num(stats.counts[w])}</span>
              <span className="text-xs font-semibold text-muted">jobs {windowLabel(w)}</span>
            </div>
            <div className="mt-3">
              <WindowCounts counts={stats.counts} active={w} />
            </div>
            <div className="mt-3 text-sm">
              <SalaryLine stats={stats} compact />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Growth value={stats.growth} />
              <span className="inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-muted">
                {Math.round(stats.fresherPct * 100)}% fresher-friendly
              </span>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${barrierClass(meta.guide.barrier)}`}>
                Barrier: {meta.guide.barrier}
              </span>
            </div>
            <span className="mt-4 text-xs font-bold text-brand-text">
              {meta.subs.length} sub-fields → <span className="transition group-hover:translate-x-0.5">explore</span>
            </span>
          </Link>
        ))}
      </div>

      <p className="mt-8 text-xs leading-relaxed text-faint">
        Counts are job posts by the day they were published (Dhaka time). Salary is the median of posts that state one. &ldquo;Growth&rdquo; compares the 7 full days before today with the
        7 before. {market.trackingSince && <>Tracking every post since {new Date(market.trackingSince).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}; older posts that had already closed aren&apos;t counted, so the 15- and 30-day numbers grow more complete over the first month. </>}
        Updated every 30 minutes.
      </p>
    </div>
  );
}

function barrierClass(b: string) {
  return b === "Low" ? "bg-ok-soft text-ok" : b === "Medium" ? "bg-warn-soft text-warn" : "bg-danger-soft text-danger";
}

function Highlight({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface-2/60 p-4">
      <div className="text-[11px] font-bold uppercase tracking-wide text-faint">{label}</div>
      <div className="mt-1 truncate text-lg font-extrabold">{value}</div>
      <div className="text-xs text-muted">{note}</div>
    </div>
  );
}
