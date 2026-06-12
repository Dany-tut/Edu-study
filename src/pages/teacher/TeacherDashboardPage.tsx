import { motion, AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import TeacherTopBar from '../../components/teacher/TeacherTopBar'
import TeacherHome from './TeacherHome'
import TeacherGroupsPage from './TeacherGroupsPage'
import TeacherHomeworkPage from './TeacherHomeworkPage'
import TeacherGradebookPage from './TeacherGradebookPage'
import TeacherConstructorPage from './TeacherConstructorPage'
import TeacherHomeworkCreatePage from './TeacherHomeworkCreatePage'
import TeacherHomeworkReviewPage from './TeacherHomeworkReviewPage'
import TeacherLessonEditorPage from './TeacherLessonEditorPage'
import TeacherCompactPill from '../../components/teacher/TeacherCompactPill'
import ReviewNavPill from '../../components/teacher/ReviewNavPill'
import { useTeacher } from '../../store/teacherStore'

const TEACHER_HASH_TO_PAGE: Record<string, 'home' | 'groups' | 'homework' | 'gradebook' | 'constructor'> = {
  '#/teacher':             'home',
  '#/teacher/groups':      'groups',
  '#/teacher/homework':    'homework',
  '#/teacher/gradebook':   'gradebook',
  '#/teacher/constructor': 'constructor',
}
const TEACHER_PAGE_TO_HASH: Record<string, string> = {
  home:        '#/teacher',
  groups:      '#/teacher/groups',
  homework:    '#/teacher/homework',
  gradebook:   '#/teacher/gradebook',
  constructor: '#/teacher/constructor',
}

export default function TeacherDashboardPage() {
  const activePage = useTeacher(s => s.activePage)
  const setActivePage = useTeacher(s => s.setActivePage)
  const headerDocked = useTeacher(s => s.headerDocked)

  // Restore page from hash on mount
  useEffect(() => {
    const page = TEACHER_HASH_TO_PAGE[window.location.hash]
    setActivePage(page ?? 'home')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync hash when activePage changes (only for persistent pages)
  useEffect(() => {
    const hash = TEACHER_PAGE_TO_HASH[activePage]
    if (hash && window.location.hash !== hash) {
      window.history.replaceState(null, '', hash)
    }
  }, [activePage])

  return (
    <div className="dashboard-root hidden lg:flex">
      {/* Progressive blur strip behind topbar */}
      <div aria-hidden className="edge-progressive-blur--top" />

      {/* Topbar row — 3-col grid: empty | topbar (always centered) | widget */}
      <div className="topbar-row">
        {/* Left spacer */}
        <div />

        {/* Topbar — always in center column */}
        <div style={{ display: 'inline-flex', pointerEvents: 'auto' }}>
          <TeacherTopBar />
        </div>

        {/* Right column — widget appears/disappears independently */}
        <div style={{ display: 'flex', alignItems: 'flex-start', paddingLeft: 10, pointerEvents: 'none' }}>
          <AnimatePresence>
            {activePage !== 'lesson-editor' && activePage !== 'constructor' && !headerDocked && (
              <motion.div
                key="top-right-slot"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: [0, -5, 3, -2, 1, 0] }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.38, ease: [0.34, 1.56, 0.64, 1] }}
                style={{ pointerEvents: 'auto' }}
              >
                {activePage === 'homework-review'
                  ? <ReviewNavPill />
                  : <TeacherCompactPill />
                }
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Page content */}
      <AnimatePresence mode="sync">
        <motion.div
          key={activePage}
          initial={false}
          className="teacher-scroll-root"
          // Pages whose scroll pane lifts up under the topbar (marginTop:-100 +
          // paddingTop:100 — the progressive-blur recipe) must not be clipped
          // by this wrapper, so their overflow stays visible.
          style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: ['lesson-editor', 'constructor', 'gradebook', 'homework', 'homework-create', 'homework-review'].includes(activePage) ? 'visible' : 'hidden' }}
        >
          {activePage === 'home'            && <TeacherHome />}
          {activePage === 'groups'          && <TeacherGroupsPage />}
          {activePage === 'homework'        && <TeacherHomeworkPage />}
          {activePage === 'homework-create' && <TeacherHomeworkCreatePage />}
          {activePage === 'homework-review' && <TeacherHomeworkReviewPage />}
          {activePage === 'lesson-editor'   && <TeacherLessonEditorPage />}
          {activePage === 'gradebook'       && <TeacherGradebookPage />}
          {activePage === 'constructor'     && <TeacherConstructorPage />}
        </motion.div>
      </AnimatePresence>

      {/* Mobile stub */}
      <div className="lg:hidden" style={{ display: 'none' }} />
    </div>
  )
}
