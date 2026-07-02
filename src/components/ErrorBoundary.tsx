import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

/**
 * Catches render/runtime errors in the subtree so a single broken component
 * (e.g. a widget) can't blank the whole app. Shows a recoverable fallback
 * instead of React unmounting the entire tree to a white screen.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: unknown) {
    // Surface to console for debugging; telemetry already captures window errors.
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--color-bg)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 16, padding: '32px 20px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 44, opacity: 0.35 }}>⚠️</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>Что-то пошло не так</div>
        <div style={{ fontSize: 13, color: 'var(--color-muted)', maxWidth: 360, lineHeight: 1.5 }}>
          Произошла ошибка на этой странице. Попробуйте обновить — если повторяется, сообщите нам.
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button
            onClick={() => this.setState({ error: null })}
            style={{ padding: '10px 20px', borderRadius: 12, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-2)', color: 'var(--color-text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Попробовать снова
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: 'var(--grad-purple, #786AD7)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Обновить страницу
          </button>
        </div>
      </div>
    )
  }
}
