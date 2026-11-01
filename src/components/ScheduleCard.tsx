import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { CalendarX2 } from './icons/appIcons'
import { LoopSvg } from './icons/LoopIcon'
import { LoopArtworkVideo } from './icons/loopArtwork'
import { type ScheduleDay, type ScheduleLesson } from '../data/mockData'
import { resolveScheduleLesson } from '../lib/db'
import { scheduleRowStatus } from '../lib/scheduleAttendance'
import { useStudentData } from '../store/studentDataStore'
import { useDashboard } from '../store/dashboardStore'
import { PURPLE, subjectTheme } from '../lib/theme'
import { useNow, lessonTimeState } from '../lib/useNow'
import ScrollFade from './ScrollFade'
import { useT, useTc } from '../lib/i18n'
import { SeasonEmptyDay } from './season/Season'
import { useSeason } from '../lib/season'
import { useTheme } from '../store/themeStore'

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
  dataSelected?: boolean
}

export default function ScheduleCard({ day, isCenter, distance, onClick, mobile = false, centerWidth, dataSelected = false }: Props) {
  const t = useT()
  // Праздничная тема: пустой день в центральной карточке — привидение-листок
  // вместо «Пока нет данных». В боковых карточках его нет: ряд из пяти
  // одинаковых привидений читался как сбой, а не как шутка.
  const season = useSeason()
  const dark = useTheme(s => s.dark)
  // В тёмной «Сладости» глубину задают размер и поверхности, а не прозрачность
  // надписей: даже крайние даты должны оставаться читаемыми.
  const readableSides = dark && season.variant === 'candy'
  const seasonEmpty = season.on('empty')
  // Праздничная тема: под карточками картинка (ночь, вечерняя шапка), и боковым нужно
  // стекло с размытием. Затухание обёрткой (opacity) его убивает: backdrop-filter
  // внутри полупрозрачного родителя в Chromium не размывает ничего. Поэтому в теме
  // обёртка непрозрачная, а гаснут только содержимое и тон стекла.
  const glassFade = season.on('hero') && !isCenter
  const { tc } = useTc()
  const subjects = useStudentData(s => s.subjects)
  const openLesson = useDashboard(s => s.openLesson)
  const openCourses = useDashboard(s => s.openCourses)
  const setActiveSubject = useDashboard(s => s.setActiveSubject)
  const previewScheduleLesson = useDashboard(s => s.previewScheduleLesson)
  const clearTrackHighlight = useDashboard(s => s.clearTrackHighlight)
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  // Карточка обновляется раз в 30 с. Секунды отсчёта тикают в <Countdown> —
  // раньше вся карточка перерисовывалась каждую секунду за час до урока.
  const now = useNow(30_000)

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
        <span style={{ fontSize: 11, fontWeight: 600, color: PURPLE.text, background: PURPLE.soft, padding: '2px 8px', borderRadius: 999 }}>
          {t('Сегодня')}
        </span>
      )}
    </div>
  )

  return (
    <motion.div
      layout
      animate={{ scale, opacity: glassFade || readableSides ? 1 : opacity }}
      whileHover={isCenter ? undefined : { scale: scale * 1.04, opacity: glassFade || readableSides ? 1 : Math.min(1, opacity + 0.18) }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      data-schedule-day={dataSelected ? 'selected' : undefined}
      className="flex-shrink-0 cursor-pointer h-full"
      style={{
        // Карточка — кнопка, а не текст: тап не должен подсвечивать надписи.
        userSelect: 'none', WebkitUserSelect: 'none',
        width: mobile
          ? (isCenter ? (centerWidth ?? 300) : distance === 1 ? 84 : distance === 2 ? 60 : 44)
          : (isCenter ? 480 : distance === 1 ? 160 : distance === 2 ? 130 : 110),
      }}
    >
      {isCenter ? (
        <div
          className={`schedule-card schedule-card--center w-full h-full rounded-[24px]${day.isToday ? ' schedule-card--today' : ''}`}
          style={{
            padding: '16px',
            display: 'flex', flexDirection: 'column', minHeight: 0,
            background: 'var(--schedule-center-bg, rgba(var(--glass-rgb), 0.85))',
            backdropFilter: 'var(--blur-solid)',
            WebkitBackdropFilter: 'var(--blur-solid)',
            boxShadow: 'var(--schedule-card-edge, inset 0 0 0 0 transparent), var(--shadow-3)',
          }}
        >
          <div style={{ flexShrink: 0 }}>{dateHeader(13, 10)}</div>
          {(() => {
            const lessonsList = (
              <div className="flex flex-col" style={{ gap: 10 }}>
            {day.lessons.length > 0 ? (
              day.lessons.map(lesson => {
                const isSelected = selectedLessonId === lesson.id
                const st = states.find(s => s.id === lesson.id)!
                const isUpcoming = lesson.id === upcomingId
                const isPassed = st.passed
                const attendanceStatus = scheduleRowStatus(
                  lesson, { dayDate: day.date, isToday: day.isToday }, subjects, now,
                )
                const isMissed = attendanceStatus === 'missed'
                const pal = isMissed
                  ? missedPalette
                  : lesson.subject === 'Биология'
                  ? subjectTheme(lesson.subject)
                  : { text: PURPLE.text, soft: PURPLE.soft, accent: PURPLE.text, onAccent: '#FFFFFF', ring: PURPLE.ring }
                return (
                <motion.div
                  key={lesson.id}
                  whileHover={{ y: -2 }}
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
                    padding: '10px 12px 10px 14px',
                    gap: 14,
                    background: (isUpcoming || isMissed) ? pal.soft : 'var(--color-schedule-row)',
                    opacity: isMissed ? 1 : isPassed ? 0.55 : 1,
                    outline: isSelected ? `2px solid ${pal.accent}` : '2px solid transparent',
                    outlineOffset: isSelected ? 2 : 0,
                    transition: 'outline-color 0.15s ease, outline-offset 0.15s ease',
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5" style={{ marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: (isUpcoming || isMissed) ? pal.text : 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {tc(lesson.subject)}
                      </span>
                      {isMissed && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: pal.onAccent, background: pal.accent, padding: '2px 8px', borderRadius: 999 }}>
                          {t('Пропущен')}
                        </span>
                      )}
                      {(attendanceStatus === 'unmarked' || attendanceStatus === 'present') && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-muted)', background: 'var(--color-bg-4)', padding: '2px 8px', borderRadius: 999 }}>
                          {t(attendanceStatus === 'present' ? 'Присутствовал' : 'Без отметки')}
                        </span>
                      )}
                      {!isPassed && st.secondsUntil > 0 && st.secondsUntil <= 3600 && (
                        isUpcoming ? (
                          <Countdown date={day.date} time={lesson.time} style={{ fontSize: 10, fontWeight: 700, color: pal.onAccent, background: pal.accent, height: 18, padding: '0 8px', borderRadius: 999 }} />
                        ) : (
                          <Countdown date={day.date} time={lesson.time} style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-muted)', background: 'var(--color-bg-5)', height: 16, padding: '0 6px', borderRadius: 999 }} />
                        )
                      )}
                    </div>
                    <p className="truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
                      {t('Занятие')} #{lesson.lessonNumber + 1} {tc(lesson.lessonTitle)}
                    </p>
                  </div>
                  <div className="flex-shrink-0 flex items-center" style={{ gap: 10 }}>
                    <span style={{ fontSize: 18, fontWeight: 600, color: isMissed ? pal.text : 'var(--color-text)', lineHeight: 1, minWidth: 54, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {lesson.time}
                    </span>
                    <div aria-hidden="true" style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <LoopSvg
                        name="Video"
                        artwork={LoopArtworkVideo}
                        size={18}
                        color={isMissed || isUpcoming ? pal.text : 'var(--color-muted)'}
                        style={{ '--loop-detail': 'currentColor' } as React.CSSProperties}
                      />
                    </div>
                  </div>
                </motion.div>
                )
              })
            ) : (
              <div
                className="rounded-2xl flex flex-col items-center justify-center text-center"
                style={{ minHeight: 116, padding: '18px 24px', background: seasonEmpty ? 'transparent' : 'var(--color-bg-3)', color: 'var(--color-muted)' }}
              >
                {seasonEmpty ? <SeasonEmptyDay /> : (
                  <>
                    <CalendarX2 size={20} style={{ marginBottom: 8 }} />
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{t('Пока нет данных')}</p>
                    <p style={{ fontSize: 12, marginTop: 4 }}>{t('Преподаватель еще не проставил уроки')}</p>
                  </>
                )}
              </div>
            )}
              </div>
            )
            // The selected outline extends 4px; hover lifts a row another 2px.
            // Keep 8px of scroll padding so both fit without being clipped.
            // The available height, rather than the lesson count, decides when
            // scrolling is needed: the compact seasonal card cannot fit two rows.
            return (
                <ScrollFade
                  maxHeight="100%" fadeMode="mask" fadeHeight={22} scrollClassName="no-scrollbar"
                  style={{ flex: 1, minHeight: 0, marginInline: -8, marginBlock: -8 }}
                  scrollStyle={{ height: '100%', paddingInline: 8, paddingBlock: 8 }}
                >
                  {lessonsList}
                </ScrollFade>
              )
          })()}
        </div>
      ) : (
        <div
          className="schedule-card w-full h-full rounded-[24px]"
          style={{
            padding: '14px 16px',
            background: `var(--schedule-side-bg, rgba(var(--glass-rgb), ${glassFade ? (0.35 + 0.4 * opacity).toFixed(2) : 0.80}))`,
            backdropFilter: 'var(--blur-solid)', WebkitBackdropFilter: 'var(--blur-solid)',
            boxShadow: 'var(--schedule-card-edge, inset 0 0 0 0 transparent), var(--shadow-2)',
          }}
        >
          <div style={glassFade && !readableSides ? { opacity: Math.min(1, opacity + 0.15) } : undefined}>
          {dateHeader(11, 8)}
          <div className="flex flex-col gap-2" style={{ minHeight: 0 }}>
            {day.lessons.length > 0 ? (
              <ScrollFade maxHeight="100%" fadeMode="mask" fadeHeight={18} scrollClassName="no-scrollbar" style={{ maxHeight: 146 }} scrollStyle={{ paddingBottom: 4 }}>
              <div className="flex flex-col gap-2">
              {day.lessons.slice(0, 2).map(lesson => (
                <div key={lesson.id}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {tc(lesson.subject)}
                  </p>
                  <p className="truncate" style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text)' }}>
                    {tc(lesson.lessonTitle)}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--color-muted)' }}>{lesson.time}</p>
                </div>
              ))}
              </div>
              </ScrollFade>
            ) : (
              <div style={{ minHeight: 70, display: 'flex', flexDirection: 'column', justifyContent: 'center', color: 'var(--color-muted)' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>{t('Пока нет данных')}</p>
                <p style={{ fontSize: 11, marginTop: 4 }}>{t('Уроки еще не проставлены')}</p>
              </div>
            )}
          </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}

// Отсчёт «через 40:20» — часы, видны только в последний час до урока, поэтому
// всегда M:SS. Свой секундный таймер у одной таблетки, а не у всей карточки;
// цифры моноширинные, чтобы таблетка не дёргалась на 10:00 → 9:59.
function Countdown({ date, time, style }: { date: string; time: string; style: React.CSSProperties }) {
  const t = useT()
  const now = useNow(1000)
  const s = Math.max(0, lessonTimeState(date, time, now).secondsUntil)
  if (s <= 0) return null
  const m = Math.floor(s / 60)
  return (
    <span style={{ ...style, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, lineHeight: '14px', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
      {/* SF Pro's glyphs sit below the perceived centre of the pill. */}
      <span style={{ transform: 'translateY(-0.5px)' }}>
        {`${t('через')} ${m}:${String(s % 60).padStart(2, '0')}`}
      </span>
    </span>
  )
}
