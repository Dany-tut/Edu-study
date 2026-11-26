// Проверка доступа к файлам ответов (миграция 20261126150000) на настоящем
// PostgreSQL под ролями: кто может положить файл, кто прочитать, что чужие
// файлы недоступны, что подменить сданный файл нельзя.
//
// Docker: node scripts/checkAnswerFilesDb.mjs
// Без Docker: ISKRA_PGLITE_TEST_MODULE=<путь к @electric-sql/pglite> node …
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

const name = `iskra-answer-files-${randomUUID().slice(0, 8)}`
const run = (args, input) => execFileSync('docker', args, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
let db, sql, query

const T1 = '00000000-0000-0000-0000-0000000000a1' // учитель группы G1
const T2 = '00000000-0000-0000-0000-0000000000a2' // другой учитель того же человека (другой предмет)
const T3 = '00000000-0000-0000-0000-0000000000a3' // завёл карточку, но группа чужая
const A = '00000000-0000-0000-0000-0000000000a4'  // автор курса площадки
const X = '00000000-0000-0000-0000-0000000000ad'  // админ
const U1 = '00000000-0000-0000-0000-0000000000b1' // ученик (две карточки: у T1 и у T2)
const U2 = '00000000-0000-0000-0000-0000000000b2' // покупатель курса A
const U3 = '00000000-0000-0000-0000-0000000000b3' // посторонний ученик
const G1 = '00000000-0000-0000-0000-0000000000c1', G2 = '00000000-0000-0000-0000-0000000000c2'
const S1 = '00000000-0000-0000-0000-0000000000d1' // карточка U1 у T1 (группа G1)
const S2 = '00000000-0000-0000-0000-0000000000d2' // карточка U1 у T2 (группа G2)
const P1 = '00000000-0000-0000-0000-0000000000d3' // покупатель U2 у A, без группы
const S3 = '00000000-0000-0000-0000-0000000000d4' // карточка U3, создал T3, но в группе G1 (T1)
const BUCKET = 'homework-answer-files'

function as(uid, { admin = false } = {}) {
  if (!uid) return `reset role; set role anon; select set_config('request.jwt.claim.sub','',false); select set_config('test.admin','false',false);`
  return `reset role; set role authenticated;
    select set_config('request.jwt.claim.sub','${uid}',false);
    select set_config('test.admin','${admin}',false);`
}
const path = (uid, card, ext = 'xlsx') => `${uid}/${card}/1764140000000-${randomUUID()}.${ext}`

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
  const count = async (who, where) => Number((await query(`${who} select count(*)::int as n from storage.objects where bucket_id = '${BUCKET}' and ${where}`))[0].n)
  const check = (cond, label) => { if (!cond) throw new Error('FAIL: ' + label); console.log('ok  ' + label) }
  const denied = async (text, label) => {
    try { await sql(text) } catch (e) {
      const msg = String(e.message ?? e.stderr ?? e)
      if (!/row-level security|violates/i.test(msg)) throw new Error(`${label}: unexpected error ${msg}`)
      console.log('ok  ' + label); return
    }
    throw new Error(`FAIL: ${label}: expected RLS denial`)
  }

  // ── Минимальная схема Supabase Storage и Искры ──────────────────────────
  await sql(`
    create role authenticated; create role anon;
    create schema auth; create schema storage;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function public.is_admin() returns boolean language sql stable as $$ select coalesce(current_setting('test.admin',true),'false')::boolean $$;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text,
      owner uuid default nullif(current_setting('request.jwt.claim.sub',true),'')::uuid,
      owner_id text default current_setting('request.jwt.claim.sub',true), created_at timestamptz default now());
    create function storage.foldername(name text) returns text[] language sql immutable as $$
      select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
    create table public.groups(id uuid primary key, created_by uuid);
    create table public.students(id uuid primary key, group_id uuid references public.groups(id), created_by uuid, auth_user_id uuid, source text default 'teacher');
    create function public.my_student_ids() returns uuid[] language sql stable security definer set search_path to 'public' as $$
      select coalesce(array_agg(s.id), '{}'::uuid[]) from public.students s where s.auth_user_id = auth.uid(); $$;
    alter table public.students enable row level security;
    alter table public.groups enable row level security;
    alter table storage.objects enable row level security;
    grant usage on schema public, auth, storage to authenticated, anon;
    grant select, insert, update, delete on storage.objects to authenticated, anon;
    insert into storage.buckets values ('task-media','task-media',false,null,null);
  `)
  await sql(readFileSync('supabase/migrations/20261126150000_homework_answer_files.sql', 'utf8'))
  await sql(`
    insert into public.groups values ('${G1}','${T1}'),('${G2}','${T2}');
    insert into public.students(id, group_id, created_by, auth_user_id, source) values
      ('${S1}','${G1}','${T1}','${U1}','teacher'),
      ('${S2}','${G2}','${T2}','${U1}','teacher'),
      ('${P1}',null,'${A}','${U2}','purchase'),
      ('${S3}','${G1}','${T3}','${U3}','teacher');
  `)

  const b = (await query(`select public, file_size_limit, allowed_mime_types from storage.buckets where id = '${BUCKET}'`))[0]
  check(b && b.public === false && Number(b.file_size_limit) === 20971520, 'бакет приватный, 20 МБ')
  check(!b.allowed_mime_types.some(m => /html|svg|javascript|octet/.test(m)), 'нет HTML/SVG/скриптов/octet-stream в списке типов')

  // ── Запись ──────────────────────────────────────────────────────────────
  const f1 = path(U1, S1), f2 = path(U1, S2), fp = path(U2, P1), f3 = path(U3, S3)
  await sql(`${as(U1)} insert into storage.objects(bucket_id, name) values ('${BUCKET}', '${f1}'), ('${BUCKET}', '${f2}');`)
  await sql(`${as(U2)} insert into storage.objects(bucket_id, name) values ('${BUCKET}', '${fp}');`)
  await sql(`${as(U3)} insert into storage.objects(bucket_id, name) values ('${BUCKET}', '${f3}');`)
  check(true, 'ученик кладёт файл в свою папку за свою карточку (обе карточки, покупатель тоже)')
  await denied(`${as(U3)} insert into storage.objects(bucket_id, name) values ('${BUCKET}', '${path(U1, S1)}');`, 'нельзя писать в чужую папку uid')
  await denied(`${as(U3)} insert into storage.objects(bucket_id, name) values ('${BUCKET}', '${path(U3, S1)}');`, 'нельзя писать за чужую карточку')
  await denied(`${as(T1)} insert into storage.objects(bucket_id, name) values ('${BUCKET}', '${path(T1, S1)}');`, 'учитель не пишет в бакет ответов')
  await denied(`${as(null)} insert into storage.objects(bucket_id, name) values ('${BUCKET}', '${path(U1, S1)}');`, 'гость не пишет')

  // ── Чтение ──────────────────────────────────────────────────────────────
  check(await count(as(U1), 'true') === 2, 'ученик видит свои файлы (2)')
  check(await count(as(U3), 'true') === 1, 'посторонний ученик видит только свой файл')
  check(await count(as(U2), `name = '${f1}'`) === 0, 'покупатель не видит файлы других учеников')
  check(await count(as(T1), `name = '${f1}'`) === 1, 'учитель группы читает файл своей карточки')
  check(await count(as(T1), `name = '${f2}'`) === 0, 'учитель НЕ читает файл того же человека по чужому предмету')
  check(await count(as(T2), `name = '${f2}'`) === 1 && await count(as(T2), `name = '${f1}'`) === 0, 'второй учитель — только своя карточка')
  check(await count(as(T1), `name = '${f3}'`) === 1, 'владелец группы читает карточку, заведённую другим')
  check(await count(as(T3), `name = '${f3}'`) === 1, 'автор карточки читает её файл')
  check(await count(as(A), `name = '${fp}'`) === 1, 'автор курса читает файл покупателя (без группы)')
  check(await count(as(A), `name <> '${fp}'`) === 0, 'автор курса не видит чужих учеников')
  check(await count(as(T1), `name = '${fp}'`) === 0, 'чужой учитель не видит файл покупателя')
  check(await count(as(X, { admin: true }), 'true') === 4, 'админ видит все')
  check(await count(as(null), 'true') === 0, 'гость не видит ничего')

  // ── Подмена и удаление ──────────────────────────────────────────────────
  await query(`${as(U1)} with u as (update storage.objects set name = name || '.x' where bucket_id = '${BUCKET}' returning 1) select count(*)::int as n from u`)
  check(await count(as(X, { admin: true }), `name like '%.x'`) === 0, 'обновить (подменить) сданный файл нельзя')
  const delT = await query(`${as(T1)} with d as (delete from storage.objects where name = '${f1}' returning 1) select count(*)::int as n from d`)
  check(Number(delT[0].n) === 0, 'учитель не удаляет файл ученика')
  const delO = await query(`${as(U3)} with d as (delete from storage.objects where name = '${f1}' returning 1) select count(*)::int as n from d`)
  check(Number(delO[0].n) === 0, 'чужой ученик не удаляет')
  const delS = await query(`${as(U1)} with d as (delete from storage.objects where name = '${f1}' returning 1) select count(*)::int as n from d`)
  check(Number(delS[0].n) === 1, 'загрузивший ученик удаляет свой файл (× в черновике)')

  // ── Чужие бакеты не задеты ──────────────────────────────────────────────
  await sql(`reset role; insert into storage.objects(bucket_id, name, owner, owner_id) values ('task-media', 'voice/${U1}/a.webm', '${U1}', '${U1}');`)
  check(await count(as(U1), `true`) === 1 && Number((await query(`${as(U1)} select count(*)::int as n from storage.objects where bucket_id = 'task-media'`))[0].n) === 0,
    'политики нового бакета не открывают другие бакеты')

  console.log('\nВсе проверки доступа к файлам ответов прошли.')
} finally {
  if (!process.env.ISKRA_PGLITE_TEST_MODULE) { try { run(['rm', '-f', name]) } catch { /* no-op */ } }
}
