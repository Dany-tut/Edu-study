-- A stale constructor used to replace courses.student_ids/group_ids, then
-- delete every enrollment absent from that stale snapshot. Save access intents
-- atomically against the current row, separately from course content.
create or replace function public.save_course_access_changes(p_course uuid, p_changes jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  c public.courses%rowtype;
  ids uuid[];
  previous_flag text := current_setting('iskra.course_access_edit', true);
  result jsonb;
begin
  select * into c from public.courses where id = p_course and created_by = (select auth.uid()) for update;
  if not found then raise exception 'Course not found or not owned' using errcode = '42501'; end if;
  if jsonb_typeof(p_changes) is distinct from 'object'
    or jsonb_typeof(coalesce(p_changes->'students', '{}'::jsonb)) <> 'object'
    or jsonb_typeof(coalesce(p_changes->'groups', '{}'::jsonb)) <> 'object'
    or jsonb_typeof(coalesce(p_changes->'modes', '{}'::jsonb)) <> 'object'
    or exists (select 1 from jsonb_each(coalesce(p_changes->'students', '{}'::jsonb)) where jsonb_typeof(value) <> 'boolean')
    or exists (select 1 from jsonb_each(coalesce(p_changes->'groups', '{}'::jsonb)) where jsonb_typeof(value) <> 'boolean')
    or exists (select 1 from jsonb_each(coalesce(p_changes->'modes', '{}'::jsonb)) where value not in ('"full"'::jsonb, '"custom"'::jsonb, '"by_date"'::jsonb))
    then raise exception 'Invalid course access changes' using errcode = '22023'; end if;
  if exists (
    select 1 from jsonb_each_text(coalesce(p_changes->'students', '{}'::jsonb)) x
    where x.value = 'true' and not exists (
      select 1 from public.students s left join public.groups g on g.id = s.group_id
      where s.id = x.key::uuid and (s.created_by = c.created_by or g.created_by = c.created_by))
  ) or exists (
    select 1 from jsonb_each_text(coalesce(p_changes->'groups', '{}'::jsonb)) x
    where x.value = 'true' and not exists (select 1 from public.groups g where g.id = x.key::uuid and g.created_by = c.created_by)
  ) then raise exception 'Audience is not owned' using errcode = '42501'; end if;

  perform set_config('iskra.course_access_edit', 'on', true);
  update public.courses set
    student_ids = array(select distinct id from (
      select unnest(coalesce(c.student_ids, '{}')) id
      union select key::uuid from jsonb_each_text(coalesce(p_changes->'students', '{}'::jsonb)) where value = 'true'
    ) x where coalesce(p_changes->'students'->>id::text, 'true') <> 'false'),
    group_ids = array(select distinct id from (
      select unnest(coalesce(c.group_ids, '{}')) id
      union select key::uuid from jsonb_each_text(coalesce(p_changes->'groups', '{}'::jsonb)) where value = 'true'
    ) x where coalesce(p_changes->'groups'->>id::text, 'true') <> 'false')
  where id = p_course returning * into c;

  select coalesce(array_agg(distinct s.id), '{}') into ids from public.students s
    where s.id = any(coalesce(c.student_ids, '{}')) or s.group_id = any(coalesce(c.group_ids, '{}'));
  -- Use the authoritative audience under the same row lock, never a client list.
  delete from public.course_enrollments where course_id = p_course and not (student_id = any(ids::text[]));
  insert into public.course_enrollments (course_id, student_id, access_mode, created_by)
    select p_course, id::text, 'by_date', c.created_by from unnest(ids) id
    on conflict (course_id, student_id) do nothing;
  update public.course_enrollments e set access_mode = x.value
    from jsonb_each_text(coalesce(p_changes->'modes', '{}'::jsonb)) x
    where e.course_id = p_course and e.student_id = x.key and e.student_id = any(ids::text[]);
  select jsonb_build_object('student_ids', c.student_ids, 'group_ids', c.group_ids, 'updated_at', c.updated_at,
    'access_modes', coalesce((select jsonb_object_agg(student_id, access_mode) from public.course_enrollments where course_id = p_course), '{}'::jsonb)) into result;
  perform set_config('iskra.course_access_edit', coalesce(previous_flag, ''), true);
  return result;
end;
$$;
revoke all on function public.save_course_access_changes(uuid, jsonb) from public, anon;
grant execute on function public.save_course_access_changes(uuid, jsonb) to authenticated;

-- Protect already-open old clients too. They must reload instead of silently
-- revoking access when they submit a full stale course/enrollment snapshot.
create or replace function public.guard_course_access_snapshot()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if current_user in ('postgres', 'service_role', 'supabase_admin')
    or current_setting('iskra.course_access_edit', true) = 'on' then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  if tg_table_name = 'courses' then
    if not (coalesce(new.student_ids, '{}') @> coalesce(old.student_ids, '{}'))
      or not (coalesce(new.group_ids, '{}') @> coalesce(old.group_ids, '{}')) then
      raise exception 'Доступ к курсу изменился. Обновите конструктор перед сохранением.' using errcode = '40001';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.access_mode is distinct from old.access_mode then
      raise exception 'Обновите конструктор перед изменением доступа.' using errcode = '40001';
    end if;
  elsif exists (
    select 1 from public.courses c join public.students s on s.id::text = old.student_id
    where c.id = old.course_id and (s.id = any(c.student_ids) or s.group_id = any(c.group_ids))
  ) then
    raise exception 'Ученик всё ещё назначен на курс. Обновите конструктор.' using errcode = '40001';
  end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;
revoke all on function public.guard_course_access_snapshot() from public, anon, authenticated;
create trigger guard_course_access_snapshot before update of student_ids, group_ids on public.courses
  for each row execute function public.guard_course_access_snapshot();
create trigger guard_course_enrollment_snapshot before update of access_mode or delete on public.course_enrollments
  for each row execute function public.guard_course_access_snapshot();
