import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {mkdir, writeFile} from 'node:fs/promises'

// Execute the actual component's document handlers with DOM/animation adapters.
// No browser input or requests to production are made by these fixtures.
const cache = new URL('../node_modules/.cache/', import.meta.url)
await mkdir(cache, {recursive:true})
const stub = `const env=globalThis.__mobileGestureFixture;
export const useEffect=fn=>env.effects.push(fn);
export const useRef=value=>({current:value===null?env.sheet:value});
export const useId=()=> 'fixture-title';
export const useState=value=>[value,next=>{env.keyboardResult=next}];
export const jsx=(type,props)=>({type,props});export const jsxs=jsx;export const Fragment='fragment';
export const createPortal=tree=>tree;
export const useOverlayScroll=()=>({ref:{current:env.scroller},fade:{top:0,bottom:0},onScroll:()=>{}});
export const fadeMask=()=>({});export const useKeyboardState=()=>({open:false,inset:0});
export const useNativeOverlay=()=>{};export const useT=()=>s=>s;
export const motion=new Proxy({}, {get:(_,key)=>key});export const AnimatePresence='presence';
export const useMotionValue=()=>env.motion;export const useDragControls=()=>({start:()=>{}});
export const animate=(value,to)=>{value.set(to);return {stop(){}}};
export const X=()=>null;export const Capacitor={isNativePlatform:()=>env.native};
export default ()=>null;`
const plugins=[{name:'fixture-adapters',setup(builder){
  builder.onResolve({filter:/.*/},args=>args.kind==='entry-point'?undefined:{path:args.path,namespace:'fixture'})
  builder.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:stub,loader:'js'}))
}}]
for(const [entry,out] of [['src/components/MobileSheet.tsx','mobile-sheet-fixture.mjs'],['src/lib/useKeyboardInset.ts','mobile-keyboard-fixture.mjs']]){
  await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',outfile:new URL(out,cache).pathname,plugins,logLevel:'error'})
}
class Node {
  constructor(parent=null,options={}) {this.parentElement=parent;Object.assign(this,options)}
  contains(target){for(let p=target;p;p=p.parentElement)if(p===this)return true;return false}
  closest(){return this.interactive||this.nodrag?this:null}
  querySelectorAll(){return []}
  getClientRects(){return [1]}
  focus(){}
}
globalThis.Element=Node;globalThis.HTMLElement=Node
let index=0
function fixture({scrollTop=0,scrollable=true,overlay=false}={}){
  const sheet=new Node(),scroller=new Node(sheet,{scrollTop,scrollHeight:scrollable?600:200,clientHeight:300,overflowY:'auto'}),target=new Node(scroller)
  const handlers=new Map(), env={sheet,scroller,effects:[],native:false,motion:{value:0,get(){return this.value},set(v){this.value=v}}}
  globalThis.__mobileGestureFixture=env
  globalThis.document={activeElement:null,body:{},querySelectorAll:()=>overlay?[sheet,new Node()]:[sheet],
    addEventListener:(name,fn)=>handlers.set(name,fn),removeEventListener:()=>{}}
  globalThis.window={addEventListener(){},removeEventListener(){}}
  globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{}
  globalThis.getComputedStyle=el=>({overflowY:el.overflowY??'visible'})
  let closed=0
  return import(new URL(`mobile-sheet-fixture.mjs?fixture=${index++}`,cache)).then(({default:Sheet})=>{
    Sheet({open:true,onClose:()=>closed++,children:null});env.effects.forEach(fn=>fn())
    function event(name,x,y,at,{atTarget=target,count=1}={}){
      const touch={identifier:1,clientX:x,clientY:y,target:atTarget}
      const e={target:atTarget,timeStamp:at,cancelable:true,prevented:false,
        preventDefault(){this.prevented=true},touches:name==='touchend'||name==='touchcancel'?[]:Array.from({length:count},()=>touch),changedTouches:[touch]}
      handlers.get(name)?.(e);return e
    }
    return {env,event,target,closed:()=>closed}
  })
}
let f=await fixture();f.event('touchstart',100,100,0);f.event('touchmove',100,240,100);assert.ok(f.env.motion.get()>110);f.event('touchcancel',100,240,110);assert.equal(f.closed(),0);assert.equal(f.env.motion.get(),0)
f=await fixture();f.event('touchstart',100,100,0);f.event('touchmove',100,240,100);f.event('touchend',100,240,110);assert.equal(f.closed(),1)
f=await fixture();f.event('touchstart',100,100,0);f.event('touchmove',100,125,20);f.event('touchend',100,125,500);assert.equal(f.closed(),0,'A held short pull must not use stale flick velocity')
f=await fixture({scrollTop:80});f.event('touchstart',100,100,0);const nested=f.event('touchmove',100,240,100);assert.equal(nested.prevented,false);f.event('touchend',100,240,110);assert.equal(f.closed(),0)
f=await fixture({scrollable:false});f.target.interactive=true;f.event('touchstart',100,100,0);const edit=f.event('touchmove',100,240,100);assert.equal(edit.prevented,false);f.event('touchend',100,240,110);assert.equal(f.closed(),0)
f=await fixture({scrollable:false});f.target.nodrag=true;f.event('touchstart',100,100,0);assert.equal(f.event('touchmove',100,240,100).prevented,false)
f=await fixture({scrollable:false});f.event('touchstart',100,100,0);assert.equal(f.event('touchmove',240,105,100).prevented,false,'Horizontal carousel gesture must remain native');f.event('touchend',240,105,110);assert.equal(f.closed(),0)
f=await fixture({overlay:true});f.event('touchstart',100,100,0);assert.equal(f.event('touchmove',100,240,100).prevented,false);f.event('touchend',100,240,110);assert.equal(f.closed(),0,'An underlying sheet must not intercept the top dialog')
f=await fixture();f.event('touchstart',100,100,0);f.event('touchmove',100,240,100);f.event('touchstart',100,240,110,{count:2});f.event('touchend',100,240,120);assert.equal(f.closed(),0,'Adding a second finger cancels dismissal');assert.equal(f.env.motion.get(),0)

