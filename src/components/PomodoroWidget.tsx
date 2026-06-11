import { motion } from 'framer-motion'
import { Play, Pause, RotateCcw } from 'lucide-react'
import { useDashboard, POMO_DURATIONS, type PomoMode } from '../store/dashboardStore'
import { getWidgetSizing } from '../lib/widgetSizing'

type Props = {
  /** how many widget blocks share the row — scales the type down when >1 */
  columns?: number
}

const MODE_LABEL: Record<PomoMode, string> = { focus: 'Фокус', break: 'Перерыв' }
const ACCENT: Record<PomoMode, string> = { focus: '#7B61FF', break: '#1E9E63' }

function format(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function PomodoroWidget({ columns = 1 }: Props) {
  const {
    pomoMode, pomoSecondsLeft, pomoRunning, pomoCompleted,
    pomoStart, pomoPause, pomoReset, pomoSwitchMode,
  } = useDashboard()

  const accent = ACCENT[pomoMode]
  const duration = POMO_DURATIONS[pomoMode]
  const progress = 1 - pomoSecondsLeft / duration
  const sz = getWidgetSizing(columns)

  const ringSize = 104 * sz.scale
  const C = 2 * Math.PI * 46
  const btnH = 44 * sz.scale

  return (
    <div
      className="flex h-full w-full items-stretch rounded-[24px]"
      style={{
        gap: 20 * sz.scale,
        padding: `${sz.padY}px ${sz.padX}px`,
        background: 'rgba(var(--glass-rgb), 0.9)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--color-border-glass)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
      }}
    >
      {/* Ring — vertically centered in its column */}
      <div className="flex flex-shrink-0 items-center" style={{ height: '100%' }}>
      <div className="relative flex-shrink-0" style={{ width: ringSize, height: ringSize }}>
        <svg width={ringSize} height={ringSize} viewBox="0 0 104 104" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="52" cy="52" r={46} fill="none" strokeWidth="8" style={{ stroke: 'var(--color-border-glass)' }} />
          <motion.circle
            cx="52" cy="52" r={46} fill="none" stroke={accent} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={C}
            animate={{ strokeDashoffset: C * (1 - progress) }}
            transition={{ duration: 0.5, ease: 'linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span style={{ fontSize: 24 * sz.scale, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {format(pomoSecondsLeft)}
          </span>
          <span style={{ fontSize: 10 * sz.scale, fontWeight: 600, color: '#9A9AA0', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
            {MODE_LABEL[pomoMode]}
          </span>
        </div>
      </div>
      </div>

      {/* Controls — button anchored to the bottom like Question of Day */}
      <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 10 * sz.scale }}>
        <div className="flex items-center justify-between gap-2">
          {/* Mode toggle */}
          <div className="flex" style={{ background: 'var(--color-bg-3)', borderRadius: 999, padding: 3 }}>
            {(['focus', 'break'] as PomoMode[]).map(m => (
              <button
                key={m}
                onClick={() => pomoSwitchMode(m)}
                className="cursor-pointer"
                style={{
                  fontSize: 12 * sz.scale, fontWeight: 650, lineHeight: 1, padding: '6px 14px', borderRadius: 999,
                  color: pomoMode === m ? 'var(--color-text)' : '#9A9AA0',
                  background: pomoMode === m ? 'var(--color-pill-active-bg)' : 'transparent',
                  boxShadow: pomoMode === m ? 'var(--color-pill-active-shadow)' : 'none',
                  transition: 'color 0.2s, background 0.2s',
                }}
              >
                {MODE_LABEL[m]}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 12 * sz.scale, fontWeight: 500, color: '#9A9AA0', whiteSpace: 'nowrap' }}>
            🍅 {pomoCompleted} {pomoCompleted === 1 ? 'сессия' : 'сессий'}
          </span>
        </div>

        <div className="flex flex-1 items-center" style={{ minHeight: 0 }}>
          <p style={{ fontSize: 13 * sz.scale, fontWeight: 500, color: 'var(--color-muted)', lineHeight: 1.3 }}>
            {pomoMode === 'focus'
              ? 'Сосредоточься на работе без отвлечений.'
              : 'Сделай паузу — отдохни и восстановись.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.98 }}
            onClick={pomoRunning ? pomoPause : pomoStart}
            aria-label={pomoRunning ? 'Пауза' : 'Начать фокус'}
            className="flex cursor-pointer items-center justify-center gap-2"
            style={{
              height: btnH, padding: `0 ${22 * sz.scale}px`, borderRadius: 16,
              background: pomoRunning ? 'var(--color-bg-3)' : `linear-gradient(135deg, ${accent}, ${accent}CC)`,
              color: pomoRunning ? 'var(--color-text)' : '#FFFFFF',
              fontSize: 14 * sz.scale, fontWeight: 650,
            }}
          >
            {pomoRunning ? <Pause size={16 * sz.scale} /> : <Play size={16 * sz.scale} />}
            {pomoRunning ? 'Пауза' : 'Начать'}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={pomoReset}
            aria-label="Сбросить таймер"
            className="flex cursor-pointer items-center justify-center"
            style={{ width: btnH, height: btnH, borderRadius: 16, background: 'var(--color-bg-3)', color: 'var(--color-muted)' }}
          >
            <RotateCcw size={16 * sz.scale} />
          </motion.button>
        </div>
      </div>
    </div>
  )
}
