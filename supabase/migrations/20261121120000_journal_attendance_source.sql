-- Журнал: «был» на уроке в записи и перенос прошлых уроков.
--
-- 1. lesson_attendance.source — откуда отметка: live (живой урок), recording
--    (урок в записи, учитель отметил присутствие на трансляции), transfer
--    (перенос прошлого из Excel). schedule_lesson_id — точное занятие.
-- 2. Баланс: списывает только живой урок. Запись и перенос баланс не меняют,
--    поэтому и «Оплаченные занятия закончились» по ним не приходит.
-- 3. Зачёт ученику: «был» засчитывает и урок в записи (раньше только live).
-- 4. «Журнал не заполнен» не напоминает о записях и тестах.
--
-- Клиент работает и без этой миграции: проверяет колонку source перед переносом.
set local lock_timeout = '5s';
set local statement_timeout = '60s';

alter table public.lesson_attendance
  add column if not exists source text not null default 'live',
  add column if not exists schedule_lesson_id uuid references public.schedule_lessons(id) on delete set null;
do $c$ begin
  if not exists(select 1 from pg_constraint where conname='lesson_attendance_source_check') then
    alter table public.lesson_attendance add constraint lesson_attendance_source_check
      check (source in ('live','recording','transfer'));
  end if;
end $c$;
create index if not exists lesson_attendance_schedule_lesson_idx
  on public.lesson_attendance(schedule_lesson_id) where schedule_lesson_id is not null;

-- ── Баланс: −1 только за присутствие на живом уроке ───────────────────────────
create or replace function public.sync_prepaid_lesson_balance()
returns trigger language plpgsql security invoker set search_path = '' as $function$
declare
  old_student uuid; new_student uuid;
  old_credit integer := 0; new_credit integer := 0;
begin
  if tg_op <> 'INSERT' then
    old_student := old.student_id;
    if tg_table_name='payments' then old_credit:=old.lessons_paid;
    else old_credit:=case when old.present and coalesce(old.source,'live')='live' then -1 else 0 end; end if;
  end if;
  if tg_op <> 'DELETE' then
    new_student := new.student_id;
    if tg_table_name='payments' then new_credit:=new.lessons_paid;
    else new_credit:=case when new.present and coalesce(new.source,'live')='live' then -1 else 0 end; end if;
  end if;
  -- The same pupil order prevents opposing transfers from taking locks backwards.
  perform 1 from public.students s where s.id in (old_student,new_student) order by s.id for update;
  update public.students s set lesson_balance=s.lesson_balance
    +case when s.id=new_student then new_credit else 0 end
    -case when s.id=old_student then old_credit else 0 end
  where s.id in (old_student,new_student)
    and (case when s.id=new_student then new_credit else 0 end
       -case when s.id=old_student then old_credit else 0 end) <> 0;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$function$;
revoke all on function public.sync_prepaid_lesson_balance() from public,anon,authenticated;

