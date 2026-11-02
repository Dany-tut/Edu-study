-- A teacher_id equal to auth.uid() is not sufficient authorization: students
-- can set it too, and another teacher must not credit a foreign student's balance.
alter table public.payments enable row level security;
create policy payments_staff_insert on public.payments as restrictive
for insert to authenticated with check ((select public.is_staff()));
create policy payments_staff_update on public.payments as restrictive
for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy payments_staff_delete on public.payments as restrictive
for delete to authenticated using ((select public.is_staff()));

create or replace function public.guard_payment_student_owner()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.teacher_id is null or not exists (
    select 1 from public.students s where s.id = new.student_id
      and s.created_by = new.teacher_id
  ) then
    raise exception 'Payment must belong to the student owner' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_payment_student_owner() from public, anon, authenticated;
create trigger guard_payment_student_owner before insert or update on public.payments
for each row execute function public.guard_payment_student_owner();
