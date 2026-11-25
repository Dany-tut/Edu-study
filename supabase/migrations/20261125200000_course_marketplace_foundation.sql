-- Площадка курсов: основа (витрина → запись/покупка → доступ).
-- План: docs/analysis/course-marketplace-2026-11-25.md, §3.
--
-- Только ДОБАВЛЯЕТ: новые таблицы, колонку students.source с умолчанием
-- 'teacher', новые функции и одну ветку в my_hidden_course_items(). Ни одна
-- существующая строка не переписывается, курсы репетиторов в витрину не
-- попадают (курс виден в каталоге только при строке course_listings со
-- статусом 'published').
--
-- Модель:
--  • покупатель = обычная строка students без группы, владелец = автор курса,
--    source='purchase'. Весь ученический путь (трек, прогресс, ДЗ, журнал
--    автора) работает без переделки;
--  • источник правды о доступе — course_entitlements. courses.student_ids и
--    course_enrollments для покупателя — проекция: их держит функция
--    _catalog_project_entitlement, а триггеры не дают сохранению курса или
--    окна доступа случайно снять оплаченный доступ;
--  • пробный доступ (access='preview') открывает только модули из
--    course_listings.preview_module_ids — остальное прячет RLS через
--    my_hidden_course_items();
--  • платёжного провайдера пока нет: платный курс создаёт заявку
--    (course_orders.status='requested'), автор или админ подтверждает её
--    после оплаты. Провайдер встанет на место 'manual' без смены схемы.

-- ── 1. Покупатели не съедают лимит тарифа учителя ─────────────────────────
alter table public.students add column if not exists source text not null default 'teacher';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'students_source_check') then
    alter table public.students add constraint students_source_check check (source in ('teacher','purchase'));
  end if;
end $$;
create index if not exists students_auth_owner_source_idx on public.students(auth_user_id, created_by) where source = 'purchase';

create or replace function public.enforce_student_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_max integer; v_used bigint;
begin
  if new.source = 'purchase' then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended(new.created_by::text, 0));
  if exists(select 1 from public.students s where s.created_by = new.created_by and s.person_id = new.person_id) then return new; end if;
  select p.max_students into v_max from public.teacher_subscriptions sub join public.plans p on p.code = sub.plan_code
  where sub.teacher_id = new.created_by and sub.status = 'active' and (sub.expires_at is null or sub.expires_at > now());
  if v_max is null then return new; end if;
  select count(distinct coalesce(person_id,id)) into v_used from public.students
   where created_by = new.created_by and source = 'teacher';
  if v_used >= v_max then raise exception 'STUDENT_LIMIT:%', v_max; end if;
  return new;
end $$;

create or replace function public.my_plan()
returns table(plan_code text, plan_name text, price_rub integer, max_students integer,
expires_at timestamptz, status text, students_used bigint)
language sql stable security definer set search_path = public as $$
select s.plan_code,p.name,p.price_rub,p.max_students,s.expires_at,s.status,
(select count(distinct coalesce(st.person_id,st.id)) from public.students st
  where st.created_by = auth.uid() and st.source = 'teacher')
from public.teacher_subscriptions s join public.plans p on p.code=s.plan_code where s.teacher_id=auth.uid();
$$;

