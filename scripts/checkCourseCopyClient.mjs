import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { transform } from 'esbuild'

const source = path => readFileSync(path,'utf8')
const helper = source('src/lib/courseCopyRequest.ts')
const shelf = source('src/pages/teacher/TeacherConstructorPage.tsx')
function between(text, first, last) {
  const a=text.indexOf(first), b=text.indexOf(last,a)
  assert.ok(a >= 0 && b > a)
  return text.slice(a,b)
}
const catalog = between(shelf,'  async function duplicateCourse(c: Course)', '  async function deleteCourse(c: Course)')
const parser = between(shelf,'function dbCourseToLocal(', 'function dbTrainerToLocal(')
const code = (await transform(helper + `
  export function mount({getSessionUser,getOwnerId,alertDialog,t,seedById,seedCourseId,supabase,openCourseEditor,setCourses,console}) {
    const COURSE_CARD_SELECT = '*, lessons(...)'
    const fmtDate = () => 'today'
    ${parser}
    ${catalog}
    return duplicateCourse
  }
`,{loader:'ts',format:'esm'})).code
let reload=0
const load=()=>import('data:text/javascript;base64,'+Buffer.from(code).toString('base64')+'#'+(++reload))
const values=new Map()
globalThis.sessionStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}
const requests=[], receipts=new Map(), alerts=[], drafts=[]
let cards=[], owner='owner', readFails=true, available=true
const deps={
  getSessionUser:async()=>({id:'owner'}),getOwnerId:async()=>owner,
  t:s=>s,alertDialog:async a=>alerts.push(a.title),console:{error(){}},
  seedById:new Map(),seedCourseId:(seed,uid)=>seed.key+'-'+uid,
  openCourseEditor:encoded=>drafts.push(JSON.parse(encoded)),
  setCourses:updater=>{cards=updater(cards)},
  supabase:{
    from() {
      const filters={}
      const query={select:()=>query,eq:(field,val)=>{filters[field]=val;return query},
        maybeSingle:async()=>({data:available?{id:'source-id',short_id:'source-ref'}:null}),
        single:async()=>{
          if(readFails) return {error:new Error('Lost read-back')}
          assert.equal(filters.created_by,owner)
          const id=filters.id
          return {data:{id,short_id:id+'-ref',title:'Copy',created_by:owner,
            lessons:[{id:id+'-lesson-uuid',short_id:id+'-lesson-ref'}]}}
        },
      }
      return query
    },
    rpc:async(name,args)=>{
      assert.equal(name,'request_course_copy')
      assert.equal(args.p_source,'source-ref');assert.equal(args.p_target_owner,null)
      requests.push(args.p_request_id)
      if(!receipts.has(args.p_request_id)) receipts.set(args.p_request_id,'copy'+receipts.size)
      return {data:receipts.get(args.p_request_id)}
    },
  },
}
const card={id:'source-ref',title:'Source',lessons:[{id:'stale-shelf-id'}]}
let duplicate=(await load()).mount(deps)
await Promise.all([duplicate(card),duplicate(card)])
assert.equal(requests.length,1); assert.equal(cards.length,0)
duplicate=(await load()).mount(deps)
readFails=false
await duplicate(card)
assert.equal(requests[1],requests[0]);assert.equal(cards.length,1)
assert.equal(cards[0].lessons[0].id,'copy0-lesson-ref')
await duplicate(card)
assert.notEqual(requests[2],requests[0]);assert.equal(cards.length,2)
owner='other';await duplicate(card);assert.equal(requests.length,3);owner='owner'
available=false
await duplicate(card);assert.equal(drafts.length,0);assert.equal(requests.length,3)
deps.seedById.set(card.id,{key:'seed',build:async id=>({id,modules:['real module'],lessons:[{id:id+'-0',description:'rich description',timecodes:['3:00']}],groupIds:['original audience']})})
await duplicate(card)
assert.equal(drafts.length,1);assert.deepEqual(drafts[0].groupIds,[])
assert.equal(drafts[0].lessons[0].description,'rich description');assert.equal(drafts[0].lessons[0].id,drafts[0].id+'-0')
assert.equal(requests.length,3);assert.equal(values.size,0)
console.log('PASS catalog handler: simultaneous clicks, lost read-back + remount retry, server identities, explicit repeat, view-as read-only, complete seed and missing-source guard')
