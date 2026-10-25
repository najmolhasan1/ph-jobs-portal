// Preloaded by the worker / backfill / market scripts (node --import) before Prisma starts.
// Some networks block Supabase's transaction pooler port (6543) while the session pooler (5432,
// DIRECT_URL) still works — then the scripts would never reach the database. This checks the
// DATABASE_URL port and, if it's unreachable but DIRECT_URL's is not, switches to DIRECT_URL.
import net from "node:net";

function reachable(url: string | undefined, timeoutMs = 6000): Promise<boolean> {
  if (!url) return Promise.resolve(false);
  let host: string;
  let port: number;
  try {
    const u = new URL(url);
    host = u.hostname;
    port = Number(u.port) || 5432;
  } catch {
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs, () => done(false));
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
  });
}

async function tryTwice(url: string | undefined) {
  return (await reachable(url)) || (await reachable(url));
}

const primary = process.env.DATABASE_URL;
const direct = process.env.DIRECT_URL;
// DB_ROUTE=direct forces the switch. Otherwise switch whenever the primary port is unreachable —
// the direct port isn't pre-tested, since Prisma retries it itself with a longer timeout.
const force = process.env.DB_ROUTE === "direct";
if (primary && direct && primary !== direct && (force || !(await tryTwice(primary)))) {
  const u = new URL(direct);
  // Keep the app's schema and give the worker a few connections on the session pooler.
  const schema = new URL(primary).searchParams.get("schema");
  if (schema && !u.searchParams.has("schema")) u.searchParams.set("schema", schema);
  if (!u.searchParams.has("connection_limit")) u.searchParams.set("connection_limit", "8");
  // Slow links need longer than Prisma's 5 s default to open a connection.
  if (!u.searchParams.has("connect_timeout")) u.searchParams.set("connect_timeout", "30");
  if (!u.searchParams.has("pool_timeout")) u.searchParams.set("pool_timeout", "30");
  process.env.DATABASE_URL = u.toString();
  console.log(`Database: port ${new URL(primary).port} is ${force ? "skipped (DB_ROUTE=direct)" : "blocked on this network"} — using the direct connection (port ${u.port || 5432}) instead.`);
}
