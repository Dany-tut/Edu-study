-- Площадка курсов: уведомления по событиям витрины.
-- Только добавляет функции и триггеры AFTER; существующие строки не меняет.
--  • новая заявка на покупку → автору курса («Витрина курсов»);
--  • оплата подтверждена → покупателю («Курс открыт», кабинет ученика);
--  • курс отправлен на проверку → администраторам;
--  • курс опубликован или возвращён на доработку → автору.

create or replace function public._catalog_notify_order() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text; v_buyer text;
begin
  select created_by, title into v_owner, v_title from public.courses where id = new.course_id;
  if tg_op = 'INSERT' and new.status = 'requested' and v_owner is not null then
    select name into v_buyer from public.students where id = new.student_id;
    insert into public.notifications(recipient_id, recipient_role, type, title, body, link)
    values (v_owner, 'teacher', 'course_order', 'Новая заявка на курс',
            coalesce(nullif(v_buyer, ''), 'Покупатель') || ' · ' || coalesce(v_title, 'курс'),
            jsonb_build_object('page', 'teacher/storefront'));
  elsif tg_op = 'UPDATE' and new.status = 'paid' and old.status is distinct from 'paid' and new.student_id is not null then
    insert into public.notifications(recipient_id, recipient_role, type, title, body, link)
    values (new.student_id, 'student', 'course_access', 'Курс открыт',
            coalesce(v_title, 'Курс') || ': автор подтвердил оплату, все уроки доступны.',
            jsonb_build_object('page', ''));
  end if;
  return new;
end $$;
drop trigger if exists course_orders_notify on public.course_orders;
create trigger course_orders_notify after insert or update of status on public.course_orders
  for each row execute function public._catalog_notify_order();

create or replace function public._catalog_notify_listing() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text; a record;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then return new; end if;
  select created_by, title into v_owner, v_title from public.courses where id = new.course_id;
  if new.status = 'review' then
    for a in select u.id from auth.users u
              where u.raw_app_meta_data ->> 'role' = 'admin' and u.id is distinct from v_owner loop
      insert into public.notifications(recipient_id, recipient_role, type, title, body, link)
      values (a.id, 'teacher', 'course_review', 'Курс ждёт проверки',
              coalesce(v_title, 'Курс') || ' — проверьте карточку и опубликуйте.',
              jsonb_build_object('page', 'teacher/storefront'));
    end loop;
  elsif new.status in ('published', 'rejected') and v_owner is not null and v_owner is distinct from auth.uid() then
    insert into public.notifications(recipient_id, recipient_role, type, title, body, link)
    values (v_owner, 'teacher', 'course_review',
            case new.status when 'published' then 'Курс опубликован в каталоге' else 'Курс вернули на доработку' end,
            coalesce(v_title, 'Курс') || case when new.status = 'rejected' and new.reject_reason is not null then ': ' || new.reject_reason else '' end,
            jsonb_build_object('page', 'teacher/storefront'));
  end if;
  return new;
end $$;
drop trigger if exists course_listings_notify on public.course_listings;
create trigger course_listings_notify after insert or update of status on public.course_listings
  for each row execute function public._catalog_notify_listing();

revoke all on function public._catalog_notify_order() from public, anon, authenticated;
revoke all on function public._catalog_notify_listing() from public, anon, authenticated;
