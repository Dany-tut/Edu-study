-- Finish the photo-storage work from claude/chembio-hw-photos-95e685.
-- Keep uploads OFF until hw-grade and the cleanup function are deployed.
insert into public.app_flags (key, enabled, about)
values ('homework_photos_storage', false, 'Фото решений ДЗ в приватном хранилище на 7 дней')
on conflict (key) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('homework-photos', 'homework-photos', false, 5242880,
        array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Kept outside the exposed public schema. Card ownership is checked as well
-- as the uploader uid, so another teacher of the same person has no access.
create schema if not exists private;
grant usage on schema private to authenticated;
create or replace function private.can_read_homework_photo(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and (
    (storage.foldername(p_name))[1] = (select auth.uid())::text
    or public.is_admin()
    or exists (
      select 1 from public.students s
      join public.groups g on g.id = s.group_id
      where s.id::text = (storage.foldername(p_name))[2]
        and s.auth_user_id::text = (storage.foldername(p_name))[1]
        and g.created_by = (select auth.uid())
    )
  );
$$;
revoke all on function private.can_read_homework_photo(text) from public, anon;
grant execute on function private.can_read_homework_photo(text) to authenticated;

drop policy if exists "homework_photos student insert" on storage.objects;
create policy "homework_photos student insert" on storage.objects
for insert to authenticated with check (
  bucket_id = 'homework-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] = any (select unnest(public.my_student_ids())::text)
);

drop policy if exists "homework_photos read" on storage.objects;
create policy "homework_photos read" on storage.objects
for select to authenticated using (
  bucket_id = 'homework-photos'
  and created_at > now() - interval '7 days'
  and private.can_read_homework_photo(name)
);

-- Immutable submissions: no UPDATE policy, no upload upsert.
drop policy if exists "homework_photos owner delete" on storage.objects;
create policy "homework_photos owner delete" on storage.objects
for delete to authenticated using (
  bucket_id = 'homework-photos' and owner_id = (select auth.uid())::text
);

create or replace function public.homework_photos_expired(p_limit int default 1000)
returns setof text language sql stable security definer set search_path = '' as $$
  select o.name from storage.objects o
  where o.bucket_id = 'homework-photos' and o.created_at < now() - interval '7 days'
  order by o.created_at
  limit greatest(1, least(p_limit, 1000));
$$;
revoke all on function public.homework_photos_expired(int) from public, anon, authenticated;
grant execute on function public.homework_photos_expired(int) to service_role;

create extension if not exists pg_net;
create or replace function public.run_homework_photos_cleanup()
returns void language plpgsql security definer set search_path = '' as $$
declare
  fn_url text;
  secret text;
begin
  if not exists (select 1 from public.app_flags where key = 'homework_photos_storage' and enabled) then
    return;
  end if;
  select decrypted_secret into secret from vault.decrypted_secrets
  where name = 'homework_photos_cleanup_secret' limit 1;
  if secret is null then
    raise notice 'homework_photos_cleanup_secret is missing; cleanup skipped';
    return;
  end if;
  select decrypted_secret into fn_url from vault.decrypted_secrets
  where name = 'homework_photos_cleanup_url' limit 1;
  fn_url := coalesce(fn_url, 'https://igsdwvwiqnozgwczzycx.supabase.co/functions/v1/homework-photos-cleanup');
  perform net.http_post(
    url := fn_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cleanup-secret', secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
end;
$$;
revoke all on function public.run_homework_photos_cleanup() from public, anon, authenticated;
grant execute on function public.run_homework_photos_cleanup() to service_role;

select cron.unschedule('homework-photos-cleanup-daily')
where exists (select 1 from cron.job where jobname = 'homework-photos-cleanup-daily');
select cron.schedule('homework-photos-cleanup-daily', '30 3 * * *',
  $$select public.run_homework_photos_cleanup()$$);
