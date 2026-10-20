import { prisma } from "@/lib/db";
import { buildWhere, filtersFromParams, LIST_SELECT, serializeJob } from "@/lib/jobs-query";

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

  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;
  let closed = false;
  const stop = () => {
    closed = true;
    clearInterval(timer);
  };

  const stream = new ReadableStream({
    start(controller) {
      // The viewer may leave while a poll is still waiting on the database: never write after that.
      const write = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          stop();
        }
      };
      const send = (event: string, data: unknown) => write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      send("ready", { since });

      const poll = async () => {
        if (closed) return;
        try {
          const jobs = await prisma.job.findMany({
            where: { AND: [buildWhere(filters), { publishedAt: { gt: since } }] },
            orderBy: { publishedAt: "asc" },
            take: 50,
            ...LIST_SELECT,
          });
          if (jobs.length) {
            since = jobs[jobs.length - 1].publishedAt!;
            send("jobs", jobs.map(serializeJob));
          } else {
            write(": ping\n\n"); // keep proxies from closing the connection
          }
        } catch {
          write(": db busy\n\n"); // a slow or dropped database connection — the next poll retries
        }
      };
      timer = setInterval(poll, POLL_MS);
      req.signal.addEventListener("abort", () => {
        stop();
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      stop();
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
