import { NextResponse } from "next/server";
import { apifyConfigured, apifyTokenStatus } from "@/lib/apify";
import { isAuthorized, unauthorized } from "@/lib/auth";
import { Job, Run, Source } from "@/lib/models";
import { llmEnabled } from "@/lib/pipeline/llm";
import { ensureSources } from "@/lib/pipeline/runner";
import { adapters } from "@/lib/sources";
import { startOfTodayDhaka } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isAuthorized(req)) return unauthorized();
  await ensureSources();
  const today = startOfTodayDhaka();
  const [counts, sources, runs, todayBySource] = await Promise.all([
    Job.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    Source.find().sort({ key: 1 }).lean(),
    Run.find().sort({ startedAt: -1 }).limit(30).lean(),
    Job.aggregate<{ _id: string; n: number }>([
      { $match: { status: "approved", postedAt: { $gte: today } } },
      { $unwind: "$sources" },
      { $group: { _id: "$sources.source", n: { $sum: 1 } } },
    ]),
  ]);
  const todayMap = Object.fromEntries(todayBySource.map((c) => [c._id, c.n]));
  return NextResponse.json({
    counts: Object.fromEntries(counts.map((c) => [c._id, c.n])),
    sources: JSON.parse(
      JSON.stringify(
        sources.map((s) => ({ ...s, kind: adapters[s.key].kind, publishedToday: todayMap[s.key] ?? 0 })),
      ),
    ),
    runs: JSON.parse(JSON.stringify(runs)),
    config: { apify: apifyConfigured(), apifyTokens: await apifyTokenStatus(), llm: llmEnabled() },
  });
}
