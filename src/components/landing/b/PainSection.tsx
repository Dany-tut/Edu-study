// «Обычно → В Искре» (Figma 302:357 светлая, 303:631 тёмная). Две карточки
// сравнения и задумчивый Огонёк между ними. Цвета — переменные кабинета, поэтому
// тёмная тема переключается сама; картинка Огонька в обеих темах одна.
// На ПК — ряд 470 · 120 · 470, на планшете карточки сужаются, на телефоне —
// колонка: «Обычно» → Огонёк → «В Искре».

import { Check } from '../../icons/appIcons'
import { useT } from '../../../lib/i18n'
import { asset, Section, SectionHead } from './kit'

const USUAL = [
  'Расписание — в заметках, переносы — в чате',
  'Домашки приходят фото в мессенджер',
  'Оценки — в одной таблице, оплаты — в другой',
  'Кто отстаёт — видно только на пробнике',
]

const ISKRA = [
  '«Мой день»: ближайшее занятие и неделя',
  'Сдача в кабинете ученика, проверка с пометками',
  'Журнал, посещаемость и оплаты рядом',
  'Итоги группы и тема для разбора — сами',
]

export default function PainSection() {
  const t = useT()
  return (
    <Section id="how" className="pb-[10px] pt-20 sm:pt-[110px]">
      <SectionHead eyebrow={t('ЗАЧЕМ')} title={t('Пять сервисов → одна Искра')} />

      <div className="mt-10 flex flex-col items-center gap-4 md:flex-row md:justify-center md:gap-4 lg:gap-6">
        <div className="flex w-full flex-col gap-[14px] rounded-[24px] bg-[var(--color-bg-card)] p-6 text-[var(--color-muted)] sm:p-7 md:max-w-[470px] md:flex-1">
          <p className="text-[12px] font-bold tracking-[0.96px]">{t('ОБЫЧНО')}</p>
          {USUAL.map(s => (
            <p key={s} className="whitespace-pre-wrap text-[16px] leading-[1.45]">{'×  '}{t(s)}</p>
          ))}
        </div>

        <img
          src={asset('pain-ogonek-thinking.webp')}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="h-[140px] w-[84px] shrink-0 object-contain md:h-[150px] md:w-[90px] lg:h-[200px] lg:w-[120px]"
        />

        <div className="flex w-full flex-col gap-[14px] rounded-[24px] border border-[var(--color-accent)] bg-[var(--color-accent-soft)] p-6 sm:p-7 md:max-w-[470px] md:flex-1">
          <p className="text-[12px] font-bold tracking-[0.96px] text-[var(--color-accent)]">{t('В ИСКРЕ')}</p>
          {ISKRA.map(s => (
            <p key={s} className="flex items-start gap-2 text-[16px] leading-[1.45] text-[var(--color-text)]"><Check size={16} className="mt-[4px] shrink-0" aria-hidden />{t(s)}</p>
          ))}
        </div>
      </div>
    </Section>
  )
}
