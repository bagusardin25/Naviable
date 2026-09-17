-- Behavioural tests for 001_naviable.sql (constraints, publish_report transaction, RLS).
-- Run against a throwaway cluster with `npm run test:sql`.
-- Every failure raises, so psql --set ON_ERROR_STOP=1 reports a non-zero exit code.
\set ON_ERROR_STOP on

truncate public.place_elements, public.reports, public.places cascade;
insert into public.places (id, name, category, evidence_level, lat, lng, needs_geocoding) values
  ('uji-puskesmas', 'Puskesmas Uji', 'health', 'pre_survey', -7.2500, 112.7500, false),
  ('uji-tanpa-koordinat', 'Lokasi Tanpa Koordinat', 'public_service', 'pre_survey', null, null, true);

-- 1. Schema constraints reject incoherent seed rows before any report arrives.
do $$
declare violated text;
begin
  begin
    insert into public.places (id, name, category, evidence_level, lat, lng, needs_geocoding)
      values ('bad id!', 'X', 'health', 'pre_survey', -7.2, 112.7, false);
    raise exception 'FAIL: id pattern accepted';
  exception when check_violation then null; end;

  begin
    -- needs_geocoding = false must imply real coordinates.
    insert into public.places (id, name, category, evidence_level, lat, lng, needs_geocoding)
      values ('uji-bad-lat', 'X', 'health', 'pre_survey', null, null, false);
    raise exception 'FAIL: geocoded place without coordinates accepted';
  exception when check_violation then null; end;

  begin
    -- lat and lng must be null together.
    insert into public.places (id, name, category, evidence_level, lat, lng, needs_geocoding)
      values ('uji-half', 'X', 'health', 'pre_survey', -7.2, null, true);
    raise exception 'FAIL: half-filled coordinate pair accepted';
  exception when check_violation then null; end;

  begin
    insert into public.place_elements (place_id, element_code, status, report_id)
      values ('uji-puskesmas', 'E9_teleport', 'UTUH', '11111111-1111-4111-8111-111111111111');
    raise exception 'FAIL: unknown element code accepted';
  exception when check_violation then null; end;

  begin
    insert into public.place_elements (place_id, element_code, status, report_id, locked_by)
      values ('uji-puskesmas', 'E1_door', 'UTUH', '11111111-1111-4111-8111-111111111111', 'ai_draf');
    raise exception 'FAIL: AI-authored element accepted as locked evidence';
  exception when check_violation then null; end;

  raise notice 'PASS 1: constraints reject bad IDs, incoherent coordinates and non-contributor locks';
end $$;

-- 2. A first publish writes the report, locks the elements and bumps the counters.
do $$
declare
  payload jsonb := jsonb_build_object(
    'id', '11111111-1111-4111-8111-111111111111', 'placeId', 'uji-puskesmas',
    'actorId', 'contributor-1', 'reporterName', 'Dimas', 'requestKey', '22222222-2222-4222-8222-222222222222',
    'inputHash', 'hash-1', 'photoPath', 'reports/first.png', 'mimeType', 'image/png',
    'createdAt', '2000-01-01T00:00:00.000Z',
    'elements', jsonb_build_array(
      jsonb_build_object('element', 'E5_guiding_block', 'status', 'TERHALANG', 'note', 'Terhalang motor'),
      jsonb_build_object('element', 'E2_ramp', 'status', 'TIDAK_STANDAR')));
  result jsonb;
  place public.places%rowtype;
  element public.place_elements%rowtype;
begin
  result := public.publish_report(payload);

  if result->>'id' <> '11111111-1111-4111-8111-111111111111' then raise exception 'FAIL: returned id %', result->>'id'; end if;
  if result->>'createdAt' = '2000-01-01T00:00:00.000Z' then raise exception 'FAIL: server timestamp not applied'; end if;
  if result->>'photoPath' <> 'reports/first.png' then raise exception 'FAIL: payload not preserved'; end if;

  select * into place from public.places where id = 'uji-puskesmas';
  if place.report_count <> 1 or place.photo_count <> 1 then raise exception 'FAIL: counters % / %', place.report_count, place.photo_count; end if;
  if place.updated_at is null then raise exception 'FAIL: updated_at not stamped'; end if;
  if place.verified_by_team then raise exception 'FAIL: a citizen report must never auto-verify a place'; end if;

  select * into element from public.place_elements where place_id = 'uji-puskesmas' and element_code = 'E5_guiding_block';
  if element.status <> 'TERHALANG' or element.note <> 'Terhalang motor' then raise exception 'FAIL: element % / %', element.status, element.note; end if;
  if element.locked_by <> 'kontributor' then raise exception 'FAIL: lock author %', element.locked_by; end if;
  if (select count(*) from public.reports where place_id = 'uji-puskesmas') <> 1 then raise exception 'FAIL: report row missing'; end if;

  raise notice 'PASS 2: first publish writes audit row, locks elements and bumps counters';
