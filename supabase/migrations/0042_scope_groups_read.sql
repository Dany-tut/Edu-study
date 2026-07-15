-- 0042_scope_groups_read.sql
-- Закрываем дыру: политика "read groups" отдавала ВСЕ группы роли public
-- (включая anon). По anon-ключу, зашитому во фронте, любой мог выкачать имена
-- групп/учеников и предметы всех учителей. Имя 1:1-группы = имя ученика → утечка ПДн.
--
-- Заменяем на скоуп по роли. Чтобы не словить бесконечную рекурсию RLS
-- (политика students уже ссылается на groups), доступ к students внутри политики
-- groups идёт через SECURITY DEFINER-хелперы, минующие RLS — тот же приём, что и
-- у is_legacy_student().

-- Аутентифицированный ученик: принадлежит ли ему группа (его student-строка в ней).
create or replace function public.student_owns_group(p_group uuid)
returns boolean
language sql stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.students s
    where s.group_id = p_group and s.auth_user_id = auth.uid()
  );
$$;

-- Легаси-кабинет (anon): в группе есть ученик без auth-аккаунта.
create or replace function public.group_has_legacy_student(p_group uuid)
returns boolean
language sql stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.students s
    where s.group_id = p_group and s.auth_user_id is null
  );
$$;

revoke execute on function public.student_owns_group(uuid)       from public;
revoke execute on function public.group_has_legacy_student(uuid) from public;
grant  execute on function public.student_owns_group(uuid)       to authenticated;
grant  execute on function public.group_has_legacy_student(uuid) to anon, authenticated;

-- Старую всё-разрешающую политику убираем.
drop policy if exists "read groups" on public.groups;

-- Учитель видит свои группы, админ — все, ученик — только те, где он состоит.
create policy "groups_read_auth" on public.groups
  for select to authenticated
  using (
    created_by = auth.uid()
    or public.is_admin()
    or public.student_owns_group(id)
  );

-- Anon-легаси: только группы с легаси-учениками (свой кабинет продолжает работать).
create policy "groups_read_anon_legacy" on public.groups
  for select to anon
  using (public.group_has_legacy_student(id));
