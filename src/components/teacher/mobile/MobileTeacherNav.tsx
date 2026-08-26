import { motion } from 'framer-motion'
import { Home, Users, ClipboardCheck, CheckSquare, User } from 'lucide-react'
import { tactile } from '../../../lib/feedback'
import { useNavCollapse } from '../../../lib/useNavCollapse'
import { useT } from '../../../lib/i18n'
import { useBottomShift } from '../../../lib/viewportBottomShift'

// Shared ease/duration for the scroll collapse (matches the student dock).
const COLLAPSE = { duration: 0.28, ease: [0.32, 0.72, 0, 1] as const }

// ─────────────────────────────────────────────────────────────────────────────
// MobileTeacherNav — bottom nav for the MOBILE teacher app (MOBILE ONLY).
// Fully separate from the desktop teacher topbar; desktop never imports this.
// Mirrors the student MobileBottomNav glass-dock language.
// ─────────────────────────────────────────────────────────────────────────────

export type MTab = 'home' | 'students' | 'review' | 'gradebook' | 'profile'

const items: { id: MTab; label: string; icon: typeof Home }[] = [
  { id: 'home',      label: 'Главная',  icon: Home },
  { id: 'students',  label: 'Ученики',  icon: Users },
  { id: 'review',    label: 'Проверка', icon: ClipboardCheck },
  { id: 'gradebook', label: 'Журнал',   icon: CheckSquare },
  { id: 'profile',   label: 'Профиль',  icon: User },
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
  // Низ вьюпорта на холодном запуске PWA выше низа экрана — см.
  // lib/viewportBottomShift.ts.
  const bottomShift = useBottomShift()
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)', transform: bottomShift ? `translateY(${bottomShift}px)` : undefined }}
    >
      <motion.div
        className="mb-4 flex items-center justify-around px-2"
        initial={false}
        // Collapse morphs height, symmetric vertical padding, and horizontal
        // margin together so the dock also shrinks in length on scroll-down.
        animate={{
          height: collapsed ? 56 : 72,
          paddingTop: collapsed ? 10 : 12,
          paddingBottom: collapsed ? 10 : 12,
          marginLeft: collapsed ? 52 : 16,
          marginRight: collapsed ? 52 : 16,
        }}
        transition={COLLAPSE}
        style={{
          borderRadius: '28px',
          background: 'rgba(var(--glass-rgb), var(--glass-fill))',
          backdropFilter: 'blur(28px) saturate(200%)',
          WebkitBackdropFilter: 'blur(28px) saturate(200%)',
          border: '1px solid var(--color-border-glass)',
          // Frosted glass: outer drop shadow + a hairline top highlight.
          boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5)',
        }}
      >
        {visibleItems.map(item => {
          const Icon = item.icon
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
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-muted)' }}
                />
                {item.id === 'review' && reviewBadge > 0 && (
                  <span style={{
                    position: 'absolute', top: -5, right: -9,
                    minWidth: 16, height: 16, padding: '0 4px',
                    borderRadius: 999, background: 'var(--color-red-text)',
                    color: '#fff', fontSize: 9, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{reviewBadge}</span>
                )}
              </div>
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
    </div>
  )
}
