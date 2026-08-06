-- 0053_admin_students.sql — админский реестр учеников: кто к какому учителю
-- привязан, перевод ученика другому учителю / в другую группу, правка карточки
-- и удаление. Ученик не хранит владельца сам — он живёт в группе, а владелец =
-- groups.created_by, поэтому «переназначить» = либо сменить владельца личной
-- 1:1-группы, либо перенести ученика в группу другого учителя.
-- Все функции security definer + is_admin(); admin_-префикс авто-ревокает anon
-- (event trigger lock_admin_function_execute_trg).

-- ── Реестр учеников ──────────────────────────────────────────────────────────
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
    g.created_by, coalesce(p.name, '—'),
    s.person_id,
    (select count(*) from students sib
      where sib.person_id is not null and sib.person_id = s.person_id and sib.id <> s.id),
    s.auth_user_id is not null,
    (select count(*) from lesson_progress lp where lp.student_id = s.id),
    s.last_visit, s.created_at
  from students s
  left join groups g on g.id = s.group_id
  left join profiles p on p.id = g.created_by
  order by coalesce(p.name, '—'), s.name;
end $$;

-- ── Группы для выпадашки «перенести в…» ──────────────────────────────────────
create or replace function public.admin_group_options()
returns table(
  id uuid, name text, subject text, is_individual boolean,
  owner_id uuid, owner_name text, students bigint
)
language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
  select
    g.id, g.name, g.subject, coalesce(g.is_individual, false),
    g.created_by, coalesce(p.name, '—'),
    (select count(*) from students s where s.group_id = g.id)
  from groups g
  left join profiles p on p.id = g.created_by
  order by coalesce(p.name, '—'), g.name;
end $$;

-- ── Перенос ученика в конкретную группу ──────────────────────────────────────
-- Тянет за собой персональные строки расписания и журнала (они скоупятся по
-- group_id), иначе ученик уедет, а его уроки останутся у старого учителя.
create or replace function public.admin_student_move(p_student uuid, p_group uuid)
returns void
language plpgsql security definer set search_path to 'public'
as $$
declare v_old uuid;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select s.group_id into v_old from students s where s.id = p_student;
  if v_old is null and not exists (select 1 from students s where s.id = p_student) then
    raise exception 'student not found';
  end if;
  if not exists (select 1 from groups g where g.id = p_group) then
    raise exception 'group not found';
  end if;
  if v_old = p_group then return; end if;

  update students set group_id = p_group, updated_at = now() where id = p_student;
  update schedule_lessons set group_id = p_group where student_id = p_student;
  update lesson_attendance set group_id = p_group where student_id = p_student;
end $$;

-- ── Переназначить ученика другому учителю ────────────────────────────────────
-- Личная 1:1-группа с единственным учеником просто меняет владельца (ДЗ, журнал
-- и расписание остаются). Ученик из общей группы переезжает в новую личную
-- группу у нового учителя — групповое ДЗ старой группы при этом не переносится.
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
  if g.id is null then raise exception 'student has no group'; end if;
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

-- ── Правка карточки ученика ──────────────────────────────────────────────────
-- Патч-объект, белый список полей: чего нет в jsonb — не трогаем.
create or replace function public.admin_student_update(p_id uuid, p_patch jsonb)
returns void
language plpgsql security definer set search_path to 'public'
as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update students s set
    name           = coalesce(nullif(p_patch->>'name', ''), s.name),
    email          = case when p_patch ? 'email' then nullif(p_patch->>'email', '') else s.email end,
    phone          = case when p_patch ? 'phone' then p_patch->>'phone' else s.phone end,
    telegram_link  = case when p_patch ? 'telegram_link' then p_patch->>'telegram_link' else s.telegram_link end,
    parent_contact = case when p_patch ? 'parent_contact' then p_patch->>'parent_contact' else s.parent_contact end,
    comment        = case when p_patch ? 'comment' then p_patch->>'comment' else s.comment end,
    updated_at     = now()
  where s.id = p_id;
  if not found then raise exception 'student not found'; end if;
end $$;

-- ── Удаление ученика ─────────────────────────────────────────────────────────
-- Каскады уже есть (прогресс, журнал, расписание, платежи). Опустевшая личная
-- 1:1-группа удаляется следом, чтобы не копить пустышки в кабинете учителя.
create or replace function public.admin_student_delete(p_id uuid)
returns void
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_group uuid;
  v_individual boolean;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select s.group_id into v_group from students s where s.id = p_id;
  select coalesce(g.is_individual, false) into v_individual from groups g where g.id = v_group;

  delete from students where id = p_id;

  if v_individual and v_group is not null
     and not exists (select 1 from students s where s.group_id = v_group) then
    delete from groups where id = v_group;
  end if;
end $$;
