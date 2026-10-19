import { NextResponse } from "next/server";
import { isAuthorized, unauthorized } from "@/lib/auth";
import { SOURCE_KEYS, type SourceKey } from "@/lib/models";
import { ensureSources, runCheck } from "@/lib/pipeline/runner";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** "Check now" for one platform, from the admin page. Waits for the check to finish. */
export async function POST(req: Request) {
  if (!isAuthorized(req)) return unauthorized();
  const key = new URL(req.url).searchParams.get("source") as SourceKey;
  if (!SOURCE_KEYS.includes(key)) return NextResponse.json({ error: "Unknown source" }, { status: 400 });
  await ensureSources();
  try {
    const stats = await runCheck(key);
    return NextResponse.json({ stats, busy: stats === null });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
