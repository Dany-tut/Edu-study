// Reuse the isolated database setup used by check.mjs. No network calls.
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {readFile} from 'node:fs/promises'
const {PGlite}=createRequire((process.env.SOCIAL_QA_RUNTIME||'/tmp/iskra-social-qa-runtime')+'/package.json')('@electric-sql/pglite')
const db=new PGlite()
await db.exec(`create schema auth;create table auth.users(id uuid primary key);
create role authenticated; create role anon;
create function auth.uid() returns uuid language sql as $$select current_setting('test.id')::uuid$$;
create function auth.jwt() returns jsonb language sql as $$select '{}'::jsonb$$;`)
for(const migration of ['20261103143000_social_friend_search']){
  await db.exec(await readFile(new URL('../../../supabase/migrations/'+migration+'.sql',import.meta.url),'utf8'))
}
const ids=(await db.query('insert into auth.users select gen_random_uuid() from generate_series(1,3) returning id')).rows.map(r=>r.id)
const [a,b,c]=ids
async function as(id){await db.query("select set_config('test.id',$1,false)",[id])}
async function rpc(id,op,payload={}){return (await db.query('select public.desktop_friends($1,$2,$3) as r',[id,op,JSON.stringify(payload)])).rows[0].r}
await db.exec('set role anon')
await assert.rejects(rpc(a,'snapshot'),/permission denied/)
await db.exec('set role authenticated')
for(const [i,id] of ids.entries()){await as(id);await rpc(id,'save',{handle:['luna_qa','sever_qa','volna_qa'][i],searchable:i===1})}
await as(a);await assert.rejects(rpc(b,'snapshot'),/sign_in_required/)
assert.deepEqual(await rpc(a,'search',{handle:'sever'}),{status:'missing'})
const found=await rpc(a,'search',{handle:'@SEVER_QA'})
await as(b);await rpc(b,'save',{handle:'sever_qa',searchable:false})
await as(a);assert.equal((await rpc(a,'send',found)).status,'missing')
await as(b);await rpc(b,'save',{handle:'sever_other',searchable:true})
await as(c);await rpc(c,'save',{handle:'sever_qa',searchable:true})
await as(a);assert.equal((await rpc(a,'send',found)).status,'missing')
const other=await rpc(a,'search',{handle:'sever_other'})
assert.equal((await rpc(a,'send',other)).status,'sent')
assert.equal((await rpc(a,'send',other)).status,'outgoing')
const [{id}]=(await rpc(a,'snapshot')).contacts
assert.equal(await rpc(a,'accept',{id}),false)
await as(c);assert.equal(await rpc(c,'accept',{id}),false)
assert.deepEqual((await rpc(c,'snapshot')).contacts,[])
await as(b);assert.equal(await rpc(b,'decline',{id}),true)
await as(a);assert.equal((await rpc(a,'send',other)).status,'cooldown')
const third=await rpc(a,'search',{handle:'sever_qa'});await rpc(a,'send',third)
const rid=(await rpc(a,'snapshot')).contacts[0].id
await as(c);await rpc(c,'accept',{id:rid})
await as(a);assert.equal(await rpc(a,'cancel',{id:rid}),false)
assert.equal((await rpc(a,'snapshot')).contacts[0].state,'friend')
let last
for(let i=0;i<32;i++)last=await rpc(a,'search',{handle:'unknown_qa'})
assert.equal(last.status,'limited')
console.log('PASS: anon, session switch, exact lookup, privacy changes after lookup, recycled name, duplicate, unrelated account, recipient-only accept/decline, cooldown, late cancellation, lookup rate limit.')
await db.close()
