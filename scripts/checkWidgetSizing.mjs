import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
const result = await build({
  stdin: {contents:"export { metricObjects } from './src/lib/widgetMetricObjects'; export { WIDGET_REGISTRY as registry } from './src/components/teacher/widgets/registry'; export * from './src/lib/deskWidgetSizing'; export * from './src/lib/defaultDeskLayout'; export * from './src/lib/widgetReviewSizing'; export * from './src/lib/widgetReviewRoute'; export { studentBalanceStats } from './src/lib/studentWidgetStats'",resolveDir:process.cwd(),loader:'ts'},
  bundle:true,platform:'node',format:'esm',write:false,
  plugins:[{name:'unused-widget-renderers',setup(b){b.onResolve({filter:/^\.\/Widget/},a=>a.importer.endsWith('/registry.tsx')?{path:a.path,external:true}:null)}}],
  external:['react','react/jsx-runtime','framer-motion','lucide-react'],
})
mkdirSync('node_modules/.cache',{recursive:true})
writeFileSync('node_modules/.cache/widget-sizing-check.mjs',result.outputFiles[0].text)
const { metricObjects, registry, moveDeskWidget, clampDeskWidget, deskRowHeight, deskColumns, resizeDeskWidget, legacyDeskRowHeight, resolveDeskCollisions, studentBalanceStats, defaultDeskItems, DESK_INSET, DESK_TOP, reviewPresets, reviewAllowed, isWidgetReviewRoute } = await import('../node_modules/.cache/widget-sizing-check.mjs')
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
  if(def.stat)assert.equal(grown.h,1,'Metrics must never grow into empty tall panels');else assert.ok(grown.h>2,'Old maxH:2 must not block growing')
  for(const delta of [1,7,19,43,85,177]) integral(resizeDeskWidget(min,def,delta,delta,width,row))
  if(def.stat)assert.deepEqual([min.w,min.h],[1,1],'Independent indicators must allow 1×1')
  if(def.type==='today-schedule')assert.ok(min.h>1,'Calendar cannot be 1×1')
  cases++
}
const metric=clampDeskWidget({i:'metric',type:'stat-students',x:0,y:0,w:1,h:1,gridVersion:2},registry.find(d=>d.stat),1200,116)
const packed=resolveDeskCollisions([metric,{i:'list',type:'groups-list',x:0,y:5,w:3,h:3,gridVersion:2}])
assert.equal(packed[1].y,5,'Intentional empty rows must remain')
assert.deepEqual(resolveDeskCollisions(packed),packed)
console.log(`${registry.length} types, ${cases} migrations and discrete resize scenarios passed; metrics support 1×1, calendar protected`)

const indicator=registry.find(d=>d.stat)
for(const {w,h} of indicator.allowedSizes){
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
const enlarged=resolveDeskCollisions(initial.map(i=>i.i==='calendar'?{...i,h:4}:i),'calendar')
assert.equal(enlarged.find(i=>i.i==='tasks').x,0)
assert.equal(enlarged.find(i=>i.i==='reminders').y,1)
const restored=resolveDeskCollisions(enlarged.map(i=>i.i==='calendar'?{...i,h:3}:i),'calendar')
assert.equal(restored.find(i=>i.i==='tasks').y,5,'Shrinking a neighbour must not pull a manually placed card up')

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
  assert.deepEqual(resolveDeskCollisions(reset),reset)
  for(const a of reset)for(const b of reset)if(a.i!==b.i)assert.ok(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),'Reset cards overlap')
  if(id==='today'&&cols===8){
   const calendar=reset.find(i=>i.type==='today-schedule'), reminders=reset.find(i=>i.type==='today-reminders'), tasks=reset.find(i=>i.type==='today-tasks')
   assert.deepEqual(reset.slice(0,4).map(i=>[i.x,i.y,i.w,i.h]),[[0,0,2,1],[2,0,2,1],[4,0,2,1],[6,0,2,1]])
   assert.equal(calendar.y+calendar.h,tasks.y+tasks.h)
   assert.deepEqual(reset.slice(0,4).map(i=>i.type),['stat-students','stat-hw','stat-lessons','attention-students'])
   assert.deepEqual([calendar,reminders,tasks].map(i=>[i.x,i.y,i.w,i.h]),[[0,1,3,5],[3,1,3,5],[6,1,2,5]])
   assert.equal(reminders.y+reminders.h,tasks.y+tasks.h)
  }
 }
}
for(const height of [900,1000,1200]){
 const bottom=DESK_TOP+6*deskRowHeight(height)+5*8
 assert.ok(Math.abs(height-bottom-DESK_INSET)<0.001,'Default bottom inset must match side inset')
}
console.log('Reset templates: equal cards, shared edges, no overlaps, equal desktop insets passed')

