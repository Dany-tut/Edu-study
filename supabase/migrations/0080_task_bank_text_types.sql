-- Банк заданий принимает четыре новых типа (data/taskTypes.ts)
--
-- ЗАЧЕМ. CHECK на task_bank.answer_type перечисляет типы поимённо и потому
-- отстаёт от реестра при каждом пополнении — ровно та же история, что была в
-- 0064. Сейчас в реестр добавлены работа с текстом и системой: утверждения к
-- отрывку (trueFalse), пропуски с выпадающими списками (dropdownGap),
-- раскладка по именованным столбцам (columnSort) и внешнее упражнение в рамке
-- (embed). Внутри курса такое задание сохраняется нормально — там оно лежит в
-- JSONB без всякого CHECK, — а сохранение В БАНК падало бы с 23514, и для
-- учителя это выглядит как «сохраняется через раз».
--
-- Список пересобирается целиком: дописать значение в существующий CHECK нельзя,
-- его можно только заменить. Легаси-написания остаются — они ещё встречаются в
-- старых строках, а на чтении приводятся normalizeTaskType().
--
-- ЧТО МИГРАЦИЯ НЕ ДЕЛАЕТ. Не трогает данные: список только расширен, ни одна
-- существующая строка под него не подпадает иначе, чем раньше. Откат — вернуть
-- CHECK из 0064, и тогда задания четырёх новых типов перестанут сохраняться в
-- банк (уже сохранённые останутся лежать как есть).

alter table public.task_bank
  drop constraint if exists task_bank_answer_type_check;

alter table public.task_bank
  add constraint task_bank_answer_type_check check (
    answer_type is null or answer_type = any (array[
      -- базовые
      'single', 'multi', 'fill', 'extended', 'matching', 'sequence',
      'tableFill', 'whiteboard',
      -- языковые (0050, 0054)
      'wordBank', 'listenType', 'listenBank', 'minimalPair',
      'speaking', 'imageDescribe', 'imageCompare', 'flashcard', 'pattern',
      -- письменность
      'trace', 'buildSyllable',
      -- видео
      'videoWatch',
      -- сборка тапами и задания рабочих тетрадей (0064)
      'unscramble', 'blockOrder', 'charBank', 'jamoType',
      'dialogGap', 'wordDrop', 'crossword',
      -- работа с текстом и системой (0080)
      'trueFalse', 'dropdownGap', 'columnSort', 'embed',
      -- легаси-написания из старых строк
      'short', 'text', 'choice', 'match', 'table'
    ])
  );
