-- Preserve manual opening balances while applying only the changed event's delta.
-- No historical student balances are recomputed by this migration.
set local lock_timeout = '5s';
set local statement_timeout = '30s';
alter table public.payments add constraint payments_lessons_paid_nonnegative check(lessons_paid >= 0) not valid;
do $validation$ begin
  if not exists(select 1 from public.payments where lessons_paid < 0) then
    alter table public.payments validate constraint payments_lessons_paid_nonnegative;
  end if;
end $validation$;

-- An owned group alone must not permit forging another teacher's pupil attendance.
create policy attendance_student_scope_read on public.lesson_attendance as restrictive
for select to authenticated using (
  (select public.is_admin()) or exists(select 1 from public.students s where s.id=student_id and s.created_by=(select auth.uid()))
);
create policy attendance_staff_scope_insert on public.lesson_attendance as restrictive
for insert to authenticated with check (
  (select public.is_staff()) and ((select public.is_admin()) or exists(select 1 from public.students s where s.id=student_id and s.created_by=(select auth.uid())))
);
create policy attendance_staff_scope_update on public.lesson_attendance as restrictive
for update to authenticated using (
  (select public.is_staff()) and ((select public.is_admin()) or exists(select 1 from public.students s where s.id=student_id and s.created_by=(select auth.uid())))
) with check (
  (select public.is_staff()) and ((select public.is_admin()) or exists(select 1 from public.students s where s.id=student_id and s.created_by=(select auth.uid())))
);
create policy attendance_staff_scope_delete on public.lesson_attendance as restrictive
for delete to authenticated using (
  (select public.is_staff()) and ((select public.is_admin()) or exists(select 1 from public.students s where s.id=student_id and s.created_by=(select auth.uid())))
);

create function public.sync_prepaid_lesson_balance()
returns trigger language plpgsql security invoker set search_path = '' as $function$
declare
  old_student uuid; new_student uuid;
  old_credit integer := 0; new_credit integer := 0;
begin
  if tg_op <> 'INSERT' then
    old_student := old.student_id;
    if tg_table_name='payments' then old_credit:=old.lessons_paid;
    else old_credit:=case when old.present then -1 else 0 end; end if;
  end if;
  if tg_op <> 'DELETE' then
    new_student := new.student_id;
    if tg_table_name='payments' then new_credit:=new.lessons_paid;
    else new_credit:=case when new.present then -1 else 0 end; end if;
  end if;
  -- The same pupil order prevents opposing transfers from taking locks backwards.
  perform 1 from public.students s where s.id in (old_student,new_student) order by s.id for update;
  update public.students s set lesson_balance=s.lesson_balance
    +case when s.id=new_student then new_credit else 0 end
    -case when s.id=old_student then old_credit else 0 end
  where s.id in (old_student,new_student)
    and (case when s.id=new_student then new_credit else 0 end
       -case when s.id=old_student then old_credit else 0 end) <> 0;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$function$;
revoke all on function public.sync_prepaid_lesson_balance() from public,anon,authenticated;

drop trigger if exists trg_on_payment_received on public.payments;
create trigger trg_sync_payment_balance after insert or update or delete on public.payments
for each row execute function public.sync_prepaid_lesson_balance();
drop trigger if exists trg_on_lesson_attended on public.lesson_attendance;
drop trigger if exists trg_on_lesson_attendance_updated on public.lesson_attendance;
create trigger trg_sync_attendance_balance after insert or update or delete on public.lesson_attendance
for each row execute function public.sync_prepaid_lesson_balance();
