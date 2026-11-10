import { useState } from 'react'
import { confirmSocialLink, stashPendingLink, type LinkCandidate } from '../lib/socialAuth'
import { IS_IOS } from '../lib/platform'
import { useT } from '../lib/i18n'
import { X } from './icons/appIcons'
import { AppleMark, GoogleMark, YandexMark, VkMark } from './SocialLoginButtons'

const LABEL: Record<string, string> = { yandex: 'Яндекс', vk: 'VK', apple: 'Apple', google: 'Google' }

/**
 * Экран «Вы Данил? Связать» — по email-совпадению (edge v2 link_candidate).
 *
 * verified-IdP (Яндекс): [Связать аккаунты] → confirmSocialLink(тикет) → edge
 * линкует по тикету и выдаёт сессию → App уводит в кабинет.
 * VK / непроверенный email: привязка ТОЛЬКО с доказательством владения — просим
 * войти в существующий аккаунт ([Войти и связать]), тикет кладём в pending-link,
 * и App по SIGNED_IN завершит привязку (его сессия == ticket.user_id на сервере).
 * Совпадение email само по себе доступа не даёт.
 *
 * ПК — окно с крестиком; iOS — лист с грабером (закрытие свайпом/«Это не я»).
 */
export default function SocialLinkPrompt({ candidate, onCancel }: { candidate: LinkCandidate; onCancel: () => void }) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const providerLabel = LABEL[candidate.provider] ?? candidate.provider

  async function link() {
    setBusy(true); setError('')
    try {
      await confirmSocialLink(candidate.ticket) // успех → сессия → App в кабинет
    } catch (e) {
      setBusy(false)
      setError(e instanceof Error ? e.message : 'Не удалось связать аккаунт. Попробуйте ещё раз.')
    }
  }

  function loginToLink() {
    stashPendingLink(candidate.ticket)
    window.location.replace(`${window.location.origin}/#/login`)
  }

  const mark = candidate.provider === 'apple' ? <AppleMark size={13} />
    : candidate.provider === 'google' ? <GoogleMark size={14} />
    : candidate.provider === 'yandex' ? <YandexMark size={14} />
    : <VkMark size={14} />
  const primary: React.CSSProperties = { width: '100%', minHeight: 50, borderRadius: 14, border: 0, background: 'var(--color-text)', color: 'var(--color-bg)', fontSize: 15, fontWeight: 650, cursor: 'pointer', opacity: busy ? 0.6 : 1 }
  const ghost: React.CSSProperties = { width: '100%', minHeight: 46, marginTop: 9, borderRadius: 14, border: '1px solid var(--color-border-medium)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: 14, fontWeight: 650, cursor: 'pointer' }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', display: 'flex', alignItems: IS_IOS ? 'flex-end' : 'center', justifyContent: 'center', padding: IS_IOS ? 0 : '32px 16px' }}>
      <div style={{ width: IS_IOS ? '100%' : 'min(400px, 100%)', boxSizing: 'border-box', background: 'var(--color-surface)', border: IS_IOS ? 'none' : '1px solid var(--color-border-medium)', borderRadius: IS_IOS ? '22px 22px 0 0' : 20, padding: '18px 22px 26px', color: 'var(--color-text)', position: 'relative' }}>
        {IS_IOS
          ? <div aria-hidden="true" style={{ width: 36, height: 5, borderRadius: 3, background: 'var(--color-border-medium)', margin: '0 auto 14px' }} />
          : <button data-hover="layer" type="button" aria-label={t('Закрыть')} onClick={onCancel} disabled={busy} style={{ position: 'absolute', top: 12, right: 12, border: 0, background: 'transparent', color: 'var(--color-muted)', cursor: 'pointer', display: 'flex', borderRadius: 8, padding: 4 }}><X size={20} /></button>}

        <p style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 700 }}>{t('Это вы?')}</p>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--color-text-2)' }}>{candidate.requiresCode ? t('Подтвердите, что это ваш аккаунт') : t('Мы нашли аккаунт с этой почтой')}</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--color-accent-soft)', borderRadius: 14, padding: 12, marginBottom: 16 }}>
          <span aria-hidden="true" style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-accent)', color: 'var(--color-bg)', fontWeight: 700 }}>
            {(candidate.name || candidate.emailMasked).trim().charAt(0).toUpperCase()}
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 15, fontWeight: 650 }}>{candidate.emailMasked}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--color-text-2)' }}>
              <span aria-hidden="true" style={{ display: 'inline-flex', width: 14, height: 14 }}>{mark}</span>{t('вход через')} {providerLabel}
            </span>
          </span>
        </div>

        {error && <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--color-red-text)', lineHeight: 1.4 }}>{error}</p>}

        {candidate.requiresCode ? (
          <>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.45 }}>{t('Чтобы связать, войдите в этот аккаунт — так мы убедимся, что он ваш.')}</p>
            <button data-hover="layer" type="button" onClick={loginToLink} style={primary}>{t('Войти и связать')}</button>
          </>
        ) : (
          <>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.45 }}>{t('Связать этот способ входа с аккаунтом? Данные и кабинет сохранятся.')}</p>
            <button data-hover="layer" type="button" onClick={() => void link()} disabled={busy} aria-busy={busy} style={primary}>{busy ? t('Связываем…') : t('Связать аккаунты')}</button>
          </>
        )}
        <button data-hover="layer" type="button" onClick={onCancel} disabled={busy} style={ghost}>{t('Это не я')}</button>
      </div>
    </div>
  )
}
