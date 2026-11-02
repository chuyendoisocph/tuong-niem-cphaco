-- Public bucket for portraits (profiles.avatar_url) added outside the Sổ Tang admin, which uses Cloudinary.
-- Staff upload here; visitors can only read.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portraits', 'portraits', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Staff can manage portraits" on storage.objects;
create policy "Staff can manage portraits" on storage.objects for all to authenticated
  using (bucket_id = 'portraits' and public.has_valid_role())
  with check (bucket_id = 'portraits' and public.has_valid_role());