-- ── Сохранение отметок: источник и точное занятие ─────────────────────────────
drop function if exists public.teacher_journal_save(uuid,jsonb);
drop function if exists public.teacher_lesson_save(uuid,text,text,jsonb,jsonb);
create or replace function public.teacher_lesson_save(
  p_schedule uuid, p_action text default 'save', p_note text default null,
  p_attendance jsonb default null, p_draft jsonb default null, p_source text default null
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  sl public.schedule_lessons;
  st public.teacher_lesson_sessions;
  entry record;
  old_att public.lesson_attendance;
  sid uuid;
  gid uuid;
  skipped integer := 0;
  v_source text;
begin
  if auth.uid() is null then raise exception 'Нужно войти в кабинет'; end if;
  select * into sl from public.schedule_lessons where id = p_schedule for update;
  if not found or not (
    exists(select 1 from public.groups g where g.id=sl.group_id and g.created_by=auth.uid()) or
    exists(select 1 from public.students s where s.id=sl.student_id and s.created_by=auth.uid())
  ) then raise exception 'Это занятие недоступно для изменения'; end if;
  if p_action not in ('save','start','complete') then raise exception 'Неизвестное действие'; end if;
  if sl.status='cancelled' then raise exception 'Занятие отменено'; end if;
  if p_action='start' and sl.status='completed' then raise exception 'Занятие уже завершено'; end if;
  if p_action='complete' and sl.status not in ('live','completed') then raise exception 'Сначала начните занятие'; end if;
  if length(coalesce(p_note,'')) > 10000 then raise exception 'Заметка слишком длинная'; end if;
  if p_attendance is not null and jsonb_typeof(p_attendance) <> 'object' then raise exception 'Неверные отметки'; end if;
  if p_draft is not null and (jsonb_typeof(p_draft)<>'object' or pg_column_size(p_draft)>1000000) then raise exception 'Слишком большой черновик'; end if;
  if p_source is not null and p_source <> 'transfer' then raise exception 'Неверный источник отметки'; end if;
  -- Формат урока решает сервер: клиент может только заявить перенос прошлого.
  v_source := case
    when p_source = 'transfer' then 'transfer'
    when coalesce(sl.node_type,'lesson') = 'rec' or exists(select 1 from public.lessons l
      where l.id = sl.lesson_id and l.delivery_mode = 'recording') then 'recording'
    else 'live' end;

  insert into public.teacher_lesson_sessions(schedule_id,owner_id,homework_id) values(p_schedule,auth.uid(),
    (select id from public.homework where lesson_id=sl.lesson_id and group_id=sl.group_id and created_by=auth.uid() and status='active' order by created_at desc limit 1))
  on conflict (schedule_id) do nothing;
  select * into st from public.teacher_lesson_sessions where schedule_id=p_schedule for update;
  if not found then raise exception 'Сеанс недоступен'; end if;

  if p_attendance is not null then
    for entry in select * from jsonb_each(p_attendance) loop
      sid := entry.key::uuid;
      if jsonb_typeof(entry.value) not in ('boolean','null') then raise exception 'Неверная отметка'; end if;
      select s.group_id into gid from public.students s where s.id=sid
        and ((sl.group_id is not null and s.group_id=sl.group_id) or (sl.group_id is null and s.id=sl.student_id and s.created_by=auth.uid()));
      if not found then raise exception 'Ученик не относится к этому занятию'; end if;
      select * into old_att from public.lesson_attendance where student_id=sid and lesson_date=sl.date for update;
      -- The legacy journal has one row per student/day. Never overwrite another
      -- lesson's row; this session still retains the exact per-event attendance.
      if found and coalesce(old_att.lesson_title,'') <> sl.lesson_title then
        skipped := skipped + 1;
        continue;
      end if;
      if old_att.grade is not null and entry.value <> 'true'::jsonb then
        raise exception 'У ученика уже есть оценка. Измените её в журнале перед снятием присутствия';
      end if;
      if entry.value='null'::jsonb then
        delete from public.lesson_attendance where student_id=sid and lesson_date=sl.date
          and coalesce(lesson_title,'')=sl.lesson_title and grade is null;
      else
        -- Источник строки фиксируется при создании: правка отметки не возвращает
        -- и не списывает занятие задним числом.
        insert into public.lesson_attendance(student_id,group_id,lesson_date,present,lesson_title,source,schedule_lesson_id)
        values(sid,coalesce(sl.group_id,gid),sl.date,(entry.value#>>'{}')::boolean,sl.lesson_title,v_source,sl.id)
        on conflict (student_id,lesson_date) do update set present=excluded.present,lesson_title=excluded.lesson_title,
          schedule_lesson_id=coalesce(public.lesson_attendance.schedule_lesson_id,excluded.schedule_lesson_id);
      end if;
    end loop;
  end if;

  update public.teacher_lesson_sessions set
    private_note=coalesce(p_note,private_note), attendance=coalesce(p_attendance,attendance),
    homework_draft=coalesce(p_draft,homework_draft),
    started_at=case when p_action='start' then coalesce(started_at,now()) else started_at end,
    completed_at=case when p_action='complete' then coalesce(completed_at,now()) else completed_at end,
    updated_at=now()
  where schedule_id=p_schedule returning * into st;
  if p_action in ('start','complete') then
    update public.schedule_lessons target set status=case when p_action='start' then 'live' else 'completed' end
    where target.id=sl.id or (
      sl.group_id is not null and target.date=sl.date
      and lpad(target.time_start,5,'0')=lpad(sl.time_start,5,'0')
      and target.lesson_title=sl.lesson_title and target.node_type=sl.node_type
      and (target.group_id=sl.group_id or (target.group_id is null and target.student_id in
        (select s.id from public.students s where s.group_id=sl.group_id)))
    );
  end if;
  return to_jsonb(st) || jsonb_build_object('journalSkipped',skipped);
end $$;
revoke all on function public.teacher_lesson_save(uuid,text,text,jsonb,jsonb,text) from public, anon;
grant execute on function public.teacher_lesson_save(uuid,text,text,jsonb,jsonb,text) to authenticated;

CREATE OR REPLACE FUNCTION public.teacher_journal_save(p_schedule uuid, p_entries jsonb, p_source text default null)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  sl public.schedule_lessons;
  entry jsonb;
  sid uuid;
  marks jsonb := '{}'::jsonb;
  previous_marks jsonb;
  grade_value integer;
begin
  if auth.uid() is null then raise exception 'Нужно войти в кабинет'; end if;
  select * into sl from public.schedule_lessons where id=p_schedule for update;
  if not found or not (
    exists(select 1 from public.groups g where g.id=sl.group_id and g.created_by=auth.uid()) or
    exists(select 1 from public.students s where s.id=sl.student_id and s.created_by=auth.uid())
  ) then raise exception 'Это занятие недоступно для изменения'; end if;
  -- The schedule row lock serializes attendance editors for this event.
  select attendance into previous_marks from public.teacher_lesson_sessions where schedule_id=p_schedule;
  if jsonb_typeof(p_entries) is distinct from 'array' then raise exception 'Неверные отметки'; end if;
  for entry in select value from jsonb_array_elements(p_entries) loop
    sid := (entry->>'studentId')::uuid;
    if sid is null or not (entry ? 'present') or jsonb_typeof(entry->'present') not in ('boolean','null')
      or marks ? sid::text then raise exception 'Неверные отметки'; end if;
    if not exists(select 1 from public.students s where s.id=sid and
      ((sl.group_id is not null and s.group_id=sl.group_id) or (sl.group_id is null and s.id=sl.student_id and s.created_by=auth.uid())))
      then raise exception 'Ученик не относится к этому занятию'; end if;
    if entry ? 'grade' then
      if jsonb_typeof(entry->'grade') not in ('number','null') then raise exception 'Неверная оценка'; end if;
      grade_value := (entry->>'grade')::integer;
      if grade_value is not null and (grade_value not between 1 and 5 or entry->'grade' <> to_jsonb(grade_value)
        or entry->'present' <> 'true'::jsonb) then raise exception 'Неверная оценка'; end if;
      -- Explicitly clearing a grade in the journal permits clearing presence.
      if grade_value is null then
        update public.lesson_attendance set grade=null where student_id=sid and lesson_date=sl.date
          and coalesce(lesson_title,'')=sl.lesson_title;
      end if;
    end if;
    marks := marks || jsonb_build_object(sid::text,entry->'present');
  end loop;
  perform public.teacher_lesson_save(p_schedule,'save',null,marks,null,p_source);
  -- teacher_lesson_save accepts a full snapshot; journal editors send a patch.
  update public.teacher_lesson_sessions
    set attendance=coalesce(previous_marks, '{}'::jsonb) || marks
    where schedule_id=p_schedule;
  for entry in select value from jsonb_array_elements(p_entries) loop
    if entry ? 'grade' and entry->'present'='true'::jsonb then
      sid := (entry->>'studentId')::uuid;
      grade_value := (entry->>'grade')::integer;
      if grade_value is not null and exists(select 1 from public.lesson_attendance where student_id=sid
        and lesson_date=sl.date and coalesce(lesson_title,'')<>sl.lesson_title) then
        raise exception 'На эту дату уже есть оценка другого занятия. Посещаемость можно сохранить отдельно без оценки';
      end if;
      update public.lesson_attendance set grade=grade_value where student_id=sid and lesson_date=sl.date
        and coalesce(lesson_title,'')=sl.lesson_title;
    end if;
  end loop;
end $function$
;
revoke all on function public.teacher_journal_save(uuid,jsonb,text) from public, anon;
grant execute on function public.teacher_journal_save(uuid,jsonb,text) to authenticated;

-- ── Зачёт ученику: присутствие засчитывает и урок в записи ────────────────────
create or replace function public.student_lesson_participation(p_student uuid, p_refs text[])
returns table(lesson_ref text, delivery_mode text, attended boolean)
language plpgsql stable security invoker set search_path = '' as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.students s left join public.groups g on g.id=s.group_id
    where s.id=p_student and (s.auth_user_id=auth.uid() or s.created_by=auth.uid()
      or g.created_by=auth.uid() or public.is_admin())
  ) then raise exception 'Посещаемость недоступна'; end if;
  if coalesce(cardinality(p_refs),0)>250 then raise exception 'Слишком много уроков'; end if;
  return query
  with available as materialized (
    select l.*,c.subject as course_subject,
      coalesce(l.lesson_sched_manual and l.rec_date is not null and
        (l.rec_date is distinct from l.scheduled_date or l.rec_time is distinct from l.scheduled_time),false) as split
    from public.lessons l join public.courses c on c.id=l.course_id
    join public.students s on s.id=p_student
    where (s.id=any(c.student_ids) or s.group_id=any(c.group_ids)) and l.kind is distinct from 'test'
  ), nodes as materialized (
    select a.id,a.short_id as base_ref,a.short_id || n.suffix as ref,a.delivery_mode,a.title,a.course_subject,
      a.split,n.kind,
      case when n.day ~ '^\d{4}-\d{2}-\d{2}$' then n.day::date
           when n.day ~ '^\d{2}\.\d{2}\.\d{4}$' then to_date(n.day,'DD.MM.YYYY') end as day,
      nullif(n.tm,'')::time as tm
    from available a cross join lateral (
      select ''::text as suffix,'lesson'::text as kind,a.scheduled_date::text as day,a.scheduled_time::text as tm
      union all select '~rec','rec',a.rec_date::text,a.rec_time::text where a.split
    ) n
  ), candidates as (
    select sl.id,n.ref,n.base_ref,count(*) over(partition by sl.id) as matches
    from public.schedule_lessons sl join public.students s on s.id=p_student
    join nodes n on (not n.split or coalesce(sl.node_type,'lesson')=n.kind)
      and (sl.lesson_id=n.id or (sl.lesson_id is null and sl.lesson_title=n.title
        and sl.subject=n.course_subject and sl.date=n.day and nullif(sl.time_start,'')::time=n.tm))
    where (sl.group_id=s.group_id or sl.student_id=s.id) and sl.status is distinct from 'cancelled'
  ), events as materialized (
    select id,ref from candidates where matches=1 and base_ref=any(p_refs)
  ), batches as (
    select array_agg(id) as ids from (
      select id,(row_number() over(order by id)-1)/500 as batch from events
    ) x group by batch
  ), marks as materialized (
    select m.* from batches b cross join lateral public.student_schedule_attendance(p_student,b.ids) m
  )
  select n.ref,n.delivery_mode,coalesce(bool_or(m.present is true),false)
  from nodes n left join events e on e.ref=n.ref left join marks m on m.schedule_id=e.id
  where n.base_ref=any(p_refs)
  group by n.ref,n.delivery_mode;
end $$;

-- ── «Журнал не заполнен» без записей и тестов ─────────────────────────────────
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
      -- Отметка у записи и теста необязательна: о них журнал не напоминает.
      and coalesce(sl.node_type, 'lesson') <> 'rec'
      and not exists (select 1 from lessons l where l.id = sl.lesson_id
        and (l.delivery_mode = 'recording' or l.kind = 'test'))
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
