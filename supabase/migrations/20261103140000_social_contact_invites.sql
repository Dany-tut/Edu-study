-- Opt-in contacts are account-scoped. No educational tables or role claims.
begin;
create schema iskra_social;
revoke all on schema iskra_social from public, anon, authenticated;
create table iskra_social.people (
  account uuid primary key references auth.users(id) on delete cascade,
  handle text collate "C" not null unique check (handle ~ '^[a-z][a-z0-9_]{3,19}$'),
  token uuid unique,
  expires_at timestamptz
);
create table iskra_social.contacts (
  id uuid primary key default gen_random_uuid(),
  sender uuid not null references iskra_social.people(account) on delete cascade,
  recipient uuid not null references iskra_social.people(account) on delete cascade,
  accepted boolean not null default false,
  check (sender <> recipient)
);
create unique index one_social_pair on iskra_social.contacts
  (least(sender, recipient), greatest(sender, recipient));
alter table iskra_social.people enable row level security;
alter table iskra_social.contacts enable row level security;
revoke all on all tables in schema iskra_social from public, anon, authenticated;

-- Private definer has a narrow vocabulary. No arbitrary filters/target account.
create function iskra_social.contact_action(action text, value text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  owner_id uuid;
  nick text;
  secret uuid;
  result jsonb;
begin
  if me is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then
    raise exception 'sign_in_required'; end if;
  if action = 'set_handle' then
    insert into iskra_social.people(account,handle) values (me, value)
    on conflict (account) do update set handle=excluded.handle;
    return to_jsonb(value);
  end if;
  if not exists (select from iskra_social.people where account=me) then
    raise exception 'handle_required'; end if;
  case action
  when 'issue' then
    update iskra_social.people set token=gen_random_uuid(), expires_at=now()+interval '24 hours'
      where account=me returning token into secret;
    return to_jsonb(secret);
  when 'revoke' then
    update iskra_social.people set token=null, expires_at=null where account=me;
  when 'preview', 'request' then
    select p.account,p.handle into owner_id,nick from iskra_social.people p
      where token=value::uuid and expires_at>clock_timestamp() and account<>me for update;
    if not found then raise exception 'invite_unavailable'; end if;
    if action='preview' then return jsonb_build_object('handle',nick); end if;
    insert into iskra_social.contacts(sender,recipient) values(me,owner_id) on conflict do nothing;
    update iskra_social.people set token=null,expires_at=null where account=owner_id;
  when 'accept' then
    update iskra_social.contacts set accepted=true where id=value::uuid and recipient=me;
    if not found then raise exception 'request_unavailable'; end if;
  when 'remove' then
    delete from iskra_social.contacts where id=value::uuid and me in (sender,recipient);
  when 'list' then
    select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'handle',p.handle,'state',
      case when c.accepted then 'friend' when c.sender=me then 'outgoing' else 'incoming' end)
      order by p.handle),'[]'::jsonb) into result from iskra_social.contacts c
      join iskra_social.people p on p.account=case when c.sender=me then c.recipient else c.sender end
      where me in (c.sender,c.recipient);
    return result;
  when 'me' then
    select to_jsonb(p.handle) into result from iskra_social.people p where account=me;
    return result;
  else raise exception 'unknown_action';
  end case;
  return 'true'::jsonb;
end;
$$;
create function public.social_contact(action text, value text default null)
returns jsonb language sql security invoker set search_path = ''
as $$ select iskra_social.contact_action(action,value); $$;
revoke all on function iskra_social.contact_action(text,text), public.social_contact(text,text)
  from public, anon, authenticated;
grant usage on schema iskra_social to authenticated;
grant execute on function iskra_social.contact_action(text,text), public.social_contact(text,text) to authenticated;
commit;
