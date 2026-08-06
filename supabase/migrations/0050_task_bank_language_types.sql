-- ─────────────────────────────────────────────────────────────────────────────
-- Банк заданий: языковые типы ответа + необязательная экзаменационная разметка
--
-- ЗАЧЕМ. Банк заданий проектировался под ЕГЭ, и это зашито в схему двумя
-- способами:
--
--   1) CHECK на answer_type перечисляет семь «предметных» типов. Языковых
--      (диктант, сборка предложения, минимальные пары, запись голоса, описание
--      картинки, карточка) в нём нет, поэтому такое задание не сохранялось —
--      интерфейс их уже показывает, а вставка падала с ошибкой.
--
--   2) section, topic, part, line объявлены NOT NULL. Это разметка ЕГЭ:
--      «раздел → тема → часть → линия». У языкового задания её не существует,
--      и подставлять туда выдуманные значения — значит засорять фильтры
--      мусором, который потом придётся вычищать.
--
-- ЧТО ДЕЛАЕМ. Расширяем список типов и снимаем NOT NULL с четырёх колонок
-- разметки. Существующие строки не трогаем: у них значения остаются на месте,
-- ограничение снимается только на будущее.
--
-- ОБРАТНАЯ СОВМЕСТИМОСТЬ. В списке типов сохранён легаси-'short': так в базе
-- записан тип «вписать ответ» у старых заданий (в коде он давно 'fill', см.
-- normalizeTaskType). Убрать его сейчас — сломать чтение старых строк.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Типы ответа: прежние семь + легаси + языковые.
alter table public.task_bank
  drop constraint if exists task_bank_answer_type_check;

alter table public.task_bank
  add constraint task_bank_answer_type_check check (
    answer_type is null or answer_type in (
      -- предметные (как было)
      'single', 'multi', 'fill', 'matching', 'sequence', 'tableFill', 'extended', 'whiteboard',
      -- легаси-написание «вписать ответ» в старых строках
      'short',
      -- языковые
      'wordBank', 'listenType', 'listenBank', 'minimalPair',
      'speaking', 'imageDescribe', 'imageCompare', 'flashcard'
    )
  );

-- 2. Экзаменационная разметка становится необязательной.
--    У языкового задания нет ни раздела ЕГЭ, ни части, ни линии.
alter table public.task_bank alter column section drop not null;
alter table public.task_bank alter column topic   drop not null;
alter table public.task_bank alter column part    drop not null;
alter table public.task_bank alter column line    drop not null;

comment on column public.task_bank.section is
  'Раздел кодификатора. Только у экзаменационных предметов; у языков null.';
comment on column public.task_bank.topic is
  'Тема кодификатора. Только у экзаменационных предметов; у языков null.';
comment on column public.task_bank.part is
  'Часть экзамена (1 или 2). Только у экзаменационных предметов; у языков null.';
comment on column public.task_bank.line is
  'Номер линии в экзамене. Только у экзаменационных предметов; у языков null.';
