-- Duplicate a course (with its modules + lessons) for a new owner. Used when an
-- admin provisions an existing course to a teacher in "copy" mode — the new
-- teacher gets an independent draft, the original owner keeps theirs.
-- short_id (course + lesson) is regenerated (unique), module_id is remapped, and
-- student/group assignments are cleared so the copy starts unassigned.
create or replace function public.duplicate_course(p_course_id uuid, p_new_owner uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  new_course uuid;
  m record;
  new_mod uuid;
  mod_map jsonb := '{}'::jsonb;
  l record;
begin
  insert into public.courses
    (kind, title, subject, level, description, status, color, bg, created_by, short_id, group_ids, student_ids)
  select kind, title, subject, level, description, 'draft', color, bg, p_new_owner,
         substr(md5(random()::text), 1, 10), '{}', '{}'
  from public.courses where id = p_course_id
  returning id into new_course;

  if new_course is null then
    raise exception 'course % not found', p_course_id;
  end if;

  for m in select * from public.course_modules where course_id = p_course_id order by position loop
    insert into public.course_modules (course_id, label, position)
    values (new_course, m.label, m.position)
    returning id into new_mod;
    mod_map := mod_map || jsonb_build_object(m.id::text, new_mod::text);
  end loop;

  for l in select * from public.lessons where course_id = p_course_id loop
    insert into public.lessons
      (course_id, module_id, title, position, lesson_number, kind, shape, test_tasks,
       content, youtube_url, description, timecodes, homework, materials,
       trainer_id, widget_id, lesson_sched_manual, short_id)
    values
      (new_course,
       nullif(mod_map ->> l.module_id::text, '')::uuid,
       l.title, l.position, l.lesson_number, l.kind, l.shape, l.test_tasks,
       l.content, l.youtube_url, l.description, l.timecodes, l.homework, l.materials,
       l.trainer_id, l.widget_id, l.lesson_sched_manual,
       substr(md5(random()::text), 1, 12));
  end loop;

  return new_course;
end;
$$;

create or replace function public.admin_duplicate_course(p_course_id uuid, p_new_owner uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can duplicate a course';
  end if;
  return public.duplicate_course(p_course_id, p_new_owner);
end;
$$;

revoke execute on function public.admin_duplicate_course(uuid, uuid) from anon;
