import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { shrinkPhoto } from "@/lib/image";

// The generated Supabase types predate the memorial columns used here.
const db = supabase as unknown as SupabaseClient;
const PORTRAIT_BUCKET = "portraits";
const VISITOR_PHOTO_BUCKET = "visitor-photos";

export type AdminProfile = {
  id: string;
  name: string;
  slug: string | null;
  birth_date: string | null;
  death_date: string | null;
  tagline: string | null;
  biography: string | null;
  avatar_url: string | null;
  is_published: boolean;
  in_hoa_vien: boolean;
  grave_area: string | null;
  grave_lot: string | null;
  grave_number: string | null;
  resting_place: string | null;
  resting_address: string | null;
  latitude: number | null;
  longitude: number | null;
  maps_url: string | null;
  sources: { title: string; url: string }[] | null;
  updated_at: string | null;
};

export type AdminItem = {
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

export type AdminPhoto = {
  id: string;
  profile_id: string;
  url: string;
  caption: string | null;
  display_order: number | null;
  comment_id: string | null;
  author_name: string | null;
  is_approved: boolean;
  created_at: string | null;
};

export type AdminTribute = {
  id: string;
  profile_id: string;
  author_name: string;
  content: string;
  prompt: string | null;
  is_public: boolean | null;
  created_at: string | null;
};

const profileColumns = "id, name, slug, birth_date, death_date, tagline, biography, avatar_url, is_published, in_hoa_vien, grave_area, grave_lot, grave_number, resting_place, resting_address, latitude, longitude, maps_url, sources, updated_at";
const itemColumns = "id, profile_id, kind, title, description, year, url, excerpt, display_order";
const photoColumns = "id, profile_id, url, caption, display_order, comment_id, author_name, is_approved, created_at";

export type ProfileDraft = Omit<AdminProfile, "id" | "updated_at">;

export function useStaffSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);
  const role = useQuery({
    queryKey: ["admin", "role", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await db.rpc("has_valid_role");
      if (error) throw error;
      return data === true;
    },
  });
  return { session, isStaff: role.data, roleLoading: role.isLoading };
}

export const signIn = (email: string, password: string) => supabase.auth.signInWithPassword({ email, password });
export const signOut = () => supabase.auth.signOut();

// Every write here also refreshes what the public pages show.
function useRefresh() {
  const queryClient = useQueryClient();
  return (...keys: string[][]) => {
    for (const key of keys) queryClient.invalidateQueries({ queryKey: key });
    queryClient.invalidateQueries({ queryKey: ["public-memorial"] });
  };
}

export function useAdminProfiles() {
  return useQuery({
    queryKey: ["admin", "profiles"],
    queryFn: async (): Promise<AdminProfile[]> => {
      const { data, error } = await db.from("profiles").select(profileColumns).eq("is_celebrity", true).order("name");
      if (error) throw error;
      return (data ?? []) as AdminProfile[];
    },
  });
}

export type ItemCounts = { works: number; milestones: number };

// How many works and milestones each profile has, for the overview's "what's missing" marks.
export function useItemCounts() {
  return useQuery({
    queryKey: ["admin", "item-counts"],
    queryFn: async (): Promise<Map<string, ItemCounts>> => {
      const { data, error } = await db.from("memorial_items").select("profile_id, kind").in("kind", ["work", "milestone"]);
      if (error) throw error;
      const counts = new Map<string, ItemCounts>();
      for (const row of (data ?? []) as { profile_id: string; kind: string }[]) {
        const entry = counts.get(row.profile_id) ?? { works: 0, milestones: 0 };
        if (row.kind === "work") entry.works += 1;
        else entry.milestones += 1;
        counts.set(row.profile_id, entry);
      }
      return counts;
    },
  });
}

export function useFlowerCounts() {
  return useQuery({
    queryKey: ["admin", "flowers"],
    queryFn: async (): Promise<Map<string, number>> => {
      const { data, error } = await db.from("memorial_flowers").select("profile_id, flower_count");
      if (error) throw error;
      return new Map(((data ?? []) as { profile_id: string; flower_count: number }[]).map((row) => [row.profile_id, Number(row.flower_count)]));
    },
  });
}

export function useAdminProfile(id: string | undefined) {
  return useQuery({
    queryKey: ["admin", "profile", id],
    enabled: !!id,
    queryFn: async (): Promise<AdminProfile | null> => {
      const { data, error } = await db.from("profiles").select(profileColumns).eq("id", id).maybeSingle();
      if (error) throw error;
      return data as AdminProfile | null;
    },
  });
}

export function useSaveProfile() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async ({ id, draft }: { id: string | null; draft: ProfileDraft }): Promise<string> => {
      // Artist pages are celebrity profiles; is_buried mirrors Hoa Viên as in the rest of the data.
      const row = { ...draft, is_celebrity: true, is_buried: draft.in_hoa_vien };
      if (id) {
        const { error } = await db.from("profiles").update(row).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await db.from("profiles").insert(row).select("id").single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: (id) => refresh(["admin", "profiles"], ["admin", "profile", id]),
  });
}

export const draftOf = ({ id: _id, updated_at: _updated, ...draft }: AdminProfile): ProfileDraft => draft;

