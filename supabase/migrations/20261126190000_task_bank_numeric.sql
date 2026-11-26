-- Банк заданий принимает тип «Число» (numeric)
--
-- ЗАЧЕМ. CHECK на task_bank.answer_type перечисляет типы поимённо (0081,
-- 20261126170000) и не знает типа «Число» из data/taskTypes.ts: сохранение
-- такого задания в банк из Конструктора падало с 23514.
--
-- Согласие Дани 26.11.2026 — только на это расширение списка.
--
-- ЧТО МИГРАЦИЯ НЕ ДЕЛАЕТ. Не трогает данные: список 20261126170000 повторён
-- дословно и дополнен одним значением, ни одна существующая строка не перестаёт
-- под него подпадать. Откат — вернуть CHECK из 20261126170000 (строк numeric к
-- тому моменту быть не должно, иначе ADD CONSTRAINT упадёт и откат не пройдёт
-- молча).

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
      -- найди на экране (20261126170000)
      'screenHotspot',
      -- число с допуском (этот файл)
      'numeric',
      -- легаси-написания из старых строк
      'short', 'text', 'choice', 'match', 'table'
    ])
  );
