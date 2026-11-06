import MobileScreen from '../../MobileScreen'
import BackCircle from '../../BackCircle'
import { GlassPill } from '../../mobileChrome'
import { ParentReportsMobile } from '../parentReports/ParentReportsView'
import { useT } from '../../../lib/i18n'

/** «Отчёты родителям» на телефоне: исключения, готовые, одна кнопка; отчёт — шторкой. */
export default function MobileTeacherParentReports({ onBack }: { onBack: () => void }) {
  const t = useT()
  return <MobileScreen topZone={<div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 44, padding: '0 48px' }}>
    <BackCircle onClick={onBack} label="Ещё" style={{ position: 'absolute', left: 0, width: 44, height: 44 }} />
    <GlassPill>{t('Отчёты родителям')}</GlassPill>
  </div>} glassHeader={{ leading: t('Отчёты родителям'), leadingSymbol: 'doc.text', onBack }} topPad={64} scrollKey="teacher-parent-reports">
    <ParentReportsMobile />
  </MobileScreen>
}
