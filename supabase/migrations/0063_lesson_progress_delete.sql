-- Сброс прогресса по курсу (Конструктор → «Кому дать доступ» → крутилка)
-- молча ничего не делал: на lesson_progress не было НИ ОДНОЙ политики DELETE,
-- а RLS без политики = запрет без ошибки. Клиент получал `error: null` и
-- показывал зелёную галочку, строки оставались на месте.
--
-- Право на удаление даём ровно тем же, кто и так может читать и править
-- строку: админ, сам ученик (auth_user_id) и владелец его группы.

create policy auth_delete_lp on lesson_progress
  for delete to authenticated
  using (
    is_admin() or exists (
      select 1 from students s
      where s.id = lesson_progress.student_id
        and (
          s.auth_user_id = auth.uid()
          or exists (select 1 from groups g where g.id = s.group_id and g.created_by = auth.uid())
        )
    )
  );
