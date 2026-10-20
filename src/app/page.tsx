import { JobFeed } from "@/components/JobFeed";
import { listJobs, trackCounts } from "@/lib/jobs-query";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Every published job stays on the portal, newest first; "today" is a filter, not the default.
  const [jobs, counts] = await Promise.all([listJobs({}), trackCounts({})]);
  return <JobFeed initialJobs={jobs} initialCounts={counts} />;
}
