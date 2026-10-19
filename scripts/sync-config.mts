// Reset platforms' live settings (Admin → Platforms → Settings JSON) to the defaults in code,
// e.g. after changing search keywords. On/off state and interval are kept.
//   npm run sync-config                 → every platform
//   npm run sync-config -- linkedin reddit
import mongoose from "mongoose";
import { Source, SOURCE_KEYS, type SourceKey } from "../src/lib/models";
import { ensureSources } from "../src/lib/pipeline/runner";
import { adapters } from "../src/lib/sources";

await ensureSources();
const keys = (process.argv.slice(2).length ? process.argv.slice(2) : SOURCE_KEYS) as SourceKey[];
for (const key of keys) {
  if (!SOURCE_KEYS.includes(key)) throw new Error(`Unknown source ${key}`);
  await Source.updateOne({ key }, { $set: { config: adapters[key].defaultConfig } });
  console.log(`${key.padEnd(17)} settings reset to code defaults`);
}
await mongoose.disconnect();
