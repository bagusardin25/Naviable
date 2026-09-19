-- Add reviewer audit trail and review status lifecycle to reports.
-- Apply after 003_contribution_flows.sql.
begin;

-- Extend reports table with review workflow columns
alter table public.reports
  add column if not exists review_status text not null default 'SUBMITTED'
    check (review_status in ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_REVISION', 'APPROVED', 'REJECTED', 'PUBLISHED')),
  add column if not exists reviewed_by text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_note text,
  add column if not exists review_checklist jsonb;

create index if not exists reports_review_status_idx on public.reports(review_status, created_at desc);

-- Review action transaction: records reviewer decision and audit trail.
-- If approved, updates the place verified status and place elements.
create or replace function public.review_report(
  p_report_id uuid,
  p_reviewer text,
  p_decision text,
  p_note text,
  p_checklist jsonb default '{}'::jsonb
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
    -- Apply elements to place with reviewer confirmation
    for item in select value from jsonb_array_elements(r_report.payload->'elements') loop
      insert into public.place_elements(place_id, element_code, status, note, report_id, updated_at)
        values (r_report.place_id, item->>'element', item->>'status', item->>'note', r_report.id, clock_timestamp())
        on conflict (place_id, element_code) do update
          set status = excluded.status, note = excluded.note, report_id = excluded.report_id, updated_at = excluded.updated_at;
    end loop;
    update public.places set updated_at = clock_timestamp() where id = r_report.place_id;
  end if;

  select * into r_report from public.reports where id = p_report_id;
  return row_to_json(r_report)::jsonb;
end;
$$;

revoke all on function public.review_report(uuid, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.review_report(uuid, text, text, text, jsonb) to service_role;

commit;
