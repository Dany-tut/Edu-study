-- A stale snapshot is a validation failure, not a transient serialization failure.
-- Avoid automatic database/proxy retries of a request that requires an editor reload.
create or replace function public.guard_course_access_snapshot()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if current_user in ('postgres', 'service_role', 'supabase_admin')
    or current_setting('iskra.course_access_edit', true) = 'on' then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  if tg_table_name = 'courses' then
    if not (coalesce(new.student_ids, '{}') @> coalesce(old.student_ids, '{}'))
      or not (coalesce(new.group_ids, '{}') @> coalesce(old.group_ids, '{}')) then
      raise exception 'Доступ к курсу изменился. Обновите конструктор перед сохранением.' using errcode = '23514';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.access_mode is distinct from old.access_mode then
      raise exception 'Обновите конструктор перед изменением доступа.' using errcode = '23514';
    end if;
  elsif exists (
    select 1 from public.courses c join public.students s on s.id::text = old.student_id
    where c.id = old.course_id and (s.id = any(c.student_ids) or s.group_id = any(c.group_ids))
  ) then
    raise exception 'Ученик всё ещё назначен на курс. Обновите конструктор.' using errcode = '23514';
  end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;
