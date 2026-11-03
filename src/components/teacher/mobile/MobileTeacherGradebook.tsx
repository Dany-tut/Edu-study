import MobileScreen from '../../MobileScreen'
import CourseJournal from '../CourseJournal'
import { useT } from '../../../lib/i18n'

export default function MobileTeacherGradebook({ onBack }: { onBack?: () => void }) {
  const t = useT()
  return <MobileScreen glassHeader={{ leading: t('Журнал'), leadingSymbol: 'checklist', onBack }} topPad={64} scrollKey="teacher-course-journal">
    <CourseJournal mobile />
  </MobileScreen>
}
