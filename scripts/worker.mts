// Always-on scraper: keeps one loop per platform running, checking for new posts on each
// platform's interval (BDJobs every 3 min, LinkedIn every 10 min, …) and publishing matches.
//   npm run worker
// In production run it as a long-lived process (PM2, Railway/Render worker, systemd).
import { prisma } from "../src/lib/db";
import { runWorkers } from "../src/lib/pipeline/runner";

const controller = new AbortController();
const stop = () => {
  console.log("Stopping worker…");
  controller.abort();
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

console.log("PH Jobs worker started — checking each enabled platform continuously. Ctrl+C to stop.");
// If the database can't be reached at startup (flaky network, database waking up), keep trying
// instead of exiting. Another running worker is a real reason to stop.
while (!controller.signal.aborted) {
  try {
    await runWorkers(controller.signal);
    break;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("Another worker")) throw e;
    console.error(`Can't start yet (${msg.split("\n").filter(Boolean).pop()}) — retrying in 30 s`);
    await new Promise((r) => setTimeout(r, 30_000));
  }
}
await prisma.$disconnect();
