begin;
-- Only this projection is shared; roster names, contacts and learning data stay private.
create or replace function iskra_social.person_card(target uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  me uuid:=auth.uid(); p iskra_social.people; u auth.users;
  teacher boolean; student_avatar text; student_icon text; photo text;
begin
  if me is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then return null; end if;
  select * into p from iskra_social.people where account=target;
  if not found or not (target=me or p.searchable or exists(select 1 from iskra_social.contacts c
    where (c.sender=me and c.recipient=target) or (c.recipient=me and c.sender=target))) then return null; end if;
  select * into u from auth.users where id=target;
  teacher:=coalesce(u.raw_app_meta_data->>'role','') in ('teacher','admin');
  select s.avatar_path,s.preferences->>'avatarId' into student_avatar,student_icon
    from public.students s where s.auth_user_id=target order by s.updated_at desc nulls last,s.id limit 1;
  photo:=case when teacher then u.raw_user_meta_data->>'avatarPath' else coalesce(student_avatar,u.raw_user_meta_data->>'avatarPath') end;
  -- Never let user-editable metadata expose another person's uploaded image.
  if split_part(photo,'/',1) is distinct from target::text then photo:=null; end if;
  return jsonb_build_object('personKey',p.profile_key,'handle',p.handle,
    'name',coalesce(nullif(trim(u.raw_user_meta_data->>'name'),''),nullif(trim(u.raw_user_meta_data->>'full_name'),''),p.handle),
    'role',case when teacher then 'teacher' when exists(select 1 from public.students s where s.auth_user_id=target) then 'student' else 'member' end,
    'avatarId',case when teacher then coalesce(u.raw_user_meta_data->>'avatarId','flower') else coalesce(student_icon,u.raw_user_meta_data->>'avatarId','flower') end,
    'avatarPath',photo,
    'relationship',case when exists(select 1 from public.students s where s.auth_user_id=me and s.created_by=target) then 'my_teacher'
      when exists(select 1 from public.students s where s.auth_user_id=target and s.created_by=me) then 'my_student' else null end);
end $$;
revoke all on function iskra_social.person_card(uuid) from public,anon,authenticated;

create or replace function iskra_social.desktop_people(expected_account uuid, operation text, payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); result jsonb; target uuid; card jsonb; edge iskra_social.contacts;
begin
  if me is null or me is distinct from expected_account or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'sign_in_required'; end if;
  if operation='remove' then
    delete from iskra_social.contacts where id=(payload->>'id')::uuid and accepted and (sender=me or recipient=me);
    return to_jsonb(found);
  end if;
  if operation='person' then
    select account into target from iskra_social.people where profile_key=(payload->>'personKey')::uuid;
    card:=iskra_social.person_card(target);
    if card is null then return jsonb_build_object('status','missing'); end if;
    select * into edge from iskra_social.contacts where (sender=me and recipient=target) or (recipient=me and sender=target);
    return card || jsonb_build_object('status','found','id',edge.id,'state',case when edge.accepted then 'friend' when edge.sender=me then 'outgoing' when edge.recipient=me then 'incoming' else 'none' end);
  end if;
  -- Delegate existing operations to preserve deployed share-link and rate-limit behavior.
  result:=iskra_social.desktop_friends(expected_account,operation,payload);
  if operation='snapshot' then
    return result || jsonb_build_object('contacts',(select coalesce(jsonb_agg(item || iskra_social.person_card(p.account) order by item->>'handle'),'[]'::jsonb)
      from jsonb_array_elements(result->'contacts') item join iskra_social.people p on p.handle=item->>'handle'));
  elsif operation in ('search','open_link') and result->>'handle' is not null then
    select account into target from iskra_social.people where handle=result->>'handle';
    card:=iskra_social.person_card(target);
    if card is not null then return result || card; end if;
  end if;
  return result;
end $$;
revoke all on function iskra_social.desktop_people(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function iskra_social.desktop_people(uuid,text,jsonb) to authenticated;
create or replace function public.desktop_people(expected_account uuid,operation text,payload jsonb default '{}')
returns jsonb language sql security invoker set search_path='' as $$ select iskra_social.desktop_people(expected_account,operation,payload) $$;
revoke all on function public.desktop_people(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.desktop_people(uuid,text,jsonb) to authenticated;

-- Preserve existing storage access; allow only the current public avatar, not an owner's whole folder.
create or replace function iskra_social.can_read_social_avatar(path text)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare target uuid; card jsonb;
begin
  if auth.uid() is null then return false; end if;
  select account into target from iskra_social.people where account::text=split_part(path,'/',1);
  card:=iskra_social.person_card(target);
  return coalesce(card->>'avatarPath'=path,false);
end $$;
revoke all on function iskra_social.can_read_social_avatar(text) from public,anon,authenticated;
create or replace function public.can_read_avatar(p_name text)
returns boolean language sql stable security definer set search_path='' as $$
  select (storage.foldername(p_name))[1]=auth.uid()::text or public.is_admin()
  or exists(select 1 from public.students s where s.auth_user_id::text=(storage.foldername(p_name))[1] and s.created_by=auth.uid())
  or iskra_social.can_read_social_avatar(p_name);
$$;
revoke all on function public.can_read_avatar(text) from public,anon;
grant execute on function public.can_read_avatar(text) to authenticated;
commit;
