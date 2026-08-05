-- Per-teacher subject scope. Mirrors the hidden_tabs/hidden_widgets access model
-- (0016) and the invite baking (0023).
--
-- Semantics: EMPTY array = ALL subjects (non-breaking default — existing teachers
-- keep seeing every subject, exactly as today). NON-EMPTY = the teacher is limited
-- to these subjects across trainer/bank/homework filters, dropdowns and switchers.
-- Values are English registry ids ('chemistry','biology','english',…) from
-- src/lib/subjects.ts.

alter table public.profiles
  add column if not exists subjects text[] not null default '{}';

alter table public.teacher_invites
  add column if not exists subjects text[] not null default '{}';

-- Extend the profile-access guard so a teacher can't widen their own subject scope.
create or replace function public.guard_profile_access_cols()
returns trigger
language plpgsql
as $$
begin
  if (new.hidden_tabs is distinct from old.hidden_tabs
      or new.hidden_widgets is distinct from old.hidden_widgets
      or new.subjects is distinct from old.subjects)
     and not public.is_admin() then
    raise exception 'Only an admin can change access settings';
  end if;
  return new;
end;
$$;

-- Admin writes another teacher's subject scope (SECURITY DEFINER bypasses the
-- self-only write policy; is_admin() gate keeps it admin-only). Mirrors
-- admin_set_teacher_access.
create or replace function public.admin_set_teacher_subjects(
  p_teacher uuid,
  p_subjects text[]
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can change access settings';
  end if;
  update public.profiles
     set subjects = coalesce(p_subjects, '{}'),
         updated_at = now()
   where id = p_teacher;
end;
$$;
revoke execute on function public.admin_set_teacher_subjects(uuid, text[]) from anon;

-- Add subjects to the admin teacher list (drop+recreate: return type changes).
drop function if exists public.admin_teacher_list();
create or replace function public.admin_teacher_list()
returns table(
  id uuid, name text, username text, subject text, role text,
  created_at timestamptz, group_count bigint, student_count bigint,
  hidden_tabs text[], hidden_widgets text[], subjects text[]
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    p.id, p.name, p.username, p.subject, p.role, p.created_at,
    (select count(*) from public.groups g where g.created_by = p.id) as group_count,
    (select count(*) from public.students s
       join public.groups g on g.id = s.group_id
       where g.created_by = p.id) as student_count,
    p.hidden_tabs, p.hidden_widgets, p.subjects
  from public.profiles p
  where p.role in ('teacher', 'admin')
    and public.is_admin()
  order by p.created_at;
$$;

-- Bake subjects into invites. Signature changes (new param) → drop the old one
-- first so we replace rather than overload, then re-apply the anon revoke.
drop function if exists public.admin_create_teacher_invite(text, text[], text[], jsonb, uuid[]);
create or replace function public.admin_create_teacher_invite(
  p_email text,
  p_hidden_tabs text[],
  p_hidden_widgets text[],
  p_course_assignments jsonb,
  p_group_ids uuid[],
  p_subjects text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_token uuid;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can create invites';
  end if;
  insert into public.teacher_invites
    (email, hidden_tabs, hidden_widgets, course_assignments, group_ids, subjects, created_by)
  values
    (p_email, coalesce(p_hidden_tabs, '{}'), coalesce(p_hidden_widgets, '{}'),
     coalesce(p_course_assignments, '[]'::jsonb), coalesce(p_group_ids, '{}'),
     coalesce(p_subjects, '{}'), auth.uid())
  returning token into v_token;
  return v_token;
end;
$$;
revoke execute on function public.admin_create_teacher_invite(text, text[], text[], jsonb, uuid[], text[]) from anon;

-- Apply the baked subject scope on first login (adds the subjects line; rest of
-- the body is unchanged from 0023).
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
  select * into inv from public.teacher_invites where token = p_token;
  if not found then raise exception 'invalid invite token'; end if;
  if inv.consumed_at is not null then raise exception 'invite already used'; end if;

  -- 1. Access deny-lists + subject scope.
  update public.profiles
     set hidden_tabs = inv.hidden_tabs,
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
