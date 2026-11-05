import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import ScrollFade from '../../ScrollFade'
import CountBadge from '../../CountBadge'
import { useJournalPending, type PendingJournal } from '../../../lib/useGroups'
import AttendanceEditor from './AttendanceEditor'
import JournalSkeleton from '../JournalSkeleton'
import { useScrollFades } from '../../../lib/useScrollFades'
import { useIsDesktop } from '../../../lib/useIsDesktop'
import type { User } from '@supabase/supabase-js'
import { TeacherGuides, useTeacherGuides } from '../guides/TeacherGuides'
import type { GuideId } from '../../../../design/contextual-onboarding/guides.mjs'
import { getViewAs } from '../../../lib/teacherView'
import { useTeacherAccess } from '../../../lib/teacherAccess'
import TeacherDashboardPage from '../../../pages/teacher/TeacherDashboardPage'
import TeacherGroupsPage from '../../../pages/teacher/TeacherGroupsPage'
import { printStudentCard, StudentDashboardReport } from '../../../pages/teacher/TeacherStudentDashboardPage'
import { useTeacher } from '../../../store/teacherStore'
import { useCourseJournal } from '../../../lib/useCourseJournal'
import { OUTSIDE_COURSES, type JournalCell, type CourseJournalData } from '../../../lib/courseJournal'
import type { Group, Student } from '../../../data/teacherMockData'
import { wallDateTimeInTz } from '../../../lib/teacherTz'
import { useNow } from '../../../lib/useNow'
import { performanceDiagnostics } from '../../../lib/platformPerformance'
import TestlyMark from '../../TestlyMark'
import TeacherSelect from '../TeacherSelect'
import { ArrowLeft, BookOpen, CalendarCheck, ChevronRight, CircleAlert, ClipboardList, LayoutGrid, RefreshCw, Search, SlidersHorizontal, X } from '../../icons/appIcons'
import { useScrollEdges } from './useScrollEdges'
import { matrixRuns } from './matrixRuns'
import { columnSpacers } from './columnWindow'
import { useColumnWindow } from './useColumnWindow'
import StudentReportDrawer from './StudentReportDrawer'
import GroupOverview, { StudentOverviewCard } from './GroupOverview'
import { studentOverview, type RosterEntry } from './overviewStats'
import HomeworkList from './HomeworkList'
import { HomeworkTasks, useHomeworkHub } from './HomeworkHub'
import { applyStandReview, nativeHomeworkReviewId, type HomeworkEntry, type ReviewDecision } from './homeworkStand'
import { handoffHomeworkReview } from './homeworkReviewHandoff'
import { reviewHomework } from '../../../lib/useHomework'
import { parseBasicAnswers } from '../../../lib/basicAnswers'
import {
  ALL_COURSES,
  buildStandIndex,
  scopeSlots,
  sameLearner,
  studentWorks,
  workStats,
  type Scope,
  type StudentWork,
  type WorkSource,
} from './studentWorks'
import { teacherStudentHash } from '../../../lib/teacherStudentRoute'
import '../courseJournal.css'
import './journalStand.css'