-- ── 2. Витрина ────────────────────────────────────────────────────────────
create table if not exists public.course_listings (
  course_id uuid primary key references public.courses(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  status text not null default 'draft' check (status in ('draft','review','published','rejected','archived')),
  category text not null default 'other',
  price_kopecks integer not null default 0 check (price_kopecks >= 0 and price_kopecks <= 100000000),
  subtitle text not null default '' check (length(subtitle) <= 300),
  description text not null default '' check (length(description) <= 8000),
  outcomes text[] not null default '{}',
  audience text not null default '' check (length(audience) <= 1000),
  level_label text not null default '',
  duration_label text not null default '',
  cover_tone text not null default '',
  cover_glyph text not null default '' check (length(cover_glyph) <= 12),
  preview_module_ids uuid[] not null default '{}',
  certificate_note text not null default '',
  -- «Проверено на дату»: нормы (налоги, учёт) меняются, покупатель видит
  -- актуальность материала. Ставит автор при сверке курса.
  content_checked_on date,
  author_note text not null default '' check (length(author_note) <= 300),
  reject_reason text,
  moderated_by uuid,
  moderated_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists course_listings_status_idx on public.course_listings(status, category);

-- Публикуют и отклоняют только админы (модерация). Автор может черновик,
-- «на модерацию» и «в архив». Любая правка опубликованного листинга
-- автором возвращает его на модерацию — кроме перевода в архив.
create or replace function public._course_listing_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if public.is_admin() or auth.uid() is null then
    if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
      new.published_at := coalesce(new.published_at, now());
      new.moderated_at := now(); new.moderated_by := auth.uid(); new.reject_reason := null;
    end if;
    return new;
  end if;
  if new.status in ('published','rejected') and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    raise exception 'LISTING_MODERATION_ONLY' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    new.moderated_by := old.moderated_by; new.moderated_at := old.moderated_at;
    new.published_at := old.published_at;
    if old.status in ('published','rejected') and new.status = old.status
       and row(new.*) is distinct from row(old.*) then
      new.status := 'review'; new.reject_reason := null;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists course_listings_guard on public.course_listings;
create trigger course_listings_guard before insert or update on public.course_listings
  for each row execute function public._course_listing_guard();

alter table public.course_listings enable row level security;
drop policy if exists course_listings_owner on public.course_listings;
create policy course_listings_owner on public.course_listings for all to authenticated
  using ((select public.is_admin()) or course_id = any ((select public.my_owned_course_ids())::uuid[]))
  with check ((select public.is_admin()) or course_id = any ((select public.my_owned_course_ids())::uuid[]));
grant select, insert, update, delete on public.course_listings to authenticated;

-- ── 3. Заявки и заказы ────────────────────────────────────────────────────
create table if not exists public.course_orders (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  buyer_auth_user_id uuid not null,
  student_id uuid references public.students(id) on delete set null,
  amount_kopecks integer not null check (amount_kopecks >= 0),
  currency text not null default 'RUB',
  status text not null default 'requested' check (status in ('requested','pending','paid','canceled','refunded')),
  provider text not null default 'manual',
  provider_payment_id text unique,
  contact_email text,
  buyer_note text check (length(buyer_note) <= 1000),
  offer_version text,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists course_orders_course_idx on public.course_orders(course_id, status);
create index if not exists course_orders_buyer_idx on public.course_orders(buyer_auth_user_id);
-- Одна открытая заявка на человека и курс: повторное нажатие не плодит заказы.
create unique index if not exists course_orders_one_open on public.course_orders(course_id, buyer_auth_user_id)
  where status in ('requested','pending');

alter table public.course_orders enable row level security;
drop policy if exists course_orders_read on public.course_orders;
create policy course_orders_read on public.course_orders for select to authenticated
  using ((select public.is_admin())
      or buyer_auth_user_id = (select auth.uid())
      or course_id = any ((select public.my_owned_course_ids())::uuid[]));
grant select on public.course_orders to authenticated;

-- ── 4. Права доступа ──────────────────────────────────────────────────────
create table if not exists public.course_entitlements (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  auth_user_id uuid not null,
  access text not null check (access in ('preview','full')),
  source text not null check (source in ('free','preview','purchase','manual','admin')),
  order_id uuid references public.course_orders(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid,
  unique (course_id, auth_user_id)
);
create index if not exists course_entitlements_user_idx on public.course_entitlements(auth_user_id) where revoked_at is null;
create index if not exists course_entitlements_course_idx on public.course_entitlements(course_id) where revoked_at is null;

alter table public.course_entitlements enable row level security;
drop policy if exists course_entitlements_read on public.course_entitlements;
create policy course_entitlements_read on public.course_entitlements for select to authenticated
  using ((select public.is_admin())
      or auth_user_id = (select auth.uid())
      or course_id = any ((select public.my_owned_course_ids())::uuid[]));
grant select on public.course_entitlements to authenticated;

-- ── 5. Согласия (152-ФЗ: отдельный документ, версия, время) ───────────────
create table if not exists public.user_consents (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null,
  kind text not null check (kind in ('pd_processing','offer')),
  document_version text not null check (length(document_version) between 1 and 40),
  context text,
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz
);
create index if not exists user_consents_user_idx on public.user_consents(auth_user_id, kind);
alter table public.user_consents enable row level security;
drop policy if exists user_consents_own on public.user_consents;
create policy user_consents_own on public.user_consents for select to authenticated
  using (auth_user_id = (select auth.uid()) or (select public.is_admin()));
grant select on public.user_consents to authenticated;

-- ── 6. Проекция права в курс ──────────────────────────────────────────────
-- Держит покупателя в courses.student_ids и course_enrollments(access_mode
-- 'full'), пока право активно. Вызывается только из функций ниже.
create or replace function public._catalog_project_entitlement(p_course uuid, p_student uuid, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select created_by into v_owner from public.courses where id = p_course;
  if p_active then
    update public.courses set student_ids = array_append(coalesce(student_ids,'{}'), p_student)
     where id = p_course and not (p_student = any (coalesce(student_ids,'{}')));
    insert into public.course_enrollments(course_id, student_id, access_mode, created_by)
    values (p_course, p_student::text, 'full', v_owner)
    on conflict (course_id, student_id) do update set access_mode = 'full';
  else
    perform set_config('iskra.catalog_revoke', p_student::text, true);
    update public.courses set student_ids = array_remove(student_ids, p_student) where id = p_course;
    delete from public.course_enrollments where course_id = p_course and student_id = p_student::text;
    perform set_config('iskra.catalog_revoke', '', true);
  end if;
end $$;

-- Сохранение курса (полное или дельтой) и окно доступа пишут student_ids
-- целиком. Оплаченный доступ снимается только через catalog_revoke.
create or replace function public._course_keep_entitled() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_keep uuid[];
begin
  select coalesce(array_agg(e.student_id), '{}') into v_keep
    from public.course_entitlements e
   where e.course_id = new.id and e.revoked_at is null
     and e.student_id::text is distinct from nullif(current_setting('iskra.catalog_revoke', true), '')
     and not (e.student_id = any (coalesce(new.student_ids,'{}')));
  if cardinality(v_keep) > 0 then new.student_ids := coalesce(new.student_ids,'{}') || v_keep; end if;
  return new;
end $$;
drop trigger if exists courses_keep_entitled on public.courses;
create trigger courses_keep_entitled before update of student_ids on public.courses
  for each row when (new.student_ids is distinct from old.student_ids)
  execute function public._course_keep_entitled();

create or replace function public._enrollment_keep_entitled() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.course_entitlements e
              where e.course_id = old.course_id and e.student_id::text = old.student_id
                and e.revoked_at is null
                and old.student_id is distinct from nullif(current_setting('iskra.catalog_revoke', true), '')) then
    if tg_op = 'DELETE' then return null; end if;
    new.access_mode := 'full';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
drop trigger if exists course_enrollments_keep_entitled on public.course_enrollments;
create trigger course_enrollments_keep_entitled before update or delete on public.course_enrollments
  for each row execute function public._enrollment_keep_entitled();

-- ── 7. Пробный доступ: прятать модули вне preview_module_ids ──────────────
-- Добавлена ветка «модули курса, к которому у меня только пробный доступ».
create or replace function public.my_hidden_course_items()
returns text[] language sql stable security definer set search_path to '' as $$
  select coalesce(array_agg(x), '{}'::text[]) from (
    select v.course_id::text || '|' || v.item_kind || '|' || v.item_key as x
      from public.course_item_visibility v
     where v.hidden and v.course_id = any (public.my_course_ids())
    union all
    select m.course_id::text || '|module|' || m.id::text
      from public.course_entitlements e
      join public.course_listings l on l.course_id = e.course_id
      join public.course_modules m on m.course_id = e.course_id
     where e.auth_user_id = auth.uid() and e.revoked_at is null and e.access = 'preview'
       and not (m.id = any (l.preview_module_ids))
  ) items;
$$;
revoke all on function public.my_hidden_course_items() from public, anon;
grant execute on function public.my_hidden_course_items() to authenticated, service_role;

-- ── 8. Каталог для всех, включая гостя ────────────────────────────────────
create or replace function public._catalog_author_name(p_uid uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')), ''), nullif(p.name,''), 'Искра')
    from (select p_uid as id) u left join public.profiles p on p.id = u.id;
$$;
revoke all on function public._catalog_author_name(uuid) from public, anon, authenticated;

create or replace function public.catalog_list()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.published_at desc nulls last), '[]'::jsonb) from (
    select l.slug, l.category, l.price_kopecks, l.subtitle, l.level_label, l.duration_label,
           l.cover_tone, l.cover_glyph, l.published_at, l.content_checked_on,
           c.title, c.subject, public._catalog_author_name(c.created_by) as author,
           (select count(*) from public.course_modules m where m.course_id = c.id) as module_count,
           (select count(*) from public.lessons x where x.course_id = c.id) as lesson_count,
           cardinality(l.preview_module_ids) > 0 as has_preview
      from public.course_listings l join public.courses c on c.id = l.course_id
     where l.status = 'published' and c.status = 'published'
  ) t;
$$;

-- Карточка: метаданные и программа (названия модулей и уроков), без
-- содержимого уроков. Владелец и админ видят и неопубликованный листинг
-- (предпросмотр перед отправкой на модерацию).
create or replace function public.catalog_course(p_slug text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare l public.course_listings; c public.courses; v_uid uuid := auth.uid(); v_ent public.course_entitlements; v_order public.course_orders;
begin
  select * into l from public.course_listings where slug = p_slug;
  if not found then return null; end if;
  select * into c from public.courses where id = l.course_id;
  if not (l.status = 'published' and c.status = 'published')
     and not (v_uid is not null and (public.is_admin() or c.created_by = v_uid)) then
    return null;
  end if;
  if v_uid is not null then
    select * into v_ent from public.course_entitlements where course_id = c.id and auth_user_id = v_uid and revoked_at is null;
    select * into v_order from public.course_orders where course_id = c.id and buyer_auth_user_id = v_uid
      order by created_at desc limit 1;
  end if;
  return jsonb_build_object(
    'course_id', c.id, 'slug', l.slug, 'status', l.status, 'course_status', c.status,
    'title', c.title, 'subject', c.subject, 'category', l.category,
    'price_kopecks', l.price_kopecks, 'subtitle', l.subtitle, 'description', l.description,
    'outcomes', to_jsonb(l.outcomes), 'audience', l.audience, 'level_label', l.level_label,
    'duration_label', l.duration_label, 'cover_tone', l.cover_tone, 'cover_glyph', l.cover_glyph,
    'certificate_note', l.certificate_note, 'author_note', l.author_note, 'content_checked_on', l.content_checked_on,
    'author', public._catalog_author_name(c.created_by),
    'is_owner', v_uid is not null and (c.created_by = v_uid or public.is_admin()),
    'modules', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', m.id, 'label', m.label,
        'preview', m.id = any (l.preview_module_ids),
        'lessons', (select coalesce(jsonb_agg(x.title order by x.lesson_number nulls last, x.created_at), '[]'::jsonb)
                      from public.lessons x where x.module_id = m.id)
      ) order by m.position, m.created_at), '[]'::jsonb)
      from public.course_modules m where m.course_id = c.id),
    'viewer', jsonb_build_object(
      'signed_in', v_uid is not null,
      'access', coalesce(v_ent.access, 'none'),
      'student_id', v_ent.student_id,
      'order_status', v_order.status
    )
  );
