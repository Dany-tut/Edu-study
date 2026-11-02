import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useIsPresent, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, CalendarClock, CalendarX, CalendarCheck, ChevronLeft, ChevronRight, ChevronDown, ArrowRightToLine, UserCheck, Plus } from '../../icons/appIcons'
import Modal, { ModalClose } from '../../Modal'
import MobileSheet from '../../MobileSheet'
import FadeText from '../../FadeText'
import { useIsDesktop } from '../../../lib/useIsDesktop'
import DateTimeField from '../../DateTimeField'
import { wallDateTimeInTz, convertWallTime, isMsk, useTeacherTz } from '../../../lib/teacherTz'
import QuickAddLesson from './QuickAddLesson'
import WeekStrip, { type WeekNavigation } from './WeekStrip'
import { CALENDAR_BACKDROP, CALENDAR_EASE } from './calendarMotion'
import { isScheduleLive, isScheduleEnded, scheduleLiveWindow } from '../../../lib/scheduleLive'
import { scheduleDurationMinutes } from '../../../lib/scheduleDuration'
import '../widgets/calendarWidget.css'
import { RadioMark } from '../../Radio'
import { CheckboxMark } from '../../Checkbox'
import { MODAL_BACKDROP } from '../../Modal'
import { btn } from '../../../lib/pillStyles'
import { haptic } from '../../../lib/feedback'
import { Z } from '../../../lib/layers'
import { useT } from '../../../lib/i18n'
import {
  useTeacherWeek, todayMsk, addDays, weekStart, scheduleMove, scheduleShift, scheduleCancel,
  scheduleUndo, scheduleAdd, scheduleError, type SchedItem, type SchedUndo,
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
const fromIso = (iso: string) => wallDateTimeInTz(iso, 'Europe/Moscow')

type Toast = { text: string; undo?: SchedUndo; tone?: 'danger' }

export default function TeacherSchedule({ mobile = false, embedded = false, onOpen, onAttendance }: {
  mobile?: boolean
  /** На Главной: своя рамка снаружи, лента скроллится внутри фиксированной высоты. */
  embedded?: boolean
  /** Нет — тап по занятию открывает меню (на телефоне редактора урока нет). */
  onOpen?: (item: SchedItem) => void
  onAttendance: (item: SchedItem) => void
}) {
  const t = useT()
  const today = todayMsk()
  const [day, setDay] = useState(today)
  const [weekNavigation, setWeekNavigation] = useState<WeekNavigation>(() => ({ start: weekStart(today), revision: 0, offset: 0 }))
  const [visibleDates, setVisibleDates] = useState(() => ({ first: weekStart(today), last: addDays(weekStart(today), 6) }))
  const start = weekStart(day)
  const { items, reload } = useTeacherWeek(start)
  const list = (items ?? []).filter(i => i.date === day)
  const [dir, setDir] = useState(0)

  const overlays = useRef<CalendarOverlayHandle>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [busy, setBusy] = useState(false)

  // ── перетаскивание ─────────────────────────────────────────────────────────
  const cellRefs = useRef(new Map<string, HTMLButtonElement>())
  const [drag, setDrag] = useState<{ item: SchedItem; x: number; y: number; w: number; dx: number; dy: number } | null>(null)
  const [target, setTarget] = useState<string | null>(null)
  const targetRef = useRef<string | null>(null)

  const go = (next: string, navigate = true) => {
    setDir(next > day ? 1 : -1)
    setDay(next)
    if (navigate) {
      setWeekNavigation(navigation => ({ start: weekStart(next), revision: navigation.revision + 1, offset: 0 }))
    }
  }
  const returnToToday = () => {
    setWeekNavigation(navigation => ({ start: weekStart(today), revision: navigation.revision + 1, offset: 0 }))
  }
  const moveVisibleWeek = (direction: -1 | 1) => {
    setWeekNavigation(navigation => ({ ...navigation, offset: navigation.offset + direction }))
  }

  const hitDay = (x: number, y: number): string | null => {
    for (const [date, cell] of cellRefs.current) {
      const r = cell.getBoundingClientRect()
      // Поле приёма выше и ниже ячейки: палец закрывает цифру, в неё не прицелишься.
      if (x >= r.left && x <= r.right && y >= r.top - 28 && y <= r.bottom + 28) {
        const strip = cell.closest('[data-week-strip]')?.getBoundingClientRect()
        if (strip && x >= strip.left && x <= strip.right) return date
      }
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
  const monthTitle = (() => {
    const a = monthIdx(visibleDates.first), b = monthIdx(visibleDates.last)
    const s = a === b ? MONTHS[a] : `${MONTHS[a].slice(0, 3)} — ${MONTHS[b].slice(0, 3)}`
    return s[0].toUpperCase() + s.slice(1)
  })()

  return (
    <div className={embedded ? 'calendar-widget-schedule' : undefined} style={{ display: 'flex', flexDirection: 'column', gap: embedded ? 10 : 12, height: embedded ? '100%' : undefined, minHeight: 0, userSelect: drag ? 'none' : undefined }}>
      {/* Шапка: месяц, «Сегодня», недели стрелками */}
      <div className="calendar-widget-header" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px' }}>
        <div className="calendar-widget-title" style={{ fontSize: mobile ? 24 : embedded ? 17 : 22, fontWeight: 800, color: 'var(--color-text)', flex: 1 }}>{monthTitle}</div>
        <div className="calendar-widget-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!mobile && (
            <button
              aria-label={t('Добавить занятие')}
              onClick={() => overlays.current?.openAdd(day)}
              style={btn('S', 'primary', { width: 32, padding: 0 })}
            ><Plus size={17} /></button>
          )}
          {(visibleDates.first !== weekStart(today) || visibleDates.last !== addDays(weekStart(today), 6)) && (
            <button onClick={returnToToday} style={btn('S', 'secondary')}>{t('Сегодня')}</button>
          )}
          {!mobile && (
            <>
              <button aria-label={t('Прошлая неделя')} onClick={() => moveVisibleWeek(-1)} style={btn('S', 'secondary', { width: 32, padding: 0 })}><ChevronLeft size={16} /></button>
              <button aria-label={t('Следующая неделя')} onClick={() => moveVisibleWeek(1)} style={btn('S', 'secondary', { width: 32, padding: 0 })}><ChevronRight size={16} /></button>
            </>
          )}
        </div>
      </div>

      {/* Неделя */}
      <WeekStrip
        navigation={weekNavigation}
        label={t('Выбор недели')}
        onVisibleRangeChange={(first, last) => setVisibleDates({ first, last })}
        renderDay={(d, i) => {
          const sel = d === day
          const hot = target === d && drag?.item.date !== d
          const dots = (items ?? []).filter(x => x.date === d && !x.cancelled).slice(0, 3)
          return (
            <motion.button
              key={d}
              type="button"
              aria-label={dayLabel(d)}
              aria-pressed={sel}
              aria-current={d === today ? 'date' : undefined}
              ref={el => { if (el) cellRefs.current.set(d, el); else cellRefs.current.delete(d) }}
              onMouseDown={event => {
                event.preventDefault()
                event.currentTarget.focus({ preventScroll: true })
              }}
              onClick={() => go(d, false)}
              animate={{ scale: hot ? 1.08 : 1 }}
              transition={SPRING}
              style={{
                flex: 1, minWidth: 0, margin: '0 3px', cursor: 'pointer', borderRadius: 16, border: 0, outline: 'none', font: 'inherit',
                padding: '6px 0 7px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                background: sel ? 'var(--color-purple)' : hot ? 'color-mix(in srgb, var(--color-purple) 30%, transparent)' : 'transparent',
                boxShadow: d === today && !sel ? 'inset 0 0 0 2px var(--color-purple)' : undefined,
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
            </motion.button>
          )
        }}
      />

      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-3)', padding: '4px 4px 0' }}>
        {day === today ? `${t('Сегодня')}, ` : day === addDays(today, 1) ? `${t('Завтра')}, ` : ''}{dayLabel(day)}
      </div>

      {/* Лента дня */}
      <div
        onTouchStart={onFeedTouchStart}
        onTouchEnd={onFeedTouchEnd}
        className={embedded ? 'no-scrollbar' : undefined}
        style={embedded
          ? { flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', position: 'relative', paddingRight: 4,
              maskImage: 'linear-gradient(to bottom, black calc(100% - 16px), transparent)',
              WebkitMaskImage: 'linear-gradient(to bottom, black calc(100% - 16px), transparent)' }
          : { minHeight: mobile ? 150 : 280, position: 'relative' }}
      >
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
              <div style={{ textAlign: 'center', padding: mobile ? '36px 0' : '56px 0', fontSize: 14, color: 'var(--color-text-4)' }}>{t('Занятий нет')}</div>
            ) : list.map(item => (
              <Card
                key={item.id}
                item={item}
                ghost={drag?.item.id === item.id}
                onTap={el => onOpen ? onOpen(item) : overlays.current?.openMenu(item, el.getBoundingClientRect(), el)}
                onMenu={el => { haptic(10); overlays.current?.openMenu(item, el.getBoundingClientRect(), el) }}
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

      <CalendarOverlays ref={overlays} mobile={mobile} onOpen={onOpen}
        onAttendance={onAttendance} onAction={run} onSelectDay={go} />

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

function useLiveLesson(item: SchedItem) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const sync = () => {
      clearTimeout(timer)
      const now = Date.now()
      setNow(now)
      const window = scheduleLiveWindow(item)
      const dayEnd = !item.endTime ? Date.parse(`${item.date}T00:00:00+03:00`) + 86_400_000 : null
      const next = window ? (now < window.start ? window.start : now < window.end ? window.end : null)
        : dayEnd != null && Number.isFinite(dayEnd) && now < dayEnd ? dayEnd : null
      if (next != null) timer = setTimeout(sync, Math.min(next - now + 20, 2_147_483_647))
    }
    sync()
    // Resync after a sleeping/background tab without polling the whole calendar.
    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', sync)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('focus', sync)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [item.date, item.time, item.endTime, item.cancelled, item.rec, item.status])
  return { live: isScheduleLive(item, now), ended: isScheduleEnded(item, now) }
}

function CardBody({ item, lifted = false, preview = false }: { item: SchedItem; lifted?: boolean; preview?: boolean }) {
  const t = useT()
  const mobile = !useIsDesktop()
  const { live, ended } = useLiveLesson(item)
  const viewTz = useTeacherTz(s => s.tz)
  const localStart = isMsk(viewTz) ? null : convertWallTime(item.date, item.time, 'Europe/Moscow', viewTz)
  const localEnd = isMsk(viewTz) || !item.endTime ? null : convertWallTime(item.date, item.endTime, 'Europe/Moscow', viewTz)
  const startTime = localStart?.time ?? item.time
  const endTime = localEnd?.time ?? item.endTime
  const duration = scheduleDurationMinutes(item.time, item.endTime)
  const format = item.isIndividual === undefined ? null : t(item.isIndividual ? 'Индивидуально' : 'Группа')
  const sub = [
    item.number != null && item.number >= 0 && item.fromCourse ? `${t('Урок')} ${item.number + 1}` : '',
    item.title,
  ].filter(Boolean).join(' · ')
  return (
    <div className={`calendar-widget-lesson${preview ? ' calendar-widget-lesson-preview' : ''}`} data-live={live || undefined} data-ended={ended || undefined} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 22,
      background: live ? 'var(--color-accent-soft)' : 'var(--color-bg-2)',
      border: `1px solid ${live ? 'var(--color-purple)' : 'var(--color-border)'}`,
      transition: 'background-color 0.2s ease, border-color 0.2s ease',
      boxShadow: lifted ? 'var(--shadow-4)' : 'var(--shadow-1)',
    }}>
      <span style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: item.cancelled ? 'var(--color-border-medium)' : item.color, flexShrink: 0 }} />
      <span className="calendar-widget-time" style={{ display: 'flex', flexDirection: 'column', width: preview ? 78 : localStart ? 68 : 48, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: item.cancelled ? 'var(--color-text-4)' : 'var(--color-text)', textDecoration: item.cancelled ? 'line-through' : undefined }}>{startTime}</span>
        {localStart
          ? <span style={{ fontSize: 11, fontWeight: 500, lineHeight: 1.35, color: 'var(--color-text-2)', whiteSpace: 'nowrap' }}>{item.time} МСК</span>
          : item.endTime && <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-2)' }}>{endTime}</span>}
        {localStart && item.endTime && <span style={{ fontSize: 11, fontWeight: 500, lineHeight: 1.35, color: 'var(--color-text-2)' }}>до {endTime}</span>}
      </span>
      <span className="calendar-widget-details" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span className="calendar-widget-person" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, minWidth: 0 }}>
          {preview ? <span className="calendar-widget-preview-name">{item.who}</span> : <FadeText enabled={mobile} style={{
            fontSize: 15, fontWeight: 700, color: item.cancelled ? 'var(--color-text-3)' : 'var(--color-text)',
          }}>{item.who}</FadeText>}
          {live && <Chip tone="live">{t('ИДЁТ СЕЙЧАС')}</Chip>}
          {item.rec && <Chip>{t('Запись')}</Chip>}
          {item.cancelled && <Chip tone="danger">{t('Отменено')}</Chip>}
        </span>
        {sub && (preview
          ? <span className="calendar-widget-preview-subtitle">{sub}</span>
          : <FadeText enabled={mobile} className="calendar-widget-subtitle" style={{ fontSize: 13, color: 'var(--color-text-3)' }}>{sub}</FadeText>)}
        <span className="calendar-widget-metadata">
          {item.subject && <span className="calendar-widget-subject">{t(item.subject)}</span>}
          {item.level && <span>{item.level}</span>}
          {format && <span>{format}</span>}
          {duration !== null && <span>{duration} {t('мин')}</span>}
        </span>
      </span>
    </div>
  )
}

