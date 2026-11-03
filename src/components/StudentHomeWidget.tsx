import StickersWidget from './StickersWidget'
import { HomeWidgetPresentation, HomeTaskRow } from './HomeWidgetPresentation'
export { default as HomeWidgetObject } from './HomeWidgetObject'
import { useStudentData } from '../store/studentDataStore'
import { useDashboard } from '../store/dashboardStore'
import { useTrainerProgress } from '../store/trainerProgressStore'
import { computeSubjectStats } from '../lib/db'
import { getSubject } from '../lib/subjects'
import { useTextOfDay } from '../lib/useTextOfDay'
import { useFeedGlance } from '../lib/feedRead'
import { useT, tc } from '../lib/i18n'
import { WIDGET_META } from '../data/widgets'
import { homeWidgetTasks, type HomeWidgetTask } from '../lib/homeWidgetTasks'
export { HomeWidgetCard, HomeWidgetFade, HomeTaskRow } from './HomeWidgetPresentation'
import './studentHomeWidget.css'

function StatsSummary({ onOpen }: { onOpen:()=>void }) {
  const t=useT(),subjects=useStudentData(s=>s.subjects),progress=useStudentData(s=>s.progress),loaded=useStudentData(s=>s.loaded),activeId=useDashboard(s=>s.activeSubjectId)
  const course=subjects.find(s=>s.id===activeId)??subjects[0]
  const lessons=course?.modules.flatMap(m=>m.lessons)??[]
  const stats=course?computeSubjectStats(course,progress):null
  const hasScore=lessons.some(l=>l.points!=null)
  return <HomeWidgetPresentation id={0} title={t('Прогресс курса')} action={t('Подробнее')} onOpen={onOpen} status={loaded?'ready':'loading'} metrics={[{value:stats?.completedTasks??0,total:stats?.totalTasks??0,label:t('Уроков пройдено')},{value:hasScore?`${stats?.avgScore}%`:'—',label:t('Средний балл')}]} progress={{value:stats?.completedTasks??0,max:stats?.totalTasks??0}}/>
}
function FocusSummary({ onOpen }: { onOpen:()=>void }) {
  const t=useT(),seconds=useDashboard(s=>s.pomoSecondsLeft),running=useDashboard(s=>s.pomoRunning),mode=useDashboard(s=>s.pomoMode),start=useDashboard(s=>s.pomoStart),pause=useDashboard(s=>s.pomoPause)
  return <HomeWidgetPresentation id={3} title={t(mode==='focus'?'Фокус':'Перерыв')} action={t(running?'Пауза':'Начать')} onOpen={running?pause:start} secondary={t('Настройки')} onSecondary={onOpen} metrics={[{value:`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`,label:t(mode==='focus'?'Одна задача. Без отвлечений.':'Время отдохнуть')}]}/>
}
function TrainerSummary({ onOpen }: { onOpen:()=>void }) {
  const t=useT(),ms=useTrainerProgress(s=>s.todayMs),done=useTrainerProgress(s=>s.doneCount),wrong=useTrainerProgress(s=>s.wrongCount),subject=useTrainerProgress(s=>s.subject)
  return <HomeWidgetPresentation id={7} title={t('Тренажёр')} action={t('Открыть тренажёр')} onOpen={onOpen} metrics={[{value:ms>0?Math.floor(ms/60000):done,label:t(ms>0?'Минут сегодня':'Решено заданий')}]} copy={{title:'',text:tc(subject)+(wrong>0?` · ${t('Ошибок')}: ${wrong}`:'')}}/>
}
function DailySummary({ onOpen }: { onOpen:()=>void }) {
  const t=useT(),subjects=useStudentData(s=>s.subjects),activeId=useDashboard(s=>s.activeSubjectId)
  const course=subjects.find(s=>s.id===activeId)??subjects[0],text=useTextOfDay(getSubject(course?.subject)?.langCode)
  return <HomeWidgetPresentation id={9} title={t('Доза дня')} extra={text&&<span className="ihw-meta">{text.level}</span>} action={t('Читать')} onOpen={onOpen} copy={{title:text?.title??t('Пять минут языка'),text:text?.body??t('Короткий текст на языке курса')}}/>
}
function FeedSummary({ onOpen }: { onOpen:()=>void }) {
  const t=useT(),{items,unread}=useFeedGlance(),item=unread[0]??items[0]
  return <HomeWidgetPresentation id={10} title={t('Лента')} action={t('Открыть ленту')} onOpen={onOpen} copy={{title:item?.title??t('Свежие материалы'),text:item?.body??t('Ролики и заметки на языке курса')}}/>
}
function TasksSummary({ onOpen,onTask }: { onOpen:()=>void;onTask:(task:HomeWidgetTask)=>void }) {
  const t=useT(),subjects=useStudentData(s=>s.subjects),loaded=useStudentData(s=>s.loaded),tasks=homeWidgetTasks(subjects)
  return <HomeWidgetPresentation id={11} title={t('Твои дела')} action={t('Все дела')+(tasks.length?` · ${tasks.length}`:'')} onOpen={onOpen} onTask={onTask} status={!loaded?'loading':tasks.length?'ready':'empty'} tasks={loaded&&tasks.length?tasks:undefined} copy={loaded&&!tasks.length?{title:t('Новых дел нет'),text:t('Практика — по желанию')}:undefined}/>

}
function ContentSummary({ id,onOpen }: { id:number;onOpen:()=>void }) {
  const t=useT(),questions=useStudentData(s=>s.quizQuestions),facts=useStudentData(s=>s.scienceFacts),reactions=useStudentData(s=>s.courseReactions),memes=useStudentData(s=>s.scienceMemes)
  const q=questions[new Date().getDate()%Math.max(1,questions.length)]
  const fact=facts[0],reaction=reactions[0],meme=memes[0]
  const label=WIDGET_META.find(w=>w.id===id)?.label??'Вопрос дня'
  const title=id===6?t('Проверь себя'):id===5?q?.title:id===1?fact?.text:id===2?reaction?.equation:meme?.setup
  const text=id===6?`${t('Вопросов')}: ${questions.length}`:id===5?t('Один вопрос с объяснением'):id===1?tc(fact?.subject??''):id===2?reaction?.name:meme?.punchline
  return <HomeWidgetPresentation id={id} title={t(label)} action={t(id===6?'Начать':id===5?'Ответить':id===2?'Проверить себя':'Открыть')} onOpen={onOpen} copy={{title:title??t('Материалы загружаются'),text}} quizTrack={id===6}/>
}
export default function StudentHomeWidget({ id,onOpen,onTask }: { id:number;onOpen:()=>void;onTask:(task:HomeWidgetTask)=>void }) {
  if(id===0)return <StatsSummary onOpen={onOpen}/>
  if(id===3)return <FocusSummary onOpen={onOpen}/>
  if(id===7)return <TrainerSummary onOpen={onOpen}/>
  if(id===8)return <StickersWidget/>
  if(id===9)return <DailySummary onOpen={onOpen}/>
  if(id===10)return <FeedSummary onOpen={onOpen}/>
  if(id===11)return <TasksSummary onOpen={onOpen} onTask={onTask}/>
  return <ContentSummary id={id} onOpen={onOpen}/>
}

export function HomeTasksDetail({ onTask }: { onTask:(task:HomeWidgetTask)=>void }) {
  const t=useT(),subjects=useStudentData(s=>s.subjects),tasks=homeWidgetTasks(subjects),loaded=useStudentData(s=>s.loaded)
  return <div className="ihw-all-tasks">{!loaded?<p className="ihw-detail-empty">{t('Загружаем дела')}</p>:tasks.length?tasks.map(task=><HomeTaskRow key={task.key} task={task} onOpen={()=>onTask(task)}/>):<p className="ihw-detail-empty">{t('Новых дел нет')}</p>}</div>
}
