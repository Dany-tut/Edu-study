import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { addDays } from '../../../lib/teacherSchedule'

const BUFFER = 4
const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const mask = (edgeAlpha: number) => `linear-gradient(to right, rgba(0, 0, 0, ${edgeAlpha}) 0%, black 6%, black 94%, rgba(0, 0, 0, ${edgeAlpha}) 100%)`
const weekPosition = (date: string) => Date.parse(`${date}T00:00:00Z`) / WEEK_MS

export type WeekNavigation = { start: string; revision: number; offset: number }

/** A native, unsnapped timeline. Recycle the surrounding weeks after a gesture. */
export default function WeekStrip({ navigation, label, onVisibleRangeChange, renderDay }: {
  navigation: WeekNavigation
  label: string
  onVisibleRangeChange: (first: string, last: string) => void
  renderDay: (date: string, weekday: number) => ReactNode
}) {
  const [anchor, setAnchor] = useState(navigation.start)
  const [scrolling, setScrolling] = useState(false)
  const reducedMotion = useReducedMotion()
  const viewport = useRef<HTMLDivElement>(null)
  const anchorRef = useRef(anchor)
  const lastNavigation = useRef(navigation)
  const pendingLeft = useRef<number | null>(null)
  const expectedLeft = useRef<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const animationFrame = useRef<number | null>(null)
  const animationTarget = useRef<number | null>(null)
  const animationSource = useRef<'navigation' | 'wheel' | null>(null)
  const rangeCallback = useRef(onVisibleRangeChange)
  const lastRange = useRef('')
  useLayoutEffect(() => { rangeCallback.current = onVisibleRangeChange }, [onVisibleRangeChange])

  const reportVisibleRange = useCallback(() => {
    const el = viewport.current
    if (!el?.clientWidth) return
    const dayWidth = el.clientWidth / 7
    // Each day has a 3px margin. Ignore dates fully outside the viewport,
    // including when an edge falls in the gap between two day buttons.
    const firstIndex = Math.floor((el.scrollLeft + 3) / dayWidth)
    const lastIndex = Math.ceil((el.scrollLeft + el.clientWidth - 3) / dayWidth) - 1
    const first = addDays(anchorRef.current, firstIndex - BUFFER * 7)
    const last = addDays(anchorRef.current, lastIndex - BUFFER * 7)
    const key = `${first}/${last}`
    if (lastRange.current === key) return
    lastRange.current = key
    rangeCallback.current(first, last)
  }, [])

  const weeks = useMemo(() => Array.from({ length: BUFFER * 2 + 1 }, (_, i) => {
    const monday = addDays(anchor, (i - BUFFER) * 7)
    return { monday, days: Array.from({ length: 7 }, (_, d) => addDays(monday, d)) }
  }), [anchor])

  const stopAnimation = useCallback(() => {
    if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current)
    animationFrame.current = null
    animationTarget.current = null
    animationSource.current = null
  }, [])

  const placeAt = useCallback((position: number) => {
    const el = viewport.current
    if (!el?.clientWidth) return
    const offset = position - weekPosition(anchorRef.current)
    const nearest = Math.round(offset)
    const nextAnchor = addDays(anchorRef.current, nearest * 7)
    const left = (BUFFER + offset - nearest) * el.clientWidth
    // Refill the buffer without moving the dates on screen.
    if (nextAnchor !== anchorRef.current) {
      pendingLeft.current = left
      setAnchor(nextAnchor)
    } else {
      expectedLeft.current = left
      el.scrollLeft = left
      reportVisibleRange()
    }
  }, [reportVisibleRange])

  const animateTo = useCallback((destination: number, source: 'navigation' | 'wheel' = 'navigation') => {
    const el = viewport.current
    if (!el?.clientWidth) return
    if (timer.current) clearTimeout(timer.current)
    if (reducedMotion) {
      stopAnimation()
      animationTarget.current = destination
      animationSource.current = source
      placeAt(destination)
      setScrolling(false)
      return
    }
    animationTarget.current = destination
    animationSource.current = source
    setScrolling(true)
    // Retarget the running spring without resetting its position or velocity.
    if (animationFrame.current !== null) return
    let position = weekPosition(anchorRef.current) + el.scrollLeft / el.clientWidth - BUFFER
    let velocity = 0
    let previousTime = performance.now()

    const frame = (now: number) => {
      const target = animationTarget.current
      if (target === null) return
      const elapsed = Math.min(0.064, Math.max(0, (now - previousTime) / 1000))
      previousTime = now
      const displacement = position - target
      const coefficient = velocity + 22 * displacement
      const decay = Math.exp(-22 * elapsed)
      position = target + (displacement + coefficient * elapsed) * decay
      velocity = (velocity - 22 * coefficient * elapsed) * decay
      const finished = Math.abs(position - target) < 0.0005 && Math.abs(velocity) < 0.005
      placeAt(finished ? target : position)
      if (!finished) animationFrame.current = requestAnimationFrame(frame)
      else {
        animationFrame.current = null
        setScrolling(false)
      }
    }
    animationFrame.current = requestAnimationFrame(frame)
  }, [reducedMotion, placeAt, stopAnimation])

  useLayoutEffect(() => {
    const el = viewport.current
    if (!el) return
    anchorRef.current = anchor
    const left = pendingLeft.current ?? BUFFER * el.clientWidth
    pendingLeft.current = null
    expectedLeft.current = left
    el.scrollLeft = left
    reportVisibleRange()
  }, [anchor, reportVisibleRange])

  // Accumulate every click against the intended destination, including clicks
  // batched in one render. Wheel/touch input clears that destination.
  useLayoutEffect(() => {
    const previous = lastNavigation.current
    lastNavigation.current = navigation
    const absolute = navigation.revision !== previous.revision
    const steps = navigation.offset - previous.offset
    if (!absolute && !steps) return
    const el = viewport.current
    if (!el?.clientWidth) return
    const visible = weekPosition(anchorRef.current) + el.scrollLeft / el.clientWidth - BUFFER
    const destination = absolute
      ? weekPosition(navigation.start) + navigation.offset
      : (animationTarget.current ?? visible) + steps
    animateTo(destination)
  }, [navigation, animateTo])

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
      reportVisibleRange()
      if (expectedLeft.current !== null) {
        const expected = expectedLeft.current
        expectedLeft.current = null
        if (Math.abs(el.scrollLeft - expected) < 1) return
      }
      if (animationFrame.current === null) {
        animationTarget.current = null
        animationSource.current = null
      }
      setScrolling(true)
      if (timer.current) clearTimeout(timer.current)
      if (animationFrame.current !== null) return
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
      // The first wheel event interrupts button navigation. Subsequent ticks
      // accumulate against the wheel destination and keep the spring's velocity.
      if (animationSource.current !== 'wheel') stopAnimation()
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? el.clientWidth : 1
      const visible = weekPosition(anchorRef.current) + el.scrollLeft / el.clientWidth - BUFFER
      animateTo((animationTarget.current ?? visible) + delta * unit / el.clientWidth, 'wheel')
    }
    const onPointerDown = () => { stopAnimation(); setScrolling(false) }
    const resize = new ResizeObserver(() => {
      const nextWidth = el.clientWidth
      if (nextWidth && width !== nextWidth) {
        stopAnimation()
        setScrolling(false)
        expectedLeft.current = width ? el.scrollLeft / width * nextWidth : BUFFER * nextWidth
        el.scrollLeft = expectedLeft.current
        reportVisibleRange()
      }
      width = nextWidth
    })
    resize.observe(el)
    el.addEventListener('scroll', onScroll, { passive: true })
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onPointerDown, { passive: true })
    el.addEventListener('keydown', onPointerDown)
    return () => {
      resize.disconnect()
      el.removeEventListener('scroll', onScroll)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('keydown', onPointerDown)
      stopAnimation()
      if (timer.current) clearTimeout(timer.current)
    }
  }, [animateTo, reportVisibleRange, stopAnimation])

  return (
    <motion.div
      animate={{ maskImage: mask(scrolling ? 0 : 1), WebkitMaskImage: mask(scrolling ? 0 : 1) }}
      transition={{ duration: reducedMotion ? 0 : 0.16 }}
      style={{ minWidth: 0, maskPosition: '0 0', WebkitMaskPosition: '0 0', maskSize: '100% 100%', WebkitMaskSize: '100% 100%', maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat' }}
    >
      <div
        ref={viewport}
        data-week-strip
        role="group"
        aria-label={label}
        className="no-scrollbar"
        onClickCapture={() => {
          stopAnimation()
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
