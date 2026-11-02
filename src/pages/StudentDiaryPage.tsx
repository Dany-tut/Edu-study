import { LoopSelect } from '../components/icons/LoopSelect'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  ArrowRight,
  ArrowUpDown,
  BookOpen,
  Check,
  ChevronRight,
  Clock,
  RefreshCw,
  Video,
} from '../components/icons/appIcons'
import { TaskliIcon, type TaskliIconName } from '../components/icons/TaskliIcon'
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
  diaryStatusText,
  sortStudentDiary,
  type StudentDiaryEntry,
} from '../lib/studentDiary'
import { diaryUpcomingDays, groupDiaryTimeline } from '../lib/studentDiaryViews'
import { trackPalette, subjectTheme } from '../lib/theme'
import { getStudentScheduleState } from '../lib/lessonStatus'
import { resolveScheduleLesson } from '../lib/db'
import { getStudentSession } from '../lib/studentSession'
import { useNow } from '../lib/useNow'
import { useStudentTz } from '../lib/studentTz'
import { wallDateTimeInTz } from '../lib/teacherTz'
import { useT, useLang } from '../lib/i18n'
import '../components/diary/studentDiary.css'

export type DiaryTab = 'work' | 'lessons'
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
    now = useNow(60_000),
    tz = useStudentTz((s) => s.tz)
  const subjects = useStudentData((s) => s.subjects),
    progress = useStudentData((s) => s.progress),
    schedule = useStudentData((s) => s.scheduleDays)
  const { metadata, pending, error, reload } = useStudentDiaryMetadata()
  const openHomework = useDashboard((s) => s.openHomeworkForLesson),
    openLesson = useDashboard((s) => s.openLesson)
  const [subject, setSubject] = useState('*'),
    [course, setCourse] = useState('*'),
    [state, setState] = useState('action')
  const [feedDay, setFeedDay] = useState<string | null>(null)
  const diaryOwner = getStudentSession()?.id ?? null
  useEffect(() => { setSubject('*'); setCourse('*'); setState('action'); setFeedDay(null) }, [diaryOwner])
  const [sort, setSort] = useState('priority'),
    [descending, setDescending] = useState(false)
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
  const actions = scoped.filter(diaryNeedsAction)
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
  const empty = (label: string) => (
    <div className="ds-empty">
      <Check size={24} />
      <p>{t(label)}</p>
    </div>
  )
  const row = (entry: StudentDiaryEntry) => <Row key={entry.id} entry={entry} today={today} onOpen={open} />
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
      {tab === 'lessons' ? (
        <button type="button" className="ds-secondary" onClick={() => setTab('work')}>
          {t('Лента')}<ChevronRight size={15} />
        </button>
      ) : null}
      {tab !== 'lessons' ? (
        <div className="ds-scope">
          <label>
            <span className="ds-field-label">{t('Предмет')}</span>
            <LoopSelect
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
            </LoopSelect>
          </label>
          <label>
            <span className="ds-field-label">{t('Курс / интенсив')}</span>
            <LoopSelect
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
            </LoopSelect>
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
      ) : (
        <>
          <div className="ds-work-toolbar">
            <label>
              {t('Состояние')}
              <LoopSelect aria-label={t('Состояние')} value={state} onChange={(e) => setState(e.target.value)}>
                <option value="action">{t('Нужно сделать')}</option>
                <option value="all">{t('Все задания')}</option>
                <option value="pending">{t('На проверке')}</option>
                <option value="passed">{t('Зачтено')}</option>
              </LoopSelect>
            </label>
            <label>
              {t('Сортировка')}
              <LoopSelect aria-label={t('Сортировка')} value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="priority">{t('Сначала важное')}</option>
                <option value="due">{t('По сроку')}</option>
                <option value="number">{t('По номеру ДЗ')}</option>
                <option value="subject">{t('По предмету')}</option>
                <option value="course">{t('По курсу / интенсиву')}</option>
              </LoopSelect>
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
      )}
    </div>
  )
}
function CalendarIcon() {
  return <TaskliIcon name="schedule" size={24} />
}
