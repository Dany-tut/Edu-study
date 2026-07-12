import { useRef, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Flame, Zap, Bell, Play, ChevronRight, Dumbbell, BookOpen, Lock, Calendar, ClipboardList, HelpCircle, Atom, Star, CheckCircle2, TrendingUp } from 'lucide-react'
import NotificationPopup from './NotificationPopup'
import { useNotificationsStore } from '../store/notificationsStore'
import MobileScreen from './MobileScreen'
import MobileBottomNav from './MobileBottomNav'
import MobileDock, { DockSegment } from './MobileDock'
import MobileHScroll from './MobileHScroll'
import { DynamicIsland, GlassIconButton } from './mobileChrome'
import { getDisplayLessonStatus } from '../lib/lessonStatus'
import { useNow, lessonTimeState } from '../lib/useNow'
import { useStudentData } from '../store/studentDataStore'
import { useDashboard } from '../store/dashboardStore'
import { tactile } from '../lib/feedback'
import { PAIR } from '../lib/mobileTokens'
import { useT, t as tt } from '../lib/i18n'
import type { LucideIcon } from 'lucide-react'
import type { Lesson } from '../data/mockData'

// MOBILE ONLY home (v2). Desktop layout in DashboardPage is untouched.
// Concept: not a dashboard — a "today + continue" screen.
//   · Dynamic Island pill (streak + live info)
//   · Hero "Продолжить" — the one primary action
//   · "Сегодня" — compact schedule list
//   · Quick actions — trainer / courses
// Desktop widgets (StatsWidget/CourseTrack/LessonStatusCard/WidgetCarousel) are
// no longer crammed in here.

