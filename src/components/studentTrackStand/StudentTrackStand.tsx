import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import CourseNode from '../CourseNode'
import { CourseSelect, ModuleChain, coursePct } from '../CourseModuleBar'
import ScheduleCard from '../ScheduleCard'
import WidgetCarousel from '../WidgetCarousel'
import Modal from '../Modal'
import { TaskliIcon } from '../icons/TaskliIcon'
import { CheckCircle2, ChevronLeft, ChevronRight, Moon, RotateCcw, Sun } from '../icons/appIcons'
import { useIsDesktop } from '../../lib/useIsDesktop'
import { useTheme } from '../../store/themeStore'
import { getTrackLessonStatus, lessonStatusLabel } from '../../lib/lessonStatus'
import { isHomeworkOverdue, overdueModuleCounts, sortedHomeworkActions, type TrackAssignment } from '../../lib/studentTrackDebts'
import type { Lesson, ScheduleDay } from '../../data/mockData'
import { makeTrackCourses, SCENARIOS, TODAY, type Scenario } from './data'
import '../teacher/journalStand/studentWidgetsStand.css'
import { SeasonBackdrop, SeasonHero, SeasonCat, SeasonCornerPumpkin } from '../season/Season'
import { setSeasonChoice, setSeasonPreview, useSeason, VARIANTS, type SeasonVariant } from '../../lib/season'
import { useScrollFades } from '../../lib/useScrollFades'
import './studentTrackStand.css'

function initialScenario(): Scenario {
  const value = new URLSearchParams(location.search).get('scenario')
  return SCENARIOS.find(([id]) => id === value)?.[0] ?? 'debts'
}
const dateLabel = (day?: string) => day ? new Intl.DateTimeFormat('ru-RU', { day:'numeric', month:'long', timeZone:'UTC' }).format(new Date(day+'T12:00:00Z')) : 'Без срока'
const stateLabel = (work: TrackAssignment) => work.state === 'returned' ? 'На доработке' : work.state === 'failed' ? 'Нужно пересдать' : work.state === 'draft' ? 'Начато' : 'Не отправлено'

function WorkRow({ work, onOpen }: { work: TrackAssignment; onOpen: (work: TrackAssignment) => void }) {
    const late = isHomeworkOverdue(work,TODAY)
    return <button data-hover="row" type="button" className="st-work-row" onClick={() => onOpen(work)}><TaskliIcon name={late?'attention':work.state==='returned'?'returned':work.state==='submitted'?'reviewStatus':'courses'} size={21} /><span><strong>{work.title}</strong><small>Модуль {work.moduleId} · {work.state==='submitted'||work.state==='unknown'?'На проверке':stateLabel(work)}</small></span><span className={late?'st-late':'st-muted'}>{late?'Срок был ':work.dueDate?'До ':''}{dateLabel(work.dueDate)}</span><ChevronRight size={16}/></button>
  }

