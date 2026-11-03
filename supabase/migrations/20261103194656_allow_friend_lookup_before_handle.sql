-- Both deployed versions of this RPC enforce the handle check. Preserve the
-- live implementation (including the optional invitation-link operations).
do $migration$
declare
  definition text := pg_get_functiondef('iskra_social.desktop_friends(uuid,text,jsonb)'::regprocedure);
  guard text;
begin
  foreach guard in array array[
    'if own.account is null then raise exception ''handle_required'';',
    'if own.account is null and operation not in (''open_link'',''send_link'') then raise exception ''handle_required'';'
  ] loop
    if strpos(definition, guard) > 0 then
      execute replace(definition, guard, replace(guard, 'if own.account is null', 'if own.account is null and operation <> ''search'''));
      return;
    end if;
  end loop;
  raise exception 'Unrecognized desktop_friends handle guard';
end;
$migration$;
