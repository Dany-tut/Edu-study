begin;
alter table iskra_social.people
  add column searchable boolean not null default false,
  add column profile_key uuid not null unique default gen_random_uuid();

-- Keep the limit across renames, including unsuccessful exact searches.
create table iskra_social.lookup_budget (
  account uuid primary key references auth.users(id) on delete cascade,
  since timestamptz not null, used integer not null
);
create table iskra_social.request_cooldown (
  sender uuid references auth.users(id) on delete cascade,
  recipient uuid references auth.users(id) on delete cascade,
  sent_at timestamptz not null,
  primary key(sender,recipient)
);
revoke all on iskra_social.lookup_budget, iskra_social.request_cooldown from public, anon, authenticated;
alter table iskra_social.lookup_budget enable row level security;
alter table iskra_social.request_cooldown enable row level security;

create function iskra_social.desktop_friends(expected_account uuid, operation text, payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  me uuid := auth.uid();
  target iskra_social.people;
  own iskra_social.people;
  nick text := lower(trim(leading '@' from trim(payload->>'handle')));
  cutoff timestamptz := clock_timestamp() - interval '1 minute';
  edge iskra_social.contacts;
  used_count int;
begin
  if me is null or me is distinct from expected_account or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then
    raise exception 'sign_in_required';
  end if;

  if operation='save' then
    if nick is null or nick !~ '^[a-z][a-z0-9_]{3,19}$' or jsonb_typeof(payload->'searchable') is distinct from 'boolean' then
      raise exception 'invalid_profile';
    end if;
    insert into iskra_social.people(account,handle,searchable) values(me,nick,(payload->>'searchable')::boolean)
    on conflict(account) do update set handle=excluded.handle, searchable=excluded.searchable;
    return 'true';
  end if;
  select * into own from iskra_social.people where account=me;
  if operation='snapshot' then
    return jsonb_build_object('handle', own.handle, 'searchable',coalesce(own.searchable,false),'contacts',
      case when own.account is null then '[]'::jsonb else iskra_social.contact_action('list',null) end);
  end if;
  if own.account is null then raise exception 'handle_required'; end if;
  if operation in ('search','send') then
    insert into iskra_social.lookup_budget as b values(me,clock_timestamp(),1)
      on conflict(account) do update set
        since=case when b.since<cutoff then excluded.since else b.since end,
        used=case when b.since<cutoff then 1 else least(b.used+1,31) end
      returning used into used_count;
    if used_count>30 then return jsonb_build_object('status','limited'); end if;
    select * into target from iskra_social.people where handle=nick and searchable and account<>me for share;
    if not found or (operation='send' and target.profile_key is distinct from (payload->>'key')::uuid) then
      return jsonb_build_object('status','missing');
    end if;
    select * into edge from iskra_social.contacts where
      (sender=me and recipient=target.account) or (sender=target.account and recipient=me);
    if found then
      return jsonb_build_object('status',case when edge.accepted then 'friend' when edge.sender=me then 'outgoing' else 'incoming' end);
    end if;
    if operation='search' then return jsonb_build_object('status','found','handle',target.handle,'key',target.profile_key); end if;
    insert into iskra_social.request_cooldown as history values(me,target.account,now())
      on conflict(sender,recipient) do update set sent_at=excluded.sent_at where history.sent_at<now()-interval '1 day';
    if not found then return jsonb_build_object('status','cooldown'); end if;
    insert into iskra_social.contacts(sender,recipient) values(me,target.account) on conflict do nothing;
    return jsonb_build_object('status','sent');
  end if;
  if operation='accept' then
    update iskra_social.contacts set accepted=true where id=(payload->>'id')::uuid and recipient=me;
  elsif operation='decline' then
    delete from iskra_social.contacts where id=(payload->>'id')::uuid and recipient=me and not accepted;
  elsif operation='cancel' then
    delete from iskra_social.contacts where id=(payload->>'id')::uuid and sender=me and not accepted;
  else raise exception 'unknown_action';
  end if;
  return to_jsonb(found);
end;
$$;
create function public.desktop_friends(expected_account uuid, operation text, payload jsonb default '{}')
returns jsonb language sql security invoker set search_path=''
as $$ select iskra_social.desktop_friends(expected_account,operation,payload) $$;
revoke all on function iskra_social.desktop_friends(uuid,text,jsonb),public.desktop_friends(uuid,text,jsonb) from public, anon, authenticated;
grant execute on function iskra_social.desktop_friends(uuid,text,jsonb),public.desktop_friends(uuid,text,jsonb) to authenticated;
commit;