// The overview's quick edit changes a few fields and keeps the rest as stored.
export function useQuickSaveProfile() {
  const save = useSaveProfile();
  return useMutation({
    mutationFn: ({ profile, changes }: { profile: AdminProfile; changes: Partial<ProfileDraft> }) =>
      save.mutateAsync({ id: profile.id, draft: { ...draftOf(profile), ...changes } }),
  });
}

export async function uploadPortrait(file: File, slug: string): Promise<string> {
  const blob = await shrinkPhoto(file);
  const path = `${slug || "chan-dung"}-${Date.now()}.jpg`;
  const { error } = await db.storage.from(PORTRAIT_BUCKET).upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw error;
  return db.storage.from(PORTRAIT_BUCKET).getPublicUrl(path).data.publicUrl;
}

export function useAdminItems(profileId: string | undefined) {
  return useQuery({
    queryKey: ["admin", "items", profileId],
    enabled: !!profileId,
    queryFn: async (): Promise<AdminItem[]> => {
      const { data, error } = await db.from("memorial_items").select(itemColumns).eq("profile_id", profileId)
        .in("kind", ["work", "milestone"]).order("display_order").order("year", { nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as AdminItem[];
    },
  });
}

export function useSaveItem(profileId: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (item: Omit<AdminItem, "id"> & { id?: string }) => {
      const { id, ...row } = item;
      const { error } = id
        ? await db.from("memorial_items").update(row).eq("id", id)
        : await db.from("memorial_items").insert(row);
      if (error) throw error;
    },
    onSuccess: () => refresh(["admin", "items", profileId], ["admin", "item-counts"]),
  });
}

export function useDeleteItem(profileId: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("memorial_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => refresh(["admin", "items", profileId], ["admin", "item-counts"]),
  });
}

// Swaps two neighbours by rewriting the whole list's order, so gaps and duplicates in old data disappear.
export function useReorderItems(profileId: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (ordered: AdminItem[]) => {
      for (const [index, item] of ordered.entries()) {
        if (item.display_order === index) continue;
        const { error } = await db.from("memorial_items").update({ display_order: index }).eq("id", item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => refresh(["admin", "items", profileId]),
  });
}

export function useAdminPhotos(filter: { profileId?: string; pending?: boolean }) {
  return useQuery({
    queryKey: ["admin", "photos", filter],
    queryFn: async (): Promise<AdminPhoto[]> => {
      let query = db.from("photos").select(photoColumns);
      if (filter.profileId) query = query.eq("profile_id", filter.profileId);
      if (filter.pending) query = query.eq("is_approved", false);
      const { data, error } = await query.order("display_order").order("created_at");
      if (error) throw error;
      return (data ?? []) as AdminPhoto[];
    },
  });
}

export function useAddArchivePhoto(profileId: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async ({ file, caption }: { file: File; caption: string }) => {
      const blob = await shrinkPhoto(file);
      const path = `archive/${profileId}/${crypto.randomUUID()}.jpg`;
      const upload = await db.storage.from(PORTRAIT_BUCKET).upload(path, blob, { contentType: "image/jpeg" });
      if (upload.error) throw upload.error;
      const url = db.storage.from(PORTRAIT_BUCKET).getPublicUrl(path).data.publicUrl;
      const { error } = await db.from("photos").insert({ profile_id: profileId, url, caption: caption.trim() || null, is_approved: true, display_order: 0 });
      if (error) throw error;
    },
    onSuccess: () => refresh(["admin", "photos"]),
  });
}

export function useUpdatePhoto() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async ({ id, changes }: { id: string; changes: Partial<Pick<AdminPhoto, "caption" | "is_approved">> }) => {
      const { error } = await db.from("photos").update(changes).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => refresh(["admin", "photos"]),
  });
}

// Removes the file when it lives in our own storage; links to elsewhere are left alone.
async function removeStoredFile(url: string) {
  for (const bucket of [VISITOR_PHOTO_BUCKET, PORTRAIT_BUCKET]) {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const at = url.indexOf(marker);
    if (at !== -1) await db.storage.from(bucket).remove([decodeURIComponent(url.slice(at + marker.length))]);
  }
}

export function useDeletePhoto() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (photo: AdminPhoto) => {
      await removeStoredFile(photo.url);
      const { error } = await db.from("photos").delete().eq("id", photo.id);
      if (error) throw error;
    },
    onSuccess: () => refresh(["admin", "photos"]),
  });
}

export function useAdminTributes(ids?: string[]) {
  return useQuery({
    queryKey: ["admin", "tributes", ids ?? "recent"],
    enabled: !ids || ids.length > 0,
    queryFn: async (): Promise<AdminTribute[]> => {
      let query = db.from("comments").select("id, profile_id, author_name, content, prompt, is_public, created_at");
      query = ids ? query.in("id", ids) : query.order("created_at", { ascending: false }).limit(200);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as AdminTribute[];
    },
  });
}

export function useUpdateTribute() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async ({ id, is_public }: { id: string; is_public: boolean }) => {
      const { error } = await db.from("comments").update({ is_public }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => refresh(["admin", "tributes"]),
  });
}

export function useDeleteTribute() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (id: string) => {
      // The photos' rows go with the memory (on delete cascade); their files have to be removed here.
      const { data } = await db.from("photos").select("url").eq("comment_id", id);
      for (const photo of (data ?? []) as { url: string }[]) await removeStoredFile(photo.url);
      const { error } = await db.from("comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => refresh(["admin", "tributes"], ["admin", "photos"]),
  });
}
