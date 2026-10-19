"use client";

import Link from "next/link";
import type { JobDTO } from "@/lib/jobs-query";
import { avatarTone, experienceLabel, jobTypeLabel, SOURCE_LABELS, timeAgo } from "@/lib/format";
import { TRACK_META, type TrackKey } from "@/lib/tracks";
import { ArrowUpRight, BookmarkIcon, BriefcaseIcon, ClockIcon, PinIcon } from "./icons";

export function SourceBadge({ source }: { source: string }) {
  return (
    <span className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold text-muted">
      {SOURCE_LABELS[source] ?? source}
    </span>
  );
}

export function CompanyAvatar({ name, size = "md" }: { name?: string; size?: "md" | "lg" }) {
  const letter = (name ?? "?").replace(/^via\s+/i, "").trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-xl font-bold ${avatarTone(name)} ${size === "lg" ? "size-14 text-2xl" : "size-12 text-xl"}`}
      aria-hidden
    >
      {letter}
    </span>
  );
}

const dot = <span className="text-faint" aria-hidden>·</span>;

export function JobCard({
  job,
  isNew,
  saved,
  onToggleSave,
}: {
  job: JobDTO;
  isNew?: boolean;
  saved?: boolean;
  onToggleSave?: (id: string) => void;
}) {
  const source = job.sources[0]?.source;
  const track = job.tracks?.[0] as TrackKey | undefined;
  const experience = experienceLabel(job.experience, job.level);
  const type = jobTypeLabel(job.jobType);
  const href = `/jobs/${job.id}`;

  return (
    <article
      className={`group relative flex min-w-0 flex-col rounded-2xl border border-line bg-surface p-5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-card-hover sm:p-6 ${isNew ? "animate-new ring-2 ring-brand/30" : ""}`}
    >
      <div className="flex items-start gap-3.5">
        <CompanyAvatar name={job.company} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold">{job.company ?? "Company not listed"}</p>
          <p className="mt-0.5 truncate text-xs text-faint">
            {SOURCE_LABELS[source] ?? source}
            {track && <> · {TRACK_META[track]?.tag}</>}
          </p>
        </div>
        {isNew && <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-white">New</span>}
        {onToggleSave && (
          <button
            type="button"
            onClick={() => onToggleSave(job.id)}
            className={`relative z-10 -m-1.5 rounded-lg p-1.5 transition ${saved ? "text-brand" : "text-faint hover:bg-surface-2 hover:text-ink"}`}
            aria-label={saved ? "Remove from saved jobs" : "Save job"}
            aria-pressed={saved}
          >
            <BookmarkIcon filled={saved} />
          </button>
        )}
      </div>

      <h3 className="mt-4 break-words text-lg font-bold leading-snug tracking-tight">
        <Link href={href} className="outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:underline">
          {job.title}
        </Link>
      </h3>

      <div className="mt-3 space-y-1.5 text-sm text-muted">
        <p className="flex min-w-0 items-center gap-2">
          <PinIcon className="size-4 shrink-0 text-faint" />
          <span className="truncate">{job.location ?? (job.isRemote ? "Anywhere" : "Location not stated")}</span>
          {(job.isRemote || job.location) && (
            <>
              {dot}
              <span className={job.isRemote ? "font-semibold text-ok" : ""}>{job.isRemote ? "Remote" : "Onsite"}</span>
            </>
          )}
        </p>
        {(experience || type) && (
          <p className="flex items-center gap-2">
            <BriefcaseIcon className="size-4 shrink-0 text-faint" />
            {experience && <span>{experience}</span>}
            {experience && type && dot}
            {type && <span>{type}</span>}
          </p>
        )}
      </div>

      {job.skills.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {job.skills.slice(0, 4).map((s) => (
            <span key={s} className="rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">
              {s}
            </span>
          ))}
          {job.skills.length > 4 && <span className="px-1 py-1 text-xs text-faint">+{job.skills.length - 4}</span>}
        </div>
      )}

      <p className={`mt-4 text-sm font-bold ${job.salary ? "text-ink" : "text-muted"}`}>{job.salary ?? "Salary not disclosed"}</p>

      <div className="mt-auto pt-4">
        <div className="flex items-center justify-between border-t border-line pt-4 text-sm">
          <span className="flex items-center gap-1.5 text-xs text-faint" title={job.postedAt} suppressHydrationWarning>
            <ClockIcon className="size-4" />
            {timeAgo(job.postedAt)}
          </span>
          <span className="flex items-center gap-1 font-bold text-brand transition-all group-hover:gap-1.5">
            View job <ArrowUpRight className="size-4" />
          </span>
        </div>
      </div>
    </article>
  );
}
