-- Быстрое «+» в расписании: разовое занятие на выбранный день.
--
-- Основной сценарий «+» (перенести урок, уже стоящий на другой день) делает
-- schedule_move из 0121 — новой функции не нужно. Здесь только случай «Своё
-- название»: добавить занятие, которого в расписании ещё нет. Одна строка на
-- группу или ученика, без привязки к уроку курса (lesson_id null).
--
-- Возвращает { undo: { created: [id] }, id }: «Отменить» в тосте удаляет строку.

create or replace function public.schedule_add(
  p_group uuid, p_student uuid, p_title text, p_date date, p_time text,
  p_end text default null, p_notify boolean default true
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  new_id uuid;
  subj text;
begin
  if _schedule_owner(p_group, p_student) is distinct from auth.uid() then
    raise exception 'Это не ваша группа';
  end if;
  if p_time !~ '^\d{1,2}:\d{2}$' then raise exception 'Время в виде ЧЧ:ММ'; end if;
  if coalesce(btrim(p_title), '') = '' then raise exception 'Нужно название занятия'; end if;
  if p_group is not null and exists (
       select 1 from schedule_lessons sl
        where sl.group_id = p_group and sl.date = p_date
          and lpad(sl.time_start, 5, '0') = lpad(p_time, 5, '0') and sl.status <> 'cancelled') then
    raise exception 'В это время у группы уже есть занятие';
  end if;

  select g.subject into subj from groups g where g.id = p_group;
  insert into schedule_lessons (group_id, student_id, date, time_start, time_end,
                                lesson_title, lesson_number, subject, status, node_type)
  values (p_group, p_student, p_date, lpad(p_time, 5, '0'),
          -- time_end NOT NULL: нет конца — ставим +90 минут.
          coalesce(case when p_end ~ '^\d{1,2}:\d{2}$' then lpad(p_end, 5, '0') end, _hhmm_plus(p_time, 90)),
          btrim(p_title), null, subj, 'upcoming', 'lesson')
  returning id into new_id;

  if p_notify then
    perform _schedule_notify(new_id, 'lesson_moved', 'Новое занятие',
      '«' || btrim(p_title) || '», ' || _schedule_label(p_date, lpad(p_time, 5, '0')));
  end if;
  return jsonb_build_object('undo', jsonb_build_object('created', jsonb_build_array(new_id)), 'id', new_id);
end $$;

-- schedule_undo теперь умеет и откатывать добавление: удалить созданные строки
-- (только свои). Тело — из 0121, в конец добавлена обработка 'created'.
create or replace function public.schedule_undo(p_undo jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  x jsonb;
begin
  if exists (select 1 from jsonb_array_elements(p_undo -> 'rows') e
             join schedule_lessons sl on sl.id = (e ->> 'id')::uuid
             where _schedule_owner(sl.group_id, sl.student_id) is distinct from auth.uid()) then
    raise exception 'Это занятие не ваше';
  end if;
  update schedule_lessons sl set time_start = sl.id::text
    from jsonb_array_elements(p_undo -> 'rows') e where sl.id = (e ->> 'id')::uuid;
  for x in select * from jsonb_array_elements(p_undo -> 'rows') loop
    update schedule_lessons
       set date = (x ->> 'date')::date, time_start = x ->> 'time_start',
           time_end = x ->> 'time_end', status = x ->> 'status'
     where id = (x ->> 'id')::uuid;
  end loop;
  for x in select * from jsonb_array_elements(p_undo -> 'lessons') loop
    update lessons
       set scheduled_date = x ->> 'scheduled_date', scheduled_time = x ->> 'scheduled_time',
           rec_date = x ->> 'rec_date', rec_time = x ->> 'rec_time'
     where id = (x ->> 'id')::uuid
       and id in (select sl.lesson_id from jsonb_array_elements(p_undo -> 'rows') e
                  join schedule_lessons sl on sl.id = (e ->> 'id')::uuid);
  end loop;
  for x in select * from jsonb_array_elements(p_undo -> 'homework') loop
    update homework set due_date = (x ->> 'due_date')::date
     where id = (x ->> 'id')::uuid
       and lesson_id in (select sl.lesson_id from jsonb_array_elements(p_undo -> 'rows') e
                         join schedule_lessons sl on sl.id = (e ->> 'id')::uuid);
  end loop;
  -- Откат добавления: удалить созданные «+» строки, только свои.
  delete from schedule_lessons
   where id in (select e::uuid from jsonb_array_elements_text(coalesce(p_undo -> 'created', '[]'::jsonb)) e)
     and _schedule_owner(group_id, student_id) is not distinct from auth.uid();
end $$;

revoke all on function public.schedule_add(uuid, uuid, text, date, text, text, boolean) from public, anon;
grant execute on function public.schedule_add(uuid, uuid, text, date, text, text, boolean) to authenticated;
