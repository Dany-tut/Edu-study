-- The copy, audience, calendar and retry receipt commit in the same transaction.
create table public.course_handout_receipts (
  actor_id uuid not null,
  request_id uuid not null,
  intent_hash text not null,
  course_id uuid not null,
  primary key(actor_id,request_id)
);
alter table public.course_handout_receipts enable row level security;
revoke all on public.course_handout_receipts from public, anon, authenticated;
grant select,insert on public.course_handout_receipts to authenticated;
create policy teacher_handout_receipt_read on public.course_handout_receipts for select to authenticated
  using(actor_id=(select auth.uid()) and (select public.mfa_ok()));
create policy teacher_handout_receipt_write on public.course_handout_receipts for insert to authenticated
  with check(actor_id=(select auth.uid()) and (select public.mfa_ok())
    and exists(select 1 from public.courses c where c.id=course_id and c.created_by=(select auth.uid())));

create function public.course_handout_date(value text) returns date
language plpgsql immutable strict security invoker set search_path='' as $$
begin
  if value ~ '^[0-9]{2}\.[0-9]{2}\.[0-9]{4}$' then
    return make_date(substr(value,7,4)::int,substr(value,4,2)::int,substr(value,1,2)::int);
  elsif value ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    return make_date(substr(value,1,4)::int,substr(value,6,2)::int,substr(value,9,2)::int);
  end if;
  return null;
exception when datetime_field_overflow then return null;
end;
$$;

create function public.course_handout_shift(value text, days integer) returns text
language sql stable strict security invoker set search_path='' as $$
  select coalesce(to_char(public.course_handout_date(value)+days,
    case when value like '%-%' then 'YYYY-MM-DD' else 'DD.MM.YYYY' end),value)
$$;

create function public.course_handout_homework(hw jsonb, days integer) returns jsonb
language plpgsql stable strict security invoker set search_path='' as $$
declare k text; shifted jsonb;
begin
  if jsonb_typeof(hw) <> 'object' or days=0 then return hw; end if;
  foreach k in array array['hwDate','recHwDate'] loop
    if jsonb_typeof(hw->k)='string' then
      hw:=jsonb_set(hw,array[k],to_jsonb(public.course_handout_shift(hw->>k,days)));
    end if;
  end loop;
  if jsonb_typeof(hw->'extraHw')='array' then
    select coalesce(jsonb_agg(case when jsonb_typeof(x->'date')='string'
      then jsonb_set(x,'{date}',to_jsonb(public.course_handout_shift(x->>'date',days))) else x end order by n),'[]')
    into shifted from jsonb_array_elements(hw->'extraHw') with ordinality a(x,n);
    hw:=jsonb_set(hw,'{extraHw}',shifted);
  end if;
  return hw;
end;
$$;

