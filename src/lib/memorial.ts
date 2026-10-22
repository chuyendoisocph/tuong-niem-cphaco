export type LooseDate = {
  year: number;
  month: number | null;
  day: number | null;
  yearOnly: boolean;
};

export type DatedArtist = {
  name: string;
  death_date: string | null;
};

export type MemorialWork = {
  title: string;
  description: string | null;
  year: number | null;
};

export type MemorialMilestone = {
  kind: string;
  title: string;
  description: string | null;
};

export function parseLooseDate(value: string | null | undefined): LooseDate | null {
  if (!value) return null;
  const match = /^(\d{4})(?:-(\d{2})-(\d{2}))?$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  if (!match[2]) return { year, month: null, day: null, yearOnly: true };
  const month = Number(match[2]);
  const day = Number(match[3]);
  const valid = month >= 1 && month <= 12 && day >= 1
    && day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (!valid) return null;
  return { year, month, day, yearOnly: month === 1 && day === 1 };
}

export function formatLooseDate(value: string | LooseDate | null | undefined): string {
  const date = typeof value === "string" ? parseLooseDate(value) : value;
  if (!date) return "?";
  if (date.yearOnly || date.month === null || date.day === null) return String(date.year);
  return `${date.day}/${date.month}/${date.year}`;
}

export function formatLifespan(birth: string | null | undefined, death: string | null | undefined): string {
  return `${parseLooseDate(birth)?.year ?? "?"} - ${parseLooseDate(death)?.year ?? "?"}`;
}

export type Anniversary = {
  date: Date;
  daysUntil: number;
  years: number;
  isToday: boolean;
};

export function nextAnniversary(deathDate: string | null | undefined, today = new Date()): Anniversary | null {
  const death = parseLooseDate(deathDate);
  if (!death || death.yearOnly || death.month === null || death.day === null) return null;
  const todayDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  for (let year = today.getFullYear(); year < today.getFullYear() + 9; year += 1) {
    const date: Date = new Date(year, death.month - 1, death.day);
    if (date.getMonth() !== death.month - 1 || date.getDate() !== death.day) continue;
    const targetDay = Date.UTC(year, death.month - 1, death.day);
    if (targetDay < todayDay) continue;
    const daysUntil = Math.round((targetDay - todayDay) / 86_400_000);
    return { date, daysUntil, years: year - death.year, isToday: daysUntil === 0 };
  }
  return null;
}

export function anniversaryLabel(deathDate: string | null | undefined, today = new Date()): string | null {
  const anniversary = nextAnniversary(deathDate, today);
  if (!anniversary) return null;
  if (anniversary.isToday) return "Hôm nay";
  return anniversary.date.getMonth() === today.getMonth() ? "Sắp tới" : null;
}

export function deathsInMonth<T extends DatedArtist>(artists: T[], month: number): T[] {
  if (!Number.isInteger(month) || month < 1 || month > 12) return [];
  return artists
    .filter((artist) => {
      const date = parseLooseDate(artist.death_date);
      return date !== null && !date.yearOnly && date.month === month;
    })
    .sort((left, right) => {
      const leftDay = parseLooseDate(left.death_date)?.day ?? 0;
      const rightDay = parseLooseDate(right.death_date)?.day ?? 0;
      return leftDay - rightDay || left.name.localeCompare(right.name, "vi");
    });
}

export type DecadeGroup<T> = { label: string; decade: number | null; artists: T[] };

export function groupByDecade<T extends DatedArtist>(artists: T[]): DecadeGroup<T>[] {
  const byDecade = new Map<number, T[]>();
  const undated: T[] = [];
  for (const artist of artists) {
    const year = parseLooseDate(artist.death_date)?.year;
    if (year === undefined) {
      undated.push(artist);
      continue;
    }
    const decade = Math.floor(year / 10) * 10;
    byDecade.set(decade, [...(byDecade.get(decade) ?? []), artist]);
  }
  const decades = [...byDecade.keys()].sort((a, b) => b - a);
  const groups: DecadeGroup<T>[] = [];
  const sparse = decades.filter((decade) => (byDecade.get(decade)?.length ?? 0) < 5);
  const sparseStart = sparse.length ? Math.max(...sparse) : null;
  for (const decade of decades) {
    if (sparseStart !== null && decade <= sparseStart) continue;
    groups.push({ label: `${decade}`, decade, artists: byDecade.get(decade) ?? [] });
  }
  if (sparseStart !== null) {
    groups.push({
      label: `Trước ${sparseStart + 10}`,
      decade: null,
      artists: decades.filter((decade) => decade <= sparseStart).flatMap((decade) => byDecade.get(decade) ?? []),
    });
  }
  if (undated.length) groups.push({ label: "Không rõ năm", decade: null, artists: undated });
  return groups;
}

