import { JobFeed } from "@/components/JobFeed";
import { countJobs, listJobs, trackCounts } from "@/lib/jobs-query";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Every published job stays on the portal, newest first; "today" is a filter, not the default.
  const [jobs, counts, today] = await Promise.all([listJobs({}), trackCounts({}), countJobs({ posted: "today" })]);
  return <JobFeed initialJobs={jobs} initialCounts={counts} initialToday={today} />;
}
