import { useEffect, useRef, useState } from 'react'
import Modal from './Modal'
import PhotoGallery from './PhotoGallery'
import { Alert, AlertIcon } from './Alert'
import TeacherSaveButton from './teacher/TeacherSaveButton'
import { PAY_BUTTON, PAY_PRIMARY, PAY_FOOTER } from './paymentButtons'
import { ImagePlus, X } from './icons/appIcons'
import { FIELD } from '../lib/fieldStyle'
import { optimizePhoto, ImageTooLargeError } from '../lib/imageOptim'
import { paymentAmount, paymentLessons } from '../lib/paymentInput'
import { useAsyncTask } from '../lib/useAsyncTask'
import { useT } from '../lib/i18n'
import { getStudentSession } from '../lib/studentSession'
import {
  useMyPayment, claimPayment, cancelPaymentClaim, rub, monthName, claimTime, shortDate,
  type MyPaymentInfo,
} from '../lib/paymentClaims'

// «Оплата» в кабинете ученика: «Я оплатил(а)» из концепта «Связь».
// Ученик или родитель с его телефона отмечает перевод — учитель подтверждает,
// и только тогда появляется платёж и пересчитываются занятия.

function suggestion(info: MyPaymentInfo) {
  if (info.invoice) return { amount: info.invoice.total, lessons: info.invoice.lessons }
  if (info.last_package) return { amount: info.last_package.amount, lessons: info.last_package.lessons }
  return { amount: info.payment_amount ?? null, lessons: null }
}

