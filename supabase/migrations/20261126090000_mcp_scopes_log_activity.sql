-- MCP Искры v2, этап 1: права ИИ-помощников, журнал вызовов, лента событий.
-- Проект: docs/analysis/iskra-mcp-v2-2026-11-25.md (утверждён Дани 25.11.2026).
--
-- Миграция ТОЛЬКО ДОБАВЛЯЕТ: три новые таблицы, функции и один AFTER-триггер
-- на lesson_progress. Существующие строки не меняются и не удаляются.
--
-- Supabase OAuth Server не поддерживает свои scopes (только openid/email/
-- profile/phone), поэтому права хранятся здесь по паре (учитель, client_id).
-- client_id берётся ТОЛЬКО из подписанного JWT (`auth.jwt() ->> 'client_id'`),
-- никогда из аргументов функции, если вызывает сам ИИ-клиент.
--
-- Все записи в таблицы идут через функции security definer с явными
-- проверками; прямых insert/update/delete-политик нет, поэтому ИИ-клиент не
-- может ни выдать себе права, ни подделать или стереть журнал через REST.

-- ─── 1. Права подключения ──────────────────────────────────────────────────
create table if not exists public.mcp_grant_scopes (
  user_id    uuid        not null,
  client_id  text        not null check (length(client_id) between 1 and 200),
  scopes     text[]      not null default '{}',
  granted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (user_id, client_id)
);
alter table public.mcp_grant_scopes enable row level security;
drop policy if exists mcp_grant_scopes_select_own on public.mcp_grant_scopes;
create policy mcp_grant_scopes_select_own on public.mcp_grant_scopes
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.mcp_grant_scopes from anon, authenticated;
grant select on public.mcp_grant_scopes to authenticated;

-- ─── 2. Журнал вызовов ─────────────────────────────────────────────────────
-- Без содержимого ответов и без текстов учеников: инструмент, право, статус,
-- число записей, длительность и только id/даты из аргументов.
create table if not exists public.mcp_call_log (
  id           bigint generated always as identity primary key,
  user_id      uuid        not null,
  client_id    text        not null,
  tool         text        not null check (length(tool) <= 64),
  scope        text,
  status       text        not null check (status in ('started','ok','error','denied','rate_limited','revoked')),
  result_count integer,
  duration_ms  integer,
  args         jsonb       not null default '{}',
  created_at   timestamptz not null default now()
);
create index if not exists mcp_call_log_owner_time on public.mcp_call_log (user_id, client_id, created_at desc);
alter table public.mcp_call_log enable row level security;
drop policy if exists mcp_call_log_select_own on public.mcp_call_log;
create policy mcp_call_log_select_own on public.mcp_call_log
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.mcp_call_log from anon, authenticated;
grant select on public.mcp_call_log to authenticated;

-- ─── 3. Лента событий учеников ─────────────────────────────────────────────
-- Указатель «что изменилось» с серверным временем и монотонным id — курсор не
-- зависит от часов устройства ученика. Содержимое (комментарий, фото, ответы)
-- здесь НЕ копируется: инструмент читает его из lesson_progress под RLS
-- учителя в момент вызова.
create table if not exists public.student_activity (
  id          bigint generated always as identity primary key,
  student_id  uuid        not null,
  progress_id uuid        not null,
  lesson_ref  text        not null,
  kind        text        not null check (kind in ('lesson_done','submitted','returned','comment')),
  at          timestamptz not null default now()
);
create index if not exists student_activity_student_id on public.student_activity (student_id, id);
alter table public.student_activity enable row level security;
drop policy if exists student_activity_select_owner on public.student_activity;
create policy student_activity_select_owner on public.student_activity
  for select to authenticated using (
    exists (select 1 from public.students s
            where s.id = student_activity.student_id and s.created_by = (select auth.uid()))
  );
revoke all on public.student_activity from anon, authenticated;
grant select on public.student_activity to authenticated;

create or replace function private.record_student_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_kind text;
  v_comment_changed boolean;
