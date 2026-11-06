-- Сортировка обратной связи.
--
-- ЗАЧЕМ. Обращения приходят двумя путями — форма «Обратная связь»
-- (feedback_requests) и бот в Telegram (tg_messages) — и до сих пор лежали
-- лентой. Чтобы видеть, что болит чаще всего, у каждого обращения должны быть
-- тип и экран, а похожие должны собираться в одну тему со счётчиком.
--
-- КАК УСТРОЕНО.
--   • feedback_items — одно обращение из любого источника. Строку заводит
--     триггер, без модели и без флага: это бесплатно и ничего не ломает.
--   • Модель (Edge Function feedback-triage, kie.ai) раз в 10 минут берёт
--     строки в состоянии pending, ставит тип, экран и тему. Только за флагами
--     ai_enabled + ai_feedback_triage. Без них строки просто ждут, а вкладка
--     «Заявки» работает как раньше.
--   • feedback_topics — темы. Счётчик не хранится, а считается по строкам:
--     денормализованный счётчик разъехался бы при первой ручной правке.
--   • Ручная правка (тип, экран, тема) помечается *_by = 'admin', и модель её
--     больше не трогает.
--   • feedback_digests — недельная сводка «что болит чаще всего».
--
-- ЧЕГО ЗДЕСЬ НЕТ. Ключей: ключ шлюза ИИ и (необязательный) токен Sentry живут
-- в секретах функции. Секрет cron — тот же analytics_digest_secret в Vault,
-- что у разбора аналитики (0073).

