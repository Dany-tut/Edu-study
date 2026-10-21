-- Журнал «Не смог сказать»: фразы, на которых разговор сорвался на родной язык.
--
-- ЗАЧЕМ. Переход с русского на изучаемый язык дома ломается не на грамматике,
-- а на конкретных репликах: «я пошёл работать», «передай соль», «мы ещё не
-- решили, отдавать ли паспорт». Каждая такая реплика — готовая карточка, если
-- её записать в момент срыва и разобрать потом. Колода (review_cards) для этого
-- не годится: строка там требует ответ на изучаемом языке, а его в момент
-- записи ещё нет.
--
-- ЖИЗНЬ ЗАПИСИ. ru пишется сразу; en появляется позже — руками или подсказкой
-- модели (функция phrase-help); когда фраза ушла в «Мои слова», ставится
-- done_at. Строку не удаляем: список закрытых — это и есть видимый прогресс.
--
-- ТОЛЬКО ДЛЯ ВОШЕДШИХ. У гостя журнала нет: анонимные политики колоды пускают
-- любого с непустой меткой, и тащить ту же дыру в новую таблицу незачем.
-- student_id текстом — тем же типом, что в review_cards.

create table if not exists public.phrase_gaps (
  id          uuid primary key default gen_random_uuid(),
  student_id  text not null,
  lang        text not null,
  ru          text not null check (length(btrim(ru)) between 1 and 500),
  en          text,
  note        text,
  created_at  timestamptz not null default now(),
  done_at     timestamptz
);

create index if not exists phrase_gaps_student_lang_idx
  on public.phrase_gaps (student_id, lang, created_at desc);

alter table public.phrase_gaps enable row level security;

drop policy if exists phrase_gaps_own on public.phrase_gaps;
create policy phrase_gaps_own on public.phrase_gaps
  for all to authenticated
  using (
    public.is_staff() or exists (
      select 1 from public.students s
      where s.id::text = phrase_gaps.student_id and s.auth_user_id = (select auth.uid())
    )
  )
  with check (
    public.is_staff() or exists (
      select 1 from public.students s
      where s.id::text = phrase_gaps.student_id and s.auth_user_id = (select auth.uid())
    )
  );

-- Рубильник подсказки «Как сказать?». Префикс ai_ — строка в Админке → Обзор →
-- «Расход на ИИ»; работает при поднятых ai_enabled и своём флаге. Выключено —
-- журнал живёт как прежде, английский вписывают руками.
insert into public.app_flags (key, enabled, about) values
  ('ai_phrase_help', true,
   'Подсказка «Как сказать?» в журнале «Не смог сказать»: модель предлагает 1–3 живых варианта фразы. Выключено: перевод вписывают руками.')
on conflict (key) do nothing;
