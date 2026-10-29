-- Админка → «По учителям»: стереть учителя, чтобы он прошёл путь с нуля.
--
-- ЗАЧЕМ. Учитель (29.10.2026 — Вадим) хочет начать заново: без своих групп,
-- курсов и задач, как только что зарегистрированный. Руками это десяток
-- таблиц, и забытая строка всплывает потом «чужими» данными в новом кабинете.
--
-- ДВА РЕЖИМА.
-- • p_keep_account = true  — стираются данные, логин, пароль и тариф остаются.
--   Учитель входит тем же паролем в пустой кабинет.
-- • p_keep_account = false — удаляется и сам аккаунт (auth.users → profiles,
--   подписка, раскладка стола каскадом). Вернуться он сможет только по новому
--   приглашению, как в первый раз.
--
-- Что считается данными учителя: всё, где он created_by/teacher_id. Группы
-- уносят каскадом учеников, расписание, ДЗ, журнал и оплаты; курсы — модули,
-- уроки и доступы. Заявки (feedback_requests) и аналитика остаются: это история
-- админки, а не кабинет учителя.
--
-- Себя и других админов так удалить нельзя — только учителя.

create or replace function public.admin_delete_teacher(p_teacher uuid, p_keep_account boolean)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_role text;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can delete a teacher';
  end if;
  if p_teacher = auth.uid() then
    raise exception 'Cannot delete yourself';
  end if;
  select role into v_role from public.profiles where id = p_teacher;
  if v_role is distinct from 'teacher' then
    raise exception 'Only a teacher account can be deleted';
  end if;

  delete from public.groups             where created_by = p_teacher;
  delete from public.courses            where created_by = p_teacher;
  delete from public.trainers           where created_by = p_teacher;
  delete from public.task_bank          where created_by = p_teacher;
  delete from public.card_groups        where created_by = p_teacher;
  delete from public.homework           where created_by = p_teacher;
  delete from public.widgets            where created_by = p_teacher;
  delete from public.course_enrollments where created_by = p_teacher;
  delete from public.test_assignments   where created_by = p_teacher;
  delete from public.teacher_tasks      where created_by = p_teacher;
  delete from public.payments           where teacher_id = p_teacher;
  delete from public.course_shares      where teacher_id = p_teacher;
  delete from public.desk_layouts       where teacher_id = p_teacher;

  if not p_keep_account then
    delete from auth.users where id = p_teacher;
  end if;
end;
$$;

revoke execute on function public.admin_delete_teacher(uuid, boolean) from public, anon;
grant  execute on function public.admin_delete_teacher(uuid, boolean) to authenticated;
