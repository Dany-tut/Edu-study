import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  ArrowRight,
  ArrowUpDown,
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  Clock,
  RefreshCw,
  Sparkles,
  Video,
  X,
} from '../components/icons/appIcons'
import { TaskliIcon, type TaskliIconName } from '../components/icons/TaskliIcon'
import Modal from '../components/Modal'
import CoursesPage from './CoursesPage'
import { useStudentData } from '../store/studentDataStore'
import { useDashboard } from '../store/dashboardStore'
import { useTheme } from '../store/themeStore'
import { HW_SUBJECT_ID } from '../lib/standaloneHomework'
import { useStudentDiaryMetadata } from '../lib/useStudentDiary'
import {
  buildStudentDiary,
  diaryNeedsAction,
  diaryOverdue,
  diaryWorkLabel,
  diaryStatusText,
  sortStudentDiary,
  type StudentDiaryEntry,
} from '../lib/studentDiary'
import { diaryUpcomingDays, groupDiaryTimeline } from '../lib/studentDiaryViews'
import { useDiaryReminders } from '../lib/diaryReminders'
import { gradedTrackResult } from '../lib/homeworkResult'
import { getTrackLessonStatus } from '../lib/lessonStatus'
import { trackPalette, subjectTheme } from '../lib/theme'
import { getStudentScheduleState } from '../lib/lessonStatus'
import { resolveScheduleLesson } from '../lib/db'
import { getStudentSession } from '../lib/studentSession'
import { useNow } from '../lib/useNow'
import { useStudentTz } from '../lib/studentTz'
import { convertWallTime, wallDateTimeInTz } from '../lib/teacherTz'
import { useT, useLang } from '../lib/i18n'
import '../components/diary/studentDiary.css'

export type DiaryTab = 'today' | 'work' | 'courses' | 'lessons'
const tone = (status: StudentDiaryEntry['status']) => {
  const p = trackPalette(status)
  return { '--ds-tone': p.text, '--ds-tone-bg': p.bg, '--ds-tone-line': p.border } as CSSProperties
}
function EntryStatus({ entry }: { entry: StudentDiaryEntry }) {
  const t = useT()
  const name: TaskliIconName =
    entry.status === 'returned'
      ? 'returned'
      : entry.status === 'test_low'
        ? 'attention'
        : entry.status === 'submitted' || entry.status === 'submitted_unknown'
          ? 'reviewStatus'
          : entry.status === 'test_passed' || entry.status === 'completed'
            ? 'done'
            : entry.status === 'unviewed'
              ? 'recording'
              : 'courses'
  return (
    <span className="ds-badge" style={tone(entry.status)}>
      <TaskliIcon name={name} size={15} style={{ color: 'var(--ds-tone)' }} />
      {t(diaryStatusText(entry))}
      {entry.lesson.result?.percent != null && entry.status !== 'submitted'
        ? ` · ${entry.lesson.result.percent}%`
        : ''}
    </span>
  )
}
function CourseLabel({ entry }: { entry: StudentDiaryEntry }) {
  const dark = useTheme((s) => s.dark)
  return (
    <span
      className="ds-course-label"
      style={{ '--ds-course': subjectTheme(entry.course.subject, dark).accent } as CSSProperties}
    >
      <i />
      {entry.course.id !== HW_SUBJECT_ID &&
      entry.course.subject &&
      entry.course.subject !== entry.course.name ? (
        <>
          {entry.course.subject}
          <span>·</span>
        </>
      ) : null}
      {entry.course.name}
    </span>
  )
}
function Due({ entry, today }: { entry: StudentDiaryEntry; today: string }) {
  const t = useT(),
    lang = useLang((s) => s.lang)
  const date = entry.due
    ? new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'ru-RU', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      }).format(new Date(entry.due + 'T12:00:00Z'))
    : null
  const overdue = diaryOverdue(entry, today)
  return (
    <span className={'ds-due' + (overdue ? ' ds-overdue' : '')}>
      {overdue ? <Clock size={13} /> : null}
      {!date
        ? t('Без срока')
        : overdue
          ? `${t('Просрочено')} · ${date}`
          : entry.due === today
            ? t('До сегодня, 23:59')
            : `${t('До')} ${date}`}
    </span>
  )
}
function Row({
  entry,
  today,
  onOpen,
}: {
  entry: StudentDiaryEntry
  today: string
  onOpen: (entry: StudentDiaryEntry) => void
}) {
  return (
    <button type="button" className="ds-work-row" onClick={() => onOpen(entry)}>
      <span className="ds-work-number" style={tone(entry.status)}>
        {entry.lesson.number + 1}
      </span>
      <span className="ds-work-copy">
        <CourseLabel entry={entry} />
        <strong>
          {entry.suffix ? entry.suffix + ' · ' : ''}
          {entry.lesson.title}
        </strong>
        <span className="ds-work-meta">
          <EntryStatus entry={entry} />
          <Due entry={entry} today={today} />
        </span>
      </span>
      <ChevronRight size={17} className="ds-chevron" />
    </button>
  )
}