end $$;

revoke all on function public.catalog_list() from public;
revoke all on function public.catalog_course(text) from public;
grant execute on function public.catalog_list() to anon, authenticated;
grant execute on function public.catalog_course(text) to anon, authenticated;

-- ── 9. Запись на курс ─────────────────────────────────────────────────────
-- p_mode: 'preview' — пробный модуль; 'full' — бесплатный курс сразу,
-- платный — заявка (+ пробный доступ, если он есть у курса).
create or replace function public.catalog_enroll(p_slug text, p_mode text, p_pd_version text, p_offer_version text default null,
  p_name text default null, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_email text; l public.course_listings; c public.courses;
  v_student public.students; v_ent public.course_entitlements; v_order public.course_orders;
  v_name text; v_access text; v_has_preview boolean;
begin
  if v_uid is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'CATALOG_SIGN_IN_REQUIRED' using errcode = '42501';
  end if;
  if p_mode not in ('preview','full') then raise exception 'CATALOG_BAD_MODE'; end if;
  if coalesce(trim(p_pd_version), '') = '' then raise exception 'CATALOG_CONSENT_REQUIRED'; end if;
  select * into l from public.course_listings where slug = p_slug and status = 'published' for share;
  if not found then raise exception 'CATALOG_NOT_FOUND'; end if;
  select * into c from public.courses where id = l.course_id and status = 'published';
  if not found then raise exception 'CATALOG_NOT_FOUND'; end if;
  if c.created_by = v_uid then raise exception 'CATALOG_OWN_COURSE'; end if;
  v_has_preview := cardinality(l.preview_module_ids) > 0;
  if p_mode = 'preview' and not v_has_preview and l.price_kopecks > 0 then raise exception 'CATALOG_NO_PREVIEW'; end if;

  -- Одна запись на человека и курс; параллельные нажатия ждут друг друга.
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text || ':' || c.id::text, 0));

  select email into v_email from auth.users where id = v_uid;
  insert into public.user_consents(auth_user_id, kind, document_version, context)
  values (v_uid, 'pd_processing', p_pd_version, 'catalog:' || l.slug);
  if p_offer_version is not null then
    insert into public.user_consents(auth_user_id, kind, document_version, context)
    values (v_uid, 'offer', p_offer_version, 'catalog:' || l.slug);
  end if;

  -- Ученик автора для этого человека: переиспользуем, если уже есть.
  select * into v_student from public.students
   where auth_user_id = v_uid and created_by = c.created_by
   order by (source = 'purchase') desc, created_at limit 1;
  if not found then
    v_name := coalesce(nullif(trim(p_name), ''),
      (select nullif(trim(coalesce(first_name,'') || ' ' || coalesce(last_name,'')), '') from public.profiles where id = v_uid),
      (select nullif(name, '') from public.profiles where id = v_uid),
      split_part(coalesce(v_email, ''), '@', 1), 'Ученик');
    insert into public.students(name, created_by, auth_user_id, email, source, group_id, invite_token)
    values (left(v_name, 120), c.created_by, v_uid, v_email, 'purchase', null, null)
    returning * into v_student;
  end if;

  select * into v_ent from public.course_entitlements where course_id = c.id and auth_user_id = v_uid;
  v_access := case when p_mode = 'full' and l.price_kopecks = 0 then 'full'
                   when v_has_preview then 'preview' else null end;

  if l.price_kopecks > 0 and p_mode = 'full'
     and not (v_ent.id is not null and v_ent.revoked_at is null and v_ent.access = 'full') then
    select * into v_order from public.course_orders
     where course_id = c.id and buyer_auth_user_id = v_uid and status in ('requested','pending');
    if not found then
      insert into public.course_orders(course_id, buyer_auth_user_id, student_id, amount_kopecks, contact_email, buyer_note, offer_version)
      values (c.id, v_uid, v_student.id, l.price_kopecks, v_email, nullif(trim(p_note), ''), p_offer_version)
      returning * into v_order;
    end if;
  end if;

  -- Выдать или повысить доступ. Снятый автором доступ (revoked) запись
  -- заново не возвращает: только бесплатный курс или новая оплата.
  if v_access is not null
     and (v_ent.id is null
          or (v_ent.revoked_at is null and v_ent.access = 'preview' and v_access = 'full')
          or (v_ent.revoked_at is not null and v_ent.source <> 'purchase' and v_access = 'full')) then
    insert into public.course_entitlements(course_id, student_id, auth_user_id, access, source)
    values (c.id, v_student.id, v_uid, v_access, case when v_access = 'full' then 'free' else 'preview' end)
    on conflict (course_id, auth_user_id) do update
      set access = excluded.access, source = excluded.source, student_id = excluded.student_id,
          revoked_at = null, revoked_by = null, granted_at = now()
    returning * into v_ent;
    perform public._catalog_project_entitlement(c.id, v_student.id, true);
  elsif v_ent.id is not null and v_ent.revoked_at is null then
    perform public._catalog_project_entitlement(c.id, v_ent.student_id, true);
  end if;

  select * into v_ent from public.course_entitlements where course_id = c.id and auth_user_id = v_uid and revoked_at is null;
  return jsonb_build_object(
    'access', coalesce(v_ent.access, 'none'),
    'order_id', v_order.id, 'order_status', v_order.status,
    'student', jsonb_build_object('id', v_student.id, 'name', v_student.name, 'groupId', coalesce(v_student.group_id::text, '')),
    'course_short_id', c.short_id
  );
