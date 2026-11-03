import { gradedTrackResult } from '../lib/homeworkResult'
import { motion } from 'framer-motion'
import { CheckCircle2, Lock, Play, Upload, Star, RotateCcw, CircleAlert, Clock } from './icons/appIcons'
import { useEffect, useRef } from 'react'
import type { ElementType, ReactElement } from 'react'
import { IconReturned, IconLessonRecording, IconTest } from './icons'
import type { Lesson } from '../data/mockData'
import { lessonHasHardLevel } from '../data/lessonContent'
import { lessonStatusLabel, lessonTrackStep, trackStepLabel, type TrackLessonStatus } from '../lib/lessonStatus'
import { hardLevelState } from '../lib/lessonAssessments'
import { cn } from '../lib/utils'
import { playClick } from '../lib/sound'
import { TRACK_STATUS, trackPalette } from '../lib/theme'
import { useDashboard } from '../store/dashboardStore'
import { useTheme } from '../store/themeStore'
import { useT, useTc } from '../lib/i18n'
import HardSatelliteLottie from './HardSatelliteLottie'
import CourseNodeSilhouette, { baseNodeShape } from './CourseNodeSilhouette'
import { SeasonCurrentNode } from './season/Season'
import { useSeason } from '../lib/season'
import type { ScheduleState } from '../lib/scheduleState'
import ScheduleStatusBadge from './ScheduleStatusBadge'
import type { LessonAssessment } from '../lib/lessonAssessments'

type IconProps = { color?: string; size?: number }
type CustomIcon = (props: IconProps) => ReactElement
type AnyIcon = ElementType | CustomIcon

// Flash-ring tint per status (matches each node's border colour) — see the
// `--flash-rgb` driven `courseNodeFlashRing` keyframes in index.css.
const FLASH_RGB: Record<TrackLessonStatus, string> = {
  completed: '110,231,160',
  returned:  '248,239,140',
  unviewed:  '167,212,229',
  test_low: '244,139,145',
  test_passed: '110,231,160',
  submitted_unknown: '150,150,160',
  submitted: '248,201,145',
  today:     '99,84,207',
  current:   '150,150,160',
  locked:    '150,150,160',
}

const nodeIcon: Record<TrackLessonStatus, AnyIcon> = {
  completed: CheckCircle2, returned: IconReturned, unviewed: IconLessonRecording, submitted: Upload,
  test_low: CircleAlert, test_passed: CheckCircle2, submitted_unknown: Clock, current: Play, today: Play, locked: Lock,
}

type HardStatus = 'submitted' | 'returned' | 'completed'

export const HARD_STYLE: Record<HardStatus | 'available' | 'locked', { bg: string; border: string; iconColor: string; label: string }> = {
  available:  { bg: 'var(--color-purple-soft)', border: 'var(--color-purple)', iconColor: 'var(--status-now-text)', label: 'Доступен хард' },
  submitted:  { bg: 'var(--color-peach-soft)',  border: '#F8A84B', iconColor: TRACK_STATUS.submitted.text, label: 'На проверке' },
  returned:   { bg: 'var(--color-yellow-soft)', border: '#F0D060', iconColor: TRACK_STATUS.returned.text, label: 'Возвращён' },
  completed:  { bg: 'var(--color-yellow-soft)', border: '#F5C842', iconColor: TRACK_STATUS.returned.text, label: 'Сдан' },
  locked:     { bg: TRACK_STATUS.locked.bg, border: TRACK_STATUS.locked.border, iconColor: TRACK_STATUS.locked.text, label: 'Недоступно' },
}