type StandView = 'Обзор' | 'Работы' | 'Посещаемость'
export type StandSelection = Scope & {
  student: string
  workRef?: string
  origin: 'groups' | 'gradebook'
  tab: StandView
  strip: 'groups' | 'students'
  search: string
}
export const initial: StandSelection = {
  course: '',
  module: '',
  student: '',
  origin: 'gradebook',
  tab: 'Обзор',
  strip: 'students',
  search: '',
}
const fraction = (a: number, b: number) => (b ? a + ' / ' + b : '—')
function Source({ value }: { value: WorkSource }) {
  return (
    <span className="js-source">
      {value.includes('Тестли') && <TestlyMark size={12} />}
      {value}
    </span>
  )
}
function Badge({ work }: { work: StudentWork }) {
  const tone =
    work.status === 'Зачтено'
      ? 'passed'
      : work.status === 'На проверке' || work.status === 'На доработке'
      ? 'pending'
      : work.status === 'Просрочено' || work.status === 'Ниже порога'
      ? 'low'
      : ''
  return (
    <span className={'cj-badge cj-' + tone}>
      {work.score === null || ['На проверке', 'На доработке'].includes(work.status)
        ? work.status
        : work.score +
          '%' +
          (['Пересдача', 'На проверке', 'На доработке'].includes(work.status) ? ' · ' + work.status : '')}
    </span>
  )
}
function Metrics({ stats }: { stats: ReturnType<typeof workStats> }) {
  return (
    <dl className="js-metrics">
      <div>
        <dt>Работы с зачётом</dt>
        <dd>{fraction(stats.passed, stats.graded)}</dd>
        <small>из проверенных работ</small>
      </div>
      <div>
        <dt>Учебный ритм</dt>
        <dd>{fraction(stats.active, stats.weeks)}</dd>
        <small>учебных недель со сдачами</small>
      </div>
      <div>
        <dt>После замечаний</dt>
        <dd>{fraction(stats.resubmitted, stats.returned)}</dd>
        <small>возвращённых работ сданы повторно</small>
      </div>
    </dl>
  )
}
// TeacherSelect отбрасывает вариант с пустым value — «все модули» живёт под своим ключом.
const ALL_MODULES = '__all_modules'
const SCOPE_TRIGGER: CSSProperties = {
  border: 'none', background: 'transparent', padding: '4px 0', fontSize: 'inherit', color: 'var(--color-text)',
}
export function ScopePicker({
  data,
  value,
  onChange,
}: {
  data: CourseJournalData
  value: Scope
  onChange: (scope: Scope) => void
}) {
  const modules = data.modules.filter((m) => m.course_id === value.course).sort((a, b) => a.position - b.position)
  return (
    <div className="js-scope">
      {/* Свой дропдаун вместо системного <select>: рамка и иконка — у label,
          триггер прозрачный и растягивается на всю коробку. */}
      <label className="js-scope-course" data-dropdown-anchor="">
        <BookOpen size={15} />
        <TeacherSelect
          value={value.course}
          onChange={(course) => onChange({ course, module: '' })}
          options={[
            { value: ALL_COURSES, label: 'Все курсы и работы' },
            ...data.courses.map((c) => ({ value: c.id, label: c.title })),
            { value: OUTSIDE_COURSES, label: 'Вне курсов' },
          ]}
          placeholder="Найти курс…"
          clearable={false}
          triggerStyle={SCOPE_TRIGGER}
        />
      </label>
      {modules.length > 0 && (
        <label className="js-scope-module" data-dropdown-anchor="">
          <TeacherSelect
            value={value.module || ALL_MODULES}
            onChange={(module) => onChange({ ...value, module: module === ALL_MODULES ? '' : module })}
            options={[
              { value: ALL_MODULES, label: 'Все модули' },
              ...modules.map((m) => ({ value: m.id, label: m.label })),
            ]}
            clearable={false}
            triggerStyle={SCOPE_TRIGGER}
          />
        </label>
      )}
    </div>
  )
}
function Attendance({ work }: { work: StudentWork }) {
  if (!work.slot.lesson) return <span>—</span>
  return (
    <span>
      {work.present === true ? 'Был' : work.present === false ? 'Пропуск' : 'Нет отметки'}
      {work.grade != null ? ` · ${work.grade}` : ''}
      {work.watched ? ' · запись изучена' : ''}
    </span>
  )
}
export function ProfileWorks({
  list,
  today,
  scope,
  onReload,
  onWork,
  refreshing,
  collapsibleHistory = false,
}: {
  list: StudentWork[]
  today: string
  scope: React.ReactNode
  onWork?: (work: StudentWork) => void
  onReload?: () => void
  refreshing?: boolean
  collapsibleHistory?: boolean
}) {
  const stats = workStats(list, today)
  const history = list.filter((w) => w.slot.required || w.submitted || w.status !== 'Без ДЗ')
  const History = collapsibleHistory ? 'details' : 'div'
  const Heading = collapsibleHistory ? 'summary' : 'h3'
  return (
    <section className="course-journal js-profile-panel" aria-label="Общая статистика работ">
      <div className="js-row">
        <h2>Работы и прогресс</h2>
        {scope}
        {onReload && (
          <button
            className="cj-icon-button"
            aria-label="Обновить статистику"
            disabled={refreshing}
            onClick={onReload}
          >
            <RefreshCw size={15} />
          </button>
        )}
      </div>
      <Metrics stats={stats} />
      <div className="js-facts">
        <span>
          Средний результат <b>{stats.average === null ? '—' : stats.average + '%'}</b>
        </span>
        <span>
          Сдано в срок <b>{fraction(stats.timely, stats.due)}</b>
        </span>
        <span>
          Посещено <b>{fraction(stats.attended, stats.marked)}</b>
        </span>
      </div>
      {stats.unknownDates && (
        <p className="cj-note">
          Для части старых сдач время первой отправки неизвестно. Они не входят в расчёт сроков.
        </p>
      )}
      <History className="js-work-history">
        <Heading>
          <span>История работ</span> <small>· {history.length}</small>
          {collapsibleHistory && <ChevronRight className="js-history-chevron" size={16} aria-hidden="true" />}
        </Heading>
        {history.length ? (
          <div className="js-history">
            {history.map((w) => (
              <div key={w.slot.ref} className="js-work-row">
                <div>
                  {onWork ? (
                    <button className="js-work-link" onClick={() => onWork(w)}>
                      {w.slot.title} <ChevronRight size={12} />
                    </button>
                  ) : (
                    <strong>{w.slot.title}</strong>
                  )}
                  <small>
                    {[w.slot.due && 'до ' + w.slot.due, w.dates[0] && 'первая сдача ' + w.dates[0]]
                      .filter(Boolean)
                      .join(' · ')}
                  </small>
                </div>
                <Source value={w.source} />
                <Badge work={w} />
                {w.points.length > 0 && <small>Тестли · {w.points.join(', ')} б.</small>}
              </div>
            ))}
          </div>
        ) : (
          <p className="cj-note">В этом разделе пока нет работ.</p>
        )}
      </History>
    </section>
  )
}
interface MatrixProps {
  profileId?: (student: Student) => string
  pendingAttendance?: PendingJournal[]
  onOpenAttendance?: (cells: JournalCell[]) => void
  onOpenWork?: (studentId: string, workRef: string) => void
  onOpenAssignment?: (workRef: string) => void
  groups: Group[]
  entries: RosterEntry[]
  slots: ReturnType<typeof scopeSlots>
  selected: StandSelection
  picker: React.ReactNode
  groupLabel: string
  scopeLabel: string
  example?: boolean
  set: (v: Partial<StandSelection>) => void
  today: string
  renderReport: (s: Student, works: React.ReactNode) => React.ReactNode
  onReload?: () => void
  refreshing?: boolean
  position: React.MutableRefObject<{ top: number; left: number }>
}
const views = [
  ['Обзор', LayoutGrid], ['Работы', ClipboardList], ['Посещаемость', CalendarCheck],
] as const
const dateLabel = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
function shortDate(value: string | null) {
  const ms = value ? Date.parse(value) : NaN
  return Number.isFinite(ms) ? dateLabel.format(ms).replace(/\s*г\.$/, '') : 'Без даты'
}
function monogram(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(v => v[0]).join('')
}
function MatrixTools({ selected, set, picker, attention, toggle, pendingCount, workViews }: Pick<MatrixProps, 'selected' | 'set' | 'picker'> & {
  attention: boolean; toggle: () => void; pendingCount: number
  /** «По ученикам / По домашкам» — в той же строке, сразу за вкладками. */
  workViews?: ReactNode
}) {
  const [filters, setFilters] = useState(false)
  const area = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null)
  const id = useId()
  useEffect(() => {
    if (!filters) return
    const outside = (e: PointerEvent) => {
      if (!(e.target instanceof Node) || area.current?.contains(e.target)) return
      // Список модуля/курса открыт в портале — выбор пункта не закрывает панель.
      if (e.target instanceof Element && e.target.closest('[data-dropdown-menu]')) return
      setFilters(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [filters])
  return (
    <div className="js-toolbar teacher-table-toolbar">
      <div className="cj-tabs js-tabs" role="group" aria-label="Раздел журнала">
        {views.map(([tab, Icon]) => {
          const count = tab === 'Посещаемость' ? pendingCount : 0
          const label = count ? `${tab} · незаполненные занятия · ${count}` : tab
          return (
            <button type="button" key={tab} aria-label={label} title={label}
              aria-pressed={selected.tab === tab} onClick={() => set(tab === 'Обзор' ? { tab, student: '', workRef: '' } : { tab })}>
              <Icon size={15} /><span>{tab}</span>{count > 0 && <CountBadge count={count} tone="danger" className="js-pending-count" />}
            </button>
          )
        })}
      </div>
      {workViews}
      <div className="js-filter-area" ref={area} onKeyDown={e => {
        if (e.key === 'Escape' && filters) { e.stopPropagation(); setFilters(false); trigger.current?.focus() }
      }} onBlur={e => {
        const next = e.relatedTarget
        if (next && !e.currentTarget.contains(next) && !next.closest('[data-dropdown-menu]')) setFilters(false)
      }}>
        <button type="button" className="cj-button js-filter-trigger" aria-label="Фильтры журнала" title="Фильтры журнала"
          ref={trigger} aria-controls={id} aria-expanded={filters} data-filtered={!!selected.module || attention || undefined}
          onClick={() => setFilters(v => !v)}><SlidersHorizontal size={15}/><span>Фильтры</span></button>
        <div id={id} className="js-filter-items" data-open={filters || undefined}>
          {picker}
          {selected.tab !== 'Обзор' && <button type="button" className="cj-button js-attention" aria-pressed={attention} onClick={toggle}>
            <CircleAlert size={14} />Требуют внимания
          </button>}
        </div>
      </div>
      <label className="js-search teacher-table-search" data-filtered={!!selected.search || undefined} title="Поиск ученика">
        <Search size={15} /><input aria-label="Поиск ученика" placeholder="Поиск ученика…" value={selected.search}
          onChange={e => set({ search: e.target.value, student: '', workRef: '' })} />
      </label>
    </div>
  )
}
function StudentPill({ entry, work, open, close }: {
  entry: RosterEntry; work?: StudentWork; open: () => void; close: () => void
}) {
  const { student, stats } = entry
  const summary = [
    ['Зачтено', fraction(stats.passed, stats.graded), 'Работы с зачётом из проверенных'],
    ['Ритм', fraction(stats.active, stats.weeks), 'Учебные недели со сдачами'],
    ['Пересдано', fraction(stats.resubmitted, stats.returned), 'Повторно сдано после замечаний'],
  ]
  return (
    <aside className="js-float" aria-label="Статистика выбранного ученика">
      <div className="js-pill">
        <span className="cj-avatar" aria-hidden>{monogram(student.name)}</span>
        <div className="js-pill-person">
          <strong title={student.name}>{student.name}</strong>
          {work && <small title={[work.slot.title, work.source, ...work.points].join(' · ')}>
            {work.slot.title}{' · '}{work.source}{work.points.length > 0 && ' · ' + work.points.join(', ') + ' б.'}
          </small>}
        </div>
        {work && <span className="js-pill-result"><Badge work={work}/></span>}
        <dl className="js-pill-metrics">
          {summary.map(([label, value, hint]) => <div key={label} title={hint}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
        <button type="button" className="cj-button cj-primary js-pill-open" aria-label="Обзор ученика" title="Обзор ученика" onClick={open}>
          <span>Обзор ученика</span><ChevronRight size={15} />
        </button>
        <button type="button" className="cj-icon-button js-pill-close" aria-label="Закрыть панель" onClick={close}><X size={14}/></button>
      </div>
    </aside>
  )
}
export function Matrix(props: MatrixProps) {
  const { entries, selected, picker, groupLabel, scopeLabel, groups, set, today, example, renderReport, onReload, refreshing } = props
  const host = useRef<HTMLElement>(null)
  useScrollFades(host, true, '.js-tabs, .js-filter-items, .jh-homework-list')
  const [reportHost, setReportHost] = useState<HTMLElement | null>(null)
  const [attention, setAttention] = useState(false)
  const [workView, setWorkView] = useState<'students' | 'assignments'>('students')
  const overview = selected.tab === 'Обзор'
  const entry = entries.find(e => e.student.id === selected.student)
  const drawerOpen = !!(reportHost && entry && overview)
  const teacherGuides = useTeacherGuides()
  useEffect(() => { if (drawerOpen) teacherGuides?.enter('learner') }, [drawerOpen, teacherGuides?.enter])
  const drawerHash = drawerOpen && props.profileId ? teacherStudentHash(props.profileId(entry.student)) : null
  useEffect(() => {
    if (!drawerHash) return
    const previous = window.location.hash
    window.history.replaceState(null, '', drawerHash)
    return () => {
      if (window.location.hash === drawerHash) window.history.replaceState(null, '', previous)
    }
  }, [drawerHash])
  function closeDrawer() {
    setReportHost(null)
    requestAnimationFrame(() => host.current?.querySelector<HTMLButtonElement>('.jo-profile-link')?.focus({ preventScroll: true }))
  }
  function goToWork(w: StudentWork) {
    setReportHost(null)
    setAttention(false)
    set({ tab: 'Работы', workRef: w.slot.ref })
    if (entry) props.onOpenWork?.(entry.student.id, w.slot.ref)
    else props.onOpenAssignment?.(w.slot.ref)
  }
  return <section className="course-journal js-matrix" ref={host} data-report-open={drawerOpen || undefined}
    aria-label={'Журнал успеваемости · ' + groupLabel}>
    <div className="js-toolbar-slot"><MatrixTools selected={selected} set={v => {setReportHost(null); set(v)}} picker={picker}
      pendingCount={props.pendingAttendance?.length ?? 0} attention={!overview && attention} toggle={() => setAttention(v => !v)}
      workViews={selected.tab === 'Работы' && props.onOpenAssignment && <div className="jh-work-views js-work-views" role="group" aria-label="Представление работ">
        <button type="button" aria-pressed={workView === 'students'} onClick={() => setWorkView('students')}>По ученикам</button>
        <button type="button" aria-pressed={workView === 'assignments'} onClick={() => setWorkView('assignments')}>По домашкам</button>
      </div>} /></div>
    {selected.tab === 'Посещаемость' && !!props.pendingAttendance?.length && <details className="js-pending-lessons">
      <summary><ChevronRight size={16} aria-hidden="true" />Незаполненная посещаемость · {props.pendingAttendance.length}</summary>
      <ScrollFade maxHeight="min(24dvh, 180px)">
        <p>Занятия за последние 30 дней по всем группам и ученикам. Фильтры журнала на этот список не влияют.</p>
        <ul>{props.pendingAttendance.map(row => <li key={row.scheduleId}>
          {[shortDate(row.date), row.timeStart.slice(0, 5), row.scopeName, row.title].filter(Boolean).join(' · ')}
        </li>)}</ul>
      </ScrollFade>
    </details>}
    {selected.tab === 'Посещаемость' && props.onOpenAttendance && <p className="cj-note" role="status">Нажмите ячейку, чтобы отметить посещаемость или поставить оценку. Название урока открывает отметки для учеников из текущего списка, у которых есть это занятие в расписании.</p>}
    {overview ? <GroupOverview key={[selected.strip, groupLabel, selected.course, selected.module].join(':')}
      entries={entries} studentId={selected.student} search={selected.search} today={today} scopeLabel={scopeLabel}
      groupLabel={groupLabel} studentGroupLabel={groups.find(g => g.id === entry?.student.groupId)?.name} example={example} onStudent={student => {setReportHost(null);set({student,workRef:''})}}
      onWork={goToWork} onProfile={() => setReportHost(host.current?.closest<HTMLElement>('.js-journal-host') ?? null)} /> :
      selected.tab === 'Работы' && workView === 'assignments' && props.onOpenAssignment && props.onOpenWork
        ? <HomeworkList key={[selected.course, selected.module, groupLabel].join(':')} entries={entries} slots={props.slots} search={selected.search} attention={attention}
          onStudent={props.onOpenWork} onAssignment={props.onOpenAssignment}/>
        : <LessonMatrix {...props} attention={attention}/>}
    {drawerOpen && <StudentReportDrawer student={entry.student} group={groups.find(g => g.id === entry.student.groupId)}
      host={reportHost!} onPrint={() => printStudentCard(entry.student.name)} onClose={closeDrawer}>
      {renderReport(entry.student, <ProfileWorks collapsibleHistory list={entry.works} today={today} scope={picker}
        onReload={onReload} refreshing={refreshing} onWork={goToWork}/>)}
    </StudentReportDrawer>}
  </section>
}

function LessonMatrix({ entries, slots, selected, set, today, position, attention, onOpenWork, onOpenAssignment, onOpenAttendance }: MatrixProps & {attention: boolean}) {
  const { viewport, scroller: frame } = useScrollEdges()
  const detail = selected.workRef ?? ''
  const visible = entries.filter(e =>
    e.student.name.toLocaleLowerCase('ru').includes(selected.search.trim().toLocaleLowerCase('ru')) &&
    (!attention || e.works.some(w => ['Просрочено', 'На проверке', 'На доработке', 'Ниже порога'].includes(w.status)))
  )
  const entry = visible.find(e => e.student.id === selected.student)
  const work = entry?.works.find(w => w.slot.ref === detail)
  const byStudent = useMemo(
    () => new Map(entries.map(e => [e.student.id, new Map(e.works.map(w => [w.slot.ref, w]))])), [entries]
  )
  const withWork = selected.tab === 'Работы'
  const attendanceColumns = new Map<string, JournalCell[]>()
  if (!withWork && onOpenAttendance) {
    for (const { works } of visible) {
      for (const { slot, attendanceCell } of works) {
        if (!attendanceCell) continue
        const cells = attendanceColumns.get(slot.ref)
        if (cells) cells.push(attendanceCell)
        else attendanceColumns.set(slot.ref, [attendanceCell])
      }
    }
  }
  function canFocusColumn(id: string | null | undefined, ref: string) {
    const work = id ? byStudent.get(id)?.get(ref) : undefined
    if (!withWork && onOpenAttendance) return id ? !!work?.attendanceCell : attendanceColumns.has(ref)
    return id ? !!work : withWork && !!onOpenAssignment
  }
  const columns = useMemo(() => slots.flatMap(col => {
    if (!withWork && !col.lesson) return []
    const sources = new Set<WorkSource>()
    let hasHomework = false
    let outstanding = false
    for (const works of byStudent.values()) {
      const w = works.get(col.ref)
      if (w) {
        sources.add(w.source)
        if (w.status !== 'Без ДЗ') hasHomework = true
        if (!w.submitted || w.status === 'На доработке' || w.status === 'Пересдача') outstanding = true
      }
    }
    const test = col.lesson?.lesson?.kind === 'test'
    const date = test && col.date && col.date >= today ? col.date : col.due ?? col.date
    const upcoming = col.required && outstanding && date && date >= today ? date : null
    const displayDate = !col.lesson && col.topic ? col.due ?? col.date : col.date
    return sources.size ? [{ col, displayDate, source: sources.size === 1 ? [...sources][0] : null, hasHomework, upcoming }] : []
  }).sort((a, b) => (a.displayDate ?? '9999').localeCompare(b.displayDate ?? '9999')), [slots, byStudent, today, withWork])
  const columnPositions = useMemo(() => new Map(columns.map((c, i) => [c.col.ref, i])), [columns])
  const window = useColumnWindow(frame, columns.length, position)
  const mountedColumns = useMemo(() => columns.slice(window.start, window.end), [columns, window.start, window.end])
  const before = columnSpacers(window.start), after = columnSpacers(columns.length - window.end)
  const rows = useMemo(() => new Map(entries.map(({ student }) => [student.id,
    matrixRuns(mountedColumns, column => byStudent.get(student.id)?.has(column.col.ref) ?? false)
  ])), [entries, mountedColumns, byStudent])
  useEffect(() => {
    if (!performanceDiagnostics || !withWork) return
    const refs = new Set(columns.map(c => c.col.ref))
    const all = entries.flatMap(e => e.works.filter(w => refs.has(w.slot.ref)))
    const grades = all.flatMap(w => w.score === null || ['На проверке', 'На доработке'].includes(w.status) ? [] : [w.score + '%']).sort()
    console.debug('[journal-matrix] ' + JSON.stringify({ students: entries.length, columns: columns.length, cells: all.length, grades }))
  }, [entries, columns, withWork])
  const columnCount = columns.length
  const trackCount = Math.max(1, columnCount)
  // Reserve the source line across the roster when a work column mixes sources.
  const showSourceLine = withWork && columns.some(({ source }) => source === null)
  const nearest = withWork ? columns.reduce<string | null>((min, { upcoming }) =>
    upcoming && (!min || upcoming < min) ? upcoming : min, null) : null
  const pendingSelection = useRef(false)
  useLayoutEffect(() => {
    pendingSelection.current = !!detail
    if (detail) window.reveal(columns.findIndex(c => c.col.ref === detail))
  }, [detail, selected.student, columns, window.reveal])
  useLayoutEffect(() => {
    if (!pendingSelection.current) return
    const wrap = frame.current
    const el = wrap?.querySelector<HTMLElement>('[data-selected-work="true"]')
    if (!el || !wrap) return
    pendingSelection.current = false
    const box = wrap.getBoundingClientRect(), cell = el.getBoundingClientRect()
    const pin = wrap.querySelector('tbody th')?.getBoundingClientRect().width ?? 0
    const head = wrap.querySelector('thead')?.getBoundingClientRect().height ?? 0
    const pill = viewport.current?.querySelector('.js-float')?.getBoundingClientRect()
    const bottom = pill && cell.left < pill.right && cell.right > pill.left ? pill.top - 8 : box.bottom
    if (cell.right > box.right) wrap.scrollLeft += cell.right - box.right + 10
    else if (cell.left < box.left + pin) wrap.scrollLeft += cell.left - box.left - pin - 10
    if (cell.bottom > bottom) wrap.scrollTop += cell.bottom - bottom + 6
    else if (cell.top < box.top + head) wrap.scrollTop += cell.top - box.top - head - 6
  }, [detail, selected.student, work?.slot.ref, frame, viewport, window.start, window.end])
  const jumpToNearest = () => window.reveal(columns.findIndex(c => c.upcoming === nearest))

  function columnTab(event: KeyboardEvent<HTMLTableElement>) {
    if (event.key !== 'Tab' || !(event.target instanceof HTMLElement)) return
    const cell = event.target.closest<HTMLTableCellElement>('td[aria-colindex], th[aria-colindex]')
    const row = cell?.parentElement
    if (!cell || !row) return
    const current = Number(cell.getAttribute('aria-colindex')) - 2
    const id = row.getAttribute('data-student-id')
    const step = event.shiftKey ? -1 : 1
    for (let i = current + step; i >= 0 && i < columns.length; i += step) {
      if (!canFocusColumn(id, columns[i].col.ref)) continue
      if (i >= window.start && i < window.end) return
      event.preventDefault()
      window.reveal(i)
      requestAnimationFrame(() => row.querySelector<HTMLButtonElement>(`[aria-colindex="${i + 2}"] button`)?.focus({ preventScroll: true }))
      return
    }
    if (event.shiftKey && id && current === -1) {
      const previous = row.previousElementSibling ?? row.closest('table')?.querySelector('thead tr')
      const previousId = previous?.getAttribute('data-student-id')
      for (let i = columns.length - 1; previous && i >= 0; i--) {
        if (!canFocusColumn(previousId, columns[i].col.ref)) continue
        if (i >= window.start && i < window.end) return
        event.preventDefault()
        window.reveal(i)
        requestAnimationFrame(() => previous.querySelector<HTMLButtonElement>(`[aria-colindex="${i + 2}"] button`)?.focus({ preventScroll: true }))
        return
      }
    }
  }
  const close = () => {
    const target = frame.current?.querySelector<HTMLElement>('[data-selected-work="true"]') ??
      frame.current?.querySelector<HTMLElement>('.js-name[aria-pressed="true"]')
    target?.focus({ preventScroll: true })
    set({ student: '', workRef: '' })
  }
  return (
    <div className="js-matrix-viewport" ref={viewport} onKeyDown={e => { if (e.key === 'Escape' && entry) { e.stopPropagation(); close() } }}>
        <div className="js-matrix-scroll" ref={frame} onScroll={e => {
          position.current = { top: e.currentTarget.scrollTop, left: e.currentTarget.scrollLeft }
        }}>
          <div className="js-grid-content" data-source-line={showSourceLine || undefined}
            style={{ '--columns': columnCount, '--grid-tracks': trackCount } as CSSProperties}>
          <table aria-colcount={columnCount + 1} onKeyDown={columnTab}>
            <colgroup>
              <col className="js-student-col" />
              {columnSpacers(columnCount).map((span, i) => <col key={i} className="js-data-col" span={span} />)}
            </colgroup>
            <thead><tr>
              <th scope="col" aria-colindex={1}><div className="js-head-slots"><span className="js-col-student">Ученик <small>{visible.length}</small></span>
                {nearest && <button className="js-next-link" type="button" onClick={jumpToNearest}>К ближайшей работе <ChevronRight size={11}/></button>}
              </div></th>
              {before.map((span, i) => <th key={"before-" + i} aria-hidden="true" className="js-grid-gutter" colSpan={span} />)}
              {mountedColumns.map(({ col, displayDate, source, hasHomework, upcoming }, i) => (
                <th scope="col" aria-colindex={window.start + i + 2} key={col.ref} data-upcoming={!!nearest && upcoming === nearest || undefined}>
                  <div className="js-head-slots">
                  <div className="js-col-meta">
                    <time dateTime={displayDate ?? undefined}>{shortDate(displayDate)}</time>
                    {nearest && upcoming === nearest && <span className="js-next-label" title={'Ближайшая работа · ' + shortDate(nearest)}>Ближайшая</span>}
                  </div>
                  {withWork && onOpenAssignment ? <button type="button" className="js-col-title jh-header-link" title={'Все работы · ' + col.title} aria-label={'Все работы · ' + col.title} onClick={() => onOpenAssignment(col.ref)}>{col.title}</button>
                    : !withWork && onOpenAttendance && attendanceColumns.has(col.ref) ? <button type="button" className="js-col-title jh-header-link" aria-label={'Оценки за урок · ' + col.title} onClick={() => onOpenAttendance(attendanceColumns.get(col.ref)!)}>{col.title}</button> : <span className="js-col-title" title={col.title}>{col.title}</span>}
                  {withWork && <div className="js-col-source">{hasHomework && (source ? <Source value={source} /> : 'Разные источники')}
                    {nearest && upcoming === nearest && col.due === nearest && col.due !== displayDate &&
                      <time dateTime={nearest}>до {shortDate(nearest).replace(/\s\d{4}$/, '')}</time>}
                  </div>}
                  </div>
                </th>
              ))}
              {after.map((span, i) => <th key={"after-" + i} aria-hidden="true" className="js-grid-gutter" colSpan={span} />)}
            </tr></thead>
            <tbody>{visible.map(({ student }) => (
              <tr key={student.id} data-student-id={student.id}>
                <th scope="row" aria-colindex={1}>
                  <button type="button" className="js-name" title={student.name} aria-label={student.name}
                    aria-pressed={entry?.student.id === student.id} onClick={() => set({ student: student.id, workRef: '' })}>
                    <span className="cj-avatar" aria-hidden>{monogram(student.name)}</span><span>{student.name}</span>
                  </button>
                </th>
                {before.map((span, i) => <td key={"before-" + i} aria-hidden="true" className="js-grid-gutter" colSpan={span} />)}
                {rows.get(student.id)?.map(({ item: { col, source, upcoming }, span }) => {
                  const w = byStudent.get(student.id)?.get(col.ref)
                  const unavailable = !withWork && !!onOpenAttendance && !w?.attendanceCell
                  const active = selected.student === student.id && detail === col.ref
                  return <td key={col.ref} aria-colindex={(columnPositions.get(col.ref) ?? 0) + 2} colSpan={span} className={!w ? 'js-unassigned-run' : undefined} data-upcoming={!!nearest && upcoming === nearest || undefined}>{w ? (
                    <button type="button" disabled={unavailable} data-selected-work={active || undefined} aria-pressed={active}
                      className="js-cell" aria-label={[student.name, col.title,
                        ...(withWork ? [w.source, w.status === 'На проверке' && onOpenWork ? 'Проверить' : w.score === null ? w.status : w.score + '% · ' + w.status] : []),
                        ...(selected.tab !== 'Работы' && w.slot.lesson ? [w.present === null ? 'Нет отметки' : w.present ? 'Был' : 'Пропуск', ...(w.grade != null ? ['Оценка ' + w.grade] : []), ...(w.watched ? ['Запись изучена'] : [])] : []),
                        ...(unavailable && w.attendanceReason ? [w.attendanceReason] : []),
                      ].join(' · ')}
                      onClick={() => {
                        set({ student: student.id, workRef: col.ref })
                        if (withWork) onOpenWork?.(student.id, col.ref)
                        else if (w.attendanceCell) onOpenAttendance?.([w.attendanceCell])
                      }}>
                      {withWork && (w.status === 'На проверке' && onOpenWork ? <span className="jh-pending-action">Проверить</span> : <Badge work={w} />)}
                      {selected.tab !== 'Работы' && <small>{(!unavailable || w.present != null || w.grade != null || w.watched) && <Attendance work={w}/>} {unavailable && w.attendanceReason}</small>}
                      {withWork && !source && <Source value={w.source}/>}
                    </button>
                  ) : <span className="js-stat-value" title="Не назначено">—</span>}</td>
                })}
                {after.map((span, i) => <td key={"after-" + i} aria-hidden="true" className="js-grid-gutter" colSpan={span} />)}
              </tr>
            ))}</tbody>
          </table>
          {!visible.length && <p className="js-empty">{selected.search ? 'Никого не найдено' : attention ? 'Нет учеников, требующих внимания.' : 'В выбранном составе пока нет учеников.'}</p>}
          {entry && <div aria-hidden className="js-pill-space"/>}
          </div>
        </div>
        {(['left', 'right', 'top', 'bottom'] as const).map(side =>
          <i aria-hidden key={side} className={'js-scroll-fade js-fade-' + side} />)}
        {entry && <StudentPill entry={entry} work={work} open={() => set({tab: 'Обзор', workRef:''})} close={close} />}
    </div>
  )
}
const pageGuides: Partial<Record<ReturnType<typeof useTeacher.getState>['activePage'], GuideId>> = {
  groups:'roster', constructor:'course', 'course-editor':'course', student:'learner', finances:'finance',
  homework:'work', 'homework-review':'work', 'homework-create':'work', 'hard-review':'work',
  'lesson-editor':'schedule'
}

export default function JournalStand({ owner, user, production = false }: { owner: string; user?: User; production?: boolean }) {
  const page = useTeacher((s) => s.activePage),
    studentId = useTeacher((s) => s.selectedStudentId)
  const isDesktop = useIsDesktop()
  const pendingAttendance = useJournalPending(null)
  const allowed = useTeacherAccess(s => s.loaded && s.canPage(page))
  const journalActive = ['groups', 'gradebook', 'student'].includes(page)
  const { data, loading, error, reload, setData } = useCourseJournal(true, journalActive)
  const [attendanceCells, setAttendanceCells] = useState<JournalCell[] | null>(null)
  const storageKey = 'iskra:journal-stand:' + owner
  const [selected, setSelected] = useState<StandSelection>(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || '{}')
      return { ...initial, ...saved, tab: views.some(([v]) => v === saved.tab) ? saved.tab : initial.tab }
    } catch {
      return initial
    }
  })
  const position = useRef({ top: 0, left: 0 })
  const set = (v: Partial<StandSelection>) => setSelected((prev) => ({ ...prev, ...v }))
  useEffect(() => {
    const prior = document.title
    document.title = production ? 'Искра · Журнал учителя' : 'Искра · локальный стенд журнала'
    return () => {
      document.title = prior
    }
  }, [production])
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(selected))
    } catch {
      /* optional */
    }
  }, [storageKey, selected])
  const index = useMemo(() => (journalActive && data ? buildStandIndex(data) : null), [data, journalActive])
  const course =
    data?.courses.some((c) => c.id === selected.course) || [ALL_COURSES, OUTSIDE_COURSES].includes(selected.course)
      ? selected.course
      : data?.courses.find((c) => index?.roster.get(c.id)?.size)?.id ?? ALL_COURSES
  const module = data?.modules.some((m) => m.id === selected.module && m.course_id === course) ? selected.module : ''
  const scope = { course, module }
  const slots = useMemo(() => (index ? scopeSlots(index, { course, module }) : []), [index, course, module])
  const today = wallDateTimeInTz(useNow(60_000).toISOString(), 'Europe/Moscow').day
  async function saveReview(entry: HomeworkEntry, decision: ReviewDecision) {
    if (!data || data.demo || !entry.work.submission) throw new Error('Откройте актуальную сдачу в журнале.')
    applyStandReview(data, entry, decision)
    const payload = parseBasicAnswers(entry.work.submission.attachments)
    if (!await reviewHomework(entry.work.submission.id, decision.verdict, decision.score, decision.comment, undefined, payload?.attemptId))
      throw new Error('Не удалось сохранить проверку. Работа могла измениться; обновите журнал и повторите.')
    setData(current => current?.work.includes(entry.work.submission!) ? applyStandReview(current, entry, decision) : current)
    reload()
  }
  const homework = useHomeworkHub(journalActive ? data : null, today, saveReview, entry => {
    set({course:entry.work.slot.course,module:'',strip:entry.student.groupId ? 'groups' : 'students',student:entry.student.id,workRef:entry.work.slot.ref,tab:'Работы',search:''})
    useTeacher.getState().setSelectedGroupId(entry.student.groupId || null)
    useTeacher.getState().setActivePage('gradebook')
  }, (entry, draft) => {
    if (!isDesktop || !data || data.demo || !entry.work.submission) return false
    const id = nativeHomeworkReviewId(data, entry)
    if (!id) return false
    handoffHomeworkReview(id, entry.student.id, draft)
    useTeacher.getState().openHomeworkReview(id,entry.student.id,page)
    return true
  }, index)
  const entries = useMemo(
    () =>
      !index || !data
        ? []
        : data.students.map((student) => {
            const works = studentWorks(data, index, student, slots, today)
            return { student, works, stats: workStats(works, today) }
          }),
    [data, index, slots, today]
  )
  const roster = useMemo(
    () =>
      entries.filter(
        (e) =>
          course === ALL_COURSES ||
          index?.roster.get(course)?.has(e.student.id) ||
          slots.some(
            (slot) =>
              (!!slot.group && slot.group === e.student.groupId) ||
              (course === OUTSIDE_COURSES && index?.journal.work.has(e.student.id + ':' + slot.ref))
          )
      ),
    [entries, index, course, slots]
  )
  const groupIds = useMemo(() => new Set(roster.map((e) => e.student.groupId)), [roster])
  // Both entry points read the trainer and diagnostics from the same enrollment.
  const canonicalProfile = (student: Student) => data?.students
        .filter((s) => sameLearner(s, student))
        .sort((a, b) => Number(!!b.authUserId) - Number(!!a.authUserId) || a.id.localeCompare(b.id))[0] ?? student
  const open = (student: Student) => {
    set({ student: student.id, origin: page === 'groups' ? 'groups' : 'gradebook' })
    const profile = canonicalProfile(student)
    useTeacher.getState().openStudentDashboard(profile.id, profile.groupId)
  }
  const changeScope = (v: Scope) => {
    position.current = { top: 0, left: 0 }
    set({ ...v, search: '', workRef: '' })
  }
  const scopeLabel = [data?.courses.find(c=>c.id===course)?.title ?? (course===ALL_COURSES?'Все курсы и работы':'Вне курсов'), data?.modules.find(m=>m.id===module)?.label].filter(Boolean).join(' · ')
  const picker = data && <ScopePicker data={data} value={scope} onChange={changeScope} />
  let content: React.ReactNode
  if (page === 'home') {
    content = data && !data.demo
      ? <HomeworkTasks queue={homework.queue} groups={data.groups} onQueue={group => {
          useTeacher.getState().setSelectedGroupId(group || null)
          useTeacher.getState().setActivePage('gradebook')
        }}/>
      : <div className="cj-empty" role={error ? 'alert' : 'status'}>
          {error ?? (loading ? 'Загрузка…' : 'Войдите в аккаунт преподавателя')}
          {error && <button type="button" className="cj-button" onClick={reload}>Повторить загрузку</button>}
        </div>
  }
  // Roster forms use their own group/student queries. A slow or failed journal
  // must not prevent opening them or consume their pending navigation intent.
  if (page === 'groups') {
    content = <TeacherGroupsPage
      key={page}
      initialStripTab={selected.strip}
      onStripChange={(strip) => set({ strip, search: '', student: '', workRef: '' })}
      onOpenStudent={open}
      rosterTools={picker}
      hasUnsubmittedWork={data && !error ? student => !!entries.find(e => e.student.id === student.id)
        ?.works.some(w => !w.submitted && ['Не сдано', 'В процессе', 'Просрочено'].includes(w.status)) : undefined}
      rosterHomeworkScore={data && !error ? student => entries.find(e => e.student.id === student.id)?.stats.average ?? null : undefined}
    />
  }
  if (['gradebook', 'student'].includes(page)) {
    if (loading && !error && (!data || data.demo))
      content = <JournalSkeleton table={selected.tab !== 'Обзор'} />
    else if (error || !data || data.demo)
      content = (
        <div className="cj-empty" role="status">
          {error ?? 'Войдите в аккаунт преподавателя'}{' '}
          <button className="cj-button" onClick={reload}>
            Обновить
          </button>
        </div>
      )
    else if (page === 'student') {
      const entry = entries.find((e) => e.student.id === studentId)
      const back = () => {
        const navigation = useTeacher.getState()
        const previous = data.students.find((s) => s.id === selected.student)
        if (selected.strip === 'groups' && previous) navigation.setSelectedGroupId(previous.groupId || null)
        navigation.setActivePage(selected.origin)
      }
      content = entry ? (
        <StudentDashboardReport
          student={entry.student}
          group={data.groups.find(g => g.id === entry.student.groupId)}
          key={studentId}
          onBack={back}
          backLabel={selected.origin === 'groups' ? 'Назад к группам' : 'Назад в журнал'}
          workPanel={
            <><div className="jo-group-report"><StudentOverviewCard embedded student={entry.student} report={studentOverview(entry.works,today)}
              today={today} scopeLabel={scopeLabel} groupLabel={data.groups.find(g=>g.id===entry.student.groupId)?.name}/></div>
            <ProfileWorks
              collapsibleHistory
              list={entry.works}
              today={today}
              scope={picker}
              onReload={reload}
              refreshing={loading}
              onWork={(work) => {
                const membership = data.students.find(
                  (s) =>
                    sameLearner(s, entry.student) &&
                    (index?.roster.get(work.slot.course)?.has(s.id) ||
                      (!!work.slot.group && s.groupId === work.slot.group))
                )
                set({
                  student: membership?.id ?? entry.student.id,
                  workRef: work.slot.ref,
                  course: membership ? work.slot.course : ALL_COURSES,
                  module: '',
                  strip: 'students',
                  search: '',
                  tab: 'Работы',
                })
                useTeacher.getState().setActivePage('gradebook')
              }}
            /></>
          }
        />
      ) : (
        <div className="cj-empty">
          {loading ? 'Загрузка…' : 'Ученик не найден'}{' '}
          <button className="cj-button" onClick={back}>
            <ArrowLeft size={14} />
            Назад
          </button>
        </div>
      )
    } else
      content = (
        <TeacherGroupsPage
          key={page}
          initialStripTab={selected.strip}
          onStripChange={(strip) => set({ strip, search: '', student: '', workRef: '' })}
          onOpenStudent={open}
          hasUnsubmittedWork={(student) =>
            !!entries
              .find((e) => e.student.id === student.id)
              ?.works.some((w) => !w.submitted && ['Не сдано', 'В процессе', 'Просрочено'].includes(w.status))
          }
          rosterHomeworkScore={(student) => entries.find((e) => e.student.id === student.id)?.stats.average ?? null}
          availableGroupIds={page === 'gradebook' ? groupIds : undefined}
          renderRoster={
            page === 'gradebook'
              ? (groupId) => {
                  const visible = roster.filter(
                    (e) => groupId === null || (e.student.groupId === groupId && !!groupId)
                  )
                  const unique = visible.filter(
                    (entry, i) => visible.findIndex((e) => sameLearner(entry.student, e.student)) === i
                  )
                  return (
                    <Matrix
                      profileId={student => canonicalProfile(student).id}
                      pendingAttendance={pendingAttendance}
                      onOpenAttendance={setAttendanceCells}
                      onOpenWork={homework.openStudent}
                      onOpenAssignment={ref => homework.openAssignment(ref, unique.map(e => e.student.id))}
                      groups={data.groups}
                      scopeLabel={scopeLabel}
                      entries={unique}
                      slots={slots}
                      picker={picker}
                      selected={selected}
                      set={set}
                      today={today}
                      onReload={reload}
                      refreshing={loading}
                      renderReport={(student, workPanel) => {
                        const profile = canonicalProfile(student)
                        return <StudentDashboardReport key={profile.id} student={profile}
                          group={data.groups.find(g => g.id === profile.groupId)} inDrawer workPanel={workPanel} />
                      }}
                      position={position}
                      groupLabel={
                        groupId === null ? 'Все ученики' : data.groups.find((g) => g.id === groupId)?.name ?? 'Группы'
                      }
                    />
                  )
                }
              : undefined
          }
        />
      )
  }
  return (
    <TeacherGuides user={user} enabled={production && isDesktop && allowed && !getViewAs()}
      section={page === 'gradebook' ? (selected.tab === 'Работы' ? 'work' : 'journal') : pageGuides[page]}>
    <TeacherDashboardPage
      standContent={
        content && (
          <>
            {data?.warnings.map((w) => (
              <p key={w} role="status" className="cj-note">
                {w}
              </p>
            ))}
            {content}
          </>
        )
      }
    />{homework.dialog}{attendanceCells && <AttendanceEditor cells={attendanceCells} onSaved={reload} onClose={() => setAttendanceCells(null)} />}</TeacherGuides>
  )
}
