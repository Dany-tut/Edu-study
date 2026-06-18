import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { CalendarX2 } from 'lucide-react'
import { type ScheduleDay, type ScheduleLesson } from '../data/mockData'
import { resolveScheduleLesson } from '../lib/db'
import { useStudentData } from '../store/studentDataStore'
import { IconMissedLesson } from './icons'
import { useDashboard } from '../store/dashboardStore'
import { PURPLE, subjectTheme } from '../lib/theme'
import { useNow, lessonTimeState } from '../lib/useNow'
import ScrollFade from './ScrollFade'

interface Props {
  day: ScheduleDay
  isCenter: boolean
  distance: number
  onClick: () => void
  /** Mobile: shrink the side cards so the row fits a phone screen. */
  mobile?: boolean
  /** Mobile: explicit center-card width measured from the viewport so the
      centre card never exceeds the screen (desktop keeps the fixed 480). */
  centerWidth?: number
}

export default function ScheduleCard({ day, isCenter, distance, onClick, mobile = false, centerWidth }: Props) {
  const openLesson = useDashboard(s => s.openLesson)
  const openCourses = useDashboard(s => s.openCourses)
  const setActiveSubject = useDashboard(s => s.setActiveSubject)
  const previewScheduleLesson = useDashboard(s => s.previewScheduleLesson)
  const clearTrackHighlight = useDashboard(s => s.clearTrackHighlight)
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  // Tick every second while any lesson is within an hour (the pill shows a
  // seconds countdown there); otherwise the default 30s is plenty.
  const anySoon = day.lessons.some(l => {
    const st = lessonTimeState(day.date, l.time, new Date())
    return !st.passed && st.secondsUntil <= 3600
  })
  const now = useNow(anySoon ? 1000 : 30_000)

  // Resolve each lesson's live time state once and pick the soonest future one
  // as the "upcoming" highlight — derived from real time, not stored on data.
  const states = day.lessons.map(l => ({ id: l.id, ...lessonTimeState(day.date, l.time, now) }))
  const upcomingId = states
    .filter(s => !s.passed)
    .sort((a, b) => a.minutesUntil - b.minutesUntil)[0]?.id

  // Reset selection whenever this card stops being the centered (active) day,
  // and drop any track highlight we set while selected.
  useEffect(() => {
    if (!isCenter) {
      setSelectedLessonId(null)
      clearTrackHighlight()
    }
  }, [isCenter, clearTrackHighlight])

  // Clear the track highlight when this card unmounts (e.g. carousel swap).
  useEffect(() => () => { clearTrackHighlight() }, [clearTrackHighlight])

  // Open the scheduled lesson directly on the lesson page. If we can't resolve an
  // exact lesson, fall back to the catalogue scoped to the right subject.
  const openScheduledLesson = (lesson: ScheduleLesson) => {
    const subjects = useStudentData.getState().subjects
    const { subjectId, lesson: match } = resolveScheduleLesson(lesson, subjects)
    if (match) {
      openLesson(match.id)
    } else {
      if (subjectId) setActiveSubject(subjectId)
      openCourses()
    }
  }

  // The countdown is a clock ("через 40:20") and only appears within the final
  // hour before the lesson (see the badge gate below), so it's always M:SS.
  const formatUntil = (st: { secondsUntil: number }) => {
    const s = Math.max(0, st.secondsUntil)
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `через ${m}:${String(sec).padStart(2, '0')}`
  }

  const scale = isCenter ? 1 : distance === 1 ? 0.90 : distance === 2 ? 0.82 : 0.74
  const opacity = isCenter ? 1 : distance === 1 ? 0.72 : distance === 2 ? 0.48 : 0.3
  // text uses the theme-aware red so it stays legible on the dark-red card in
  // dark mode (light: #A8282D on pale red, dark: #F48B91 on dark red).
  const missedPalette = { text: 'var(--color-red-text)', soft: 'var(--color-red-soft)', accent: '#C5323A', onAccent: '#FFFFFF', ring: 'rgba(248,99,107,0.22)' }

  const dateHeader = (fontSize: number, mb: number) => (
    <div className="flex items-center justify-between" style={{ marginBottom: mb }}>
      <span style={{ fontSize, fontWeight: 600, color: day.isToday ? PURPLE.text : 'var(--color-muted)' }}>
        {day.label}
      </span>
      {day.isToday && isCenter && (
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-purple)', background: 'var(--color-purple-soft)', padding: '2px 8px', borderRadius: 999 }}>
          Сегодня
        </span>
      )}
    </div>
  )

  return (
    <motion.div
      layout
      animate={{ scale, opacity }}
      whileHover={isCenter ? undefined : { scale: scale * 1.04, opacity: Math.min(1, opacity + 0.18) }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      className="flex-shrink-0 cursor-pointer h-full"
      style={{
        width: mobile
          ? (isCenter ? (centerWidth ?? 300) : distance === 1 ? 84 : distance === 2 ? 60 : 44)
          : (isCenter ? 480 : distance === 1 ? 160 : distance === 2 ? 130 : 110),
      }}
    >
      {isCenter ? (
        <div
          className="w-full h-full rounded-[28px]"
          style={{
            padding: '16px',
            background: 'rgba(var(--glass-rgb), 0.85)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid var(--color-border-glass)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          }}
        >
          {dateHeader(13, 10)}
          {(() => {
            const lessonsList = (
              <div className="flex flex-col" style={{ gap: 10 }}>
            {day.lessons.length > 0 ? (
              day.lessons.map(lesson => {
                const isSelected = selectedLessonId === lesson.id
                const st = states.find(s => s.id === lesson.id)!
                const isUpcoming = lesson.id === upcomingId
                const isPassed = st.passed
                const isMissed = day.isToday && isPassed
                const pal = isMissed
                  ? missedPalette
                  : lesson.subject === 'Биология'
                  ? subjectTheme(lesson.subject)
                  : { text: PURPLE.text, soft: PURPLE.soft, accent: PURPLE.text, onAccent: '#FFFFFF', ring: PURPLE.ring }
                return (
                <motion.div
                  key={lesson.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (isSelected) openScheduledLesson(lesson)
                    else {
                      setSelectedLessonId(lesson.id)
                      previewScheduleLesson(lesson)
                    }
                  }}
                  className="rounded-2xl flex items-center cursor-pointer"
                  style={{
                    minHeight: 58,
                    padding: '9px 12px 9px 14px',
                    gap: 14,
                    background: (isUpcoming || isMissed) ? pal.soft : 'rgba(0,0,0,0.025)',
                    opacity: isMissed ? 1 : isPassed ? 0.55 : 1,
                    outline: isSelected ? `2px solid ${pal.accent}` : '2px solid transparent',
                    outlineOffset: isSelected ? 2 : 0,
                    transition: 'outline-color 160ms ease, outline-offset 160ms ease',
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5" style={{ marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: (isUpcoming || isMissed) ? pal.text : 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {lesson.subject}
                      </span>
                      {isMissed && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: pal.onAccent, background: pal.accent, padding: '2px 7px', borderRadius: 999 }}>
                          Пропущен
                        </span>
                      )}
                      {!isPassed && st.secondsUntil > 0 && st.secondsUntil <= 3600 && (
                        isUpcoming ? (
                          <span style={{ fontSize: 10, fontWeight: 700, color: pal.onAccent, background: pal.accent, padding: '2px 7px', borderRadius: 999 }}>
                            {formatUntil(st)}
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-muted)', background: 'var(--color-bg-5)', padding: '1px 6px', borderRadius: 999 }}>
                            {formatUntil(st)}
                          </span>
                        )
                      )}
                    </div>
                    <p className="truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
                      Занятие #{lesson.lessonNumber} {lesson.lessonTitle}
                    </p>
                  </div>
                  <div className="flex-shrink-0 flex items-center" style={{ gap: 10 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: (isUpcoming || isMissed) ? pal.text : 'var(--color-text)', lineHeight: 1, minWidth: 54, textAlign: 'right' }}>
                      {lesson.time}
                    </span>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: isMissed ? 'rgba(248,99,107,0.30)' : isUpcoming ? 'rgba(120,106,215,0.26)' : 'var(--color-bg-4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {/* Same camera-with-bars glyph in every state — only the
                          colour changes (missed/upcoming → palette text, else muted). */}
                      <IconMissedLesson size={11} color={isMissed || isUpcoming ? pal.text : 'var(--color-muted)'} />
                    </div>
                  </div>
                </motion.div>
                )
              })
            ) : (
              <div
                className="rounded-2xl flex flex-col items-center justify-center text-center"
                style={{ minHeight: 116, padding: '18px 24px', background: 'var(--color-bg-3)', color: 'var(--color-muted)' }}
              >
                <CalendarX2 size={20} style={{ marginBottom: 8 }} />
                <p style={{ fontSize: 14, fontWeight: 650, color: 'var(--color-text)' }}>Пока нет данных</p>
                <p style={{ fontSize: 12, marginTop: 3 }}>Преподаватель еще не проставил уроки</p>
              </div>
            )}
              </div>
            )
            // 3+ lessons: clip into a scrollable list (hidden scrollbar) with edge fades.
            return day.lessons.length > 2
              ? (
                // ~2.3 rows tall: two full lessons + a peek of the third under the
                // fade, signalling there's more to scroll. Clips cleanly (no overflow).
                // The negative margin + matching padding give the lesson rows room to
                // grow on hover (scale 1.01) without being clipped by overflow, while
                // keeping them aligned with the date header.
                <ScrollFade
                  maxHeight={154} fadeHeight={22} bg="rgba(var(--glass-rgb), 0.85)" scrollClassName="no-scrollbar"
                  style={{ marginInline: -8, marginBlock: -4 }}
                  scrollStyle={{ paddingInline: 8, paddingBlock: 4 }}
                >
                  {lessonsList}
                </ScrollFade>
              )
              : lessonsList
          })()}
        </div>
      ) : (
        <div
          className="w-full h-full rounded-[28px]"
          style={{
            padding: '14px 16px',
            background: 'rgba(var(--glass-rgb), 0.80)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--color-border-medium)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}
        >
          {dateHeader(11, 8)}
          <div className="flex flex-col gap-2">
            {day.lessons.length > 0 ? (
              day.lessons.slice(0, 2).map(lesson => (
                <div key={lesson.id}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {lesson.subject}
                  </p>
                  <p className="truncate" style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text)' }}>
                    {lesson.lessonTitle}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--color-muted)' }}>{lesson.time}</p>
                </div>
              ))
            ) : (
              <div style={{ minHeight: 70, display: 'flex', flexDirection: 'column', justifyContent: 'center', color: 'var(--color-muted)' }}>
                <p style={{ fontSize: 12, fontWeight: 650, color: 'var(--color-text)' }}>Пока нет данных</p>
                <p style={{ fontSize: 11, marginTop: 3 }}>Уроки еще не проставлены</p>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}
