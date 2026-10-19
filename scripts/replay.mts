// Re-run stored actor output through the pipeline — handy after tweaking an adapter or the rules.
//   npm run replay -- <source> <apifyDatasetId>   (needs APIFY_TOKEN)
//   npm run replay -- <source> ./items.json       (array of raw items)
import { readFileSync } from "node:fs";
import { ApifyClient } from "apify-client";
import { prisma } from "../src/lib/db";
import { SOURCE_KEYS, type SourceKey } from "../src/lib/models";
import { processItems } from "../src/lib/pipeline/process";
import { adapters } from "../src/lib/sources";

const [source, from] = process.argv.slice(2) as [SourceKey, string];
if (!SOURCE_KEYS.includes(source) || !from) {
  console.error(`Usage: npm run replay -- <${SOURCE_KEYS.join("|")}> <datasetId | file.json>`);
  process.exit(1);
}

const items: Record<string, unknown>[] = from.endsWith(".json")
  ? JSON.parse(readFileSync(from, "utf8"))
  : ((await new ApifyClient({ token: process.env.APIFY_TOKEN }).dataset(from).listItems({ clean: true })).items as Record<string, unknown>[]);

for (const raw of items) {
  const n = adapters[source].normalize(raw);
  console.log(n ? `• ${n.title} | ${n.company ?? "-"} | ${n.location ?? "-"} | ${n.postedAt?.toISOString().slice(0, 10) ?? "-"}` : "• (skipped — no title)");
}

console.log(await processItems(source, items, `replay:${from}`));
await prisma.$disconnect();
