import { useDashboard } from '../store/dashboardStore'
import { useStudentData } from '../store/studentDataStore'
import ScheduleCard from './ScheduleCard'

// Side card widths by distance from center — must match ScheduleCard.
const SLOT_WIDTH: Record<number, number> = { 1: 160, 2: 130, 3: 110 }

export default function ScheduleCarousel() {
  const { scheduleIndex, setScheduleIndex } = useDashboard()
  const scheduleDays = useStudentData(s => s.scheduleDays)
  const total = scheduleDays.length

  // Always render 3 slots on each side of the selected day so it stays
  // centered. Out-of-range slots become invisible spacers that preserve
  // the symmetric layout.
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
    return (
      <div className="flex items-center justify-center" style={{ height: 198 }}>
        <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>Расписание не добавлено</p>
      </div>
    )
  }

  return (
    <div className="relative" style={{ height: 198 }}>
      {/* Cards */}
      <div
        className="flex items-center gap-3"
        style={{
          paddingLeft: 56,
          paddingRight: 56,
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
            />
          ) : (
            <div
              key={`spacer-${slot.offset}`}
              className="flex-shrink-0"
              style={{ width: SLOT_WIDTH[Math.abs(slot.offset)] }}
              aria-hidden
            />
          ),
        )}
      </div>
    </div>
  )
}
