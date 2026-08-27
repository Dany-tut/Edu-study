import { Clock } from 'lucide-react'
import MiniStatCard from './_MiniStatCard'
import { useHomeData } from '../../../lib/useHomeData'
import { mskToVietnam } from '../../../lib/utils'
import { useT } from '../../../lib/i18n'

export default function WidgetStatLessons() {
  const t = useT()
  const { todaySchedule, nextLesson, loading } = useHomeData()
  return (
    <MiniStatCard
      loading={loading}
      icon={Clock} label={t('Уроков сегодня')} value={todaySchedule.length}
      sub={nextLesson ? `${t('след.')} ${nextLesson.time} ${t('МСК')} (${mskToVietnam(nextLesson.time)} ${t('ВН')})` : t('все завершены')}
      accentBg="var(--color-purple-soft)"
      accentColor="var(--color-purple-text)"
    />
  )
}
