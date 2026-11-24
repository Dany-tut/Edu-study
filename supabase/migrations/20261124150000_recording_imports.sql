-- Автоимпорт записей уроков из публичной папки Google/Яндекс Диска.
-- Проект: design/recordings-import/README.md. Видео через Supabase НЕ идёт:
-- копирует служба iskra-media-sync на VPS (Диск → R2), сюда — только статусы.
--
-- Только добавление. Ссылку в уроке меняет одна функция media_sync_finish:
-- адресно (youtube_url и chapter_variants.source), с проверкой, что ссылка не
-- менялась с момента подтверждения; прежнее значение остаётся в строке импорта
-- и в iskra_history.row_versions.

-- 1. Папка модуля.
create table if not exists public.course_module_recording_sources (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null unique references public.course_modules(id) on delete cascade,
  provider text not null check (provider in ('gdrive', 'yadisk')),
  folder_url text not null check (char_length(folder_url) <= 500),
  folder_ref text not null check (char_length(folder_ref) <= 500),
  auto_sync boolean not null default true,
  last_scan_at timestamptz,
  last_error text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Файл из папки и его судьба. Уникальность (папка, файл): повторный запуск
--    видит только новые файлы.
create table if not exists public.recording_import_items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.course_module_recording_sources(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete set null,
  provider_file_id text not null check (char_length(provider_file_id) <= 500),
  file_name text not null check (char_length(file_name) <= 500),
  size_bytes bigint,
  match_kind text check (match_kind in ('number', 'title', 'order', 'manual')),
  status text not null default 'proposed'
    check (status in ('proposed', 'confirmed', 'copying', 'applied', 'conflict', 'failed', 'skipped')),
  replace_existing boolean not null default false,
  expected_old_url text,
  old_chapter_source text,
  r2_key text,
  media_url text,
  attempts int not null default 0,
  next_try_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, provider_file_id)
);
create index if not exists recording_import_items_queue on public.recording_import_items (status, next_try_at)
  where status in ('confirmed', 'copying');

alter table public.course_module_recording_sources enable row level security;
alter table public.recording_import_items enable row level security;

-- Может ли текущий пользователь вести записи этого модуля: админ или автор курса.
create or replace function public.recording_import_can_edit(p_module_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select public.is_admin()), false) or exists (
    select 1 from public.course_modules m join public.courses c on c.id = m.course_id
    where m.id = p_module_id and c.created_by = auth.uid())
$$;
revoke all on function public.recording_import_can_edit(uuid) from public, anon;
grant execute on function public.recording_import_can_edit(uuid) to authenticated;

drop policy if exists recording_sources_owner_read on public.course_module_recording_sources;
create policy recording_sources_owner_read on public.course_module_recording_sources
  for select to authenticated using ((select public.recording_import_can_edit(module_id)));
drop policy if exists recording_items_owner_read on public.recording_import_items;
create policy recording_items_owner_read on public.recording_import_items
  for select to authenticated using (exists (
    select 1 from public.course_module_recording_sources s
    where s.id = source_id and (select public.recording_import_can_edit(s.module_id))));
-- Запись — только через функции ниже.
revoke insert, update, delete on public.course_module_recording_sources, public.recording_import_items from anon, authenticated;

