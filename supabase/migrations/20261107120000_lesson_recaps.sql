-- Итоги урока из расшифровки: черновик и заметка учителю.
--
-- ЗАЧЕМ ОТДЕЛЬНЫЕ ТАБЛИЦЫ, А НЕ lessons.content. Ученик загружает content урока
-- целиком (src/lib/db.ts, fetchLessonsHeavy: short_id, content, homework). Всё,
-- что лежит там, уже у него в браузере, даже если интерфейс это прячет. Черновик
-- итогов и особенно заметка о том, где ученик путался, живут здесь, под RLS
-- владельца. В урок попадает только то, что учитель сам применил, — клиентом,
-- обычным сохранением урока.
--
-- Пишет черновик Edge Function lesson-recap (service_role): проверяет флаги,
-- владельца урока, дневной лимит и считает таймкоды по сегментам расшифровки.
-- Клиент только читает свой черновик, правит его текст и отмечает публикацию.

create table if not exists public.lesson_recaps (
  id              uuid primary key default gen_random_uuid(),
  lesson_id       uuid not null references public.lessons(id) on delete cascade,
  teacher_id      uuid not null references auth.users(id) on delete cascade,
  -- Повторный запуск по той же расшифровке отдаёт сохранённый черновик.
  transcript_hash text not null,
  -- Что собирали: summary, questions, cards, hw, note.
  kinds           text[] not null,
  status          text not null default 'queued'
                  check (status in ('queued', 'running', 'ready', 'failed', 'published', 'discarded')),
  -- RecapDraft (src/lib/lessonRecap.ts). Правки учителя пишутся сюда же.
  draft           jsonb,
  -- Что и куда разложено — для «Отменить».
  published       jsonb,
  model           text,
  input_tokens    int,
  output_tokens   int,
  cost_usd        numeric(8, 4),
  -- Код ошибки, не сырой ответ провайдера.
  error_code      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists lesson_recaps_lesson_idx on public.lesson_recaps (lesson_id, created_at desc);
-- Дневной лимит считается по учителю и времени создания.
create index if not exists lesson_recaps_teacher_idx on public.lesson_recaps (teacher_id, created_at desc);

drop trigger if exists lesson_recaps_updated_at on public.lesson_recaps;
create trigger lesson_recaps_updated_at before update on public.lesson_recaps
  for each row execute function public.set_updated_at();

alter table public.lesson_recaps enable row level security;
revoke all on public.lesson_recaps from anon;

-- Читает и правит только автор. Вставляет строку функция (service_role), поэтому
-- у учителя нет insert: иначе он мог бы записать «готовый» черновик в обход
-- лимита и проверок.
drop policy if exists lesson_recaps_owner_read on public.lesson_recaps;
create policy lesson_recaps_owner_read on public.lesson_recaps for select to authenticated
  using (teacher_id = (select auth.uid()));
drop policy if exists lesson_recaps_owner_update on public.lesson_recaps;
create policy lesson_recaps_owner_update on public.lesson_recaps for update to authenticated
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()));
revoke insert, delete on public.lesson_recaps from authenticated;
-- Цену, модель и хэш расшифровки учитель не переписывает: только текст и статус.
revoke update on public.lesson_recaps from authenticated;
grant update (draft, status, published) on public.lesson_recaps to authenticated;

-- Заметка учителю: где путались, что спрашивали, что не успели. Одна на урок
-- (на групповом — одна на группу, student_id = null). Никогда не попадает в
-- lessons: ученик не должен иметь к ней доступа ни в каком виде.
create table if not exists public.lesson_teacher_notes (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  lesson_id  uuid not null references public.lessons(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  -- Пункты заметки с таймкодами: [{ kind, text, count?, at: number[] }].
  body       jsonb not null,
  recap_id   uuid references public.lesson_recaps(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists lesson_teacher_notes_lesson_idx on public.lesson_teacher_notes (lesson_id, created_at desc);
create index if not exists lesson_teacher_notes_teacher_idx on public.lesson_teacher_notes (teacher_id);

alter table public.lesson_teacher_notes enable row level security;
revoke all on public.lesson_teacher_notes from anon;

-- Писать заметку можно только к своему уроку: урок курса, который создал учитель.
drop policy if exists lesson_teacher_notes_owner on public.lesson_teacher_notes;
create policy lesson_teacher_notes_owner on public.lesson_teacher_notes for all to authenticated
  using (teacher_id = (select auth.uid()))
  with check (
    teacher_id = (select auth.uid())
    and exists (select 1 from public.lessons l join public.courses c on c.id = l.course_id
                where l.id = lesson_teacher_notes.lesson_id and c.created_by = (select auth.uid()))
  );

-- Рубильник. Префикс ai_ — Админка → «Расход на ИИ» рисует его переключателем
-- сама. Выключен: кнопки «Итоги урока» нет нигде, функция отвечает 409.
insert into public.app_flags (key, enabled, about) values
  ('ai_lesson_recap', false,
   'Итоги урока из расшифровки: конспект, вопросы, карточки, черновик ДЗ и заметка учителю по записи урока. Выключено: кнопки «Итоги урока» нет ни во вкладке «Запись», ни в окне монтажа.')
on conflict (key) do nothing;
