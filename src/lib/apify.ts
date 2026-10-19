import { ApifyClient } from "apify-client";
import type { RawItem } from "@/lib/sources/types";

// Several Apify tokens can be configured (APIFY_TOKENS="a,b,c", plus legacy APIFY_TOKEN).
// Runs use the first token that still has credit; when Apify says a token's monthly credit is
// used up, it is parked for a few hours and the next one takes over — no platform pauses.

const PARK_MS = 6 * 3600_000;
const CREDIT_ERROR = /usage|billing|upgrad|limit exceeded|isn't enough|insufficient/i;

interface Slot {
  token: string;
  client: ApifyClient;
  exhaustedUntil: number;
  lastError?: string;
}

let slots: Slot[] | null = null;

function getSlots(): Slot[] {
  if (slots) return slots;
  const tokens = [
    ...(process.env.APIFY_TOKENS ?? "").split(","),
    process.env.APIFY_TOKEN ?? "",
  ]
    .map((t) => t.trim())
    .filter(Boolean);
  slots = [...new Set(tokens)].map((token) => ({ token, client: new ApifyClient({ token }), exhaustedUntil: 0 }));
  return slots;
}

export function apifyConfigured(): boolean {
  return getSlots().length > 0;
}

// Remaining monthly credit per token, from Apify's limits endpoint (cached a few minutes).
const creditCache = new Map<string, { at: number; leftUsd: number | null }>();
const MIN_LEFT_USD = 0.05;

async function creditLeft(slot: Slot): Promise<number | null> {
  const hit = creditCache.get(slot.token);
  if (hit && Date.now() - hit.at < 5 * 60_000) return hit.leftUsd;
  let leftUsd: number | null = null;
  try {
    const res = await fetch("https://api.apify.com/v2/users/me/limits", {
      headers: { Authorization: `Bearer ${slot.token}` },
      signal: AbortSignal.timeout(15_000),
    });
    const d = ((await res.json()) as { data?: { current?: { monthlyUsageUsd?: number }; limits?: { maxMonthlyUsageUsd?: number } } }).data;
    const used = d?.current?.monthlyUsageUsd;
    const max = d?.limits?.maxMonthlyUsageUsd;
    if (typeof used === "number" && typeof max === "number") leftUsd = max - used;
  } catch {
    // unknown → don't block the token; a real credit error will park it
  }
  creditCache.set(slot.token, { at: Date.now(), leftUsd });
  return leftUsd;
}

/** Masked per-token status (remaining credit) for the admin page. */
export async function apifyTokenStatus() {
  return Promise.all(
    getSlots().map(async (s, i) => {
      const left = await creditLeft(s);
      return {
        name: `Token ${i + 1} (…${s.token.slice(-4)})`,
        creditLeftUsd: left === null ? null : Math.max(0, Number(left.toFixed(2))),
        available: left === null || left >= MIN_LEFT_USD,
      };
    }),
  );
}

function isCreditError(e: unknown): boolean {
  const err = e as { statusCode?: number; message?: string; type?: string };
  return err.statusCode === 402 || CREDIT_ERROR.test(`${err.type ?? ""} ${err.message ?? ""}`);
}

async function runWith(slot: Slot, actorId: string, input: Record<string, unknown>, timeoutSecs: number): Promise<RawItem[]> {
  // log: null → don't stream the actor's own logs into our worker output.
  const run = await slot.client.actor(actorId).call(input, { waitSecs: timeoutSecs, timeout: timeoutSecs, log: null });
  if (run.status !== "SUCCEEDED") throw new Error(`Apify ${actorId} run ${run.id} ended ${run.status}`);
  const items: RawItem[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = await slot.client.dataset(run.defaultDatasetId).listItems({ offset, limit: 500, clean: true });
    items.push(...(page.items as RawItem[]));
    if (page.items.length < 500) break;
  }
  return items;
}

/** Run an actor, wait for it to finish (up to `timeoutSecs`) and return its dataset items. */
export async function runActor(actorId: string, input: Record<string, unknown>, timeoutSecs = 600): Promise<RawItem[]> {
  const all = getSlots();
  if (!all.length) throw new Error("No Apify token set (APIFY_TOKENS or APIFY_TOKEN in .env.local)");
  let lastCreditError: unknown;
  for (const slot of all) {
    if (slot.exhaustedUntil > Date.now()) continue;
    const left = await creditLeft(slot);
    if (left !== null && left < MIN_LEFT_USD) {
      slot.exhaustedUntil = Date.now() + PARK_MS; // skip without even trying
      continue;
    }
    try {
      const items = await runWith(slot, actorId, input, timeoutSecs);
      slot.lastError = undefined;
      return items;
    } catch (e) {
      if (!isCreditError(e)) throw e;
      slot.exhaustedUntil = Date.now() + PARK_MS;
      slot.lastError = e instanceof Error ? e.message : String(e);
      lastCreditError = e;
      console.warn(`[apify] token …${slot.token.slice(-4)} is out of credit — switching to the next token`);
    }
  }
  const msg = lastCreditError instanceof Error ? lastCreditError.message : "";
  throw new Error(`All ${all.length} Apify tokens are out of credit for this billing cycle. ${msg}`.trim());
}
