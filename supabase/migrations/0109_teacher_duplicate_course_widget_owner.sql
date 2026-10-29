-- Конструктор: копия курса и виджеты учителя без админки.
--
-- 1. «Дублировать» курс создавало копию только на экране: duplicate_course
--    открыта лишь service_role, а admin_duplicate_course — только админу.
--    После F5 копия пропадала. duplicate_my_course — то же глубокое копирование
--    (модули, уроки с содержимым), но для своего курса или курса, к которому у
--    учителя есть доступ; владелец копии — сам вызывающий.
create or replace function public.duplicate_my_course(p_short_id text, p_title text)
returns table (id uuid, short_id text, created_at timestamptz)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  src uuid;
  new_id uuid;
begin
  if not public.is_staff() then
    raise exception 'Only a teacher can duplicate a course';
  end if;

  select c.id into src from public.courses c
  where c.short_id = p_short_id
    and (c.created_by = auth.uid() or public.is_admin() or c.id = any (public.my_course_ids()));
  if src is null then
    raise exception 'course % not found or not accessible', p_short_id;
  end if;

  new_id := public.duplicate_course(src, auth.uid());
  update public.courses c set title = p_title where c.id = new_id;

  return query select c.id, c.short_id, c.created_at from public.courses c where c.id = new_id;
end;
$$;

revoke all on function public.duplicate_my_course(text, text) from public, anon;
grant execute on function public.duplicate_my_course(text, text) to authenticated;

-- 2. У widgets.created_by не было значения по умолчанию, а читать виджет может
--    только автор: вставка с RETURNING падала, и у учителя без админки виджет не
--    сохранялся вовсе (в базе их ноль). Плюс запись была открыта любому
--    учителю на любой виджет — теперь как у trainers: автор или админ.
alter table public.widgets alter column created_by set default auth.uid();

drop policy if exists widgets_write_staff on public.widgets;
create policy widgets_insert on public.widgets for insert to authenticated
  with check (created_by = auth.uid() or public.is_admin());
create policy widgets_update on public.widgets for update to authenticated
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());
create policy widgets_delete on public.widgets for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());
