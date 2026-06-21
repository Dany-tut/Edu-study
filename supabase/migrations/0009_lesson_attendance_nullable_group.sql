-- Personal lessons given to a single student arrive as student-scoped schedule
-- rows (no group_id). We file them under that student's group as a personal entry
-- (only their row, not the whole group). But a student may have no group at all,
-- and the old NOT NULL forced a fake group_id in that case. Make it nullable so a
-- group-less personal lesson can be stored keyed purely by student_id + lesson_date.
ALTER TABLE public.lesson_attendance ALTER COLUMN group_id DROP NOT NULL;
