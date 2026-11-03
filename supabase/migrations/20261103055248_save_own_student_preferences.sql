-- Students can save their dashboard settings without write access to grades,
-- account ownership, teacher-controlled fields, or another learner's preferences.
create or replace function public.save_student_preferences(p_student uuid, p_preferences jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if jsonb_typeof(p_preferences) is distinct from 'object'
    or octet_length(p_preferences::text) > 32768
    or p_preferences - array['avatarId','widgetColumns','widgetOrder','knownWidgetIds','pomoTimerMode','pomoFocusDuration','tintLevel','subjectColors'] <> '{}'::jsonb
  then raise exception 'Invalid student preferences' using errcode = '22023'; end if;

  update public.students
  set preferences = coalesce(preferences, '{}'::jsonb) || p_preferences
  where id = p_student and auth_user_id = (select auth.uid());
  if not found then raise insufficient_privilege using message = 'Student account required'; end if;
end;
$$;
revoke all on function public.save_student_preferences(uuid,jsonb) from public, anon;
grant execute on function public.save_student_preferences(uuid,jsonb) to authenticated;
