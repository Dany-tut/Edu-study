import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdirSync, writeFileSync } from 'node:fs'
const result = await build({
  stdin: {contents:"export { WIDGET_REGISTRY as registry } from './src/components/teacher/widgets/registry'; export * from './src/lib/deskWidgetSizing'; export * from './src/lib/defaultDeskLayout'; export { studentBalanceStats } from './src/lib/studentWidgetStats'",resolveDir:process.cwd(),loader:'ts'},
  bundle:true,platform:'node',format:'esm',write:false,
  plugins:[{name:'unused-widget-renderers',setup(b){b.onResolve({filter:/^\.\/Widget/},a=>a.importer.endsWith('/registry.tsx')?{path:a.path,external:true}:null)}}],
  external:['react','react/jsx-runtime','framer-motion','lucide-react'],
})
mkdirSync('node_modules/.cache',{recursive:true})
writeFileSync('node_modules/.cache/widget-sizing-check.mjs',result.outputFiles[0].text)
const { registry, clampDeskWidget, compactDeskWidgets, deskRowHeight, deskColumns, resizeDeskWidget, legacyDeskRowHeight, resolveDeskCollisions, studentBalanceStats, defaultDeskItems, DESK_INSET, DESK_TOP } = await import('../node_modules/.cache/widget-sizing-check.mjs')
const integral=item=>{for(const k of ['x','y','w','h','minW','minH'])assert.ok(Number.isInteger(item[k]),`${item.type}: fractional ${k}=${item[k]}`)}
let cases=0
for(const def of registry) for(const width of [900,1200,1600,2400]) for(const oldRow of [42,64,84]){
  const row=deskRowHeight(900), cols=deskColumns(width)
  const saved={i:def.type,type:def.type,x:4.37,y:2.14,w:3.48,h:2.73,minW:12,minH:30,maxH:2}
  const current=clampDeskWidget(saved,def,width,row,oldRow)
  integral(current)
  assert.equal(current.gridVersion,2)
  assert.deepEqual(clampDeskWidget(JSON.parse(JSON.stringify(current)),def,width,row),current,'Migration must be idempotent')
  const min=resizeDeskWidget(current,def,-10000,-10000,width,row)
  integral(min)
  assert.ok(min.w*(width+8)/cols-8 >= def.minWidthPx-0.001)
  assert.ok(min.h*(row+8)-8 >= def.minHeightPx-0.001)
  const grown=resizeDeskWidget(min,def,1000,450,width,row)
  integral(grown)
  assert.ok(grown.h>2,'Old maxH:2 must not block growing')
  for(const delta of [1,7,19,43,85,177]) integral(resizeDeskWidget(min,def,delta,delta,width,row))
  if(def.stat)assert.deepEqual([min.w,min.h],[1,1],'Independent indicators must allow 1×1')
  if(def.type==='today-schedule')assert.ok(min.h>1,'Calendar cannot be 1×1')
  cases++
}
const metric=clampDeskWidget({i:'metric',type:'stat-students',x:0,y:0,w:1,h:1,gridVersion:2},registry.find(d=>d.stat),1200,116)
const packed=compactDeskWidgets([metric,{i:'list',type:'groups-list',x:0,y:5,w:3,h:3,gridVersion:2}])
assert.equal(packed[1].y,1)
assert.deepEqual(compactDeskWidgets(packed),packed)
console.log(`${registry.length} types, ${cases} migrations and discrete resize scenarios passed; metrics support 1×1, calendar protected`)

const indicator=registry.find(d=>d.stat)
for(const [w,h] of [[1,1],[1,2],[2,2],[2,3],[3,3]]){
 const preset=clampDeskWidget({i:'preset',type:indicator.type,x:0,y:0,w,h,gridVersion:2},indicator,1200,116)
 assert.deepEqual([preset.w,preset.h],[w,h],`Preset ${w}×${h} must be selectable`)
}

