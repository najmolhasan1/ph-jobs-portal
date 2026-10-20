"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { JobDTO } from "@/lib/jobs-query";
import { SOURCE_LABELS } from "@/lib/format";
import { CATEGORY_LABELS, SKILL_OPTIONS, TRACK_KEYS, TRACK_META, type TrackKey } from "@/lib/tracks";
import { JobCard } from "./JobCard";
import {
  BrainIcon,
  CheckIcon,
  CloseIcon,
  CodeIcon,
  CpuIcon,
  FilterIcon,
  GridIcon,
  LayersIcon,
  SearchIcon,
  SparkIcon,
} from "./icons";

type Filters = {
  q: string;
  track: string;
  posted: string;
  source: string;
  remote: string;
  level: string;
  category: string;
  skill: string;
};
// Every published job stays listed, newest first; the date is an optional filter.
const DEFAULTS: Filters = { q: "", track: "", posted: "", source: "", remote: "", level: "", category: "", skill: "" };
const SAVED_KEY = "ph-career-radar-saved";
const PAGE = 24; // = PAGE_SIZE in jobs-query

/** Page numbers with gaps: 1 … 4 5 [6] 7 8 … 20 */
function pageList(current: number, total: number): (number | "…")[] {
  const pages = new Set([1, total, current - 2, current - 1, current, current + 1, current + 2]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null;
  const btn = "grid h-10 min-w-10 place-items-center rounded-xl border px-3 text-sm font-bold transition disabled:opacity-40";
  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-1.5" aria-label="Pagination">
      <button type="button" className={`${btn} border-line bg-surface hover:border-brand`} disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ← Prev
      </button>
      {pageList(page, pages).map((p, i) =>
        p === "…" ? (
          <span key={`gap${i}`} className="px-1 text-sm text-faint">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? "page" : undefined}
            className={`${btn} tabular-nums ${p === page ? "border-brand bg-brand text-white" : "border-line bg-surface hover:border-brand"}`}
          >
            {p}
          </button>
        ),
      )}
      <button type="button" className={`${btn} border-line bg-surface hover:border-brand`} disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Next →
      </button>
    </nav>
  );
}

type IconC = (p: { className?: string }) => React.ReactElement;

function toParams(f: Filters) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) p.set(k, v);
  return p;
}

