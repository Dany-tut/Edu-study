import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { BookOpen } from './icons/appIcons'
import { LoopSvg } from './icons/LoopIcon'
import { LoopArtworkVideo } from './icons/loopArtwork'
import { type ScheduleDay, type ScheduleLesson } from '../data/mockData'
import { resolveScheduleLesson } from '../lib/db'
import { scheduleRowStatus } from '../lib/scheduleAttendance'
import { useStudentData } from '../store/studentDataStore'
import { useDashboard } from '../store/dashboardStore'
import { PURPLE, subjectTheme } from '../lib/theme'
import { useNow } from '../lib/useNow'
import { getScheduleState, pickScheduleFocus } from '../lib/scheduleState'
import { getStudentScheduleState } from '../lib/lessonStatus'
import { useStudentTz } from '../lib/studentTz'
import ScheduleStatusBadge from './ScheduleStatusBadge'
import ScrollFade from './ScrollFade'
import FadeText from './FadeText'
import './scheduleEmpty.css'
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
  /** Local stand navigation without changing the live dashboard page. */
  onOpenLesson?: (lesson: ScheduleLesson) => void
}

export default function ScheduleCard({ day, isCenter, distance, onClick, mobile = false, centerWidth, dataSelected = false, onOpenLesson }: Props) {
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
  const timeZone = useStudentTz(s => s.tz)

  // Resolve each lesson's live time state once and pick the soonest future one
  // as the "upcoming" highlight — derived from real time, not stored on data.
  const states = day.lessons.map(l => getStudentScheduleState(l, day.date, now, timeZone, subjects))
  const focusIndex = pickScheduleFocus(states)

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
    if (onOpenLesson) { onOpenLesson(lesson); return }
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
          <div style={{ flexShrink: 0, paddingInlineStart: 8 }}>{dateHeader(13, 10)}</div>
          {(() => {
            if (day.lessons.length === 0) return (
              <div className="schedule-empty">
                {seasonEmpty ? <SeasonEmptyDay /> : (
                  <div className="schedule-empty__content">
                    <img className="schedule-empty__art" src="/schedule-objects-v1/calendar.webp" alt="" width={120} height={120} draggable={false} />
                    <div className="schedule-empty__copy">
                      <p className="schedule-empty__title">{t('Время для себя')}</p>
                      <p className="schedule-empty__subtitle">{t('Занятий нет — можно выдохнуть')}</p>
                    </div>
                  </div>
                )}
              </div>
            )
            const lessonsList = (
              <div className="flex flex-col" style={{ gap: 10 }}>
            {day.lessons.map((lesson, lessonIndex) => {
                const isSelected = selectedLessonId === lesson.id
                const st = states[lessonIndex]
                const isUpcoming = lessonIndex === focusIndex && st.phase === 'upcoming'
                const isCurrent = st.isCurrent
                const isEmphasized = isUpcoming || isCurrent
                const isCancelled = st.phase === 'cancelled'
                const attendanceStatus = scheduleRowStatus(
                  lesson, { dayDate: day.date, isToday: day.isToday, timeZone }, subjects, now,
                )
                const isMissed = st.hasEnded && attendanceStatus === 'missed'
                const pal = isMissed
                  ? missedPalette
                  : lesson.subject === 'Биология'
                  ? subjectTheme(lesson.subject)
                  : { text: PURPLE.text, soft: PURPLE.soft, accent: PURPLE.text, onAccent: '#FFFFFF', ring: PURPLE.ring }
                return (
                <motion.div
                  key={lesson.id}
                  whileHover={isCancelled ? undefined : { y: -2 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (isCancelled) return
                    if (isSelected) openScheduledLesson(lesson)
                    else {
                      setSelectedLessonId(lesson.id)
                      previewScheduleLesson(lesson)
                    }
                  }}
                  data-schedule-state={st.phase}
                  data-ended={st.hasEnded || undefined}
                  className={`rounded-2xl flex flex-wrap items-center ${isCancelled ? 'cursor-default' : 'cursor-pointer'}`}
                  style={{
                    minHeight: 58,
                    filter: st.hasEnded ? 'grayscale(1)' : undefined,
                    opacity: st.hasEnded ? 0.65 : 1,
                    padding: '10px 12px 10px 16px',
                    gap: 14,
                    background: (isEmphasized || isMissed) ? pal.soft : 'var(--color-schedule-row)',
                    outline: isSelected ? `2px solid ${pal.accent}` : '2px solid transparent',
                    outlineOffset: isSelected ? 2 : 0,
                    transition: 'outline-color 0.15s ease, outline-offset 0.15s ease',
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5" style={{ marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: (isEmphasized || isMissed) ? pal.text : 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {tc(lesson.subject)}
                      </span>
                      {st.phase !== 'today' && <ScheduleStatusBadge state={st} label={st.recordingAvailable ? 'Запись доступна' : st.label} />}
                      {isMissed && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: pal.onAccent, background: pal.accent, padding: '2px 8px', borderRadius: 999 }}>
                          {t('Не был на занятии')}
                        </span>
                      )}
                      {st.hasEnded && attendanceStatus === 'present' && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-muted)', background: 'var(--color-bg-4)', padding: '2px 8px', borderRadius: 999 }}>
                          {t('Был на занятии')}
                        </span>
                      )}
                      {st.phase === 'upcoming' && st.secondsUntil != null && st.secondsUntil > 0 && st.secondsUntil <= 3600 && (
                        isUpcoming ? (
                          <Countdown date={day.date} time={lesson.time} timeZone={timeZone} startsAt={lesson.startsAt} style={{ fontSize: 10, fontWeight: 700, color: pal.onAccent, background: pal.accent, height: 18, padding: '0 8px', borderRadius: 999 }} />
                        ) : (
                          <Countdown date={day.date} time={lesson.time} timeZone={timeZone} startsAt={lesson.startsAt} style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-muted)', background: 'var(--color-bg-5)', height: 16, padding: '0 6px', borderRadius: 999 }} />
                        )
                      )}
                    </div>
                    <FadeText className="schedule-lesson-title" style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
                      {`${t('Занятие')} #${lesson.lessonNumber + 1} ${tc(lesson.lessonTitle)}`}
                    </FadeText>
                  </div>
                  <div className="flex-shrink-0 flex items-center" style={{ gap: 10 }}>
                    <div style={{ minWidth: 54, textAlign: 'right' }}>
                      <span style={{ fontSize: 18, fontWeight: 600, color: isMissed ? pal.text : 'var(--color-text)', lineHeight: 1, fontVariantNumeric: 'tabular-nums', textDecoration: isCancelled ? 'line-through' : undefined }}>{lesson.time}</span>
                      {lesson.endTime && <p style={{ fontSize: 10, color: 'var(--color-muted)', marginTop: 4 }}>{t('до')} {lesson.endTime}</p>}
                    </div>
                    <div aria-hidden="true" style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {!isCancelled && (st.phase === 'available' ? <BookOpen size={18} color={pal.text} /> : <LoopSvg
                        name="Video"
                        artwork={LoopArtworkVideo}
                        size={18}
                        color={isMissed || isEmphasized ? pal.text : 'var(--color-muted)'}
                        style={{ '--loop-detail': 'currentColor' } as React.CSSProperties}
                      />)}
                    </div>
                  </div>
                  {!isCancelled && (isCurrent || isUpcoming || st.hasEnded || st.phase === 'available') && (
                    <div style={{ flexBasis: '100%' }}>
                      <button type="button" onClick={e => { e.stopPropagation(); openScheduledLesson(lesson) }} style={{
                        border: 'none', borderRadius: 10, padding: '7px 11px', fontFamily: 'inherit', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        background: isCurrent ? pal.text : 'var(--color-bg-card)', color: isCurrent ? pal.onAccent : pal.text,
                      }}>{t(st.recordingAvailable ? 'Смотреть запись' : st.hasEnded || st.phase === 'available' ? 'Материалы' : 'Открыть урок')}</button>
                    </div>
                  )}
                </motion.div>
                )
              })}
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
              {day.lessons.slice(0, 2).map((lesson, lessonIndex) => (
                <div key={lesson.id} data-ended={states[lessonIndex].hasEnded || undefined} style={{
                  filter: states[lessonIndex].hasEnded ? 'grayscale(1)' : undefined,
                  opacity: states[lessonIndex].hasEnded ? 0.65 : 1,
                }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {tc(lesson.subject)}
                  </p>
                  <FadeText className="schedule-lesson-title" style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text)' }}>
                    {tc(lesson.lessonTitle)}
                  </FadeText>
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
function Countdown({ date, time, timeZone, startsAt, style }: { date: string; time: string; timeZone: string; startsAt?: string; style: React.CSSProperties }) {
  const t = useT()
  const now = useNow(1000)
  const s = Math.max(0, getScheduleState({ date, time, startsAt }, now, timeZone).secondsUntil ?? 0)
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