for(const test of [
  {name:'Safari keyboard',height:844,visible:500,scale:1,bottom:844,want:{open:true,inset:344}},
  {name:'Panned viewport',height:844,visible:500,offset:120,scale:1,bottom:844,want:{open:true,inset:224}},
  {name:'PWA fixed follows viewport',height:844,visible:500,scale:1,bottom:500,want:{open:true,inset:0}},
  {name:'Browser chrome',height:844,visible:760,scale:1,bottom:844,want:{open:false,inset:0}},
  {name:'Pinch zoom without keyboard',height:844,visible:422,scale:2,bottom:844,want:{open:false,inset:0}},
  {name:'Native resized window',height:500,visible:500,scale:1,bottom:500,native:true,editable:true,want:{open:true,inset:0}},
]){
  const env={effects:[],native:!!test.native};globalThis.__mobileGestureFixture=env
  globalThis.window={innerHeight:test.height,visualViewport:{height:test.visible,scale:test.scale,offsetTop:test.offset??0,addEventListener(){}},matchMedia:()=>({matches:false}),addEventListener(){}}
  globalThis.screen={width:390,height:844}
  globalThis.document={activeElement:test.editable?{tagName:'TEXTAREA'}:null,body:{appendChild(){}},createElement:()=>({style:{},setAttribute(){},getBoundingClientRect:()=>({bottom:test.bottom})})}
  const mod=await import(new URL(`mobile-keyboard-fixture.mjs?fixture=${index++}`,cache));const initial=mod.useKeyboardState();env.effects.forEach(fn=>fn());assert.deepEqual(env.keyboardResult??initial,test.want,test.name)
}
console.log('Mobile gestures: cancel/multitouch, stale flick, nested scrolling, editing, no-drag handles, horizontal rows and top-dialog isolation passed')
console.log('Keyboard: Safari/PWA/panning/native resizing, browser chrome and pinch zoom fixtures passed')
