import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
const output = 'node_modules/.cache/checkAuthDataChange.mjs'
await build({entryPoints:['src/lib/sharedQuery.ts'],bundle:true,platform:'node',format:'esm',outfile:output,plugins:[{name:'controlled-auth',setup(b){b.onResolve({filter:/^\.\/supabase$/},()=>({path:'auth',namespace:'controlled'}));b.onLoad({filter:/.*/,namespace:'controlled'},()=>({contents:'export const supabase = globalThis.__authDataClient'}))}}],logLevel:'silent'})
let authEvent
globalThis.__authDataClient={auth:{onAuthStateChange(cb){authEvent=cb}}}
const {createSharedQuery}=await import(pathToFileURL(process.cwd()+'/'+output))
let reads=0, resolveOld
const q=createSharedQuery(async()=>({read:++reads}),null)
const off=q.subscribe(()=>{})
const user=(id,role='teacher')=>({user:{id,role:'authenticated',app_metadata:{role}},access_token:'rotating-token'})
const settle=()=>new Promise(resolve=>setImmediate(resolve))
authEvent('INITIAL_SESSION',user('first'));await settle()
assert.equal(reads,1)
for(const event of ['SIGNED_IN','SIGNED_IN','TOKEN_REFRESHED'])authEvent(event,user('first'))
await settle();assert.equal(reads,1,'Refocusing the same account and rotating its token must not reload the roster')
authEvent('TOKEN_REFRESHED',user('first','admin'));await settle();assert.equal(reads,2,'Changed permissions invalidate cached data')
authEvent('USER_UPDATED',user('first','admin'));await settle();assert.equal(reads,3)
authEvent('SIGNED_IN',user('second'));assert.equal(q.getSnapshot().value,null,'Another account must never see the previous roster');await settle();assert.equal(reads,4)
authEvent('SIGNED_OUT',null);assert.equal(q.getSnapshot().value,null);await settle()
off()
console.log('PASS: duplicate sign-in, token rotation, permission changes, user updates, account isolation and sign-out')
