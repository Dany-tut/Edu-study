import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useStudentData } from '../store/studentDataStore'
import { useDashboard } from '../store/dashboardStore'
import { useTrainerProgress } from '../store/trainerProgressStore'
import { computeSubjectStats } from '../lib/db'
import { getSubject } from '../lib/subjects'
import { useStickers } from '../lib/stickers'
import { useTextOfDay } from '../lib/useTextOfDay'
import { useFeedGlance } from '../lib/feedRead'
import { useT, tc } from '../lib/i18n'
import { WIDGET_META } from '../data/widgets'
import { homeWidgetTasks, type HomeWidgetTask } from '../lib/homeWidgetTasks'
import './studentHomeWidget.css'

const OBJECTS: Record<number, string> = { 0:'stats',1:'fact',2:'reaction',3:'focus',4:'memes',5:'practice',6:'quiz',7:'trainer',8:'awards',9:'daily',10:'feed',11:'reminders' }
export function HomeWidgetObject({ id }: { id: number }) {
  return <img className="ihw-object" data-object={OBJECTS[id] ?? 'reminders'} src={`/widget-objects-v1/ui/${OBJECTS[id] ?? 'reminders'}.png`} alt="" aria-hidden="true" draggable={false} width={168} height={168} decoding="async" />
}
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
export function HomeWidgetCard({ id, title, extra, children, footer }: { id:number;title:string;extra?:ReactNode;children:ReactNode;footer:ReactNode }) {
  return <section className="ihw-card" data-home-widget={id}><header className="ihw-heading"><h3><HomeWidgetFade>{title}</HomeWidgetFade></h3>{extra}</header><div className="ihw-body"><div className="ihw-main">{children}</div></div><HomeWidgetObject id={id}/><footer className="ihw-footer">{footer}</footer></section>
}
function Value({ children, label }: { children:ReactNode;label:string }) { return <div className="ihw-metric"><strong>{children}</strong><span>{label}</span></div> }
function Copy({ title, text }: { title:string;text?:string }) { return <HomeWidgetFade className="ihw-copy"><div className="ihw-title-window"><HomeWidgetFade><h4>{title}</h4></HomeWidgetFade></div>{text && <p>{text}</p>}</HomeWidgetFade> }
function Action({ label,onClick }: { label:string;onClick:()=>void }) { return <button type="button" className="ihw-action" onClick={onClick}>{label} →</button> }
export function HomeTaskRow({ task, onOpen }: { task:HomeWidgetTask;onOpen:()=>void }) {
  const t=useT()
  return <button type="button" className={`ihw-task ${task.returned?'is-returned':''}`} onClick={onOpen}><span className="ihw-task-copy"><HomeWidgetFade><strong>{t(task.label)}</strong></HomeWidgetFade><HomeWidgetFade className="ihw-task-topic">{tc(task.subjectName)} · {tc(task.lesson.title)}</HomeWidgetFade></span><span className="ihw-task-mark">{task.returned?'↺':'›'}</span></button>
}
function StatsSummary({ onOpen }: { onOpen:()=>void }) {
  const t=useT(),subjects=useStudentData(s=>s.subjects),progress=useStudentData(s=>s.progress),loaded=useStudentData(s=>s.loaded),activeId=useDashboard(s=>s.activeSubjectId)
  const course=subjects.find(s=>s.id===activeId)??subjects[0]
  const lessons=course?.modules.flatMap(m=>m.lessons)??[]
  const stats=course?computeSubjectStats(course,progress):null
  const hasScore=lessons.some(l=>l.points!=null)
  return <HomeWidgetCard id={0} title={t('Прогресс курса')} footer={<Action label={t('Подробнее')} onClick={onOpen}/>}><div className="ihw-stats"><Value label={t('Уроков пройдено')}>{loaded?stats?.completedTasks??0:'—'}<small> / {loaded?stats?.totalTasks??0:'—'}</small></Value><Value label={t('Средний балл')}>{loaded&&hasScore?`${stats?.avgScore}%`:'—'}</Value></div><progress className="ihw-progress ihw-bottom-track" aria-label={t('Пройденные уроки')} value={stats?.completedTasks??0} max={Math.max(1,stats?.totalTasks??0)}/></HomeWidgetCard>
}
function FocusSummary({ onOpen }: { onOpen:()=>void }) {
  const t=useT(),seconds=useDashboard(s=>s.pomoSecondsLeft),running=useDashboard(s=>s.pomoRunning),mode=useDashboard(s=>s.pomoMode),start=useDashboard(s=>s.pomoStart),pause=useDashboard(s=>s.pomoPause)
  return <HomeWidgetCard id={3} title={t(mode==='focus'?'Фокус':'Перерыв')} footer={<><Action label={t(running?'Пауза':'Начать')} onClick={running?pause:start}/><button className="ihw-action ihw-secondary" type="button" onClick={onOpen}>{t('Настройки')}</button></>}><Value label={t(mode==='focus'?'Одна задача. Без отвлечений.':'Время отдохнуть')}>{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</Value></HomeWidgetCard>
}
function TrainerSummary({ onOpen }: { onOpen:()=>void }) {
  const t=useT(),ms=useTrainerProgress(s=>s.todayMs),done=useTrainerProgress(s=>s.doneCount),wrong=useTrainerProgress(s=>s.wrongCount),subject=useTrainerProgress(s=>s.subject)
  return <HomeWidgetCard id={7} title={t('Тренажёр')} footer={<Action label={t('Открыть тренажёр')} onClick={onOpen}/>}><Value label={t(ms>0?'Минут сегодня':'Решено заданий')}>{ms>0?Math.floor(ms/60000):done}</Value><HomeWidgetFade className="ihw-copy"><p>{tc(subject)}{wrong>0?` · ${t('Ошибок')}: ${wrong}`:''}</p></HomeWidgetFade></HomeWidgetCard>
}
function AwardsSummary({ onOpen }: { onOpen:()=>void }) {
  const t=useT(),{stickers,loading}=useStickers()
  return <HomeWidgetCard id={8} title={t('Стикеры')} footer={<Action label={t('Коллекция')} onClick={onOpen}/>}><Value label={t('Получено стикеров')}>{loading?'—':stickers.length}</Value><HomeWidgetFade className="ihw-copy"><p>{stickers[0]?tc(stickers[0].lessonTitle):t('Награды за принятые задания')}</p></HomeWidgetFade></HomeWidgetCard>
}
function DailySummary({ onOpen }: { onOpen:()=>void }) {
  const t=useT(),subjects=useStudentData(s=>s.subjects),activeId=useDashboard(s=>s.activeSubjectId)
  const course=subjects.find(s=>s.id===activeId)??subjects[0],text=useTextOfDay(getSubject(course?.subject)?.langCode)
  return <HomeWidgetCard id={9} title={t('Доза дня')} extra={text&&<span className="ihw-meta">{text.level}</span>} footer={<Action label={t('Читать')} onClick={onOpen}/>}><Copy title={text?.title??t('Пять минут языка')} text={text?.body??t('Короткий текст на языке курса')}/></HomeWidgetCard>
}
function FeedSummary({ onOpen }: { onOpen:()=>void }) {
  const t=useT(),{items,unread}=useFeedGlance(),item=unread[0]??items[0]
  return <HomeWidgetCard id={10} title={t('Лента')} footer={<Action label={t('Открыть ленту')} onClick={onOpen}/>}><Copy title={item?.title??t('Свежие материалы')} text={item?.body??t('Ролики и заметки на языке курса')}/></HomeWidgetCard>
}
function TasksSummary({ onOpen,onTask }: { onOpen:()=>void;onTask:(task:HomeWidgetTask)=>void }) {
  const t=useT(),subjects=useStudentData(s=>s.subjects),loaded=useStudentData(s=>s.loaded),tasks=homeWidgetTasks(subjects)
  return <HomeWidgetCard id={11} title={t('Твои дела')} extra={<span className="ihw-meta">{t('Все курсы')}</span>} footer={<Action label={t('Все дела')+(tasks.length?` · ${tasks.length}`:'')} onClick={onOpen}/>}>
    {!loaded?<Copy title={t('Загружаем дела')} />:tasks.length?<div className="ihw-task-list">{tasks.slice(0,2).map(task=><HomeTaskRow key={task.key} task={task} onOpen={()=>onTask(task)}/>)}</div>:<Copy title={t('Новых дел нет')} text={t('Практика — по желанию')}/>}</HomeWidgetCard>
}
function ContentSummary({ id,onOpen }: { id:number;onOpen:()=>void }) {
  const t=useT(),questions=useStudentData(s=>s.quizQuestions),facts=useStudentData(s=>s.scienceFacts),reactions=useStudentData(s=>s.courseReactions),memes=useStudentData(s=>s.scienceMemes)
  const q=questions[new Date().getDate()%Math.max(1,questions.length)]
  const fact=facts[0],reaction=reactions[0],meme=memes[0]
  const label=WIDGET_META.find(w=>w.id===id)?.label??'Вопрос дня'
  const title=id===6?t('Проверь себя'):id===5?q?.title:id===1?fact?.text:id===2?reaction?.equation:meme?.setup
  const text=id===6?`${t('Вопросов')}: ${questions.length}`:id===5?t('Один вопрос с объяснением'):id===1?tc(fact?.subject??''):id===2?reaction?.name:meme?.punchline
  return <HomeWidgetCard id={id} title={t(label)} footer={<Action label={t(id===6?'Начать':id===5?'Ответить':id===2?'Проверить себя':'Открыть')} onClick={onOpen}/>}><Copy title={title??t('Материалы загружаются')} text={text}/>{id===6&&<div className="ihw-quiz-track ihw-bottom-track" aria-hidden="true"><i/><i/><i/><i/><i/></div>}</HomeWidgetCard>
}
export default function StudentHomeWidget({ id,onOpen,onTask }: { id:number;onOpen:()=>void;onTask:(task:HomeWidgetTask)=>void }) {
  if(id===0)return <StatsSummary onOpen={onOpen}/>
  if(id===3)return <FocusSummary onOpen={onOpen}/>
  if(id===7)return <TrainerSummary onOpen={onOpen}/>
  if(id===8)return <AwardsSummary onOpen={onOpen}/>
  if(id===9)return <DailySummary onOpen={onOpen}/>
  if(id===10)return <FeedSummary onOpen={onOpen}/>
  if(id===11)return <TasksSummary onOpen={onOpen} onTask={onTask}/>
  return <ContentSummary id={id} onOpen={onOpen}/>
}

export function HomeTasksDetail({ onTask }: { onTask:(task:HomeWidgetTask)=>void }) {
  const t=useT(),subjects=useStudentData(s=>s.subjects),tasks=homeWidgetTasks(subjects),loaded=useStudentData(s=>s.loaded)
  return <div className="ihw-all-tasks">{!loaded?<p className="ihw-detail-empty">{t('Загружаем дела')}</p>:tasks.length?tasks.map(task=><HomeTaskRow key={task.key} task={task} onOpen={()=>onTask(task)}/>):<p className="ihw-detail-empty">{t('Новых дел нет')}</p>}</div>
}
