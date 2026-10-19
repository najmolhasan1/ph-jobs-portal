import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthorized, unauthorized } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isJobId, serializeJob } from "@/lib/jobs-query";
import { JOB_STATUSES } from "@/lib/models";

export const dynamic = "force-dynamic";

const Patch = z.object({
  status: z.enum(JOB_STATUSES).optional(),
  title: z.string().min(2).optional(),
  company: z.string().optional(),
  location: z.string().optional(),
  level: z.string().optional(),
  isRemote: z.boolean().optional(),
  summary: z.string().optional(),
  skills: z.array(z.string()).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!isJobId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const job = await prisma.job.findFirst({ where: { id, status: "approved" }, omit: { fingerprint: true }, include: { sources: true } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ job: serializeJob(job) });
}

/** Moderation: approve / reject / edit. */
export async function PATCH(req: Request, { params }: Ctx) {
  if (!isAuthorized(req)) return unauthorized();
  const { id } = await params;
  if (!isJobId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = Patch.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: body.error.message }, { status: 400 });

  const current = await prisma.job.findUnique({ where: { id }, select: { status: true } });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const publishNow = body.data.status === "approved" && current.status !== "approved";
  const job = await prisma.job.update({
    where: { id },
    data: { ...body.data, ...(publishNow && { publishedAt: new Date() }) },
    omit: { fingerprint: true },
    include: { sources: true },
  });
  return NextResponse.json({ job: serializeJob(job) });
}
