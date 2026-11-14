create or replace function public.suggest_transcript_terms(p_subject text, p_pairs jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_subject text := left(trim(coalesce(p_subject, '')), 60);
  v_item jsonb;
  v_written text; v_heard text;
  v_id uuid;
  v_count integer := 0;
begin
  if v_uid is null or not public.is_staff() or not public.mfa_ok() then raise exception 'not allowed' using errcode = '42501'; end if;
  if v_subject = '' or jsonb_typeof(p_pairs) <> 'array' then return 0; end if;
  for v_item in select value from jsonb_array_elements(p_pairs) limit 20 loop
    v_written := nullif(left(trim(coalesce(v_item ->> 'written', '')), 80), '');
    v_heard := nullif(left(trim(coalesce(v_item ->> 'heard', '')), 80), '');
    continue when v_written is null or lower(v_written) = lower(coalesce(v_heard, ''));
    insert into public.transcript_terms (subject, written, heard, source, created_by)
    values (v_subject, v_written, v_heard, 'teacher', v_uid)
    on conflict (subject, lower(written), lower(coalesce(heard, ''))) do update
      set hits = public.transcript_terms.hits + 1, updated_at = now()
    returning id into v_id;
    insert into public.transcript_term_votes (term_id, teacher_id) values (v_id, v_uid) on conflict do nothing;
    -- Only an explicit administrator decision can make a term shared.
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.suggest_transcript_terms(text, jsonb) from public, anon;
grant execute on function public.suggest_transcript_terms(text, jsonb) to authenticated;


-- Weekly, Monday 09:00 Asia/Bangkok (02:00 UTC). No model heartbeat.
select cron.schedule('iskra-transcript-corrections-review','0 2 * * 1',$$select public.review_transcript_corrections()$$);
