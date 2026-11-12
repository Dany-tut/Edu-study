import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, type PanInfo } from 'framer-motion'
import { useDashboard } from '../store/dashboardStore'
import { useStudentData } from '../store/studentDataStore'
import { useIsDesktop } from '../lib/useIsDesktop'
import { useT } from '../lib/i18n'
import ScheduleCard from './ScheduleCard'
import Skeleton from './Skeleton'
import ScheduleRibbon from './ScheduleRibbon'
import type { ScheduleDay } from '../data/mockData'

// Side card widths by distance from center — must match ScheduleCard.
const SLOT_WIDTH_DESKTOP: Record<number, number> = { 1: 160, 2: 130, 3: 110 }
const SLOT_WIDTH_MOBILE: Record<number, number> = { 1: 84, 2: 60, 3: 44 }

// Reserve paint space for shadows without moving the dashboard rows.
const SHADOW_PAD = 96
/** A date strip is navigation, not a freely scrollable row. Clipping paint
 * without a scroll container also prevents focus/trackpad scroll from moving it. */
function CenteredDateStrip({ children, width, viewportWidth, onSwipe }: { children: ReactNode; width: number; viewportWidth: number; onSwipe?: (info: PanInfo) => void }) {
  const mask = viewportWidth > 0 && width > viewportWidth
    ? 'linear-gradient(to right, transparent, #000 32px, #000 calc(100% - 32px), transparent)'
    : undefined
  return <div data-schedule-strip="fixed" style={{ position: 'absolute', insetInline: 0, top: -SHADOW_PAD, height: `calc(100% + ${SHADOW_PAD * 2}px)`, clipPath: 'inset(0)', maskImage: mask, WebkitMaskImage: mask, pointerEvents: 'none' }}>
    <motion.div
      drag={onSwipe ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.45}
      dragSnapToOrigin
      dragMomentum={false}
      onDragEnd={onSwipe ? (_, info) => onSwipe(info) : undefined}
      style={{ position: 'absolute', left: '50%', top: SHADOW_PAD, bottom: SHADOW_PAD, width, marginLeft: -width / 2, display: 'flex', gap: 8, alignItems: 'center' }}
    >{children}</motion.div>
  </div>
}

export default function ScheduleCarousel({ swipe = false }: { swipe?: boolean } = {}) {
  const desktop = useIsDesktop()
  return desktop ? <ScheduleRibbon>{(days, index, onSelect, loaded) => <ScheduleCarouselStrip days={days} index={index} onSelect={onSelect} loaded={loaded} />}</ScheduleRibbon> : <ScheduleCarouselStrip swipe={swipe} />
}

