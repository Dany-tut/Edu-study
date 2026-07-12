import { TrendingUp } from 'lucide-react'
import MiniStatCard from './_MiniStatCard'
import { useFinanceSummary } from '../../../lib/useFinances'
import { useT } from '../../../lib/i18n'

export default function WidgetFinanceReceived() {
  const t = useT()
  const { received } = useFinanceSummary()
  return (
    <MiniStatCard
      icon={TrendingUp} label={t('Получено')}
      value={`${received.toLocaleString('ru-RU')} ₽`}
      sub={t('в этом месяце')}
      accentBg="var(--color-green-soft)" accentColor="var(--color-green-text)"
    />
  )
}