export function normalizeMemorialName(name: string): string {
  return name.replace(/\s*[\u2013\u2014]\s*/g, " - ").replace(/\s+/g, " ").trim();
}

export function displayMemorialText(value: string): string {
  return value.replace(/\s*[\u2013\u2014]\s*/g, " - ");
}

const HONORIFICS = ["GS-TS", "NSND", "NSƯT", "GS", "TS"];
const PROFESSIONS = ["Nhạc sĩ", "Nhà thơ", "Nhà văn", "Soạn giả", "Đạo diễn", "Ca sĩ", "Ký giả", "Nghệ sĩ"];

export function parseName(fullName: string): { honorific: string | null; profession: string | null; shortName: string } {
  let remaining = normalizeMemorialName(fullName);
  let honorific: string | null = null;
  let profession: string | null = null;
  for (const title of HONORIFICS) {
    if (remaining === title || remaining.startsWith(`${title} `)) {
      honorific = title;
      remaining = remaining.slice(title.length).trim();
      break;
    }
  }
  for (const job of PROFESSIONS) {
    if (remaining === job || remaining.startsWith(`${job} `)) {
      profession = job;
      remaining = remaining.slice(job.length).trim();
      break;
    }
  }
  return { honorific, profession, shortName: remaining || normalizeMemorialName(fullName) };
}

const isRole = (work: MemorialWork) => /^Vở\s+/i.test(work.description?.trim() ?? "");

export function worksHeading(works: MemorialWork[]): string {
  if (!works.length) return "Tác phẩm";
  if (works.every(isRole)) return "Vai diễn tiêu biểu";
  const descriptions = works.map((work) => work.description?.trim()).filter((value): value is string => !!value);
  if (descriptions.length === works.length && descriptions.every((value) => value === descriptions[0])) {
    return `${descriptions[0]} tiêu biểu`;
  }
  return "Tác phẩm";
}

export function workCaption(work: MemorialWork): string {
  const description = work.description?.trim() ?? "";
  if (isRole(work)) return `Vai diễn trong vở ${description.replace(/^Vở\s+/i, "")}`;
  return [description, work.year === null ? "" : String(work.year)].filter(Boolean).join(", ");
}

export type RevisitVerb = "Nghe lại" | "Xem lại" | "Đọc lại";

// How a visitor returns to a work: a song is heard, a play or role is watched, a poem or book is read.
export function revisitVerb(work: MemorialWork, artistName: string): RevisitVerb {
  const kind = foldVietnamese(work.description ?? "");
  if (/\b(ca khuc|bai hat|nhac|album)\b/.test(kind)) return "Nghe lại";
  if (/\b(tho|tap tho|truyen|tieu thuyet|but ky|tuy but|sach)\b/.test(kind)) return "Đọc lại";
  if (isRole(work) || /\b(cai luong|kich|tuong|phim|vai)\b/.test(kind)) return "Xem lại";
  const profession = parseName(artistName).profession;
  if (profession === "Nhạc sĩ" || profession === "Ca sĩ") return "Nghe lại";
  if (profession === "Nhà thơ" || profession === "Nhà văn" || profession === "Ký giả") return "Đọc lại";
  return "Xem lại";
}

export function substantiveMilestoneCount(items: MemorialMilestone[]): number {
  return items.filter((item) => {
    if (item.kind !== "milestone") return false;
    const title = item.title.trim();
    const description = item.description?.trim() ?? "";
    if (!title && !description) return false;
    const lifeEventOnly = /^(?:ngày )?(sinh|chào đời|từ trần|qua đời|mất|an táng|yên nghỉ)(?:$|[\s,;:.])/iu.test(title)
      && !description;
    return !lifeEventOnly;
  }).length;
}

const REASON_BY_PROFESSION: Record<string, string> = {
  "Nhạc sĩ": "vì những bài hát",
  "Ca sĩ": "vì những tiếng hát",
  "Nhà thơ": "vì những vần thơ",
  "Nhà văn": "vì những trang viết",
  "Soạn giả": "vì những vở diễn và lời ca",
  "Đạo diễn": "vì những tác phẩm để lại",
  "Ký giả": "vì những trang báo",
};

export function gratitudeReason(name: string, works: MemorialWork[] = []): string {
  const first = works.find((work) => work.title.trim());
  if (first) return isRole(first) ? `vì vai “${first.title.trim()}”` : `vì “${first.title.trim()}”`;
  const profession = parseName(name).profession;
  return (profession && REASON_BY_PROFESSION[profession]) || "vì một đời gắn bó với nghệ thuật";
}

export function publicHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

export function foldVietnamese(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase();
}

export function initialOf(name: string): string {
  return Array.from(parseName(name).shortName)[0]?.toLocaleUpperCase("vi") ?? "?";
}
