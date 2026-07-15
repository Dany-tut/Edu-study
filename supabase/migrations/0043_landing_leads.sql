-- 0043_landing_leads.sql
-- Заявки с публичного лендинга падают в ту же таблицу feedback_requests
-- (вкладка «Заявки» в Админке). Добавляем роль 'lead' и колонку контакта.
-- section у лида = интересующий тариф, message = сообщение, author_name = имя.

alter table public.feedback_requests
  drop constraint if exists feedback_requests_author_role_check;

alter table public.feedback_requests
  add constraint feedback_requests_author_role_check
  check (author_role in ('teacher','student','lead'));

alter table public.feedback_requests
  add column if not exists contact text;  -- email / телефон / telegram лида

-- RLS уже разрешает INSERT роли anon (политика "feedback insert any") — лендинг
-- пишет под анонимным ключом, отдельная политика не нужна.
