import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Play, ClipboardList, CalendarDays, Check, Flame, CheckCircle2, TrendingUp, Zap, BookOpen } from 'lucide-react'
import type { Lesson, Subject, ScheduleLesson } from '../data/mockData'
import { useStudentData } from '../store/studentDataStore'
import { useDashboard } from '../store/dashboardStore'
import { resolveScheduleLesson } from '../lib/db'
import { useNow, lessonTimeState } from '../lib/useNow'
import { appFlag } from '../lib/cardGroups'
import { useT, useTc } from '../lib/i18n'
import CourseTrack from './CourseTrack'

/**
 * НОВАЯ ГЛАВНАЯ УЧЕНИКА (компьютер) — концепт 1 «Сначала — что делать»
 * (Figma «Искра» → «Главная · редизайн»).
 *
 * Старая главная отвечала «что есть»: карусель дней, карусель виджетов, трек.
 * Эта отвечает «что делать сейчас»: наверху урок, к которому вернуться, и
 * домашка; под ними уроки сегодняшнего дня одной строкой, цифры плитками, курс
 * карточкой. Так же устроена главная на телефоне — с «Продолжить».
 *
 * Включается флагом `home_redesign` (app_flags, «Администрирование → Функции»).
 * До конца Хэллоуина лежит выключенной: праздничные украшения привязаны к
 * старой раскладке.
 */

const FLAG = 'home_redesign'
// Последний ответ базы — чтобы после F5 не мигала старая главная, пока флаг
// едет. Локальная проверка до включения всем: localStorage['home.next'] = '1'.
const CACHE_KEY = 'home_redesign.last'

function readLocal(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

export function useHomeRedesign(): boolean {
  const forced = readLocal('home.next') === '1'
  const [on, setOn] = useState(() => forced || readLocal(CACHE_KEY) === '1')
  useEffect(() => {
    if (forced) return
    let alive = true
    appFlag(FLAG).then(v => {
      if (!alive) return
      setOn(v)
      try { localStorage.setItem(CACHE_KEY, v ? '1' : '0') } catch { /* приватный режим — живём без кэша */ }
    })
    return () => { alive = false }
  }, [forced])
  return on
}

const CARD: CSSProperties = {
  background: 'var(--color-bg-card, var(--color-bg-2))',
  borderRadius: 24,
  boxShadow: 'var(--shadow-2)',
  border: '1px solid var(--color-border-glass)',
}
const TEXT_LIFT: CSSProperties = { position: 'relative', top: '-0.12em' }
const NUM: CSSProperties = { fontVariantNumeric: 'tabular-nums' }

function flatLessons(s: Subject): Lesson[] {
  return s.modules.flatMap(m => m.lessons)
}

export default function HomeNext() {
  const subjects = useStudentData(s => s.subjects)
  const scheduleDays = useStudentData(s => s.scheduleDays)
  const stats = useStudentData(s => s.stats)
  const activeSubjectId = useDashboard(s => s.activeSubjectId)

  // Курс, открытый в треке, — первым: «Продолжить» ведёт туда, где ученик и так.
  const ordered = [...subjects].sort((a, b) => (a.id === activeSubjectId ? -1 : b.id === activeSubjectId ? 1 : 0))
  const cont = (() => {
    for (const s of ordered) { const l = flatLessons(s).find(x => x.status === 'current'); if (l) return { lesson: l, subject: s } }
    for (const s of ordered) { const l = flatLessons(s).find(x => x.status !== 'locked' && x.status !== 'completed'); if (l) return { lesson: l, subject: s } }
    return null
  })()

  // Домашка к сдаче: возвращённая на доработку — первой, потом текущие уроки.
  const homework = subjects.flatMap(s => flatLessons(s)
    .filter(l => l.status === 'returned' || l.status === 'current')
    .map(l => ({ lesson: l, subject: s })))
    .sort((a, b) => (a.lesson.status === 'returned' ? 0 : 1) - (b.lesson.status === 'returned' ? 0 : 1))

  const todayIdx = scheduleDays.findIndex(d => d.isToday)
  const today = todayIdx >= 0 ? scheduleDays[todayIdx] : null
  const nextDay = scheduleDays.slice(todayIdx + 1).find(d => d.lessons.length > 0) ?? null

  return (
    <div className="home-next" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 20, alignItems: 'stretch' }}>
        <ContinueCard info={cont} />
        <HomeworkCard items={homework} />
      </div>
      <TodayCard date={today?.date ?? null} lessons={today?.lessons ?? []} nextDay={nextDay} />
      <StatsRow stats={stats} />
      <div style={{ ...CARD, padding: '16px 0 0' }}>
        <CourseTrack />
      </div>
    </div>
  )
}

