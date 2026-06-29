import { Sparkles } from 'lucide-react'
import MiniStatCard from './_MiniStatCard'
import { useFinanceSummary } from '../../../lib/useFinances'

export default function WidgetFinanceForecast() {
  const { forecast } = useFinanceSummary()
  return (
    <MiniStatCard
      icon={Sparkles} label="Прогноз"
      value={`${forecast.toLocaleString('ru-RU')} ₽`}
      sub="до конца месяца"
      accentBg="var(--color-purple-soft)" accentColor="var(--color-accent)"
    />
  )
}
