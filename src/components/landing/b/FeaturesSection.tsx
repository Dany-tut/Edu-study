// «Возможности» (Figma 302:416 светлая, 303:682 тёмная). Бенто: большая
// карточка «Конструктор курсов» + сетка 2 × 2 справа, ниже — две широкие.
// 3D-предметы в обеих темах одинаковые, цвета карточек — переменные кабинета.
// На ПК сетка повторяет макет (580 + 296 + 296 и 600 + 600, зазор 16), на
// планшете большая карточка во всю ширину, остальные по две, на телефоне — колонка.

import type { CSSProperties } from 'react'
import { useT } from '../../../lib/i18n'
import { asset, Section, SectionHead } from './kit'

type Card = { img: string; title: string; text: string }

const SMALL: Card[] = [
  { img: 'feat-calendar.webp', title: 'Расписание и переносы', text: 'Неделя, группы и индивидуальные.' },
  { img: 'feat-attendance.webp', title: 'Посещаемость в %', text: 'Отметки складываются сами.' },
  { img: 'feat-wallet.webp', title: 'Оплаты и долги', text: '«Оплачено», просрочки, доход.' },
  { img: 'feat-cabinet.webp', title: 'Кабинет ученику', text: 'Свой логин, дела, журнал работ.' },
]

const WIDE: Card[] = [
  { img: 'feat-files.webp', title: 'Файлы и видео урока', text: 'Материалы, YouTube и Rutube прямо в уроке.' },
  { img: 'feat-transcript.webp', title: 'Расшифровка уроков', text: 'Приложение для Mac превращает запись занятия в текст.' },
]

const cardBase = 'lp-feat relative flex flex-col justify-end overflow-hidden rounded-[24px] border border-[var(--color-border-soft)]'

/** 3D-предмет карточки: в покое чуть парит, при наведении на карточку взлетает
 *  с поворотом, и по нему проходит блик (маска — сама картинка). */
function Obj({ name, className, delay = 0 }: { name: string; className: string; delay?: number }) {
  const src = asset(name)
  return (
    <span aria-hidden className={`lp-obj pointer-events-none absolute select-none ${className}`} style={{ '--lp-delay': `${-delay}s` } as CSSProperties}>
      {/* мягкое свечение под предметом — даёт глубину; при наведении ярче */}
      <span className="lp-obj-glow absolute left-1/2 top-1/2 -z-10 h-[150%] w-[150%] -translate-x-1/2 -translate-y-1/2 rounded-full" />
      <span className="lp-obj-in">
        <img src={src} alt="" loading="lazy" decoding="async" draggable={false} className="h-full w-full object-contain" />
        <span className="lp-glint" style={{ '--lp-mask': `url(${src})` } as CSSProperties} />
      </span>
    </span>
  )
}

function SmallCard({ img, title, text, i = 0 }: Card & { i?: number }) {
  const t = useT()
  return (
    <div className={`${cardBase} min-h-[190px] bg-[var(--color-bg-card)] px-4 pb-5 sm:min-h-[210px] sm:px-[22px] sm:pb-6 xl:h-[210px]`}>
      <Obj name={img} delay={1.3 * (i + 1)} className="right-3 top-3 size-16 sm:right-4 sm:top-[14px] sm:size-[84px]" />
      <p className="text-[16px] font-bold text-[var(--color-text)] sm:text-[18px]">{t(title)}</p>
      <p className="mt-1.5 text-[13px] leading-[1.45] text-[var(--color-muted)] sm:mt-2 sm:text-[14px] sm:leading-[1.5]">{t(text)}</p>
    </div>
  )
}

function WideCard({ img, title, text, i = 0 }: Card & { i?: number }) {
  const t = useT()
  return (
    <div className={`${cardBase} min-h-[210px] bg-[var(--color-bg-card)] px-[22px] pb-6 md:min-h-[170px] xl:h-[170px]`}>
      <Obj name={img} delay={2.1 * (i + 1)} className="right-4 top-[14px] size-[84px] md:size-[110px]" />
      <p className="text-[18px] font-bold text-[var(--color-text)] md:pr-[120px] xl:pr-0">{t(title)}</p>
      <p className="mt-2 text-[14px] leading-[1.5] text-[var(--color-muted)] md:pr-[120px] xl:pr-0">{t(text)}</p>
    </div>
  )
}

export default function FeaturesSection() {
  const t = useT()
  return (
    <Section id="features" className="pb-[10px] pt-20 sm:pt-[110px]">
      <SectionHead
        eyebrow={t('ВОЗМОЖНОСТИ')}
        title={t('Всё, что нужно преподавателю')}
        lead={<span className="mx-auto block max-w-[640px]">{t('Каждая функция — свой предмет из кабинета. Ученик и учитель видят их и внутри.')}</span>}
        width={760}
      />

      {/* Бенто: на ПК шире полосы контента на 4 px, как в макете. */}
      <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 xl:-mx-[2px] xl:grid-cols-[580px_296px_296px] xl:grid-rows-[210px_210px]">
        <div className={`${cardBase} col-span-2 min-h-[380px] bg-[var(--color-accent-soft)] px-[22px] pb-6 md:min-h-[360px] xl:col-span-1 xl:row-span-2 xl:h-[436px]`}>
          <Obj name="feat-bulb.webp" className="right-4 top-4 size-[180px] md:right-[30px] md:top-7 md:size-[230px]" />
          <p className="text-[28px] font-bold tracking-[-0.168px] text-[var(--color-text)]">{t('Конструктор курсов')}</p>
          <p className="mt-2 text-[16px] leading-[1.5] text-[var(--color-muted)] md:max-w-[520px]">
            {t('Уроки, конспекты, тренажёр и домашки в визуальном редакторе. Карточки — из фото, тесты — импортом из Google Forms.')}
          </p>
        </div>
        {SMALL.map((c, i) => <SmallCard key={c.title} {...c} i={i} />)}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:mt-4 sm:gap-4 md:grid-cols-2 xl:-mx-2 xl:mt-10 xl:grid-cols-[600px_600px]">
        {WIDE.map((c, i) => <WideCard key={c.title} {...c} i={i} />)}
      </div>
    </Section>
  )
}
