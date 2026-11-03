-- Stage 2, MANUAL operation after deployment of the compatible client/handlers
-- and verification on synthetic staging. Do not run automatically in production.
-- Auth passwords are not changed: students keep their current login password.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
update public.students set temp_password = null where temp_password is not null;
alter table public.students add constraint students_no_plaintext_password
  check (temp_password is null);
commit;
