import { useEffect, useRef } from 'react'
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
  const sheetRef = useRef<HTMLDivElement>(null)
  // onClose внутри слушателей — через ref: переподписывать touch-события на
  // каждый новый колбэк родителя нельзя, посреди жеста это его обрывает.
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  // Мышью тянут за что угодно — у указателя мыши нет спора со скроллом.
  const startDrag = (e: ReactPointerEvent) => {
    if (e.pointerType !== 'mouse') return
    if (e.button !== 0) return
    dragControls.start(e)
  }

  // Палец: свой жест на touch-событиях (см. шапку файла) + замок на страницу
  // позади шторки — она не должна листаться под ней.
  useEffect(() => {
    if (!open) return
    let id: number | null = null
    let startY = 0
    let startX = 0
    let mode: 'wait' | 'pull' | 'scroll' = 'wait'
    let lastY = 0
    let lastT = 0
    let vy = 0

    const finger = (e: TouchEvent) => Array.from(e.touches).find(t => t.identifier === id)
      ?? Array.from(e.changedTouches).find(t => t.identifier === id)

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0]
      // Второй палец посреди жеста (щипок, случайное касание) — не наш случай.
      if (e.touches.length !== 1 || !sheetRef.current?.contains(t.target as Node)) { id = null; return }
      id = t.identifier
      startY = lastY = t.clientY
      startX = t.clientX
      lastT = e.timeStamp
      vy = 0
      mode = 'wait'
    }

    const onMove = (e: TouchEvent) => {
      const sc = scrollRef.current
      const target = e.target as Node
      const inScroll = !!sc && sc.contains(target)
      const scrollable = !!sc && sc.scrollHeight > sc.clientHeight + 1
      if (id === null) {
        // Касание мимо шторки (фон, страница под ней) — глушим целиком.
        if (!inScroll || !scrollable) e.preventDefault()
        return
      }
      const t = finger(e)
      if (!t) return
      const dy = t.clientY - startY
      const dx = t.clientX - startX
      if (mode === 'wait') {
        if (Math.abs(dy) < 4 && Math.abs(dx) < 4) { if (!inScroll || !scrollable) e.preventDefault(); return }
        const atTop = !inScroll || !scrollable || sc!.scrollTop <= 0
        mode = dy > 0 && Math.abs(dy) > Math.abs(dx) && atTop ? 'pull' : 'scroll'
      }
      if (mode === 'pull') {
        // Гасим ДО того, как Safari начнёт скроллить: иначе он заберёт жест и
        // пришлёт нам pointercancel вместо движений.
        e.preventDefault()
        const now = e.timeStamp
        if (now > lastT) vy = ((t.clientY - lastY) / (now - lastT)) * 1000
        lastY = t.clientY
        lastT = now
        y.set(Math.max(0, dy - 4))
        return
      }
      // Скролл: списку — его прокрутка, всему остальному — замок.
      if (!inScroll || !scrollable) e.preventDefault()
    }

    const onEnd = () => {
      if (id === null) return
      const pulled = mode === 'pull'
      const offset = y.get()
      id = null
      mode = 'wait'
      if (!pulled) return
      // Решительный рывок или длинная протяжка закрывают; всё, что меньше, —
      // пружиной обратно.
      if (offset > 110 || vy > 600) closeRef.current()
      else animate(y, 0, { type: 'spring', stiffness: 500, damping: 42 })
    }

    document.addEventListener('touchstart', onStart, { passive: false })
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd)
    document.addEventListener('touchcancel', onEnd)
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
      document.removeEventListener('touchcancel', onEnd)
    }
  }, [open, y])

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
            ref={sheetRef}
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
              // Низа у шторки нет: контент уходит под край экрана, как на
              // главной и в курсах. Отступ под safe-area живёт внутри —
              // в прокрутке (или в подвале), а не мёртвой полосой под ними.
              maxHeight: '85dvh',
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
                padding: footer
                  ? '10px 20px 20px'
                  : '10px 20px calc(env(safe-area-inset-bottom, 0px) + 20px)',
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
              <div style={{ flexShrink: 0, padding: '8px 20px calc(env(safe-area-inset-bottom, 0px) + 20px)' }}>
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
