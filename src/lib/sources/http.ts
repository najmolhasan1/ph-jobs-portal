// Small helpers for "direct" sources that read a site's public JSON / page data.

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";

export async function fetchText(url: string, headers: Record<string, string> = {}): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9", ...headers },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`${new URL(url).host} HTTP ${res.status}`);
  return res.text();
}

export async function fetchJson<T = unknown>(url: string, headers: Record<string, string> = {}): Promise<T> {
  return JSON.parse(await fetchText(url, { Accept: "application/json", ...headers })) as T;
}

/** `props.pageProps` from a Next.js (pages router) page. Throws if the page has none (e.g. a bot check). */
export function nextPageProps<T = Record<string, unknown>>(html: string, host: string): T {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error(`${host}: page data missing (possibly a bot check) — will retry next round`);
  return JSON.parse(m[1]).props.pageProps as T;
}

/** All schema.org JSON-LD objects on a page. */
export function jsonLd(html: string): Record<string, unknown>[] {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap((m) => {
    try {
      const v = JSON.parse(m[1]);
      return Array.isArray(v) ? v : [v];
    } catch {
      return [];
    }
  });
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Run `fn` for each item; one failing search (bot check, timeout) doesn't sink the rest.
 * Throws only when every item failed, so a broken platform still shows up as an error.
 */
export async function eachTolerant<T>(items: T[], fn: (item: T) => Promise<void>, delayMs = 0): Promise<void> {
  let failed = 0;
  let lastError: unknown;
  for (const item of items) {
    try {
      await fn(item);
    } catch (e) {
      failed++;
      lastError = e;
    }
    if (delayMs) await sleep(delayMs);
  }
  if (items.length && failed === items.length) throw lastError;
}
