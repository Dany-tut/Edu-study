import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import TeacherDashboardPage from '../../../pages/teacher/TeacherDashboardPage'
import TeacherGroupsPage from '../../../pages/teacher/TeacherGroupsPage'
import TeacherStudentDashboardPage from '../../../pages/teacher/TeacherStudentDashboardPage'
import { useTeacher } from '../../../store/teacherStore'
import { useCourseJournal } from '../../../lib/useCourseJournal'
import { OUTSIDE_COURSES, type CourseJournalData } from '../../../lib/courseJournal'
import type { Student } from '../../../data/teacherMockData'
import { wallDateTimeInTz } from '../../../lib/teacherTz'
import TestlyMark from '../../TestlyMark'
import { ArrowLeft, BookOpen, ChevronRight, RefreshCw, Search, X } from '../../icons/appIcons'
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
import '../courseJournal.css'
import './journalStand.css'

type StandView = 'Обзор' | 'Посещаемость' | 'Работы' | 'Статистика'
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
      {work.score === null
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
      <label>
        <BookOpen size={15} />
        <select
          aria-label="Курс или интенсив"
          value={value.course}
          onChange={(e) => onChange({ course: e.target.value, module: '' })}
        >
          <option value={ALL_COURSES}>Все курсы и работы</option>
          {data.courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
          <option value={OUTSIDE_COURSES}>Вне курсов</option>
        </select>
      </label>
      {modules.length > 0 && (
        <label>
          <select
            aria-label="Модуль"
            value={value.module}
            onChange={(e) => onChange({ ...value, module: e.target.value })}
          >
            <option value="">Все модули</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
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
}: {
  list: StudentWork[]
  today: string
  scope: React.ReactNode
  onWork?: (work: StudentWork) => void
  onReload?: () => void
  refreshing?: boolean
}) {
  const stats = workStats(list, today)
  const history = list.filter((w) => w.slot.required || w.submitted || w.status !== 'Без ДЗ')
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
      <h3>
        История работ <small>· {history.length}</small>
      </h3>
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
    </section>
  )
}
type StudentEntry = { student: Student; works: StudentWork[]; stats: ReturnType<typeof workStats> }
interface MatrixProps {
  entries: StudentEntry[]
  slots: ReturnType<typeof scopeSlots>
  selected: StandSelection
  picker: React.ReactNode
  groupLabel: string
  set: (v: Partial<StandSelection>) => void
  open: (s: Student) => void
  position: React.MutableRefObject<{ top: number; left: number }>
}
export function Matrix({ entries, slots, selected, picker, groupLabel, set, open, position }: MatrixProps) {
  const frame = useRef<HTMLDivElement>(null)
  const detail = selected.workRef ?? ''
  const [attention, setAttention] = useState(false)
  const visible = entries.filter(
    (e) =>
      e.student.name.toLocaleLowerCase('ru').includes(selected.search.trim().toLocaleLowerCase('ru')) &&
      (!attention ||
        e.works.some((w) => ['Просрочено', 'На проверке', 'На доработке', 'Ниже порога'].includes(w.status)))
  )
  const entry = visible.find((e) => e.student.id === selected.student)
  const work = entry?.works.find((w) => w.slot.ref === detail)
  useLayoutEffect(() => {
    if (frame.current) {
      frame.current.scrollTop = position.current.top
      frame.current.scrollLeft = position.current.left
    }
  }, [position])
  useLayoutEffect(() => {
    const el = frame.current?.querySelector<HTMLElement>('[data-selected-work="true"]')
    if (el && frame.current) {
      const wrap = frame.current,
        box = wrap.getBoundingClientRect(),
        cell = el.getBoundingClientRect()
      const pin = wrap.querySelector('tbody th')?.getBoundingClientRect().width ?? 0
      const head = wrap.querySelector('thead')?.getBoundingClientRect().height ?? 0
      if (cell.right > box.right) wrap.scrollLeft += cell.right - box.right + 12
      else if (cell.left < box.left + pin) wrap.scrollLeft += cell.left - box.left - pin - 12
      if (cell.bottom > box.bottom) wrap.scrollTop += cell.bottom - box.bottom + 8
      else if (cell.top < box.top + head) wrap.scrollTop += cell.top - box.top - head - 8
    }
  }, [detail, selected.student, entries])
  const byStudent = useMemo(
    () => new Map(entries.map((e) => [e.student.id, new Map(e.works.map((w) => [w.slot.ref, w]))])),
    [entries]
  )
  const applicable = slots.filter((slot) => entries.some((e) => byStudent.get(e.student.id)?.has(slot.ref)))
  const isStats = selected.tab === 'Статистика'
  return (
    <section className="course-journal js-matrix" aria-label="Журнал успеваемости">
      <div className="js-roster-head">
        <strong>
          <i />
          {groupLabel}
        </strong>
        <small>{visible.length} учен.</small>
        {picker}
        <label className="js-search">
          <Search size={14} />
          <input
            aria-label="Поиск ученика"
            placeholder="Поиск ученика…"
            value={selected.search}
            onChange={(e) => set({ search: e.target.value })}
          />
        </label>
      </div>
      <div className="js-options">
        <div className="cj-tabs">
          {(['Обзор', 'Посещаемость', 'Работы', 'Статистика'] as const).map((tab) => (
            <button type="button" key={tab} aria-pressed={selected.tab === tab} onClick={() => set({ tab })}>
              {tab}
            </button>
          ))}
        </div>
        <button className="cj-button" aria-pressed={attention} onClick={() => setAttention((v) => !v)}>
          Требуют внимания
        </button>
      </div>
      <div
        className="js-matrix-scroll"
        ref={frame}
        onScroll={(e) => {
          position.current = { top: e.currentTarget.scrollTop, left: e.currentTarget.scrollLeft }
        }}
      >
        <table>
          <thead>
            <tr>
              <th scope="col">Ученик</th>
              {isStats
                ? [
                    'Средний результат',
                    'Зачтено / проверено',
                    'Недели со сдачами',
                    'Сданы повторно',
                    'Сданы в срок',
                  ].map((t) => (
                    <th scope="col" key={t}>
                      {t}
                    </th>
                  ))
                : applicable.map((col) => (
                    <th scope="col" key={col.ref}>
                      <small>{col.date || 'Без даты'}</small>
                      {col.title}
                    </th>
                  ))}
            </tr>
          </thead>
          <tbody>
            {visible.map(({ student, stats }) => (
              <tr key={student.id} className={entry?.student.id === student.id ? 'js-selected' : ''}>
                <th scope="row">
                  <button
                    type="button"
                    className="js-name"
                    onClick={() => {
                      set({ student: student.id, workRef: '' })
                    }}
                  >
                    <span className="cj-avatar">
                      {student.name
                        .split(' ')
                        .slice(0, 2)
                        .map((v) => v[0])
                        .join('')}
                    </span>
                    {student.name}
                  </button>
                </th>
                {isStats
                  ? [
                      stats.average === null ? '—' : stats.average + '%',
                      fraction(stats.passed, stats.graded),
                      fraction(stats.active, stats.weeks),
                      fraction(stats.resubmitted, stats.returned),
                      fraction(stats.timely, stats.due),
                    ].map((v, i) => <td key={i}>{v}</td>)
                  : applicable.map((col) => {
                      const w = byStudent.get(student.id)?.get(col.ref)
                      return (
                        <td key={col.ref}>
                          {w ? (
                            <button
                              data-selected-work={
                                (selected.student === student.id && detail === col.ref) || undefined
                              }
                              className="js-cell"
                              aria-label={student.name + ' · ' + col.title}
                              onClick={() => {
                                set({ student: student.id, workRef: col.ref })
                              }}
                            >
                              {selected.tab !== 'Работы' && (
                                <small>
                                  <Attendance work={w} />
                                </small>
                              )}
                              {selected.tab !== 'Посещаемость' && <Badge work={w} />}
                              {w.source.includes('Тестли') && selected.tab !== 'Посещаемость' && (
                                <Source value={w.source} />
                              )}
                            </button>
                          ) : (
                            '—'
                          )}
                        </td>
                      )
                    })}
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && (
          <p className="js-empty">
            {selected.search ? 'Никого не найдено' : 'В выбранном составе пока нет учеников.'}
          </p>
        )}
      </div>
      {entry && (
        <aside className="js-dock" aria-label="Статистика выбранного ученика">
          <div className="js-row">
            <strong>{entry.student.name}</strong>
            <button className="cj-button cj-primary" onClick={() => open(entry.student)}>
              Полная статистика <ChevronRight size={14} />
            </button>
            <button className="cj-icon-button" aria-label="Закрыть панель" onClick={() => set({ student: '' })}>
              <X size={14} />
            </button>
          </div>
          <Metrics stats={entry.stats} />
          {work && (
            <div className="js-facts">
              <strong>{work.slot.title}</strong>
              <Source value={work.source} />
              <Badge work={work} />
              {work.points.length > 0 && <span>Тестли · {work.points.join(', ')} б.</span>}
            </div>
          )}
        </aside>
      )}
    </section>
  )
}
export default function JournalStand({ owner }: { owner: string }) {
  const { data, loading, error, reload } = useCourseJournal(true)
  const page = useTeacher((s) => s.activePage),
    studentId = useTeacher((s) => s.selectedStudentId)
  const storageKey = 'iskra:journal-stand:' + owner
  const [selected, setSelected] = useState<StandSelection>(() => {
    try {
      return { ...initial, ...JSON.parse(sessionStorage.getItem(storageKey) || '{}') }
    } catch {
      return initial
    }
  })
  const position = useRef({ top: 0, left: 0 })
  const set = (v: Partial<StandSelection>) => setSelected((prev) => ({ ...prev, ...v }))
  useEffect(() => {
    const prior = document.title
    document.title = 'Искра · локальный стенд журнала'
    return () => {
      document.title = prior
    }
  }, [])
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(selected))
    } catch {
      /* optional */
    }
  }, [storageKey, selected])
  const index = useMemo(() => (data ? buildStandIndex(data) : null), [data])
  const course =
    data?.courses.some((c) => c.id === selected.course) || [ALL_COURSES, OUTSIDE_COURSES].includes(selected.course)
      ? selected.course
      : data?.courses.find((c) => index?.roster.get(c.id)?.size)?.id ?? ALL_COURSES
  const module = data?.modules.some((m) => m.id === selected.module && m.course_id === course) ? selected.module : ''
  const scope = { course, module }
  const slots = useMemo(() => (index ? scopeSlots(index, { course, module }) : []), [index, course, module])
  const today = wallDateTimeInTz(new Date().toISOString(), 'Europe/Moscow').day
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
  const open = (student: Student) => {
    set({ student: student.id, origin: page === 'groups' ? 'groups' : 'gradebook' })
    useTeacher.getState().openStudentDashboard(student.id, student.groupId)
  }
  const changeScope = (v: Scope) => {
    position.current = { top: 0, left: 0 }
    set({ ...v, search: '', workRef: '' })
  }
  const picker = data && <ScopePicker data={data} value={scope} onChange={changeScope} />
  let content: React.ReactNode
  if (['gradebook', 'groups', 'student'].includes(page)) {
    if (error || !data || data.demo)
      content = (
        <div className="cj-empty" role="status">
          {error ?? (loading ? 'Загрузка журнала…' : 'Войдите в аккаунт преподавателя')}{' '}
          <button className="cj-button" onClick={reload}>
            Обновить
          </button>
        </div>
      )
    else if (page === 'student') {
      const entry = entries.find((e) => e.student.id === studentId)
      const back = () => useTeacher.getState().setActivePage(selected.origin)
      content = entry ? (
        <TeacherStudentDashboardPage
          key={studentId}
          onBack={back}
          backLabel={selected.origin === 'groups' ? 'Назад к группам' : 'Назад в журнал'}
          workPanel={
            <ProfileWorks
              list={entry.works}
              today={today}
              scope={picker}
              onReload={reload}
              refreshing={loading}
              onWork={(work) => {
                set({
                  student: entry.student.id,
                  workRef: work.slot.ref,
                  course:
                    index?.roster.get(work.slot.course)?.has(entry.student.id) ||
                    work.slot.group === entry.student.groupId
                      ? work.slot.course
                      : ALL_COURSES,
                  module: '',
                  strip: 'students',
                  search: '',
                  tab: 'Обзор',
                })
                useTeacher.getState().setActivePage('gradebook')
              }}
            />
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
          onStripChange={(strip) => set({ strip, search: '' })}
          onOpenStudent={open}
          rosterTools={page === 'groups' ? picker : undefined}
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
                      entries={unique}
                      slots={slots}
                      picker={picker}
                      selected={selected}
                      set={set}
                      open={open}
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
    />
  )
}
