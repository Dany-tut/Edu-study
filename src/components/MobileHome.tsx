import { motion } from 'framer-motion'
import { Calendar, Lock, type LucideIcon } from 'lucide-react'
import MobileScreen from './MobileScreen'
import MobileBottomNav from './MobileBottomNav'
import ScheduleCarousel from './ScheduleCarousel'
import WidgetCarousel from './WidgetCarousel'
import CourseTrack from './CourseTrack'
import LessonStatusCard from './LessonStatusCard'
import { getStudentSession } from '../lib/studentSession'
import { getDisplayLessonStatus } from '../lib/lessonStatus'
import { useStudentData } from '../store/studentDataStore'
import { useDashboard } from '../store/dashboardStore'
import type { LessonStatus } from '../data/mockData'

// MOBILE ONLY home. Desktop keeps its own layout in DashboardPage untouched.
// Top: glass greeting widget (real student name). Content scrolls under it.
// Statuses come from the active subject's real lessons (no hardcoded list).
//
// One-screen rule (§1.1): the heavy desktop carousels (schedule/track) render
// only when they have data; empty accounts get a compact one-line note instead
// of a 198px void, so nothing reads as "broken/empty".

// Statuses worth surfacing on the home hub (skip plain locked/future lessons).
const SURFACED: LessonStatus[] = ['returned', 'submitted', 'current', 'completed']

// Compact empty-state row — replaces the tall placeholder blocks on mobile.
function CompactNote({ icon: Icon, title, sub }: { icon: LucideIcon; title: string; sub: string }) {
  return (
    <div
      className="flex items-center"
      style={{
        gap: 12,
        padding: '14px 16px',
        borderRadius: 16,
        background: 'var(--color-bg-3)',
        border: '1px solid var(--color-border-soft)',
      }}
    >
      <Icon size={20} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
      <div className="min-w-0">
        <div style={{ fontSize: 14, fontWeight: 650, color: 'var(--color-text)', lineHeight: 1.2 }}>{title}</div>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--color-muted)', marginTop: 2, lineHeight: 1.2 }}>{sub}</div>
      </div>
    </div>
  )
}

function Greeting() {
  const name = getStudentSession()?.name?.trim().split(/\s+/)[0] || 'Ученик'
  const initial = name.charAt(0).toUpperCase()
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center"
      style={{
        gap: 12,
        borderRadius: 20,
        // Opaque surface + lift so the card reads clearly on a light page bg
        // (translucent glass was invisible white-on-white in light theme).
        background: 'var(--color-surface)',
        backdropFilter: 'blur(18px) saturate(180%)',
        WebkitBackdropFilter: 'blur(18px) saturate(180%)',
        border: '1px solid var(--color-border-glass)',
        boxShadow: 'var(--shadow-md)',
        padding: '12px 16px',
      }}
    >
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 40, height: 40, borderRadius: 999,
          background: 'var(--color-accent)', color: '#fff',
          fontSize: 18, fontWeight: 700,
        }}
      >
        {initial}
      </div>
      <div className="min-w-0">
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.1 }}>
          Привет, {name} 👋
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-muted)', marginTop: 2 }}>
          Готов учиться сегодня?
        </div>
      </div>
    </motion.div>
  )
}

export default function MobileHome() {
  const subjects = useStudentData(s => s.subjects)
  const scheduleDays = useStudentData(s => s.scheduleDays)
  const activeSubjectId = useDashboard(s => s.activeSubjectId)

  const subject = subjects.find(s => s.id === activeSubjectId) ?? subjects[0]
  const allLessons = subject ? subject.modules.flatMap(m => m.lessons) : []
  const hasSchedule = scheduleDays.length > 0
  const hasCourses = subjects.length > 0

  // Real, recent, actionable lessons → status cards. Newest first, max 4.
  const statusCards = allLessons
    .map(l => ({ lesson: l, status: getDisplayLessonStatus(l) }))
    .filter(({ status }) => SURFACED.includes(status))
    .slice(-4)
    .reverse()

  return (
    <>
      <MobileScreen topZone={<Greeting />}>
        <div className="flex flex-col" style={{ gap: 16 }}>
          {/* Schedule — compact note when empty, real carousel when there's data */}
          {hasSchedule ? (
            <ScheduleCarousel />
          ) : (
            <CompactNote icon={Calendar} title="Расписание не добавлено" sub="Появится, когда преподаватель добавит уроки" />
          )}

          {/* One widget per screen, full width */}
          <WidgetCarousel columnsOverride={1} />

          {/* Course track + statuses — only when the student has a course */}
          {hasCourses ? (
            <>
              <CourseTrack />
              {statusCards.length > 0 && (
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 650, color: 'var(--color-text)', marginBottom: 10 }}>
                    Статусы уроков
                  </h2>
                  <div className="flex flex-col" style={{ gap: 12 }}>
                    {statusCards.map(({ lesson, status }, i) => (
                      <LessonStatusCard
                        key={lesson.id}
                        status={status}
                        title={lesson.title}
                        lessonNumber={lesson.number + 1}
                        points={status === 'completed' || status === 'submitted' ? lesson.points : undefined}
                        index={i}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <CompactNote icon={Lock} title="Курсы ещё не добавлены" sub="Преподаватель откроет доступ к урокам" />
          )}
        </div>
      </MobileScreen>
      <MobileBottomNav />
    </>
  )
}