-- 3. Учитель: подключить/обновить папку модуля.
create or replace function public.recording_source_upsert(
  p_module_id uuid, p_provider text, p_folder_url text, p_folder_ref text, p_auto_sync boolean default true)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.recording_import_can_edit(p_module_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into public.course_module_recording_sources (module_id, provider, folder_url, folder_ref, auto_sync, created_by)
  values (p_module_id, p_provider, p_folder_url, p_folder_ref, coalesce(p_auto_sync, true), auth.uid())
  on conflict (module_id) do update set
    provider = excluded.provider, folder_url = excluded.folder_url, folder_ref = excluded.folder_ref,
    auto_sync = excluded.auto_sync, last_error = null, updated_at = now()
  returning id into v_id;
  return v_id;
end $$;

-- 4. Учитель подтвердил таблицу соответствий. p_items: [{provider_file_id,
--    file_name, size_bytes, lesson_id|null, match_kind, replace_existing}].
--    Файл без урока запоминается как skipped — повторно его не предлагаем.
--    Уже скопированное (applied/copying) не трогаем.
create or replace function public.recording_import_confirm(p_source_id uuid, p_items jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_module uuid; it jsonb; v_lesson uuid; v_url text; v_src text; v_status text; v_replace boolean; n int := 0;
begin
  select module_id into v_module from public.course_module_recording_sources where id = p_source_id;
  if v_module is null or not public.recording_import_can_edit(v_module) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  for it in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    v_lesson := nullif(it->>'lesson_id', '')::uuid;
    v_replace := coalesce((it->>'replace_existing')::boolean, false);
    v_url := null; v_src := null;
    if v_lesson is not null then
      select l.youtube_url, l.chapter_variants->>'source' into v_url, v_src
      from public.lessons l where l.id = v_lesson and l.module_id = v_module;
      if not found then raise exception 'lesson % is not in module', v_lesson; end if;
    end if;
    v_status := case
      when v_lesson is null then 'skipped'
      when nullif(btrim(coalesce(v_url, '')), '') is not null and not v_replace then 'skipped'
      else 'confirmed' end;
    insert into public.recording_import_items as r
      (source_id, lesson_id, provider_file_id, file_name, size_bytes, match_kind, status,
       replace_existing, expected_old_url, old_chapter_source, attempts, next_try_at, error)
    values (p_source_id, v_lesson, it->>'provider_file_id', it->>'file_name', nullif(it->>'size_bytes', '')::bigint,
       nullif(it->>'match_kind', ''), v_status, v_replace, v_url, v_src, 0, null, null)
    on conflict (source_id, provider_file_id) do update set
      lesson_id = excluded.lesson_id, file_name = excluded.file_name, size_bytes = excluded.size_bytes,
      match_kind = excluded.match_kind, status = excluded.status, replace_existing = excluded.replace_existing,
      expected_old_url = excluded.expected_old_url, old_chapter_source = excluded.old_chapter_source,
      attempts = 0, next_try_at = null, error = null, updated_at = now()
    where r.status not in ('applied', 'copying');
    n := n + 1;
  end loop;
  return n;
end $$;

-- 5. Учитель: «Вернуть прежнюю ссылку» — только если в уроке всё ещё наша
--    запись и прежняя ссылка была (пустоту обратно не пишем — защита уроков).
create or replace function public.recording_import_revert(p_item_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare r public.recording_import_items; v_module uuid; v_cur text;
begin
  select * into r from public.recording_import_items where id = p_item_id;
  select module_id into v_module from public.course_module_recording_sources where id = r.source_id;
  if v_module is null or not public.recording_import_can_edit(v_module) then raise exception 'forbidden' using errcode = '42501'; end if;
  if r.status <> 'applied' or nullif(btrim(coalesce(r.expected_old_url, '')), '') is null then return false; end if;
  select youtube_url into v_cur from public.lessons where id = r.lesson_id for update;
  if v_cur is distinct from r.media_url then return false; end if;
  update public.lessons set
    youtube_url = r.expected_old_url,
    chapter_variants = case when chapter_variants ? 'source' and chapter_variants->>'source' = r.media_url
      and r.old_chapter_source is not null
      then jsonb_set(chapter_variants, '{source}', to_jsonb(r.old_chapter_source)) else chapter_variants end
  where id = r.lesson_id;
  update public.recording_import_items set status = 'skipped', error = 'reverted', updated_at = now() where id = r.id;
  return true;
end $$;

revoke all on function public.recording_source_upsert(uuid, text, text, text, boolean) from public, anon;
revoke all on function public.recording_import_confirm(uuid, jsonb) from public, anon;
revoke all on function public.recording_import_revert(uuid) from public, anon;
grant execute on function public.recording_source_upsert(uuid, text, text, text, boolean) to authenticated;
grant execute on function public.recording_import_confirm(uuid, jsonb) to authenticated;
grant execute on function public.recording_import_revert(uuid) to authenticated;

-- 6. Служба на VPS. Ключа service_role у неё нет: она вызывает эти функции
--    обычным anon-ключом и предъявляет свой секрет; в БД лежит только его SHA-256.
create schema if not exists media_sync;
revoke all on schema media_sync from public, anon, authenticated;
create table if not exists media_sync.service_keys (
  key_sha256 text primary key,
  label text not null,
  created_at timestamptz not null default now()
);
revoke all on media_sync.service_keys from public, anon, authenticated;
alter table media_sync.service_keys enable row level security;

create or replace function media_sync.check_secret(p_secret text)
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if p_secret is null or char_length(p_secret) < 32 or not exists (
    select 1 from media_sync.service_keys where key_sha256 = encode(sha256(convert_to(p_secret, 'UTF8')), 'hex')
  ) then raise exception 'forbidden' using errcode = '42501'; end if;
end $$;
revoke all on function media_sync.check_secret(text) from public, anon, authenticated;

-- Взять в работу до p_limit подтверждённых файлов (и зависшие копирования > 2 ч).
create or replace function public.media_sync_claim(p_secret text, p_limit int default 1)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  perform media_sync.check_secret(p_secret);
  with picked as (
    select i.id from public.recording_import_items i
    where (i.status = 'confirmed' and (i.next_try_at is null or i.next_try_at <= now()))
       or (i.status = 'copying' and i.updated_at < now() - interval '2 hours')
    order by i.created_at
    limit greatest(1, least(coalesce(p_limit, 1), 5))
    for update skip locked
  ), upd as (
    update public.recording_import_items i set status = 'copying', attempts = i.attempts + 1, updated_at = now()
    from picked where i.id = picked.id returning i.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', u.id, 'provider', s.provider, 'folder_ref', s.folder_ref, 'provider_file_id', u.provider_file_id,
    'file_name', u.file_name, 'size_bytes', u.size_bytes, 'attempts', u.attempts,
    'lesson_short_id', l.short_id, 'course_id', l.course_id)), '[]'::jsonb) into v
  from upd u join public.course_module_recording_sources s on s.id = u.source_id
  left join public.lessons l on l.id = u.lesson_id;
  return v;
end $$;

-- Итог копирования. Успех — адресная подстановка ссылки с проверкой версии.
create or replace function public.media_sync_finish(
  p_secret text, p_item_id uuid, p_ok boolean, p_r2_key text default null, p_media_url text default null, p_error text default null)
returns text language plpgsql security definer set search_path = public as $$
declare r public.recording_import_items; v_cur text; v_cv jsonb;
begin
  perform media_sync.check_secret(p_secret);
  select * into r from public.recording_import_items where id = p_item_id for update;
  if not found or r.status <> 'copying' then return 'ignored'; end if;
  if not coalesce(p_ok, false) then
    update public.recording_import_items set
      status = case when r.attempts >= 3 then 'failed' else 'confirmed' end,
      next_try_at = now() + (interval '20 minutes' * r.attempts),
      error = left(coalesce(p_error, 'copy failed'), 500), updated_at = now()
    where id = r.id;
    return case when r.attempts >= 3 then 'failed' else 'retry' end;
  end if;
  if p_media_url is null or p_media_url !~ '^https://pub-7fc0bdb31ef8477cb024b613af34e1d8\.r2\.dev/rec/' then
    raise exception 'bad media url';
  end if;
  update public.recording_import_items set r2_key = p_r2_key, media_url = p_media_url where id = r.id;
  if r.lesson_id is null then
    update public.recording_import_items set status = 'skipped', error = 'lesson removed', updated_at = now() where id = r.id;
    return 'skipped';
  end if;
  select youtube_url, chapter_variants into v_cur, v_cv from public.lessons where id = r.lesson_id for update;
  if v_cur is distinct from r.expected_old_url then
    update public.recording_import_items set status = 'conflict',
      error = 'ссылка в уроке изменилась после подтверждения', updated_at = now() where id = r.id;
    return 'conflict';
  end if;
  update public.lessons set
    youtube_url = p_media_url,
    chapter_variants = case
      when v_cv is not null and jsonb_typeof(v_cv) = 'object' and v_cv ? 'source'
        and r.expected_old_url is not null and v_cv->>'source' = r.expected_old_url
      then jsonb_set(v_cv, '{source}', to_jsonb(p_media_url)) else v_cv end
  where id = r.lesson_id;
  update public.recording_import_items set status = 'applied', error = null, updated_at = now() where id = r.id;
  return 'applied';
end $$;

-- Папки, которые пора перепроверить (раз в 3 часа), с уроками модуля и уже
-- известными файлами — служба сама сопоставит новые.
create or replace function public.media_sync_sources_due(p_secret text, p_source_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  perform media_sync.check_secret(p_secret);
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id, 'provider', s.provider, 'folder_ref', s.folder_ref, 'module_id', s.module_id,
    'lessons', (select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'title', l.title, 'position', l.position,
        'lesson_number', l.lesson_number, 'youtube_url', l.youtube_url) order by l.position, l.lesson_number), '[]'::jsonb)
      from public.lessons l where l.module_id = s.module_id and coalesce(l.kind, 'lesson') <> 'test'),
    'known', (select coalesce(jsonb_agg(i.provider_file_id), '[]'::jsonb) from public.recording_import_items i where i.source_id = s.id),
    'claimed_lessons', (select coalesce(jsonb_agg(distinct i.lesson_id), '[]'::jsonb) from public.recording_import_items i
      where i.source_id = s.id and i.lesson_id is not null and i.status in ('confirmed', 'copying', 'applied', 'proposed'))
  )), '[]'::jsonb) into v
  from public.course_module_recording_sources s
  where (p_source_id is not null and s.id = p_source_id)
     or (p_source_id is null and s.auto_sync and (s.last_scan_at is null or s.last_scan_at < now() - interval '3 hours'));
  return v;
