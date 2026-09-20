-- Behavioural tests for review_report (004 + 005): reviewer decisions, element
-- overrides, and team verification on approve. Run with `npm run test:sql`.
\set ON_ERROR_STOP on

truncate public.place_elements, public.reports, public.places cascade;
insert into public.places (id, name, category, evidence_level, lat, lng, needs_geocoding) values
  ('uji-review', 'Tempat Uji Review', 'health', 'pre_survey', -7.2500, 112.7500, false),
  ('uji-review-b', 'Tempat Uji Review B', 'public_service', 'pre_survey', -7.2600, 112.7600, false);

-- Seed one SUBMITTED report per place via the normal publish transaction.
select public.publish_report(jsonb_build_object(
  'id', 'a1111111-1111-4111-8111-111111111111', 'placeId', 'uji-review',
  'actorId', 'contributor-1', 'reporterName', 'Dimas', 'requestKey', 'a2222222-2222-4222-8222-222222222222',
  'inputHash', 'hash-a', 'photoPath', 'reports/a.png', 'mimeType', 'image/png',
  'createdAt', '2000-01-01T00:00:00.000Z',
  'elements', jsonb_build_array(
    jsonb_build_object('element', 'E1_door', 'status', 'UTUH'),
    jsonb_build_object('element', 'E2_ramp', 'status', 'TIDAK_STANDAR'))));

select public.publish_report(jsonb_build_object(
  'id', 'b1111111-1111-4111-8111-111111111111', 'placeId', 'uji-review-b',
  'actorId', 'contributor-2', 'reporterName', 'Rina', 'requestKey', 'b2222222-2222-4222-8222-222222222222',
  'inputHash', 'hash-b', 'photoPath', 'reports/b.png', 'mimeType', 'image/png',
  'createdAt', '2000-01-01T00:00:00.000Z',
  'elements', jsonb_build_array(jsonb_build_object('element', 'E4_lift', 'status', 'UTUH'))));

-- 1. Approve with reviewer-corrected elements: overrides win, unknowns are skipped,
--    the place becomes team-verified and the audit trail records the reviewer.
do $$
declare
  place public.places%rowtype;
  door public.place_elements%rowtype;
  ramp public.place_elements%rowtype;
  report public.reports%rowtype;
begin
  perform public.review_report(
    'a1111111-1111-4111-8111-111111111111'::uuid, 'reviewer@naviable.test', 'APPROVED', 'Bukti jelas.',
    '{"photo_clear": true}'::jsonb,
    jsonb_build_array(
      jsonb_build_object('element', 'E1_door', 'status', 'TIDAK_ADA'),
      jsonb_build_object('element', 'E3_toilet', 'status', 'BELUM_DIKETAHUI'),
      jsonb_build_object('element', 'E2_ramp', 'status', 'UTUH')));

  select * into report from public.reports where id = 'a1111111-1111-4111-8111-111111111111';
  if report.review_status <> 'APPROVED' then raise exception 'FAIL: review_status %', report.review_status; end if;
  if report.reviewed_by <> 'reviewer@naviable.test' then raise exception 'FAIL: reviewed_by %', report.reviewed_by; end if;
  if report.review_note <> 'Bukti jelas.' then raise exception 'FAIL: review_note not stored'; end if;

  select * into place from public.places where id = 'uji-review';
  if not place.verified_by_team then raise exception 'FAIL: approve did not set verified_by_team'; end if;

  select * into door from public.place_elements where place_id = 'uji-review' and element_code = 'E1_door';
  if door.status <> 'TIDAK_ADA' then raise exception 'FAIL: reviewer override not applied to E1_door (%)', door.status; end if;
  select * into ramp from public.place_elements where place_id = 'uji-review' and element_code = 'E2_ramp';
  if ramp.status <> 'UTUH' then raise exception 'FAIL: reviewer override not applied to E2_ramp (%)', ramp.status; end if;
  if exists (select 1 from public.place_elements where place_id = 'uji-review' and element_code = 'E3_toilet') then
    raise exception 'FAIL: BELUM_DIKETAHUI element was written instead of skipped';
  end if;

  raise notice 'PASS 1: approve applies reviewer overrides, skips unknowns, verifies place, records reviewer';
end $$;

-- 2. Revision and rejection require a written note.
do $$
declare raised integer := 0;
begin
  begin perform public.review_report('a1111111-1111-4111-8111-111111111111'::uuid, 'r', 'NEEDS_REVISION', '   ');
  exception when others then raised := raised + 1; if sqlerrm <> 'note_required_for_revision_or_rejection' then raise; end if; end;
  begin perform public.review_report('a1111111-1111-4111-8111-111111111111'::uuid, 'r', 'REJECTED', '');
  exception when others then raised := raised + 1; if sqlerrm <> 'note_required_for_revision_or_rejection' then raise; end if; end;
  if raised <> 2 then raise exception 'FAIL: expected 2 note-required rejections, got %', raised; end if;

  raise notice 'PASS 2: NEEDS_REVISION and REJECTED without a note are rejected';
end $$;

-- 3. Approving without an override falls back to the report's own elements.
do $$
declare
  lift public.place_elements%rowtype;
  place public.places%rowtype;
begin
  perform public.review_report('b1111111-1111-4111-8111-111111111111'::uuid, 'reviewer@naviable.test', 'APPROVED', 'ok');

  select * into place from public.places where id = 'uji-review-b';
  if not place.verified_by_team then raise exception 'FAIL: fallback approve did not verify place'; end if;
  select * into lift from public.place_elements where place_id = 'uji-review-b' and element_code = 'E4_lift';
  if lift.status <> 'UTUH' then raise exception 'FAIL: fallback did not apply reported element (%)', lift.status; end if;

  raise notice 'PASS 3: approve without override applies the reported elements';
end $$;

select 'REVIEW_REPORT TESTS PASSED' as result;
