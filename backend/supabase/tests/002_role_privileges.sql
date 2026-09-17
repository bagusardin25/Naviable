-- Runtime privilege checks. The declarative checks in 001_publish_report.sql prove the
-- grants are shaped correctly; these prove what actually happens at query time, which is
-- also the path production takes (PostgREST calls publish_report as service_role).
--
-- Assertions match on SQLSTATE (insufficient_privilege) rather than message text so the
-- suite is independent of the cluster's lc_messages locale.
\set ON_ERROR_STOP on

-- 1. A browser role must not reach evidence even when it guesses the query.
set role anon;

do $$ begin
  begin perform count(*) from public.places;
  exception when insufficient_privilege then raise notice 'PASS: anon cannot read places'; return; end;
  raise exception 'FAIL: anon read places';
end $$;

do $$ begin
  begin perform count(*) from public.reports;
  exception when insufficient_privilege then raise notice 'PASS: anon cannot read reports'; return; end;
  raise exception 'FAIL: anon read reports';
end $$;

do $$ begin
  begin
    insert into public.place_elements (place_id, element_code, status, report_id)
      values ('uji-puskesmas', 'E1_door', 'UTUH', '11111111-1111-4111-8111-111111111111');
  exception when insufficient_privilege then raise notice 'PASS: anon cannot write elements'; return; end;
  raise exception 'FAIL: anon wrote an element';
end $$;

do $$ begin
  begin perform public.publish_report('{"actorId":"attacker","requestKey":"88888888-8888-4888-8888-888888888888"}'::jsonb);
  exception when insufficient_privilege then raise notice 'PASS: anon cannot call publish_report'; return; end;
  raise exception 'FAIL: anon called publish_report';
end $$;

reset role;

-- 2. service_role is what the API actually uses, so the whole loop must work under it.
--    publish_report is SECURITY INVOKER: if the grants were wrong, this call would fail.
set role service_role;

do $$
declare
  payload jsonb := jsonb_build_object(
    'id', '99999999-9999-4999-8999-999999999999', 'placeId', 'uji-puskesmas',
    'actorId', 'contributor-3', 'reporterName', 'Rina', 'requestKey', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'inputHash', 'hash-service-role', 'photoPath', 'reports/service.png', 'mimeType', 'image/png',
    'createdAt', '2000-01-01T00:00:00.000Z',
    'elements', jsonb_build_array(jsonb_build_object('element', 'E3_toilet', 'status', 'TIDAK_ADA', 'note', 'Toilet belum terfoto')));
  result jsonb;
  element public.place_elements%rowtype;
begin
  result := public.publish_report(payload);
  if result->>'id' <> '99999999-9999-4999-8999-999999999999' then raise exception 'FAIL: service_role publish returned %', result->>'id'; end if;
  select * into element from public.place_elements where place_id = 'uji-puskesmas' and element_code = 'E3_toilet';
  if element.status <> 'TIDAK_ADA' or element.note <> 'Toilet belum terfoto' then raise exception 'FAIL: service_role publish did not lock the element'; end if;
  raise notice 'PASS: service_role can run the publish transaction end to end';
end $$;

do $$ declare total integer; begin
  select count(*) into total from public.places;
  if total <> 2 then raise exception 'FAIL: service_role read % places, expected 2', total; end if;
  raise notice 'PASS: service_role can read the catalogue';
end $$;

reset role;
select 'ALL ROLE TESTS PASSED' as result;
