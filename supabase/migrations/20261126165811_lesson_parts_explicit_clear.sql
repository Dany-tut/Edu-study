-- Защищённые поля урока: очистка только по явному «Убрать у учеников» (Дани
-- 26.11.2026, концепт Figma «Искра», стр. 23). Кроме описания, ссылки и файлов
-- заголовок X-Iskra-Explicit-Clear теперь может разрешить: главы записи
-- (timecodes), задания теста (test_tasks), части конспекта content.paragraphs /
-- selfCheck / cardSetId / cardGroupId и content целиком — каждую отдельной
-- парой «short_id:поле». Редактор шлёт пару только после нажатия кнопки
-- (src/lib/lessonHeldFiles.ts). Расшифровка (content.transcript), ДЗ и
-- chapter_variants по-прежнему защищены без исключений. Прежняя строка — в
-- iskra_history.row_versions.
do $$ begin
  if md5(pg_get_functiondef('iskra_history.reject_empty_lesson_overwrite()'::regprocedure)) <> 'c4e28bc7990fe791337795c9c6da0a43' then
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
      if field <> 'transcript' and (new.short_id || ':content.' || field) = any(explicit_clears) then
        continue;
      end if;
      raise exception using errcode='23514',message='ISKRA_DATA_PRESERVATION: refusing to remove lesson content.'||field||' without reviewed approval.';
    end if;
  end loop;
  return new;
end;
$function$;
