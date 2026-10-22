import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, BriefcaseIcon, CalendarIcon, CashIcon, ClockIcon, GlobeIcon, PinIcon } from "@/components/icons";
import { CompanyAvatar } from "@/components/JobCard";
import { ApplyButton } from "@/components/ApplyButton";
import { SaveJobButton } from "@/components/SaveJobButton";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user-auth";
import { experienceLabel, formatDate, jobTypeLabel, levelLabel, SOURCE_LABELS, timeAgo } from "@/lib/format";
import { isJobId, serializeJob, type JobDTO } from "@/lib/jobs-query";
import { TRACK_META, type TrackKey } from "@/lib/tracks";

export const dynamic = "force-dynamic";

async function getJob(id: string): Promise<JobDTO | null> {
  if (!isJobId(id)) return null;
  const job = await prisma.job.findFirst({
    where: { id, status: { in: ["approved", "expired"] } },
    omit: { fingerprint: true },
    include: { sources: true },
  });
  return job ? serializeJob(job) : null;
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const job = await getJob((await params).id);
  return job ? { title: `${job.title}${job.company ? ` at ${job.company}` : ""} — Career Radar` } : {};
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs font-medium text-faint">{label}</dt>
        <dd className="text-sm font-bold">{value || "Not specified"}</dd>
      </div>
    </div>
  );
}

/** Turn scraped plain text into readable paragraphs and bullet lists. */
function Description({ text }: { text: string }) {
  const blocks = text
    .replace(/\r/g, "")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  return (
    <div className="space-y-4 text-[15px] leading-relaxed text-muted">
      {blocks.map((block, i) => {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        const bullets = lines.filter((l) => /^[-•*●▪◦]\s+/.test(l));
        if (bullets.length >= 2 && bullets.length === lines.length) {
          return (
            <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-brand">
              {lines.map((l, j) => <li key={j}>{l.replace(/^[-•*●▪◦]\s+/, "")}</li>)}
            </ul>
          );
        }
        // Short single lines ending with ":" (or very short) read as section headings.
        if (lines.length === 1 && lines[0].length < 60 && (/:$/.test(lines[0]) || !/[.!?]$/.test(lines[0]))) {
          return <h3 key={i} className="pt-2 text-[15px] font-bold text-ink">{lines[0].replace(/:$/, "")}</h3>;
        }
        return <p key={i} className="whitespace-pre-line break-words">{block}</p>;
      })}
    </div>
  );
}

export default async function JobPage({ params }: Props) {
  const job = await getJob((await params).id);
  if (!job) notFound();

  // Record user view history if user is logged in
  const user = await getCurrentUser().catch(() => null);
  if (user) {
    await prisma.viewedJob.upsert({
      where: { userId_jobId: { userId: user.id, jobId: job.id } },
      create: { userId: user.id, jobId: job.id, viewedAt: new Date() },
      update: { viewedAt: new Date() },
    }).catch(() => {});
  }

  const primary = job.sources[0];
  const tracks = (job.tracks ?? []) as TrackKey[];
  const desc = job.description && job.description.length > 6000 ? `${job.description.slice(0, 6000)}…` : job.description;

  return (
    <div className="pt-6 sm:pt-8">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft className="size-4" /> Back to opportunities
      </Link>

      {job.status === "expired" && (
        <div className="mt-4 rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
          This job has expired or its deadline has passed.
        </div>
      )}

      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Main column */}
        <article className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8">
          <CompanyAvatar name={job.company} size="lg" />
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-faint">{job.company ?? "Company not listed"}</p>
          <h1 className="mt-1.5 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{job.title}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted">
            <span className="flex items-center gap-1.5">
              <PinIcon className="size-4 text-faint" />
              {job.location ?? (job.isRemote ? "Anywhere" : "Location not stated")}
            </span>
            {(job.isRemote || job.location) && (
              <>
                <span className="text-faint">·</span>
                <span className={job.isRemote ? "font-semibold text-ok" : ""}>{job.isRemote ? "Remote" : "Onsite"}</span>
              </>
            )}
            {jobTypeLabel(job.jobType) && (
              <>
                <span className="text-faint">·</span>
                <span className="flex items-center gap-1.5">
                  <BriefcaseIcon className="size-4 text-faint" />
                  {jobTypeLabel(job.jobType)}
                </span>
              </>
            )}
          </div>

          {(job.skills.length > 0 || tracks.length > 0) && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {tracks.map((t) => (
                <span key={t} className="rounded-lg bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand">
                  {TRACK_META[t]?.label}
                </span>
              ))}
              {job.skills.map((s) => (
                <span key={s} className="rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">
                  {s}
                </span>
              ))}
            </div>
          )}

          <hr className="my-6 border-line" />

          <h2 className="text-lg font-extrabold tracking-tight">About this opportunity</h2>
          <div className="mt-4">
            {desc ? <Description text={desc} /> : <p className="text-sm text-muted">The full description is on the original posting.</p>}
          </div>

          <hr className="my-6 border-line" />

          <h2 className="text-base font-extrabold tracking-tight">Source information</h2>
          <p className="mt-1 text-sm text-muted">
            Collected from the sources below. Applications are handled by the original employer or platform.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {job.sources.map((s, i) => (
              <li key={i}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-brand hover:border-brand"
                >
                  {SOURCE_LABELS[s.source] ?? s.source}
                  {tracks[0] && <span className="text-faint">· {TRACK_META[tracks[0]]?.tag}</span>}
                  <ArrowUpRight className="size-3.5" />
                </a>
              </li>
            ))}
          </ul>
        </article>

        {/* Side panel */}
        <aside className="rounded-2xl border border-line bg-surface p-6 shadow-card lg:sticky lg:top-24">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-extrabold">A little more about the role</h2>
            <SaveJobButton jobId={job.id} />
          </div>
          <dl className="mt-5 space-y-4">
            <Fact icon={<BriefcaseIcon className="size-4" />} label="Experience" value={experienceLabel(job.experience, job.level) ?? levelLabel(job.level)} />
            <Fact icon={<CashIcon className="size-4" />} label="Salary" value={job.salary ?? "Not disclosed"} />
            <Fact icon={<GlobeIcon className="size-4" />} label="Work preference" value={job.isRemote ? "Remote" : job.location ? "Onsite" : undefined} />
            <Fact icon={<ClockIcon className="size-4" />} label="Posted" value={job.postedAt ? `${formatDate(job.postedAt)} · ${timeAgo(job.postedAt)}` : undefined} />
            <Fact icon={<CalendarIcon className="size-4" />} label="Listing expires" value={formatDate(job.deadline) || undefined} />
          </dl>
          {job.applyUrl && (
            <ApplyButton jobId={job.id} applyUrl={job.applyUrl} sourceName={SOURCE_LABELS[primary?.source]} />
          )}
          <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-faint">
            <ClockIcon className="mt-0.5 size-3.5 shrink-0" />
            Check the original listing for availability and the application deadline.
          </p>
        </aside>
      </div>
    </div>
  );
}