function readSaved(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

const TRACK_ICONS: Record<TrackKey, IconC> = { level1: CodeIcon, level2: LayersIcon, phitron: CpuIcon, aiml: BrainIcon };

// ───────────────────────── sections ─────────────────────────

function Hero({ today }: { today: number }) {
  return (
    <section className="relative grid items-center gap-10 pb-10 pt-10 sm:pt-14 lg:grid-cols-[1.25fr_1fr]">
      <div>
        <p className="flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] text-muted">
          <span className="size-1.5 rounded-full bg-ok" />
          YOUR NEXT OPPORTUNITY IS OUT THERE
        </p>
        <h1 className="mt-4 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.5rem]">
          Big ambitions.
          <br />
          Your <span className="text-brand">next opportunity.</span>
        </h1>
        <p className="mt-5 max-w-lg text-base leading-relaxed text-muted">
          Fresh intern, fresher &amp; junior tech jobs from Bangladesh and remote teams — picked up the moment
          they&apos;re posted and matched to what you&apos;re learning at Programming Hero.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <span className="flex items-center gap-2">
            <span className="flex -space-x-2">
              {[
                ["B", "bg-[#f1eafe] text-[#7b3fe4]"],
                ["L", "bg-[#e7effd] text-[#3b63c9]"],
                ["F", "bg-[#fdeee3] text-[#c56a1d]"],
              ].map(([l, c]) => (
                <span key={l} className={`grid size-7 place-items-center rounded-full border-2 border-surface text-[11px] font-bold ${c}`}>
                  {l}
                </span>
              ))}
            </span>
            <span className="text-muted">
              <b className="font-bold text-ink">12 platforms</b> watched live
            </span>
          </span>
          <span className="text-muted">
            <b className="font-bold tabular-nums text-ink">{today}</b> matching {today === 1 ? "job" : "jobs"} posted today
          </span>
        </div>
      </div>

      {/* Decorative illustration */}
      <div className="relative hidden h-64 lg:block" aria-hidden>
        <div className="absolute inset-0 m-auto size-56 rounded-full bg-brand/10 blur-3xl" />
        <div className="animate-float absolute left-1/2 top-1/2 -ml-12 -mt-12 grid size-24 place-items-center rounded-3xl bg-brand text-white shadow-[0_18px_40px_rgb(123_63_228/0.4)]">
          <CodeIcon className="size-10" />
        </div>
        <div className="animate-float absolute left-[6%] top-[6%] flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-bold shadow-card [animation-delay:-2s]">
          <span className="size-2 rounded-full bg-brand" /> React Developer
        </div>
        <div className="animate-float absolute right-0 top-[36%] flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-bold shadow-card [animation-delay:-4s]">
          <span className="grid size-5 place-items-center rounded-md bg-brand-soft text-brand">
            <SparkIcon className="size-3" />
          </span>
          Remote possibilities
        </div>
        <div className="animate-float absolute bottom-[4%] left-[16%] flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-bold shadow-card [animation-delay:-1s]">
          <span className="grid size-5 place-items-center rounded-full bg-ok-soft text-ok">
            <CheckIcon className="size-3" />
          </span>
          Your next chapter
        </div>
        <SparkIcon className="absolute right-[18%] top-[4%] size-4 text-brand/60" />
        <SparkIcon className="absolute bottom-[18%] right-[12%] size-3 text-brand/40" />
      </div>
    </section>
  );
}

function Modes({ counts, value, onChange }: { counts: Record<string, number>; value: string; onChange: (t: string) => void }) {
  const items: { key: string; label: string; title: string; blurb: string; Icon: IconC }[] = [
    { key: "", label: "All tracks", title: "Every matching role", blurb: "All junior web & software jobs", Icon: GridIcon },
    ...TRACK_KEYS.map((k) => ({ key: k, label: TRACK_META[k].label, title: TRACK_META[k].title, blurb: TRACK_META[k].blurb, Icon: TRACK_ICONS[k] })),
  ];
  return (
    <section aria-labelledby="modes-title">
      <div className="mb-4">
        <h2 id="modes-title" className="text-lg font-extrabold tracking-tight">Choose your track</h2>
        <p className="text-sm text-muted">Jobs matched to what you learn in each Programming Hero course.</p>
      </div>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-5">
        {items.map(({ key, label, title, blurb, Icon }) => {
          const active = value === key;
          const n = counts[key || "all"] ?? 0;
          return (
            <button
              key={key || "all"}
              type="button"
              onClick={() => onChange(key)}
              aria-pressed={active}
              className={`relative w-[15rem] shrink-0 snap-start rounded-2xl border p-4 text-left transition sm:w-auto ${
                active
                  ? "border-brand bg-brand-soft shadow-[0_8px_24px_rgb(123_63_228/0.14)]"
                  : "border-line bg-surface shadow-card hover:-translate-y-0.5 hover:border-brand/40"
              }`}
            >
              <div className="flex items-start justify-between">
                <span className={`grid size-10 place-items-center rounded-xl ${active ? "bg-brand text-white" : "bg-brand-soft text-brand"}`}>
                  <Icon className="size-5" />
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${active ? "bg-surface text-brand" : "bg-surface-2 text-muted"}`}>
                  {n} {n === 1 ? "job" : "jobs"}
                </span>
              </div>
              <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-brand">{label}</p>
              <p className="mt-0.5 font-bold leading-snug">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{blurb}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        active ? "border-brand bg-brand text-white" : "border-line bg-surface text-muted hover:border-brand/40 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-faint">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

const selectCls =
  "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm font-medium text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10";

// ───────────────────────── page ─────────────────────────

export function JobFeed({
  initialJobs,
  initialCounts,
  initialToday,
}: {
  initialJobs: JobDTO[];
  initialCounts: Record<string, number>;
  initialToday: number;
}) {
  const [filters, setFiltersRaw] = useState<Filters>(DEFAULTS);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [jobs, setJobs] = useState<JobDTO[]>(initialJobs);
  const [counts, setCounts] = useState(initialCounts);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState<"connecting" | "live" | "offline">("connecting");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState<"all" | "saved">("all");
  const [saved, setSaved] = useState<string[]>([]);
  const [todayTotal, setTodayTotal] = useState(initialToday);
  const first = useRef(true);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => setSaved(readSaved()), []);

  // Any filter change starts again from page 1.
  const setFilters = useCallback((next: Filters | ((f: Filters) => Filters)) => {
    setFiltersRaw(next);
    setPage(1);
  }, []);

  // Debounce typing into the search box.
  useEffect(() => {
    const t = setTimeout(() => {
      if (query !== filters.q) setFilters((f) => ({ ...f, q: query }));
    }, 300);
    return () => clearTimeout(t);
  }, [query, filters.q, setFilters]);

  const set = useCallback(<K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((f) => ({ ...f, [k]: v })), [setFilters]);
  const toggle = useCallback(
    <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((f) => ({ ...f, [k]: f[k] === v ? DEFAULTS[k] : v })),
    [setFilters],
  );

  const activeCount = useMemo(
    () => (["source", "remote", "level", "category", "skill", "posted"] as const).filter((k) => filters[k]).length,
    [filters],
  );

  // Refetch the list + mode counts whenever filters change, and the list when the page changes.
  const countsFor = useRef(toParams(DEFAULTS).toString());
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (view === "saved") return;
    let cancelled = false;
    setLoading(true);
    const p = toParams(filters);
    const needCounts = countsFor.current !== p.toString();
    const list = new URLSearchParams(p);
    list.set("page", String(page));
    list.set("limit", String(PAGE));
    Promise.all([
      fetch(`/api/jobs?${list}`).then((r) => r.json()),
      needCounts ? fetch(`/api/jobs/counts?${p}`).then((r) => r.json()) : null,
    ])
      .then(([d, c]: [{ jobs: JobDTO[] }, { counts: Record<string, number> } | null]) => {
        if (cancelled) return;
        setJobs(d.jobs);
        if (c) {
          setCounts(c.counts);
          countsFor.current = p.toString();
        }
        setNewIds(new Set());
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [filters, page, view]);

  // Saved tab: fetch the bookmarked jobs.
  useEffect(() => {
    if (view !== "saved") return;
    if (!saved.length) {
      setJobs([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/jobs?ids=${saved.join(",")}&limit=100`)
      .then((r) => r.json())
      .then((d: { jobs: JobDTO[] }) => {
        if (cancelled) return;
        setJobs(d.jobs);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [view, saved]);

  // Live stream of newly published jobs matching the current filters. They appear at the top of
  // page 1; on later pages only the counts move, so the list doesn't jump while someone reads it.
  const pageRef = useRef(page);
  pageRef.current = page;
  useEffect(() => {
    if (view === "saved") return;
    const p = toParams(filters);
    p.set("since", new Date().toISOString());
    const es = new EventSource(`/api/jobs/stream?${p}`);
    es.addEventListener("ready", () => setLive("live"));
    es.addEventListener("jobs", (e) => {
      const incoming: JobDTO[] = JSON.parse((e as MessageEvent).data);
      if (pageRef.current === 1) {
        setJobs((prev) => {
          const seen = new Set(prev.map((j) => j.id));
          return [...incoming.filter((j) => !seen.has(j.id)).reverse(), ...prev].slice(0, PAGE);
        });
        setNewIds((prev) => new Set([...prev, ...incoming.map((j) => j.id)]));
      }
      setCounts((c) => {
        const next: Record<string, number> = { ...c, all: (c.all ?? 0) + incoming.length };
        for (const j of incoming) for (const t of j.tracks ?? []) next[t] = (next[t] ?? 0) + 1;
        return next;
      });
      setTodayTotal((n) => n + incoming.length);
    });
    es.onerror = () => setLive("offline");
    es.onopen = () => setLive("live");
    return () => es.close();
  }, [filters, view]);

  const goToPage = useCallback((p: number) => {
    setPage(p);
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const toggleSave = useCallback((id: string) => {
    setSaved((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev];
      try {
        localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((f) => ({ ...f, q: query }));
    setView("all");
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const trackName = filters.track ? TRACK_META[filters.track as TrackKey]?.label : "";
  const total = counts[filters.track || "all"] ?? jobs.length;
  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <div>
      <Hero today={todayTotal} />

      <Modes
        counts={counts}
        value={filters.track}
        onChange={(t) => {
          setView("all");
          set("track", t);
        }}
      />

      {/* Search */}
      <form onSubmit={submitSearch} className="mt-8 rounded-2xl border border-line bg-surface p-2 shadow-card">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex flex-1 items-center gap-3 px-3">
            <SearchIcon className="size-5 shrink-0 text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Job title, company or skill…"
              className="h-11 w-full min-w-0 bg-transparent text-[15px] font-medium outline-none placeholder:text-faint"
              aria-label="Search jobs"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="text-faint hover:text-ink" aria-label="Clear search">
                <CloseIcon />
              </button>
            )}
          </label>
          <div className="hidden h-8 w-px bg-line sm:block" />
          <select
            value={filters.remote}
            onChange={(e) => set("remote", e.target.value)}
            className="h-11 rounded-xl bg-transparent px-3 text-sm font-semibold text-muted outline-none sm:w-52"
            aria-label="Location"
          >
            <option value="">All locations</option>
            <option value="0">Bangladesh (onsite)</option>
            <option value="1">Remote</option>
          </select>
          <button className="h-11 rounded-xl bg-brand px-5 text-sm font-bold text-white transition hover:bg-brand-hover">
            Find my next role →
          </button>
        </div>
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold text-faint">Quick picks</span>
        <Pill
          active={!filters.posted && !filters.level && !filters.remote && !filters.skill}
          onClick={() => setFilters((f) => ({ ...f, posted: "", level: "", remote: "", skill: "" }))}
        >
          All
        </Pill>
        <Pill active={filters.posted === "today"} onClick={() => toggle("posted", "today")}>
          Today (Dhaka)
        </Pill>
        <Pill active={filters.level === "junior"} onClick={() => toggle("level", "junior")}>Fresher friendly</Pill>
        <Pill active={filters.level === "intern"} onClick={() => toggle("level", "intern")}>Internships</Pill>
        <Pill active={filters.remote === "1"} onClick={() => toggle("remote", "1")}>Remote</Pill>
        <Pill active={filters.skill === "React"} onClick={() => toggle("skill", "React")}>React</Pill>
        <Pill active={filters.skill === "Next.js"} onClick={() => toggle("skill", "Next.js")}>Next.js</Pill>
      </div>

      {/* Toolbar */}
      <div ref={listRef} className="mt-10 flex scroll-mt-24 flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.18em] text-faint">A STEP CLOSER TO YOUR NEXT CHAPTER</p>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-extrabold tracking-tight">
            Discover your next role
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold tabular-nums text-brand">
              {view === "saved" ? saved.length : total}
            </span>
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 hidden items-center gap-1.5 text-xs font-semibold text-muted md:flex" aria-live="polite">
            <span className={`size-2 rounded-full ${live === "live" ? "animate-pulse bg-ok" : live === "offline" ? "bg-danger" : "bg-warn"}`} />
            {live === "live" ? "Live updates" : live === "offline" ? "Reconnecting…" : "Connecting…"}
          </span>
          <div className="flex rounded-xl border border-line bg-surface p-1 text-xs font-bold">
            {(["all", "saved"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={`rounded-lg px-3 py-1.5 transition ${view === v ? "bg-brand-soft text-brand" : "text-muted hover:text-ink"}`}
              >
                {v === "all" ? "All opportunities" : `Saved (${saved.length})`}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            aria-expanded={filtersOpen}
            aria-controls="filter-panel"
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${
              filtersOpen ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-ink hover:border-brand/40"
            }`}
          >
            <FilterIcon /> Filters
            {activeCount > 0 && <span className="grid size-5 place-items-center rounded-full bg-brand text-[10px] text-white">{activeCount}</span>}
          </button>
        </div>
      </div>

      {(trackName || filters.q) && view === "all" && (
        <p className="mt-3 text-sm text-muted">
          Showing {trackName && <b className="text-ink">{trackName}</b>}
          {trackName && filters.q && " · "}
          {filters.q && (
            <>
              results for “<b className="text-ink">{filters.q}</b>”
            </>
          )}
        </p>
      )}

      {/* Filter panel — opens from the Filters button */}
      {filtersOpen && (
        <div id="filter-panel" className="animate-new mt-4 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FilterGroup title="Role category">
              <Pill active={!filters.category} onClick={() => set("category", "")}>All</Pill>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <Pill key={k} active={filters.category === k} onClick={() => toggle("category", k)}>{v}</Pill>
              ))}
            </FilterGroup>
            <FilterGroup title="Experience level">
              <Pill active={!filters.level} onClick={() => set("level", "")}>All</Pill>
              <Pill active={filters.level === "intern"} onClick={() => toggle("level", "intern")}>Internship</Pill>
              <Pill active={filters.level === "junior"} onClick={() => toggle("level", "junior")}>Junior / fresher</Pill>
              <Pill active={filters.level === "experienced"} onClick={() => toggle("level", "experienced")}>Experienced</Pill>
            </FilterGroup>
            <FilterGroup title="Work preference">
              <Pill active={!filters.remote} onClick={() => set("remote", "")}>All</Pill>
              <Pill active={filters.remote === "0"} onClick={() => toggle("remote", "0")}>Onsite · Bangladesh</Pill>
              <Pill active={filters.remote === "1"} onClick={() => toggle("remote", "1")}>Remote</Pill>
            </FilterGroup>
            <FilterGroup title="Date posted">
              <Pill active={!filters.posted} onClick={() => set("posted", "")}>All</Pill>
              <Pill active={filters.posted === "today"} onClick={() => set("posted", "today")}>Today</Pill>
              <Pill active={filters.posted === "3"} onClick={() => set("posted", "3")}>Last 3 days</Pill>
              <Pill active={filters.posted === "7"} onClick={() => set("posted", "7")}>Last 7 days</Pill>
              <Pill active={filters.posted === "30"} onClick={() => set("posted", "30")}>Last 30 days</Pill>
            </FilterGroup>
            <FilterGroup title="Platform">
              <select value={filters.source} onChange={(e) => set("source", e.target.value)} className={selectCls} aria-label="Platform">
                <option value="">All platforms</option>
                {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </FilterGroup>
            <FilterGroup title="Skill">
              <select value={filters.skill} onChange={(e) => set("skill", e.target.value)} className={selectCls} aria-label="Skill">
                <option value="">All skills</option>
                {SKILL_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </FilterGroup>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
            <button
              type="button"
              onClick={() => setFilters((f) => ({ ...DEFAULTS, q: f.q, track: f.track }))}
              className="text-sm font-semibold text-muted hover:text-ink"
            >
              Reset filters
            </button>
            <button type="button" onClick={() => setFiltersOpen(false)} className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-hover">
              Show {total} {total === 1 ? "job" : "jobs"}
            </button>
          </div>
        </div>
      )}

      {/* Cards */}
      <div className={`mt-6 grid gap-4 transition-opacity md:grid-cols-2 lg:grid-cols-3 ${loading ? "opacity-60" : ""}`}>
        {jobs.map((j) => (
          <JobCard key={j.id} job={j} isNew={newIds.has(j.id)} saved={saved.includes(j.id)} onToggleSave={toggleSave} />
        ))}
      </div>

      {!jobs.length && !loading && (
        <div className="mt-6 rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
          <p className="font-bold">
            {view === "saved"
              ? "No saved jobs yet"
              : filters.posted === "today"
                ? `No ${trackName ? `${trackName} ` : ""}jobs posted yet today`
                : "No jobs match these filters"}
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            {view === "saved"
              ? "Tap the bookmark on any job to keep it here."
              : filters.posted === "today"
                ? "New roles appear here automatically the moment they're posted — keep this tab open, or widen the date range."
                : "Try a different track, or reset the filters."}
          </p>
          {view === "all" && filters.posted === "today" && (
            <button
              type="button"
              onClick={() => set("posted", "")}
              className="mt-4 rounded-xl border border-line px-4 py-2 text-sm font-bold text-brand hover:border-brand"
            >
              Show all jobs
            </button>
          )}
        </div>
      )}

      {view === "all" && jobs.length > 0 && (
        <>
          <Pagination page={page} pages={pages} onChange={goToPage} />
          <p className="mt-3 text-center text-xs text-faint tabular-nums">
            Showing {(page - 1) * PAGE + 1}–{Math.min(page * PAGE, total)} of {total} jobs
          </p>
        </>
      )}
    </div>
  );
}