// ─── Продолжить ─────────────────────────────────────────────────────────

function ContinueCard({ info }: { info: { lesson: Lesson; subject: Subject } | null }) {
  const t = useT()
  const { tc } = useTc()
  const openLesson = useDashboard(s => s.openLesson)
  const openCourses = useDashboard(s => s.openCourses)

  const box: CSSProperties = {
    flex: 1, minWidth: 0, minHeight: 200, borderRadius: 28, padding: '24px 28px',
    display: 'flex', flexDirection: 'column', gap: 8, color: '#fff',
    background: 'var(--grad-purple)', boxShadow: 'var(--glow-accent)',
  }
  if (!info) {
    return (
      <div style={box}>
        <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.15 }}>{t('Всё пройдено')}</div>
        <div style={{ fontSize: 15, opacity: 0.85 }}>{t('Новые уроки откроет преподаватель')}</div>
      </div>
    )
  }
  const { lesson, subject } = info
  const all = flatLessons(subject)
  const idx = all.findIndex(l => l.id === lesson.id)
  const modIdx = subject.modules.findIndex(m => m.lessons.some(l => l.id === lesson.id))
  const label = lesson.status === 'current' ? t('Продолжить') : t('Начать')

  return (
    <div style={box}>
      <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.8, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {label} · {tc(subject.name)}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.15, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {t('Занятие')} #{lesson.number + 1} · {tc(lesson.title)}
      </div>
      <div style={{ fontSize: 14, fontWeight: 500, opacity: 0.85, ...NUM }}>
        {t('урок')} {idx + 1} {t('из')} {all.length}
        {subject.modules.length > 1 && modIdx >= 0 && <> · {t('модуль')} {modIdx + 1} {t('из')} {subject.modules.length}</>}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.3)', overflow: 'hidden' }}>
          <div style={{ width: `${Math.max(3, subject.progress)}%`, height: '100%', background: '#fff' }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, ...NUM }}>{subject.progress}% {t('курса')}</span>
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => (lesson.status === 'locked' ? openCourses() : openLesson(lesson.id))}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 20px 0 16px', borderRadius: 999, border: 'none', cursor: 'pointer', background: '#fff', color: 'var(--color-control-accent)', fontFamily: 'inherit', fontSize: 15, fontWeight: 700 }}
        >
          <Play size={14} fill="var(--color-control-accent)" />
          <span style={TEXT_LIFT}>{label}</span>
        </motion.button>
      </div>
    </div>
  )
}

// ─── Домашка ────────────────────────────────────────────────────────────

const HW_SHOWN = 4

