-- A short excerpt of a work (a few lines of a poem, a passage of prose), shown with the work on the artist page.
-- Keep it to a few lines and name the work: it is a quotation, not the full text.
alter table public.memorial_items add column if not exists excerpt text;
alter table public.memorial_items drop constraint if exists memorial_items_excerpt_length;
alter table public.memorial_items add constraint memorial_items_excerpt_length check (excerpt is null or char_length(excerpt) <= 1200);

comment on column public.memorial_items.excerpt is 'Short excerpt of a work, line breaks kept, shown on the artist page.';