begin
  -- Черновики базового уровня сохраняются часто — это не событие.
  if (new.attachments ->> 'draft') = 'true' then return null; end if;
  v_comment_changed := coalesce(new.comment, '') <> '' and
    (tg_op = 'INSERT' or new.comment is distinct from old.comment);
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    v_kind := case new.status
      when 'completed' then 'lesson_done'
      when 'submitted' then 'submitted'
      when 'returned'  then 'returned'
      else null end;
  end if;
  if v_kind is null and (v_comment_changed or
      (tg_op = 'UPDATE' and new.status in ('submitted','completed')
       and new.attachments is distinct from old.attachments)) then
    v_kind := 'comment';
  end if;
  if v_kind is not null then
    insert into public.student_activity (student_id, progress_id, lesson_ref, kind)
    values (new.student_id, new.id, new.lesson_ref, v_kind);
  end if;
  return null;
exception when others then
  -- Лента вторична: ни при какой ошибке не мешаем ученику сохранить работу.
  raise warning 'record_student_activity: %', sqlerrm;
  return null;
end;
$$;
revoke all on function private.record_student_activity() from public, anon, authenticated;

drop trigger if exists record_student_activity on public.lesson_progress;
create trigger record_student_activity
  after insert or update of status, comment, attachments on public.lesson_progress
  for each row execute function private.record_student_activity();

-- ─── 4. Функции ────────────────────────────────────────────────────────────
-- Права, которые учитель может выдать. Новые — только новым согласием.
create or replace function private.mcp_known_scopes() returns text[]
language sql immutable set search_path = '' as $$
  select array['courses:read','courses:write','students:read','progress:read','events:read','attachments:read']
$$;
-- Подключения, выданные ДО этапа 1 (строки нет): ровно то, чем они уже
-- пользовались. События и фото — только по новому согласию.
create or replace function private.mcp_legacy_scopes() returns text[]
language sql immutable set search_path = '' as $$
  select array['courses:read','courses:write','students:read','progress:read']
$$;

/** Состояние текущего ИИ-клиента: вызывается Edge Function на каждый запрос. */
create or replace function public.mcp_client_state() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_client text := auth.jwt() ->> 'client_id';
  v_row public.mcp_grant_scopes;
begin
  if v_uid is null or coalesce(v_client, '') = '' then
    return jsonb_build_object('state', 'no_client');
  end if;
  select * into v_row from public.mcp_grant_scopes where user_id = v_uid and client_id = v_client;
  if not found then
    return jsonb_build_object('state', 'active', 'legacy', true, 'scopes', to_jsonb(private.mcp_legacy_scopes()));
  end if;
  if v_row.revoked_at is not null then
    return jsonb_build_object('state', 'revoked');
  end if;
  return jsonb_build_object('state', 'active', 'legacy', false, 'scopes', to_jsonb(v_row.scopes));
end;
$$;

/**
 * Пропуск на один вызов инструмента: права → отзыв → лимиты → строка журнала.
 * Возвращает {allowed, reason, log_id, retry_after}. Отказ тоже пишется.
 */
create or replace function public.mcp_gate(p_tool text, p_scope text, p_args jsonb default '{}')
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_client text := auth.jwt() ->> 'client_id';
  v_state jsonb;
  v_scopes text[];
  v_minute int;
  v_day int;
  v_photos int;
  v_status text := 'started';
  v_reason text;
  v_retry int;
  v_id bigint;
begin
  if v_uid is null or coalesce(v_client, '') = '' then
    return jsonb_build_object('allowed', false, 'reason', 'no_client');
  end if;
  if p_tool is null or length(p_tool) > 64 then
    return jsonb_build_object('allowed', false, 'reason', 'bad_tool');
  end if;
  -- Один вызов за раз на подключение: счётчики ниже не обгоняют друг друга.
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text || '/' || v_client, 0));

  v_state := public.mcp_client_state();
  if v_state ->> 'state' = 'revoked' then
    v_status := 'revoked'; v_reason := 'revoked';
  else
    select coalesce(array_agg(x), '{}') into v_scopes from jsonb_array_elements_text(v_state -> 'scopes') x;
    if p_scope is not null and not (p_scope = any (v_scopes)) then
      v_status := 'denied'; v_reason := 'insufficient_scope';
    end if;
  end if;

  if v_status = 'started' then
    select count(*) filter (where created_at > now() - interval '1 minute'),
           count(*),
           count(*) filter (where tool = 'get_attachment' and status in ('started','ok'))
      into v_minute, v_day, v_photos
      from public.mcp_call_log
     where user_id = v_uid and client_id = v_client and created_at > now() - interval '1 day'
       and status in ('started','ok','error');
    if v_minute >= 60 then
      v_status := 'rate_limited'; v_reason := 'minute'; v_retry := 60;
    elsif v_day >= 2000 then
      v_status := 'rate_limited'; v_reason := 'day'; v_retry := 3600;
    elsif p_tool = 'get_attachment' and v_photos >= 200 then
      v_status := 'rate_limited'; v_reason := 'photos'; v_retry := 3600;
    end if;
  end if;

  insert into public.mcp_call_log (user_id, client_id, tool, scope, status, args)
  values (v_uid, v_client, p_tool, p_scope, v_status,
          coalesce(case when jsonb_typeof(p_args) = 'object' and length(p_args::text) <= 2000 then p_args end, '{}'))
  returning id into v_id;

  return jsonb_build_object('allowed', v_status = 'started', 'reason', v_reason, 'log_id', v_id, 'retry_after', v_retry);
