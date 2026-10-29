-- Фото профиля вместо иконки — у учителя и у ученика.
--
-- До этой миграции аватар был только id иконки (user_metadata.avatarId у
-- учителя, students.preferences.avatarId у ученика). Теперь можно загрузить
-- своё фото: клиент кадрирует его в квадрат 256×256 и сжимает в webp
-- (src/lib/avatarPhoto.ts), так что файл весит десятки килобайт.
--
-- Бакет ПРИВАТНЫЙ: среди учеников много детей, их лицо не должно открываться
-- по ссылке у кого угодно. Показываем через подписанные ссылки.
--
-- Путь объекта: <auth uid>/<мс>.webp. Новое фото — новое имя (старое клиент
-- удаляет), поэтому кэш браузера никогда не покажет прежний снимок.
--
-- Где лежит путь:
--   • учитель — user_metadata.avatarPath (читает только он сам);
--   • ученик — students.avatar_path на ВСЕХ его карточках (карточки-сиблинги
--     делят auth_user_id), чтобы фото видел учитель любого его направления.
--     Отдельная колонка, а не preferences: те перезаписываются целиком
--     синхронизацией настроек и затёрли бы путь.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', false, 524288,  -- 512 КБ / файл
  array['image/webp', 'image/jpeg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.students add column if not exists avatar_path text;

comment on column public.students.avatar_path is
  'Фото профиля ученика: ключ объекта в бакете avatars (<auth uid>/<мс>.webp). Пишет только set_my_avatar().';

-- ── Помощник ───────────────────────────────────────────────────────────────
-- Читать фото из папки <uid>/ может он сам, админ и учитель, у которого в
-- группе есть карточка с этим auth_user_id.
create or replace function public.can_read_avatar(p_name text)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select (storage.foldername(p_name))[1] = auth.uid()::text
      or public.is_admin()
      or exists (
        select 1 from public.students s
        where s.auth_user_id::text = (storage.foldername(p_name))[1]
          and s.group_id = any (public.my_taught_group_ids())
      );
$$;

revoke all on function public.can_read_avatar(text) from public, anon;
grant execute on function public.can_read_avatar(text) to authenticated;

-- ── Политики ───────────────────────────────────────────────────────────────
drop policy if exists "avatars own insert" on storage.objects;
create policy "avatars own insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars read" on storage.objects;
create policy "avatars read" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and public.can_read_avatar(name));

drop policy if exists "avatars own delete" on storage.objects;
create policy "avatars own delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── Запись пути ученику ────────────────────────────────────────────────────
-- Ставит (или снимает, p_path = null) фото на все карточки вошедшего ученика.
-- Путь обязан лежать в его собственной папке — чужое фото себе не поставить.
create or replace function public.set_my_avatar(p_path text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not authenticated';
  end if;
  if p_path is not null and split_part(p_path, '/', 1) <> me::text then
    raise exception 'avatar path outside own folder';
  end if;
  update public.students set avatar_path = p_path where auth_user_id = me;
end; $$;

revoke all on function public.set_my_avatar(text) from public, anon;
grant execute on function public.set_my_avatar(text) to authenticated;
