import OpticalText from './OpticalText'
import NextWorkWidget from './NextWorkWidget'
import './studentHomeWidget.css'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Sidebar from './Sidebar'
import ScheduleCarousel from './ScheduleCarousel'
import WidgetCarousel from './WidgetCarousel'
import CourseTrack from './CourseTrack'
import MobileBottomNav from './MobileBottomNav'
import MobileBell from './MobileBell'
import NotificationPopup from './NotificationPopup'
import { GlassIconButton } from './mobileChrome'
import { GLASS, useGlassBar } from '../lib/nativeGlass'
import { PLATFORM } from '../lib/platform'
import { useNotificationsStore } from '../store/notificationsStore'
import Modal from './Modal'
import { ChevronRight, User, Ghost, Sparkles } from './icons/appIcons'
import { SeasonBackdrop, SeasonHero, SeasonCat, SeasonCornerPumpkin } from './season/Season'
import { NewYearWidget, useNewYear, useStreakStickers } from './season/newyear/NewYear'
import { useStudentData } from '../store/studentDataStore'
import { useDashboard } from '../store/dashboardStore'
import { useStudentDiaryMetadata } from '../lib/useStudentDiary'
import { buildStudentDiary, diaryOverdue, diaryStatusText, type StudentDiaryEntry } from '../lib/studentDiary'
import { studentHomeWork } from '../lib/studentHomeWork'
import { useNow } from '../lib/useNow'
import { deckOwner, dueCount } from '../data/reviewDeck'
import { useStudentTz } from '../lib/studentTz'
import { wallDateTimeInTz } from '../lib/teacherTz'
import { useIsDesktop } from '../lib/useIsDesktop'
import { useT, useLang, tc } from '../lib/i18n'
import { setPersonalHalloween, useSeason, variantsFor } from '../lib/season'
import './studentHome.css'

