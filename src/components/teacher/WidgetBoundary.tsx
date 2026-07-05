import { Component, type ReactNode } from 'react'
import { trackEvent } from '../../lib/analytics'

type Props = { children: ReactNode; label?: string }
type State = { error: Error | null }

/**
 * Compact per-widget error boundary for the teacher desk. Isolates a single
 * broken/failed-to-load widget so it can't blank the whole DeskCanvas — the
 * rest of the desk keeps working. Chunk-load failures (stale hash after a
 * deploy) get a "reload" affordance; other crashes get a "retry".
 */
export default class WidgetBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    const msg = String(error?.message ?? '')
    const isChunk = /dynamically imported module|Importing a module script failed/i.test(msg)
    try { trackEvent('widget_crash', { label: this.props.label ?? null, msg: msg.slice(0, 200), chunk: isChunk }) } catch { /**/ }
  }

  render() {
    if (!this.state.error) return this.props.children
    const msg = String(this.state.error.message ?? '')
    const isChunk = /dynamically imported module|Importing a module script failed/i.test(msg)
    return (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, textAlign: 'center',
        background: 'rgba(var(--glass-rgb),0.5)', borderRadius: 16, border: '1.5px solid var(--color-border-medium)',
      }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text-2)' }}>
          Виджет не загрузился
        </span>
        <button
          onClick={() => { if (isChunk) window.location.reload(); else this.setState({ error: null }) }}
          style={{ padding: '6px 14px', borderRadius: 10, border: '1px solid var(--color-border-medium)',
            background: 'var(--color-bg-2)', color: 'var(--color-text)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
        >
          {isChunk ? 'Обновить' : 'Повторить'}
        </button>
      </div>
    )
  }
}
