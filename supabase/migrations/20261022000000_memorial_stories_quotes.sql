-- Stories and listen links for featured works, plus quotes from people who knew the artist.
-- Works:  story = 2-3 sentences on why the work matters; url = a listen/watch link Hoa Viên may use.
-- Quotes: kind = 'quote', title = the quote, description = who said it, source = where it was published,
--         url = link to that publication.

alter table public.memorial_items add column if not exists story text;
alter table public.memorial_items add column if not exists source text;

alter table public.memorial_items drop constraint if exists memorial_items_kind_check;
alter table public.memorial_items add constraint memorial_items_kind_check
  check (kind = any (array['milestone', 'work', 'video', 'press', 'quote']));

comment on column public.memorial_items.story is 'Short story behind a work, shown in "Hôm nay nhớ lại".';
comment on column public.memorial_items.source is 'Publication a quote comes from, shown in "Lời người ở lại".';
