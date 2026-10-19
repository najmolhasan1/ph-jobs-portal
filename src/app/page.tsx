import { JobFeed } from "@/components/JobFeed";
import { connectDB } from "@/lib/db";
import { listJobs, trackCounts, type JobDTO } from "@/lib/jobs-query";

export const dynamic = "force-dynamic";

export default async function Home() {
  await connectDB();
  const [jobs, counts] = await Promise.all([listJobs({ posted: "today" }), trackCounts({ posted: "today" })]);
  return <JobFeed initialJobs={jobs as JobDTO[]} initialCounts={counts} />;
}
