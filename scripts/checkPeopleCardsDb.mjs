// Focused PostgreSQL fixture: projection permissions, roles, avatar paths and friendship removal.
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const { PGlite } = await import(process.env.ISKRA_PGLITE_MODULE || '@electric-sql/pglite')
const db = new PGlite()
const id=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`
let checks=0
try {
await db.exec(`create role anon; create role authenticated;
create schema auth; create schema storage; create schema iskra_social;
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql as $$select coalesce(nullif(current_setting('test.jwt',true),''),'{}')::jsonb$$;
create function public.is_admin() returns boolean language sql as $$select false$$;
create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;
create table auth.users(id uuid primary key,raw_user_meta_data jsonb,raw_app_meta_data jsonb);
create table public.students(id uuid primary key,auth_user_id uuid,created_by uuid,avatar_path text,preferences jsonb,updated_at timestamptz);
create table iskra_social.people(account uuid primary key,handle text,searchable boolean,profile_key uuid);
create table iskra_social.contacts(id uuid primary key,sender uuid,recipient uuid,accepted boolean);
create function iskra_social.desktop_friends(uuid,text,jsonb) returns jsonb language sql as $$select case when $2='snapshot' then jsonb_build_object('contacts',(select jsonb_agg(jsonb_build_object('id',c.id,'handle',p.handle,'state','friend')) from iskra_social.contacts c join iskra_social.people p on p.account=case when c.sender=$1 then c.recipient else c.sender end where c.sender=$1 or c.recipient=$1)) else jsonb_build_object('status','found','handle','person2','key','preserved') end$$;
grant usage on schema auth,public,iskra_social to authenticated;
`)
await db.exec(readFileSync(new URL('../supabase/migrations/20261104052540_people_cards.sql',import.meta.url),'utf8'))
for(let n=1;n<=4;n++) await db.query(`insert into auth.users values($1,$2,$3);`,[id(n),{name:`Name ${n}`,email:'private',role:'admin',avatarPath:`${id(n)}/current.jpg`,avatarId:'cat'},n===1?{role:'teacher'}:{}])
for(let n=1;n<=4;n++) await db.query('insert into iskra_social.people values($1,$2,$3,$4)',[id(n),`person${n}`,n!==3,id(n+10)])
await db.exec(`insert into students values('${id(22)}','${id(2)}','${id(1)}','${id(2)}/student.jpg','{"avatarId":"flower"}',now());
insert into iskra_social.contacts values('${id(31)}','${id(1)}','${id(2)}',true),('${id(32)}','${id(3)}','${id(4)}',true);`)
async function user(n){await db.exec(`reset role;set role authenticated;select set_config('test.uid','${id(n)}',false);`)}
async function call(op,payload={},expected=1){return (await db.query('select public.desktop_people($1,$2,$3) as v',[id(expected),op,payload])).rows[0].v}
function equal(a,b){assert.deepEqual(a,b);checks++}
await user(1)
let p=await call('person',{personKey:id(12)})
equal([p.name,p.handle,p.role,p.avatarId,p.avatarPath,p.relationship,p.state],['Name 2','person2','student','flower',`${id(2)}/student.jpg`,'my_student','friend'])
equal(Object.hasOwn(p,'email'),false)
equal((await call('search')).key,'preserved')
equal((await call('snapshot')).contacts[0].name,'Name 2')
equal((await call('person',{personKey:id(13)})).status,'missing')
equal(await call('remove',{id:id(32)}),false)
await assert.rejects(call('remove',{id:id(31)},2));checks++
await assert.rejects(db.query('select iskra_social.person_card($1)',[id(2)]));checks++
equal((await db.query('select public.can_read_avatar($1) as v',[`${id(2)}/student.jpg`])).rows[0].v,true)
equal((await db.query('select public.can_read_avatar($1) as v',[`${id(4)}/old.jpg`])).rows[0].v,false)
await user(2)
p=await call('person',{personKey:id(11)},2)
equal([p.role,p.relationship],['teacher','my_teacher'])
equal(await call('remove',{id:id(31)},2),true)
equal(await call('remove',{id:id(31)},2),false)
await user(1)
equal((await call('person',{personKey:id(12)})).state,'none')
await db.exec(`reset role;update auth.users set raw_user_meta_data=jsonb_set(raw_user_meta_data,'{avatarPath}','"${id(1)}/secret.jpg"') where id='${id(4)}';`)
await user(1)
equal((await call('person',{personKey:id(14)})).avatarPath,null)
await db.exec(`select set_config('test.jwt','{"is_anonymous":true}',false)`)
await assert.rejects(call('person',{personKey:id(12)}));checks++
console.log(`People cards DB: ${checks} assertions passed`)
} finally {await db.close()}
