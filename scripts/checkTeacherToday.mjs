import assert from 'node:assert/strict'
import { build } from 'esbuild'
import vm from 'node:vm'

async function moduleWithFixtures(entry, fixtures, extra={}) {
  const out=await build({entryPoints:[entry],bundle:true,platform:'node',format:'cjs',write:false,
    plugins:[{name:'fixtures',setup(b){
      b.onResolve({filter:/.*/},args=>Object.hasOwn(fixtures,args.path)?{path:args.path,namespace:'fixture'}:null)
      b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:fixtures[args.path]}))
    }}]})
  const module={exports:{}}
  vm.runInNewContext(out.outputFiles[0].text,{module,exports:module.exports,console,setTimeout,clearTimeout,...extra})
  return module.exports
}
let authChanged
const shared=await moduleWithFixtures('src/lib/sharedQuery.ts',{
  react:'export const useEffect=()=>{};export const useSyncExternalStore=()=>{}',
  './supabase':'export const supabase=globalThis.fixture',
},{fixture:{auth:{onAuthStateChange:cb=>{authChanged=cb}}}})
let reads=0,finish
const q=shared.createSharedQuery(()=>{reads++;return new Promise(resolve=>{finish=resolve})},[])
const all=Array.from({length:20},()=>shared.readSharedQuery(q))
assert.equal(reads,1,'Header, hidden measurement and home cards must share the first read')
const roster=[{id:'student'}];finish(roster)
for(const value of await Promise.all(all)) assert.equal(value,roster)
assert.equal(await shared.readSharedQuery(q),roster)
assert.equal(reads,1,'A ready roster must not be queried again for IDs')
authChanged('SIGNED_IN',{user:{id:'new-owner',role:'authenticated',app_metadata:{}}})
const fresh=shared.readSharedQuery(q)
assert.equal(reads,2);finish([]);assert.equal((await fresh).length,0,'Previous owner roster must not survive invalidation')

const {mapTeacherToday}=await moduleWithFixtures('src/lib/teacherToday.ts',{
  react:'export const useMemo=()=>{};export const useEffect=()=>{}',
  './supabase':'export const supabase={}',
  './owner':'export const getOwnerId=async()=>null',
  './useGroups':'export const readTeacherRoster=()=>{};export const useGroups=()=>{};export const useAllStudentsSnapshot=()=>{}',
  './sharedQuery':'export const createSharedQuery=()=>({});export const useSharedQuery=()=>{}',
  './teacherSchedule':'export const todayMsk=()=>"2026-11-02"',
})
const groups=[{id:'group',name:'Группа',icon:'biology',studentCount:3,color:'purple',colorSoft:'soft'}]
const students=[{id:'student',name:'Лично'}]
const row={time_start:'14:00:00',time_end:'15:00:00',lesson_title:'Тема',lesson_number:2,subject:'Биология',status:'live'}
const rows=[{...row,id:'group-event',group_id:'group',student_id:null},{...row,id:'direct-event',group_id:null,student_id:'student'},
  {...row,id:'foreign-event',group_id:'foreign',student_id:null}]
const mapped=mapTeacherToday(rows,groups,students)
assert.equal(mapped.length,2)
assert.equal(mapped[0].groupName,'Группа');assert.equal(mapped[0].studentCount,3);assert.equal(mapped[0].time,'14:00')
assert.equal(mapped[0].status,'live');assert.equal(mapped[0].topic,'Тема');assert.equal(mapped[0].lessonNumber,2)
assert.equal(mapped[1].groupName,'Лично');assert.equal(mapped[1].studentCount,1);assert.equal(mapped[1].studentId,'student')
assert.equal(mapTeacherToday(rows,[],students).length,1,'Transferred/removed groups must leave the visible scope immediately')
assert.equal(mapTeacherToday(rows,groups,[{id:'student',name:'Обновлён'}])[1].groupName,'Обновлён','Roster edits must update cached schedule labels')
console.log('PASS: 20 consumers share one roster load, ready reads reused, owner invalidation, group/direct events, statuses and live roster edits')
