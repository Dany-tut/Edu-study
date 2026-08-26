import { Component, type ReactNode } from 'react'
import { trackEvent } from '../../lib/analytics'
import { isChunkError, recoverFromChunkError } from '../../lib/chunkError'
import { t } from '../../lib/i18n'

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

  componentDidCatch(error: Error) {
    const msg = String(error?.message ?? '')
    const chunk = isChunkError(msg)
    try { trackEvent('widget_crash', { label: this.props.label ?? null, msg: msg.slice(0, 200), chunk }) } catch { /**/ }
    // Свежий index.html забираем сами: ждать, пока человек догадается нажать
    // кнопку, незачем — тем более что после деплоя так падают ВСЕ виджеты
    // разом и стол превращается в поле одинаковых серых плашек.
    if (chunk) recoverFromChunkError(msg)
  }

  render() {
    if (!this.state.error) {
      // key на обёртке: «Повторить» должно пересоздать поддерево, а не просто
      // перерисовать тот же инстанс со всем его сломанным состоянием.
      return <div key={this.state.attempt} style={{ width: '100%', height: '100%' }}>{this.props.children}</div>
    }
    const msg = String(this.state.error.message ?? '')
    const chunk = isChunkError(msg)
    return (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, textAlign: 'center',
        background: 'rgba(var(--glass-rgb),0.5)', borderRadius: 16, border: '1.5px solid var(--color-border-medium)',
      }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text-2)' }}>
          {chunk ? t('Вышла новая версия') : t('Виджет не загрузился')}
        </span>
        <button
          onClick={() => {
            if (chunk) window.location.reload()
            else this.setState(s => ({ error: null, attempt: s.attempt + 1 }))
          }}
          style={{ padding: '6px 14px', borderRadius: 10, border: '1px solid var(--color-border-medium)',
            background: 'var(--color-bg-2)', color: 'var(--color-text)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
        >
          {chunk ? t('Обновить') : t('Повторить')}
        </button>
      </div>
    )
  }
}
