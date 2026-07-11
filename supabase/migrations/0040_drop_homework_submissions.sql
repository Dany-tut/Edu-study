-- Drop the dead `homework_submissions` table.
--
-- Назначенные ДЗ («обычное ДЗ») больше не хранят сдачи/проверку в этой таблице:
-- всё сведено к lesson_progress (ключ `hw-<id>`), см. reviewHomework в
-- src/lib/useHomework.ts. В `homework_submissions` никогда не писал ни один
-- клиентский путь — только сид-данные. Ни одна другая таблица на неё не
-- ссылается, поэтому удаляем целиком (CASCADE снимет её RLS-политики).

drop table if exists public.homework_submissions cascade;
