import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { displayMemorialText, displayVisitorText, normalizeMemorialName } from "@/lib/memorial";
import { SHOW_OUTSIDE_HOA_VIEN } from "@/lib/site";

export type MemorialArtist = {
  id: string;
  slug: string | null;
  name: string;
  tagline: string | null;
  biography: string | null;
  birth_date: string | null;
  death_date: string | null;
  avatar_url: string | null;
  grave_area: string | null;
  grave_lot: string | null;
  grave_number: string | null;
  maps_url: string | null;
  in_hoa_vien: boolean;
  resting_place: string | null;
  resting_address: string | null;
  latitude: number | null;
  longitude: number | null;
  sources: { title: string; url: string }[] | null;
};

export type MemorialItem = {
  id: string;
  profile_id: string;
  kind: "work" | "milestone";
  title: string;
  description: string | null;
  year: number | null;
  url: string | null;
  excerpt: string | null;
  display_order: number;
};

export type MemorialQuote = {
  id: string;
  profile_id: string;
  quote: string;
  speaker: string | null;
  source: string | null;
  url: string | null;
};

export type MemorialPhoto = {
  id: string;
  profile_id: string;
  url: string;
  caption: string | null;
  display_order: number | null;
  comment_id: string | null;
  author_name: string | null;
};

export type Tribute = {
  id: string;
  profile_id: string;
  author_name: string;
  content: string;
  prompt: string | null;
  created_at: string | null;
};

export type RecentTribute = Tribute & { artist: MemorialArtist };
export type TributeSubmission = Pick<Tribute, "profile_id" | "author_name" | "content" | "prompt"> & { is_public: boolean; photos: Blob[] };
export type TributeResult = { photosSent: number; photosFailed: number };

// The generated Supabase types predate memorial_items, memorial_flowers and the new profile columns.
const db = supabase as unknown as SupabaseClient;
const artistColumns = "id, slug, name, tagline, biography, birth_date, death_date, avatar_url, grave_area, grave_lot, grave_number, maps_url";
// From supabase/migrations/20261022010000_resting_places.sql. Until it is applied, artist queries retry without them.
const restingColumns = ", in_hoa_vien, resting_place, resting_address, latitude, longitude, sources";
// excerpt comes from supabase/migrations/20261029000000_work_excerpts.sql.
const itemColumns = "id, profile_id, kind, title, description, year, url, excerpt, display_order";
const tributeColumns = "id, profile_id, author_name, content, prompt, created_at";
const photoColumns = "id, profile_id, url, caption, display_order, comment_id, author_name";
const VISITOR_PHOTO_BUCKET = "visitor-photos";
export const MAX_VISITOR_PHOTOS = 3;

type ArtistRow = Omit<MemorialArtist, "in_hoa_vien" | "resting_place" | "resting_address" | "latitude" | "longitude" | "sources">
  & Partial<Pick<MemorialArtist, "in_hoa_vien" | "resting_place" | "resting_address" | "latitude" | "longitude" | "sources">>;

async function selectArtists<T>(query: (columns: string) => PromiseLike<{ data: T; error: { code?: string } | null }>) {
  const result = await query(artistColumns + restingColumns);
  return result.error?.code === "42703" ? query(artistColumns) : result;
}

const finiteOrNull = (value: number | null | undefined) => typeof value === "number" && Number.isFinite(value) ? value : null;

// A profile is public once it has a portrait, or a written biography and tagline; without a portrait it shows the initial.
const publicProfileFilter = "avatar_url.not.is.null,and(biography.not.is.null,tagline.not.is.null)";


type VisibilityFields = Pick<MemorialArtist, "avatar_url" | "biography" | "tagline"> & { in_hoa_vien?: boolean | null; is_published?: boolean };

