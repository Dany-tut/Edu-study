import { useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Plus } from '../icons/appIcons'
import { useT } from '../../lib/i18n'
import { useBackClose } from '../../lib/overlayStack'
import { useNativeOverlay } from '../../lib/nativeGlass'
import { shareInMoreMenu } from '../../lib/pwaInstall'
import { OgonekIcon, InstallTitle, InstallPerks, SafariSteps, OpenInBrowserNote, type InstallViewProps } from './InstallParts'

// ─────────────────────────────────────────────────────────────────────────────
// iPhone: нижний лист со стеклом iOS.
// Лист с ГРАББЕРОМ — БЕЗ крестика (docs/ui-rules.md): закрывается свайпом вниз,
// тапом по затемнению, Escape и системной «Назад». В Safari «Поделиться» в
// нижней панели (с Safari 26 — в меню «•••» справа внизу) — под листом стрелка
// с кольцом указывает туда.
// ─────────────────────────────────────────────────────────────────────────────

export default function InstallSheetIphone({ open, onClose, support, onInstall }: InstallViewProps) {
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

  // Под листом остаётся место для стрелки к панели Safari.
  const pointer = support === 'manual'
  const moreMenu = shareInMoreMenu()

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="scrim"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          aria-hidden
          style={{ position: 'fixed', inset: 0, zIndex: 9997, background: 'rgba(11,11,13,0.32)' }}
        />
      )}
      {open && (
        <motion.section
          key="sheet"
          role="dialog"
          aria-modal="true"
          aria-label={t('Установить «Искру»')}
          initial={{ y: '110%' }} animate={{ y: 0 }} exit={{ y: '110%' }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 36, mass: 0.9 }}
          // Свайп вниз — по всему листу: прокрутки внутри нет, жестам не тесно.
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 1 }}
          onDragEnd={(_, info) => { if (info.offset.y > 110 || info.velocity.y > 600) onClose() }}
          style={{
            position: 'fixed', left: 8, right: 8, zIndex: 9998, margin: '0 auto', maxWidth: 440,
            bottom: `calc(env(safe-area-inset-bottom, 0px) + ${pointer ? 44 : 8}px)`,
            borderRadius: 38, padding: '10px 20px 22px', boxSizing: 'border-box',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
            background: 'rgba(var(--glass-rgb), var(--glass-fill-strong))',
            backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)',
            border: '1px solid var(--color-border-glass)', boxShadow: 'var(--shadow-pill), 0 18px 50px rgba(20,16,40,.22)',
            touchAction: 'none',
          }}
        >
          <div aria-hidden style={{ width: 38, height: 5, borderRadius: 3, background: 'var(--color-text-3)', opacity: 0.45 }} />
          <div style={{ marginTop: 10 }}><OgonekIcon size={112} /></div>
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
            <SafariSteps share={moreMenu ? 'more-menu' : 'bottom'} />
          ) : (
            <OpenInBrowserNote browser="Safari" />
          )}
        </motion.section>
      )}
      {open && pointer && (
        <motion.div
          key="pointer"
          aria-hidden
          initial={{ opacity: 0 }} animate={{ opacity: 1, y: reduce ? 0 : [0, 6, 0] }} exit={{ opacity: 0 }}
          transition={reduce ? { duration: 0.2 } : { opacity: { duration: 0.2 }, y: { duration: 1.4, repeat: Infinity, ease: 'easeInOut' } }}
          style={{
            position: 'fixed', zIndex: 9998, pointerEvents: 'none',
            // «•••» Safari 26 — справа внизу; до 26 «Поделиться» — по центру.
            ...(moreMenu ? { right: 43 } : { left: '50%', marginLeft: -16 }),
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 6px)', width: 32, height: 32, borderRadius: 16,
            display: 'grid', placeItems: 'center', color: 'var(--color-accent)',
            boxShadow: '0 0 0 3px var(--color-accent), 0 0 0 9px rgba(126,110,230,.25)',
            background: 'rgba(var(--glass-rgb), var(--glass-fill-strong))',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
