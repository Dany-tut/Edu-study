-- 0036_invite_expiry.sql — Этап 0: у ссылок-приглашений учителя появляется срок
-- жизни (14 дней). Истёкший токен ведёт себя как несуществующий: get_teacher_invite
-- возвращает 0 строк (страница показывает «ссылка недействительна»),
-- apply_teacher_invite отклоняет явно.

alter table public.teacher_invites
  add column if not exists expires_at timestamptz not null default (now() + interval '14 days');

create or replace function public.get_teacher_invite(p_token uuid)
returns table(email text, consumed boolean)
language sql
stable
security definer
set search_path to 'public'
as $$
  select email, (consumed_at is not null) as consumed
  from public.teacher_invites
  where token = p_token
    and expires_at > now();
$$;

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
  if inv.expires_at <= now() then raise exception 'invite expired'; end if;

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
