-- Preserve other students when saving a single journal cell or a filtered column.
CREATE OR REPLACE FUNCTION public.teacher_journal_save(p_schedule uuid, p_entries jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  sl public.schedule_lessons;
  entry jsonb;
  sid uuid;
  marks jsonb := '{}'::jsonb;
  previous_marks jsonb;
  grade_value integer;
begin
  if auth.uid() is null then raise exception 'Нужно войти в кабинет'; end if;
  select * into sl from public.schedule_lessons where id=p_schedule for update;
  if not found or not (
    exists(select 1 from public.groups g where g.id=sl.group_id and g.created_by=auth.uid()) or
    exists(select 1 from public.students s where s.id=sl.student_id and s.created_by=auth.uid())
  ) then raise exception 'Это занятие недоступно для изменения'; end if;
  -- The schedule row lock serializes attendance editors for this event.
  select attendance into previous_marks from public.teacher_lesson_sessions where schedule_id=p_schedule;
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
  -- teacher_lesson_save accepts a full snapshot; journal editors send a patch.
  update public.teacher_lesson_sessions
    set attendance=coalesce(previous_marks, '{}'::jsonb) || marks
    where schedule_id=p_schedule;
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
end $function$
;