function ScheduleCarouselStrip(props: { days?: ScheduleDay[]; index?: number; onSelect?: (index: number) => void; loaded?: boolean; swipe?: boolean }) {
  const t = useT()
  const storedIndex = useDashboard(s => s.scheduleIndex)
  const storedSetIndex = useDashboard(s => s.setScheduleIndex)
  const storedDays = useStudentData(s => s.scheduleDays)
  const storedLoaded = useStudentData(s => s.loaded)
  const requestedIndex = props.index ?? storedIndex
  const setScheduleIndex = props.onSelect ?? storedSetIndex
  const scheduleDays = props.days ?? storedDays
  const loaded = props.loaded ?? storedLoaded
  const total = scheduleDays.length
  // A resized view or refreshed date range can retain an index from a longer
  // array. Keep a real selected day instead of rendering seven empty spacers.
  const scheduleIndex = Number.isInteger(requestedIndex) && requestedIndex >= 0 && requestedIndex < total
    ? requestedIndex : Math.max(0, scheduleDays.findIndex(day => day.isToday))
  const isDesktop = useIsDesktop()
  const mobile = !isDesktop

  // Measure the carousel width so the mobile centre card scales to the screen
  // (it was a fixed 480px → clipped on a 375px phone). Desktop keeps 480.
  const wrapRef = useRef<HTMLDivElement>(null)
  const [wrapW, setWrapW] = useState(0)
  const hasDays = total > 0
  const showSkeleton = !hasDays && !loaded
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => setWrapW(Math.round(entries[0].contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [hasDays, showSkeleton])

  const slotWidth = mobile ? SLOT_WIDTH_MOBILE : SLOT_WIDTH_DESKTOP
  // Centre card fills the padded area, leaving a small peek of the side cards.
  const centerWidth = mobile && wrapW ? Math.max(240, wrapW - (props.swipe ? 64 : 44)) : undefined

  // Always render 3 slots on each side of the selected day so it stays
  // centered. Out-of-range slots become invisible spacers that preserve
  // the symmetric layout.
  // Fixed strip height for every day so switching between a 3+-lesson card
  // (which scrolls internally above the fade) and a 1–2-lesson card never makes
  // the whole strip grow/shrink — keeping the tallest height avoids the jump.
  // Two full lesson rows must fit even on a laptop. Taller windows give the
  // calendar more room; longer lists scroll inside the card at every size.
  const stripHeight = mobile ? 'var(--live-mobile-schedule-height, 210px)' : 'var(--home-schedule-height, clamp(210px, 26vh, 260px))'

  const stripWidth = (centerWidth ?? (mobile ? 300 : 480)) + 2 * (slotWidth[1] + slotWidth[2] + slotWidth[3]) + 6 * 8

  function swipeDay({ offset, velocity }: PanInfo) {
    if (Math.abs(offset.x) < 36 && (Math.abs(offset.x) < 12 || Math.abs(velocity.x) < 450)) return
    const index = scheduleIndex + (offset.x < 0 ? 1 : -1)
    if (index >= 0 && index < total) setScheduleIndex(index)
  }

  const offsets = [-3, -2, -1, 0, 1, 2, 3]
  const slots = offsets.map(offset => {
    const index = scheduleIndex + offset
    return {
      offset,
      index,
      day: index >= 0 && index < total ? scheduleDays[index] : null,
    }
  })

  if (total === 0) {
    // Пока расписание едет, лента карточек — скелетон: «Расписание не
    // добавлено» это утверждение об учителе, и говорить его до ответа базы
    // нечестно. Ряд той же формы, что и настоящие карточки дней.
    if (!loaded) {
      // Геометрия — та же, что у настоящей ленты ниже: ширины слотов, высота полосы,
      // масштаб и приглушение боковых (как в ScheduleCard). Иначе при загрузке
      // карточки прыгали: заглушка была ниже/уже и прижата к низу.
      return (
        <div ref={wrapRef} role="status" aria-busy="true" aria-label={t('Загрузка…')} className="relative" style={{ height: stripHeight }}>
          <CenteredDateStrip width={stripWidth} viewportWidth={wrapW}>
          {offsets.map(offset => {
            const d = Math.abs(offset)
            const w = d === 0 ? (centerWidth ?? (mobile ? 300 : 480)) : slotWidth[d]
            const scale = d === 0 ? 1 : d === 1 ? 0.9 : d === 2 ? 0.82 : 0.74
            const opacity = d === 0 ? 1 : d === 1 ? 0.72 : d === 2 ? 0.48 : 0.3
            return (
              <div key={offset} data-schedule-day={offset === 0 ? 'selected' : undefined} className="flex-shrink-0 h-full" style={{ width: w, transform: `scale(${scale})`, opacity }}>
                <div className={`ssr-skeleton-card${d === 0 ? ' ssr-skeleton-card-center' : ''}`}>
                  <div className="ssr-skeleton-date"><Skeleton w={d === 0 ? 92 : '65%'} h={12} />{d === 0 && <Skeleton w={64} h={20} radius={12} />}</div>
                  {d === 0 ? <div className="ssr-skeleton-lessons">{[0, 1].map(row => <div className="ssr-skeleton-lesson" key={row}>
                    <Skeleton w={38} h={12} />
                    <div style={{ flex: 1, minWidth: 0 }}><Skeleton w="70%" h={14} /><Skeleton w="45%" h={10} style={{ marginTop: 9 }} /></div>
                    <Skeleton w={24} h={24} radius={8} />
                  </div>)}</div> : <div style={{ marginTop: 20 }}><Skeleton w="85%" h={12} /><Skeleton w="65%" h={10} style={{ marginTop: 9 }} /></div>}
                </div>
              </div>
            )
          })}
          </CenteredDateStrip>
        </div>
      )
    }
    return (
      <div className="flex items-center justify-center" style={{ height: stripHeight }}>
        <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>{t('Расписание не добавлено')}</p>
      </div>
    )
  }

  return (
    <motion.div
      className="relative"
      initial={false}
      animate={{ height: stripHeight }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
    >
      <div ref={wrapRef} style={{ height: '100%' }}>
      <CenteredDateStrip width={stripWidth} viewportWidth={wrapW} onSwipe={props.swipe && total > 1 ? swipeDay : undefined}>
        {slots.map(slot =>
          slot.day ? (
            <ScheduleCard
              key={slot.day.date}
              dataSelected={slot.offset === 0}
              day={slot.day}
              isCenter={slot.offset === 0}
              distance={Math.abs(slot.offset)}
              onClick={() => setScheduleIndex(slot.index)}
              mobile={mobile}
              centerWidth={centerWidth}
            />
          ) : (
            <div
              key={`spacer-${slot.offset}`}
              className="flex-shrink-0"
              style={{ width: slotWidth[Math.abs(slot.offset)] }}
              aria-hidden
            />
          ),
        )}
      </CenteredDateStrip>
      </div>
    </motion.div>
  )
}
