-- Уровень теста (ЕГЭ, ОГЭ, AP…) — для отбора на вкладке «Тесты», как у курсов.
-- Свободная строка, разбирается теми же корзинами lib/courseLevels.
alter table public.custom_diag_tests add column if not exists level text;
-- Линия 1 биологии — линия ЕГЭ; «Химия ЕГЭ» / «Биология ЕГЭ» — по названию.
update public.custom_diag_tests set level = 'ЕГЭ'
  where level is null and (id like 'custom-bio-line1-%' or label ilike '%ЕГЭ%');
