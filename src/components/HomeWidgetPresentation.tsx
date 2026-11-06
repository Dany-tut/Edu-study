import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import HomeWidgetObject from './HomeWidgetObject'
import { ArrowRight, ChevronRight, RotateCcw } from './icons/appIcons'
import { useT, tc } from '../lib/i18n'
import type { HomeWidgetTask } from '../lib/homeWidgetTasks'
import Skeleton from './Skeleton'
import FadeText from './FadeText'
import './studentHomeWidget.css'
export function HomeWidgetFade({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [overflow,setOverflow] = useState(false)
  useLayoutEffect(() => {
    const element=ref.current
    if (!element) return
    const measure=()=>setOverflow(element.scrollHeight>element.clientHeight+1 || element.scrollWidth>element.clientWidth+1)
    measure()
    const observer=new ResizeObserver(measure)
    observer.observe(element)
    for (const child of element.children) observer.observe(child)
    return ()=>observer.disconnect()
  },[children])
  return <div ref={ref} className={`ihw-fade ${className}`} data-overflow={overflow}>{children}</div>
}
export function HomeWidgetCard({ id, title, extra, children, footer, onOpen, artwork }: { onOpen?:()=>void;artwork?:ReactNode;id:number;title:string;extra?:ReactNode;children:ReactNode;footer:ReactNode }) {
  return <section data-hover="card" className="ihw-card" data-home-widget={id} onClick={onOpen ? event => { if (!(event.target as Element).closest('button, a, input, select')) onOpen() } : undefined} style={onOpen ? { cursor: 'pointer' } : undefined}><header className="ihw-heading"><h3><HomeWidgetFade>{onOpen ? <button data-hover="layer" type="button" className="ihw-card-open" onClick={onOpen}>{title}</button> : title}</HomeWidgetFade></h3>{extra}</header><div className="ihw-body"><div className="ihw-main">{children}</div></div>{artwork ?? <HomeWidgetObject id={id}/>}<footer className="ihw-footer">{footer}</footer></section>
}
export function Value({ children, label }: { children:ReactNode;label:string }) { return <div className="ihw-metric"><strong><HomeWidgetFade className="ihw-number">{children}</HomeWidgetFade></strong><span><FadeText>{label}</FadeText></span></div> }
export function Copy({ title, text }: { title:string;text?:string }) { return <HomeWidgetFade className="ihw-copy">{title&&<div className="ihw-title-window"><HomeWidgetFade><h4>{title}</h4></HomeWidgetFade></div>}{text && <p>{text}</p>}</HomeWidgetFade> }
function HomeTaskMark({ returned }: { returned: boolean }) { const Icon = returned ? RotateCcw : ChevronRight; return <Icon size={22} /> }
export function Action({ label,onClick }: { label:string;onClick:()=>void }) { return <button type="button" className="ihw-action" onClick={onClick}><FadeText>{label}</FadeText> <ArrowRight size={14} style={{ display: 'inline-block', verticalAlign: '-0.12em' }} /></button> }
export function HomeTaskRow({ task, onOpen }: { task:HomeWidgetTask;onOpen:()=>void }) {
  const t=useT()
  return <button type="button" data-hover="layer" className={`ihw-task ${task.returned?'is-returned':''}`} onClick={onOpen}><span className="ihw-task-mark" aria-hidden="true"><HomeTaskMark returned={task.returned} /></span><span className="ihw-task-copy"><HomeWidgetFade><strong>{t(task.label)}</strong></HomeWidgetFade><HomeWidgetFade className="ihw-task-topic">{tc(task.subjectName)} · {tc(task.lesson.title)}</HomeWidgetFade></span></button>
}

export type HomeWidgetPresentationProps = {
 id:number; title:string; extra?:ReactNode; status?:'ready'|'loading'|'empty'|'error'
 copy?:{title:string;text?:string}; metrics?:{value:ReactNode;label:string;total?:ReactNode}[]
 tasks?:HomeWidgetTask[]; progress?:{value:number;max:number}; quizTrack?:boolean
 action:string; secondary?:string; onOpen:()=>void; onSecondary?:()=>void; onTask?:(task:HomeWidgetTask)=>void
}
/** The live home and the state matrix use this same presentation. No data hooks. */
export function HomeWidgetPresentation({id,title,extra,status='ready',copy,metrics,tasks,progress,quizTrack,action,secondary,onOpen,onSecondary,onTask}:HomeWidgetPresentationProps) {
 const t=useT()
 return <HomeWidgetCard id={id} title={title} extra={extra} onOpen={id===11?onOpen:undefined} footer={<><Action label={status==='error'?t('Повторить'):action} onClick={onOpen}/>{secondary&&<button className="ihw-action ihw-secondary" type="button" onClick={onSecondary??onOpen}>{secondary}</button>}</>}>
  {status==='loading'?<div className="ihw-loading" role="status" aria-label={t('Загрузка')}><Skeleton w="65%" h={20}/><Skeleton w="90%" h={12}/></div>:status==='error'?<Copy title={t('Не удалось загрузить данные')} text={t('Попробуй ещё раз')}/>:<>
   {metrics&&<div className={metrics.length>1?'ihw-stats':'ihw-single-metric'}>{metrics.map((metric,index)=><Value key={index} label={metric.label}>{metric.value}{metric.total!=null&&<small> / {metric.total}</small>}</Value>)}</div>}
   {tasks&&<div className="ihw-task-list">{tasks.slice(0,2).map(task=><HomeTaskRow key={task.key} task={task} onOpen={()=>onTask?.(task)}/>)}</div>}
   {copy&&<Copy {...copy}/>}
   {progress&&<progress className="ihw-progress ihw-bottom-track" aria-label={t('Пройденные уроки')} value={progress.value} max={Math.max(1,progress.max)}/>}
   {quizTrack&&<div className="ihw-quiz-track ihw-bottom-track" aria-hidden="true"><i/><i/><i/><i/><i/></div>}
  </>}
 </HomeWidgetCard>
}
