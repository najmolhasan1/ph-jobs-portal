import type { NormalizedJob } from "@/lib/sources";

// Stage-1 gate: decides from title, experience and location whether a job is a
// junior/fresher software role in Bangladesh or remote. Free and deterministic.
//   approve → visible on the portal
//   review  → moderation queue (not public), e.g. level not stated
//   reject  → stored but hidden, with the reason

/** Max years of required experience that still counts as junior/fresher. */
export const JUNIOR_MAX_YEARS = Number(process.env.JUNIOR_MAX_YEARS) || 2;

// The roles the portal is for (agreed list). A job whose title — or, for social posts, whose
// opening lines — names one of these always gets through the role check.
export const TARGET_ROLES: { key: string; label: string; re: RegExp }[] = [
  { key: "frontend", label: "Frontend Developer", re: /front[- ]?end/i },
  { key: "react", label: "React Developer", re: /\breact(\.?js)?\b(?!\s*native)/i },
  { key: "nextjs", label: "Next.js Developer", re: /\bnext\.?js\b/i },
  { key: "javascript", label: "JavaScript Developer", re: /javascript|\bjs (developer|engineer)/i },
  { key: "typescript", label: "TypeScript Developer", re: /typescript/i },
  { key: "backend", label: "Backend Developer", re: /back[- ]?end/i },
  { key: "nodejs", label: "Node.js Developer", re: /\bnode(\.?js)?\b/i },
  { key: "fullstack", label: "Full Stack Developer", re: /full[- ]?stack/i },
  { key: "mern", label: "MERN Stack Developer", re: /\bmern\b/i },
  { key: "web", label: "Web Developer", re: /web ?(developer|development|engineer|programmer)/i },
  { key: "qa", label: "QA / SQA / Automation QA", re: /\bs?qa\b|quality assurance|automation (qa|test(ing)?|engineer)|test automation|software tester|\btester\b/i },
];

export function matchRole(text: string): (typeof TARGET_ROLES)[number] | undefined {
  return TARGET_ROLES.find((r) => r.re.test(text));
}

// Course / training adverts that mention the same keywords.
const COURSE_AD = /\bcourse\b|\bbatch\b|\benroll|\bbootcamp\b|ভর্তি|কোর্স|রেজিস্ট্রেশন|ক্লাস শুরু|\bworkshop\b|\bseminar\b/i;


