import { motion } from 'framer-motion'
import type { ReactNode, CSSProperties } from 'react'
import { tactile } from '../lib/feedback'
import { TAP_SCALE, JELLY_EASE } from '../lib/mobileTokens'

// ─────────────────────────────────────────────────────────────────────────────
// Floating glass chrome (MOBILE ONLY). Shared top-bar building blocks so every
// screen (Home / Course / Trainer / Lesson) uses the same floating-pill language.
// Icons are lucide only — never emoji. Desktop never imports these.
// ─────────────────────────────────────────────────────────────────────────────

const glassBase: CSSProperties = {
  background: 'rgba(var(--glass-rgb), var(--glass-fill-top))',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  border: '1px solid var(--color-border-glass)',
  boxShadow: 'var(--shadow-bar)',
}

/** Rounded floating glass pill. Tappable when onClick is given. */
export function GlassPill({
  children,
  onClick,
  strong = false,
  style,
  morph,
}: {
  children: ReactNode
  onClick?: () => void
  /** Slightly more opaque + lifted — used for the central "island". */
  strong?: boolean
  style?: CSSProperties
  /**
   * Имя пары для свайпа «назад»: одноимённые таблетки соседних экранов не
   * сменяют друг друга, а перетекают (lib/useSwipeBack.ts, MORPH_ATTR).
   */
  morph?: string
}) {
  const inner: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    padding: '9px 15px',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--color-text)',
    whiteSpace: 'nowrap',
    ...glassBase,
    ...(strong ? { background: 'rgba(var(--glass-rgb), var(--glass-fill-strong))', boxShadow: 'var(--shadow-lg)' } : null),
    ...style,
  }
  if (!onClick) return <div data-swipe-morph={morph} style={inner}>{children}</div>
  return (
    <motion.button
      type="button"
      data-swipe-morph={morph}
      whileTap={{ scale: TAP_SCALE }}
      transition={{ duration: 0.16, ease: JELLY_EASE }}
      onClick={() => { tactile(); onClick() }}
      style={{ ...inner, cursor: 'pointer' }}
    >
      {children}
    </motion.button>
  )
}

/** Round floating glass icon button, optional accent dot badge. */
export function GlassIconButton({
  icon,
  onClick,
  dot = false,
  ariaLabel,
  size = 38,
}: {
  icon: ReactNode
  onClick?: () => void
  dot?: boolean
  ariaLabel?: string
  size?: number
}) {
  // Keep the glass circle at `size` visually, but guarantee a ≥44px tap target
  // (Apple/Google min) by padding the hit area when the visual is smaller.
  const hit = Math.max(size, 44)
  return (
    <motion.button
      type="button"
      aria-label={ariaLabel}
      whileTap={{ scale: 0.9 }}
      transition={{ duration: 0.16, ease: JELLY_EASE }}
      onClick={() => { if (onClick) { tactile(); onClick() } }}
      style={{
        position: 'relative',
        width: hit, height: hit, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 999, cursor: onClick ? 'pointer' : 'default',
        color: 'var(--color-text-2)',
        background: 'transparent', border: 'none', padding: 0,
      }}
    >
      <span style={{
        position: 'relative',
        width: size, height: size,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 999, ...glassBase,
      }}>
        {icon}
        {dot && (
          <span style={{
            position: 'absolute', top: size * 0.22, right: size * 0.24,
            width: 7, height: 7, borderRadius: 999,
            background: 'var(--color-accent)', border: '1.5px solid var(--color-bg)',
          }} />
        )}
      </span>
    </motion.button>
  )
}

/**
 * Dynamic-Island-style central pill — the floating status widget at the top.
 * Holds live info (streak, time-to-lesson, …). Animates in with a soft spring.
 */
export function DynamicIsland({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
      style={{ display: 'flex', justifyContent: 'center' }}
    >
      {/* Высота задана явно (42) и совпадает с кружками шапки и рядом рубрик:
          верхний ряд должен читаться как одна линия одинаковых плиток. */}
      <GlassPill strong onClick={onClick} style={{ height: 42, padding: '0 18px', fontSize: 13 }}>
        {children}
      </GlassPill>
    </motion.div>
  )
}