// Untouched legacy layouts must not grow/shrink when only window height changes.
for (const def of registry) {
 const old={i:def.type,type:def.type,x:0,y:2,w:6,h:5}
 const migrate=height=>clampDeskWidget(old,def,1354,deskRowHeight(height),legacyDeskRowHeight(height))
 assert.deepEqual(migrate(650),migrate(900),`${def.type}: viewport-height resize changed saved cells`)
}

// A resize round trip must not strand the right column or shift the task list sideways.
const initial=[
 {i:'calendar',type:'today-schedule',x:0,y:1,w:5,h:3,gridVersion:2},
 {i:'reminders',type:'today-reminders',x:5,y:1,w:3,h:5,gridVersion:2},
 {i:'tasks',type:'today-tasks',x:0,y:4,w:5,h:2,gridVersion:2},
]
const enlarged=compactDeskWidgets(resolveDeskCollisions(initial.map(i=>i.i==='calendar'?{...i,h:4}:i),'calendar'))
assert.equal(enlarged.find(i=>i.i==='tasks').x,0)
assert.equal(enlarged.find(i=>i.i==='reminders').y,0)
const restored=compactDeskWidgets(resolveDeskCollisions(enlarged.map(i=>i.i==='calendar'?{...i,h:3}:i),'calendar'))
assert.deepEqual(restored,compactDeskWidgets(initial),'Reverse resize must restore neighbouring columns')

// Widget extraction preserves the original balance-based meaning of the figures.
assert.deepEqual(studentBalanceStats([{lessonBalance:2,paymentDue:'2000-01-01'}, {lessonBalance:-1,paymentDue:'2099-01-01'}, {lessonBalance:0}, {}]),{active:3,debtors:1})
assert.deepEqual(studentBalanceStats([]),{active:0,debtors:0})

// Reset must reproduce the agreed composition, with equal halves and bottom edges.
for (const width of [950, 1200, 1354, 1840, 2400]) {
 const cols = deskColumns(width, 8)
 for (const id of ['today','finances','students']) {
  const reset = defaultDeskItems(id, cols)
  assert.equal(new Set(reset.map(i=>i.i)).size,reset.length)
  for(const item of reset) {
   assert.ok([item.x,item.y,item.w,item.h].every(Number.isInteger))
   assert.ok(item.x>=0 && item.x+item.w<=cols)
   const clamped=clampDeskWidget(item,registry.find(d=>d.type===item.type),width,deskRowHeight(900),64,8)
   assert.deepEqual([clamped.x,clamped.y,clamped.w,clamped.h],[item.x,item.y,item.w,item.h])
  }
  assert.deepEqual(compactDeskWidgets(reset).map(i=>[i.i,i.x,i.y]),reset.slice().sort((a,b)=>a.y-b.y||a.x-b.x).map(i=>[i.i,i.x,i.y]))
  for(const a of reset)for(const b of reset)if(a.i!==b.i)assert.ok(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),'Reset cards overlap')
  if(id==='today'&&cols===8){
   const calendar=reset.find(i=>i.type==='today-schedule'), reminders=reset.find(i=>i.type==='today-reminders'), tasks=reset.find(i=>i.type==='today-tasks')
   assert.deepEqual(reset.filter(i=>i.type.startsWith('stat-')).map(i=>[i.x,i.y,i.w,i.h]),[[0,0,1,1],[1,0,1,1],[2,0,1,1],[3,0,1,1]])
   assert.equal(calendar.y+calendar.h,tasks.y+tasks.h)
   assert.equal(reminders.y+reminders.h,tasks.y)
   assert.equal(calendar.w,tasks.w)
  }
 }
}
for(const height of [900,1000,1200]){
 const bottom=DESK_TOP+6*deskRowHeight(height)+5*8
 assert.ok(Math.abs(height-bottom-DESK_INSET)<0.001,'Default bottom inset must match side inset')
}
console.log('Reset templates: equal cards, shared edges, no overlaps, equal desktop insets passed')
