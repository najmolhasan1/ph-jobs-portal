// Salary from a job's free text, for posts whose board gives no salary field.
//   "Salary Range: BDT 50,000 – 55,000 per month" → "BDT 50,000 – 55,000 per month"
//   "Salary: 60,000/- to 70,000/- BDT per month"  → "60,000/- to 70,000/- BDT per month"
//   "💰 CAD $1,500–1,800/month"                    → "CAD $1,500–1,800/month"
//   "SALARY: Negotiable based on experience"       → "Negotiable"

const CUR = String.raw`(?:৳|টাকা|bdt|tk\.?|taka|usd|us\$|cad\s?\$?|aud\s?\$?|eur|€|£|gbp|inr|₹|rs\.?|jpy|¥|\$)`;
const NUM = String.raw`(?:\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s?[kK]?(?:\s?\/-)?`;
const RANGE = String.raw`${NUM}(?:\s*(?:-|–|—|to)\s*${CUR}?\s?${NUM})?`;
const PERIOD = String.raw`(?:\s*(?:\/|per\s)\s?(?:month|mo|year|yr|annum|hour|hr|week)\b|\s*\(?\b(?:monthly|yearly|annually|per month|per annum)\b\)?)?`;
const AMOUNT = String.raw`(?:up to\s)?(?:${CUR}\s?)?${RANGE}(?:\s?${CUR})?${PERIOD}`;

// "Salary:", "Salary Range -", "Estimated Annual Salary:", "Stipend:", "বেতন:" …
const LABELLED = new RegExp(
  String.raw`(?:salary(?:\s+range)?|remuneration|stipend|pay\s+range|fee|বেতন|সম্মানী)\s*[:\-–=]+\s*(.{1,120})`,
  "i",
);
const AMOUNT_RE = new RegExp(AMOUNT, "i");
// An amount with a currency next to it, anywhere in the text.
const CURRENCY_AMOUNT = new RegExp(String.raw`(?:up to\s)?${CUR}\s?${RANGE}${PERIOD}|${RANGE}\s?${CUR}${PERIOD}`, "i");

/** Real money, not "2 years": a currency, a "k", or a number of at least 1,000. */
function looksLikePay(s: string): boolean {
  if (new RegExp(CUR, "i").test(s) || /\d\s?k\b/i.test(s)) return true;
  return (s.match(/\d[\d,.]*/g) ?? []).some((n) => Number(n.replace(/,/g, "")) >= 1000);
}

// Spaces around range dashes, but "60,000/-" keeps its dash.
const tidy = (s: string) =>
  s.replace(/\s+/g, " ").replace(/(?<!\/)\s*([–—-])\s*/g, " $1 ").replace(/[\s,.;:]+$/, "").trim();

export function extractSalary(text?: string | null): string | undefined {
  if (!text) return undefined;
  const t = text
    .replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6)) // Bangla digits → 0-9
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ");
  const labelled = t.match(LABELLED)?.[1];
  if (labelled) {
    if (/^(negotiable|negotiation)/i.test(labelled.trim())) return "Negotiable";
    const m = labelled.match(AMOUNT_RE);
    if (m && looksLikePay(m[0])) return tidy(m[0]).slice(0, 60);
  }
  const any = t.match(CURRENCY_AMOUNT);
  if (any && looksLikePay(any[0])) return tidy(any[0]).slice(0, 60);
  if (/\bsalary\s*[:\-–]?\s*negotiable\b/i.test(t)) return "Negotiable";
  return undefined;
}
