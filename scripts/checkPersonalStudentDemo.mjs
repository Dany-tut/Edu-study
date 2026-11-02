import assert from 'node:assert/strict'
import { build } from 'esbuild'
import vm from 'node:vm'

const result = await build({entryPoints:['src/lib/personalStudentDemo.ts'],bundle:true,platform:'node',format:'cjs',write:false})
const data = await build({entryPoints:['src/data/personalStudentDemoData.ts'],bundle:true,platform:'node',format:'cjs',write:false})
const values = new Map()
let href = 'https://edu-study-app.vercel.app/?demo=danil#/'
const storage = {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)}
const student = (id,name='Даниил Макаренко')=>storage.setItem('student_session',JSON.stringify({id,name,groupId:''}))
function load(bundle) {
  const module={exports:{}}
  const context=vm.createContext({module,exports:module.exports,console,URL,Request,Response,Date,localStorage:storage,window:{location:{get href(){return href}},history:{replaceState:(_,__,url)=>{href=String(url)}}}})
  vm.runInContext(bundle.outputFiles[0].text,context)
  return module.exports
}
const api=load(result), fixtures=load(data)
student('alice','Другой ученик')
assert.equal(api.personalDemoOwner(),null)
student('danil')
assert.equal(api.personalDemoOwner(),'danil')
assert.equal(href,'https://edu-study-app.vercel.app/#/')
student('other-danil')
assert.equal(api.personalDemoOwner(),null,'Activation belongs to the exact student id, not the name')
student('danil')
const first=fixtures.buildPersonalStudentDemo('danil')
assert.equal(first.subjects.length,4)
const lessons=first.subjects.flatMap(s=>s.modules.flatMap(m=>m.lessons))
assert.equal(lessons.length,128)
assert.equal(first.scheduleDays.length,61)
assert.ok(first.scheduleDays.every(d=>d.lessons.length===3))
assert.ok(lessons.filter(l=>l.kind==='test').every(l=>l.testTasks.length===8))
assert.ok(lessons.filter(l=>l.kind!=='test').every(l=>l.homework.hwTasks.length===9))
const ref=lessons.find(l=>l.kind==='test').id
const request=(path,method='GET',body)=>new Request('https://db.example'+path,{method,headers:{'Content-Type':'application/json',Accept:'application/vnd.pgrst.object+json'},...(body?{body:JSON.stringify(body)}:{})})
assert.equal(await api.personalDemoResponse(request('/rest/v1/lesson_progress?lesson_ref=eq.real-lesson')),null,'Real requests must pass through')
const response=await api.personalDemoResponse(request('/rest/v1/lesson_progress','POST',{student_id:'danil',lesson_ref:ref,status:'completed',score:100,attachments:{v:'basic-1',rows:[{type:'single',verdict:'correct'}]}}))
assert.equal(response.status,200)
assert.equal((await response.json()).score,100)
assert.equal(fixtures.buildPersonalStudentDemo('danil').progress[ref].score,100)
assert.equal(fixtures.buildPersonalStudentDemo('other-danil').progress[ref].score,null)
student('other-danil')
assert.equal((await api.personalDemoResponse(request('/rest/v1/lesson_progress','POST',{student_id:'danil',lesson_ref:ref}))).status,403)
student('danil')
href='https://edu-study-app.vercel.app/?demo=off#/'
assert.equal(api.personalDemoOwner(),null)
assert.equal((await api.personalDemoResponse(request('/rest/v1/lesson_progress?lesson_ref=eq.'+ref))).status,403,'Disabled fixtures never reach the backend')
href='https://edu-study-app.vercel.app/?demo=danil#/'
assert.equal(api.personalDemoOwner(),'danil')
const mode=JSON.parse(values.get('iskra:personal-demo:v1'));mode.expires=Date.now()-1;values.set('iskra:personal-demo:v1',JSON.stringify(mode))
assert.equal(api.personalDemoOwner(),null,'Temporary activation expires')
console.log('Personal student demo: opt-in, exact profile/browser scope, expiry, content and local-only submissions passed')
