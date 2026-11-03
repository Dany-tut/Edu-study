-- Forward-only hardening. Existing role assignments and historical credentials
-- are not rewritten here; review/cleanup is a separate staged operation.

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  fn text := nullif(trim(new.raw_user_meta_data->>'first_name'), '');
  ln text := nullif(trim(new.raw_user_meta_data->>'last_name'), '');
  full_name text := coalesce(
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(trim(concat_ws(' ', fn, ln)), ''),
    split_part(new.email, '@', 1));
begin
  insert into public.profiles (id, role, name, first_name, last_name, subject, username)
  values (new.id,
    case when new.raw_app_meta_data->>'role' in ('teacher', 'admin')
      then 'teacher' else 'student' end,
    full_name, fn, ln,
    nullif(trim(new.raw_user_meta_data->>'subject'), ''),
    public.gen_username(coalesce(nullif(split_part(new.email, '@', 1), ''), full_name)));
  return new;
end; $function$;
-- The historical snapshot assumed this Auth trigger already existed.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.guard_profile_access_cols()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if (new.hidden_tabs is distinct from old.hidden_tabs
      or new.hidden_widgets is distinct from old.hidden_widgets)
     and current_user in ('anon', 'authenticated')
     and not public.is_admin() then
    raise exception 'Only an admin can change access settings';
  end if;
  -- Проверка — только для запросов с сайта (anon/authenticated). Служебные
  -- роли (миграции, service_role) пользователя не несут и пропускаются.
  if new.subjects is distinct from old.subjects
     and current_user in ('anon', 'authenticated')
     and not public.is_admin()
     and new.id is distinct from auth.uid() then
    raise exception 'Only the teacher or an admin can change subjects';
  end if;
  return new;
end;
$$;


create or replace function public.guard_profile_role()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('postgres', 'supabase_admin', 'service_role') then
    if TG_OP = 'INSERT' then
      if new.role is distinct from 'student' then raise exception 'Role is server-managed'; end if;
    elsif new.role is distinct from old.role or new.id is distinct from old.id then
      raise exception 'Role and account identity are server-managed';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_profile_role() from public;
create trigger trg_guard_profile_role before insert or update on public.profiles
for each row execute function public.guard_profile_role();

