import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { writeFileSync } from 'node:fs'
const store=new Map(), events=[], timers=new Map(), appListeners={},browserListeners={}
let sequence=0, exchangeResolve, signInError
const storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}
globalThis.localStorage=storage;globalThis.sessionStorage=storage
const win=new EventTarget();win.location={origin:'https://iskra.example',search:'',hash:'',pathname:'/',assign:()=>{},reload:()=>{}}
globalThis.window=win;globalThis.location=win.location;globalThis.history={replaceState:()=>{}}
globalThis.setTimeout=(fn,delay)=>{const id=++sequence;timers.set(id,{fn,delay});return id}
globalThis.clearTimeout=id=>timers.delete(id)
const runDelay=delay=>{for(const [id,t]of [...timers])if(t.delay===delay){timers.delete(id);t.fn()}}
const drain=async()=>{for(let i=0;i<30;i++)await Promise.resolve()}
globalThis.__oauthQA={
 App:{addListener:async(name,fn)=>{appListeners[name]=fn;return {remove:async()=>{}}},getLaunchUrl:async()=>({})},
 Browser:{open:async()=>{},close:async()=>{browserListeners.browserFinished?.()},addListener:async(name,fn)=>{browserListeners[name]=fn;return {remove:async()=>{}}}},
 Capacitor:{isNativePlatform:()=>true},
 supabase:{auth:{signInWithOAuth:async()=>({data:{url:'https://provider.invalid'},error:signInError}),exchangeCodeForSession:()=>new Promise(resolve=>{exchangeResolve=resolve}),getUser:async()=>({data:{user:{id:'user',app_metadata:{role:'teacher'}}}}),signOut:async()=>{}},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{role:'teacher'}})})})})},
 trackEvent:(event,meta)=>events.push({event,...meta}),trackNow:async(event,meta)=>events.push({event,...meta}),
 clearStudentSession:()=>{},setStudentSession:()=>{},authErrorRu:()=> 'Ошибка входа',
}
const mockExports={ '@capacitor/app':['App'],'@capacitor/browser':['Browser'],'@capacitor/core':['Capacitor'], './supabase':['supabase'],'./analytics':['trackEvent','trackNow'],'./studentSession':['clearStudentSession','setStudentSession'],'./authErrors':['authErrorRu'] }
const out=await build({entryPoints:['src/lib/socialAuth.ts'],bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'mocks',setup(b){b.onResolve({filter:/.*/},a=>mockExports[a.path]?{path:a.path,namespace:'mock'}:undefined);b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:mockExports[a.path].map(n=>`export const ${n}=globalThis.__oauthQA.${n};`).join('\n'),loader:'js'}))}}]})
writeFileSync('node_modules/.cache/socialAuthRecovery.mjs',out.outputFiles[0].text)
const m=await import('../node_modules/.cache/socialAuthRecovery.mjs')
const errors=[];let cancelled=0;win.addEventListener('iskra:auth-cancelled',()=>cancelled++)
await m.initializeNativeOAuth(message=>errors.push(message))
await m.startSocialLogin('apple','teacher')
assert.equal(m.hasPendingSocialAuth(),true)
browserListeners.browserFinished();runDelay(750)
assert.equal(m.hasPendingSocialAuth(),false);assert.equal(cancelled,1)
assert.equal(events.at(-1).event,'auth_cancelled')
await m.startSocialLogin('apple','teacher')
appListeners.appUrlOpen({url:'iskra://auth/callback?code=PRIVATE'})
await drain();browserListeners.browserFinished();runDelay(750)
assert.equal(cancelled,1,'closing during PKCE exchange must not cancel the successful flow')
exchangeResolve({error:null});await drain();runDelay(750)
assert.equal(m.hasPendingSocialAuth(),false);assert.equal(win.location.hash,'#/teacher')
assert.ok(events.some(e=>e.event==='auth_completed'))
assert.equal(cancelled,1)
signInError=new Error('provider unavailable')
await assert.rejects(m.startSocialLogin('google','teacher'))
assert.equal(m.hasPendingSocialAuth(),false)
assert.equal(events.at(-1).event,'auth_failed')
assert.equal(JSON.stringify(events).includes('PRIVATE'),false)
console.log('OAuth recovery: native cancellation, callback/close race, successful sign-in and start failure cleanup passed')
