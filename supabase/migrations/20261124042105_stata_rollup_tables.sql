-- Задача 24 (stata-overview-refresh) после 20261124035850 всё ещё 12+ с на
-- холодном кэше: на крошечном инстансе каждое из ~22 тыс. событий-инцидентов
-- за 60 дней и «последний визит» 123 пользователей читаются из 250 МБ
-- analytics_events вразброс, ради meta/ua для stata_iskra_automated().
--
-- Узкие производные таблицы, как analytics_overview_* (20261122023920):
-- триггер на вставку кладёт готовые kind/qa, расчёт читает только их.
-- Это кэш, восстанавливаемый из analytics_events (backfill ниже по тексту
-- миграции 20261124042337 и ручным заполнением 24.11), пользовательских данных здесь нет.
-- FK с ON DELETE CASCADE: удаление события (ретеншн, удаление пользователя)
-- убирает и его след в кэше.

create schema if not exists iskra_private;

create table if not exists iskra_private.stata_events (
  event_id bigint primary key references public.analytics_events(id) on delete cascade,
  created_at timestamptz not null,
  user_id uuid,
  session_id text,
  event text not null,
  kind text not null,          -- crash | hang | error | slow | act
  qa boolean not null
);
create index if not exists stata_events_kind_created_idx on iskra_private.stata_events (kind, created_at desc);
create index if not exists stata_events_created_idx on iskra_private.stata_events (created_at desc);

-- Последнее событие пользователя без признаков автоматизации.
create table if not exists iskra_private.stata_user_seen (
  user_id uuid primary key,
  event_id bigint not null references public.analytics_events(id) on delete cascade,
  last_seen timestamptz not null
);
create index if not exists stata_user_seen_event_idx on iskra_private.stata_user_seen (event_id);
create index if not exists stata_user_seen_last_idx on iskra_private.stata_user_seen (last_seen desc);

revoke all on iskra_private.stata_events, iskra_private.stata_user_seen from public, anon, authenticated;

create or replace function iskra_private.stata_event_kind(event text, meta jsonb)
returns text language sql immutable parallel safe set search_path='' as $fn$
  select case
    when event in ('react_crash','widget_crash') then 'crash'
    when event in ('ui_freeze','ui_blank','ui_loading_stalled','api_stalled') then 'hang'
    when event in ('js_error','db_error','resource_error','operation_failed','auth_failed','homework_submit_failed') then 'error'
    when event in ('api_slow','auth_stalled') then 'slow'
    when event = 'api_request' and (meta->>'status') ~ '^(0{1,3}|[4-9][0-9]{2})$' then 'error'
    when event in ('lesson_open','homework_submit','trainer_open','course_create') then 'act'
  end
$fn$;
revoke all on function iskra_private.stata_event_kind(text, jsonb) from public, anon, authenticated;

create or replace function iskra_private.capture_stata_event()
returns trigger language plpgsql security definer set search_path='' as $$
declare
  v_kind text;
  v_qa boolean;
begin
  if new.created_at < now() - interval '60 days' or new.created_at > now() then return new; end if;
  v_kind := iskra_private.stata_event_kind(new.event, new.meta);
  if v_kind is null and new.user_id is null then return new; end if;
  v_qa := public.stata_iskra_automated(new.event, new.meta, new.ua);
  if v_kind is not null then
    insert into iskra_private.stata_events(event_id, created_at, user_id, session_id, event, kind, qa)
    values (new.id, new.created_at, new.user_id, new.session_id, new.event, v_kind, v_qa)
    on conflict (event_id) do nothing;
  end if;
  if new.user_id is not null and not v_qa then
    insert into iskra_private.stata_user_seen(user_id, event_id, last_seen)
    values (new.user_id, new.id, new.created_at)
    on conflict (user_id) do update set event_id = excluded.event_id, last_seen = excluded.last_seen
      where iskra_private.stata_user_seen.last_seen < excluded.last_seen;
  end if;
  return new;
exception when others then
  -- Сбой кэша статистики никогда не должен ронять запись события.
  return new;
end;
$$;
revoke all on function iskra_private.capture_stata_event() from public, anon, authenticated;

create or replace trigger stata_rollup_capture
after insert on public.analytics_events
for each row execute function iskra_private.capture_stata_event();
