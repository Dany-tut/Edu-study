-- Teacher invites with baked-in access + content config. An admin creates an
-- invite (deny-lists + course/group assignments); the teacher opens
-- #/join-teacher?token=…, signs up, and apply_teacher_invite() provisions their
-- profile + content on first login. hidden_tabs/hidden_widgets store the
-- COMPLEMENT of the selected sections/widgets so they drop 1:1 onto profiles.
create table if not exists public.teacher_invites (
  token              uuid primary key default gen_random_uuid(),
  email              text,
  hidden_tabs        text[] not null default '{}',
  hidden_widgets     text[] not null default '{}',
  course_assignments jsonb  not null default '[]'::jsonb, -- [{course_id, mode:'copy'|'share'}]
  group_ids          uuid[] not null default '{}',
  created_by         uuid references auth.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  consumed_at        timestamptz,
  consumed_by        uuid references auth.users(id) on delete set null
);

alter table public.teacher_invites enable row level security;
-- No direct client access: everything flows through the SECURITY DEFINER RPCs.
revoke all on public.teacher_invites from anon, authenticated;

-- Admin creates an invite, returns the token for the link.
create or replace function public.admin_create_teacher_invite(
  p_email text,
  p_hidden_tabs text[],
  p_hidden_widgets text[],
  p_course_assignments jsonb,
  p_group_ids uuid[]
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
    (email, hidden_tabs, hidden_widgets, course_assignments, group_ids, created_by)
  values
    (p_email, coalesce(p_hidden_tabs, '{}'), coalesce(p_hidden_widgets, '{}'),
     coalesce(p_course_assignments, '[]'::jsonb), coalesce(p_group_ids, '{}'), auth.uid())
  returning token into v_token;
  return v_token;
end;
$$;

-- Called by the newly signed-up teacher (runs as them; definer so it can bypass
-- the profile guard trigger and reassign admin-owned content). Idempotent via
-- consumed_at.
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

  -- 1. Access deny-lists.
  update public.profiles
     set hidden_tabs = inv.hidden_tabs,
         hidden_widgets = inv.hidden_widgets,
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

-- The consumer must be able to run apply on their own token.
grant execute on function public.apply_teacher_invite(uuid) to authenticated;
revoke execute on function public.admin_create_teacher_invite(text, text[], text[], jsonb, uuid[]) from anon;

-- Pre-signup validation: the join page (anon) can check the token is valid and
-- prefill the email, without exposing the rest of the invite config.
create or replace function public.get_teacher_invite(p_token uuid)
returns table(email text, consumed boolean)
language sql
stable
security definer
set search_path to 'public'
as $$
  select email, (consumed_at is not null) as consumed
  from public.teacher_invites
  where token = p_token;
$$;
grant execute on function public.get_teacher_invite(uuid) to anon, authenticated;