-- ── 1. Темы ──────────────────────────────────────────────────────────────────
create table if not exists public.feedback_topics (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('bug','question','wish','payment','access')),
  screen      text not null default 'Другое',
  title       text not null check (length(title) between 1 and 200),
  summary     text,
  status      text not null default 'open' check (status in ('open','closed')),
  -- Кто завёл или последним поправил: правка админа не перезаписывается.
  source      text not null default 'model' check (source in ('model','admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── 2. Обращения ─────────────────────────────────────────────────────────────
create table if not exists public.feedback_items (
  id                  uuid primary key default gen_random_uuid(),
  source              text not null check (source in ('form','telegram')),
  feedback_id         uuid unique references public.feedback_requests(id) on delete cascade,
  tg_thread_id        uuid references public.tg_threads(id) on delete cascade,
  -- Обращение из Telegram — это серия входящих подряд (до 6 часов тишины):
  -- «у меня не открывается» + «вот скрин» + «на телефоне» — одно обращение.
  tg_first_message_id uuid unique references public.tg_messages(id) on delete cascade,
  author_label        text,
  -- Раздел, который выбрал сам человек в форме. Модели — подсказка, не ответ.
  section             text,
  body                text not null,
  created_at          timestamptz not null default now(),
  last_at             timestamptz not null default now(),
  kind                text check (kind in ('bug','question','wish','payment','access')),
  screen              text,
  topic_id            uuid references public.feedback_topics(id) on delete set null,
  kind_by             text check (kind_by in ('model','admin')),
  topic_by            text check (topic_by in ('model','admin')),
  triage_state        text not null default 'pending' check (triage_state in ('pending','done','failed')),
  triage_attempts     int  not null default 0,
  triage_error        text,
  triaged_at          timestamptz,
  model               text,
  check ((source = 'form') = (feedback_id is not null)),
  check ((source = 'telegram') = (tg_thread_id is not null))
);

create index if not exists feedback_items_pending_idx on public.feedback_items (created_at) where triage_state = 'pending';
create index if not exists feedback_items_topic_idx   on public.feedback_items (topic_id);
create index if not exists feedback_items_created_idx on public.feedback_items (created_at desc);
create index if not exists feedback_items_thread_idx  on public.feedback_items (tg_thread_id, last_at desc);

-- ── 3. Недельные сводки ──────────────────────────────────────────────────────
create table if not exists public.feedback_digests (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  period_days  int  not null,
  model        text not null,
  body         text not null,
  -- Сводка, по которой написан текст, включая выдержку из Sentry: без неё
  -- выводы нечем проверить.
  stats        jsonb not null,
  tokens_in    int,
  tokens_out   int
);
create index if not exists feedback_digests_created_idx on public.feedback_digests (created_at desc);

-- ── 4. Доступ ────────────────────────────────────────────────────────────────
-- Читает только админ. Пишут триггеры, функция под service_role и RPC ниже —
-- прямых политик на запись нет намеренно.
alter table public.feedback_topics  enable row level security;
alter table public.feedback_items   enable row level security;
alter table public.feedback_digests enable row level security;

drop policy if exists feedback_topics_admin_read  on public.feedback_topics;
drop policy if exists feedback_items_admin_read   on public.feedback_items;
drop policy if exists feedback_digests_admin_read on public.feedback_digests;
create policy feedback_topics_admin_read  on public.feedback_topics  for select to authenticated using (public.is_admin());
create policy feedback_items_admin_read   on public.feedback_items   for select to authenticated using (public.is_admin());
create policy feedback_digests_admin_read on public.feedback_digests for select to authenticated using (public.is_admin());

-- ── 5. Обращение из формы ────────────────────────────────────────────────────
-- Заявки с лендинга (author_role = 'lead') сюда не идут: это запрос на
-- подключение, а не сигнал о том, что болит, — они перекосили бы сводку.
create or replace function public.feedback_items_from_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.author_role = 'lead' then return new; end if;
  insert into feedback_items (source, feedback_id, author_label, section, body, created_at, last_at)
  values ('form', new.id,
          coalesce(nullif(trim(new.author_name), ''), case new.author_role when 'teacher' then 'Учитель' else 'Ученик' end),
          nullif(trim(new.section), ''), left(new.message, 4000), new.created_at, new.created_at)
  on conflict (feedback_id) do nothing;
  return new;
exception when others then
  -- Сортировка не имеет права отклонить само обращение.
  return new;
end; $$;

drop trigger if exists feedback_items_from_request on public.feedback_requests;
create trigger feedback_items_from_request
  after insert on public.feedback_requests
  for each row execute function public.feedback_items_from_request();

-- ── 6. Обращение из Telegram ─────────────────────────────────────────────────
-- Команды бота (/start) обращениями не считаются.
create or replace function public.feedback_items_from_tg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cur  feedback_items%rowtype;
  who  text;
begin
  if new.direction <> 'in' or new.text ~ '^\s*/' or length(trim(new.text)) = 0 then return new; end if;

  select * into cur from feedback_items
  where tg_thread_id = new.thread_id
  order by last_at desc limit 1;

  if found and cur.last_at > new.created_at - interval '6 hours' then
    update feedback_items
       set body = left(body || E'\n' || new.text, 4000), last_at = new.created_at
     where id = cur.id;
    return new;
  end if;

  select coalesce('@' || nullif(username, ''), nullif(trim(concat_ws(' ', first_name, last_name)), ''), 'Telegram')
    into who from tg_threads where id = new.thread_id;

  insert into feedback_items (source, tg_thread_id, tg_first_message_id, author_label, body, created_at, last_at)
  values ('telegram', new.thread_id, new.id, who, left(new.text, 4000), new.created_at, new.created_at)
  on conflict (tg_first_message_id) do nothing;
  return new;
exception when others then
  return new;
end; $$;

drop trigger if exists feedback_items_from_tg on public.tg_messages;
create trigger feedback_items_from_tg
  after insert on public.tg_messages
  for each row execute function public.feedback_items_from_tg();

revoke all on function public.feedback_items_from_request() from public, anon, authenticated;
revoke all on function public.feedback_items_from_tg()      from public, anon, authenticated;

-- ── 7. Уже пришедшие обращения ───────────────────────────────────────────────
insert into public.feedback_items (source, feedback_id, author_label, section, body, created_at, last_at)
select 'form', r.id,
       coalesce(nullif(trim(r.author_name), ''), case r.author_role when 'teacher' then 'Учитель' else 'Ученик' end),
       nullif(trim(r.section), ''), left(r.message, 4000), r.created_at, r.created_at
from public.feedback_requests r
where r.author_role <> 'lead'
on conflict (feedback_id) do nothing;

with m as (
  select t.*,
         case when t.created_at - lag(t.created_at) over (partition by t.thread_id order by t.created_at)
                   < interval '6 hours' then 0 else 1 end as brk
  from public.tg_messages t
  where t.direction = 'in' and t.text !~ '^\s*/' and length(trim(t.text)) > 0
), g as (
  select m.*, sum(brk) over (partition by thread_id order by created_at) as grp from m
)
insert into public.feedback_items (source, tg_thread_id, tg_first_message_id, author_label, body, created_at, last_at)
select 'telegram', g.thread_id,
       (array_agg(g.id order by g.created_at))[1],
       coalesce('@' || nullif(th.username, ''), nullif(trim(concat_ws(' ', th.first_name, th.last_name)), ''), 'Telegram'),
       left(string_agg(g.text, E'\n' order by g.created_at), 4000),
       min(g.created_at), max(g.created_at)
from g join public.tg_threads th on th.id = g.thread_id
group by g.thread_id, g.grp, th.username, th.first_name, th.last_name
on conflict (tg_first_message_id) do nothing;

-- ── 8. Ручная правка ─────────────────────────────────────────────────────────
-- Тип и экран обращения. Ручная правка = разобрано: модель к строке больше не
-- вернётся, пока админ сам не попросит «разобрать заново».
create or replace function public.admin_feedback_item_classify(p_item uuid, p_kind text, p_screen text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_kind is not null and p_kind not in ('bug','question','wish','payment','access') then
    raise exception 'unknown kind %', p_kind;
  end if;
  update feedback_items
     set kind        = coalesce(p_kind, kind),
         screen      = coalesce(nullif(left(trim(p_screen), 60), ''), screen),
         kind_by     = 'admin',
         triage_state = 'done',
         triage_error = null,
         triaged_at  = coalesce(triaged_at, now())
   where id = p_item;
end; $$;

-- Перенести обращение в тему: существующую (p_topic), новую (p_new_title) или
-- никуда (оба null). Возвращает id темы.
create or replace function public.admin_feedback_item_move(p_item uuid, p_topic uuid, p_new_title text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  it    feedback_items%rowtype;
  topic uuid := p_topic;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select * into it from feedback_items where id = p_item;
  if not found then raise exception 'not found'; end if;

  if topic is null and nullif(trim(p_new_title), '') is not null then
    insert into feedback_topics (kind, screen, title, source)
    values (coalesce(it.kind, 'bug'), coalesce(it.screen, 'Другое'), left(trim(p_new_title), 200), 'admin')
    returning id into topic;
  end if;

  update feedback_items
     set topic_id = topic, topic_by = 'admin', triage_state = 'done', triage_error = null,
         triaged_at = coalesce(triaged_at, now())
   where id = p_item;
  if topic is not null then update feedback_topics set updated_at = now() where id = topic; end if;
  return topic;
end; $$;

create or replace function public.admin_feedback_topic_update(
  p_topic uuid, p_title text default null, p_kind text default null,
  p_screen text default null, p_status text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_kind is not null and p_kind not in ('bug','question','wish','payment','access') then
    raise exception 'unknown kind %', p_kind;
  end if;
  if p_status is not null and p_status not in ('open','closed') then
    raise exception 'unknown status %', p_status;
  end if;
  update feedback_topics
     set title      = coalesce(nullif(left(trim(p_title), 200), ''), title),
         kind       = coalesce(p_kind, kind),
         screen     = coalesce(nullif(left(trim(p_screen), 60), ''), screen),
         status     = coalesce(p_status, status),
         source     = 'admin',
         updated_at = now()
   where id = p_topic;
end; $$;

-- Склеить две темы: обращения переезжают, пустая тема удаляется.
create or replace function public.admin_feedback_topic_merge(p_from uuid, p_into uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_from = p_into then return; end if;
  if not exists (select 1 from feedback_topics where id = p_into) then raise exception 'not found'; end if;
  update feedback_items set topic_id = p_into, topic_by = 'admin' where topic_id = p_from;
  delete from feedback_topics where id = p_from;
  update feedback_topics set updated_at = now(), source = 'admin' where id = p_into;
end; $$;

-- Вернуть обращение модели. Ручные поля при этом сбрасываются — иначе
-- «разобрать заново» ничего бы не меняло.
create or replace function public.admin_feedback_item_retriage(p_item uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update feedback_items
     set triage_state = 'pending', triage_attempts = 0, triage_error = null,
         kind_by = null, topic_by = null
   where id = p_item;
end; $$;

revoke all on function public.admin_feedback_item_classify(uuid, text, text)            from public, anon;
revoke all on function public.admin_feedback_item_move(uuid, uuid, text)                from public, anon;
revoke all on function public.admin_feedback_topic_update(uuid, text, text, text, text) from public, anon;
revoke all on function public.admin_feedback_topic_merge(uuid, uuid)                    from public, anon;
revoke all on function public.admin_feedback_item_retriage(uuid)                        from public, anon;
grant execute on function public.admin_feedback_item_classify(uuid, text, text)            to authenticated;
grant execute on function public.admin_feedback_item_move(uuid, uuid, text)                to authenticated;
grant execute on function public.admin_feedback_topic_update(uuid, text, text, text, text) to authenticated;
grant execute on function public.admin_feedback_topic_merge(uuid, uuid)                    to authenticated;
grant execute on function public.admin_feedback_item_retriage(uuid)                        to authenticated;

-- ── 9. Сводка для недельного разбора ─────────────────────────────────────────
-- Один jsonb: темы, активные за период, с числом обращений сейчас и в прошлом
-- периоде, примерами, и собственные ошибки фронта за тот же срок. Выдержку из
-- Sentry добавляет функция — ключ Sentry в базу не попадает.
create or replace function public.admin_feedback_digest_input(p_days int default 7)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d      int := greatest(1, least(p_days, 60));
  since  timestamptz := now() - make_interval(days => d);
  prev   timestamptz := now() - make_interval(days => 2 * d);
  result jsonb;
begin
  -- Зовут двое: админ из кабинета и функция под service_role (auth.uid() пуст).
  if auth.uid() is not null and not public.is_admin() then raise exception 'forbidden'; end if;

  with period as (
    select * from feedback_items where last_at > since
  ), topics as (
    select t.id, t.title, t.kind, t.screen, t.summary, t.status,
           count(*) filter (where i.last_at > since)                        as in_period,
           count(*) filter (where i.last_at > prev and i.last_at <= since)  as prev_period,
           count(*)                                                         as total,
           min(i.created_at)::date                                          as first_seen,
           max(i.last_at)::date                                             as last_seen,
           (select jsonb_agg(x) from (
              select jsonb_build_object('source', e.source, 'section', e.section,
                                        'date', e.created_at::date, 'text', left(e.body, 280)) x
              from feedback_items e where e.topic_id = t.id and e.last_at > since
              order by e.last_at desc limit 3) s)                           as examples
    from feedback_topics t join feedback_items i on i.topic_id = t.id
    group by t.id
    having count(*) filter (where i.last_at > since) > 0
    order by in_period desc, total desc
    limit 25
  ), loose as (
    -- Разобранные, но без темы, и ещё не разобранные — тоже сигнал.
    select jsonb_build_object('kind', kind, 'screen', screen, 'state', triage_state,
                              'date', created_at::date, 'text', left(body, 200)) x
    from period where topic_id is null
    order by created_at desc limit 15
  ), errors as (
    select coalesce(meta->>'msg', '') msg, path, count(*) n, max(created_at)::date last_seen
    from analytics_events
    where event in ('js_error','promise_rejection','react_crash','widget_crash','db_error','operation_failed')
      and created_at > since
    group by 1, 2 order by 3 desc limit 15
  )
  select jsonb_build_object(
    'period_days',  d,
    'generated_at', now(),
    'totals', jsonb_build_object(
      'items',      (select count(*) from period),
      'prev_items', (select count(*) from feedback_items where last_at > prev and last_at <= since),
      'pending',    (select count(*) from feedback_items where triage_state = 'pending'),
      'by_kind',    coalesce((select jsonb_object_agg(k, n) from (select coalesce(kind, 'unknown') k, count(*) n from period group by 1) a), '{}'::jsonb),
      'by_screen',  coalesce((select jsonb_object_agg(k, n) from (select coalesce(screen, 'unknown') k, count(*) n from period group by 1) a), '{}'::jsonb),
      'by_source',  coalesce((select jsonb_object_agg(source, n) from (select source, count(*) n from period group by 1) a), '{}'::jsonb)),
    'topics',      coalesce((select jsonb_agg(to_jsonb(t)) from topics t), '[]'::jsonb),
    'untopicked',  coalesce((select jsonb_agg(x) from loose), '[]'::jsonb),
    'app_errors',  coalesce((select jsonb_agg(to_jsonb(e)) from errors e), '[]'::jsonb)
  ) into result;
  return result;
end; $$;

revoke all on function public.admin_feedback_digest_input(int) from public, anon;
grant execute on function public.admin_feedback_digest_input(int) to authenticated, service_role;

-- ── 10. Рубильник ────────────────────────────────────────────────────────────
-- Выключен по умолчанию: включает Дани в Администрирование → Обзор → «Расход на ИИ».
insert into public.app_flags (key, enabled, about) values
  ('ai_feedback_triage', false,
   'Сортировка обратной связи моделью: тип, экран и тема у каждого обращения из формы и Telegram, плюс сводка недели во вкладке «Заявки». Выключено: обращения копятся без разбора, тип и тему можно поставить руками.')
on conflict (key) do nothing;

-- ── 11. Расписание ───────────────────────────────────────────────────────────
-- Cron зовёт функцию, только когда есть что делать и оба флага подняты: пустой
-- вызов раз в 10 минут ничего не стоит, но и пользы от него нет. Сама функция
-- проверяет флаги ещё раз — по кнопке её запускают руками.
create extension if not exists pg_net;

create or replace function public.run_feedback_triage(p_mode text default 'classify')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  fn_url text := 'https://igsdwvwiqnozgwczzycx.supabase.co/functions/v1/feedback-triage';
  secret text;
begin
  if p_mode not in ('classify', 'digest') then raise exception 'unknown mode %', p_mode; end if;

  if exists (select 1 from app_flags
             where key in ('ai_enabled', 'ai_feedback_triage') and enabled is not true)
     or (select count(*) from app_flags where key in ('ai_enabled', 'ai_feedback_triage')) < 2 then
    return;
  end if;

  if p_mode = 'classify' and not exists (
       select 1 from feedback_items where triage_state = 'pending' and triage_attempts < 3) then
    return;
  end if;

  select decrypted_secret into secret
  from vault.decrypted_secrets where name = 'analytics_digest_secret' limit 1;
  if secret is null then
    raise notice 'analytics_digest_secret нет в Vault — сортировка пропущена';
    return;
  end if;

  perform net.http_post(
    url     := fn_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-digest-secret', secret),
    body    := jsonb_build_object('mode', p_mode, 'days', 7),
    timeout_milliseconds := 300000
  );
end; $$;

revoke all on function public.run_feedback_triage(text) from public, anon, authenticated;

select cron.unschedule('feedback-triage-classify')
where exists (select 1 from cron.job where jobname = 'feedback-triage-classify');
select cron.unschedule('feedback-triage-weekly')
where exists (select 1 from cron.job where jobname = 'feedback-triage-weekly');

select cron.schedule('feedback-triage-classify', '*/10 * * * *',
  $$select public.run_feedback_triage('classify')$$);
-- Понедельник, 06:00 UTC = 09:00 по Москве.
select cron.schedule('feedback-triage-weekly', '0 6 * * 1',
  $$select public.run_feedback_triage('digest')$$);
