// Runs the real bundled useTeacherWeek with a deterministic hook scheduler.
// No browser, production data, or elapsed-time claim: verifies request topology,
// auth/target response ownership and roster projection independently of network.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import { mkdir } from 'node:fs/promises'
await mkdir('node_modules/.cache', { recursive: true })
const output = 'node_modules/.cache/site-navigation-test.mjs'
const hooks = []
let cursor = 0, pending = []
const same = (a, b) => a && b && a.length === b.length && a.every((x, i) => Object.is(x, b[i]))
globalThis.__navigationReact = {
  useState(initial) {
    const i = cursor++
    hooks[i] ??= { value: typeof initial === 'function' ? initial() : initial }
    return [hooks[i].value, next => { hooks[i].value = typeof next === 'function' ? next(hooks[i].value) : next }]
  },
  useEffect(fn, deps) {
    const i = cursor++, old = hooks[i]
    if (old && same(old.deps, deps)) return
    hooks[i] = { deps, cleanup: old?.cleanup }
    pending.push(() => { hooks[i].cleanup?.(); hooks[i].cleanup = fn() })
  },
  useMemo(fn, deps) {
    const i = cursor++, old = hooks[i]
    if (!old || !same(old.deps, deps)) hooks[i] = { deps, value: fn() }
    return hooks[i].value
  },
  useCallback(fn, deps) { return this.useMemo(fn, deps) },
  useSyncExternalStore(subscribe, read) { cursor++; return read() },
}
// Named destructuring loses `this`, matching actual imported hook invocation.
globalThis.__navigationReact.useCallback = (fn, deps) => globalThis.__navigationReact.useMemo(() => fn, deps)
let groups = [], students = [], authEvent, realtimeEvent
const requests = []
globalThis.__navigationRoster = { useGroups: () => ({ groups }), useAllStudents: () => students }
globalThis.__navigationRealtime = { subscribeTeacherDataChanges(tables, fn) { realtimeEvent = fn; return () => { if (realtimeEvent === fn) realtimeEvent = undefined } } }
globalThis.__navigationClient = {
  auth: { onAuthStateChange(cb) { authEvent = cb } },
  from(table) {
    assert.equal(table, 'schedule_lessons')
    const read = { table, start: null, end: null, signal: null }
    const builder = {
      select() { return this },
      gte(key, value) { assert.equal(key, 'date'); read.start = value; return this },
      lte(key, value) { assert.equal(key, 'date'); read.end = value; return this },
      abortSignal(signal) { read.signal = signal; return this },
      then(resolve, reject) {
        requests.push(read)
        read.resolve = data => resolve({ data, error: null })
        read.fail = error => resolve({ data: null, error })
        read.reject = reject
      },
    }
    return builder
  },
}
await build({entryPoints:['src/lib/teacherSchedule.ts'],bundle:true,platform:'node',format:'esm',outfile:output,
  define:{'import.meta.env.DEV':'false'},
  plugins:[{name:'controlled-navigation',setup(b){
    const modules={react:'__navigationReact','./supabase':'__navigationClient','./useGroups':'__navigationRoster','./teacherDataRealtime':'__navigationRealtime'}
    b.onResolve({filter:/^(react|\.\/(supabase|useGroups|loadFixture|teacherDataRealtime))$/},args=>({path:args.path,namespace:'controlled-navigation'}))
    b.onLoad({filter:/.*/,namespace:'controlled-navigation'},args=>{
      if(args.path==='./loadFixture')return{contents:'export const LOAD_FIXTURE=null; export function fixtureWeek(){throw new Error("fixture not expected") }'}
      const key=modules[args.path]
      const exports={react:'useState,useEffect,useMemo,useCallback,useSyncExternalStore','./supabase':'supabase','./useGroups':'useGroups,useAllStudents','./teacherDataRealtime':'subscribeTeacherDataChanges'}[args.path]
      return{contents: args.path==='./supabase' ? `export const supabase=globalThis.${key}` : `export const {${exports}}=globalThis.${key}`}
    })
  }}],logLevel:'silent'})
