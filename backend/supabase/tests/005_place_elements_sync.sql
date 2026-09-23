-- Behavioural tests for 007: "Kondisi akses" (place_elements) always matches the reports
-- that still stand, newest first. Run with `npm run test:sql`.
\set ON_ERROR_STOP on

truncate public.place_elements, public.reports, public.places cascade;
insert into public.places (id, name, category, evidence_level, lat, lng, needs_geocoding) values
  ('uji-sync', 'Tempat Uji Sinkron', 'health', 'pre_survey', -7.2500, 112.7500, false);

create function pg_temp.report(id text, key text, elements jsonb) returns jsonb language sql as $$
  select jsonb_build_object('id', id, 'placeId', 'uji-sync', 'actorId', 'contributor-sync', 'reporterName', 'Uji',
    'requestKey', key, 'inputHash', 'hash-' || id, 'photoPath', 'reports/' || id || '.png', 'mimeType', 'image/png',
    'createdAt', '2000-01-01T00:00:00.000Z', 'elements', elements)
$$;
create function pg_temp.door() returns text language sql as $$
  select coalesce((select status from public.place_elements where place_id = 'uji-sync' and element_code = 'E1_door'), 'none')
$$;
create function pg_temp.reports_counted() returns integer language sql as $$
  select report_count from public.places where id = 'uji-sync'
$$;

-- A: door intact. B: door unknown. C: door missing.
select public.publish_report(pg_temp.report('d1111111-1111-4111-8111-111111111111', 'd2222222-2222-4222-8222-222222222221',
  '[{"element":"E1_door","status":"UTUH","note":"Pintu lebar"}]'));
select public.publish_report(pg_temp.report('d1111111-1111-4111-8111-111111111112', 'd2222222-2222-4222-8222-222222222222',
  '[{"element":"E1_door","status":"BELUM_DIKETAHUI"}]'));

-- 1. "Belum diketahui" in a newer report never erases known evidence.
do $$
begin
  if pg_temp.door() <> 'UTUH' then raise exception 'FAIL: BELUM_DIKETAHUI overwrote evidence (%)', pg_temp.door(); end if;
  if pg_temp.reports_counted() <> 2 then raise exception 'FAIL: report_count %', pg_temp.reports_counted(); end if;
  raise notice 'PASS 1: an unknown status keeps the known one';
end $$;

select public.publish_report(pg_temp.report('d1111111-1111-4111-8111-111111111113', 'd2222222-2222-4222-8222-222222222223',
  '[{"element":"E1_door","status":"TIDAK_ADA"}]'));

-- 2. Rejecting the newest report rolls the element back and drops it from the count.
do $$
begin
  if pg_temp.door() <> 'TIDAK_ADA' then raise exception 'FAIL: newest report not applied (%)', pg_temp.door(); end if;
  perform public.review_report('d1111111-1111-4111-8111-111111111113'::uuid, 'r', 'REJECTED', 'Foto bukan lokasi ini.');
  if pg_temp.door() <> 'UTUH' then raise exception 'FAIL: rejection did not roll back (%)', pg_temp.door(); end if;
  if pg_temp.reports_counted() <> 2 then raise exception 'FAIL: rejected report still counted (%)', pg_temp.reports_counted(); end if;
  raise notice 'PASS 2: a rejected report no longer shows on the place';
end $$;

-- 3. A reviewer correction is stored on the report and is what the place shows.
do $$
declare corrected jsonb;
begin
  perform public.review_report('d1111111-1111-4111-8111-111111111111'::uuid, 'r', 'APPROVED', '', '{}',
    '[{"element":"E1_door","status":"TERHALANG","note":"Terhalang pot"}]');
  if pg_temp.door() <> 'TERHALANG' then raise exception 'FAIL: correction not applied (%)', pg_temp.door(); end if;
  select reviewed_elements into corrected from public.reports where id = 'd1111111-1111-4111-8111-111111111111';
  if corrected->0->>'status' <> 'TERHALANG' then raise exception 'FAIL: correction not stored on the report'; end if;
  raise notice 'PASS 3: reviewer corrections are kept on the report and shown on the place';
end $$;

-- 4. Approving an older report never overwrites a newer one.
select public.publish_report(pg_temp.report('d1111111-1111-4111-8111-111111111114', 'd2222222-2222-4222-8222-222222222224',
  '[{"element":"E1_door","status":"TIDAK_STANDAR"}]'));
do $$
begin
  perform public.review_report('d1111111-1111-4111-8111-111111111111'::uuid, 'r', 'APPROVED', 'Dicek ulang.');
  if pg_temp.door() <> 'TIDAK_STANDAR' then raise exception 'FAIL: older approval overwrote newer report (%)', pg_temp.door(); end if;
  raise notice 'PASS 4: approving an older report keeps the newer status';
end $$;

-- 5. Sending every definite report back leaves the element unknown again.
do $$
begin
  perform public.review_report('d1111111-1111-4111-8111-111111111114'::uuid, 'r', 'NEEDS_REVISION', 'Foto buram.');
  perform public.review_report('d1111111-1111-4111-8111-111111111111'::uuid, 'r', 'NEEDS_REVISION', 'Foto buram.');
  if pg_temp.door() <> 'none' then raise exception 'FAIL: element survived without a standing report (%)', pg_temp.door(); end if;
  if pg_temp.reports_counted() <> 1 then raise exception 'FAIL: report_count %', pg_temp.reports_counted(); end if;
  raise notice 'PASS 5: with no standing report the element is unknown again';
end $$;

select 'PLACE_ELEMENTS_SYNC TESTS PASSED' as result;
