import { AlertCircle } from 'lucide-react'
import MiniStatCard from './_MiniStatCard'
import { useFinanceSummary } from '../../../lib/useFinances'
import { useT } from '../../../lib/i18n'

export default function WidgetFinanceDebt() {
  const t = useT()
  const { debt } = useFinanceSummary()
  return (
    <MiniStatCard
      icon={AlertCircle} label={t('Долг')}
      value={`${debt.toLocaleString('ru-RU')} ₽`}
      sub={debt > 0 ? t('просрочено') : t('долгов нет')}
      accentBg={debt > 0 ? 'var(--color-red-soft)' : 'var(--color-green-soft)'}
      accentColor={debt > 0 ? 'var(--color-red-text)' : 'var(--color-green-text)'}
    />
  )
}
