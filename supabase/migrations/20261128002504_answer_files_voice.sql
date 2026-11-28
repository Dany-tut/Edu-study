-- Ответ голосом в развёрнутом задании (lib/answerVoice.ts, Figma стр. 29).
--
-- Ученик диктует ответ, отправляется текст, а запись прикладывается учителю.
-- Записи лежат в том же приватном бакете, что и файлы ответа
-- (20261126150000): те же папки <uid>/<students.id>/, те же политики чтения
-- (ученик, автор карточки, владелец группы, админ). task-media не подходит —
-- его читает любой вошедший.
--
-- Меняется только список разрешённых типов: к прежним добавляются аудио.
-- Аддитивно: ни один прежний тип не убирается, файлы и политики не трогаются.

update storage.buckets
set allowed_mime_types = (
  select array_agg(distinct m order by m)
  from unnest(coalesce(allowed_mime_types, '{}'::text[])
    || array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/aac', 'audio/wav']) as m
)
where id = 'homework-answer-files';

-- ОТКАТ (только если аудиозаписей в бакете нет):
-- update storage.buckets set allowed_mime_types = array(
--   select m from unnest(allowed_mime_types) m where m not like 'audio/%')
-- where id = 'homework-answer-files';
