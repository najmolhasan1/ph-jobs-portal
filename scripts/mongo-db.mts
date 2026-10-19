// Legacy local MongoDB (the project used it before Postgres). Only needed to read old data
// for `npm run migrate:mongo`. Downloads a mongod binary once and
// keeps data in ./.data/db between restarts.
import { mkdirSync } from "node:fs";
import path from "node:path";
import { MongoMemoryServer } from "mongodb-memory-server";

const dbPath = path.resolve(".data/db");
mkdirSync(dbPath, { recursive: true });

const server = await MongoMemoryServer.create({
  instance: { port: 27017, dbPath, storageEngine: "wiredTiger" },
});
console.log(`MongoDB running at ${server.getUri()}  (data: ${dbPath})`);
console.log("Set MONGODB_URI=mongodb://127.0.0.1:27017/ph-jobs in .env.local. Ctrl+C to stop.");

const stop = async () => {
  clearInterval(keepAlive);
  await server.stop({ doCleanup: false });
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

// The mongod child handle doesn't keep Node's event loop busy, so without this the script
// eventually exits on its own (code 0) and takes the database down with it.
const keepAlive = setInterval(() => {}, 60_000);
