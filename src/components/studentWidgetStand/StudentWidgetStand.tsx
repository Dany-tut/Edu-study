import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useScrollFades } from '../../lib/useScrollFades'
import { LoopSelect } from '../icons/LoopSelect'
import FadeText from '../FadeText'
import { widgets, sizes, statesFor, type StandSize } from './cases'
import type { AuditResult } from './audit'
import './studentWidgetStand.css'
const Frame=lazy(()=>import('./WidgetStandFrame'))
type Report=AuditResult&{theme:string}
const keyOf=(r:Report)=>`${r.theme}:${r.size}:${r.widget}:${r.state}`
function source(size:StandSize,widget:number,state:string,theme:string,scan=false){return `/student-widget-stand?embed=1&size=${size.key}&widget=${widget}&state=${state}&theme=${theme}${scan?'&scan=1':''}`}
function MatrixCell({widget,state,size,theme,report}:{widget:number;state:string;size:StandSize;theme:string;report?:Report}){
 const ref=useRef<HTMLElement>(null),[visible,setVisible]=useState(false),[available,setAvailable]=useState(0)
 useEffect(()=>{const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setVisible(true);observer.disconnect()}},{rootMargin:'150px'});if(ref.current)observer.observe(ref.current);return()=>observer.disconnect()},[])
 useEffect(()=>{const el=ref.current;if(!el)return;const observer=new ResizeObserver(entries=>setAvailable(entries[0].contentRect.width));observer.observe(el);return()=>observer.disconnect()},[])
 const scale=available?Math.min(1,available/(size.width+64)):1
 return <section ref={ref} className="swm-cell" data-audit={report?report.issues.length?'fail':'pass':'pending'}>
  <header><strong>{statesFor(widget).find(s=>s[0]===state)?.[1]??state}</strong><span>{size.label} · {size.width} × {size.height}</span></header>
  <p className="swm-result" role="status">{report?report.issues.length?report.issues.join(' · '):'Границы и действия: OK':'Ожидает проверки'}</p>
  <div className="swm-fit" style={{height:(size.height+64)*scale}}><div className="swm-crop" style={{width:size.width+64,height:size.height+64,transform:`scale(${scale})`,transformOrigin:'top left'}}>{visible&&<iframe title={`${widget} ${state} ${size.key}`} src={source(size,widget,state,theme)} style={{width:size.screenW,height:size.screenH}}/>}</div></div>
 </section>
}
function Matrix(){
 const root=useRef<HTMLDivElement>(null)
 useScrollFades(root,true,'[data-matrix-scroll]')
 const [widget,setWidget]=useState(13),[state,setState]=useState('all'),[size,setSize]=useState('all'),[theme,setTheme]=useState('light')
 const [reports,setReports]=useState<Record<string,Report>>({}),[scanning,setScanning]=useState(false),[done,setDone]=useState<string[]>([])
 const expected=sizes.length*2*widgets.reduce((sum,w)=>sum+statesFor(w.id).length,0)
 useEffect(()=>{
  const listener=(event:MessageEvent)=>{
   if(event.origin!==location.origin||event.data?.type!=='iskra-widget-audit')return
   if(![...root.current?.querySelectorAll('iframe')??[]].some(frame=>frame.contentWindow===event.source))return
   const result:Report={...event.data.result,theme:event.data.theme}
   if(!widgets.some(w=>w.id===result.widget)||!sizes.some(s=>s.key===result.size)||!Array.isArray(result.issues))return
   setReports(previous=>({...previous,[keyOf(result)]:result}))
   if(event.data.done)setDone(previous=>[...new Set([...previous,`${result.theme}:${result.size}`])])
  }
  window.addEventListener('message',listener);return()=>window.removeEventListener('message',listener)
 },[])
 useEffect(()=>{if(scanning&&done.length===sizes.length*2)setScanning(false)},[done,scanning])
 const selected=widget===-1?widgets:widgets.filter(w=>w.id===widget)
 const selectedSizes=size==='all'?sizes:sizes.filter(s=>s.key===size)
 const failures=useMemo(()=>Object.values(reports).filter(r=>r.issues.length),[reports])
 const openFailure=(r:Report)=>{setWidget(r.widget);setState(r.state);setSize(r.size);setTheme(r.theme)}
 return <div ref={root} className="swm-root">
  <header className="swm-top"><div><h1>Искра · состояния виджетов ученика</h1><p>Настоящие компоненты главной · {widgets.length} виджетов · {sizes.length} размеров · светлая и тёмная темы</p></div><a href="/">В приложение</a></header>
  <div className="swm-controls">
   <label>Виджет<LoopSelect aria-label="Виджет" value={widget} onChange={e=>{setWidget(Number(e.target.value));setState('all')}}><option value={-1}>Все виджеты</option>{widgets.map(w=><option key={w.id} value={w.id}>{w.label}</option>)}</LoopSelect></label>
   <label>Состояние<LoopSelect aria-label="Состояние" value={state} onChange={e=>setState(e.target.value)}><option value="all">Все состояния</option>{statesFor(widget).map(([id,label])=><option key={id} value={id}>{label}</option>)}</LoopSelect></label>
   <label>Размер<LoopSelect aria-label="Размер" value={size} onChange={e=>setSize(e.target.value)}><option value="all">Все размеры</option>{sizes.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}</LoopSelect></label>
   <label>Тема<LoopSelect aria-label="Тема" value={theme} onChange={e=>setTheme(e.target.value)}><option value="light">Светлая</option><option value="dark">Тёмная</option></LoopSelect></label>
   <button type="button" disabled={scanning} onClick={()=>{setReports({});setDone([]);setScanning(true)}}>Проверить всю матрицу</button>
  </div>
  <div className="swm-summary" role="status"><strong>{scanning?'Проверка идёт':done.length===sizes.length*2?'Проверка завершена':'Готов к проверке'}</strong><span>Проверено {Object.keys(reports).length} / {expected} · с ошибками {failures.length}</span></div>
  <main className="swm-main" data-matrix-scroll>
   <p className="swm-note">Размеры — в CSS-пикселях; сетка уменьшает только масштаб просмотра, не размер карточки. Каждая карточка получает отдельный viewport, поэтому медиазапросы соответствуют указанному экрану. Проверяются границы карточки, кнопки и пересечения с подвалом. Выступающие 3D-картинки и тени допустимы. Ошибка и загрузка проверяют общий компонент состояния; наличие ошибки в источнике данных этим стендом не имитируется. Данные вымышленные, запросов к базе и записи прогресса нет.</p>
   {failures.length>0&&<details className="swm-failures" open><summary>Найдены проблемы: {failures.length}</summary>{failures.map(r=><button key={keyOf(r)} type="button" onClick={()=>openFailure(r)}><FadeText>{widgets.find(w=>w.id===r.widget)?.label} · {r.state} · {r.size} · {r.theme}: {r.issues.join('; ')}</FadeText></button>)}</details>}
   {selected.map(w=><article key={w.id}><h2>{w.label}</h2><div className="swm-grid">{statesFor(w.id).filter(([id])=>state==='all'||state===id).flatMap(([id])=>selectedSizes.map(s=><MatrixCell key={`${w.id}:${id}:${s.key}:${theme}`} widget={w.id} state={id} size={s} theme={theme} report={reports[`${theme}:${s.key}:${w.id}:${id}`]}/>))}</div></article>)}
  </main>
  {scanning&&<div className="swm-scanners" aria-hidden="true">{['light','dark'].flatMap(t=>sizes.map(s=><iframe title={`Проверка ${s.key} ${t}`} key={`${s.key}:${t}`} src={source(s,13,'ready',t,true)} style={{width:s.screenW,height:s.screenH}}/>))}</div>}
 </div>
}
export default function StudentWidgetStand(){return new URLSearchParams(location.search).get('embed')==='1'?<Suspense fallback={null}><Frame/></Suspense>:<Matrix/>}
