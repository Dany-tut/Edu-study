-- ─── Обратная связь → «Заявки» в админке ─────────────────────────────────────
--
-- Ученики и учителя присылают сообщение об ошибке/пожелание: раздел (из списка
-- или вписанный вручную), текст, скриншоты (base64 в JSONB, как остальные
-- вложения — без Storage-бакетов). Всё падает сюда; читает и разбирает только
-- админ во вкладке «Заявки».
--
-- ВАЖНО: ученик работает под анонимной сессией (нет auth.uid()), учитель — под
-- auth. Поэтому author_id/author_name — обычные текстовые колонки (НЕ FK на
-- auth.users), а INSERT разрешён и роли anon, и authenticated.

create table if not exists public.feedback_requests (
  id           uuid primary key default gen_random_uuid(),
  author_role  text not null check (author_role in ('teacher','student')),
  author_id    text,                                 -- auth.uid() (учитель) или student_session.id (ученик)
  author_name  text,                                 -- для показа в админке
  section      text,                                 -- выбранный из списка ИЛИ вписанный вручную
  message      text not null,
  attachments  jsonb not null default '[]'::jsonb,   -- массив data-URL строк (base64 картинки)
  status       text not null default 'new' check (status in ('new','in_progress','done')),
  admin_note   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists feedback_requests_created_idx on public.feedback_requests (created_at desc);
create index if not exists feedback_requests_status_idx  on public.feedback_requests (status);

alter table public.feedback_requests enable row level security;

-- Вставлять может кто угодно (ученик-аноним + учитель-authenticated).
drop policy if exists "feedback insert any" on public.feedback_requests;
create policy "feedback insert any" on public.feedback_requests
  for insert to anon, authenticated with check (true);

-- Читать и менять статус — только админ (public.is_admin() из 0011_analytics.sql).
drop policy if exists "feedback admin read" on public.feedback_requests;
create policy "feedback admin read" on public.feedback_requests
  for select to authenticated using (public.is_admin());

drop policy if exists "feedback admin update" on public.feedback_requests;
create policy "feedback admin update" on public.feedback_requests
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
