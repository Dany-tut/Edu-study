import { Layers } from 'lucide-react'
import MiniStatCard from './_MiniStatCard'
import { useGroups } from '../../../lib/useGroups'
import { useT } from '../../../lib/i18n'

export default function WidgetStudentGroups() {
  const t = useT()
  const { groups } = useGroups()
  return (
    <MiniStatCard
      icon={Layers} label={t('Групп')}
      value={groups.length}
      sub={t('активных')}
      accentBg="var(--color-purple-soft)" accentColor="var(--color-accent)"
    />
  )
}
