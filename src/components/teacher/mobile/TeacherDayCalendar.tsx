import { useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { animate, motion, useReducedMotion } from 'framer-motion'
import { addDays, weekStart } from '../../../lib/teacherSchedule'
import { useScrollFades } from '../../../lib/useScrollFades'
import { useT } from '../../../lib/i18n'
import { markScrollSet } from '../../../lib/useNavCollapse'
import { MOBILE_SCROLL_ATTR } from '../../MobileScreen'
import { createPortal } from 'react-dom'
import { tactile } from '../../../lib/feedback'
import './teacherDayCalendar.css'

export const CALENDAR_VIEWS = ['Неделя', 'Месяц', 'По часам'] as const
export type CalendarView = 0 | 1 | 2

const WEEK_BUFFER = 35
const WEEK_HEIGHT = 48
const MONTH_BUFFER = 28
const WINDOW_SIZE = WEEK_BUFFER * 2 + 7
const clamp = (value: number) => Math.max(0, Math.min(1, value))
const RUBBER_LIMIT = 18
const RUBBER_RESISTANCE = 70
const rubberBand = (distance: number) => Math.sign(distance) * RUBBER_LIMIT * (1 - Math.exp(-Math.abs(distance) / RUBBER_RESISTANCE))
const rubberDistance = (offset: number) => -Math.sign(offset) * RUBBER_RESISTANCE * Math.log(1 - Math.min(.999, Math.abs(offset) / RUBBER_LIMIT))
const easeFade = (value: number) => {
  const t = clamp(value)
  return t * t * (3 - 2 * t)
}
const datePitch = (el: HTMLElement) => (el.firstElementChild?.clientWidth ?? el.clientWidth) / 7
const dateAtNoon = (day: string) => new Date(`${day}T12:00:00`)

export default function TeacherDayCalendar({ day, today, mode, locale, markedDays, onPick, onMode, hours, summary, pinnedHost }: {
  day: string
  today: string
  mode: CalendarView
  locale: string
  markedDays: ReadonlySet<string>
  onPick: (day: string) => void
  onMode: (mode: CalendarView) => void
  hours: ReactNode
  summary: ReactNode
  pinnedHost: HTMLElement | null
}) {
  const t = useT()
  const [origin, setOrigin] = useState(() => weekStart(day))
  const [monthPage, setMonthPage] = useState(day.slice(0, 7))
  const [shownMonth, setShownMonth] = useState(monthPage)
  const scroll = useRef<HTMLDivElement>(null)
  const pendingOffset = useRef<number | null>(null)
  const previousDay = useRef(day)
  const drag = useRef<{ id: number; x: number; y: number; left: number; progress: number; rubber: number; hourly: number; lastY: number; lastAt: number; speed: number; axis?: 'x' | 'y' } | null>(null)
  const blockClick = useRef(0)
  const root = useRef<HTMLElement>(null)
  const gestureLayer = useRef<HTMLDivElement>(null)
  const monthScroll = useRef<HTMLDivElement>(null)
  const summaryLayer = useRef<HTMLDivElement>(null)
  const monthLayer = useRef<HTMLDivElement>(null)
  const hoursLayer = useRef<HTMLDivElement>(null)
  const progress = useRef<number>(mode === 1 ? 1 : 0)
  const dayProgress = useRef<number>(mode === 2 ? 1 : 0)
  const previousMode = useRef(mode)
  const rubber = useRef(0)
  const animation = useRef<{ stop: () => void } | null>(null)
  const reducedMotion = useReducedMotion()
  const dimensions = useRef({ week: WEEK_HEIGHT, month: 280, hours: 0, summary: 0 })

  function paint(month: number, hours = dayProgress.current, stretch = rubber.current) {
    progress.current = month
    dayProgress.current = hours
    rubber.current = stretch
    const bodyStyle = root.current?.style
    const style = gestureLayer.current?.style
    const calendarOpacity = 1 - hours
    const { week, month: monthHeight, summary } = dimensions.current
    const dateHeight = week + (monthHeight - week) * month
    // Fade the two sets of numerals in turn so they never sit on top of each other.
    style?.setProperty('--day-week-opacity', String((1 - easeFade(month / .16)) * calendarOpacity))
    style?.setProperty('--day-month-opacity', String(easeFade((month - .16) / .18) * calendarOpacity))
    style?.setProperty('--day-month-title-opacity', String(easeFade((month - .16) / .34)))
    style?.setProperty('--day-month-title-y', `${-4 * (1 - easeFade((month - .16) / .34))}px`)
    style?.setProperty('--day-date-flight', `${hours * 90}px`)
    style?.setProperty('--day-calendar-height', `${(dateHeight + stretch) * calendarOpacity}px`)
    style?.setProperty('--day-calendar-scale', String(1 + stretch / dateHeight))
    style?.setProperty('--day-grip-scale', String(1 + Math.abs(stretch) / 100))
    style?.setProperty('--day-fold-fade', `${24 * Math.max(Math.sin(Math.PI * month), Math.sin(Math.PI * hours))}px`)
    bodyStyle?.setProperty('--day-hours-height', `${dimensions.current.hours * hours}px`)
    bodyStyle?.setProperty('--day-summary-height', `${summary * (1 - hours)}px`)
    bodyStyle?.setProperty('--day-summary-opacity', String(1 - hours))
    bodyStyle?.setProperty('--day-sheet-fade', `${22 * Math.sin(Math.PI * hours)}px`)
  }

  function markFlightDirections() {
    for (const strip of [scroll.current, monthScroll.current]) {
      if (!strip) continue
      const center = strip.scrollLeft + strip.clientWidth / 2
      const directions = Array.from(strip.querySelectorAll<HTMLElement>('.teacher-day-date'), button => ({
        button,
        direction: button.offsetLeft + button.offsetWidth / 2 < center ? '-1' : '1',
      }))
      for (const { button, direction } of directions) button.style.setProperty('--day-flight-direction', direction)
    }
  }

  function settle(target: CalendarView) {
    animation.current?.stop()
    const monthFrom = progress.current, dayFrom = dayProgress.current, stretchFrom = rubber.current
    const monthTo = target === 2 ? monthFrom : target
    const dayTo = target === 2 ? 1 : 0
    if (target === 2 || dayFrom > 0) markFlightDirections()
    if (reducedMotion || (Math.abs(monthFrom - monthTo) < .001 && Math.abs(dayFrom - dayTo) < .001 && Math.abs(stretchFrom) < .1)) {
      paint(monthTo, dayTo, 0)
      return
    }
    animation.current = animate(0, 1, {
      duration: Math.abs(stretchFrom) > 0 ? .36 : .30, ease: [0.22, 1, 0.36, 1],
      onUpdate: frame => paint(monthFrom + (monthTo - monthFrom) * frame, dayFrom + (dayTo - dayFrom) * frame, stretchFrom * (1 - frame)),
      onComplete: () => paint(monthTo, dayTo, 0),
    })
  }

  useLayoutEffect(() => {
    if ((mode === 2 || previousMode.current === 2) && mode !== previousMode.current) {
      const scroller = root.current?.closest<HTMLElement>(`[${MOBILE_SCROLL_ATTR}]`)
      if (scroller?.scrollTop) {
        markScrollSet(scroller, 0)
        scroller.scrollTop = 0
      }
    }
    previousMode.current = mode
    settle(mode)
    return () => animation.current?.stop()
    // The live gesture owns progress until the selected mode changes.
  }, [mode, reducedMotion])

  useLayoutEffect(() => {
    const month = monthLayer.current
    const hourly = hoursLayer.current
    const week = scroll.current
    const summary = summaryLayer.current
    if (!month || !hourly || !week || !summary) return
    const measure = () => {
      dimensions.current = { week: week.offsetHeight, month: month.offsetHeight, hours: hourly.offsetHeight, summary: summary.offsetHeight }
      paint(progress.current)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(week)
    observer.observe(month)
    observer.observe(hourly)
    observer.observe(summary)
    measure()
    return () => observer.disconnect()
  }, [pinnedHost])

  useScrollFades(monthScroll, !!pinnedHost, '.teacher-day-month-track', 38)
  useLayoutEffect(() => {
    const el = monthScroll.current
    if (el) el.scrollLeft = MONTH_BUFFER * datePitch(el)
    setShownMonth(monthPage)
  }, [monthPage, pinnedHost])

  function positionForDrag(start: number, dy: number) {
    const distance = Math.max(48, dimensions.current.month - dimensions.current.week)
    const raw = start + dy / distance
    const position = clamp(raw)
    return { position, overshoot: (raw - position) * distance }
  }
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  const fullDate = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' })

  useScrollFades(scroll, !!pinnedHost, '.teacher-day-date-track', 38)

  useLayoutEffect(() => {
    const el = scroll.current
    if (!el) return
    const cell = datePitch(el)
    el.scrollLeft = (pendingOffset.current ?? WEEK_BUFFER) * cell
    pendingOffset.current = null
  }, [origin, pinnedHost])

  useLayoutEffect(() => {
    const before = previousDay.current
    previousDay.current = day
    if (before === day) return
    setMonthPage(day.slice(0, 7))
    const el = scroll.current
    const button = el?.querySelector<HTMLElement>(`[data-date="${day}"]`)
    if (!el || !button) {
      setOrigin(weekStart(day))
      return
    }
    const bounds = button.getBoundingClientRect()
    const viewport = el.getBoundingClientRect()
    if (bounds.left < viewport.left || bounds.right > viewport.right) el.scrollLeft += bounds.left - viewport.left
  }, [day])

  function extendStrip() {
    const el = scroll.current
    if (!el?.clientWidth) return
    const position = el.scrollLeft / (datePitch(el))
    const shift = position < 7 ? -28 : position > WINDOW_SIZE - 14 ? 28 : 0
    if (shift) {
      pendingOffset.current = position - shift
      if (drag.current?.axis === 'x') drag.current.left -= shift * datePitch(el)
      setOrigin(value => addDays(value, shift))
    }
  }

  function move(event: PointerEvent<HTMLElement>) {
    const gesture = drag.current
    if (gesture?.id !== event.pointerId) return
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y
    if (!gesture.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 9) {
      gesture.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      if (gesture.axis === 'y') {
        animation.current?.stop()
        gesture.progress = progress.current
        gesture.rubber = rubberDistance(rubber.current)
        gesture.hourly = dayProgress.current
      }
      if (gesture.axis === 'y' || event.pointerType === 'mouse') event.currentTarget.setPointerCapture(event.pointerId)
    }
    if (gesture.axis === 'x' && event.pointerType === 'mouse') {
      const strip = mode === 1 ? monthScroll.current : scroll.current
      if (strip) {
        strip.dataset.dragging = 'true'
        strip.scrollLeft = gesture.left - dx
      }
    }
    if (gesture.axis === 'y') {
      const elapsed = event.timeStamp - gesture.lastAt
      if (elapsed > 0) gesture.speed = (event.clientY - gesture.lastY) / elapsed
      gesture.lastY = event.clientY
      gesture.lastAt = event.timeStamp
      if (mode === 2) paint(gesture.progress, clamp(gesture.hourly + dy / 180), 0)
      else {
        const { position, overshoot } = positionForDrag(gesture.progress, dy + gesture.rubber)
        paint(position, 0, reducedMotion ? 0 : rubberBand(overshoot))
      }
    }
  }

  function end(event: PointerEvent<HTMLElement>) {
    // A touch starts captured by the date button before the drag takes over.
    if (event.type === 'lostpointercapture' && event.target !== event.currentTarget) return
    const gesture = drag.current
    if (gesture?.id !== event.pointerId) return
    drag.current = null
    if (scroll.current) delete scroll.current.dataset.dragging
    if (monthScroll.current) delete monthScroll.current.dataset.dragging
    if (!gesture.axis) return
    if (event.type === 'pointercancel' || event.type === 'lostpointercapture') {
      if (gesture.axis === 'y') settle(mode)
      return
    }
    blockClick.current = Date.now() + 300
    if (gesture.axis === 'y') {
      const inertia = event.timeStamp - gesture.lastAt < 90 ? Math.max(-75, Math.min(75, gesture.speed * 80)) : 0
      const distance = event.clientY - gesture.y + inertia
      const next = mode === 2
        ? (gesture.hourly + distance / 180 < .5 ? 0 : 2)
        : (Math.round(positionForDrag(gesture.progress, distance + gesture.rubber).position) as CalendarView)
      if (next === mode) settle(mode)
      else onMode(next)
    }
  }

  const first = `${monthPage}-01`
  const monthStart = weekStart(first)
  const monthDate = dateAtNoon(first)
  const monthLength = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()
  const monthCells = Math.ceil((monthLength + (monthDate.getDay() + 6) % 7) / 7) * 7
  const monthColumns = Array.from({ length: MONTH_BUFFER * 2 + 7 }, (_, index) => index - MONTH_BUFFER)
  const monthRows = Array.from({ length: monthCells / 7 }, (_, index) => index)
  const monthTitle = monthLabel.format(dateAtNoon(`${shownMonth}-01`))

  const renderDate = (value: string, week: boolean) => (
    <button data-hover="own" className="teacher-day-date" type="button" key={value} data-date={value}
      data-outside={!week && !value.startsWith(monthPage) || undefined}
      aria-label={fullDate.format(dateAtNoon(value))} aria-pressed={day === value} aria-current={value === today ? 'date' : undefined}
      onClick={() => {
        if (value === day && mode !== 2) onMode(2)
        else { tactile(); onPick(value) }
      }}>
      {week && <small>{weekday.format(dateAtNoon(value))}</small>}
      <strong>{Number(value.slice(-2))}</strong>
      <span className="teacher-day-date-mark" data-marked={markedDays.has(value) || undefined} aria-hidden />
    </button>
  )

  const dateControls = (
    <div ref={gestureLayer} className="teacher-day-gesture" data-mode={mode} aria-label={t(CALENDAR_VIEWS[mode])}
      onPointerDown={event => {
        if (!event.isPrimary || event.button !== 0) return
        blockClick.current = 0
        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY,
          left: (mode === 1 ? monthScroll.current : scroll.current)?.scrollLeft ?? 0, progress: progress.current, rubber: 0,
          hourly: dayProgress.current, lastY: event.clientY, lastAt: event.timeStamp, speed: 0 }
      }}
      onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
      onClickCapture={event => {
        if (event.detail && Date.now() < blockClick.current) { event.preventDefault(); event.stopPropagation() }
      }}>
      <div className="teacher-day-calendar-layers">
        <div className="teacher-day-week-layer" inert={mode !== 0}>
          <div className="teacher-day-date-scroll no-scrollbar" ref={scroll} onScroll={extendStrip}>
            <div className="teacher-day-date-track">
              {Array.from({ length: WINDOW_SIZE }, (_, index) => renderDate(addDays(origin, index - WEEK_BUFFER), true))}
            </div>
          </div>
        </div>
        <div ref={monthLayer} className="teacher-day-month-layer" inert={mode !== 1}>
          <h2>
            <motion.span key={shownMonth} initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .2 }}>
              {monthTitle[0].toLocaleUpperCase(locale) + monthTitle.slice(1)}
            </motion.span>
          </h2>
          <div ref={monthScroll} className="teacher-day-month-scroll no-scrollbar" onScroll={event => {
            const el = event.currentTarget
            if (!el.clientWidth) return
            const column = Math.round(el.scrollLeft / (datePitch(el))) - MONTH_BUFFER
            const month = addDays(monthStart, column + 14).slice(0, 7)
            setShownMonth(month)
          }}>
            <div className="teacher-day-month-track">
              <div className="teacher-day-month-row" aria-hidden>
                {monthColumns.map(column => <small key={column}>{weekday.format(dateAtNoon(addDays(monthStart, column)))}</small>)}
              </div>
              {monthRows.map(row => <div key={row} className="teacher-day-month-row">
                {monthColumns.map(column => renderDate(addDays(monthStart, row * 7 + column), false))}
              </div>)}
            </div>
          </div>
        </div>
      </div>
      <button data-hover="own" className="teacher-day-grip" type="button" aria-label={t('Сменить вид календаря')}
        onClick={() => onMode(mode === 0 ? 1 : 0)}><span aria-hidden /></button>
    </div>
  )
  return <section ref={root} className="teacher-day-calendar" data-mode={mode} aria-label={t(CALENDAR_VIEWS[mode])}>
    {pinnedHost && createPortal(dateControls, pinnedHost)}
    <div className="teacher-day-hours-reveal" inert={mode !== 2}>
      <div ref={hoursLayer}>{hours}</div>
    </div>
    <div className="teacher-day-summary-reveal" inert={mode === 2}>
      <div ref={summaryLayer}>{summary}</div>
    </div>
  </section>
}
