import { useEffect, useRef, useState } from 'react'
import { startSocialLogin, startSocialLoginCustom, cancelSocialLogin, resetSocialLoginState, hasPendingSocialAuth, isCustomProvider, startPasskeyLogin, type LoginRole } from '../lib/socialAuth'
import { usePasskeyAvailable, passkeyMaybeAvailable } from '../lib/passkey'
import { KeyRound, ChevronRight, Loader2 } from './icons/appIcons'
import { readLastLogin, clearLastLogin } from '../lib/lastLogin'
import { textFadeLines } from '../lib/textFades'
import { useT } from '../lib/i18n'
import { authFailureFeedback, useAuthFeedback } from './AuthFeedback'

type ProviderId = 'apple' | 'google' | 'yandex' | 'vk'
const providers: { id: ProviderId; label: string }[] = [
  { id: 'apple', label: 'Apple' },
  { id: 'google', label: 'Google' },
  { id: 'yandex', label: 'Яндекс' },
  { id: 'vk', label: 'VK' },
]

/** joinToken — вход со страницы приглашения: аккаунт Google/Apple привяжется к карточке ученика. */
export default function SocialLoginButtons({ role, joinToken }: { role: LoginRole; joinToken?: string }) {
  const t = useT()
  const sequence = useRef(0)
  const [busy, setBusy] = useState<string | null>(null)
  const feedback = useAuthFeedback('social')
  const started = useRef(false)
  const pending = useRef(false)
  // ключ доступа — вход в уже готовый аккаунт; на странице приглашения его нет
  const passkeyOn = usePasskeyAvailable() && !joinToken
  // Место под кнопку ключа держим с первого кадра на пригодных доменах, пока идёт
  // асинхронная проверка passkeys_enabled — иначе кнопка всплывает позже и толкает
  // низ карточки. На непригодных доменах (false) слота нет — ничего не прыгает.
  const passkeyReserve = passkeyMaybeAvailable() && !joinToken
  // «Последний вход» этого устройства для ЭТОЙ роли (на приглашении — не показываем:
  // там привязка к конкретной карточке, а не вход своим прошлым аккаунтом).
  const [lastLogin, setLastLogin] = useState(() => (joinToken ? null : readLastLogin(role)))

  useEffect(() => {
    // Сбой входа ПОСЛЕ установки сессии (напр. роль не преподаватель → signOut)
    // раньше молча ронял на лендинг: обработчик ниже там не смонтирован. App
    // кладёт причину в sessionStorage (с ролью и временем) и уводит на вход —
    // показываем ОДИН раз и только на экране своей роли, протухшее убираем.
    try {
      const raw = sessionStorage.getItem('iskra:social-error')
      if (raw) {
        let payload: { message?: string; role?: string; at?: number }
        try { payload = JSON.parse(raw) } catch { payload = { message: raw } } // старый формат — простая строка
        const fresh = !payload.at || Date.now() - payload.at < 60_000
        const roleMatches = !payload.role || payload.role === role
        if (payload.message && fresh && roleMatches) {
          sessionStorage.removeItem('iskra:social-error')
          feedback.report(authFailureFeedback(payload.message))
        } else if (!fresh) {
          sessionStorage.removeItem('iskra:social-error') // протухшее — чтобы не всплыло позже
        }
        // свежее, но роль чужая — оставляем для экрана нужной роли
      }
    } catch { /* sessionStorage недоступен — не критично */ }

    const onError = (event: Event) => {
      if (started.current && !pending.current) return
      started.current = true; pending.current = false
      const detail = (event as CustomEvent<string>).detail
      sequence.current++
      feedback.report(authFailureFeedback(detail || 'Не удалось завершить вход. Попробуйте ещё раз.'))
      setBusy(null)
    }
    const cancelled = () => { sequence.current++; pending.current = false; setBusy(null); feedback.report({ tone: 'info', title: 'Вход отменён', text: 'Можно выбрать другой способ входа.' }) }
    window.addEventListener('iskra:auth-cancelled', cancelled)
    window.addEventListener('iskra:auth-error', onError)
    return () => { sequence.current++; window.removeEventListener('iskra:auth-error', onError); window.removeEventListener('iskra:auth-cancelled', cancelled) }
  }, [feedback.report, role])

  useEffect(() => {
    // Браузерный «Назад» со страницы провайдера возвращает нас из bfcache с
    // замороженным «Открываем…» — обмен уже не случится, кнопка висела навсегда.
    // На возврате (event.persisted) снимаем busy и чистим неоконченную попытку,
    // чтобы сразу можно было нажать снова. На своём колбэке /auth/* не трогаем —
    // там обмен ведёт SocialCallbackPage.
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return
      if (!pending.current && !hasPendingSocialAuth()) return
      if (/^\/auth\/(yandex|vk)\/?$/.test(window.location.pathname)) return
      resetSocialLoginState()
      sequence.current++
      pending.current = false
      started.current = false
      setBusy(null)
      feedback.reset()
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [feedback.reset])

  async function begin(provider: ProviderId) {
    const id = ++sequence.current
    setBusy(provider)
    started.current = true; pending.current = true
    // Индикатор прогресса — в самой нажатой кнопке (спиннер + «Отмена» по месту),
    // НЕ в среднем слоте email/пароля: фидбэк там, где клик, и форма не дёргается.
    try {
      if (isCustomProvider(provider)) await startSocialLoginCustom(provider, role, joinToken)
      else await startSocialLogin(provider, role, joinToken)
    } catch (err) {
      if (sequence.current !== id) return
      pending.current = false
      setBusy(null)
      feedback.report(authFailureFeedback(err))
    }
  }

  async function withPasskey() {
    const id = ++sequence.current
    setBusy('passkey')
    started.current = true; pending.current = true
    // Прогресс — спиннером в самой кнопке ключа, не в среднем слоте.
    try {
      const signedIn = await startPasskeyLogin(role)
      if (sequence.current !== id) return
      pending.current = false
      setBusy(null)
      // закрыли системное окно — просто возвращаем экран как был
      if (!signedIn) feedback.reset()
    } catch (err) {
      if (sequence.current !== id) return
      pending.current = false
      setBusy(null)
      // наши сообщения уже по-русски — показываем как есть, остальное переводит authErrorRu
      feedback.report(authFailureFeedback(err instanceof Error && /[а-яё]/i.test(err.message) ? err.message : err))
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 10, marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--color-muted)', fontSize: 12 }}>
        <span style={{ height: 1, flex: 1, background: 'var(--color-border-medium)' }} />
        {t('или продолжить с')}
        <span style={{ height: 1, flex: 1, background: 'var(--color-border-medium)' }} />
      </div>
      {lastLogin && (
        <>
          <button data-hover="card"
            type="button"
            data-auth-provider={lastLogin.provider}
            onClick={() => busy === lastLogin.provider ? cancelSocialLogin() : void begin(lastLogin.provider)}
            disabled={(busy !== null && busy !== lastLogin.provider) || feedback.busy}
            aria-label={busy === lastLogin.provider ? t('Отмена') : `${t('Продолжить как')} ${lastLogin.name} · ${providers.find(p => p.id === lastLogin.provider)?.label ?? ''}`}
            aria-busy={busy === lastLogin.provider}
            style={{
              minHeight: 58, borderRadius: 16, padding: '10px 14px', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 12,
              border: '1.5px solid var(--color-accent)', background: 'var(--color-surface)',
              color: 'var(--color-text)', opacity: busy && busy !== lastLogin.provider ? 0.55 : 1,
            }}
          >
            <span aria-hidden="true" style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-accent-soft)', color: 'var(--color-accent)', fontWeight: 700, fontSize: 16 }}>
              {lastLogin.name.trim().charAt(0).toUpperCase()}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 15, fontWeight: 650, overflowWrap: 'anywhere', ...textFadeLines(2) }}>{t('Продолжить как')} {lastLogin.name}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-2)', marginTop: 1 }}>
                <span aria-hidden="true" style={{ display: 'inline-flex', width: 14, height: 14 }}>
                  {lastLogin.provider === 'apple' ? <AppleMark size={13} />
                    : lastLogin.provider === 'google' ? <GoogleMark size={14} />
                    : lastLogin.provider === 'yandex' ? <YandexMark size={14} />
                    : <VkMark size={14} />}
                </span>
                {providers.find(p => p.id === lastLogin.provider)?.label ?? ''}
              </span>
            </span>
            <span aria-hidden="true" style={{ display: 'flex', color: 'var(--color-muted)', flexShrink: 0 }}>{busy === lastLogin.provider ? <Loader2 size={18} className="auth-feedback-spinner" /> : <ChevronRight size={18} />}</span>
          </button>
          <button data-hover="link"
            type="button"
            onClick={() => { clearLastLogin(); setLastLogin(null) }}
            disabled={busy !== null}
            style={{ border: 0, background: 'transparent', color: 'var(--color-accent)', fontSize: 13, fontWeight: 600, padding: 4, minHeight: 36, cursor: 'pointer', justifySelf: 'center' }}
          >
            {t('Это не я · другой аккаунт')}
          </button>
        </>
      )}
      {!lastLogin && <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 10 }}>
      {providers.map(({ id, label }) => (
        <button data-hover="layer"
          key={id}
          data-auth-provider={id}
          type="button"
          onClick={() => busy === id ? cancelSocialLogin() : void begin(id)}
          disabled={(busy !== null && busy !== id) || feedback.busy}
          aria-label={busy === id ? t('Отмена') : `${t('Продолжить с')} ${label}`}
          aria-busy={busy === id}
          style={{
            minHeight: 48, minWidth: 0, borderRadius: 14, padding: '8px 10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            border: '1px solid var(--color-border-medium)', background: 'var(--color-surface)',
            color: 'var(--color-text)', fontSize: 14, fontWeight: 650,
            opacity: busy && busy !== id ? 0.55 : 1,
          }}
        >
          <span aria-hidden="true" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, flexShrink: 0, transform: id === 'apple' && busy !== id ? 'translateY(-0.5px)' : undefined }}>
            {busy === id ? <Loader2 size={18} className="auth-feedback-spinner" />
              : id === 'apple' ? <AppleMark size={18} />
              : id === 'google' ? <GoogleMark size={20} />
              : id === 'yandex' ? <YandexMark size={20} />
              : <VkMark size={20} />}
          </span>
          <span style={{ display: 'block', lineHeight: '20px' }}>{busy === id ? t('Отмена') : label}</span>
        </button>
      ))}
      {(passkeyOn || passkeyReserve) && <button
          data-auth-provider="passkey"
          type="button"
          onClick={() => void withPasskey()}
          disabled={!passkeyOn || busy !== null || feedback.busy}
          aria-busy={busy === 'passkey'}
          // Пока проверка не подтвердила ключ — кнопка на месте, но visibility:hidden:
          // занимает СВОЮ точную высоту с первого кадра (место не угадываем), поэтому
          // её появление не двигает низ карточки. Не фокусируется и не читается.
          aria-hidden={passkeyOn ? undefined : true}
          tabIndex={passkeyOn ? undefined : -1}
          style={{
            gridColumn: '1 / -1', minHeight: 48, minWidth: 0, borderRadius: 14, padding: '8px 10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            border: '1px solid var(--color-border-medium)', background: 'var(--color-surface)',
            color: 'var(--color-text)', fontSize: 14, fontWeight: 650,
            visibility: passkeyOn ? undefined : 'hidden',
            opacity: busy && busy !== 'passkey' ? 0.55 : 1,
          }}
        >
          <span aria-hidden="true" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, flexShrink: 0 }}>{busy === 'passkey' ? <Loader2 size={18} className="auth-feedback-spinner" /> : <KeyRound size={19} />}</span>
          <span style={{ display: 'block', lineHeight: '20px' }}>{t('Войти с ключом доступа')}</span>
        </button>}
      </div>}
    </div>
  )
}

