-- Keep "Kondisi akses" (place_elements) in step with the public report history.
-- Before this, place_elements was patched in place: a report sent back for revision or
-- rejected kept its status on the map, "Belum diketahui" in a newer report erased known
-- evidence, approving an older report overwrote a newer one, and a reviewer's correction
-- never reached the history. Now every change re-derives a place's elements from its reports:
--   * only reports still standing count: SUBMITTED, UNDER_REVIEW, APPROVED, PUBLISHED;
--   * a report's elements are the reviewer's correction when approved with one;
--   * per element, the newest counting report with a definite status wins;
--   * BELUM_DIKETAHUI never overwrites evidence.
-- report_count / photo_count count the same reports, matching what the history lists.
-- Apply after 006_place_approval.sql.
begin;

alter table public.reports add column if not exists reviewed_elements jsonb;

-- Reviewer corrections were applied straight to place_elements without being kept on the
-- report. Recover them from there before re-deriving, so no approved correction is lost:
-- rows still pointing at the report are what the reviewer applied; the rest of the report's
-- elements are taken as reported.
update public.reports r
set reviewed_elements = (
  select jsonb_agg(merged.item order by merged.item->>'element')
  from (
    select jsonb_strip_nulls(jsonb_build_object('element', pe.element_code, 'status', pe.status, 'note', pe.note)) as item
    from public.place_elements pe
    where pe.report_id = r.id
    union all
    select reported.value
    from jsonb_array_elements(r.payload->'elements') reported
    where not exists (
      select 1 from public.place_elements pe
      where pe.report_id = r.id and pe.element_code = reported.value->>'element'
    )
  ) merged
)
where r.review_status in ('APPROVED', 'PUBLISHED')
  and r.reviewed_elements is null
  and exists (select 1 from public.place_elements pe where pe.report_id = r.id);

create or replace function public.refresh_place_elements(p_place_id text) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  delete from public.place_elements where place_id = p_place_id;
  insert into public.place_elements(place_id, element_code, status, note, report_id, updated_at)
  select distinct on (item->>'element')
    p_place_id, item->>'element', item->>'status', item->>'note', r.id, r.created_at
  from public.reports r
  cross join lateral jsonb_array_elements(coalesce(r.reviewed_elements, r.payload->'elements')) item
  where r.place_id = p_place_id
    and r.review_status in ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PUBLISHED')
    and item->>'status' <> 'BELUM_DIKETAHUI'
  order by item->>'element', r.created_at desc, r.id desc;

  update public.places set
    report_count = counted.total,
    photo_count = counted.total
  from (
    select count(*)::integer as total from public.reports
    where place_id = p_place_id and review_status in ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PUBLISHED')
  ) counted
  where id = p_place_id;
end;
$$;
revoke all on function public.refresh_place_elements(text) from public, anon, authenticated;
grant execute on function public.refresh_place_elements(text) to service_role;

-- Same contract as 001; the element loop and counters now come from refresh_place_elements.
create or replace function public.publish_report(p_report jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare previous public.reports%rowtype; saved jsonb;
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
  perform public.refresh_place_elements(saved->>'placeId');
  update public.places set updated_at = (saved->>'createdAt')::timestamptz where id = saved->>'placeId';
  return saved;
end;
$$;
revoke all on function public.publish_report(jsonb) from public, anon, authenticated;
grant execute on function public.publish_report(jsonb) to service_role;

-- Same contract as 006; the decision (and any correction) is stored on the report, then the
-- place is re-derived, so revising or rejecting a report also takes its status off the map.
create or replace function public.review_report(
  p_report_id uuid,
  p_reviewer text,
  p_decision text,
  p_note text,
  p_checklist jsonb default '{}'::jsonb,
  p_elements jsonb default null
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  r_report public.reports%rowtype;
begin
  if p_decision not in ('APPROVED', 'NEEDS_REVISION', 'REJECTED', 'UNDER_REVIEW') then
    raise exception 'invalid_decision';
  end if;

  if (p_decision = 'NEEDS_REVISION' or p_decision = 'REJECTED') and (p_note is null or length(trim(p_note)) = 0) then
    raise exception 'note_required_for_revision_or_rejection';
  end if;

  select * into r_report from public.reports where id = p_report_id for update;
  if not found then
    raise exception 'report_not_found' using errcode = '23503';
  end if;
  -- Same lock publish_report takes, so a review and a new report never re-derive at once.
  perform 1 from public.places where id = r_report.place_id for update;

  update public.reports
  set
    review_status = p_decision,
    reviewed_by = p_reviewer,
    reviewed_at = clock_timestamp(),
    review_note = p_note,
    review_checklist = p_checklist,
    -- An approval replaces any earlier correction; other decisions keep it for the audit trail.
    reviewed_elements = case
      when p_decision = 'APPROVED' then nullif(p_elements, '[]'::jsonb)
      else reviewed_elements
    end
  where id = p_report_id;

  if p_decision = 'APPROVED' then
    -- Approval is the team's confirmation: the place becomes team-verified and, if it was a new
    -- contributor place, visible on the public map (parity with LocalStore).
    update public.places set updated_at = clock_timestamp(), verified_by_team = true, pending_approval = false
    where id = r_report.place_id;
  end if;

  perform public.refresh_place_elements(r_report.place_id);

  select * into r_report from public.reports where id = p_report_id;
  return row_to_json(r_report)::jsonb;
end;
$$;

revoke all on function public.review_report(uuid, text, text, text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.review_report(uuid, text, text, text, jsonb, jsonb) to service_role;

-- Re-derive every place once so existing data follows the same rule.
do $$
declare target text;
begin
  for target in select id from public.places loop
    perform public.refresh_place_elements(target);
  end loop;
end $$;

commit;
