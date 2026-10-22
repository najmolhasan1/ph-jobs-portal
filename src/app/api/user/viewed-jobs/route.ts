import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isJobId, serializeJob } from "@/lib/jobs-query";
import { getCurrentUser } from "@/lib/user-auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized", jobs: [] }, { status: 401 });
    }

    const records = await prisma.viewedJob.findMany({
      where: { userId: user.id },
      orderBy: { viewedAt: "desc" },
      take: 60,
      include: {
        job: {
          include: { sources: true },
        },
      },
    });

    const jobs = records.map((r) => ({
      ...serializeJob(r.job),
      viewedAt: r.viewedAt.toISOString(),
    }));

    return NextResponse.json({ ok: true, jobs });
  } catch (err) {
    console.error("GET viewed jobs error:", err);
    return NextResponse.json({ error: "Failed to fetch viewed jobs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: true, guest: true });
    }

    const body = await req.json().catch(() => ({}));
    const { jobId } = body;

    if (!jobId || !isJobId(jobId)) {
      return NextResponse.json({ error: "Invalid jobId" }, { status: 400 });
    }

    await prisma.viewedJob.upsert({
      where: { userId_jobId: { userId: user.id, jobId } },
      create: { userId: user.id, jobId, viewedAt: new Date() },
      update: { viewedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST viewed jobs error:", err);
    return NextResponse.json({ error: "Failed to record view" }, { status: 500 });
  }
}
