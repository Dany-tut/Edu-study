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
import { EMOJI_STEPS } from './HomeworkFlow'
import HardSatelliteLottie from './HardSatelliteLottie'

type IconProps = { color?: string; size?: number }
type CustomIcon = (props: IconProps) => ReactElement
type AnyIcon = ElementType | CustomIcon

const ts = (s: keyof typeof TRACK_STATUS) => ({
  bg: TRACK_STATUS[s].bg, border: TRACK_STATUS[s].border, iconColor: TRACK_STATUS[s].icon,
})

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

export const HARD_STYLE: Record<HardStatus | 'available', { bg: string; border: string; iconColor: string; label: string }> = {
  available:  { bg: 'var(--color-purple-soft)', border: 'var(--color-purple)', iconColor: 'var(--color-purple)', label: 'Доступен хард' },
  submitted:  { bg: 'var(--color-peach-soft)',  border: '#F8A84B', iconColor: '#F8A84B', label: 'На проверке' },
  returned:   { bg: 'var(--color-yellow-soft)', border: '#F0D060', iconColor: '#F0D060', label: 'Возвращён' },
  completed:  { bg: 'var(--color-yellow-soft)', border: '#F5C842', iconColor: '#F5C842', label: 'Сдан' },
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
  const assessment = useDashboard(s => s.lessonAssessments[lesson.id])

  useEffect(() => {
    if (isHighlighted) {
      wrapperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
    }
  }, [isHighlighted])

  const displayStatus = getDisplayLessonStatus(lesson, now)
  const isMissedCurrentLesson = lesson.status === 'current' && displayStatus === 'unviewed'
  const style = statusStyle[displayStatus]
  const isTestShape = lesson.shape === 'diamond' || lesson.shape === 'square'
  const Icon = isMissedCurrentLesson
    ? IconMissedLesson
    : (displayStatus === 'unviewed' && isTestShape) ? IconTest : style.icon
  const isCustom = (displayStatus === 'unviewed' && isTestShape) || style.custom
  const size = 56

  const hardStatus = assessment?.hardStatus as HardStatus | undefined
  const hardAvailable = assessment?.hardAvailable || (assessment?.score != null && assessment.score >= 80)
  // Show satellite if hard task is available (even before submitting) or has a status
  const showHardSatellite = !!(hardStatus || hardAvailable)
  const effectiveHardStatus: HardStatus | 'available' = hardStatus ?? 'available'
  const hardStyle = HARD_STYLE[effectiveHardStatus]

  const isDiamond = lesson.shape === 'diamond'
  const isSquare = lesson.shape === 'square'

  return (
    <div ref={wrapperRef} className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {isHighlighted && (
        <div
          className="course-node-flash-ring"
          style={{ borderRadius: isDiamond ? 12 : isSquare ? 16 : 999 }}
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
          boxShadow: isSelected
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
        aria-label={`Урок ${lesson.number}: ${lesson.title}`}
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
            background: hardStyle.bg,
            border: `2px solid ${hardStyle.border}`,
            right: -12,
            bottom: -6,
            zIndex: 10,
            boxShadow: `0 2px 8px ${hardStyle.border}66`,
          }}
          aria-label="Сложный уровень"
        >
          {effectiveHardStatus === 'returned' ? (
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
          #{lesson.number}
        </span>
      </div>

    </div>
  )
}
