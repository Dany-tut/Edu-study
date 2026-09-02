-- Скелет трека одним запросом.
--
-- ПОЧЕМУ. Вход ученика делал три круга ПОДРЯД: охват (person_student_rows) →
-- курсы → режимы доступа (course_enrollments). Замер на проде: круг до нашего
-- региона стоит 320–400 мс независимо от того, что в нём едет (пустой запрос к
-- тому же эндпоинту — 320 мс), то есть две трети секунды уходило на ожидание, а
-- не на работу. Сам Postgres собирает весь ответ за 49 мс.
--
-- ЧТО ВНУТРИ. Охват человека, его курсы со структурой, режимы доступа и
-- назначенные из банка сложные задания — всё вместе.
--
-- ФОРМАТ. Массивы, а не объекты: имена полей повторялись по разу на урок и
-- составляли большую часть веса. На этом ученике 253 КБ на 9 курсов и 1106
-- уроков против 455 КБ на 5 курсов и 644 урока у прежнего вложенного JSON.
-- Порядок полей разбирается в fetchStudentTrack (src/lib/db.ts) — менять только
-- вместе с ним.
--
-- ДОСТУП. SECURITY DEFINER, как и person_student_rows: легаси-вход ученика
-- (student_login) живёт без auth-сессии, и без definer охват схлопнулся бы до
-- одной строки. Новой открытости это не добавляет — те же строки клиент и так
-- забирал прямыми запросами к courses/course_enrollments под ключом anon.
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
  'hard', (select coalesce(jsonb_agg(jsonb_build_array(h.lesson_id, h.hard_tasks) order by h.created_at), '[]'::jsonb)
             from public.homework h, sc
            where h.group_id = any(sc.gids)
              and h.lesson_id is not null
              and h.status = 'active'
              and h.hard_tasks is not null),
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

-- Вложенный сбор уроков по модулю шёл сиквенсканом по всей таблице на КАЖДЫЙ
-- модуль: 33 прохода по 1332 строкам, из которых 1312 выбрасывались. Сейчас это
-- 16 мс и незаметно, но растёт произведением «уроки × модули».
create index if not exists lessons_module_idx on public.lessons (module_id, lesson_number);
