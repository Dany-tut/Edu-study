// «Подвал» лендинга B (Figma «Искра», стр. «11 · Сайт — редизайн», узел 303:552):
// знак + «Искра», документы, справа — копирайт. Знак — общий IskraMark (тот же
// вектор «Буква И», что в макете), наведение на знак со словом проигрывает его анимацию.

import { useT } from '../../../lib/i18n'
import IskraMark from '../IskraMark'
import { Section } from './kit'

const link = 'text-[13px] text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]'

export default function FooterSection() {
  const t = useT()
  return (
    <Section className="pt-12 pb-8 sm:pt-[60px] sm:pb-10">
      <footer className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <a href="#/" className="iskra-host flex items-center gap-4" aria-label="Искра">
          <IskraMark size={24} />
          <span className="text-[15px] font-bold text-[var(--color-text)]">{t('Искра')}</span>
        </a>
        <a href="/privacy.html" className={link}>{t('Политика конфиденциальности')}</a>
        <a href="/terms.html" className={link}>{t('Условия использования')}</a>
        <span className="hidden h-[10px] min-w-px flex-1 sm:block" aria-hidden />
        <p className="m-0 w-full text-[13px] text-[var(--color-muted)] sm:w-auto">© {t('Искра')} · {t('Платформа для преподавателей')}</p>
      </footer>
    </Section>
  )
}