end $$;

-- Итог перепроверки: новые файлы. auto=true — пустой урок и уверенное совпадение,
-- подтверждаем сразу; иначе — proposed («ждёт подтверждения»).
create or replace function public.media_sync_record_scan(p_secret text, p_source_id uuid, p_items jsonb, p_error text default null)
returns int language plpgsql security definer set search_path = public as $$
declare it jsonb; v_lesson uuid; v_url text; v_src text; v_auto boolean; v_module uuid; n int := 0;
begin
  perform media_sync.check_secret(p_secret);
  select module_id into v_module from public.course_module_recording_sources where id = p_source_id;
  if v_module is null then return 0; end if;
  update public.course_module_recording_sources set last_scan_at = now(), last_error = left(p_error, 500) where id = p_source_id;
  for it in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    v_lesson := nullif(it->>'lesson_id', '')::uuid; v_url := null; v_src := null;
    if v_lesson is not null then
      select l.youtube_url, l.chapter_variants->>'source' into v_url, v_src
      from public.lessons l where l.id = v_lesson and l.module_id = v_module;
      if not found then v_lesson := null; end if;
    end if;
    v_auto := coalesce((it->>'auto')::boolean, false) and v_lesson is not null
      and nullif(btrim(coalesce(v_url, '')), '') is null;
    insert into public.recording_import_items
      (source_id, lesson_id, provider_file_id, file_name, size_bytes, match_kind, status, expected_old_url, old_chapter_source)
    values (p_source_id, v_lesson, it->>'provider_file_id', it->>'file_name', nullif(it->>'size_bytes', '')::bigint,
      nullif(it->>'match_kind', ''), case when v_auto then 'confirmed' else 'proposed' end, v_url, v_src)
    on conflict (source_id, provider_file_id) do nothing;
    if found then n := n + 1; end if;
  end loop;
  return n;
end $$;

revoke all on function public.media_sync_claim(text, int) from public;
revoke all on function public.media_sync_finish(text, uuid, boolean, text, text, text) from public;
revoke all on function public.media_sync_sources_due(text, uuid) from public;
revoke all on function public.media_sync_record_scan(text, uuid, jsonb, text) from public;
grant execute on function public.media_sync_claim(text, int) to anon;
grant execute on function public.media_sync_finish(text, uuid, boolean, text, text, text) to anon;
grant execute on function public.media_sync_sources_due(text, uuid) to anon;
grant execute on function public.media_sync_record_scan(text, uuid, jsonb, text) to anon;
