-- Behavioural tests for 006: a contributor-added place starts pending and only an
-- APPROVED review takes it out of that state. Run with `npm run test:sql`.
\set ON_ERROR_STOP on

truncate public.place_elements, public.reports, public.places cascade;

select public.create_place_report(
  jsonb_build_object('id', 'place-uji-baru', 'name', 'Lokasi Uji Baru', 'category', 'park',
    'address', 'Jalan Uji 1, Surabaya', 'lat', -7.25, 'lng', 112.75, 'pending_approval', false),
  jsonb_build_object(
    'id', 'c1111111-1111-4111-8111-111111111111', 'placeId', 'place-uji-baru',
    'actorId', 'contributor-3', 'reporterName', 'Sari', 'requestKey', 'c2222222-2222-4222-8222-222222222222',
    'inputHash', 'hash-c', 'photoPath', 'reports/c.png', 'mimeType', 'image/png',
    'createdAt', '2000-01-01T00:00:00.000Z',
    'elements', jsonb_build_array(jsonb_build_object('element', 'E2_ramp', 'status', 'UTUH'))));

-- 1. A new place is pending even if the payload claims otherwise.
do $$
begin
  if not (select pending_approval from public.places where id = 'place-uji-baru') then
    raise exception 'FAIL: new contributor place is not pending';
  end if;
  raise notice 'PASS 1: new contributor place starts pending, whatever the payload says';
end $$;

-- 2. Revision and rejection keep it pending.
do $$
begin
  perform public.review_report('c1111111-1111-4111-8111-111111111111'::uuid, 'r', 'NEEDS_REVISION', 'Foto kurang jelas.');
  perform public.review_report('c1111111-1111-4111-8111-111111111111'::uuid, 'r', 'REJECTED', 'Lokasi fiktif.');
  if not (select pending_approval from public.places where id = 'place-uji-baru') then
    raise exception 'FAIL: revision or rejection published the place';
  end if;
  raise notice 'PASS 2: NEEDS_REVISION and REJECTED keep the place pending';
end $$;

-- 3. Approval publishes it.
do $$
begin
  perform public.review_report('c1111111-1111-4111-8111-111111111111'::uuid, 'reviewer@naviable.test', 'APPROVED', 'ok');
  if (select pending_approval from public.places where id = 'place-uji-baru') then
    raise exception 'FAIL: approval did not clear pending_approval';
  end if;
  raise notice 'PASS 3: APPROVED clears pending_approval';
end $$;

select 'PLACE_APPROVAL TESTS PASSED' as result;
