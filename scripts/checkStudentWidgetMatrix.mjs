import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdirSync,writeFileSync } from 'node:fs'
const bundle=await build({stdin:{contents:"export * from './src/components/studentWidgetStand/cases';export * from './src/components/studentWidgetStand/audit'",resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'esm',platform:'node',write:false,external:['react','react/jsx-runtime']})
mkdirSync('node_modules/.cache',{recursive:true})
writeFileSync('node_modules/.cache/student-widget-matrix.mjs',bundle.outputFiles[0].text)
const {widgets,sizes,statesFor,homeCase,nextCase,auditWidget}=await import('../node_modules/.cache/student-widget-matrix.mjs')
assert.equal(new Set(widgets.map(w=>w.id)).size,widgets.length)
for(const size of sizes){
 const inset=size.screenW>=1024?112:80
 assert.equal(size.width,(size.screenW-inset-(size.columns-1)*16)/size.columns,`${size.key}: differs from the live carousel width`)
}
let total=0
for(const widget of widgets){
 const states=statesFor(widget.id)
 assert.equal(new Set(states.map(s=>s[0])).size,states.length)
 for(const state of ['ready','loading','placeholder','empty','error','long','no-art'])assert.ok(states.some(s=>s[0]===state),`${widget.label}: missing ${state}`)
 for(const [state] of states){const props=widget.id===13?nextCase(state):homeCase(widget.id,state);assert.ok(props.title);if(state==='error')assert.equal(props.status,'error');if(state==='loading')assert.equal(props.status,'loading');total+=sizes.length*2}
}
const rect=(left,top,width,height)=>({left,top,right:left+width,bottom:top+height,width,height})
function sample({button=rect(51,161,133,36),body=rect(51,75,500,80),footer=rect(51,161,632,36),header=rect(51,47,500,22)}={}){
 const bounds=rect(32,32,670,180)
 return {getBoundingClientRect:()=>bounds,querySelector:selector=>({getBoundingClientRect:()=>selector==='.ihw-footer'?footer:selector==='.ihw-heading'?header:body}),querySelectorAll:selector=>selector==='button'?[{getBoundingClientRect:()=>button,closest:selector=>selector==='.ihw-footer'?{}:null}]:[]}
}
assert.deepEqual(auditWidget(sample()),[],'A 36px button in a 36px footer must fit')
const old=auditWidget(sample({button:rect(51,174,133,42)}))
assert.ok(old.includes('Кнопка не помещается в подвал'),'Detect the original padded-button regression')
assert.ok(old.includes('Кнопка за границей карточки'),'Detect overflow below the card')
assert.ok(auditWidget(sample({body:rect(51,75,500,100)})).includes('Содержимое пересекает подвал'))
assert.deepEqual(auditWidget(sample({body:rect(180,90,270,48),header:rect(180,65,270,18),footer:rect(480,80,180,72),button:rect(480,80,180,36)})),[],'Side-by-side text and actions must not count as an intersection')
console.log(`Student home matrix: ${widgets.length} production presentations, ${sizes.length} exact carousel sizes, ${total} theme/state/size cases; overflow detector regression passed`)
