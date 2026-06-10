import { motion } from 'framer-motion'
import { CheckCircle2, Lock, Play, Upload } from 'lucide-react'
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

interface Props {
  lesson: Lesson
  index: number
  isSelected?: boolean
  isHighlighted?: boolean
  onSelect?: (lesson: Lesson) => void
}

export default function CourseNode({ lesson, index, isSelected = false, isHighlighted = false, onSelect }: Props) {
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

  const isGold = displayStatus === 'completed' && !!assessment?.hardAvailable

  const isDiamond = lesson.shape === 'diamond'
  const isSquare = lesson.shape === 'square'

  return (
    // Wrapper sized to the node. The shape (and its selection ring) rotates and
    // scales inside; the number label lives OUTSIDE it so the ring never covers
    // it and it stays upright for diamond/square shapes.
    <div ref={wrapperRef} className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {isHighlighted && (
        <div
          className="course-node-flash-ring"
          style={{ borderRadius: isDiamond ? 12 : isSquare ? 16 : 999 }}
        />
      )}
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
            : isGold
              ? '0 4px 14px rgba(200,140,20,0.38), 0 1px 3px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.55)'
              : displayStatus === 'current'
                ? `0 0 0 4px rgba(197,139,255,0.18), 0 4px 20px rgba(197,139,255,0.22)`
                : '0 2px 8px rgba(0,0,0,0.06)',
        }}
        transition={{
          boxShadow: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
          scale: { type: 'spring', stiffness: 320, damping: 22 },
          opacity: { duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: index * 0.04 },
        }}
        className={cn('absolute inset-0 flex items-center justify-center cursor-pointer focus-visible:outline-none')}
        style={{
          background: isGold
            ? 'linear-gradient(145deg, #FFE066 0%, #F5C000 40%, #D49800 100%)'
            : style.bg,
          border: isGold ? '2px solid #E8B000' : `2px solid ${style.border}`,
          borderRadius: isDiamond ? 12 : isSquare ? 16 : 999,
          rotate: isDiamond ? '45deg' : '0deg',
        }}
        aria-label={`Урок ${lesson.number}: ${lesson.title}`}
      >
        <div style={{ rotate: isDiamond ? '-45deg' : '0deg' }}>
          {isCustom || isMissedCurrentLesson
            ? <Icon color={isGold ? '#7A5000' : style.iconColor} size={20} />
            : <Icon size={20} style={{ color: isGold ? '#7A5000' : style.iconColor }} strokeWidth={displayStatus === 'current' ? 2.5 : 2} />
          }
        </div>
      </motion.button>
      <div
        className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none"
        style={{ top: 'calc(100% + 7px)', gap: 2 }}
      >
        <span style={{ fontSize: 10, fontWeight: 600, color: '#6F6F76', whiteSpace: 'nowrap' }}>
          #{lesson.number}
        </span>
        {assessment && (
          <div className="flex items-center" style={{ gap: 3 }}>
            <span style={{ fontSize: 11, lineHeight: 1 }}>{EMOJI_STEPS[assessment.emojiIndex].emoji}</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#7B3FCC', whiteSpace: 'nowrap' }}>{assessment.score}</span>
            {assessment.hardCompleted && (
              <span style={{ fontSize: 10, lineHeight: 1 }} title="Хард сдан">🌟</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
