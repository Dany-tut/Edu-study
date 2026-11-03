import MiniStatCard from './_MiniStatCard'
import type { LucideIcon } from '../../icons/appIcons'
import { TrendingUp, Clock, AlertCircle, Sparkles } from '../../icons/appIcons'
import { useFinanceSummary } from '../../../lib/useFinances'
import { useT } from '../../../lib/i18n'

function fmt(n: number) {
  return n.toLocaleString('ru-RU')
}

type KpiCardProps = {
  icon: LucideIcon
  label: string
  value: string
  sub: string
  accentBg: string
  accentColor: string
}

function KpiCard({ icon: Icon, label, value, sub, accentBg, accentColor }: KpiCardProps) {
  return <div className="iskra-widget" data-stat style={{ flex: '1 1 0', minWidth: 0, height: '100%' }}>
    <MiniStatCard icon={Icon} label={label} value={value} sub={sub} accentBg={accentBg} accentColor={accentColor} />
  </div>
}

export default function WidgetFinanceKpi() {
  const s = useFinanceSummary()
  const t = useT()

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <KpiCard
        icon={TrendingUp}
        label={t('Получено')}
        value={`${fmt(s.received)} ₽`}
        sub={t('в этом месяце')}
        accentBg="var(--color-green-soft)"
        accentColor="var(--color-green-text)"
      />
      <KpiCard
        icon={Clock}
        label={t('Ожидается')}
        value={`${fmt(s.expected)} ₽`}
        sub={t('не оплачено')}
        accentBg="var(--color-peach-soft)"
        accentColor="#C07020"
      />
      <KpiCard
        icon={AlertCircle}
        label={t('Долг')}
        value={`${fmt(s.debt)} ₽`}
        sub={s.debt > 0 ? t('просрочено') : t('долгов нет')}
        accentBg={s.debt > 0 ? 'var(--color-red-soft)' : 'var(--color-green-soft)'}
        accentColor={s.debt > 0 ? 'var(--color-red-text)' : 'var(--color-green-text)'}
      />
      <KpiCard
        icon={Sparkles}
        label={t('Прогноз')}
        value={`${fmt(s.forecast)} ₽`}
        sub={t('до конца месяца')}
        accentBg="var(--color-purple-soft)"
        accentColor="var(--color-accent)"
      />
    </div>
  )
}
