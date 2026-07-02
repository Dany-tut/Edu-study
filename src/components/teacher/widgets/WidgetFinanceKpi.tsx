import { TrendingUp, Clock, AlertCircle, Sparkles } from 'lucide-react'
import { useFinanceSummary } from '../../../lib/useFinances'

function fmt(n: number) {
  return n.toLocaleString('ru-RU')
}

type KpiCardProps = {
  icon: React.ElementType
  label: string
  value: string
  sub: string
  accentBg: string
  accentColor: string
}

function KpiCard({ icon: Icon, label, value, sub, accentBg, accentColor }: KpiCardProps) {
  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: 'rgba(var(--glass-rgb), 0.88)',
      backdropFilter: 'blur(16px) saturate(180%)',
      WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      border: '1px solid var(--color-border-medium)',
      borderRadius: 24,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
      padding: '16px 18px',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {label}
        </span>
        <div style={{
          width: 30, height: 30, borderRadius: 10,
          background: accentBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={14} strokeWidth={2.2} style={{ color: accentColor }} />
        </div>
      </div>

      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1, letterSpacing: '-0.5px' }}>
        {value}
      </div>

      <div style={{
        fontSize: 11, fontWeight: 600, color: accentColor,
        background: accentBg, borderRadius: 8, padding: '3px 8px',
        alignSelf: 'flex-start',
      }}>
        {sub}
      </div>
    </div>
  )
}

export default function WidgetFinanceKpi() {
  const s = useFinanceSummary()

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <KpiCard
        icon={TrendingUp}
        label="Получено"
        value={`${fmt(s.received)} ₽`}
        sub="в этом месяце"
        accentBg="var(--color-green-soft)"
        accentColor="var(--color-green-text)"
      />
      <KpiCard
        icon={Clock}
        label="Ожидается"
        value={`${fmt(s.expected)} ₽`}
        sub="не оплачено"
        accentBg="var(--color-peach-soft)"
        accentColor="#C07020"
      />
      <KpiCard
        icon={AlertCircle}
        label="Долг"
        value={`${fmt(s.debt)} ₽`}
        sub={s.debt > 0 ? 'просрочено' : 'долгов нет'}
        accentBg={s.debt > 0 ? 'var(--color-red-soft)' : 'var(--color-green-soft)'}
        accentColor={s.debt > 0 ? 'var(--color-red-text)' : 'var(--color-green-text)'}
      />
      <KpiCard
        icon={Sparkles}
        label="Прогноз"
        value={`${fmt(s.forecast)} ₽`}
        sub="до конца месяца"
        accentBg="var(--color-purple-soft)"
        accentColor="var(--color-accent)"
      />
    </div>
  )
}
