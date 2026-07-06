import { motion, AnimatePresence } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
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
import { useTeacher, HASH_TO_PAGE, PAGE_TO_HASH } from '../../store/teacherStore'
import { useDeskStore } from '../../store/deskStore'
import { useDeskLayouts } from '../../lib/useDeskLayouts'
import { useTeacherAccess, TEACHER_TABS } from '../../lib/teacherAccess'

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

  // Per-teacher access (admin-configured). Load once; gate nav + widgets.
  const accessLoaded = useTeacherAccess(s => s.loaded)
  const hiddenWidgets = useTeacherAccess(s => s.hiddenWidgets)
  const canPage = useTeacherAccess(s => s.canPage)
  const canTab = useTeacherAccess(s => s.canTab)
  useEffect(() => { useTeacherAccess.getState().load() }, [])

  // Hydrate the teacher's own "Мои задачи" from the DB (per-owner, RLS-scoped).
  useEffect(() => { useTeacher.getState().loadTasks() }, [])

  // If the active page belongs to a tab the admin revoked, bounce to the first
  // allowed tab (or profile settings if everything is hidden).
  useEffect(() => {
    if (!accessLoaded) return
    if (canPage(activePage)) return
    const firstTab = TEACHER_TABS.find(t => canTab(t.id))
    setActivePage(firstTab ? firstTab.id : 'profile-settings')
  }, [accessLoaded, activePage, canPage, canTab, setActivePage])

  // The store hydrates activePage on load (from the per-tab nav snapshot, then the
  // URL hash), so we don't reset it on mount anymore — that would clobber pages
  // with no hash of their own (admin, a student dashboard, …). We only listen for
  // browser back/forward, which fires `hashchange` for the mapped standalone pages.
  useEffect(() => {
    const onHashChange = () => {
      const page = HASH_TO_PAGE[window.location.hash]
      if (page) setActivePage(page)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync the URL hash when activePage changes (standalone pages only). Context-heavy
  // sub-pages have no hash — their restore is handled by the nav snapshot in the store.
  useEffect(() => {
    const hash = PAGE_TO_HASH[activePage]
    if (hash && window.location.hash !== hash) {
      window.history.replaceState(null, '', hash)
    }
  }, [activePage])

  // Horizontal wheel / trackpad swipe switches desks (Сегодня → Финансы → Ученики …).
  // Only a dominantly-horizontal gesture counts, so vertical scrolling of widgets is
  // untouched. A cooldown keeps one flick from skipping several desks at once.
  const wheelCooldown = useRef(false)
  const handleDeskWheel = useCallback((e: React.WheelEvent) => {
    if (editMode) return
    const { deltaX, deltaY } = e
    if (Math.abs(deltaX) <= Math.abs(deltaY) || Math.abs(deltaX) < 24) return
    if (wheelCooldown.current) return
    const desks = config.desks
    const cur = desks.findIndex(d => d.id === activeDesk.id)
    if (cur < 0) return
    const next = deltaX > 0 ? cur + 1 : cur - 1
    if (next < 0 || next >= desks.length) return
    wheelCooldown.current = true
    setActiveDesk(desks[next].id)
    setTimeout(() => { wheelCooldown.current = false }, 450)
  }, [editMode, config.desks, activeDesk.id, setActiveDesk])

  return (
    <>
    {/* Desktop surfaces live notifications inside TeacherCompactPill (top-right),
        so the standalone toast is only needed on the mobile layout. */}
    {!isDesktop && <NotificationToastContainer />}
    <div className="dashboard-root hidden lg:flex" style={{ display: isDesktop ? 'flex' : 'none', position: 'relative' }}>
      {/* Progressive blur+fade strip behind the floating topbar — masks content
          scrolling up through the gaps around the pills. */}
      {!editMode && <div aria-hidden className="edge-progressive-blur--top" />}

      {/* Desk switcher — dots below topbar that expand to named pill on hover;
          only shows on the home page when not in edit mode (edit bar takes over). */}
      {activePage === 'home' && (
        <DeskSwitcher
          config={config}
          onSetActive={setActiveDesk}
          onAddDesk={() => addDesk('Стол ' + (config.desks.length + 1))}
          onResetDesk={resetDesk}
          onAddWidget={() => setShowWidgetLibrary(true)}
        />
      )}

      {/* Widget library modal */}
      {showWidgetLibrary && (
        <WidgetLibraryModal
          onClose={() => setShowWidgetLibrary(false)}
          onAdd={item => addWidget(activeDesk.id, item)}
          existingTypes={activeDesk.items.map(i => i.type)}
          hiddenWidgets={hiddenWidgets}
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
        <div style={{ display: 'flex', alignItems: 'center', alignSelf: 'center', paddingLeft: 10, pointerEvents: 'none' }}>
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
          style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: ['home', 'lesson-editor', 'constructor', 'course-editor', 'gradebook', 'homework', 'homework-create', 'homework-review', 'hard-review', 'student', 'groups', 'admin'].includes(activePage) ? 'visible' : 'hidden' }}
        >
          {activePage === 'home' && (
            <div onWheel={handleDeskWheel} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <DeskCanvas
                desk={activeDesk}
                onUpdateItems={items => updateDeskItems(activeDesk.id, items)}
                onAddWidget={() => setShowWidgetLibrary(true)}
                onRemoveWidget={id => removeWidget(activeDesk.id, id)}
                hiddenWidgets={hiddenWidgets}
              />
            </div>
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
