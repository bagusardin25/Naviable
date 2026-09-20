-- Let a reviewer correct element statuses; corrections are applied on APPROVE.
-- Adds p_elements to review_report; when null, the report's own elements are used.
-- Apply after 004_reviewer_audit.sql.
begin;

drop function if exists public.review_report(uuid, text, text, text, jsonb);

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
    -- Approval is the team's confirmation, so the place becomes team-verified (parity with LocalStore).
    update public.places set updated_at = clock_timestamp(), verified_by_team = true where id = r_report.place_id;
  end if;

  select * into r_report from public.reports where id = p_report_id;
  return row_to_json(r_report)::jsonb;
end;
$$;

revoke all on function public.review_report(uuid, text, text, text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.review_report(uuid, text, text, text, jsonb, jsonb) to service_role;

commit;
