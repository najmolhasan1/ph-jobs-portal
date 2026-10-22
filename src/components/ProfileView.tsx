"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, BookmarkIcon, BriefcaseIcon, ClockIcon, PinIcon } from "./icons";
import { CompanyAvatar, SourceBadge } from "./JobCard";
import { experienceLabel, jobTypeLabel, timeAgo } from "@/lib/format";
import type { JobDTO } from "@/lib/jobs-query";

export interface ActivityJobItem {
  job: JobDTO;
  timestamp: string;
}

interface ProfileViewProps {
  user: {
    id: string;
    name: string;
    email: string;
    createdAt?: string;
  };
  initialSaved: ActivityJobItem[];
  initialApplied: ActivityJobItem[];
  initialViewed: ActivityJobItem[];
}

export function ProfileView({
  user,
  initialSaved,
  initialApplied,
  initialViewed,
}: ProfileViewProps) {
  const [activeTab, setActiveTab] = useState<"saved" | "applied" | "viewed">("saved");
  const [savedList, setSavedList] = useState<ActivityJobItem[]>(initialSaved);
  const [appliedList] = useState<ActivityJobItem[]>(initialApplied);
  const [viewedList] = useState<ActivityJobItem[]>(initialViewed);

  const handleUnsave = async (jobId: string) => {
    setSavedList((prev) => prev.filter((item) => item.job.id !== jobId));
    try {
      await fetch("/api/user/saved-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, action: "unsave" }),
      });
    } catch {
      // ignore
    }
  };

  const currentItems =
    activeTab === "saved"
      ? savedList
      : activeTab === "applied"
      ? appliedList
      : viewedList;

  const tabLabels = {
    saved: `Saved Jobs (${savedList.length})`,
    applied: `Applied Jobs (${appliedList.length})`,
    viewed: `Viewed History (${viewedList.length})`,
  };

  return (
    <div className="py-6 sm:py-10">
      {/* Profile Header */}
      <div className="rounded-3xl border border-line bg-surface p-6 shadow-card sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span
              className="grid size-14 place-items-center rounded-2xl bg-brand text-2xl font-black text-white uppercase shadow-md shadow-brand/20 sm:size-16"
              aria-hidden
            >
              {user.name.charAt(0)}
            </span>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
                {user.name}
              </h1>
              <p className="text-sm font-medium text-muted">{user.email}</p>
              {user.createdAt && (
                <p className="mt-1 text-xs text-faint">
                  Member since {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
            <span className="rounded-xl border border-line bg-surface-2 px-3 py-1.5 text-xs font-bold text-muted">
              {savedList.length} Saved
            </span>
            <span className="rounded-xl border border-line bg-surface-2 px-3 py-1.5 text-xs font-bold text-muted">
              {appliedList.length} Applied
            </span>
            <span className="rounded-xl border border-line bg-surface-2 px-3 py-1.5 text-xs font-bold text-muted">
              {viewedList.length} Viewed
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mt-8 flex gap-2 border-b border-line pb-px overflow-x-auto">
        {(["saved", "applied", "viewed"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`cursor-pointer whitespace-nowrap rounded-t-xl px-4 py-2.5 text-sm font-bold transition border-b-2 -mb-px ${
              activeTab === tab
                ? "border-brand text-brand bg-brand-soft/50"
                : "border-transparent text-muted hover:text-ink hover:bg-surface-2"
            }`}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {currentItems.length === 0 ? (
          <div className="rounded-3xl border border-line bg-surface p-12 text-center shadow-card">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-surface-2 text-2xl">
              {activeTab === "saved" ? "🔖" : activeTab === "applied" ? "🚀" : "👁️"}
            </span>
            <h3 className="mt-4 text-lg font-bold text-ink">
              {activeTab === "saved"
                ? "No saved jobs yet"
                : activeTab === "applied"
                ? "No job applications recorded yet"
                : "No viewed jobs yet"}
            </h3>
            <p className="mt-1 text-sm text-muted max-w-sm mx-auto">
              {activeTab === "saved"
                ? "Bookmark jobs you find interesting to easily review or apply to them later."
                : activeTab === "applied"
                ? "Click the 'Apply' button on any job listing to record it here automatically."
                : "Explore opportunities on the portal to see your browsing history."}
            </p>
            <Link
              href="/#jobs"
              className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-md shadow-brand/20 transition hover:bg-brand-hover"
            >
              Browse Jobs
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {currentItems.map(({ job, timestamp }) => {
              const experience = experienceLabel(job.experience, job.level);
              const type = jobTypeLabel(job.jobType);
              const source = job.sources?.[0]?.source;

              return (
                <div
                  key={`${job.id}-${timestamp}`}
                  className="flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-card-hover"
                >
                  <div className="flex items-start gap-3">
                    <CompanyAvatar name={job.company} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">
                        {job.company || "Company not listed"}
                      </p>
                      {source && <p className="mt-0.5"><SourceBadge source={source} /></p>}
                    </div>

                    {activeTab === "saved" && (
                      <button
                        type="button"
                        onClick={() => handleUnsave(job.id)}
                        className="cursor-pointer text-brand hover:text-danger p-1 rounded-lg transition"
                        title="Remove from saved"
                      >
                        <BookmarkIcon filled className="size-4" />
                      </button>
                    )}
                  </div>

                  <h3 className="mt-3 text-base font-bold text-ink line-clamp-2">
                    <Link href={`/jobs/${job.id}`} className="hover:text-brand hover:underline">
                      {job.title}
                    </Link>
                  </h3>

                  <div className="mt-2.5 space-y-1 text-xs text-muted">
                    <p className="flex items-center gap-1.5">
                      <PinIcon className="size-3.5 shrink-0 text-faint" />
                      <span className="truncate">{job.location || (job.isRemote ? "Remote" : "Location not stated")}</span>
                    </p>
                    {(experience || type) && (
                      <p className="flex items-center gap-1.5">
                        <BriefcaseIcon className="size-3.5 shrink-0 text-faint" />
                        <span>{[experience, type].filter(Boolean).join(" · ")}</span>
                      </p>
                    )}
                  </div>

                  {job.salary && (
                    <p className="mt-3 text-xs font-bold text-ink">
                      {job.salary}
                    </p>
                  )}

                  <div className="mt-auto pt-4 flex items-center justify-between border-t border-line text-xs">
                    <span className="flex items-center gap-1 text-faint">
                      <ClockIcon className="size-3.5" />
                      {activeTab === "saved"
                        ? `Saved ${timeAgo(timestamp)}`
                        : activeTab === "applied"
                        ? `Applied ${timeAgo(timestamp)}`
                        : `Viewed ${timeAgo(timestamp)}`}
                    </span>
                    <Link
                      href={`/jobs/${job.id}`}
                      className="inline-flex items-center gap-0.5 font-bold text-brand hover:underline"
                    >
                      View <ArrowUpRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
