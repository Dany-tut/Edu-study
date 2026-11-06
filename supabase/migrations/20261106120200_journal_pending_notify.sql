-- «Журнал не заполнен» на сервере.
--
-- Раньше незаполненные уроки считал только клиент (useJournalPending →
-- pendingJournalRows): учитель видел значок и баннер, лишь открыв кабинет.
-- Теперь правило живёт в одной SQL-функции. Её читают и клиент (RPC
-- journal_pending), и pg_cron: раз в 10 минут он кладёт учителю уведомление
-- в колокольчик — одно на урок.
--
-- Правило (как было в src/lib/journalPending.ts):
--  • занятие из schedule_lessons учителя (его группа или его ученик),
--    не отменённое, за последние 30 дней;
--  • с начала прошло 2 часа (время занятий — московское, как в остальной базе);
--  • хотя бы у одного ученика нет отметки: точная отметка урока
--    (teacher_lesson_sessions.attendance[ученик] = true/false), а если ключа
--    нет — старая lesson_attendance за ту же дату и тему, но только когда
--    в этот день у группы/ученика одно такое занятие;
--  • групповое занятие без учеников тоже ждёт, как и на клиенте;
--  • одинаковые строки (та же группа/ученик, дата, время, тема) — одно занятие.
--
-- Перенос двигает дату/время самой строки, отмена ставит status='cancelled' —
-- функция читает строку как есть. Уведомление о занятии, которое отметили,
-- отменили, удалили или перенесли в будущее, крон гасит (read = true), чтобы
-- колокольчик не звал в пустой журнал. Повторно о том же занятии не пишет.

-- ── 1. Правило ────────────────────────────────────────────────────────────────
create or replace function public._journal_pending(p_owner uuid, p_now timestamptz default now())
returns table (
  schedule_id uuid, date date, time_start text, lesson_title text,
  group_id uuid, student_id uuid, scope_name text
)
language sql stable security definer set search_path = public
as $$
  with roster as (
    select s.id, s.group_id from students s where s.created_by = p_owner
  ),
  events as (
    select sl.id, sl.date, sl.time_start, sl.lesson_title, sl.group_id, sl.student_id,
           sl.lesson_id, sl.subject, sl.node_type,
           (sl.date + case when sl.time_start ~ '^\d{1,2}:\d{2}$'
                           then (sl.time_start || ':00')::interval else interval '0' end)
             at time zone 'Europe/Moscow' as starts_at
    from schedule_lessons sl
    where sl.status is distinct from 'cancelled'
      and sl.date between (p_now at time zone 'Europe/Moscow')::date - 30
                      and (p_now at time zone 'Europe/Moscow')::date
      and (sl.group_id in (select g.id from groups g where g.created_by = p_owner)
           or sl.student_id in (select id from roster))
  ),
  due as (
    select e.*,
      -- Старые отметки однозначны, только если в этот день одно такое занятие.
      (select count(distinct (o.time_start, o.lesson_id, o.subject, o.node_type))
         from events o
        where o.date = e.date
          and o.lesson_title is not distinct from e.lesson_title
          and o.group_id is not distinct from e.group_id
          and o.student_id is not distinct from e.student_id) = 1 as legacy_ok,
      coalesce((select t.attendance from teacher_lesson_sessions t where t.schedule_id = e.id), '{}'::jsonb) as marks
    from events e
    where e.starts_at + interval '2 hours' <= p_now
  ),
  members as (
    select d.id as event_id, r.id as sid
      from due d join roster r on d.group_id is not null and r.group_id = d.group_id
    union
    select d.id, d.student_id from due d where d.group_id is null and d.student_id is not null
  ),
  unmarked as (
    select distinct m.event_id
    from members m join due d on d.id = m.event_id
    where not case
      when d.marks ? m.sid::text then jsonb_typeof(d.marks -> m.sid::text) = 'boolean'
      else d.legacy_ok and exists (
        select 1 from lesson_attendance la
        where la.student_id = m.sid and la.lesson_date = d.date
          and coalesce(la.lesson_title, '') = coalesce(d.lesson_title, '')
          and la.present is not null)
    end
  ),
  pending as (
    select distinct on (coalesce(d.group_id, d.student_id), d.date, d.time_start, d.lesson_title)
      d.id, d.date, d.time_start, d.lesson_title, d.group_id, d.student_id
    from due d
    where d.id in (select event_id from unmarked)
       or not exists (select 1 from members m where m.event_id = d.id)
    order by coalesce(d.group_id, d.student_id), d.date, d.time_start, d.lesson_title, d.id
  )
  select p.id, p.date, coalesce(p.time_start, ''), coalesce(p.lesson_title, ''),
         coalesce(p.group_id, st.group_id), p.student_id, coalesce(g.name, st.name, '')
  from pending p
  left join groups g on g.id = p.group_id
  left join students st on st.id = p.student_id
  order by p.date desc, p.time_start desc, p.id
