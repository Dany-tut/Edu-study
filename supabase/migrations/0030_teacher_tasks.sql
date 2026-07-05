-- Persistent, per-teacher "Мои задачи" tasks. Previously the tasks widget was
-- seeded with a hardcoded demo array in the client store (teacherStore.ts), so
-- EVERY teacher — including freshly-invited ones — saw the same fake tasks and
-- nothing was ever saved. This gives each teacher their own tasks, scoped by
-- owner (created_by = auth.uid()), plus admin RPCs to view/manage them all.

create table if not exists public.teacher_tasks (
  id         uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type_id    text,
  type_label text,
  type_bg    text,
  type_color text,
  title      text not null default '',
  date       text not null default '',
  "time"     text not null default '',
  comment    text not null default '',
  done       boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists teacher_tasks_owner_idx on public.teacher_tasks (created_by, created_at);

alter table public.teacher_tasks enable row level security;

-- Owner-only access. Tasks belong to the authenticated teacher who created them.
drop policy if exists teacher_tasks_select on public.teacher_tasks;
create policy teacher_tasks_select on public.teacher_tasks
  for select using (created_by = auth.uid());

drop policy if exists teacher_tasks_insert on public.teacher_tasks;
create policy teacher_tasks_insert on public.teacher_tasks
  for insert with check (created_by = auth.uid());

drop policy if exists teacher_tasks_update on public.teacher_tasks;
create policy teacher_tasks_update on public.teacher_tasks
  for update using (created_by = auth.uid()) with check (created_by = auth.uid());

drop policy if exists teacher_tasks_delete on public.teacher_tasks;
create policy teacher_tasks_delete on public.teacher_tasks
  for delete using (created_by = auth.uid());

-- Anon sessions (students) must never touch this table.
revoke all on public.teacher_tasks from anon;

-- ── Admin management (RLS-bypassing but is_admin()-gated) ─────────────────────
-- Lets the admin see every teacher's tasks with the owner, reassign, or delete.
-- Mirrors the admin_content_* functions from 0019/0029.
create or replace function public.admin_tasks_list()
returns table(
  id uuid, owner_id uuid, owner_name text,
  type_label text, title text, "date" text, "time" text,
  comment text, done boolean, created_at timestamptz
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    t.id, t.created_by as owner_id,
    coalesce(p.name, '—') as owner_name,
    t.type_label, t.title, t.date, t.time,
    t.comment, t.done, t.created_at
  from public.teacher_tasks t
  left join public.profiles p on p.id = t.created_by
  where public.is_admin()
  order by t.created_by, t.created_at desc;
$$;

create or replace function public.admin_delete_task(p_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can delete tasks';
  end if;
  delete from public.teacher_tasks where id = p_id;
end;
$$;

create or replace function public.admin_reassign_task(p_id uuid, p_new_owner uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can reassign tasks';
  end if;
  update public.teacher_tasks set created_by = p_new_owner where id = p_id;
end;
$$;

revoke execute on function public.admin_tasks_list()               from anon;
revoke execute on function public.admin_delete_task(uuid)          from anon;
revoke execute on function public.admin_reassign_task(uuid, uuid)  from anon;