export default function StudentTrackStand() {
  const [scenario, setScenario] = useState<Scenario>(initialScenario)
  const [examples, setExamples] = useState(() => makeTrackCourses(scenario))
  const [courseIndex, setCourseIndex] = useState(0)
  const example = examples[courseIndex]
  function setExample(update: (current: typeof example) => typeof example) {
    setExamples(current => current.map((item, i) => i === courseIndex ? update(item) : item))
  }
  const [moduleId, setModuleId] = useState(example.activeModule)
  const trackRef = useRef<HTMLDivElement>(null)
  const moduleRef = useRef<HTMLDivElement>(null)
  useScrollFades(moduleRef)
  const season = useSeason()
  const [theme, setTheme] = useState<SeasonVariant | 'off'>(() => {
    const value = new URLSearchParams(location.search).get('season')
    return VARIANTS.find(item => item.key === value)?.key ?? 'off'
  })
  useEffect(() => { setSeasonPreview(true, false); setSeasonChoice(theme, false) }, [theme])
  function chooseTheme(value: SeasonVariant | 'off') {
    setTheme(value)
    const url = new URL(location.href)
    if (value === 'off') url.searchParams.delete('season')
    else url.searchParams.set('season', value)
    history.replaceState(null, '', url)
  }
  const [edges, setEdges] = useState({ left: false, right: false })
  const [selected, setSelected] = useState<string | null>(null)
  const [listScope, setListScope] = useState<number | 'all' | null>(null)
  const [filter, setFilter] = useState<'actions' | 'overdue' | 'review'>('actions')
  const [homeworkId, setHomeworkId] = useState<string | null>(null)
  const [returnModule, setReturnModule] = useState<number | null>(null)
  const [answer, setAnswer] = useState<number | null>(null)
  const [sent, setSent] = useState(false)
  const [dayIndex, setDayIndex] = useState(1)
  const { dark, toggle } = useTheme()
  const desktop = useIsDesktop()
  const { subject, assignments, assessments, focusId } = example
  const module = subject.modules.find(item => item.id === moduleId)!
  const actions = useMemo(() => sortedHomeworkActions(assignments, TODAY), [assignments])
  const counts = useMemo(() => overdueModuleCounts(assignments, TODAY), [assignments])
  const overdue = actions.filter(work => isHomeworkOverdue(work, TODAY))
  const review = assignments.filter(work => work.state === 'submitted' || work.state === 'unknown')
  const selectedLesson = module.lessons.find(lesson => lesson.id === selected)
  const homework = assignments.find(work => work.id === homeworkId)
  const homeworkLesson = subject.modules.flatMap(item => item.lessons).find(lesson => lesson.id === homework?.lessonId)
  const visible = module.lessons
  useLayoutEffect(() => {
    const el = trackRef.current
    if (!el) return
    const current = el.querySelector<HTMLElement>('[data-current="true"]')
    const centerCurrent = () => {
      if (!current) { el.scrollLeft = 0; return }
      const viewport = el.getBoundingClientRect()
      const lesson = current.getBoundingClientRect()
      el.scrollLeft += lesson.left - viewport.left + lesson.width / 2 - el.clientWidth / 2
    }
    centerCurrent()
    const frame = requestAnimationFrame(centerCurrent)
    const update = () => setEdges({ left: el.scrollLeft > 2, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 })
    update()
    el.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(() => { centerCurrent(); update() })
    observer.observe(el)
    return () => { cancelAnimationFrame(frame); el.removeEventListener('scroll', update); observer.disconnect() }
  }, [moduleId, scenario, focusId, courseIndex])
  const list = (filter === 'review' ? review : filter === 'overdue' ? overdue : actions).filter(work => listScope === 'all' || work.moduleId === listScope)
  function chooseScenario(next: Scenario) {
    const nextExamples = makeTrackCourses(next)
    setScenario(next); setExamples(nextExamples); setCourseIndex(0); setModuleId(nextExamples[0].activeModule)
    setSelected(null); setListScope(null); setHomeworkId(null); setReturnModule(null); setAnswer(null); setSent(false)
    const url = new URL(location.href); url.searchParams.set('scenario', next); history.replaceState(null, '', url)
  }
  function chooseCourse(id: string) {
    const index = examples.findIndex(item => item.subject.id === id)
    if (index < 0) return
    const next = examples[index]
    const currentModule = next.subject.modules.find(item => item.lessons.some(lesson => lesson.id === next.focusId))
    setCourseIndex(index); setModuleId(currentModule?.id ?? next.activeModule)
    setSelected(null); setListScope(null); setHomeworkId(null); setReturnModule(null); setAnswer(null); setSent(false)
  }
  function chooseModule(id: number) { setModuleId(id); setSelected(null) }
  function openList(scope: number | 'all', nextFilter: typeof filter = 'actions') { setListScope(scope); setFilter(nextFilter); setSelected(null) }
  function openHomework(work: TrackAssignment) {
    setReturnModule(moduleId); chooseModule(work.moduleId)
    setSelected(work.lessonId); setListScope(null); setHomeworkId(work.id); setAnswer(null); setSent(false)
  }
  function closeHomework() {
    setHomeworkId(null); setAnswer(null); setSent(false)
    if (returnModule !== null && returnModule !== moduleId) chooseModule(returnModule)
    setReturnModule(null)
  }
  function submit() {
    if (answer === null || !homework) return
    setExample(current => ({ ...current, assignments:current.assignments.map(work => work.id === homework.id ? { ...work, state:'submitted' } : work), subject:{ ...current.subject, modules:current.subject.modules.map(mod => ({ ...mod, lessons:mod.lessons.map(lesson => lesson.id === homework.lessonId ? { ...lesson, status:'submitted', result:{grading:'teacher',percent:null,passingScore:80,pending:true} } : lesson) })) } }))
    setSent(true)
  }
  const days: ScheduleDay[] = [-1,0,1].map((offset,i) => ({ date:['2026-10-31',TODAY,'2026-11-02'][i], label:['Вчера','Сегодня','Завтра'][i], isToday:offset===0,
    lessons:[{ id:`track-schedule-${i}`, subject:'Химия', lessonTitle:offset===0?'Растворы':'Практика по химии',lessonNumber:4,time:'16:00',endTime:'17:00',kind:'rec',upcoming:true }, ...(offset===0?[{id:'track-schedule-bio',subject:'Биология',lessonTitle:'Клетка',lessonNumber:6,time:'18:00',endTime:'19:00',kind:'rec' as const,upcoming:true}]:[])] }))

  return <div className="sw-home-root st-root" data-testid="student-track-stand">
    <SeasonBackdrop />
    <div className="st-season-decor" aria-hidden><SeasonHero /></div>
    <SeasonCornerPumpkin />
    <header className="sw-home-header st-header">
      <label className="st-scenario"><span>Демо главной · Искра</span><select aria-label="Сценарий трека" value={scenario} onChange={e=>chooseScenario(e.target.value as Scenario)}>{SCENARIOS.map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label>
      <nav className="sw-home-nav" aria-label="Главная Искры"><span className="st-person"><span>М</span>Митя</span><button data-hover="layer" type="button" className="is-current" onClick={()=>{setListScope(null);setSelected(null)}}><TaskliIcon name="home" size={17}/>Главная</button><button data-hover="layer" type="button" onClick={()=>openList('all')}><TaskliIcon name="courses" size={17}/>Мои работы</button></nav>
      <div className="sw-home-tools"><select className="st-theme-select" aria-label="Оформление главной" value={theme} onChange={e=>chooseTheme(e.target.value as SeasonVariant | 'off')}><option value="off">Без праздника</option>{VARIANTS.map(item=><option key={item.key} value={item.key}>{item.title}</option>)}</select><button data-hover="layer" className="sw-icon-button" type="button" aria-label="Сбросить пример" onClick={()=>chooseScenario(scenario)}><RotateCcw size={17}/></button><button data-hover="layer" className="sw-icon-button" type="button" aria-label="Сменить тему" onClick={toggle}>{dark?<Sun size={18}/>:<Moon size={18}/>}</button><button data-hover="layer" className="sw-icon-button" type="button" aria-label="Все задолженности" onClick={()=>openList('all','overdue')}><TaskliIcon name="notification" size={18}/>{overdue.length>0&&<span>{overdue.length}</span>}</button></div>
    </header>
    <main className="sw-home-content st-content" data-season-active={season.active || undefined}>
      <section className="sw-home-schedule" aria-label="Расписание"><div className="sw-schedule-track">{[-1,0,1].map(offset=>{const day=days[dayIndex+offset];return day?<ScheduleCard key={day.date} day={day} mobile={!desktop} centerWidth={310} isCenter={offset===0} distance={Math.abs(offset)} dataSelected={offset===0} onClick={()=>setDayIndex(dayIndex+offset)} onOpenLesson={()=>{chooseModule(example.activeModule);setSelected(focusId)}}/>:<div className="sw-schedule-spacer" key={offset}/>})}</div><button data-hover="layer" className="sw-schedule-arrow is-left" type="button" aria-label="Предыдущий день" disabled={dayIndex===0} onClick={()=>setDayIndex(i=>i-1)}><ChevronLeft size={16}/></button><button data-hover="layer" className="sw-schedule-arrow is-right" type="button" aria-label="Следующий день" disabled={dayIndex===2} onClick={()=>setDayIndex(i=>i+1)}><ChevronRight size={16}/></button></section>
      <section className="sw-home-widget-zone st-widgets" aria-label="Задолженности и ближайшая работа"><WidgetCarousel columnsOverride={desktop ? 2 : 1} previewWidgets={[
        {id:0,content:<article className="st-widget"><div className="st-widget-heading"><h2><TaskliIcon name="review" size={18}/>Нужно сдать</h2><button className="sw-link" type="button" onClick={()=>openList('all')}>Все работы <ChevronRight size={13}/></button></div><div className="st-debt-summary"><button data-hover="layer" type="button" className="st-summary is-late" onClick={()=>openList('all','overdue')}><strong>{overdue.length}</strong><span>Просрочено</span></button><button data-hover="layer" type="button" className="st-summary" onClick={()=>openList('all')}><strong>{actions.length-overdue.length}</strong><span>Без просрочки</span></button><button data-hover="layer" type="button" className="st-summary is-review" onClick={()=>openList('all','review')}><strong>{review.length}</strong><span>На проверке</span></button></div><p>{overdue.length?`Есть несданные работы в ${Object.keys(counts).length===1?'модуле '+Object.keys(counts)[0]:'прошлых модулях'}`:actions.length?'Можно продолжать в своём темпе':'Все выданные работы сданы'}</p></article>},
        {id:1,content:<article className="st-widget"><div className="st-widget-heading"><h2><TaskliIcon name={actions.length?'continue':'done'} size={18}/>{overdue.length?'Сначала — просроченное':actions.length?'Следующий шаг':'Отличная работа, Митя'}</h2>{actions[0]&&<span className="st-muted">Модуль {actions[0].moduleId}</span>}</div>{actions[0]?<><h3>{actions[0].title}</h3><p className={isHomeworkOverdue(actions[0],TODAY)?'st-late':''}>{isHomeworkOverdue(actions[0],TODAY)?'Срок был ':'До '}{dateLabel(actions[0].dueDate)} · {stateLabel(actions[0])}</p><button data-hover="layer" type="button" className="sw-button is-primary st-primary" onClick={()=>openHomework(actions[0])}>{actions[0].state==='returned'?'Доработать ДЗ':'Продолжить ДЗ'}<ChevronRight size={14}/></button></>:<><h3>{scenario==='completed'?'Курс завершён':'Задолженностей нет'}</h3><p>{review.length?'Работы отправлены — дождись проверки преподавателя.':'Следи за расписанием и открывай доступные занятия.'}</p><button data-hover="layer" type="button" className="sw-button st-primary" onClick={()=>openList('all','review')}>Посмотреть работы</button></>}</article>},
      ]}/><SeasonCat /></section>
      <section className="st-course" aria-label="Трек курса">
        <div className="st-course-bar"><CourseSelect subjects={examples.map(item => item.subject)} activeId={subject.id} onSelect={chooseCourse}/><div ref={moduleRef} className="st-module-scroll"><ModuleChain subject={subject} activeId={moduleId} onSelect={chooseModule} debtCounts={counts} onOpenDebts={id=>{chooseModule(id);openList(id,'overdue')}}/></div><span className="st-muted st-progress">{coursePct(subject)}% курса</span>{subject.modules.length>1&&moduleId!==example.activeModule&&<button className="sw-link" type="button" onClick={()=>chooseModule(example.activeModule)}>К текущему модулю →</button>}</div>
        <div ref={trackRef} tabIndex={0} aria-label="Занятия модуля" className={`st-track-scroll${visible.length > 15 ? " is-compact" : ""}`} style={{maskImage:`linear-gradient(to right, ${edges.left ? "transparent, black 24px" : "black 0%"}, ${edges.right ? "black calc(100% - 24px), transparent" : "black 100%"})`}}><div className="st-track" style={{gridTemplateColumns:`repeat(${visible.length}, minmax(${visible.length > 15 ? "72px" : "104px"}, 1fr))`, width: visible.length > 15 ? `${visible.length / 15 * 100}%` : undefined}}>{visible.map((lesson,i)=>{
          const work=assignments.find(item=>item.lessonId===lesson.id);const late=work&&isHomeworkOverdue(work,TODAY);const status=getTrackLessonStatus(lesson);return <div className="st-track-step" data-current={lesson.id===focusId} key={lesson.id}><CourseNode lesson={lesson} status={lesson.id===focusId&&status==='current'?'today':status} index={i} assessmentOverride={assessments[lesson.id]} seasonMark={lesson.id===focusId} isSelected={lesson.id===selected} onSelect={()=>setSelected(lesson.id)} onHardSelect={()=>setSelected(lesson.id)}/><span className="st-node-status">{lessonStatusLabel(status,lesson.kind)}</span></div>
        })}</div></div>
        <div className="st-track-caption"><span>Модуль {moduleId} · {module.label}</span><span className="st-track-hints">{edges.left&&<button data-hover="layer" type="button" onClick={()=>trackRef.current?.scrollBy({left:-trackRef.current.clientWidth*0.85,behavior:'smooth'})}>← Предыдущие занятия</button>}{edges.right&&<button data-hover="layer" type="button" onClick={()=>trackRef.current?.scrollBy({left:trackRef.current.clientWidth*0.85,behavior:'smooth'})}>Дальше есть ещё занятия →</button>}</span></div>
      </section>
    </main>
    <footer className="st-footnote">Демонстрация · 1 ноября 2026 · изменения действуют до сброса примера</footer>
    {listScope!==null&&<Modal title={listScope==='all'?'Мои работы':`Несданные работы · модуль ${listScope}`} subtitle={`${subject.name} · Митя`} width={740} onClose={()=>setListScope(null)}><div className="st-filters">{([['actions','Нужно сдать'],['overdue','Просрочено'],['review','На проверке']] as const).map(([id,title])=><button data-hover="layer" type="button" key={id} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{title}</button>)}</div>{list.length?list.map(work=><WorkRow key={work.id} work={work} onOpen={openHomework}/>):<div className="st-empty"><CheckCircle2 size={32}/><h3>{filter==='overdue'?'Просроченных работ нет':filter==='review'?'Нет работ на проверке':'Всё сдано'}</h3><p>Здесь появятся выданные работы этого раздела.</p></div>}{listScope!=='all'&&<button type="button" className="sw-link" onClick={()=>setListScope('all')}>Все модули →</button>}</Modal>}
    {selectedLesson&&!homework&&listScope===null&&<Modal title={selectedLesson.title} subtitle={`Модуль ${moduleId} · занятие ${selectedLesson.number+1}`} width={520} onClose={()=>setSelected(null)}><div className="st-lesson-detail"><span className="st-state-pill">{lessonStatusLabel(getTrackLessonStatus(selectedLesson),selectedLesson.kind)}</span>{(()=>{const work=assignments.find(w=>w.lessonId===selectedLesson.id);return work?<><p className={isHomeworkOverdue(work,TODAY)?'st-late':'st-muted'}>{work.dueDate?`${isHomeworkOverdue(work,TODAY)?'Срок был':'Сдать до'} ${dateLabel(work.dueDate)}`:'Срок сдачи не задан'}</p>{work.state==='returned'&&<p>Преподаватель: проверь объяснение ответа и отправь работу повторно.</p>}<button data-hover="layer" className="sw-button is-primary" type="button" onClick={()=>openHomework(work)}>{work.state==='submitted'||work.state==='unknown'?'Посмотреть отправленную работу':work.state==='completed'?'Посмотреть результат':'Открыть ДЗ'}<ChevronRight size={14}/></button></>:<p className="st-muted">{selectedLesson.status==='locked'?'Занятие пока недоступно. Дождись открытия преподавателем.':selectedLesson.nodeType==='rec'?'Здесь будет запись занятия. К этой записи отдельная домашка не выдана.':'К этому занятию домашка ещё не выдана.'}</p>})()}</div></Modal>}
    {homework&&homeworkLesson&&<Modal title={homework.title} subtitle={`Домашняя работа · модуль ${homework.moduleId}`} width={620} onClose={closeHomework} footer={<button data-hover="layer" type="button" className="sw-button" onClick={closeHomework}>{returnModule!==moduleId?`Вернуться в модуль ${returnModule}`:'Вернуться к треку'}</button>}>
      <div className="st-homework">{sent?<div className="st-empty"><CheckCircle2 size={40}/><h3>Отправлено на проверку</h3><p>Работа убрана из задолженностей. Счётчик старого модуля обновлён.</p></div>:homework.state==='submitted'||homework.state==='unknown'?<><span className="st-state-pill">На проверке</span><p>Работа отправлена. Пока преподаватель проверяет, она не считается задолженностью.</p></>:homework.state==='completed'?<><span className="st-state-pill">ДЗ зачтено · 92%</span><p>Ответ принят. Можно продолжать курс.</p></>:<><div className="st-homework-meta"><span className="st-state-pill">{stateLabel(homework)}</span><span className={isHomeworkOverdue(homework,TODAY)?'st-late':'st-muted'}>{homework.dueDate?`${isHomeworkOverdue(homework,TODAY)?'Срок был':'До'} ${dateLabel(homework.dueDate)}`:'Без срока'}</span></div>{homework.state==='returned'&&<div className="st-return-comment"><RotateCcw size={17}/>Проверь знак заряда и объяснение. После исправления отправь работу повторно.</div>}<h3>Какой заряд имеет ядро атома?</h3><div className="st-answers" role="radiogroup" aria-label="Ответ на задание">{['Положительный','Отрицательный','Нулевой'].map((option,i)=><label key={option}><input type="radio" name="track-homework-answer" checked={answer===i} onChange={()=>setAnswer(i)}/>{option}</label>)}</div><button data-hover="layer" type="button" className="sw-button is-primary" disabled={answer===null} onClick={submit}>Отправить на проверку<ChevronRight size={15}/></button><small className="st-muted">Учебный пример стенда. Ответ сохраняется только в этом просмотре.</small></>}</div>
    </Modal>}
  </div>
}
