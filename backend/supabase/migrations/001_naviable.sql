-- Naviable core schema: tables, RLS, storage-agnostic publish transaction.
-- Runs on any PostgreSQL 14+ (including plain local clusters). Supabase-specific
-- extras (PostGIS index, private Storage bucket) live in 002_supabase_extras.sql.
-- Apply before `npm run seed`.
begin;

create table public.places (
  id text primary key check (id ~ '^[A-Za-z0-9_-]{1,120}$'),
  name text not null, category text not null, city text not null default 'Surabaya',
  address text, kecamatan text, kelurahan text,
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  pre_survey jsonb not null default '{}', sources jsonb not null default '[]',
  evidence_level text not null, verified_by_team boolean not null default false,
  needs_geocoding boolean not null default true,
  updated_at timestamptz, photo_count integer not null default 0 check (photo_count >= 0),
  report_count integer not null default 0 check (report_count >= 0),
  check ((lat is null) = (lng is null)),
  check (needs_geocoding or lat is not null)
);
create index places_district_idx on public.places (kecamatan, category);

create table public.reports (
  id uuid primary key,
  place_id text not null references public.places(id),
  actor_id text not null, request_key uuid not null,
  input_hash text not null, payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (actor_id, request_key)
);
create index reports_history_idx on public.reports (place_id, created_at desc);
create table public.place_elements (
  place_id text not null references public.places(id),
  element_code text not null check (element_code in ('E1_door','E2_ramp','E3_toilet','E4_lift','E5_guiding_block','E6_parking','E7_signage','E8_crossing')),
  status text not null check (status in ('UTUH','TERHALANG','TIDAK_STANDAR','TIDAK_ADA','BELUM_DIKETAHUI')),
  note text check (length(note) <= 1000),
  report_id uuid not null references public.reports(id),
  locked_by text not null default 'kontributor' check (locked_by = 'kontributor'),
  updated_at timestamptz not null default now(),
  primary key (place_id, element_code)
);

-- All access goes through the API; no browser role may bypass validation.
alter table public.places enable row level security;
alter table public.reports enable row level security;
alter table public.place_elements enable row level security;
revoke all on public.places, public.reports, public.place_elements from anon, authenticated;
grant all on public.places, public.reports, public.place_elements to service_role;

create function public.publish_report(p_report jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare previous public.reports%rowtype; item jsonb; saved jsonb;
begin
  -- Serialize retries, then serialize all element updates for the same location.
  perform pg_advisory_xact_lock(hashtextextended((p_report->>'actorId') || ':' || (p_report->>'requestKey'), 0));
  select * into previous from public.reports where actor_id = p_report->>'actorId' and request_key = (p_report->>'requestKey')::uuid;
  if found then
    if previous.input_hash <> p_report->>'inputHash' then raise exception 'idempotency_conflict'; end if;
    return previous.payload;
  end if;
  perform 1 from public.places where id = p_report->>'placeId' for update;
  if not found then raise exception 'place_not_found' using errcode = '23503'; end if;
  if jsonb_array_length(p_report->'elements') not between 1 and 8 then raise exception 'invalid_elements'; end if;
  if (select count(distinct value->>'element') from jsonb_array_elements(p_report->'elements')) <> jsonb_array_length(p_report->'elements') then raise exception 'duplicate_elements'; end if;
  saved := jsonb_set(p_report, '{createdAt}', to_jsonb(clock_timestamp()));
  insert into public.reports(id, place_id, actor_id, request_key, input_hash, payload, created_at)
    values ((saved->>'id')::uuid, saved->>'placeId', saved->>'actorId', (saved->>'requestKey')::uuid, saved->>'inputHash', saved, (saved->>'createdAt')::timestamptz);
  for item in select value from jsonb_array_elements(saved->'elements') loop
    insert into public.place_elements(place_id, element_code, status, note, report_id, updated_at)
      values (saved->>'placeId', item->>'element', item->>'status', item->>'note', (saved->>'id')::uuid, (saved->>'createdAt')::timestamptz)
      on conflict (place_id, element_code) do update set status = excluded.status, note = excluded.note, report_id = excluded.report_id, updated_at = excluded.updated_at;
  end loop;
  update public.places set report_count = report_count + 1, photo_count = photo_count + 1, updated_at = (saved->>'createdAt')::timestamptz where id = saved->>'placeId';
  return saved;
end;
$$;
revoke all on function public.publish_report(jsonb) from public, anon, authenticated;
grant execute on function public.publish_report(jsonb) to service_role;
commit;
