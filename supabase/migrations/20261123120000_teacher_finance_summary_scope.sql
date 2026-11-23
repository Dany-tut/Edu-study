-- teacher_finance_summary summed expected/debt over every teacher's students and
-- accepted any p_teacher_id: wrong totals and a cross-tenant leak. Same signature
-- and columns, so existing clients keep working. Read-only; touches no data.
create or replace function public.teacher_finance_summary(p_teacher_id uuid)
returns table (
  received  bigint,
  expected  bigint,
  debt      bigint,
  forecast  bigint
) language sql stable security definer set search_path = '' as $$
  with me as (
    select p_teacher_id as id
    where auth.uid() is not null and (p_teacher_id = auth.uid() or public.is_admin())
  ),
  paid as (
    select coalesce(sum(p.amount), 0)::bigint as v
    from public.payments p join me on p.teacher_id = me.id
    where date_trunc('month', p.paid_at) = date_trunc('month', now())
  ),
  due as (
    select
      coalesce(sum(s.payment_amount) filter (
        where s.payment_due >= current_date
          and s.payment_due < date_trunc('month', now()) + interval '1 month'), 0)::bigint as expected,
      coalesce(sum(s.payment_amount) filter (
        where s.payment_due < current_date and coalesce(s.payment_amount, 0) > 0), 0)::bigint as debt
    from public.students s join me on s.created_by = me.id
  )
  select paid.v, due.expected, due.debt, paid.v + due.expected
  from paid, due
  where exists (select 1 from me);
$$;

revoke all on function public.teacher_finance_summary(uuid) from public, anon;
grant execute on function public.teacher_finance_summary(uuid) to authenticated;
