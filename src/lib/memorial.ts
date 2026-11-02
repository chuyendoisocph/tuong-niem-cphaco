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

// Hoa Vi\u00ean writes "ngh\u1ec7 s\u1ef9", as carved on the \u0110\u01b0\u1eddng Ngh\u1ec7 S\u1ef9 stone; stored text may say "ngh\u1ec7 s\u0129".
const SI_TO_SY: Record<string, string> = { "s\u0129": "s\u1ef9", "S\u0129": "S\u1ef9", "S\u0128": "S\u1ef8" };
export function localSpelling(value: string): string {
  return value.normalize("NFC").replace(/(ngh\u1ec7|Ngh\u1ec7|NGH\u1ec6)(\s+)(s\u0129|S\u0129|S\u0128)(?![\p{L}])/gu, (_, first: string, space: string, second: string) => first + space + SI_TO_SY[second]);
}

export function normalizeMemorialName(name: string): string {
  return localSpelling(name).replace(/\s*[\u2013\u2014]\s*/g, " - ").replace(/\s+/g, " ").trim();
}

// For words people wrote themselves (memories, quotes): only the dashes are tidied, the spelling is theirs.
export function displayVisitorText(value: string): string {
  return value.replace(/\s*[\u2013\u2014]\s*/g, " - ");
}

