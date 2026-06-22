import { motion } from 'framer-motion'
import { CheckCircle2, Lock, Play, Upload, Star, RotateCcw } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { ElementType, ReactElement } from 'react'
import { IconMissedLesson, IconReturned, IconLessonRecording, IconTest } from './icons'
import type { Lesson, LessonStatus, LessonShape } from '../data/mockData'
import { getDisplayLessonStatus } from '../lib/lessonStatus'
import { cn } from '../lib/utils'
import { playClick } from '../lib/sound'
import { TRACK_STATUS } from '../lib/theme'
import { useNow } from '../lib/useNow'
import { useDashboard } from '../store/dashboardStore'
import { useTheme } from '../store/themeStore'
import { EMOJI_STEPS } from './HomeworkFlow'
import HardSatelliteLottie from './HardSatelliteLottie'

type IconProps = { color?: string; size?: number }
type CustomIcon = (props: IconProps) => ReactElement
type AnyIcon = ElementType | CustomIcon

const ts = (s: keyof typeof TRACK_STATUS) => ({
  bg: TRACK_STATUS[s].bg, border: TRACK_STATUS[s].border, iconColor: TRACK_STATUS[s].icon,
})

// Flash-ring tint per status (matches each node's border colour) — see the
// `--flash-rgb` driven `courseNodeFlashRing` keyframes in index.css.
const FLASH_RGB: Record<LessonStatus, string> = {
  completed: '110,231,160',
  returned:  '248,239,140',
  unviewed:  '244,139,145',
  submitted: '248,201,145',
  current:   '99,84,207',
  locked:    '150,150,160',
}

