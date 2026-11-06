import { useCallback, useEffect, useState } from 'react'
import { textFadeStyle } from '../../lib/textFades'
import { useT } from '../../lib/i18n'
import { deletePasskey, isPasskeyCancel, listPasskeys, passkeyErrorRu, registerPasskey, usePasskeyAvailable, type PasskeyItem } from '../../lib/passkey'
import { supabase } from '../../lib/supabase'
import { Alert } from '../Alert'
import { confirmDialog } from '../ConfirmHost'
import { KeyRound, X } from '../icons/appIcons'

const pill = { minHeight: 44, width: 124, boxSizing: 'border-box', padding: '0 10px', borderRadius: 14, border: 0, fontSize: 13, fontWeight: 650, whiteSpace: 'nowrap' } as const

/** Строка «Ключ доступа» в «Способах входа»: создать ключ, список созданных, удалить. */
export default function PasskeyLoginRow() {
  const t = useT()
  const on = usePasskeyAvailable()
  const [keys, setKeys] = useState<PasskeyItem[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try { setKeys(await listPasskeys()) } catch { setKeys([]) }
  }, [])
  useEffect(() => {
    if (!on) return
    void load()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') window.setTimeout(() => { void load() }, 0)
    })
    return () => subscription.unsubscribe()
  }, [on, load])

  if (!on) return null

  const create = async () => {
    setBusy(true)
    setError('')
    try {
      await registerPasskey()
      await load()
    } catch (e) {
      if (!isPasskeyCancel(e)) setError(passkeyErrorRu(e, 'Не получилось создать ключ. Попробуйте ещё раз.'))
    } finally { setBusy(false) }
  }

  const remove = async (key: PasskeyItem) => {
    const ok = await confirmDialog({
      title: t('Удалить ключ доступа?'),
      message: t('Войти этим ключом больше не получится. Почта и другие способы входа останутся.'),
      confirmLabel: t('Удалить'), tone: 'danger',
    })
    if (!ok) return
    setError('')
    try {
      await deletePasskey(key.id)
      setKeys(list => (list ?? []).filter(k => k.id !== key.id))
    } catch { setError('Не получилось удалить ключ. Попробуйте ещё раз.') }
  }

  const has = !!keys?.length
  return <div style={{ borderTop: '1px solid var(--color-border-soft)' }}>
    <div style={{ display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr) auto', alignItems: 'center', gap: 10, minHeight: 76, padding: '12px 0' }}>
      <span style={{ display: 'grid', placeItems: 'center', color: has ? 'var(--color-green-text)' : 'var(--color-purple-text)' }}><KeyRound size={22} /></span>
      <div style={{ minWidth: 0, color: 'var(--color-text)', fontSize: 14 }}>
        <strong>{t('Ключ доступа')}</strong>
        <div style={{ marginTop: 3, color: 'var(--color-muted)', fontSize: 12, lineHeight: 1.35 }}>{t('Вход без пароля — по Face ID или отпечатку')}</div>
      </div>
      <button type="button" onClick={() => void create()} disabled={keys === null || busy}
        style={{ ...pill, background: 'var(--color-purple-soft)', color: 'var(--color-purple-text)', cursor: 'pointer', opacity: keys === null || busy ? 0.55 : 1 }}>
        {keys === null ? t('Загрузка...') : busy ? t('Создаём…') : t(has ? 'Ещё ключ' : 'Создать')}
      </button>
    </div>
    {keys?.map(key => <div key={key.id} style={{ display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr) 44px', alignItems: 'center', gap: 10, minHeight: 52, padding: '4px 0 8px' }}>
      <span />
      <div style={{ minWidth: 0, fontSize: 13, color: 'var(--color-text)' }}>
        <div style={{ overflow: 'hidden', ...textFadeStyle, whiteSpace: 'nowrap' }} title={key.name || undefined}>{key.name || t('Ключ доступа')}</div>
        <div style={{ marginTop: 2, fontSize: 12, color: 'var(--color-muted)' }}>{t('создан')} {formatDate(key.createdAt)}</div>
      </div>
      <button type="button" data-hover="link" onClick={() => void remove(key)} aria-label={`${t('Удалить ключ доступа')} ${key.name}`.trim()}
        style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', border: 0, borderRadius: 14, background: 'transparent', color: 'var(--color-muted)', cursor: 'pointer' }}>
        <X size={16} />
      </button>
    </div>)}
    {error && <div style={{ marginBottom: 12 }}><Alert tone="danger" text={t(error)} /></div>}
  </div>
}

function formatDate(iso: string) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' })
}