function fmtUntil(mins: number) {
  if (mins <= 0) return tt('идёт сейчас')
  if (mins < 60) return `${tt('через')} ${mins} ${tt('мин')}`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${tt('через')} ${h} ${tt('ч')} ${m} ${tt('мин')}` : `${tt('через')} ${h} ${tt('ч')}`
}

export default function MobileHome() {
  const t = useT()
  const subjects = useStudentData(s => s.subjects)
  const scheduleDays = useStudentData(s => s.scheduleDays)
  const stats = useStudentData(s => s.stats)
  const quizQuestions = useStudentData(s => s.quizQuestions)
  const scienceFacts = useStudentData(s => s.scienceFacts)
  const scienceMemes = useStudentData(s => s.scienceMemes)
  const openLesson = useDashboard(s => s.openLesson)
  const openCourses = useDashboard(s => s.openCourses)
  const setActivePage = useDashboard(s => s.setActivePage)
  const now = useNow(30_000)
  const notifUnread = useNotificationsStore(s => s.notifications.filter(n => !n.read).length)
  const [notifOpen, setNotifOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  // В2: at 2–4 courses a bottom segment scopes the home content to one course.
  // Single course → no dock (В1). Default follows whichever course has the
  // active lesson so "Продолжить" lands where the student left off.
  const multiCourse = subjects.length >= 2
  const [homeSubjectId, setHomeSubjectId] = useState<string | null>(null)
  const scopedSubject = multiCourse
    ? (subjects.find(s => s.id === homeSubjectId) ?? null)
    : null
  const scanSubjects = scopedSubject ? [scopedSubject] : subjects

  // Continue target: the current lesson, else first unlocked-incomplete lesson.
  const continueInfo = (() => {
    for (const subj of scanSubjects) {
      const lessons = subj.modules.flatMap(m => m.lessons)
      const cur = lessons.find(l => l.status === 'current')
      if (cur) return { lesson: cur, subject: subj }
    }
    for (const subj of scanSubjects) {
      const lessons = subj.modules.flatMap(m => m.lessons)
      const next = lessons.find(l => l.status !== 'locked' && l.status !== 'completed')
      if (next) return { lesson: next, subject: subj }
    }
    return null
  })()

  // Stats strip — account-wide totals, or the scoped course's own numbers.
  const homeStats = useMemo(() => {
    if (scopedSubject) {
      const lessons = scopedSubject.modules.flatMap(m => m.lessons)
      const completed = lessons.filter(l => l.status === 'completed').length
      const graded = lessons.filter(l => typeof l.points === 'number')
      const avg = graded.length ? Math.round(graded.reduce((s, l) => s + (l.points ?? 0), 0) / graded.length) : 0
      return [
        { icon: Flame, value: stats.streak, label: t('дней'), pair: PAIR.warning },
        { icon: CheckCircle2, value: completed, label: t('уроков'), pair: PAIR.success },
        { icon: TrendingUp, value: avg ? `${avg}%` : '—', label: t('ср. балл'), pair: PAIR.info },
        { icon: BookOpen, value: `${scopedSubject.progress}%`, label: t('курс'), pair: PAIR.focus },
      ]
    }
    return [
      { icon: Flame, value: stats.streak, label: t('дней'), pair: PAIR.warning },
      { icon: CheckCircle2, value: stats.completedTasks, label: t('заданий'), pair: PAIR.success },
      { icon: TrendingUp, value: `${stats.avgScore}%`, label: t('ср. балл'), pair: PAIR.info },
      { icon: Zap, value: stats.totalPoints, label: t('XP'), pair: PAIR.focus },
    ]
  }, [scopedSubject, stats, t])

  const todayLessons = scheduleDays.find(d => d.isToday)?.lessons ?? []

  // Dynamic Island: soonest upcoming lesson today, else streak summary.
  const nextToday = todayLessons
    .map(l => ({ l, st: lessonTimeState(scheduleDays.find(d => d.isToday)!.date, l.time, now) }))
    .filter(x => !x.st.passed)
    .sort((a, b) => a.st.minutesUntil - b.st.minutesUntil)[0]

  const topZone = (
    <div className="flex items-center justify-between" style={{ gap: 8 }}>
      <div style={{ width: 38, flexShrink: 0 }} />
      <DynamicIsland>
        {nextToday ? (
          <>
            <Calendar size={15} style={{ color: 'var(--color-accent)' }} />
            <span>{t('Урок')} {fmtUntil(nextToday.st.minutesUntil)}</span>
          </>
        ) : (
          <>
            <Flame size={15} style={{ color: '#F8A23B' }} />
            <span>{stats.streak} {t('дней')}</span>
            <span style={{ opacity: 0.35 }}>·</span>
            <Zap size={14} style={{ color: 'var(--color-accent)' }} />
            <span>{stats.totalPoints}</span>
          </>
        )}
      </DynamicIsland>
      <div ref={bellRef} style={{ display: 'inline-flex' }}>
        <GlassIconButton icon={<Bell size={16} />} dot={notifUnread > 0} ariaLabel={t('Уведомления')} onClick={() => setNotifOpen(o => !o)} />
      </div>
      <NotificationPopup open={notifOpen} anchorRef={bellRef} onClose={() => setNotifOpen(false)} />
    </div>
  )

  return (
    <>
      <MobileScreen topZone={topZone} topPad={72}>
        <div className="flex flex-col" style={{ gap: 14 }}>
          {/* Hero — Продолжить */}
          {continueInfo ? (
            <HeroContinue lesson={continueInfo.lesson} subjectName={continueInfo.subject.name} progress={continueInfo.subject.progress} onContinue={() => openLesson(continueInfo.lesson.id)} />
          ) : (
            <div className="flex flex-col items-center justify-center text-center" style={{ gap: 8, padding: '40px 16px', borderRadius: 22, background: 'var(--color-bg-3)' }}>
              <Lock size={22} style={{ color: 'var(--color-muted)' }} />
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>{t('Курс ещё не открыт')}</p>
              <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>{t('Преподаватель скоро добавит уроки')}</p>
            </div>
          )}

          {/* Статистика — компактная полоса, всегда на виду */}
          <div className="flex" style={{ gap: 8 }}>
            {homeStats.map((s, i) => (
              <MiniStat key={i} icon={s.icon} value={s.value} label={s.label} pair={s.pair} />
            ))}
          </div>

          {/* Сегодня */}
          {todayLessons.length > 0 && (
            <div style={{ borderRadius: 20, background: 'var(--color-surface)', border: '1px solid var(--color-border-glass)', boxShadow: 'var(--shadow-sm)', padding: 14 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text)' }}>{t('Сегодня')}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-accent)' }}>{todayLessons.length} {t('занятия')}</span>
              </div>
              <div className="flex flex-col">
                {todayLessons.map((l, i) => (
                  <button
                    key={l.id}
                    onClick={() => { tactile(); openCourses() }}
                    className="flex items-center text-left"
                    style={{ gap: 10, padding: '9px 0', borderTop: i === 0 ? 'none' : '1px solid var(--color-border-soft)', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-accent)', minWidth: 44 }}>{l.time}</span>
                    <span className="flex-1 min-w-0 truncate" style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{l.lessonTitle}</span>
                    <ChevronRight size={16} style={{ color: 'var(--color-text-4)', flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Домашнее задание */}
          <PendingHWCard subjects={scanSubjects} onOpenHW={() => setActivePage('homework')} />

          {/* Быстрые действия */}
          <div className="flex" style={{ gap: 12 }}>
            <QuickTile icon={<Dumbbell size={20} />} title={t('Тренажёр')} sub={t('Решай задания')} bg="var(--color-green-soft)" fg="var(--color-green-text)" onClick={() => setActivePage('trainer')} />
            <QuickTile icon={<BookOpen size={20} />} title={t('Курс')} sub={t('Уроки и путь')} bg="var(--color-purple-soft)" fg="var(--color-purple-text)" onClick={() => openCourses()} />
          </div>

          {/* Виджеты дня */}
          {(quizQuestions.length > 0 || scienceFacts.length > 0 || scienceMemes.length > 0) && (
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Виджеты дня')}</p>
              <div style={{ marginLeft: -16, marginRight: -16 }}>
                <MobileHScroll padX={16} gap={10}>
                  {quizQuestions[0] && (
                    <WidgetCard
                      tag={t('Вопрос дня')} icon={<HelpCircle size={15} />}
                      accent="var(--color-purple-text)" bg="var(--color-purple-soft)"
                      text={quizQuestions[0].title}
                    />
                  )}
                  {scienceFacts[0] && (
                    <WidgetCard
                      tag={t('Факт дня')} icon={<Atom size={15} />}
                      accent="var(--color-green-text)" bg="var(--color-green-soft)"
                      text={scienceFacts[0].text}
                    />
                  )}
                  {scienceMemes[0] && (
                    <WidgetCard
                      tag={t('Мем дня')} icon={<Star size={15} />}
                      accent="#B07A00" bg="var(--color-yellow-soft)"
                      text={scienceMemes[0].setup}
                    />
                  )}
                </MobileHScroll>
              </div>
            </div>
          )}
        </div>
      </MobileScreen>

      {/* В2 — course scope switcher (only with 2–4 courses) */}
      {multiCourse && (
        <MobileDock>
          <DockSegment
            options={[{ id: '__all__', label: t('Все') }, ...subjects.map(s => ({ id: s.id, label: s.name }))]}
            value={scopedSubject?.id ?? '__all__'}
            onChange={id => setHomeSubjectId(id === '__all__' ? null : id)}
          />
        </MobileDock>
      )}

      <MobileBottomNav />
    </>
  )
}

function MiniStat({ icon: Icon, value, label, pair }: { icon: LucideIcon; value: string | number; label: string; pair: { bg: string; text: string } }) {
  return (
    <div style={{ flex: 1, minWidth: 0, borderRadius: 14, padding: '10px 10px', background: pair.bg, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Icon size={15} style={{ color: pair.text }} />
      <div style={{ fontSize: 16, fontWeight: 800, color: pair.text, lineHeight: 1, marginTop: 2 }}>{value}</div>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: pair.text, opacity: 0.82 }}>{label}</div>
    </div>
  )
}

function HeroContinue({ lesson, subjectName, progress, onContinue }: { lesson: Lesson; subjectName: string; progress: number; onContinue: () => void }) {
  const t = useT()
  const status = getDisplayLessonStatus(lesson)
  const label = status === 'current' ? t('Продолжить') : t('Начать')
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      style={{ borderRadius: 24, padding: 18, color: '#fff', background: 'linear-gradient(135deg, #9B6FE8, #6F3FBF)', boxShadow: '0 12px 28px rgba(123,63,204,0.35)' }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label} · {subjectName}
      </div>
      <div style={{
        fontSize: 18, fontWeight: 800, margin: '7px 0 14px', lineHeight: 1.2,
        // Always reserve two lines so the hero keeps a constant height whether
        // the title fits on one line or wraps to two; longer titles clamp at 2.
        minHeight: '2.4em',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {t('Занятие')} #{lesson.number} · {lesson.title}
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.25)', borderRadius: 99, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ width: `${Math.max(4, progress)}%`, height: '100%', background: '#fff', borderRadius: 99 }} />
      </div>
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 12, opacity: 0.85 }}>{progress}% {t('пройдено')}</span>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => { tactile(); onContinue() }}
          className="flex items-center cursor-pointer"
          style={{ gap: 6, background: '#fff', color: '#7B3FCC', fontWeight: 800, fontSize: 13, padding: '9px 18px', borderRadius: 999, border: 'none' }}
        >
          <Play size={15} fill="#7B3FCC" />
          {label}
        </motion.button>
      </div>
    </motion.div>
  )
}

function QuickTile({ icon, title, sub, bg, fg, onClick }: { icon: React.ReactNode; title: string; sub: string; bg: string; fg: string; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={() => { tactile(); onClick() }}
      className="flex flex-col text-left cursor-pointer"
      style={{ flex: 1, minWidth: 0, gap: 4, padding: 14, borderRadius: 18, background: bg, border: 'none' }}
    >
      <span style={{ color: fg }}>{icon}</span>
      <span style={{ fontSize: 14, fontWeight: 800, color: fg, marginTop: 4 }}>{title}</span>
      <span style={{ fontSize: 11, fontWeight: 500, color: fg, opacity: 0.8 }}>{sub}</span>
    </motion.button>
  )
}

import type { Subject } from '../data/mockData'

function PendingHWCard({ subjects, onOpenHW }: { subjects: Subject[]; onOpenHW: () => void }) {
  const t = useT()
  const pending = subjects.flatMap(s =>
    s.modules.flatMap(m => m.lessons
      .filter(l => l.status === 'current' || l.status === 'returned')
      .map(l => ({ lesson: l, subjectName: s.name }))
    )
  )
  if (pending.length === 0) return null
  const first = pending[0]
  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      onClick={() => { tactile(); onOpenHW() }}
      className="flex items-center text-left cursor-pointer"
      style={{
        gap: 12, padding: '12px 14px', borderRadius: 18, border: '1px solid rgba(248,200,50,0.3)', width: '100%',
        background: 'var(--color-yellow-soft)',
      }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(248,162,59,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <ClipboardList size={20} style={{ color: '#B07A00' }} />
      </div>
      <div className="flex-1 min-w-0">
        <div style={{ fontSize: 12, fontWeight: 700, color: '#B07A00', marginBottom: 2 }}>{t('Домашнее задание')}</div>
        <div className="truncate" style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
          {first.lesson.title} · {first.subjectName}
        </div>
        {pending.length > 1 && (
          <div style={{ fontSize: 11, color: '#B07A00', marginTop: 2 }}>+{pending.length - 1} {t('ещё')}</div>
        )}
      </div>
      <ChevronRight size={16} style={{ color: '#B07A00', flexShrink: 0 }} />
    </motion.button>
  )
}

function WidgetCard({ tag, icon, accent, bg, text }: { tag: string; icon: React.ReactNode; accent: string; bg: string; text: string }) {
  return (
    <div style={{
      width: 150, flexShrink: 0, padding: 14, borderRadius: 18,
      background: bg, border: '1px solid transparent',
    }}>
      <div className="flex items-center" style={{ gap: 5, marginBottom: 7, color: accent }}>
        {icon}
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{tag}</span>
      </div>
      <p style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--color-text)', margin: 0, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {text}
      </p>
    </div>
  )
}
