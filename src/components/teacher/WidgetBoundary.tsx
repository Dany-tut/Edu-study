import { diagnosticFailure, diagnosticRetry, diagnosticRecovered } from '../../lib/diagnosticJourney'
import { Component, Fragment, type ReactNode } from 'react'
import { trackEvent } from '../../lib/analytics'
import { isChunkError, recoverFromChunkError } from '../../lib/chunkError'
import { t } from '../../lib/i18n'
import { btn } from '../../lib/pillStyles'

type Props = { children: ReactNode; label?: string }
type State = { error: Error | null; attempt: number }

/**
 * Compact per-widget error boundary for the teacher desk. Isolates a single
 * broken/failed-to-load widget so it can't blank the whole DeskCanvas — the
 * rest of the desk keeps working. Chunk-load failures (stale hash after a
 * deploy) reload the page themselves; other crashes get a "retry".
 */
export default class WidgetBoundary extends Component<Props, State> {
  state: State = { error: null, attempt: 0 }

  static getDerivedStateFromError(error: Error): State {
    return { error, attempt: 0 }
  }

  private failureId = ''
  componentDidUpdate(_: Props, previous: State) {
    if (previous.error && !this.state.error && this.failureId) diagnosticRecovered(this.failureId, 'subtree_rendered')
  }
  componentDidCatch(error: Error) {
    this.failureId = diagnosticFailure('widget', 'render_failed')
    const msg = String(error?.message ?? '')
    const chunk = isChunkError(msg)
    try { trackEvent('widget_crash', { label: this.props.label ?? null, msg: msg.slice(0, 200), chunk }) } catch { /**/ }
    // Свежий index.html забираем сами: ждать, пока человек догадается нажать
    // кнопку, незачем — тем более что после деплоя так падают ВСЕ виджеты
    // разом и стол превращается в поле одинаковых серых плашек.
    if (chunk && recoverFromChunkError(msg)) diagnosticRetry(this.failureId, 'automatic')
  }

  render() {
    if (!this.state.error) {
      // A keyed fragment resets the subtree on retry without inserting a
      // layout box between the size container and the actual widget card.
      return <Fragment key={this.state.attempt}>{this.props.children}</Fragment>
    }
    const msg = String(this.state.error.message ?? '')
    const chunk = isChunkError(msg)
    return (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, textAlign: 'center',
        background: 'rgba(var(--glass-rgb),0.5)', borderRadius: 16, border: '1px solid var(--color-border-medium)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)' }}>
          {chunk ? t('Вышла новая версия') : t('Виджет не загрузился')}
        </span>
        <button
          onClick={() => {
            diagnosticRetry(this.failureId, chunk ? 'reload' : 'retry')
            if (chunk) window.location.reload()
            else this.setState(s => ({ error: null, attempt: s.attempt + 1 }))
          }}
          style={btn('S', 'secondary')}
        >
          {chunk ? t('Обновить') : t('Повторить')}
        </button>
      </div>
    )
  }
}
