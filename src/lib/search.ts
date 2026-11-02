import { foldVietnamese, localSpelling } from "@/lib/memorial";

// A query typed with diacritics matches them exactly; one typed without matches any diacritics.
export type SearchQuery = { text: string; exact: boolean };

export function searchQuery(raw: string): SearchQuery {
  // Pages say "nghệ sỹ", so "nghệ sĩ" and "nghe si" are read the same way.
  const lowered = localSpelling(raw.trim().normalize("NFC").toLocaleLowerCase("vi")).replace(/\bnghe si\b/g, "nghe sy");
  const folded = foldVietnamese(lowered);
  return folded === lowered ? { text: folded, exact: false } : { text: lowered, exact: true };
}

// Works one character at a time so every index in the result points at the same character in the original.
function aligned(text: string, exact: boolean): string {
  return Array.from(text.normalize("NFC"), (char) => (exact ? char.toLocaleLowerCase("vi") : foldVietnamese(char)).charAt(0) || char).join("");
}

export function matchIndex(text: string | null | undefined, query: SearchQuery): number {
  if (!text || !query.text) return -1;
  return aligned(text, query.exact).indexOf(query.text);
}

export type TextPart = { text: string; match: boolean };

export function highlightParts(text: string, query: SearchQuery): TextPart[] {
  const source = Array.from(text.normalize("NFC"));
  const folded = aligned(text, query.exact);
  const foldedQuery = query.text;
  if (!foldedQuery) return [{ text, match: false }];
  const parts: TextPart[] = [];
  let cursor = 0;
  for (let index = folded.indexOf(foldedQuery); index !== -1; index = folded.indexOf(foldedQuery, index + foldedQuery.length)) {
    if (index > cursor) parts.push({ text: source.slice(cursor, index).join(""), match: false });
    parts.push({ text: source.slice(index, index + foldedQuery.length).join(""), match: true });
    cursor = index + foldedQuery.length;
  }
  if (cursor < source.length) parts.push({ text: source.slice(cursor).join(""), match: false });
  return parts;
}

// "22/10", "22-10" or "22.10": a day and month to look up birthdays and remembrance days.
export function dayMonthQuery(raw: string): { day: number; month: number } | null {
  const match = /^(\d{1,2})\s*[/.-]\s*(\d{1,2})$/.exec(raw.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  return day >= 1 && day <= 31 && month >= 1 && month <= 12 ? { day, month } : null;
}

// Hoa Viên grave numbers read area-row-grave, e.g. "B1.2.2-11-03"; the area is everything before the first dash.
export function graveArea(graveNumber: string | null | undefined): string | null {
  const value = graveNumber?.trim();
  if (!value) return null;
  return value.split("-")[0].trim() || null;
}

// Excel opens UTF-8 CSV correctly only with a byte-order mark.

export function plainText(html: string | null | undefined): string {
  if (!html) return "";
  const body = new DOMParser().parseFromString(html, "text/html").body;
  body.querySelectorAll("p, br, li, div").forEach((node) => node.append(" "));
  return (body.textContent ?? "").replace(/\s+/g, " ").trim();
}

// A window of text around the first match, cut at word boundaries.
export function snippetAround(text: string, query: SearchQuery, radius = 90): string | null {
  const characters = Array.from(text.normalize("NFC"));
  const index = matchIndex(text, query);
  if (index === -1) return null;
  let start = Math.max(0, index - radius);
  let end = Math.min(characters.length, index + query.text.length + radius);
  while (start > 0 && characters[start - 1] !== " ") start -= 1;
  while (end < characters.length && characters[end] !== " ") end += 1;
  return `${start > 0 ? "… " : ""}${characters.slice(start, end).join("").trim()}${end < characters.length ? " …" : ""}`;
}
