import { FilterMenu, SortMenu, StatusTabs, ToolButton, ToolCount, Toolbar } from '../components/trainer/TrainerShell'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  ArrowRight,
  ArrowUpDown,
  Check,
  ChevronRight,
  Clock,
  RefreshCw,
  Video,
} from '../components/icons/appIcons'
import { TaskliIcon, type TaskliIconName } from '../components/icons/TaskliIcon'
import CoursesPage from './CoursesPage'
import StudentWorkJournal from '../components/diary/StudentWorkJournal'
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

export type DiaryTab = 'journal' | 'work' | 'lessons'
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
      {/* «Биология · Биология · подготовка…»: предмет не повторяем, если
          название курса с него уже начинается. */}
      {entry.course.id !== HW_SUBJECT_ID &&
      entry.course.subject &&
      !entry.course.name.toLowerCase().startsWith(entry.course.subject.toLowerCase()) ? (
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

// Строка управления — те же контролы, что в тренажёре (TrainerShell): сегменты
// состояния, таблетки-фильтры, меню сортировки, на телефоне — шторка «Фильтры».
// Состояние по умолчанию — пустая строка: так шторка не считает его фильтром
// и «Сбросить» возвращает именно «Нужно сделать».
const STATE_OPTIONS = [
  { value: '', label: 'Нужно сделать' },
  { value: 'pending', label: 'На проверке' },
  { value: 'passed', label: 'Зачтено' },
  { value: 'all', label: 'Все' },
]
const SORT_OPTIONS = [
  { value: 'priority', label: 'Сначала важное' },
  { value: 'due', label: 'По сроку' },
  { value: 'number', label: 'По номеру ДЗ' },
  { value: 'subject', label: 'По предмету' },
  { value: 'course', label: 'По курсу / интенсиву' },
]
const TAB_OPTIONS = [
  { value: 'work', label: 'Задания' },
  { value: 'journal', label: 'Журнал работ' },
]

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
  const [subjectPick, setSubjectPick] = useState<string[]>([]),
    [coursePick, setCoursePick] = useState<string[]>([]),
    [state, setState] = useState('')
  const [feedDay, setFeedDay] = useState<string | null>(null)
  const diaryOwner = getStudentSession()?.id ?? null
  useEffect(() => { setSubjectPick([]); setCoursePick([]); setState(''); setFeedDay(null) }, [diaryOwner])
  const [sort, setSort] = useState('priority'),
    [descending, setDescending] = useState(false)
  const pageKey = JSON.stringify([diaryOwner, subjectPick, coursePick, state, sort, descending, feedDay])
  const [page, setPage] = useState({ key: '', count: 5 })
  const visibleCount = page.key === pageKey ? page.count : 5
  const moreRef = useRef<HTMLDivElement>(null)
  const clock = wallDateTimeInTz(now.toISOString(), tz),
    today = clock.day
  useEffect(() => { setFeedDay(null) }, [today])
  const entries = useMemo(
    () => buildStudentDiary(subjects, metadata, progress, now),
    [subjects, metadata, progress, now],
  )
  const subjectOf = (c: { subject?: string | null }) => c.subject || '__none'
  const courseOptions = subjects.filter((c) => !subjectPick.length || subjectPick.includes(subjectOf(c)))
  // Курс, чей предмет сняли, из выбора уходит — иначе он молча обнулял бы ленту.
  useEffect(() => {
    setCoursePick((prev) => {
      const next = prev.filter((id) => courseOptions.some((c) => c.id === id))
      return next.length === prev.length ? prev : next
    })
  }, [subjectPick, subjects])
  const scoped = entries.filter(
    (e) =>
      (!subjectPick.length || subjectPick.includes(subjectOf(e.course))) &&
      (!coursePick.length || coursePick.includes(e.course.id)),
  )
  const actions = scoped.filter(diaryNeedsAction)
  const list = sortStudentDiary(
    scoped.filter(
      (e) =>
        state === 'all' ||
        (state === '' && diaryNeedsAction(e)) ||
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
        (!coursePick.length || coursePick.includes(item.subjectId ?? '')) &&
        (!subjectPick.length || subjectPick.includes(subjectOf(subjects.find((c) => c.id === item.subjectId) ?? {}))),
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
  function open(entry: StudentDiaryEntry, hard = false) {
    if (hard) openHomework(entry.id, 'hard')
    else if (entry.lesson.kind === 'test') openLesson(entry.lesson.id)
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
  const totalWorks = timeline.reduce((count, group) => count + group.entries.length, 0)
  let remaining = visibleCount
  const visibleTimeline = timeline.flatMap(group => {
    const entries = group.entries.slice(0, remaining)
    remaining -= entries.length
    return entries.length ? [{ ...group, entries, total: group.entries.length }] : []
  })
  const hasMore = visibleCount < totalWorks
  // Дочитали до конца — подкладываем следующие 5. Запас 120px, чтобы
  // порция успевала появиться до того, как палец упрётся в низ.
  useEffect(() => {
    const node = moreRef.current
    if (!hasMore || !node || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([hit]) => {
      if (hit?.isIntersecting) setPage({ key: pageKey, count: visibleCount + 5 })
    }, { rootMargin: '0px 0px 120px 0px' })
    io.observe(node)
    return () => io.disconnect()
  }, [hasMore, pageKey, visibleCount])
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
      {tab !== 'lessons' ? (
        <div className="ds-diary-navigation">
          <StatusTabs options={TAB_OPTIONS} value={tab} onChange={(v) => setTab(v as DiaryTab)} />
        </div>
      ) : null}
      {tab === 'lessons' ? (
        <button type="button" className="ds-secondary" onClick={() => setTab('journal')}>
          {t('Дневник')}<ChevronRight size={15} />
        </button>
      ) : null}
      {tab !== 'lessons' ? (
        <div className="ds-toolbar">
          <Toolbar count={tab === 'work' ? totalWorks : scoped.length}>
            {tab === 'work' ? <StatusTabs options={STATE_OPTIONS} value={state} onChange={setState} /> : null}
            <FilterMenu
              label="Предмет"
              value={subjectPick}
              onChange={setSubjectPick}
              options={[...new Set(subjects.map(subjectOf))].map((name) => ({
                value: name,
                label: name === '__none' ? t('Предмет не указан') : name,
              }))}
            />
            <FilterMenu
              label="Курс"
              value={coursePick}
              onChange={setCoursePick}
              options={courseOptions.map((c) => ({ value: c.id, label: c.name }))}
            />
            {tab === 'work' ? <>
              <SortMenu options={SORT_OPTIONS} value={sort} onChange={setSort} />
              <ToolButton icon label={descending ? 'По убыванию' : 'По возрастанию'} on={descending} onClick={() => setDescending(!descending)}>
                <ArrowUpDown size={16} />
              </ToolButton>
            </> : null}
            <ToolCount>
              {pending
                ? t('Обновляем задания…')
                : tab === 'work'
                  ? `${actions.length} ${t('ДЗ к выполнению')}`
                  : `${scoped.length} ${t('ДЗ')}`}
            </ToolCount>
          </Toolbar>
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
      {tab === 'journal' ? (
        <StudentWorkJournal key={diaryOwner ?? 'guest'} entries={scoped} pending={pending} onOpen={open} />
      ) : tab === 'lessons' ? (
        <CoursesPage />
      ) : (
        <>
          <div className="ds-feed-grid">
            <aside className="ds-feed-aside">
              <section className="ds-feed-planner" aria-label={t('План на неделю')}>
                <div className="ds-section-head"><h2>{t('План на неделю')}</h2></div>
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
              {visibleTimeline.map((group, index) => <section className="ds-feed-event" key={group.key}
                data-more-below={hasMore && index === visibleTimeline.length - 1 || undefined}>
                <div className="ds-section-head"><h2>{feedTitle(group.key)}</h2><span data-tone={group.key === 'overdue' ? 'overdue' : undefined}>{group.total} {t('ДЗ')}</span></div>
                <div className="ds-section ds-all-work">{group.entries.map(row)}</div>
              </section>)}
              {/* Без счётчика и кнопки: низ ленты гаснет, следующая порция
                  подгружается сама, когда дочитали до конца. */}
              {hasMore ? <div ref={moreRef} className="ds-load-sentinel" aria-hidden="true" /> : null}
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
