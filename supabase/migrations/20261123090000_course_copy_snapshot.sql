-- All source reads share one statement snapshot, including chapter variants and visibility.
-- Keep the existing private execution boundary for admin, teacher and invite wrappers.
create or replace function public.duplicate_course(p_course_id uuid, p_new_owner uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare
  cid uuid := gen_random_uuid();
  cref text := replace(cid::text, '-', '');
begin
  with copied_course as (
    insert into public.courses
      (id, short_id, created_by, kind, title, subject, level, description, status, color, bg, number_start, group_ids, student_ids)
    select cid, cref, p_new_owner, kind, title, subject, level, description, 'draft', color, bg, number_start, '{}', '{}'
    from public.courses where id=p_course_id returning id
  ), module_map as materialized (
    select m.*, gen_random_uuid() as copy_id from public.course_modules m where course_id=p_course_id
  ), copied_modules as (
    insert into public.course_modules(id, course_id, label, position)
    select m.copy_id,c.id,m.label,m.position from module_map m cross join copied_course c returning id
  ), lesson_map as materialized (
    select l.*, cref || '-' || (row_number() over(order by l.position nulls last,l.id)-1)::text as copy_ref
    from public.lessons l where l.course_id=p_course_id
  ), copied_lessons as (
    insert into public.lessons(course_id,module_id,short_id,title,position,lesson_number,kind,shape,
      trainer_id,widget_id,test_tasks,content,youtube_url,description,timecodes,chapter_variants,homework,materials,
      scheduled_date,scheduled_time,scheduled_duration,rec_date,rec_time,rec_duration,lesson_sched_manual,delivery_mode)
    select c.id, cm.id,l.copy_ref,l.title,l.position,l.lesson_number,l.kind,l.shape,
      l.trainer_id,l.widget_id,l.test_tasks,
      case when jsonb_typeof(l.content->'paragraphs')='array' then jsonb_set(l.content,'{paragraphs}',coalesce((
        select jsonb_agg(case when p.elem->>'id'=l.short_id || '-p' || p.idx::text
          then jsonb_set(p.elem,'{id}',to_jsonb(l.copy_ref || '-p' || p.idx::text)) else p.elem end order by p.idx)
        from jsonb_array_elements(l.content->'paragraphs') with ordinality p(elem,idx)
      ),'[]'::jsonb)) else l.content end,
      l.youtube_url,l.description,l.timecodes,l.chapter_variants,l.homework,l.materials,
      l.scheduled_date,l.scheduled_time,l.scheduled_duration,l.rec_date,l.rec_time,l.rec_duration,l.lesson_sched_manual,l.delivery_mode
    from lesson_map l cross join copied_course c left join module_map m on m.id=l.module_id
    left join copied_modules cm on cm.id=m.copy_id returning short_id
  ), copied_flags as (
    insert into public.course_item_visibility(course_id,item_kind,item_key,hidden)
    select c.id,v.item_kind,coalesce(m.copy_id::text,l.copy_ref),v.hidden
    from public.course_item_visibility v cross join copied_course c
    left join module_map m on v.item_kind='module' and v.item_key=m.id::text
    left join lesson_map l on v.item_kind='lesson' and v.item_key=l.short_id
    where v.course_id=p_course_id and coalesce(m.copy_id::text,l.copy_ref) is not null
  ) select id into cid from copied_course;
  if cid is null then raise exception 'course % not found',p_course_id; end if;
  return cid;
end;
$$;
revoke all on function public.duplicate_course(uuid,uuid) from public,anon,authenticated;

-- One receipt per explicit copy action. The copy and its receipt commit together.
create table public.course_copy_receipts (
  actor_id uuid not null,
  request_id uuid not null,
  source_id uuid not null,
  target_owner uuid not null,
  copied_id uuid,
  primary key(actor_id,request_id)
);
alter table public.course_copy_receipts enable row level security;
revoke all on public.course_copy_receipts from public,anon,authenticated;

create function public.request_course_copy(p_source text, p_target_owner uuid, p_title text, p_request_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare
  actor uuid := auth.uid();
  target uuid := coalesce(p_target_owner,actor);
  src uuid;
  receipt public.course_copy_receipts%rowtype;
begin
  if actor is null or p_request_id is null or not coalesce(public.mfa_ok(),false) then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  if p_target_owner is not null then
    if not coalesce(public.is_admin(),false) then raise exception 'Admin required' using errcode='42501'; end if;
    select id into src from public.courses where id=p_source::uuid;
  else
    if not coalesce(public.is_staff(),false) then raise exception 'Teacher required' using errcode='42501'; end if;
    select c.id into src from public.courses c where c.short_id=p_source
      and (c.created_by=actor or public.is_admin() or c.id=any(public.my_course_ids()));
  end if;
  if src is null then raise exception 'Course unavailable' using errcode='42501'; end if;

  insert into public.course_copy_receipts(actor_id,request_id,source_id,target_owner)
    values(actor,p_request_id,src,target) on conflict do nothing;
  select * into strict receipt from public.course_copy_receipts where actor_id=actor and request_id=p_request_id for update;
  if receipt.source_id<>src or receipt.target_owner<>target then raise exception 'Copy request mismatch'; end if;
  if receipt.copied_id is null then
    receipt.copied_id := public.duplicate_course(src,target);
    if p_title is not null then update public.courses set title=p_title where id=receipt.copied_id; end if;
    update public.course_copy_receipts set copied_id=receipt.copied_id where actor_id=actor and request_id=p_request_id;
  end if;
  return receipt.copied_id;
end;
$$;
revoke all on function public.request_course_copy(text,uuid,text,uuid) from public,anon;
grant execute on function public.request_course_copy(text,uuid,text,uuid) to authenticated;
