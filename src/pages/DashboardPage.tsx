import Sidebar from '../components/Sidebar'
import ScheduleCarousel from '../components/ScheduleCarousel'
import WidgetCarousel from '../components/WidgetCarousel'
import CompactWidgetPill from '../components/CompactWidgetPill'
import CourseTrack from '../components/CourseTrack'
import MobileBottomNav from '../components/MobileBottomNav'
import LessonStatusCard from '../components/LessonStatusCard'
import CoursesPage from './CoursesPage'
import LessonPage from './LessonPage'
import TaskBankPage from './TaskBankPage'
import HomeworkFlow from '../components/HomeworkFlow'
import AnswerFlightLayer from '../components/AnswerFlightLayer'
import { useDashboard } from '../store/dashboardStore'
import { LayoutGroup, motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { findLessonById, getLessonDetail } from '../data/lessonContent'

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isDesktop
}

export default function DashboardPage() {
  const isDesktop = useIsDesktop()
  const trackPopoverOpen = useDashboard(s => s.trackPopoverOpen)
  const activePage = useDashboard(s => s.activePage)
  const currentLessonId = useDashboard(s => s.currentLessonId)
  const setLessonScrolled = useDashboard(s => s.setLessonScrolled)
  const closeHomework = useDashboard(s => s.closeHomework)
  const lesson = currentLessonId ? findLessonById(currentLessonId) : null
  const homework = lesson ? getLessonDetail(lesson).homework : null

  // Sidebar is centered in the topbar via flex; the mini widget pill is
  // overlaid absolutely beside it so its presence never shifts the sidebar.
  // We rAF-poll the sidebar's right edge and write directly to the pill
  // wrapper's style — avoiding React re-renders that would trip the inner
  // motion.div's layoutId animation into re-projecting its transform.
  const sidebarWrapRef = useRef<HTMLDivElement>(null)
  const pillWrapRef = useRef<HTMLDivElement>(null)
  const [pillMounted, setPillMounted] = useState(false)
  useEffect(() => {
    let raf = 0
    let last = -1
    const tick = () => {
      const el = sidebarWrapRef.current
      const parent = el?.parentElement
      const pill = pillWrapRef.current
      if (el && parent) {
        const sb = el.getBoundingClientRect()
        const row = parent.getBoundingClientRect()
        const next = Math.round(sb.right - row.left)
        if (next !== last) {
          last = next
          if (pill) pill.style.left = next + 20 + 'px'
          if (!pillMounted) setPillMounted(true)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [pillMounted])

  return (
    <>
      <AnswerFlightLayer />
      {/* Desktop no-scroll layout */}
      <LayoutGroup>
      <div className="dashboard-root" style={{ display: isDesktop ? 'flex' : 'none' }}>
        {/* Full-width progressive blur+fade strip pinned to the top, behind the
            floating topbar pill — content scrolls up under a soft blurred band. */}
        <div aria-hidden className="edge-progressive-blur--top" />

        {/* Top bar — Sidebar pill is centered; on non-home pages the widget
            carousel collapses into a pill that flies up beside the topbar. */}
        <div className="topbar-row">
          {/* `.topbar-row` is pointer-events:none so clicks fall through its
              empty area to the docked lesson pills; the interactive wrappers
              must explicitly re-enable pointer events or the bar goes dead. */}
          <div ref={sidebarWrapRef} style={{ display: 'inline-flex', pointerEvents: 'auto' }}>
            <Sidebar />
          </div>
          <div
            id="widget-pill-target"
            ref={pillWrapRef}
            style={{
              position: 'absolute',
              left: 0,
              top: 20,
              zIndex: 70,
              pointerEvents: 'auto',
              visibility: pillMounted ? 'visible' : 'hidden',
            }}
          >
            <AnimatePresence>
              {activePage !== 'home' && (
                <motion.div
                  key="compact-widget-pill"
                  // Plain fade+slide entrance — the previous layoutId-shared
                  // morph from the big WidgetCarousel got stuck mid-FLIP when
                  // the pill's internal expand/collapse changed its size, so
                  // we drop the shared layout in favour of a self-contained
                  // entrance that doesn't fight the expand animation.
                  initial={{ opacity: 0, y: -10, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                >
                  <CompactWidgetPill />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {activePage === 'home' ? (
          <>
            {/* Row 1: Schedule — pill + 4-card carousel */}
            <section className="dashboard-schedule">
              <ScheduleCarousel />
            </section>

            {/* Full-width content below */}
            <main className="dashboard-main">
              {/* Row 2: Widget carousel (stats / science facts / focus timer). */}
              <section style={{ flexShrink: 0, position: 'relative', zIndex: 20 }}>
                <WidgetCarousel />
              </section>

              {/* Row 3: Course track — natural height, no flex-grow */}
              <section style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: trackPopoverOpen ? 30 : 5 }}>
                <CourseTrack />
              </section>
            </main>
          </>
        ) : activePage === 'lesson' ? (
          /* Single lesson — player + materials (screen 2). The page
             extends past the viewport (homework levels, transcript, etc.),
             so we override the dashboard's no-scroll layout and let this
             pane scroll vertically on its own. */
          <main
            className="dashboard-main"
            onScroll={e => setLessonScrolled((e.currentTarget as HTMLElement).scrollTop > 64)}
            style={{
              overflowY: 'auto',
              minHeight: 0,
              // Extend the scroll pane up to the very top (cancel the root's
              // 100px topbar reservation), then re-inset content with an equal
              // padding so it still starts below the topbar — but now scrolls
              // UP under the floating topbar + progressive-blur strip.
              marginTop: -100,
              paddingTop: 100,
            }}
          >
            <LessonPage />
          </main>
        ) : activePage === 'homework' && lesson && homework ? (
          /* Homework — mirrors the lesson pane: the page scrolls up under the
             floating topbar + progressive-blur strip, and its Back/title row
             docks onto the topbar line on scroll. */
          <main
            key="homework"
            className="dashboard-main"
            onScroll={e => setLessonScrolled((e.currentTarget as HTMLElement).scrollTop > 64)}
            style={{ overflowY: 'auto', minHeight: 0, marginTop: -100, paddingTop: 100 }}
          >
            <HomeworkFlow
              lessonId={lesson.id}
              lessonTitle={lesson.title}
              subject={lesson.subject}
              homework={homework}
              onBack={closeHomework}
            />
          </main>
        ) : activePage === 'trainer' ? (
          <main
            className="dashboard-main"
            onScroll={e => setLessonScrolled((e.currentTarget as HTMLElement).scrollTop > 64)}
            style={{ overflowY: 'auto', minHeight: 0, marginTop: -100, paddingTop: 100, scrollbarGutter: 'stable' }}
          >
            <TaskBankPage />
          </main>
        ) : (
          /* Courses catalogue (screen 3) */
          <main className="dashboard-main">
            <CoursesPage />
          </main>
        )}
      </div>
      </LayoutGroup>

      {/* Mobile layout (separate, scrollable) */}
      <div style={{ display: isDesktop ? 'none' : 'block', minHeight: '100vh', background: '#F5F5F6', padding: '24px 24px 100px' }}>
        {activePage === 'home' ? (
          <div className="flex flex-col gap-6">
            <ScheduleCarousel />
            <WidgetCarousel />
            <CourseTrack />
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 650, color: '#0B0B0D', marginBottom: 12 }}>Статусы уроков</h2>
              <div className="flex flex-col gap-3">
                {([
                  { status: 'completed', lessonNumber: 23, title: 'Строение атома', points: 68 },
                  { status: 'returned', lessonNumber: 24, title: 'Электролиты', points: 30 },
                  { status: 'unviewed', lessonNumber: 25, title: 'Кислоты и основания' },
                  { status: 'submitted', lessonNumber: 26, title: 'Органические молекулы', points: 60 },
                  { status: 'locked', lessonNumber: 27, title: 'Итоговый экзамен' },
                ] as const).map((c, i) => (
                  <LessonStatusCard key={c.status} {...c} index={i} />
                ))}
              </div>
            </div>
          </div>
        ) : activePage === 'lesson' ? (
          <LessonPage />
        ) : activePage === 'homework' && lesson && homework ? (
          <HomeworkFlow
            lessonId={lesson.id}
            lessonTitle={lesson.title}
            subject={lesson.subject}
            homework={homework}
            onBack={closeHomework}
          />
        ) : (
          <CoursesPage />
        )}
        <MobileBottomNav />
      </div>
    </>
  )
}
