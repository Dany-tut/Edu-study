import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import MobileSheet from '../../MobileSheet'
import { MODAL_BACKDROP, MODAL_CARD, ModalClose } from '../../Modal'
import { OverlayScrollArea } from '../../teacher/OverlayScroll'
import { useNativeOverlay } from '../../../lib/nativeGlass'
import { useBackClose } from '../../../lib/overlayStack'
import { useIsDesktop } from '../../../lib/useIsDesktop'
import { PLATFORM } from '../../../lib/platform'
import './stickers.css'

/*
 * Поверхность окон новогодней коллекции — одна на приветствие, альбом и подарок.
 *
 *  - ПК и iPad (в любой ориентации) — окно по центру: ×, Escape и клик по фону
 *    закрывают (SHEET-01: у окна без граббера крестик есть). Шапка окна стоит,
 *    листается только тело — с фейдами SCROLL-01 (OverlayScrollArea).
 *  - iPhone и Android, а также узкое окно ПК — нижний лист MobileSheet с граббером
 *    и без ×: свайп вниз, тап по затемнению, Escape, системная «Назад». На iPhone
 *    у прокрутки мягкий край, на Android — фейды и плотная заливка листа.
 *
 * Версию берём из PLATFORM, а не из ширины: айпад в узком окне остаётся айпадом.
 */

export type StickerSurfaceKind = 'window' | 'sheet'
export function useStickerSurface(): StickerSurfaceKind {
  const desktop = useIsDesktop()
  return PLATFORM === 'ipad' || desktop ? 'window' : 'sheet'
}

export default function StickerSurface({ open, onClose, label, width = 560, header, children, footer, sheetFooter, zIndex = 1200, closeInset }: {
  open: boolean
  onClose: () => void
  /** Подпись окна для читалок экрана. */
  label: string
  width?: number
  /** Шапка окна: стоит над прокруткой. На листе идёт первой строкой тела. */
  header?: ReactNode
  children: ReactNode
  /** Подвал окна (кнопки). */
  footer?: ReactNode
  /** Подвал листа; по умолчанию тот же, что у окна. */
  sheetFooter?: ReactNode
  zIndex?: number
  /** Отступ × от верха и правого края окна (по умолчанию из CSS, 24). */
  closeInset?: number
}) {
  const kind = useStickerSurface()
  if (kind === 'sheet') {
    return (
      <MobileSheet open={open} onClose={onClose} footer={sheetFooter ?? footer} softEdge={PLATFORM === 'iphone'}>
        <div className="stk-sheet" aria-label={label}>
          {header}
          {children}
        </div>
      </MobileSheet>
    )
  }
  return <Window open={open} onClose={onClose} label={label} width={width} header={header} footer={footer} zIndex={zIndex} closeInset={closeInset}>{children}</Window>
}

function Window({ open, onClose, label, width, header, children, footer, zIndex, closeInset }: {
  open: boolean; onClose: () => void; label: string; width: number; header?: ReactNode; children: ReactNode; footer?: ReactNode; zIndex: number; closeInset?: number
}) {
  const reduce = useReducedMotion()
  const cardRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useNativeOverlay(open)
  useBackClose(open, onClose)

  useEffect(() => {
    if (!open) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      // Закрывает только верхнее окно: альбом поверх подарка уходит первым.
      const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]')
      if (dialogs[dialogs.length - 1] !== cardRef.current) return
      e.preventDefault()
      closeRef.current()
    }
    window.addEventListener('keydown', onKey)
    const frame = requestAnimationFrame(() => cardRef.current?.focus({ preventScroll: true }))
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('keydown', onKey)
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [open])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="stk-window-backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={onClose}
          style={{ ...MODAL_BACKDROP, zIndex }}
        />
      )}
      {open && (
        <div key="stk-window-frame" style={{ position: 'fixed', inset: 0, zIndex: zIndex + 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, pointerEvents: 'none' }}>
          <motion.div
            ref={cardRef}
            role="dialog" aria-modal="true" aria-label={label}
            tabIndex={-1}
            className="stk-window"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32, opacity: { duration: 0.16 } }}
            style={{ ...MODAL_CARD, width, outline: 'none' }}
          >
            <div className="stk-snow" aria-hidden />
            <div className="stk-window__close" style={closeInset != null ? { top: closeInset, right: closeInset } : undefined}><ModalClose onClose={onClose} /></div>
            {header && <div style={{ flexShrink: 0 }}>{header}</div>}
            <OverlayScrollArea style={{ flex: 1 }}>{children}</OverlayScrollArea>
            {footer && <div style={{ flexShrink: 0 }}>{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
