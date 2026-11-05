-- «Урок открылся» для курсов в режиме «по дате».
--
-- Почему. В режиме by_date урок открывается при чтении (db.ts
-- mergeSubjectsWithProgress: scheduled_date ≤ сегодня), в базе в этот момент
-- ничего не меняется — значит, и триггеру не на что сработать. Ученик узнавал
-- об уроке, только если сам заходил в кабинет.
--
-- Что делаем: раз в сутки утром (07:05 МСК) — ученикам, которым курс назначен и
-- открыт по дате, уведомление по каждому уроку с датой «сегодня». Не шлём, если:
--   - курс ученику больше не назначен (запись доступа осталась, а назначения нет);
--   - урок у него уже открыт или пройден (учитель открыл раньше вручную);
--   - такое уведомление уже есть (повторный запуск в тот же день).
-- Ссылка — short_id урока: под ним урок живёт в кабинете ученика.

set local lock_timeout = '5s';
set local statement_timeout = '30s';

create or replace function public.run_lesson_unlocked_notify(p_day date default null)
returns integer
language plpgsql security definer set search_path = public
as $function$
declare
  v_day   date := coalesce(p_day, (now() at time zone 'Europe/Moscow')::date);
  v_label text := to_char(v_day, 'DD.MM.YYYY');
  v_count integer;
begin
  insert into public.notifications(recipient_id, recipient_role, type, title, body, link)
  select s.id, 'student', 'lesson_unlocked', 'Урок открылся',
         '«' || coalesce(nullif(trim(l.title), ''), 'Новый урок') || '»'
           || coalesce(' · ' || nullif(trim(c.title), ''), '') || '.',
         jsonb_build_object('page', 'home', 'lessonRef', l.short_id, 'subject', c.short_id)
  from public.course_enrollments e
  join public.courses c on c.id = e.course_id
  join public.lessons l on l.course_id = e.course_id
  join public.students s on s.id::text = e.student_id
  where e.access_mode = 'by_date'
    and l.scheduled_date = v_label
    and l.short_id is not null
    and (s.id = any(c.student_ids) or s.group_id = any(c.group_ids))
    and not exists (
      select 1 from public.lesson_progress lp
      where lp.student_id = s.id and lp.lesson_ref = l.short_id
        and lp.status is distinct from 'locked')
    and not exists (
      select 1 from public.notifications n
      where n.recipient_id = s.id and n.type = 'lesson_unlocked'
        and n.link->>'lessonRef' = l.short_id);
  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;
revoke all on function public.run_lesson_unlocked_notify(date) from public, anon, authenticated;

do $cron$ begin
  if exists (select 1 from cron.job where jobname = 'lesson-unlocked-daily') then
    perform cron.unschedule('lesson-unlocked-daily');
  end if;
  -- 04:05 UTC = 07:05 МСК: после полуночи по Москве урок уже открыт у ученика.
  perform cron.schedule('lesson-unlocked-daily', '5 4 * * *', 'select public.run_lesson_unlocked_notify()');
end $cron$;
