import { ClipboardCheck } from 'lucide-react'
import MiniStatCard from './_MiniStatCard'
import { useHomeData } from '../../../lib/useHomeData'
import { useT } from '../../../lib/i18n'

export default function WidgetStatHW() {
  const t = useT()
  const { pendingCount } = useHomeData()
  return (
    <MiniStatCard
      icon={ClipboardCheck} label={t('Проверить ДЗ')} value={pendingCount}
      sub={t('ждут ревью')}
      accentBg="var(--color-red-soft)" accentColor="var(--color-red-text)"
    />
  )
}