const statusStyle: Record<LessonStatus, { bg: string; border: string; iconColor: string; icon: AnyIcon; custom?: boolean }> = {
  completed: { ...ts('completed'), icon: CheckCircle2 },
  returned:  { ...ts('returned'),  icon: IconReturned,        custom: true },
  unviewed:  { ...ts('unviewed'),  icon: IconLessonRecording, custom: true },
  submitted: { ...ts('submitted'), icon: Upload },
  current:   { ...ts('current'),   icon: Play },
  locked:    { ...ts('locked'),    icon: Lock },
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getShapeClass(_shape: LessonShape, _isSquare: boolean): string {
  return ''
}

type HardStatus = 'submitted' | 'returned' | 'completed'

export const HARD_STYLE: Record<HardStatus | 'available' | 'locked', { bg: string; border: string; iconColor: string; label: string }> = {
  available:  { bg: 'var(--color-purple-soft)', border: 'var(--color-purple)', iconColor: 'var(--color-purple)', label: 'Доступен хард' },
  submitted:  { bg: 'var(--color-peach-soft)',  border: '#F8A84B', iconColor: '#F8A84B', label: 'На проверке' },
  returned:   { bg: 'var(--color-yellow-soft)', border: '#F0D060', iconColor: '#F0D060', label: 'Возвращён' },
  completed:  { bg: 'var(--color-yellow-soft)', border: '#F5C842', iconColor: '#F5C842', label: 'Сдан' },
  locked:     { bg: TRACK_STATUS.locked.bg, border: TRACK_STATUS.locked.border, iconColor: TRACK_STATUS.locked.icon, label: 'Недоступно' },
}

interface Props {
  lesson: Lesson
  index: number
  isSelected?: boolean
  isHighlighted?: boolean
  onSelect?: (lesson: Lesson) => void
  onHardSelect?: (lesson: Lesson) => void
}

export default function CourseNode({ lesson, index, isSelected = false, isHighlighted = false, onSelect, onHardSelect }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const now = useNow()
  const dark = useTheme(s => s.dark)
  const assessment = useDashboard(s => s.lessonAssessments[lesson.id])

  useEffect(() => {
    if (isHighlighted) {
      wrapperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
    }
  }, [isHighlighted])

  const displayStatus = getDisplayLessonStatus(lesson, now)
  const isMissedCurrentLesson = lesson.status === 'current' && displayStatus === 'unviewed'
  const style = statusStyle[displayStatus]
  const isTest = lesson.kind === 'test'
  const isRecNode = lesson.nodeType === 'rec'
  const isTestShape = lesson.shape === 'diamond' || lesson.shape === 'square' || isTest
  const Icon = (isRecNode && displayStatus !== 'completed') ? IconLessonRecording
    : isMissedCurrentLesson ? IconMissedLesson
    : (isTest && displayStatus !== 'completed') ? IconTest
    : (displayStatus === 'unviewed' && isTestShape) ? IconTest : style.icon
  const isCustom = (isRecNode && displayStatus !== 'completed') || (isTest && displayStatus !== 'completed') || (displayStatus === 'unviewed' && isTestShape) || style.custom
  const size = 56

  const hardStatus = assessment?.hardStatus as HardStatus | undefined
  // hardAvailable is set authoritatively at submit time from the homework's
  // recommendationScore; fall back to the 80 default for legacy rows.
  const hardAvailable = assessment?.hardAvailable || (assessment?.score != null && assessment.score >= 80)
  const basicSubmitted = assessment?.score != null
  // Hard rule: the basic score is the master gate. If the basic homework was
  // submitted below the threshold, the hard level shows as LOCKED (замочек,
  // «недоступно») — visible but unavailable — overriding any stale hard status.
  const hardLocked = basicSubmitted && !hardAvailable
  const showHardSatellite = hardAvailable || hardLocked || (!!hardStatus && !basicSubmitted)
  const effectiveHardStatus: HardStatus | 'available' | 'locked' =
    hardLocked ? 'locked' : (hardStatus ?? 'available')
  const hardStyle = HARD_STYLE[effectiveHardStatus]

  const isDiamond = lesson.shape === 'diamond' || isTest
  const isSquare = lesson.shape === 'square'

  // Active = the node the popover is anchored to, or the in-progress lesson.
  const nodeRgb = FLASH_RGB[displayStatus]
  const isActive = isSelected || displayStatus === 'current'
  const nodeRadius = isDiamond ? 12 : isSquare ? 16 : 999

  return (
    <div ref={wrapperRef} className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {isHighlighted && (
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
      {dark && isActive && !isHighlighted && (
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
          boxShadow: dark
            // Dark theme: let the breathing `.course-node-pulse-ring` carry the
            // active glow; keep the button shadow flat so the two don't clash.
            ? (isSelected
                ? `0 0 0 2px rgba(${nodeRgb},0.55), 0 8px 22px rgba(0,0,0,0.45)`
                : '0 2px 10px rgba(0,0,0,0.4)')
            : isSelected
              ? `0 0 0 6px rgba(255,255,255,0.7), 0 0 0 10px ${style.border}26, 0 10px 28px ${style.border}4d`
              : displayStatus === 'current'
                ? `0 0 0 4px rgba(156,140,240,0.18), 0 4px 20px rgba(156,140,240,0.22)`
                : '0 2px 8px rgba(0,0,0,0.06)',
        }}
        transition={{
          boxShadow: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
          scale: { type: 'spring', stiffness: 320, damping: 22 },
          opacity: { duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: index * 0.04 },
        }}
        className="absolute inset-0 flex items-center justify-center cursor-pointer focus-visible:outline-none"
        style={{
          background: `linear-gradient(${style.bg}, ${style.bg}), var(--color-bg-3)`,
          border: `2px solid ${style.border}`,
          borderRadius: isDiamond ? 12 : isSquare ? 16 : 999,
          rotate: isDiamond ? '45deg' : '0deg',
        }}
        aria-label={`Урок ${lesson.number + 1}: ${lesson.title}`}
      >
        <div style={{ rotate: isDiamond ? '-45deg' : '0deg', filter: 'brightness(1.9) saturate(1.1)' }}>
          {isCustom || isMissedCurrentLesson
            ? <Icon color={style.iconColor} size={17} />
            : <Icon size={17} style={{ color: style.iconColor }} strokeWidth={displayStatus === 'current' ? 2.5 : 2} />
          }
        </div>
      </motion.button>

      {/* Hard satellite circle — appears half-overlapping from the right */}
      {showHardSatellite && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 24, delay: index * 0.04 + 0.1 }}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={e => { e.stopPropagation(); playClick(); onHardSelect?.(lesson) }}
          className={cn(
            'absolute flex items-center justify-center cursor-pointer focus-visible:outline-none',
            effectiveHardStatus === 'completed' && 'hard-done-node',
          )}
          style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            // Opaque underlay (same pattern as the main node) so the green track
            // line behind doesn't bleed through the translucent soft fill.
            background: `linear-gradient(${hardStyle.bg}, ${hardStyle.bg}), var(--color-bg-3)`,
            border: `2px solid ${hardStyle.border}`,
            right: -12,
            bottom: -6,
            zIndex: 10,
            boxShadow: `0 2px 8px ${hardStyle.border}66`,
          }}
          aria-label="Сложный уровень"
        >
          {effectiveHardStatus === 'locked' ? (
            <Lock size={12} color={hardStyle.iconColor} strokeWidth={2.5} />
          ) : effectiveHardStatus === 'returned' ? (
            <RotateCcw size={13} color={hardStyle.iconColor} strokeWidth={2.5} />
          ) : effectiveHardStatus === 'completed' ? (
            <HardSatelliteLottie size={20} />
          ) : (
            <Star size={13} color={hardStyle.iconColor} fill={effectiveHardStatus === 'submitted' ? 'none' : 'none'} strokeWidth={2} />
          )}
        </motion.button>
      )}

      {/* Below label — lesson number */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none"
        style={{ top: 'calc(100% + 7px)' }}
      >
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
          #{lesson.number + 1}
        </span>
      </div>

    </div>
  )
}