interface Props {
  /** Optional local preview; real nodes continue to use the student's assessment. */
  assessmentOverride?: LessonAssessment
  overdueLabel?: string
  lesson: Lesson
  status: TrackLessonStatus
  scheduleState?: ScheduleState | null
  index: number
  isSelected?: boolean
  isHighlighted?: boolean
  scrollHighlight?: boolean
  isCurrent?: boolean
  onSelect?: (lesson: Lesson) => void
  onHardSelect?: (lesson: Lesson) => void
  /** Праздничная тема рисует фонарь/конфету только на ОДНОМ уроке — первом текущем:
   *  открытых уроков в курсе бывает несколько, и ряд из пяти конфет читался мусором. */
  seasonMark?: boolean
}

export default function CourseNode({ lesson, status, scheduleState, index, isSelected = false, isHighlighted = false, scrollHighlight = true, isCurrent = false, onSelect, onHardSelect, seasonMark = false, assessmentOverride, overdueLabel }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const tr = useT()
  const { tc } = useTc()
  const dark = useTheme(s => s.dark)
  const storedAssessment = useDashboard(s => s.lessonAssessments[lesson.id])
  const assessment = assessmentOverride ?? storedAssessment

  useEffect(() => {
    if (isHighlighted && scrollHighlight) {
      wrapperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
    }
  }, [isHighlighted, scrollHighlight])

  const grade = gradedTrackResult(lesson)
  const displayStatus = grade?.status ?? status
  const step = lessonTrackStep(lesson, status)
  const isAutoResult = displayStatus === 'test_low' || displayStatus === 'test_passed'
  const caption = step ? tr(trackStepLabel[step]) : null
  const statusText = tr(lessonStatusLabel(displayStatus, lesson.kind))
  const progressDescription = caption && displayStatus !== 'submitted' ? `${statusText} · ${caption}` : caption ?? statusText
  const showScheduleStatus = !!scheduleState && displayStatus !== 'locked' && !scheduleState.recordingAvailable && (scheduleState.isCurrent || scheduleState.phase === 'cancelled')
  const scheduleLabel = showScheduleStatus ? scheduleState.label : null
  const statusDescription = scheduleLabel && !progressDescription.includes(tr(scheduleLabel)) ? `${tr(scheduleLabel)} · ${progressDescription}` : progressDescription
  const palette = trackPalette(displayStatus)
  const isTest = lesson.kind === 'test'
  const seasonal = useSeason().on('track')
  const baseShape = baseNodeShape(lesson)
  const silhouette = !seasonal && baseShape !== 'circle' ? baseShape : null
  const isOpen = displayStatus === 'current' || displayStatus === 'today'
  let Icon = nodeIcon[displayStatus]
  if (seasonal && !isAutoResult && displayStatus !== 'completed') {
    if (lesson.nodeType === 'rec') Icon = IconLessonRecording
    else if (isTest || (displayStatus === 'unviewed' && lesson.shape !== 'circle')) Icon = IconTest
  } else if (silhouette === 'token' && isOpen) {
    Icon = IconTest
  } else if (silhouette === 'screen' && (isOpen || displayStatus === 'unviewed')) {
    Icon = Play
  }
  const size = 56

  const hard = hardLevelState(assessment)
  // У урока нет ни одного сложного задания → внутри хард-уровня пусто, спутник
  // не показываем вовсе (ни звезду, ни замок).
  const hasHardLevel = lessonHasHardLevel(lesson)
  const showHardSatellite = hasHardLevel && hard.visible
  const effectiveHardStatus = hard.status
  const hardStyle = HARD_STYLE[effectiveHardStatus]

  const isDiamond = seasonal && (lesson.shape === 'diamond' || isTest)
  const isSquare = seasonal && lesson.shape === 'square'

  // Active = the node the popover is anchored to, or the in-progress lesson.
  const nodeRgb = FLASH_RGB[displayStatus]
  const isToday = displayStatus === 'today'
  const isActive = isSelected || isToday || !!scheduleState?.isCurrent
  // Праздничная тема: текущий урок — фонарь, конфета или шарик зелья поверх кружка.
  // Кружок прячем, но кнопка остаётся на месте: по ней кликают.
  const seasonNode = seasonal && seasonMark && isToday && !isDiamond
  const nodeRadius = isDiamond ? 12 : isSquare ? 16 : 999

  return (
    <div ref={wrapperRef} className="season-node-wrap relative flex-shrink-0" style={{ width: size, height: size, borderRadius: nodeRadius, outline: isCurrent ? '2px solid var(--color-accent)' : undefined, outlineOffset: isCurrent ? 5 : undefined }}>
      {isHighlighted && !silhouette && (
        <div
          className="course-node-flash-ring"
          style={{
            borderRadius: nodeRadius,
            ['--flash-rgb' as string]: FLASH_RGB[displayStatus],
            // Diamond nodes are rotated 45°, so the ring must match or it reads
            // as a crooked square behind the diamond.
            ['--node-rotate' as string]: isDiamond ? '45deg' : '0deg',
          }}
        />
      )}

      {/* Dark-theme active ring: soft, breathing, tinted to the node colour. */}
      {dark && isActive && !isHighlighted && !seasonNode && !silhouette && (
        <div
          className="course-node-pulse-ring"
          style={{
            borderRadius: nodeRadius,
            ['--node-rgb' as string]: nodeRgb,
            transform: isDiamond ? 'rotate(45deg)' : undefined,
          }}
        />
      )}

      {/* Main lesson node */}
      <motion.button
        type="button"
        data-schedule-state={scheduleState?.phase}
        data-track-shape={silhouette ?? (isDiamond ? 'diamond' : isSquare ? 'square' : 'circle')}
        initial={{ opacity: 0, scale: 0.7 }}
        whileHover={displayStatus !== 'locked' ? { scale: 1.1 } : { scale: 1.04 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => {
          playClick()
          onSelect?.(lesson)
        }}
        animate={{
          opacity: 1,
          scale: isSelected ? 1.06 : 1,
          boxShadow: silhouette ? 'none' : dark
            // Dark theme: let the breathing `.course-node-pulse-ring` carry the
            // active glow; keep the button shadow flat so the two don't clash.
            ? (isSelected
                ? `0 0 0 2px rgba(${nodeRgb},0.55), 0 8px 22px rgba(0,0,0,0.45)`
                : '0 2px 10px rgba(0,0,0,0.4)')
            : isSelected
              ? `0 0 0 6px rgba(255,255,255,0.7), 0 0 0 10px rgba(${nodeRgb},0.15), 0 10px 28px rgba(${nodeRgb},0.3)`
              : isToday || scheduleState?.isCurrent
                ? `0 0 0 4px rgba(156,140,240,0.18), 0 4px 20px rgba(156,140,240,0.22)`
                : '0 2px 8px rgba(0,0,0,0.06)',
        }}
        transition={{
          boxShadow: { duration: 0.38, ease: [0.22, 1, 0.36, 1] },
          scale: { type: 'spring', stiffness: 320, damping: 22 },
          opacity: { duration: 0.38, ease: [0.22, 1, 0.36, 1], delay: index * 0.04 },
        }}
        className={cn('absolute inset-0 flex items-center justify-center cursor-pointer focus-visible:outline-none', seasonal && !isAutoResult && 'season-node', seasonNode && 'season-node-hidden', displayStatus === 'completed' && 'season-node-done', isToday && 'season-node-current', displayStatus === 'unviewed' && 'season-node-unviewed', displayStatus === 'locked' && 'season-node-locked')}
        style={{
          background: silhouette ? 'transparent' : `linear-gradient(${palette.bg}, ${palette.bg}), var(--color-bg-3)`,
          border: silhouette ? 0 : `2px solid ${palette.border}`,
          borderRadius: nodeRadius,
          color: palette.icon,
          ...(silhouette === 'screen' && { left: -4, right: -4 }),
          rotate: isDiamond ? '45deg' : '0deg',
        }}
        aria-label={`${tr(isTest ? 'Тест' : baseShape === 'screen' ? 'Запись' : 'Урок')} ${lesson.number + 1}: ${tc(lesson.title)} · ${statusDescription}${overdueLabel ? ` · ${overdueLabel}` : ''}`}
        title={statusDescription}
      >
        {silhouette && <CourseNodeSilhouette shape={silhouette} tone={palette} active={isActive} highlighted={isHighlighted} />}
        <div className="relative" style={{ rotate: isDiamond ? '-45deg' : '0deg', top: silhouette === 'screen' ? -2 : undefined }}>
          <Icon color={palette.icon} size={17} strokeWidth={isToday ? 2.5 : 2} />
        </div>
      </motion.button>

      {seasonNode && <SeasonCurrentNode size={size} />}

      {overdueLabel && <span title={overdueLabel} aria-label={overdueLabel} style={{ position: 'absolute', right: -6, top: -7, zIndex: 12, width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--color-red-soft)', color: 'var(--color-red-text)', border: '2px solid var(--color-bg)', pointerEvents: 'none' }}><CircleAlert size={14} /></span>}

      {/* Hard satellite circle — appears half-overlapping from the right */}
      {showHardSatellite && (
        <motion.button
          type="button"
          data-track-shape={seasonal ? 'circle' : 'rosette'}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 24, delay: index * 0.04 + 0.1 }}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={e => { e.stopPropagation(); playClick(); onHardSelect?.(lesson) }}
          className={cn(
            'absolute flex items-center justify-center cursor-pointer focus-visible:outline-none',
            seasonal && effectiveHardStatus === 'completed' && 'hard-done-node',
          )}
          style={{
            width: seasonal ? 28 : 32,
            height: seasonal ? 28 : 32,
            borderRadius: 999,
            // Opaque underlay (same pattern as the main node) so the green track
            // line behind doesn't bleed through the translucent soft fill.
            background: seasonal ? `linear-gradient(${hardStyle.bg}, ${hardStyle.bg}), var(--color-bg-3)` : 'transparent',
            border: seasonal ? `2px solid ${hardStyle.border}` : 0,
            right: -12,
            bottom: -6,
            zIndex: 10,
            boxShadow: seasonal ? `0 2px 8px color-mix(in srgb, ${hardStyle.border} 40%, transparent)` : undefined,
          }}
          aria-label={tr('Сложный уровень')}
        >
          {!seasonal && <CourseNodeSilhouette shape="rosette" tone={hardStyle} />}
          <span className="relative inline-flex">{effectiveHardStatus === 'locked' ? (
            <Lock size={12} color={hardStyle.iconColor} strokeWidth={2.5} />
          ) : effectiveHardStatus === 'returned' ? (
            <RotateCcw size={14} color={hardStyle.iconColor} strokeWidth={2.5} />
          ) : effectiveHardStatus === 'completed' ? (
            <HardSatelliteLottie size={20} />
          ) : (
            <Star size={14} color={hardStyle.iconColor} fill="none" strokeWidth={2} />
          )}</span>
        </motion.button>
      )}

      {/* Below label — lesson number */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none"
        style={{ top: 'calc(100% + 7px)', width: 120, textAlign: 'center' }}
      >
        <span
          className={cn('season-node-label', displayStatus === 'completed' && 'season-node-label--done', seasonNode && 'season-node-label--now')}
          style={{ fontSize: 10, fontWeight: 600, color: 'var(--track-muted-text)', whiteSpace: 'nowrap' }}
        >
          {/* В теме под фонарём/конфетой — «Урок N · сейчас», как в макетах. */}
          {seasonNode ? `${tr('Урок')} ${lesson.number + 1} · ${tr('сейчас')}` : `#${lesson.number + 1}`}
        </span>
        {showScheduleStatus && scheduleState && <ScheduleStatusBadge state={scheduleState} />}
        {caption && (
          <span style={{ fontSize: 10, fontWeight: 700, color: palette.text, whiteSpace: 'nowrap', marginTop: 2 }}>
            {caption}
          </span>
        )}
      </div>

    </div>
  )
}
