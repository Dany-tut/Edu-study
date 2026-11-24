-- Выполнено Дани вручную в SQL Editor 24.11.2026 (через агента удаление
-- отклонялось окном подтверждения). Идемпотентно (if exists).
-- course_lesson_hidden/course_module_hidden — правила доступа их больше не
-- вызывают (заменены my_hidden_course_items), ссылок в коде и функциях нет;
-- lesson_progress_student_lesson_unique — дубль уникальности (student_id,
-- lesson_ref): её держит lesson_progress_student_id_lesson_ref_key,
-- внешние ключи опираются на lesson_progress_pkey. Данные не меняются.
drop function if exists public.course_lesson_hidden(uuid, text, text);
drop function if exists public.course_module_hidden(uuid, text);
alter table public.lesson_progress drop constraint if exists lesson_progress_student_lesson_unique;