// Why a profile stays off the public pages, or null when it shows. The admin page explains the same rules.
export function hiddenReason(profile: VisibilityFields): string | null {
  if (profile.is_published === false) return "Đang tắt hiển thị";
  if (!profile.avatar_url?.trim() && !(profile.biography?.trim() && profile.tagline?.trim())) return "Cần ảnh, hoặc cả tiểu sử lẫn câu giới thiệu";
  if (!SHOW_OUTSIDE_HOA_VIEN && profile.in_hoa_vien === false) return "Ngoài Hoa Viên, đang tạm ẩn";
  return null;
}

function visibleArtist(artist: ArtistRow): MemorialArtist | null {
  const avatar = artist.avatar_url?.trim() || null;
  if (hiddenReason(artist)) return null;
  return {
    ...artist,
    avatar_url: avatar,
    in_hoa_vien: artist.in_hoa_vien ?? true,
    resting_place: artist.resting_place?.trim() ? displayMemorialText(artist.resting_place.trim()) : null,
    resting_address: artist.resting_address?.trim() ? displayMemorialText(artist.resting_address.trim()) : null,
    latitude: finiteOrNull(artist.latitude),
    longitude: finiteOrNull(artist.longitude),
    sources: Array.isArray(artist.sources) ? artist.sources : null,
    name: normalizeMemorialName(artist.name),
    tagline: artist.tagline ? displayMemorialText(artist.tagline) : null,
    biography: artist.biography ? displayMemorialText(artist.biography) : null,
  };
}

function visibleItem(item: MemorialItem): MemorialItem {
  return {
    ...item,
    title: displayMemorialText(item.title),
    description: item.description ? displayMemorialText(item.description) : null,
    // An excerpt is quoted text, so its spelling stays as written.
    excerpt: item.excerpt?.trim() ? item.excerpt.trim() : null,
  };
}

function visibleTribute(tribute: Tribute): Tribute {
  return {
    ...tribute,
    author_name: displayVisitorText(tribute.author_name),
    content: displayVisitorText(tribute.content),
    prompt: tribute.prompt?.trim() ? displayMemorialText(tribute.prompt.trim()) : null,
  };
}

export function useArtists() {
  return useQuery({
    queryKey: ["public-memorial", "artists"],
    queryFn: async (): Promise<MemorialArtist[]> => {
      const { data, error } = await selectArtists((columns) => db.from("profiles")
        .select(columns)
        .eq("is_celebrity", true)
        .eq("is_published", true)
        .or(publicProfileFilter)
        .order("death_date", { ascending: false, nullsFirst: false }));
      if (error) throw error;
      return ((data ?? []) as unknown as ArtistRow[])
        .map(visibleArtist)
        .filter((artist): artist is MemorialArtist => artist !== null);
    },
  });
}

export function useArtist(slugOrId: string | null | undefined) {
  return useQuery({
    queryKey: ["public-memorial", "artist", slugOrId],
    enabled: !!slugOrId,
    queryFn: async (): Promise<MemorialArtist | null> => {
      if (!slugOrId) return null;
      const column = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slugOrId)
        ? "id" : "slug";
      const { data, error } = await selectArtists((columns) => db.from("profiles")
        .select(columns)
        .eq(column, slugOrId)
        .eq("is_celebrity", true)
        .eq("is_published", true)
        .or(publicProfileFilter)
        .maybeSingle());
      if (error) throw error;
      return data ? visibleArtist(data as unknown as ArtistRow) : null;
    },
  });
}

