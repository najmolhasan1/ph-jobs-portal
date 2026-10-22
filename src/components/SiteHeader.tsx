"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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

const LINKS = [
  { href: "/", label: "Home", match: (p: string) => p === "/" },
  { href: "/#jobs", label: "Find Job", match: (p: string) => p.startsWith("/jobs") },
  { href: "/careers", label: "Career Insights", match: (p: string) => p.startsWith("/careers") },
];

function NavLink({ href, active, children, onClick }: { href: string; active: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`inline-flex items-center whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
        active ? "bg-brand-soft text-brand-text" : "text-muted hover:bg-surface-2 hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

export function SiteHeader() {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  // Hidden while scrolling down (more room to read), back as soon as the visitor scrolls up.
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const lastY = useRef(0);

  useEffect(() => {
    let active = true;
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (active) {
          setUser(data.user || null);
        }
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setUserLoading(false);
      }
    };
    fetchUser();
    return () => {
      active = false;
    };
  }, [path]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      window.location.href = "/";
    } catch {
      window.location.reload();
    }
  };

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      const delta = y - lastY.current;
      if (Math.abs(delta) > 6) {
        setHidden(delta > 0 && y > 120);
        lastY.current = y;
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu on navigation.
  useEffect(() => setMenuOpen(false), [path]);

  const isHidden = hidden && !menuOpen;

  return (
    <header
      className={`sticky top-0 z-30 px-3 pt-3 transition-transform duration-300 ease-out sm:px-4 ${isHidden ? "-translate-y-[calc(100%+12px)]" : "translate-y-0"}`}
    >
      <div
        className={`mx-auto max-w-6xl rounded-2xl border px-3 transition-[background-color,border-color,box-shadow] duration-300 sm:px-4 ${
          scrolled || menuOpen
            ? "border-line bg-surface/85 shadow-[0_10px_40px_-12px_rgb(25_22_36/0.25)] backdrop-blur-xl"
            : "border-transparent bg-surface/40 backdrop-blur-md"
        }`}
      >
        <div className="flex h-14 items-center justify-between gap-3">
          <div className="flex items-center gap-6">
            <Logo />
            <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
              {LINKS.map((l) => (
                <NavLink key={l.href} href={l.href} active={l.match(path)}>
                  {l.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/profile"
                  className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 shadow-xs transition ${
                    path === "/profile"
                      ? "border-brand bg-brand-soft text-brand-text"
                      : "border-line bg-surface-2 text-ink hover:border-brand/40"
                  }`}
                  title="View your saved jobs & profile"
                >
                  <span className="grid size-6 place-items-center rounded-lg bg-brand text-[11px] font-bold text-white uppercase">
                    {user.name.charAt(0)}
                  </span>
                  <span className="text-xs font-bold max-w-[100px] truncate sm:max-w-[140px]">
                    {user.name}
                  </span>
                  <span className="hidden text-[10px] font-semibold text-muted sm:inline">
                    · Profile
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex h-9 items-center rounded-xl px-2.5 sm:px-3 text-xs font-bold text-muted transition hover:bg-danger-soft hover:text-danger cursor-pointer"
                >
                  Log out
                </button>
              </div>
            ) : userLoading ? (
              <div className="h-9 w-20 animate-pulse rounded-xl bg-surface-2" />
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden h-9 items-center rounded-xl px-3.5 text-sm font-bold text-ink transition hover:bg-surface-2 sm:inline-flex"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex h-9 items-center whitespace-nowrap rounded-xl bg-brand px-3.5 text-xs font-bold text-white shadow-[0_6px_18px_-6px_rgb(123_63_228/0.7)] transition hover:bg-brand-hover sm:text-sm"
                >
                  Sign up
                </Link>
              </>
            )}
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="grid size-9 place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-ink md:hidden"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav id="mobile-menu" aria-label="Main" className="flex flex-col gap-1 border-t border-line py-3 md:hidden">
            {LINKS.map((l) => (
              <NavLink key={l.href} href={l.href} active={l.match(path)} onClick={() => setMenuOpen(false)}>
                {l.label}
              </NavLink>
            ))}
            {user ? (
              <div className="flex flex-col gap-2 border-t border-line pt-3 mt-1 px-1">
                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between rounded-xl bg-surface-2 p-2 hover:bg-brand-soft/50 transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="grid size-7 place-items-center rounded-lg bg-brand text-xs font-bold text-white uppercase">
                      {user.name.charAt(0)}
                    </span>
                    <div className="leading-tight">
                      <p className="text-xs font-bold text-ink">{user.name}</p>
                      <p className="text-[10px] text-faint">{user.email}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-brand">Profile & Saved →</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    handleLogout();
                  }}
                  className="self-end rounded-lg px-2.5 py-1 text-xs font-bold text-danger hover:bg-danger-soft transition cursor-pointer"
                >
                  Log out
                </button>
              </div>
            ) : (
              <>
                <NavLink href="/login" active={path === "/login"} onClick={() => setMenuOpen(false)}>
                  Log in
                </NavLink>
                <NavLink href="/signup" active={path === "/signup"} onClick={() => setMenuOpen(false)}>
                  Sign up
                </NavLink>
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
