// «Для ученика» — фиолетовая плашка с тремя айфонами и Огоньком с книгой
// (Figma «Искра», стр. 290:2, узел 303:331 / тёмный 303:720). Снимки экранов
// в макете одинаковые для обеих тем, поэтому картинки общие.

import { useRef } from 'react'
import { useT } from '../../../lib/i18n'
import { IPhone, Section, asset } from './kit'

const CHIPS = ['Твои дела', 'Трек курса', 'Журнал работ', 'Тренажёр', 'Тёмная тема']

export default function StudentSection() {
  const t = useT()
  const group = useRef<HTMLDivElement>(null)
  // Наведение на группу айфонов: они покачиваются (CSS .lp-rock в
  // landing-motion.css). При уходе курсора снимаем анимацию и плавно
  // возвращаем каждый телефон из текущей позы, а не скачком.
  const swayOn = () => group.current?.classList.add('is-swaying')
  const swayOff = () => {
    const root = group.current
    if (!root || !root.classList.contains('is-swaying')) return
    const items = Array.from(root.querySelectorAll<HTMLElement>('.lp-rock'))
    const poses = items.map(el => getComputedStyle(el).transform)
    root.classList.remove('is-swaying')
    items.forEach((el, i) => {
      const from = poses[i]
      if (!from || from === 'none' || typeof el.animate !== 'function') return
      el.animate([{ transform: from }, { transform: 'none' }], { duration: 650, easing: 'cubic-bezier(.2,.8,.2,1)' })
    })
  }
  return (
    <Section id="student" className="pb-[10px] pt-16 sm:pt-[110px]">
      <div
        className="relative mx-auto flex w-full max-w-[1200px] flex-col overflow-clip rounded-[28px] sm:rounded-[36px] xl:block xl:h-[560px]"
        style={{ backgroundImage: 'linear-gradient(148.1deg, rgb(94,79,209) 0%, rgb(111,63,191) 39.286%, rgb(74,46,153) 71.429%)' }}
      >
        {/* Тёплое свечение справа сверху */}
        <img
          src={asset('student-glow.svg')}
          alt=""
          aria-hidden
          width={800}
          height={800}
          className="pointer-events-none absolute -right-[200px] -top-[240px] max-w-none select-none"
        />

        {/* Текст */}
        <div className="relative flex flex-col items-start gap-4 px-6 pt-10 sm:px-12 sm:pt-14 xl:absolute xl:left-16 xl:top-24 xl:w-[470px] xl:p-0">
          <p className="text-[13px] font-bold uppercase tracking-[1.04px] text-white/75">{t('Для ученика')}</p>
          <h2 className="max-w-[470px] text-[30px] font-bold leading-[1.08] tracking-[-0.48px] text-white sm:text-[40px]">
            {t('Свой кабинет, а не стопка ссылок в чате')}
          </h2>
          <p className="max-w-[440px] text-[16px] leading-[1.55] text-white/[0.86] sm:text-[17px]">
            {t('Урок, дела на сегодня, домашки и журнал работ — на телефоне и компьютере. Ученик видит, что исправить, и свой прогресс по курсу.')}
          </p>
          <ul className="flex max-w-[440px] flex-wrap gap-2">
            {CHIPS.map(c => (
              <li key={c} className="rounded-[99px] border border-white/[0.24] bg-white/[0.14] px-[14px] py-2 text-[14px] font-semibold text-white">
                {t(c)}
              </li>
            ))}
          </ul>
        </div>

        {/* Три айфона и Огонёк. Группа 570×490 — как в макете (x 610, y 70 на
            плашке); на узких экранах уменьшается целиком и встаёт под текст. */}
        {/* Центральный айфон поднят на 52 px над боковыми (просьба Дани). */}
        <div className="relative mt-[60px] h-[294px] w-full sm:mt-[96px] sm:h-[490px] xl:absolute xl:left-[610px] xl:top-[70px] xl:mt-0 xl:h-[490px] xl:w-[570px]">
          <div
            ref={group}
            onPointerEnter={swayOn}
            onPointerLeave={swayOff}
            className="lp-rock-group absolute left-1/2 top-0 ml-[-285px] h-[490px] w-[570px] origin-top scale-[0.6] sm:scale-100 xl:left-0 xl:ml-0"
          >
            <div className="lp-rock lp-rock-l absolute left-0 top-[52.17px] flex h-[458.6px] w-[258.6px] items-center justify-center">
              <IPhone src={asset('student-phone-left.webp')} width={200} className="rotate-[-8deg]" />
            </div>
            <div className="lp-rock lp-rock-r absolute left-[289.46px] top-[50px] flex h-[458.6px] w-[258.6px] items-center justify-center">
              <IPhone src={asset('student-phone-right.webp')} width={200} className="rotate-[8deg]" />
            </div>
            <div className="lp-rock lp-rock-c absolute left-[160px] top-[-52px]">
              <IPhone src={asset('student-phone-center.webp')} width={220} alt={t('Главная ученика в Искре')} />
            </div>
            <img
              data-mascot="student"
              src={asset('student-ogonek-book.webp')}
              alt=""
              aria-hidden
              loading="lazy"
              className="pointer-events-none absolute left-[420px] top-[260px] h-[258px] w-[150px] select-none object-contain"
            />
          </div>
        </div>
      </div>
    </Section>
  )
}
