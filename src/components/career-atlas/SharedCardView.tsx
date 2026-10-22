"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { AtlasCardRender } from "./AtlasCardRender";
import type { AtlasCardDraft } from "@/lib/career-atlas/types";

interface SharedCardViewProps {
  opaqueId: string;
  draft: AtlasCardDraft;
  isOwner: boolean;
  status: string;
}

export function SharedCardView({ opaqueId, draft, isOwner, status }: SharedCardViewProps) {
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState("inappropriate");
  const [reportNotes, setReportNotes] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [revoked, setRevoked] = useState(status === "revoked");

  const cardRef = useRef<HTMLDivElement>(null);

  if (revoked || status === "hidden") {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-surface-2 text-3xl">
          🔒
        </span>
        <h1 className="mt-4 text-2xl font-black text-ink">This card is no longer available</h1>
        <p className="mt-2 text-sm text-muted">
          The creator has unpublished this Career Atlas or it has been removed.
        </p>
        <Link
          href="/career-atlas/create"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-brand px-6 text-sm font-bold text-white shadow-md shadow-brand/20 transition hover:bg-brand-hover"
        >
          Create Your Own Career Atlas →
        </Link>
      </div>
    );
  }

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      await new Promise((r) => setTimeout(r, 100));
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 1,
        quality: 0.95,
      });
      const a = document.createElement("a");
      a.download = `career-atlas-${(draft.profile.displayName || "card")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")}.png`;
      a.href = dataUrl;
      a.click();
    } catch {
      alert("Failed to export image. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleRevoke = async () => {
    if (
      !confirm(
        "Are you sure you want to unpublish this card? The public link will immediately stop working."
      )
    ) {
      return;
    }
    setIsRevoking(true);
    try {
      const res = await fetch("/api/career-atlas/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opaqueId }),
      });
      if (res.ok) {
        setRevoked(true);
      } else {
        alert("Failed to revoke card.");
      }
    } catch {
      alert("Failed to revoke card.");
    } finally {
      setIsRevoking(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/career-atlas/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opaqueId,
          category: reportCategory,
          explanation: reportNotes,
        }),
      });
      setReportSuccess(true);
      setTimeout(() => {
        setReportModalOpen(false);
        setReportSuccess(false);
      }, 2000);
    } catch {
      alert("Failed to submit report.");
    }
  };

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <div className="py-8 sm:py-12">
      {/* Top Banner & Creator attribution */}
      <div className="mx-auto max-w-4xl flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-6">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-brand">
            Career Atlas Snapshot
          </span>
          <h1 className="text-2xl font-black text-ink sm:text-3xl">
            {draft.profile.displayName}&apos;s Professional Story
          </h1>
          <p className="mt-1 text-xs text-muted">
            Self-reported career map created on Programming Hero Career Radar.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Owner actions */}
          {isOwner && (
            <button
              type="button"
              onClick={handleRevoke}
              disabled={isRevoking}
              className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-1.5 text-xs font-bold text-danger hover:bg-danger/10 transition cursor-pointer"
            >
              {isRevoking ? "Unpublishing..." : "Unpublish Card"}
            </button>
          )}

          {/* Copy link */}
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(shareUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-bold text-ink hover:border-brand/40 transition cursor-pointer"
          >
            {copied ? "Link Copied!" : "Copy Link"}
          </button>

          {/* Download button */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={isExporting}
            className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-bold text-ink hover:border-brand/40 transition cursor-pointer"
          >
            {isExporting ? "Rendering..." : "Download PNG"}
          </button>

          {/* Remix / Make your own */}
          <Link
            href={`/career-atlas/create?story=${draft.storyType}&theme=${draft.design.theme}`}
            className="inline-flex items-center rounded-xl bg-brand px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand-hover transition"
          >
            Make Your Career Map →
          </Link>
        </div>
      </div>

      {/* Rendered Card in Center */}
      <div className="my-8 flex justify-center">
        <div
          style={{
            maxWidth: "100%",
            width: "540px",
            height: `${
              draft.design.aspectRatio === "portrait"
                ? 675
                : draft.design.aspectRatio === "square"
                ? 540
                : 960
            }px`,
            position: "relative",
            overflow: "hidden",
            borderRadius: "1.5rem",
            boxShadow: "0 25px 60px -15px rgba(0,0,0,0.35)",
          }}
          className="border border-line"
        >
          <AtlasCardRender
            ref={cardRef}
            draft={draft}
            scale={540 / 1080}
          />
        </div>
      </div>

      {/* Accessible Text Transcript Summary */}
      <div className="mx-auto max-w-2xl rounded-2xl border border-line bg-surface p-6 text-sm space-y-4">
        <h2 className="text-base font-bold text-ink">Text Summary for Accessibility</h2>
        <div className="space-y-2 text-xs leading-relaxed text-muted">
          <p>
            <strong className="text-ink">Name:</strong> {draft.profile.displayName}
          </p>
          {draft.profile.currentRole && (
            <p>
              <strong className="text-ink">Role:</strong> {draft.profile.currentRole}
            </p>
          )}
          {draft.profile.headline && (
            <p>
              <strong className="text-ink">Headline:</strong> {draft.profile.headline}
            </p>
          )}
          {draft.storyType === "journey" && (
            <div>
              <strong className="text-ink">Career Timeline:</strong>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                {draft.milestones.map((m, i) => (
                  <li key={i}>
                    {m.startYear}: {m.title} {m.organization ? `at ${m.organization}` : ""}
                    {m.note ? ` — "${m.note}"` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {draft.storyType === "footprint" && (
            <div>
              <strong className="text-ink">Geographic Footprint:</strong>{" "}
              {draft.footprint.locations.map((l) => l.displayLabel).join(", ")}
            </div>
          )}
          {draft.storyType === "memory" && (
            <div>
              <strong className="text-ink">Milestone Memory:</strong> {draft.memory.title} (Year:{" "}
              {draft.memory.year})
              {draft.memory.note && <p className="mt-1 italic">&ldquo;{draft.memory.note}&rdquo;</p>}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-line pt-3 text-xs">
          <span className="text-faint">Reported by user · Self-narrated</span>
          <button
            type="button"
            onClick={() => setReportModalOpen(true)}
            className="text-faint hover:text-danger hover:underline cursor-pointer"
          >
            Report card
          </button>
        </div>
      </div>

      {/* Report Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-ink">Report this Career Atlas</h3>
            <p className="mt-1 text-xs text-muted">
              Help us maintain a safe community by reporting abuse or impersonation.
            </p>

            {reportSuccess ? (
              <p className="mt-4 rounded-xl bg-ok-soft p-3 text-xs font-bold text-ok">
                Thank you. Your report has been submitted for moderation.
              </p>
            ) : (
              <form onSubmit={handleReportSubmit} className="mt-4 space-y-3">
                <div>
                  <label className="text-xs font-bold text-muted">Reason</label>
                  <select
                    value={reportCategory}
                    onChange={(e) => setReportCategory(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink"
                  >
                    <option value="impersonation">Impersonation / Fake identity</option>
                    <option value="abusive">Abusive or offensive content</option>
                    <option value="personal_info">Private personal information</option>
                    <option value="other">Other issue</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-muted">Optional details</label>
                  <textarea
                    rows={3}
                    value={reportNotes}
                    onChange={(e) => setReportNotes(e.target.value)}
                    placeholder="Provide any additional context..."
                    className="mt-1 w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(false)}
                    className="rounded-xl px-4 py-2 text-xs font-bold text-muted hover:bg-surface-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-danger px-4 py-2 text-xs font-bold text-white hover:bg-danger/90"
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
