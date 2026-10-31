-- Private, event-scoped state for the mobile «Мой день» workflow.
-- No student-readable schedule/lesson column contains a teacher's private note.
begin;

create table if not exists public.teacher_lesson_sessions (
  schedule_id uuid primary key references public.schedule_lessons(id) on delete cascade,
  owner_id uuid not null references auth.users(id),
  started_at timestamptz,
  completed_at timestamptz,
  private_note text not null default '',
  attendance jsonb not null default '{}' check (jsonb_typeof(attendance) = 'object'),
  homework_draft jsonb not null default '{}' check (jsonb_typeof(homework_draft) = 'object'),
  homework_id uuid references public.homework(id) on delete set null,
  updated_at timestamptz not null default now()
);
create index if not exists teacher_lesson_sessions_owner_idx on public.teacher_lesson_sessions(owner_id);
alter table public.teacher_lesson_sessions enable row level security;
revoke all on public.teacher_lesson_sessions from anon;
grant select, insert, update, delete on public.teacher_lesson_sessions to authenticated;
drop policy if exists lesson_session_owner on public.teacher_lesson_sessions;
create policy lesson_session_owner on public.teacher_lesson_sessions for all to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()) and exists (
  select 1 from public.schedule_lessons sl
  where sl.id = schedule_id and (
    exists (select 1 from public.groups g where g.id = sl.group_id and g.created_by = (select auth.uid()))
    or exists (select 1 from public.students s where s.id = sl.student_id and s.created_by = (select auth.uid()))
  )
));

-- Unassigned students also belong to their teacher (the existing policy only
-- covers students with a group). This does not grant other teachers access.
drop policy if exists attendance_independent_owner on public.lesson_attendance;
create policy attendance_independent_owner on public.lesson_attendance for all to authenticated
using (exists (select 1 from public.students s where s.id = student_id and s.created_by = (select auth.uid())))
with check (exists (select 1 from public.students s where s.id = student_id and s.created_by = (select auth.uid())));

drop policy if exists schedule_independent_owner on public.schedule_lessons;
create policy schedule_independent_owner on public.schedule_lessons for all to authenticated
using (group_id is null and exists (select 1 from public.students s where s.id=student_id and s.created_by=(select auth.uid())))
with check (group_id is null and exists (select 1 from public.students s where s.id=student_id and s.created_by=(select auth.uid())));