create function public.hand_out_course_to_group(
  p_request_id uuid, p_source text, p_group uuid, p_title text, p_start date,
  p_stamp timestamptz, p_modules jsonb, p_lesson_refs text[]
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  actor uuid := auth.uid();
  src public.courses%rowtype;
  target public.courses%rowtype;
  signature text := md5(jsonb_build_array(p_source,p_group,p_title,p_start)::text);
  receipt public.course_handout_receipts%rowtype;
  modules jsonb;
  lesson_refs text[];
  stamp timestamptz;
  day_delta integer;
  slots jsonb;
begin
  if actor is null or not coalesce(public.is_staff(),false) or not coalesce(public.mfa_ok(),false) then
    raise insufficient_privilege using message='Teacher session required';
  end if;
  if p_request_id is null or p_group is null or nullif(btrim(p_title),'') is null then
    raise invalid_parameter_value using message='Incomplete group handout';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text||p_request_id::text,0));
  select * into receipt from public.course_handout_receipts where actor_id=actor and request_id=p_request_id;
  if found then
    if receipt.intent_hash is distinct from signature then
      raise invalid_parameter_value using message='Group handout request mismatch';
    end if;
    select * into target from public.courses where id=receipt.course_id and created_by=actor;
    if not found then raise no_data_found using message='The previous handout is no longer available'; end if;
  else
    select * into src from public.courses where short_id=p_source and created_by=actor for update;
    if not found or not exists(select 1 from public.groups where id=p_group and created_by=actor) then
      raise insufficient_privilege using message='Course or group unavailable';
    end if;
    if p_group=any(src.group_ids) then raise invalid_parameter_value using message='Group already assigned to source'; end if;
    select coalesce(jsonb_agg(to_jsonb(m) order by m.id),'[]') into modules from (
      select id,label,position from public.course_modules where course_id=src.id order by id for share
    ) m;
    select greatest(src.updated_at,max(l.updated_at)),coalesce(array_agg(l.short_id order by l.short_id),'{}') into stamp,lesson_refs from (
      select updated_at,short_id from public.lessons where course_id=src.id order by id for share
    ) l;
    if stamp is distinct from p_stamp or p_stamp is null or p_lesson_refs is null
      or lesson_refs is distinct from array(select ref from unnest(p_lesson_refs) ref order by ref)
      or p_modules is null or modules is distinct from (
      select coalesce(jsonb_agg(value order by value->>'id'),'[]') from jsonb_array_elements(p_modules)
    ) then raise exception using errcode='PT409',message='Source course changed'; end if;
    select c0.id,c0.short_id into strict target.id,target.short_id
      from public.duplicate_my_course(p_source,p_title) c0;
    if p_start is not null then
      select p_start-min(d) into day_delta from public.lessons l cross join lateral (values
        (public.course_handout_date(l.scheduled_date)),(public.course_handout_date(l.rec_date))) a(d)
        where l.course_id=target.id;
      if day_delta<>0 then
        update public.lessons set scheduled_date=public.course_handout_shift(scheduled_date,day_delta),
          rec_date=public.course_handout_shift(rec_date,day_delta),homework=public.course_handout_homework(homework,day_delta)
        where course_id=target.id;
      end if;
    end if;
    perform public.save_course_access_changes(target.id,jsonb_build_object('groups',jsonb_build_object(p_group::text,true)));
    select coalesce(jsonb_agg(jsonb_build_object('group_id',p_group,'lesson_id',l.id,
      'node_type',e.kind,'date',public.course_handout_date(e.day),'time_start',e.tm,
      'time_end',case when e.kind='rec' or l.delivery_mode='recording' then e.tm else
        to_char(e.tm::time+make_interval(mins=>coalesce(l.scheduled_duration,90)),'HH24:MI') end,
      'subject',src.subject,'lesson_title',l.title,'lesson_number',coalesce(l.lesson_number,l.position))),'[]')
    into slots from public.lessons l cross join lateral (values
      ('lesson',l.scheduled_date,l.scheduled_time),('rec',l.rec_date,l.rec_time)) e(kind,day,tm)
    where l.course_id=target.id and nullif(e.day,'') is not null and nullif(e.tm,'') is not null
      and (e.kind='lesson' or (l.rec_date,l.rec_time) is distinct from (l.scheduled_date,l.scheduled_time));
    if slots<>'[]'::jsonb then perform public.save_course_schedule(target.id,'[]',slots,'{}'); end if;
    update public.courses set status=src.status
      where id=target.id and created_by=actor returning * into strict target;
    insert into public.course_handout_receipts(actor_id,request_id,intent_hash,course_id) values(actor,p_request_id,signature,target.id);
  end if;
  return jsonb_build_object('request_id',p_request_id,'id',target.id,'short_id',target.short_id);
end;
$$;
revoke all on function public.course_handout_date(text),public.course_handout_shift(text,integer),
  public.course_handout_homework(jsonb,integer),public.hand_out_course_to_group(uuid,text,uuid,text,date,timestamptz,jsonb,text[]) from public,anon;
grant execute on function public.course_handout_date(text),public.course_handout_shift(text,integer),
  public.course_handout_homework(jsonb,integer),public.hand_out_course_to_group(uuid,text,uuid,text,date,timestamptz,jsonb,text[]) to authenticated;
