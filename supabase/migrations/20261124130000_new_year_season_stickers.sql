-- Новый год 2027: второй сезон в app_seasons и коллекция стикеров ученика.
-- Макеты: Figma «Искра», стр. «19 · Искра · Новый год 2027 · концепты» (секции A–H).
--
-- Только добавление: существующие строки и таблицы не меняются, кроме расширения
-- списка допустимых вариантов оформления (lanterns/candy/potions остаются).

-- 1. Варианты новогодней темы.
alter table public.app_seasons drop constraint if exists app_seasons_variant_check;
alter table public.app_seasons add constraint app_seasons_variant_check
  check (variant in ('lanterns', 'candy', 'potions', 'yolka', 'polnoch', 'shar'));

insert into public.app_seasons (key, enabled, starts_at, ends_at, variant, parts) values
  ('new-year', true, '2026-12-20 00:00+03', '2027-01-11 00:00+03', 'yolka', '{"ask": true}'::jsonb)
on conflict (key) do nothing;

-- 2. Стикеры. Одна строка — один полученный стикер.
--    source: hw (сдал ДЗ), video (досмотрел видеоурок до 90%), streak (серия дней),
--    teacher (подарок учителя при проверке ДЗ), secret.
--    source_ref — за что (lesson_ref ДЗ, ключ видео, длина серии): не даёт выдать
--    стикер дважды за одно и то же.
create table if not exists public.season_stickers (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  season_key text not null,
  sticker_key text not null,
  source text not null check (source in ('hw', 'video', 'streak', 'teacher', 'secret')),
  source_ref text not null default '',
  achievement text,
  given_by uuid,
  note text check (note is null or char_length(note) <= 200),
  seen_at timestamptz,
  created_at timestamptz not null default now(),
  unique (student_id, season_key, sticker_key),
  unique (student_id, season_key, source, source_ref)
);

create index if not exists season_stickers_student_idx
  on public.season_stickers (student_id, season_key, created_at desc);

alter table public.season_stickers enable row level security;

-- Читает сам ученик, его учитель и админ.
drop policy if exists season_stickers_read on public.season_stickers;
create policy season_stickers_read on public.season_stickers for select to authenticated
using (
  student_id = any(public.my_student_ids())
  or (select public.is_admin())
  or exists (
    select 1 from public.students s
    where s.id = student_id
      and (s.created_by = (select auth.uid()) or s.group_id = any(public.my_taught_group_ids()))
  )
);

-- Ученик сам получает стикеры за свои действия (не подарки учителя).
drop policy if exists season_stickers_student_insert on public.season_stickers;
create policy season_stickers_student_insert on public.season_stickers for insert to authenticated
with check (
  student_id = any(public.my_student_ids())
  and source in ('hw', 'video', 'streak', 'secret')
  and given_by is null
);

-- Ученик отмечает новый стикер просмотренным (только seen_at; см. триггер ниже).
drop policy if exists season_stickers_student_seen on public.season_stickers;
create policy season_stickers_student_seen on public.season_stickers for update to authenticated
using (student_id = any(public.my_student_ids()))
with check (student_id = any(public.my_student_ids()));

-- Учитель дарит стикер своему ученику.
drop policy if exists season_stickers_teacher_insert on public.season_stickers;
create policy season_stickers_teacher_insert on public.season_stickers for insert to authenticated
with check (
  source = 'teacher'
  and given_by = (select auth.uid())
  and (
    (select public.is_admin())
    or exists (
      select 1 from public.students s
      where s.id = student_id
        and (s.created_by = (select auth.uid()) or s.group_id = any(public.my_taught_group_ids()))
    )
  )
);

-- Обновлять можно только отметку «просмотрен»: остальное у полученного стикера неизменно.
create or replace function public.season_stickers_only_seen()
returns trigger language plpgsql as $$
begin
  if (new.student_id, new.season_key, new.sticker_key, new.source, new.source_ref,
      coalesce(new.achievement, ''), coalesce(new.given_by::text, ''), coalesce(new.note, ''), new.created_at)
     is distinct from
     (old.student_id, old.season_key, old.sticker_key, old.source, old.source_ref,
      coalesce(old.achievement, ''), coalesce(old.given_by::text, ''), coalesce(old.note, ''), old.created_at) then
    raise exception 'season_stickers: only seen_at can change';
  end if;
  return new;
end $$;

drop trigger if exists season_stickers_only_seen on public.season_stickers;
create trigger season_stickers_only_seen before update on public.season_stickers
  for each row execute function public.season_stickers_only_seen();

-- Подарок учителя → уведомление ученику в колокольчик.
create or replace function public.season_sticker_gift_notify()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.source = 'teacher' then
    insert into public.notifications (recipient_id, recipient_role, type, title, body, link)
    values (
      new.student_id, 'student', 'sticker_gift',
      'Подарок от учителя',
      coalesce(nullif(new.note, ''), 'Новый стикер в альбоме'),
      jsonb_build_object('page', 'stickers', 'sticker', new.sticker_key, 'season', new.season_key)
    );
  end if;
  return new;
end $$;

drop trigger if exists season_sticker_gift_notify on public.season_stickers;
create trigger season_sticker_gift_notify after insert on public.season_stickers
  for each row execute function public.season_sticker_gift_notify();
