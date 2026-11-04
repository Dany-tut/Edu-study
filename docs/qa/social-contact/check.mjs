// Local fixture only. npm install --prefix /tmp/iskra-social-qa-runtime @electric-sql/pglite
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const require = createRequire((process.env.SOCIAL_QA_RUNTIME || '/tmp/iskra-social-qa-runtime') + '/package.json')
const { PGlite } = require('@electric-sql/pglite')
const db = new PGlite()
const migration = await readFile(new URL('../../../supabase/migrations/20261103140000_social_contact_invites.sql', import.meta.url),'utf8')
const [a,b,c] = ['1','2','3'].map(n => '10000000-0000-4000-8000-00000000000'+n)
await db.exec(`create schema auth; create table auth.users(id uuid primary key);
create role anon; create role authenticated;
create function auth.uid() returns uuid language sql stable as $$ select current_setting('fixture.uid',true)::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('fixture.jwt',true),''),'{}')::jsonb $$;
insert into auth.users values ('${a}'),('${b}'),('${c}');`)
await db.exec(migration)
const as = async id => {await db.exec('reset role;set role authenticated'); await db.query("select set_config('fixture.uid',$1,false)",[id])}
const rpc = async (action,v=null) => (await db.query('select public.social_contact($1,$2) as data',[action,v])).rows[0].data
const err = async (p,re) => assert.rejects(p,re)
await db.exec('set role anon')
await err(rpc('list'),/permission denied/)
for (const [id,nick] of [[a,'luna_7'],[b,'sever_9'],[c,'volna_2']]) {await as(id); assert.equal(await rpc('set_handle',nick),nick)}
await err(rpc('set_handle','Bad name'),/check constraint/)
await err(rpc('set_handle','luna_7'),/unique constraint/)
assert.equal(await rpc('me'),'volna_2')
await db.exec("set fixture.jwt = '{\"is_anonymous\":true}'")
await err(rpc('issue'),/sign_in_required/)
await db.exec("reset fixture.jwt")
await as(a);assert.equal(await rpc('set_handle','luna_7'),'luna_7')
const revoked=await rpc('issue');await rpc('revoke')
const replaced=await rpc('issue');const expired=await rpc('issue')
await db.exec("reset role;update iskra_social.people set expires_at=now()-interval '1 minute' where token is not null")
await as(b)
for(const token of [revoked,replaced,expired]) for(const op of ['preview','request']) await err(rpc(op,token),/invite_unavailable/)
await as(a); const token=await rpc('issue');await err(rpc('request',token),/invite_unavailable/)
await as(b);assert.deepEqual(await rpc('preview',token),{handle:'luna_7'})
await rpc('request',token);await err(rpc('request',token),/invite_unavailable/)
const [{id}]=await rpc('list')
assert.deepEqual(await rpc('list'),[{id,handle:'luna_7',state:'outgoing'}])
await err(rpc('accept',id),/request_unavailable/)
await as(c);assert.deepEqual(await rpc('list'),[]);await err(rpc('accept',id),/request_unavailable/)
await rpc('remove',id);await err(db.query('select * from iskra_social.people'),/permission denied/)
await as(a);assert.deepEqual(await rpc('list'),[{id,handle:'sever_9',state:'incoming'}]);await rpc('accept',id);await rpc('accept',id)
assert.deepEqual(await rpc('list'),[{id,handle:'sever_9',state:'friend'}])
await as(b);assert.deepEqual(await rpc('list'),[{id,handle:'luna_7',state:'friend'}]);await rpc('set_handle','sever_10')
await as(a);assert.deepEqual(await rpc('list'),[{id,handle:'sever_10',state:'friend'}])
await as(b);await rpc('remove',id);assert.deepEqual(await rpc('list'),[])
await as(a);assert.deepEqual(await rpc('list'),[]);const next=await rpc('issue')
await as(b);await rpc('request',next)
await as(a);await rpc('remove',(await rpc('list'))[0].id)
await as(b);assert.deepEqual(await rpc('list'),[])
console.log('PASS: private handle, expired/revoked/replaced invites, two-party consent, rename, decline/removal, outsider and anon denial.')
console.log('PostgreSQL:',(await db.query('select version() as v')).rows[0].v)
console.log('Migration sha256:',createHash('sha256').update(migration).digest('hex'))
await db.close()
