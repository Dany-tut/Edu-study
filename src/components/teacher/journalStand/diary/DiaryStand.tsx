import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  ArrowRight,
  ArrowUpDown,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Dumbbell,
  Home,
  LayoutGrid,
  List,
  Moon,
  Play,
  RotateCcw,
  Sparkles,
  Star,
  Sun,
  Video,
  X,
} from '../../../icons/appIcons'
import { TaskliIcon } from '../../../icons/TaskliIcon'
import { trackPalette, subjectTheme } from '../../../../lib/theme'
import { useTheme } from '../../../../store/themeStore'
import { useNow } from '../../../../lib/useNow'
import { wallDateTimeInTz } from '../../../../lib/teacherTz'
import Modal from '../../../Modal'
import {
  diaryCourses,
  diaryWorks,
  diaryStatusText,
  diaryPriority,
  diaryDate,
  isDiaryAction,
  isDiaryOverdue,
  type DiaryWork,
  type DiaryCourseId,
} from './diaryExample'
import './diaryStand.css'

type Design = 'focus' | 'feed' | 'courses'
type Tab = 'today' | 'work' | 'courses'
type Sort = 'priority' | 'due' | 'number' | 'subject' | 'course'
type Grouping = 'none' | 'subject' | 'course'
const names: Record<Design, string> = { focus: 'Фокус', feed: 'Лента', courses: 'По курсам' }
const courseFor = (work: DiaryWork) => diaryCourses.find((course) => course.id === work.course)!
const shortDate = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const compareText = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' }).compare
const tones = (work: DiaryWork): CSSProperties => {
  const palette = trackPalette(work.status)
  return {
    '--ds-tone': palette.text,
    '--ds-tone-bg': palette.bg,
    '--ds-tone-line': palette.border,
  } as CSSProperties
}
function StatusIcon({ work, size = 16 }: { work: DiaryWork; size?: number }) {
  const name =
    work.status === 'returned'
      ? 'returned'
      : work.status === 'submitted'
        ? 'reviewStatus'
        : work.status === 'test_low'
          ? 'attention'
          : work.status === 'test_passed'
            ? 'done'
            : work.status === 'unviewed'
              ? 'recording'
              : 'courses'
  return <TaskliIcon name={name} size={size} style={{ color: 'var(--ds-tone)' }} />
}
function Status({ work }: { work: DiaryWork }) {
  return (
    <span className="ds-badge" style={tones(work)}>
      <StatusIcon work={work} />
      {diaryStatusText(work)}
      {work.score != null ? ` · ${work.score}%` : ''}
    </span>
  )
}
function CourseLabel({ work }: { work: DiaryWork }) {
  const course = courseFor(work)
  const dark = useTheme((s) => s.dark)
  return (
    <span
      className="ds-course-label"
      style={{ '--ds-course': subjectTheme(course.subject, dark).accent } as CSSProperties}
    >
      <i />
      {course.subject}
      <span>·</span>
      {course.title}
    </span>
  )
}
function Due({ work, today }: { work: DiaryWork; today: string }) {
  return (
    <span className={isDiaryOverdue(work) ? 'ds-due ds-overdue' : 'ds-due'}>
      {isDiaryOverdue(work) ? <Clock size={13} /> : null}
      {work.dueOffset === null
        ? 'Без срока'
        : isDiaryOverdue(work)
          ? `Просрочено · ${shortDate.format(diaryDate(today, work.dueOffset))}`
          : work.dueOffset === 0
            ? 'До сегодня, 23:59'
            : `До ${shortDate.format(diaryDate(today, work.dueOffset))}`}
    </span>
  )
}
function WorkRow({
  work,
  today,
  onOpen,
}: {
  work: DiaryWork
  today: string
  onOpen: (work: DiaryWork) => void
}) {
  return (
    <button type="button" className="ds-work-row" onClick={() => onOpen(work)}>
      <span className="ds-work-number" style={tones(work)}>
        {work.number}
      </span>
      <span className="ds-work-copy">
        <CourseLabel work={work} />
        <strong>{work.title}</strong>
        <span className="ds-work-meta">
          <Status work={work} />
          <Due work={work} today={today} />
        </span>
      </span>
      <ChevronRight className="ds-chevron" size={18} />
    </button>
  )
}
function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="ds-empty">
      <Check size={24} />
      <p>{children}</p>
    </div>
  )
}
function Progress({ value, label, accent }: { value: number; label: string; accent: string }) {
  return (
    <div
      className="ds-progress"
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${value}%`, background: accent }} />
    </div>
  )
}

export default function DiaryStand() {
  const dark = useTheme((s) => s.dark)
  const toggleTheme = useTheme((s) => s.toggle)
  const [sample, setSample] = useState('full')
  const [design, setDesign] = useState<Design>('focus')
  const [tab, setTab] = useState<Tab>('today')
  const [subject, setSubject] = useState('*')
  const [course, setCourse] = useState('*')
  const [status, setStatus] = useState('action')
  const [sort, setSort] = useState<Sort>('priority')
  const [group, setGroup] = useState<Grouping>('none')
  const [descending, setDescending] = useState(false)
  const [selected, setSelected] = useState<DiaryWork | null>(null)
  const [detailTab, setDetailTab] = useState<'work' | 'lesson'>('work')
  const [reminders, setReminders] = useState<Record<string, string>>({})
  const [reminder, setReminder] = useState<DiaryWork | null>(null)
  const [time, setTime] = useState('18:00')
  const [notice, setNotice] = useState('')
  const [weekDay, setWeekDay] = useState(0)
  const trigger = useRef<HTMLElement | null>(null)
  const dialogBody = useRef<HTMLDivElement>(null)
  const now = useNow(60_000)
  const today = wallDateTimeInTz(now.toISOString(), 'Asia/Bangkok').day
  const dateLabel = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    timeZone: 'UTC',
  }).format(diaryDate(today, 0))
  const personal = diaryWorks.filter((work) => work.student === 'Артём Волков')
  const pool = personal
  const all = sample === 'empty' || sample === 'course-only' ? []
    : sample === 'one' ? pool.filter(w => w.course === 'chem').slice(0, 1)
    : sample === 'two' ? pool.filter(w => w.course === 'chem').slice(0, 2) : pool
  const availableCourses = sample === 'empty' ? []
    : ['course-only', 'one', 'two'].includes(sample) ? diaryCourses.filter(c => c.id === 'chem') : diaryCourses
  const visibleCourses = availableCourses.filter(c => (subject === '*' || c.subject === subject) && (course === '*' || c.id === course))
  const scope = all.filter(
    (work) =>
      (subject === '*' || courseFor(work).subject === subject) &&
      (course === '*' || work.course === course),
  )
  const actions = scope
    .filter(isDiaryAction)
    .sort((a, b) => diaryPriority(a) - diaryPriority(b) || a.id.localeCompare(b.id))
  const pending = scope.filter((work) => work.status === 'submitted')
  const first = actions[0]
  const selectedCourse = course === '*' ? null : diaryCourses.find((c) => c.id === course)
  const dueLabel = (work: DiaryWork) =>
    work.dueOffset === null ? 'Без срока' : shortDate.format(diaryDate(today, work.dueOffset))

  // The portal uses the existing app modal; keep keyboard focus inside it and restore its trigger.
  useEffect(() => {
    if (!selected && !reminder) return
    const node = dialogBody.current?.closest<HTMLElement>('[role="dialog"]')
    if (!node) return
    node.setAttribute('aria-label', reminder ? 'Напоминание в примере' : selected!.title)
    const controls = () =>
      [...node.querySelectorAll<HTMLElement>('button, input, select, a[href]')].filter(
        (el) => el.getClientRects().length && !el.hasAttribute('disabled'),
      )
    controls()[0]?.focus()
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const list = controls(),
        first = list[0],
        last = list[list.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    node.addEventListener('keydown', trap)
    return () => {
      node.removeEventListener('keydown', trap)
      trigger.current?.focus()
    }
  }, [selected, reminder])
  function open(work: DiaryWork) {
    trigger.current = document.activeElement as HTMLElement
    setDetailTab('work')
    setSelected(work)
  }
  function remind(work: DiaryWork) {
    trigger.current = document.activeElement as HTMLElement
    setTime(reminders[work.id] ?? '18:00')
    setReminder(work)
  }
  function chooseSubject(value: string) {
    setSubject(value)
    setCourse('*')
  }
  function selectCourse(value: DiaryCourseId) {
    setCourse(value)
    setSubject(diaryCourses.find((c) => c.id === value)!.subject)
    setTab('courses')
  }
  function renderCourseCard(id: DiaryCourseId, full = false) {
    const item = diaryCourses.find((c) => c.id === id)!
    const palette = subjectTheme(item.subject, dark)
    const works = scope.filter((work) => work.course === id)
    return (
      <section
        key={id}
        className={'ds-course-card' + (full ? ' ds-course-full' : '')}
        style={{ '--ds-course': palette.accent, '--ds-course-soft': palette.soft } as CSSProperties}
      >
        <div className="ds-course-top">
          <span className="ds-subject-mark">
            <TaskliIcon name="courses" size={21} style={{ color: palette.accent }} />
          </span>
          <span>
            <small>
              {item.subject} · {item.kind}
            </small>
            <h3>{item.title}</h3>
          </span>
          <button
            type="button"
            className="ds-round"
            aria-label={`Открыть курс ${item.title}`}
            onClick={() => selectCourse(id)}
          >
            <ChevronRight size={17} />
          </button>
        </div>
        {id !== 'outside' ? (
          <>
            <Progress value={item.progress} label={`Прогресс курса ${item.title}`} accent={palette.accent} />
            <p className="ds-course-progress">
              {item.progress}% пройдено<span>{works.filter(isDiaryAction).length} ДЗ к выполнению</span>
            </p>
          </>
        ) : (
          <p className="ds-course-progress">Назначения преподавателя</p>
        )}
        {full ? (
          <>
            <div className="ds-course-track" aria-label={`Трек курса ${item.title}`}>
              {works
                .sort((a, b) => a.number - b.number)
                .map((work) => (
                  <button data-hover="layer"
                    type="button"
                    key={work.id}
                    className="ds-track-step"
                    style={tones(work)}
                    onClick={() => open(work)}
                    aria-label={`ДЗ №${work.number}: ${diaryStatusText(work)}`}
                  >
                    <span>{work.status === 'test_passed' ? <Check size={17} /> : work.number}</span>
                    <small>ДЗ {work.number}</small>
                  </button>
                ))}
            </div>
            <div className="ds-course-work">
              {works
                .filter(isDiaryAction)
                .slice(0, 3)
                .map((work) => (
                  <WorkRow key={work.id} work={work} today={today} onOpen={open} />
                ))}
            </div>
          </>
        ) : null}
      </section>
    )
  }
  function renderRecommendation() {
    const work = scope.find((w) => w.status === 'test_low')
    if (!work) return null
    return (
      <section className="ds-recommend">
        <span className="ds-recommend-icon">
          <Sparkles size={20} />
        </span>
        <div>
          <small>Стоит повторить</small>
          <h3>{work.title}</h3>
          <p>
            {work.score}% в ДЗ №{work.number}, порог — 70%. Начни с двух заданий с ошибками.
          </p>
          <button data-hover="layer" type="button" className="ds-text-action" onClick={() => open(work)}>
            Разобрать ошибки <ArrowRight size={15} />
          </button>
        </div>
      </section>
    )
  }
  function renderUpcoming() {
    if (!visibleCourses.some(c => c.id === 'chem') || subject === 'Биология' || (course !== '*' && course !== 'chem')) return null
    return (
      <section className="ds-upcoming">
        <div className="ds-section-head">
          <h2>Ближайший урок</h2>
          <span className="ds-live-dot" />
        </div>
        <div className="ds-upcoming-time">
          14:00 <small>· сегодня</small>
        </div>
        <CourseLabel work={personal[1]} />
        <h3>Окислительно-восстановительные реакции</h3>
        <div className="ds-upcoming-bottom">
          <span>
            <Video size={15} />
            Онлайн · 60 минут
          </span>
          <button
            className="ds-round"
            type="button"
            aria-label="Открыть ближайший урок"
            onClick={() => {
              open(personal[1])
              setDetailTab('lesson')
            }}
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </section>
    )
  }
  function renderReminderNote() {
    const work = scope.find((w) => w.dueOffset === 0 && isDiaryAction(w))
    if (!work) return null
    return (
      <div className="ds-reminder-note">
        <Bell size={17} />
        <span>
          ДЗ №{work.number} · срок сегодня
          <small>
            {reminders[work.id]
              ? `В примере: напомнить в ${reminders[work.id]}`
              : 'Можно поставить личное напоминание'}
          </small>
        </span>
        <button
          type="button"
          className="ds-round"
          aria-label="Настроить напоминание"
          onClick={() => remind(work)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    )
  }
  function renderPriorityCard() {
    if (!first)
      return (
        <section className="ds-priority">
          <Empty>{!scope.length ? 'Пока нет домашних заданий' : 'Все дела выполнены. Можно выдохнуть.'}</Empty>
        </section>
      )
    return (
      <section className="ds-priority" style={tones(first)}>
        <div className="ds-priority-top">
          <span>
            <span className="ds-tiny-dot" />
            Сначала это
          </span>
          <Due work={first} today={today} />
        </div>
        <div className="ds-priority-body">
          <div className="ds-priority-number">
            <span>ДЗ</span>
            {first.number}
            <StatusIcon work={first} size={25} />
          </div>
          <div>
            <CourseLabel work={first} />
            <h2>{first.title}</h2>
            <p>{first.comment ?? 'Продолжи с того места, где остановился.'}</p>
            <Status work={first} />
          </div>
        </div>
        <div className="ds-priority-footer">
          <button type="button" className="ds-primary" onClick={() => open(first)}>
            {first.status === 'returned' ? 'Исправить работу' : 'Открыть задание'}
            <ArrowRight size={17} />
          </button>
          <button
            type="button"
            className="ds-round"
            aria-label="Напомнить об этой работе"
            onClick={() => remind(first)}
          >
            <Bell size={18} />
          </button>
        </div>
      </section>
    )
  }
  function renderFocus() {
    return (
      <>
        <div className="ds-focus-grid">
          <main>
            {renderPriorityCard()}
            {actions.length > 1 && <section className="ds-section ds-rest">
              <div className="ds-section-head">
                <h2>Дальше по плану</h2>
                <span>{Math.max(0, actions.length - 1)} ДЗ</span>
              </div>
              {actions.slice(1).map((work) => (
                <WorkRow key={work.id} work={work} today={today} onOpen={open} />
              ))}
            </section>}
          </main>
          <aside>
            {renderUpcoming()}
            {renderRecommendation()}
            {renderReminderNote()}
          </aside>
        </div>
        <div className="ds-section-head ds-bottom-heading">
          <h2>Продолжить курс</h2>
          <button data-hover="layer" type="button" className="ds-text-action" onClick={() => setTab('courses')}>
            Все курсы <ArrowRight size={15} />
          </button>
        </div>
        <div className="ds-course-shelf">
          {visibleCourses.map(c => renderCourseCard(c.id))}
          {!visibleCourses.length && <Empty>Курсы ещё не добавлены</Empty>}
        </div>
        {pending.length ? (
          <button data-hover="row"
            type="button"
            className="ds-pending-strip"
            onClick={() => {
              setTab('work')
              setStatus('pending')
            }}
          >
            <Clock size={17} />
            <span>
              {pending.length} ДЗ на проверке<span>Можно продолжать учиться</span>
            </span>
            <ChevronRight size={17} />
          </button>
        ) : null}
      </>
    )
  }
  function renderFeed() {
    const dayActions = weekDay === 0 ? actions : actions.filter((w) => w.dueOffset === weekDay)
    return (
      <div className="ds-feed-grid">
        <aside className="ds-week-aside">
          <div className="ds-section-head">
            <h2>Эта неделя</h2>
            <CalendarDays size={18} />
          </div>
          <div className="ds-week-picker">
            {Array.from({ length: 7 }, (_, i) => {
              const d = diaryDate(today, i)
              return (
                <button data-hover="layer" type="button" key={i} aria-pressed={weekDay === i} onClick={() => setWeekDay(i)}>
                  <span>
                    {new Intl.DateTimeFormat('ru-RU', { weekday: 'short', timeZone: 'UTC' }).format(d)}
                  </span>
                  <strong>{d.getUTCDate()}</strong>
                  <i
                    className={scope.some((w) => w.dueOffset === i && isDiaryAction(w)) ? 'ds-has-work' : ''}
                  />
                </button>
              )
            })}
          </div>
          <p className="ds-week-summary">
            {weekDay === 0 ? 'Сегодня' : 'В этот день'} · {dayActions.length} ДЗ
          </p>
          {renderReminderNote()}
          {renderRecommendation()}
        </aside>
        <main className="ds-timeline">
          <div className="ds-timeline-heading">
            <span>{shortDate.format(diaryDate(today, weekDay))}</span>
            <h2>{weekDay === 0 ? 'Твой день' : 'План дня'}</h2>
          </div>
          {weekDay === 0 && first ? (
            <div className="ds-time-event">
              <span className="ds-time-pin ds-time-alert">
                <RotateCcw size={16} />
              </span>
              <div className="ds-time-label">Сначала · доработать</div>
              {renderPriorityCard()}
            </div>
          ) : null}
          {weekDay === 0 && subject !== 'Биология' && (course === '*' || course === 'chem') ? (
            <div className="ds-time-event">
              <span className="ds-time-pin">
                <Play size={16} />
              </span>
              <div className="ds-time-label">14:00 · занятие</div>
              {renderUpcoming()}
            </div>
          ) : null}
          <div className="ds-time-event">
            <span className="ds-time-pin">
              <BookOpen size={16} />
            </span>
            <div className="ds-time-label">В удобное время</div>
            <section className="ds-section">
              {dayActions
                .filter((w) => weekDay !== 0 || w.id !== first?.id)
                .map((work) => (
                  <WorkRow key={work.id} work={work} today={today} onOpen={open} />
                ))}
              {!dayActions.filter((w) => weekDay !== 0 || w.id !== first?.id).length ? (
                <Empty>На этот день заданий нет</Empty>
              ) : null}
            </section>
          </div>
          {weekDay === 0 ? (
            <div className="ds-time-event">
              <span className="ds-time-pin">
                <Clock size={16} />
              </span>
              <div className="ds-time-label">На проверке · {pending.length}</div>
              <section className="ds-section">
                {pending.map((work) => (
                  <WorkRow key={work.id} work={work} today={today} onOpen={open} />
                ))}
              </section>
            </div>
          ) : null}
        </main>
      </div>
    )
  }
  function renderCourses(overview = false) {
    return (
      <>
        {overview && first ? (
          <div className="ds-attention-strip">
            <RotateCcw size={18} />
            <div>
              <strong>Есть работа, к которой стоит вернуться</strong>
              <span>
                {courseFor(first).title} · ДЗ №{first.number} · {diaryStatusText(first).toLowerCase()}
              </span>
            </div>
            <button type="button" className="ds-secondary" onClick={() => open(first)}>
              Открыть <ArrowRight size={15} />
            </button>
          </div>
        ) : null}
        <div className="ds-course-board">{visibleCourses.map(c => renderCourseCard(c.id, true))}{!visibleCourses.length && <Empty>Курсы ещё не добавлены</Empty>}</div>
        {overview ? renderRecommendation() : null}
      </>
    )
  }
  function renderWorkList() {
    const list = scope.filter(
      (work) =>
        status === 'all' ||
        (status === 'action' && isDiaryAction(work)) ||
        (status === 'pending' && work.status === 'submitted') ||
        (status === 'passed' && work.status === 'test_passed'),
    )
    function grouping(work: DiaryWork, kind: Grouping) {
      return kind === 'subject' ? courseFor(work).subject : kind === 'course' ? courseFor(work).title : ''
    }
    function compare(a: DiaryWork, b: DiaryWork) {
      if (sort === 'number') return a.number - b.number
      if (sort === 'subject') return compareText(courseFor(a).subject, courseFor(b).subject)
      if (sort === 'course') return compareText(courseFor(a).title, courseFor(b).title)
      return sort === 'due' ? (a.dueOffset ?? 0) - (b.dueOffset ?? 0) : diaryPriority(a) - diaryPriority(b)
    }
    list.sort(
      (a, b) =>
        compareText(grouping(a, group), grouping(b, group)) ||
        (sort === 'due' && (a.dueOffset === null) !== (b.dueOffset === null)
          ? a.dueOffset === null
            ? 1
            : -1
          : (descending ? -1 : 1) * compare(a, b)) ||
        compareText(a.course, b.course) ||
        a.number - b.number ||
        compareText(a.id, b.id),
    )
    return (
      <>
        <div className="ds-work-toolbar">
          <label>
            Состояние
            <select aria-label="Состояние" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="action">Нужно сделать</option>
              <option value="all">Все задания</option>
              <option value="pending">На проверке</option>
              <option value="passed">Зачтено</option>
            </select>
          </label>
          <label>
            Сортировка
            <select aria-label="Сортировка" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="priority">Сначала важное</option>
              <option value="due">По сроку</option>
              <option value="subject">По предмету</option>
              <option value="course">По курсу / интенсиву</option>
              <option value="number">По номеру ДЗ</option>

            </select>
          </label>
          <label>
            Группировать
            <select
              aria-label="Группировать"
              value={group}
              onChange={(e) => setGroup(e.target.value as Grouping)}
            >
              <option value="none">Без группировки</option>
              <option value="subject">По предмету</option>
              <option value="course">По курсу</option>
            </select>
          </label>
          <button data-hover="layer"
            type="button"
            className="ds-sort-direction"
            aria-label={descending ? 'Изменить порядок на возрастание' : 'Изменить порядок на убывание'}
            aria-pressed={descending}
            onClick={() => setDescending(!descending)}
          >
            <ArrowUpDown size={16} />
            {descending ? 'По убыванию' : 'По возрастанию'}
          </button>
        </div>
        <section className="ds-section ds-all-work">
          <div className="ds-section-head">
            <h2>Все домашние задания</h2>
            <span>{list.length} ДЗ</span>
          </div>
          {list.map((work, i) => (
            <div key={work.id}>
              {group !== 'none' && (i === 0 || grouping(work, group) !== grouping(list[i - 1], group)) ? (
                <h3 className="ds-group-heading">{grouping(work, group)}</h3>
              ) : null}
              <WorkRow work={work} today={today} onOpen={open} />
            </div>
          ))}
          {!list.length ? <Empty>По этим фильтрам работ нет</Empty> : null}
        </section>
      </>
    )
  }
  return (
    <section className="diary-stand" aria-label="Стенд дневника Искры">
      <div className="ds-design-toolbar">
        <span>Дневник · редизайн</span>
        <div className="ds-design-options" aria-label="Вариант дизайна">
          {(Object.keys(names) as Design[]).map((id) => (
            <button data-hover="layer"
              type="button"
              key={id}
              aria-pressed={design === id}
              onClick={() => {
                setDesign(id)
                setTab('today')
              }}
            >
              {id === 'focus' ? (
                <LayoutGrid size={14} />
              ) : id === 'feed' ? (
                <List size={14} />
              ) : (
                <BookOpen size={14} />
              )}
              {names[id]}
            </button>
          ))}
        </div>
        <label className="ds-role">
          <span>Данные</span>
          <select aria-label="Объём данных в примере" value={sample} onChange={e => {
            setSample(e.target.value); setSubject('*'); setCourse('*'); setSelected(null); setReminder(null)
          }}>
            <option value="full">Полный пример</option><option value="empty">Нет курсов</option>
            <option value="course-only">Курс без ДЗ</option><option value="one">Одно ДЗ</option><option value="two">Два ДЗ</option>
          </select>
        </label>
        <button
          type="button"
          className="ds-round"
          aria-label={dark ? 'Включить светлую тему' : 'Включить тёмную тему'}
          onClick={toggleTheme}
        >
          {dark ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
      <div className={'ds-app ds-design-' + design}>
        <header className="ds-app-chrome">
          <span className="ds-wordmark">
            <span>И</span>Искра
          </span>
          <nav className="ds-dock" aria-label="Навигация ученика">
            <span className="ds-dock-star">
              <Star size={19} />
            </span>
            <span>
              <Home size={20} />
            </span>
            <button data-hover="layer" type="button" aria-current="page" onClick={() => setTab('today')}>
              <TaskliIcon name="courses" size={23} style={{ color: 'inherit' }} />
              <span>Дневник</span>
            </button>
            <span>
              <Dumbbell size={20} />
            </span>
            <button data-hover="layer"
              type="button"
              className="ds-nav-bell"
              aria-label="Открыть напоминания"
              onClick={() => {
                const work = scope.find(isDiaryAction)
                if (work) remind(work)
              }}
            >
              <Bell size={20} />
              {Object.keys(reminders).length ? <i /> : null}
            </button>
          </nav>
          <span className="ds-person">
            <span>АВ</span>
            Артём
          </span>
        </header>
        <div className="ds-page-heading">
          <p>
            {dateLabel}
          </p>
        </div>
        <div className="ds-tabs" aria-label="Представление дневника">
          {(
            [
              ['today', 'Сегодня'],
              ['work', 'Задания'],
              ['courses', 'Курсы'],
            ] as const
          ).map(([id, label]) => (
            <button data-hover="layer" type="button" key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>
              {label}
              {id === 'work' && actions.length ? <span>{actions.length}</span> : null}
            </button>
          ))}
        </div>
        <div className="ds-scope">
          <label>
            <span className="ds-field-label">Предмет</span>
            <select
              aria-label="Предмет дневника"
              value={subject}
              onChange={(e) => chooseSubject(e.target.value)}
            >
              <option value="*">Все предметы</option>
              {[...new Set(availableCourses.map(c => c.subject))].map(name => <option key={name}>{name}</option>)}
            </select>
          </label>
          <label>
            <span className="ds-field-label">Курс / интенсив</span>
            <select aria-label="Курс дневника" value={course} onChange={(e) => setCourse(e.target.value)}>
              <option value="*">Все курсы и интенсивы</option>
              {availableCourses
                .filter((c) => subject === '*' || c.subject === subject)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                    {c.id !== 'outside' ? ` · ${c.kind.toLowerCase()}` : ''}
                  </option>
                ))}
            </select>
          </label>
          <span className="ds-scope-summary">
            {selectedCourse ? selectedCourse.title : `${scope.filter(isDiaryAction).length} ДЗ к выполнению`}
          </span>
        </div>
        {tab === 'work'
          ? renderWorkList()
          : tab === 'courses'
            ? renderCourses()
            : design === 'focus'
              ? renderFocus()
              : design === 'feed'
                ? renderFeed()
                : renderCourses(true)}
        <p className="ds-demo-note">
          Учебный пример · работы и напоминания сохраняются только до обновления страницы
        </p>
        <div className="ds-notice" role="status">
          {notice}
        </div>
      </div>
      {selected ? (
        <Modal
          title={`${detailTab === 'lesson' ? 'Урок' : 'ДЗ'} №${selected.number}`}
          subtitle={courseFor(selected).title}
          width={640}
          onClose={() => setSelected(null)}
        >
          <div ref={dialogBody} className="diary-stand ds-dialog">
            <CourseLabel work={selected} />
            <h2>{selected.title}</h2>
            <div className="ds-dialog-meta">
              <Status work={selected} />
              <Due work={selected} today={today} />
            </div>
            <div className="ds-dialog-tabs">
              <button data-hover="layer" type="button" aria-pressed={detailTab === 'work'} onClick={() => setDetailTab('work')}>
                Задание
              </button>
              <button data-hover="layer"
                type="button"
                aria-pressed={detailTab === 'lesson'}
                onClick={() => setDetailTab('lesson')}
              >
                Урок и трек
              </button>
            </div>
            {detailTab === 'work' ? (
              <>
                <section className="ds-detail-section">
                  <h3>
                    {selected.comment
                      ? 'Комментарий преподавателя'
                      : selected.status === 'submitted'
                        ? 'Работа отправлена'
                        : selected.score != null
                          ? 'Результат работы'
                          : 'Что сделать'}
                  </h3>
                  <p>
                    {selected.comment ??
                      (selected.status === 'submitted'
                        ? 'Ответы на проверке. Действий от ученика пока не требуется.'
                        : selected.score != null
                          ? `${selected.score}% · порог 70%. ${selected.score < 70 ? 'Есть два задания с ошибками.' : 'Работа зачтена.'}`
                          : 'Решить задания урока и отправить ответы преподавателю.')}
                  </p>
                </section>
                <section className="ds-detail-section">
                  <h3>Пример задания</h3>
                  <p>
                    {selected.course === 'bio'
                      ? 'Сравни функции митохондрий и хлоропластов. Объясни, какие процессы обеспечивают клетку энергией.'
                      : 'Расставь коэффициенты в уравнении реакции и объясни свой выбор.'}
                  </p>
                  {selected.course !== 'bio' ? (
                    <div className="ds-equation">Fe₂O₃ + CO → Fe + CO₂</div>
                  ) : null}
                </section>
                <button type="button" className="ds-secondary" onClick={() => setDetailTab('lesson')}>
                  К материалам урока <ArrowRight size={16} />
                </button>
              </>
            ) : (
              <>
                <section className="ds-detail-section">
                  <h3>На треке курса</h3>
                  <div className="ds-course-track">
                    {diaryWorks
                      .filter((w) => w.course === selected.course && w.student === selected.student)
                      .sort((a, b) => a.number - b.number)
                      .map((work) => (
                        <button data-hover="layer"
                          type="button"
                          key={work.id}
                          className="ds-track-step"
                          style={tones(work)}
                          aria-pressed={work.id === selected.id}
                          onClick={() => setSelected(work)}
                          aria-label={`Открыть урок №${work.number}: ${diaryStatusText(work)}`}
                        >
                          <span>{work.status === 'test_passed' ? <Check size={16} /> : work.number}</span>
                          <small>Урок {work.number}</small>
                        </button>
                      ))}
                  </div>
                </section>
                <section className="ds-detail-section">
                  <h3>Материалы</h3>
                  <p>Конспект урока · задания для самостоятельной работы</p>
                  <p>
                    Запись занятия и домашняя работа относятся к одному уроку. Результат ДЗ показан тем же
                    цветом на карточке и на треке.
                  </p>
                </section>
              </>
            )}
            <footer className="ds-dialog-footer">
              <span>Срок: {dueLabel(selected)}</span>
              <button
                type="button"
                className="ds-secondary"
                onClick={() => {
                  const work = selected
                  setSelected(null)
                  setReminder(work)
                }}
              >
                <Bell size={15} />
                Напоминание
              </button>
            </footer>
          </div>
        </Modal>
      ) : null}
      {reminder ? (
        <Modal
          title="Напомнить о задании"
          subtitle={`ДЗ №${reminder.number} · ${reminder.title}`}
          width={420}
          onClose={() => setReminder(null)}
        >
          <div ref={dialogBody} className="diary-stand ds-dialog">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                setReminders((previous) => ({ ...previous, [reminder.id]: time }))
                setNotice(`В примере: напоминание о ДЗ №${reminder.number} сегодня в ${time}`)
                setReminder(null)
              }}
            >
              <label className="ds-reminder-field">
                Сегодня, время
                <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
              </label>
              <p className="ds-demo-note">
                В стенде напоминание демонстрационное, уведомление не отправляется.
              </p>
              <button className="ds-primary" type="submit">
                Сохранить в примере <Check size={16} />
              </button>
            </form>
          </div>
        </Modal>
      ) : null}
    </section>
  )
}
