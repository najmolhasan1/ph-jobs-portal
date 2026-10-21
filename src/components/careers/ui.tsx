import Link from "next/link";
import type { Barrier, Guide } from "@/lib/market/taxonomy";
import { EDU_LABELS } from "@/lib/market/taxonomy";
import { WINDOWS, type Stats, type WindowKey } from "@/lib/market/insights";

export const tk = (n: number) => `৳${Math.round(n).toLocaleString("en-IN")}`;
export const num = (n: number) => n.toLocaleString("en-IN");

export function parseWindow(w: string | string[] | undefined): WindowKey {
  const v = Array.isArray(w) ? w[0] : w;
  return (WINDOWS.find((x) => x.key === v)?.key ?? "d30") as WindowKey;
}

export function windowLabel(w: WindowKey) {
  return w === "today" ? "today" : `in the last ${WINDOWS.find((x) => x.key === w)!.label}`;
}

/** Today · 3d · 7d · 15d · 30d chips that switch the page's window. */
export function WindowTabs({ active, base }: { active: WindowKey; base: string }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1 shadow-card" role="tablist" aria-label="Time window">
      {WINDOWS.map((w) => (
        <Link
          key={w.key}
          href={w.key === "d30" ? base : `${base}?w=${w.key}`}
          role="tab"
          aria-selected={active === w.key}
          scroll={false}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition sm:text-sm ${
            active === w.key ? "bg-brand text-white shadow-[0_6px_18px_-6px_rgb(123_63_228/0.7)]" : "text-muted hover:bg-surface-2 hover:text-ink"
          }`}
        >
          {w.key === "today" ? "Today" : `Last ${w.label}`}
        </Link>
      ))}
    </div>
  );
}

/** The five window counts side by side, the active one highlighted. */
export function WindowCounts({ counts, active }: { counts: Stats["counts"]; active: WindowKey }) {
  return (
    <div className="grid grid-cols-5 overflow-hidden rounded-xl border border-line text-center">
      {WINDOWS.map((w) => (
        <div key={w.key} className={`px-1 py-1.5 ${active === w.key ? "bg-brand-soft" : "bg-surface-2/50"} [&:not(:first-child)]:border-l [&:not(:first-child)]:border-line`}>
          <div className={`text-sm font-extrabold tabular-nums ${active === w.key ? "text-brand-text" : "text-ink"}`}>{num(counts[w.key])}</div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-faint">{w.key === "today" ? "Today" : w.label.replace(" days", "d")}</div>
        </div>
      ))}
    </div>
  );
}

export function Growth({ value }: { value?: number }) {
  if (value === undefined)
    return <span className="inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-faint" title="Needs at least two weeks of posts">Growth: collecting</span>;
  const up = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${up ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}
      title="Posts in the 7 full days before today compared with the 7 days before those"
    >
      {up ? "▲" : "▼"} {Math.abs(value)}% <span className="font-semibold opacity-75">vs prev. week</span>
    </span>
  );
}

const BARRIER_STYLE: Record<Barrier, string> = {
  Low: "bg-ok-soft text-ok",
  Medium: "bg-warn-soft text-warn",
  High: "bg-danger-soft text-danger",
  "Very high": "bg-danger-soft text-danger",
};

export function BarrierChip({ value }: { value: Barrier }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${BARRIER_STYLE[value]}`}>Entry barrier: {value}</span>;
}

export function SalaryLine({ stats, compact }: { stats: Stats; compact?: boolean }) {
  if (!stats.salary) return <span className="text-faint">Salary: too few posts state it</span>;
  return (
    <span>
      <span className="font-bold text-ink">{tk(stats.salary.avg)}</span>
      <span className="text-muted">/month typical</span>
      {!compact && (
        <span className="text-faint">
          {" "}
          · most {tk(stats.salary.low)}–{tk(stats.salary.high)} · from {num(stats.salary.n)} posts
        </span>
      )}
    </span>
  );
}

/** Market facts from real posts: salary, experience, education, employers. */
export function FactsGrid({ stats }: { stats: Stats }) {
  const edu = stats.edu.slice(0, 3);
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Fact label="Typical posted salary">
        {stats.salary ? (
          <>
            <div className="text-xl font-extrabold">{tk(stats.salary.avg)}</div>
            <div className="text-xs text-muted">
              Median · most pay {tk(stats.salary.low)}–{tk(stats.salary.high)} · {num(stats.salary.n)} posts state salary
            </div>
          </>
        ) : (
          <div className="text-sm text-faint">Too few posts state a salary yet</div>
        )}
      </Fact>
      <Fact label="Open to freshers">
        <div className="text-xl font-extrabold">{Math.round(stats.fresherPct * 100)}%</div>
        <div className="text-xs text-muted">ask 0–1 year or no experience</div>
      </Fact>
      <Fact label="Experience asked">
        <div className="text-xl font-extrabold">{stats.expAvg !== undefined ? `${stats.expAvg.toFixed(1)} yrs` : "—"}</div>
        <div className="text-xs text-muted">average, where the post states it</div>
      </Fact>
      <Fact label="Education asked (minimum)">
        {edu.length ? (
          <ul className="space-y-0.5 text-sm">
            {edu.map(([k, v]) => (
              <li key={k} className="flex justify-between gap-2">
                <span>{EDU_LABELS[k] ?? k}</span>
                <span className="font-bold tabular-nums">{Math.round(v * 100)}%</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-faint">Not stated</div>
        )}
      </Fact>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-faint">{label}</div>
      {children}
    </div>
  );
}

/** General career guidance for a path (not from posts). */
export function GuideCard({ guide, title = "How to get in" }: { guide: Guide; title?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold">{title}</h2>
        <BarrierChip value={guide.barrier} />
      </div>
      <dl className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wide text-faint">Requirements & entry</dt>
          <dd className="mt-1 text-sm leading-relaxed text-muted">{guide.entry}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wide text-faint">Typical pay (BDT/month)</dt>
          <dd className="mt-1 text-sm leading-relaxed text-muted">{guide.salary}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-wide text-faint">Growth & outlook</dt>
          <dd className="mt-1 text-sm leading-relaxed text-muted">{guide.outlook}</dd>
        </div>
      </dl>
      <p className="mt-4 text-[11px] text-faint">General guidance; the numbers above and below come from real job posts.</p>
    </div>
  );
}

export function Breadcrumb({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-muted">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-faint">/</span>}
          {it.href ? (
            <Link href={it.href} className="hover:text-brand-text">
              {it.label}
            </Link>
          ) : (
            <span className="text-ink">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-10 text-center text-sm text-muted">{children}</div>;
}
