"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

interface Entry {
  title: string;
  cat: string;
  sub: string;
  d30: number;
  salary?: number;
}

/** Find a job title across every career path. */
export function CareerSearch({ index }: { index: Entry[] }) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return index
      .filter((e) => words.every((w) => e.title.toLowerCase().includes(w)))
      .sort((a, b) => b.d30 - a.d30)
      .slice(0, 8);
  }, [q, index]);

  return (
    <div className="relative max-w-xl">
      <label htmlFor="career-search" className="sr-only">
        Search a job title
      </label>
      <input
        id="career-search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search a job title — e.g. web developer, nurse, merchandiser"
        className="h-12 w-full rounded-xl border border-line bg-surface px-4 text-sm shadow-card outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15"
        autoComplete="off"
      />
      {q.trim() && (
        <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow-hover)]">
          {results.length ? (
            results.map((r) => (
              <Link
                key={`${r.cat}/${r.sub}/${r.title}`}
                href={`/careers/${r.cat}/${r.sub}`}
                className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 text-sm last:border-0 hover:bg-surface-2"
              >
                <span className="truncate font-semibold">{r.title}</span>
                <span className="shrink-0 text-xs text-muted">
                  {r.d30} jobs / 30d{r.salary ? ` · ৳${Math.round(r.salary).toLocaleString("en-IN")}` : ""}
                </span>
              </Link>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-muted">No job title like that in the last 30 days.</div>
          )}
        </div>
      )}
    </div>
  );
}
