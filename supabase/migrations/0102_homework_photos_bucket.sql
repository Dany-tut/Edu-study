-- Фото сдач ДЗ — в хранилище, а не в базу. Живут 7 дней.
--
-- До этой миграции фото и доска ученика лежали base64-строкой внутри
-- lesson_progress.attachments и ели квоту Postgres (500 МБ). Теперь клиент
-- кладёт файл в приватный бакет homework-photos, а в JSONB пишет ссылку
-- `hwp:<путь>` (src/lib/homeworkPhotos.ts). Старые base64 читаются как раньше.
--
-- Путь объекта: <auth uid ученика>/<students.id карточки>/<мс>-<uuid>.<ext>.
-- uid — чтобы запись проверялась без запросов; id карточки — чтобы читать мог
-- только учитель ЭТОГО направления, а не каждый, кто ведёт того же человека
-- по другому предмету (карточки-сиблинги делят auth_user_id).
--
-- СРОК. Решение Дани (28.10.2026, правило П3 ХимБио): фото — персональные
-- данные, хранятся 7 дней. Балл, разбор и комментарии учителя остаются — они
-- в lesson_progress и сюда не относятся. Удаляет Edge Function
-- homework-photos-cleanup раз в сутки: прямой DELETE из storage.objects
-- Supabase запрещает (и он оставил бы сам файл в S3), нужен Storage API.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'homework-photos', 'homework-photos', false, 5242880,  -- 5 МБ / файл
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ── Помощник ───────────────────────────────────────────────────────────────
-- Может ли вошедший читать фото из папки <uid>/<student_id>/: это он сам,
-- админ или учитель группы этой карточки. SECURITY DEFINER — читает students
-- в обход их RLS (как my_taught_group_ids в 0087).
create or replace function public.can_read_homework_photo(p_name text)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select (storage.foldername(p_name))[1] = auth.uid()::text
      or public.is_admin()
      or exists (
        select 1 from public.students s
        where s.id::text = (storage.foldername(p_name))[2]
          and s.auth_user_id::text = (storage.foldername(p_name))[1]
          and s.group_id = any (public.my_taught_group_ids())
      );
$$;

revoke all on function public.can_read_homework_photo(text) from public;
grant execute on function public.can_read_homework_photo(text) to authenticated;

-- ── Политики ───────────────────────────────────────────────────────────────
-- Пишет ученик только в свою папку и только за свою карточку.
drop policy if exists "homework_photos student insert" on storage.objects;
create policy "homework_photos student insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'homework-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (storage.foldername(name))[2] = any (select unnest(public.my_student_ids())::text)
  );

-- Читают ученик, учитель группы, админ.
drop policy if exists "homework_photos read" on storage.objects;
create policy "homework_photos read" on storage.objects
  for select to authenticated
  using (bucket_id = 'homework-photos' and public.can_read_homework_photo(name));

-- Удалить своё может только загрузивший (снял фото до отправки и т.п.).
-- UPDATE не даём никому: сдача — документ, подменять файл задним числом нельзя.
drop policy if exists "homework_photos owner delete" on storage.objects;
create policy "homework_photos owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'homework-photos' and owner = auth.uid());

-- ── Чистка через 7 дней ────────────────────────────────────────────────────
-- Список просроченных объектов для функции чистки. Только service_role:
-- имена путей содержат uid учеников.
create or replace function public.homework_photos_expired(p_limit int default 1000)
returns setof text language sql stable security definer set search_path to 'public' as $$
  select o.name
  from storage.objects o
  where o.bucket_id = 'homework-photos'
    and o.created_at < now() - interval '7 days'
  order by o.created_at
  limit greatest(1, least(p_limit, 1000));
$$;

revoke all on function public.homework_photos_expired(int) from public, anon, authenticated;
grant execute on function public.homework_photos_expired(int) to service_role;

-- Вызов функции чистки. Как run_analytics_digest (0073): секрет в Vault под
-- именем homework_photos_cleanup_secret; нет секрета — notice и ничего.
create extension if not exists pg_net;

create or replace function public.run_homework_photos_cleanup()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  fn_url text;
  secret text;
begin
  select decrypted_secret into secret
  from vault.decrypted_secrets
  where name = 'homework_photos_cleanup_secret'
  limit 1;

  if secret is null then
    raise notice 'homework_photos_cleanup_secret нет в Vault — чистка фото пропущена';
    return;
  end if;

  -- Адрес тоже можно переопределить из Vault (локальный стек, ветка);
  -- по умолчанию — боевой проект.
  select decrypted_secret into fn_url
  from vault.decrypted_secrets
  where name = 'homework_photos_cleanup_url'
  limit 1;
  fn_url := coalesce(fn_url, 'https://igsdwvwiqnozgwczzycx.supabase.co/functions/v1/homework-photos-cleanup');

  perform net.http_post(
    url     := fn_url,
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'x-cleanup-secret', secret
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
end; $$;

revoke all on function public.run_homework_photos_cleanup() from public;

-- Каждый день в 03:30 UTC (06:30 МСК). Фото живёт 7–8 суток.
select cron.unschedule('homework-photos-cleanup-daily')
where exists (select 1 from cron.job where jobname = 'homework-photos-cleanup-daily');

select cron.schedule(
  'homework-photos-cleanup-daily',
  '30 3 * * *',
  $$select public.run_homework_photos_cleanup()$$
);
