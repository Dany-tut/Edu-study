-- Доступ учителя к функциям-автоматизациям.
--
-- Правило Дани (07.11.2026): функцию включает админ — одному учителю или всем
-- сразу. Без доступа учитель не видит ни инструмента, ни настройки. С доступом
-- в «Настройках → Функции» у учителя есть свой переключатель (по умолчанию
-- включено). Админ видит все функции всегда.
--
-- teacher_feature_grants: teacher_id NULL = «всем учителям».
-- teacher_feature_prefs:  учитель сам выключил функцию (enabled = false).
--
-- Сервер тоже держит правило, не только экран:
--   • предоценка ДЗ (ai_hw_grade) — строка очереди hw_ai_grades не ставится;
--   • «Применить все уверенные» (ai_hw_batch) — превью пустое, пакет не применяется;
--   • «Журнал не заполнен» (journal_push) — уведомление не создаётся.
-- Расшифровка (transcription) и MCP (mcp) — экран; их проверку на сервере
-- добавит следующий шаг.

create table if not exists public.teacher_feature_grants (
  id         uuid primary key default gen_random_uuid(),
  feature    text not null check (feature ~ '^[a-z_]{2,40}$'),
  teacher_id uuid references auth.users(id) on delete cascade,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists teacher_feature_grants_uniq
  on public.teacher_feature_grants (feature, coalesce(teacher_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table if not exists public.teacher_feature_prefs (
  teacher_id uuid not null references auth.users(id) on delete cascade,
  feature    text not null check (feature ~ '^[a-z_]{2,40}$'),
  enabled    boolean not null,
  updated_at timestamptz not null default now(),
  primary key (teacher_id, feature)
);

alter table public.teacher_feature_grants enable row level security;
alter table public.teacher_feature_prefs  enable row level security;
revoke all on public.teacher_feature_grants from anon, authenticated;
revoke all on public.teacher_feature_prefs  from anon, authenticated;
-- Чтение и запись — только через функции ниже.

-- Доступ, уже действовавший до правила, сохраняется: эти функции были у всех.
-- Новые (пакет, пуш журнала) — ни у кого, пока админ не выдаст.
insert into public.teacher_feature_grants (feature, teacher_id)
values ('ai_hw_grade', null), ('transcription', null), ('mcp', null)
on conflict do nothing;


-- ── Проверки ────────────────────────────────────────────────────────────────

create or replace function iskra_private.teacher_has_feature(p_uid uuid, p_feature text)
returns boolean language sql stable security definer set search_path = public as $$
  select p_uid is not null and (
    public.is_admin_user(p_uid)
    or exists (select 1 from teacher_feature_grants g
                where g.feature = p_feature and (g.teacher_id is null or g.teacher_id = p_uid)))
$$;

create or replace function iskra_private.teacher_feature_on(p_uid uuid, p_feature text)
returns boolean language sql stable security definer set search_path = public as $$
  select iskra_private.teacher_has_feature(p_uid, p_feature)
     and coalesce((select enabled from teacher_feature_prefs
                    where teacher_id = p_uid and feature = p_feature), true)
$$;

revoke all on function iskra_private.teacher_has_feature(uuid, text) from public, anon, authenticated;
revoke all on function iskra_private.teacher_feature_on(uuid, text) from public, anon, authenticated;


-- ── Учитель: свои функции ───────────────────────────────────────────────────

-- Только выданные функции. Невыданных учитель не видит даже по имени.
create or replace function public.my_features()
returns table (feature text, enabled boolean)
language sql stable security definer set search_path = public as $$
  with keys as (
    select distinct g.feature from teacher_feature_grants g
     where public.is_admin_user(auth.uid()) or g.teacher_id is null or g.teacher_id = auth.uid()
  )
  select k.feature, iskra_private.teacher_feature_on(auth.uid(), k.feature)
    from keys k
   where auth.uid() is not null
$$;
revoke all on function public.my_features() from public, anon;
grant execute on function public.my_features() to authenticated;

create or replace function public.set_my_feature(p_feature text, p_enabled boolean)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if not iskra_private.teacher_has_feature(auth.uid(), p_feature) then
    raise exception 'feature not granted' using errcode = '42501';
  end if;
  insert into teacher_feature_prefs (teacher_id, feature, enabled)
  values (auth.uid(), p_feature, p_enabled)
  on conflict (teacher_id, feature) do update set enabled = excluded.enabled, updated_at = now();
  return p_enabled;
end; $$;
revoke all on function public.set_my_feature(text, boolean) from public, anon;
grant execute on function public.set_my_feature(text, boolean) to authenticated;


-- ── Админ: все ручки ────────────────────────────────────────────────────────

-- teacher_id NULL — выдано всем. Плюс выключения самих учителей.
create or replace function public.admin_feature_grants()
returns table (feature text, teacher_id uuid, kind text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  return query
    select g.feature, g.teacher_id, 'grant'::text from teacher_feature_grants g
    union all
    select p.feature, p.teacher_id, 'off'::text from teacher_feature_prefs p where not p.enabled;
end; $$;
revoke all on function public.admin_feature_grants() from public, anon;
grant execute on function public.admin_feature_grants() to authenticated;

-- p_teacher NULL — «всем учителям». p_on false — забрать.
create or replace function public.admin_set_feature_grant(p_feature text, p_teacher uuid, p_on boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  if p_on then
    insert into teacher_feature_grants (feature, teacher_id, granted_by)
    values (p_feature, p_teacher, auth.uid())
    on conflict do nothing;
  else
    delete from teacher_feature_grants
     where feature = p_feature and teacher_id is not distinct from p_teacher;
  end if;
end; $$;
revoke all on function public.admin_set_feature_grant(text, uuid, boolean) from public, anon;
grant execute on function public.admin_set_feature_grant(text, uuid, boolean) to authenticated;


-- ── Сервер держит правило ───────────────────────────────────────────────────

-- Предоценка ДЗ: очередь не принимает работу учителя без функции.
create or replace function iskra_private.hw_ai_grades_feature_gate()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.status = 'pending'
     and (TG_OP = 'INSERT' or OLD.status is distinct from 'pending')
     and not iskra_private.teacher_feature_on(NEW.teacher_id, 'ai_hw_grade') then
    return null;
  end if;
  return NEW;
end; $$;
revoke all on function iskra_private.hw_ai_grades_feature_gate() from public, anon, authenticated;
drop trigger if exists hw_ai_grades_feature_gate on public.hw_ai_grades;
create trigger hw_ai_grades_feature_gate before insert or update of status on public.hw_ai_grades
  for each row execute function iskra_private.hw_ai_grades_feature_gate();

-- «Журнал не заполнен»: уведомление только тем, у кого функция включена.
create or replace function iskra_private.fill_journal_feature_gate()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.type = 'fill_journal'
     and not iskra_private.teacher_feature_on(NEW.recipient_id, 'journal_push') then
    return null;
  end if;
  return NEW;
end; $$;
revoke all on function iskra_private.fill_journal_feature_gate() from public, anon, authenticated;
drop trigger if exists fill_journal_feature_gate on public.notifications;
create trigger fill_journal_feature_gate before insert on public.notifications
  for each row when (NEW.type = 'fill_journal')
  execute function iskra_private.fill_journal_feature_gate();

-- «Применить все уверенные»: без функции превью пустое, пакет не применяется.
create or replace function public.hw_ai_grade_batch_preview()
returns table (id uuid, progress_id uuid, score integer, doubt text)
language sql stable security definer set search_path = public as $$
  select g.id, g.progress_id, g.score,
         iskra_private.hw_ai_grade_doubt(g.kind, g.result, g.score, g.teacher_id, g.subject)
    from hw_ai_grades g
    join lesson_progress lp on lp.id = g.progress_id and lp.status = 'submitted'
   where g.teacher_id = (select auth.uid())
     and iskra_private.teacher_feature_on((select auth.uid()), 'ai_hw_batch')
     and g.status = 'graded'
     and (lp.attachments->>'attemptId') is not distinct from (g.result->>'attempt_id')
   order by g.submitted_at
$$;

create or replace function public.hw_ai_grade_apply_batch(p_ids uuid[])
returns uuid[] language plpgsql security definer set search_path = public as $$
declare g record; applied uuid[] := '{}'; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if not iskra_private.teacher_feature_on(uid, 'ai_hw_batch') then
    raise exception 'feature not granted' using errcode = '42501';
  end if;
  if coalesce(array_length(p_ids, 1), 0) > 200 then raise exception 'too_many'; end if;
  for g in select h.* from hw_ai_grades h
            where h.id = any(p_ids) and h.teacher_id = uid and h.status = 'graded'
            order by h.submitted_at for update loop
    continue when iskra_private.hw_ai_grade_doubt(g.kind, g.result, g.score, g.teacher_id, g.subject) is not null;
    update lesson_progress
       set status = 'completed', score = g.score,
           review_comment = case when coalesce(btrim(g.comment), '') = '' then null
                                 else '<p>' || iskra_private.hw_ai_html(btrim(g.comment)) || '</p>' end,
           review_attachments = null
     where id = g.progress_id and status = 'submitted'
       and (attachments->>'attemptId') is not distinct from (g.result->>'attempt_id');
    continue when not found;
    update hw_ai_grades
       set status = 'confirmed', final_score = g.score, confirmed_by = uid,
           confirmed_at = now(), updated_at = now()
     where id = g.id;
    applied := applied || g.id;
  end loop;
  return applied;
end; $$;