$$;
revoke all on function public._journal_pending(uuid, timestamptz) from public, anon, authenticated;

-- Клиент: незаполненные уроки вошедшего учителя (useJournalPending).
create or replace function public.journal_pending()
returns table (
  schedule_id uuid, date date, time_start text, lesson_title text,
  group_id uuid, student_id uuid, scope_name text
)
language sql stable security definer set search_path = public
as $$
  select * from public._journal_pending(auth.uid()) where auth.uid() is not null
$$;
revoke all on function public.journal_pending() from public, anon;
grant execute on function public.journal_pending() to authenticated;

-- ── 2. Уведомления ────────────────────────────────────────────────────────────
-- Одно уведомление на занятие и учителя: повторный прогон крона ничего не добавит.
create unique index if not exists notifications_fill_journal_once
  on public.notifications (recipient_id, (link ->> 'scheduleId'))
  where type = 'fill_journal';

create or replace function public.notify_journal_pending(p_now timestamptz default now())
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_owner uuid;
  v_added integer := 0;
  v_n integer;
begin
  for v_owner in
    select distinct coalesce(g.created_by, s.created_by)
    from schedule_lessons sl
    left join groups g on g.id = sl.group_id
    left join students s on s.id = sl.student_id
    where sl.date between (p_now at time zone 'Europe/Moscow')::date - 30
                      and (p_now at time zone 'Europe/Moscow')::date
      and coalesce(g.created_by, s.created_by) is not null
    union
    -- учитель, чьё занятие удалили целиком: его уведомление тоже надо погасить
    select n.recipient_id from public.notifications n
    where n.type = 'fill_journal' and not n.read
  loop
    insert into public.notifications(recipient_id, recipient_role, type, title, body, link)
    select v_owner, 'teacher', 'fill_journal',
           'Журнал не заполнен' || case when p.scope_name <> '' then ' — ' || p.scope_name else '' end,
           concat_ws(' · ', to_char(p.date, 'DD.MM'), nullif(left(p.time_start, 5), ''), nullif(p.lesson_title, '')),
           jsonb_build_object('page', 'teacher/gradebook', 'scheduleId', p.schedule_id,
                              'groupId', p.group_id, 'studentId', p.student_id, 'date', p.date)
    from public._journal_pending(v_owner, p_now) p
    on conflict (recipient_id, (link ->> 'scheduleId')) where type = 'fill_journal' do nothing;
    get diagnostics v_n = row_count;
    v_added := v_added + v_n;

    -- Занятие отметили, отменили, удалили или унесли в будущее — гасим.
    update public.notifications n set read = true
    where n.recipient_id = v_owner and n.type = 'fill_journal' and not n.read
      and not exists (select 1 from public._journal_pending(v_owner, p_now) p
                      where p.schedule_id::text = n.link ->> 'scheduleId');
  end loop;
  return v_added;
end;
$$;
revoke all on function public.notify_journal_pending(timestamptz) from public, anon, authenticated;

select cron.unschedule('journal-pending-notify')
where exists (select 1 from cron.job where jobname = 'journal-pending-notify');
select cron.schedule('journal-pending-notify', '*/10 * * * *',
  $$select public.notify_journal_pending()$$);
