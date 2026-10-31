-- Project only attendance, never private notes/drafts from teacher sessions.
begin;
create or replace function public.student_schedule_attendance(p_student uuid, p_schedules uuid[])
returns table(schedule_id uuid, present boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.students s left join public.groups g on g.id=s.group_id
    where s.id=p_student and (s.auth_user_id=auth.uid() or s.created_by=auth.uid()
      or g.created_by=auth.uid() or public.is_admin())
  ) then raise exception 'Посещаемость недоступна'; end if;
  if coalesce(cardinality(p_schedules),0)>500 then raise exception 'Слишком много занятий'; end if;
  return query
  select sl.id,
    case when mark.schedule_id is not null then
      case when jsonb_typeof(mark.attendance->p_student::text)='boolean'
        then (mark.attendance->>p_student::text)::boolean else null end
    -- Legacy daily marks apply only to an unambiguous matching lesson.
    when (select count(distinct (other.time_start,other.subject,other.lesson_number,other.node_type))
      from public.schedule_lessons other where other.date=sl.date and other.lesson_title=sl.lesson_title
      and other.status is distinct from 'cancelled'
      and (other.group_id=s.group_id or other.student_id=s.id))=1 then legacy.present
    else null end
  from public.students s
  join public.schedule_lessons sl on (sl.group_id=s.group_id or sl.student_id=s.id)
  left join lateral (
    select ts.schedule_id,ts.attendance from public.teacher_lesson_sessions ts
    join public.schedule_lessons origin on origin.id=ts.schedule_id
    where ts.attendance ? p_student::text and (origin.id=sl.id or (
      origin.date=sl.date and origin.time_start=sl.time_start and origin.lesson_title=sl.lesson_title
      and origin.subject=sl.subject and origin.lesson_number=sl.lesson_number
      and origin.node_type is not distinct from sl.node_type
      and (origin.group_id=s.group_id or origin.student_id=s.id)))
    order by (origin.id=sl.id) desc, ts.updated_at desc limit 1
  ) mark on true
  left join public.lesson_attendance legacy on legacy.student_id=s.id
    and legacy.lesson_date=sl.date and coalesce(legacy.lesson_title,'')=sl.lesson_title
  where s.id=p_student and sl.id=any(p_schedules) and sl.status is distinct from 'cancelled';
end $$;
revoke all on function public.student_schedule_attendance(uuid,uuid[]) from public,anon;
grant execute on function public.student_schedule_attendance(uuid,uuid[]) to authenticated;
-- Journal saves attendance and grades atomically. The old daily grade slot
-- remains compatible, while attendance always belongs to the exact event.
create or replace function public.teacher_journal_save(p_schedule uuid, p_entries jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  sl public.schedule_lessons;
  entry jsonb;
  sid uuid;
  marks jsonb := '{}'::jsonb;
  grade_value integer;
begin
  if auth.uid() is null then raise exception 'Нужно войти в кабинет'; end if;
  select * into sl from public.schedule_lessons where id=p_schedule for update;
  if not found or not (
    exists(select 1 from public.groups g where g.id=sl.group_id and g.created_by=auth.uid()) or
    exists(select 1 from public.students s where s.id=sl.student_id and s.created_by=auth.uid())
  ) then raise exception 'Это занятие недоступно для изменения'; end if;
  if jsonb_typeof(p_entries) is distinct from 'array' then raise exception 'Неверные отметки'; end if;
  for entry in select value from jsonb_array_elements(p_entries) loop
    sid := (entry->>'studentId')::uuid;
    if sid is null or not (entry ? 'present') or jsonb_typeof(entry->'present') not in ('boolean','null')
      or marks ? sid::text then raise exception 'Неверные отметки'; end if;
    if not exists(select 1 from public.students s where s.id=sid and
      ((sl.group_id is not null and s.group_id=sl.group_id) or (sl.group_id is null and s.id=sl.student_id and s.created_by=auth.uid())))
      then raise exception 'Ученик не относится к этому занятию'; end if;
    if entry ? 'grade' then
      if jsonb_typeof(entry->'grade') not in ('number','null') then raise exception 'Неверная оценка'; end if;
      grade_value := (entry->>'grade')::integer;
      if grade_value is not null and (grade_value not between 1 and 5 or entry->'grade' <> to_jsonb(grade_value)
        or entry->'present' <> 'true'::jsonb) then raise exception 'Неверная оценка'; end if;
      -- Explicitly clearing a grade in the journal permits clearing presence.
      if grade_value is null then
        update public.lesson_attendance set grade=null where student_id=sid and lesson_date=sl.date
          and coalesce(lesson_title,'')=sl.lesson_title;
      end if;
    end if;
    marks := marks || jsonb_build_object(sid::text,entry->'present');
  end loop;
  perform public.teacher_lesson_save(p_schedule,'save',null,marks);
  for entry in select value from jsonb_array_elements(p_entries) loop
    if entry ? 'grade' and entry->'present'='true'::jsonb then
      sid := (entry->>'studentId')::uuid;
      grade_value := (entry->>'grade')::integer;
      if grade_value is not null and exists(select 1 from public.lesson_attendance where student_id=sid
        and lesson_date=sl.date and coalesce(lesson_title,'')<>sl.lesson_title) then
        raise exception 'На эту дату уже есть оценка другого занятия. Посещаемость можно сохранить отдельно без оценки';
      end if;
      update public.lesson_attendance set grade=grade_value where student_id=sid and lesson_date=sl.date
        and coalesce(lesson_title,'')=sl.lesson_title;
    end if;
  end loop;
end $$;
revoke all on function public.teacher_journal_save(uuid,jsonb) from public,anon;
grant execute on function public.teacher_journal_save(uuid,jsonb) to authenticated;
commit;
