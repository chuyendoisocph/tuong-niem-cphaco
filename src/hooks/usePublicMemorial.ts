import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { displayMemorialText, normalizeMemorialName } from "@/lib/memorial";

export type MemorialArtist = {
  id: string;
  slug: string | null;
  name: string;
  tagline: string | null;
  biography: string | null;
  birth_date: string | null;
  death_date: string | null;
  avatar_url: string;
  grave_number: string | null;
  maps_url: string | null;
};

export type MemorialItem = {
  id: string;
  profile_id: string;
  kind: "work" | "milestone";
  title: string;
  description: string | null;
  year: number | null;
  url: string | null;
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
};

export type Tribute = {
  id: string;
  profile_id: string;
  author_name: string;
  content: string;
  created_at: string | null;
};

export type RecentTribute = Tribute & { artist: MemorialArtist };
export type TributeSubmission = Pick<Tribute, "profile_id" | "author_name" | "content"> & { is_public: boolean };

// The generated Supabase types predate memorial_items, memorial_flowers and the new profile columns.
const db = supabase as unknown as SupabaseClient;
const artistColumns = "id, slug, name, tagline, biography, birth_date, death_date, avatar_url, grave_number, maps_url";
const itemColumns = "id, profile_id, kind, title, description, year, url, display_order";
const tributeColumns = "id, profile_id, author_name, content, created_at";

function visibleArtist(artist: MemorialArtist): MemorialArtist | null {
  if (!artist.avatar_url?.trim()) return null;
  return {
    ...artist,
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
  };
}

function visibleTribute(tribute: Tribute): Tribute {
  return {
    ...tribute,
    author_name: displayMemorialText(tribute.author_name),
    content: displayMemorialText(tribute.content),
  };
}

export function useArtists() {
  return useQuery({
    queryKey: ["public-memorial", "artists"],
    queryFn: async (): Promise<MemorialArtist[]> => {
      const { data, error } = await db.from("profiles")
        .select(artistColumns)
        .eq("is_celebrity", true)
        .eq("is_published", true)
        .not("avatar_url", "is", null)
        .order("death_date", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return ((data ?? []) as MemorialArtist[])
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
      const { data, error } = await db.from("profiles")
        .select(artistColumns)
        .eq(column, slugOrId)
        .eq("is_celebrity", true)
        .eq("is_published", true)
        .not("avatar_url", "is", null)
        .maybeSingle();
      if (error) throw error;
      return data ? visibleArtist(data as MemorialArtist) : null;
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
        .select("id, profile_id, url, caption, display_order")
        .eq("profile_id", profileId)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MemorialPhoto[];
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
          quote: displayMemorialText(row.title.trim()),
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
    mutationFn: async ({ profile_id, author_name, content, is_public }: TributeSubmission): Promise<void> => {
      const name = author_name.trim();
      const message = content.trim();
      if (!profile_id || !name || !message || name.length > 100 || message.length > 2000) {
        throw new Error("Invalid tribute");
      }
      const { error } = await db.from("comments").insert({
        profile_id,
        author_name: name,
        content: message,
        is_public,
      });
      if (error) throw error;
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
