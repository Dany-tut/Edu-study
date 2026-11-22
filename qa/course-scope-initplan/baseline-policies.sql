-- External baseline only. Original helper/function properties unchanged.
alter policy "read_all_course_enrollments" on public."course_enrollments" using ((( SELECT is_admin() AS is_admin) OR (student_id IN ( SELECT (unnest(my_student_ids()))::text AS unnest)) OR (course_id IN ( SELECT unnest(my_course_ids()) AS unnest))));

alter policy "anyone can read course_modules" on public."course_modules" using ((( SELECT is_admin() AS is_admin) OR (course_id IN ( SELECT unnest(my_course_ids()) AS unnest))));

alter policy "read_all_courses" on public."courses" using ((( SELECT is_admin() AS is_admin) OR (id IN ( SELECT unnest(my_course_ids()) AS unnest))));

alter policy "read_all_lessons" on public."lessons" using ((( SELECT is_admin() AS is_admin) OR (course_id IN ( SELECT unnest(my_course_ids()) AS unnest))));
