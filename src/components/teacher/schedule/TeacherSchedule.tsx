import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpRight, CalendarClock, CalendarX, CalendarCheck, ChevronLeft, ChevronRight, ChevronDown, ArrowRightToLine, UserCheck } from 'lucide-react'
import Modal from '../../Modal'
import MobileSheet from '../../MobileSheet'
import DateTimeField from '../../DateTimeField'
import { RadioMark } from '../../Radio'
import { CheckboxMark } from '../../Checkbox'
import { MODAL_BACKDROP } from '../../Modal'
import { btn } from '../../../lib/pillStyles'
import { haptic } from '../../../lib/feedback'
import { Z } from '../../../lib/layers'
import { useT } from '../../../lib/i18n'
import {
  useTeacherWeek, todayMsk, addDays, weekStart, scheduleMove, scheduleShift, scheduleCancel,
  scheduleUndo, scheduleError, type SchedItem, type SchedUndo,
} from '../../../lib/teacherSchedule'

/*
 * РАСПИСАНИЕ УЧИТЕЛЯ — в языке Таскли (~/Cursor/Taskly, AgendaView/MonthView).
 *
 *  - Неделя в шапке, лента дня под ней. Свайп по ленте листает дни, по неделе — недели.
 *  - Зажал занятие и тащишь — оно едет за пальцем, день недели под ним подсвечивается;
 *    отпустил на дне — занятие там же по времени. Как `.draggable` + `.dropDestination`.
 *  - Зажал и отпустил на месте (на ПК — правая кнопка) — меню с карточкой сверху,
 *    как `.contextMenu { } preview: { }`: «Перенести» раскрывается на месте.
 *  - После любого действия — тост с «Отменить»: случайный перенос пальцем снимается одним тапом.
 *  - Экран в покое не рисует кадров: анимации только на действие, бесконечных нет.
 *
 * Время — московское: расписание школы в её часах (как DateTimeField).
 */

const HOLD_MS = 420
const SLOP = 8
const WEEKDAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']
const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь']
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
const SPRING = { type: 'spring' as const, stiffness: 420, damping: 32 }

const dayNum = (d: string) => Number(d.slice(8, 10))
const monthIdx = (d: string) => Number(d.slice(5, 7)) - 1
const weekdayIdx = (d: string) => (new Date(`${d}T12:00:00`).getDay() + 6) % 7
const dayLabel = (d: string) => `${WEEKDAYS[weekdayIdx(d)]} ${dayNum(d)} ${MONTHS_GEN[monthIdx(d)]}`
const shortLabel = (d: string) => `${WEEKDAYS[weekdayIdx(d)]} ${dayNum(d)}`

/** 'YYYY-MM-DD' + 'HH:MM' по Москве → ISO UTC для DateTimeField, и обратно. */
const toIso = (day: string, time: string) => {
  const [h, m] = (time || '12:00').split(':').map(Number)
  const [y, mo, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, mo - 1, d, h, m) - 3 * 3600_000).toISOString()
}
const fromIso = (iso: string) => {
  const t = new Date(Date.parse(iso) + 3 * 3600_000).toISOString()
  return { day: t.slice(0, 10), time: t.slice(11, 16) }
}

type Toast = { text: string; undo?: SchedUndo; tone?: 'danger' }

