import { motion } from 'framer-motion'
import { useDashboard } from '../store/dashboardStore'
import { useStudentData } from '../store/studentDataStore'
import { playTransitionDrop } from '../lib/sound'
import { useT } from '../lib/i18n'

export default function SubjectTabs() {
  const t = useT()
  const { activeSubjectId, setActiveSubject, showAllSubjects, setShowAllSubjects } = useDashboard()
  const subjects = useStudentData(s => s.subjects)

  const tabs = [
    ...subjects.map(s => ({ id: s.id, label: s.name })),
    { id: 'all', label: t('Все') },
  ]

  return (
    <div
      className="inline-flex items-center gap-2 mb-6 flex-wrap"
      style={{ width: 'max-content', maxWidth: '100%', justifyContent: 'flex-start' }}
    >
      {tabs.map(tab => {
        const isActive = tab.id === 'all' ? showAllSubjects : (activeSubjectId === tab.id && !showAllSubjects)
        return (
          <motion.button
            key={tab.id}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              if (isActive) return
              playTransitionDrop()
              if (tab.id === 'all') {
                setShowAllSubjects(true)
              } else {
                setShowAllSubjects(false)
                setActiveSubject(tab.id)
              }
            }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="px-6 py-2.5 font-semibold cursor-pointer"
            style={{
              borderRadius: 999,
              background: isActive ? 'rgba(var(--glass-rgb), 0.72)' : 'transparent',
              backdropFilter: isActive ? 'blur(16px) saturate(180%)' : undefined,
              WebkitBackdropFilter: isActive ? 'blur(16px) saturate(180%)' : undefined,
              color: 'var(--color-text)',
              fontSize: 14,
              fontWeight: 600,
              boxShadow: isActive ? 'var(--shadow-xs)' : 'none',
              border: isActive ? '1px solid var(--color-border-glass)' : '1px solid transparent',
            }}
          >
            {tab.label}
          </motion.button>
        )
      })}
    </div>
  )
}
