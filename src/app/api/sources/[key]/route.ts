import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthorized, unauthorized } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Source, SOURCE_KEYS } from "@/lib/models";

export const dynamic = "force-dynamic";

const Patch = z.object({
  enabled: z.boolean().optional(),
  intervalMinutes: z.number().min(1).max(24 * 60).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ key: string }> }) {
  if (!isAuthorized(req)) return unauthorized();
  const { key } = await params;
  if (!SOURCE_KEYS.includes(key as never)) return NextResponse.json({ error: "Unknown source" }, { status: 404 });
  const body = Patch.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: body.error.message }, { status: 400 });

  await connectDB();
  // Changing the interval reschedules the next check right away.
  const set: Record<string, unknown> = { ...body.data };
  if (body.data.intervalMinutes || body.data.enabled) set.nextCheckAt = new Date();
  const source = await Source.findOneAndUpdate({ key }, { $set: set }, { new: true }).lean();
  return NextResponse.json({ source: JSON.parse(JSON.stringify(source)) });
}
