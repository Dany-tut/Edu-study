import MobileScreen from '../../MobileScreen'
import CourseJournal from '../CourseJournal'
import BackCircle from '../../BackCircle'
import { GlassPill } from '../../mobileChrome'
import { useT } from '../../../lib/i18n'

export default function MobileTeacherGradebook({ onBack }: { onBack?: () => void }) {
  const t = useT()
  return <MobileScreen topZone={<div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 44, padding: '0 48px' }}>
    {onBack && <BackCircle onClick={onBack} label="Ещё" style={{ position: 'absolute', left: 0, width: 44, height: 44 }} />}
<<<<<<< HEAD
    <GlassPill>{t('Журнал')}</GlassPill>
=======
    <GlassPill><h1 style={{font:'inherit',margin:0}}>{t('Журнал')}</h1></GlassPill>
>>>>>>> a1dc461d (Save all local Iskra interface, homework, security and QA updates)
  </div>} glassHeader={{ leading: t('Журнал'), leadingSymbol: 'checklist', onBack }} topPad={64} scrollKey="teacher-course-journal">
    <CourseJournal mobile />
  </MobileScreen>
}
