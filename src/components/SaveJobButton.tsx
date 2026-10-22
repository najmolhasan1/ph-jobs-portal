"use client";

import { useEffect, useState } from "react";
import { BookmarkIcon } from "./icons";

export function SaveJobButton({ jobId }: { jobId: string }) {
  const [saved, setSaved] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/user/saved-jobs")
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data?.jobIds) {
          setIsLoggedIn(true);
          setSaved(data.jobIds.includes(jobId));
        } else {
          setIsLoggedIn(false);
        }
      })
      .catch(() => {
        setIsLoggedIn(false);
      });
  }, [jobId]);

  const handleToggle = async () => {
    if (isLoggedIn === false) {
      const currentUrl = typeof window !== "undefined" ? window.location.pathname : `/jobs/${jobId}`;
      window.location.href = `/login?${new URLSearchParams({
        redirect: currentUrl,
        saveJob: jobId,
      }).toString()}`;
      return;
    }

    setLoading(true);
    const prevSaved = saved;
    setSaved(!prevSaved);

    try {
      const res = await fetch("/api/user/saved-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, action: "toggle" }),
      });
      const data = await res.json();
      if (data?.ok) {
        setSaved(Boolean(data.saved));
      } else {
        setSaved(prevSaved);
      }
    } catch {
      setSaved(prevSaved);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      aria-pressed={saved}
      className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
        saved
          ? "border-brand bg-brand-soft text-brand-text hover:bg-brand-soft/80"
          : "border-line bg-surface text-muted hover:border-brand/40 hover:text-ink"
      }`}
    >
      <BookmarkIcon filled={saved} className="size-4 text-brand" />
      <span>{saved ? "Saved" : "Save Job"}</span>
    </button>
  );
}