end;
$$;

/** Итог вызова: дописывает строку журнала, открытую mcp_gate. */
create or replace function public.mcp_finish(p_log_id bigint, p_status text, p_count integer, p_ms integer)
returns void
language sql volatile security definer set search_path = '' as $$
  update public.mcp_call_log
     set status = case when p_status in ('ok','error') then p_status else 'error' end,
         result_count = greatest(p_count, 0),
         duration_ms = least(greatest(p_ms, 0), 600000)
   where id = p_log_id
     and user_id = auth.uid()
     and client_id = (auth.jwt() ->> 'client_id')
     and status = 'started'
     and created_at > now() - interval '10 minutes'
$$;

/**
 * Права подключения выставляет ТОЛЬКО сам учитель в Искре (экран согласия,
 * «ИИ-помощники»): токен ИИ-клиента (есть client_id) получает отказ.
 */
create or replace function public.mcp_set_scopes(p_client_id text, p_scopes text[])
returns text[]
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_clean text[];
begin
  if v_uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  if coalesce(auth.jwt() ->> 'client_id', '') <> '' then
    raise exception 'assistant_cannot_change_scopes' using errcode = '42501';
  end if;
  if not public.is_staff() then raise exception 'teachers_only' using errcode = '42501'; end if;
  if p_client_id is null or length(p_client_id) not between 1 and 200 then
    raise exception 'bad_client' using errcode = '22023';
  end if;
  select coalesce(array_agg(distinct s order by s), '{}') into v_clean
    from unnest(coalesce(p_scopes, '{}')) s where s = any (private.mcp_known_scopes());
  insert into public.mcp_grant_scopes (user_id, client_id, scopes)
  values (v_uid, p_client_id, v_clean)
  on conflict (user_id, client_id) do update
    set scopes = excluded.scopes, updated_at = now(), revoked_at = null;
  return v_clean;
end;
$$;

/** Отзыв: следующий же вызов с уже выданным токеном получает 401. */
create or replace function public.mcp_revoke(p_client_id text)
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  if coalesce(auth.jwt() ->> 'client_id', '') <> '' then
    raise exception 'assistant_cannot_revoke' using errcode = '42501';
  end if;
  insert into public.mcp_grant_scopes (user_id, client_id, scopes, revoked_at)
  values (v_uid, p_client_id, '{}', now())
  on conflict (user_id, client_id) do update
    set scopes = '{}', updated_at = now(), revoked_at = now();
end;
$$;

revoke all on function public.mcp_client_state() from public, anon;
revoke all on function public.mcp_gate(text, text, jsonb) from public, anon;
revoke all on function public.mcp_finish(bigint, text, integer, integer) from public, anon;
revoke all on function public.mcp_set_scopes(text, text[]) from public, anon;
revoke all on function public.mcp_revoke(text) from public, anon;
grant execute on function public.mcp_client_state() to authenticated;
grant execute on function public.mcp_gate(text, text, jsonb) to authenticated;
grant execute on function public.mcp_finish(bigint, text, integer, integer) to authenticated;
grant execute on function public.mcp_set_scopes(text, text[]) to authenticated;
grant execute on function public.mcp_revoke(text) to authenticated;
