import FadeText from './FadeText'
import { useEffect, useRef, useId } from 'react'
import { X } from './icons/appIcons'
import { useT } from '../lib/i18n'
import './mobileInteraction.css'
import { useOverlayScroll, fadeMask } from './teacher/OverlayScroll'
import { useKeyboardState } from '../lib/useKeyboardInset'
import { createPortal } from 'react-dom'
import { useNativeOverlay } from '../lib/nativeGlass'
import { motion, AnimatePresence, useMotionValue, useDragControls, animate } from 'framer-motion'
import type { ReactNode, PointerEvent as ReactPointerEvent } from 'react'

// Bottom sheet (MOBILE ONLY). Slides up from the bottom, glass surface, drag
// handle, optional title. Backdrop tap closes. Content scrolls with contained
// overscroll.
//
// ТЯНЕТСЯ ВСЁ ТЕЛО ШТОРКИ, А НЕ ТОЛЬКО ПОЛОСКА-ГРАБЕР.
// Полоска шириной 40px — мишень на четыре процента экрана: чтобы закрыть
// шторку, приходилось целиться в неё пальцем, хотя жест «смахнуть вниз» просят
// сделать по всей карточке.
//
// ПОЧЕМУ ПАЛЕЦ ВЕДЁТ СВОЙ КОД, А НЕ dragControls.
// Тянуть тело пробовали указателями: ждали первого pointermove и отдавали жест
// перетаскиванию framer-motion. На айфоне это не работает нигде, где под
// пальцем лежит прокручиваемый список: как только Safari решает, что начался
// скролл, он присылает pointercancel и БОЛЬШЕ НЕ ШЛЁТ pointermove — жест,
// который мы ждали, не приходит никогда. Отсюда и «за грабер закрывается, за
// тело нет»: за грабером списка нет, там указатели живут.
//
// Поэтому касание ведём сами, на touch-событиях с {passive:false}: на первом же
// движении решаем, чей это жест, и если шторкин — гасим событие
// preventDefault'ом ДО того, как браузер начнёт скроллить. Мышь осталась на
// dragControls (превью на десктопе), палец её больше не трогает.
//
// Правило дележа то же: палец на списке, пролистанном вниз, — это скролл;
// список в самом верху (или не прокручивается вовсе) — движение ВНИЗ забирает
// шторка, движение ВВЕРХ остаётся списку.
//
// СПИСОК ВНУТРИ СПИСКА. В шторке бывают свои коробки с прокруткой — список
// разделов грамматики (RailList, 300px) лежит в теле шторки, которое само
// помещается целиком. Смотреть только на тело было нельзя: оно «не
// прокручивается», значит касание глушилось, внутренний список не листался
// вовсе, а движение вниз уводило всю шторку. Поэтому прокрутка ищется по
// цепочке от пальца вверх до шторки: любая коробка, которой есть куда ехать.
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
  const t = useT()
  const titleId = useId()
  const y = useMotionValue(0)
  const dragControls = useDragControls()
  const { ref: scrollRef, fade, onScroll } = useOverlayScroll()
  const keyboard = useKeyboardState()
  const sheetRef = useRef<HTMLDivElement>(null)
  // onClose внутри слушателей — через ref: переподписывать touch-события на
  // каждый новый колбэк родителя нельзя, посреди жеста это его обрывает.
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  // Мышью тянут за что угодно — у указателя мыши нет спора со скроллом.
  const startDrag = (e: ReactPointerEvent) => {
    if (e.pointerType !== 'mouse') return
    if ((e.target as Element).closest('button, input, textarea, select, a, [contenteditable], [data-sheet-nodrag]')) return
    if (e.button !== 0) return
    dragControls.start(e)
  }

  // Keep keyboard focus inside the topmost sheet and return to its opener.
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const isTop = () => {
      const sheets = document.querySelectorAll('[role="dialog"][aria-modal="true"]')
      return sheets[sheets.length - 1] === sheetRef.current
    }
    const frame = requestAnimationFrame(() => {
      const sheet = sheetRef.current
      if (sheet && isTop() && !sheet.contains(document.activeElement)) sheet.focus({ preventScroll: true })
    })
    const onKey = (e: KeyboardEvent) => {
      const sheet = sheetRef.current
      if (!sheet || !isTop()) return
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); closeRef.current(); return }
      if (e.key !== 'Tab') return
      const targets = Array.from(sheet.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]'))
        .filter(el => el.getClientRects().length > 0)
      const first = targets[0], last = targets[targets.length - 1]
      if (!first) { e.preventDefault(); sheet.focus(); return }
      if (e.shiftKey && (document.activeElement === first || document.activeElement === sheet)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && (document.activeElement === last || !sheet.contains(document.activeElement))) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('keydown', onKey)
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [open])

  // Палец: свой жест на touch-событиях (см. шапку файла) + замок на страницу
  // позади шторки — она не должна листаться под ней.
  useEffect(() => {
    if (!open) return
    let id: number | null = null
    let startY = 0
    let startX = 0
    let mode: 'wait' | 'pull' | 'scroll' | 'horizontal' = 'wait'
    let passthrough = false
    let lastY = 0
    let lastT = 0
    let vy = 0

    const finger = (e: TouchEvent) => Array.from(e.touches).find(t => t.identifier === id)
      ?? Array.from(e.changedTouches).find(t => t.identifier === id)

    const isTop = () => {
      const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]')
      return dialogs[dialogs.length - 1] === sheetRef.current
    }
    const resetPull = () => {
      id = null
      mode = 'wait'
      vy = 0
      if (y.get() > 0) animate(y, 0, { type: 'spring', stiffness: 500, damping: 42 })
    }
    const onStart = (e: TouchEvent) => {
      if (!isTop()) return
      passthrough = false
      // A second finger or an interrupted touch must cancel, never commit a dismissal.
      resetPull()
      if (e.touches.length !== 1) { passthrough = true; return }
      const t = e.touches[0]
      if (!sheetRef.current?.contains(t.target as Node)) return
      // Editing, selection, drawing and explicit drag handles own their touch.
      if ((t.target as Element).closest?.('button, a, input, textarea, select, [contenteditable], canvas, audio, video, [data-sheet-nodrag], [role="slider"]')) {
        passthrough = true
        return
      }
      id = t.identifier
      startY = lastY = t.clientY
      startX = t.clientX
      lastT = e.timeStamp
      mode = 'wait'
    }

    // Коробки с прокруткой под пальцем, от ближней к телу шторки включительно.
    // Пусто — листать под пальцем нечего, и жест целиком наш.
    const scrollersAt = (target: Node): HTMLElement[] => {
      const sc = scrollRef.current
      if (!sc || !sc.contains(target)) return []
      const out: HTMLElement[] = []
      for (let el = target instanceof HTMLElement ? target : target.parentElement; el; el = el.parentElement) {
        const oy = el === sc ? 'auto' : getComputedStyle(el).overflowY
        if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) out.push(el)
        if (el === sc) break
      }
      return out
    }

    const onMove = (e: TouchEvent) => {
      if (!isTop() || passthrough) return
      const scrollers = scrollersAt(e.target as Node)
      const canScroll = scrollers.length > 0
      if (id === null) {
        // Касание мимо шторки (фон, страница под ней) — глушим целиком.
        if (!canScroll && e.cancelable) e.preventDefault()
        return
      }
      const t = finger(e)
      if (!t) return
      const dy = t.clientY - startY
      const dx = t.clientX - startX
      if (mode === 'wait') {
        if (Math.abs(dy) < 4 && Math.abs(dx) < 4) { if (!canScroll && e.cancelable) e.preventDefault(); return }
        // Вниз шторку тянет только палец, под которым всё уже в самом верху:
        // иначе это прокрутка вложенного списка обратно к началу.
        if (Math.abs(dx) > Math.abs(dy)) { mode = 'horizontal'; return }
        const atTop = scrollers.every(el => el.scrollTop <= 1)
        mode = dy > 0 && Math.abs(dy) > Math.abs(dx) && atTop ? 'pull' : 'scroll'
      }
      if (mode === 'horizontal') return
      if (mode === 'pull') {
        // Гасим ДО того, как Safari начнёт скроллить: иначе он заберёт жест и
        // пришлёт нам pointercancel вместо движений.
        if (e.cancelable) e.preventDefault()
        const now = e.timeStamp
        if (now > lastT) vy = ((t.clientY - lastY) / (now - lastT)) * 1000
        lastY = t.clientY
        lastT = now
        y.set(Math.max(0, dy - 4))
        return
      }
      // Скролл: списку — его прокрутка, всему остальному — замок.
      if (!canScroll && e.cancelable) e.preventDefault()
    }

    const onEnd = (e: TouchEvent) => {
      if (!isTop() || id === null) return
      if (Array.from(e.touches).some(t => t.identifier === id)) return
      const pulled = mode === 'pull'
      const offset = y.get()
      id = null
      mode = 'wait'
      if (!pulled) return
      // Решительный рывок или длинная протяжка закрывают; всё, что меньше, —
      // пружиной обратно.
      const releasedSpeed = e.timeStamp - lastT <= 100 ? vy : 0
      if (offset > 110 || releasedSpeed > 600) closeRef.current()
      else animate(y, 0, { type: 'spring', stiffness: 500, damping: 42 })
    }

    document.addEventListener('touchstart', onStart, { passive: false })
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd)
    document.addEventListener('touchcancel', resetPull)
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
      document.removeEventListener('touchcancel', resetPull)
    }
  }, [open, y])

  // В body, а не там, где шторку объявили. Экраны рисуют её внутри своей
  // прокрутки (MobileScreen, overflow:auto), а WebKit кладёт содержимое такой
  // коробки в её собственный слой: fixed-шторка с zIndex 81 оказывалась ПОД
  // fixed-навигацией (z 50) снаружи, и док учителя закрывал низ карточки
  // ученика — в приложении и в Safari на айфоне; Chrome этого не делает.
  // Нативный таб-бар приложения лежит над WebView — пока шторка открыта, он уезжает.
  useNativeOverlay(open)

  return createPortal(
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
            ref={sheetRef}
            className="mobile-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-label={title ? undefined : t('Подробности')}
            tabIndex={-1}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            style={{
              y,
              position: 'fixed', left: 0, right: 0, bottom: keyboard.inset, zIndex: 81,
              background: 'rgba(var(--glass-rgb), 0.98)',
              backdropFilter: 'var(--blur-solid)',
              WebkitBackdropFilter: 'var(--blur-solid)',
              borderRadius: '32px 32px 0 0',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
              // Низа у шторки нет: контент уходит под край экрана, как на
              // главной и в курсах. Отступ под safe-area живёт внутри —
              // в прокрутке (или в подвале), а не мёртвой полосой под ними.
              maxHeight: keyboard.open ? `calc(100dvh - ${keyboard.inset + 12}px)` : '85dvh',
              display: 'flex', flexDirection: 'column',
            }}
            onPointerDown={startDrag}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            // Вниз шторка едет ЗА ПАЛЬЦЕМ, один к одному. С упругостью 0.6 она
            // отставала от пальца почти вдвое: свайп за грабер сдвигал её на
            // полсотни пикселей, порог закрытия не добирался, и жест выглядел
            // сломанным — «потянул, а она вернулась». Упругость оставлена
            // только как механизм возврата: отпустил раньше порога — пружина
            // сама ставит шторку на место.
            dragElastic={{ top: 0, bottom: 1 }}
            onDragEnd={(_, info) => {
              // Dismiss on a decisive downward flick or a long pull.
              if (info.offset.y > 110 || info.velocity.y > 600) onClose()
            }}
          >
            {/* Грабер и заголовок. Свой обработчик им не нужен — жест ловится
                на всей шторке; touch-action:none оставлен, чтобы здесь браузер
                вообще не пытался ничего листать. */}
            <div
              style={{ position: 'relative', flexShrink: 0, cursor: 'grab', touchAction: 'none', paddingBottom: 2, minHeight: 56 }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--color-bg-5)' }} />
              </div>
              {title && (
                <div id={titleId} style={{ padding: '4px 60px 14px', textAlign: 'center', fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>
                  <FadeText lines={2} style={{ overflowWrap: 'anywhere' }}>{title}</FadeText>
                </div>
              )}
              <button type="button" data-sheet-nodrag aria-label={t('Закрыть')} onClick={onClose} style={{ position: 'absolute', right: 8, top: 8, width: 44, height: 44, border: 'none', borderRadius: 999, display: 'grid', placeItems: 'center', background: 'var(--color-bg-3)', color: 'var(--color-muted)', cursor: 'pointer', touchAction: 'manipulation' }}><X size={20} /></button>
            </div>
            <div
              ref={scrollRef}
              onScroll={onScroll}
              className="no-scrollbar"
              style={{
                overflowY: 'auto',
                overscrollBehavior: 'contain',
                padding: footer
                  ? '10px 20px 20px'
                  : '10px 20px calc(env(safe-area-inset-bottom, 0px) + 20px)',
                // Content melts under the grabber/header instead of hard-cutting:
                // the top edge fades out as rows scroll up to it, and the bottom
                // edge fades under the pinned footer. paddingTop/Bottom keep the
                // first/last row at full opacity while at rest.
                minHeight: 0,
                ...fadeMask(fade, 20, footer ? 48 : 20),
              }}
            >
              {children}
            </div>
            {footer && (
              <div style={{ flexShrink: 0, padding: keyboard.open ? '8px 20px 16px' : '8px 20px calc(env(safe-area-inset-bottom, 0px) + 20px)' }}>
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
