-- A student belongs to a teacher independently of their lesson assignments.
begin;
set local lock_timeout = '10s';
set local statement_timeout = '90s';
alter table public.students add column created_by uuid references auth.users(id);
update public.students s set created_by = g.created_by from public.groups g where g.id = s.group_id;
alter table public.students alter column group_id drop not null;
-- Removing a teaching group must not delete the human's profile/account.
do $$ declare c record; begin
  for c in select conname from pg_constraint where conrelid='public.students'::regclass
    and confrelid='public.groups'::regclass and contype='f'
    and conkey = array[(select attnum from pg_attribute where attrelid='public.students'::regclass and attname='group_id')]
  loop execute format('alter table public.students drop constraint %I', c.conname); end loop;
end $$;
alter table public.students add constraint students_group_id_fkey foreign key(group_id) references public.groups(id) on delete set null;
alter table public.students alter column created_by set default auth.uid();
create index students_created_by_idx on public.students(created_by);

-- Derive ownership for old clients, and forbid moving a student to another teacher.
create function public.set_student_owner() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  if new.group_id is not null then
    select created_by into owner from public.groups where id = new.group_id;
    if owner is null then raise exception 'Group has no owner'; end if;
    if new.created_by is not null and new.created_by <> owner and not public.is_admin() then raise exception 'Student and group owners differ'; end if;
    new.created_by := owner;
  end if;
  if new.created_by is null then raise exception 'Student requires an owner'; end if;
  if not public.is_admin() and pg_trigger_depth() <= 1 and (tg_op = 'INSERT' or old.person_id is distinct from new.person_id)
    and exists(select 1 from public.students s where s.person_id = new.person_id and s.created_by <> new.created_by) then raise exception 'Person belongs to another teacher'; end if;
  if tg_op = 'UPDATE' and old.created_by is distinct from new.created_by and not public.is_admin() and pg_trigger_depth() <= 1 then raise exception 'Student owner cannot change'; end if;
  return new;
end $$;
revoke all on function public.set_student_owner() from public, anon, authenticated;
create trigger students_00_owner before insert or update on public.students for each row execute function public.set_student_owner();

-- Existing group-transfer RPCs keep student ownership in sync in one transaction.
create function public.sync_group_student_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.students set created_by = new.created_by where group_id = new.id;
  return new;
end $$;
revoke all on function public.sync_group_student_owner() from public, anon, authenticated;
create trigger groups_sync_student_owner after update of created_by on public.groups
for each row when (old.created_by is distinct from new.created_by) execute function public.sync_group_student_owner();

drop policy if exists teacher_read_students on public.students;
drop policy if exists teacher_write_students on public.students;
create policy teacher_read_students on public.students for select to authenticated
using ((select is_admin()) or created_by = (select auth.uid()));
create policy teacher_write_students on public.students for all to authenticated
using ((select is_admin()) or created_by = (select auth.uid())) with check ((select is_admin()) or created_by = (select auth.uid()));

create or replace function public.enforce_student_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_max integer; v_used bigint;
begin
  -- Serialize concurrent new-person inserts for one teacher.
  perform pg_advisory_xact_lock(hashtextextended(new.created_by::text, 0));
  if exists(select 1 from public.students s where s.created_by = new.created_by and s.person_id = new.person_id) then return new; end if;
  select p.max_students into v_max from public.teacher_subscriptions sub join public.plans p on p.code = sub.plan_code
  where sub.teacher_id = new.created_by and sub.status = 'active' and (sub.expires_at is null or sub.expires_at > now());
  if v_max is null then return new; end if;
  select count(distinct coalesce(person_id,id)) into v_used from public.students where created_by = new.created_by;
  if v_used >= v_max then raise exception 'STUDENT_LIMIT:%', v_max; end if;
  return new;
end $$;

