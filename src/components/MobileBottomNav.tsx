import { motion } from 'framer-motion'
import { Home, BookOpen, Dumbbell, User, ClipboardList } from 'lucide-react'
import { useState, useEffect } from 'react'
import { playTransitionDrop } from '../lib/sound'
import { useDashboard } from '../store/dashboardStore'
import { useStudentData } from '../store/studentDataStore'
import { useNavCollapse } from '../lib/useNavCollapse'
import { useKeyboardInset } from '../lib/useKeyboardInset'
import { useT } from '../lib/i18n'

// Shared ease/duration for the collapse so the dock shrinks and the labels
// fade as one synchronized motion.
const COLLAPSE = { duration: 0.28, ease: [0.32, 0.72, 0, 1] as const }

const items = [
  { id: 'home',     label: 'Главная',  icon: Home },
  { id: 'courses',  label: 'Курсы',    icon: BookOpen },
  { id: 'trainer',  label: 'Тренажёр', icon: Dumbbell },
  { id: 'homework', label: 'ДЗ',       icon: ClipboardList },
  { id: 'profile',  label: 'Профиль',  icon: User },
]

export default function MobileBottomNav() {
  const t = useT()
  const [active, setActive] = useState('home')
  const scheduleTodayIndex = useStudentData(s => s.scheduleTodayIndex)
  const subjects = useStudentData(s => s.subjects)
  const setScheduleIndex = useDashboard(state => state.setScheduleIndex)
  const activePage = useDashboard(state => state.activePage)
  const setActivePage = useDashboard(state => state.setActivePage)
  const openCourses = useDashboard(state => state.openCourses)
  // Scroll-driven collapse on every mobile screen (incl. the trainer): the dock
  // shrinks in height + length and the labels fade on scroll-down, and it all
  // expands back on scroll-up / at the top.
  const collapsed = useNavCollapse()
  // When the on-screen keyboard opens (search, any focused input) slide the
  // nav straight down out of view so it never crowds the field; it springs
  // back up when the keyboard dismisses.
  const kbOpen = useKeyboardInset() > 0

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
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      initial={false}
      animate={{ y: kbOpen ? 140 : 0, opacity: kbOpen ? 0 : 1 }}
      transition={COLLAPSE}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)', pointerEvents: kbOpen ? 'none' : 'auto' }}
    >
      <motion.div
        className="mb-4 flex items-center justify-around px-2"
        initial={false}
        // Collapse morphs three axes together: height (62→50), symmetric
        // vertical padding, and the horizontal margin so the dock also shrinks
        // in length (16→52 each side) and packs the icons closer.
        animate={{
          height: collapsed ? 50 : 62,
          paddingTop: collapsed ? 7 : 9,
          paddingBottom: collapsed ? 7 : 9,
          marginLeft: collapsed ? 52 : 16,
          marginRight: collapsed ? 52 : 16,
        }}
        transition={COLLAPSE}
        style={{
          borderRadius: '28px',
          background: 'rgba(var(--glass-rgb), 0.6)',
          backdropFilter: 'blur(28px) saturate(200%)',
          WebkitBackdropFilter: 'blur(28px) saturate(200%)',
          border: '1px solid var(--color-border-glass)',
          // Frosted glass: outer drop shadow + a hairline top highlight so the
          // top edge catches light like a real pane of glass.
          boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5)',
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
              className="flex flex-col items-center justify-center cursor-pointer py-2"
              // Equal-width slots (flex:1) so icons stay put regardless of label
              // length — RU/EN labels no longer shift the dock around.
              style={{ flex: '1 1 0', minWidth: 0, minHeight: 44, position: 'relative' }}
              aria-label={t(item.label)}
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
              <motion.span
                initial={false}
                animate={{ height: collapsed ? 0 : 12, opacity: collapsed ? 0 : 1, marginTop: collapsed ? 0 : 4 }}
                transition={COLLAPSE}
                style={{
                  fontSize: 9,
                  lineHeight: '12px',
                  overflow: 'hidden',
                  maxWidth: '100%',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--color-accent)' : 'var(--color-muted)',
                }}>
                {t(item.label)}
              </motion.span>
            </motion.button>
          )
        })}
      </motion.div>
    </motion.div>
  )
}