export function AuthLegalLinks() {
  return <p className="auth-legal">
        <a data-hover="link" href="/privacy.html" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>Политика конфиденциальности</a>
        {' · '}
        <a data-hover="link" href="/terms.html" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>Условия использования</a>
      </p>
}

export function AppleMark({ size = 20 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.15 6.9c-.95 0-2.42-1.08-3.96-1.05-2.04.03-3.91 1.18-4.96 3.01-2.12 3.67-.54 9.09 1.52 12.07 1.01 1.45 2.21 3.08 3.8 3.02 1.52-.06 2.1-.98 3.95-.98 1.83 0 2.36.98 3.95.95 1.64-.03 2.68-1.49 3.68-2.95 1.16-1.69 1.64-3.33 1.67-3.41-.04-.01-3.19-1.23-3.23-4.87-.03-3.05 2.49-4.51 2.6-4.57-1.42-2.08-3.63-2.31-4.4-2.36-2-.16-3.68 1.13-4.62 1.13Zm3.3-3.92c.83-1 1.39-2.38 1.23-3.76-1.34-.07-2.96.89-3.92 2.04-.85 1.01-1.6 2.41-1.4 3.76 1.49.11 3.02-.76 4.09-2.04Z" transform="translate(-.4 1.2) scale(.96)" />
    </svg>
  )
}

