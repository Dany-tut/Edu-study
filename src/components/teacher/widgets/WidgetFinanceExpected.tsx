import { Clock } from 'lucide-react'
import MiniStatCard from './_MiniStatCard'
import { useFinanceSummary } from '../../../lib/useFinances'
import { useT } from '../../../lib/i18n'

export default function WidgetFinanceExpected() {
  const t = useT()
  const { expected } = useFinanceSummary()
  return (
    <MiniStatCard
      icon={Clock} label={t('Ожидается')}
      value={`${expected.toLocaleString('ru-RU')} ₽`}
      sub={t('не оплачено')}
      accentBg="var(--color-peach-soft)" accentColor="#C07020"
    />
  )
}