export function useMemorialItems(profileId: string | null | undefined) {
  return useQuery({
    queryKey: ["public-memorial", "items", profileId],
    enabled: !!profileId,
    queryFn: async (): Promise<MemorialItem[]> => {
      if (!profileId) return [];
      const { data, error } = await db.from("memorial_items")
        .select(itemColumns)
        .eq("profile_id", profileId)
        .in("kind", ["work", "milestone"])
        .order("display_order", { ascending: true })
        .order("year", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return ((data ?? []) as MemorialItem[]).map(visibleItem);
    },
  });
}

export function useArtistPhotos(profileId: string | null | undefined) {
  return useQuery({
    queryKey: ["public-memorial", "photos", profileId],
    enabled: !!profileId,
    queryFn: async (): Promise<MemorialPhoto[]> => {
      if (!profileId) return [];
      const { data, error } = await db.from("photos")
        .select(photoColumns)
        .eq("profile_id", profileId)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as MemorialPhoto[]).map((photo) => ({
        ...photo,
        caption: photo.caption ? displayMemorialText(photo.caption) : null,
        author_name: photo.author_name ? displayVisitorText(photo.author_name) : null,
      }));
    },
  });
}

export function useAllWorks() {
  const { data: artists } = useArtists();
  const artistIds = artists?.map((artist) => artist.id) ?? [];
  return useQuery({
    queryKey: ["public-memorial", "works", artistIds],
    enabled: !!artists,
    queryFn: async (): Promise<MemorialItem[]> => {
      if (!artistIds.length) return [];
      const { data, error } = await db.from("memorial_items")
        .select(itemColumns)
        .eq("kind", "work")
        .in("profile_id", artistIds)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as MemorialItem[]).map(visibleItem);
    },
  });
}

export function useAllMemorialItems() {
  const { data: artists } = useArtists();
  const artistIds = artists?.map((artist) => artist.id) ?? [];
  return useQuery({
    queryKey: ["public-memorial", "all-items", artistIds],
    enabled: !!artists,
    queryFn: async (): Promise<MemorialItem[]> => {
      if (!artistIds.length) return [];
      const { data, error } = await db.from("memorial_items")
        .select(itemColumns)
        .in("kind", ["work", "milestone"])
        .in("profile_id", artistIds)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as MemorialItem[]).map(visibleItem);
    },
  });
}

// story, source and the 'quote' kind come from supabase/migrations/20261022000000_memorial_stories_quotes.sql.
// Until that migration is applied these queries fail, so they resolve empty and the home page hides what they feed.
export function useWorkStories() {
  const { data: artists } = useArtists();
  const artistIds = artists?.map((artist) => artist.id) ?? [];
  return useQuery({
    queryKey: ["public-memorial", "work-stories", artistIds],
    enabled: !!artists,
    retry: false,
    queryFn: async (): Promise<Map<string, string>> => {
      if (!artistIds.length) return new Map();
      const { data, error } = await db.from("memorial_items")
        .select("id, story")
        .eq("kind", "work")
        .in("profile_id", artistIds)
        .not("story", "is", null);
      if (error) return new Map();
      return new Map(((data ?? []) as { id: string; story: string }[])
        .map((row): [string, string] => [row.id, displayMemorialText(row.story.trim())])
        .filter(([, story]) => story));
    },
  });
}

export function useArtistQuotes() {
  const { data: artists } = useArtists();
  const artistIds = artists?.map((artist) => artist.id) ?? [];
  return useQuery({
    queryKey: ["public-memorial", "quotes", artistIds],
    enabled: !!artists,
    retry: false,
    queryFn: async (): Promise<MemorialQuote[]> => {
      if (!artistIds.length) return [];
      const { data, error } = await db.from("memorial_items")
        .select("id, profile_id, title, description, source, url")
        .eq("kind", "quote")
        .in("profile_id", artistIds)
        .order("display_order", { ascending: true });
      if (error) return [];
      return ((data ?? []) as { id: string; profile_id: string; title: string; description: string | null; source: string | null; url: string | null }[])
        .filter((row) => row.title.trim())
        .map((row) => ({
          id: row.id,
          profile_id: row.profile_id,
          quote: displayVisitorText(row.title.trim()),
          speaker: row.description ? displayMemorialText(row.description.trim()) : null,
          source: row.source ? displayMemorialText(row.source.trim()) : null,
          url: row.url,
        }));
    },
  });
}

