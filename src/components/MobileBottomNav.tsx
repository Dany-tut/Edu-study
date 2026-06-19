import { motion } from 'framer-motion'
import { Home, BookOpen, Dumbbell, User, ClipboardList } from 'lucide-react'
import { useState, useEffect } from 'react'
import { playTransitionDrop } from '../lib/sound'
import { useDashboard } from '../store/dashboardStore'
import { useStudentData } from '../store/studentDataStore'

const items = [
  { id: 'home',     label: 'Главная',  icon: Home },
  { id: 'courses',  label: 'Курсы',    icon: BookOpen },
  { id: 'trainer',  label: 'Тренажёр', icon: Dumbbell },
  { id: 'homework', label: 'ДЗ',       icon: ClipboardList },
  { id: 'profile',  label: 'Профиль',  icon: User },
]

export default function MobileBottomNav() {
  const [active, setActive] = useState('home')
  const scheduleTodayIndex = useStudentData(s => s.scheduleTodayIndex)
  const subjects = useStudentData(s => s.subjects)
  const setScheduleIndex = useDashboard(state => state.setScheduleIndex)
  const activePage = useDashboard(state => state.activePage)
  const setActivePage = useDashboard(state => state.setActivePage)
  const openCourses = useDashboard(state => state.openCourses)

  // Badge: count lessons with status that implies pending homework (current / returned)
  const hwBadge = subjects.flatMap(s => s.modules.flatMap(m => m.lessons))
    .filter(l => l.status === 'current' || l.status === 'returned').length

  // Sync highlight when the page is changed from elsewhere.
  useEffect(() => { setActive(activePage) }, [activePage])

  const handleClick = (id: string) => {
    if (id === activePage) return
    playTransitionDrop()
    setActive(id)
    if (id === 'home') {
      // "Главная" returns to the dashboard and jumps the schedule back to today.
      setActivePage('home')
      setScheduleIndex(scheduleTodayIndex)
    } else if (id === 'courses') {
      openCourses()
    } else if (id === 'trainer') {
      setActivePage('trainer')
    } else if (id === 'homework') {
      setActivePage('homework')
    } else if (id === 'profile') {
      setActivePage('profile')
    }
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{ paddingBottom: 0 }}
    >
      <div
        className="mx-4 mb-4 flex items-center justify-around px-2 py-3"
        style={{
          borderRadius: '28px',
          background: 'rgba(var(--glass-rgb), 0.72)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid var(--color-border-glass)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
          height: 72,
        }}
      >
        {items.map(item => {
          const Icon = item.icon
          const isActive = active === item.id
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleClick(item.id)}
              className="flex flex-col items-center gap-1 cursor-pointer px-3 py-2"
              style={{ minWidth: 44, minHeight: 44, position: 'relative' }}
              aria-label={item.label}
            >
              <Icon
                size={20}
                strokeWidth={isActive ? 2.5 : 1.8}
                style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-muted)' }}
              />
              {item.id === 'homework' && hwBadge > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: 6,
                  minWidth: 16, height: 16, padding: '0 4px',
                  borderRadius: 999, background: 'var(--color-accent)',
                  color: '#fff', fontSize: 9, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{hwBadge}</span>
              )}
              <span style={{
                fontSize: 9,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--color-accent)' : 'var(--color-muted)',
              }}>
                {item.label}
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
