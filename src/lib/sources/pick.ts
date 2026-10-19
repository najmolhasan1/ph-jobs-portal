// Actor output schemas aren't published and drift between versions, so adapters
// read fields defensively: try several candidate paths, take the first usable value.

type Raw = Record<string, unknown>;

function get(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const part of path.split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Raw)[part];
  }
  return cur;
}

export function pickStr(raw: Raw, ...paths: string[]): string | undefined {
  for (const p of paths) {
    const v = get(raw, p);
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
    if (Array.isArray(v) && v.length && v.every((x) => typeof x === "string")) return v.join(", ");
  }
  return undefined;
}

export function pickBool(raw: Raw, ...paths: string[]): boolean | undefined {
  for (const p of paths) {
    const v = get(raw, p);
    if (typeof v === "boolean") return v;
  }
  return undefined;
}

export function pickDate(raw: Raw, ...paths: string[]): Date | undefined {
  for (const p of paths) {
    const v = get(raw, p);
    if (v == null || v === "") continue;
    const d =
      typeof v === "number"
        ? new Date(v < 1e12 ? v * 1000 : v) // seconds or ms
        : new Date(String(v));
    if (!Number.isNaN(d.getTime())) return d;
    const rel = typeof v === "string" ? parseRelative(v) : undefined;
    if (rel) return rel;
  }
  return undefined;
}

export function pickList(raw: Raw, ...paths: string[]): string[] | undefined {
  for (const p of paths) {
    const v = get(raw, p);
    if (Array.isArray(v)) {
      const out = v
        .map((x) => (typeof x === "string" ? x : (x as Raw)?.name ?? (x as Raw)?.label))
        .filter((x): x is string => typeof x === "string" && x.trim() !== "")
        .map((x) => x.trim());
      if (out.length) return out;
    }
    if (typeof v === "string" && v.includes(",")) {
      return v.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return undefined;
}

/** "3 hours ago", "2 days ago", "1 week ago" → Date */
function parseRelative(s: string): Date | undefined {
  const m = s.toLowerCase().match(/(\d+)\s*(minute|min|hour|hr|day|week|month)s?\s*ago/);
  if (!m) return undefined;
  const n = Number(m[1]);
  const unitMs: Record<string, number> = {
    minute: 6e4, min: 6e4, hour: 36e5, hr: 36e5, day: 864e5, week: 6048e5, month: 2592e6,
  };
  return new Date(Date.now() - n * unitMs[m[2]]);
}

export function stripHtml(s?: string): string | undefined {
  if (!s) return s;
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|div|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