export default function TeacherSchedule({ mobile = false, onOpen, onAttendance }: {
  mobile?: boolean
  /** Нет — тап по занятию открывает меню (на телефоне редактора урока нет). */
  onOpen?: (item: SchedItem) => void
  onAttendance: (item: SchedItem) => void
}) {
  const t = useT()
  const today = todayMsk()
  const [day, setDay] = useState(today)
  const start = weekStart(day)
  const { items, reload } = useTeacherWeek(start)
  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)), [start])
  const list = (items ?? []).filter(i => i.date === day)
  const [dir, setDir] = useState(0)

  const [menu, setMenu] = useState<{ item: SchedItem; rect: DOMRect } | null>(null)
  const [sheet, setSheet] = useState<SchedItem | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [busy, setBusy] = useState(false)

  // ── перетаскивание ─────────────────────────────────────────────────────────
  const cellRefs = useRef<(HTMLDivElement | null)[]>([])
  const [drag, setDrag] = useState<{ item: SchedItem; x: number; y: number; w: number; dx: number; dy: number } | null>(null)
  const [target, setTarget] = useState<string | null>(null)
  const targetRef = useRef<string | null>(null)

  const go = (next: string) => { setDir(next > day ? 1 : -1); setDay(next) }

  const hitDay = (x: number, y: number): string | null => {
    for (let i = 0; i < 7; i++) {
      const r = cellRefs.current[i]?.getBoundingClientRect()
      // Поле приёма выше и ниже ячейки: палец закрывает цифру, в неё не прицелишься.
      if (r && x >= r.left && x <= r.right && y >= r.top - 28 && y <= r.bottom + 28) return week[i]
    }
    return null
  }

  // Перетаскивание кончается на пальце над лентой: свайп дня тогда не считаем.
  const dragged = useRef(false)
  // Что тащим — ещё и в ref: быстрый жест отпускает раньше, чем state успеет отрисоваться.
  const dragItem = useRef<SchedItem | null>(null)
  const startDrag = (item: SchedItem, el: HTMLElement, x: number, y: number) => {
    dragged.current = true
    dragItem.current = item
    const r = el.getBoundingClientRect()
    setDrag({ item, x, y, w: r.width, dx: x - r.left, dy: y - r.top })
  }
  const moveDrag = (x: number, y: number) => {
    setDrag(d => d && { ...d, x, y })
    const hit = hitDay(x, y)
    if (hit !== targetRef.current) {
      if (hit) haptic(6)
      targetRef.current = hit
      setTarget(hit)
    }
  }
  const endDrag = () => {
    const d = dragItem.current && { item: dragItem.current }
    dragItem.current = null
    const to = targetRef.current
    targetRef.current = null
    setTarget(null)
    setDrag(null)
    if (d && to && to !== d.item.date) void run(() => scheduleMove(d.item.id, to, null), `${d.item.who} → ${shortLabel(to)}, ${d.item.time}`)
  }

  // ── действия ───────────────────────────────────────────────────────────────
  const run = async (fn: () => Promise<{ undo: SchedUndo }>, text: string) => {
    if (busy) return
    setBusy(true)
    try {
      const r = await fn()
      haptic(12)
      setToast({ text, undo: r.undo })
    } catch (e) {
      setToast({ text: t(scheduleError(e)), tone: 'danger' })
    } finally {
      setBusy(false)
      reload()
    }
  }
  const undo = async (u: SchedUndo) => {
    setToast(null)
    try { await scheduleUndo(u) } catch (e) { setToast({ text: t(scheduleError(e)), tone: 'danger' }) }
    reload()
  }

  // Тост сам уходит через 5 с — как в Таскли. Новый тост перезапускает отсчёт.
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(id)
  }, [toast])

  // ── свайп ленты: листать дни ───────────────────────────────────────────────
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const onFeedTouchStart = (e: React.TouchEvent) => { swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }
  const onFeedTouchEnd = (e: React.TouchEvent) => {
    const s = swipe.current
    swipe.current = null
    if (!s || dragged.current) { dragged.current = false; return }
    const dx = e.changedTouches[0].clientX - s.x
    const dy = e.changedTouches[0].clientY - s.y
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 2) { haptic(6); go(addDays(day, dx < 0 ? 1 : -1)) }
  }
  const stripSwipe = useRef<number | null>(null)

  const monthTitle = (() => {
    const a = monthIdx(week[0]), b = monthIdx(week[6])
    const m = MONTHS[monthIdx(day)]
    const s = a === b ? m : `${MONTHS[a].slice(0, 3)} — ${MONTHS[b].slice(0, 3)}`
    return s[0].toUpperCase() + s.slice(1)
  })()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, userSelect: drag ? 'none' : undefined }}>
      {/* Шапка: месяц, «Сегодня», недели стрелками — на ПК свайпа нет */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px' }}>
        <div style={{ fontSize: mobile ? 24 : 22, fontWeight: 800, color: 'var(--color-text)', flex: 1 }}>{monthTitle}</div>
        {weekStart(today) !== start && (
          <button onClick={() => go(today)} style={btn('S', 'secondary')}>{t('Сегодня')}</button>
        )}
        {!mobile && (
          <>
            <button aria-label={t('Прошлая неделя')} onClick={() => go(addDays(day, -7))} style={btn('S', 'secondary', { width: 32, padding: 0 })}><ChevronLeft size={16} /></button>
            <button aria-label={t('Следующая неделя')} onClick={() => go(addDays(day, 7))} style={btn('S', 'secondary', { width: 32, padding: 0 })}><ChevronRight size={16} /></button>
          </>
        )}
      </div>

      {/* Неделя */}
      <div
        style={{ display: 'flex', gap: 2, touchAction: 'pan-y' }}
        onTouchStart={e => { stripSwipe.current = e.touches[0].clientX }}
        onTouchEnd={e => {
          const s = stripSwipe.current
          stripSwipe.current = null
          if (s == null || dragged.current) return
          const dx = e.changedTouches[0].clientX - s
          if (Math.abs(dx) > 50) { haptic(6); go(addDays(day, dx < 0 ? 7 : -7)) }
        }}
      >
        {week.map((d, i) => {
          const sel = d === day
          const hot = target === d && drag?.item.date !== d
          const dots = (items ?? []).filter(x => x.date === d && !x.cancelled).slice(0, 3)
          return (
            <motion.div
              key={d}
              ref={el => { cellRefs.current[i] = el }}
              onClick={() => go(d)}
              animate={{ scale: hot ? 1.08 : 1 }}
              transition={SPRING}
              style={{
                flex: 1, minWidth: 0, cursor: 'pointer', borderRadius: 16,
                padding: '6px 0 7px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                background: sel ? 'var(--color-purple)' : hot ? 'color-mix(in srgb, var(--color-purple) 30%, transparent)' : 'transparent',
                transition: 'background 0.15s',
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, color: sel ? 'rgba(255,255,255,0.8)' : 'var(--color-text-3)' }}>{t(WEEKDAYS[i])}</span>
              <span style={{
                fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                color: sel ? '#fff' : d === today ? 'var(--color-purple-text)' : 'var(--color-text)',
              }}>{dayNum(d)}</span>
              <span style={{ display: 'flex', gap: 3, height: 5 }}>
                {dots.map(x => <span key={x.id} style={{ width: 5, height: 5, borderRadius: '50%', background: sel ? '#fff' : x.color }} />)}
              </span>
            </motion.div>
          )
        })}
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-3)', padding: '4px 4px 0' }}>
        {day === today ? `${t('Сегодня')}, ` : day === addDays(today, 1) ? `${t('Завтра')}, ` : ''}{dayLabel(day)}
      </div>

      {/* Лента дня */}
      <div onTouchStart={onFeedTouchStart} onTouchEnd={onFeedTouchEnd} style={{ minHeight: 280, position: 'relative' }}>
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={day}
            custom={dir}
            initial={{ opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -40 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            {items === null ? null : list.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '56px 0', fontSize: 14, color: 'var(--color-text-4)' }}>{t('Занятий нет')}</div>
            ) : list.map(item => (
              <Card
                key={item.id}
                item={item}
                ghost={drag?.item.id === item.id}
                onTap={el => onOpen ? onOpen(item) : setMenu({ item, rect: el.getBoundingClientRect() })}
                onMenu={el => { haptic(10); setMenu({ item, rect: el.getBoundingClientRect() }) }}
                onDragStart={(el, x, y) => { haptic(10); startDrag(item, el, x, y) }}
                onDragMove={moveDrag}
                onDragEnd={endDrag}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Карточка под пальцем */}
      {drag && createPortal(
        <div style={{
          position: 'fixed', left: drag.x - drag.dx, top: drag.y - drag.dy, width: drag.w,
          zIndex: Z.popover, pointerEvents: 'none', transform: 'rotate(-2deg) scale(1.03)',
        }}>
          <CardBody item={drag.item} lifted />
        </div>,
        document.body,
      )}

      <AnimatePresence>
        {menu && (
          <ContextMenu
            key="menu"
            item={menu.item}
            rect={menu.rect}
            onClose={() => setMenu(null)}
            onOpen={onOpen && (() => { setMenu(null); onOpen(menu.item) })}
            onAttendance={() => { setMenu(null); onAttendance(menu.item) }}
            onMove={days => {
              const it = menu.item
              setMenu(null)
              const to = addDays(it.date, days)
              void run(() => scheduleMove(it.id, to, null), `${it.who} → ${shortLabel(to)}, ${it.time}`)
            }}
            onShift={() => {
              const it = menu.item
              setMenu(null)
              void run(() => scheduleShift(it.id), t('Занятия сдвинуты на одно вперёд'))
            }}
            onCancel={() => {
              const it = menu.item
              setMenu(null)
              void run(() => scheduleCancel(it.id), t('Занятие отменено, ученики получат уведомление'))
            }}
            onRestore={() => {
              const it = menu.item
              setMenu(null)
              void run(() => scheduleMove(it.id, it.date, null, false), t('Занятие вернулось в расписание'))
            }}
            onDeep={() => { const it = menu.item; setMenu(null); setSheet(it) }}
          />
        )}
      </AnimatePresence>

      <RescheduleSheet
        mobile={mobile}
        item={sheet}
        onClose={() => setSheet(null)}
        onDone={(fn, text) => { setSheet(null); void run(fn, text) }}
      />

      {createPortal(
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.text + String(!!toast.undo)}
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
              transition={SPRING}
              style={{
                position: 'fixed', left: 16, right: 16, margin: '0 auto', maxWidth: 420, zIndex: Z.toast,
                bottom: mobile ? 'calc(env(safe-area-inset-bottom, 0px) + 96px)' : 24,
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px 12px 16px', borderRadius: 18,
                background: toast.tone === 'danger' ? 'var(--btn-red-bg)' : 'var(--color-text)',
                color: toast.tone === 'danger' ? '#fff' : 'var(--color-bg)',
                boxShadow: 'var(--shadow-4)', fontSize: 14, fontWeight: 600,
              }}
            >
              <span style={{ flex: 1, minWidth: 0 }}>{toast.text}</span>
              {toast.undo && (
                <button onClick={() => undo(toast.undo!)} style={{
                  border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 14, fontWeight: 700, color: 'var(--color-purple-soft)', padding: '4px 2px',
                }}>{t('Отменить')}</button>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  )
}

// ── Карточка занятия ──────────────────────────────────────────────────────────

function CardBody({ item, lifted = false }: { item: SchedItem; lifted?: boolean }) {
  const t = useT()
  const sub = [
    item.number != null && item.number >= 0 && item.fromCourse ? `${t('Урок')} ${item.number + 1}` : '',
    item.title,
  ].filter(Boolean).join(' · ')
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 22,
      background: 'var(--color-bg-2)', border: '1px solid var(--color-border)',
      boxShadow: lifted ? 'var(--shadow-4)' : 'var(--shadow-1)',
    }}>
      <span style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: item.cancelled ? 'var(--color-border-medium)' : item.color, flexShrink: 0 }} />
      <span style={{ display: 'flex', flexDirection: 'column', width: 48, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: item.cancelled ? 'var(--color-text-4)' : 'var(--color-text)', textDecoration: item.cancelled ? 'line-through' : undefined }}>{item.time}</span>
        {item.endTime && <span style={{ fontSize: 12, color: 'var(--color-text-4)' }}>{item.endTime}</span>}
      </span>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span style={{
            fontSize: 15, fontWeight: 700, color: item.cancelled ? 'var(--color-text-3)' : 'var(--color-text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{item.who}</span>
          {item.rec && <Chip>{t('Запись')}</Chip>}
          {item.cancelled && <Chip tone="danger">{t('Отменено')}</Chip>}
        </span>
        {sub && <span style={{ fontSize: 13, color: 'var(--color-text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</span>}
      </span>
    </div>
  )
}

function Chip({ children, tone }: { children: React.ReactNode; tone?: 'danger' }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8, flexShrink: 0,
      background: tone === 'danger' ? 'var(--color-red-soft)' : 'var(--color-bg-3)',
      color: tone === 'danger' ? 'var(--color-red-text)' : 'var(--color-text-3)',
    }}>{children}</span>
  )
}

