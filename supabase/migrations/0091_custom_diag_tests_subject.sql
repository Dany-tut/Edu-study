-- Предмет своего теста: по нему работает отбор «Все предметы» во вкладке
-- «Тесты». Значение — русское имя из реестра lib/subjects.ts («Биология»),
-- как у courses.subject. Пусто — предмет выводится из названия/иконки.
alter table public.custom_diag_tests
  add column if not exists subject text;

update public.custom_diag_tests set subject = 'Биология'
  where subject is null and (id like 'custom-bio-%' or label ilike 'биолог%');
update public.custom_diag_tests set subject = 'Химия'
  where subject is null and label ilike 'хими%';
