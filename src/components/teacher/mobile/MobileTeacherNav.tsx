import { motion } from 'framer-motion'
import { MOBILE_DOCK_EDGE } from '../../../lib/mobileTokens'
import CountBadge from '../../CountBadge'
import { TaskliIcon, type TaskliIconName } from '../../icons/TaskliIcon'
import { tactile } from '../../../lib/feedback'
import { useNavCollapse } from '../../../lib/useNavCollapse'
import { useKeyboardOpen } from '../../../lib/useKeyboardInset'
import { useT } from '../../../lib/i18n'
import { GLASS } from '../../../lib/nativeGlass'
import MobileTeacherGlassTabs from './MobileTeacherGlassTabs'

// Shared ease/duration for the scroll collapse (matches the student dock).
const COLLAPSE = { duration: 0.22, ease: [0.32, 0.72, 0, 1] as const }

// ─────────────────────────────────────────────────────────────────────────────
// MobileTeacherNav — bottom nav for the MOBILE teacher app (MOBILE ONLY).
// Fully separate from the desktop teacher topbar; desktop never imports this.
// Mirrors the student MobileBottomNav glass-dock language.
// ─────────────────────────────────────────────────────────────────────────────

export type MTab = 'home' | 'students' | 'review' | 'gradebook' | 'profile'

const items: { id: MTab; label: string; icon: TaskliIconName }[] = [
  { id: 'home',      label: 'Главная',  icon: 'home' },
  { id: 'students',  label: 'Ученики',  icon: 'students' },
  { id: 'review',    label: 'Проверка', icon: 'review' },
  { id: 'gradebook', label: 'Журнал',   icon: 'gradebook' },
  { id: 'profile',   label: 'Профиль',  icon: 'profile' },
]

export default function MobileTeacherNav({
  active,
  onChange,
  reviewBadge = 0,
  hidden = [],
}: {
  active: MTab
  onChange: (tab: MTab) => void
  reviewBadge?: number
  hidden?: MTab[]
}) {
  const t = useT()
  const visibleItems = items.filter(item => !hidden.includes(item.id))
  const collapsed = useNavCollapse()
  // Клавиатура открыта (комментарий к работе, поиск) — док уезжает вниз, как
  // у ученика: иначе он вставал над клавиатурой и закрывал поле ввода.
  const kbOpen = useKeyboardOpen()
  // В приложении на iOS навигацию рисует система (UITabBar со стеклом).
  if (GLASS) return <MobileTeacherGlassTabs items={visibleItems} active={active} onChange={onChange} reviewBadge={reviewBadge} />
  return (
    <motion.div
      initial={false}
      animate={{ y: kbOpen ? 140 : 0, opacity: kbOpen ? 0 : 1 }}
      transition={COLLAPSE}
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      // Навигация одна и та же на всех экранах кабинета, поэтому на свайпе
      // «назад» она не едет со страницей, а стоит: страница проходит ПОД ней
      // (lib/useSwipeBack.ts). У ученической навигации ровно та же метка.
      data-swipe-pin="bottom"
      // Отступ снизу — MOBILE_DOCK_EDGE, а не сырой env(): Safari и WKWebView
      // какое-то время кладут в safe-area свою панель, и док садился на глазах.
      // Размеры — как у ученического дока (MobileBottomNav): один док на оба кабинета.
      style={{ paddingBottom: MOBILE_DOCK_EDGE, pointerEvents: kbOpen ? 'none' : 'auto' }}
    >
      <motion.div
        className="mb-2 flex items-center justify-around px-2"
        initial={false}
        // Collapse morphs height, symmetric vertical padding, and horizontal
        // margin together so the dock also shrinks in length on scroll-down.
        animate={{
          height: collapsed ? 50 : 62,
          paddingTop: collapsed ? 8 : 10,
          paddingBottom: collapsed ? 8 : 10,
          marginLeft: collapsed ? 52 : MOBILE_DOCK_EDGE + 8,
          marginRight: collapsed ? 52 : MOBILE_DOCK_EDGE + 8,
        }}
        transition={COLLAPSE}
        style={{
          borderRadius: '28px',
          background: 'rgba(var(--glass-rgb), var(--glass-fill))',
          backdropFilter: 'var(--blur-solid)',
          WebkitBackdropFilter: 'var(--blur-solid)',
          border: '1px solid var(--color-border-glass)',
          // Тень бара из темы: свой белый inset 0.5 в тёмной теме рисовал
          // жёсткую линию по верхнему краю. [[feedback-glass-no-white-inset]]
          boxShadow: 'var(--shadow-bar)',
        }}
      >
        {visibleItems.map(item => {
          const isActive = active === item.id
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => { if (item.id !== active) { tactile(); onChange(item.id) } }}
              className="flex flex-col items-center justify-center cursor-pointer py-2"
              // Equal-width slots so icons stay put regardless of label length
              // (RU/EN labels differ) — the dock no longer shifts between languages.
              style={{ flex: '1 1 0', minWidth: 0, minHeight: 44, position: 'relative' }}
              aria-label={t(item.label)}
            >
              <div style={{ position: 'relative' }}>
                <TaskliIcon
                  name={item.icon}
                  size={20}
                  strokeWidth={isActive ? 2 : 1.8}
                  tone={isActive ? 'accent' : 'neutral'}
                />
                {item.id === 'review' && <CountBadge count={reviewBadge} tone="danger" style={{ position: 'absolute', top: -5, right: -9 }} />}
              </div>
              <motion.span
                initial={false}
                animate={{ height: collapsed ? 0 : 12, opacity: collapsed ? 0 : 1, marginTop: collapsed ? 0 : 4 }}
                transition={COLLAPSE}
                style={{
                  fontSize: 10,
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
