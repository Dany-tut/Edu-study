-- Порядок курсов сохраняет САМ ученик — из своих настроек.
--
-- ПОЧЕМУ RPC. Порядок лежит в course_enrollments.position (миграция 0079), а
-- писать в эту таблицу по RLS может только учитель: ученик ходит либо под anon
-- (легаси-вход student_login), либо под своей auth-сессией, и прямой update ему
-- закрыт. Открывать таблицу на запись ради перестановки чипов нельзя — там же
-- живёт уровень доступа к урокам. Поэтому одна узкая дверь: SECURITY DEFINER,
-- которая трогает ТОЛЬКО position и только у курсов этого человека.
--
-- ОХВАТ. У ученика 1:1 на каждый предмет своя строка, курсы разложены по ним.
-- Позиция пишется в ту строку, которая «владеет» курсом (прямое назначение →
-- иначе строка внутри назначенной группы) — туда же, куда пишется прогресс.
-- Курс, к которому человек не имеет отношения, отсекается join'ом.
--
-- Той же дверью пользуется и учитель (панель ученика): один путь записи —
-- значит одна логика владения и никакого расхождения между кабинетами.
create or replace function public.set_course_order(p_student uuid, p_courses uuid[])
returns void
language sql
security definer
set search_path = public
as $$
with rows as (
  select id, group_id from public.person_student_rows(p_student)
),
ord as (
  select cid, (ordinality - 1)::smallint pos
  from unnest(coalesce(p_courses, '{}'::uuid[])) with ordinality t(cid, ordinality)
),
tgt as (
  select o.cid, o.pos,
         coalesce(
           (select r.id from rows r where c.student_ids @> array[r.id] limit 1),
           (select r.id from rows r where r.group_id is not null and c.group_ids @> array[r.group_id] limit 1)
         ) owner
    from ord o
    join public.courses c on c.id = o.cid
)
insert into public.course_enrollments (course_id, student_id, access_mode, position)
select cid, owner::text, 'custom', pos from tgt where owner is not null
on conflict (course_id, student_id) do update set position = excluded.position;
$$;

grant execute on function public.set_course_order(uuid, uuid[]) to anon, authenticated;
