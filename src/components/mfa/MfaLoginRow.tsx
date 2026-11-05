import { useCallback, useEffect, useState } from 'react'
import { useT } from '../../lib/i18n'
import { disableMfa, mfaErrorRu, readBackupCodesLeft, readMfa } from '../../lib/mfa'
import { supabase } from '../../lib/supabase'
import { Alert } from '../Alert'
import { confirmDialog } from '../ConfirmHost'
import { Check, Shield, ShieldCheck } from '../icons/appIcons'
import { BackupCodesDialog, MfaSetupDialog } from './MfaSetup'

const pill = { minHeight: 44, width: '100%', boxSizing: 'border-box', borderRadius: 14, fontSize: 13, fontWeight: 650, whiteSpace: 'nowrap' } as const

/** Строка «Двухфакторная защита» в «Способах входа» — того же вида, что Google и Apple. */
export default function MfaLoginRow() {
  const t = useT()
  const [factorId, setFactorId] = useState<string | null | undefined>(undefined)
  const [codesLeft, setCodesLeft] = useState(0)
  const [setupOpen, setSetupOpen] = useState(false)
  const [codesOpen, setCodesOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const [mfa, left] = await Promise.all([readMfa().catch(() => null), readBackupCodesLeft()])
    setFactorId(mfa ? mfa.factor?.id ?? null : null)
    setCodesLeft(left)
  }, [])
  useEffect(() => {
    void load()
    const reload = () => { void load() }
    window.addEventListener('iskra:mfa-changed', reload)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (event === 'MFA_CHALLENGE_VERIFIED' || event === 'USER_UPDATED' || event === 'SIGNED_IN') window.setTimeout(reload, 0)
    })
    return () => { window.removeEventListener('iskra:mfa-changed', reload); subscription.unsubscribe() }
  }, [load])

  const enabled = !!factorId
  const note = t('Код из приложения при входе')

  const disable = async () => {
    if (!factorId) return
    const ok = await confirmDialog({
      title: t('Отключить двухфакторную защиту?'),
      message: t('Для входа снова хватит пароля или Google/Apple. Запасные коды перестанут работать.'),
      confirmLabel: t('Отключить'), tone: 'danger',
    })
    if (!ok) return
    setBusy(true)
    setError('')
    try {
      await disableMfa(factorId)
      window.dispatchEvent(new Event('iskra:mfa-changed'))
    } catch (e) { setError(mfaErrorRu(e)) }
    finally { setBusy(false) }
  }

  return <div style={{ borderTop: '1px solid var(--color-border-soft)', paddingBottom: enabled ? 12 : 0 }}>
    <div style={{ display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr) 124px', alignItems: 'center', gap: 10, minHeight: 76, padding: '12px 0' }}>
      <span style={{ display: 'grid', placeItems: 'center', color: enabled ? 'var(--color-green-text)' : 'var(--color-purple-text)' }}>
        {enabled ? <ShieldCheck size={22} /> : <Shield size={22} />}
      </span>
      <div style={{ minWidth: 0, color: 'var(--color-text)', fontSize: 14 }}>
        <strong>{t('Двухфакторная защита')}</strong>
        <div style={{ marginTop: 3, color: 'var(--color-muted)', fontSize: 12, lineHeight: 1.35 }}>{note}</div>
      </div>
      {enabled
        ? <span aria-label={t('Включена')} style={{ ...pill, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--color-green-soft)', color: 'var(--color-green-text)', fontSize: 12 }}><Check size={14} strokeWidth={2.2} />{t('Включена')}</span>
        : <button type="button" disabled={factorId === undefined} onClick={() => setSetupOpen(true)}
          style={{ ...pill, padding: '0 10px', border: 0, background: 'var(--color-purple-soft)', color: 'var(--color-purple-text)', cursor: 'pointer', opacity: factorId === undefined ? 0.55 : 1 }}>
          {factorId === undefined ? t('Загрузка...') : t('Включить')}
        </button>}
    </div>
    {enabled && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
      <button type="button" onClick={() => setCodesOpen(true)} style={{ ...pill, border: 0, background: 'var(--color-bg-input)', color: 'var(--color-text)', cursor: 'pointer' }}>{t('Запасные коды')}</button>
      <button type="button" disabled={busy} onClick={() => void disable()} style={{ ...pill, border: 0, background: 'var(--color-red-soft)', color: 'var(--color-red-text)', cursor: 'pointer', opacity: busy ? 0.55 : 1 }}>{t(busy ? 'Отключаем…' : 'Отключить')}</button>
    </div>}
    {error && <div style={{ marginTop: 8 }}><Alert tone="danger" text={t(error)} /></div>}
    <MfaSetupDialog open={setupOpen} onClose={() => { setSetupOpen(false); window.dispatchEvent(new Event('iskra:mfa-changed')) }} onDone={() => { setSetupOpen(false); window.dispatchEvent(new Event('iskra:mfa-changed')) }} />
    <BackupCodesDialog open={codesOpen} onClose={() => { setCodesOpen(false); void load() }} left={codesLeft} />
  </div>
}
