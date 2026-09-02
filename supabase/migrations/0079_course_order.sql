-- Порядок курсов ученика — руками учителя.
--
-- ПОЧЕМУ. До сих пор курсы у ученика шли в порядке создания (order by
-- c.created_at в student_track). Курс, собранный позже, но идущий по программе
-- первым, оказывался последним чипом в «Курсах», последней дорожкой на треке и
-- последним в домашках — и переставить это было нечем.
--
-- ЧТО. Одно число на пару «ученик × курс», рядом с уровнем доступа: там же, где
-- уже живёт «как этому ученику открывается этот курс». NULL = «не расставляли»:
-- такие курсы идут после расставленных, в прежнем порядке создания. Сортирует
-- клиент (src/lib/db.ts): порядок нужен и второму, запасному пути загрузки.
alter table public.course_enrollments
  add column if not exists position smallint;

-- В student_track добавляется карта позиций — тем же способом, что и 'modes'.
create or replace function public.student_track(p_student uuid, p_group uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with scope as (
  select r.id, r.group_id from public.person_student_rows(p_student) r
  union
  select s.id, s.group_id from public.students s
   where auth.uid() is not null and s.auth_user_id = auth.uid()
),
sc as (
  select coalesce(array_agg(distinct id) filter (where id is not null), '{}')::uuid[] ids,
         coalesce(array_agg(distinct group_id) filter (where group_id is not null), '{}')::uuid[] gids
  from scope
),
cs as (
  select c.id, c.short_id, c.title, c.subject, c.student_ids, c.group_ids, c.created_at
  from public.courses c, sc
  where c.status = 'published'
    and (c.student_ids && sc.ids or c.group_ids && sc.gids)
)
select jsonb_build_object(
  'rows', (select coalesce(jsonb_agg(jsonb_build_array(id, group_id)), '[]'::jsonb) from scope),
  -- student_id в course_enrollments — text, отсюда приведение.
  'modes', (select coalesce(jsonb_object_agg(e.course_id::text, e.access_mode), '{}'::jsonb)
              from public.course_enrollments e, sc
             where e.student_id = any(sc.ids::text[])
               and e.course_id in (select id from cs)),
  -- Порядок курсов. Только расставленные — остальные клиент оставляет как есть.
  'pos', (select coalesce(jsonb_object_agg(e.course_id::text, e.position), '{}'::jsonb)
            from public.course_enrollments e, sc
           where e.student_id = any(sc.ids::text[])
             and e.position is not null
             and e.course_id in (select id from cs)),
  'hard', (select coalesce(jsonb_agg(jsonb_build_array(h.lesson_id, h.hard_tasks) order by h.created_at), '[]'::jsonb)
             from public.homework h, sc
            where h.group_id = any(sc.gids)
              and h.lesson_id is not null
              and h.status = 'active'
              and h.hard_tasks is not null),
  'progress', (select coalesce(jsonb_agg(jsonb_build_array(
                 p.lesson_ref, p.subject, p.status, p.score, p.comment,
                 p.review_comment, p.hard_submitted)), '[]'::jsonb)
                 from public.lesson_progress p, sc
                where p.student_id = any(sc.ids)),
  'courses', (select coalesce(jsonb_agg(jsonb_build_array(
        c.id, c.short_id, c.title, c.subject, c.student_ids, c.group_ids,
        (select coalesce(jsonb_agg(jsonb_build_array(m.position, m.label,
              (select coalesce(jsonb_agg(jsonb_build_array(
                    l.id, l.short_id, l.title, l.lesson_number, l.shape, l.has_hard,
                    l.youtube_url, l.timecodes, l.kind, l.test_tasks,
                    l.scheduled_date, l.scheduled_time, l.rec_date, l.rec_time,
                    l.lesson_sched_manual, l.materials)
                  order by l.lesson_number), '[]'::jsonb)
               from public.lessons l where l.module_id = m.id))
            order by m.position), '[]'::jsonb)
         from public.course_modules m where m.course_id = c.id)
      ) order by c.created_at), '[]'::jsonb) from cs c)
)
$$;

grant execute on function public.student_track(uuid, uuid) to anon, authenticated;
