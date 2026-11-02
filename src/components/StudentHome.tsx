import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Sidebar from './Sidebar'
import ScheduleCarousel from './ScheduleCarousel'
import WidgetCarousel from './WidgetCarousel'
import CourseTrack from './CourseTrack'
import MobileBottomNav from './MobileBottomNav'
import MobileBell from './MobileBell'
import Modal from './Modal'
import FadeText from './FadeText'
import { ChevronRight, ClipboardList, ArrowRight, User, Ghost } from './icons/appIcons'
import { SeasonBackdrop, SeasonHero, SeasonCat, SeasonCornerPumpkin } from './season/Season'
import { useStudentData } from '../store/studentDataStore'
import { useDashboard } from '../store/dashboardStore'
import { useStudentDiaryMetadata } from '../lib/useStudentDiary'
import { buildStudentDiary, diaryOverdue, diaryStatusText, type StudentDiaryEntry } from '../lib/studentDiary'
import { studentHomeWork } from '../lib/studentHomeWork'
import { useNow } from '../lib/useNow'
import { useStudentTz } from '../lib/studentTz'
import { wallDateTimeInTz } from '../lib/teacherTz'
import { useIsDesktop } from '../lib/useIsDesktop'
import { useT, useLang, tc } from '../lib/i18n'
import { setPersonalHalloween, useSeason, VARIANTS } from '../lib/season'
import './studentHome.css'

