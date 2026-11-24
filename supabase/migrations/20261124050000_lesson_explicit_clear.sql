-- Намеренная очистка описания и ссылки урока (согласовано Дани 24.11.2026).
--
-- lessons_preserve_nonempty (инцидент 22.11) отклоняла любое опустошение
-- заполненного поля, и учитель не мог сам стереть описание урока: курс не
-- сохранялся («refusing to clear lessons.description»).
--
-- Теперь триггер пропускает очистку, если запрос несёт заголовок
-- X-Iskra-Explicit-Clear с парой «short_id:поле» для этой строки. Редактор
-- курса шлёт его только для полей, заполненных в подтверждённом сервером
-- снимке и пустых у пользователя (src/lib/lessonExplicitClears.ts).
-- Разрешены лишь description и youtube_url; JSON-поля и вложенное содержимое
-- охраняются как раньше. Прежнее значение по-прежнему уходит в
-- iskra_history.row_versions (capture_old_row). Данные не меняются.

create or replace function iskra_history.reject_empty_lesson_overwrite() returns trigger
language plpgsql set search_path = '' as $$
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
      -- пользователь сам стёр простое текстовое поле этой строки
      if field in ('description', 'youtube_url') and (new.short_id || ':' || field) = any(explicit_clears) then
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
$$;
revoke all on function iskra_history.reject_empty_lesson_overwrite() from public,anon,authenticated,service_role;
