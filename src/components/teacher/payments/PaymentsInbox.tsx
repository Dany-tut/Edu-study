import { useEffect, useState } from 'react'
import FadeText from '../../FadeText'
import { Check, CalendarCheck, ChevronRight } from '../../icons/appIcons'
import { useT, useTc } from '../../../lib/i18n'
import {
  usePaymentInbox, confirmPaymentClaim, fetchMonthClose, rowsToInvoice, previousPeriod, monthName, rub, claimTime,
  type TeacherClaim,
} from '../../../lib/paymentClaims'
import PaymentClaimModal from './PaymentClaimModal'
import MonthCloseModal from './MonthCloseModal'

// «Оплаты: ждут вас»: отметки «Оплатили» на подтверждение (одно касание —
// «Пришло») и строка закрытия прошлого месяца. Один список для виджета на столе
// и окна на телефоне.

function initials(name: string) {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

type MonthState = { period: string; toInvoice: number; total: number; invoiced: number } | null

export function useMonthCloseState(): MonthState {
  const version = usePaymentInbox(s => s.version)
  const [state, setState] = useState<MonthState>(null)
  useEffect(() => {
    let alive = true
    const period = previousPeriod()
    fetchMonthClose(period).then(rows => {
      if (!alive) return
      const due = rowsToInvoice(rows)
      setState({
        period,
        toInvoice: due.length,
        total: due.reduce((s, r) => s + r.owed * (r.price ?? 0), 0),
        invoiced: rows.filter(r => r.invoice_id).length,
      })
    }).catch(() => { if (alive) setState(null) })
    return () => { alive = false }
  }, [version])
  return state
}

export default function PaymentsInbox({ compact = false }: { compact?: boolean }) {
  const t = useT()
  const { tn } = useTc()
  const claims = usePaymentInbox(s => s.claims)
  const loaded = usePaymentInbox(s => s.loaded)
  const load = usePaymentInbox(s => s.load)
  const month = useMonthCloseState()
  const [open, setOpen] = useState<TeacherClaim | null>(null)
  const [monthOpen, setMonthOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [failed, setFailed] = useState<string | null>(null)

  useEffect(() => {
    void load()
    // Новые отметки приходят уведомлением; список перечитываем при возврате на вкладку.
    const onFocus = () => { if (document.visibilityState === 'visible') void load() }
    document.addEventListener('visibilitychange', onFocus)
    return () => document.removeEventListener('visibilitychange', onFocus)
  }, [load])

  async function quickConfirm(c: TeacherClaim) {
    if (busy) return
    setBusy(c.id); setFailed(null)
    try { await confirmPaymentClaim(c.id) }
    catch { setFailed(c.id) }
    setBusy(null)
  }

  const monthRow = month && (month.toInvoice > 0 || month.invoiced > 0) && (
    <button data-hover="layer" type="button" className="ww-row ww-month-row" onClick={() => setMonthOpen(true)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
      <span className="ww-avatar" style={{ width: 34, height: 34, borderRadius: 11, flexShrink: 0, background: 'var(--color-purple-soft)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CalendarCheck size={16} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <FadeText style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{t('Закрыть')} {monthName(month.period)}</FadeText>
        <FadeText style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 1 }}>
          {month.toInvoice > 0 ? `${t('к выставлению')}: ${month.toInvoice} · ${rub(month.total)}` : `${t('счетов выставлено')}: ${month.invoiced}`}
        </FadeText>
      </span>
      <ChevronRight size={16} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />
    </button>
  )

  return (
    <>
      {claims.map(c => (
        <div key={c.id} className="ww-row ww-claim-row" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: compact ? '8px 16px' : '10px 16px' }}>
          <button data-hover="layer" type="button" onClick={() => setOpen(c)} aria-label={`${t('Открыть отметку')}: ${tn(c.student_name ?? '')}`}
            style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
            <span className="ww-avatar" style={{ width: 34, height: 34, borderRadius: 11, flexShrink: 0, background: 'var(--color-peach-soft)', color: '#C07020', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
              {initials(tn(c.student_name ?? '?'))}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <FadeText style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{tn(c.student_name ?? t('Ученик'))}</FadeText>
              <FadeText style={{ fontSize: 11, color: failed === c.id ? 'var(--color-red-text)' : 'var(--color-text-3)', marginTop: 1 }}>
                {failed === c.id ? t('Не записалось — откройте и повторите') : `«${t('Оплатили')}» ${rub(c.amount)} · ${claimTime(c.created_at)}`}
              </FadeText>
            </span>
          </button>
          <button data-hover="layer" type="button" onClick={() => void quickConfirm(c)} disabled={busy === c.id}
            aria-label={`${t('Пришло')}: ${rub(c.amount)}`}
            style={{ minHeight: 32, padding: '0 10px', borderRadius: 9, border: 'none', flexShrink: 0, background: 'var(--color-green-soft)', color: 'var(--color-green-text)', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit', opacity: busy === c.id ? 0.6 : 1 }}>
            <Check size={14} />{t('Пришло')}
          </button>
        </div>
      ))}
      {loaded && claims.length === 0 && (
        <div style={{ padding: '14px 16px', fontSize: 13, color: 'var(--color-text-3)', lineHeight: 1.4 }}>
          {t('Новых отметок об оплате нет. Ученик отмечает перевод в разделе «Оплата» — он появится здесь.')}
        </div>
      )}
      {monthRow}
      {open && <PaymentClaimModal claim={open} onClose={() => setOpen(null)} />}
      {monthOpen && month && <MonthCloseModal initialPeriod={month.period} onClose={() => setMonthOpen(false)} />}
    </>
  )
}
