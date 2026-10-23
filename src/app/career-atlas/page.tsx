import type { Metadata } from "next";
import Link from "next/link";
import { AtlasCardRender } from "@/components/career-atlas/AtlasCardRender";
import { createInitialDraft } from "@/lib/career-atlas/defaults";

export const metadata: Metadata = {
  title: "Career Atlas — Tell Your Professional Story",
  description:
    "Turn your career journey, global client footprint, or an unforgettable milestone into a polished card you can download and share.",
};

export default function CareerAtlasLandingPage() {
  const sampleJourney = createInitialDraft();

  const sampleFootprint = {
    ...createInitialDraft(),
    storyType: "footprint" as const,
    profile: {
      ...sampleJourney.profile,
      displayName: "Tanvir Ahmed",
      currentRole: "Top-Rated Global Freelancer",
      headline: "Delivering design systems to clients across 4 continents",
      hometownDistrict: "sylhet",
      badge: "local_roots_global_work",
    },
    design: {
      ...sampleJourney.design,
      theme: "paper" as const,
    },
  };

  const sampleMemory = {
    ...createInitialDraft(),
    storyType: "memory" as const,
    profile: {
      ...sampleJourney.profile,
      displayName: "Farzana Yasmin",
      currentRole: "Frontend Intern",
      headline: "From university classroom to first production pull request",
      badge: "first_chapter",
    },
    memory: {
      title: "My Very First Code Review Merged",
      year: 2026,
      note: "Receiving the 'LGTM' from our senior lead after three rounds of feedback. It proved to myself that I belong here.",
    },
    design: {
      ...sampleJourney.design,
      theme: "retro" as const,
    },
  };

  return (
    <div className="py-8 sm:py-16">
      {/* Hero Header */}
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-brand">
          <span>✨</span>
          <span>New Feature · Career Atlas</span>
        </span>

        <h1 className="mt-4 text-3xl font-black tracking-tight text-ink sm:text-5xl sm:leading-[1.15]">
          Turn your career journey into a story{" "}
          <span className="text-brand">worth sharing</span>.
        </h1>

        <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
          A single polished card capturing your path, work footprint across districts and countries,
          or an unforgettable career memory. Ready for LinkedIn, Facebook, and your personal story.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="#stories"
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-brand px-8 text-sm font-bold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-hover sm:w-auto cursor-pointer"
          >
            Choose Your Story Format ↓
          </Link>

          <p className="text-xs font-semibold text-faint">
            100% Free · No account or signup required to download PNG
          </p>
        </div>
      </div>

      {/* 3 Story Types Showcase Grid */}
      <div id="stories" className="mt-16 sm:mt-24 scroll-mt-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">
            Choose the story you want to show
          </h2>
          <p className="mt-2 text-sm text-muted">
            Three tailored formats designed for beginners, experienced developers, and freelancers.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Card 1: Journey */}
          <div className="flex flex-col rounded-3xl border border-line bg-surface p-6 shadow-card hover:border-brand/40 transition">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-xl">
                🧭
              </span>
              <div>
                <h3 className="text-lg font-bold text-ink">Career Journey</h3>
                <p className="text-xs text-muted">Chronological Timeline</p>
              </div>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-muted">
              From your first line of code or degree to your current role. Celebrates promotions,
              learning leaps, and brave career switches.
            </p>

            <div className="my-6 flex justify-center overflow-hidden rounded-2xl border border-line bg-surface-2 p-3 shadow-inner">
              <div
                style={{
                  width: "280px",
                  height: "350px",
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: "1rem",
                }}
              >
                <AtlasCardRender draft={sampleJourney} scale={280 / 1080} />
              </div>
            </div>

            <Link
              href="/career-atlas/create?story=journey"
              className="mt-auto inline-flex h-10 items-center justify-center rounded-xl border border-line bg-surface-2 text-xs font-bold text-ink transition hover:border-brand/40"
            >
              Build Journey Map →
            </Link>
          </div>

          {/* Card 2: Footprint */}
          <div className="flex flex-col rounded-3xl border border-line bg-surface p-6 shadow-card hover:border-brand/40 transition">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-xl">
                🗺️
              </span>
              <div>
                <h3 className="text-lg font-bold text-ink">Work Footprint</h3>
                <p className="text-xs text-muted">Geography & Reach</p>
              </div>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-muted">
              Map out where your clients, employers, and teammates are located—whether across all 64
              Bangladesh districts or international countries.
            </p>

            <div className="my-6 flex justify-center overflow-hidden rounded-2xl border border-line bg-surface-2 p-3 shadow-inner">
              <div
                style={{
                  width: "280px",
                  height: "350px",
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: "1rem",
                }}
              >
                <AtlasCardRender draft={sampleFootprint} scale={280 / 1080} />
              </div>
            </div>

            <Link
              href="/career-atlas/create?story=footprint"
              className="mt-auto inline-flex h-10 items-center justify-center rounded-xl border border-line bg-surface-2 text-xs font-bold text-ink transition hover:border-brand/40"
            >
              Build Footprint Map →
            </Link>
          </div>

          {/* Card 3: Memory */}
          <div className="flex flex-col rounded-3xl border border-line bg-surface p-6 shadow-card hover:border-brand/40 transition">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-xl">
                🌟
              </span>
              <div>
                <h3 className="text-lg font-bold text-ink">Career Memory</h3>
                <p className="text-xs text-muted">A Pivotal Moment</p>
              </div>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-muted">
              That late-night deployment, first freelance paycheck, or graduation day. Pair an old
              screenshot or photo with a heartfelt reflection.
            </p>

            <div className="my-6 flex justify-center overflow-hidden rounded-2xl border border-line bg-surface-2 p-3 shadow-inner">
              <div
                style={{
                  width: "280px",
                  height: "350px",
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: "1rem",
                }}
              >
                <AtlasCardRender draft={sampleMemory} scale={280 / 1080} />
              </div>
            </div>

            <Link
              href="/career-atlas/create?story=memory"
              className="mt-auto inline-flex h-10 items-center justify-center rounded-xl border border-line bg-surface-2 text-xs font-bold text-ink transition hover:border-brand/40"
            >
              Build Memory Card →
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Highlights Section */}
      <div className="mt-20 rounded-3xl border border-line bg-surface p-8 sm:p-12 shadow-card">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="text-2xl">⚡</span>
            <h4 className="mt-2 text-base font-bold text-ink">Under 90 Seconds</h4>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              No lengthy resumes or CV parsing. Select your presets and see a live high-definition
              preview instantly.
            </p>
          </div>

          <div>
            <span className="text-2xl">🎨</span>
            <h4 className="mt-2 text-base font-bold text-ink">3 Coordinated Themes</h4>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Midnight (dark tech), Paper (editorial elegance), and Retro (neon cyber terminal)
              curated for every aesthetic.
            </p>
          </div>

          <div>
            <span className="text-2xl">📱</span>
            <h4 className="mt-2 text-base font-bold text-ink">Feed & Story Formats</h4>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Export in crisp 1080×1350 (portrait feed), 1080×1080 (square), or 1080×1920 (story)
              with zero compression loss.
            </p>
          </div>

          <div>
            <span className="text-2xl">🔒</span>
            <h4 className="mt-2 text-base font-bold text-ink">Privacy First</h4>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Creation and PNG downloads happen completely in your browser. Hosted sharing is 100%
              optional and revocable by you.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
