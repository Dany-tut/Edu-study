create or replace function public.redact_analytics_credentials()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.path ~ '^#[^/]' then
    new.path := '#/';
  else
    new.path := left(new.path, 1) || regexp_replace(substr(new.path, 2), '[?#&].*$', '');
  end if;
  if new.meta::text ~* '[?#&](access_token|refresh_token|id_token|token_hash|token|code|apikey|password)=' then
    new.meta := '{}'::jsonb;
  end if;
  return new;
end;
$$;
-- Some historical callbacks appended a second fragment after the app route.
update public.analytics_events set path = path
where path ~* '[?#&](access_token|refresh_token|id_token|token_hash|token|code|apikey|password)=';
