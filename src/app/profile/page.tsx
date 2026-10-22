import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileView, type ActivityJobItem } from "@/components/ProfileView";
import { prisma } from "@/lib/db";
import { serializeJob } from "@/lib/jobs-query";
import { getCurrentUser } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Profile & Saved Jobs — Career Radar",
  description: "Manage your saved jobs, viewed history, and applications.",
};

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?redirect=/profile");
  }

  const [savedRecords, appliedRecords, viewedRecords] = await Promise.all([
    prisma.savedJob.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        job: {
          include: { sources: true },
        },
      },
    }),
    prisma.appliedJob.findMany({
      where: { userId: user.id },
      orderBy: { appliedAt: "desc" },
      take: 60,
      include: {
        job: {
          include: { sources: true },
        },
      },
    }),
    prisma.viewedJob.findMany({
      where: { userId: user.id },
      orderBy: { viewedAt: "desc" },
      take: 60,
      include: {
        job: {
          include: { sources: true },
        },
      },
    }),
  ]);

  const initialSaved: ActivityJobItem[] = savedRecords
    .filter((r) => r.job)
    .map((r) => ({
      job: serializeJob(r.job),
      timestamp: r.createdAt.toISOString(),
    }));

  const initialApplied: ActivityJobItem[] = appliedRecords
    .filter((r) => r.job)
    .map((r) => ({
      job: serializeJob(r.job),
      timestamp: r.appliedAt.toISOString(),
    }));

  const initialViewed: ActivityJobItem[] = viewedRecords
    .filter((r) => r.job)
    .map((r) => ({
      job: serializeJob(r.job),
      timestamp: r.viewedAt.toISOString(),
    }));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <ProfileView
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt?.toISOString(),
        }}
        initialSaved={initialSaved}
        initialApplied={initialApplied}
        initialViewed={initialViewed}
      />
    </main>
  );
}
