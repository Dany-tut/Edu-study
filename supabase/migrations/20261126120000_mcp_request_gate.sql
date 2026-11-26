-- MCP Искры v2, этап 2: токен ИИ-помощника работает с данными ТОЛЬКО через
-- функцию iskra-mcp. Проект: docs/analysis/iskra-mcp-v2-2026-11-25.md §2,
-- проверки: docs/qa/mcp-v2-release/stage2.md.
--
-- OAuth-токен Supabase — обычный JWT учителя (role authenticated, aal1) с
-- полем client_id. Без защиты помощник мог ходить в REST, Storage и Realtime
-- напрямую, в обход прав, лимитов, журнала и белого списка полей MCP.
--
-- Точка опоры — public.mfa_ok(): она уже стоит ограничительной политикой
-- mfa_required на КАЖДОЙ таблице public с RLS и на storage.objects, и её же
-- зовёт фильтр запросов PostgREST (public.mfa_pre_request). Теперь для токена
-- с client_id она истинна, только если в запросе есть заголовок
-- x-iskra-mcp-key с секретом функции (в базе — только его sha256). Realtime
-- заголовков не передаёт — подписки помощника отклоняются той же политикой.
--
-- Для обычных входов (без client_id) логика mfa_ok() не меняется ни на символ.
-- Токен помощника всегда aal1; через функцию он проходит без aal2 намеренно:
-- права помощнику выдаёт только сессия Искры (mcp_set_scopes идёт через REST,
-- а значит через проверку MFA), а без строки прав функция теперь отказывает.
--
-- Только добавляет и расширяет функции; данные не меняются. Хэш секрета
-- вносится отдельным шагом; пока его нет, токены помощников не пускаются
-- никуда (функция iskra-mcp тоже) — поэтому сначала выкладывается функция.

create table if not exists private.mcp_gate_key (
  id       smallint primary key default 1 check (id = 1),
  key_hash text        not null check (key_hash ~ '^[0-9a-f]{64}$'),
  set_at   timestamptz not null default now()
);
alter table private.mcp_gate_key enable row level security;
revoke all on private.mcp_gate_key from public, anon, authenticated;

/** Запрос пришёл из функции iskra-mcp: заголовок с секретом совпал с хэшем. */
create or replace function private.mcp_via_function() returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  v_key text;
  v_hash text;
begin
  begin
    v_key := nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-iskra-mcp-key';
  exception when others then
    return false;
  end;
  if v_key is null or length(v_key) > 200 then return false; end if;
  select key_hash into v_hash from private.mcp_gate_key where id = 1;
  return v_hash is not null and encode(sha256(convert_to(v_key, 'UTF8')), 'hex') = v_hash;
end;
$$;
revoke all on function private.mcp_via_function() from public, anon, authenticated;

-- Прежнее тело (до 26.11.2026) — для отката:
--   select auth.uid() is null or coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
--       or not exists (select 1 from auth.mfa_factors f
--                      where f.user_id = auth.uid() and f.status = 'verified')
create or replace function public.mfa_ok()
 returns boolean
 language sql
 stable security definer
 set search_path to ''
as $function$
  select case
    when nullif(auth.jwt() ->> 'client_id', '') is not null
      then private.mcp_via_function()
    else auth.uid() is null
      or coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
      or not exists (
        select 1 from auth.mfa_factors f
        where f.user_id = auth.uid() and f.status = 'verified'
      )
  end
$function$;

-- Понятная ошибка помощнику вместо «подтвердите вход кодом».
create or replace function public.mfa_pre_request()
 returns void
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
begin
  if nullif(auth.jwt() ->> 'client_id', '') is not null and not private.mcp_via_function() then
    raise sqlstate 'PT403' using
      message = 'assistant_direct_access',
      detail = 'Доступ ИИ-помощника к Искре — только через MCP-сервер Искры';
  end if;
  -- current_user здесь — владелец функции; кто спрашивает, знает mfa_ok() по JWT.
  if not public.mfa_ok() then
    raise sqlstate 'PT403' using
      message = 'mfa_required',
      detail = 'Подтвердите вход кодом из приложения',
      hint = 'aal2';
  end if;
end
$function$;

-- Подключение без выданных в Искре прав больше не получает «прежние» права:
-- на проде 26.11.2026 нет ни одного действующего подключения, а строка прав
-- создаётся только сессией Искры. Иначе согласие, данное в обход экрана Искры
-- (например, с украденным паролем без кода MFA), открыло бы данные.
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
    return jsonb_build_object('state', 'needs_consent');
  end if;
  if v_row.revoked_at is not null then
    return jsonb_build_object('state', 'revoked');
  end if;
  return jsonb_build_object('state', 'active', 'legacy', false, 'scopes', to_jsonb(v_row.scopes));
end;
$$;

-- mcp_gate считал «нет строки» прежними правами через mcp_client_state; теперь
-- там needs_consent — пропуск отказывает так же, как при отзыве.
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
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text || '/' || v_client, 0));

  v_state := public.mcp_client_state();
  if v_state ->> 'state' in ('revoked', 'needs_consent') then
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
