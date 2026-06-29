import { Clock } from 'lucide-react'
import MiniStatCard from './_MiniStatCard'
import { useHomeData } from '../../../lib/useHomeData'
import { mskToVietnam } from '../../../lib/utils'

export default function WidgetStatLessons() {
  const { todaySchedule, nextLesson } = useHomeData()
  return (
    <MiniStatCard
      icon={Clock} label="Уроков сегодня" value={todaySchedule.length}
      sub={nextLesson ? `след. ${nextLesson.time} МСК (${mskToVietnam(nextLesson.time)} ВН)` : 'все завершены'}
      accentBg="var(--color-purple-soft)" accentColor="var(--color-accent)"
    />
  )
}
