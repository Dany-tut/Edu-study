import { motion } from 'framer-motion'
import { subjects } from '../data/mockData'
import { useDashboard } from '../store/dashboardStore'
import { playTransitionDrop } from '../lib/sound'

export default function SubjectTabs() {
  const { activeSubjectId, setActiveSubject, showAllSubjects, setShowAllSubjects } = useDashboard()

  const tabs = [
    ...subjects.map(s => ({ id: s.id, label: s.name })),
    { id: 'all', label: 'Все' },
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
              background: isActive ? 'rgba(255,255,255,0.55)' : 'transparent',
              backdropFilter: isActive ? 'blur(16px) saturate(180%)' : undefined,
              WebkitBackdropFilter: isActive ? 'blur(16px) saturate(180%)' : undefined,
              color: '#0B0B0D',
              fontSize: 14,
              fontWeight: 600,
              boxShadow: isActive ? 'inset 0 1px 0 rgba(255,255,255,0.85), 0 2px 10px rgba(0,0,0,0.06)' : 'none',
              border: isActive ? '1px solid rgba(255,255,255,0.7)' : '1px solid transparent',
            }}
          >
            {tab.label}
          </motion.button>
        )
      })}
    </div>
  )
}