/** Виджет новогодней темы в ряду: id вне каталога виджетов (lib/widgets), чтобы не совпасть с настройками ученика. */
const NEW_YEAR_WIDGET = 901
type WorkScope = { filter: 'actions' | 'upcoming' | 'overdue' | 'review'; course?: string; module?: number }
function WorkDue({ entry, today }: { entry: StudentDiaryEntry; today: string }) {
  const t = useT(), lang = useLang(s=>s.lang)
  if (!entry.due) return <span>{t('Без срока')}</span>
  const label = new Intl.DateTimeFormat(lang==='en'?'en-GB':'ru-RU', {day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(entry.due+'T12:00:00Z'))
  return <span className={diaryOverdue(entry,today) ? 'lh-overdue' : undefined}>{t(diaryOverdue(entry,today)?'Просрочено':'До')} {label}</span>
}

/** Real student home: every work, course and schedule row comes from the session's stores. */
export default function StudentHome({ assignments }: { assignments?: ReactNode }) {
  const t = useT(), desktop = useIsDesktop(), lang = useLang(s=>s.lang)
  const subjects = useStudentData(s=>s.subjects), progress = useStudentData(s=>s.progress)
  const {metadata,pending,error,reload} = useStudentDiaryMetadata()
  const now = useNow(60_000), tz = useStudentTz(s=>s.tz)
  const today = wallDateTimeInTz(now.toISOString(),tz).day
  const entries = useMemo(()=>buildStudentDiary(subjects,metadata,progress,now),[subjects,metadata,progress,now])
  const work = useMemo(()=>studentHomeWork(entries,today),[entries,today])
  const season = useSeason()
  // Новый год: виджет сезона в полосе виджетов, подпись на баннере, редкие Огоньки за серию.
  const newYear = useNewYear()
  const streak = useStudentData(s=>s.stats.streak)
  useStreakStickers(streak)
  const iphone = PLATFORM === 'iphone'
  const nativeChrome = iphone && GLASS && !desktop
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const notificationAnchor = useRef<HTMLSpanElement>(null)
  const unread = useNotificationsStore(s => s.notifications.some(notification => !notification.read))
  const [appearance,setAppearance] = useState(false)
  useEffect(()=>{
    const url = new URL(location.href)
    const variant = variantsFor(season.season?.key).find(item=>item.key===(url.searchParams.get('season') ?? url.searchParams.get('halloween')))
    if(!variant || iphone) return
    setPersonalHalloween(variant.key)
    url.searchParams.delete('season')
    url.searchParams.delete('halloween')
    history.replaceState(null,'',url)
  },[iphone,season.season?.key])
  const [scope,setScope] = useState<WorkScope|null>(null)
  const trackPopoverOpen = useDashboard(s=>s.trackPopoverOpen)
  const dashboard = useDashboard.getState()
  const openProfile = () => dashboard.setActivePage('profile')
  useGlassBar(nativeChrome ? {
    top: [
      { id: 'home-profile', kind: 'circle', position: 'leading', symbol: 'person.crop.circle', label: t('Профиль') },
      { id: 'home-notifications', kind: 'circle', position: 'trailing', symbol: 'bell', label: t('Уведомления'), unread },
    ],
  } : null, {
    onTap: id => {
      if (id === 'home-profile') openProfile()
      if (id === 'home-notifications') setNotificationsOpen(open => !open)
    },
  })
  const canChooseAppearance = !iphone && season.live
  const next = work.next
  const ready = !pending && !error
  // Сдавать нечего — следующий шаг сам предлагает повторение колоды, если
  // карточки ждут. Пересчёт раз в 5 минут — по часам главной.
  const deckTick = Math.floor(now.getTime()/300_000)
  const [deckDue,setDeckDue] = useState(0)
  useEffect(()=>{
    let alive = true
    dueCount(deckOwner()).then(n=>{if(alive)setDeckDue(n)}).catch(()=>{/* цифра на главной — не повод ронять главную */})
    return ()=>{alive=false}
  },[deckTick])
  const review = ready&&!next&&deckDue>0
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
    // Виджет сезона первым: игра видна сразу, без листания ряда.
    ...(newYear&&season.on('decor')?[{id:NEW_YEAR_WIDGET,content:<NewYearWidget variant={newYear}/>}]:[]),
    {id:11},
    {id:13,content:<NextWorkWidget
      status={pending?'loading':error?'error':next||review?'ready':'empty'}
      title={status ?? (next?tc(next.lesson.title):review?t('Повторить карточки'):t('Всё сдано'))}
      meta={ready&&next?`${tc(next.course.name)} · ${t('Модуль')}\u00a0${next.moduleOrder+1}`:review?`${t('Ждут повторения')}: ${deckDue} · ${t('около')} ${Math.max(1,Math.round(deckDue*8/60))} ${t('мин')}`:!status?t('Преподаватель откроет новые задания'):undefined}
      due={ready&&next?<WorkDue entry={next} today={today}/>:undefined}
      dueShort={ready&&next?(next.due?new Intl.DateTimeFormat(lang==='en'?'en-GB':'ru-RU',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(next.due+'T12:00:00Z')):t('Без срока')):undefined}
      overdue={!!next&&diaryOverdue(next,today)}
      action={error?t('Повторить'):ready&&next?t(next.status==='returned'?'Доработать ДЗ':next.lesson.kind==='test'&&!next.extraId?'Пройти тест':'Открыть ДЗ'):review?t('К карточкам'):ready&&work.review.length?t('На проверке'):undefined}
      secondary={ready&&!next&&!review&&work.review.length>0}
      onOpen={error?reload:next?()=>open(next):review?()=>dashboard.setActivePage('trainer'):()=>setScope({filter:'review'})}
    />},
  ]
  return <div className="live-student-home" data-testid="live-student-home" data-ny-hero={newYear&&season.on('hero')?'':undefined}>
    <SeasonBackdrop/><div className="lh-season-decor" aria-hidden><SeasonHero portalDecor={false}/></div><SeasonCornerPumpkin/>
    <header className="lh-header">
      {desktop ? <Sidebar/> : <>
        {nativeChrome ? <span aria-hidden/> : iphone
          ? <GlassIconButton icon={<User size={18}/>} ariaLabel={t('Профиль')} onClick={openProfile}/>
          : <button data-hover="layer" type="button" className="lh-profile" aria-label={t('Профиль')} onClick={openProfile}><User size={18}/></button>}
        <strong>{t('Главная')}</strong>
        {nativeChrome ? <>
          <span ref={notificationAnchor} className="lh-notification-anchor" aria-hidden/>
          <NotificationPopup open={notificationsOpen} anchorRef={notificationAnchor} onClose={() => setNotificationsOpen(false)}/>
        </> : <MobileBell/>}
      </>}
      <div className="lh-assignments">{assignments}</div>
      {canChooseAppearance && <button data-hover="layer" type="button" className="lh-appearance" aria-label={t('Оформление главной')} onClick={()=>setAppearance(true)}>{season.season?.key==='new-year'?<Sparkles size={18}/>:<Ghost size={18}/>}</button>}
    </header>
    <main className="lh-content">
      <section className="lh-schedule" aria-label={t('Расписание')}><ScheduleCarousel swipe={iphone}/></section>
      <section className="lh-widgets" aria-label={t('Задолженности и ближайшая работа')}><WidgetCarousel swipeOnly={iphone && !desktop} columnsOverride={desktop ? undefined : 1} leadingWidgets={workCards}/><SeasonCat/></section>
      <section className="lh-course" aria-label={t('Трек курса')} style={{zIndex:trackPopoverOpen?60:5}}><CourseTrack homeWorks={ready?entries:[]} today={today} onOpenDebts={(course,module)=>setScope({filter:'overdue',course,module})}/></section>
    </main>
    {!desktop&&<MobileBottomNav/>}
    {canChooseAppearance&&appearance&&<Modal title={t('Оформление главной')} onClose={()=>setAppearance(false)}>
      <div className="lh-appearance-options"><button data-hover="layer" type="button" aria-pressed={!season.variant} onClick={()=>{setPersonalHalloween('off');setAppearance(false)}}><OpticalText as="iskra-button-label">{t('Без праздника')}</OpticalText></button>{variantsFor(season.season?.key).map(item=><button data-hover="layer" type="button" key={item.key} aria-pressed={season.variant===item.key} onClick={()=>{setPersonalHalloween(item.key);setAppearance(false)}}><OpticalText as="iskra-button-label">{t(item.title)}</OpticalText></button>)}</div>
    </Modal>}
    {scope&&<Modal title={t(scope.module!=null?'Несданные работы':scope.filter==='review'?'На проверке':scope.filter==='overdue'?'Просроченные работы':'Мои работы')} onClose={()=>setScope(null)} width={740}>
      <div className="lh-work-filters">{(['actions','upcoming','overdue','review'] as const).map(filter=><button data-hover="layer" type="button" key={filter} aria-pressed={scope.filter===filter} onClick={()=>setScope({...scope,filter})}><OpticalText as="iskra-button-label">{t(filter==='actions'?'Нужно сдать':filter==='upcoming'?'Без просрочки':filter==='overdue'?'Просрочено':'На проверке')}</OpticalText></button>)}</div>
      {status?<p>{status}{error&&<button data-hover="layer" type="button" onClick={reload}><OpticalText as="iskra-button-label">{t('Повторить')}</OpticalText></button>}</p>:all.length?all.map(entry=><button data-hover="row" type="button" className="lh-work-row" key={entry.id+entry.course.id} onClick={()=>open(entry)}><span><strong>{tc(entry.lesson.title)}{entry.suffix?` · ${entry.suffix}`:''}</strong><small>{tc(entry.course.name)} · {t('Модуль')}{'\u00a0'}{entry.moduleOrder+1} · {t(diaryStatusText(entry))}</small></span><WorkDue entry={entry} today={today}/><ChevronRight size={16}/></button>):<p>{t('Работ нет')}</p>}
      {scope.course&&<button data-hover="layer" type="button" onClick={()=>setScope({filter:scope.filter})}><OpticalText as="iskra-button-label">{t('Все курсы')}</OpticalText></button>}
    </Modal>}
  </div>
}
