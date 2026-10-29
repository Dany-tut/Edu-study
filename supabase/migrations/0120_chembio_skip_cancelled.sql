-- Сводка ХимБио без отменённых занятий (статус cancelled — 0121).
-- Тело — из 0117 без изменений, кроме двух условий `sl.status <> 'cancelled'`
-- в CTE upcoming_lessons и lesson_rows: отменённое занятие не попадает ни в
-- «Сегодня HH:MM», ни в календарь «Искра» в Таскли. Живое обновление (0115)
-- срабатывает и на смену статуса — Таскли узнает об отмене за 15 секунд.
--
create or replace function public.chembio_day_summary(
  p_teacher uuid,
  p_date    date default (now() at time zone 'Europe/Moscow')::date,
  p_link    text default 'https://edu-study-app.vercel.app/#/teacher/homework'
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with my_groups as (
    select g.*,
           case g.subject when 'Химия' then 'chemistry' when 'Биология' then 'biology' end as subj,
           case g.level   when 'ЕГЭ'   then 'ege'       when 'ОГЭ'      then 'oge'     end as exam
    from groups g
    where g.created_by = p_teacher
  ),
  my_students as (
    select s.id, s.group_id from students s join my_groups g on g.id = s.group_id
  ),
  current_hw as (
    select distinct on (h.group_id) h.*
    from homework h
    join my_groups g on g.id = h.group_id
    where h.status <> 'closed'
      and not g.is_individual
      and g.subj is not null
    order by h.group_id, h.assigned_at desc nulls last, h.created_at desc
  ),
  group_rows as (
    select g.name, g.id,
           jsonb_strip_nulls(jsonb_build_object(
             'id', g.id,
             'title', g.name,
             'subject', g.subj,
             'exam', g.exam,
             'homework', jsonb_strip_nulls(jsonb_build_object(
               -- Название ДЗ — ровно как учитель написал его в Искре
               -- («ДЗ Атомы», «ДЗ Атомы 2»). Пустое — поля нет.
               'title', nullif(btrim(h.title), ''),
               'submitted', (select count(distinct lp.student_id)
                             from lesson_progress lp
                             join my_students s on s.id = lp.student_id and s.group_id = g.id
                             where lp.lesson_ref = 'hw-' || h.id
                               and lp.status in ('submitted', 'returned', 'completed')),
               'total', (select count(*) from my_students s where s.group_id = g.id)
             ))
           )) as row
    from current_hw h join my_groups g on g.id = h.group_id
  ),
  awaiting as (
    select count(*) as n
    from lesson_progress lp
    join my_students s on s.id = lp.student_id
    where lp.status = 'submitted'
      and (
        lp.lesson_ref like '%-hard'
        or exists (select 1 from homework h
                   where 'hw-' || h.id = lp.lesson_ref and h.status <> 'closed')
        or (lp.lesson_ref not like 'hw-%' and coalesce(lp.comment, '') <> '')
      )
  ),
  ai_graded as (
    select count(*) as n
    from hw_ai_grades a
    join lesson_progress lp on lp.id = a.progress_id
    where a.teacher_id = p_teacher
      and a.status = 'graded'
      and lp.status = 'submitted'
  ),
  -- Календарь «Искра» в Таскли: занятия на месяц вперёд и сроки открытых ДЗ.
  -- Строка группового занятия бывает на группу и на каждого ученика — берём одну.
  upcoming_lessons as (
    select distinct on (sl.date, lpad(sl.time_start, 5, '0'), coalesce(g.id::text, sl.student_id::text))
           sl.date, lpad(sl.time_start, 5, '0') as t0,
           case when sl.time_end ~ '^\d{1,2}:\d{2}$' then lpad(sl.time_end, 5, '0') end as t1,
           case when g.id is null or g.is_individual then 'Индивидуально' else g.name end as label,
           case when g.id is null or g.is_individual then null else g.id end as gid,
           coalesce(g.subj, case sl.subject when 'Химия' then 'chemistry' when 'Биология' then 'biology' end) as subj,
           nullif(btrim(sl.lesson_title), '') as title,
           sl.node_type
    from schedule_lessons sl
    left join my_groups g on g.id = sl.group_id
    where sl.date between p_date and p_date + 31
      and sl.time_start ~ '^\d{1,2}:\d{2}$'
      and sl.status <> 'cancelled'
      and (g.id is not null
           or sl.student_id in (select id from my_students))
    order by sl.date, lpad(sl.time_start, 5, '0'), coalesce(g.id::text, sl.student_id::text),
             (sl.student_id is null) desc
  ),
  upcoming_hw as (
    select h.id, h.due_date::date as due_date, h.title, g.id as gid, g.name, g.subj,
           (select count(distinct lp.student_id)
              from lesson_progress lp
              join my_students s on s.id = lp.student_id and s.group_id = g.id
             where lp.lesson_ref = 'hw-' || h.id
               and lp.status in ('submitted', 'returned', 'completed')) as submitted,
           (select count(*) from my_students s where s.group_id = g.id) as total
    from homework h
    join my_groups g on g.id = h.group_id
    where h.status <> 'closed'
      and h.due_date::date between p_date - 7 and p_date + 31
  ),
  upcoming_rows as (
    select l.date as d, l.t0 as t, jsonb_strip_nulls(jsonb_build_object(
             'kind', 'lesson',
             'at', to_char(l.date, 'YYYY-MM-DD') || 'T' || l.t0 || ':00+03:00',
             'end', case when l.t1 > l.t0 then to_char(l.date, 'YYYY-MM-DD') || 'T' || l.t1 || ':00+03:00' end,
             'group', l.label,
             'group_id', l.gid,
             'subject', l.subj,
             'title', l.title,
             'rec', case when l.node_type = 'rec' then true end,
             'link', regexp_replace(p_link, '#.*$', '') || '#/teacher/groups'
           )) as row
    from upcoming_lessons l
    union all
    select h.due_date, '99:99', jsonb_strip_nulls(jsonb_build_object(
             'kind', 'homework',
             'due', to_char(h.due_date, 'YYYY-MM-DD'),
             'id', h.id,
             'group', h.name,
             'group_id', h.gid,
             'subject', h.subj,
             'title', nullif(btrim(h.title), ''),
             'submitted', h.submitted,
             'total', h.total,
             'link', p_link
           ))
    from upcoming_hw h
  ),
  lesson_rows as (
    select distinct
           sl.time_start,
           case when g.id is null or g.is_individual then 'Индивидуально' else g.name end as label,
           case when g.id is null or g.is_individual then null else g.id end as gid
    from schedule_lessons sl
    left join my_groups g on g.id = sl.group_id
    where sl.date = p_date
      and sl.time_start ~ '^\d{1,2}:\d{2}$'
      and sl.status <> 'cancelled'
      and (g.id is not null
           or sl.student_id in (select id from my_students))
  )
  select jsonb_build_object(
    'version', 1,
    'date', to_char(p_date, 'YYYY-MM-DD'),
    'updated', to_char(now() at time zone 'Europe/Moscow', 'YYYY-MM-DD"T"HH24:MI:SS') || '+03:00',
    'source', 'iskra',
    'groups', coalesce((select jsonb_agg(row order by name) from group_rows), '[]'::jsonb),
    'review', jsonb_build_object(
      'ai_graded', (select n from ai_graded),
      'awaiting', (select n from awaiting)
    ),
    'lessons', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
               'at', to_char(p_date, 'YYYY-MM-DD') || 'T' || lpad(time_start, 5, '0') || ':00+03:00',
               'group', label,
               'group_id', gid
             )) order by lpad(time_start, 5, '0'), label)
      from lesson_rows
    ), '[]'::jsonb),
    'upcoming', coalesce((
      select jsonb_agg(row order by d, t, row->>'group') from upcoming_rows
    ), '[]'::jsonb),
    'link', p_link
  );
$$;

revoke all on function public.chembio_day_summary(uuid, date, text) from public, anon, authenticated;
grant execute on function public.chembio_day_summary(uuid, date, text) to service_role;
