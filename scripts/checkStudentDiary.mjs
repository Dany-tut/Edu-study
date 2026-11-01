// Regression checks for the real track/store functions. Only the Supabase transport
// is replaced; no account, credentials, or network access is used.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const storage = () => {
  const data = new Map()
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key) }
}
globalThis.localStorage = storage()
globalThis.sessionStorage = storage()
globalThis.window = { location: { search: '' }, addEventListener() {}, removeEventListener() {} }
let query = () => ({ data: [], error: null })
let rpc = () => ({ data: { rows: [], courses: [], progress: [] }, error: null })
globalThis.__trackTestClient = {
  from(table) {
    const request = { table, op: 'select', filters: [] }
    const chain = { then: (yes, no) => Promise.resolve().then(() => query(request)).then(yes, no) }
    for (const op of ['select', 'eq', 'in', 'or', 'is', 'gte', 'lte', 'order', 'maybeSingle', 'single', 'limit', 'abortSignal']) {
      chain[op] = (...args) => { request.filters.push([op, ...args]); return chain }
    }
    chain.upsert = (values, options) => { Object.assign(request, { op: 'upsert', values, options }); return chain }
    return chain
  },
  rpc: (...args) => Promise.resolve().then(() => rpc(...args)),
  functions: { invoke: async () => ({ data: null, error: null }) },
  auth: {
    getUser: async () => ({ data: { user: null } }),
    getSession: async () => ({ data: { session: null } }),
    onAuthStateChange() {},
  },
}
const outfile = resolve('node_modules/.cache/checkStudentDiary.bundle.mjs')
await build({
  stdin: { contents: `
    export { buildStudentDiary, diaryWorkLabel, diaryDay, diaryOverdue, diaryPriority, sortStudentDiary } from './src/lib/studentDiary';
    export { fetchDiaryMetadata } from './src/lib/useStudentDiary';
    export { useStudentData } from './src/store/studentDataStore';
    export { useStudentTz } from './src/lib/studentTz';
    export { trackPalette } from './src/lib/theme';
    export { readDiaryReminders, writeDiaryReminders } from './src/lib/diaryReminders';
  `, resolveDir: process.cwd() },
  outfile, bundle: true, platform: 'node', format: 'esm', packages: 'external', logLevel: 'silent',
  define: { 'import.meta.env': JSON.stringify({ DEV: false }) },
  plugins: [{ name: 'fake-transport', setup(b) {
    b.onLoad({ filter: /\/lib\/supabase\.ts$/ }, () => ({ contents: `
      export const supabase = globalThis.__trackTestClient;
      export const SUPABASE_URL = 'https://stub.invalid';
      export const SUPABASE_KEY = 'stub';
    ` }))
    b.onLoad({ filter: /\/lib\/analytics\.ts$/ }, () => ({ contents: `
      export const trackEvent = () => {}; export const trackPath = () => {};
      export const trackPageView = () => {}; export const initAnalytics = () => {};
      export const trackNow = async () => {};
    ` }))
  } }],
})
const m = await import(pathToFileURL(outfile).href)
const now = new Date('2026-11-01T12:00:00+07:00')
m.useStudentTz.setState({tz:'Asia/Bangkok',loaded:true})
const lesson = (id, number, status = 'current') => ({id,number,status,title:id,shape:'circle',subject:'course',heavyPending:true})
const main = lesson('main',2,'completed')
main.result = {passed:true,percent:95,passingScore:80,pending:false}
const split = {...lesson('split~rec',9),nodeType:'rec'}
const future = lesson('closed',10,'locked')
const course = {id:'course',name:'Chemistry',subject:'Химия',progress:0,activeModuleId:1,modules:[{id:1,label:'One',lessons:[main,split,lesson('split',9),lesson('ten',10),future,lesson('no-homework',11)]}]}
m.useStudentData.setState({subjects:[course],scheduleDays:[],loaded:true})
const metadata = new Map([
 ['main',{hasMain:true,mainDate:'2026-10-30',hasRecording:false,recordingDate:null,extras:[{id:'extra',index:0,total:1,date:'2026-10-31'}]}],
 ['split',{hasMain:true,mainDate:'2026-11-03',hasRecording:true,recordingDate:'2026-11-04',extras:[]}],
 ['ten',{hasMain:true,mainDate:null,hasRecording:false,recordingDate:null,extras:[]}],
 ['closed',{hasMain:true,mainDate:'2026-10-30',hasRecording:false,recordingDate:null,extras:[]}],
 ['no-homework',{hasMain:false,mainDate:null,hasRecording:false,recordingDate:null,extras:[]}],
])
const list=m.buildStudentDiary([course],metadata,{},now)
assert.deepEqual(list.map(e=>e.id),['main','main~extra','split~rec','split','ten'])
assert.equal(list.find(e=>e.id==='main').status,'test_passed')
assert.equal(m.diaryWorkLabel(list[0]),'ДЗ №3')
assert.equal(list.find(e=>e.id==='main~extra').status,'current')
assert.equal(m.diaryOverdue(list[0],'2026-11-01'),false)
assert.equal(m.diaryOverdue(list[1],'2026-11-01'),true)
assert.equal(list.find(e=>e.id==='split~rec').due,'2026-11-04')
assert.equal(list.find(e=>e.id==='split').due,'2026-11-03')
assert.deepEqual(m.sortStudentDiary(list,'number',false,'2026-11-01').map(e=>e.lesson.number),[2,2,9,9,10])
assert.equal(m.sortStudentDiary(list,'due',true,'2026-11-01').at(-1).id,'ten')
const submitted=m.buildStudentDiary([course],metadata,{'main~extra':{status:'submitted',score:null,result:{pending:true,passed:false,percent:null,passingScore:80}}},now).find(e=>e.id==='main~extra')
assert.equal(submitted.status,'submitted')
assert.equal(m.diaryOverdue(submitted,'2026-11-01'),false)
assert.deepEqual(m.trackPalette(submitted.status),m.trackPalette('submitted'))
for(const value of ['','01.11','2026-02-30','2026-99-01',null])assert.equal(m.diaryDay(value),null)
assert.equal(m.diaryDay('31.10.2026'),'2026-10-31')
assert.equal(m.buildStudentDiary([course],new Map(),{},now).length,0)
let requested=[]
query=request=>{requested.push(request);return {data:[{short_id:'main',mainType:'single',mainDate:'31.10.2026',recordingType:null,extras:[{id:'extra',date:'01.11.2026',tasks:[{type:'single'}]}]}],error:null}}
const projection=await m.fetchDiaryMetadata(['main'])
assert.equal(projection.get('main').mainDate,'2026-10-31')
assert.equal(projection.get('main').extras[0].date,'2026-11-01')
assert.equal(requested[0].table,'lessons')
const selected=requested[0].filters.find(f=>f[0]==='select')[1]
assert.ok(selected.includes('homework->hwTasks->0->>type'))
assert.ok(!selected.includes('content'))
assert.deepEqual(requested[0].filters.find(f=>f[0]==='in'),['in','short_id',['main']])
query=()=>({data:null,error:{message:'offline'}})
await assert.rejects(m.fetchDiaryMetadata(['main']))
globalThis.window.dispatchEvent=()=>{}
assert.equal(m.writeDiaryReminders('one',[{id:'main',title:'Work',course:'Chemistry',at:123}]),true)
assert.equal(m.readDiaryReminders('one').length,1)
assert.equal(m.readDiaryReminders('two').length,0)
console.log('PASS: real course metadata, no phantom homework, independent extra and recording work, module locks, pending grades, dates, numeric sorting, no-deadline ordering, scoped persistent reminders and read errors')
