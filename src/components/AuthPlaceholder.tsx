import Link from "next/link";

/** Log in / sign up page shell — student accounts aren't live yet, so it says so plainly. */
export function AuthPlaceholder({ mode }: { mode: "login" | "signup" }) {
  const isLogin = mode === "login";
  return (
    <div className="mx-auto max-w-md pt-12 sm:pt-20">
      <div className="rounded-3xl border border-line bg-surface p-7 text-center shadow-card sm:p-9">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand-soft text-2xl" aria-hidden>
          {isLogin ? "🔐" : "🚀"}
        </span>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{isLogin ? "Log in to Career Radar" : "Create your Career Radar account"}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Student accounts are coming soon — you&apos;ll be able to save jobs across devices and get alerts for new openings that match your
          skills. Until then, every job and career insight is open to everyone, no account needed.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/#jobs" className="inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-bold text-white transition hover:bg-brand-hover">
            Browse jobs
          </Link>
          <Link
            href="/careers"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-line-strong px-5 text-sm font-bold transition hover:border-brand/50"
          >
            Career Insights
          </Link>
        </div>
        <p className="mt-6 text-xs text-faint">
          {isLogin ? "New here? " : "Already have an account? "}
          <Link href={isLogin ? "/signup" : "/login"} className="font-semibold text-brand-text hover:underline">
            {isLogin ? "Sign up" : "Log in"}
          </Link>
        </p>
      </div>
    </div>
  );
}