end $$;

-- 3. Same idempotency key + same payload replays without writing twice.
do $$
declare
  retry jsonb;
  first jsonb;
  replayed jsonb;
  place public.places%rowtype;
begin
  select r.payload into first from public.reports r
    where r.actor_id = 'contributor-1' and r.request_key = '22222222-2222-4222-8222-222222222222';
  retry := first || jsonb_build_object('reporterName', 'Dimas');  -- retry of the identical submission
  replayed := public.publish_report(retry);

  if replayed->>'id' <> first->>'id' then raise exception 'FAIL: replay returned a new report id'; end if;
  if replayed->>'createdAt' <> first->>'createdAt' then raise exception 'FAIL: replay returned a different timestamp'; end if;
  select * into place from public.places where id = 'uji-puskesmas';
  if place.report_count <> 1 or place.photo_count <> 1 then raise exception 'FAIL: replay double-counted (% / %)', place.report_count, place.photo_count; end if;
  if (select count(*) from public.reports) <> 1 then raise exception 'FAIL: replay inserted a row'; end if;

  raise notice 'PASS 3: retry with the same key replays the stored report';
end $$;

-- 4. Reusing a key with different content is a conflict, not a silent overwrite.
do $$
declare raised boolean := false;
begin
  begin
    perform public.publish_report(jsonb_build_object(
      'id', '33333333-3333-4333-8333-333333333333', 'placeId', 'uji-puskesmas',
      'actorId', 'contributor-1', 'reporterName', 'Penyerang', 'requestKey', '22222222-2222-4222-8222-222222222222',
      'inputHash', 'different-hash', 'photoPath', 'reports/second.png', 'mimeType', 'image/png',
      'createdAt', '2000-01-01T00:00:00.000Z',
      'elements', jsonb_build_array(jsonb_build_object('element', 'E1_door', 'status', 'UTUH'))));
  exception when others then
    raised := true;
    if sqlerrm <> 'idempotency_conflict' then raise; end if;
  end;
  if not raised then raise exception 'FAIL: key reuse with different content was accepted'; end if;
  if (select count(*) from public.reports) <> 1 then raise exception 'FAIL: conflict wrote a row'; end if;

  raise notice 'PASS 4: key reuse with different content raises idempotency_conflict';
end $$;

-- 5. Rejected submissions leave no partial state behind (atomicity).
do $$
declare
  payload jsonb := jsonb_build_object(
    'id', '44444444-4444-4444-8444-444444444444', 'placeId', 'uji-puskesmas',
    'actorId', 'contributor-2', 'reporterName', 'Rina', 'requestKey', '55555555-5555-4555-8555-555555555555',
    'inputHash', 'hash-dup', 'photoPath', 'reports/dup.png', 'mimeType', 'image/png',
    'createdAt', '2000-01-01T00:00:00.000Z',
    'elements', jsonb_build_array(
      jsonb_build_object('element', 'E1_door', 'status', 'UTUH'),
      jsonb_build_object('element', 'E1_door', 'status', 'TIDAK_ADA')));
  before_count integer := (select report_count from public.places where id = 'uji-puskesmas');
  failed integer := 0;
