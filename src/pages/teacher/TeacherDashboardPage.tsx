import { motion, AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import TeacherTopBar from '../../components/teacher/TeacherTopBar'
import TeacherHome from './TeacherHome'
import { useTeacher } from '../../store/teacherStore'
import { Construction } from 'lucide-react'

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

      {/* Topbar */}
      <div className="topbar-row">
        <div style={{ display: 'inline-flex', pointerEvents: 'auto' }}>
          <TeacherTopBar />
        </div>
      </div>

      {/* Page content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activePage}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
        >
          {activePage === 'home'        && <TeacherHome />}
          {activePage === 'groups'      && <ComingSoon label="Группы" />}
          {activePage === 'homework'    && <ComingSoon label="Домашние задания" />}
          {activePage === 'gradebook'   && <ComingSoon label="Журнал" />}
          {activePage === 'constructor' && <ComingSoon label="Конструктор" />}
        </motion.div>
      </AnimatePresence>

      {/* Mobile stub */}
      <div className="lg:hidden" style={{ display: 'none' }} />
    </div>
  )
}
