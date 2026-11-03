// Executes actual provisioning handler against a synthetic Auth/DB boundary.
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import ts from 'typescript'
const source = readFileSync(new URL('../supabase/functions/provision-student-account/index.ts',import.meta.url),'utf8').replace(/^import .*createClient.*$/m,'')
for (const token of ['missing','invalid','valid']) {
 let handler, created = 0, links = 0
 const createClient = () => ({ auth: {
  getUser: async () => ({ data: { user: token === 'invalid' ? null : { id:'teacher-a',user_metadata:{role:'admin'},app_metadata:{} } } }),
  admin: {
   createUser: async body => { assert.match(body.password,/^[0-9a-f]{32}$/); created++; return {data:{user:{id:'new-auth'}}} },
   deleteUser: async () => {},
  },
 },
 from() {
  const filters = []; let patch
  const q = {
   select(columns) { assert.ok(!columns.includes('temp_password')); return q },
   is(k,v) { filters.push([k,v]); return q }, eq(k,v) { filters.push([k,v]); return q },
   update(body) { patch=body; assert.ok(!('temp_password' in body)); return q },
   then(resolve) {
    assert.ok(filters.some(([k,v]) => k==='created_by'&&v==='teacher-a'), 'Metadata admin must not remove owner filter')
    if (patch) {links++; resolve({data:[{id:'student-a'}],error:null})}
    else resolve({data:[{id:'student-a',name:'Synthetic',email:'synthetic@example.invalid',person_id:'person-a',group_id:null}],error:null})
   },
  }; return q
 }, rpc: async () => ({error:null}) })
 vm.runInNewContext(ts.transpile(source,{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}),{createClient,Deno:{env:{get:()=> 'stub'},serve:h=>handler=h},Response,crypto})
 const response=await handler(new Request('https://local.invalid',{method:'POST',headers:token==='missing'?{}:{Authorization:'Bearer synthetic'},body:JSON.stringify({all:true})}))
 assert.equal(response.status,token==='valid'?200:401)
 assert.equal(created,token==='valid'?1:0); assert.equal(links,created)
 if(token==='valid') {const body=await response.json();assert.equal(body.accounts[0].status,'created');assert.equal(response.headers.get('Cache-Control'),'no-store')}
}
console.log('PASS: provisioning denies missing/invalid Auth, scopes owner despite forged metadata, returns CSPRNG credential without public-table persistence')
