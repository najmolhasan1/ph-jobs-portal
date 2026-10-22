"use client";
/* eslint-disable @next/next/no-img-element */

import React from "react";
import type { AtlasCardDraft } from "@/lib/career-atlas/types";
import { ALL_BADGES } from "@/lib/career-atlas/badges";
import { BD_DISTRICTS, WORLD_COUNTRIES } from "@/lib/career-atlas/geo-data";

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
    let height = 1350; // portrait
    if (aspectRatio === "square") {
      height = 1080;
    } else if (aspectRatio === "story") {
      height = 1920;
    }

    // Theme Styles
    const isMidnight = theme === "midnight";
    const isPaper = theme === "paper";
    const isRetro = theme === "retro";

    const themeColors = {
      midnight: {
        bg: "bg-[#0c0915] text-[#f2effe]",
        border: "border-[#2b2247]",
        cardBg: "bg-[#17122b]/90 border border-[#312652]",
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
        cardBg: "bg-[#ffffff] border border-[#e5decb] shadow-[0_4px_24px_rgba(30,20,10,0.04)]",
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

    return (
      <div
        ref={ref}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: "top left",
        }}
        className={`relative flex flex-col justify-between overflow-hidden p-[64px] font-sans transition-all duration-300 ${themeColors.bg} ${className}`}
      >
        {/* Background decorative artwork */}
        <div className="pointer-events-none absolute inset-0 -z-0 opacity-40">
          {isMidnight && (
            <div className="absolute top-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full bg-linear-to-br from-[#8b5cf6]/25 to-[#ec4899]/15 blur-[120px]" />
          )}
          {isRetro && (
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,229,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
          )}
          {isPaper && (
            <div className="absolute top-0 right-0 h-[400px] w-[400px] rounded-full bg-[#fef08a]/20 blur-[100px]" />
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
              <div className="inline-flex items-center gap-2 rounded-2xl border border-line bg-surface/50 px-4 py-2 backdrop-blur-xs">
                <span className="text-sm font-bold">
                  📍 {profile.hometownDistrict
                    ? BD_DISTRICTS.find((d) => d.id === profile.hometownDistrict)?.nameEn + ", BD"
                    : profile.hometownCountry}
                </span>
              </div>
            )}
            {profile.currentWorkBase && (
              <p className={`mt-1 text-xs font-semibold ${themeColors.faintText}`}>
                Base: {profile.currentWorkBase}
              </p>
            )}
          </div>
        </div>

        {/* MIDDLE: Dominant Story Content */}
        <div className="relative z-10 my-6 flex-1 flex flex-col justify-center">
          {/* STORY 1: CAREER JOURNEY */}
          {storyType === "journey" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h2 className="text-xs font-extrabold uppercase tracking-[0.2em] text-faint">
                  Career Progression Timeline
                </h2>
                <span className={`text-xs font-bold ${themeColors.softText}`}>
                  {milestones.length} Milestones
                </span>
              </div>

              <div className="relative pl-6 space-y-4 border-l-2 border-dashed border-brand/40 my-2">
                {milestones.slice(0, 8).map((m, idx) => {
                  return (
                    <div key={m.id || idx} className="relative group">
                      {/* Node Bullet */}
                      <span
                        className={`absolute -left-[31px] top-1.5 size-3.5 rounded-full ring-4 ${
                          m.ongoing
                            ? "bg-ok ring-ok/30 animate-pulse"
                            : isMidnight
                            ? "bg-[#8b5cf6] ring-[#8b5cf6]/30"
                            : isRetro
                            ? "bg-[#00e5ff] ring-[#00e5ff]/30"
                            : "bg-[#854d0e] ring-[#854d0e]/30"
                        }`}
                      />

                      <div className={`rounded-2xl p-4 transition-all ${themeColors.cardBg}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <h3 className="text-xl font-extrabold text-ink">{m.title}</h3>
                            {m.ongoing && (
                              <span className="rounded-full bg-ok-soft px-2.5 py-0.5 text-xs font-bold text-ok">
                                Current
                              </span>
                            )}
                          </div>
                          <span className={`text-sm font-extrabold ${themeColors.accent}`}>
                            {m.startYear} {m.ongoing ? "– Present" : m.endYear && m.endYear !== m.startYear ? `– ${m.endYear}` : ""}
                          </span>
                        </div>

                        {m.organization && m.showOrg !== false && (
                          <p className={`mt-0.5 text-xs font-bold uppercase tracking-wider ${themeColors.faintText}`}>
                            @ {m.organization}
                          </p>
                        )}

                        {m.note && (
                          <p className={`mt-2 text-sm leading-relaxed ${themeColors.softText}`}>
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
              <div className={`my-4 relative h-[360px] w-full rounded-3xl overflow-hidden p-6 flex items-center justify-center ${themeColors.cardBg}`}>
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <defs>
                    <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor={isRetro ? "#00e5ff" : "#8b5cf6"} stopOpacity="0.3" />
                      <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Grid lines */}
                  <line x1="0" y1="25" x2="100" y2="25" stroke="currentColor" strokeOpacity="0.05" />
                  <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeOpacity="0.05" />
                  <line x1="0" y1="75" x2="100" y2="75" stroke="currentColor" strokeOpacity="0.05" />
                  <line x1="25" y1="0" x2="25" y2="100" stroke="currentColor" strokeOpacity="0.05" />
                  <line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" strokeOpacity="0.05" />
                  <line x1="75" y1="0" x2="75" y2="100" stroke="currentColor" strokeOpacity="0.05" />

                  {/* World or Bangladesh Outline / Pins */}
                  {footprint.scope === "world" ? (
                    <>
                      {/* World Continents simplified shapes */}
                      <path
                        d="M15,25 Q30,15 40,25 Q35,45 20,40 Z M45,20 Q65,15 75,30 Q65,45 50,40 Z M65,45 Q85,40 90,60 Q75,70 65,55 Z M25,50 Q38,50 35,75 Q20,70 25,50 Z"
                        fill="currentColor"
                        fillOpacity={isMidnight ? 0.08 : 0.05}
                      />

                      {/* Routes from Base (e.g. Bangladesh x:71, y:50) */}
                      {footprint.locations.map((loc, i) => {
                        const target = WORLD_COUNTRIES.find((c) => c.code === loc.countryCode) || {
                          x: 50 + ((i * 17) % 40) - 20,
                          y: 40 + ((i * 13) % 40) - 20,
                        };
                        return (
                          <g key={loc.id || i}>
                            <path
                              d={`M71,50 Q${(71 + target.x) / 2},${Math.min(50, target.y) - 15} ${target.x},${target.y}`}
                              fill="none"
                              stroke={isRetro ? "#00e5ff" : isPaper ? "#854d0e" : "#8b5cf6"}
                              strokeWidth="0.8"
                              strokeDasharray="2,2"
                              strokeOpacity="0.6"
                            />
                            <circle cx={target.x} cy={target.y} r="2" fill={isRetro ? "#00e5ff" : "#d946ef"} />
                            <circle cx={target.x} cy={target.y} r="4" fill="none" stroke="currentColor" strokeOpacity="0.4" />
                          </g>
                        );
                      })}

                      {/* Origin Hub Pin */}
                      <circle cx="71" cy="50" r="3.5" fill="#10b981" />
                      <circle cx="71" cy="50" r="7" fill="none" stroke="#10b981" strokeOpacity="0.5" />
                    </>
                  ) : (
                    <>
                      {/* Bangladesh Stylized Outline */}
                      <polygon
                        points="25,15 45,15 65,30 85,35 85,70 70,85 50,85 30,75 20,45"
                        fill="currentColor"
                        fillOpacity={isMidnight ? 0.08 : 0.05}
                      />
                      {footprint.locations.map((loc, i) => {
                        const district = BD_DISTRICTS.find((d) => d.id === loc.districtId);
                        const cx = district?.x || 50;
                        const cy = district?.y || 50;
                        return (
                          <g key={loc.id || i}>
                            <circle cx={cx} cy={cy} r="2.5" fill={isRetro ? "#00e5ff" : "#8b5cf6"} />
                            <circle cx={cx} cy={cy} r="5" fill="none" stroke={isRetro ? "#00e5ff" : "#8b5cf6"} strokeOpacity="0.4" />
                          </g>
                        );
                      })}
                      {/* Dhaka origin */}
                      <circle cx="50" cy="55" r="3" fill="#10b981" />
                    </>
                  )}
                </svg>

                {/* Overlaid Badges */}
                <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
                  {footprint.locations.slice(0, 10).map((loc) => (
                    <span
                      key={loc.id}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-bold ${themeColors.accentBg}`}
                    >
                      <span>📍</span>
                      <span>{loc.displayLabel}</span>
                    </span>
                  ))}
                  {footprint.locations.length > 10 && (
                    <span className="rounded-xl border border-line bg-surface/80 px-2.5 py-1 text-xs font-bold text-muted">
                      +{footprint.locations.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STORY 3: CAREER MEMORY */}
          {storyType === "memory" && (
            <div className={`rounded-3xl p-8 transition-all ${themeColors.cardBg}`}>
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
                    className="size-48 rounded-2xl object-cover ring-2 ring-brand/30 shadow-lg"
                  />
                ) : (
                  <div className="grid size-36 shrink-0 place-items-center rounded-2xl bg-brand-soft text-5xl">
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
        <div className="relative z-10 space-y-6">
          {/* Metrics Counters */}
          {showMetrics && profile.metrics && profile.metrics.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {profile.metrics.map((m, idx) => (
                <div
                  key={idx}
                  className={`rounded-2xl p-4 text-center transition-all ${themeColors.cardBg}`}
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
            <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
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
          <div className="flex items-center justify-between border-t border-line pt-4 text-xs font-semibold">
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