create or replace function public.apply_teacher_invite(p_token uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  inv public.teacher_invites%rowtype;
  me uuid := auth.uid();
  a jsonb;
begin
  if me is null then raise exception 'not authenticated'; end if;
  select * into inv from public.teacher_invites where token = p_token for update;
  if not found then raise exception 'invalid invite token'; end if;
  if inv.consumed_at is not null then
    if inv.consumed_by = me then return; end if;
    raise exception 'invite already used';
  end if;
  if inv.expires_at <= now() then raise exception 'invite expired'; end if;
  if inv.email is not null and lower(btrim(inv.email)) is distinct from
     (select lower(u.email) from auth.users u where u.id = me) then
    raise exception 'invite email mismatch';
  end if;

  -- 1. Access deny-lists + subject scope.
  update public.profiles
     set role = case when role = 'admin' then 'admin' else 'teacher' end,
         hidden_tabs = inv.hidden_tabs,
         hidden_widgets = inv.hidden_widgets,
         subjects = inv.subjects,
         updated_at = now()
   where id = me;

  -- 2. Courses: copy (independent draft) or share (read-only visibility).
  for a in select * from jsonb_array_elements(inv.course_assignments) loop
    if a ->> 'mode' = 'copy' then
      perform public.duplicate_course((a ->> 'course_id')::uuid, me);
    else
      insert into public.course_shares (course_id, teacher_id)
      values ((a ->> 'course_id')::uuid, me)
      on conflict do nothing;
    end if;
  end loop;

  -- 3. Groups: transfer ownership.
  update public.groups set created_by = me where id = any(inv.group_ids);

  update public.teacher_invites
     set consumed_at = now(), consumed_by = me
   where token = p_token;
end;
$$;

revoke all on function public.apply_teacher_invite(uuid) from public, anon;
grant execute on function public.apply_teacher_invite(uuid) to authenticated;

create or replace function public.claim_student_account(
  p_token uuid, p_email text
)
returns table(student_id uuid, group_id uuid)
language plpgsql security definer
set search_path to 'public'
as $$
declare
  me uuid := auth.uid();
  v_self public.students%rowtype;
  r record;
begin
  if me is null then raise exception 'not authenticated'; end if;

  if not exists (select 1 from public.profiles p where p.id = me and p.role = 'student')
    or exists (select 1 from auth.users u where u.id = me
      and u.raw_app_meta_data->>'role' in ('teacher', 'admin')) then
    raise exception 'student account required';
  end if;
  select * into v_self from public.students s where s.invite_token = p_token;
  -- Serialize claims across sibling invitations, then re-read under row lock.
  perform pg_advisory_xact_lock(hashtextextended(coalesce(v_self.person_id, v_self.id)::text, 0));
  select * into v_self from public.students s where s.invite_token = p_token for update;
  if v_self.id is null then raise exception 'invalid invite token'; end if;
  -- Уже занят другим аккаунтом — блок; свой же токен → идемпотентный повтор.
  if v_self.auth_user_id is not null and v_self.auth_user_id <> me then
    raise exception 'invite already used';
  end if;

  -- Never trust a client-supplied email as account identity.
  select u.email into p_email from auth.users u where u.id = me;
  if p_email is null then raise exception 'account email required'; end if;
  if exists (select 1 from public.students s where s.person_id = v_self.person_id
    and s.created_by is not distinct from v_self.created_by
    and s.auth_user_id is not null and s.auth_user_id <> me) then
    raise exception 'person already linked';
  end if;
  update public.students s
     set email = p_email, auth_user_id = me
   where s.id = v_self.id;

  begin perform public.seed_student_progress(v_self.id, v_self.group_id);
  exception when others then null; end;

  -- Сиблинг-карточки одного человека (person_id) → один логин на все предметы.
  -- Алиасы обязательны: OUT-параметр group_id иначе конфликтует с колонкой.
  if v_self.person_id is not null then
    for r in
      select s.id as sid, s.group_id as gid from public.students s
      where s.person_id = v_self.person_id and s.created_by is not distinct from v_self.created_by
        and s.id <> v_self.id and s.auth_user_id is null
    loop
      update public.students s
         set auth_user_id = me, email = p_email
       where s.id = r.sid;
      begin perform public.seed_student_progress(r.sid, r.gid);
      exception when others then null; end;
    end loop;
  end if;

  student_id := v_self.id;
  group_id := v_self.group_id;
  return next;
end;
$$;
revoke execute on function public.claim_student_account(uuid, text) from public, anon;
grant execute on function public.claim_student_account(uuid, text) to authenticated;


-- Compatibility for cached clients: discard the legacy password argument.
create or replace function public.claim_student_account(p_token uuid, p_email text, p_password text)
returns table(student_id uuid, group_id uuid)
language sql security invoker set search_path = public as $$
  select * from public.claim_student_account(p_token, p_email);
$$;
revoke all on function public.claim_student_account(uuid, text, text) from public, anon;
grant execute on function public.claim_student_account(uuid, text, text) to authenticated;

-- This legacy endpoint is superseded by claim_student_account. No side effects.
create or replace function public.claim_sibling_cards(p_token uuid, p_email text, p_password text)
returns integer language sql security invoker set search_path = public as $$ select 0; $$;
revoke all on function public.claim_sibling_cards(uuid, text, text) from public, anon;
grant execute on function public.claim_sibling_cards(uuid, text, text) to authenticated;

-- Reject new plaintext credentials even from a stale client or privileged writer.
create or replace function public.reject_student_password_storage()
returns trigger language plpgsql set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    if new.temp_password is not null then raise exception 'Password storage is disabled'; end if;
  elsif new.temp_password is distinct from old.temp_password and new.temp_password is not null then
    raise exception 'Password storage is disabled';
  end if;
  return new;
end;
$$;
revoke all on function public.reject_student_password_storage() from public;
create trigger trg_reject_student_password_storage before insert or update on public.students
for each row execute function public.reject_student_password_storage();

-- RLS owns rows, but must not let their owner attach an arbitrary Auth account
-- (which could then be reset through the owner-only password endpoint).
create or replace function public.guard_student_account_link()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role') then return new; end if;
  if TG_OP = 'UPDATE' then
    if new.auth_user_id is distinct from old.auth_user_id then
      raise exception 'Account links are server-managed';
    end if;
  elsif new.auth_user_id is not null then
    -- A teacher may copy an existing, owned subject card for the same person.
    if new.person_id is null or not exists (
      select 1 from public.students s where s.person_id = new.person_id
        and s.auth_user_id = new.auth_user_id and s.created_by = auth.uid()
    ) then raise exception 'Account link requires an owned sibling card'; end if;
  end if;
  if new.group_id is not null and not exists (
    select 1 from public.groups g where g.id = new.group_id and g.created_by = auth.uid()
  ) and not public.is_admin() then raise exception 'Group is not owned by caller'; end if;
  return new;
end;
$$;
revoke all on function public.guard_student_account_link() from public;
create trigger trg_guard_student_account_link before insert or update on public.students
for each row execute function public.guard_student_account_link();