const { useTeacherWeek } = await import(pathToFileURL(process.cwd()+'/'+output))
let start = '2026-11-16'
const render = () => { cursor = 0; return useTeacherWeek(start) }
const flushEffects = () => { const tasks = pending; pending = []; for (const task of tasks) task() }
const settle = () => new Promise(resolve => setImmediate(resolve))
const user = (id, role='teacher') => ({ user:{ id, role:'authenticated', app_metadata:{ role } } })
const row = (id, extra={}) => ({ id,date:start,time_start:'09:00',time_end:'10:30',lesson_title:'Lesson',lesson_number:0,
  group_id:'g1',student_id:null,status:'upcoming',node_type:'lesson',lesson_id:'l1',groups:{name:'Group 1',color:'#abc'},lessons:{delivery_mode:'live'},...extra })

authEvent('INITIAL_SESSION',user('teacher-a'))
assert.equal(render().items,null)
flushEffects();await settle()
assert.equal(requests.length,1)
assert.equal(requests[0].start,'2026-11-16');assert.equal(requests[0].end,'2026-11-22')
realtimeEvent({eventType:'SYNC',syncKind:'initial'})
requests[0].resolve([row('group'),row('double',{group_id:null,student_id:'s1',groups:null}),row('foreign',{group_id:'foreign'})]);await settle()
assert.deepEqual(render().items,[],'unhydrated roster cannot expose broad raw rows')
groups=[{id:'g1',subject:'Chemistry',level:'A',isIndividual:false}];students=[{id:'s1',name:'Student',groupId:'g1'}]
let state=render();flushEffects();await settle()
assert.equal(requests.length,1,'roster hydration uses the existing raw week; no second request')
assert.deepEqual(state.items.map(x=>x.id),['group'],'filter foreign scope and suppress group/student duplicate')
assert.equal(state.items[0].subject,'Chemistry')
groups=[{...groups[0],subject:'Biology'}];students=students.map(x=>({...x}))
state=render();flushEffects();await settle()
assert.equal(requests.length,1,'new array identities and labels cannot trigger read')
assert.equal(state.items[0].subject,'Biology')

state.reload();render();flushEffects();await settle();assert.equal(requests.length,2)
start='2026-11-23';assert.equal(render().items,null,'new week must not show old week under new dates')
flushEffects();await settle();assert.equal(requests.length,3);assert.equal(requests[1].signal.aborted,true)
requests[2].resolve([row('new-week')]);await settle();requests[1].resolve([row('late-old-week')]);await settle()
assert.deepEqual(render().items.map(x=>x.id),['new-week'])
authEvent('SIGNED_IN',user('teacher-b'))
assert.equal(render().items,null,'account change hides old raw rows before effects')
flushEffects();await settle();assert.equal(requests.length,4)
authEvent('SIGNED_IN',user('teacher-b'));authEvent('TOKEN_REFRESHED',user('teacher-b'))
render();flushEffects();await settle();assert.equal(requests.length,4,'same account token refresh must not refetch week')
requests[3].fail({message:'controlled failure'});await settle();state=render();assert.equal(state.error,true);assert.deepEqual(state.items,[])
state.reload();render();flushEffects();await settle();assert.equal(requests.length,5)
requests[4].resolve([row('recovered',{node_type:'rec'})]);await settle();state=render();assert.equal(state.error,false);assert.equal(state.items[0].endTime,'')
// Three related mutations are coalesced, initial subscription was ignored.
for(const table of ['schedule_lessons','groups','students'])realtimeEvent({table,eventType:'UPDATE'})
await new Promise(resolve=>setTimeout(resolve,150));render();flushEffects();await settle();assert.equal(requests.length,6)
authEvent('SIGNED_OUT',null);assert.equal(render().items,null);flushEffects();await settle();assert.equal(requests[5].signal.aborted,true)
requests[5].resolve([row('late-prior-owner')]);await settle();assert.equal(render().items,null)
for (const hook of hooks) hook?.cleanup?.()
console.log('PASS actual schedule hook: single week request across roster hydration, local enrichment, filtering/dedup, date scope, abort/late reply, account isolation, same-account refresh, error/retry, recording display, realtime burst')
