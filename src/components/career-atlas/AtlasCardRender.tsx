"use client";
/* eslint-disable @next/next/no-img-element */

import React from "react";
import type { AtlasCardDraft } from "@/lib/career-atlas/types";
import { ALL_BADGES } from "@/lib/career-atlas/badges";
import { BD_DISTRICTS } from "@/lib/career-atlas/geo-data";
import { AtlasFootprintMap } from "./AtlasFootprintMap";

interface AtlasCardRenderProps {
  draft: AtlasCardDraft;
  scale?: number; // scale down for UI preview (e.g. 0.4 for thumbnail)
  className?: string;
}

export const AtlasCardRender = React.forwardRef<HTMLDivElement, AtlasCardRenderProps>(
  function AtlasCardRender({ draft, scale = 1, className = "" }, ref) {
    const { storyType, profile, milestones, footprint, tools, memory, design } = draft;
    const { theme, aspectRatio, showMetrics, showTools, showHometown } = design;

    // Dimensions: 1080 standard width
    const width = 1080;
    let height = 1350; // portrait 4:5
    if (aspectRatio === "square") {
      height = 1080; // 1:1
    } else if (aspectRatio === "story") {
      height = 1920; // 9:16
    }

    // Theme Styles
    const isMidnight = theme === "midnight";
    const isPaper = theme === "paper";
    const isRetro = theme === "retro";
    const isSquare = aspectRatio === "square";

    const themeColors = {
      midnight: {
        bg: "bg-[#0c0915] text-[#f2effe]",
        border: "border-[#2b2247]",
        cardBg: "bg-[#17122b]/95 border border-[#312652]",
        accent: "text-[#a77dfa]",
        accentBg: "bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 text-[#c4b5fd]",
        softText: "text-[#9d97b5]",
        faintText: "text-[#686280]",
        gradientPill: "from-[#8b5cf6] to-[#d946ef]",
        dotLine: "bg-[#8b5cf6]",
      },
      paper: {
        bg: "bg-[#fbf9f4] text-[#191624]",
        border: "border-[#e3decb]",
        cardBg: "bg-[#ffffff] border border-[#e5decb] shadow-[0_6px_24px_rgba(30,20,10,0.05)]",
        accent: "text-[#854d0e]",
        accentBg: "bg-[#fef9c3] border border-[#fde047] text-[#854d0e]",
        softText: "text-[#635d70]",
        faintText: "text-[#9e97a8]",
        gradientPill: "from-[#854d0e] to-[#ca8a04]",
        dotLine: "bg-[#854d0e]",
      },
      retro: {
        bg: "bg-[#0b1721] text-[#e0f7fa]",
        border: "border-[#00bcd4]/30",
        cardBg: "bg-[#102433] border border-[#00e5ff]/30 shadow-[0_0_30px_rgba(0,229,255,0.06)]",
        accent: "text-[#00e5ff]",
        accentBg: "bg-[#00e5ff]/15 border border-[#00e5ff]/40 text-[#00e5ff]",
        softText: "text-[#78a5b8]",
        faintText: "text-[#4b768a]",
        gradientPill: "from-[#00e5ff] to-[#3b82f6]",
        dotLine: "bg-[#00e5ff]",
      },
    }[theme];

    const badge = profile.badge ? ALL_BADGES[profile.badge] : null;

    // Distinct locations calculation
    const uniqueCountries = new Set(footprint.locations.map((l) => l.countryCode)).size;
    const uniqueDistricts = new Set(
      footprint.locations.filter((l) => l.districtId).map((l) => l.districtId)
    ).size;

    const isSparse = milestones.length <= 3;

    return (
      <div
        ref={ref}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          ...(scale !== 1
            ? {
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }
            : {}),
        }}
        className={`relative flex flex-col justify-between overflow-hidden ${
          isSquare ? "p-[48px]" : "p-[64px]"
        } font-sans transition-all duration-300 ${themeColors.bg} ${className}`}
      >
        {/* Background decorative artwork */}
        <div className="pointer-events-none absolute inset-0 -z-0 opacity-40">
          {isMidnight && (
            <div className="absolute top-[-20%] left-[-10%] h-[700px] w-[700px] rounded-full bg-linear-to-br from-[#8b5cf6]/30 to-[#ec4899]/20 blur-[140px]" />
          )}
          {isRetro && (
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,229,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,255,0.04)_1px,transparent_1px)] bg-[size:40px_40px]" />
          )}
          {isPaper && (
            <div className="absolute top-0 right-0 h-[500px] w-[500px] rounded-full bg-[#fef08a]/30 blur-[120px]" />
          )}
        </div>

        {/* TOP: Identity Header */}
        <div className="relative z-10 flex items-start justify-between gap-6">
          <div className="flex items-center gap-6">
            {profile.avatarDataUrl ? (
              <img
                src={profile.avatarDataUrl}
                alt={profile.displayName}
                className="size-24 rounded-3xl object-cover ring-4 ring-brand/40 shadow-xl"
              />
            ) : (
              <div
                className={`grid size-24 place-items-center rounded-3xl text-4xl font-extrabold text-white shadow-xl ${
                  isRetro
                    ? "bg-[#00e5ff] text-[#0b1721]"
                    : isPaper
                    ? "bg-[#854d0e] text-white"
                    : "bg-linear-to-br from-[#8b5cf6] to-[#d946ef]"
                }`}
              >
                {profile.displayName.charAt(0).toUpperCase() || "?"}
              </div>
            )}

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-4xl font-black tracking-tight">{profile.displayName || "Your Name"}</h1>
                {badge && (
                  <span className={`inline-flex items-center rounded-full px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider ${themeColors.accentBg}`}>
                    ★ {badge.labelEn}
                  </span>
                )}
              </div>

              {profile.currentRole && (
                <p className={`mt-1.5 text-2xl font-bold ${themeColors.accent}`}>
                  {profile.currentRole}
                </p>
              )}

              {profile.headline && (
                <p className={`mt-1 max-w-2xl text-base ${themeColors.softText}`}>
                  {profile.headline}
                </p>
              )}
            </div>
          </div>

          {/* Hometown & Work Base Tag */}
          <div className="text-right">
            {showHometown && (profile.hometownDistrict || profile.hometownCountry) && (
              <div className="inline-flex items-center gap-2 rounded-2xl border border-line bg-surface/60 px-4 py-2 backdrop-blur-xs">
                <span className="text-sm font-bold">
                  📍 {profile.hometownDistrict
                    ? BD_DISTRICTS.find((d) => d.id === profile.hometownDistrict)?.nameEn + ", BD"
                    : profile.hometownCountry}
                </span>
              </div>
            )}
            {profile.currentWorkBase && (
              <p className={`mt-1.5 text-xs font-semibold ${themeColors.faintText}`}>
                Base: {profile.currentWorkBase}
              </p>
            )}
          </div>
        </div>

        {/* MIDDLE: Dominant Story Content */}
        <div className={`relative z-10 ${isSquare ? "my-4" : "my-6"} flex-1 flex flex-col justify-center`}>
          {/* STORY 1: CAREER JOURNEY */}
          {storyType === "journey" && (
            <div className={isSparse ? "space-y-6" : "space-y-4"}>
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h2 className="text-xs font-extrabold uppercase tracking-[0.2em] text-faint">
                  Career Progression Timeline
                </h2>
                <span className={`text-xs font-bold ${themeColors.softText}`}>
                  {milestones.length} Milestones Recorded
                </span>
              </div>

              <div className={`relative pl-8 ${isSparse ? "space-y-6" : "space-y-3.5"} border-l-2 border-dashed border-brand/40 my-2`}>
                {milestones.slice(0, 8).map((m, idx) => {
                  return (
                    <div key={m.id || idx} className="relative group">
                      {/* Node Bullet */}
                      <span
                        className={`absolute -left-[39px] ${isSparse ? "top-3" : "top-2"} size-4 rounded-full ring-4 ${
                          m.ongoing
                            ? "bg-ok ring-ok/30 animate-pulse"
                            : isMidnight
                            ? "bg-[#8b5cf6] ring-[#8b5cf6]/30"
                            : isRetro
                            ? "bg-[#00e5ff] ring-[#00e5ff]/30"
                            : "bg-[#854d0e] ring-[#854d0e]/30"
                        }`}
                      />

                      <div className={`rounded-2xl ${isSparse ? "p-6" : isSquare ? "p-3.5" : "p-4"} transition-all ${themeColors.cardBg}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <h3 className={`${isSparse ? "text-2xl" : "text-xl"} font-extrabold text-ink`}>
                              {m.title}
                            </h3>
                            {m.ongoing && (
                              <span className="rounded-full bg-ok-soft px-3 py-0.5 text-xs font-bold text-ok">
                                Current
                              </span>
                            )}
                          </div>
                          <span className={`${isSparse ? "text-base" : "text-sm"} font-extrabold ${themeColors.accent}`}>
                            {m.startYear} {m.ongoing ? "– Present" : m.endYear && m.endYear !== m.startYear ? `– ${m.endYear}` : ""}
                          </span>
                        </div>

                        {m.organization && m.showOrg !== false && (
                          <p className={`mt-1 text-xs font-bold uppercase tracking-wider ${themeColors.faintText}`}>
                            @ {m.organization}
                          </p>
                        )}

                        {m.note && (
                          <p className={`mt-2 ${isSparse ? "text-base" : "text-sm"} leading-relaxed ${themeColors.softText}`}>
                            {m.note}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STORY 2: WORK FOOTPRINT (MAP) */}
          {storyType === "footprint" && (
            <div className="flex flex-col h-full justify-between">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div>
                  <h2 className="text-xs font-extrabold uppercase tracking-[0.2em] text-faint">
                    Geographic Reach · {footprint.relationship.toUpperCase()}
                  </h2>
                  <p className="mt-1 text-2xl font-black text-ink">
                    {footprint.scope === "world"
                      ? `${uniqueCountries} Countries & Regions Across the Globe`
                      : `${uniqueDistricts} Districts Reached across Bangladesh`}
                  </p>
                </div>
                <div className={`rounded-2xl px-4 py-2 font-mono text-sm font-bold ${themeColors.cardBg}`}>
                  {footprint.locations.length} Connected Points
                </div>
              </div>

              {/* Map Canvas Illustration */}
              <div className={`my-4 relative ${isSquare ? "h-[360px]" : "h-[440px]"} w-full rounded-3xl overflow-hidden p-4 sm:p-6 flex items-center justify-center ${themeColors.cardBg}`}>
                <AtlasFootprintMap
                  scope={footprint.scope}
                  locations={footprint.locations}
                  theme={theme}
                  isSquare={isSquare}
                />

                {/* Overlaid Badges */}
                <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2 pointer-events-none">
                  {footprint.locations.slice(0, 8).map((loc) => (
                    <span
                      key={loc.id}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold shadow-xs backdrop-blur-xs ${themeColors.accentBg}`}
                    >
                      <span>📍</span>
                      <span>{loc.displayLabel}</span>
                    </span>
                  ))}
                  {footprint.locations.length > 8 && (
                    <span className="rounded-xl border border-line bg-surface/90 backdrop-blur-xs px-2.5 py-1 text-xs font-bold text-muted">
                      +{footprint.locations.length - 8} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STORY 3: CAREER MEMORY */}
          {storyType === "memory" && (
            <div className={`rounded-3xl ${isSquare ? "p-6" : "p-8"} transition-all ${themeColors.cardBg}`}>
              <div className="flex items-center justify-between border-b border-line pb-4">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-brand">
                  Unforgettable Milestone
                </span>
                <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-black text-brand-text">
                  Year {memory.year}
                </span>
              </div>

              <div className="mt-6 flex flex-col md:flex-row gap-6 items-center">
                {memory.imageDataUrl ? (
                  <img
                    src={memory.imageDataUrl}
                    alt={memory.title}
                    className="size-52 rounded-2xl object-cover ring-2 ring-brand/30 shadow-lg"
                  />
                ) : (
                  <div className="grid size-40 shrink-0 place-items-center rounded-2xl bg-brand-soft text-6xl">
                    🌟
                  </div>
                )}

                <div className="flex-1">
                  <h3 className="text-3xl font-extrabold text-ink leading-tight">
                    {memory.title}
                  </h3>
                  {memory.note && (
                    <p className={`mt-3 text-lg leading-relaxed ${themeColors.softText}`}>
                      &ldquo;{memory.note}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM: Toolkit, Metrics & Footer */}
        <div className={`relative z-10 ${isSquare ? "space-y-4" : "space-y-6"}`}>
          {/* Metrics Counters */}
          {showMetrics && profile.metrics && profile.metrics.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {profile.metrics.map((m, idx) => (
                <div
                  key={idx}
                  className={`rounded-2xl ${isSquare ? "p-3" : "p-4"} text-center transition-all ${themeColors.cardBg}`}
                >
                  <p className="text-3xl font-black text-ink">{m.value}</p>
                  <p className={`mt-1 text-xs font-bold uppercase tracking-wider ${themeColors.faintText}`}>
                    {m.label}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Tools & Technologies */}
          {showTools && tools && tools.length > 0 && (
            <div className="flex items-center justify-between gap-4 border-t border-line pt-3.5">
              <span className={`text-xs font-bold uppercase tracking-wider ${themeColors.faintText}`}>
                Tech & Tools
              </span>
              <div className="flex flex-wrap gap-2">
                {tools.slice(0, 8).map((t) => (
                  <span
                    key={t.id}
                    className={`rounded-xl px-3 py-1 text-xs font-semibold ${
                      t.featured ? themeColors.accentBg : "bg-surface-2 border border-line text-muted"
                    }`}
                  >
                    {t.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Footer Branding Bar */}
          <div className="flex items-center justify-between border-t border-line pt-3 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-brand" />
              <span className="font-bold text-ink">Programming Hero · Career Radar</span>
              <span className={themeColors.faintText}>| Career Atlas</span>
            </div>

            <div className={`flex items-center gap-1.5 ${themeColors.accent}`}>
              <span>Make your own career map</span>
              <span>→</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