begin
  begin perform public.publish_report(payload);
  exception when others then
    failed := failed + 1;
    if sqlerrm <> 'duplicate_elements' then raise; end if; end;

  begin perform public.publish_report(payload || jsonb_build_object('elements', '[]'::jsonb, 'inputHash', 'hash-empty'));
  exception when others then
    failed := failed + 1;
    if sqlerrm <> 'invalid_elements' then raise; end if; end;

  begin perform public.publish_report(payload || jsonb_build_object('placeId', 'tidak-ada', 'inputHash', 'hash-missing'));
  exception when foreign_key_violation then failed := failed + 1; end;

  if failed <> 3 then raise exception 'FAIL: expected 3 rejected submissions, got %', failed; end if;
  if (select report_count from public.places where id = 'uji-puskesmas') <> before_count then raise exception 'FAIL: rejected writes bumped counters'; end if;
  if (select count(*) from public.reports where actor_id = 'contributor-2') <> 0 then raise exception 'FAIL: rejected writes persisted a report'; end if;
  if (select count(*) from public.place_elements where place_id = 'uji-puskesmas') <> 2 then raise exception 'FAIL: rejected writes damaged elements'; end if;

  raise notice 'PASS 5: duplicate elements, empty checklists and missing places roll back cleanly';
end $$;

-- 6. A correction with a fresh key updates the element in place and keeps history.
do $$
declare
  correction jsonb := jsonb_build_object(
    'id', '66666666-6666-4666-8666-666666666666', 'placeId', 'uji-puskesmas',
    'actorId', 'contributor-2', 'reporterName', 'Rina', 'requestKey', '77777777-7777-4777-8777-777777777777',
    'inputHash', 'hash-correction', 'photoPath', 'reports/correction.png', 'mimeType', 'image/png',
    'createdAt', '2000-01-01T00:00:00.000Z',
    'elements', jsonb_build_array(jsonb_build_object('element', 'E5_guiding_block', 'status', 'UTUH', 'note', 'Hambatan dipindahkan')));
  place public.places%rowtype;
  element public.place_elements%rowtype;
begin
  perform public.publish_report(correction);

  select * into place from public.places where id = 'uji-puskesmas';
  if place.report_count <> 2 or place.photo_count <> 2 then raise exception 'FAIL: counters % / %', place.report_count, place.photo_count; end if;

  select * into element from public.place_elements where place_id = 'uji-puskesmas' and element_code = 'E5_guiding_block';
  if element.status <> 'UTUH' or element.note <> 'Hambatan dipindahkan' then raise exception 'FAIL: correction did not update the element'; end if;
  if element.report_id <> '66666666-6666-4666-8666-666666666666' then raise exception 'FAIL: element points at the wrong report'; end if;
  if (select count(*) from public.place_elements where place_id = 'uji-puskesmas') <> 2 then raise exception 'FAIL: correction duplicated element rows'; end if;
  if (select count(*) from public.reports where place_id = 'uji-puskesmas') <> 2 then raise exception 'FAIL: superseded report row was discarded'; end if;

  raise notice 'PASS 6: corrections overwrite the element, keep both reports and re-count once';
end $$;

-- 7. RLS/grants: only the server role may touch evidence.
do $$
declare
  protected_table text;
  protected_privilege text;
begin
  foreach protected_table in array array['places', 'reports', 'place_elements'] loop
    if not (select relrowsecurity from pg_class where oid = format('public.%I', protected_table)::regclass) then
      raise exception 'FAIL: RLS disabled on %', protected_table;
    end if;
    foreach protected_privilege in array array['select', 'insert', 'update', 'delete'] loop
      if has_table_privilege('anon', format('public.%I', protected_table), protected_privilege) then
        raise exception 'FAIL: anon holds % on %', protected_privilege, protected_table;
      end if;
      if has_table_privilege('authenticated', format('public.%I', protected_table), protected_privilege) then
        raise exception 'FAIL: authenticated holds % on %', protected_privilege, protected_table;
      end if;
    end loop;
  end loop;

  if has_function_privilege('anon', 'public.publish_report(jsonb)', 'execute') then raise exception 'FAIL: anon can call publish_report'; end if;
  if has_function_privilege('authenticated', 'public.publish_report(jsonb)', 'execute') then raise exception 'FAIL: authenticated can call publish_report'; end if;
  if not has_function_privilege('service_role', 'public.publish_report(jsonb)', 'execute') then raise exception 'FAIL: service_role cannot call publish_report'; end if;
  if not has_table_privilege('service_role', 'public.places', 'select') then raise exception 'FAIL: service_role cannot read places'; end if;

  raise notice 'PASS 7: RLS is on and only service_role holds evidence privileges';
end $$;

select 'ALL SQL TESTS PASSED' as result,
       (select count(*) from public.places) as places,
       (select count(*) from public.reports) as reports;
