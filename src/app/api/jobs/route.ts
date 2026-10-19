import { NextResponse } from "next/server";
import { isAuthorized, unauthorized } from "@/lib/auth";
import { filtersFromParams, listJobs } from "@/lib/jobs-query";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const filters = filtersFromParams(new URL(req.url).searchParams);
  // Only moderators may browse pending/rejected jobs.
  if (filters.status && filters.status !== "approved" && !isAuthorized(req)) return unauthorized();
  return NextResponse.json({ jobs: await listJobs(filters) });
}
