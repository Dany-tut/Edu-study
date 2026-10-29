-- Сводка ХимБио живая: пересобирается и уходит в Таскли при каждом изменении
-- в Искре, а не только утром (было — cron 07:30, 0105/0114).
--
-- • Триггеры на группы, учеников, ДЗ, сдачи и расписание помечают учителя
--   «грязным» (chembio_dirty). Раз в 15 секунд run_chembio_dirty() шлёт
--   свежую сводку каждому помеченному учителю из chembio_taskly_teachers и
--   снимает пометку: пачка правок — один PUT, а не сотня.
-- • Вместо номера ДЗ — его название, как в Искре (homework.title).

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

revoke all on function public.chembio_day_summary(uuid, date, text) from public, anon, authenticated;
grant execute on function public.chembio_day_summary(uuid, date, text) to service_role;


-- ── Кого пересобрать ────────────────────────────────────────────────────────

create table if not exists public.chembio_dirty (
  teacher_id uuid primary key,
  at timestamptz not null default now()
);
alter table public.chembio_dirty enable row level security;
revoke all on public.chembio_dirty from anon, authenticated;

create or replace function public.chembio_mark_dirty()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  g uuid;
  t uuid;
begin
  if TG_OP = 'DELETE' then r := OLD; else r := NEW; end if;
  if TG_TABLE_NAME = 'groups' then
    t := r.created_by;
  else
    if TG_TABLE_NAME = 'lesson_progress' then
      select s.group_id into g from students s where s.id = r.student_id;
    elsif TG_TABLE_NAME = 'schedule_lessons' then
      g := coalesce(r.group_id, (select s.group_id from students s where s.id = r.student_id));
    else
      g := r.group_id;
    end if;
    select created_by into t from groups where id = g;
  end if;
  if t is not null and exists (select 1 from chembio_taskly_teachers where teacher_id = t) then
    insert into chembio_dirty(teacher_id) values (t) on conflict (teacher_id) do nothing;
  end if;
  return null;
end; $$;

drop trigger if exists chembio_dirty on public.groups;
create trigger chembio_dirty after insert or update or delete on public.groups
  for each row execute function public.chembio_mark_dirty();
drop trigger if exists chembio_dirty on public.students;
create trigger chembio_dirty after insert or update of group_id or delete on public.students
  for each row execute function public.chembio_mark_dirty();
drop trigger if exists chembio_dirty on public.homework;
create trigger chembio_dirty after insert or update or delete on public.homework
  for each row execute function public.chembio_mark_dirty();
drop trigger if exists chembio_dirty on public.lesson_progress;
create trigger chembio_dirty after insert or update of status or delete on public.lesson_progress
  for each row execute function public.chembio_mark_dirty();
drop trigger if exists chembio_dirty on public.schedule_lessons;
create trigger chembio_dirty after insert or update or delete on public.schedule_lessons
  for each row execute function public.chembio_mark_dirty();


-- ── Отправка ────────────────────────────────────────────────────────────────

create or replace function public.run_chembio_dirty()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  fn_url text := 'https://igsdwvwiqnozgwczzycx.supabase.co/functions/v1/chembio-day';
  secret text;
  t uuid;
begin
  if not exists (select 1 from chembio_dirty) then return; end if;
  select decrypted_secret into secret from vault.decrypted_secrets
  where name = 'chembio_cron_secret' limit 1;
  if secret is null then return; end if;

  for t in delete from chembio_dirty returning teacher_id loop
    perform net.http_post(
      url     := fn_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-chembio-secret', secret),
      body    := jsonb_build_object('teacher_id', t),
      timeout_milliseconds := 30000
    );
  end loop;
end; $$;

revoke all on function public.run_chembio_dirty() from public, anon, authenticated;

select cron.unschedule('chembio-day-live')
where exists (select 1 from cron.job where jobname = 'chembio-day-live');
select cron.schedule('chembio-day-live', '15 seconds', $$select public.run_chembio_dirty()$$);
