"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2.5" aria-label="Programming Hero Career Radar — home">
      <span className="relative grid size-9 place-items-center rounded-xl bg-linear-to-br from-brand to-[#b057f0] text-white shadow-[0_6px_18px_-4px_rgb(123_63_228/0.6)] transition group-hover:scale-105">
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

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
        active ? "bg-brand-soft text-brand-text" : "text-muted hover:bg-surface-2 hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

export function SiteHeader() {
  const path = usePathname();
  const onJobs = path === "/" || path.startsWith("/jobs");
  const onAdmin = path.startsWith("/admin");
  // A floating bar that gains a shadow once the page scrolls under it.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-30 px-3 pt-3 sm:px-4">
      <div
        className={`mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-2xl border px-3 transition-all duration-300 sm:px-4 ${
          scrolled
            ? "border-line bg-surface/80 shadow-[0_10px_40px_-12px_rgb(25_22_36/0.25)] backdrop-blur-xl"
            : "border-transparent bg-surface/40 backdrop-blur-md"
        }`}
      >
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
            <NavLink href="/" active={onJobs}>Find a job</NavLink>
            <NavLink href="/admin" active={onAdmin}>
              Career team
              <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M5 11l6-6M6 5h5v5" />
              </svg>
            </NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-muted md:inline-flex">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-ok/60" />
              <span className="relative inline-flex size-2 rounded-full bg-ok" />
            </span>
            Live updates
          </span>
          <Link
            href="/#jobs"
            className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-xl bg-brand px-3.5 text-xs font-bold text-white shadow-[0_6px_18px_-6px_rgb(123_63_228/0.7)] transition hover:bg-brand-hover sm:text-sm"
          >
            <span className="sm:hidden">Jobs</span>
            <span className="hidden sm:inline">Browse jobs</span> <span aria-hidden>→</span>
          </Link>
          <Link href="/admin" className="text-xs font-semibold text-muted hover:text-ink sm:hidden" aria-label="Career team">
            Team
          </Link>
        </div>
      </div>
    </header>
  );
}
