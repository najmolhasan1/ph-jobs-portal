import { NextResponse } from "next/server";
import { filtersFromParams, trackCounts } from "@/lib/jobs-query";

export const dynamic = "force-dynamic";

/** Live job counts per Programming Hero track, for the mode cards. */
export async function GET(req: Request) {
  const filters = filtersFromParams(new URL(req.url).searchParams);
  delete filters.status; // public: approved only
  return NextResponse.json({ counts: await trackCounts(filters) });
}
