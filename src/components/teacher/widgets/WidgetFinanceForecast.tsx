import { Sparkles } from 'lucide-react'
import MiniStatCard from './_MiniStatCard'
import { useFinanceSummary } from '../../../lib/useFinances'
import { useT } from '../../../lib/i18n'

export default function WidgetFinanceForecast() {
  const t = useT()
  const { forecast } = useFinanceSummary()
  return (
    <MiniStatCard
      icon={Sparkles} label={t('Прогноз')}
      value={`${forecast.toLocaleString('ru-RU')} ₽`}
      sub={t('до конца месяца')}
      accentBg="var(--color-purple-soft)" accentColor="var(--color-accent)"
    />
  )
}
