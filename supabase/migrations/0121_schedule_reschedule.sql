-- Перенос занятий одним действием: экран «Расписание» в Искре, потом модуль в Таскли.
--
-- Раньше дату занятия меняли в редакторе урока, и он правил только строку
-- schedule_lessons. Если строка родилась из урока курса, следующее сохранение
-- курса пересобирало календарь из lessons.scheduled_* и перенос откатывался.
-- Здесь перенос пишет и в урок (когда курс у одной группы/ученика), и сроки ДЗ
-- урока едут вместе с ним.
--
-- Занятие = строка группы + строки её учеников с той же датой, временем и
-- темой (групповое занятие бывает и так, см. 0117). Двигаются все вместе.
--
-- Каждая функция возвращает { undo, ... }: снимок до правки. schedule_undo(undo)
-- возвращает всё как было — это кнопка «Отменить» в тосте.

alter table public.schedule_lessons drop constraint if exists schedule_lessons_status_check;
alter table public.schedule_lessons add constraint schedule_lessons_status_check
  check (status = any (array['completed', 'live', 'upcoming', 'cancelled']));

-- Чьё занятие: группа учителя или ученик из его группы.
create or replace function public._schedule_owner(p_group uuid, p_student uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select g.created_by from groups g where g.id = p_group),
    (select g.created_by from students s join groups g on g.id = s.group_id where s.id = p_student)
  )
$$;

-- Строки одного занятия: сама строка и её двойники у учеников группы.
create or replace function public._schedule_occasion(p_id uuid)
returns setof public.schedule_lessons language sql stable security definer set search_path = public as $$
  select sl.* from schedule_lessons r
  join schedule_lessons sl
    on sl.id = r.id
    or (r.group_id is not null
        and sl.date = r.date
        and lpad(sl.time_start, 5, '0') = lpad(r.time_start, 5, '0')
        and sl.lesson_title is not distinct from r.lesson_title
        and sl.node_type is not distinct from r.node_type
        and (sl.group_id = r.group_id
             or (sl.group_id is null
                 and sl.student_id in (select s.id from students s where s.group_id = r.group_id))))
  where r.id = p_id
$$;

-- Ученики занятия — кому слать уведомление.
create or replace function public._schedule_students(p_group uuid, p_student uuid)
returns setof uuid language sql stable security definer set search_path = public as $$
  select s.id from students s where p_group is not null and s.group_id = p_group
  union
  select p_student where p_group is null and p_student is not null
$$;

-- 'HH:MM' + минуты → 'HH:MM'. Пустое или кривое время — null.
create or replace function public._hhmm_plus(p_time text, p_min int)
returns text language sql immutable as $$
  select case when p_time ~ '^\d{1,2}:\d{2}$'
    then to_char(time '00:00' + (p_time || ':00')::interval + make_interval(mins => p_min), 'HH24:MI') end
$$;

create or replace function public._hhmm_diff(p_from text, p_to text)
returns int language sql immutable as $$
  select case when p_from ~ '^\d{1,2}:\d{2}$' and p_to ~ '^\d{1,2}:\d{2}$'
    then (extract(epoch from (p_to || ':00')::interval - (p_from || ':00')::interval) / 60)::int end
$$;

-- Снимок строк, уроков и сроков ДЗ до правки — для schedule_undo.
create or replace function public._schedule_snapshot(p_ids uuid[])
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(jsonb_build_object(
        'id', sl.id, 'date', sl.date, 'time_start', sl.time_start,
        'time_end', sl.time_end, 'status', sl.status))
      from schedule_lessons sl where sl.id = any(p_ids)), '[]'::jsonb),
    'lessons', coalesce((select jsonb_agg(jsonb_build_object(
        'id', l.id, 'scheduled_date', l.scheduled_date, 'scheduled_time', l.scheduled_time,
        'rec_date', l.rec_date, 'rec_time', l.rec_time))
      from lessons l where l.id in (select lesson_id from schedule_lessons where id = any(p_ids))), '[]'::jsonb),
    'homework', coalesce((select jsonb_agg(jsonb_build_object('id', h.id, 'due_date', h.due_date))
      from homework h where h.lesson_id in (select lesson_id from schedule_lessons where id = any(p_ids))), '[]'::jsonb)
  )
$$;

