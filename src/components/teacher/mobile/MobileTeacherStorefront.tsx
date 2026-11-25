import MobileScreen from '../../MobileScreen'
import BackCircle from '../../BackCircle'
import { GlassPill } from '../../mobileChrome'
import StorefrontView from '../storefront/StorefrontView'

/** «Витрина» на телефоне и айпаде в портрете: экран поверх вкладки «Ещё». */
export default function MobileTeacherStorefront({ onBack }: { onBack: () => void }) {
  return <MobileScreen topZone={<div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 44, padding: '0 48px' }}>
    <BackCircle onClick={onBack} label="Ещё" style={{ position: 'absolute', left: 0, width: 44, height: 44 }} />
    <GlassPill>Витрина</GlassPill>
  </div>} glassHeader={{ leading: 'Витрина', leadingSymbol: 'bag', onBack }} topPad={64} scrollKey="teacher-storefront">
    <div style={{ padding: '0 16px' }}><StorefrontView compact /></div>
  </MobileScreen>
}
