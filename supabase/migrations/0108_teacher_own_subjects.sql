-- Предметы учителя выбирает сам учитель: при регистрации и в профиле.
--
-- До этого profiles.subjects (0047) правил только админ, а при регистрации
-- спрашивали свободный текст в profiles.subject, который ни на что не влиял.
-- Теперь subjects — единственный источник «какие предметы я веду»: по нему
-- сужаются списки предметов в Конструкторе, тренажёре, ДЗ и группах.
-- Значения — id реестра (src/lib/subjects.ts) либо свой предмет строкой
-- («Экономика»). Пусто = ещё не выбрал = видит всё, как раньше.

-- 1. Свои предметы учитель меняет сам; вкладки и виджеты — по-прежнему админ.
create or replace function public.guard_profile_access_cols()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if (new.hidden_tabs is distinct from old.hidden_tabs
      or new.hidden_widgets is distinct from old.hidden_widgets)
     and not public.is_admin() then
    raise exception 'Only an admin can change access settings';
  end if;
  -- Проверка — только для запросов с сайта (anon/authenticated). Служебные
  -- роли (миграции, service_role) пользователя не несут и пропускаются.
  if new.subjects is distinct from old.subjects
     and current_user in ('anon', 'authenticated')
     and not public.is_admin()
     and new.id is distinct from auth.uid() then
    raise exception 'Only the teacher or an admin can change subjects';
  end if;
  return new;
end;
$$;

-- 2. Приглашение отдаёт предметы, которые админ отметил заранее, — форма
--    регистрации подставляет их в поле, учитель правит. Тип результата
--    меняется, поэтому drop + create.
drop function if exists public.get_teacher_invite(uuid);
create function public.get_teacher_invite(p_token uuid)
returns table(email text, consumed boolean, subjects text[])
language sql
stable
security definer
set search_path to 'public'
as $$
  select email, (consumed_at is not null) as consumed, subjects
  from public.teacher_invites
  where token = p_token
    and expires_at > now();
$$;
grant execute on function public.get_teacher_invite(uuid) to anon, authenticated;

-- 3. Старый свободный текст → id реестра, где он узнаётся. Остальное
--    («Астрология», «Экономика») переезжает как свой предмет.
update public.profiles p
   set subjects = array[
     case
       when s like 'хим%'   then 'chemistry'
       when s like 'биол%'  then 'biology'
       when s like 'физ%'   then 'physics'
       when s like 'мат%'   then 'math'
       when s like 'рус%'   then 'russian'
       when s like 'лит%'   then 'literature'
       when s like 'ист%'   then 'history'
       when s like 'англ%'  then 'english'
       when s like 'кор%'   then 'korean'
       when s like 'япон%'  then 'japanese'
       when s like 'порт%'  then 'portuguese'
       when s like 'нем%'   then 'german'
       else btrim(p.subject)
     end
   ]
  from (select id, lower(btrim(subject)) as s from public.profiles) x
 where x.id = p.id
   and p.role in ('teacher', 'admin')
   and coalesce(btrim(p.subject), '') <> ''
   and cardinality(p.subjects) = 0;
