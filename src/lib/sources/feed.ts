// Helpers for RSS / Atom feeds and free-text remote regions.

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1));
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** Inner XML of every <tag>…</tag> block (e.g. each <item> of an RSS feed, each <entry> of Atom). */
export function xmlBlocks(xml: string, tag: string): string[] {
  return [...xml.matchAll(new RegExp(`<${tag}[\\s>][\\s\\S]*?<\\/${tag}>`, "gi"))].map((m) => m[0]);
}

/** Text of the first <tag>…</tag> in a block, with CDATA unwrapped and entities decoded. */
export function xmlText(block: string, tag: string): string | undefined {
  const m = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (!m) return undefined;
  const inner = m[1].replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1").trim();
  return inner ? decodeEntities(inner) : undefined;
}

/** An attribute of the first <tag …> in a block, e.g. Atom's <link href="…">. */
export function xmlAttr(block: string, tag: string, attr: string): string | undefined {
  const m = block.match(new RegExp(`<${tag}\\s[^>]*${attr}="([^"]*)"`, "i"));
  return m ? decodeEntities(m[1]) : undefined;
}

/**
 * Regions a remote job is limited to, from free text like "Europe, LATAM, APAC" or "USA only".
 * Empty = open worldwide ("Anywhere in the World", "Worldwide", "Remote").
 */
export function regionList(text?: string | null): string[] {
  const t = (text ?? "").replace(/\b(only|remote|home based|home-based|-)\b/gi, " ").trim();
  if (!t || /anywhere|worldwide|global|world\b/i.test(t)) return [];
  return t
    .split(/\s*(?:,|;|\/|\||\band\b|&)\s*/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}
