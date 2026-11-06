import { Wallet } from '../../icons/appIcons'
import { useT } from '../../../lib/i18n'
import { usePaymentInbox } from '../../../lib/paymentClaims'
import PaymentsInbox from '../payments/PaymentsInbox'

// Виджет «Оплаты: ждут вас» (концепт «Связь», вариант «Итог»). Виден только при
// включённой функции payment_reminders — поле feature в реестре.
export default function WidgetPaymentsInbox() {
  const t = useT()
  const count = usePaymentInbox(s => s.claims.length)
  return (
    <div aria-label={t('Оплаты: ждут вас')} style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      background: 'rgba(var(--glass-rgb), 0.88)',
      backdropFilter: 'var(--blur-glass)',
      WebkitBackdropFilter: 'var(--blur-glass)',
      borderRadius: 24,
      border: '1px solid var(--color-border-medium)',
      overflow: 'hidden',
    }}>
      <div className="ww-header" style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, borderRadius: 9, background: 'var(--color-peach-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Wallet size={14} strokeWidth={2} style={{ color: '#C07020' }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', minWidth: 0 }}>{t('Оплаты: ждут вас')}</span>
        {count > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#C07020', background: 'var(--color-peach-soft)', borderRadius: 20, padding: '1px 8px', flexShrink: 0 }}>{count}</span>
        )}
      </div>
      <div className="no-scrollbar ww-list" style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        <PaymentsInbox />
      </div>
    </div>
  )
}
