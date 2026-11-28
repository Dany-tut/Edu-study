-- Ответы ученика в тренажёре банка ФИПИ (Дани 28.11: «надо сделать обязательно»).
-- До этого прогресс жил только в localStorage браузера: другое устройство или
-- очистка хранилища — и решённое пропадало.
--
-- Одна строка на (ученик, задание): state — то же, что FipiState в клиенте
-- (value, correct, got, max, date, first, attempts, revealed, at).
-- Запись — upsert по первичному ключу, повтор безопасен (SAVE-04).
--
-- Только добавляет таблицу; существующие данные не трогаются. История и
-- резервное копирование подхватывают новую public-таблицу сами.
create table if not exists public.trainer_answers (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id bigint not null references public.task_bank(id) on delete cascade,
  state jsonb not null check (jsonb_typeof(state) = 'object' and pg_column_size(state) < 8192),
  updated_at timestamptz not null default now(),
  primary key (user_id, task_id)
);
alter table public.trainer_answers enable row level security;
revoke all on public.trainer_answers from anon;
grant select, insert, update on public.trainer_answers to authenticated;

create policy trainer_answers_own on public.trainer_answers for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

do $$ begin
  if not exists(select 1 from pg_policy where polrelid='public.trainer_answers'::regclass and polname='mfa_required') then
    create policy mfa_required on public.trainer_answers as restrictive for all to authenticated
    using ((select public.mfa_ok())) with check ((select public.mfa_ok()));
  end if;
end $$;

create or replace function public.trainer_answers_touch() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end; $$;
drop trigger if exists trainer_answers_touch on public.trainer_answers;
create trigger trainer_answers_touch before update on public.trainer_answers
for each row execute function public.trainer_answers_touch();
