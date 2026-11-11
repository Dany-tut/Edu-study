import { useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Plus, X } from '../icons/appIcons'
import { useT } from '../../lib/i18n'
import { useBackClose } from '../../lib/overlayStack'
import { useNativeOverlay } from '../../lib/nativeGlass'
import { OgonekIcon, InstallTitle, InstallPerks, SafariSteps, OpenInBrowserNote, type InstallViewProps } from './InstallParts'

// ─────────────────────────────────────────────────────────────────────────────
// iPad: поповер СПРАВА, не снизу (всё управление на айпаде — у правого края).
// У Safari на iPad «Поделиться» вверху справа, поэтому поповер стоит под ним
// и хвостиком указывает вверх, на эту кнопку. Граббера нет — значит есть ×
// (docs/ui-rules.md); ещё закрывают тап мимо, Escape и «Назад».
// ─────────────────────────────────────────────────────────────────────────────

export default function InstallPopoverIpad({ open, onClose, support, onInstall }: InstallViewProps) {
  const t = useT()
  const reduce = useReducedMotion()
  useBackClose(open, onClose)
  useNativeOverlay(open)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const glass = 'rgba(var(--glass-rgb), var(--glass-fill-strong))'

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="scrim"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          aria-hidden
          style={{ position: 'fixed', inset: 0, zIndex: 9997, background: 'rgba(11,11,13,0.16)' }}
        />
      )}
      {open && (
        <motion.section
          key="popover"
          role="dialog"
          aria-modal="true"
          aria-label={t('Установить «Искру»')}
          initial={{ opacity: 0, scale: reduce ? 1 : 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: reduce ? 1 : 0.92 }}
          transition={reduce ? { duration: 0.12 } : { type: 'spring', stiffness: 420, damping: 32 }}
          style={{
            position: 'fixed', zIndex: 9998, transformOrigin: 'top right',
            right: 'calc(env(safe-area-inset-right, 0px) + 16px)', top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
            width: 400, maxWidth: 'calc(100vw - 32px)', boxSizing: 'border-box',
            borderRadius: 32, padding: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
            background: glass, backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)',
            border: '1px solid var(--color-border-glass)', boxShadow: 'var(--shadow-pill), 0 18px 50px rgba(20,16,40,.22)',
          }}
        >
          {/* Хвостик вверх — к «Поделиться»: в Safari на iPad это первая из трёх
              кнопок справа (Поделиться, +, вкладки). */}
          <span aria-hidden style={{
            position: 'absolute', top: -10, right: 94, width: 0, height: 0,
            borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderBottom: `11px solid ${glass}`,
          }} />
          <button data-hover="layer" type="button" onClick={onClose} aria-label={t('Закрыть')} style={{
            position: 'absolute', right: 14, top: 14, width: 44, height: 44, minHeight: 0, borderRadius: 22, border: 'none', padding: 0,
            display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--color-text)', background: 'var(--color-bg-5)',
          }}>
            <X size={18} />
          </button>
          <div style={{ marginTop: 6 }}><OgonekIcon size={104} /></div>
          <InstallTitle />
          <InstallPerks />
          {support === 'native' ? (
            <button data-hover="layer" type="button" onClick={onInstall} style={{
              width: '100%', minHeight: 52, borderRadius: 26, border: 'none', cursor: 'pointer',
              background: 'var(--grad-purple)', color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <Plus size={18} strokeWidth={2.5} />{t('Установить приложение')}
            </button>
          ) : support === 'manual' ? (
            <SafariSteps share="top-right" />
          ) : (
            <OpenInBrowserNote browser="Safari" />
          )}
        </motion.section>
      )}
    </AnimatePresence>
  )
}
