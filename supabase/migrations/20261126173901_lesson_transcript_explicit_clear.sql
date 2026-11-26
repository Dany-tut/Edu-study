-- Расшифровка урока: тоже стирается только по «Убрать у учеников» (Дани 27.11.2026).
-- Редактор при смене видео больше не шлёт пустую расшифровку — держит прежнюю
-- (ученику она не видна, пока ссылка не совпадает с видео урока). Пара
-- «short_id:content.transcript» в X-Iskra-Explicit-Clear приходит только после
-- кнопки. ДЗ и chapter_variants по-прежнему без исключений. Прежняя строка —
-- в iskra_history.row_versions.
do $$ begin
  if md5(pg_get_functiondef('iskra_history.reject_empty_lesson_overwrite()'::regprocedure)) <> '7b30bd0d60941486c9d5b3e98842b5ca' then
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
      -- «Убрать у учеников»
      if field in ('description', 'youtube_url', 'materials', 'timecodes', 'test_tasks', 'content')
        and (new.short_id || ':' || field) = any(explicit_clears) then
        continue;
      end if;
      raise exception using errcode='23514',message='ISKRA_DATA_PRESERVATION: refusing to clear lessons.'||field||' without reviewed approval; reload the course.';
    end if;
  end loop;
  -- A nonempty JSON object must not hide deletion of nested user content.
  foreach field in array array['transcript','paragraphs','selfCheck','cardSetId','cardGroupId'] loop
    if old.content->field is not null and old.content->field not in ('null'::jsonb,'""'::jsonb,'{}'::jsonb,'[]'::jsonb)
      and (new.content->field is null or new.content->field in ('null'::jsonb,'""'::jsonb,'{}'::jsonb,'[]'::jsonb)) then
      if (new.short_id || ':content.' || field) = any(explicit_clears) then
        continue;
      end if;
      raise exception using errcode='23514',message='ISKRA_DATA_PRESERVATION: refusing to remove lesson content.'||field||' without reviewed approval.';
    end if;
  end loop;
  return new;
end;
$function$;