-- Строка переехала → урок курса и сроки его ДЗ туда же. Урок трогаем, только если
-- курс у одной группы или одного ученика: дата урока общая на весь курс, и перенос
-- у одной группы иначе сдвинул бы занятие и у другой.
create or replace function public._schedule_sync_lesson(p_row uuid, p_old_date date)
returns void language plpgsql security definer set search_path = public as $$
declare
  r schedule_lessons;
  l lessons;
  single boolean;
  mirrored boolean;
  d text;
begin
  select * into r from schedule_lessons where id = p_row;
  if r.lesson_id is null then return; end if;
  select * into l from lessons where id = r.lesson_id;
  select coalesce(array_length(c.group_ids, 1), 0) + coalesce(array_length(c.student_ids, 1), 0) = 1
    into single from courses c where c.id = l.course_id;
  if not coalesce(single, false) then return; end if;

  d := to_char(r.date, 'DD.MM.YYYY');
  mirrored := l.rec_date is not distinct from l.scheduled_date and l.rec_time is not distinct from l.scheduled_time;
  if r.node_type = 'rec' or mirrored then
    update lessons set rec_date = d, rec_time = r.time_start where id = l.id;
  end if;
  if r.node_type = 'lesson' or mirrored then
    update lessons set scheduled_date = d, scheduled_time = r.time_start where id = l.id;
  end if;
  update homework set due_date = due_date + (r.date - p_old_date)
   where lesson_id = l.id and due_date is not null and r.date <> p_old_date;
end $$;

create or replace function public._schedule_notify(p_row uuid, p_type text, p_title text, p_body text)
returns void language sql security definer set search_path = public as $$
  insert into notifications (recipient_id, recipient_role, type, title, body, link)
  select st, 'student', p_type, p_title, p_body, jsonb_build_object('scheduleId', p_row)
  from schedule_lessons r, _schedule_students(r.group_id, r.student_id) st
  where r.id = p_row
$$;

create or replace function public._schedule_label(p_date date, p_time text)
returns text language sql immutable as $$
  select to_char(p_date, 'DD.MM') || coalesce(' в ' || p_time, '')
$$;

-- Перенести одно занятие на дату и время (время null — то же).
create or replace function public.schedule_move(p_id uuid, p_date date, p_time text default null, p_notify boolean default true)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r schedule_lessons;
  ids uuid[];
  undo jsonb;
  t text;
  dur int;
  x uuid;
begin
  select * into r from schedule_lessons where id = p_id;
  if r.id is null then raise exception 'Занятие не найдено'; end if;
  if _schedule_owner(r.group_id, r.student_id) is distinct from auth.uid() then
    raise exception 'Это занятие не ваше';
  end if;
  if p_time is not null and p_time !~ '^\d{1,2}:\d{2}$' then raise exception 'Время в виде ЧЧ:ММ'; end if;

  t := coalesce(lpad(p_time, 5, '0'), r.time_start);
  dur := _hhmm_diff(r.time_start, r.time_end);
  select array_agg(id) into ids from _schedule_occasion(p_id);
  undo := _schedule_snapshot(ids);

  if exists (select 1 from schedule_lessons sl
             where sl.group_id = r.group_id and sl.date = p_date
               and lpad(sl.time_start, 5, '0') = lpad(t, 5, '0') and not (sl.id = any(ids))) then
    raise exception 'В это время у группы уже есть занятие';
  end if;

  update schedule_lessons
     set date = p_date, time_start = t,
         time_end = coalesce(_hhmm_plus(t, dur), time_end),
         status = case when status = 'cancelled' then 'upcoming' else status end
   where id = any(ids);
  foreach x in array ids loop perform _schedule_sync_lesson(x, r.date); end loop;

  if p_notify then
    perform _schedule_notify(r.id, 'lesson_moved', 'Занятие перенесено',
      coalesce('«' || nullif(r.lesson_title, '') || '»: ', '') ||
      _schedule_label(r.date, r.time_start) || ' → ' || _schedule_label(p_date, t));
  end if;
  return jsonb_build_object('undo', undo, 'moved', array_length(ids, 1));
end $$;

-- Сдвинуть курс: это занятие и все следующие у этой группы (ученика) встают
-- на место следующего; последнее — через тот же промежуток, что перед ним.
create or replace function public.schedule_shift(p_id uuid, p_notify boolean default true)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r schedule_lessons;
  occ record;
  ids uuid[];
  undo jsonb;
  n int;
