-- Двухфакторная защита — и для таблиц, которых ещё нет.
--
-- 20261105200000_mfa_enforce повесил ограничивающее правило mfa_required на
-- таблицы, что были на тот момент. Новая таблица его не получала: обычные
-- запросы всё равно закрывает mfa_pre_request, но Realtime ходит мимо PostgREST,
-- и подписка на новую таблицу работала бы без кода.
--
-- Сторож срабатывает после CREATE TABLE и ALTER TABLE в public: если у таблицы
-- включён RLS, а правила нет — вешает его. Имя начинается на «mfa», поэтому он
-- идёт после ensure_rls (rls_auto_enable): к этому моменту RLS уже включён.
-- Ошибка сторожа не роняет миграцию — только пишется в лог.

create or replace function public.mfa_policy_auto()
returns event_trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $$
declare cmd record;
begin
  for cmd in
    select * from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE')
      and object_type in ('table', 'partitioned table')
      and schema_name = 'public'
  loop
    begin
      if exists (select 1 from pg_class c where c.oid = cmd.objid and c.relrowsecurity)
         and not exists (select 1 from pg_policy p where p.polrelid = cmd.objid and p.polname = 'mfa_required') then
        execute format(
          'create policy mfa_required on %s as restrictive for all to authenticated using ((select public.mfa_ok())) with check ((select public.mfa_ok()))',
          cmd.object_identity);
      end if;
    exception when others then
      raise log 'mfa_policy_auto: failed on %: %', cmd.object_identity, sqlerrm;
    end;
  end loop;
end
$$;
revoke execute on function public.mfa_policy_auto() from public, anon, authenticated;

drop event trigger if exists mfa_policy_auto_trg;
create event trigger mfa_policy_auto_trg on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE')
  execute function public.mfa_policy_auto();
