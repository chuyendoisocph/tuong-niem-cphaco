import { foldVietnamese, parseLooseDate } from "@/lib/memorial";

// Dates are typed the Vietnamese way, "27/12/1926", or as a year alone; a year alone is stored as 1 January.
export function dateToInput(value: string | null): string {
  const date = parseLooseDate(value);
  if (!date) return "";
  if (date.yearOnly || date.day === null || date.month === null) return String(date.year);
  return `${date.day}/${date.month}/${date.year}`;
}

export function inputToDate(value: string): { value: string | null; valid: boolean } {
  const text = value.trim();
  if (!text) return { value: null, valid: true };
  const yearOnly = /^(\d{4})$/.exec(text);
  if (yearOnly) return { value: `${yearOnly[1]}-01-01`, valid: true };
  const full = /^(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{4})$/.exec(text);
  if (!full) return { value: null, valid: false };
  const iso = `${full[3]}-${full[2].padStart(2, "0")}-${full[1].padStart(2, "0")}`;
  return parseLooseDate(iso) ? { value: iso, valid: true } : { value: null, valid: false };
}

export function slugify(text: string): string {
  return foldVietnamese(text).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Biographies are stored as <p> paragraphs; staff edit them as plain paragraphs separated by a blank line.
export function biographyToText(html: string | null): string {
  if (!html) return "";
  if (!/<[a-z]/i.test(html)) return html;
  const body = new DOMParser().parseFromString(html, "text/html").body;
  const blocks = [...body.children];
  if (!blocks.length || blocks.some((block) => block.tagName !== "P" || block.children.length)) return html;
  return blocks.map((block) => block.textContent?.trim() ?? "").filter(Boolean).join("\n\n");
}

const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function textToBiography(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  // Staff who paste formatted HTML keep it as written; the public page sanitizes it.
  if (/<\/?[a-z][\s\S]*>/i.test(trimmed)) return trimmed;
  return trimmed.split(/\n\s*\n/).map((paragraph) => `<p>${escapeHtml(paragraph.replace(/\s*\n\s*/g, " ").trim())}</p>`).join("");
}

export const emptyToNull = (value: string) => value.trim() || null;
