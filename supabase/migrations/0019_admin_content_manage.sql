-- Admin data-management: let an admin see every course / group across ALL
-- teachers (with its owner), reassign ownership, or delete it. Needed because
-- legacy content had created_by = null and leaked into every teacher's cabinet;
-- the admin now has a single place to clean it up. All functions are
-- security-definer + is_admin()-gated so they bypass RLS only for admins.

-- ── Unified content listing ───────────────────────────────────────────────────
create or replace function public.admin_content_list()
returns table(
  kind text, id uuid, short_id text, title text, status text,
  owner_id uuid, owner_name text, detail bigint, created_at timestamptz
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    'course'::text as kind,
    c.id, c.short_id, c.title, c.status,
    c.created_by as owner_id,
    coalesce(p.name, '—') as owner_name,
    (select count(*) from public.lessons l where l.course_id = c.id) as detail,
    c.created_at
  from public.courses c
  left join public.profiles p on p.id = c.created_by
  where public.is_admin()
  union all
  select
    'group'::text as kind,
    g.id, null::text as short_id, g.name as title, null::text as status,
    g.created_by as owner_id,
    coalesce(p.name, '—') as owner_name,
    (select count(*) from public.students s where s.group_id = g.id) as detail,
    g.created_at
  from public.groups g
  left join public.profiles p on p.id = g.created_by
  where public.is_admin()
  order by kind, created_at;
$$;

-- ── Reassign ownership ────────────────────────────────────────────────────────
create or replace function public.admin_reassign_content(
  p_kind text,
  p_id uuid,
  p_new_owner uuid
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can reassign content';
  end if;
  if p_kind = 'course' then
    update public.courses set created_by = p_new_owner, updated_at = now() where id = p_id;
  elsif p_kind = 'group' then
    update public.groups set created_by = p_new_owner where id = p_id;
  else
    raise exception 'Unknown content kind: %', p_kind;
  end if;
end;
$$;

-- ── Delete content ────────────────────────────────────────────────────────────
create or replace function public.admin_delete_content(
  p_kind text,
  p_id uuid
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can delete content';
  end if;
  if p_kind = 'course' then
    delete from public.courses where id = p_id;
  elsif p_kind = 'group' then
    delete from public.groups where id = p_id;
  else
    raise exception 'Unknown content kind: %', p_kind;
  end if;
end;
$$;

-- Anon must never reach these; only authenticated admins.
revoke execute on function public.admin_content_list()                       from anon;
revoke execute on function public.admin_reassign_content(text, uuid, uuid)   from anon;
revoke execute on function public.admin_delete_content(text, uuid)           from anon;
