// Run one check right now, without the always-on worker.
//   npm run check            → every enabled platform
//   npm run check -- bdjobs  → one platform
import mongoose from "mongoose";
import { Source, SOURCE_KEYS, type SourceKey } from "../src/lib/models";
import { ensureSources, runCheck } from "../src/lib/pipeline/runner";

await ensureSources();
const only = process.argv[2] as SourceKey | undefined;
const keys = only ? [only] : ((await Source.find({ enabled: true }).lean()).map((s) => s.key) as SourceKey[]);
for (const key of keys) {
  if (!SOURCE_KEYS.includes(key)) throw new Error(`Unknown source ${key}`);
  try {
    console.log(key.padEnd(9), (await runCheck(key)) ?? "already being checked");
  } catch (e) {
    console.log(key.padEnd(9), "FAILED:", e instanceof Error ? e.message : e);
  }
}
await mongoose.disconnect();
