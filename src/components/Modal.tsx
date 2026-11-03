import FadeText from './FadeText'
import { useEffect, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { X } from './icons/appIcons'
import { useT } from '../lib/i18n'
import { OverlayScrollArea } from './teacher/OverlayScroll'
import { useKeyboardState } from '../lib/useKeyboardInset'
import { useNativeOverlay } from '../lib/nativeGlass'
import './Modal.css'

/**
 * ОКНО — один каркас на всё приложение.
 *
 * Было около четырёх вариантов и десяток одиночек: скругления от 18 до 28,
 * затемнение от 0.32 до 0.6, где-то с размытием, где-то без. И в восьми окнах
 * прокручивалась вся рамка целиком: полоса прокрутки заходила в скруглённые
 * углы, а шапка с крестиком уезжала вместе с текстом.
 *
 * Правила:
 *  - Затемнение 0.45 + размытие 4 px, карточка --color-bg-2, радиус 22 —
 *    самый частый вариант в коде, его и взяли (MODAL_BACKDROP / MODAL_CARD).
 *  - Рамка не прокручивается никогда. Шапка (заголовок + крестик) и подвал
 *    стоят, листается только тело — свой ползунок и фейды, без линий.
 *  - Монтирование/размонтирование — у вызывающего, внутри <AnimatePresence>:
 *    так анимация выхода работает, как и раньше.
 *  - Полноэкранные просмотрщики картинок — не окна, их это не касается.
 */

export const MODAL_RADIUS = 22

const backdropHidden = { opacity: 0 }
const cardHidden = { scale: 0.94, opacity: 0, y: 14 }
const cardTransition = {
  type: 'spring' as const, stiffness: 420, damping: 30,
  opacity: { type: 'tween' as const, duration: 0.16 },
}

export const MODAL_BACKDROP: CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.45)',
  backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
}

export const MODAL_CARD: CSSProperties = {
  background: 'var(--color-bg-2)',
  borderRadius: MODAL_RADIUS,
  border: '1px solid var(--color-border)',
  boxShadow: 'var(--shadow-5)',
}

export default function Modal({
  onClose, title, subtitle, icon, width = 540, padding = 24, zIndex = 1200,
  footer, children, onPaste, cardStyle, backdropStyle, bodyStyle, closeButtonStyle,
}: {
  onClose: () => void
  /** Без заголовка шапки нет — крестик тогда рисует само содержимое. */
  title?: ReactNode
  subtitle?: ReactNode
  /** Плитка слева от заголовка. */
  icon?: ReactNode
  width?: number
  padding?: number
  zIndex?: number
  /** Стоит внизу, не прокручивается (кнопки действия). */
  footer?: ReactNode
  children: ReactNode
  onPaste?: (e: React.ClipboardEvent) => void
  cardStyle?: CSSProperties
  backdropStyle?: CSSProperties
  closeButtonStyle?: CSSProperties
  bodyStyle?: CSSProperties
}) {
  const t = useT()
  const keyboard = useKeyboardState()
  // Нативный таб-бар приложения лежит над WebView — пока окно открыто, он уезжает.
  useNativeOverlay(true)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <>
      <motion.div
        className="iskra-modal-backdrop"
        initial={false} exit={backdropHidden}
        onClick={onClose}
        style={{ ...MODAL_BACKDROP, ...backdropStyle, zIndex }}
      />
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: keyboard.inset, zIndex: zIndex + 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, pointerEvents: 'none' }}>
        <motion.div
          role="dialog" aria-modal="true"
          className="iskra-modal-card"
          initial={false} exit={cardHidden}
          transition={cardTransition}
          onPaste={onPaste}
          style={{
            ...MODAL_CARD,
            pointerEvents: 'auto', width, maxWidth: '100%', maxHeight: keyboard.open ? `calc(100dvh - ${keyboard.inset + 32}px)` : '90dvh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            ...cardStyle,
          }}
        >
          {title != null && (
            // Шапка прижата к верху: крестик стоит против заголовка, а не против
            // середины двухстрочного подзаголовка.
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: `${padding - 4}px ${padding}px 12px`, flexShrink: 0 }}>
              {icon && <span style={{ display: 'flex', flexShrink: 0 }}>{icon}</span>}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Строка заголовка высотой с крестик (36) и по центру его: иначе
                    заголовок висел у верхнего края, а крестик ниже. */}
                <div style={{ minHeight: 36, display: 'flex', alignItems: 'center', fontSize: 16, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.3, minWidth: 0 }}>{typeof title === 'string' || typeof title === 'number' ? <FadeText lines={2} style={{ width: '100%', overflowWrap: 'anywhere' }}>{title}</FadeText> : title}</div>
                {subtitle != null && <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4, lineHeight: 1.3 }}>{typeof subtitle === 'string' || typeof subtitle === 'number' ? <FadeText lines={2} style={{ overflowWrap: 'anywhere' }}>{subtitle}</FadeText> : subtitle}</div>}
              </div>
              <ModalClose onClose={onClose} style={closeButtonStyle} />
            </div>
          )}
          {/* Тело: свой тонкий ползунок поверх текста (системный в тёмной теме —
              чёрная полоса во всю высоту) и фейд у того края, за которым ещё
              есть текст. Разделительных линий у шапки и подвала нет: край
              читается фейдом, а без прокрутки окно — один чистый лист. */}
          <OverlayScrollArea
            showScrollbar={false}
            style={{ flex: 1 }}
            scrollStyle={bodyStyle}
            padding={`${title != null ? 4 : padding}px ${padding}px ${footer ? 12 : padding}px`}
          >
            {children}
          </OverlayScrollArea>
          {footer && (
            <div style={{ flexShrink: 0, padding: `12px ${padding}px ${padding}px` }}>
              {footer}
            </div>
          )}
        </motion.div>
      </div>
    </>,
    document.body,
  )
}

/**
 * Крестик окна — один на все окна. 36 px — палец попадает и на телефоне
 * (раньше 30, а в части окон голая иконка 18 px без поля вокруг).
 */
export function ModalClose({ onClose, style }: { onClose: () => void; style?: CSSProperties }) {
  const t = useT()
  return (
    <button
      type="button" onClick={onClose} aria-label={t('Закрыть')}
      style={{ width: 36, height: 36, borderRadius: 11, border: 'none', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0, ...style }}
    >
      <X size={18} />
    </button>
  )
}