/**
 * Жесты карточки. Палец — на touch-событиях с {passive:false}: на айфоне Safari
 * шлёт pointercancel, как только решит, что это прокрутка, и указатель больше не
 * ведёт (см. MobileSheet). Мышь — на указателях: сразу тащится, удержание или
 * правая кнопка — меню.
 */
function Card({ item, ghost, onTap, onMenu, onDragStart, onDragMove, onDragEnd }: {
  item: SchedItem
  ghost: boolean
  onTap: (el: HTMLElement) => void
  onMenu: (el: HTMLElement) => void
  onDragStart: (el: HTMLElement, x: number, y: number) => void
  onDragMove: (x: number, y: number) => void
  onDragEnd: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [held, setHeld] = useState(false)
  // Колбэки свежие на каждом рендере, а слушатели вешаются один раз.
  const cb = useRef({ onTap, onMenu, onDragStart, onDragMove, onDragEnd })
  cb.current = { onTap, onMenu, onDragStart, onDragMove, onDragEnd }

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let timer = 0
    let start: { x: number; y: number } | null = null
    let lifted = false
    let dragging = false
    let moved = false

    const reset = () => { clearTimeout(timer); start = null; lifted = false; dragging = false; setHeld(false) }

    // ── палец ──
    const ts = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      const p = e.touches[0]
      start = { x: p.clientX, y: p.clientY }
      moved = false
      timer = window.setTimeout(() => { lifted = true; setHeld(true); haptic(10) }, HOLD_MS)
    }
    const tm = (e: TouchEvent) => {
      if (!start) return
      const p = e.touches[0]
      const far = Math.hypot(p.clientX - start.x, p.clientY - start.y) > SLOP
      if (!lifted) {
        // Сдвинулся до удержания — это прокрутка или свайп дня, не наше.
        if (far) { clearTimeout(timer); start = null; moved = true }
        return
      }
      e.preventDefault()
      if (!dragging && far) { dragging = true; setHeld(false); cb.current.onDragStart(el, p.clientX, p.clientY) }
      if (dragging) cb.current.onDragMove(p.clientX, p.clientY)
    }
    const te = (e: TouchEvent) => {
      const wasLifted = lifted
      const wasDragging = dragging
      reset()
      if (wasDragging) { e.preventDefault(); cb.current.onDragEnd(); return }
      if (wasLifted) { e.preventDefault(); cb.current.onMenu(el); return }
      if (!moved) { e.preventDefault(); cb.current.onTap(el) }
    }
    const tc = () => { const d = dragging; reset(); if (d) cb.current.onDragEnd() }

    // ── мышь ──
    const pd = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      start = { x: e.clientX, y: e.clientY }
      timer = window.setTimeout(() => { if (!dragging) { reset(); cb.current.onMenu(el) } }, 600)
      const pm = (ev: PointerEvent) => {
        if (!start) return
        if (!dragging && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > SLOP) {
          clearTimeout(timer); dragging = true; cb.current.onDragStart(el, ev.clientX, ev.clientY)
        }
        if (dragging) cb.current.onDragMove(ev.clientX, ev.clientY)
      }
      const pu = () => {
        window.removeEventListener('pointermove', pm)
        window.removeEventListener('pointerup', pu)
        const wasDragging = dragging
        const pending = !!start
        reset()
        if (wasDragging) cb.current.onDragEnd()
        else if (pending) cb.current.onTap(el)
      }
      window.addEventListener('pointermove', pm)
      window.addEventListener('pointerup', pu)
    }
    const cm = (e: MouseEvent) => { e.preventDefault(); reset(); cb.current.onMenu(el) }

    el.addEventListener('touchstart', ts, { passive: true })
    el.addEventListener('touchmove', tm, { passive: false })
    el.addEventListener('touchend', te, { passive: false })
    el.addEventListener('touchcancel', tc)
    el.addEventListener('pointerdown', pd)
    el.addEventListener('contextmenu', cm)
    return () => {
      clearTimeout(timer)
      el.removeEventListener('touchstart', ts)
      el.removeEventListener('touchmove', tm)
      el.removeEventListener('touchend', te)
      el.removeEventListener('touchcancel', tc)
      el.removeEventListener('pointerdown', pd)
      el.removeEventListener('contextmenu', cm)
    }
  }, [])

  return (
    <motion.div
      ref={ref}
      animate={{ scale: held ? 1.03 : 1, opacity: ghost ? 0.35 : 1 }}
      transition={SPRING}
      style={{ cursor: 'grab', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' } as CSSProperties}
    >
      <CardBody item={item} />
    </motion.div>
  )
}

// ── Меню удержания ────────────────────────────────────────────────────────────

function ContextMenu({ item, rect, onClose, onOpen, onAttendance, onMove, onShift, onCancel, onRestore, onDeep }: {
  item: SchedItem
  rect: DOMRect
  onClose: () => void
  onOpen?: () => void
  onAttendance: () => void
  onMove: (days: number) => void
  onShift: () => void
  onCancel: () => void
  onRestore: () => void
  onDeep: () => void
}) {
  const t = useT()
  const [sub, setSub] = useState(false)
  // Карточка остаётся там, где была; не влезает меню снизу — всё поднимается.
  const MENU_H = (onOpen ? 5 : 4) * 46 + (sub ? 4 * 42 : 0)
  const vh = window.innerHeight
  const top = Math.max(16, Math.min(rect.top, vh - 16 - MENU_H - rect.height - 10))
  const width = Math.min(rect.width, 420)
  const left = Math.max(16, Math.min(rect.left, window.innerWidth - 16 - width))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const row = (label: string, Icon: typeof ArrowUpRight, act: () => void, opts?: { danger?: boolean; sub?: boolean; open?: boolean }) => (
    <button
      onClick={act}
      className="hover-row"
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%', border: 'none', background: 'transparent',
        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        height: opts?.sub ? 42 : 46, padding: opts?.sub ? '0 16px 0 28px' : '0 16px',
        fontSize: opts?.sub ? 14 : 15, fontWeight: 600,
        color: opts?.danger ? 'var(--color-red-text)' : 'var(--color-text)',
        borderTop: opts?.sub ? 'none' : '1px solid var(--color-border)',
      }}
    >
      <span style={{ flex: 1 }}>{label}</span>
      {opts?.open !== undefined
        ? <motion.span animate={{ rotate: opts.open ? 180 : 0 }} style={{ display: 'flex' }}><ChevronDown size={18} color="var(--color-text-3)" /></motion.span>
        : <Icon size={18} color={opts?.danger ? 'var(--color-red-text)' : 'var(--color-text-3)'} />}
    </button>
  )

  return createPortal(
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ ...MODAL_BACKDROP, zIndex: Z.modal }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
        transition={SPRING}
        style={{ position: 'fixed', top, left, width, zIndex: Z.modal + 1, transformOrigin: 'top center' }}
      >
        <CardBody item={item} lifted />
        <div style={{
          marginTop: 10, borderRadius: 18, overflow: 'hidden', background: 'var(--color-bg-2)',
          boxShadow: 'var(--shadow-4)', maxWidth: 300,
        }}>
          <div style={{ marginTop: -1 }}>
            {onOpen && row(t('Открыть урок'), ArrowUpRight, onOpen)}
            {!item.cancelled && row(t('Перенести'), CalendarClock, () => setSub(s => !s), { open: sub })}
          </div>
          <AnimatePresence initial={false}>
            {sub && (
              <motion.div
                initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                style={{ overflow: 'hidden' }}
              >
                {row(t('Завтра'), CalendarClock, () => onMove(1), { sub: true })}
                {row(t('Послезавтра'), CalendarClock, () => onMove(2), { sub: true })}
                {row(t('Через неделю'), CalendarClock, () => onMove(7), { sub: true })}
                {row(t('Дата, время, весь курс…'), CalendarClock, onDeep, { sub: true })}
              </motion.div>
            )}
          </AnimatePresence>
          {!item.cancelled && row(t('Сдвинуть курс на занятие'), ArrowRightToLine, onShift)}
          {row(t('Посещаемость'), UserCheck, onAttendance)}
          {item.cancelled
            ? row(t('Вернуть занятие'), CalendarCheck, onRestore)
            : row(t('Отменить занятие'), CalendarX, onCancel, { danger: true })}
        </div>
      </motion.div>
    </>,
    document.body,
  )
}