// Text shown inside “…” turns its own double quotes into single ones, so titles don't read as “Tác giả “Kiếp nghèo””.
export function innerQuotes(value: string): string {
  return value.replace(/[“"]([^“”"]*)[”"]/g, "‘$1’");
}

export function displayMemorialText(value: string): string {
  return localSpelling(displayVisitorText(value));
}

const HONORIFICS = ["GS-TS", "NSND", "NSƯT", "GS", "TS"];

export const ARTS_FIELD = "Văn hóa nghệ thuật";

// Each profession belongs to a field; the field decides headings and wording for people outside the arts.
const FIELD_BY_PROFESSION: Record<string, string> = {
  "Nhạc sĩ": ARTS_FIELD,
  "Nhà thơ": ARTS_FIELD,
  "Nhà văn": ARTS_FIELD,
  "Soạn giả": ARTS_FIELD,
  "Đạo diễn": ARTS_FIELD,
  "Ca sĩ": ARTS_FIELD,
  "Diễn viên": ARTS_FIELD,
  "Họa sĩ": ARTS_FIELD,
  "Nghệ sỹ hài": ARTS_FIELD,
  "Nghệ sỹ": ARTS_FIELD,
  "Ký giả": "Báo chí",
  "Nhà báo": "Báo chí",
  "Doanh nhân": "Kinh doanh",
  "Nhà giáo": "Giáo dục",
  "Nhà khoa học": "Khoa học",
  "Kiến trúc sư": "Kiến trúc",
  "Bác sĩ": "Y tế",
  "Vận động viên": "Thể thao",
};
// Longer titles first, so "Nghệ sỹ hài" is not read as "Nghệ sỹ".
const PROFESSIONS = Object.keys(FIELD_BY_PROFESSION).sort((left, right) => right.length - left.length);
const ARTS_HONORIFICS = new Set(["NSND", "NSƯT"]);

export function fieldOf(fullName: string): string | null {
  const { honorific, profession } = parseName(fullName);
  if (profession) return FIELD_BY_PROFESSION[profession];
  return honorific && ARTS_HONORIFICS.has(honorific) ? ARTS_FIELD : null;
}

export const ART_FORMS = ["Âm nhạc", "Cải lương", "Điện ảnh", "Văn học"] as const;
const ART_FORM_BY_PROFESSION: Record<string, string> = {
  "Nhạc sĩ": "Âm nhạc", "Ca sĩ": "Âm nhạc", "Đạo diễn": "Điện ảnh", "Diễn viên": "Điện ảnh",
  "Nhà thơ": "Văn học", "Nhà văn": "Văn học", "Soạn giả": "Cải lương", "Nghệ sỹ": "Cải lương",
};
// A title alone cannot place these people, so they are named here.
const ART_FORM_BY_SLUG: Record<string, string> = {
  "nsnd-the-hien": "Âm nhạc", "tran-van-khe": "Âm nhạc", "tong-son": "Âm nhạc", "ho-kieng": "Điện ảnh",
};

// The form visitors browse by. Stage artists with only NSND or NSƯT in their name are cải lương performers.
export function artFormOf(person: { name: string; slug?: string | null }): string | null {
  const bySlug = person.slug ? ART_FORM_BY_SLUG[person.slug] : undefined;
  if (bySlug) return bySlug;
  const { honorific, profession } = parseName(person.name);
  if (profession) return ART_FORM_BY_PROFESSION[profession] ?? null;
  return honorific && ARTS_HONORIFICS.has(honorific) ? "Cải lương" : null;
}

const isArts = (fullName: string | undefined) => !fullName || fieldOf(fullName) === ARTS_FIELD;

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

// A role names the production it belongs to: Vở "…", Phim "…", Opera "…".
const ROLE_PATTERN = /^(Vở|Phim|Opera)\s+(["“].*)$/i;
const isRole = (work: MemorialWork) => ROLE_PATTERN.test(work.description?.trim() ?? "");

export function worksHeading(works: MemorialWork[], fullName?: string): string {
  if (!isArts(fullName)) return "Thành tựu";
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
  const role = ROLE_PATTERN.exec(description);
  if (role) return `Vai diễn trong ${role[1].toLowerCase()} ${role[2]}`;
  return [description, work.year === null ? "" : String(work.year)].filter(Boolean).join(", ");
}

export type RevisitVerb = "Nghe lại" | "Xem lại" | "Đọc lại" | "Tìm hiểu";

// How a visitor returns to a work: a song is heard, a play or role is watched, a poem or book is read.
export function revisitVerb(work: MemorialWork, artistName: string): RevisitVerb {
  const kind = foldVietnamese(work.description ?? "");
  if (/\b(ca khuc|bai hat|nhac|album)\b/.test(kind)) return "Nghe lại";
  if (/\b(tho|tap tho|truyen|tieu thuyet|but ky|tuy but|sach)\b/.test(kind)) return "Đọc lại";
  if (isRole(work) || /\b(cai luong|kich|tuong|phim|vai)\b/.test(kind)) return "Xem lại";
  const profession = parseName(artistName).profession;
  if (profession === "Nhạc sĩ" || profession === "Ca sĩ") return "Nghe lại";
  if (profession === "Nhà thơ" || profession === "Nhà văn" || profession === "Ký giả" || profession === "Nhà báo") return "Đọc lại";
  return isArts(artistName) ? "Xem lại" : "Tìm hiểu";
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
  "Diễn viên": "vì những vai diễn",
  "Nghệ sỹ hài": "vì những tiếng cười",
  "Họa sĩ": "vì những bức tranh",
  "Nhà báo": "vì những trang báo",
  "Doanh nhân": "vì những gì đã gây dựng",
  "Nhà giáo": "vì những thế hệ học trò",
  "Nhà khoa học": "vì những công trình để lại",
  "Bác sĩ": "vì những người được cứu chữa",
};

export function gratitudeReason(name: string, works: MemorialWork[] = []): string {
  const first = works.find((work) => work.title.trim());
  if (first) return isRole(first) ? `vì vai “${first.title.trim()}”` : `vì “${first.title.trim()}”`;
  const profession = parseName(name).profession;
  return (profession && REASON_BY_PROFESSION[profession])
    || (isArts(name) ? "vì một đời gắn bó với nghệ thuật" : "vì những gì đã để lại cho đời");
}

// Questions that help a visitor start a memory instead of facing an empty box.
export function tributePrompts(shortName: string, works: MemorialWork[] = [], fullName?: string): string[] {
  const first = works.find((work) => work.title.trim());
  const workPrompt = first
    ? isRole(first) ? `Vai “${first.title.trim()}” để lại trong bạn điều gì?` : `“${first.title.trim()}” gợi cho bạn kỷ niệm nào?`
    : isArts(fullName) ? `Tác phẩm nào của ${shortName} ở lại với bạn lâu nhất?` : `Điều gì ở ${shortName} khiến bạn nhớ nhất?`;
  return [
    `Lần đầu bạn biết đến ${shortName} là khi nào?`,
    workPrompt,
    `Bạn có kỷ niệm nào gắn với ${shortName}?`,
    `Hôm nay, bạn muốn nói gì với ${shortName}?`,
  ];
}

// The video id of a YouTube link (watch, youtu.be, shorts, embed, music), so the page can play it in place.
export function youtubeId(value: string | null | undefined): string | null {
  const url = publicHttpUrl(value);
  if (!url) return null;
  const { hostname, pathname, searchParams } = new URL(url);
  const host = hostname.replace(/^(www|m|music)\./, "");
  const id = host === "youtu.be" ? pathname.slice(1).split("/")[0]
    : host === "youtube.com" || host === "youtube-nocookie.com"
      ? searchParams.get("v") ?? /^\/(?:shorts|embed|live)\/([^/?]+)/.exec(pathname)?.[1] ?? null
      : null;
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
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

export type RestingPlace = {
  name?: string;
  in_hoa_vien: boolean;
  resting_place: string | null;
  resting_address: string | null;
  latitude: number | null;
  longitude: number | null;
  maps_url: string | null;
  grave_area: string | null;
  grave_lot: string | null;
  grave_number: string | null;
};

export const HOA_VIEN_PLACE = "Hoa Viên Nghĩa trang Bình Dương";
export const ARTISTS_ROW_PLACE = "Đường Nghệ Sỹ, Hoa Viên Nghĩa trang Bình Dương";

// Artists rest along Đường Nghệ Sỹ and other notable people elsewhere in Hoa Viên, unless resting_place names the
// spot inside Hoa Viên (an artist in a family tomb, for instance).
export function restingPlaceName(place: RestingPlace): string {
  if (place.in_hoa_vien) {
    if (place.resting_place?.trim()) return `${place.resting_place.trim()}, ${HOA_VIEN_PLACE}`;
    return isArts(place.name) ? ARTISTS_ROW_PLACE : HOA_VIEN_PLACE;
  }
  return place.resting_place ?? "Chưa rõ nơi an nghỉ";
}

export function restingFacts(place: RestingPlace): { label: string; value: string }[] {
  const facts = [
    { label: "Khu", value: place.grave_area },
    { label: "Lô", value: place.grave_lot },
    { label: "Vị trí", value: place.grave_number },
    { label: "Tọa độ GPS", value: formatCoordinates(place) },
  ];
  return facts.flatMap(({ label, value }) => value?.trim() ? [{ label, value: value.trim() }] : []);
}

export function hasCoordinates(place: RestingPlace): place is RestingPlace & { latitude: number; longitude: number } {
  return place.latitude !== null && place.longitude !== null
    && Math.abs(place.latitude) <= 90 && Math.abs(place.longitude) <= 180;
}

export function formatCoordinates(place: RestingPlace): string | null {
  return hasCoordinates(place) ? `${place.latitude.toFixed(6)}, ${place.longitude.toFixed(6)}` : null;
}

// Hoa Viên's digital map opens at the grave itself, but only knows real plot codes such as B1.2.2-11-03 or VST-01-02.
const GRAVE_CODE = /^[A-Z][A-Z0-9.]*-\d+-\d+$/i;

export function graveMapUrl(place: RestingPlace): string | null {
  const code = place.grave_number?.trim();
  return place.in_hoa_vien && code && GRAVE_CODE.test(code) ? `https://bandoso.cphaco.app/?grave=${encodeURIComponent(code)}` : null;
}

// Directions go to the grave's GPS point when known, then to a stored map link, then to the address or place name.
export function directionsUrl(place: RestingPlace): string | null {
  const directions = (destination: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
  if (hasCoordinates(place)) return directions(`${place.latitude},${place.longitude}`);
  const mapUrl = publicHttpUrl(place.maps_url);
  if (mapUrl) return mapUrl;
  if (place.resting_address) return directions(place.resting_address);
  if (place.in_hoa_vien) return directions("Hoa Viên Nghĩa Trang Bình Dương");
  return place.resting_place ? directions(place.resting_place) : null;
}

// Family members who rest in Hoa Viên, as their biographies state.
const RELATIVES: Record<string, { slug: string; relation: string }[]> = {
  "pham-duy": [{ slug: "thai-hang", relation: "Vợ" }, { slug: "duy-quang", relation: "Con trai" }],
  "thai-hang": [{ slug: "pham-duy", relation: "Chồng" }, { slug: "duy-quang", relation: "Con trai" }],
  "duy-quang": [{ slug: "pham-duy", relation: "Cha" }, { slug: "thai-hang", relation: "Mẹ" }],
  "tam-van": [{ slug: "nhi-kieu", relation: "Vợ" }],
  "nhi-kieu": [{ slug: "tam-van", relation: "Chồng" }],
};

export const relativesOf = (slug: string | null | undefined) => (slug ? RELATIVES[slug] ?? [] : []);

export function foldVietnamese(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase();
}

export function initialOf(name: string): string {
  return Array.from(parseName(name).shortName)[0]?.toLocaleUpperCase("vi") ?? "?";
}
