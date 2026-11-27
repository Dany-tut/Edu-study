-- Версия Excel ученика (курс «Бухгалтерия»): students.preferences.excel.
--
-- Отдельная функция, а не новый ключ в save_student_preferences: та принимает
-- закрытый список ключей и отвергает весь пакет настроек целиком; клиент без
-- этой миграции просто хранит версию в браузере. Меняется ТОЛЬКО ключ excel —
-- остальные настройки ученика (аватар, виджеты, цвета) не трогаются (|| по
-- верхнему уровню), строки других учеников недоступны (auth_user_id).
-- Аддитивно: новых таблиц и колонок нет, данные не удаляются.

create or replace function public.save_student_excel(p_student uuid, p_excel jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if jsonb_typeof(p_excel) is distinct from 'object'
    or octet_length(p_excel::text) > 512
    or p_excel - array['version','macros','updatedAt'] <> '{}'::jsonb
    or (p_excel ? 'version' and jsonb_typeof(p_excel->'version') not in ('string','null'))
    or (p_excel ? 'version' and jsonb_typeof(p_excel->'version') = 'string'
        and p_excel->>'version' not in ('2007','2010','2013','2016','2019','2021','2024','365','mac','web','unknown'))
    or (p_excel ? 'macros' and jsonb_typeof(p_excel->'macros') not in ('boolean','null'))
  then raise exception 'Invalid excel preferences' using errcode = '22023'; end if;

  update public.students
  set preferences = coalesce(preferences, '{}'::jsonb) || jsonb_build_object('excel', p_excel)
  where id = p_student and auth_user_id = (select auth.uid());
  if not found then raise insufficient_privilege using message = 'Student account required'; end if;
end;
$$;
revoke all on function public.save_student_excel(uuid,jsonb) from public, anon;
grant execute on function public.save_student_excel(uuid,jsonb) to authenticated;
