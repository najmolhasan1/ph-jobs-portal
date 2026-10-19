// Local Postgres without installing anything: the embedded-postgres package ships the
// binaries, and data stays in ./.data/pg between restarts. Production uses Supabase instead.
//   npm run db   → then `npm run db:push` once to create the tables
import { existsSync } from "node:fs";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const databaseDir = path.resolve(".data/pg");
const port = Number(process.env.PG_PORT) || 5432;
const pg = new EmbeddedPostgres({
  databaseDir,
  user: "postgres",
  password: "postgres",
  port,
  persistent: true,
  // On Windows initdb would default to WIN1252, which can't store emoji or Bangla. Supabase is UTF-8.
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  // UTC like Supabase, instead of the machine's local time zone.
  postgresFlags: ["-c", "timezone=UTC"],
});

const fresh = !existsSync(path.join(databaseDir, "PG_VERSION"));
if (fresh) await pg.initialise();
await pg.start();
if (fresh) await pg.createDatabase("ph_jobs");

const url = `postgresql://postgres:postgres@127.0.0.1:${port}/ph_jobs`;
console.log(`Postgres running at ${url}  (data: ${databaseDir})`);
console.log("Set DATABASE_URL and DIRECT_URL to this in .env.local. Ctrl+C to stop.");

const keepAlive = setInterval(() => {}, 60_000); // keep Node (and with it Postgres) running
const stop = async () => {
  clearInterval(keepAlive);
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
