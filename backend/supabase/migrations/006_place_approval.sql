-- New contributor-added places stay off the public map until a reviewer approves one of
-- their reports, so a spammer cannot drop fake locations all over the city.
-- The API hides pending places from every public read; reviewer routes still see them.
-- Apply after 005_reviewer_element_override.sql.
begin;

alter table public.places add column if not exists pending_approval boolean not null default false;

-- Contributor places that no reviewer has approved yet follow the same rule from now on.
update public.places p set pending_approval = true
where p.evidence_level = 'contributor'
  and not exists (
    select 1 from public.reports r
    where r.place_id = p.id and r.review_status in ('APPROVED', 'PUBLISHED')
  );

-- Same as 003, except the new place starts pending. The flag is set here, not taken from the
-- payload, so a client can never publish a place straight to the map.
create or replace function public.create_place_report(p_place jsonb, p_report jsonb) returns jsonb
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
  insert into public.places(id, name, category, city, address, lat, lng, evidence_level, verified_by_team, needs_geocoding, pending_approval)
    values (p_place->>'id', p_place->>'name', p_place->>'category', 'Surabaya', p_place->>'address',
      (p_place->>'lat')::double precision, (p_place->>'lng')::double precision, 'contributor', false, false, true);
  return public.publish_report(p_report);
end;
$$;
revoke all on function public.create_place_report(jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.create_place_report(jsonb,jsonb) to service_role;

-- Same as 005, except approval also takes the place out of the pending state.
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
  item jsonb;
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

  update public.reports
  set
    review_status = p_decision,
    reviewed_by = p_reviewer,
    reviewed_at = clock_timestamp(),
    review_note = p_note,
    review_checklist = p_checklist
  where id = p_report_id;

  if p_decision = 'APPROVED' then
    -- Reviewer-corrected statuses (p_elements) win over the reported ones; unknowns leave the element untouched.
    for item in select value from jsonb_array_elements(coalesce(p_elements, r_report.payload->'elements')) loop
      if (item->>'status') = 'BELUM_DIKETAHUI' then continue; end if;
      insert into public.place_elements(place_id, element_code, status, note, report_id, updated_at)
        values (r_report.place_id, item->>'element', item->>'status', item->>'note', r_report.id, clock_timestamp())
        on conflict (place_id, element_code) do update
          set status = excluded.status, note = excluded.note, report_id = excluded.report_id, updated_at = excluded.updated_at;
    end loop;
    -- Approval is the team's confirmation: the place becomes team-verified and, if it was a new
    -- contributor place, visible on the public map (parity with LocalStore).
    update public.places set updated_at = clock_timestamp(), verified_by_team = true, pending_approval = false
    where id = r_report.place_id;
  end if;

  select * into r_report from public.reports where id = p_report_id;
  return row_to_json(r_report)::jsonb;
end;
$$;

revoke all on function public.review_report(uuid, text, text, text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.review_report(uuid, text, text, text, jsonb, jsonb) to service_role;

commit;
