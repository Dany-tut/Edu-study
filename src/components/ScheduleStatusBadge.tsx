import type { ScheduleState } from '../lib/scheduleState'
import { useT } from '../lib/i18n'

export default function ScheduleStatusBadge({ state, label = state.label }: {
  state: ScheduleState
  label?: string | null
}) {
  const t = useT()
  if (!label || state.phase === 'upcoming' || state.phase === 'unknown') return null
  return (
    <span data-schedule-status={state.phase} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, maxWidth: '100%',
      minHeight: 18, padding: '2px 8px', borderRadius: 999,
      fontSize: 10, fontWeight: 600, lineHeight: '14px',
      color: state.phase === 'live' ? '#FFFFFF' : state.isCurrent ? 'var(--color-accent)' : 'var(--color-muted)',
      background: state.phase === 'live' ? 'var(--color-control-accent)' : state.isCurrent ? 'var(--color-accent-soft)' : 'var(--color-bg-4)',
    }}>
      {state.phase === 'live' && <span aria-hidden="true" style={{ width: 4, height: 4, borderRadius: 999, background: 'currentColor', flexShrink: 0 }} />}
      <span style={{ transform: 'translateY(-0.5px)' }}>{t(label)}</span>
    </span>
  )
}
