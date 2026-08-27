import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useDashboard } from '../store/dashboardStore'
import { useStudentData } from '../store/studentDataStore'
import { useIsDesktop } from '../lib/useIsDesktop'
import { useT } from '../lib/i18n'
import ScheduleCard from './ScheduleCard'
import Skeleton from './Skeleton'

// Side card widths by distance from center — must match ScheduleCard.
const SLOT_WIDTH_DESKTOP: Record<number, number> = { 1: 160, 2: 130, 3: 110 }
const SLOT_WIDTH_MOBILE: Record<number, number> = { 1: 84, 2: 60, 3: 44 }

export default function ScheduleCarousel() {
  const t = useT()
  const { scheduleIndex, setScheduleIndex } = useDashboard()
  const scheduleDays = useStudentData(s => s.scheduleDays)
  const loaded = useStudentData(s => s.loaded)
  const total = scheduleDays.length
  const isDesktop = useIsDesktop()
  const mobile = !isDesktop

  // Measure the carousel width so the mobile centre card scales to the screen
  // (it was a fixed 480px → clipped on a 375px phone). Desktop keeps 480.
  const wrapRef = useRef<HTMLDivElement>(null)
  const [wrapW, setWrapW] = useState(0)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => setWrapW(Math.round(entries[0].contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const pad = mobile ? 22 : 56
  const slotWidth = mobile ? SLOT_WIDTH_MOBILE : SLOT_WIDTH_DESKTOP
  // Centre card fills the padded area, leaving a small peek of the side cards.
  const centerWidth = mobile && wrapW ? Math.max(240, wrapW - pad * 2) : undefined

  // Always render 3 slots on each side of the selected day so it stays
  // centered. Out-of-range slots become invisible spacers that preserve
  // the symmetric layout.
  // Fixed strip height for every day so switching between a 3+-lesson card
  // (which scrolls internally above the fade) and a 1–2-lesson card never makes
  // the whole strip grow/shrink — keeping the tallest height avoids the jump.
  const stripHeight = 210

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
      return (
        <div className="flex items-end justify-center" role="status" aria-busy="true"
          aria-label={t('Расписание не добавлено')} style={{ height: 198, gap: 12 }}>
          {[110, 130, 160, 220, 160, 130, 110].map((w, i) => (
            <Skeleton key={i} w={w} h={i === 3 ? 172 : 128 - Math.abs(i - 3) * 14} radius={20} />
          ))}
        </div>
      )
    }
    return (
      <div className="flex items-center justify-center" style={{ height: 198 }}>
        <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>{t('Расписание не добавлено')}</p>
      </div>
    )
  }

  return (
    <motion.div
      ref={wrapRef}
      className="relative"
      initial={false}
      animate={{ height: stripHeight }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Cards */}
      <div
        className="flex items-center gap-3"
        style={{
          paddingLeft: pad,
          paddingRight: pad,
          justifyContent: 'center',
          height: '100%',
          // Clip side cards horizontally only — `overflow: hidden` would also
          // clip the center card's vertical shadow. `clip` on one axis leaves
          // overflow-y visible so the soft drop shadow can breathe.
          overflowX: 'clip',
          overflowY: 'visible',
        }}
      >
        {slots.map(slot =>
          slot.day ? (
            <ScheduleCard
              key={slot.day.date}
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
      </div>
    </motion.div>
  )
}
