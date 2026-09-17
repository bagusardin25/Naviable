-- Supabase-only extras. Apply after 001_naviable.sql.
--
-- Neither statement is required by the API: bounding-box filtering happens in the
-- places query and the photo bucket is only read through createSignedUrl. They are
-- split out so the core migration stays runnable on a plain PostgreSQL cluster
-- (PostGIS and the `storage` schema do not exist outside Supabase).
begin;

create schema if not exists extensions;
create extension if not exists postgis with schema extensions;

-- Nearby-place lookups once the seed grows past a single-city in-memory scan.
create index places_location_idx on public.places using gist
  ((extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography))
  where lat is not null and lng is not null;

-- Private bucket: report photos are served only via short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('photos', 'photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
  on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
commit;
