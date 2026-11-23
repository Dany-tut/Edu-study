-- A lesson's progress, submissions and calendar links follow its identity.
-- Copying requires a new row; reordering modules within a course is allowed.
create function iskra_history.reject_lesson_course_change() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  raise exception using errcode = '23514',
    message = 'ISKRA_DATA_PRESERVATION: a saved lesson cannot change course';
end
$$;
revoke all on function iskra_history.reject_lesson_course_change() from public, anon, authenticated, service_role;

create trigger lessons_preserve_course before update of course_id on public.lessons
for each row when (old.course_id is distinct from new.course_id)
execute function iskra_history.reject_lesson_course_change();
