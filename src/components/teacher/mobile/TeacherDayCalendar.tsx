import { useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { animate, useReducedMotion } from 'framer-motion'
import { addDays, isoDay, weekStart } from '../../../lib/teacherSchedule'
import { useScrollFades } from '../../../lib/useScrollFades'
import { useT } from '../../../lib/i18n'
import { tactile } from '../../../lib/feedback'
import './teacherDayCalendar.css'

export const CALENDAR_VIEWS = ['Неделя', 'Месяц', 'По часам'] as const
export type CalendarView = 0 | 1 | 2

const WEEK_BUFFER = 35
const WEEK_HEIGHT = 48
const WINDOW_SIZE = WEEK_BUFFER * 2 + 7
const dateAtNoon = (day: string) => new Date(`${day}T12:00:00`)

export default function TeacherDayCalendar({ day, today, mode, locale, markedDays, onPick, onMode, hours }: {
  day: string
  today: string
  mode: CalendarView
  locale: string
  markedDays: ReadonlySet<string>
  onPick: (day: string) => void
  onMode: (mode: CalendarView) => void
  hours: ReactNode
}) {
  const t = useT()
  const [origin, setOrigin] = useState(() => weekStart(day))
  const [monthPage, setMonthPage] = useState(day.slice(0, 7))
  const scroll = useRef<HTMLDivElement>(null)
  const pendingOffset = useRef<number | null>(null)
  const previousDay = useRef(day)
  const drag = useRef<{ id: number; x: number; y: number; left: number; progress: number; axis?: 'x' | 'y' } | null>(null)
  const blockClick = useRef(0)
  const root = useRef<HTMLElement>(null)
  const monthLayer = useRef<HTMLDivElement>(null)
  const hoursLayer = useRef<HTMLDivElement>(null)
  const progress = useRef<number>(mode)
  const animation = useRef<{ stop: () => void } | null>(null)
  const reducedMotion = useReducedMotion()
  const dimensions = useRef({ week: WEEK_HEIGHT, month: 280, hours: 0 })

  function paint(value: number) {
    progress.current = value
    const month = 1 - Math.abs(value - 1)
    const hours = Math.max(0, value - 1)
    const style = root.current?.style
    style?.setProperty('--day-month-open', String(month))
    const { week, month: monthHeight } = dimensions.current
    style?.setProperty('--day-calendar-height', `${week + (monthHeight - week) * month}px`)
    style?.setProperty('--day-hours-height', `${dimensions.current.hours * hours}px`)
  }

  function settle(target: CalendarView) {
    animation.current?.stop()
    if (reducedMotion || Math.abs(progress.current - target) < .001) {
      paint(target)
      return
    }
    animation.current = animate(progress.current, target, {
      duration: .26, ease: [0.22, 1, 0.36, 1], onUpdate: paint,
    })
  }

  useLayoutEffect(() => {
    settle(mode)
    return () => animation.current?.stop()
    // The live gesture owns progress until the selected mode changes.
  }, [mode, reducedMotion])

  useLayoutEffect(() => {
    const month = monthLayer.current
    const hourly = hoursLayer.current
    const week = scroll.current
    if (!month || !hourly || !week) return
    const measure = () => {
      dimensions.current = { week: week.offsetHeight, month: month.offsetHeight, hours: hourly.offsetHeight }
      paint(progress.current)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(week)
    observer.observe(month)
    observer.observe(hourly)
    measure()
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    const selected = monthLayer.current?.querySelector<HTMLElement>('[aria-pressed="true"]')
    root.current?.style.setProperty('--day-month-align', `${-(selected?.offsetTop ?? 0)}px`)
  }, [day, monthPage])

  function progressForDrag(start: number, dy: number) {
    // A point of vertical movement reveals a point of calendar height.
    const monthDistance = Math.max(48, dimensions.current.month - dimensions.current.week)
    // The second stretch reveals the hourly sheet while the month folds up.
    const hoursDistance = Math.max(120, dimensions.current.hours - monthDistance)
    const toDistance = (value: number) => Math.min(1, value) * monthDistance + Math.max(0, value - 1) * hoursDistance
    const distance = toDistance(start) + dy
    return Math.min(2, Math.max(0, distance <= monthDistance
      ? distance / monthDistance
      : 1 + (distance - monthDistance) / hoursDistance))
  }
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  const fullDate = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' })

  useScrollFades(scroll, true, '.teacher-day-date-track')

  useLayoutEffect(() => {
    const el = scroll.current
    if (!el) return
    const cell = el.clientWidth / 7
    el.scrollLeft = (pendingOffset.current ?? WEEK_BUFFER) * cell
    pendingOffset.current = null
  }, [origin])

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
    const position = el.scrollLeft / (el.clientWidth / 7)
    const shift = position < 7 ? -28 : position > WINDOW_SIZE - 14 ? 28 : 0
    if (shift) {
      pendingOffset.current = position - shift
      if (drag.current?.axis === 'x') drag.current.left -= shift * el.clientWidth / 7
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
      }
      if (gesture.axis === 'y' || mode === 1 || event.pointerType === 'mouse') event.currentTarget.setPointerCapture(event.pointerId)
    }
    if (gesture.axis === 'x' && scroll.current && event.pointerType === 'mouse') scroll.current.scrollLeft = gesture.left - dx
    if (gesture.axis === 'y') paint(progressForDrag(gesture.progress, dy))
  }

  function end(event: PointerEvent<HTMLElement>) {
    // A touch starts captured by the date button before the drag takes over.
    if (event.type === 'lostpointercapture' && event.target !== event.currentTarget) return
    const gesture = drag.current
    if (gesture?.id !== event.pointerId) return
    drag.current = null
    if (!gesture.axis) return
    if (event.type === 'pointercancel' || event.type === 'lostpointercapture') {
      if (gesture.axis === 'y') settle(mode)
      return
    }
    blockClick.current = Date.now() + 300
    const dx = event.clientX - gesture.x
    if (gesture.axis === 'y') {
      const next = Math.round(progress.current) as CalendarView
      if (next === mode) settle(mode)
      else onMode(next)
    }
    if (gesture.axis === 'x' && mode === 1 && Math.abs(dx) > 38) {
      setMonthPage(value => {
        const first = dateAtNoon(`${value}-01`)
        first.setMonth(first.getMonth() + (dx < 0 ? 1 : -1))
        return isoDay(first).slice(0, 7)
      })
      tactile()
    }
  }

  const first = `${monthPage}-01`
  const monthStart = weekStart(first)
  const monthDate = dateAtNoon(first)
  const monthLength = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()
  const monthCells = Math.ceil((monthLength + (monthDate.getDay() + 6) % 7) / 7) * 7
  const monthDays = Array.from({ length: monthCells }, (_, index) => addDays(monthStart, index))
  const monthTitle = monthLabel.format(monthDate)

  const renderDate = (value: string, week: boolean) => (
    <button data-hover="layer" className="teacher-day-date" type="button" key={value} data-date={value}
      data-outside={!week && !value.startsWith(monthPage) || undefined}
      aria-label={fullDate.format(dateAtNoon(value))} aria-pressed={day === value} aria-current={value === today ? 'date' : undefined}
      onClick={() => { tactile(); onPick(value) }}>
      {week && <small>{weekday.format(dateAtNoon(value))}</small>}
      <strong>{Number(value.slice(-2))}</strong>
      <span className="teacher-day-date-mark" data-marked={markedDays.has(value) || undefined} aria-hidden />
    </button>
  )

  return <section ref={root} className="teacher-day-calendar" data-mode={mode} aria-label={t(CALENDAR_VIEWS[mode])}>
    <div className="teacher-day-gesture"
      onPointerDown={event => {
        if (!event.isPrimary || event.button !== 0) return
        blockClick.current = 0
        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY,
          left: scroll.current?.scrollLeft ?? 0, progress: progress.current }
      }}
      onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
      onClickCapture={event => {
        if (event.detail && Date.now() < blockClick.current) { event.preventDefault(); event.stopPropagation() }
      }}>
      <div className="teacher-day-calendar-layers">
        <div className="teacher-day-week-layer" inert={mode === 1}>
          <div className="teacher-day-date-scroll no-scrollbar" ref={scroll} onScroll={extendStrip}>
            <div className="teacher-day-date-track">
              {Array.from({ length: WINDOW_SIZE }, (_, index) => renderDate(addDays(origin, index - WEEK_BUFFER), true))}
            </div>
          </div>
        </div>
        <div ref={monthLayer} className="teacher-day-month-layer" inert={mode !== 1}>
          <h2>{monthTitle[0].toLocaleUpperCase(locale) + monthTitle.slice(1)}</h2>
          <div className="teacher-day-month" aria-hidden>
            {monthDays.slice(0, 7).map(value => <small key={value}>{weekday.format(dateAtNoon(value))}</small>)}
          </div>
          <div className="teacher-day-month">{monthDays.map(value => renderDate(value, false))}</div>
        </div>
      </div>
      <button data-hover="layer" className="teacher-day-grip" type="button" aria-label={t('Сменить вид календаря')}
        onClick={() => onMode(((mode + 1) % 3) as CalendarView)}><span aria-hidden /></button>
    </div>
    <div className="teacher-day-hours-reveal" inert={mode !== 2}>
      <div ref={hoursLayer}>{hours}</div>
    </div>
  </section>
}
