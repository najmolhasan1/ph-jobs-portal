import type { AtlasCardDraft } from "./types";

export interface BadgeInfo {
  id: string;
  labelEn: string;
  labelBn: string;
  tone: "professional" | "playful";
  description: string;
}

export const ALL_BADGES: Record<string, BadgeInfo> = {
  career_switch_master: {
    id: "career_switch_master",
    labelEn: "Career Switch Master",
    labelBn: "ক্যারিয়ার সুইচ মাস্টার",
    tone: "professional",
    description: "Successfully navigated at least two distinct career switches.",
  },
  the_long_game: {
    id: "the_long_game",
    labelEn: "The Long Game",
    labelBn: "দ্য লং গেম",
    tone: "professional",
    description: "Building craft for over 10 years of professional dedication.",
  },
  local_roots_global_work: {
    id: "local_roots_global_work",
    labelEn: "Local Roots, Global Work",
    labelBn: "লোকাল রুটস, গ্লোবাল ওয়ার্ক",
    tone: "professional",
    description: "Rooted in Bangladesh while serving teams and clients worldwide.",
  },
  self_taught_builder: {
    id: "self_taught_builder",
    labelEn: "Self-Taught Builder",
    labelBn: "সেলফ-টট বিল্ডার",
    tone: "professional",
    description: "Carved own career through curiosity, grit, and independent projects.",
  },
  first_chapter: {
    id: "first_chapter",
    labelEn: "First Chapter",
    labelBn: "ফার্স্ট চ্যাপ্টার",
    tone: "professional",
    description: "At the energetic beginnings of a promising technology journey.",
  },
  tutorial_survivor: {
    id: "tutorial_survivor",
    labelEn: "Tutorial Survivor",
    labelBn: "টিউটোরিয়াল সারভাইভার",
    tone: "playful",
    description: "Escaped tutorial purgatory and shipped real production software.",
  },
};

export function getEligibleBadges(draft: AtlasCardDraft): BadgeInfo[] {
  const eligible: BadgeInfo[] = [];
  const currentYear = new Date().getFullYear();

  // 1. Career Switch Master: >= 2 career switch milestones
  const switchCount = draft.milestones.filter((m) => m.kind === "switch").length;
  if (switchCount >= 2) {
    eligible.push(ALL_BADGES.career_switch_master);
  }

  // 2. The Long Game: first milestone is at least 10 years ago
  const validYears = draft.milestones.map((m) => m.startYear).filter((y) => y > 1900);
  if (validYears.length > 0) {
    const earliestYear = Math.min(...validYears);
    if (earliestYear <= currentYear - 10) {
      eligible.push(ALL_BADGES.the_long_game);
    }
  }

  // 3. Local Roots Global Work: BD hometown + at least one foreign work location
  const isBdHometown =
    Boolean(draft.profile.hometownDistrict) ||
    draft.profile.hometownCountry === "BD" ||
    draft.profile.hometownCountry === "Bangladesh";
  const hasGlobalWork = draft.footprint.locations.some(
    (l) => l.countryCode && l.countryCode !== "BD"
  );
  if (isBdHometown && hasGlobalWork) {
    eligible.push(ALL_BADGES.local_roots_global_work);
  }

  // 4. Self Taught Builder: explicitly marked
  if (draft.profile.isSelfTaught) {
    eligible.push(ALL_BADGES.self_taught_builder);
  }

  // 5. First Chapter: student or early milestones
  if (
    draft.profile.profession === "student" ||
    draft.milestones.length <= 2 ||
    draft.profile.startingYear && draft.profile.startingYear >= currentYear - 2
  ) {
    eligible.push(ALL_BADGES.first_chapter);
  }

  // 6. Tutorial Survivor: playful badge option
  eligible.push(ALL_BADGES.tutorial_survivor);

  return eligible;
}
