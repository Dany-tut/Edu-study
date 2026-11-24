-- testly-bridge и опрос оценок Тестли (каждые 5 минут) ищут уроки через
-- lessons.homework @> {...}: без индекса это перебор всей колонки (~1,5 с).
-- jsonb_path_ops покрывает именно оператор @>. Только добавление индекса.
create index if not exists lessons_homework_path_gin on public.lessons using gin (homework jsonb_path_ops);
