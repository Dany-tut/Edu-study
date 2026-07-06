import { Component, type ReactNode } from 'react'
import { trackEvent } from '../lib/analytics'

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
    console.error('[ErrorBoundary]', error, info)
    // Report render-time crashes to analytics_events so they show up in the
    // admin dashboard — window 'error'/'unhandledrejection' listeners do NOT
    // fire for React render errors, so without this they'd be invisible in prod.
    try {
      const componentStack =
        info && typeof info === 'object' && 'componentStack' in info
          ? String((info as { componentStack?: unknown }).componentStack ?? '').slice(0, 400)
          : ''
      trackEvent('react_crash', {
        msg: String(error?.message ?? error ?? '').slice(0, 200),
        stack: String(error?.stack ?? '').slice(0, 400),
        component: componentStack,
      })
    } catch { /* never let reporting throw inside the boundary */ }
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
            onClick={() => window.location.reload()}
            style={{ padding: '10px 28px', borderRadius: 12, border: 'none', background: 'var(--grad-purple, #786AD7)', color: '#fff', fontSize: 13, fontWeight: 600, lineHeight: 1.2, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Обновить
          </button>
        </div>
        <div style={{ position: 'fixed', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)', left: 0, right: 0, textAlign: 'center', fontSize: 11, fontWeight: 500, color: 'var(--color-text-3)', letterSpacing: 0.3 }}>
          Версия {__APP_VERSION__}
        </div>
      </div>
    )
  }
}
