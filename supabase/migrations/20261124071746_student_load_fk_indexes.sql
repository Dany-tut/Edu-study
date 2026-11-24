-- Индексы на пути загрузки ученика (подсказка advisors «unindexed foreign keys»):
-- my_student_ids()/my_group_ids() ищут по students.auth_user_id в каждом
-- запросе; модули курса ищутся по course_id (был seq scan); ДЗ по уроку и
-- посещаемость по группе. Только добавление индексов, данные не меняются.
create index if not exists students_auth_user_id_idx on public.students (auth_user_id);
create index if not exists course_modules_course_id_idx on public.course_modules (course_id);
create index if not exists homework_lesson_id_idx on public.homework (lesson_id);
create index if not exists lesson_attendance_group_id_idx on public.lesson_attendance (group_id);
