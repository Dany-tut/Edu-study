import { useEffect, useState } from 'react'
import Modal from '../../Modal'
import PhotoGallery from '../../PhotoGallery'
import { Alert } from '../../Alert'
import TeacherSaveButton from '../TeacherSaveButton'
import { PAY_BUTTON, PAY_BUTTON_DANGER, PAY_PRIMARY, PAY_FOOTER } from '../../paymentButtons'
import { FIELD } from '../../../lib/fieldStyle'
import { paymentAmount, paymentLessons } from '../../../lib/paymentInput'
import { useAsyncTask } from '../../../lib/useAsyncTask'
import { useT, useTc } from '../../../lib/i18n'
import {
  confirmPaymentClaim, rejectPaymentClaim, fetchClaimReceipt, rub, monthName, claimTime,
  type TeacherClaim,
} from '../../../lib/paymentClaims'

// Один запрос «Оплатили»: проверить сумму и чек, подтвердить (появится платёж,
// занятия прибавятся к балансу) или отклонить с причиной — ученик увидит её.

export default function PaymentClaimModal({ claim, onClose }: { claim: TeacherClaim; onClose: () => void }) {
  const t = useT()
  const { tn } = useTc()
  const [amount, setAmount] = useState(String(claim.amount))
  const [lessons, setLessons] = useState(String(claim.lessons))
  const [receipt, setReceipt] = useState<string | null>(null)
  const [receiptState, setReceiptState] = useState<'none' | 'loading' | 'ready' | 'error'>(claim.has_receipt ? 'loading' : 'none')
  const [viewReceipt, setViewReceipt] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const action = useAsyncTask()

  useEffect(() => {
    if (!claim.has_receipt) return
    let alive = true
    fetchClaimReceipt(claim.id)
      .then(src => { if (alive) { setReceipt(src); setReceiptState(src ? 'ready' : 'error') } })
      .catch(() => { if (alive) setReceiptState('error') })
    return () => { alive = false }
  }, [claim.id, claim.has_receipt])

  function close() { action.cancel(); onClose() }

  function confirm() {
    const amt = paymentAmount(amount)
    const count = paymentLessons(lessons)
    if (amt === null || amt > 10_000_000) { setError(t('Укажите сумму в целых рублях')); return }
    if (count === null || count > 500) { setError(t('Укажите число занятий цифрами')); return }
    setError('')
    void action.run(() => confirmPaymentClaim(claim.id, amt, count), onClose,
      () => setError(t('Не удалось записать платёж.\nПроверьте связь и попробуйте ещё раз.')))
  }

  function reject() {
    if (!reason.trim()) { setError(t('Напишите причину — ученик её увидит')); return }
    setError('')
    void action.run(() => rejectPaymentClaim(claim.id, reason.trim()), onClose,
      () => setError(t('Не удалось отклонить.\nПроверьте связь и попробуйте ещё раз.')))
  }

  const field: React.CSSProperties = { ...FIELD, fontSize: 16, minHeight: 48 }
  const label: React.CSSProperties = { display: 'grid', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--color-text-3)' }
  const balance = claim.balance
  const footer = rejecting
    ? <div style={PAY_FOOTER}>
        <button data-hover="layer" type="button" style={PAY_BUTTON} disabled={action.busy} onClick={() => { setRejecting(false); setError('') }}>{t('Назад')}</button>
        <button data-hover="layer" type="button" style={{ ...PAY_BUTTON_DANGER, opacity: action.busy || !reason.trim() ? 0.55 : 1 }} disabled={action.busy || !reason.trim()} onClick={reject}>
          {action.busy ? t('Отправляем…') : t('Отклонить')}
        </button>
      </div>
    : <div style={PAY_FOOTER}>
        <button data-hover="layer" type="button" style={PAY_BUTTON} disabled={action.busy} onClick={() => { setRejecting(true); setError('') }}>{t('Не пришло')}</button>
        <TeacherSaveButton label={t('Пришло — записать')} savingLabel={t('Записываем…')} saving={action.busy} onClick={confirm} style={PAY_PRIMARY} />
      </div>

  return (
    <>
      <Modal title={tn(claim.student_name ?? t('Ученик'))} subtitle={`${t('Отметили оплату')} · ${claimTime(claim.created_at)}`}
        width={440} onClose={close} footer={footer}>
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gap: 4, fontSize: 13, color: 'var(--color-text-3)', lineHeight: 1.35 }}>
            {claim.invoice_period && <span>{t('По счёту за')} {monthName(claim.invoice_period)}: {rub(claim.invoice_total)}</span>}
            <span>{balance < 0 ? `${t('Сейчас в долг')}: ${-balance} ${t('зан.')}` : `${t('Оплаченных занятий сейчас')}: ${balance}`}</span>
            {claim.note && <span style={{ color: 'var(--color-text-2)' }}>«{claim.note}»</span>}
          </div>

          {claim.has_receipt && (
            <div style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-3)' }}>{t('Чек')}</span>
              {receiptState === 'ready' && receipt ? (
                <button data-hover="layer" type="button" onClick={() => setViewReceipt(true)} aria-label={t('Открыть фото')}
                  style={{ width: 96, height: 96, borderRadius: 12, overflow: 'hidden', border: 'none', padding: 0, cursor: 'zoom-in' }}>
                  <img src={receipt} alt={t('Чек')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ) : (
                <span style={{ fontSize: 13, color: 'var(--color-text-4)' }}>
                  {receiptState === 'loading' ? t('Загружаем фото…') : t('Фото не открылось')}
                </span>
              )}
            </div>
          )}

          {rejecting ? (
            <label style={label}>{t('Почему не подтверждаете')}
              <input autoFocus style={field} value={reason} maxLength={300} placeholder={t('Перевод пока не пришёл')}
                onChange={e => setReason(e.target.value)} disabled={action.busy} />
            </label>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label style={label}>{t('Сумма, ₽')}
                <input style={field} type="text" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} disabled={action.busy} />
              </label>
              <label style={label}>{t('Занятий')}
                <input style={field} type="text" inputMode="numeric" value={lessons} onChange={e => setLessons(e.target.value)} disabled={action.busy} />
              </label>
            </div>
          )}

          {error && <Alert tone="danger" text={error} />}
        </div>
      </Modal>
      {viewReceipt && receipt && <PhotoGallery photos={[receipt]} initialIndex={0} onClose={() => setViewReceipt(false)} />}
    </>
  )
}
