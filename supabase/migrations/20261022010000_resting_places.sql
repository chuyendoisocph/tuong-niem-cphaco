-- Resting place details, so artists buried outside Hoa Viên can have memorial pages with directions.
-- in_hoa_vien:      true for Đường Nghệ Sỹ, Hoa Viên Bình Dương (grave_area / grave_lot / grave_number apply).
-- resting_place:    name of the cemetery or temple elsewhere, e.g. "Nghĩa trang Gò Dưa".
-- resting_address:  street address as text.
-- latitude/longitude: GPS position of the grave, used for the directions link.

alter table public.profiles add column if not exists in_hoa_vien boolean not null default true;
alter table public.profiles add column if not exists resting_place text;
alter table public.profiles add column if not exists resting_address text;
alter table public.profiles add column if not exists latitude double precision;
alter table public.profiles add column if not exists longitude double precision;

alter table public.profiles drop constraint if exists profiles_latitude_range;
alter table public.profiles add constraint profiles_latitude_range check (latitude is null or latitude between -90 and 90);
alter table public.profiles drop constraint if exists profiles_longitude_range;
alter table public.profiles add constraint profiles_longitude_range check (longitude is null or longitude between -180 and 180);

comment on column public.profiles.in_hoa_vien is 'Artist rests at Đường Nghệ Sỹ, Hoa Viên Bình Dương.';
comment on column public.profiles.resting_place is 'Cemetery or temple name when the artist rests outside Hoa Viên.';
comment on column public.profiles.resting_address is 'Street address of the resting place.';
comment on column public.profiles.latitude is 'GPS latitude of the grave.';
comment on column public.profiles.longitude is 'GPS longitude of the grave.';
