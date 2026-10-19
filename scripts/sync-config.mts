// Reset platforms' live settings (Admin → Platforms → Settings JSON) to the defaults in code,
// e.g. after changing search keywords. On/off state and interval are kept.
//   npm run sync-config                 → every platform
//   npm run sync-config -- linkedin reddit
import { prisma } from "../src/lib/db";
import type { Prisma } from "@prisma/client";
import { SOURCE_KEYS, type SourceKey } from "../src/lib/models";
import { ensureSources } from "../src/lib/pipeline/runner";
import { adapters } from "../src/lib/sources";

await ensureSources();
const keys = (process.argv.slice(2).length ? process.argv.slice(2) : SOURCE_KEYS) as SourceKey[];
for (const key of keys) {
  if (!SOURCE_KEYS.includes(key)) throw new Error(`Unknown source ${key}`);
  await prisma.source.update({ where: { key }, data: { config: adapters[key].defaultConfig as Prisma.InputJsonValue } });
  console.log(`${key.padEnd(17)} settings reset to code defaults`);
}
await prisma.$disconnect();
