-- Банк ФИПИ (fipi_guid is not null) — общий открытый контент: ученик, учитель
-- и гость тренажёра его читают. Строки без автора (created_by null), поэтому
-- task_bank_read не пускал к ним никого, кроме админа: в проде 28.11 обычный
-- пользователь и anon видели 0 из 8777 заданий.
-- Решение Дани 28.11: «Да, всем».
-- Правка и удаление не меняются: task_bank_update / task_bank_delete требуют
-- created_by = auth.uid() или is_admin(), то есть строки ФИПИ правит только админ.
create policy task_bank_read_fipi on public.task_bank for select to anon, authenticated
using (fipi_guid is not null);
