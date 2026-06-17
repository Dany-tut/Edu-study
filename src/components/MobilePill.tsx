import { motion } from 'framer-motion'
import type { ReactNode, CSSProperties } from 'react'
import { tactile } from '../lib/feedback'
import { buttonStyle, type ButtonVariant, type PairName, TAP_SCALE, JELLY_EASE } from '../lib/mobileTokens'

// Canonical mobile chip/pill. Kills the inline copy-paste of glass pills across
// SubjectTabs / filters / course tabs (dup D2). Desktop never imports this.
//
// Variants (§2.6): active toggle → 'glass', inactive → 'ghost', status → 'soft'.
// Every tap fires tactile() (sound + haptic) per §1.5.
export default function MobilePill({
  children,
  active = false,
  variant,
  pair,
  icon,
  onClick,
  style,
  size = 'md',
  ariaLabel,
}: {
  children?: ReactNode
  active?: boolean
  /** Explicit variant; if omitted, derived from `active` (glass when on, ghost when off). */
  variant?: ButtonVariant
  pair?: PairName
  icon?: ReactNode
  onClick?: () => void
  style?: CSSProperties
  size?: 'sm' | 'md'
  ariaLabel?: string
}) {
  const v: ButtonVariant = variant ?? (active ? 'glass' : 'ghost')
  const pad = size === 'sm' ? '7px 12px' : '9px 16px'
  const fontSize = size === 'sm' ? 13 : 14

  return (
    <motion.button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={active}
      whileTap={{ scale: TAP_SCALE }}
      transition={{ duration: 0.16, ease: JELLY_EASE }}
      onClick={() => {
        if (active && !onClick) return
        tactile()
        onClick?.()
      }}
      className="cursor-pointer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        padding: pad,
        borderRadius: 999,
        fontSize,
        fontWeight: 600,
        lineHeight: 1,
        ...buttonStyle(v, { pair, active }),
        ...style,
      }}
    >
      {icon}
      {children}
    </motion.button>
  )
}
