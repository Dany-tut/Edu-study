import { CalendarDays } from 'lucide-react'
import MobileScreen from '../../MobileScreen'
import { GlassPill } from '../../mobileChrome'
import TeacherSchedule from '../schedule/TeacherSchedule'
import { useT } from '../../../lib/i18n'

// Расписание на телефоне — та же лента, что на ПК, под стеклянной шапкой.
// Редактора урока на телефоне нет (авторство — только на ПК), поэтому тап по
// занятию открывает меню, как у занятия Искры в Таскли; «Посещаемость» — вкладка «Журнал».
export default function MobileTeacherSchedule({ onAttendance }: { onAttendance: () => void }) {
  const t = useT()
  const topZone = (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <GlassPill><CalendarDays size={16} /> {t('Расписание')}</GlassPill>
    </div>
  )
  return (
    <MobileScreen topZone={topZone} glassHeader={{ leading: t('Расписание'), leadingSymbol: 'calendar' }} topPad={64} restoreKey="t-schedule">
      <TeacherSchedule mobile onAttendance={onAttendance} />
    </MobileScreen>
  )
}
