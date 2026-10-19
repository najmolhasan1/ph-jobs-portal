import { NextResponse } from "next/server";
import { isAuthorized, unauthorized } from "@/lib/auth";
import { tick } from "@/lib/pipeline/runner";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Fallback for hosts without a long-running worker (e.g. Vercel Cron every few minutes):
// checks every enabled platform that is due. With `npm run worker` running, this isn't needed.
async function handle(req: Request) {
  if (!isAuthorized(req, { allowCron: true })) return unauthorized();
  return NextResponse.json(await tick());
}

export const GET = handle;
export const POST = handle;
