// Проверка основы площадки курсов (миграция 20261125200000) на настоящем
// PostgreSQL: модерация листинга, каталог для гостя, пробный и полный доступ,
// заявка → подтверждение, защита оплаченного доступа от сохранения курса,
// снятие доступа без удаления данных, лимит тарифа, изоляция авторов.
//
// Docker: node scripts/checkCourseMarketplaceDb.mjs
// Без Docker: ISKRA_PGLITE_TEST_MODULE=<путь к @electric-sql/pglite> node …
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

const name = `iskra-market-${randomUUID().slice(0, 8)}`
const run = (args, input) => execFileSync('docker', args, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
let db
let sql
let query
const A = '00000000-0000-0000-0000-00000000000a' // автор курса (учитель)
const T = '00000000-0000-0000-0000-00000000000b' // другой учитель
const B = '00000000-0000-0000-0000-0000000000b1' // покупатель
const X = '00000000-0000-0000-0000-0000000000ad' // админ
const C = '00000000-0000-0000-0000-0000000000c1' // курс автора (платный)
const F = '00000000-0000-0000-0000-0000000000c2' // курс автора (бесплатный)
const H = '00000000-0000-0000-0000-0000000000c3' // курс репетитора без витрины
const M1 = '00000000-0000-0000-0000-0000000000d1', M2 = '00000000-0000-0000-0000-0000000000d2'

function as(uid, { admin = false, anonymous = false } = {}) {
  if (!uid) return `reset role; set role anon; select set_config('request.jwt.claim.sub','',false); select set_config('request.jwt.claims','{}',false); select set_config('test.admin','false',false);`
  return `reset role; set role authenticated;
    select set_config('request.jwt.claim.sub','${uid}',false);
    select set_config('request.jwt.claims','{"sub":"${uid}","is_anonymous":${anonymous}}',false);
    select set_config('test.admin','${admin}',false);`
}

try {
  if (process.env.ISKRA_PGLITE_TEST_MODULE) {
    const { PGlite } = await import(process.env.ISKRA_PGLITE_TEST_MODULE)
    db = new PGlite()
    sql = text => db.exec(text)
    query = async text => { const r = await db.exec(text); return r[r.length - 1].rows }
  } else {
    run(['run', '-d', '--name', name, '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:16-alpine'])
    let ready = false
    for (let i = 0; i < 50; i++) {
      try { run(['exec', name, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres']); ready = true; break } catch { await new Promise(r => setTimeout(r, 100)) }
    }
    if (!ready) throw new Error('Test PostgreSQL did not start')
    sql = text => run(['exec', '-i', name, 'psql', '-h', '127.0.0.1', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'], text)
    query = async text => {
      const cut = text.lastIndexOf(';') + 1
      const out = run(['exec', '-i', name, 'psql', '-h', '127.0.0.1', '-U', 'postgres', '-At', '-q', '-v', 'ON_ERROR_STOP=1'], `${text.slice(0, cut)}\nselect coalesce(json_agg(t),'[]') from (${text.slice(cut)}) t;`)
      return JSON.parse(out.trim().split('\n').pop())
    }
  }
  const one = async text => (await query(text))[0]
  const expectError = async (text, pattern, label) => {
    try { await sql(text) } catch (e) {
      const msg = String(e.message ?? e.stderr ?? e)
      if (!pattern.test(msg)) throw new Error(`${label}: unexpected error ${msg}`)
      return
    }
    throw new Error(`${label}: expected an error`)
  }
  const check = (cond, label) => { if (!cond) throw new Error('FAIL: ' + label) }

  // ── Минимальная схема Supabase и Искры, нужная миграции ────────────────
  await sql(`
    create role authenticated; create role anon; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    create function public.is_admin() returns boolean language sql stable as $$ select coalesce(current_setting('test.admin',true),'false')::boolean $$;
    create table profiles(id uuid primary key, role text default 'student', name text default '', first_name text, last_name text);
    create table plans(code text primary key, name text, price_rub int, max_students int);
    create table teacher_subscriptions(teacher_id uuid, plan_code text, status text, expires_at timestamptz);
    create table groups(id uuid primary key default gen_random_uuid(), created_by uuid);
    create table students(id uuid primary key default gen_random_uuid(), group_id uuid references groups(id), name text not null default '',
      created_by uuid, auth_user_id uuid, email text, person_id uuid default gen_random_uuid(), invite_token uuid default gen_random_uuid(),
      created_at timestamptz default now());
    create table courses(id uuid primary key, short_id text, title text, subject text, status text default 'published', created_by uuid,
      student_ids uuid[] default '{}', group_ids uuid[] default '{}', created_at timestamptz default now());
    create table course_modules(id uuid primary key default gen_random_uuid(), course_id uuid references courses(id), label text default '', position int default 0, created_at timestamptz default now());
    create table lessons(id uuid primary key default gen_random_uuid(), course_id uuid references courses(id), module_id uuid, short_id text, title text, lesson_number int, created_at timestamptz default now());
    create table course_enrollments(id uuid primary key default gen_random_uuid(), course_id uuid references courses(id), student_id text not null,
      access_mode text not null default 'custom', created_by uuid, position smallint, unique(course_id, student_id));
    create table course_shares(course_id uuid, teacher_id uuid);
    create table course_item_visibility(course_id uuid, item_kind text, item_key text, hidden boolean);
  `)
  // Боевые функции доступа (как в миграциях 0087 и 20261124*).
  await sql(`
    create function public.my_student_ids() returns uuid[] language sql stable security definer set search_path to 'public' as $$
      select coalesce(array_agg(s.id), '{}'::uuid[]) from public.students s where s.auth_user_id = auth.uid(); $$;
    create function public.my_group_ids() returns uuid[] language sql stable security definer set search_path to 'public' as $$
      select coalesce(array_agg(distinct s.group_id), '{}'::uuid[]) from public.students s where s.auth_user_id = auth.uid() and s.group_id is not null; $$;
    create function public.my_taught_group_ids() returns uuid[] language sql stable security definer set search_path to 'public' as $$
      select coalesce(array_agg(g.id), '{}'::uuid[]) from public.groups g where g.created_by = auth.uid(); $$;
    create function public.my_owned_course_ids() returns uuid[] language sql stable security definer set search_path to '' as $$
      select coalesce(array_agg(c.id), '{}'::uuid[]) from public.courses c where c.created_by = (select auth.uid()); $$;
    create function public.my_shared_course_ids() returns uuid[] language sql stable security definer set search_path to '' as $$
      select coalesce(array_agg(cs.course_id), '{}'::uuid[]) from public.course_shares cs where cs.teacher_id = (select auth.uid()); $$;
  `)
  await sql(readFileSync('supabase/migrations/20261124070110_my_course_ids_materialized.sql', 'utf8'))
  await sql(readFileSync('supabase/migrations/20261124071634_rls_hidden_items_once.sql', 'utf8').replace(/alter policy[\s\S]*$/, ''))
  await sql(`
    create function public.enforce_student_limit() returns trigger language plpgsql as $$ begin return new; end $$;
    create trigger students_enforce_limit before insert on public.students for each row execute function public.enforce_student_limit();
    alter table courses enable row level security; alter table lessons enable row level security; alter table course_modules enable row level security;
    alter table students enable row level security; alter table course_enrollments enable row level security;
    create policy read_courses on courses for select to authenticated using ((select is_admin()) or id = any ((select my_course_ids())::uuid[]));
    create policy owner_write_courses on courses for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
    create policy read_lessons on lessons for select to authenticated using ((select is_admin()) or course_id = any ((select my_course_ids())::uuid[]));
    create policy read_modules on course_modules for select to authenticated using ((select is_admin()) or course_id = any ((select my_course_ids())::uuid[]));
    create policy lesson_student_visibility on lessons as restrictive for select to authenticated using (true);
    create policy module_student_visibility on course_modules as restrictive for select to authenticated using (true);
    create policy own_students on students for select to authenticated using (created_by = auth.uid() or auth_user_id = auth.uid());
    create policy owner_enrollments on course_enrollments for all to authenticated using (course_id in (select id from courses where created_by = auth.uid()))
      with check (course_id in (select id from courses where created_by = auth.uid()));
    grant usage on schema public, auth to authenticated, anon;
    grant select on courses, lessons, course_modules, students, course_enrollments to authenticated;
    grant update on courses to authenticated; grant delete on course_enrollments to authenticated;
  `)
  // Политики видимости уроков — как в 20261124071634 (после создания функций).
  const visibility = readFileSync('supabase/migrations/20261124071634_rls_hidden_items_once.sql', 'utf8').match(/alter policy[\s\S]*$/)[0]
  await sql(visibility)

  // Данные: автор A с учеником-репетиторским S0, платный курс C (2 модуля),
  // бесплатный F, курс репетитора H без витрины.
  await sql(`
    insert into auth.users values ('${A}','a@example.ru'),('${T}','t@example.ru'),('${B}','buyer@example.ru'),('${X}','admin@example.ru');
    insert into profiles(id, role, name) values ('${A}','teacher','Анна Автор'),('${T}','teacher','Тимур');
    insert into plans values ('solo','Solo',0,1); insert into teacher_subscriptions values ('${A}','solo','active',null);
    insert into groups(id, created_by) values ('00000000-0000-0000-0000-0000000000e1','${A}');
    insert into students(id, group_id, name, created_by) values ('00000000-0000-0000-0000-0000000000f0','00000000-0000-0000-0000-0000000000e1','Ученик репетитора','${A}');
    insert into courses(id, short_id, title, subject, created_by) values ('${C}','acc','Бухгалтерия без ручной рутины','Бухгалтерия','${A}'),
      ('${F}','free','Excel за вечер','Бухгалтерия','${A}'), ('${H}','tut','Химия ЕГЭ','Химия','${A}');
    insert into course_modules(id, course_id, label, position) values ('${M1}','${C}','Основы Excel',0),('${M2}','${C}','Формулы и сверки',1),
      ('00000000-0000-0000-0000-0000000000d3','${F}','Модуль',0);
    insert into lessons(course_id, module_id, short_id, title, lesson_number) values ('${C}','${M1}','l1','Чистим выгрузку',1),('${C}','${M2}','l2','Сверка платежей',2),
      ('${F}','00000000-0000-0000-0000-0000000000d3','f1','Первая формула',1);
  `)
  await sql(readFileSync('supabase/migrations/20261125200000_course_marketplace_foundation.sql', 'utf8'))
  // Боевой лимит тарифа уже заменён миграцией — проверяем его на месте.
  await sql(`grant select on course_listings, course_orders, course_entitlements, user_consents to authenticated;`)

  // 1. Модерация: автор не публикует сам.
  await expectError(as(A) + `insert into course_listings(course_id, slug, status, price_kopecks) values ('${C}','buhgalteriya','published',299000);`, /LISTING_MODERATION_ONLY/, 'author self-publish')
  await sql(as(A) + `insert into course_listings(course_id, slug, status, price_kopecks, category, preview_module_ids) values ('${C}','buhgalteriya','review',299000,'accounting',array['${M1}']::uuid[]);`)
  await expectError(as(T) + `insert into course_listings(course_id, slug, status) values ('${H}','chuzhoy','draft');`, /row-level security|violates/, 'foreign listing insert')
  await sql(as(X, { admin: true }) + `update course_listings set status='published' where course_id='${C}';`)
  check((await one(`select status, published_at is not null p from course_listings where course_id='${C}'`)).p, 'published_at set by admin')
  await sql(as(A) + `update course_listings set subtitle='Excel, 1С и нейросети' where course_id='${C}';`)
  check((await one(`select status from course_listings where course_id='${C}'`)).status === 'review', 'author edit returns to review')
  await sql(as(X, { admin: true }) + `update course_listings set status='published' where course_id='${C}';
    insert into course_listings(course_id, slug, status, price_kopecks) values ('${F}','excel-za-vecher','published',0);`)

  // 2. Гость видит витрину, но не содержимое уроков и не курс репетитора.
  await sql(as(null))
  const list = (await one(`select public.catalog_list() v`)).v
  check(list.length === 2 && list.every(i => i.slug !== 'tut'), 'catalog lists only published listings')
  const card = (await one(`select public.catalog_course('buhgalteriya') v`)).v
  check(card.modules.length === 2 && card.modules[0].preview && !card.modules[1].preview, 'program with preview flags')
  check(card.modules[1].lessons[0] === 'Сверка платежей' && card.viewer.signed_in === false, 'lesson titles only, guest viewer')
  check(!/"(content|homework|materials|test_tasks)"/.test(JSON.stringify(card)), 'no lesson content in card')
  await expectError(as(null) + `select public.catalog_enroll('buhgalteriya','preview','pd-1');`, /permission denied|CATALOG_SIGN_IN_REQUIRED/, 'guest enroll')
  await expectError(as(B, { anonymous: true }) + `select public.catalog_enroll('buhgalteriya','preview','pd-1');`, /CATALOG_SIGN_IN_REQUIRED/, 'anonymous enroll')
  await expectError(as(A) + `select public.catalog_enroll('buhgalteriya','preview','pd-1');`, /CATALOG_OWN_COURSE/, 'owner enroll')
  await expectError(as(B) + `select public.catalog_enroll('buhgalteriya','preview','');`, /CATALOG_CONSENT_REQUIRED/, 'consent required')

  // 3. Пробный доступ: только модуль M1. Лимит тарифа (1 ученик) не мешает.
  const pre = (await one(as(B) + `select public.catalog_enroll('buhgalteriya','preview','pd-1', null, 'Мария') v`)).v
  check(pre.access === 'preview' && pre.student.name === 'Мария', 'preview granted')
  check((await query(`select title from lessons order by lesson_number`)).map(r => r.title).join() === 'Чистим выгрузку', 'preview sees only preview lessons')
  check((await query(`select label from course_modules where course_id='${C}'`)).length === 1, 'preview sees only preview modules')
  await sql(`reset role`)
  const buyerRow = await one(`select id, source, created_by, group_id from students where auth_user_id='${B}'`)
  check(buyerRow.source === 'purchase' && buyerRow.created_by === A && buyerRow.group_id === null, 'buyer row owned by author')
  check((await one(`select count(*)::int n from user_consents where auth_user_id='${B}' and kind='pd_processing'`)).n === 1, 'consent stored')
  check((await one(`select '${buyerRow.id}'::uuid = any(student_ids) ok from courses where id='${C}'`)).ok, 'projected into student_ids')
  check((await one(`select access_mode from course_enrollments where student_id='${buyerRow.id}'`)).access_mode === 'full', 'projected enrollment full')

  // 4. Платный курс: заявка, повтор не плодит заказы, чужой не подтвердит.
  const req1 = (await one(as(B) + `select public.catalog_enroll('buhgalteriya','full','pd-1','offer-1', null, 'Оплачу переводом') v`)).v
  const req2 = (await one(as(B) + `select public.catalog_enroll('buhgalteriya','full','pd-1','offer-1') v`)).v
  check(req1.order_status === 'requested' && req1.order_id === req2.order_id && req1.access === 'preview', 'single open order, still preview')
  check((await query(as(B) + `select id from course_orders`)).length === 1, 'buyer reads own order')
  check((await query(as(T) + `select id from course_orders`)).length === 0, 'other teacher cannot read orders')
  await expectError(as(T) + `select public.catalog_decide_order('${req1.order_id}','paid');`, /CATALOG_FORBIDDEN/, 'other teacher decides')
  await sql(as(A) + `select public.catalog_decide_order('${req1.order_id}','paid');`)
  check((await query(as(B) + `select title from lessons where course_id='${C}'`)).length === 2, 'paid opens all lessons')
  const ov = (await one(as(A) + `select public.catalog_author_overview() v`)).v
  const row = ov.listings.find(l => l.course_id === C)
  check(row.learners_full === 1 && row.paid_total_kopecks === 299000 && ov.learners.some(l => l.name === 'Мария'), 'author overview')

  // 5. Сохранение курса и окно доступа не снимают оплаченный доступ.
  await sql(as(A) + `update courses set student_ids = '{}' where id='${C}'; delete from course_enrollments where course_id='${C}';`)
  check((await one(`select '${buyerRow.id}'::uuid = any(student_ids) ok from courses where id='${C}'`)).ok, 'course save keeps paid learner')
  check((await one(`reset role; select count(*)::int n from course_enrollments where course_id='${C}' and student_id='${buyerRow.id}'`)).n === 1, 'enrollment delete blocked')

  // 6. Снятие доступа: право помечено, строка ученика и данные целы.
  const ent = await one(`reset role; select id from course_entitlements where auth_user_id='${B}' and course_id='${C}'`)
  await expectError(as(T) + `select public.catalog_revoke('${ent.id}');`, /CATALOG_FORBIDDEN/, 'other teacher revoke')
  await sql(as(A) + `select public.catalog_revoke('${ent.id}');`)
  check((await query(as(B) + `select title from lessons where course_id='${C}'`)).length === 0, 'revoked: no lessons')
  await sql(`reset role`)
  check((await one(`select revoked_at is not null r from course_entitlements where id='${ent.id}'`)).r, 'entitlement kept as revoked')
  check((await one(`select count(*)::int n from students where id='${buyerRow.id}'`)).n === 1, 'buyer row preserved')
  check(!(await one(`select '${buyerRow.id}'::uuid = any(student_ids) ok from courses where id='${C}'`)).ok, 'revoke removes projection')
  const again = (await one(as(B) + `select public.catalog_enroll('buhgalteriya','preview','pd-1') v`)).v
  check(again.access === 'none', 'revoked preview is not re-granted by self-enroll')

  // 7. Бесплатный курс — сразу полный доступ, тот же ученик автора.
  const free = (await one(as(B) + `select public.catalog_enroll('excel-za-vecher','full','pd-1') v`)).v
  check(free.access === 'full' && free.student.id === buyerRow.id, 'free course full, same learner row')

  // 8. Лимит тарифа и курс репетитора не тронуты.
  await sql(`reset role; drop trigger students_enforce_limit on students;
    create trigger students_enforce_limit before insert on students for each row execute function public.enforce_student_limit();`)
  await expectError(`insert into students(name, created_by) values ('Второй ученик','${A}');`, /STUDENT_LIMIT/, 'tutor limit still enforced')
  const plan = await one(as(A) + `select students_used::int n from public.my_plan()`)
  check(plan.n === 1, 'buyers not counted in plan')
  check((await one(`reset role; select cardinality(student_ids) n from courses where id='${H}'`)).n === 0, 'tutor course untouched')

  console.log('PASS: moderation, guest catalog without content, preview/full access via RLS, single open order, author-only decisions, paid access survives course saves, revoke keeps data, free course, plan limit excludes buyers')
} catch (e) {
  console.error(e.stderr?.toString() || e)
  process.exitCode = 1
} finally {
  if (!process.env.ISKRA_PGLITE_TEST_MODULE) { try { run(['rm', '-f', name]) } catch { /* no-op */ } }
}
