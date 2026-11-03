import { motion, AnimatePresence } from 'framer-motion'
import { studentIdFromTeacherHash, teacherStudentHash } from '../../lib/teacherStudentRoute'
import { isWidgetReviewRoute } from '../../lib/widgetReviewRoute'
import TeacherSubjectsPrompt from '../../components/teacher/TeacherSubjectsPrompt'
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useDesktopFriends } from '../../lib/desktopFriends'
import TeacherTopBar from '../../components/teacher/TeacherTopBar'
import NotificationToastContainer from '../../components/NotificationToast'
import { useNotificationsInit } from '../../lib/notificationsSync'
import { retryImport } from '../../lib/chunkError'
const TeacherGroupsPage = lazy(() => retryImport(() => import('./TeacherGroupsPage')))
const TeacherHomeworkPage = lazy(() => retryImport(() => import('./TeacherHomeworkPage')))
const TeacherGradebookPage = lazy(() => retryImport(() => import('./TeacherGradebookPage')))
const TeacherConstructorPage = lazy(() => retryImport(() => import('./TeacherConstructorPage')))
const TeacherHomeworkCreatePage = lazy(() => retryImport(() => import('./TeacherHomeworkCreatePage')))
const TeacherHomeworkReviewPage = lazy(() => retryImport(() => import('./TeacherHomeworkReviewPage')))
const TeacherHardReviewPage = lazy(() => retryImport(() => import('./TeacherHardReviewPage')))
const TeacherLessonEditorPage = lazy(() => retryImport(() => import('./TeacherLessonEditorPage')))
import TeacherCompactPill from '../../components/teacher/TeacherCompactPill'
const TeacherStudentDashboardPage = lazy(() => retryImport(() => import('./TeacherStudentDashboardPage')))
const TeacherCourseEditorPage = lazy(() => retryImport(() => import('./TeacherCourseEditorPage')))
const TeacherCardSetEditorPage = lazy(() => retryImport(() => import('./TeacherCardSetEditorPage')))
const TeacherStoragePage = lazy(() => retryImport(() => import('./TeacherStoragePage')))
const TeacherAdminPage = lazy(() => retryImport(() => import('./TeacherAdminPage')))
const TeacherProfileSettingsPage = lazy(() => retryImport(() => import('./TeacherProfileSettingsPage')))
const TeacherPaymentPage = lazy(() => retryImport(() => import('./TeacherPaymentPage')))
const TeacherFinancesPage = lazy(() => retryImport(() => import('./TeacherFinancesPage')))
const MobileTeacherApp = lazy(() => retryImport(() => import('../../components/teacher/mobile/MobileTeacherApp')))
import DeskSwitcher from '../../components/teacher/DeskSwitcher'
const DeskCanvas = lazy(() => retryImport(() => import('../../components/teacher/DeskCanvas')))
const WidgetSizeReview = lazy(() => retryImport(() => import('../../components/teacher/widgetReview/WidgetSizeReview')))
const WidgetLibraryModal = lazy(() => retryImport(() => import('../../components/teacher/WidgetLibraryModal')))
import { useIsDesktop } from '../../lib/useIsDesktop'
import { useTeacher, HASH_TO_PAGE, PAGE_TO_HASH } from '../../store/teacherStore'
import { useDeskStore } from '../../store/deskStore'
import { type LayoutItem, useDeskLayouts } from '../../lib/useDeskLayouts'
import { useTeacherAccess, TEACHER_TABS } from '../../lib/teacherAccess'
import { useTeacherTz } from '../../lib/teacherTz'
import { useT } from '../../lib/i18n'
import { useTeacherSubjectColors } from '../../lib/teacherSubjectColors'
import { deskWidthForColumns } from '../../lib/deskWidgetSizing'
import { getOwnerId } from '../../lib/owner'

