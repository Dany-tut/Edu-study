import { useEffect, useRef, useState } from 'react'
import { completeCustomOAuthFromUrl, type LinkCandidate } from '../lib/socialAuth'
import { useT } from '../lib/i18n'
import SocialLinkPrompt from './SocialLinkPrompt'

/**
 * Экран системного колбэка своего OAuth (/auth/yandex | /auth/vk).
 *
 * Пока идёт обмен кода — «Завершаем вход…» со спиннером; при ошибке или отмене —
 * сообщение и кнопка обратно на вход. Нужен, чтобы на колбэк-странице НЕ было
 * белого экрана: обычные кнопки входа (с обработчиком iskra:auth-error) тут не
 * смонтированы, и брошенная из обмена ошибка раньше уходила в никуда, а медленный
 * ответ edge-функции держал пустой фон. На успехе completeCustomOAuthFromUrl
 * ставит сессию → App ловит SIGNED_IN и сам уводит в кабинет (экран исчезает).
 */
export default function SocialCallbackPage() {
  const t = useT()
  const [status, setStatus] = useState<'loading' | 'cancelled' | 'error' | 'link'>('loading')
  const [message, setMessage] = useState('')
  const [candidate, setCandidate] = useState<LinkCandidate | null>(null)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return // один обмен на монтирование (в т.ч. StrictMode)
    ran.current = true
    completeCustomOAuthFromUrl()
      .then(outcome => {
        if (outcome.kind === 'cancelled') setStatus('cancelled')
        else if (outcome.kind === 'link') { setCandidate(outcome.candidate); setStatus('link') }
        // 'done' → App ловит SIGNED_IN и уводит в кабинет, экран исчезает
      })
      .catch(err => {
        setMessage(err instanceof Error ? err.message : '')
        setStatus('error')
      })
  }, [])

  // Полный переход на вход: заодно сбрасывает системный путь /auth/<provider>.
  const goToLogin = () => { window.location.replace(`${window.location.origin}/#/login`) }

  // Найден аккаунт с этой почтой — показываем экран «Вы Данил? Связать».
  if (status === 'link' && candidate) return <SocialLinkPrompt candidate={candidate} onCancel={goToLogin} />

  const done = status !== 'loading'

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ width: 'min(380px, 100%)', background: 'var(--color-surface)', border: '1px solid var(--color-border-medium)', borderRadius: 20, padding: '32px 24px', textAlign: 'center', color: 'var(--color-text)' }}>
        {!done && (
          <>
            <span aria-hidden="true" style={{ display: 'inline-block', width: 34, height: 34, borderRadius: '50%', border: '3px solid var(--color-border-medium)', borderTopColor: 'var(--color-text)', animation: 'spin 0.9s linear infinite' }} />
            <p style={{ margin: '18px 0 0', fontSize: 15, color: 'var(--color-text-2)' }}>{t('Завершаем вход…')}</p>
          </>
        )}
        {done && (
          <>
            <p style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 650 }}>{status === 'cancelled' ? t('Вход отменён') : t('Не удалось войти')}</p>
            {status === 'error' && message && (
              <p style={{ margin: '0 0 20px', fontSize: 14, lineHeight: 1.45, color: 'var(--color-text-2)' }}>{message}</p>
            )}
            <button
              type="button"
              onClick={goToLogin}
              style={{ marginTop: status === 'error' && message ? 0 : 16, minHeight: 48, padding: '0 22px', borderRadius: 14, border: '1px solid var(--color-border-medium)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: 15, fontWeight: 650, cursor: 'pointer' }}
            >
              {t('Войти ещё раз')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
