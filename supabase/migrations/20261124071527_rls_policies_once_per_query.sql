-- Правила доступа: вспомогательные списки и auth.uid()/is_admin() считаются
-- один раз на запрос, а не на каждую строку, и правила уроков/модулей больше
-- не заходят в правила доступа courses/course_shares/course_item_visibility
-- (каскад давал ~230 подпланов и ~70 мс планирования на запрос трека).
-- Видимость сверена до/после для всех 45 входов по 31 таблице: 0 расхождений.
-- Копия правил до правки: ~/.codex/iskra-backups/*-rls-policies/.
-- Вспомогательные списки для правил доступа: считаются один раз за запрос
-- и не заходят в правила доступа других таблиц (security definer).
create or replace function public.my_owned_course_ids()
returns uuid[] language sql stable security definer set search_path to '' as $$
  select coalesce(array_agg(c.id), '{}'::uuid[]) from public.courses c where c.created_by = (select auth.uid());
$$;
create or replace function public.my_shared_course_ids()
returns uuid[] language sql stable security definer set search_path to '' as $$
  select coalesce(array_agg(cs.course_id), '{}'::uuid[]) from public.course_shares cs where cs.teacher_id = (select auth.uid());
$$;
create or replace function public.course_lesson_hidden(p_course uuid, p_lesson text, p_module text)
returns boolean language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.course_item_visibility v
    where v.course_id = p_course and v.hidden
      and ((v.item_kind = 'lesson' and v.item_key = p_lesson) or (v.item_kind = 'module' and v.item_key = p_module)));
$$;
create or replace function public.course_module_hidden(p_course uuid, p_module text)
returns boolean language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.course_item_visibility v
    where v.course_id = p_course and v.item_kind = 'module' and v.item_key = p_module and v.hidden);
$$;
revoke all on function public.my_owned_course_ids(), public.my_shared_course_ids(), public.course_lesson_hidden(uuid,text,text), public.course_module_hidden(uuid,text) from public, anon;
grant execute on function public.my_owned_course_ids(), public.my_shared_course_ids(), public.course_lesson_hidden(uuid,text,text), public.course_module_hidden(uuid,text) to authenticated, service_role;

alter policy lesson_student_visibility on public.lessons using (
  (select public.is_admin())
  or course_id = any ((select public.my_owned_course_ids())::uuid[])
  or course_id = any ((select public.my_shared_course_ids())::uuid[])
  or not public.course_lesson_hidden(course_id, short_id, module_id::text));
alter policy module_student_visibility on public.course_modules using (
  (select public.is_admin())
  or course_id = any ((select public.my_owned_course_ids())::uuid[])
  or course_id = any ((select public.my_shared_course_ids())::uuid[])
  or not public.course_module_hidden(course_id, id::text));
alter policy lessons_owner_all on public.lessons
  using ((select public.is_admin()) or course_id = any ((select public.my_owned_course_ids())::uuid[]))
  with check ((select public.is_admin()) or course_id = any ((select public.my_owned_course_ids())::uuid[]));
alter policy course_modules_owner_all on public.course_modules
  using ((select public.is_admin()) or course_id = any ((select public.my_owned_course_ids())::uuid[]))
  with check ((select public.is_admin()) or course_id = any ((select public.my_owned_course_ids())::uuid[]));
alter policy visibility_owner_write on public.course_item_visibility
  using ((select public.is_admin()) or course_id = any ((select public.my_owned_course_ids())::uuid[]))
  with check ((select public.is_admin()) or course_id = any ((select public.my_owned_course_ids())::uuid[]));
alter policy visibility_read on public.course_item_visibility
  using ((select public.is_admin()) or course_id = any ((select public.my_course_ids())::uuid[]));
alter policy read_all_course_shares on public.course_shares
  using ((select public.is_admin()) or teacher_id = (select auth.uid()) or course_id = any ((select public.my_owned_course_ids())::uuid[]));
alter policy write_own_course_shares on public.course_shares
  using (course_id = any ((select public.my_owned_course_ids())::uuid[]))
  with check (course_id = any ((select public.my_owned_course_ids())::uuid[]));
alter policy write_own_course_enrollments on public.course_enrollments
  using (course_id = any ((select public.my_owned_course_ids())::uuid[]))
  with check (course_id = any ((select public.my_owned_course_ids())::uuid[]));
alter policy read_all_course_enrollments on public.course_enrollments
  using ((select public.is_admin()) or student_id = any ((select public.my_student_ids())::text[]) or course_id = any ((select public.my_course_ids())::uuid[]));

-- Остальные правила: auth.uid()/auth.jwt()/auth.role() и is_admin() — один раз
-- на запрос, а не на строку. Смысл условий не меняется.
do $$
declare r record; q text; w text; sql text;
begin
  for r in select schemaname, tablename, policyname, qual, with_check from pg_policies
           where schemaname = 'public'
             and (coalesce(qual,'') ~ '(?<!SELECT )auth\.(uid|jwt|role)\(\)' or coalesce(with_check,'') ~ '(?<!SELECT )auth\.(uid|jwt|role)\(\)'
                  or coalesce(qual,'') ~ '(?<!SELECT )(?<![a-z_.])is_admin\(\)' or coalesce(with_check,'') ~ '(?<!SELECT )(?<![a-z_.])is_admin\(\)')
  loop
    q := regexp_replace(regexp_replace(r.qual, '(?<!SELECT )auth\.(uid|jwt|role)\(\)', '(select auth.\1())', 'g'), '(?<!SELECT )(?<![a-z_.])is_admin\(\)', '(select public.is_admin())', 'g');
    w := regexp_replace(regexp_replace(r.with_check, '(?<!SELECT )auth\.(uid|jwt|role)\(\)', '(select auth.\1())', 'g'), '(?<!SELECT )(?<![a-z_.])is_admin\(\)', '(select public.is_admin())', 'g');
    sql := format('alter policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
    if q is not null then sql := sql || ' using (' || q || ')'; end if;
    if w is not null then sql := sql || ' with check (' || w || ')'; end if;
    execute sql;
  end loop;
end $$;