type WorkScope = { filter: 'actions' | 'upcoming' | 'overdue' | 'review'; course?: string; module?: number }
function WorkDue({ entry, today }: { entry: StudentDiaryEntry; today: string }) {
  const t = useT(), lang = useLang(s=>s.lang)
  if (!entry.due) return <span>{t('Без срока')}</span>
  const label = new Intl.DateTimeFormat(lang==='en'?'en-GB':'ru-RU', {day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(entry.due+'T12:00:00Z'))
  return <span className={diaryOverdue(entry,today) ? 'lh-overdue' : undefined}>{t(diaryOverdue(entry,today)?'Просрочено':'До')} {label}</span>
}

/** Real student home: every work, course and schedule row comes from the session's stores. */
export default function StudentHome({ assignments }: { assignments?: ReactNode }) {
  const t = useT(), desktop = useIsDesktop()
  const subjects = useStudentData(s=>s.subjects), progress = useStudentData(s=>s.progress)
  const {metadata,pending,error,reload} = useStudentDiaryMetadata()
  const now = useNow(60_000), tz = useStudentTz(s=>s.tz)
  const today = wallDateTimeInTz(now.toISOString(),tz).day
  const entries = useMemo(()=>buildStudentDiary(subjects,metadata,progress,now),[subjects,metadata,progress,now])
  const work = useMemo(()=>studentHomeWork(entries,today),[entries,today])
  const season = useSeason()
  const [appearance,setAppearance] = useState(false)
  useEffect(()=>{
    const url = new URL(location.href)
    const variant = VARIANTS.find(item=>item.key===url.searchParams.get('halloween'))
    if(!variant) return
    setPersonalHalloween(variant.key)
    url.searchParams.delete('halloween')
    history.replaceState(null,'',url)
  },[])
  const [scope,setScope] = useState<WorkScope|null>(null)
  const trackPopoverOpen = useDashboard(s=>s.trackPopoverOpen)
  const dashboard = useDashboard.getState()
  const next = work.next
  const ready = !pending && !error
  function open(entry:StudentDiaryEntry) {
    setScope(null)
    dashboard.setActiveSubject(entry.course.id)
    const moduleId = entry.course.modules[entry.moduleOrder]?.id
    if(moduleId!=null) dashboard.setActiveModule(moduleId)
    if(entry.lesson.kind==='test'&&!entry.extraId) dashboard.openLesson(entry.lesson.id)
    else dashboard.openHomeworkForLesson(entry.id)
  }
  const all = scope ? work[scope.filter].filter(entry=>
    (!scope.course || entry.course.id===scope.course) &&
    (scope.module==null || entry.course.modules[entry.moduleOrder]?.id===scope.module)) : []
  const status = pending ? t('Загружаем дела') : error ? t('Не удалось загрузить работы') : null
  const workCards = [
    {id:12,content:<article className="lh-work-card"><header><h2><ClipboardList size={18}/>{t('Нужно сдать')}</h2><button type="button" onClick={()=>setScope({filter:'actions'})}>{t('Все работы')} <ChevronRight size={13}/></button></header>
      <div className="lh-work-counts">{([
        ['overdue',work.overdue.length,'Просрочено'],['upcoming',work.upcoming.length,'Без просрочки'],['review',work.review.length,'На проверке'],
      ] as const).map(([filter,count,label])=><button type="button" key={filter} data-kind={filter} onClick={()=>setScope({filter})}><strong>{ready?count:'—'}</strong><span>{t(label)}</span></button>)}</div>
      <p>{status ?? t(work.overdue.length?'Есть просроченные работы':'Задолженностей нет')}</p>{error&&<button type="button" onClick={reload}>{t('Повторить')}</button>}</article>},
    {id:13,content:<article className="lh-work-card"><header><h2><ArrowRight size={18}/>{t(next&&diaryOverdue(next,today)?'Сначала — просроченное':'Следующий шаг')}</h2>{ready&&next&&<span>{t('Модуль')} {next.moduleOrder+1}</span>}</header>
      <h3><FadeText>{status ?? (next?tc(next.lesson.title):t('Всё сдано'))}</FadeText></h3>
      {ready&&next?<p className="lh-next-meta"><FadeText className="lh-next-course">{tc(next.course.name)}</FadeText><WorkDue entry={next} today={today}/></p>:<p>{!status&&t('Преподаватель откроет новые задания')}</p>}
      {ready&&next&&<button type="button" className="lh-primary" onClick={()=>open(next)}>{t(next.status==='returned'?'Доработать ДЗ':next.lesson.kind==='test'&&!next.extraId?'Пройти тест':'Открыть ДЗ')}<ChevronRight size={14}/></button>}
      {error&&<button type="button" onClick={reload}>{t('Повторить')}</button>}</article>},
  ]
  return <div className="live-student-home" data-testid="live-student-home">
    <SeasonBackdrop/><div className="lh-season-decor" aria-hidden><SeasonHero portalDecor={false}/></div><SeasonCornerPumpkin/>
    <header className="lh-header">
      {desktop?<Sidebar/>:<><button type="button" className="lh-profile" aria-label={t('Профиль')} onClick={()=>dashboard.setActivePage('profile')}><User size={18}/></button><strong>{t('Главная')}</strong><MobileBell/></>}
<div className="lh-assignments">{assignments}</div><button type="button" className="lh-appearance" aria-label={t('Оформление главной')} onClick={()=>setAppearance(true)}><Ghost size={18}/></button>
    </header>
    <main className="lh-content">
      <section className="lh-schedule" aria-label={t('Расписание')}><ScheduleCarousel/></section>
      <section className="lh-widgets" aria-label={t('Задолженности и ближайшая работа')}><WidgetCarousel columnsOverride={desktop?2:1} leadingWidgets={workCards}/><SeasonCat/></section>
      <section className="lh-course" aria-label={t('Трек курса')} style={{zIndex:trackPopoverOpen?60:5}}><CourseTrack homeWorks={ready?entries:[]} today={today} onOpenDebts={(course,module)=>setScope({filter:'overdue',course,module})}/></section>
    </main>
    {!desktop&&<MobileBottomNav/>}
    {appearance&&<Modal title={t('Оформление главной')} onClose={()=>setAppearance(false)}>
      <div className="lh-appearance-options"><button type="button" aria-pressed={!season.variant} onClick={()=>{setPersonalHalloween('off');setAppearance(false)}}>{t('Без праздника')}</button>{VARIANTS.map(item=><button type="button" key={item.key} aria-pressed={season.variant===item.key} onClick={()=>{setPersonalHalloween(item.key);setAppearance(false)}}>{t(item.title)}</button>)}</div>
    </Modal>}
    {scope&&<Modal title={t(scope.module!=null?'Несданные работы':scope.filter==='review'?'На проверке':scope.filter==='overdue'?'Просроченные работы':'Мои работы')} onClose={()=>setScope(null)} width={740}>
      <div className="lh-work-filters">{(['actions','upcoming','overdue','review'] as const).map(filter=><button type="button" key={filter} aria-pressed={scope.filter===filter} onClick={()=>setScope({...scope,filter})}>{t(filter==='actions'?'Нужно сдать':filter==='upcoming'?'Без просрочки':filter==='overdue'?'Просрочено':'На проверке')}</button>)}</div>
      {status?<p>{status}{error&&<button type="button" onClick={reload}>{t('Повторить')}</button>}</p>:all.length?all.map(entry=><button type="button" className="lh-work-row" key={entry.id+entry.course.id} onClick={()=>open(entry)}><span><strong>{tc(entry.lesson.title)}{entry.suffix?` · ${entry.suffix}`:''}</strong><small>{tc(entry.course.name)} · {t('Модуль')} {entry.moduleOrder+1} · {t(diaryStatusText(entry))}</small></span><WorkDue entry={entry} today={today}/><ChevronRight size={16}/></button>):<p>{t('Работ нет')}</p>}
      {scope.course&&<button type="button" onClick={()=>setScope({filter:scope.filter})}>{t('Все курсы')}</button>}
    </Modal>}
  </div>
}
