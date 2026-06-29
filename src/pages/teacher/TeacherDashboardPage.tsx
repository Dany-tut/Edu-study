import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import TeacherTopBar from '../../components/teacher/TeacherTopBar'
import NotificationToastContainer from '../../components/NotificationToast'
import { useNotificationsInit } from '../../lib/notificationsSync'
import { supabase } from '../../lib/supabase'
import TeacherHome from './TeacherHome'
import TeacherGroupsPage from './TeacherGroupsPage'
import TeacherHomeworkPage from './TeacherHomeworkPage'
import TeacherGradebookPage from './TeacherGradebookPage'
import TeacherConstructorPage from './TeacherConstructorPage'
import TeacherHomeworkCreatePage from './TeacherHomeworkCreatePage'
import TeacherHomeworkReviewPage from './TeacherHomeworkReviewPage'
import TeacherHardReviewPage from './TeacherHardReviewPage'
import TeacherLessonEditorPage from './TeacherLessonEditorPage'
import TeacherCompactPill from '../../components/teacher/TeacherCompactPill'
import ReviewNavPill from '../../components/teacher/ReviewNavPill'
import TeacherStudentDashboardPage from './TeacherStudentDashboardPage'
import TeacherCourseEditorPage from './TeacherCourseEditorPage'
import TeacherStoragePage from './TeacherStoragePage'
import TeacherAdminPage from './TeacherAdminPage'
import TeacherProfileSettingsPage from './TeacherProfileSettingsPage'
import TeacherPaymentPage from './TeacherPaymentPage'
import TeacherFinancesPage from './TeacherFinancesPage'
import MobileTeacherApp from '../../components/teacher/mobile/MobileTeacherApp'
import DeskSwitcher from '../../components/teacher/DeskSwitcher'
import DeskCanvas from '../../components/teacher/DeskCanvas'
import WidgetLibraryModal from '../../components/teacher/WidgetLibraryModal'
import { useIsDesktop } from '../../lib/useIsDesktop'
import { useTeacher } from '../../store/teacherStore'
import { useDeskStore } from '../../store/deskStore'
import { useDeskLayouts } from '../../lib/useDeskLayouts'

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
  const isDesktop = useIsDesktop()
  const editMode = useDeskStore(s => s.editMode)
  const showWidgetLibrary = useDeskStore(s => s.showWidgetLibrary)
  const setShowWidgetLibrary = useDeskStore(s => s.setShowWidgetLibrary)
  const {
    config, activeDesk,
    setActiveDesk, addDesk, resetDesk,
    updateDeskItems, addWidget, removeWidget,
  } = useDeskLayouts()

  // Teacher is identified by their Supabase auth user id (matches notifications.recipient_id).
  const [teacherId, setTeacherId] = useState<string | null>(null)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setTeacherId(data.user?.id ?? null))
  }, [])
  useNotificationsInit(teacherId)

  // Restore page from hash on mount — but if the store already opened straight
  // into the course editor (restored from a persisted edit session on refresh),
  // keep that so the teacher lands back where they were.
  useEffect(() => {
    if (useTeacher.getState().activePage === 'course-editor') return
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
    <>
    {/* Desktop surfaces live notifications inside TeacherCompactPill (top-right),
        so the standalone toast is only needed on the mobile layout. */}
    {!isDesktop && <NotificationToastContainer />}
    <div className="dashboard-root hidden lg:flex" style={{ display: isDesktop ? 'flex' : 'none', position: 'relative' }}>
      {/* Progressive blur+fade strip behind the floating topbar — masks content
          scrolling up through the gaps around the pills. */}
      <div aria-hidden className="edge-progressive-blur--top" />

      {/* Desk switcher — dots below topbar that expand to named pill on hover;
          only shows on the home page when not in edit mode (edit bar takes over). */}
      {activePage === 'home' && (
        <DeskSwitcher
          config={config}
          onSetActive={setActiveDesk}
          onAddDesk={() => addDesk('Стол ' + (config.desks.length + 1))}
          onResetDesk={resetDesk}
        />
      )}

      {/* Widget library modal */}
      {showWidgetLibrary && (
        <WidgetLibraryModal
          onClose={() => setShowWidgetLibrary(false)}
          onAdd={item => addWidget(activeDesk.id, item)}
          existingTypes={activeDesk.items.map(i => i.type)}
        />
      )}

      {/* Topbar row — 3-col grid: empty | topbar (always centered) | widget */}
      <div className="topbar-row" style={{ visibility: editMode ? 'hidden' : 'visible', pointerEvents: editMode ? 'none' : 'auto' }}>
        {/* Left spacer */}
        <div />

        {/* Topbar — always in center column */}
        <div style={{ display: 'inline-flex', pointerEvents: 'auto' }}>
          <TeacherTopBar />
        </div>

        {/* Right column — widget appears/disappears independently */}
        <div style={{ display: 'flex', alignItems: 'flex-start', paddingLeft: 10, pointerEvents: 'none' }}>
          <AnimatePresence>
            {activePage !== 'lesson-editor' && activePage !== 'constructor' && activePage !== 'course-editor' && activePage !== 'student' && !headerDocked && (
              <motion.div
                key="top-right-slot"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: [0, -7, 4, -2, 0.8, 0] }}
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
          style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: ['home', 'lesson-editor', 'constructor', 'course-editor', 'gradebook', 'homework', 'homework-create', 'homework-review', 'hard-review', 'student', 'groups'].includes(activePage) ? 'visible' : 'hidden' }}
        >
          {activePage === 'home' && (
            editMode || activeDesk.id !== 'today'
              ? <DeskCanvas
                  desk={activeDesk}
                  onUpdateItems={items => updateDeskItems(activeDesk.id, items)}
                  onAddWidget={() => setShowWidgetLibrary(true)}
                  onRemoveWidget={id => removeWidget(activeDesk.id, id)}
                />
              : <TeacherHome />
          )}
          {activePage === 'groups'          && <TeacherGroupsPage />}
          {activePage === 'homework'        && <TeacherHomeworkPage />}
          {activePage === 'homework-create' && <TeacherHomeworkCreatePage />}
          {activePage === 'homework-review' && <TeacherHomeworkReviewPage />}
          {activePage === 'hard-review'     && <TeacherHardReviewPage />}
          {activePage === 'lesson-editor'   && <TeacherLessonEditorPage />}
          {activePage === 'gradebook'       && <TeacherGradebookPage />}
          {activePage === 'constructor'     && <TeacherConstructorPage />}
          {activePage === 'course-editor'   && <TeacherCourseEditorPage />}
          {activePage === 'student'         && <TeacherStudentDashboardPage />}
          {activePage === 'storage'          && <TeacherStoragePage />}
          {activePage === 'admin'            && <TeacherAdminPage />}
          {activePage === 'profile-settings' && <TeacherProfileSettingsPage />}
          {activePage === 'payment'          && <TeacherPaymentPage />}
          {activePage === 'finances'         && <TeacherFinancesPage />}
        </motion.div>
      </AnimatePresence>

    </div>

    {/* Mobile teacher app — fully separate layout, mounted only below lg. */}
    {!isDesktop && <MobileTeacherApp />}
    </>
  )
}
