import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import TeacherTopBar from '../../components/teacher/TeacherTopBar'
import TeacherHome from './TeacherHome'
import TeacherGroupsPage from './TeacherGroupsPage'
import TeacherHomeworkPage from './TeacherHomeworkPage'
import TeacherGradebookPage from './TeacherGradebookPage'
import TeacherConstructorPage from './TeacherConstructorPage'
import TeacherHomeworkCreatePage from './TeacherHomeworkCreatePage'
import TeacherHomeworkReviewPage from './TeacherHomeworkReviewPage'
import TeacherLessonEditorPage from './TeacherLessonEditorPage'
import { useTeacher } from '../../store/teacherStore'
import { BookOpen, ClipboardList, BarChart2 } from 'lucide-react'

const quickActions = [
  { icon: BookOpen,      label: 'Создать урок', bg: '#DFF8D6', color: '#1a7a3f', page: 'lesson-editor' as const },
  { icon: ClipboardList, label: 'Создать ДЗ',   bg: '#EEDBFF', color: '#7B3FCC', page: 'homework-create' as const },
  { icon: BarChart2,     label: 'Статистика',   bg: '#FFE4BD', color: '#8B4900', page: 'gradebook' as const },
]

function QuickActionBtn({
  icon: Icon, label, bg, color, onClick,
}: { icon: React.ElementType; label: string; bg: string; color: string; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <motion.button
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      title={label}
      style={{
        position: 'relative',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        width: 110, height: 44, borderRadius: 20, border: 'none', cursor: 'pointer',
        background: bg, overflow: 'hidden', flexShrink: 0,
      }}
    >
      <motion.div
        animate={{ scale: hovered ? 0.72 : 1, y: hovered ? -6 : 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        <Icon size={22} strokeWidth={2} style={{ color, display: 'block' }} />
      </motion.div>
      <motion.span
        initial={false}
        animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 6 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'absolute', bottom: 5,
          fontSize: 10, fontWeight: 700, color, lineHeight: 1, whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        {label}
      </motion.span>
    </motion.button>
  )
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 14,
      color: '#6F6F76',
    }}>
      <Construction size={40} strokeWidth={1.4} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#0B0B0D', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 14, color: '#6F6F76' }}>Раздел будет готов в следующей фазе</div>
      </div>
    </div>
  )
}

export default function TeacherDashboardPage() {
  const activePage = useTeacher(s => s.activePage)
  const setActivePage = useTeacher(s => s.setActivePage)

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

        {/* Quick actions pill — absolute right. Hidden in the lesson editor so
            the editor's docked Черновик/Опубликовать pills own the right slot. */}
        {activePage !== 'lesson-editor' && (
        <div
          style={{
            position: 'absolute',
            right: 32,
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            height: 60,
            padding: '0 8px',
            borderRadius: 32,
            background: 'rgba(255,255,255,0.5)',
            backdropFilter: 'blur(14px) saturate(180%)',
            WebkitBackdropFilter: 'blur(14px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.7)',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.8), 0 4px 14px rgba(21,18,31,0.08)',
          }}
        >
          {quickActions.map(({ icon, label, bg, color, page }) => (
            <QuickActionBtn
              key={label}
              icon={icon} label={label} bg={bg} color={color}
              onClick={() => page && setActivePage(page)}
            />
          ))}
        </div>
        )}
      </div>

      {/* Page content */}
      <AnimatePresence mode="sync">
        <motion.div
          key={activePage}
          initial={false}
          className="teacher-scroll-root"
          style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
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
