import { Component, type ReactNode } from 'react'
import { trackEvent } from '../lib/analytics'
import { t } from '../lib/i18n'
import { getStudentSession } from '../lib/studentSession'
import FeedbackModal from './FeedbackModal'

type Props = { children: ReactNode }
type State = { error: Error | null; reporting: boolean; reported: boolean }

/**
 * Catches render/runtime errors in the subtree so a single broken component
 * (e.g. a widget) can't blank the whole app. Shows a recoverable fallback
 * instead of React unmounting the entire tree to a white screen.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, reporting: false, reported: false }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  /** Стек компонентов последнего краха — уходит в форму «Сообщить об ошибке». */
  private componentStack = ''

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
      this.componentStack = componentStack
      trackEvent('react_crash', {
        msg: String(error?.message ?? error ?? '').slice(0, 200),
        stack: String(error?.stack ?? '').slice(0, 400),
        component: componentStack,
      })
    } catch { /* never let reporting throw inside the boundary */ }
  }

  /**
   * Заготовка письма: над чертой ученик/учитель пишет, что делал, ниже —
   * технические данные краха, чтобы в «Заявках» не гадать по одному скриншоту.
   * Тело уходит в БД к админу, поэтому подписи всегда русские (без t()).
   */
  private crashDetails() {
    const e = this.state.error
    return [
      '', '',
      '--- технические данные ---',
      'Адрес: ' + window.location.href,
      'Версия: ' + __APP_VERSION__,
      'Ошибка: ' + String(e?.message ?? e ?? '').slice(0, 300),
      String(e?.stack ?? '').split('\n').slice(0, 4).join('\n'),
      this.componentStack.split('\n').slice(0, 5).join('\n').trim(),
    ].join('\n').trimEnd()
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
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>{t('Что-то пошло не так')}</div>
        <div style={{ fontSize: 13, color: 'var(--color-muted)', maxWidth: 360, lineHeight: 1.5 }}>
          {t('Произошла ошибка на этой странице. Попробуйте обновить — если повторяется, сообщите нам.')}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '10px 28px', borderRadius: 12, border: 'none', background: 'var(--grad-purple, #786AD7)', color: '#fff', fontSize: 13, fontWeight: 600, lineHeight: 1.2, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {t('Обновить')}
          </button>
          <button
            onClick={() => this.setState({ reporting: true })}
            style={{ padding: '10px 22px', borderRadius: 12, border: '1px solid var(--color-border, rgba(128,128,128,0.3))', background: 'transparent', color: 'var(--color-text)', fontSize: 13, fontWeight: 600, lineHeight: 1.2, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {this.state.reported ? t('Сообщение отправлено') : t('Сообщить об ошибке')}
          </button>
        </div>
        <div style={{ position: 'fixed', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)', left: 0, right: 0, textAlign: 'center', fontSize: 11, fontWeight: 500, color: 'var(--color-text-3)', letterSpacing: 0.3 }}>
          {t('Версия')} {__APP_VERSION__}
        </div>
        {this.state.reporting && (
          <FeedbackModal
            role={getStudentSession() ? 'student' : 'teacher'}
            defaultSection="Ошибка на странице"
            defaultMessage={this.crashDetails()}
            onSent={() => this.setState({ reported: true })}
            onClose={() => this.setState({ reporting: false })}
          />
        )}
      </div>
    )
  }
}
