import { LoopArtworkVideo } from './loopArtwork'
import type { CSSProperties, ReactNode } from 'react'
import { LoopSvg } from './LoopIcon'
import { LoopArtworkHome, LoopArtworkBookOpen, LoopArtworkDumbbell, LoopArtworkUsers, LoopArtworkCheckCircle2, LoopArtworkNotebookPen, LoopArtworkUserCircle, LoopArtworkCheck, LoopArtworkPlay, LoopArtworkClock, LoopArtworkRotateCcw, LoopArtworkLock, LoopArtworkAlertTriangle, LoopArtworkSearch, LoopArtworkFilter, LoopArtworkCalendarCheck, LoopArtworkBell, LoopArtworkExternalLink, LoopArtworkArrowRight, LoopArtworkMessageCircle } from './loopArtwork'

/**
 * Original Loop artwork, shared with the editable Figma library.
 * 32-unit optical frame, rounded joins and theme-aware semantic colors.
 */
export type TaskliIconName =
  | 'home' | 'courses' | 'trainer' | 'students' | 'review' | 'gradebook' | 'profile'
  | 'done' | 'now' | 'reviewStatus' | 'returned' | 'closed' | 'attention'
  | 'search' | 'filter' | 'schedule' | 'notification' | 'open' | 'continue' | 'message' | 'recording'

export type TaskliIconTone = 'neutral' | 'accent' | 'success' | 'now' | 'review' | 'returned' | 'closed' | 'attention'

const TONE_COLOR: Record<TaskliIconTone, string> = {
  neutral: 'var(--loop-ink)',
  accent: 'var(--loop-ink)',
  success: 'var(--color-green-text)',
  now: 'var(--status-now-text)',
  review: 'var(--color-peach-text)',
  returned: 'var(--color-yellow-text)',
  closed: 'var(--color-muted)',
  attention: 'var(--color-rose-text)',
}

const art: Record<TaskliIconName, ReactNode> = {
  recording: LoopArtworkVideo,
  home: LoopArtworkHome,
  courses: LoopArtworkBookOpen,
  trainer: LoopArtworkDumbbell,
  students: LoopArtworkUsers,
  review: LoopArtworkCheckCircle2,
  gradebook: LoopArtworkNotebookPen,
  profile: LoopArtworkUserCircle,
  done: LoopArtworkCheck,
  now: LoopArtworkPlay,
  reviewStatus: LoopArtworkClock,
  returned: LoopArtworkRotateCcw,
  closed: LoopArtworkLock,
  attention: LoopArtworkAlertTriangle,
  search: LoopArtworkSearch,
  filter: LoopArtworkFilter,
  schedule: LoopArtworkCalendarCheck,
  notification: LoopArtworkBell,
  open: LoopArtworkExternalLink,
  continue: LoopArtworkArrowRight,
  message: LoopArtworkMessageCircle,
}

export function TaskliIcon({
  name, size = 20, tone = 'neutral', strokeWidth = 2.3, className, style, title,
}: {
  name: TaskliIconName
  size?: number
  tone?: TaskliIconTone
  strokeWidth?: number
  className?: string
  style?: CSSProperties
  title?: string
}) {
  return (
    <LoopSvg
      name={name}
      artwork={art[name]}
      size={size}
      strokeWidth={strokeWidth / 1.15}
      aria-label={title}
      className={className}
      style={{ color: TONE_COLOR[tone], flexShrink: 0, display: 'block', ...style }}
    >
      {title && <title>{title}</title>}
    </LoopSvg>
  )
}

export const TASKLI_ICON_RULES = 'Loop: 32×32 viewBox; sizes 16/20/24/32; round caps and joins; 2.3-unit optical stroke.'
