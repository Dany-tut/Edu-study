import type { CSSProperties, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'
import { useT } from '../../lib/i18n'

/**
 * The one canonical "save / primary action" button for the teacher platform.
 *
 * Single unified FORM — pill (radius 999), 9×18 padding, 13.5/700 type, leading
 * icon, colored drop shadow, hover-scale, disabled opacity, and an animated green
 * success swap. The ACCENT (gradient + shadow) is per-context so course / trainer /
 * widget keep their identity colour while sharing one shape and behaviour.
 */

export interface SaveAccent { gradient: string; shadow: string; glow?: string }

// Per-type accents. `purple` is the default primary used by every plain "Сохранить".
export const SAVE_ACCENTS = {
  purple:  { gradient: 'var(--grad-purple)', shadow: 'rgba(99,84,207,0.38)', glow: 'rgba(120,106,215,0.45)' },
  trainer: { gradient: 'linear-gradient(135deg, #F6A93B 0%, #C2410C 100%)', shadow: 'rgba(194,65,12,0.28)', glow: 'rgba(246,169,59,0.38)' },
  widget:  { gradient: 'linear-gradient(135deg, #34D399 0%, #1A7A3F 100%)', shadow: 'rgba(26,122,63,0.28)', glow: 'rgba(52,211,153,0.40)' },
  success: { gradient: 'linear-gradient(135deg, #34D399 0%, #1A7A3F 100%)', shadow: 'rgba(26,122,63,0.32)', glow: 'rgba(52,211,153,0.45)' },
} satisfies Record<string, SaveAccent & { glow: string }>

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
    boxShadow: a.glow
      ? `0 4px 14px ${a.shadow}, 0 0 22px 2px ${a.glow}`
      : `0 4px 14px ${a.shadow}`,
    opacity: disabled ? 0.55 : 1,
    transition: 'opacity 0.2s, background 0.3s',
  }
}

export default function TeacherSaveButton({
  label, savedLabel, savingLabel, onClick,
  accent, disabled = false, saved = false, saving = false,
  icon, fullWidth = false, style,
}: {
  label: ReactNode
  savedLabel?: ReactNode
  savingLabel?: ReactNode
  onClick?: () => void
  accent?: SaveAccent
  disabled?: boolean
  saved?: boolean
  /** While true: the button shows a filling progress sweep + spinner. */
  saving?: boolean
  icon?: ReactNode
  fullWidth?: boolean
  style?: CSSProperties
}) {
  const t = useT()
  const savedText = savedLabel ?? t('Сохранено!')
  const savingText = savingLabel ?? t('Сохраняю…')
  return (
    <motion.button
      whileHover={{ scale: disabled || saving ? 1 : 1.03 }}
      whileTap={{ scale: disabled || saving ? 1 : 0.97 }}
      onClick={disabled || saving ? undefined : onClick}
      disabled={disabled}
      style={{ ...teacherSaveStyle({ accent, disabled, saved, fullWidth }), position: 'relative', overflow: 'hidden', ...style }}
    >
      {/* Progress sweep — fills the button left→right while the save is in flight,
          creeping slowly and never quite reaching the end so it doesn't sit "full and waiting". */}
      {saving && (
        <motion.span
          aria-hidden
          initial={{ width: '0%' }}
          animate={{ width: ['0%', '38%', '62%', '78%'] }}
          transition={{ duration: 5.5, ease: 'easeOut', times: [0, 0.25, 0.55, 1] }}
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, background: 'rgba(255,255,255,0.22)', pointerEvents: 'none', overflow: 'hidden' }}
        >
          {/* Shimmer wave riding across the filled area, looping. */}
          <motion.span
            aria-hidden
            initial={{ x: '-60%' }}
            animate={{ x: '260%' }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
            style={{
              position: 'absolute', top: 0, bottom: 0, width: '55%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
              pointerEvents: 'none',
            }}
          />
        </motion.span>
      )}
      <AnimatePresence mode="wait" initial={false}>
        {saving ? (
          <motion.span key="saving"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: 7, position: 'relative' }}>
            <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} style={{ display: 'flex' }}>
              <Loader2 size={14} strokeWidth={2.5} />
            </motion.span>
            {savingText}
          </motion.span>
        ) : saved ? (
          <motion.span key="saved"
            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: 7, position: 'relative' }}>
            <Check size={15} strokeWidth={2.5} /> {savedText}
          </motion.span>
        ) : (
          <motion.span key="save"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: 7, position: 'relative' }}>
            {icon ?? <Check size={14} strokeWidth={2.5} />} {label}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