function Chip({ children, tone }: { children: React.ReactNode; tone?: 'danger' | 'live' }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8, flexShrink: 0,
      background: tone === 'live' ? 'var(--color-purple)' : tone === 'danger' ? 'var(--color-red-soft)' : 'var(--color-bg-3)',
      color: tone === 'live' ? '#fff' : tone === 'danger' ? 'var(--color-red-text)' : 'var(--color-text-3)',
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

// Overlay state is deliberately separate: opening a menu must not rerender
// every animated day and lesson behind it.
type CalendarOverlayHandle = {
  openMenu: (item: SchedItem, rect: DOMRect, source?: HTMLElement) => void
  openAdd: (day: string) => void
}

const CalendarOverlays = forwardRef<CalendarOverlayHandle, {
  mobile: boolean
  onOpen?: (item: SchedItem) => void
  onAttendance: (item: SchedItem) => void
  onAction: (fn: () => Promise<{ undo: SchedUndo }>, text: string) => Promise<void>
  onSelectDay: (day: string) => void
}>(function CalendarOverlays({ mobile, onOpen, onAttendance, onAction, onSelectDay }, ref) {
  const t = useT()
  const [menu, setMenu] = useState<{ item: SchedItem; rect: DOMRect; source?: HTMLElement; session: number } | null>(null)
  const menuSession = useRef(0)
  const pendingMenuAction = useRef<(() => void) | null>(null)
  const dismissMenu = (afterClose?: () => void) => {
    pendingMenuAction.current = afterClose ?? null
    setMenu(null)
  }
  const [sheet, setSheet] = useState<SchedItem | null>(null)
  const [addDay, setAddDay] = useState<string | null>(null)

  useImperativeHandle(ref, () => ({
    openMenu: (item, rect, source) => {
      pendingMenuAction.current = null
      setMenu({ item, rect, source, session: ++menuSession.current })
    },
    openAdd: day => setAddDay(day),
  }), [])

  return (
    <>
      {/* A new opening replaces an unfinished exit immediately: never stack glass layers. */}
      <AnimatePresence key={menuSession.current} onExitComplete={() => {
        const action = pendingMenuAction.current
        pendingMenuAction.current = null
        action?.()
      }}>
        {menu && (
          <ContextMenu
            key={menu.session}
            item={menu.item}
            rect={menu.rect}
            source={menu.source}
            onClose={() => dismissMenu()}
            onOpen={onOpen && (() => dismissMenu(() => onOpen(menu.item)))}
            onAttendance={() => dismissMenu(() => onAttendance(menu.item))}
            onMove={days => {
              const it = menu.item
              setMenu(null)
              const to = addDays(it.date, days)
              void onAction(() => scheduleMove(it.id, to, null), `${it.who} → ${shortLabel(to)}, ${it.time}`)
            }}
            onShift={() => {
              const it = menu.item
              setMenu(null)
              void onAction(() => scheduleShift(it.id), t('Занятия сдвинуты на одно вперёд'))
            }}
            onCancel={() => {
              const it = menu.item
              setMenu(null)
              void onAction(() => scheduleCancel(it.id), t('Занятие отменено, ученики получат уведомление'))
            }}
            onRestore={() => {
              const it = menu.item
              setMenu(null)
              void onAction(() => scheduleMove(it.id, it.date, null, false), t('Занятие вернулось в расписание'))
            }}
            onDeep={() => { const it = menu.item; dismissMenu(() => setSheet(it)) }}
          />
        )}
      </AnimatePresence>

      <RescheduleSheet
        mobile={mobile}
        item={sheet}
        onClose={() => setSheet(null)}
        onDone={(fn, text) => { setSheet(null); void onAction(fn, text) }}
      />

      <AnimatePresence>
        {addDay !== null && !mobile && (
          <QuickAddLesson
            key="quick-add"
            day={addDay}
            onClose={() => setAddDay(null)}
            onMove={(id, date, time, notify) => { setAddDay(null); onSelectDay(date); void onAction(() => scheduleMove(id, date, time, notify), `${shortLabel(date)}, ${time}`) }}
            onAdd={(gid, title, date, time, notify) => { setAddDay(null); onSelectDay(date); void onAction(() => scheduleAdd(gid, null, title, date, time, notify), `${title} · ${shortLabel(date)}, ${time}`) }}
          />
        )}
      </AnimatePresence>

    </>
  )
})

// ── Меню удержания ────────────────────────────────────────────────────────────

// Overlapping exit/entry animations may briefly share a source. Restore it
// only after the final owner leaves, using the visibility from before any menu.
const hiddenMenuSources = new WeakMap<HTMLElement, { visibility: string; owners: number }>()

function ContextMenu({ item, rect, source, onClose, onOpen, onAttendance, onMove, onShift, onCancel, onRestore, onDeep }: {
  item: SchedItem
  rect: DOMRect
  source?: HTMLElement
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
  const isPresent = useIsPresent()
  const reducedMotion = useReducedMotion()
  const transition = { duration: reducedMotion ? 0 : isPresent ? 0.14 : 0.1, ease: CALENDAR_EASE }
  const submenuTransition = { duration: reducedMotion ? 0 : 0.16, ease: CALENDAR_EASE }
  const presentRef = useRef(isPresent)
  presentRef.current = isPresent
  const panelRef = useRef<HTMLDivElement>(null)
  // Restore the original before paint when the lifted layer is removed.
  useLayoutEffect(() => {
    if (!source) return
    const entry = hiddenMenuSources.get(source) ?? { visibility: source.style.visibility, owners: 0 }
    entry.owners++
    hiddenMenuSources.set(source, entry)
    source.style.visibility = 'hidden'
    return () => {
      if (--entry.owners === 0) {
        source.style.visibility = entry.visibility
        hiddenMenuSources.delete(source)
      }
    }
  }, [source])
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))
  useEffect(() => {
    const resize = () => setViewport({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])
  // Keep the lesson in place and anchor actions on the side with usable space.
  const width = Math.min(rect.width, viewport.width - 24)
  const left = Math.max(12, Math.min(rect.left, viewport.width - width - 12))
  const below = Math.max(0, viewport.height - rect.bottom - 20)
  const above = Math.max(0, rect.top - 24)
  // Choose a side once from the anchor geometry, never from submenu height.
  // A bottom anchor lets an upward menu grow smoothly away from the lesson.
  const opensAbove = below < 246 && above > below
  const availableHeight = opensAbove ? above : below
  const placement = opensAbove
    ? { bottom: viewport.height - rect.top + 12 }
    : { top: rect.bottom + 8 }

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    panelRef.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (!presentRef.current) return
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
      if (e.key !== 'Tab') return
      const buttons = Array.from(panelRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? [])
      const first = buttons[0], last = buttons[buttons.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (previousFocus?.isConnected && !document.querySelector('.calendar-context-panel')) previousFocus.focus({ preventScroll: true })
    }
  }, [onClose])

  const row = (label: string, Icon: typeof ArrowUpRight, act: () => void, opts?: { danger?: boolean; primary?: boolean; sub?: boolean; open?: boolean }) => (
    <button
      onClick={act}
      aria-expanded={opts?.open}
      className="hover-row"
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%', border: 'none', background: 'transparent',
        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        height: opts?.sub ? 42 : 46, padding: opts?.sub ? '0 16px 0 28px' : '0 16px',
        fontSize: opts?.sub ? 14 : 15, fontWeight: 600,
        color: opts?.danger ? 'var(--color-red-text)' : opts?.primary ? 'var(--color-purple-text)' : 'var(--color-text)',
        borderTop: opts?.sub ? 'none' : '1px solid var(--color-border)',
      }}
    >
      <span style={{ flex: 1 }}>{label}</span>
      {opts?.open !== undefined
        ? <motion.span animate={{ rotate: opts.open ? 180 : 0 }} transition={submenuTransition} style={{ display: 'flex' }}><ChevronDown size={18} color="var(--color-text-3)" /></motion.span>
        : <Icon size={18} color={opts?.danger ? 'var(--color-red-text)' : opts?.primary ? 'var(--color-purple-text)' : 'var(--color-text-3)'} />}
    </button>
  )

  return createPortal(
    <>
      <motion.div className="calendar-context-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={transition}
        onClick={() => { if (isPresent) onClose() }}
        onContextMenu={e => { e.preventDefault(); if (isPresent) onClose() }}
        style={{ ...MODAL_BACKDROP, ...CALENDAR_BACKDROP, zIndex: Z.modal, pointerEvents: isPresent ? 'auto' : 'none' }}
      />
      <motion.div
        aria-hidden="true"
        className="calendar-context-lifted" data-calendar-item={item.id}
        initial={{ y: 0, scale: 1, opacity: 1 }}
        animate={{ y: reducedMotion ? 0 : -4, scale: reducedMotion ? 1 : 1.012, opacity: 1 }}
        exit={{ y: 0, scale: 1, opacity: 1 }}
        transition={transition}
        style={{ position: 'fixed', left: rect.left, top: rect.top, width: rect.width, zIndex: Z.modal + 1, pointerEvents: 'none', transformOrigin: 'center bottom' }}
      >
        <CardBody item={item} lifted={isPresent} />
      </motion.div>
      <div className="calendar-context-positioner" data-side={opensAbove ? 'above' : 'below'} style={{ zIndex: Z.modal + 1, left, ...placement, width, maxHeight: availableHeight }}>
      <motion.div ref={panelRef}
        role="dialog" aria-modal="true" aria-label={t('Занятие')} tabIndex={-1}
        className="calendar-context-panel"
        initial={{ opacity: 0, y: opensAbove ? -8 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: opensAbove ? -8 : 8 }}
        transition={transition}
        onContextMenu={e => e.preventDefault()}
        style={{ width: '100%', maxHeight: availableHeight, pointerEvents: isPresent ? 'auto' : 'none' }}
      >
        <div className="calendar-context-content no-scrollbar">
        <div className="calendar-context-actions">
          <div style={{ marginTop: -1 }}>
            {onOpen && row(t('Открыть урок'), ArrowUpRight, onOpen, { primary: true })}
            {!item.cancelled && row(t('Перенести'), CalendarClock, () => setSub(s => !s), { open: sub })}
          </div>
          <AnimatePresence initial={false}>
            {sub && (
              <motion.div
                initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                transition={submenuTransition}
                style={{ overflow: 'hidden' }}
              >
                {row(t('Завтра'), CalendarClock, () => onMove(1), { sub: true })}
                {row(t('Послезавтра'), CalendarClock, () => onMove(2), { sub: true })}
                {row(t('Через неделю'), CalendarClock, () => onMove(7), { sub: true })}
                {row(t('Дата, время, весь курс…'), CalendarClock, onDeep, { sub: true })}
              </motion.div>
            )}
          </AnimatePresence>
          {row(t('Посещаемость'), UserCheck, onAttendance)}
          {!item.cancelled && row(t('Сдвинуть курс на занятие'), ArrowRightToLine, onShift)}
          {item.cancelled
            ? row(t('Вернуть занятие'), CalendarCheck, onRestore)
            : row(t('Отменить занятие'), CalendarX, onCancel, { danger: true })}
        </div>
        </div>
      </motion.div>
      </div>
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
        <Modal key="resched" onClose={onClose} title={title} subtitle={it.title || undefined} width={460} footer={footer} backdropStyle={CALENDAR_BACKDROP}>
          {body}
        </Modal>
      )}
    </AnimatePresence>
  )
}
