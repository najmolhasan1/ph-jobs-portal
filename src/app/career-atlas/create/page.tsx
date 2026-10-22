"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { AtlasCardRender } from "@/components/career-atlas/AtlasCardRender";
import { createInitialDraft } from "@/lib/career-atlas/defaults";
import { getEligibleBadges } from "@/lib/career-atlas/badges";
import { BD_DISTRICTS, PROFESSION_PRESETS, WORLD_COUNTRIES } from "@/lib/career-atlas/geo-data";
import type { AspectRatio, AtlasCardDraft, MilestoneKind, ProfessionType, StoryType, ThemeType } from "@/lib/career-atlas/types";

const DRAFT_STORAGE_KEY = "ph-career-atlas-draft-v1";

export default function CareerAtlasBuilderPage() {
  const [draft, setDraft] = useState<AtlasCardDraft>(createInitialDraft);
  const [activeTab, setActiveTab] = useState<"story" | "details" | "identity" | "design">("story");
  const [isExporting, setIsExporting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishedData, setPublishedData] = useState<{ opaqueId: string; shareUrl: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.schemaVersion === 1) {
          setDraft(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Auto-save draft
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // ignore
    }
  }, [draft]);

  const updateDraft = (updater: (prev: AtlasCardDraft) => AtlasCardDraft) => {
    setDraft((prev) => updater(prev));
  };

  // Eligible badges
  const eligibleBadges = getEligibleBadges(draft);

  // PNG Export Handler
  const handleDownloadPng = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    setErrorMsg(null);

    try {
      // Small pause to ensure layout has settled
      await new Promise((r) => setTimeout(r, 100));

      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 1, // Render at exact 1080 width
        quality: 0.95,
      });

      const a = document.createElement("a");
      a.download = `career-atlas-${(draft.profile.displayName || "card")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")}-${draft.design.aspectRatio}.png`;
      a.href = dataUrl;
      a.click();
    } catch (err) {
      console.error("Download PNG failed:", err);
      setErrorMsg("Failed to generate image. Please try again or refresh.");
    } finally {
      setIsExporting(false);
    }
  };

  // Publish Handler
  const handleConfirmPublish = async () => {
    setIsPublishing(true);
    setErrorMsg(null);

    try {
      const payload = {
        storyType: draft.storyType,
        profession: draft.profile.profession,
        displayName: draft.profile.displayName,
        headline: draft.profile.headline,
        role: draft.profile.currentRole,
        avatarUrl: draft.profile.avatarDataUrl,
        theme: draft.design.theme,
        aspectRatio: draft.design.aspectRatio,
        publicPayload: draft,
      };

      const res = await fetch("/api/career-atlas/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to publish card");
      }

      setPublishedData(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong while publishing.";
      setErrorMsg(message);
    } finally {
      setIsPublishing(false);
    }
  };

  // Avatar Upload Handler
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image file size must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateDraft((d) => ({
        ...d,
        profile: { ...d.profile, avatarDataUrl: String(reader.result) },
      }));
    };
    reader.readAsDataURL(file);
  };

  // Memory Image Upload Handler
  const handleMemoryImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image file size must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateDraft((d) => ({
        ...d,
        memory: { ...d.memory, imageDataUrl: String(reader.result) },
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleClearDraft = () => {
    if (confirm("Are you sure you want to reset your Career Atlas draft to defaults?")) {
      const fresh = createInitialDraft();
      setDraft(fresh);
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {}
    }
  };

  // Social caption generator
  const generatedCaption = `${draft.profile.displayName}'s Career Atlas:
Role: ${draft.profile.currentRole || "Professional"}
${draft.profile.headline ? `"${draft.profile.headline}"` : ""}
Story: ${
    draft.storyType === "journey"
      ? `${draft.milestones.length} milestones traveled`
      : draft.storyType === "footprint"
      ? `Worked across ${draft.footprint.locations.length} global locations`
      : `Memory: ${draft.memory.title}`
  }

Created with Career Atlas on Programming Hero Career Radar.
#CareerAtlas #ProgrammingHero #CareerJourney`;

  return (
    <div className="py-6 sm:py-8">
      {/* Header bar */}
      <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/career-atlas" className="text-xs font-bold text-brand hover:underline">
              ← Career Atlas
            </Link>
            <span className="text-faint">/</span>
            <span className="text-xs font-semibold text-muted">Card Studio</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-ink sm:text-3xl">
            Create Your Career Atlas
          </h1>
          <p className="mt-1 text-xs text-muted flex items-center gap-2">
            <span className="inline-block size-2 rounded-full bg-ok" />
            <span>Saved on this device automatically</span>
            <span className="text-faint">·</span>
            <button
              type="button"
              onClick={handleClearDraft}
              className="text-faint hover:text-danger hover:underline cursor-pointer"
            >
              Reset draft
            </button>
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={isExporting}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-xs font-bold text-ink shadow-xs transition hover:border-brand/40 cursor-pointer disabled:opacity-60"
          >
            {isExporting ? (
              <span>Exporting...</span>
            ) : (
              <>
                <span>📥</span>
                <span>Download PNG</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setPublishModalOpen(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-xs font-bold text-white shadow-md shadow-brand/20 transition hover:bg-brand-hover cursor-pointer"
          >
            <span>🌐</span>
            <span>Publish & Share</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mt-4 rounded-xl bg-danger-soft p-3 text-xs font-medium text-danger">
          {errorMsg}
        </div>
      )}

      {/* Main Grid: Controls on Left, Preview on Right */}
      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[1fr_480px] xl:grid-cols-[1fr_540px]">
        {/* LEFT COLUMN: Controls Form */}
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="flex rounded-2xl border border-line bg-surface-2 p-1 text-xs font-bold">
            {(
              [
                { id: "story", label: "1. Story Type" },
                { id: "details", label: "2. Story Content" },
                { id: "identity", label: "3. Identity & Tools" },
                { id: "design", label: "4. Theme & Layout" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`flex-1 rounded-xl py-2 text-center transition cursor-pointer ${
                  activeTab === t.id
                    ? "bg-surface text-brand shadow-xs"
                    : "text-muted hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* TAB 1: STORY TYPE & PROFESSION */}
          {activeTab === "story" && (
            <div className="rounded-3xl border border-line bg-surface p-6 shadow-card space-y-6">
              <div>
                <h2 className="text-base font-extrabold text-ink">Choose Your Dominant Story</h2>
                <p className="mt-1 text-xs text-muted">
                  Each Career Atlas focuses on one primary narrative that best captures your journey.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    {
                      id: "journey",
                      title: "Career Journey",
                      icon: "🧭",
                      desc: "Timeline of milestone roles, switches and growth",
                    },
                    {
                      id: "footprint",
                      title: "Work Footprint",
                      icon: "🗺️",
                      desc: "Map of countries, districts, clients and reach",
                    },
                    {
                      id: "memory",
                      title: "Career Memory",
                      icon: "🌟",
                      desc: "One unforgettable project, photo or chapter",
                    },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        updateDraft((d) => ({ ...d, storyType: s.id as StoryType }))
                      }
                      className={`flex flex-col items-start rounded-2xl border p-4 text-left transition cursor-pointer ${
                        draft.storyType === s.id
                          ? "border-brand bg-brand-soft ring-2 ring-brand/30"
                          : "border-line bg-surface-2 hover:border-brand/40"
                      }`}
                    >
                      <span className="text-2xl">{s.icon}</span>
                      <span className="mt-2 text-sm font-bold text-ink">{s.title}</span>
                      <span className="mt-1 text-xs text-muted">{s.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Profession Selector */}
              <div className="border-t border-line pt-5">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
                  Your Profession
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {(
                    [
                      { id: "programmer", label: "Programmer / Coder" },
                      { id: "marketer", label: "Marketer / Growth" },
                      { id: "freelancer", label: "Freelancer / Consultant" },
                      { id: "hr", label: "HR / Corporate" },
                      { id: "student", label: "Student / Beginner" },
                      { id: "other", label: "Other Field" },
                    ] as const
                  ).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        updateDraft((d) => ({
                          ...d,
                          profile: { ...d.profile, profession: p.id as ProfessionType },
                        }))
                      }
                      className={`rounded-xl border px-3 py-2 text-xs font-bold text-left transition cursor-pointer ${
                        draft.profile.profession === p.id
                          ? "border-brand bg-brand-soft text-brand-text"
                          : "border-line bg-surface-2 text-muted hover:text-ink"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STORY DETAILS (JOURNEY / FOOTPRINT / MEMORY) */}
          {activeTab === "details" && (
            <div className="rounded-3xl border border-line bg-surface p-6 shadow-card space-y-6">
              {draft.storyType === "journey" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-extrabold text-ink">Career Milestones</h2>
                      <p className="text-xs text-muted">Add up to 8 key roles, transitions or education steps.</p>
                    </div>
                    {draft.milestones.length < 8 && (
                      <button
                        type="button"
                        onClick={() =>
                          updateDraft((d) => ({
                            ...d,
                            milestones: [
                              ...d.milestones,
                              {
                                id: `m_${Date.now()}`,
                                title: "New Milestone",
                                startYear: new Date().getFullYear(),
                                kind: "role_change",
                              },
                            ],
                          }))
                        }
                        className="rounded-xl bg-brand-soft px-3 py-1.5 text-xs font-bold text-brand hover:bg-brand-soft/80 cursor-pointer"
                      >
                        + Add Milestone
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {draft.milestones.map((m, idx) => (
                      <div
                        key={m.id || idx}
                        className="rounded-2xl border border-line bg-surface-2 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-brand">Milestone #{idx + 1}</span>
                          {draft.milestones.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                updateDraft((d) => ({
                                  ...d,
                                  milestones: d.milestones.filter((_, i) => i !== idx),
                                }))
                              }
                              className="text-xs font-bold text-danger hover:underline cursor-pointer"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-muted">Title / Role</label>
                            <input
                              type="text"
                              value={m.title}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateDraft((d) => ({
                                  ...d,
                                  milestones: d.milestones.map((item, i) =>
                                    i === idx ? { ...item, title: val } : item
                                  ),
                                }));
                              }}
                              className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-1.5 text-xs text-ink"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-muted">Company / Org (Optional)</label>
                            <input
                              type="text"
                              value={m.organization || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateDraft((d) => ({
                                  ...d,
                                  milestones: d.milestones.map((item, i) =>
                                    i === idx ? { ...item, organization: val } : item
                                  ),
                                }));
                              }}
                              className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-1.5 text-xs text-ink"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[11px] font-bold text-muted">Start Year</label>
                            <input
                              type="number"
                              value={m.startYear}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                updateDraft((d) => ({
                                  ...d,
                                  milestones: d.milestones.map((item, i) =>
                                    i === idx ? { ...item, startYear: val } : item
                                  ),
                                }));
                              }}
                              className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-1.5 text-xs text-ink"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-muted">End Year</label>
                            <input
                              type="number"
                              disabled={m.ongoing}
                              value={m.ongoing ? "" : m.endYear || ""}
                              placeholder={m.ongoing ? "Present" : "Year"}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                updateDraft((d) => ({
                                  ...d,
                                  milestones: d.milestones.map((item, i) =>
                                    i === idx ? { ...item, endYear: val } : item
                                  ),
                                }));
                              }}
                              className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-1.5 text-xs text-ink disabled:opacity-50"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-muted">Type</label>
                            <select
                              value={m.kind}
                              onChange={(e) => {
                                const val = e.target.value as MilestoneKind;
                                updateDraft((d) => ({
                                  ...d,
                                  milestones: d.milestones.map((item, i) =>
                                    i === idx ? { ...item, kind: val } : item
                                  ),
                                }));
                              }}
                              className="mt-1 w-full rounded-xl border border-line bg-surface px-2 py-1.5 text-xs text-ink"
                            >
                              <option value="first_role">First Role</option>
                              <option value="promotion">Promotion</option>
                              <option value="role_change">Role Change</option>
                              <option value="switch">Career Switch</option>
                              <option value="freelance">Freelance</option>
                              <option value="business">Business</option>
                              <option value="education">Education</option>
                              <option value="break">Career Break</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-muted">Short Note (Optional)</label>
                          <input
                            type="text"
                            maxLength={160}
                            value={m.note || ""}
                            placeholder="What you learned, built or achieved..."
                            onChange={(e) => {
                              const val = e.target.value;
                              updateDraft((d) => ({
                                ...d,
                                milestones: d.milestones.map((item, i) =>
                                  i === idx ? { ...item, note: val } : item
                                ),
                              }));
                            }}
                            className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-1.5 text-xs text-ink"
                          />
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-muted">
                          <input
                            type="checkbox"
                            checked={Boolean(m.ongoing)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              updateDraft((d) => ({
                                ...d,
                                milestones: d.milestones.map((item, i) =>
                                  i === idx ? { ...item, ongoing: checked } : item
                                ),
                              }));
                            }}
                            className="rounded text-brand"
                          />
                          <span>This is my current ongoing role</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {draft.storyType === "footprint" && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-base font-extrabold text-ink">Geographic Footprint Settings</h2>
                    <p className="text-xs text-muted">
                      Showcase your work across countries or Bangladesh districts.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-muted">Relationship Label</label>
                      <select
                        value={draft.footprint.relationship}
                        onChange={(e) => {
                          const val = e.target.value as "clients" | "teams" | "employers";
                          updateDraft((d) => ({
                            ...d,
                            footprint: { ...d.footprint, relationship: val },
                          }));
                        }}
                        className="mt-1 w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs font-bold text-ink"
                      >
                        <option value="clients">Clients Served</option>
                        <option value="teams">Teams Worked With</option>
                        <option value="employers">Employers Worked For</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-muted">Map Scope</label>
                      <select
                        value={draft.footprint.scope}
                        onChange={(e) => {
                          const val = e.target.value as "world" | "bangladesh";
                          updateDraft((d) => ({
                            ...d,
                            footprint: { ...d.footprint, scope: val },
                          }));
                        }}
                        className="mt-1 w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs font-bold text-ink"
                      >
                        <option value="world">World Map</option>
                        <option value="bangladesh">Bangladesh Map (64 Districts)</option>
                      </select>
                    </div>
                  </div>

                  {/* Add Locations */}
                  <div>
                    <label className="text-xs font-bold text-muted block mb-2">
                      Add {draft.footprint.scope === "world" ? "Countries" : "Districts"}
                    </label>

                    {draft.footprint.scope === "world" ? (
                      <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-2 border border-line rounded-2xl bg-surface-2">
                        {WORLD_COUNTRIES.map((c) => {
                          const isSelected = draft.footprint.locations.some(
                            (l) => l.countryCode === c.code
                          );
                          return (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => {
                                updateDraft((d) => {
                                  const exists = d.footprint.locations.some(
                                    (l) => l.countryCode === c.code
                                  );
                                  const nextLocs = exists
                                    ? d.footprint.locations.filter((l) => l.countryCode !== c.code)
                                    : [
                                        ...d.footprint.locations,
                                        {
                                          id: `loc_${c.code}`,
                                          relationship: d.footprint.relationship,
                                          type: "country" as const,
                                          countryCode: c.code,
                                          countryName: c.nameEn,
                                          displayLabel: c.nameEn,
                                        },
                                      ];
                                  return {
                                    ...d,
                                    footprint: { ...d.footprint, locations: nextLocs },
                                  };
                                });
                              }}
                              className={`rounded-xl px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                                isSelected
                                  ? "bg-brand text-white shadow-xs"
                                  : "bg-surface border border-line text-muted hover:text-ink"
                              }`}
                            >
                              {c.nameEn} {isSelected ? "✓" : "+"}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-2 border border-line rounded-2xl bg-surface-2">
                        {BD_DISTRICTS.map((dist) => {
                          const isSelected = draft.footprint.locations.some(
                            (l) => l.districtId === dist.id
                          );
                          return (
                            <button
                              key={dist.id}
                              type="button"
                              onClick={() => {
                                updateDraft((d) => {
                                  const exists = d.footprint.locations.some(
                                    (l) => l.districtId === dist.id
                                  );
                                  const nextLocs = exists
                                    ? d.footprint.locations.filter((l) => l.districtId !== dist.id)
                                    : [
                                        ...d.footprint.locations,
                                        {
                                          id: `dist_${dist.id}`,
                                          relationship: d.footprint.relationship,
                                          type: "district" as const,
                                          countryCode: "BD",
                                          countryName: "Bangladesh",
                                          districtId: dist.id,
                                          displayLabel: dist.nameEn,
                                        },
                                      ];
                                  return {
                                    ...d,
                                    footprint: { ...d.footprint, locations: nextLocs },
                                  };
                                });
                              }}
                              className={`rounded-xl px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                                isSelected
                                  ? "bg-brand text-white shadow-xs"
                                  : "bg-surface border border-line text-muted hover:text-ink"
                              }`}
                            >
                              {dist.nameEn} ({dist.nameBn}) {isSelected ? "✓" : "+"}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {draft.storyType === "memory" && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-base font-extrabold text-ink">Career Memory Story</h2>
                    <p className="text-xs text-muted">
                      Capture an important milestone, first gig, or breakthrough moment.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted">Memory Title</label>
                    <input
                      type="text"
                      maxLength={100}
                      value={draft.memory.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateDraft((d) => ({
                          ...d,
                          memory: { ...d.memory, title: val },
                        }));
                      }}
                      className="mt-1 w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2 text-sm text-ink"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted">Year of Occurrence</label>
                    <input
                      type="number"
                      value={draft.memory.year}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        updateDraft((d) => ({
                          ...d,
                          memory: { ...d.memory, year: val },
                        }));
                      }}
                      className="mt-1 w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2 text-sm text-ink"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted">Personal Reflection Note</label>
                    <textarea
                      rows={3}
                      maxLength={240}
                      value={draft.memory.note || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateDraft((d) => ({
                          ...d,
                          memory: { ...d.memory, note: val },
                        }));
                      }}
                      className="mt-1 w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2 text-sm text-ink"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-muted block mb-1">
                      Milestone Photo or Screenshot (Optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleMemoryImageUpload}
                      className="text-xs text-muted file:mr-3 file:rounded-xl file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-brand"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: IDENTITY & TOOLS */}
          {activeTab === "identity" && (
            <div className="rounded-3xl border border-line bg-surface p-6 shadow-card space-y-6">
              <div>
                <h2 className="text-base font-extrabold text-ink">Personal Identity</h2>
                <p className="text-xs text-muted">Your public persona on the Career Atlas card.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted">Display Name *</label>
                  <input
                    type="text"
                    required
                    maxLength={60}
                    value={draft.profile.displayName}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateDraft((d) => ({
                        ...d,
                        profile: { ...d.profile, displayName: val },
                      }));
                    }}
                    className="mt-1 w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2 text-sm text-ink font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-muted">Current Role / Title</label>
                  <input
                    type="text"
                    maxLength={80}
                    value={draft.profile.currentRole || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateDraft((d) => ({
                        ...d,
                        profile: { ...d.profile, currentRole: val },
                      }));
                    }}
                    className="mt-1 w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2 text-sm text-ink"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted">Personal Headline / Bio</label>
                <input
                  type="text"
                  maxLength={100}
                  value={draft.profile.headline || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateDraft((d) => ({
                      ...d,
                      profile: { ...d.profile, headline: val },
                    }));
                  }}
                  className="mt-1 w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2 text-sm text-ink"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted">Hometown District</label>
                  <select
                    value={draft.profile.hometownDistrict || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateDraft((d) => ({
                        ...d,
                        profile: { ...d.profile, hometownDistrict: val },
                      }));
                    }}
                    className="mt-1 w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs font-bold text-ink"
                  >
                    <option value="">Select District</option>
                    {BD_DISTRICTS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nameEn} ({d.nameBn})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-muted">Current Work Base</label>
                  <input
                    type="text"
                    placeholder="e.g. Dhaka, Bangladesh"
                    value={draft.profile.currentWorkBase || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateDraft((d) => ({
                        ...d,
                        profile: { ...d.profile, currentWorkBase: val },
                      }));
                    }}
                    className="mt-1 w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2 text-xs text-ink"
                  />
                </div>
              </div>

              {/* Avatar Upload */}
              <div>
                <label className="text-xs font-bold text-muted block mb-1">Avatar / Profile Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="text-xs text-muted file:mr-3 file:rounded-xl file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-brand"
                />
              </div>

              {/* Badges Selector */}
              <div className="border-t border-line pt-5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted">
                    Career Personality Badge
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      updateDraft((d) => ({
                        ...d,
                        profile: { ...d.profile, badge: undefined },
                      }))
                    }
                    className="text-[11px] font-bold text-faint hover:text-danger"
                  >
                    Clear Badge
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {eligibleBadges.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() =>
                        updateDraft((d) => ({
                          ...d,
                          profile: { ...d.profile, badge: b.id },
                        }))
                      }
                      className={`flex flex-col items-start rounded-xl border p-3 text-left transition cursor-pointer ${
                        draft.profile.badge === b.id
                          ? "border-brand bg-brand-soft ring-2 ring-brand/30"
                          : "border-line bg-surface-2 hover:border-brand/40"
                      }`}
                    >
                      <span className="text-xs font-bold text-ink">★ {b.labelEn}</span>
                      <span className="mt-0.5 text-[11px] text-muted">{b.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tools Presets */}
              <div className="border-t border-line pt-5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted block mb-2">
                  Featured Tools & Technologies (Select up to 8)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    PROFESSION_PRESETS[draft.profile.profession]?.tools ||
                    PROFESSION_PRESETS.other.tools
                  ).map((toolName) => {
                    const isSelected = draft.tools.some((t) => t.label === toolName);
                    return (
                      <button
                        key={toolName}
                        type="button"
                        onClick={() => {
                          updateDraft((d) => {
                            const exists = d.tools.some((t) => t.label === toolName);
                            const nextTools = exists
                              ? d.tools.filter((t) => t.label !== toolName)
                              : [
                                  ...d.tools.slice(0, 7),
                                  {
                                    id: `tool_${Date.now()}_${toolName}`,
                                    label: toolName,
                                    currentOrPast: "current" as const,
                                    featured: true,
                                  },
                                ];
                            return { ...d, tools: nextTools };
                          });
                        }}
                        className={`rounded-xl px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                          isSelected
                            ? "bg-brand text-white shadow-xs"
                            : "bg-surface-2 border border-line text-muted hover:text-ink"
                        }`}
                      >
                        {toolName} {isSelected ? "✓" : "+"}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: THEME & LAYOUT */}
          {activeTab === "design" && (
            <div className="rounded-3xl border border-line bg-surface p-6 shadow-card space-y-6">
              <div>
                <h2 className="text-base font-extrabold text-ink">Card Themes</h2>
                <p className="text-xs text-muted">Choose the visual styling that best fits your personality.</p>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { id: "midnight", label: "Midnight", desc: "Dark & sleek tech aesthetic" },
                    { id: "paper", label: "Paper", desc: "Clean, editorial & warm" },
                    { id: "retro", label: "Retro", desc: "Terminal cyberpunk & neon" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        updateDraft((d) => ({
                          ...d,
                          design: { ...d.design, theme: t.id as ThemeType },
                        }))
                      }
                      className={`rounded-2xl border p-4 text-left transition cursor-pointer ${
                        draft.design.theme === t.id
                          ? "border-brand bg-brand-soft ring-2 ring-brand/30"
                          : "border-line bg-surface-2 hover:border-brand/40"
                      }`}
                    >
                      <p className="text-sm font-bold text-ink">{t.label}</p>
                      <p className="mt-1 text-[11px] text-muted">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-line pt-5">
                <h2 className="text-base font-extrabold text-ink">Aspect Ratio</h2>
                <p className="text-xs text-muted">Target formats for sharing on feeds or stories.</p>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { id: "portrait", label: "Portrait 4:5", desc: "1080 × 1350 px (Feed)" },
                    { id: "square", label: "Square 1:1", desc: "1080 × 1080 px (Post)" },
                    { id: "story", label: "Story 9:16", desc: "1080 × 1920 px (Mobile)" },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() =>
                        updateDraft((d) => ({
                          ...d,
                          design: { ...d.design, aspectRatio: r.id as AspectRatio },
                        }))
                      }
                      className={`rounded-2xl border p-4 text-left transition cursor-pointer ${
                        draft.design.aspectRatio === r.id
                          ? "border-brand bg-brand-soft ring-2 ring-brand/30"
                          : "border-line bg-surface-2 hover:border-brand/40"
                      }`}
                    >
                      <p className="text-sm font-bold text-ink">{r.label}</p>
                      <p className="mt-1 text-[11px] text-muted">{r.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-line pt-5 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Card Elements</h3>

                <label className="flex items-center justify-between p-3 rounded-xl border border-line bg-surface-2 cursor-pointer">
                  <span className="text-xs font-bold text-ink">Show Metrics Counters</span>
                  <input
                    type="checkbox"
                    checked={draft.design.showMetrics}
                    onChange={(e) =>
                      updateDraft((d) => ({
                        ...d,
                        design: { ...d.design, showMetrics: e.target.checked },
                      }))
                    }
                    className="size-4 rounded text-brand"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-line bg-surface-2 cursor-pointer">
                  <span className="text-xs font-bold text-ink">Show Tools & Technologies</span>
                  <input
                    type="checkbox"
                    checked={draft.design.showTools}
                    onChange={(e) =>
                      updateDraft((d) => ({
                        ...d,
                        design: { ...d.design, showTools: e.target.checked },
                      }))
                    }
                    className="size-4 rounded text-brand"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Sticky Live Preview */}
        <div className="lg:sticky lg:top-24 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-muted">
              Live Preview ({draft.design.aspectRatio})
            </span>
            <span className="rounded-md border border-line bg-surface px-2 py-0.5 text-[11px] font-mono text-faint">
              1080 × {draft.design.aspectRatio === "portrait" ? 1350 : draft.design.aspectRatio === "square" ? 1080 : 1920}
            </span>
          </div>

          {/* Scaled Preview Frame */}
          <div className="flex justify-center rounded-3xl border border-line bg-surface-2 p-4 shadow-inner overflow-hidden">
            <div
              style={{
                width: `${400}px`,
                height: `${
                  draft.design.aspectRatio === "portrait"
                    ? 500
                    : draft.design.aspectRatio === "square"
                    ? 400
                    : 711
                }px`,
                position: "relative",
                overflow: "hidden",
                borderRadius: "1.25rem",
                boxShadow: "0 20px 40px -15px rgba(0,0,0,0.3)",
              }}
            >
              <AtlasCardRender
                ref={cardRef}
                draft={draft}
                scale={400 / 1080}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-faint px-1">
            <span>Rendered at high-res 1080px canvas</span>
            <span>No account needed to download</span>
          </div>
        </div>
      </div>

      {/* Publish & Share Review Modal */}
      {publishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl border border-line bg-surface p-7 shadow-2xl">
            {!publishedData ? (
              <>
                <div className="flex items-center justify-between border-b border-line pb-4">
                  <h3 className="text-xl font-extrabold text-ink">Publish & Share Your Card</h3>
                  <button
                    type="button"
                    onClick={() => setPublishModalOpen(false)}
                    className="text-faint hover:text-ink text-sm font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-4 space-y-3 text-xs leading-relaxed text-muted">
                  <p>
                    Publishing creates a hosted snapshot viewable by anyone who has your link at:
                  </p>
                  <p className="font-mono text-xs text-brand font-bold bg-brand-soft p-2.5 rounded-xl">
                    https://career-radar.programminghero.com/career-atlas/s/[id]
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-faint">
                    <li>Only the selected public details and artwork will be accessible.</li>
                    <li>Unlisted by default (not indexed in public search engines).</li>
                    <li>You can revoke or unpublish this card at any time from this browser.</li>
                  </ul>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3 border-t border-line pt-4">
                  <button
                    type="button"
                    onClick={() => setPublishModalOpen(false)}
                    className="rounded-xl px-4 py-2 text-xs font-bold text-muted hover:bg-surface-2 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isPublishing}
                    onClick={handleConfirmPublish}
                    className="rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-brand/20 transition hover:bg-brand-hover cursor-pointer disabled:opacity-60"
                  >
                    {isPublishing ? "Publishing snapshot..." : "Confirm & Create Link"}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center space-y-4">
                <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-ok-soft text-3xl text-ok">
                  🎉
                </span>
                <h3 className="text-2xl font-black text-ink">Your Career Atlas is Live!</h3>
                <p className="text-xs text-muted">
                  Your personal card link has been created and is ready to share.
                </p>

                <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface-2 p-2">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}${publishedData.shareUrl}`}
                    className="flex-1 bg-transparent px-2 text-xs font-mono text-brand font-bold outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const fullUrl = `${window.location.origin}${publishedData.shareUrl}`;
                      navigator.clipboard.writeText(fullUrl);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="rounded-xl bg-brand px-3 py-1.5 text-xs font-bold text-white transition hover:bg-brand-hover cursor-pointer"
                  >
                    {copiedLink ? "Copied!" : "Copy Link"}
                  </button>
                </div>

                {/* Social Caption */}
                <div className="text-left mt-3">
                  <label className="text-[11px] font-bold text-muted mb-1 block">
                    Suggested Social Caption:
                  </label>
                  <textarea
                    rows={4}
                    readOnly
                    value={generatedCaption}
                    className="w-full rounded-xl border border-line bg-surface-2 p-2.5 text-xs text-ink font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCaption);
                      setCopiedCaption(true);
                      setTimeout(() => setCopiedCaption(false), 2000);
                    }}
                    className="mt-1 text-xs font-bold text-brand hover:underline cursor-pointer"
                  >
                    {copiedCaption ? "Caption Copied!" : "Copy Caption to Clipboard"}
                  </button>
                </div>

                <div className="flex items-center justify-center gap-3 pt-4 border-t border-line">
                  <Link
                    href={publishedData.shareUrl}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-brand px-5 text-xs font-bold text-white shadow-md shadow-brand/20 transition hover:bg-brand-hover"
                  >
                    Open Shared Page →
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setPublishModalOpen(false);
                      setPublishedData(null);
                    }}
                    className="rounded-xl border border-line px-4 py-2 text-xs font-bold text-muted hover:bg-surface-2 cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
