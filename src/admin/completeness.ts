import type { AdminProfile, ItemCounts } from "@/admin/adminData";
import { parseLooseDate } from "@/lib/memorial";
import { graveArea } from "@/lib/search";

export type Gap = "anh" | "so-mo" | "ngay-gio" | "gioi-thieu" | "tac-pham" | "moc";

// What a complete page needs, in the order the overview lists the gaps.
export const GAPS: { id: Gap; label: string; missing: (profile: AdminProfile, counts: ItemCounts) => boolean }[] = [
  { id: "anh", label: "Thiếu ảnh", missing: (profile) => !profile.avatar_url?.trim() },
  { id: "so-mo", label: "Thiếu vị trí", missing: (profile) => profile.in_hoa_vien && !profile.grave_number?.trim() },
  { id: "ngay-gio", label: "Thiếu ngày giỗ", missing: (profile) => { const death = parseLooseDate(profile.death_date); return !death || death.yearOnly; } },
  { id: "gioi-thieu", label: "Thiếu câu giới thiệu", missing: (profile) => !profile.tagline?.trim() },
  { id: "tac-pham", label: "Thiếu tác phẩm", missing: (_, counts) => counts.works === 0 },
  { id: "moc", label: "Thiếu mốc cuộc đời", missing: (_, counts) => counts.milestones < 2 },
];

const NO_ITEMS: ItemCounts = { works: 0, milestones: 0 };

export function gapsOf(profile: AdminProfile, counts?: ItemCounts): Gap[] {
  return GAPS.filter((gap) => gap.missing(profile, counts ?? NO_ITEMS)).map((gap) => gap.id);
}

export const gapLabel = (id: Gap) => GAPS.find((gap) => gap.id === id)?.label ?? id;

// The overview groups people the way they lie in Hoa Viên: by the area in the grave number, or the place named.
export function areaOf(profile: AdminProfile): string {
  if (!profile.in_hoa_vien) return profile.resting_place?.trim() || "Ngoài Hoa Viên, chưa rõ nơi";
  const area = graveArea(profile.grave_number);
  return area ? (/^[A-Z]\d/.test(area) ? `Khu ${area}` : area) : "Hoa Viên, chưa có vị trí";
}
