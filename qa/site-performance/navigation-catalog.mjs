// Execute the actual constructor loader while holding its data sources apart.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const source = await readFile('src/pages/teacher/TeacherConstructorPage.tsx','utf8')
const begin = source.indexOf('    async function loadAll() {')
const end = source.indexOf('    const refreshCatalog =',begin)
assert.ok(begin>=0&&end>begin)
// Strip only the two local TypeScript callback annotations, not query logic.
const body=source.slice(begin,end).replaceAll('(x: Course)','(x)').replaceAll('(x: any)','(x)')
const started=[], requests={}
const supabase={from(table){return {select(){return this},order(){return this},eq(){return this},or(){return this},then(resolve,reject){started.push(table);requests[table]={resolve,reject}}}}}
let sharedResolve, visibleCourses, cardsLoading=true, catalogLoading=true, trainerState, widgetState
const env={
  supabase,
  getOwnerId:async()=> 'owner',
  setOwnerId:()=>{},
  fetchSharedCourseIds:()=>new Promise(resolve=>{sharedResolve=resolve}),
  COURSE_CARD_SELECT:'id,title',
  loadColorOverridesFromDB:async()=>({}),
  CUSTOM_META:new Map(),CREATOR_ACCENTS:[],
  dbCourseToLocal:x=>x,
  setCourses:update=>{visibleCourses=update([])},
  setCoursesLoading:value=>{cardsLoading=value},
  dbTrainerToLocal:x=>x,dbWidgetToLocal:x=>x,
  setTrainers:value=>{trainerState=value},setWidgets:value=>{widgetState=value},
  setDbLoading:value=>{catalogLoading=value},
}
const loadAll=new Function(...Object.keys(env),`let lastLoadedAt=0,loadingCatalog=false,_cachedOwnerId,_cachedCourses,_cachedTrainers,_cachedWidgets;\n${body}\nreturn loadAll`)(...Object.values(env))
const settle=()=>new Promise(resolve=>setImmediate(resolve))
const running=loadAll();await settle()
assert.deepEqual(started,['trainers','widgets'],'both lazy builders must start before shared-course lookup finishes')
sharedResolve([]);await settle();assert.deepEqual(started,['trainers','widgets','courses'])
requests.courses.resolve({data:[{id:'course-1'}]});await settle()
assert.equal(cardsLoading,false,'visible course shelf cannot wait for secondary catalogs')
assert.deepEqual(visibleCourses,[{id:'course-1'}]);assert.equal(catalogLoading,true)
requests.trainers.reject(new Error('controlled catalog failure'))
requests.widgets.resolve({data:[{id:'widget-1'}]})
await running
assert.equal(catalogLoading,false);assert.deepEqual(trainerState,[]);assert.deepEqual(widgetState,[{id:'widget-1'}])
console.log('PASS actual constructor loader: concurrent lazy queries, cards before catalogs, handled rejected catalog, independent widget success')
