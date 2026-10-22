"use client";

import React, { useId } from "react";
import type { ThemeType, WorkLocation } from "@/lib/career-atlas/types";
import { WORLD_PATHS, WORLD_PIN_COORDS, WORLD_VIEWBOX } from "@/lib/career-atlas/world-map-data";
import { BD_DISTRICT_PATHS, BD_PIN_COORDS, BD_VIEWBOX } from "@/lib/career-atlas/bd-map-data";

interface AtlasFootprintMapProps {
  scope: "world" | "bangladesh";
  locations: WorkLocation[];
  theme: ThemeType;
  isSquare?: boolean;
}

export function AtlasFootprintMap({ scope, locations, theme }: AtlasFootprintMapProps) {
  const mapId = useId();
  const isMidnight = theme === "midnight";
  const isPaper = theme === "paper";
  const isRetro = theme === "retro";

  // Colors based on theme
  const colors = {
    // Landmass styling
    landFill: isMidnight ? "#18181b" : isPaper ? "#e6decb" : "#0a0f1d",
    landFillOpacity: isMidnight ? 0.9 : isPaper ? 0.85 : 0.95,
    landStroke: isMidnight ? "#3f3f46" : isPaper ? "#baa894" : "#1e293b",
    landStrokeOpacity: isMidnight ? 0.45 : isPaper ? 0.75 : 0.8,
    landStrokeWidth: scope === "world" ? 0.6 : 1.8,

    // Selected landmass styling
    selectedLandFill: isRetro ? "#00e5ff" : isPaper ? "#c2410c" : "#8b5cf6",
    selectedLandFillOpacity: isRetro ? 0.28 : isPaper ? 0.22 : 0.35,
    selectedLandStroke: isRetro ? "#00e5ff" : isPaper ? "#9a3412" : "#a78bfa",
    selectedLandStrokeWidth: scope === "world" ? 1.0 : 2.5,

    // Hub styling (Bangladesh / Dhaka)
    hubFill: "#10b981",
    hubFillOpacity: 0.4,
    hubStroke: "#10b981",

    // Arcs & Flight paths
    arcStroke: isRetro ? "#00e5ff" : isPaper ? "#9a3412" : "#c084fc",
    arcShadow: isRetro ? "#00e5ff" : isPaper ? "#c2410c" : "#7c3aed",
    pinCore: isRetro ? "#00e5ff" : isPaper ? "#ea580c" : "#e879f9",
    pinHalo: isRetro ? "#00e5ff" : isPaper ? "#c2410c" : "#a855f7",

    // Map ocean & grid
    gridStroke: isMidnight ? "#52525b" : isPaper ? "#a89984" : "#0284c7",
    gridOpacity: isMidnight ? 0.12 : isPaper ? 0.18 : 0.15,
  };

  // -------------------------------------------------------------
  // WORLD MAP
  // -------------------------------------------------------------
  if (scope === "world") {
    const selectedCountryCodes = new Set(
      locations.map((l) => l.countryCode).filter(Boolean) as string[]
    );

    const origin = WORLD_PIN_COORDS["BD"] || { x: 647.3, y: 223.9 };

    return (
      <svg
        className="w-full h-full select-none"
        viewBox={WORLD_VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id={`${mapId}-bgGlow`} cx="70%" cy="50%" r="55%">
            <stop
              offset="0%"
              stopColor={isRetro ? "#00e5ff" : isMidnight ? "#8b5cf6" : "#f97316"}
              stopOpacity={isRetro ? "0.12" : isMidnight ? "0.08" : "0.05"}
            />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <filter id={`${mapId}-pinGlow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
          </filter>
        </defs>

        {/* Ocean Background Subtle Glow */}
        <rect width="900" height="441" fill={`url(#${mapId}-bgGlow)`} />

        {/* Geographic Graticules (Latitude & Longitude) */}
        <g stroke={colors.gridStroke} strokeOpacity={colors.gridOpacity} strokeDasharray="3 4">
          {/* Equator */}
          <line x1="0" y1="220.5" x2="900" y2="220.5" strokeWidth="0.8" />
          {/* Tropic of Cancer */}
          <line x1="0" y1="162" x2="900" y2="162" strokeWidth="0.5" />
          {/* Tropic of Capricorn */}
          <line x1="0" y1="279" x2="900" y2="279" strokeWidth="0.5" />
          {/* Arctic Circle */}
          <line x1="0" y1="78" x2="900" y2="78" strokeWidth="0.5" />
          {/* Meridians */}
          <line x1="150" y1="0" x2="150" y2="441" strokeWidth="0.5" />
          <line x1="300" y1="0" x2="300" y2="441" strokeWidth="0.5" />
          <line x1="450" y1="0" x2="450" y2="441" strokeWidth="0.8" />
          <line x1="600" y1="0" x2="600" y2="441" strokeWidth="0.5" />
          <line x1="750" y1="0" x2="750" y2="441" strokeWidth="0.5" />
        </g>

        {/* Countries / Continents Landmass Paths */}
        <g id="world-countries">
          {WORLD_PATHS.map((country) => {
            const isBD = country.id === "BD";
            const isSelected = selectedCountryCodes.has(country.id);

            let fill = colors.landFill;
            let fillOpacity = colors.landFillOpacity;
            let stroke = colors.landStroke;
            let strokeOpacity = colors.landStrokeOpacity;
            let strokeWidth = colors.landStrokeWidth;

            if (isBD) {
              fill = colors.hubFill;
              fillOpacity = colors.hubFillOpacity;
              stroke = colors.hubStroke;
              strokeOpacity = 0.9;
              strokeWidth = 1.2;
            } else if (isSelected) {
              fill = colors.selectedLandFill;
              fillOpacity = colors.selectedLandFillOpacity;
              stroke = colors.selectedLandStroke;
              strokeOpacity = 0.95;
              strokeWidth = colors.selectedLandStrokeWidth;
            }

            return (
              <path
                key={country.id}
                d={country.d}
                fill={fill}
                fillOpacity={fillOpacity}
                stroke={stroke}
                strokeOpacity={strokeOpacity}
                strokeWidth={strokeWidth}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            );
          })}
        </g>

        {/* Arcs / Flight Lines from Bangladesh Hub */}
        <g id="flight-arcs">
          {locations.map((loc, i) => {
            if (!loc.countryCode || loc.countryCode === "BD") return null;
            const target = WORLD_PIN_COORDS[loc.countryCode];
            if (!target) return null;

            // Compute curved arc control point
            const mx = (origin.x + target.x) / 2;
            const my = (origin.y + target.y) / 2;
            const dx = target.x - origin.x;
            const dy = target.y - origin.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            // Height of the curved apex
            const arcLift = Math.min(85, Math.max(22, dist * 0.2));
            const cx = mx;
            const cy = my - arcLift;

            const pathD = `M${origin.x},${origin.y} Q${cx},${cy} ${target.x},${target.y}`;

            return (
              <g key={loc.id || `${loc.countryCode}-${i}`}>
                {/* Arc Glow Shadow */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={colors.arcShadow}
                  strokeWidth="2.5"
                  strokeOpacity="0.25"
                />
                {/* Arc Dashed Line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={colors.arcStroke}
                  strokeWidth="1.2"
                  strokeDasharray="4 3"
                  strokeOpacity="0.85"
                />

                {/* Target Pin Halo */}
                <circle
                  cx={target.x}
                  cy={target.y}
                  r="6.5"
                  fill="none"
                  stroke={colors.pinHalo}
                  strokeWidth="1"
                  strokeOpacity="0.5"
                />
                {/* Target Pin Core */}
                <circle
                  cx={target.x}
                  cy={target.y}
                  r="3.2"
                  fill={colors.pinCore}
                />

                {/* Small Country Code Label */}
                <text
                  x={target.x}
                  y={target.y - 7}
                  textAnchor="middle"
                  fontSize="7.5"
                  fontWeight="800"
                  fill={colors.pinCore}
                  opacity={0.9}
                  letterSpacing="0.05em"
                >
                  {loc.countryCode}
                </text>
              </g>
            );
          })}
        </g>

        {/* Origin Hub Pin (Bangladesh 🇧🇩) */}
        <g id="origin-hub">
          {/* Radar Ring 1 */}
          <circle
            cx={origin.x}
            cy={origin.y}
            r="12"
            fill="none"
            stroke="#10b981"
            strokeWidth="0.8"
            strokeDasharray="2 2"
            strokeOpacity="0.6"
          />
          {/* Radar Ring 2 */}
          <circle
            cx={origin.x}
            cy={origin.y}
            r="6.5"
            fill="#10b981"
            fillOpacity="0.2"
            stroke="#10b981"
            strokeWidth="1"
          />
          {/* Core Green Dot */}
          <circle cx={origin.x} cy={origin.y} r="3.2" fill="#10b981" />

          {/* Hub Badge Text */}
          <rect
            x={origin.x - 22}
            y={origin.y + 7}
            width="44"
            height="13"
            rx="4"
            fill={isMidnight ? "#09090b" : isPaper ? "#f5efe6" : "#030712"}
            fillOpacity="0.85"
            stroke="#10b981"
            strokeWidth="0.6"
          />
          <text
            x={origin.x}
            y={origin.y + 16}
            textAnchor="middle"
            fontSize="7"
            fontWeight="900"
            fill="#10b981"
            letterSpacing="0.05em"
          >
            HUB · BD 🇧🇩
          </text>
        </g>
      </svg>
    );
  }

  // -------------------------------------------------------------
  // BANGLADESH DISTRICTS MAP
  // -------------------------------------------------------------
  const selectedDistrictIds = new Set(
    locations.map((l) => l.districtId).filter(Boolean) as string[]
  );

  const dhakaOrigin = BD_PIN_COORDS["dhaka"] || { x: 730.9, y: 1013.4 };

  return (
    <svg
      className="w-full h-full select-none"
      viewBox={BD_VIEWBOX}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id={`${mapId}-bdBgGlow`} cx="50%" cy="50%" r="50%">
          <stop
            offset="0%"
            stopColor={isRetro ? "#00e5ff" : isMidnight ? "#8b5cf6" : "#f97316"}
            stopOpacity={isRetro ? "0.1" : isMidnight ? "0.07" : "0.04"}
          />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="1555" height="2140" fill={`url(#${mapId}-bdBgGlow)`} />

      {/* 64 Districts Polygons */}
      <g id="bangladesh-districts">
        {Object.values(BD_DISTRICT_PATHS).map((district) => {
          const isDhaka = district.id === "dhaka";
          const isSelected = selectedDistrictIds.has(district.id);

          let fill = colors.landFill;
          let fillOpacity = colors.landFillOpacity;
          let stroke = colors.landStroke;
          let strokeOpacity = colors.landStrokeOpacity;
          let strokeWidth = colors.landStrokeWidth;

          if (isDhaka) {
            fill = colors.hubFill;
            fillOpacity = colors.hubFillOpacity;
            stroke = colors.hubStroke;
            strokeOpacity = 0.95;
            strokeWidth = 3;
          } else if (isSelected) {
            fill = colors.selectedLandFill;
            fillOpacity = colors.selectedLandFillOpacity;
            stroke = colors.selectedLandStroke;
            strokeOpacity = 1;
            strokeWidth = colors.selectedLandStrokeWidth;
          }

          return (
            <path
              key={district.id}
              d={district.d}
              fill={fill}
              fillOpacity={fillOpacity}
              stroke={stroke}
              strokeOpacity={strokeOpacity}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        })}
      </g>

      {/* Arcs & Pins to Selected Districts */}
      <g id="district-connections">
        {locations.map((loc, i) => {
          if (!loc.districtId || loc.districtId === "dhaka") return null;
          const target = BD_PIN_COORDS[loc.districtId];
          if (!target) return null;

          const mx = (dhakaOrigin.x + target.x) / 2;
          const my = (dhakaOrigin.y + target.y) / 2;
          const dx = target.x - dhakaOrigin.x;
          const dy = target.y - dhakaOrigin.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const arcLift = Math.min(160, Math.max(40, dist * 0.18));
          const cx = mx;
          const cy = my - arcLift;

          const pathD = `M${dhakaOrigin.x},${dhakaOrigin.y} Q${cx},${cy} ${target.x},${target.y}`;

          return (
            <g key={loc.id || `${loc.districtId}-${i}`}>
              <path
                d={pathD}
                fill="none"
                stroke={colors.arcShadow}
                strokeWidth="5"
                strokeOpacity="0.3"
              />
              <path
                d={pathD}
                fill="none"
                stroke={colors.arcStroke}
                strokeWidth="2.5"
                strokeDasharray="8 6"
                strokeOpacity="0.9"
              />

              <circle
                cx={target.x}
                cy={target.y}
                r="18"
                fill="none"
                stroke={colors.pinHalo}
                strokeWidth="2.5"
                strokeOpacity="0.5"
              />
              <circle
                cx={target.x}
                cy={target.y}
                r="8"
                fill={colors.pinCore}
              />
            </g>
          );
        })}
      </g>

      {/* Dhaka Hub Pin */}
      <g id="dhaka-hub">
        <circle
          cx={dhakaOrigin.x}
          cy={dhakaOrigin.y}
          r="36"
          fill="none"
          stroke="#10b981"
          strokeWidth="2"
          strokeDasharray="6 6"
          strokeOpacity="0.6"
        />
        <circle
          cx={dhakaOrigin.x}
          cy={dhakaOrigin.y}
          r="20"
          fill="#10b981"
          fillOpacity="0.25"
          stroke="#10b981"
          strokeWidth="2.5"
        />
        <circle cx={dhakaOrigin.x} cy={dhakaOrigin.y} r="9" fill="#10b981" />

        {/* Hub Badge */}
        <rect
          x={dhakaOrigin.x - 70}
          y={dhakaOrigin.y + 20}
          width="140"
          height="38"
          rx="10"
          fill={isMidnight ? "#09090b" : isPaper ? "#f5efe6" : "#030712"}
          fillOpacity="0.88"
          stroke="#10b981"
          strokeWidth="1.8"
        />
        <text
          x={dhakaOrigin.x}
          y={dhakaOrigin.y + 44}
          textAnchor="middle"
          fontSize="20"
          fontWeight="900"
          fill="#10b981"
          letterSpacing="0.05em"
        >
          HUB · DHAKA
        </text>
      </g>
    </svg>
  );
}
