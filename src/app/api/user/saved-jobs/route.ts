import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isJobId, serializeJob } from "@/lib/jobs-query";
import { getCurrentUser } from "@/lib/user-auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized", jobs: [], jobIds: [] }, { status: 401 });
    }

    const savedRecords = await prisma.savedJob.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        job: {
          include: { sources: true },
        },
      },
    });

    const jobs = savedRecords.map((r) => ({
      ...serializeJob(r.job),
      savedAt: r.createdAt.toISOString(),
    }));
    const jobIds = savedRecords.map((r) => r.jobId);

    return NextResponse.json({ ok: true, jobs, jobIds });
  } catch (err) {
    console.error("GET saved jobs error:", err);
    return NextResponse.json({ error: "Failed to fetch saved jobs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Please log in to save jobs." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { jobId, action } = body;

    if (!jobId || !isJobId(jobId)) {
      return NextResponse.json({ error: "Invalid jobId" }, { status: 400 });
    }

    const existing = await prisma.savedJob.findUnique({
      where: { userId_jobId: { userId: user.id, jobId } },
    });

    if (action === "save" || (!action && !existing)) {
      await prisma.savedJob.upsert({
        where: { userId_jobId: { userId: user.id, jobId } },
        create: { userId: user.id, jobId },
        update: {},
      });
      return NextResponse.json({ ok: true, saved: true, jobId });
    } else {
      if (existing) {
        await prisma.savedJob.delete({
          where: { userId_jobId: { userId: user.id, jobId } },
        });
      }
      return NextResponse.json({ ok: true, saved: false, jobId });
    }
  } catch (err) {
    console.error("POST saved jobs error:", err);
    return NextResponse.json({ error: "Failed to update saved job" }, { status: 500 });
  }
}
