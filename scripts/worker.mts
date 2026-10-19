// Always-on scraper: keeps one loop per platform running, checking for new posts on each
// platform's interval (BDJobs every 3 min, LinkedIn every 10 min, …) and publishing matches.
//   npm run worker
// In production run it as a long-lived process (PM2, Railway/Render worker, systemd).
import mongoose from "mongoose";
import { runWorkers } from "../src/lib/pipeline/runner";

const controller = new AbortController();
const stop = () => {
  console.log("Stopping worker…");
  controller.abort();
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

console.log("PH Jobs worker started — checking each enabled platform continuously. Ctrl+C to stop.");
await runWorkers(controller.signal);
await mongoose.disconnect();
