import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { addDays } from '../../../lib/teacherSchedule'

const BUFFER = 4
const mask = (edge: number) => `linear-gradient(to right, transparent 0%, black ${edge}%, black ${100 - edge}%, transparent 100%)`

/** A native, unsnapped timeline. Recycle the surrounding weeks after a gesture. */
export default function WeekStrip({ start, navigationKey, label, renderDay }: {
  start: string
  navigationKey: number
  label: string
  renderDay: (date: string, weekday: number) => ReactNode
}) {
  const [anchor, setAnchor] = useState(start)
  const [scrolling, setScrolling] = useState(false)
  const reducedMotion = useReducedMotion()
  const viewport = useRef<HTMLDivElement>(null)
  const anchorRef = useRef(anchor)
  const lastNavigation = useRef(navigationKey)
  const pendingLeft = useRef<number | null>(null)
  const expectedLeft = useRef<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const weeks = useMemo(() => Array.from({ length: BUFFER * 2 + 1 }, (_, i) => {
    const monday = addDays(anchor, (i - BUFFER) * 7)
    return { monday, days: Array.from({ length: 7 }, (_, d) => addDays(monday, d)) }
  }), [anchor])

  useLayoutEffect(() => {
    const el = viewport.current
    if (!el) return
    anchorRef.current = anchor
    const left = pendingLeft.current ?? BUFFER * el.clientWidth
    pendingLeft.current = null
    expectedLeft.current = left
    el.scrollLeft = left
  }, [anchor])

  // Selecting a date preserves the timeline's exact position. Only explicit
  // navigation (arrows, Today or a feed swipe) aligns the requested week.
  useLayoutEffect(() => {
    const navigate = navigationKey !== lastNavigation.current
    lastNavigation.current = navigationKey
    if (!navigate) return
    if (timer.current) clearTimeout(timer.current)
    pendingLeft.current = null
    setScrolling(false)
    if (anchor !== start) setAnchor(start)
    else if (viewport.current) {
      expectedLeft.current = BUFFER * viewport.current.clientWidth
      viewport.current.scrollLeft = expectedLeft.current
    }
  }, [start, anchor, navigationKey])

  useEffect(() => {
    const el = viewport.current
    if (!el) return
    let width = el.clientWidth

    const settle = (finished = true) => {
      if (!el.clientWidth) return
      const index = Math.round(el.scrollLeft / el.clientWidth)
      const next = addDays(anchorRef.current, (index - BUFFER) * 7)
      // Recycle the viewport without changing the selected date or its lessons.
      // Preserve the exact fractional offset: no snapping or visible jump.
      if (index !== BUFFER) {
        pendingLeft.current = el.scrollLeft + (BUFFER - index) * el.clientWidth
        setAnchor(next)
      }
      if (finished) setScrolling(false)
    }
    const onScroll = () => {
      if (expectedLeft.current !== null) {
        const expected = expectedLeft.current
        expectedLeft.current = null
        if (Math.abs(el.scrollLeft - expected) < 1) return
      }
      setScrolling(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(settle, 160)
      // Refill before reaching either end, including during a long wheel gesture.
      const position = el.scrollLeft / el.clientWidth
      if (position < 1 || position > BUFFER * 2 - 1) settle(false)
    }
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
      if (!delta) return
      event.preventDefault()
      // The dashboard also listens for horizontal wheel gestures to switch desks.
      event.stopPropagation()
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? el.clientWidth : 1
      el.scrollLeft += delta * unit
    }
    const resize = new ResizeObserver(() => {
      const nextWidth = el.clientWidth
      if (nextWidth && width !== nextWidth) {
        expectedLeft.current = width ? el.scrollLeft / width * nextWidth : BUFFER * nextWidth
        el.scrollLeft = expectedLeft.current
      }
      width = nextWidth
    })
    resize.observe(el)
    el.addEventListener('scroll', onScroll, { passive: true })
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      resize.disconnect()
      el.removeEventListener('scroll', onScroll)
      el.removeEventListener('wheel', onWheel)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  return (
    <motion.div
      animate={{ maskImage: mask(scrolling ? 6 : 0), WebkitMaskImage: mask(scrolling ? 6 : 0) }}
      transition={{ duration: reducedMotion ? 0 : 0.16 }}
      style={{ minWidth: 0 }}
    >
      <div
        ref={viewport}
        data-week-strip
        role="group"
        aria-label={label}
        className="no-scrollbar"
        onClickCapture={() => {
          if (timer.current) clearTimeout(timer.current)
          setScrolling(false)
        }}
        style={{ display: 'flex', overflowX: 'auto', overscrollBehaviorX: 'contain', overflowAnchor: 'none' }}
      >
        {weeks.map(week => (
          <div key={week.monday} style={{ display: 'flex', flex: '0 0 100%', minWidth: 0, padding: '4px 0' }}>
            {week.days.map(renderDay)}
          </div>
        ))}
      </div>
    </motion.div>
  )
}
