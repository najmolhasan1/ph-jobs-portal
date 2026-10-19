"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Programming Hero Career Radar — home">
      <span className="grid size-9 place-items-center rounded-xl bg-brand text-white shadow-[0_4px_12px_rgb(123_63_228/0.35)]">
        {/* radar mark */}
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" opacity="0.55" />
          <circle cx="12" cy="12" r="5" opacity="0.8" />
          <path d="M12 12l6-6" />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      </span>
      <span className="leading-none">
        <span className="block text-[15px] font-extrabold tracking-tight">
          Programming<span className="text-brand">Hero</span>
        </span>
        <span className="mt-1 block text-[9.5px] font-semibold tracking-[0.28em] text-faint">CAREER RADAR</span>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const path = usePathname();
  const onJobs = path === "/" || path.startsWith("/jobs");
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm font-semibold sm:flex">
            <Link
              href="/"
              className={`relative py-5 ${onJobs ? "text-brand after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-brand" : "text-muted hover:text-ink"}`}
            >
              Find a job
            </Link>
            <Link href="/admin" className={`inline-flex items-center gap-1 ${path.startsWith("/admin") ? "text-brand" : "text-muted hover:text-ink"}`}>
              For the career team
              <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 11l6-6M6 5h5v5" /></svg>
            </Link>
          </nav>
        </div>
        <p className="hidden items-center gap-1.5 text-xs font-medium text-muted md:flex">
          Your next chapter starts here
          <svg viewBox="0 0 16 16" className="size-3.5 text-brand" fill="currentColor"><path d="M8 0l1.8 6.2L16 8l-6.2 1.8L8 16l-1.8-6.2L0 8l6.2-1.8z" /></svg>
        </p>
        <Link href="/admin" className="text-xs font-semibold text-muted sm:hidden">Team ↗</Link>
      </div>
    </header>
  );
}
