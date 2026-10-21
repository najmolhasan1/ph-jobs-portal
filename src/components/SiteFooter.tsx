import Link from "next/link";
import { Logo } from "./SiteHeader";

const COLUMNS: { title: string; links: { href: string; label: string; external?: boolean }[] }[] = [
  {
    title: "Explore",
    links: [
      { href: "/", label: "Home" },
      { href: "/#jobs", label: "Find Job" },
      { href: "/careers", label: "Career Insights" },
    ],
  },
  {
    title: "Career paths",
    links: [
      { href: "/careers/it", label: "IT & Software" },
      { href: "/careers/govt", label: "Government Jobs" },
      { href: "/careers/banking", label: "Banks & Finance" },
      { href: "/careers/bcs", label: "BCS (Civil Service)" },
      { href: "/careers/creative", label: "Digital Marketing & Creative" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/signup", label: "Sign up" },
      { href: "/login", label: "Log in" },
    ],
  },
  {
    title: "Programming Hero",
    links: [{ href: "https://www.programming-hero.com", label: "programming-hero.com", external: true }],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Internships, fresher and experienced roles in Bangladesh and with remote teams — plus real numbers on which careers are hiring,
              all matched to the skills you build at Programming Hero.
            </p>
            <Link
              href="/#jobs"
              className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand px-4 text-sm font-bold text-white shadow-[0_6px_18px_-6px_rgb(123_63_228/0.7)] transition hover:bg-brand-hover"
            >
              Start browsing <span aria-hidden>→</span>
            </Link>
          </div>
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-faint">{col.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    {l.external ? (
                      <a href={l.href} target="_blank" rel="noreferrer" className="text-sm font-medium text-muted transition hover:text-brand-text">
                        {l.label} <span aria-hidden>↗</span>
                      </a>
                    ) : (
                      <Link href={l.href} className="text-sm font-medium text-muted transition hover:text-brand-text">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© {new Date().getFullYear()} Programming Hero Career Radar. All rights reserved.</span>
          <span>Jobs collected from BDJobs, LinkedIn, Teletalk, official circulars and more — always apply on the employer&apos;s own page.</span>
        </div>
      </div>
    </footer>
  );
}
