import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../store/themeStore'
import { useT } from '../lib/i18n'

export default function ThemeToggleBtn() {
  const t = useT()
  const { dark, toggle } = useTheme()
  const [showLabel, setShowLabel] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleClick() {
    if (timerRef.current) clearTimeout(timerRef.current)
    toggle()
    setShowLabel(true)
    timerRef.current = setTimeout(() => setShowLabel(false), 1900)
  }

  return (
    <motion.button
      onClick={handleClick}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      aria-label={dark ? t('Тёмная тема') : t('Светлая тема')}
      style={{
        display: 'flex',
        alignItems: 'center',
        height: 34,
        borderRadius: 12,
        border: 'none',
        cursor: 'pointer',
        paddingLeft: 8,
        paddingRight: 8,
        background: dark ? 'rgba(124,108,224,0.16)' : 'transparent',
        color: dark ? 'var(--color-accent)' : 'var(--color-muted)',
        transition: 'background 0.25s, color 0.25s',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* Icon spins in whenever dark flips */}
      <motion.span
        key={String(dark)}
        initial={{ rotate: dark ? -120 : 120, scale: 0.4, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
        style={{ display: 'flex', alignItems: 'center' }}
      >
        {dark
          ? <Moon size={16} strokeWidth={1.8} />
          : <Sun size={16} strokeWidth={1.8} />
        }
      </motion.span>

      {/* Label slides in briefly after each toggle */}
      <AnimatePresence>
        {showLabel && (
          <motion.span
            key="label"
            initial={{ opacity: 0, maxWidth: 0, marginLeft: 0 }}
            animate={{ opacity: 1, maxWidth: 68, marginLeft: 5 }}
            exit={{ opacity: 0, maxWidth: 0, marginLeft: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            style={{
              fontSize: 12,
              fontWeight: 650,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              lineHeight: 1,
            }}
          >
            {dark ? t('Тёмная') : t('Светлая')}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