end $$;
revoke all on function public.catalog_enroll(text, text, text, text, text, text) from public, anon;
grant execute on function public.catalog_enroll(text, text, text, text, text, text) to authenticated;

-- ── 10. Автор/админ: подтвердить оплату, отклонить, снять доступ ──────────
create or replace function public._catalog_can_manage(p_course uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (select 1 from public.courses where id = p_course and created_by = auth.uid());
$$;
revoke all on function public._catalog_can_manage(uuid) from public, anon, authenticated;

create or replace function public.catalog_decide_order(p_order uuid, p_decision text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o public.course_orders; v_ent public.course_entitlements; v_student uuid;
begin
  select * into o from public.course_orders where id = p_order for update;
  if not found or not public._catalog_can_manage(o.course_id) then raise exception 'CATALOG_FORBIDDEN' using errcode = '42501'; end if;
  if p_decision not in ('paid','canceled') then raise exception 'CATALOG_BAD_DECISION'; end if;
  if o.status not in ('requested','pending') then
    if o.status = p_decision then return jsonb_build_object('status', o.status); end if;
    raise exception 'CATALOG_ORDER_CLOSED';
  end if;
  update public.course_orders set status = p_decision, decided_by = auth.uid(), decided_at = now(),
         paid_at = case when p_decision = 'paid' then now() end
   where id = p_order returning * into o;
  if p_decision = 'paid' then
    v_student := o.student_id;
    if v_student is null then raise exception 'CATALOG_NO_STUDENT'; end if;
    insert into public.course_entitlements(course_id, student_id, auth_user_id, access, source, order_id)
    values (o.course_id, v_student, o.buyer_auth_user_id, 'full', 'purchase', o.id)
    on conflict (course_id, auth_user_id) do update
      set access = 'full', source = 'purchase', order_id = excluded.order_id, student_id = excluded.student_id,
          revoked_at = null, revoked_by = null, granted_at = now()
    returning * into v_ent;
    perform public._catalog_project_entitlement(o.course_id, v_student, true);
  end if;
  return jsonb_build_object('status', o.status);
end $$;

-- Снять доступ (возврат, ошибка). Строка права не удаляется, прогресс
-- ученика остаётся (docs/data-preservation.md).
create or replace function public.catalog_revoke(p_entitlement uuid)
returns void language plpgsql security definer set search_path = public as $$
declare e public.course_entitlements;
begin
  select * into e from public.course_entitlements where id = p_entitlement for update;
  if not found or not public._catalog_can_manage(e.course_id) then raise exception 'CATALOG_FORBIDDEN' using errcode = '42501'; end if;
  if e.revoked_at is not null then return; end if;
  update public.course_entitlements set revoked_at = now(), revoked_by = auth.uid() where id = e.id;
  perform public._catalog_project_entitlement(e.course_id, e.student_id, false);
end $$;

-- Сводка автора: его листинги с числами, ученики площадки, открытые заявки.
create or replace function public.catalog_author_overview()
returns jsonb language sql stable security definer set search_path = public as $$
  with mine as (
    select c.id, c.title, c.short_id, c.status as course_status, c.created_by
      from public.courses c
     where c.created_by = auth.uid()
        or (public.is_admin() and exists (select 1 from public.course_listings l where l.course_id = c.id))
  )
  select jsonb_build_object(
    'listings', (select coalesce(jsonb_agg(jsonb_build_object(
        'course_id', m.id, 'title', m.title, 'course_status', m.course_status,
        'listing', (select to_jsonb(l) from public.course_listings l where l.course_id = m.id),
        'learners_full', (select count(*) from public.course_entitlements e where e.course_id = m.id and e.revoked_at is null and e.access = 'full'),
        'learners_preview', (select count(*) from public.course_entitlements e where e.course_id = m.id and e.revoked_at is null and e.access = 'preview'),
        'orders_open', (select count(*) from public.course_orders o where o.course_id = m.id and o.status in ('requested','pending')),
        'paid_total_kopecks', (select coalesce(sum(o.amount_kopecks),0) from public.course_orders o where o.course_id = m.id and o.status = 'paid')
      ) order by m.title), '[]'::jsonb) from mine m),
    'orders', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', o.id, 'course_id', o.course_id, 'status', o.status, 'amount_kopecks', o.amount_kopecks,
        'created_at', o.created_at, 'contact_email', o.contact_email, 'buyer_note', o.buyer_note,
        'buyer_name', (select s.name from public.students s where s.id = o.student_id)
      ) order by o.created_at desc), '[]'::jsonb)
      from public.course_orders o join mine m on m.id = o.course_id
     where o.status in ('requested','pending') or o.created_at > now() - interval '60 days'),
    'learners', (select coalesce(jsonb_agg(jsonb_build_object(
        'entitlement_id', e.id, 'course_id', e.course_id, 'access', e.access, 'source', e.source,
        'granted_at', e.granted_at, 'name', s.name
      ) order by e.granted_at desc), '[]'::jsonb)
      from public.course_entitlements e join mine m on m.id = e.course_id
      left join public.students s on s.id = e.student_id
     where e.revoked_at is null)
  );
$$;

revoke all on function public.catalog_decide_order(uuid, text) from public, anon;
revoke all on function public.catalog_revoke(uuid) from public, anon;
revoke all on function public.catalog_author_overview() from public, anon;
grant execute on function public.catalog_decide_order(uuid, text) to authenticated;
grant execute on function public.catalog_revoke(uuid) to authenticated;
grant execute on function public.catalog_author_overview() to authenticated;

revoke all on function public._catalog_project_entitlement(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public._course_keep_entitled() from public, anon, authenticated;
revoke all on function public._enrollment_keep_entitled() from public, anon, authenticated;
revoke all on function public._course_listing_guard() from public, anon, authenticated;
