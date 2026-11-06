import { AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useT } from '../../lib/i18n'
import { cancelEnrollment, generateBackupCodes, mfaErrorRu, startEnrollment, verifyCode, type MfaEnrollment } from '../../lib/mfa'
import { Alert } from '../Alert'
import Modal from '../Modal'
import { Check, Copy, Shield, ShieldCheck } from '../icons/appIcons'
import { BackupCodesList, CodeCells, linkButton, primaryButton } from './MfaParts'

const STEP_TITLES = ['Сканируйте QR-код', 'Введите код', 'Защита включена'] as const

/** Мастер включения: QR и ключ → 6 цифр → запасные коды. */
export function MfaSetupFlow({ onDone, onStep }: { onDone: () => void; onStep?: (step: number) => void }) {
  const t = useT()
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null)
  const [code, setCode] = useState('')
  const [codes, setCodes] = useState<string[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const pending = useRef<string | null>(null)
  useEffect(() => { onStep?.(step) }, [step, onStep])

  const run = useRef(0)
  const begin = () => {
    const id = ++run.current
    setError('')
    setEnrollment(null)
    startEnrollment().then(e => {
      // Окно закрыли (или начали заново), пока фактор создавался, — сразу снимаем его.
      if (id !== run.current) { void cancelEnrollment(e.factorId); return }
      pending.current = e.factorId
      setEnrollment(e)
    }).catch(e => { if (id === run.current) setError(mfaErrorRu(e)) })
  }
  useEffect(() => {
    begin()
    // Ушли, не подтвердив код, — неподтверждённый фактор снимаем.
    return () => {
      run.current++
      if (pending.current) void cancelEnrollment(pending.current)
      pending.current = null
    }
  }, [])

  const issueCodes = () => {
    setError('')
    setBusy(true)
    generateBackupCodes().then(setCodes).catch(e => setError(mfaErrorRu(e))).finally(() => setBusy(false))
  }
  const submit = async (value = code) => {
    if (!enrollment || value.length !== 6 || busy) return
    setBusy(true)
    setError('')
    try {
      await verifyCode(enrollment.factorId, value)
      pending.current = null
      setStep(2)
      setBusy(false)
      issueCodes()
    } catch (e) {
      setError(mfaErrorRu(e))
      setCode('')
      setBusy(false)
    }
  }
  const copySecret = async () => {
    if (!enrollment) return
    try { await navigator.clipboard.writeText(enrollment.secret); setCopied(true); window.setTimeout(() => setCopied(false), 1800) } catch { /* ключ виден на экране */ }
  }

  return <div style={{ display: 'grid', gap: 16 }}>
    <div style={{ display: 'flex', gap: 6 }} aria-label={`${t('Шаг')} ${step + 1} ${t('из')} 3`}>
      {[0, 1, 2].map(i => <span key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? 'var(--color-purple)' : 'var(--color-border)' }} />)}
    </div>

    {step === 0 && <>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: 'var(--color-text-2)' }}>{t('Откройте приложение-аутентификатор (Google Authenticator, Яндекс Ключ, 1Password) и отсканируйте код.')}</p>
      <div style={{ justifySelf: 'center', width: 196, height: 196, borderRadius: 18, background: '#fff', border: '1px solid var(--color-border-soft)', display: 'grid', placeItems: 'center' }}>
        {enrollment ? <img src={enrollment.qr} alt={t('QR-код для приложения-аутентификатора')} width={172} height={172} /> : <span style={{ color: '#888', fontSize: 13 }}>{error ? '' : t('Загрузка...')}</span>}
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{t('Не получается отсканировать? Введите ключ вручную:')}</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 44px', alignItems: 'center', gap: 8, padding: '4px 4px 4px 14px', borderRadius: 14, background: 'var(--color-bg-input)', border: '1px solid var(--color-border-soft)' }}>
          <code style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 14, letterSpacing: '.06em', color: 'var(--color-text)', overflowWrap: 'anywhere' }}>{enrollment?.secret.replace(/(.{4})/g, '$1 ').trim() ?? '—'}</code>
          <button data-hover="layer" type="button" onClick={() => void copySecret()} disabled={!enrollment} aria-label={t(copied ? 'Скопировано' : 'Скопировать ключ')} title={t(copied ? 'Скопировано' : 'Скопировать ключ')}
            style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', border: 0, borderRadius: 12, background: 'var(--color-purple-soft)', color: 'var(--color-purple-text)', cursor: 'pointer' }}>
            {copied ? <Check size={18} strokeWidth={2.2} /> : <Copy size={18} />}
          </button>
        </div>
      </div>
      {error && <Alert tone="danger" text={t(error)} />}
      {error && !enrollment ? <button data-hover="layer" type="button" onClick={begin} style={primaryButton}>{t('Попробовать ещё раз')}</button>
        : <button data-hover="layer" type="button" disabled={!enrollment} onClick={() => { setError(''); setStep(1) }} style={{ ...primaryButton, opacity: enrollment ? 1 : 0.6 }}>{t('Дальше')}</button>}
    </>}

    {step === 1 && <form noValidate onSubmit={event => { event.preventDefault(); void submit() }} style={{ display: 'grid', gap: 16 }}>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: 'var(--color-text-2)' }}>{t('Введите 6 цифр, которые показывает приложение для «Искры».')}</p>
      <CodeCells value={code} onChange={value => { setCode(value); setError('') }} onComplete={value => void submit(value)} disabled={busy} invalid={!!error} label={t('Код из приложения')} />
      {error && <Alert tone="danger" text={t(error)} />}
      <button data-hover="layer" type="submit" disabled={busy || code.length !== 6} style={{ ...primaryButton, opacity: busy || code.length !== 6 ? 0.6 : 1 }}>{t(busy ? 'Проверяем…' : 'Подтвердить')}</button>
      <button data-hover="layer" type="button" onClick={() => { setStep(0); setCode(''); setError('') }} style={linkButton}>{t('Назад')}</button>
    </form>}

    {step === 2 && <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 14, display: 'grid', placeItems: 'center', background: 'var(--color-green-soft)', color: 'var(--color-green-text)' }}><ShieldCheck size={24} /></span>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: 'var(--color-text-2)' }}>{t('Теперь при входе понадобится код из приложения. Сохраните запасные коды — они выручат, если телефона не будет под рукой.')}</p>
      </div>
      {codes ? <BackupCodesList codes={codes} />
        : <div style={{ padding: 16, textAlign: 'center', fontSize: 13, color: 'var(--color-muted)' }}>{busy ? t('Готовим запасные коды…') : ''}</div>}
      {error && <Alert tone="danger" text={t(error)} />}
      {error && !codes && <button data-hover="layer" type="button" onClick={issueCodes} style={linkButton}>{t('Выпустить коды ещё раз')}</button>}
      <button data-hover="layer" type="button" disabled={!codes} onClick={onDone} style={{ ...primaryButton, opacity: codes ? 1 : 0.6 }}>{t('Я сохранил коды')}</button>
    </>}

  </div>
}

