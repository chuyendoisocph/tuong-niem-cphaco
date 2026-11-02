-- Photos and guided memories from visitors.
-- comments.prompt:     the suggested question a visitor chose to answer, shown above their memory.
-- photos.comment_id:   the memory a visitor photo belongs to; null for archive photos added by staff.
-- photos.author_name:  who sent the photo, shown as its credit.
-- photos.is_approved:  visitor photos wait for staff to set this to true before anyone sees them.

alter table public.comments add column if not exists prompt text;
alter table public.comments drop constraint if exists comments_prompt_length;
alter table public.comments add constraint comments_prompt_length check (prompt is null or char_length(prompt) <= 200);

-- comments has column-level grants for visitors. The form sends its own id (to attach photos), the public/private
-- choice and the chosen question, so those columns need insert rights; the question is also shown on the page.
grant insert (id, is_public, prompt) on public.comments to anon;
grant select (prompt) on public.comments to anon;

alter table public.photos add column if not exists comment_id uuid references public.comments(id) on delete cascade;
alter table public.photos add column if not exists author_name text;
alter table public.photos add column if not exists is_approved boolean not null default true;
alter table public.photos drop constraint if exists photos_author_name_length;
alter table public.photos add constraint photos_author_name_length check (author_name is null or char_length(author_name) <= 100);
alter table public.photos drop constraint if exists photos_caption_length;
alter table public.photos add constraint photos_caption_length check (caption is null or char_length(caption) <= 300);
create index if not exists photos_comment_id_idx on public.photos (comment_id);

drop policy if exists "Anyone can view photos of published profiles" on public.photos;
create policy "Anyone can view photos of published profiles" on public.photos for select
  using (is_approved and exists (select 1 from public.profiles p where p.id = photos.profile_id and p.is_published = true));

-- Visitors may only add unapproved photos stored in the visitor-photos bucket, attached to a memory.
drop policy if exists "Visitors can add photos to published profiles" on public.photos;
create policy "Visitors can add photos to published profiles" on public.photos for insert to anon, authenticated
  with check (
    is_approved = false
    and comment_id is not null
    and author_name is not null
    and url like 'https://trsfzxsiztxcljnwhdyb.supabase.co/storage/v1/object/public/visitor-photos/visitor/%'
    and exists (select 1 from public.profiles p where p.id = photos.profile_id and p.is_published = true)
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('visitor-photos', 'visitor-photos', true, 5242880, array['image/jpeg', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Visitors can upload memorial photos" on storage.objects;
create policy "Visitors can upload memorial photos" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'visitor-photos' and (storage.foldername(name))[1] = 'visitor');

comment on column public.comments.prompt is 'Suggested question the visitor answered.';
comment on column public.photos.comment_id is 'Visitor memory this photo belongs to; null for archive photos.';
comment on column public.photos.author_name is 'Who sent the photo.';
comment on column public.photos.is_approved is 'Visitor photos stay hidden until staff approve them.';
