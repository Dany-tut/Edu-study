import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdirSync, writeFileSync } from 'node:fs'
const result = await build({
  stdin: {contents:"export { WIDGET_REGISTRY as registry } from './src/components/teacher/widgets/registry'; export * from './src/lib/deskWidgetSizing'",resolveDir:process.cwd(),loader:'ts'},
  bundle:true,platform:'node',format:'esm',write:false,
  plugins:[{name:'unused-widget-renderers',setup(b){b.onResolve({filter:/^\.\/Widget/},a=>a.importer.endsWith('/registry.tsx')?{path:a.path,external:true}:null)}}],
  external:['react','react/jsx-runtime','framer-motion','lucide-react'],
})
mkdirSync('node_modules/.cache',{recursive:true})
writeFileSync('node_modules/.cache/widget-sizing-check.mjs',result.outputFiles[0].text)
const { registry, clampDeskWidget, compactDeskWidgets, deskRowHeight, deskColumns, resizeDeskWidget } = await import('../node_modules/.cache/widget-sizing-check.mjs')
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
