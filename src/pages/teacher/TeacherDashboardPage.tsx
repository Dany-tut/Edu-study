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

export default function TeacherDashboardPage() {
  const activePage = useTeacher(s => s.activePage)
  const setActivePage = useTeacher(s => s.setActivePage)
  const headerDocked = useTeacher(s => s.headerDocked)

  // Always start at home when entering the teacher view
  useEffect(() => { setActivePage('home') }, [])

  return (
    <div className="dashboard-root hidden lg:flex">
      {/* Progressive blur strip behind topbar */}
      <div aria-hidden className="edge-progressive-blur--top" />

      {/* Topbar row — topbar centered, widget pinned right */}
      <div className="topbar-row">
        {/* Topbar centered */}
        <div style={{ display: 'inline-flex', pointerEvents: 'auto' }}>
          <TeacherTopBar />
        </div>

        {/* Top-right slot — review nav on review page, compact pill elsewhere.
            Yields (fades out) while a page's docked twin header occupies the
            topbar line, so its right-side controls aren't covered. */}
        <AnimatePresence>
          {activePage !== 'lesson-editor' && activePage !== 'constructor' && !headerDocked && (
            <motion.div
              key="top-right-slot"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: 'absolute', right: 32, top: 20,
                pointerEvents: 'auto',
              }}
            >
              {activePage === 'homework-review'
                ? <ReviewNavPill />
                : <TeacherCompactPill />
              }
            </motion.div>
          )}
        </AnimatePresence>
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
