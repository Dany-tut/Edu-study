-- What a given teacher ALREADY has: courses they own, courses shared to them,
-- and groups they own. Powers a read-only "Уже у учителя" panel in the admin
-- AccessEditor so the admin sees current state, not just the give-more picker.
create or replace function public.admin_teacher_content(p_teacher uuid)
returns table (
  kind text,     -- 'course' | 'group'
  id uuid,
  title text,
  via text,      -- 'owned' | 'shared'
  detail bigint  -- lessons for a course, students for a group
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select 'course'::text, c.id, c.title, 'owned'::text,
         (select count(*) from public.lessons l where l.course_id = c.id)
  from public.courses c
  where c.created_by = p_teacher and public.is_admin()
  union all
  select 'course'::text, c.id, c.title, 'shared'::text,
         (select count(*) from public.lessons l where l.course_id = c.id)
  from public.course_shares cs
  join public.courses c on c.id = cs.course_id
  where cs.teacher_id = p_teacher and c.created_by is distinct from p_teacher
    and public.is_admin()
  union all
  select 'group'::text, g.id, g.name, 'owned'::text,
         (select count(*) from public.students s where s.group_id = g.id)
  from public.groups g
  where g.created_by = p_teacher and public.is_admin()
  order by 1, 4, 3;
$$;

revoke all on function public.admin_teacher_content(uuid) from public, anon;
grant execute on function public.admin_teacher_content(uuid) to authenticated;
