-- Подключаемые модули учителя. Первый — Тестли: учитель вводит код из Тестли
-- (Профиль → Модули), функция testly-bridge меняет его на ключ и дальше по
-- ключу читает список тестов. Пока модуль не подключён, ни одной кнопки
-- «Из Тестли» в кабинете нет.
--
-- ДВЕ ТАБЛИЦЫ, А НЕ ОДНА. Строку модуля учитель читает сам — по ней кабинет
-- решает, показывать ли кнопки, и рисует «dillattd@… · 24 теста». Ключ к
-- чужому сервису в браузер не уходит никогда, поэтому лежит отдельно, в
-- таблице без единой политики: её видит только service role функции.
create table public.teacher_modules (
  teacher_id uuid not null references auth.users on delete cascade,
  module text not null check (module in ('testly')),
  -- что показать в карточке модуля: { email, tests }
  meta jsonb not null default '{}',
  connected_at timestamptz not null default now(),
  primary key (teacher_id, module)
);

alter table public.teacher_modules enable row level security;
create policy "teacher reads own modules" on public.teacher_modules
  for select to authenticated using (teacher_id = (select auth.uid()));
-- Пишет только testly-bridge: подключить можно лишь кодом, проверенным на сервере.

create table public.teacher_module_secrets (
  teacher_id uuid not null,
  module text not null,
  token text not null,
  primary key (teacher_id, module),
  foreign key (teacher_id, module) references public.teacher_modules on delete cascade
);

alter table public.teacher_module_secrets enable row level security;
revoke all on public.teacher_module_secrets from anon, authenticated;
