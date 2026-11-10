-- Маппинг внешних OAuth-личностей (Яндекс, ВКонтакте) на пользователя Supabase.
--
-- Supabase Auth нативно знает только свой список провайдеров (Google/Apple/…),
-- поэтому Яндекс и VK мы заводим сами через edge-функцию `social-oauth`
-- (service_role + admin API). Эта таблица — единственный надёжный способ
-- узнать ВЕРНУВШЕГОСЯ человека: email у провайдера может смениться или вовсе
-- не прийти (VK регистрируют по телефону), а id провайдера стабилен.
--
-- Линковка аккаунтов идёт в два шага: сперва ищем по (provider, provider_user_id)
-- здесь; если нет — по подтверждённому email заводим/находим auth-пользователя
-- и фиксируем связь сюда, чтобы в следующий раз найти без email.
create table if not exists public.oauth_identities (
  provider          text        not null check (provider in ('yandex', 'vk')),
  provider_user_id  text        not null,
  user_id           uuid        not null references auth.users (id) on delete cascade,
  email             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  primary key (provider, provider_user_id)
);

create index if not exists oauth_identities_user_id_idx
  on public.oauth_identities (user_id);

-- RLS включён без политик: к таблице обращается только edge-функция под
-- service_role (он минует RLS), а клиентам она не нужна и не видна.
-- Ср. [[reference-rls-true-policies]] — `USING (true)` здесь был бы дырой.
alter table public.oauth_identities enable row level security;
