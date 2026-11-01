import type { Lesson } from '../data/mockData'

/** A split lesson has a recording node and a separate materials node. */
export function baseNodeShape(lesson: Pick<Lesson, 'kind' | 'nodeType' | 'deliveryMode'>) {
  if (lesson.kind === 'test') return 'token'
  if (lesson.nodeType === 'rec' || (!lesson.nodeType && lesson.deliveryMode === 'recording')) return 'screen'
  return 'circle'
}

const silhouettes = {
  screen: {
    width: 64, height: 56,
    path: 'M15 8 H49 Q62 8 62 21 V35 Q62 48 49 48 H15 Q2 48 2 35 V21 Q2 8 15 8 Z',
  },
  token: {
    width: 56, height: 56,
    path: 'M18 4 H38 Q41.5 4 43.5 7.5 L53 24 Q55.3 28 53 32 L43.5 48.5 Q41.5 52 38 52 H18 Q14.5 52 12.5 48.5 L3 32 Q0.7 28 3 24 L12.5 7.5 Q14.5 4 18 4 Z',
  },
  rosette: {
    width: 32, height: 32,
    path: 'M14 2 Q16 0.5 18 2 L20 3.5 L23 3.3 Q25 3.2 25.9 5.2 L27.1 7.9 L29.5 9.7 Q31 10.9 30.4 13 L29.6 16 L30.4 19 Q31 21.1 29.5 22.3 L27.1 24.1 L25.9 26.8 Q25 28.8 23 28.7 L20 28.5 L18 30 Q16 31.5 14 30 L12 28.5 L9 28.7 Q7 28.8 6.1 26.8 L4.9 24.1 L2.5 22.3 Q1 21.1 1.6 19 L2.4 16 L1.6 13 Q1 10.9 2.5 9.7 L4.9 7.9 L6.1 5.2 Q7 3.2 9 3.3 L12 3.5 Z',
  },
}

interface Props {
  shape: keyof typeof silhouettes
  tone: { bg: string; border: string }
  active?: boolean
  highlighted?: boolean
}

export default function CourseNodeSilhouette({ shape, tone, active, highlighted }: Props) {
  const { width, height, path } = silhouettes[shape]
  return (
    <svg aria-hidden="true" focusable="false" className="track-silhouette"
      data-active={active || undefined} data-flash={highlighted || undefined}
      width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path className="track-silhouette-ring" d={path} fill="none" stroke={tone.border} strokeWidth="8" />
      {/* An opaque base keeps the track from showing through translucent dark fills. */}
      <path d={path} fill="var(--color-bg-3)" />
      <path d={path} fill={tone.bg} stroke={tone.border} strokeWidth="2" />
      {shape === 'screen' && <path d="M25 42 H39" stroke="currentColor" strokeOpacity=".6" strokeWidth="2" strokeLinecap="round" />}
    </svg>
  )
}