// Официальный знак Яндекс ID: красный (#FC3F1D) скруглённый квадрат с белой «Я».
// Глиф «Я» взят из фирменного лого «Яндекс ID» (passport.yandex.ru, data-testid
// auth-logo) — первая субфигура вордмарка, масштабирована под 24×24.
export function YandexMark({ size = 20 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="5.5" fill="#FC3F1D" />
      <path fill="#fff" transform="translate(7.19 2.77) scale(0.6275)" d="M11.2029 6.57616H9.45694C6.28514 6.57616 4.61486 8.18389 4.61486 10.5627C4.61486 13.2617 5.77009 14.5115 8.15039 16.1192L10.1044 17.4359L4.45481 25.8747H0.25L5.31469 18.3249C2.39023 16.2385 0.754868 14.219 0.754868 10.7766C0.754868 6.46995 3.74188 3.55859 9.4162 3.55859H15.0643V25.8761H11.1898V6.57616H11.2029Z" />
    </svg>
  )
}

// Официальная монограмма VK (знак VK ID): синий (#0077FF) скруглённый квадрат с
// белой «VK». Пути взяты из фирменного лого VK ID (id.vk.ru), viewBox 0 0 36 36.
export function VkMark({ size = 20 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 36 36">
      <path fill="#07F" d="M0 17.3C0 9 0 5 2.5 2.5 5.1 0 9.1 0 17.3 0h1.4C27 0 31 0 33.5 2.5 36 5.1 36 9.1 36 17.3v1.4c0 8.2 0 12.2-2.5 14.8C30.9 36 26.9 36 18.7 36h-1.4C9 36 5 36 2.5 33.5 0 30.9 0 26.9 0 18.7z" />
      <path fill="#fff" d="M19.3 26c-8.1 0-13-5.6-13.2-15h4c.2 6.9 3.4 9.8 5.8 10.4V11h3.9v6c2.3-.3 4.7-3 5.5-6h4c-.7 3.7-3.3 6.4-5.2 7.5 1.9.9 4.9 3.2 6 7.5H26c-1-2.9-3.1-5-6.1-5.4V26h-.5Z" />
    </svg>
  )
}

export function GoogleMark({ size = 19 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 48 48">
      <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.1v5.1h6.6c3.9-3.6 6.1-8.8 6.1-14.9Z" />
      <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.7l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2A20 20 0 0 0 24 44Z" />
      <path fill="#FBBC05" d="M12.6 27.8a12 12 0 0 1 0-7.6V15H5.8a20 20 0 0 0 0 18Z" />
      <path fill="#EA4335" d="M24 11.8c3 0 5.7 1 7.8 3.1l5.8-5.8A19.4 19.4 0 0 0 24 4a20 20 0 0 0-18.2 11l6.8 5.2c1.6-4.8 6.1-8.4 11.4-8.4Z" />
    </svg>
  )
}