export default function StudentPaymentModal({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const t = useT()
  const info = useMyPayment(s => s.studentId === studentId ? s.info : null)
  const load = useMyPayment(s => s.load)
  const [amount, setAmount] = useState('')
  const [lessons, setLessons] = useState('')
  const [note, setNote] = useState('')
  const [receipt, setReceipt] = useState<string | null>(null)
  const [viewReceipt, setViewReceipt] = useState(false)
  const [addingPhoto, setAddingPhoto] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const filled = useRef(false)
  const action = useAsyncTask()
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { void load(studentId) }, [load, studentId])
  useEffect(() => {
    if (!info || filled.current) return
    filled.current = true
    const s = suggestion(info)
    if (s.amount) setAmount(String(s.amount))
    if (s.lessons != null) setLessons(String(s.lessons))
  }, [info])

  const pending = info?.claims.find(c => c.status === 'pending')
  const history = (info?.claims ?? []).filter(c => c.status === 'confirmed' || c.status === 'rejected').slice(0, 3)
  const isPhone = typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches
  const field: React.CSSProperties = { ...FIELD, fontSize: 16, minHeight: 48 }
  const label: React.CSSProperties = { display: 'grid', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--color-text-3)' }

  async function addPhoto(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError(t('Выберите фотографию или скриншот чека')); return }
    setAddingPhoto(true)
    setError('')
    try { setReceipt(await optimizePhoto(file)) }
    catch (e) { setError(e instanceof ImageTooLargeError ? e.message : t('Не удалось добавить фото. Попробуйте другой файл.')) }
    finally { setAddingPhoto(false) }
  }

  function send() {
    const amt = paymentAmount(amount)
    const count = lessons.trim() === '' ? 0 : paymentLessons(lessons)
    if (amt === null || amt > 10_000_000) { setError(t('Укажите сумму в целых рублях')); return }
    if (count === null || count > 500) { setError(t('Укажите число занятий цифрами')); return }
    setError('')
    void action.run(
      () => claimPayment({ studentId, amount: amt, lessons: count, note, receipt }),
      () => { setSent(true); void load(studentId) },
      e => {
        const code = (e as { code?: string })?.code
        setError(code === '23505'
          ? t('Оплата уже отмечена и ждёт учителя.')
          : t('Не удалось отправить.\nПроверьте связь и попробуйте ещё раз. Введённые данные сохранены.'))
        if (code === '23505') void load(studentId)
      },
    )
  }

  function cancelClaim(id: string) {
    void action.run(() => cancelPaymentClaim(id), () => { void load(studentId) },
      () => setError(t('Не удалось отменить.\nПопробуйте ещё раз.')))
  }

  const showForm = !!info && !pending && !sent
  const footer = showForm
    ? <div style={PAY_FOOTER}>
        <TeacherSaveButton label={t('Сообщить об оплате')} savingLabel={t('Отправляем…')} saving={action.busy}
          disabled={addingPhoto || !amount.trim()} onClick={send} fullWidth={isPhone} style={PAY_PRIMARY} />
      </div>
    : undefined

  return (
    <>
      <Modal title={t('Оплата')} subtitle={t('Отметьте перевод — учитель подтвердит, когда деньги придут')}
        width={440} onClose={() => { action.cancel(); onClose() }} footer={footer}>
        {!info ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-text-3)', fontSize: 14 }}>{t('Загружаем…')}</div>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            <BalanceLine balance={info.balance} />

            {info.invoice && (
              <div style={{ borderRadius: 14, padding: '12px 14px', background: 'var(--color-bg-3)', display: 'grid', gap: 4 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
                  {t('Счёт за')} {monthName(info.invoice.period)} · {rub(info.invoice.total)}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-3)', lineHeight: 1.35 }}>
                  {t('Занятий')}: {info.invoice.lessons} × {rub(info.invoice.price)} · {t('до')} {shortDate(info.invoice.due_date)}
                </div>
              </div>
            )}

            {sent && !pending && (
              <div style={{ padding: '12px 4px', textAlign: 'center' }}>
                <AlertIcon tone="success" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>{t('Отправлено учителю')}</div>
              </div>
            )}

            {pending && (
              <div style={{ borderRadius: 14, padding: '12px 14px', border: '1px solid var(--color-border-medium)', display: 'grid', gap: 10 }}>
                <div style={{ display: 'grid', gap: 2 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
                    {sent ? t('Отправлено учителю') : t('Ждёт подтверждения')} · {rub(pending.amount)}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-3)', lineHeight: 1.35 }}>
                    {pending.lessons > 0 ? `${t('Занятий')}: ${pending.lessons} · ` : ''}{claimTime(pending.created_at)}.{' '}
                    {t('Учитель подтвердит, когда деньги придут.')}
                  </div>
                </div>
                <button data-hover="layer" type="button" style={{ ...PAY_BUTTON, justifySelf: 'start' }}
                  disabled={action.busy} onClick={() => cancelClaim(pending.id)}>{t('Отменить отметку')}</button>
              </div>
            )}

            {showForm && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <label style={label}>{t('Сумма, ₽')}
                    <input style={field} type="text" inputMode="numeric" placeholder="4 000" value={amount}
                      onChange={e => setAmount(e.target.value)} disabled={action.busy} />
                  </label>
                  <label style={label}>{t('Занятий')}
                    <input style={field} type="text" inputMode="numeric" placeholder="4" value={lessons}
                      onChange={e => setLessons(e.target.value)} disabled={action.busy} />
                  </label>
                </div>
                <label style={label}>{t('Комментарий (необязательно)')}
                  <input style={field} placeholder={t('Например: перевод с карты мамы')} value={note} maxLength={500}
                    onChange={e => setNote(e.target.value)} disabled={action.busy} />
                </label>
                <div style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-3)' }}>{t('Чек (необязательно)')}</span>
                  {receipt ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button data-hover="layer" type="button" onClick={() => setViewReceipt(true)} aria-label={t('Открыть фото')}
                        style={{ width: 64, height: 64, borderRadius: 12, overflow: 'hidden', border: 'none', padding: 0, cursor: 'zoom-in', flexShrink: 0 }}>
                        <img src={receipt} alt={t('Чек')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </button>
                      <button data-hover="layer" type="button" style={PAY_BUTTON} disabled={action.busy}
                        onClick={() => setReceipt(null)}><X size={16} />{t('Убрать')}</button>
                    </div>
                  ) : (
                    <button data-hover="layer" type="button" disabled={action.busy || addingPhoto} onClick={() => fileRef.current?.click()}
                      style={{ minHeight: 56, borderRadius: 12, border: '1.5px dashed var(--color-border-medium)', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
                      <ImagePlus size={18} />{addingPhoto ? t('Обрабатываем фото…') : t('Добавить фото чека')}
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { void addPhoto(e.target.files); e.target.value = '' }} />
                </div>
              </>
            )}

            {error && <Alert tone="danger" text={error} />}

            {history.length > 0 && (
              <div style={{ display: 'grid', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-3)' }}>{t('Последние отметки')}</span>
                {history.map(c => (
                  <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline', fontSize: 13, lineHeight: 1.35 }}>
                    <span style={{ fontWeight: 700, color: 'var(--color-text)', flexShrink: 0 }}>{rub(c.amount)}</span>
                    <span style={{ color: c.status === 'confirmed' ? 'var(--color-green-text)' : 'var(--color-red-text)', minWidth: 0 }}>
                      {c.status === 'confirmed' ? t('Подтверждено') : `${t('Не подтверждено')}${c.reject_reason ? `: ${c.reject_reason}` : ''}`}
                    </span>
                    <span style={{ color: 'var(--color-text-4)', marginLeft: 'auto', flexShrink: 0 }}>{shortDate(c.decided_at ?? c.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
      {viewReceipt && receipt && <PhotoGallery photos={[receipt]} initialIndex={0} onClose={() => setViewReceipt(false)} />}
    </>
  )
}

function BalanceLine({ balance }: { balance: number }) {
  const t = useT()
  const debt = balance < 0
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, fontSize: 14 }}>
      <span style={{ color: 'var(--color-text-3)' }}>{debt ? t('Занятий в долг') : t('Оплаченных занятий')}</span>
      <span style={{ fontWeight: 700, fontSize: 18, color: debt ? 'var(--color-red-text)' : 'var(--color-text)' }}>{Math.abs(balance)}</span>
    </div>
  )
}

/** Единственное место, где живёт окно: меню ПК, профиль на телефоне и
 *  уведомление «Счёт за…» только открывают его (раскладки ПК и телефона
 *  стоят в DOM одновременно — своё окно в каждой открылось бы дважды). */
export function StudentPaymentHost() {
  const open = useMyPayment(s => s.open)
  const setOpen = useMyPayment(s => s.setOpen)
  const studentId = getStudentSession()?.id
  if (!open || !studentId) return null
  return <StudentPaymentModal studentId={studentId} onClose={() => setOpen(false)} />
}
