// Всё, что ниже первого экрана, — отдельным ленивым куском: заголовок и Огонёк
// не ждут картинок устройств и постеров, которых ещё не видно.
// Порядок секций — как на листе «5 · B · Страница целиком» (Figma 302:294).

import PainSection from './PainSection'
import DaySection from './DaySection'
import FeaturesSection from './FeaturesSection'
import StudentSection from './StudentSection'
import EcosystemSection from './EcosystemSection'
import ModesSection from './ModesSection'
import PlatformsSection from './PlatformsSection'
import PricingSection from './PricingSection'
import FaqSection from './FaqSection'
import FinalCtaSection from './FinalCtaSection'
import FooterSection from './FooterSection'
import './landing-motion.css'

export default function BelowFold() {
  return (
    <>
      <PainSection />
      <DaySection />
      <FeaturesSection />
      <StudentSection />
      <EcosystemSection />
      <ModesSection />
      <PlatformsSection />
      <PricingSection />
      <FaqSection />
      <FinalCtaSection />
      <FooterSection />
    </>
  )
}