create or replace function public.teacher_lesson_save(
  p_schedule uuid, p_action text default 'save', p_note text default null,
  p_attendance jsonb default null, p_draft jsonb default null
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  sl public.schedule_lessons;
  st public.teacher_lesson_sessions;
  entry record;
  old_att public.lesson_attendance;
  sid uuid;
  gid uuid;
  skipped integer := 0;
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
        insert into public.lesson_attendance(student_id,group_id,lesson_date,present,lesson_title)
        values(sid,coalesce(sl.group_id,gid),sl.date,(entry.value#>>'{}')::boolean,sl.lesson_title)
        on conflict (student_id,lesson_date) do update set present=excluded.present,lesson_title=excluded.lesson_title;
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
revoke all on function public.teacher_lesson_save(uuid,text,text,jsonb,jsonb) from public, anon;
grant execute on function public.teacher_lesson_save(uuid,text,text,jsonb,jsonb) to authenticated;

-- Publish once under the schedule-row lock. A lost response/retry returns the
-- original assignment rather than creating duplicate homework for the group.
create or replace function public.teacher_lesson_publish(p_schedule uuid, p_due date)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  sl public.schedule_lessons;
  st public.teacher_lesson_sessions;
  hw jsonb;
  tasks jsonb;
  basic jsonb;
  hard jsonb;
  title text;
  gid uuid;
  hid uuid;
  recipients integer;
begin
  if auth.uid() is null then raise exception 'Нужно войти в кабинет'; end if;
  select * into sl from public.schedule_lessons where id=p_schedule for update;
  if not found or not (
    exists(select 1 from public.groups g where g.id=sl.group_id and g.created_by=auth.uid()) or
    exists(select 1 from public.students s where s.id=sl.student_id and s.created_by=auth.uid())
  ) then raise exception 'Это занятие недоступно для изменения'; end if;
  if sl.status='cancelled' then raise exception 'Занятие отменено'; end if;
  if sl.status<>'completed' then raise exception 'Сначала завершите занятие'; end if;
  insert into public.teacher_lesson_sessions(schedule_id,owner_id) values(p_schedule,auth.uid()) on conflict do nothing;
  select * into st from public.teacher_lesson_sessions where schedule_id=p_schedule for update;
  if st.homework_id is not null then return jsonb_build_object('homeworkId',st.homework_id,'alreadyPublished',true); end if;
  -- Existing course homework is already visible; don't manufacture a duplicate.
  select id into hid from public.homework where lesson_id=sl.lesson_id and group_id=sl.group_id
    and created_by=auth.uid() and status='active' order by created_at desc limit 1;
  if hid is not null then
    update public.teacher_lesson_sessions set homework_id=hid,updated_at=now() where schedule_id=p_schedule;
    return jsonb_build_object('homeworkId',hid,'alreadyPublished',true);
  end if;
  gid := sl.group_id;
  if gid is null then
    select s.group_id into gid from public.students s join public.groups g on g.id=s.group_id
      where s.id=sl.student_id and s.created_by=auth.uid() and g.is_individual and g.created_by=auth.uid();
  end if;
  if gid is null then raise exception 'Для выдачи ДЗ назначьте ученику индивидуальное направление'; end if;
  if p_due is null or p_due < (now() at time zone 'Europe/Moscow')::date then raise exception 'Выберите срок не раньше сегодняшнего дня'; end if;
  select count(*) into recipients from public.students where group_id=gid;
  if recipients=0 then raise exception 'В группе пока нет учеников'; end if;
  hw := st.homework_draft;
  tasks := hw->'tasks';
  if tasks is null then
    select case when sl.node_type='rec' then l.homework->'recHwTasks' else l.homework->'hwTasks' end
      into tasks from public.lessons l where l.id=sl.lesson_id;
  end if;
  if jsonb_typeof(tasks)<>'array' or coalesce(jsonb_array_length(tasks),0)=0 then raise exception 'Добавьте хотя бы одно задание'; end if;
  if jsonb_array_length(tasks)>80 then raise exception 'В домашней работе может быть не больше 80 заданий'; end if;
  if exists(select 1 from jsonb_array_elements(tasks) t where jsonb_typeof(t)<>'object' or length(trim(coalesce(t->>'question','')))=0) then raise exception 'Заполните текст каждого задания'; end if;
  select coalesce(jsonb_agg(t),'[]') into basic from jsonb_array_elements(tasks) t where coalesce(t->>'isHard','false')<>'true';
  select coalesce(jsonb_agg(jsonb_build_object('key','c'||coalesce(t->>'id',md5(t::text)), 'source','custom',
    'statement',t->>'question','answer',t->>'answer','image',t->'image')),'[]') into hard
    from jsonb_array_elements(tasks) t where t->>'isHard'='true';
  title := coalesce(nullif(trim(hw->>'title'),''),nullif(sl.lesson_title,''),'Домашняя работа');
  insert into public.homework(group_id,title,due_date,status,assigned_at,total_students,created_by,
    task_ids,basic_tasks,hard_tasks,hard_task_ids,hard_total)
  values(gid,title,p_due,'active',(now() at time zone 'Europe/Moscow')::date,recipients,auth.uid(),
    '[]',basic,hard,'[]',jsonb_array_length(hard)) returning id into hid;
  update public.teacher_lesson_sessions set homework_id=hid,updated_at=now() where schedule_id=p_schedule;
  return jsonb_build_object('homeworkId',hid,'alreadyPublished',false,'recipients',recipients);
end $$;
revoke all on function public.teacher_lesson_publish(uuid,date) from public, anon;
grant execute on function public.teacher_lesson_publish(uuid,date) to authenticated;

commit;
