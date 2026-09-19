-- Additive migration: new locations use the existing report/evidence transaction.
begin;
create function public.create_place_report(p_place jsonb, p_report jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare previous public.reports%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended((p_report->>'actorId') || ':' || (p_report->>'requestKey'), 0));
  select * into previous from public.reports where actor_id = p_report->>'actorId' and request_key = (p_report->>'requestKey')::uuid;
  if found then
    if previous.input_hash <> p_report->>'inputHash' then raise exception 'idempotency_conflict'; end if;
    return previous.payload;
  end if;
  if p_place->>'id' <> p_report->>'placeId' then raise exception 'place_mismatch'; end if;
  insert into public.places(id, name, category, city, address, lat, lng, evidence_level, verified_by_team, needs_geocoding)
    values (p_place->>'id', p_place->>'name', p_place->>'category', 'Surabaya', p_place->>'address',
      (p_place->>'lat')::double precision, (p_place->>'lng')::double precision, 'contributor', false, false);
  return public.publish_report(p_report);
end;
$$;
revoke all on function public.create_place_report(jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.create_place_report(jsonb,jsonb) to service_role;

create table public.reviews (
  id uuid primary key, place_id text not null references public.places(id),
  actor_id text not null, request_key uuid not null, input_hash text not null,
  payload jsonb not null, created_at timestamptz not null default now(),
  unique(actor_id, request_key),
  check (length(payload->>'reviewerName') between 1 and 80),
  check (length(payload->>'experience') between 10 and 2000)
);
create index reviews_place_idx on public.reviews(place_id, created_at desc);
alter table public.reviews enable row level security;
revoke all on public.reviews from anon, authenticated;
grant all on public.reviews to service_role;
create function public.publish_review(p_review jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare previous public.reviews%rowtype; saved jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended('review:' || (p_review->>'actorId') || ':' || (p_review->>'requestKey'), 0));
  select * into previous from public.reviews where actor_id = p_review->>'actorId' and request_key = (p_review->>'requestKey')::uuid;
  if found then
    if previous.input_hash <> p_review->>'inputHash' then raise exception 'idempotency_conflict'; end if;
    return previous.payload;
  end if;
  saved := jsonb_set(p_review, '{createdAt}', to_jsonb(clock_timestamp()));
  insert into public.reviews(id,place_id,actor_id,request_key,input_hash,payload,created_at)
    values ((saved->>'id')::uuid, saved->>'placeId', saved->>'actorId', (saved->>'requestKey')::uuid,
      saved->>'inputHash', saved, (saved->>'createdAt')::timestamptz);
  return saved;
end;
$$;
revoke all on function public.publish_review(jsonb) from public, anon, authenticated;
grant execute on function public.publish_review(jsonb) to service_role;
commit;
