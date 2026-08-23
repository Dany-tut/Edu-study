import { useEffect, useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, useDragControls } from 'framer-motion'
import type { ReactNode, PointerEvent as ReactPointerEvent } from 'react'

// Bottom sheet (MOBILE ONLY). Slides up from the bottom, glass surface, drag
// handle, optional title. Backdrop tap closes. Content scrolls with contained
// overscroll.
//
// ТЯНЕТСЯ ВСЁ ТЕЛО ШТОРКИ, А НЕ ТОЛЬКО ПОЛОСКА-ГРАБЕР.
// Полоска шириной 40px — мишень на четыре процента экрана: чтобы закрыть
// шторку, приходилось целиться в неё пальцем, хотя жест «смахнуть вниз» просят
// сделать по всей карточке. Теперь тянуть можно откуда угодно, а чтобы это не
// отняло у содержимого его собственный скролл, действует правило: если палец
// лёг на прокручиваемый список НЕ в самом его верху — это скролл, и перетаскивание
// не начинается; если список в верхней точке (или не прокручивается вовсе), ждём
// первого движения и начинаем тянуть только на движении ВНИЗ.
export default function MobileSheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  // Optional pinned footer (e.g. a primary action button). Stays fixed at the
  // bottom while `children` scroll underneath it.
  footer?: ReactNode
}) {
  const y = useMotionValue(0)
  const dragControls = useDragControls()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Грабер и заголовок — всегда ручка: там скроллить нечего.
  const startDrag = (e: ReactPointerEvent) => dragControls.start(e)

  // Тело шторки — ручка «с оговоркой»: решение принимается по тому, где лежит
  // палец и куда он поехал (см. шапку файла).
  const startBodyDrag = (e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const sc = scrollRef.current
    const insideScroll = !!sc && sc.contains(e.target as Node)
    const scrollable = !!sc && sc.scrollHeight > sc.clientHeight + 1
    // Список пролистан — палец занят скроллом, шторка не двигается.
    if (insideScroll && scrollable && sc!.scrollTop > 0) return
    if (!insideScroll || !scrollable) { dragControls.start(e); return }
    // Список в самом верху: тянуть вниз можно, листать вверх — тоже. Ждём,
    // в какую сторону поедет палец, и только потом отдаём жест шторке.
    const startY = e.clientY
    const startX = e.clientX
    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return
      const dy = ev.clientY - startY
      const dx = ev.clientX - startX
      if (Math.abs(dy) < 6 && Math.abs(dx) < 6) return
      cleanup()
      // Вниз и не вбок — это закрытие шторки; вверх оставляем списку.
      if (dy > 0 && Math.abs(dy) > Math.abs(dx)) dragControls.start(ev)
    }
    const cleanup = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', cleanup)
      window.removeEventListener('pointercancel', cleanup)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', cleanup)
    window.addEventListener('pointercancel', cleanup)
  }

  // Lock the page behind the sheet: swallow any touch-move that isn't scrolling
  // the sheet's own (overflowing) content. overscroll-behavior alone doesn't help
  // when the sheet content fits — the gesture then chains to the page scroller.
  useEffect(() => {
    if (!open) return
    const onTouchMove = (e: TouchEvent) => {
      const sc = scrollRef.current
      const insideScroll = sc && sc.contains(e.target as Node) && sc.scrollHeight > sc.clientHeight
      if (!insideScroll) e.preventDefault()
    }
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => document.removeEventListener('touchmove', onTouchMove)
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.35)' }}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            style={{
              y,
              position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 81,
              background: 'rgba(var(--glass-rgb), 0.98)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              borderRadius: '28px 28px 0 0',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
              maxHeight: '85dvh',
              display: 'flex', flexDirection: 'column',
            }}
            onPointerDown={startBodyDrag}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              // Dismiss on a decisive downward flick or a long pull.
              if (info.offset.y > 110 || info.velocity.y > 600) onClose()
            }}
          >
            {/* Grabber + header — the drag handle. touch-action:none keeps the
                page behind from scrolling while you pull the sheet. */}
            <div
              onPointerDown={startDrag}
              style={{ flexShrink: 0, cursor: 'grab', touchAction: 'none', paddingBottom: 2 }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--color-bg-5)' }} />
              </div>
              {title && (
                <div style={{ padding: '4px 20px 10px', fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>
                  {title}
                </div>
              )}
            </div>
            <div
              ref={scrollRef}
              className="no-scrollbar"
              style={{
                overflowY: 'auto',
                overscrollBehavior: 'contain',
                padding: footer ? '10px 20px 20px' : '10px 20px 8px',
                // Content melts under the grabber/header instead of hard-cutting:
                // the top edge fades out as rows scroll up to it, and the bottom
                // edge fades under the pinned footer. paddingTop/Bottom keep the
                // first/last row at full opacity while at rest.
                maskImage: footer
                  ? 'linear-gradient(to bottom, transparent 0, black 12px, black calc(100% - 20px), transparent 100%)'
                  : 'linear-gradient(to bottom, transparent 0, black 12px)',
                WebkitMaskImage: footer
                  ? 'linear-gradient(to bottom, transparent 0, black 12px, black calc(100% - 20px), transparent 100%)'
                  : 'linear-gradient(to bottom, transparent 0, black 12px)',
              }}
            >
              {children}
            </div>
            {footer && (
              <div style={{ flexShrink: 0, padding: '8px 20px 0' }}>
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
