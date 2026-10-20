// Client-safe metadata for the Programming Hero tracks (modes on the home page).
export const TRACK_META = {
  level1: {
    label: "Level 1",
    title: "Complete Web Development",
    blurb: "JavaScript, React, TypeScript, Next.js, Node & full-stack roles",
    tag: "Web development",
  },
  level2: {
    label: "Level 2",
    title: "Next Level Web Development",
    blurb: "TypeScript, Next.js, Node & full-stack roles — fresher to experienced",
    tag: "Full-stack & backend",
  },
  phitron: {
    label: "Phitron",
    title: "CS Fundamentals & Problem Solving",
    blurb: "Software engineering, programming & SQA roles",
    tag: "Software engineering",
  },
  aiml: {
    label: "AI & ML",
    title: "AI & Machine Learning",
    blurb: "AI-focused roles on a JavaScript / TypeScript stack",
    tag: "AI & ML",
  },
} as const;

export type TrackKey = keyof typeof TRACK_META;
export const TRACK_KEYS = Object.keys(TRACK_META) as TrackKey[];

export const CATEGORY_LABELS: Record<string, string> = {
  frontend: "Frontend",
  backend: "Backend",
  fullstack: "Full-stack",
  mobile: "Mobile",
  qa: "QA / SQA",
  aiml: "AI / ML",
};

export const SKILL_OPTIONS = [
  "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Express", "MongoDB", "MySQL", "PostgreSQL",
  "Tailwind", "HTML", "CSS", "Git", "REST API", "GraphQL", "Redux", "React Native", "Docker", "AWS",
];