create or replace function public.my_plan()
returns table(plan_code text, plan_name text, price_rub integer, max_students integer,
expires_at timestamptz, status text, students_used bigint)
language sql stable security definer set search_path = public as $$
select s.plan_code,p.name,p.price_rub,p.max_students,s.expires_at,s.status,
(select count(distinct coalesce(st.person_id,st.id)) from public.students st where st.created_by = auth.uid())
from public.teacher_subscriptions s join public.plans p on p.code=s.plan_code where s.teacher_id=auth.uid();
$$;

create or replace function public._schedule_owner(p_group uuid,p_student uuid)
returns uuid language sql stable security definer set search_path = public as $$
select coalesce((select created_by from public.groups where id=p_group),(select created_by from public.students where id=p_student));
$$;
-- Direct assignments must remain readable before a group is chosen.
create policy teacher_owned_student_progress on public.lesson_progress for all to authenticated
using (exists(select 1 from public.students s where s.id=student_id and s.created_by=(select auth.uid())))
with check (exists(select 1 from public.students s where s.id=student_id and s.created_by=(select auth.uid())));
create policy teacher_owned_student_schedule on public.schedule_lessons for select to authenticated
using (exists(select 1 from public.students s where s.id=student_id and s.created_by=(select auth.uid())));
create or replace function public.can_read_avatar(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
select (storage.foldername(p_name))[1] = auth.uid()::text or public.is_admin()
or exists(select 1 from public.students s where s.auth_user_id::text = (storage.foldername(p_name))[1] and s.created_by = auth.uid());
$$;
revoke all on function public.can_read_avatar(text) from public, anon;
grant execute on function public.can_read_avatar(text) to authenticated;

-- Standalone students use their owner for notifications and attachment access.
CREATE OR REPLACE FUNCTION "public"."notify_on_student_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_teacher uuid;
  v_group   text;
begin
  select coalesce(g.created_by, public.primary_teacher_id()), g.name
    into v_teacher, v_group
  from public.groups g where g.id = NEW.group_id;
  v_teacher := NEW.created_by;
  if v_teacher is not null then
    insert into public.notifications(recipient_id, recipient_role, type, title, body, link)
    values (v_teacher, 'teacher', 'student_joined',
            'Новый ученик',
            coalesce(NEW.name,'Ученик') || coalesce(' · ' || v_group, '') || '.',
            jsonb_build_object('page','teacher/groups','studentId',NEW.id));
  end if;
  return NEW;
end;
$$;



CREATE OR REPLACE FUNCTION "public"."notify_on_payment_due"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_teacher uuid;
  v_overdue boolean;
  v_amount  text;
begin
  if NEW.payment_due is null then return NEW; end if;
  if TG_OP = 'UPDATE' and OLD.payment_due is not distinct from NEW.payment_due then
    return NEW;
  end if;
  if NEW.payment_due > current_date + 7 then return NEW; end if;

  select coalesce(g.created_by, public.primary_teacher_id())
    into v_teacher
  from public.groups g where g.id = NEW.group_id;
  v_teacher := NEW.created_by;
  if v_teacher is null then return NEW; end if;

  v_overdue := NEW.payment_due < current_date;
  v_amount  := case when coalesce(NEW.payment_amount,0) > 0
                    then ' · ' || NEW.payment_amount || ' ₽' else '' end;

  insert into public.notifications(recipient_id, recipient_role, type, title, body, link)
  values (v_teacher, 'teacher', 'payment_due',
          case when v_overdue then 'Оплата просрочена' else 'Скоро оплата' end,
          coalesce(NEW.name,'Ученик') || ' · до ' || to_char(NEW.payment_due,'DD.MM') || v_amount || '.',
          jsonb_build_object('page','teacher/groups','studentId',NEW.id));
  return NEW;
end;
$$;



CREATE OR REPLACE FUNCTION "private"."can_read_homework_photo"("p_name" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select (select auth.uid()) is not null and (
    (storage.foldername(p_name))[1] = (select auth.uid())::text
    or public.is_admin()
    or exists (
      select 1 from public.students s
      where s.id::text = (storage.foldername(p_name))[2]
        and s.auth_user_id::text = (storage.foldername(p_name))[1]
        and s.created_by = (select auth.uid())
    )
  );
$$;



commit;
