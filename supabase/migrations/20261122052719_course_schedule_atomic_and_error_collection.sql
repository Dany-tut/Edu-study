-- Existing open tabs also benefit: their batched upsert checks uniqueness at commit.
-- Keep the same uniqueness rule; validate it at the end of a calendar rewrite,
-- so moving A into B's OLD date does not fail before B moves out of the way.
alter table public.schedule_lessons
  drop constraint schedule_lessons_group_id_date_time_start_key,
  add constraint schedule_lessons_group_id_date_time_start_key
    unique(group_id,date,time_start) deferrable initially deferred;

create function public.save_course_schedule(
  p_course_id uuid, p_update jsonb, p_insert jsonb, p_remove uuid[]
) returns void language plpgsql security invoker set search_path = '' as $$
declare row_count_expected integer; row_count_actual integer; conflict_row record;
begin
  if auth.uid() is null then raise insufficient_privilege using message='forbidden'; end if;
  -- Serialize this course; invoker RLS remains in effect for every table access.
  perform 1 from public.courses where id=p_course_id and created_by=auth.uid() for update;
  if not found then raise insufficient_privilege using message='forbidden'; end if;
  if jsonb_typeof(p_update) is distinct from 'array' or jsonb_typeof(p_insert) is distinct from 'array'
    or p_remove is null then raise invalid_parameter_value using message='invalid schedule plan'; end if;
  -- Do not accept another course's lesson or schedule id, even if the teacher
  -- owns both courses. A mismatched/stale plan must fail, never partially apply.
  if exists (
    select 1 from jsonb_populate_recordset(null::public.schedule_lessons,p_update||p_insert) r
    left join public.lessons l on l.id=r.lesson_id and l.course_id=p_course_id
    where l.id is null or (r.group_id is null)=(r.student_id is null)
      or r.node_type not in ('lesson','rec') or r.node_type is null
      or (r.group_id is not null and not exists(select 1 from public.groups g where g.id=r.group_id and g.created_by=auth.uid()))
      or (r.student_id is not null and not exists(select 1 from public.students st left join public.groups g on g.id=st.group_id where st.id=r.student_id and (st.created_by=auth.uid() or g.created_by=auth.uid())))
      or r.date is null or r.time_start is null or r.time_end is null
  ) or exists (
    select 1 from jsonb_populate_recordset(null::public.schedule_lessons,p_update) r
    left join public.schedule_lessons s on s.id=r.id
    where s.id is null or s.lesson_id<>r.lesson_id or s.lesson_id is null
      or s.group_id is distinct from r.group_id or s.student_id is distinct from r.student_id
      or coalesce(s.node_type,'lesson')<>r.node_type
  ) or exists (
    select 1 from unnest(p_remove) r(id)
    left join public.schedule_lessons s on s.id=r.id
    left join public.lessons l on l.id=s.lesson_id and l.course_id=p_course_id
    where l.id is null
  ) then raise insufficient_privilege using message='invalid course schedule scope'; end if;
  if exists(select 1 from jsonb_populate_recordset(null::public.schedule_lessons,p_insert) r where r.id is not null)
    or exists(select 1 from jsonb_populate_recordset(null::public.schedule_lessons,p_update) r group by r.id having count(*)>1)
    or exists(select 1 from jsonb_populate_recordset(null::public.schedule_lessons,p_update) r where r.id=any(p_remove)) then
    raise invalid_parameter_value using message='invalid schedule ids';
  end if;
  set constraints public.schedule_lessons_group_id_date_time_start_key deferred;
  -- Historical events and journal owners are never cascade-deleted by a save.
  delete from public.schedule_lessons s where s.id=any(p_remove) and s.status='upcoming'
    and not exists(select 1 from public.teacher_lesson_sessions j where j.schedule_id=s.id);
  update public.schedule_lessons s set
    date=r.date,time_start=r.time_start,time_end=r.time_end,subject=r.subject,
    lesson_title=r.lesson_title,lesson_number=r.lesson_number
  from jsonb_populate_recordset(null::public.schedule_lessons,p_update) r where s.id=r.id;
  get diagnostics row_count_actual=row_count;
  row_count_expected:=jsonb_array_length(p_update);
  if row_count_actual<>row_count_expected then raise insufficient_privilege using message='schedule update denied'; end if;
  insert into public.schedule_lessons(lesson_id,group_id,student_id,node_type,date,time_start,time_end,subject,lesson_title,lesson_number,status)
    select lesson_id,group_id,student_id,node_type,date,time_start,time_end,subject,lesson_title,lesson_number,'upcoming'
    from jsonb_populate_recordset(null::public.schedule_lessons,p_insert);
  -- Return safe structured context in MESSAGE too: hosted Postgres can hide
  -- DETAIL on unique violations. Do not depend on parsing provider error text.
  select s.group_id,s.date,s.time_start into conflict_row from public.schedule_lessons s
    where s.group_id is not null and exists(select 1 from public.lessons l where l.id=s.lesson_id and l.course_id=p_course_id)
    and exists(select 1 from public.schedule_lessons other where other.id<>s.id
      and other.group_id=s.group_id and other.date=s.date and other.time_start=s.time_start)
    limit 1;
  if found then raise exception using errcode='23505',
    message='ISKRA_SCHEDULE_CONFLICT:'||jsonb_build_object('groupId',conflict_row.group_id,'date',conflict_row.date,'time',conflict_row.time_start)::text;
  end if;
  set constraints public.schedule_lessons_group_id_date_time_start_key immediate;
end;
$$;
revoke all on function public.save_course_schedule(uuid,jsonb,jsonb,uuid[]) from public,anon;
grant execute on function public.save_course_schedule(uuid,jsonb,jsonb,uuid[]) to authenticated;

-- Existing admin UI contract, with technical context instead of an empty src.
create or replace function public.admin_recent_errors(p_limit integer default 50)
returns table(created_at timestamptz,role text,path text,event text,msg text,src text,line integer,session_id text)
language plpgsql security definer set search_path = 'public' as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query select ae.created_at,ae.role,ae.path,ae.event,
    coalesce(ae.meta->>'msg',ae.meta->>'message',ae.meta->>'outcome',ae.event),
    coalesce(ae.meta->>'src',ae.meta->>'ctx',ae.meta->>'endpoint'),
    case when ae.meta->>'line' ~ '^[0-9]{1,8}$' then (ae.meta->>'line')::int end,ae.session_id
  from public.analytics_events ae
  where (ae.event in ('js_error','promise_rejection','rage_click','db_error','operation_failed','react_crash','widget_crash','native_crash','bootstrap_error','api_stalled','auth_failed','auth_stalled','resource_error','ui_blank','ui_loading_stalled')
    or (ae.event='api_request' and (ae.meta->>'status'='0' or ae.meta->>'status' ~ '^[45][0-9][0-9]$')))
    and public.analytics_is_real_traffic(ae.meta)
  order by ae.created_at desc limit greatest(1,least(p_limit,500));
end;
$$;
revoke all on function public.admin_recent_errors(integer) from public,anon;
grant execute on function public.admin_recent_errors(integer) to authenticated;
