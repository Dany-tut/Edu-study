-- Тип задания «Дрилл по шаблону» (pattern) в банке заданий
--
-- ЗАЧЕМ. Тип pattern добавили в реестр (data/taskTypes.ts) и в палитру языковых
-- предметов, у него есть решатель на стороне ученика (DrillSolver), но в
-- constraint answer_type его забыли. Учитель видит тип в палитре, создаёт
-- задание — и получает 23514 на сохранении. Миграция 0050 заводила языковые
-- типы до того, как появился pattern, и разошлась с кодом.
--
-- Список пересобираем целиком: дописать значение в существующий CHECK нельзя,
-- его можно только заменить. Остальные значения перенесены дословно, включая
-- легаси-'short' — он ещё встречается в старых строках.

alter table public.task_bank
  drop constraint if exists task_bank_answer_type_check;

alter table public.task_bank
  add constraint task_bank_answer_type_check check (
    answer_type is null or answer_type = any (array[
      -- базовые типы
      'single', 'multi', 'fill', 'matching', 'sequence', 'tableFill',
      'extended', 'whiteboard', 'short',
      -- языковые типы (0050)
      'wordBank', 'listenType', 'listenBank', 'minimalPair',
      'speaking', 'imageDescribe', 'imageCompare', 'flashcard',
      -- новое: дрилл по шаблону
      'pattern'
    ])
  );
