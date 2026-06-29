import { Clock } from 'lucide-react'
import MiniStatCard from './_MiniStatCard'
import { useFinanceSummary } from '../../../lib/useFinances'

export default function WidgetFinanceExpected() {
  const { expected } = useFinanceSummary()
  return (
    <MiniStatCard
      icon={Clock} label="Ожидается"
      value={`${expected.toLocaleString('ru-RU')} ₽`}
      sub="не оплачено"
      accentBg="var(--color-peach-soft)" accentColor="#C07020"
    />
  )
}
