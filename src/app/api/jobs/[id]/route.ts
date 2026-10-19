import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthorized, unauthorized } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { serializeJob } from "@/lib/jobs-query";
import { Job, JOB_STATUSES } from "@/lib/models";

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
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await connectDB();
  const job = await Job.findOne({ _id: id, status: "approved" }).select("-fingerprint -__v").lean();
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ job: serializeJob(job) });
}

/** Moderation: approve / reject / edit. */
export async function PATCH(req: Request, { params }: Ctx) {
  if (!isAuthorized(req)) return unauthorized();
  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = Patch.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: body.error.message }, { status: 400 });

  await connectDB();
  const job = await Job.findById(id);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (body.data.status === "approved" && job.status !== "approved") job.publishedAt = new Date();
  job.set(body.data);
  await job.save();
  return NextResponse.json({ job: serializeJob(job.toObject()) });
}
