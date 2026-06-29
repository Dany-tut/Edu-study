import { AlertCircle } from 'lucide-react'
import MiniStatCard from './_MiniStatCard'
import { useFinanceSummary } from '../../../lib/useFinances'

export default function WidgetFinanceDebt() {
  const { debt } = useFinanceSummary()
  return (
    <MiniStatCard
      icon={AlertCircle} label="Долг"
      value={`${debt.toLocaleString('ru-RU')} ₽`}
      sub={debt > 0 ? 'просрочено' : 'долгов нет'}
      accentBg={debt > 0 ? 'var(--color-red-soft)' : 'var(--color-green-soft)'}
      accentColor={debt > 0 ? 'var(--color-red-text)' : 'var(--color-green-text)'}
    />
  )
}
