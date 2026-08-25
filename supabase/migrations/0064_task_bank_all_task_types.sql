-- Банк заданий принимает все типы из реестра (data/taskTypes.ts)
--
-- ЗАЧЕМ. CHECK на task_bank.answer_type отстал от кода на десять типов и
-- продолжает отставать при каждом новом. Последняя правка (0054) добавляла
-- pattern; после неё в реестре появились письменность (trace, buildSyllable),
-- видео (videoWatch) и семь типов из рабочих тетрадей — сборка тапами
-- (unscramble, blockOrder, charBank, jamoType), пропуск в озвученном диалоге
-- (dialogGap), пропуски по общему банку слов (wordDrop) и кроссворд
-- (crossword). Учитель видит их в палитре, создаёт задание и получает 23514 на
-- сохранении В БАНК — при этом то же задание внутри курса сохраняется
-- нормально, потому что там оно лежит в JSONB без всякого CHECK. Отсюда
-- «сохраняется через раз», необъяснимое с точки зрения учителя.
--
-- Список пересобирается целиком: дописать значение в существующий CHECK
-- нельзя, его можно только заменить. Легаси-написания ('short', 'text',
-- 'choice', 'match', 'table') остаются — они ещё встречаются в старых строках,
-- а на чтении приводятся normalizeTaskType().
--
-- ЧТО МИГРАЦИЯ НЕ ДЕЛАЕТ. Не трогает данные: ни одна существующая строка под
-- новый список не подпадает иначе, чем раньше, — список только расширен.
-- Откат — вернуть CHECK из 0054, но тогда задания новых типов перестанут
-- сохраняться в банк (уже сохранённые останутся лежать как есть).

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
      -- сборка тапами и задания рабочих тетрадей
      'unscramble', 'blockOrder', 'charBank', 'jamoType',
      'dialogGap', 'wordDrop', 'crossword',
      -- легаси-написания из старых строк
      'short', 'text', 'choice', 'match', 'table'
    ])
  );
