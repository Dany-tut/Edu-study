-- Праздничные темы кабинета ученика (пока одна — Хэллоуин).
--
-- ЗАЧЕМ ОТДЕЛЬНАЯ ТАБЛИЦА, А НЕ app_flags. Флагу хватает «вкл/выкл», а теме
-- нужны даты (включается и выключается сама), вариант оформления и набор
-- частей. Строка на праздник: через год Хэллоуин — та же строка с новыми датами.
--
-- Тема видна, когда сейчас между starts_at и ends_at и enabled = true. Админ
-- может посмотреть её заранее «только у себя» — это флаг в браузере, не в базе.
-- Ученик выключает тему у себя в настройках (тоже браузер).
create table if not exists public.app_seasons (
  key text primary key,
  enabled boolean not null default true,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  -- Вариант оформления: lanterns «Ночь фонарей», candy «Сладость или гадость»,
  -- potions «Зельеварня». Макеты — Figma «Искра», страница «Хэллоуин 2026 · концепты».
  variant text not null default 'lanterns' check (variant in ('lanterns', 'candy', 'potions')),
  -- Что включать: hero (шапка и палитра), decor (3D-объекты на плитках),
  -- track (дорожка уроков), empty (привидение-листок в пустых днях).
  -- Нет ключа = включено.
  parts jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

insert into public.app_seasons (key, enabled, starts_at, ends_at, variant) values
  ('halloween', true, '2026-10-25 00:00+03', '2026-11-02 00:00+03', 'lanterns')
on conflict (key) do nothing;

alter table public.app_seasons enable row level security;

-- Читают все: тема решает, что рисовать, запрос уходит и до входа.
drop policy if exists app_seasons_read on public.app_seasons;
create policy app_seasons_read on public.app_seasons for select to anon, authenticated using (true);

-- Пишет админ: тема на весь продукт, как app_flags.
drop policy if exists app_seasons_write on public.app_seasons;
create policy app_seasons_write on public.app_seasons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
