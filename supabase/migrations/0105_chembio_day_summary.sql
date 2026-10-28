-- Утренняя сводка учителя ХимБио для Таскли (шаг 6 сквозного флоу).
--
-- chembio_day_summary(учитель, день) собирает JSON в формате канала
-- PUT /chembio/day (ChemBio_KB/integration/TASKLY.md, «Канал ХимБио»).
-- Отправляет его Edge Function chembio-day; cron ниже будит её по будням.
--
-- ЧТО СЧИТАЕТСЯ — так же, как в кабинете учителя (useHomework.ts):
--   • groups[]  — обычные группы учителя по химии и биологии с открытым ДЗ.
--     Текущее ДЗ = последнее не закрытое. submitted — сколько учеников сдали
--     (строка lesson_progress `hw-<id>` в submitted/returned/completed),
--     total — сколько учеников в группе сейчас.
--   • review.awaiting — работы в статусе submitted: обычное ДЗ открытых
--     домашек, сложные задания (`…-hard`) и старый одиночный хард (ответ в
--     comment). Та же сумма, что на бейдже «Проверка».
--   • review.ai_graded — 0, пока нет таблицы предоценки ИИ (ветка
--     chembio-hw-grade). Число не выдумываем (П0 ХимБио): когда таблица
--     появится, считать отсюда и переопределить awaiting как «ИИ оценил,
--     ждут ок учителя».
--   • lessons[]  — занятия дня из schedule_lessons.
--
-- ИМЁН УЧЕНИКОВ В СВОДКЕ НЕТ (П3). Индивидуальная группа называется именем
-- ученика, поэтому в groups[] её нет, а её занятия — и занятия, привязанные к
-- ученику напрямую, — идут строкой «Индивидуально» без group_id.
--
-- Часовой пояс школы — Москва. Смещение +03:00 постоянное с 2014 года.

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
               -- Номер — только если учитель сам написал его в названии
               -- («ДЗ 30», «ДЗ № 30»). Порядковый номер в базе с нумерацией
               -- Вадима может не совпасть.
               'n', (substring(h.title from '(?i)ДЗ\s*№?\s*(\d+)'))::int,
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
  lesson_rows as (
    select distinct
           sl.time_start,
           case when g.id is null or g.is_individual then 'Индивидуально' else g.name end as label,
           case when g.id is null or g.is_individual then null else g.id end as gid
    from schedule_lessons sl
    left join my_groups g on g.id = sl.group_id
    where sl.date = p_date
      and sl.time_start ~ '^\d{1,2}:\d{2}$'
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
      'ai_graded', 0,
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
    'link', p_link
  );
$$;

-- Сводку читает только Edge Function под service_role: в ней счётчики по
-- чужим группам, браузеру она ни к чему.
revoke all on function public.chembio_day_summary(uuid, date, text) from public, anon, authenticated;
grant execute on function public.chembio_day_summary(uuid, date, text) to service_role;


-- ── Расписание ──────────────────────────────────────────────────────────────
--
-- Как у analytics-digest (0073): cron делает один HTTP-вызов функции, секрет
-- вызова лежит в Vault под именем chembio_cron_secret. Нет секрета — задача
-- ничего не делает и пишет notice. Учитель — Вадим (thepoembyheart).

create extension if not exists pg_net;

create or replace function public.run_chembio_day()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  fn_url text := 'https://igsdwvwiqnozgwczzycx.supabase.co/functions/v1/chembio-day';
  secret text;
begin
  select decrypted_secret into secret
  from vault.decrypted_secrets
  where name = 'chembio_cron_secret'
  limit 1;

  if secret is null then
    raise notice 'chembio_cron_secret нет в Vault — сводка ХимБио пропущена';
    return;
  end if;

  perform net.http_post(
    url     := fn_url,
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'x-chembio-secret', secret
    ),
    body    := jsonb_build_object('teacher_id', 'a2857e8b-b11f-45e1-a59e-336466b80db7'),
    timeout_milliseconds := 30000
  );
end; $$;

revoke all on function public.run_chembio_day() from public, anon, authenticated;

-- Будни, 04:30 UTC = 07:30 Москвы.
select cron.unschedule('chembio-day-weekdays')
where exists (select 1 from cron.job where jobname = 'chembio-day-weekdays');

select cron.schedule(
  'chembio-day-weekdays',
  '30 4 * * 1-5',
  $$select public.run_chembio_day()$$
);
