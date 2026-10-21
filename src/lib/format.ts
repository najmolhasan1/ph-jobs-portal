export const SOURCE_LABELS: Record<string, string> = {
  bdjobs: "BDJobs",
  atb: "atB Jobs",
  nextjobz: "NextJobz",
  linkedin: "LinkedIn",
  linkedin_company: "LinkedIn post",
  facebook: "Facebook",
  himalayas: "Himalayas",
  remoterocketship: "Remote Rocketship",
  arc: "Arc.dev",
  wellfound: "Wellfound",
  jobright: "Jobright",
  reddit: "Reddit",
  indeed: "Indeed",
  skilljobs: "Skill.jobs",
  remotive: "Remotive",
  remoteok: "Remote OK",
  jobicy: "Jobicy",
  workingnomads: "Working Nomads",
  weworkremotely: "We Work Remotely",
  hackernews: "Hacker News",
  greenhouse: "Company careers",
  x: "X (Twitter)",
  googlejobs: "Google Jobs",
  lever: "Company careers",
  ashby: "Company careers",
};

export function timeAgo(iso?: string): string {
  if (!iso) return "";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function formatDate(iso?: string): string {
  return iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
}

export const cap = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

/** "FULL_TIME", "FullTime", "Full-time" → "Full-time". */
export function jobTypeLabel(t?: string): string | undefined {
  if (!t) return undefined;
  const s = t.replace(/[_-]/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().trim();
  if (/intern/.test(s)) return "Internship";
  if (/full/.test(s)) return "Full-time";
  if (/part/.test(s)) return "Part-time";
  if (/contract|temporary/.test(s)) return "Contract";
  if (/freelance/.test(s)) return "Freelance";
  return cap(s);
}

export function levelLabel(level?: string): string | undefined {
  if (level === "intern") return "Internship";
  if (level === "junior") return "Junior / fresher";
  if (level === "mid") return "Mid-level";
  return level ? cap(level) : undefined;
}

/** Experience line for cards: the post's own wording, else the level. */
export function experienceLabel(experience?: string, level?: string): string | undefined {
  if (experience && !/^na$/i.test(experience.trim())) return experience.replace(/^at least /i, "");
  return levelLabel(level);
}

const TONES = [
  "bg-[#f1eafe] text-[#7b3fe4]",
  "bg-[#e7effd] text-[#3b63c9]",
  "bg-[#fdeee3] text-[#c56a1d]",
  "bg-[#e5f5ee] text-[#2f8a5c]",
  "bg-[#fde8ef] text-[#c23a6b]",
  "bg-[#e6f4f7] text-[#227a8f]",
];
/** Stable soft colour for a company's initial avatar. */
export function avatarTone(name = ""): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
}
