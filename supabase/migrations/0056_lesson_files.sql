-- Файлы урока: рабочая тетрадь, конспект-PDF, справочные материалы.
--
-- До этой миграции прикрепить файл было некуда: оба редактора (Конструктор и
-- «Создать урок») запоминали только ИМЯ выбранного файла в черновике браузера,
-- а ученику плитки «скачать» отдавали PDF, сгенерированный на лету в JS.
--
-- Хранилище — бакет `lesson-materials` (он уже существовал пустым). Оставляем
-- его ПУБЛИЧНЫМ на чтение: часть учеников входит легаси-логином (RPC
-- student_login) и не имеет сессии Supabase Auth — приватный бакет им бы просто
-- не отдал файл. Путь содержит uuid, ссылка неугадываемая. Запись при этом
-- сужаем: раньше политика разрешала любому authenticated писать и УДАЛЯТЬ любой
-- объект бакета (то есть ученик мог снести материалы учителя).
--
-- Метаданные (имя, размер, mime, путь) едут в lessons.materials — колонка
-- существовала с самого начала и всё это время была пустой у всех 386 уроков.

update storage.buckets
   set file_size_limit = 26214400,  -- 25 MB / файл
       allowed_mime_types = array[
         'application/pdf',
         'application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.ms-powerpoint',
         'application/vnd.openxmlformats-officedocument.presentationml.presentation',
         'application/vnd.ms-excel',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
         'application/zip',
         'text/plain',
         'text/csv',
         'image/png',
         'image/jpeg',
         'image/webp',
         -- Файлы, у которых браузер не определил тип (старые .doc с флешки и т.п.).
         'application/octet-stream'
       ]
 where id = 'lesson-materials';

-- Чтение остаётся публичным (политика "read lesson-materials" уже есть).
-- Запись/удаление — только владелец объекта.
drop policy if exists "write lesson-materials" on storage.objects;
drop policy if exists "lesson_materials owner write" on storage.objects;
create policy "lesson_materials owner write" on storage.objects
  for all to authenticated
  using (bucket_id = 'lesson-materials' and owner = auth.uid())
  with check (bucket_id = 'lesson-materials' and owner = auth.uid());

comment on column lessons.materials is
  'Файлы урока: {"workbook": F|null, "notebook": F|null, "materials": [F]}, где F = {id, name, path, size, mime}. path — ключ объекта в бакете lesson-materials.';
