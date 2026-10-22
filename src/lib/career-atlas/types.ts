export type StoryType = "journey" | "footprint" | "memory";
export type ThemeType = "midnight" | "paper" | "retro";
export type AspectRatio = "portrait" | "square" | "story";

export type ProfessionType =
  | "programmer"
  | "marketer"
  | "freelancer"
  | "hr"
  | "student"
  | "other";

export type MilestoneKind =
  | "first_role"
  | "role_change"
  | "switch"
  | "promotion"
  | "freelance"
  | "business"
  | "education"
  | "break";

export interface CareerMilestone {
  id: string;
  title: string;
  startYear: number;
  endYear?: number;
  ongoing?: boolean;
  kind: MilestoneKind;
  note?: string;
  organization?: string;
  showOrg?: boolean;
}

export interface WorkLocation {
  id: string;
  relationship: "clients" | "teams" | "employers";
  type: "country" | "district" | "city";
  countryCode: string;
  countryName: string;
  districtId?: string;
  cityName?: string;
  displayLabel: string;
}

export interface ToolEntry {
  id: string;
  label: string;
  firstUsedYear?: number;
  currentOrPast: "current" | "past";
  featured: boolean;
}

export interface CareerMemory {
  title: string;
  year: number;
  note?: string;
  imageDataUrl?: string;
}

export interface AtlasProfile {
  displayName: string;
  profession: ProfessionType;
  customProfession?: string;
  currentRole?: string;
  headline?: string;
  avatarDataUrl?: string;
  hometownDistrict?: string;
  hometownCountry?: string;
  currentWorkBase?: string;
  startingYear?: number;
  metrics: { label: string; value: string }[];
  isSelfTaught?: boolean;
  badge?: string;
  badgeTone?: "professional" | "playful";
}

export interface AtlasCardDraft {
  schemaVersion: number;
  storyType: StoryType;
  profile: AtlasProfile;
  milestones: CareerMilestone[];
  footprint: {
    relationship: "clients" | "teams" | "employers";
    scope: "world" | "bangladesh";
    locations: WorkLocation[];
  };
  tools: ToolEntry[];
  memory: CareerMemory;
  design: {
    theme: ThemeType;
    aspectRatio: AspectRatio;
    accentColor?: string;
    showMetrics: boolean;
    showTools: boolean;
    showHometown: boolean;
  };
}
