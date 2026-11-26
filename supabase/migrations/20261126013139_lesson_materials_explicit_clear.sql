-- Файлы урока: очистка только по явному «Убрать у учеников» (Дани 26.11.2026,
-- концепт Figma «Искра», стр. 23). Редактор курса больше не шлёт пустые
-- materials сам — держит прежние (src/lib/lessonHeldFiles.ts). Пустые файлы
-- приходят только после кнопки и только с парой «short_id:materials» в
-- заголовке X-Iskra-Explicit-Clear. Прежняя версия строки — в
-- iskra_history.row_versions (триггер истории срабатывает до этого).
-- Остальные поля и вложенное содержимое content защищены, как раньше.
do $$ begin
  if md5(pg_get_functiondef('iskra_history.reject_empty_lesson_overwrite()'::regprocedure)) <> '0e83f619c6b780b35e208957995d6b58' then
    raise exception 'reject_empty_lesson_overwrite changed since review';
  end if;
end $$;

create or replace function iskra_history.reject_empty_lesson_overwrite()
 returns trigger
 language plpgsql
 set search_path to ''
as $function$
declare field text; before_row jsonb := to_jsonb(old); after_row jsonb := to_jsonb(new);
  explicit_clears text[] := string_to_array(coalesce(
    nullif(current_setting('request.headers', true), '')::jsonb->>'x-iskra-explicit-clear', ''), ',');
begin
  if nullif(current_setting('iskra.approved_data_change',true),'') is not null then
    return new;
  end if;
  foreach field in array array['youtube_url','description','timecodes','chapter_variants','content','materials','homework','test_tasks'] loop
    if before_row->field is not null and before_row->field not in ('null'::jsonb,'""'::jsonb,'{}'::jsonb,'[]'::jsonb)
      and (after_row->field is null or after_row->field in ('null'::jsonb,'""'::jsonb,'{}'::jsonb,'[]'::jsonb)) then
      -- пользователь сам стёр простое текстовое поле этой строки или нажал
      -- «Убрать у учеников» для файлов урока
      if field in ('description', 'youtube_url', 'materials') and (new.short_id || ':' || field) = any(explicit_clears) then
        continue;
      end if;
      raise exception using errcode='23514',message='ISKRA_DATA_PRESERVATION: refusing to clear lessons.'||field||' without reviewed approval; reload the course.';
    end if;
  end loop;
  -- A nonempty JSON object must not hide deletion of nested user content.
  foreach field in array array['transcript','paragraphs','selfCheck','cardSetId','cardGroupId'] loop
    if old.content->field is not null and old.content->field not in ('null'::jsonb,'""'::jsonb,'{}'::jsonb,'[]'::jsonb)
      and (new.content->field is null or new.content->field in ('null'::jsonb,'""'::jsonb,'{}'::jsonb,'[]'::jsonb)) then
      raise exception using errcode='23514',message='ISKRA_DATA_PRESERVATION: refusing to remove lesson content.'||field||' without reviewed approval.';
    end if;
  end loop;
  return new;
end;
$function$;