export function MfaSetupDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const t = useT()
  const [step, setStep] = useState(0)
  return <AnimatePresence>
    {open && <Modal key="mfa-setup" onClose={onClose} width={420} title={t('Двухфакторная защита')} subtitle={t(STEP_TITLES[step] ?? STEP_TITLES[0])}
      icon={<Shield size={20} />}>
      <MfaSetupFlow onDone={onDone} onStep={setStep} />
    </Modal>}
  </AnimatePresence>
}

/** Окно «Запасные коды»: выпустить новые взамен старых. */
export function BackupCodesDialog({ open, onClose, left }: { open: boolean; onClose: () => void; left: number }) {
  const t = useT()
  const [codes, setCodes] = useState<string[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { if (!open) { setCodes(null); setError('') } }, [open])
  const issue = () => {
    setBusy(true)
    setError('')
    generateBackupCodes().then(setCodes).catch(e => setError(mfaErrorRu(e))).finally(() => setBusy(false))
  }
  return <AnimatePresence>
    {open && <Modal key="mfa-codes" onClose={onClose} width={420} title={t('Запасные коды')} icon={<Shield size={20} />}>
      <div style={{ display: 'grid', gap: 16 }}>
        {codes ? <>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: 'var(--color-text-2)' }}>{t('Новые коды. Прежние больше не работают. Каждый код срабатывает один раз.')}</p>
          <BackupCodesList codes={codes} />
          <button data-hover="layer" type="button" onClick={onClose} style={primaryButton}>{t('Я сохранил коды')}</button>
        </> : <>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: 'var(--color-text-2)' }}>
            {t('Запасной код пригодится, если телефона с приложением нет под рукой: он снимет защиту, и её можно будет включить заново.')}
          </p>
          <div style={{ fontSize: 14, color: 'var(--color-text)' }}>{t('Осталось кодов')}: <strong>{left}</strong> {t('из')} 8</div>
          {error && <Alert tone="danger" text={t(error)} />}
          <button data-hover="layer" type="button" disabled={busy} onClick={issue} style={{ ...primaryButton, opacity: busy ? 0.6 : 1 }}>{t(busy ? 'Готовим…' : 'Выпустить новые коды')}</button>
          <span style={{ fontSize: 12, color: 'var(--color-muted)', textAlign: 'center' }}>{t('Старые коды перестанут работать.')}</span>
        </>}
      </div>
    </Modal>}
  </AnimatePresence>
}
