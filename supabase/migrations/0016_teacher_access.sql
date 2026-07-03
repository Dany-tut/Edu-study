-- Per-teacher access control: deny-lists for nav tabs and home widgets.
-- Empty array = full access (default, non-breaking for existing teachers).

alter table public.profiles
  add column if not exists hidden_tabs text[] not null default '{}',
  add column if not exists hidden_widgets text[] not null default '{}';

-- Teachers may update their own profile (name, avatar, …) but must NOT be able
-- to lift their own access restrictions. Block changes to the access columns
-- unless the caller is an admin.
create or replace function public.guard_profile_access_cols()
returns trigger
language plpgsql
as $$
begin
  if (new.hidden_tabs is distinct from old.hidden_tabs
      or new.hidden_widgets is distinct from old.hidden_widgets)
     and not public.is_admin() then
    raise exception 'Only an admin can change access settings';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_profile_access_cols on public.profiles;
create trigger trg_guard_profile_access_cols
  before update on public.profiles
  for each row execute function public.guard_profile_access_cols();

-- Admin writes another teacher's access (SECURITY DEFINER bypasses the self-only
-- write policy; is_admin() gate keeps it admin-only).
create or replace function public.admin_set_teacher_access(
  p_teacher uuid,
  p_hidden_tabs text[],
  p_hidden_widgets text[]
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
     set hidden_tabs = coalesce(p_hidden_tabs, '{}'),
         hidden_widgets = coalesce(p_hidden_widgets, '{}'),
         updated_at = now()
   where id = p_teacher;
end;
$$;

-- Extend the admin teacher list with the access columns.
create or replace function public.admin_teacher_list()
returns table(
  id uuid, name text, username text, subject text, role text,
  created_at timestamptz, group_count bigint, student_count bigint,
  hidden_tabs text[], hidden_widgets text[]
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
    p.hidden_tabs, p.hidden_widgets
  from public.profiles p
  where p.role in ('teacher', 'admin')
    and public.is_admin()
  order by p.created_at;
$$;
