-- Task bank read scope. Replaces the global `read_all_task_bank using(true)` with
-- an owner + shared-library model (product decision):
--   • The admin/boss owns the canonical library — readable by EVERY teacher, then
--     narrowed client-side by each teacher's subject scope (migration 0047).
--   • Tasks a teacher authors are PRIVATE to that teacher (created_by defaults to
--     auth.uid()).
--   • The admin sees the entire bank.
--
-- Non-breaking for current data: all 149 existing tasks are owned by the admin
-- (dillatt@mail.ru, app_metadata.role='admin'), so every teacher keeps seeing them.
-- Only future teacher-authored tasks become private.
--
-- "The row's owner is an admin" can't be evaluated from an RLS policy directly
-- (the authenticated role can't read auth.users), so a SECURITY DEFINER helper
-- encapsulates the lookup.

create or replace function public.is_admin_user(uid uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(
    (select (u.raw_app_meta_data ->> 'role') = 'admin'
       from auth.users u where u.id = uid),
    false);
$$;

drop policy if exists read_all_task_bank on public.task_bank;
create policy task_bank_read on public.task_bank
  for select
  using (
    public.is_admin()                    -- admin sees the whole bank
    or created_by = auth.uid()           -- a teacher sees their own tasks
    or public.is_admin_user(created_by)  -- everyone sees the admin/boss library
  );
