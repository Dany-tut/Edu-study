-- One confirmed round trip for journal marks. Keep the established event
-- validation, ownership, per-day collision and balance/source rules intact.
-- SECURITY INVOKER: no additional access compared with the original RPC.
create or replace function public.teacher_journal_save_fast(
  p_schedule uuid, p_entries jsonb, p_source text default null
) returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform public.teacher_journal_save(p_schedule, p_entries, p_source);
  -- Compute from authoritative rows rather than the client's stale roster.
  -- A failed summary update rolls back the mark too: success means all saved.
  update public.students s
  set attendance = coalesce((
    select round(100.0 * count(*) filter (where a.present) / nullif(count(*), 0))::integer
    from public.lesson_attendance a where a.student_id = s.id
  ), 0)
  where s.id in (select (e->>'studentId')::uuid from jsonb_array_elements(p_entries) e);
end;
$$;
revoke all on function public.teacher_journal_save_fast(uuid,jsonb,text) from public, anon;
grant execute on function public.teacher_journal_save_fast(uuid,jsonb,text) to authenticated;
