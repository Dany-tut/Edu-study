import type { CSSProperties, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'

/**
 * The one canonical "save / primary action" button for the teacher platform.
 *
 * Single unified FORM — pill (radius 999), 9×18 padding, 13.5/700 type, leading
 * icon, colored drop shadow, hover-scale, disabled opacity, and an animated green
 * success swap. The ACCENT (gradient + shadow) is per-context so course / trainer /
 * widget keep their identity colour while sharing one shape and behaviour.
 */

export interface SaveAccent { gradient: string; shadow: string }

// Per-type accents. `purple` is the default primary used by every plain "Сохранить".
export const SAVE_ACCENTS = {
  purple:  { gradient: 'linear-gradient(135deg, #9B6DFF 0%, #7B3FCC 100%)', shadow: 'rgba(123,63,204,0.30)' },
  trainer: { gradient: 'linear-gradient(135deg, #F6A93B 0%, #C2410C 100%)', shadow: 'rgba(194,65,12,0.28)' },
  widget:  { gradient: 'linear-gradient(135deg, #34D399 0%, #1A7A3F 100%)', shadow: 'rgba(26,122,63,0.28)' },
  success: { gradient: 'linear-gradient(135deg, #34D399 0%, #1A7A3F 100%)', shadow: 'rgba(26,122,63,0.30)' },
} satisfies Record<string, SaveAccent>

/** Raw style — for the rare call site that needs to spread it onto its own element (e.g. a docked twin). */
export function teacherSaveStyle(opts: { accent?: SaveAccent; disabled?: boolean; saved?: boolean; fullWidth?: boolean } = {}): CSSProperties {
  const { accent = SAVE_ACCENTS.purple, disabled, saved, fullWidth } = opts
  const a = saved ? SAVE_ACCENTS.success : accent
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    flexShrink: 0, width: fullWidth ? '100%' : undefined,
    padding: '9px 18px', borderRadius: 999, border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    background: a.gradient, color: '#fff',
    fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit',
    boxShadow: `0 4px 14px ${a.shadow}`,
    opacity: disabled ? 0.55 : 1,
    transition: 'opacity 0.2s, background 0.3s',
  }
}

export default function TeacherSaveButton({
  label, savedLabel = 'Сохранено!', onClick,
  accent, disabled = false, saved = false,
  icon, fullWidth = false, style,
}: {
  label: ReactNode
  savedLabel?: ReactNode
  onClick?: () => void
  accent?: SaveAccent
  disabled?: boolean
  saved?: boolean
  icon?: ReactNode
  fullWidth?: boolean
  style?: CSSProperties
}) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.03 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{ ...teacherSaveStyle({ accent, disabled, saved, fullWidth }), ...style }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {saved ? (
          <motion.span key="saved"
            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Check size={15} strokeWidth={2.5} /> {savedLabel}
          </motion.span>
        ) : (
          <motion.span key="save"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {icon ?? <Check size={14} strokeWidth={2.5} />} {label}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