// Only JavaScript/TypeScript jobs are shown. Jobs centred on any other stack are filtered out.
const OFF_STACK: [RegExp, string][] = [
  [/python|django|flask|fastapi|pandas|pytorch|tensorflow/i, "Python"],
  [/c\+\+|\bc programming\b|\bembedded\b|\bfirmware\b/i, "C / C++"],
  [/\bphp\b|laravel|codeigniter|symfony|wordpress|woocommerce|magento|drupal|joomla/i, "PHP / Laravel / WordPress"],
  [/flutter|\bdart\b|kotlin|\bswift\b|android (developer|engineer)|ios (developer|engineer)|xamarin/i, "Flutter / native mobile"],
  [/dev ?ops|\bsre\b|site reliability|platform engineer|infrastructure|cloud engineer|system admin|sysadmin|network engineer/i, "DevOps / infrastructure"],
  [/\.net\b|asp\.?net|\bc#|\bdotnet\b|blazor/i, ".NET / C#"],
  [/\bjava\b(?!script)|spring boot|\bj2ee\b/i, "Java"],
  [/\bgolang\b|\bgo developer\b|\bruby\b|\brails\b|\bscala\b|\belixir\b|\brust\b/i, "Go / Ruby / other backend stack"],
  [/odoo|\bsap\b|salesforce|servicenow|dynamics 365|\berp\b|sharepoint|power ?bi/i, "ERP / enterprise platform"],
];
// The JavaScript/TypeScript stack we do want.
const PH_STACK = /javascript|typescript|\bjs\b|react|next\.?js|node|mern|express|mongo|nest\.?js|angular|vue/i;

/** Returns the off-stack label if the job is built around a stack other than JS/TS. */
export function offStack(title: string, description = ""): string | undefined {
  // A title naming another stack is out — unless it also names JS/TS ("Python/TypeScript Engineer").
  for (const [re, label] of OFF_STACK) {
    if (re.test(title) && !PH_STACK.test(title)) return label;
  }
  // The description counts against a job only when JS/TS doesn't appear anywhere in it.
  if (!PH_STACK.test(`${title} ${description}`)) {
    const head = description.slice(0, 2000);
    for (const [re, label] of OFF_STACK) if (re.test(head)) return label;
  }
  return undefined;
}
// Weaker title signal: "Web3 Developer Intern", "Odoo Developer".
const ROLE_GENERIC = /\b(developer|programmer|software)\b/;

const NOT_DEV = [
  "sales", "marketing", "accountant", "accounts", "teacher", "driver", "data entry",
  "business development", "business developer", "customer service", "call center", "hr ",
  "human resource", "receptionist", "graphic designer", "video editor", "content writer",
  "technical writer", "seo", "civil engineer", "electrical", "mechanical", "nurse", "doctor",
  "pharma", "professor", "lecturer", "faculty", "front desk", "property", "real estate",
];

// Titles that are above junior regardless of the experience line.
const SENIOR_TITLE =
  /\b(s[eé]nior|sr\.?|lead|principal|staff|head|manager|architect|director|chief|vp|consultant|engineer ii+|iii)\b/;
const JUNIOR_TITLE = /\b(intern(ship)?|junior|jr\.?|trainee|fresher|entry[- ]level|graduate|apprentice)\b/;

const SPAM = [
  "registration fee", "registration charge", "investment required", "earn daily", "daily income",
  "ঘরে বসে আয়", "income from home", "mlm", "binary plan", "joining fee", "security deposit",
];
const HIRING = [
  "hiring", "we are looking", "looking for", "vacancy", "job opening", "apply", "send your cv",
  "send cv", "resume", "join our team", "নিয়োগ", "চাকরি", "নিয়োগ বিজ্ঞপ্তি", "প্রয়োজন",
];

const BD_PLACES =
  /bangladesh|dhaka|chattogram|chittagong|sylhet|khulna|rajshahi|barishal|barisal|rangpur|mymensingh|gazipur|narayanganj|cumilla|comilla|savar|bogura|jessore|jashore|cox.?s bazar|tongi|uttara|mirpur|gulshan|banani|dhanmondi|mohakhali/i;

export const KNOWN_SKILLS = [
  "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Express", "MongoDB", "MySQL",
  "PostgreSQL", "Redux", "Tailwind", "Bootstrap", "HTML", "CSS", "Git", "REST API", "GraphQL",
  "Firebase", "Vue", "Angular", "Laravel", "PHP", "Python", "Django", "WordPress", "Shopify",
  "Docker", "AWS", "Prisma", "React Native", "Flutter", "Figma", "Jest", "Nest.js",
];
const skillPattern = (s: string) =>
  new RegExp(`(^|[^a-z])${s.toLowerCase().replace(/[.+]/g, "\\$&").replace(/\s/g, "\\s?")}($|[^a-z])`, "i");
const SKILL_RES = KNOWN_SKILLS.map((s) => [s, skillPattern(s)] as const);

export function extractSkills(text: string): string[] {
  return SKILL_RES.filter(([, re]) => re.test(text)).map(([s]) => s);
}

/** Minimum years asked for: "At least 3 years", "2 to 5 years", "3+ years", "Fresher" → 0. */
export function minYears(text: string | undefined): number | undefined {
  if (!text) return undefined;
  const t = text.toLowerCase();
  if (/fresh(er|ers| graduate)|no experience|not required|0 years?/.test(t)) return 0;
  const m = t.match(/(\d+(?:\.\d+)?)\s*\+?\s*(?:-|to|–)?\s*(?:\d+\s*)?(?:years?|yrs?)/);
  return m ? Number(m[1]) : undefined;
}

export type Level = "intern" | "junior" | "mid" | "senior";

/** Level from title first, then the board's label, then the experience requirement. */
export function detectLevel(job: Pick<NormalizedJob, "title" | "level" | "experience" | "description">): Level | undefined {
  const title = job.title.toLowerCase();
  if (/\bintern(ship)?\b/.test(title) && !SENIOR_TITLE.test(title)) return "intern";
  if (SENIOR_TITLE.test(title)) return "senior";
  if (JUNIOR_TITLE.test(title)) return "junior"; // "Junior/ Mid-Level" still welcomes juniors
  if (/\bmid[- ]?level\b/.test(title)) return "mid";

  const label = (job.level ?? "").toLowerCase();
  if (/internship/.test(label)) return "intern";
  if (/entry/.test(label)) return "junior";
  if (/mid-senior|director|executive/.test(label)) return "senior";

  const years = minYears(job.experience) ?? minYears(job.description);
  if (years !== undefined) return years <= JUNIOR_MAX_YEARS ? "junior" : years <= 4 ? "mid" : "senior";
  if (/associate/.test(label)) return "junior"; // LinkedIn "Associate" ≈ 1–3 years, kept as junior
  return undefined;
}

// AI / ML roles (for the AI & ML track). Matched on the title so a passing mention doesn't count.
const AI_TITLE =
  /machine learning|\bml (engineer|developer|intern|researcher)|\bai (engineer|developer|intern|researcher|specialist)|ai ?(\/|&|and) ?ml|artificial intelligence|data scien|deep learning|computer vision|\bnlp\b|\bllms?\b|generative ai|gen ?ai (engineer|developer)|mlops|data engineer/i;

/** Programming Hero tracks a job fits — drives the Level 1 / Level 2 / Phitron / AI & ML modes. */
export const TRACKS = ["level1", "level2", "phitron", "aiml"] as const;
export type Track = (typeof TRACKS)[number];

export function detectTracks(title: string, skills: string[], description = ""): Track[] {
  const t = title.toLowerCase();
  const s = skills.join(" ").toLowerCase();
  const d = description.toLowerCase().slice(0, 3000);
  const tracks = new Set<Track>();
  // Level 1 — Complete Web Development: HTML/CSS/JS, React, TypeScript, Next.js, Node.js, MERN / full-stack.
  if (/front[- ]?end|react(?! native)|javascript|typescript|next\.?js|node|full[- ]?stack|html|css|web (developer|design)|ui developer|mern|tailwind/.test(`${t} ${s}`)) tracks.add("level1");
  // Level 2 — Next Level Web Development: TypeScript, Next.js, Node/Express, databases, full-stack/back-end.
  if (/full[- ]?stack|back[- ]?end|node|next\.?js|typescript|express|nest\.?js|postgres|prisma|mongodb|graphql/.test(`${t} ${s}`)) tracks.add("level2");
  // Phitron — CS fundamentals & problem solving: software engineering, programming, SQA roles.
  if (/software (engineer|develop)|programmer|\bsqa\b|\bqa\b|quality assurance|test automation|tester|competitive programming|algorithm/.test(`${t} ${s}`) ||
      /data structures|problem[- ]solving|competitive programming/.test(d)) tracks.add("phitron");
  if (AI_TITLE.test(title)) tracks.add("aiml");
  if (!tracks.size) tracks.add(/web/.test(t) ? "level1" : "phitron");
  return [...tracks];
}

export function detectCategory(text: string): string {
  const t = text.toLowerCase();
  if (AI_TITLE.test(t.split("\n")[0] ?? "")) return "aiml";
  if (/full[- ]?stack|mern|mean stack/.test(t)) return "fullstack";
  if (/react native|flutter|android|ios\b|mobile/.test(t)) return "mobile";
  if (/front[- ]?end|react|vue|angular|ui developer|next\.?js/.test(t)) return "frontend";
  if (/back[- ]?end|node|laravel|django|php|api developer/.test(t)) return "backend";
  if (/\bs?qa\b|quality assurance|automation (qa|test)|test automation|tester/.test(t)) return "qa";
  if (/web|software|programmer|wordpress|shopify/.test(t)) return "fullstack";
  return "other";
}

export type Decision = "approve" | "review" | "reject";

export interface Evaluation {
  decision: Decision;
  reason: string;
  /** 0–1, only used for ordering in the moderation queue. */
  score: number;
  skills: string[];
  level?: Level;
  category: string;
  tracks: Track[];
  isRemote: boolean;
}

// Who a remote job is open to: these mean Bangladeshi applicants qualify.
const OPEN_TO_BD = /^(bd|bangladesh|asia|south asia|apac|asia[- ]pacific|worldwide|anywhere|global|emea\+apac)$/i;

// Agencies advertising their services ("we build websites"), not hiring.
const SERVICE_AD = [
  "our services", "we provide", "we offer", "order now", "inbox for price", "contact for service",
  "professional website & web application", "আমাদের সেবা", "পাশে আছে", "অর্ডার করুন", "বিস্তারিত জানতে ইনবক্স",
];

// Posts by people looking for work, not employers.
const SEEKER = [
  "#opentowork", "open to work", "i am looking for", "i'm looking for a job", "looking for a job",
  "looking for an internship", "need a job", "available for hire", "hire me", "my cv", "আমি একজন",
  "আমার একটা চাকরি", "চাকরি খুঁজছি", "job খুঁজছি", "fresher here", "any opportunity for me",
];

export function evaluate(input: NormalizedJob): Evaluation {
  // Facebook/LinkedIn posts often use 𝗯𝗼𝗹𝗱 Unicode letters; NFKC maps them to plain text.
  const job = { ...input, title: input.title.normalize("NFKC"), description: input.description?.normalize("NFKC") };
  const title = job.title.toLowerCase();
  const body = `${job.title}\n${job.description ?? ""}`;
  const lower = body.toLowerCase();
  const skills = extractSkills(`${body}\n${(job.skills ?? []).join(", ")}`);
  let level = detectLevel(job);
  if (job.unstructured && !level) {
    // In a post the level can be anywhere in the text ("Position: Junior React Developer").
    const intern = /\bintern(ship)?\b|ইন্টার্ন/.test(lower);
    const junior = JUNIOR_TITLE.test(lower) || /জুনিয়র|ফ্রেশার/.test(lower);
    if (intern) level = "intern";
    else if (junior) level = "junior";
  }
  // Remote only when the post says so — never inferred from which search found it.
  const isRemote = Boolean(job.isRemote) || /\b(remote|worldwide|anywhere)\b|work from home/i.test(`${job.location ?? ""} ${job.title}`);
  const base = { skills, level, category: detectCategory(body), tracks: detectTracks(job.title, skills, job.description), isRemote };
  const out = (decision: Decision, reason: string, score: number): Evaluation => ({ ...base, decision, reason, score });

  if (SPAM.some((w) => lower.includes(w))) return out("reject", "spam", 0);

  // 1. Must be one of the target roles.
  const excluded = NOT_DEV.some((w) => title.includes(w));
  let role = excluded ? undefined : matchRole(job.title);
  if (job.unstructured) {
    // Social posts: the "title" is just the first line, so read the opening of the post.
    if (SEEKER.some((w) => lower.includes(w))) return out("reject", "job seeker's post, not a job", 0.1);
    if (SERVICE_AD.some((w) => lower.includes(w))) return out("reject", "service advertisement, not a job", 0.1);
    if (COURSE_AD.test(lower.slice(0, 600))) return out("reject", "course / training advert, not a job", 0.1);
    role ??= matchRole(lower.slice(0, 600));
    if (!role) return out("reject", "not a target role", 0.1);
    if (!HIRING.some((w) => lower.includes(w))) return out("reject", "not a job post", 0.2);
  } else if (!role && !excluded && ROLE_GENERIC.test(title) && /javascript|typescript|react|next\.?js|node|mern|express/i.test(body)) {
    // "Software Engineer" / "Junior Developer" whose description is plainly a JS/TS role.
    role = { key: "software-js", label: "Software engineer (JS/TS)", re: /$^/ };
  }
  if (!role) return out("reject", "not a target role", 0.1);

  // 1b. JavaScript/TypeScript stack only (QA roles are exempt — testing uses many tools).
  if (role.key !== "qa") {
    const off = offStack(job.title, job.description);
    if (off) return out("reject", `not a PH stack (${off})`, 0.15);
  }

  // 2. Bangladesh, or remote open to Bangladesh (worldwide / Asia).
  const BD_SOURCES = ["bdjobs", "atb", "nextjobz"];
  const inBD = BD_SOURCES.includes(job.source) || BD_PLACES.test(job.location ?? "") || BD_PLACES.test(job.title);
  if (job.location && !inBD && !isRemote) return out("reject", "onsite outside Bangladesh", 0.2);
  const allowed = job.remoteCountries?.filter(Boolean) ?? [];
  if (isRemote && !inBD && allowed.length && !allowed.some((c) => OPEN_TO_BD.test(c.trim()))) {
    return out("reject", `remote, but only for ${allowed.slice(0, 3).join(", ")}${allowed.length > 3 ? "…" : ""}`, 0.2);
  }

  // 3. Junior / fresher / intern — only roles that are explicitly senior or mid-level are dropped.
  //    A target role that doesn't state its level is published (it must reach the portal).
  if (level === "senior" || level === "mid") return out("reject", `${level} level`, 0.3);
  const what = level ? `${level} · ${role.label}` : `${role.label} · level not stated`;
  return out("approve", job.unstructured ? `${what} (post)` : what, level ? 1 : 0.8);
}
