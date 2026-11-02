-- Lets staff remove visitor photos they reject from the admin page (/quan-tri).
drop policy if exists "Staff can manage visitor photos" on storage.objects;
create policy "Staff can manage visitor photos" on storage.objects for all to authenticated
  using (bucket_id = 'visitor-photos' and public.has_valid_role())
  with check (bucket_id = 'visitor-photos' and public.has_valid_role());
