import { JobFeed } from "@/components/JobFeed";
import { listJobs, trackCounts } from "@/lib/jobs-query";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [jobs, counts] = await Promise.all([listJobs({ posted: "today" }), trackCounts({ posted: "today" })]);
  return <JobFeed initialJobs={jobs} initialCounts={counts} />;
}
