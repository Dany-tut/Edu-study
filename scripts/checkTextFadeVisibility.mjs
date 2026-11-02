import assert from 'node:assert/strict'
import vm from 'node:vm'
import { build } from 'esbuild'
const result=await build({entryPoints:['src/lib/textFades.ts'],bundle:true,platform:'node',format:'cjs',write:false})
function fixture(withIntersection=true) {
  let reads=0, resize, intersection, mutation
  const frames=[]
  class Element {
    constructor(){this.dataset={textFade:'1'};this.isConnected=true;this.tagName='SPAN';this.textContent='Полный длинный заголовок';this.parentElement=null;this.attrs=new Map();this.values=new Map();this.classList={contains:()=>true};this.width=100;this.content=300;this.style={getPropertyValue:k=>this.values.get(k)||'',setProperty:(k,v)=>this.values.set(k,v),removeProperty:k=>this.values.delete(k)}}
    get clientWidth(){reads++;return this.width} get clientHeight(){reads++;return 20}
    get scrollWidth(){reads++;return this.content} get scrollHeight(){reads++;return 20}
    getAttribute(k){return k==='style'?[...this.values].map(([k,v])=>k+':'+v).join(';'):this.attrs.get(k)||null}
    hasAttribute(k){return this.attrs.has(k)} setAttribute(k,v){this.attrs.set(k,v)} removeAttribute(k){this.attrs.delete(k)}
    matches(){return true} querySelectorAll(){return []} querySelector(){return null} closest(){return null}
  }
  const items=Array.from({length:2000},()=>new Element())
  class Resize { constructor(cb){this.cb=cb;this.observed=new Set();resize=this} observe(e){this.observed.add(e)} unobserve(e){this.observed.delete(e)} }
  class Intersection {constructor(cb){this.cb=cb;this.observed=new Set();intersection=this} observe(e){this.observed.add(e)} unobserve(e){this.observed.delete(e)}}
  class Mutation {constructor(cb){this.cb=cb;mutation=this} observe(){}}
  const context={module:{exports:{}},exports:{},HTMLElement:Element,ResizeObserver:Resize,MutationObserver:Mutation,
    ...(withIntersection?{IntersectionObserver:Intersection}:{}),
    document:{styleSheets:[],documentElement:new Element(),querySelectorAll:()=>items.filter(e=>e.isConnected),addEventListener(){},fonts:{addEventListener(){}}},
    URLSearchParams,window:{location:{search:''},addEventListener(){}},requestAnimationFrame:cb=>{frames.push(cb);return frames.length},getComputedStyle:e=>{reads++;return{getPropertyValue:()=>1,overflowX:'hidden',overflowY:'hidden',direction:'ltr'}},console}
  context.exports=context.module.exports
  vm.runInNewContext(result.outputFiles[0].text,context)
  const drain=()=>{while(frames.length)frames.shift()()}
  context.module.exports.startTextFades()
  return {items,resize,intersection,mutation,drain,reads:()=>reads,refresh:()=>context.module.exports.refreshTextFades()}
}
const f=fixture()
assert.equal(f.intersection.observed.size,2000)
assert.equal(f.resize.observed.size,0)
assert.equal(f.reads(),0,'offscreen labels must not force any layout reads')
f.intersection.cb([{target:f.items[0],isIntersecting:true}]);f.drain()
assert.equal(f.resize.observed.size,1)
assert.match(f.items[0].values.get('mask-image'),/linear-gradient/)
assert.equal(f.items[0].attrs.get('title'),'Полный длинный заголовок')
assert.ok(f.reads()<=6,'only visible label measured')
f.intersection.cb([{target:f.items[0],isIntersecting:false}]);f.drain()
const before=f.reads();f.refresh();f.drain()
assert.equal(f.reads(),before,'refresh/resize must not measure hidden labels')
f.items[0].content=80
f.intersection.cb([{target:f.items[0],isIntersecting:true}]);f.drain()
assert.equal(f.items[0].values.has('mask-image'),false,'re-entry remeasures fitting text')
assert.equal(f.items[0].attrs.has('title'),false)
f.items[0].isConnected=false;f.refresh();f.drain()
assert.equal(f.intersection.observed.has(f.items[0]),false)
assert.equal(f.resize.observed.has(f.items[0]),false)
const fallback=fixture(false)
assert.ok(fallback.reads()>0,'older browsers retain the existing fades')
console.log('PASS: 2000 offscreen labels cause zero layout reads; visible masks, re-entry, fitting text, node removal and older-browser fallback preserved')
