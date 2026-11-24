-- student_track_v2: тот же ответ, что student_track, плюс
--  • grading — поля оценки из lesson_progress.attachments (раньше клиент
--    тянул их вторым запросом после RPC: лишний круг по сети ~300–400 мс);
--  • p_focus — short_id курса, открытого учеником в прошлый раз: уроки и
--    grading отдаются только для него ('partial': true), остальные курсы —
--    без уроков. Клиент рисует первый экран и следом догружает полный ответ.
-- Неизвестный p_focus = полный ответ. Права — как у student_track (invoker, RLS).
create or replace function public.student_track_v2(p_student uuid, p_group uuid, p_focus text default null)
returns jsonb
language sql
stable
set search_path to ''
as $function$
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
  select c.id, c.short_id, c.title, c.subject, c.student_ids, c.group_ids, c.created_at, c.number_start
  from public.courses c, sc
  where c.status = 'published'
    and (c.student_ids && sc.ids or c.group_ids && sc.gids)
),
f as (
  select (select id from cs where p_focus is not null and cs.short_id = p_focus limit 1) as course_id
),
focus_refs as (
  select l.short_id from public.lessons l, f where l.course_id = f.course_id
)
select jsonb_build_object(
  'partial', (select course_id is not null from f),
  'rows', (select coalesce(jsonb_agg(jsonb_build_array(id, group_id)), '[]'::jsonb) from scope),
  'modes', (select coalesce(jsonb_object_agg(e.course_id::text, e.access_mode), '{}'::jsonb)
              from public.course_enrollments e, sc
             where e.student_id = any(sc.ids::text[])
               and e.course_id in (select id from cs)),
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
  'grading', (select coalesce(jsonb_agg(jsonb_build_array(
                 p.lesson_ref, p.status, p.score, p.attachments->'v', p.attachments->'rows',
                 p.attachments->'reviewRequired', p.attachments->'recommendationScore',
                 p.attachments->'attemptId', p.attachments->'testlyKey', p.attachments->'draft',
                 p.attachments->'reviewedAt', p.attachments->'selfAssessment', p.attachments->'video')), '[]'::jsonb)
                from public.lesson_progress p, sc, f
               where p.student_id = any(sc.ids)
                 and (f.course_id is null or exists (
                   select 1 from focus_refs r
                    where p.lesson_ref = r.short_id or p.lesson_ref like r.short_id || '-%' or p.lesson_ref like r.short_id || '~%'))),
  'courses', (select coalesce(jsonb_agg(jsonb_build_array(
        c.id, c.short_id, c.title, c.subject, c.student_ids, c.group_ids,
        (select coalesce(jsonb_agg(jsonb_build_array(m.position, m.label,
              case when f.course_id is null or f.course_id = c.id then
              (select coalesce(jsonb_agg(jsonb_build_array(
                    l.id, l.short_id, l.title, l.lesson_number, l.shape, l.has_hard,
                    l.youtube_url, l.timecodes, l.kind, l.test_tasks,
                    l.scheduled_date, l.scheduled_time, l.rec_date, l.rec_time,
                    l.lesson_sched_manual, l.materials)
                  order by l.lesson_number), '[]'::jsonb)
               from public.lessons l where l.module_id = m.id) end)
            order by m.position), '[]'::jsonb)
         from public.course_modules m where m.course_id = c.id),
        c.number_start
      ) order by c.created_at), '[]'::jsonb) from cs c, f)
)
$function$;
revoke all on function public.student_track_v2(uuid, uuid, text) from public, anon;
grant execute on function public.student_track_v2(uuid, uuid, text) to authenticated, service_role;