// Every current widget exposes only its agreed useful sizes, not five forced rectangles.
for(const [screenWidth,screenHeight] of [[1440,900],[1280,720],[1920,1080]]){
 const width=screenWidth-64,columns=deskColumns(width,8),rowHeight=deskRowHeight(screenHeight)
 const grid={width,columns,rowHeight,rows:Math.floor((screenHeight-108-32+8)/(rowHeight+8)+0.001),cellWidth:(width-(columns-1)*8)/columns}
 for(const def of registry.filter(d=>!d.legacy)){
  const sizes=reviewPresets(def,grid)
  assert.ok(sizes.length>0,`${def.type}: no permitted preset`)
  assert.equal(new Set(sizes.map(s=>`${s.w}x${s.h}`)).size,sizes.length)
  for(const size of sizes)assert.ok(reviewAllowed(def,grid,size))
  if(def.type==='today-schedule')assert.equal(reviewAllowed(def,grid,{w:1,h:1}),false)
 }
}
console.log('Useful size review: 19 widgets, explicit pairs, no forced tall metrics, three screens')

// Dragging into a free lower row survives rendering, serialization and resizing.
const manuallyMoved=resolveDeskCollisions(initial.map(i=>i.i==='calendar'?{...i,x:0,y:7}:i),'calendar')
assert.equal(manuallyMoved.find(i=>i.i==='calendar').y,7)
const reloaded=resolveDeskCollisions(JSON.parse(JSON.stringify(manuallyMoved)))
assert.deepEqual(reloaded,manuallyMoved)
const shrunk=resolveDeskCollisions(reloaded.map(i=>i.i==='calendar'?{...i,w:3,h:3}:i),'calendar')
assert.equal(shrunk.find(i=>i.i==='calendar').y,7)
for(const location of [
 {pathname:'/teacher/widget-sizes',search:'',hash:''},
 {pathname:'/',search:'',hash:'#/teacher/widget-sizes'},
 {pathname:'/',search:'?widget-sizes=1',hash:'#/teacher'},
])assert.equal(isWidgetReviewRoute(location),true)
assert.equal(isWidgetReviewRoute({pathname:'/',search:'',hash:'#/teacher'}),false)
console.log('Manual empty rows, reload/resize persistence, canonical and legacy matrix links passed')

// Registered widgets share a whitelist; arbitrary saved/resized rectangles snap to it.
for(const def of registry.filter(d=>!d.legacy)){
 assert.ok(def.allowedSizes?.length,def.type)
 for(let w=1;w<=8;w++)for(let h=1;h<=6;h++){
  const item=clampDeskWidget({i:def.type,type:def.type,x:0,y:7,w,h,gridVersion:2},def,1376,120,64,8)
  assert.ok(def.allowedSizes.some(s=>s.w===item.w&&s.h===item.h),def.type+': unsupported pair')
  assert.equal(item.y,7,'Manual rows must survive migration to useful sizes')
 }
}
console.log('All 19 widgets snap unsupported pairs while preserving manual rows')

const attention=registry.find(def=>def.type==='attention-students')
for(const width of [760,1024,1376]){
 const min=resizeDeskWidget({i:'attention',type:attention.type,x:0,y:0,w:2,h:1,gridVersion:2},attention,-10000,0,width,120,8)
 assert.deepEqual([min.w,min.h],[1,1],'Attention summary must shrink to a useful 1×1 instead of a dead 2×1 stop')
}
console.log('Attention summary: 1×1 resize is reachable on all desk widths')

// Every independent indicator has both useful widths and a real semantic asset.
for (const def of registry.filter(d => d.stat)) {
 assert.ok(metricObjects[def.type], `${def.type}: missing expanded illustration`)
 assert.ok(existsSync(`public${metricObjects[def.type]}`), `${def.type}: illustration file missing`)
 for (const width of [760,1024,1376]) {
  const small={i:def.type,type:def.type,x:0,y:0,w:1,h:1,gridVersion:2}
  const large=resizeDeskWidget(small,def,10000,0,width,120,8)
  assert.deepEqual([large.w,large.h],[2,1],`${def.type}: cannot expand to illustrated 2×1`)
  assert.ok(reviewAllowed(def,{width,columns:deskColumns(width,8),rowHeight:120,rows:6,cellWidth:156},{w:2,h:1}),`${def.type}: review rejects 2×1`)
  const restored=resizeDeskWidget(large,def,-10000,0,width,120,8)
  assert.deepEqual([restored.w,restored.h],[1,1],`${def.type}: cannot shrink back to 1×1`)
 }
}
console.log('All independent metrics: 1×1 ↔ illustrated 2×1 at three desk widths')

