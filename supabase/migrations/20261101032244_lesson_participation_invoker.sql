-- The existing attendance RPC handles access to private teacher sessions.
-- The aggregation itself only reads normal student-visible tables, so retain RLS.
alter function public.student_lesson_participation(uuid,text[]) security invoker;
