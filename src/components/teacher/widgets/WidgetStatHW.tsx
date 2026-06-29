import { ClipboardCheck } from 'lucide-react'
import MiniStatCard from './_MiniStatCard'
import { useHomeData } from '../../../lib/useHomeData'

export default function WidgetStatHW() {
  const { pendingCount } = useHomeData()
  return (
    <MiniStatCard
      icon={ClipboardCheck} label="Проверить ДЗ" value={pendingCount}
      sub="ждут ревью"
      accentBg="var(--color-red-soft)" accentColor="var(--color-red-text)"
    />
  )
}
