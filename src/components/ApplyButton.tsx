"use client";

import { useState } from "react";
import { ArrowUpRight } from "./icons";

interface ApplyButtonProps {
  jobId: string;
  applyUrl: string;
  sourceName?: string;
}

export function ApplyButton({ jobId, applyUrl, sourceName }: ApplyButtonProps) {
  const [clicked, setClicked] = useState(false);

  const handleClick = () => {
    setClicked(true);
    try {
      fetch("/api/user/applied-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      }).catch(() => {});
    } catch {
      // ignore
    }
  };

  return (
    <a
      href={applyUrl}
      target="_blank"
      rel="noopener noreferrer nofollow"
      onClick={handleClick}
      className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgb(123_63_228/0.3)] transition hover:bg-brand-hover"
    >
      <span>Apply on {sourceName || "original source"}</span>
      <ArrowUpRight className="size-4" />
      {clicked && (
        <span className="ml-1 rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
          Recorded
        </span>
      )}
    </a>
  );
}
