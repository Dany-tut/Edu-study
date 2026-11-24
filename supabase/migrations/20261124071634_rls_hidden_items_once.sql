-- Скрытые уроки/модули: список собирается один раз на запрос (их единицы),
-- вместо вызова функции на каждый урок (у ученика с 645 уроками это
-- ~200 мс). Видимость сверена до/после для всех 45 входов: 0 расхождений.
-- course_lesson_hidden/course_module_hidden больше не используются правилами;
-- удаление — отдельным согласованием.
create or replace function public.my_hidden_course_items()
returns text[] language sql stable security definer set search_path to '' as $$
  select coalesce(array_agg(v.course_id::text || '|' || v.item_kind || '|' || v.item_key), '{}'::text[])
  from public.course_item_visibility v
  where v.hidden and v.course_id = any (public.my_course_ids());
$$;
revoke all on function public.my_hidden_course_items() from public, anon;
grant execute on function public.my_hidden_course_items() to authenticated, service_role;
alter policy lesson_student_visibility on public.lessons using (
  (select public.is_admin())
  or course_id = any ((select public.my_owned_course_ids())::uuid[])
  or course_id = any ((select public.my_shared_course_ids())::uuid[])
  or not (coalesce(course_id::text || '|lesson|' || short_id = any ((select public.my_hidden_course_items())::text[]), false)
          or coalesce(course_id::text || '|module|' || module_id::text = any ((select public.my_hidden_course_items())::text[]), false)));
alter policy module_student_visibility on public.course_modules using (
  (select public.is_admin())
  or course_id = any ((select public.my_owned_course_ids())::uuid[])
  or course_id = any ((select public.my_shared_course_ids())::uuid[])
  or not coalesce(course_id::text || '|module|' || id::text = any ((select public.my_hidden_course_items())::text[]), false));