// ── Шторка «Дата, время, весь курс» ───────────────────────────────────────────

type Mode = 'move' | 'shift' | 'cancel'

function RescheduleSheet({ mobile, item, onClose, onDone }: {
  mobile: boolean
  item: SchedItem | null
  onClose: () => void
  onDone: (fn: () => Promise<{ undo: SchedUndo }>, text: string) => void
}) {
  const t = useT()
  const [mode, setMode] = useState<Mode>('move')
  const [when, setWhen] = useState('')
  const [notify, setNotify] = useState(true)

  useEffect(() => {
    if (!item) return
    setMode('move')
    setNotify(true)
    setWhen(toIso(addDays(item.date, 1), item.time))
  }, [item])

  const it = item
  const target = when ? fromIso(when) : null

  const options: { id: Mode; title: string; hint: string }[] = [
    { id: 'move', title: t('Перенести только это занятие'), hint: t('Остальные остаются на своих датах') },
    { id: 'shift', title: t('Сдвинуть курс'), hint: t('Это и все следующие занятия встают на место следующего') },
    { id: 'cancel', title: t('Отменить без переноса'), hint: t('В календаре останется зачёркнутым') },
  ]

  const body = it && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {options.map(o => (
          <button
            key={o.id}
            onClick={() => setMode(o.id)}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 16,
              border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              background: mode === o.id ? 'var(--color-purple-soft)' : 'var(--color-bg-3)',
            }}
          >
            <RadioMark checked={mode === o.id} style={{ marginTop: 1 }} />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{o.title}</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-3)', lineHeight: 1.3 }}>{o.hint}</span>
            </span>
          </button>
        ))}
      </div>

      {mode === 'move' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[[1, t('Завтра')], [2, t('Послезавтра')], [7, t('Через неделю')]].map(([n, label]) => (
              <button key={String(n)} onClick={() => setWhen(toIso(addDays(it.date, Number(n)), target?.time ?? it.time))} style={btn('S', 'secondary')}>{label}</button>
            ))}
          </div>
          {when && <DateTimeField key={when} label={t('Новая дата и время')} value={when} onChange={setWhen} />}
        </div>
      )}

      <button
        onClick={() => setNotify(n => !n)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', padding: 0, fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}
      >
        <CheckboxMark checked={notify} />
        {t('Сообщить ученикам')}
      </button>
    </div>
  )

  const submit = () => {
    if (!it) return
    if (mode === 'move' && target) {
      onDone(() => scheduleMove(it.id, target.day, target.time, notify), `${it.who} → ${shortLabel(target.day)}, ${target.time}`)
    } else if (mode === 'shift') {
      onDone(() => scheduleShift(it.id, notify), t('Занятия сдвинуты на одно вперёд'))
    } else if (mode === 'cancel') {
      onDone(() => scheduleCancel(it.id, notify), t('Занятие отменено'))
    }
  }
  const cta = mode === 'move' ? t('Перенести') : mode === 'shift' ? t('Сдвинуть') : t('Отменить занятие')
  const footer = (
    <button onClick={submit} style={btn('L', mode === 'cancel' ? 'danger' : 'primary')}>{cta}</button>
  )
  const title = it ? `${it.who} · ${shortLabel(it.date)}, ${it.time}` : ''

  if (mobile) {
    return (
      <MobileSheet open={!!it} onClose={onClose} title={title} footer={footer}>
        {body}
      </MobileSheet>
    )
  }
  return (
    <AnimatePresence>
      {it && (
        <Modal key="resched" onClose={onClose} title={title} subtitle={it.title || undefined} width={460} footer={footer}>
          {body}
        </Modal>
      )}
    </AnimatePresence>
  )
}