function HomeworkCard({ items }: { items: Array<{ lesson: Lesson; subject: Subject }> }) {
  const t = useT()
  const { tc } = useTc()
  const openHomeworkForLesson = useDashboard(s => s.openHomeworkForLesson)
  const openCourses = useDashboard(s => s.openCourses)

  return (
    <div style={{ ...CARD, width: 420, flexShrink: 0, padding: '18px 22px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <CardHead icon={<ClipboardList size={18} />} title={t('Домашка')} extra={items.length > 0 ? String(items.length) : undefined} />
      {items.length === 0 && (
        <div style={{ fontSize: 14, color: 'var(--color-text-3)', padding: '8px 0' }}>{t('Всё сдано — новой домашки нет')}</div>
      )}
      {items.slice(0, HW_SHOWN).map(({ lesson, subject }) => {
        const returned = lesson.status === 'returned'
        return (
          <button
            key={lesson.id}
            type="button"
            onClick={() => openHomeworkForLesson(lesson.id)}
            className="hover-row"
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px', margin: '0 -8px', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
          >
            <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {tc(subject.name)} · {tc(lesson.title)}
            </span>
            <span style={{
              flexShrink: 0, fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 8,
              background: returned ? 'var(--color-peach-soft)' : 'var(--color-purple-soft)',
              color: returned ? 'var(--color-peach-text)' : 'var(--color-purple-text)',
            }}>
              {returned ? t('на доработку') : t('к сдаче')}
            </span>
          </button>
        )
      })}
      {items.length > HW_SHOWN && (
        <button type="button" onClick={() => openCourses()} style={{ alignSelf: 'flex-start', marginTop: 4, padding: 0, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: 'var(--color-control-accent)' }}>
          {t('Ещё')} {items.length - HW_SHOWN} →
        </button>
      )}
    </div>
  )
}

// ─── Сегодня ────────────────────────────────────────────────────────────

function TodayCard({ date, lessons, nextDay }: { date: string | null; lessons: ScheduleLesson[]; nextDay: { label: string; lessons: ScheduleLesson[] } | null }) {
  const t = useT()
  const { tc } = useTc()
  const now = useNow(30_000)
  const openLesson = useDashboard(s => s.openLesson)
  const openCourses = useDashboard(s => s.openCourses)
  const setActiveSubject = useDashboard(s => s.setActiveSubject)

  const sorted = [...lessons].sort((a, b) => a.time.localeCompare(b.time))
  const states = sorted.map(l => (date ? lessonTimeState(date, l.time, now) : { passed: false, minutesUntil: 0 }))
  // «Идёт» — последний начавшийся (длительности уроков нет, считаем час);
  // иначе подсвечиваем ближайший будущий.
  const runningIdx = states.reduce((acc, s, i) => (s.passed && s.minutesUntil > -60 ? i : acc), -1)
  const nextIdx = runningIdx >= 0 ? -1 : states.findIndex(s => !s.passed)
  const passedCount = states.filter((s, i) => s.passed && i !== runningIdx).length

  const open = (l: ScheduleLesson) => {
    const { subjectId, lesson } = resolveScheduleLesson(l, useStudentData.getState().subjects)
    if (lesson) openLesson(lesson.id)
    else { if (subjectId) setActiveSubject(subjectId); openCourses() }
  }

  const todayLabel = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' }).format(date ? new Date(`${date}T00:00:00`) : new Date())

  return (
    <div style={{ ...CARD, padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <CardHead
        icon={<CalendarDays size={18} />}
        title={`${t('Сегодня')}, ${todayLabel}`}
        extra={sorted.length > 0 ? `${sorted.length} ${t('ур.')}${passedCount ? ` · ${passedCount} ${t('прошли')}` : ''}` : undefined}
      />
      {sorted.length === 0 ? (
        <div style={{ fontSize: 14, color: 'var(--color-text-3)' }}>
          {t('Сегодня уроков нет')}
          {nextDay && nextDay.lessons[0] && <> · {t('следующий')} — {nextDay.label}, {nextDay.lessons[0].time} · {tc(nextDay.lessons[0].subject)}</>}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          {sorted.map((l, i) => {
            const running = i === runningIdx
            const upcoming = i === nextIdx
            const passed = states[i].passed && !running
            const hot = running || upcoming
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => open(l)}
                style={{
                  flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left',
                  padding: '10px 12px 10px 14px', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
                  background: hot ? 'var(--color-purple-soft)' : passed ? 'var(--color-bg-3)' : 'var(--color-bg-2)',
                  border: hot ? '1.5px solid var(--color-accent)' : '1.5px solid var(--color-bg-3)',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: hot ? 'var(--color-purple-text)' : 'var(--color-text-3)', ...NUM }}>
                  {l.time}
                  {passed && <Check size={12} strokeWidth={2.8} style={{ color: 'var(--color-green-text)' }} />}
                  {running && <span style={{ fontWeight: 700 }}>{t('идёт')}</span>}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: passed ? 'var(--color-text-3)' : 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tc(l.subject)}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tc(l.lessonTitle)}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Цифры ──────────────────────────────────────────────────────────────

function StatsRow({ stats }: { stats: { streak: number; completedTasks: number; avgScore: number; totalPoints: number; performance: number } }) {
  const t = useT()
  const tiles: Array<[ReactNode, string | number, string]> = [
    [<Flame size={18} />, stats.streak, t('дней подряд')],
    [<CheckCircle2 size={18} />, stats.completedTasks, t('заданий сделано')],
    [<TrendingUp size={18} />, stats.avgScore ? `${stats.avgScore}%` : '—', t('ср. балл')],
    [<BookOpen size={18} />, `${stats.performance}%`, t('успеваемость')],
    [<Zap size={18} />, stats.totalPoints, t('XP')],
  ]
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      {tiles.map(([icon, value, label], i) => (
        <div key={i} style={{ ...CARD, borderRadius: 18, flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' }}>
          <span style={{ color: 'var(--color-accent)', display: 'inline-flex', flexShrink: 0 }}>{icon}</span>
          <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.1, color: 'var(--color-text)', ...NUM }}>{value}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
          </span>
        </div>
      ))}
    </div>
  )
}

function CardHead({ icon, title, extra }: { icon: ReactNode; title: string; extra?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 4 }}>
      <span style={{ color: 'var(--color-control-accent)', display: 'inline-flex' }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>{title}</span>
      {extra && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-3)', ...NUM }}>{extra}</span>}
    </div>
  )
}
