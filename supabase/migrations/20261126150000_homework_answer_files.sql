-- Файлы в ответе на сложное (практическое) задание: XLSX, PDF, DOCX, CSV, ZIP…
--
-- Решение Дани (26.11.2026): практические задания курсов сдаются заполненным
-- файлом. Файл лежит здесь, в JSONB решения (lesson_progress.attachments →
-- tasks[].solutions[].files) — только путь и подпись (src/lib/answerFiles.ts).
--
-- ТОЛЬКО ДОБАВЛЕНИЕ: новый бакет, новая функция, три новые политики. Ни одна
-- существующая строка, политика или бакет не меняются и не удаляются.
--
-- Путь объекта: <auth uid ученика>/<students.id карточки>/<мс>-<uuid>.<ext>
-- (как у homework-photos, 20261030140111). uid — запись проверяется без
-- запросов; id карточки — читает учитель ЭТОЙ карточки, а не каждый, кто ведёт
-- того же человека по другому предмету (карточки-сиблинги делят auth_user_id).
--
-- Кто читает (как политики lesson_progress, где лежит само решение):
--   • загрузивший ученик;
--   • автор карточки (students.created_by) — сюда входят покупатели курса
--     площадки (source='purchase', group_id NULL, created_by = автор курса);
--   • владелец группы карточки (groups.created_by);
--   • админ.
-- task-media (0049) для этого не годится: его читает любой вошедший.
--
-- Срока хранения нет: это работа ученика, а не фото (у фото 7 дней — П3).
-- UPDATE не даём никому: сдача — документ, подменять задним числом нельзя.
-- DELETE — только загрузивший (снял файл в черновике до отправки).
-- Поверх всего действует ограничительная политика mfa_required (20261105200000).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'homework-answer-files', 'homework-answer-files', false, 20971520,  -- 20 МБ / файл
  array[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.oasis.opendocument.spreadsheet',
    'text/csv',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.oasis.opendocument.text',
    'application/rtf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'application/zip'
  ]
)
on conflict (id) do nothing;

create schema if not exists private;
grant usage on schema private to authenticated;

-- Может ли вошедший читать объект <uid>/<student_id>/…: SECURITY DEFINER —
-- students и groups читаются в обход их RLS, но только по этой одной строке.
create or replace function private.can_read_answer_file(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and (
    (storage.foldername(p_name))[1] = (select auth.uid())::text
    or public.is_admin()
    or exists (
      select 1 from public.students s
      where s.id::text = (storage.foldername(p_name))[2]
        and s.auth_user_id::text = (storage.foldername(p_name))[1]
        and (
          s.created_by = (select auth.uid())
          or exists (select 1 from public.groups g where g.id = s.group_id and g.created_by = (select auth.uid()))
        )
    )
  );
$$;
revoke all on function private.can_read_answer_file(text) from public, anon;
grant execute on function private.can_read_answer_file(text) to authenticated;

-- Пишет ученик только в свою папку и только за свою карточку.
drop policy if exists "answer_files student insert" on storage.objects;
create policy "answer_files student insert" on storage.objects
for insert to authenticated with check (
  bucket_id = 'homework-answer-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] = any (select unnest(public.my_student_ids())::text)
);

drop policy if exists "answer_files read" on storage.objects;
create policy "answer_files read" on storage.objects
for select to authenticated using (
  bucket_id = 'homework-answer-files'
  and private.can_read_answer_file(name)
);

drop policy if exists "answer_files owner delete" on storage.objects;
create policy "answer_files owner delete" on storage.objects
for delete to authenticated using (
  bucket_id = 'homework-answer-files'
  and owner_id = (select auth.uid())::text
);

-- ОТКАТ (только если бакет пуст — файлы учеников не удалять):
-- drop policy if exists "answer_files student insert" on storage.objects;
-- drop policy if exists "answer_files read" on storage.objects;
-- drop policy if exists "answer_files owner delete" on storage.objects;
-- drop function if exists private.can_read_answer_file(text);
-- delete from storage.buckets where id = 'homework-answer-files'
--   and not exists (select 1 from storage.objects where bucket_id = 'homework-answer-files');
