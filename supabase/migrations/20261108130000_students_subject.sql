-- Предмет ученика без группы (вариант Б, 08.11.2026).
--
-- У группы и карточки 1:1 предмет свой (groups.subject). Ученик «без занятий»
-- (group_id is null) предмета не имел вовсе, и главная показывала ему чужие
-- предметные виджеты. Теперь учитель указывает предмет при создании.
--
-- Аддитивно и совместимо со старыми клиентами: колонка nullable, без default;
-- старые сборки её не читают и не пишут. Источник правды для ученика в группе
-- по-прежнему groups.subject — см. src/lib/studentSubject.ts.
alter table public.students add column if not exists subject text;

comment on column public.students.subject is
  'Предмет ученика без группы: id реестра (src/lib/subjects.ts) или своя строка. Для ученика в группе главнее groups.subject.';
