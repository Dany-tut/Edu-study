-- Account ownership exists even without a teaching group (independent_students).
begin;
create or replace function public.admin_students_list()
returns table(
  id uuid, name text, email text, phone text, telegram_link text,
  parent_contact text, comment text,
  group_id uuid, group_name text, subject text, is_individual boolean,
  owner_id uuid, owner_name text,
  person_id uuid, siblings bigint, has_account boolean,
  progress_rows bigint, last_visit date, created_at timestamptz
)
language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
  select
    s.id, s.name, s.email, s.phone, s.telegram_link,
    s.parent_contact, s.comment,
    s.group_id, g.name, g.subject, coalesce(g.is_individual, false),
    coalesce(g.created_by, s.created_by), coalesce(p.name, '—'),
    s.person_id,
    (select count(*) from students sib
      where sib.person_id is not null and sib.person_id = s.person_id and sib.id <> s.id),
    s.auth_user_id is not null,
    (select count(*) from lesson_progress lp where lp.student_id = s.id),
    s.last_visit, s.created_at
  from students s
  left join groups g on g.id = s.group_id
  left join profiles p on p.id = coalesce(g.created_by, s.created_by)
  order by coalesce(p.name, '—'), s.name;
end $$;


create or replace function public.admin_student_reassign(p_student uuid, p_owner uuid)
returns text
language plpgsql security definer set search_path to 'public'
as $$
declare
  g record;
  v_name text;
  v_cnt int;
  v_new uuid;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if not exists (select 1 from profiles pr where pr.id = p_owner) then
    raise exception 'owner not found';
  end if;

  select s.name into v_name from students s where s.id = p_student;
  if v_name is null and not exists (select 1 from students s where s.id = p_student) then
    raise exception 'student not found';
  end if;

  select gr.* into g from groups gr
    where gr.id = (select s.group_id from students s where s.id = p_student);
  if g.id is null then
    update students set created_by = p_owner, updated_at = now() where id = p_student;
    return 'owner_changed';
  end if;
  if g.created_by is not distinct from p_owner then return 'noop'; end if;

  select count(*) into v_cnt from students s where s.group_id = g.id;

  if coalesce(g.is_individual, false) and v_cnt <= 1 then
    update groups set created_by = p_owner where id = g.id;
    return 'group_moved';
  end if;

  insert into groups (name, subject, icon, level, color, color_soft,
                      start_date, total_lessons, is_individual, created_by)
  values (coalesce(v_name, g.name), g.subject, g.icon, g.level, g.color, g.color_soft,
          null, 0, true, p_owner)
  returning id into v_new;

  perform public.admin_student_move(p_student, v_new);
  return 'new_group';
end $$;


revoke all on function public.admin_students_list() from public, anon;
grant execute on function public.admin_students_list() to authenticated;
revoke all on function public.admin_student_reassign(uuid, uuid) from public, anon;
grant execute on function public.admin_student_reassign(uuid, uuid) to authenticated;
commit;
