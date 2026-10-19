import { NextResponse } from "next/server";
import { apifyConfigured, apifyTokenStatus } from "@/lib/apify";
import { isAuthorized, unauthorized } from "@/lib/auth";
import { prisma } from "@/lib/db";
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
    prisma.job.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.source.findMany({ orderBy: { key: "asc" } }),
    prisma.run.findMany({ orderBy: { startedAt: "desc" }, take: 30 }),
    prisma.jobSource.groupBy({
      by: ["source"],
      where: { job: { status: "approved", postedAt: { gte: today } } },
      _count: { _all: true },
    }),
  ]);
  const todayMap = Object.fromEntries(todayBySource.map((c) => [c.source, c._count._all]));
  return NextResponse.json({
    counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])),
    sources: JSON.parse(
      JSON.stringify(
        sources
          .filter((s) => s.key in adapters)
          .map((s) => ({ ...s, kind: adapters[s.key as keyof typeof adapters].kind, publishedToday: todayMap[s.key] ?? 0 })),
      ),
    ),
    runs: JSON.parse(JSON.stringify(runs)),
    config: { apify: apifyConfigured(), apifyTokens: await apifyTokenStatus(), llm: llmEnabled() },
  });
}
