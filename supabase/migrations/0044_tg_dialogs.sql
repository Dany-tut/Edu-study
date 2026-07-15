-- 0044_tg_dialogs.sql
-- Двусторонняя переписка с ботом в Админке (вкладка «Заявки» → «Диалоги»).
-- Входящие пишет Edge Function tg-webhook (под service_role, минуя RLS),
-- ответы админа шлёт tg-reply. Клиент (админ) только читает и обновляет статус.

create table if not exists public.tg_threads (
  id                uuid primary key default gen_random_uuid(),
  chat_id           bigint not null unique,          -- telegram chat id
  username          text,
  first_name        text,
  last_name         text,
  status            text not null default 'new' check (status in ('new','in_progress','done')),
  last_message_text text,
  last_message_at   timestamptz,
  last_in_at        timestamptz,                      -- последнее входящее (для «непрочитано»)
  admin_seen_at     timestamptz,                      -- когда админ последний раз открывал тред
  created_at        timestamptz not null default now()
);

create table if not exists public.tg_messages (
  id            uuid primary key default gen_random_uuid(),
  thread_id     uuid not null references public.tg_threads(id) on delete cascade,
  direction     text not null check (direction in ('in','out')),
  text          text not null,
  tg_message_id bigint,
  created_at    timestamptz not null default now()
);

create index if not exists tg_messages_thread_idx on public.tg_messages (thread_id, created_at);
create index if not exists tg_threads_last_idx     on public.tg_threads (last_message_at desc);

alter table public.tg_threads  enable row level security;
alter table public.tg_messages enable row level security;

-- Только админ читает; вставку делают Edge-функции под service_role (минуя RLS).
drop policy if exists tg_threads_admin_read   on public.tg_threads;
drop policy if exists tg_threads_admin_update on public.tg_threads;
drop policy if exists tg_messages_admin_read  on public.tg_messages;

create policy tg_threads_admin_read   on public.tg_threads  for select to authenticated using (public.is_admin());
create policy tg_threads_admin_update on public.tg_threads  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy tg_messages_admin_read  on public.tg_messages  for select to authenticated using (public.is_admin());

-- Realtime: живое обновление диалогов в админке.
do $$
begin
  begin execute 'alter publication supabase_realtime add table public.tg_threads';  exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.tg_messages'; exception when duplicate_object then null; end;
end $$;