// Same-row drag changes horizontal order, never the rows below it.
const overlaps=(a,b)=>a.i!==b.i&&a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y
const positions=items=>Object.fromEntries(items.map(i=>[i.i,[i.x,i.y,i.w,i.h]]))
const drag=(items,id,x,y=items.find(i=>i.i===id).y,cols=8)=>moveDeskWidget(items,{...items.find(i=>i.i===id),x,y},cols)
const baseline=defaultDeskItems('today',8)
const before=JSON.stringify(baseline)
const swapped=drag(baseline,'attention-students',4)
assert.deepEqual(swapped.filter(i=>i.y===0).sort((a,b)=>a.x-b.x).map(i=>i.i),['stat-students','stat-hw','attention-students','stat-lessons'])
assert.deepEqual(swapped.filter(i=>i.y>0),baseline.filter(i=>i.y>0),'Horizontal drag pushed a lower row')
assert.deepEqual(positions(drag(swapped,'attention-students',6)),positions(baseline),'Adjacent swap must reverse cleanly')
const mixed=drag(baseline,'today-tasks',3)
assert.deepEqual(['today-schedule','today-tasks','today-reminders'].map(id=>positions(mixed)[id]),[[0,1,3,5],[3,1,2,5],[5,1,3,5]])
assert.deepEqual(positions(drag(mixed,'today-tasks',6)),positions(baseline),'Different-width adjacent swap must reverse')
assert.deepEqual(drag(baseline,'attention-students',0).filter(i=>i.y===0).sort((a,b)=>a.x-b.x).map(i=>i.i),['attention-students','stat-students','stat-hw','stat-lessons'])
const withGaps=[{i:'a',type:'stat-students',x:0,y:0,w:2,h:1},{i:'b',type:'stat-hw',x:2,y:0,w:1,h:1},{i:'c',type:'stat-lessons',x:3,y:0,w:1,h:1},{i:'d',type:'attention-students',x:6,y:0,w:2,h:1},...baseline.filter(i=>i.y>0)]
assert.deepEqual(positions(drag(withGaps,'d',2)).d,[2,0,2,1])
assert.deepEqual(['b','c'].map(id=>positions(drag(withGaps,'d',2))[id]),[[4,0,1,1],[5,0,1,1]])
const free=drag(withGaps,'d',4)
assert.deepEqual(free.filter(i=>i.i!=='d'),withGaps.filter(i=>i.i!=='d'),'Free placement must not compact peers')
assert.deepEqual(positions(free).d,[4,0,2,1])
assert.equal(JSON.stringify(baseline),before,'Dragging mutated the source layout')
let reorderCases=0
for(const widths of [[1,1],[2,2],[3,3,2],[2,1,1,2],[1,2,3,1]])for(const h of [1,2,5]){
 let x=0
 const row=widths.map((w,index)=>{const card={i:`row-${index}`,type:'fixture',x,y:0,w,h};x+=w;return card})
 const below={i:'below',type:'fixture',x:0,y:h,w:8,h:3}
 const source=[...row,below]
 for(const active of row)for(const target of row){
  const result=drag(source,active.i,Math.min(8-active.w,target.x))
  assert.deepEqual(result.find(i=>i.i==='below'),below,'Horizontal reorder changed the lower row')
  for(const card of result){
   assert.deepEqual([card.w,card.h],[source.find(i=>i.i===card.i).w,source.find(i=>i.i===card.i).h])
   assert.ok(card.x>=0&&card.x+card.w<=8)
   assert.ok(!result.some(other=>overlaps(card,other)))
   if(card.i!=='below')assert.equal(card.y,0,'Same-row drag fell back to downward displacement')
  }
  assert.deepEqual(resolveDeskCollisions(JSON.parse(JSON.stringify(result))),result,'Saved horizontal order changed on reload')
  reorderCases++
 }
}
const vertical=drag(baseline,'stat-students',0,1)
assert.equal(vertical.find(i=>i.i==='stat-students').y,1)
assert.ok(vertical.every(a=>!vertical.some(b=>overlaps(a,b))),'Vertical fallback overlaps')
console.log(`${reorderCases} horizontal drag cases: equal/mixed widths, both directions, unchanged lower rows, free gaps and reload passed`)

const heights=[{i:'tall',type:'fixture',x:0,y:0,w:2,h:3},{i:'short',type:'fixture',x:2,y:0,w:2,h:1},{i:'below',type:'fixture',x:0,y:3,w:8,h:2}]
const mixedHeight=drag(heights,'short',0)
assert.deepEqual(positions(mixedHeight),{tall:[2,0,2,3],short:[0,0,2,1],below:[0,3,8,2]},'Different heights should swap when the destination fits')
const stacked=[heights[0],heights[1],{i:'under-short',type:'fixture',x:2,y:1,w:2,h:2}]
const constrained=drag(stacked,'tall',2)
assert.ok(constrained.every(a=>!constrained.some(b=>overlaps(a,b))),'A tall swapped card collided with the stack below')
console.log('Mixed heights: horizontal swap when it fits, collision-safe fallback when a lower card blocks it')
