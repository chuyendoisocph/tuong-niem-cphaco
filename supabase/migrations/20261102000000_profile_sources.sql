-- Reference links shown under a profile: [{ "title": "...", "url": "https://..." }].
alter table public.profiles add column if not exists sources jsonb;
grant select (sources) on public.profiles to anon;
grant select (sources) on public.profiles to authenticated;
