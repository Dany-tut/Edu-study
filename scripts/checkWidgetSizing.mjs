import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdirSync, writeFileSync } from 'node:fs'
const result = await build({
  stdin: {contents:"export { WIDGET_REGISTRY as registry } from './src/components/teacher/widgets/registry'; export { widgetBounds, clampDeskWidget, compactDeskWidgets, deskRowHeight } from './src/lib/deskWidgetSizing'",resolveDir:process.cwd(),loader:'ts'},
  bundle:true,platform:'node',format:'esm',write:false,
  plugins:[{name:'unused-widget-renderers',setup(b){b.onResolve({filter:/^\.\/Widget/},a=>a.importer.endsWith('/registry.tsx')?{path:a.path,external:true}:null)}}],
  external:['react','react/jsx-runtime','framer-motion','lucide-react'],
})
mkdirSync('node_modules/.cache',{recursive:true})
writeFileSync('node_modules/.cache/widget-sizing-check.mjs',result.outputFiles[0].text)
const { registry, widgetBounds, clampDeskWidget, compactDeskWidgets, deskRowHeight } = await import('../node_modules/.cache/widget-sizing-check.mjs')
let cases=0
for (const def of registry) {
  assert.ok(def.minWidthPx && def.minHeightPx, `Pixel minimum missing: ${def.type}`)
  for (const width of [900,1200,1600,2400]) for (const row of [42,64,84]) {
    // Reproduce saved layouts from older builds, including obsolete maxH:2.
    const saved={i:def.type,type:def.type,x:0,y:0,w:def.defaultW,h:def.defaultH,minW:12,minH:30,maxH:2}
    const min=clampDeskWidget({...saved,w:0.01,h:0.01},def,width,row)
    const pxW=min.w*(width+8)/12-8, pxH=min.h*(row+8)-8
    assert.ok(Math.abs(pxW-def.minWidthPx)<1e-7,`${def.type}: cannot reach ${def.minWidthPx}px width on ${width}px desk`)
    assert.ok(Math.abs(pxH-def.minHeightPx)<1e-7,`${def.type}: cannot reach ${def.minHeightPx}px height at ${row}px rows`)
    const again=clampDeskWidget(min,def,width,row)
    assert.deepEqual(again,min,`${def.type}: persisted compact size changes on reload`)
    const grown=clampDeskWidget({...min,w:7,h:5},def,width,row)
    assert.ok(grown.h>2,`${def.type}: stale maxH:2 blocks growing`)
    assert.ok(min.x+min.w<=12,`${def.type}: leaves horizontal grid`)
    if(def.type==='today-schedule') assert.ok(min.h>1,'Calendar must not become 1×1')
    cases++
  }
}
const unknown={i:'external',type:'external',x:0,y:0,w:2,h:2,minW:3,minH:4,maxH:5}
assert.equal(widgetBounds(unknown,undefined,1200,64).minH,4,'Unknown plugin constraints must be preserved')
console.log(`${registry.length} widget types × 12 viewport/row combinations: ${cases} sizing regressions passed`)

const compactMetric=clampDeskWidget({i:'metric',type:'stat-students',x:0,y:0,w:0.1,h:0.1},registry.find(d=>d.type==='stat-students'),1200,64)
const packed=compactDeskWidgets([compactMetric,{i:'list',type:'groups-list',x:0,y:2,w:4,h:4}])
assert.equal(packed[1].y,compactMetric.h,'Compact height must not leave a whole empty grid row')
assert.deepEqual(compactDeskWidgets(JSON.parse(JSON.stringify(packed))),packed,'Committing/reloading fractional sizes must not shift the layout')

for (const viewport of [600,720,900,1080]) {
  const row=deskRowHeight(viewport)
  const def=registry.find(d=>d.type==='stat-students')
  const compact=clampDeskWidget({i:'saved',type:def.type,x:0,y:0,w:0,h:0},def,1200,row)
  const restored=clampDeskWidget(JSON.parse(JSON.stringify(compact)),def,1200,deskRowHeight(viewport))
  assert.equal(restored.h*(row+8)-8,88,'Reload must preserve the physical 88px minimum')
}
