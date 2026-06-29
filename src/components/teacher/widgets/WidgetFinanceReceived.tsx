import { TrendingUp } from 'lucide-react'
import MiniStatCard from './_MiniStatCard'
import { useFinanceSummary } from '../../../lib/useFinances'

export default function WidgetFinanceReceived() {
  const { received } = useFinanceSummary()
  return (
    <MiniStatCard
      icon={TrendingUp} label="Получено"
      value={`${received.toLocaleString('ru-RU')} ₽`}
      sub="в этом месяце"
      accentBg="var(--color-green-soft)" accentColor="var(--color-green-text)"
    />
  )
}
