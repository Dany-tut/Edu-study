import { motion } from 'framer-motion'
import { Home, BookOpen, Dumbbell, User, ClipboardList } from 'lucide-react'
import { useState, useEffect } from 'react'
import { playTransitionDrop } from '../lib/sound'
import { useDashboard } from '../store/dashboardStore'
import { useStudentData } from '../store/studentDataStore'
import { useNavCollapse } from '../lib/useNavCollapse'
import { useKeyboardOpen } from '../lib/useKeyboardInset'
import { useT } from '../lib/i18n'
import { useFeedGlance } from '../lib/feedRead'
import { MOBILE_DOCK_EDGE } from '../lib/mobileTokens'
import ViewportProbe from './ViewportProbe' // ВРЕМЕННО: диагностика нижнего края

// Shared ease/duration for the collapse so the dock shrinks and the labels
// fade as one synchronized motion.
const COLLAPSE = { duration: 0.28, ease: [0.32, 0.72, 0, 1] as const }

const items = [
  { id: 'home',     label: 'Главная',  icon: Home },
  { id: 'courses',  label: 'Курсы',    icon: BookOpen },
  { id: 'trainer',  label: 'Тренажёр', icon: Dumbbell },
  { id: 'homeworkList', label: 'ДЗ',   icon: ClipboardList },
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
  const kbOpen = useKeyboardOpen()
  // Отступ снизу — константа, а не живой env(): см. lib/mobileTokens.ts.

  // Badge: count lessons with status that implies pending homework (current / returned)
  const hwBadge = subjects.flatMap(s => s.modules.flatMap(m => m.lessons))
    .filter(l => l.status === 'current' || l.status === 'returned').length

  // Новое в ленте — на «Тренажёре». Это единственный раздел кабинета, который
  // наполняется сам, и единственная причина зайти туда без своего плана.
  const feedBadge = useFeedGlance(1500).unread.length

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
    } else if (id === 'homeworkList') {
      setActivePage('homeworkList')
    } else if (id === 'profile') {
      setActivePage('profile')
    }
  }

  return (
    <>
    <ViewportProbe />
    <motion.div
      data-probe-dock
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      initial={false}
      animate={{ y: kbOpen ? 140 : 0, opacity: kbOpen ? 0 : 1 }}
      transition={COLLAPSE}
      // Отступ снизу — константа MOBILE_DOCK_EDGE, а не сырой env(): и Safari,
      // и WKWebView какое-то время кладут в safe-area-inset-bottom свою нижнюю
      // панель, и док садился на глазах у ученика уже после загрузки.
      style={{ paddingBottom: MOBILE_DOCK_EDGE, pointerEvents: kbOpen ? 'none' : 'auto' }}
    >
      <motion.div
        className="mb-2 flex items-center justify-around px-2"
        initial={false}
        // Collapse morphs three axes together: height (62→50), symmetric
        // vertical padding, and the horizontal margin so the dock also shrinks
        // in length and packs the icons closer. Расправленные бока равны
        // видимому зазору снизу (MOBILE_DOCK_EDGE + mb-2), чтобы рамка воздуха
        // вокруг дока была одинаковой со всех трёх сторон.
        animate={{
          height: collapsed ? 50 : 62,
          paddingTop: collapsed ? 7 : 9,
          paddingBottom: collapsed ? 7 : 9,
          marginLeft: collapsed ? 52 : MOBILE_DOCK_EDGE + 8,
          marginRight: collapsed ? 52 : MOBILE_DOCK_EDGE + 8,
        }}
        transition={COLLAPSE}
        style={{
          borderRadius: '28px',
          background: 'rgba(var(--glass-rgb), var(--glass-fill))',
          backdropFilter: 'blur(28px) saturate(200%)',
          WebkitBackdropFilter: 'blur(28px) saturate(200%)',
          border: '1px solid var(--color-border-glass)',
          // Обводка та же, что у верхней таблетки (DynamicIsland): свою тень с
          // жёстким белым inset здесь держать нельзя — в тёмной теме
          // rgba(255,255,255,0.5) по верхнему краю рисует яркий контур, из-за
          // которого нижний бар выглядел обведённым, а шапка — нет.
          boxShadow: 'var(--shadow-bar)',
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
              {item.id === 'trainer' && feedBadge > 0 && (
                <span style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(2px)',
                  minWidth: 16, height: 16, padding: '0 5px',
                  borderRadius: 999, background: 'var(--grad-purple)',
                  color: '#fff', fontSize: 9, fontWeight: 700, lineHeight: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(var(--accent-rgb), 0.45)',
                }}>{feedBadge > 99 ? '99+' : feedBadge}</span>
              )}
              {item.id === 'homeworkList' && hwBadge > 0 && (
                // Сплошная заливка — только --grad-purple: в тёмной теме
                // --color-accent светло-лавандовый, белые цифры на нём терялись.
                // Якорь от центра иконки, чтобы трёхзначное число росло вправо,
                // а не наползало на соседний пункт.
                <span style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(2px)',
                  minWidth: 16, height: 16, padding: '0 5px',
                  borderRadius: 999, background: 'var(--grad-purple)',
                  color: '#fff', fontSize: 9, fontWeight: 700, lineHeight: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(var(--accent-rgb), 0.45)',
                }}>{hwBadge > 99 ? '99+' : hwBadge}</span>
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
    </>
  )
}