export function useTributes(profileId: string | null | undefined) {
  return useQuery({
    queryKey: ["public-memorial", "tributes", profileId],
    enabled: !!profileId,
    queryFn: async (): Promise<Tribute[]> => {
      if (!profileId) return [];
      const { data, error } = await db.from("comments")
        .select(tributeColumns)
        .eq("profile_id", profileId)
        .eq("is_public", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as Tribute[]).map(visibleTribute);
    },
  });
}

export function useRecentTributes(limit = 2) {
  const { data: artists } = useArtists();
  const artistIds = artists?.map((artist) => artist.id) ?? [];
  return useQuery({
    queryKey: ["public-memorial", "recent-tributes", artistIds, limit],
    enabled: !!artists,
    queryFn: async (): Promise<RecentTribute[]> => {
      if (!artistIds.length || limit < 1) return [];
      const { data, error } = await db.from("comments")
        .select(tributeColumns)
        .in("profile_id", artistIds)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      const byId = new Map(artists?.map((artist) => [artist.id, artist]));
      return ((data ?? []) as Tribute[]).map(visibleTribute).flatMap((tribute) => {
        const artist = byId.get(tribute.profile_id);
        return artist ? [{ ...tribute, artist }] : [];
      });
    },
  });
}

export function useSendTribute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ profile_id, author_name, content, prompt, is_public, photos }: TributeSubmission): Promise<TributeResult> => {
      const name = author_name.trim();
      const message = content.trim();
      const question = prompt?.trim() || null;
      if (!profile_id || !name || !message || name.length > 100 || message.length > 2000 || (question?.length ?? 0) > 200
        || photos.length > MAX_VISITOR_PHOTOS) {
        throw new Error("Invalid tribute");
      }
      // The id is made here because visitors cannot read back a private memory to learn it.
      const commentId = crypto.randomUUID();
      const { error } = await db.from("comments").insert({
        id: commentId,
        profile_id,
        author_name: name,
        content: message,
        prompt: question,
        is_public,
      });
      if (error) throw error;

      // The memory is already saved, so a failed photo is reported rather than undoing it.
      let photosSent = 0;
      for (const [index, photo] of photos.entries()) {
        const path = `visitor/${profile_id}/${commentId}-${index + 1}.jpg`;
        const upload = await db.storage.from(VISITOR_PHOTO_BUCKET).upload(path, photo, { contentType: "image/jpeg", upsert: false });
        if (upload.error) continue;
        const { data } = db.storage.from(VISITOR_PHOTO_BUCKET).getPublicUrl(path);
        const { error: photoError } = await db.from("photos").insert({
          profile_id,
          comment_id: commentId,
          url: data.publicUrl,
          author_name: name,
          is_approved: false,
          display_order: 1000 + index,
        });
        if (!photoError) photosSent += 1;
      }
      return { photosSent, photosFailed: photos.length - photosSent };
    },
    onSuccess: (_, { profile_id }) => {
      queryClient.invalidateQueries({ queryKey: ["public-memorial", "tributes", profile_id] });
      queryClient.invalidateQueries({ queryKey: ["public-memorial", "recent-tributes"] });
    },
  });
}

export function useFlowerCount(profileId: string | null | undefined) {
  return useQuery({
    queryKey: ["public-memorial", "flowers", profileId],
    enabled: !!profileId,
    queryFn: async (): Promise<number> => {
      if (!profileId) return 0;
      const { data, error } = await db.from("memorial_flowers")
        .select("flower_count")
        .eq("profile_id", profileId)
        .maybeSingle();
      if (error) throw error;
      return Number(data?.flower_count ?? 0);
    },
  });
}

export function useOfferFlower(profileId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<number> => {
      if (!profileId) throw new Error("Profile ID is required");
      const { data, error } = await db.rpc("offer_flower", { p_profile_id: profileId });
      if (error) throw error;
      return Number(data);
    },
    onSuccess: (count) => {
      queryClient.setQueryData(["public-memorial", "flowers", profileId], count);
    },
  });
}
