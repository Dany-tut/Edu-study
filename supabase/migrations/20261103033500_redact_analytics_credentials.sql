-- Cached clients may continue sending invite links and Auth callback fragments.
-- Keep the event and its route; discard metadata when it contains a credential URL.
create function public.redact_analytics_credentials()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.path ~ '^#[^/]' then
    new.path := '#/';
  else
    new.path := split_part(new.path, '?', 1);
  end if;
  if new.meta::text ~* '[?#&](access_token|refresh_token|id_token|token_hash|token|code|apikey|password)=' then
    new.meta := '{}'::jsonb;
  end if;
  return new;
end;
$$;
revoke all on function public.redact_analytics_credentials() from public;
create trigger redact_analytics_credentials before insert or update of path, meta
on public.analytics_events for each row execute function public.redact_analytics_credentials();

update public.analytics_events set path = path
where path ~* '[?#&](access_token|refresh_token|id_token|token_hash|token|code|apikey|password)='
   or meta::text ~* '[?#&](access_token|refresh_token|id_token|token_hash|token|code|apikey|password)=';