export default function TeacherDashboardPage({ standContent }: { standContent?: React.ReactNode } = {}) {
  const t = useT()
  const sizeReview = isWidgetReviewRoute(window.location)
  // Цвета предметов, выбранные этим учителем: карточки курсов, чипсы и графики
  // читают палитру через реестр, поэтому карту достаточно поставить один раз.
  useTeacherSubjectColors()
  const activePage = useTeacher(s => s.activePage)
  const studentId = useTeacher(s => s.selectedStudentId)
  const setActivePage = useTeacher(s => s.setActivePage)
  const headerDocked = useTeacher(s => s.headerDocked)
  const isDesktop = useIsDesktop()
  const friends = useDesktopFriends(isDesktop)
  // Deep links to tools without a separate mobile screen still open that tool.
  const mobileTool = !isDesktop && ['constructor', 'course-editor', 'lesson-editor', 'cards-editor', 'finances', 'payment', 'admin', 'storage'].includes(activePage)
  const editMode = useDeskStore(s => s.editMode)
  const showWidgetLibrary = useDeskStore(s => s.showWidgetLibrary)
  const setShowWidgetLibrary = useDeskStore(s => s.setShowWidgetLibrary)
  const {
    config, activeDesk, loading: desksLoading,
    setActiveDesk, addDesk, resetDesk,
    updateDeskItems,
  } = useDeskLayouts()

  const [widgetGrid, setWidgetGrid] = useState<{ deskId: string; width: number; items: LayoutItem[]; columns: number } | null>(null)

  // Teacher is identified by their Supabase auth user id (matches notifications.recipient_id).
  const [teacherId, setTeacherId] = useState<string | null>(null)
  useEffect(() => {
    getOwnerId().then(setTeacherId)
  }, [])
  useNotificationsInit(teacherId)

  // Per-teacher access (admin-configured). Load once; gate nav + widgets.
  const isAdministrator = useTeacherAccess(s => s.isAdmin)
  const accessLoaded = useTeacherAccess(s => s.loaded)
  const hiddenWidgets = useTeacherAccess(s => s.hiddenWidgets)
  const canPage = useTeacherAccess(s => s.canPage)
  const canTab = useTeacherAccess(s => s.canTab)
  useEffect(() => { useTeacherAccess.getState().load() }, [])
  useEffect(() => { useTeacherTz.getState().load() }, [])

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

  // A student link also works when the teacher store was initialized on another screen.
  useEffect(() => {
    const onHashChange = () => {
      const id = studentIdFromTeacherHash(window.location.hash)
      if (id) {
        useTeacher.getState().openStudentDashboard(id, null)
        return
      }
      const page = HASH_TO_PAGE[window.location.hash]
      if (page) setActivePage(page)
    }
    if (studentIdFromTeacherHash(window.location.hash)) onHashChange()
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync the URL hash when activePage changes (standalone pages only). Context-heavy
  // sub-pages have no hash — their restore is handled by the nav snapshot in the store.
  useEffect(() => {
    if (sizeReview) return
    const current = useTeacher.getState()
    if (current.activePage !== activePage || current.selectedStudentId !== studentId) return
    const hash = activePage === 'student' && studentId ? teacherStudentHash(studentId)
      : PAGE_TO_HASH[activePage] ?? (studentIdFromTeacherHash(window.location.hash) ? '#/teacher/gradebook' : null)
    if (hash && window.location.hash !== hash) {
      window.history.replaceState(null, '', hash)
    }
  }, [activePage, studentId, sizeReview])

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

  if (sizeReview && accessLoaded && canPage('home')) {
    return <Suspense fallback={<div role="status">{t('Загрузка…')}</div>}><WidgetSizeReview hiddenWidgets={hiddenWidgets} /></Suspense>
  }

  return (
    <>
    {/* Desktop surfaces live notifications inside TeacherCompactPill (top-right),
        so the standalone toast is only needed on the mobile layout. */}
    {!isDesktop && <NotificationToastContainer />}
      {/* Widget library modal */}
      {showWidgetLibrary && (<Suspense fallback={null}>
        <WidgetLibraryModal
          onClose={() => setShowWidgetLibrary(false)}
          onEditDesk={isDesktop && !editMode ? useTeacher.getState().openDeskEditor : undefined}
          onAdd={item => updateDeskItems(activeDesk.id, [...(isDesktop && widgetGrid?.deskId === activeDesk.id ? [...widgetGrid.items, ...activeDesk.items.filter(saved => hiddenWidgets?.includes(saved.type))] : activeDesk.items), item])}
          existingTypes={activeDesk.items.map(i => i.type)}
          existingItems={isDesktop && widgetGrid?.deskId === activeDesk.id ? widgetGrid.items : activeDesk.items}
          gridColumns={activeDesk.columns}
          gridWidth={isDesktop && widgetGrid?.deskId === activeDesk.id ? widgetGrid.width : isDesktop ? undefined : deskWidthForColumns(activeDesk.columns)}
          hiddenWidgets={hiddenWidgets}
        />
      </Suspense>)}

    <TeacherSubjectsPrompt />
    {(isDesktop || mobileTool) && <div inert={showWidgetLibrary} className="dashboard-root teacher-dashboard-root" style={{ display: 'flex', position: 'relative' }}>
      {/* Progressive blur+fade strip behind the floating topbar — masks content
          scrolling up through the gaps around the pills. */}
      {!editMode && <div aria-hidden className="edge-progressive-blur--top" />}

      {/* Desk switcher — dots below topbar that expand to named pill on hover;
          only shows on the home page when not in edit mode (edit bar takes over). */}
      {activePage === 'home' && (
        <DeskSwitcher
          config={config}
          onSetActive={setActiveDesk}
          onAddDesk={() => addDesk(t('Стол') + ' ' + (config.desks.length + 1))}
          onResetDesk={resetDesk}
          onAddWidget={() => setShowWidgetLibrary(true)}
        />
      )}

      {/* Topbar row — 3-col grid: empty | topbar (always centered) | widget */}
      {mobileTool ? <div style={{ position: 'absolute', top: 'max(12px, env(safe-area-inset-top))', left: 16, zIndex: 90 }}>
        <button className="cj-button" style={{ minHeight: 44 }} onClick={() => setActivePage('home')}>{t('На главную')}</button>
      </div> : <div className="topbar-row" style={{ visibility: editMode ? 'hidden' : 'visible' }}>
        {/* Left spacer */}
        <div />

        {/* Topbar — always in center column */}
        <div style={{ display: 'inline-flex', pointerEvents: 'auto' }}>
          <TeacherTopBar friends={friends} />
        </div>

        {/* Right column — widget appears/disappears independently */}
        <div style={{ display: 'flex', alignItems: 'center', alignSelf: 'center', paddingLeft: 10, pointerEvents: 'none' }}>
          <AnimatePresence>
            {activePage !== 'homework-review' && activePage !== 'lesson-editor' && activePage !== 'constructor' && activePage !== 'course-editor' && activePage !== 'cards-editor' && activePage !== 'student' && !headerDocked && (
              <motion.div
                key="top-right-slot"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: [0, -7, 4, -2, 0.8, 0] }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.38, ease: [0.34, 1.56, 0.64, 1] }}
                style={{ pointerEvents: 'auto' }}
              >
                <TeacherCompactPill />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>}

      {/* Page content.
          NO AnimatePresence here: the wrapper has no exit animation, so presence
          bought nothing — but it kept the leaving page mounted until every
          motion child in its subtree signalled "exit done". When one of those
          signals got lost (framer-motion 11.18 + React 19), the old page never
          unmounted and stacked in normal flow above the new one — «Назад» из
          курса показывал редактор и список одновременно до F5. Plain keyed div
          → the old page is gone the moment activePage changes. */}
      <motion.div
        key={activePage}
        className="teacher-scroll-root"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        // Clip only at the viewport so content can scroll behind the header.
        style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
      >
        <Suspense fallback={<div role="status" style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--color-text-3)' }}>{t('Загрузка…')}</div>} >
        {activePage === 'home' && (
          <div onWheel={handleDeskWheel} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <DeskCanvas
              desk={activeDesk}
              onGridMeasure={setWidgetGrid}
              onUpdateItems={items => updateDeskItems(activeDesk.id, items)}
              onAddWidget={() => setShowWidgetLibrary(true)}
              hiddenWidgets={hiddenWidgets}
            />
          </div>
        )}
        {activePage === 'groups'          && (standContent ? isDesktop && standContent : <TeacherGroupsPage />)}
        {activePage === 'homework'        && (standContent ? isDesktop && standContent : <TeacherHomeworkPage />)}
        {activePage === 'homework-create' && <TeacherHomeworkCreatePage />}
        {activePage === 'homework-review' && <TeacherHomeworkReviewPage />}
        {activePage === 'hard-review'     && <TeacherHardReviewPage />}
        {activePage === 'lesson-editor'   && <TeacherLessonEditorPage />}
        {activePage === 'gradebook'       && (standContent ? isDesktop && standContent : <TeacherGradebookPage />)}
        {activePage === 'constructor'     && <TeacherConstructorPage />}
        {activePage === 'course-editor'   && <TeacherCourseEditorPage />}
        {activePage === 'cards-editor'    && <TeacherCardSetEditorPage />}
        {activePage === 'student'         && (standContent ? isDesktop && standContent : <TeacherStudentDashboardPage />)}
        {activePage === 'storage' && accessLoaded && isAdministrator && <TeacherStoragePage />}
        {activePage === 'admin' && accessLoaded && isAdministrator && <TeacherAdminPage />}
        {activePage === 'profile-settings' && <TeacherProfileSettingsPage friends={friends} />}
        {activePage === 'payment'          && <TeacherPaymentPage />}
        {activePage === 'finances'         && <TeacherFinancesPage />}
        </Suspense>
      </motion.div>

    </div>}

    {/* Mobile teacher app — fully separate layout, mounted only below lg. */}
    <Suspense fallback={<div role="status" style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--color-text-3)' }}>{t('Загрузка…')}</div>}>{!isDesktop && !mobileTool && (activePage !== 'home' && standContent ? <div className="journal-stand-mobile"><nav aria-label={t('Кабинет преподавателя')}>{(['home', 'gradebook', 'groups'] as const).filter(p => canPage(p)).map(p => <button key={p} className="cj-button" aria-pressed={p === activePage} onClick={() => setActivePage(p)}>{t(p === 'gradebook' ? 'Журнал' : p === 'home' ? 'Главная' : 'Группы')}</button>)}</nav>{standContent}</div> : <MobileTeacherApp widgetsReady={!desksLoading && accessLoaded} />)}</Suspense>
    </>
  )
}
