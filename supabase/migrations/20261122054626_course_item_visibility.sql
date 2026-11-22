-- Visibility is independent of content snapshots, access grants and progress.
-- Stable item keys also let a teacher hide an item before its first content save.
create table public.course_item_visibility (
  course_id uuid not null references public.courses(id) on delete cascade,
  item_kind text not null check (item_kind in ('module','lesson')),
  item_key text not null check (length(item_key) between 1 and 160),
  hidden boolean not null,
  primary key (course_id,item_kind,item_key)
);
alter table public.course_item_visibility enable row level security;
revoke all on public.course_item_visibility from anon;
grant select,insert,update on public.course_item_visibility to authenticated;
create policy visibility_read on public.course_item_visibility for select to authenticated
using ((select public.is_admin()) or course_id in (select unnest(public.my_course_ids())));
create policy visibility_owner_write on public.course_item_visibility for all to authenticated
using ((select public.is_admin()) or exists (
  select 1 from public.courses c where c.id=course_id and c.created_by=(select auth.uid())
)) with check ((select public.is_admin()) or exists (
  select 1 from public.courses c where c.id=course_id and c.created_by=(select auth.uid())
));
create policy mfa_required on public.course_item_visibility as restrictive for all to authenticated
using ((select public.mfa_ok())) with check ((select public.mfa_ok()));

create function public.get_course_item_visibility(p_course text)
returns table(item_kind text,item_key text,hidden boolean)
language sql stable security invoker set search_path='' as $$
  select v.item_kind,v.item_key,v.hidden from public.course_item_visibility v
  join public.courses c on c.id=v.course_id where c.short_id=p_course;
$$;
create function public.set_course_item_visibility(p_course text,p_kind text,p_item text,p_hidden boolean)
returns boolean language plpgsql security invoker set search_path='' as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'Нужно войти в кабинет'; end if;
  select c.id into cid from public.courses c where c.short_id=p_course
    and (c.created_by=auth.uid() or public.is_admin());
  if cid is null then return false; end if;
  insert into public.course_item_visibility(course_id,item_kind,item_key,hidden)
    values(cid,p_kind,p_item,p_hidden)
    on conflict(course_id,item_kind,item_key) do update set hidden=excluded.hidden;
  return true;
end;
$$;
revoke all on function public.get_course_item_visibility(text) from public,anon;
revoke all on function public.set_course_item_visibility(text,text,text,boolean) from public,anon;
grant execute on function public.get_course_item_visibility(text) to authenticated;
grant execute on function public.set_course_item_visibility(text,text,text,boolean) to authenticated;

-- Restrictive policies also protect direct URLs/heavy lesson reads, including
-- clients published before this feature. Existing audience/MFA policies remain.
create policy module_student_visibility on public.course_modules as restrictive for select to authenticated
using ((select public.is_admin()) or exists (
  select 1 from public.courses c where c.id=course_id and c.created_by=(select auth.uid())
) or exists (
  select 1 from public.course_shares cs where cs.course_id=course_modules.course_id and cs.teacher_id=(select auth.uid())
) or not exists (
  select 1 from public.course_item_visibility v where v.course_id=course_modules.course_id
    and v.item_kind='module' and v.item_key=course_modules.id::text and v.hidden
));
create policy lesson_student_visibility on public.lessons as restrictive for select to authenticated
using ((select public.is_admin()) or exists (
  select 1 from public.courses c where c.id=course_id and c.created_by=(select auth.uid())
) or exists (
  select 1 from public.course_shares cs where cs.course_id=lessons.course_id and cs.teacher_id=(select auth.uid())
) or not exists (
  select 1 from public.course_item_visibility v where v.course_id=lessons.course_id and v.hidden
    and ((v.item_kind='lesson' and v.item_key=lessons.short_id)
      or (v.item_kind='module' and v.item_key=lessons.module_id::text))
));

-- Keep already-open student tracks in sync without a polling loop. Showing an
-- item updates a row instead of deleting it, so course_id remains in events.
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    alter publication supabase_realtime add table public.course_item_visibility;
  end if;
end $$;
