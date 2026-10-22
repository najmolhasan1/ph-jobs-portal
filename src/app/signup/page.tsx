"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";

function SignupForm() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";
  const saveJob = searchParams.get("saveJob") || "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password, saveJob }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to create account. Please try again.");
          return;
        }

        window.location.href = redirectUrl;
      } catch {
        setError("Network error. Please check your connection and try again.");
      }
    });
  };

  return (
    <div className="mx-auto max-w-md pt-10 sm:pt-16">
      <div className="rounded-3xl border border-line bg-surface p-7 shadow-card sm:p-9">
        <div className="text-center">
          <span
            className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand-soft text-2xl"
            aria-hidden
          >
            🚀
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink">
            {saveJob ? "Sign up to save this job" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {saveJob
              ? "Create an account to keep this job and track applications across devices."
              : "Join Career Radar to discover tech opportunities and stay ahead in your career."}
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-danger/30 bg-danger-soft p-3.5 text-sm text-danger flex items-start gap-2.5">
            <svg
              className="size-5 shrink-0 text-danger mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5"
            >
              Full Name
            </label>
            <input
              id="name"
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Najmol Hasan"
              className="w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink placeholder:text-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink placeholder:text-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 pr-10 text-sm text-ink placeholder:text-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-muted transition text-xs font-semibold"
                tabIndex={-1}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full mt-2 inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-[0_6px_18px_-6px_rgb(123_63_228/0.7)] transition hover:bg-brand-hover disabled:opacity-60 cursor-pointer"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <svg
                  className="size-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Creating account...
              </span>
            ) : (
              "Sign Up"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-faint">
          Already have an account?{" "}
          <Link
            href={`/login${
              redirectUrl !== "/" || saveJob
                ? `?${new URLSearchParams({
                    ...(redirectUrl !== "/" ? { redirect: redirectUrl } : {}),
                    ...(saveJob ? { saveJob } : {}),
                  }).toString()}`
                : ""
            }`}
            className="font-semibold text-brand-text hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md pt-20 text-center text-muted">Loading...</div>}>
      <SignupForm />
    </Suspense>
  );
}