export default function StudentDiaryPage({
  tab,
  setTab,
}: {
  tab: DiaryTab
  setTab: (tab: DiaryTab) => void
}) {
  const t = useT(),
    lang = useLang((s) => s.lang),
    dark = useTheme((s) => s.dark),
    now = useNow(60_000),
    tz = useStudentTz((s) => s.tz)
  const subjects = useStudentData((s) => s.subjects),
    progress = useStudentData((s) => s.progress),
    schedule = useStudentData((s) => s.scheduleDays)
  const { metadata, pending, error, reload } = useStudentDiaryMetadata()
  const openHomework = useDashboard((s) => s.openHomeworkForLesson),
    openLesson = useDashboard((s) => s.openLesson)
  const activeCourse = useDashboard((s) => s.activeSubjectId),
    setActiveCourse = useDashboard((s) => s.setActiveSubject)
  const [subject, setSubject] = useState('*'),
    [course, setCourse] = useState('*'),
    [state, setState] = useState('action')
  const [feedDay, setFeedDay] = useState<string | null>(null)
  const diaryOwner = getStudentSession()?.id ?? null
  useEffect(() => { setSubject('*'); setCourse('*'); setState('action'); setFeedDay(null) }, [diaryOwner])
  const [sort, setSort] = useState('priority'),
    [descending, setDescending] = useState(false)
  const [reminder, setReminder] = useState<StudentDiaryEntry | null>(null),
    [reminderAt, setReminderAt] = useState(''),
    [message, setMessage] = useState('')
  const reminders = useDiaryReminders()
  const reminderDialog = useRef<HTMLDivElement>(null)
  const reminderTrigger = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (!reminder) return
    const dialog = reminderDialog.current?.closest<HTMLElement>('[role="dialog"]')
    if (!dialog) return
    dialog.setAttribute('aria-label', t('Напомнить о задании'))
    const controls = () =>
      [...dialog.querySelectorAll<HTMLElement>('button, input')].filter(
        (node) => node.getClientRects().length,
      )
    reminderDialog.current?.querySelector<HTMLInputElement>('input')?.focus()
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const nodes = controls(),
        first = nodes[0],
        last = nodes[nodes.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    dialog.addEventListener('keydown', trap)
    return () => {
      dialog.removeEventListener('keydown', trap)
      reminderTrigger.current?.focus()
    }
  }, [reminder, t])
  const clock = wallDateTimeInTz(now.toISOString(), tz),
    today = clock.day
  useEffect(() => { setFeedDay(null) }, [today])
  const entries = useMemo(
    () => buildStudentDiary(subjects, metadata, progress, now),
    [subjects, metadata, progress, now],
  )
  const scoped = entries.filter(
    (e) =>
      (subject === '*' || (e.course.subject || '__none') === subject) &&
      (course === '*' || e.course.id === course),
  )
  const actions = sortStudentDiary(scoped.filter(diaryNeedsAction), 'priority', false, today),
    first = actions[0]
  const pendingWork = scoped.filter((e) => e.status === 'submitted' || e.status === 'submitted_unknown')
  const courses = subjects.filter(
    (c) => (subject === '*' || (c.subject || '__none') === subject) && (course === '*' || c.id === course),
  )
  const list = sortStudentDiary(
    scoped.filter(
      (e) =>
        state === 'all' ||
        (state === 'action' && diaryNeedsAction(e)) ||
        (state === 'pending' && (e.status === 'submitted' || e.status === 'submitted_unknown')) ||
        (state === 'passed' && (e.status === 'test_passed' || e.status === 'completed')),
    ),
    sort,
    descending,
    today,
  )
  const recommendation = scoped.find((e) => e.status === 'test_low' && e.lesson.result?.percent != null)
  const upcoming = schedule
    .flatMap((day) =>
      day.lessons.map((row) => ({
        row,
        day: day.date,
        ...resolveScheduleLesson(row, subjects),
        event: getStudentScheduleState(row, day.date, now, tz, subjects),
      })),
    )
    .filter(
      (item) =>
        item.event.phase !== 'cancelled' &&
        !item.event.hasEnded &&
        (item.day > today || item.day === today) &&
        (course === '*' || item.subjectId === course) &&
        (subject === '*' || subjects.find((c) => c.id === item.subjectId)?.subject === subject),
    )
    .sort(
      (a, b) =>
        Number(b.event.isCurrent) - Number(a.event.isCurrent) ||
        `${a.day} ${a.row.time}`.localeCompare(`${b.day} ${b.row.time}`),
    )[0]
  const dateLabel = new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'ru-RU', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    timeZone: tz,
  }).format(now)
  function open(entry: StudentDiaryEntry) {
    if (entry.lesson.kind === 'test') openLesson(entry.lesson.id)
    else openHomework(entry.id)
  }
  function chooseReminder(entry: StudentDiaryEntry) {
    reminderTrigger.current = document.activeElement as HTMLElement
    setReminder(entry)
    setMessage('')
    const future = wallDateTimeInTz(new Date(now.getTime() + 60 * 60_000).toISOString(), tz)
    setReminderAt(future.day + 'T' + future.time)
  }
  function openCourse(id: string) {
    setActiveCourse(id)
    setCourse(id)
    setSubject('*')
    setTab('lessons')
  }
  const empty = (label: string) => (
    <div className="ds-empty">
      <Check size={24} />
      <p>{t(label)}</p>
    </div>
  )
  const row = (entry: StudentDiaryEntry) => <Row key={entry.id} entry={entry} today={today} onOpen={open} />
  const reminderButton = (entry: StudentDiaryEntry) => (
    <button
      type="button"
      className="ds-round"
      aria-label={t('Напомнить об этой работе')}
      onClick={() => chooseReminder(entry)}
    >
      <Bell size={17} />
    </button>
  )
  const courseCard = (item: (typeof subjects)[number], full = false) => {
    const palette = subjectTheme(item.subject, dark),
      works = scoped.filter((e) => e.course.id === item.id)
    return (
      <section
        className="ds-course-card"
        key={item.id}
        style={{ '--ds-course': palette.accent, '--ds-course-soft': palette.soft } as CSSProperties}
      >
        <div className="ds-course-top">
          <span className="ds-subject-mark">
            <BookOpen size={20} style={{ color: palette.accent }} />
          </span>
          <span>
            <small>{item.subject ?? t('Курс')}</small>
            <h3>{item.name}</h3>
          </span>
          <button
            type="button"
            className="ds-round"
            aria-label={`${t('Открыть курс')} ${item.name}`}
            onClick={() => openCourse(item.id)}
          >
            <ChevronRight size={17} />
          </button>
        </div>
        <div
          className="ds-progress"
          role="progressbar"
          aria-label={t('Прогресс курса')}
          aria-valuenow={item.progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${item.progress}%`, background: palette.accent }} />
        </div>
        <p className="ds-course-progress">
          {item.progress}% {t('пройдено')}
          <span>
            {works.filter(diaryNeedsAction).length} {t('ДЗ к выполнению')}
          </span>
        </p>
        {full ? (
          <>
            <div className="ds-course-track">
              {item.modules
                .flatMap((m) => m.lessons)
                .slice(0, 12)
                .map((lesson) => {
                  const status = gradedTrackResult(lesson)?.status ?? getTrackLessonStatus(lesson, now)
                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      className="ds-track-step"
                      style={tone(status)}
                      disabled={status === 'locked'}
                      aria-label={`${t('Урок')} ${lesson.number + 1}`}
                      onClick={() => openLesson(lesson.id)}
                    >
                      <span>
                        {status === 'completed' || status === 'test_passed' ? (
                          <Check size={16} />
                        ) : (
                          lesson.number + 1
                        )}
                      </span>
                      <small>
                        {t('Урок')} {lesson.number + 1}
                      </small>
                    </button>
                  )
                })}
            </div>
            <div className="ds-course-work">{works.filter(diaryNeedsAction).slice(0, 3).map(row)}</div>
            <div className="ds-course-links">
              {works.filter(diaryNeedsAction).length > 3 ? <button type="button" className="ds-text-action" onClick={() => {
                setCourse(item.id); setSubject('*'); setState('action'); setFeedDay(null); setTab('work')
              }}>{t('Все задания')}<ArrowRight size={15}/></button> : null}
              <button type="button" className="ds-text-action" onClick={() => openCourse(item.id)}>
                {t('Все уроки')}<ArrowRight size={15} />
              </button>
            </div>
          </>
        ) : null}
      </section>
    )
  }
  const upcomingCard = (upcoming ? (
                <section className="ds-upcoming">
                  <div className="ds-section-head">
                    <h2>{t(upcoming.event.isCurrent ? 'Идёт сейчас' : 'Ближайший урок')}</h2>
                    <span className="ds-live-dot" />
                  </div>
                  <div className="ds-upcoming-time">
                    {upcoming.row.time}
                    <small>
                      {' '}
                      ·{' '}
                      {upcoming.day === today
                        ? t('Сегодня')
                        : new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'ru-RU', {
                            day: 'numeric',
                            month: 'short',
                            timeZone: 'UTC',
                          }).format(new Date(upcoming.day + 'T12:00:00Z'))}
                    </small>
                  </div>
                  <p className="ds-course-label">{upcoming.row.subject}</p>
                  <h3>{upcoming.row.lessonTitle}</h3>
                  <div className="ds-upcoming-bottom">
                    <span>
                      <Video size={15} />
                      {upcoming.row.endTime ? `${upcoming.row.time}–${upcoming.row.endTime}` : ''}
                    </span>
                    <button
                      type="button"
                      className="ds-round"
                      aria-label={t('Открыть урок')}
                      onClick={() =>
                        upcoming.lesson
                          ? openLesson(upcoming.lesson.id)
                          : useDashboard.getState().setActivePage('home')
                      }
                    >
                      <ArrowRight size={17} />
                    </button>
                  </div>
                </section>
              ) : (
                <section className="ds-section ds-no-lesson">
                  <CalendarIcon />
                  <h3>{t('Ближайших занятий пока нет')}</h3>
                  <p>{t('Новые занятия появятся здесь после добавления в расписание.')}</p>
                </section>
              ))
  const feedDays = diaryUpcomingDays(today)
  const timeline = sort === 'priority' || sort === 'due'
    ? groupDiaryTimeline(list, feedDay, entry => diaryOverdue(entry, today), sort === 'due' && descending)
    : [{key: feedDay ?? 'all', entries: list.filter(entry => !feedDay || entry.due === feedDay)}].filter(group => group.entries.length)
  const feedDate = (day: string) => new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'ru-RU', {
    day: 'numeric', month: 'short', timeZone: 'UTC',
  }).format(new Date(day + 'T12:00:00Z'))
  const feedTitle = (key: string) => key === 'all' ? t('Все задания') : key === 'overdue' ? t('Просрочено') : key === 'undated' ? t('Без срока')
    : key === today ? t('Сегодня') : feedDate(key)

  return (
    <div className="student-diary">
      <h1 className="sr-only">{t('Дневник')}</h1>
      <div className="ds-page-heading">
        <p>{dateLabel}</p>
      </div>
      <div className="ds-view-navigation">
        <div className="ds-tabs" role="group" aria-label={t('Представление дневника')}>
          {([['today', 'Фокус'], ['work', 'Лента'], ['courses', 'По курсам']] as const).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}>
              {t(label)}{id === 'work' ? <span aria-hidden={actions.length === 0}>{actions.length || ''}</span> : null}
            </button>
          ))}
        </div>
        <button type="button" className="ds-secondary ds-lesson-catalog" aria-pressed={tab === 'lessons'} onClick={() => setTab('lessons')}>
          {t('Уроки')}<ChevronRight size={15}/>
        </button>
      </div>
      {tab !== 'lessons' ? (
        <div className="ds-scope">
          <label>
            <span className="ds-field-label">{t('Предмет')}</span>
            <select
              aria-label={t('Предмет дневника')}
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value)
                setCourse('*')
              }}
            >
              <option value="*">{t('Все предметы')}</option>
              {[...new Set(subjects.map((c) => c.subject || '__none'))].map((name) => (
                <option key={name} value={name}>
                  {name === '__none' ? t('Предмет не указан') : name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="ds-field-label">{t('Курс / интенсив')}</span>
            <select
              aria-label={t('Курс дневника')}
              value={course}
              onChange={(e) => setCourse(e.target.value)}
            >
              <option value="*">{t('Все курсы и интенсивы')}</option>
              {subjects
                .filter((c) => subject === '*' || (c.subject || '__none') === subject)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </label>
          <span className="ds-scope-summary">
            {pending
              ? t('Обновляем задания…')
              : error
                ? t('Часть заданий недоступна')
                : `${actions.length} ${t('ДЗ к выполнению')}`}
          </span>
        </div>
      ) : null}
      {error ? (
        <div className="ds-load-error" role="status">
          <span>{t('Не удалось загрузить все задания. Уже загруженные работы доступны.')}</span>
          <button type="button" className="ds-secondary" onClick={reload}>
            <RefreshCw size={15} />
            {t('Повторить')}
          </button>
        </div>
      ) : null}
      {tab === 'lessons' ? (
        <CoursesPage />
      ) : tab === 'courses' ? (
        <div className="ds-course-board">
          {courses.map((c) => courseCard(c, true))}
          {!courses.length ? empty('Курсы ещё не добавлены') : null}
        </div>
      ) : tab === 'work' ? (
        <>
          <div className="ds-work-toolbar">
            <label>
              {t('Состояние')}
              <select aria-label={t('Состояние')} value={state} onChange={(e) => setState(e.target.value)}>
                <option value="action">{t('Нужно сделать')}</option>
                <option value="all">{t('Все задания')}</option>
                <option value="pending">{t('На проверке')}</option>
                <option value="passed">{t('Зачтено')}</option>
              </select>
            </label>
            <label>
              {t('Сортировка')}
              <select aria-label={t('Сортировка')} value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="priority">{t('Сначала важное')}</option>
                <option value="due">{t('По сроку')}</option>
                <option value="number">{t('По номеру ДЗ')}</option>
                <option value="subject">{t('По предмету')}</option>
                <option value="course">{t('По курсу / интенсиву')}</option>
              </select>
            </label>
            <button
              type="button"
              className="ds-sort-direction"
              aria-pressed={descending}
              onClick={() => setDescending(!descending)}
            >
              <ArrowUpDown size={16} />
              {t(descending ? 'По убыванию' : 'По возрастанию')}
            </button>
          </div>
          <div className="ds-feed-grid">
            <aside className="ds-feed-aside">
              <section className="ds-feed-planner" aria-label={t('План на неделю')}>
                <div className="ds-section-head"><h2>{t('План на неделю')}</h2><BookOpen size={17}/></div>
                <button type="button" className="ds-feed-all" aria-pressed={feedDay === null} onClick={() => setFeedDay(null)}>{t('Все сроки')}</button>
                <div className="ds-day-picker" role="group" aria-label={t('Дни недели')}>
                  {feedDays.map(day => <button key={day} type="button" aria-label={feedDate(day)} aria-pressed={feedDay === day}
                    onClick={() => setFeedDay(feedDay === day ? null : day)}>
                    <span>{new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'ru-RU', {weekday:'short',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z'))}</span>
                    <strong>{Number(day.slice(-2))}</strong><i aria-hidden="true" data-has-work={list.some(entry => entry.due === day) || undefined}/>
                  </button>)}
                </div>
                <p>{feedDay ? feedDate(feedDay) : t('Все сроки')} · {timeline.reduce((count, group) => count + group.entries.length, 0)} {t('ДЗ')}</p>
              </section>
              {feedDay === null || upcoming?.day === feedDay ? upcomingCard : null}
            </aside>
            <main className="ds-feed-timeline" aria-label={t('Лента заданий')}>
              {timeline.map(group => <section className="ds-feed-event" key={group.key}>
                <div className="ds-section-head"><h2>{feedTitle(group.key)}</h2><span>{group.entries.length} {t('ДЗ')}</span></div>
                <div className="ds-section ds-all-work">{group.entries.map(row)}</div>
              </section>)}
              {!timeline.length ? <section className="ds-section ds-all-work">{empty(pending ? 'Загружаем задания…' : feedDay ? 'На этот день заданий нет' : 'По этим фильтрам работ нет')}</section> : null}
            </main>
          </div>
        </>
      ) : (
        <>
          <div className="ds-focus-grid">
            <main>
              {first ? (
                <section className="ds-priority" style={tone(first.status)}>
                  <div className="ds-priority-top">
                    <span>
                      <span className="ds-tiny-dot" />
                      {t('Сначала это')}
                    </span>
                    <Due entry={first} today={today} />
                  </div>
                  <div className="ds-priority-body">
                    <div className="ds-priority-number">
                      <span>{first.lesson.kind === 'test' ? t('Тест') : t('ДЗ')}</span>
                      {first.lesson.number + 1}
                      <TaskliIcon
                        name={first.status === 'returned' ? 'returned' : 'courses'}
                        size={24}
                        style={{ color: 'var(--ds-tone)' }}
                      />
                    </div>
                    <div>
                      <CourseLabel entry={first} />
                      <h2>{first.lesson.title}</h2>
                      <p>
                        {progress[first.id]?.reviewComment ||
                          first.lesson.comment ||
                          t('Продолжи с того места, где остановился.')}
                      </p>
                      <EntryStatus entry={first} />
                    </div>
                  </div>
                  <div className="ds-priority-footer">
                    <button type="button" className="ds-primary" onClick={() => open(first)}>
                      {t(
                        first.status === 'returned'
                          ? 'Исправить работу'
                          : first.lesson.result?.draft
                            ? 'Продолжить работу'
                            : 'Открыть задание',
                      )}
                      <ArrowRight size={17} />
                    </button>
                    {reminderButton(first)}
                  </div>
                </section>
              ) : (
                <section className="ds-section">
                  {empty(
                    pending
                      ? 'Загружаем задания…'
                      : error
                        ? 'Задания временно недоступны'
                        : !scoped.length
                          ? 'Пока нет домашних заданий'
                          : 'Все дела выполнены',
                  )}
                </section>
              )}
              {actions.length > 1 ? (
                <section className="ds-section">
                  <div className="ds-section-head">
                    <h2>{t('Дальше по плану')}</h2>
                    <span>
                      {actions.length - 1} {t('ДЗ')}
                    </span>
                  </div>
                  {actions.slice(1, 5).map(row)}
                  {actions.length > 5 ? (
                    <button type="button" className="ds-text-action" onClick={() => setTab('work')}>
                      {t('Все задания')}
                      <ArrowRight size={15} />
                    </button>
                  ) : null}
                </section>
              ) : null}
            </main>
            <aside>
              {upcomingCard}
              {recommendation ? (
                <section className="ds-recommend">
                  <span className="ds-recommend-icon">
                    <Sparkles size={21} />
                  </span>
                  <div>
                    <small>{t('Стоит повторить')}</small>
                    <h3>{recommendation.lesson.title}</h3>
                    <p>
                      {recommendation.lesson.result!.percent}% · {t('порог')}{' '}
                      {recommendation.lesson.result!.passingScore}%. {t('Вернись к заданиям с ошибками.')}
                    </p>
                    <button type="button" className="ds-text-action" onClick={() => open(recommendation)}>
                      {t('Разобрать работу')}
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </section>
              ) : null}
              {reminders.items.map((item) => (
                <div className="ds-reminder-note" key={item.id}>
                  <Bell size={17} />
                  <span>
                    {item.title}
                    <small>
                      {new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: tz,
                      }).format(item.at)}
                    </small>
                  </span>
                  <button
                    type="button"
                    className="ds-round"
                    aria-label={t('Убрать напоминание')}
                    onClick={() => {
                      if (!reminders.remove(item.id)) setMessage(t('Не удалось сохранить напоминание'))
                    }}
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
              {!reminders.items.length && first ? (
                <div className="ds-reminder-note">
                  <Bell size={17} />
                  <span>
                    {t('Личное напоминание')}
                    <small>{t('Выбери удобное время для задания')}</small>
                  </span>
                  {reminderButton(first)}
                </div>
              ) : null}
            </aside>
          </div>
          <div className="ds-section-head ds-bottom-heading">
            <h2>{t('Продолжить курс')}</h2>
            <button type="button" className="ds-text-action" onClick={() => setTab('courses')}>
              {t('Все курсы')}
              <ArrowRight size={15} />
            </button>
          </div>
          <div className="ds-course-shelf">
            {courses.slice(0, 4).map((c) => courseCard(c))}
            {!courses.length ? empty('Курсы ещё не добавлены') : null}
          </div>
          {pendingWork.length ? (
            <button
              type="button"
              className="ds-pending-strip"
              onClick={() => {
                setState('pending')
                setTab('work')
              }}
            >
              <Clock size={17} />
              <span>
                {pendingWork.length} {t('ДЗ на проверке')}
                <span>{t('Можно продолжать учиться')}</span>
              </span>
              <ChevronRight size={17} />
            </button>
          ) : null}
        </>
      )}
      <div className="ds-notice" role="status">
        {message}
      </div>
      {reminder ? (
        <Modal
          title={t('Напомнить о задании')}
          subtitle={`${diaryWorkLabel(reminder)} · ${reminder.lesson.title}`}
          width={430}
          onClose={() => setReminder(null)}
        >
          <div ref={reminderDialog} className="student-diary ds-dialog">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const [day, time] = reminderAt.split('T')
                if (!day || !time) return
                const utc = convertWallTime(day, time, tz, 'UTC')
                const at = Date.parse(`${utc.day}T${utc.time}:00Z`)
                if (!Number.isFinite(at) || at <= Date.now()) {
                  setMessage(t('Выбери время в будущем'))
                  return
                }
                if (
                  reminders.save({
                    id: reminder.id,
                    title: diaryWorkLabel(reminder) + ' · ' + reminder.lesson.title,
                    course: reminder.course.name,
                    at,
                  })
                ) {
                  setReminder(null)
                  setMessage(t('Напоминание сохранено'))
                } else setMessage(t('Не удалось сохранить напоминание'))
              }}
            >
              <label className="ds-reminder-field">
                {t('Дата и время')}
                <input
                  type="datetime-local"
                  required
                  value={reminderAt}
                  onChange={(e) => setReminderAt(e.target.value)}
                />
              </label>
              <p className="ds-reminder-explanation">
                {t('На этом устройстве: напоминание появится в Искре, когда кабинет открыт.')}
              </p>
              <button type="submit" className="ds-primary">
                {t('Сохранить')}
                <Check size={16} />
              </button>
              <p role="status">{message}</p>
            </form>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
function CalendarIcon() {
  return <TaskliIcon name="schedule" size={24} />
}