begin
  select * into r from schedule_lessons where id = p_id;
  if r.id is null then raise exception 'Занятие не найдено'; end if;
  if _schedule_owner(r.group_id, r.student_id) is distinct from auth.uid() then
    raise exception 'Это занятие не ваше';
  end if;

  -- Занятия этой группы (или ученика без группы) с этого и дальше.
  create temp table _occ on commit drop as
    select sl.id, sl.date, lpad(sl.time_start, 5, '0') as t, sl.time_end,
           row_number() over (order by sl.date, lpad(sl.time_start, 5, '0')) as n
    from schedule_lessons sl
    where sl.status <> 'cancelled'
      and sl.node_type is not distinct from r.node_type
      and (case when r.group_id is not null then sl.group_id = r.group_id
                else sl.group_id is null and sl.student_id = r.student_id end)
      and (sl.date, lpad(sl.time_start, 5, '0')) >= (r.date, lpad(r.time_start, 5, '0'));
  select count(*) into n from _occ;
  if n = 0 then raise exception 'Нечего сдвигать'; end if;

  -- Куда встаёт каждое: на место следующего; последнее — через тот же промежуток.
  create temp table _dst on commit drop as
    select a.id, a.date as old_date,
           coalesce(b.date, a.date + coalesce(a.date - p.date, 7)) as date,
           coalesce(b.t, a.t) as t,
           _hhmm_diff(a.t, a.time_end) as dur
    from _occ a
    left join _occ b on b.n = a.n + 1
    left join _occ p on p.n = a.n - 1;

  -- Двойники у учеников едут за строкой группы.
  create temp table _move on commit drop as
    select o.id as row_id, d.old_date, d.date, d.t, d.dur
    from _dst d, _schedule_occasion(d.id) o;

  select array_agg(row_id) into ids from _move;
  undo := _schedule_snapshot(ids);

  -- В два шага: уникальность (группа, дата, время) не отложенная, а места меняются по цепочке.
  update schedule_lessons sl set time_start = sl.id::text from _move m where sl.id = m.row_id;
  update schedule_lessons sl
     set date = m.date, time_start = m.t, time_end = coalesce(_hhmm_plus(m.t, m.dur), sl.time_end)
    from _move m where sl.id = m.row_id;
  perform _schedule_sync_lesson(m.row_id, m.old_date) from _move m;

  if p_notify then
    perform _schedule_notify(r.id, 'lesson_moved', 'Расписание сдвинуто',
      coalesce('«' || nullif(r.lesson_title, '') || '» и следующие занятия', 'Занятия') ||
      ' сдвинуты на одно вперёд, начиная с ' || _schedule_label(r.date, null));
  end if;
  return jsonb_build_object('undo', undo, 'moved', n);
end $$;

-- Отменить без переноса: занятие остаётся в календаре зачёркнутым.
create or replace function public.schedule_cancel(p_id uuid, p_notify boolean default true)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r schedule_lessons;
  ids uuid[];
  undo jsonb;
begin
  select * into r from schedule_lessons where id = p_id;
  if r.id is null then raise exception 'Занятие не найдено'; end if;
  if _schedule_owner(r.group_id, r.student_id) is distinct from auth.uid() then
    raise exception 'Это занятие не ваше';
  end if;
  select array_agg(id) into ids from _schedule_occasion(p_id);
  undo := _schedule_snapshot(ids);
  update schedule_lessons set status = 'cancelled' where id = any(ids);
  if p_notify then
    perform _schedule_notify(r.id, 'lesson_cancelled', 'Занятие отменено',
      coalesce('«' || nullif(r.lesson_title, '') || '», ', '') || _schedule_label(r.date, r.time_start));
  end if;
  return jsonb_build_object('undo', undo, 'moved', array_length(ids, 1));
end $$;

-- «Отменить» в тосте: вернуть строки, уроки и сроки ДЗ из снимка. Только свои.
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
  -- Уроки и ДЗ — только те, что висят на вернувшихся строках (снимок мог прийти от клиента).
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
end $$;

revoke all on function public._schedule_owner(uuid, uuid), public._schedule_occasion(uuid),
  public._schedule_students(uuid, uuid), public._schedule_snapshot(uuid[]),
  public._schedule_sync_lesson(uuid, date), public._schedule_notify(uuid, text, text, text)
  from public, anon, authenticated;
revoke all on function public.schedule_move(uuid, date, text, boolean), public.schedule_shift(uuid, boolean),
  public.schedule_cancel(uuid, boolean), public.schedule_undo(jsonb) from public, anon;
grant execute on function public.schedule_move(uuid, date, text, boolean), public.schedule_shift(uuid, boolean),
  public.schedule_cancel(uuid, boolean), public.schedule_undo(jsonb) to authenticated;
