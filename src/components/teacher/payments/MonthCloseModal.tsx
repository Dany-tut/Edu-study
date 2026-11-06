import { useEffect, useMemo, useState } from 'react'
import Modal from '../../Modal'
import Checkbox from '../../Checkbox'
import Segmented from '../../Segmented'
import FadeText from '../../FadeText'
import { Alert } from '../../Alert'
import TeacherSaveButton from '../TeacherSaveButton'
import { PAY_PRIMARY, PAY_FOOTER } from '../../paymentButtons'
import { FIELD } from '../../../lib/fieldStyle'
import { useAsyncTask } from '../../../lib/useAsyncTask'
import { useIsDesktop } from '../../../lib/useIsDesktop'
import { useT, useTc } from '../../../lib/i18n'
import {
  fetchMonthClose, sendMonthInvoices, previousPeriod, monthName, rub,
  type MonthRow,
} from '../../../lib/paymentClaims'

// «Закрыть месяц» (вариант B концепта): по каждому ученику — проведено за месяц,
// занятий в долг, цена, к оплате. Учитель правит и выставляет счета; ученик
// получает «Счёт за октябрь», в карточке ученика появляются срок и сумма.

type Draft = { on: boolean; lessons: string; price: string }

function currentPeriod(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

function initialDrafts(rows: MonthRow[]) {
  const next: Record<string, Draft> = {}
  for (const r of rows) if (r.owed > 0 && !r.invoice_id)
    next[r.student_id] = { on: !!r.price && r.has_account, lessons: String(r.owed), price: r.price ? String(r.price) : '' }
  return next
}

function whole(v: string) {
  const n = Number(v.replace(/[\s ]/g, ''))
  return Number.isInteger(n) && n > 0 ? n : null
}

export default function MonthCloseModal({ onClose, initialPeriod }: { onClose: () => void; initialPeriod?: string }) {
  const t = useT()
  const { tn } = useTc()
  const desktop = useIsDesktop()
  const prev = previousPeriod()
  const cur = currentPeriod()
  const [period, setPeriod] = useState(initialPeriod ?? prev)
  const [rows, setRows] = useState<MonthRow[] | null>(null)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [loadError, setLoadError] = useState(false)
  const [error, setError] = useState('')
  const [sentCount, setSentCount] = useState<number | null>(null)
  const action = useAsyncTask()

  useEffect(() => {
    let alive = true
    setRows(null); setLoadError(false); setSentCount(null); setError('')
    fetchMonthClose(period).then(data => {
      if (!alive) return
      setRows(data)
      setDrafts(initialDrafts(data))
    }).catch(() => { if (alive) setLoadError(true) })
    return () => { alive = false }
  }, [period])

  const billable = useMemo(() => (rows ?? []).filter(r => drafts[r.student_id]), [rows, drafts])
  const invoiced = useMemo(() => (rows ?? []).filter(r => r.invoice_id), [rows])
  const prepaid = useMemo(() => (rows ?? []).filter(r => !r.invoice_id && r.owed === 0), [rows])
  const held = (rows ?? []).reduce((s, r) => s + r.held, 0)
  const heldStudents = (rows ?? []).filter(r => r.held > 0).length
  const chosen = billable.filter(r => {
    const d = drafts[r.student_id]
    return d.on && whole(d.lessons) && whole(d.price)
  })
  const total = chosen.reduce((s, r) => s + whole(drafts[r.student_id].lessons)! * whole(drafts[r.student_id].price)!, 0)

  function setDraft(id: string, patch: Partial<Draft>) {
    setDrafts(d => ({ ...d, [id]: { ...d[id], ...patch } }))
  }

  function send() {
    if (!chosen.length) return
    setError('')
    const items = chosen.map(r => ({ student_id: r.student_id, lessons: whole(drafts[r.student_id].lessons)!, price: whole(drafts[r.student_id].price)! }))
    void action.run(() => sendMonthInvoices(period, items), count => {
      setSentCount(count)
      // Невыставленные строки остаются с правками учителя; выставленные уходят вниз.
      return fetchMonthClose(period).then(data => {
        setRows(data)
        setDrafts(d => {
          const next = initialDrafts(data)
          for (const id of Object.keys(next)) if (d[id]) next[id] = { ...d[id], on: false }
          return next
        })
      }).catch(() => undefined)
    }, () => setError(t('Не удалось выставить счета.\nПроверьте связь и попробуйте ещё раз. Таблица сохранена.')))
  }

  const field: React.CSSProperties = { ...FIELD, fontSize: 16, minHeight: 44, padding: '0 10px', textAlign: 'right' }
  const n = chosen.length
  const footer = rows && billable.length > 0
    ? <div style={PAY_FOOTER}>
        <TeacherSaveButton label={`${t('Выставить счета')}: ${n}`} savingLabel={t('Выставляем…')} saving={action.busy}
          disabled={n === 0} onClick={send} fullWidth={!desktop} style={PAY_PRIMARY} />
      </div>
    : undefined

  return (
    <Modal title={`${t('Закрыть')} ${monthName(period)}`} subtitle={t('Данные журнала посещаемости и оплат')}
      width={720} onClose={() => { action.cancel(); onClose() }} footer={footer}>
      <div style={{ display: 'grid', gap: 14 }}>
        <Segmented variant="narrow" cellWidth={110} value={period} onChange={setPeriod}
          items={[{ id: prev, label: monthName(prev) }, { id: cur, label: monthName(cur) }]} />

        {loadError && <Alert tone="danger" text={t('Не удалось загрузить месяц.\nЗакройте окно и откройте снова.')} />}
        {!rows && !loadError && <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--color-text-3)', fontSize: 14 }}>{t('Загружаем…')}</div>}

        {rows && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: desktop ? 'repeat(3, 1fr)' : '1fr 1fr', gap: 8 }}>
              <Stat value={String(held)} label={`${t('уроков проведено у')} ${heldStudents}`} />
              <Stat value={rub(total)} label={t('к выставлению')} />
              {desktop && <Stat value={String(invoiced.length)} label={t('счетов уже выставлено')} />}
            </div>

            {sentCount !== null && <Alert tone="success" text={`${t('Выставлено счетов')}: ${sentCount}`} />}

            {billable.length === 0 && (
              <div style={{ fontSize: 14, color: 'var(--color-text-3)', lineHeight: 1.4 }}>
                {invoiced.length ? t('Новых счетов не нужно: долги этого месяца уже выставлены.') : t('Долгов по занятиям нет — счета не нужны.')}
              </div>
            )}

            {billable.length > 0 && (
              <div style={{ display: 'grid', gap: 6 }}>
                {desktop && (
                  <div style={{ display: 'grid', gridTemplateColumns: ROW_COLS, gap: 10, fontSize: 12, fontWeight: 600, color: 'var(--color-text-4)', padding: '0 4px' }}>
                    <span /><span>{t('Ученик')}</span><span style={{ textAlign: 'right' }}>{t('Проведено')}</span>
                    <span style={{ textAlign: 'right' }}>{t('В счёт')}</span><span style={{ textAlign: 'right' }}>{t('Цена, ₽')}</span><span style={{ textAlign: 'right' }}>{t('К оплате')}</span>
                  </div>
                )}
                {billable.map(r => {
                  const d = drafts[r.student_id]
                  const lessons = whole(d.lessons), price = whole(d.price)
                  const sum = lessons && price ? rub(lessons * price) : '—'
                  const name = (
                    <div style={{ minWidth: 0 }}>
                      <FadeText style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{tn(r.student_name ?? '')}</FadeText>
                      <div style={{ fontSize: 12, color: 'var(--color-text-3)', lineHeight: 1.3 }}>
                        {`${t('в долг')}: ${r.owed}`}{r.group_name ? ` · ${r.group_name}` : ''}
                        {!r.has_account && ` · ${t('нет входа — счёт не увидит')}`}
                        {!r.price && ` · ${t('укажите цену')}`}
                      </div>
                    </div>
                  )
                  const inputs = (
                    <>
                      <input aria-label={t('Занятий в счёт')} style={field} inputMode="numeric" value={d.lessons} onChange={e => setDraft(r.student_id, { lessons: e.target.value })} disabled={action.busy} />
                      <input aria-label={t('Цена занятия')} style={field} inputMode="numeric" value={d.price} placeholder="2000" onChange={e => setDraft(r.student_id, { price: e.target.value })} disabled={action.busy} />
                    </>
                  )
                  return desktop ? (
                    <div key={r.student_id} style={{ display: 'grid', gridTemplateColumns: ROW_COLS, gap: 10, alignItems: 'center', padding: '6px 4px', borderTop: '1px solid var(--color-border)' }}>
                      <Checkbox checked={d.on} onChange={on => setDraft(r.student_id, { on })} disabled={action.busy} />
                      {name}
                      <span style={{ textAlign: 'right', fontSize: 14, color: 'var(--color-text-2)' }}>{r.held}</span>
                      {inputs}
                      <span style={{ textAlign: 'right', fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{sum}</span>
                    </div>
                  ) : (
                    <div key={r.student_id} style={{ display: 'grid', gap: 8, padding: '10px 0', borderTop: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Checkbox checked={d.on} onChange={on => setDraft(r.student_id, { on })} disabled={action.busy} />
                        <div style={{ flex: 1, minWidth: 0 }}>{name}</div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', flexShrink: 0 }}>{sum}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingLeft: 28 }}>
                        <label style={{ display: 'grid', gap: 4, fontSize: 12, color: 'var(--color-text-3)' }}>{t('Занятий в счёт')}
                          <input style={field} inputMode="numeric" value={d.lessons} onChange={e => setDraft(r.student_id, { lessons: e.target.value })} disabled={action.busy} />
                        </label>
                        <label style={{ display: 'grid', gap: 4, fontSize: 12, color: 'var(--color-text-3)' }}>{t('Цена, ₽')}
                          <input style={field} inputMode="numeric" value={d.price} placeholder="2000" onChange={e => setDraft(r.student_id, { price: e.target.value })} disabled={action.busy} />
                        </label>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {invoiced.length > 0 && (
              <div style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-3)' }}>{t('Счета за')} {monthName(period)}</span>
                {invoiced.map(r => (
                  <div key={r.student_id} style={{ display: 'flex', alignItems: 'baseline', gap: 10, fontSize: 13 }}>
                    <FadeText style={{ flex: 1, minWidth: 0, color: 'var(--color-text)' }}>{tn(r.student_name ?? '')}</FadeText>
                    <span style={{ flexShrink: 0, color: r.invoice_status === 'paid' ? 'var(--color-green-text)' : 'var(--color-text-3)' }}>
                      {r.invoice_status === 'paid' ? t('оплачено') : t('ждёт оплаты')}
                    </span>
                    <span style={{ flexShrink: 0, fontWeight: 700, color: 'var(--color-text)', minWidth: 72, textAlign: 'right' }}>{rub(r.invoice_total)}</span>
                  </div>
                ))}
              </div>
            )}

            {prepaid.length > 0 && (
              <div style={{ fontSize: 13, color: 'var(--color-text-3)', lineHeight: 1.4 }}>
                {t('Без долга')}: {prepaid.length}. {t('Им счёт не нужен.')}
              </div>
            )}
            {error && <Alert tone="danger" text={error} />}
          </>
        )}
      </div>
    </Modal>
  )
}

const ROW_COLS = '28px minmax(0, 1fr) 72px 84px 96px 92px'

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ borderRadius: 14, background: 'var(--color-bg-3)', padding: '10px 12px', minWidth: 0 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--color-text-3)', lineHeight: 1.3 }}>{label}</div>
    </div>
  )
}
