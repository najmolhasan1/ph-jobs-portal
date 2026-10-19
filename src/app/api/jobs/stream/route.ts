import { connectDB } from "@/lib/db";
import { buildQuery, filtersFromParams, serializeJob } from "@/lib/jobs-query";
import { Job } from "@/lib/models";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const POLL_MS = 5_000;

// Server-Sent Events: pushes newly published jobs matching the viewer's filters.
// Polling the DB by publishedAt works across any number of server instances.
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const filters = filtersFromParams(sp);
  delete filters.status; // public stream: approved only
  delete filters.posted; // anything published from now on is new
  let since = new Date(sp.get("since") ?? Date.now());
  if (Number.isNaN(since.getTime())) since = new Date();

  await connectDB();
  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      send("ready", { since });

      const poll = async () => {
        try {
          const jobs = await Job.find({ ...buildQuery(filters), publishedAt: { $gt: since } })
            .sort({ publishedAt: 1 })
            .limit(50)
            .select("-description -fingerprint -__v")
            .lean();
          if (jobs.length) {
            since = jobs[jobs.length - 1].publishedAt as Date;
            send("jobs", jobs.map(serializeJob));
          } else {
            controller.enqueue(encoder.encode(": ping\n\n")); // keep proxies from closing the connection
          }
        } catch (e) {
          send("error", { message: String(e) });
        }
      };
      timer = setInterval(poll, POLL_MS);
      req.signal.addEventListener("abort", () => {
        clearInterval(timer);
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
