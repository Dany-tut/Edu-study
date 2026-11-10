// Первый экран лендинга B · «Огонёк-проводник» (Figma 302:295 светлая, 303:569
// тёмная). На ПК — сцена 1440 × 900 один в один с макетом: свечения, искорки,
// Огонёк по центру и четыре карточки-подсказки вокруг. Ниже 1024 карточки
// уходят в сетку под Огоньком, а сцена не обрезает текст.

import { useEffect, useState } from 'react'
import { useT } from '../../../lib/i18n'
import ThemeToggleBtn from '../../ThemeToggleBtn'
import IskraMark from '../IskraMark'
import { asset, PrimaryButton, SecondaryButton } from './kit'

type Actions = { onLead: () => void; onLogin: () => void }

// Искорки — точные места и размеры из макета (x, y, размер).
const SPARKS: Array<[number, number, 2 | 3 | 4]> = [
  [10, 110, 2], [243, 207, 3], [476, 304, 4], [709, 401, 2], [942, 498, 3], [1175, 205, 4], [1408, 302, 2],
  [221, 399, 3], [454, 496, 4], [687, 203, 2], [920, 300, 3], [1153, 397, 4], [1386, 494, 2], [199, 201, 3],
  [432, 298, 4], [665, 395, 2], [898, 492, 3], [1131, 199, 4], [1364, 296, 2], [177, 393, 3], [410, 490, 4],
  [643, 197, 2], [876, 294, 3], [1109, 391, 4], [1342, 488, 2], [155, 195, 3],
]

const CARDS = [
  { key: 'next', img: 'obj-calendar.webp', eyebrow: 'Ближайшее занятие', title: '12:00 — 13:30', sub: 'Хим ЕГЭ 2027 · Электролиз', x: 150, y: 560 },
  { key: 'group', img: 'obj-results.webp', eyebrow: 'Итоги группы', title: '77%', sub: 'Проверено работ · 260', x: 230, y: 730 },
  { key: 'review', img: 'obj-review.webp', eyebrow: 'Проверка ДЗ', title: 'Анна Соколова', sub: 'ОВР · ответ рядом с эталоном', x: 930, y: 540 },
  { key: 'pay', img: 'obj-wallet.webp', eyebrow: 'Оплаты', title: 'Доход за месяц', sub: 'Долги и просрочки — рядом', x: 990, y: 720 },
] as const

function HintCard({ img, eyebrow, title, sub }: { img: string; eyebrow: string; title: string; sub: string }) {
  const t = useT()
  return (
    <div className="flex items-center gap-[14px] rounded-[22px] border border-[var(--color-border-soft)] bg-[var(--color-bg-card)] py-4 pl-[18px] pr-5 shadow-[0px_18px_36px_-12px_rgba(38,26,89,0.22)] backdrop-blur-[12px]">
      <img src={asset(img)} alt="" aria-hidden className="size-16 shrink-0 object-contain" loading="eager" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-[11px] font-bold uppercase tracking-[0.66px] text-[var(--color-accent)]">{t(eyebrow)}</p>
        <p className="text-[22px] font-bold text-[var(--color-text)]">{t(title)}</p>
        <p className="text-[13px] text-[var(--color-muted)]">{t(sub)}</p>
      </div>
    </div>
  )
}

/** Фиксированная шапка «Сайт / Шапка»: при прокрутке получает стеклянную подложку. */
export function LandingHeader({ onLead, onLogin }: Actions) {
  const t = useT()
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  const links: Array<[string, string]> = [['#how', 'Как работает'], ['#features', 'Возможности'], ['#student', 'Ученику'], ['#pricing', 'Тарифы'], ['#faq', 'Вопросы']]
  return (
    <header
      className={`fixed inset-x-0 top-0 z-30 transition-[background-color,box-shadow,backdrop-filter] duration-200 ${scrolled ? 'bg-[color-mix(in_srgb,var(--color-bg)_78%,transparent)] shadow-[0_1px_0_var(--color-border-soft)] backdrop-blur-[14px]' : ''}`}
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="mx-auto flex h-[72px] w-full max-w-[1440px] items-center gap-7 px-4 sm:px-8 xl:px-14">
        <a href="#top" className="iskra-host flex shrink-0 items-center gap-[11px] text-[21px] font-bold text-[var(--color-text)]">
          <IskraMark size={32} />
          Искра
        </a>
        <nav className="hidden items-center gap-[26px] text-[15px] font-medium text-[var(--color-muted)] lg:flex">
          {links.map(([href, label]) => (
            <a key={href} href={href} data-hover="link" className="transition-colors hover:text-[var(--color-text)]">{t(label)}</a>
          ))}
        </nav>
        <div className="ml-auto flex min-w-0 items-center gap-2.5">
          <ThemeToggleBtn />
          <SecondaryButton size="sm" onClick={onLogin}>
            <span className="hidden sm:inline">{t('Личный кабинет')}</span>
            <span className="sm:hidden">{t('Войти')}</span>
          </SecondaryButton>
          <PrimaryButton size="sm" onClick={onLead} className="hidden md:inline-flex">{t('Оставить заявку')}</PrimaryButton>
        </div>
      </div>
    </header>
  )
}

export default function HeroSection({ onLead, onLogin }: Actions) {
  const t = useT()
  return (
    <section id="top" className="relative w-full overflow-hidden">
      {/* Декор сцены 1440: свечения и искорки стоят там же, где в макете. */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[900px] w-[1440px] -translate-x-1/2">
        <img src={asset('hero-glow-top.svg')} alt="" className="absolute max-w-none" style={{ left: 220 - 120, top: -300 - 120, width: 1240, height: 860 }} />
        <img src={asset('hero-glow-mid.svg')} alt="" className="absolute max-w-none" style={{ left: 520 - 90, top: 560 - 90, width: 600, height: 480 }} />
        <img src={asset('hero-glow-left.svg')} alt="" className="absolute max-w-none" style={{ left: -200 - 120, top: 400 - 120, width: 740, height: 740 }} />
        {SPARKS.map(([x, y, s], i) => (
          <img key={i} src={asset(`spark-${s}.svg`)} alt="" className="absolute" style={{ left: x, top: y, width: s, height: s }} />
        ))}
      </div>

      <div className="relative mx-auto flex w-full max-w-[1440px] flex-col items-center px-4 pt-[112px] sm:px-8 lg:h-[900px] lg:pt-[130px]">
        <div className="flex w-full max-w-[900px] flex-col items-center gap-[22px] text-center">
          <h1 className="text-[38px] font-bold leading-[1.04] tracking-[-1px] text-[var(--color-text)] sm:text-[52px] lg:text-[68px] lg:tracking-[-1.7px]">
            {t('Учите с огоньком —')}
            <br />
            <span className="bg-gradient-to-r from-[#8c78f2] to-[#ed993d] bg-clip-text text-transparent">{t('рутину возьмёт Искра')}</span>
          </h1>
          <p className="max-w-[640px] text-[17px] leading-[1.5] text-[var(--color-muted)] sm:text-[20px]">
            {t('Расписание, домашки с проверкой, журнал и оплаты — вокруг вас, а не в пяти чатах. Огонёк покажет, как всё устроено.')}
          </p>
          <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-start">
            <PrimaryButton onClick={onLead}>{t('Оставить заявку')}</PrimaryButton>
            <SecondaryButton onClick={onLogin}>{t('Войти в кабинет')}</SecondaryButton>
          </div>
        </div>

        {/* Огонёк: в макете 250 × 430, низ уходит под край экрана. */}
        <img
          src={asset('ogonek-wave.webp')}
          alt={t('Огонёк машет рукой')}
          loading="eager"
          className="pointer-events-none relative mt-8 h-[260px] w-[150px] object-contain sm:h-[340px] sm:w-[200px] lg:absolute lg:left-1/2 lg:top-[500px] lg:mt-0 lg:h-[430px] lg:w-[250px] lg:-translate-x-1/2"
        />

        {/* ПК: карточки на своих местах сцены 1440. */}
        <div className="pointer-events-none absolute left-1/2 top-0 hidden h-[900px] w-[1440px] -translate-x-1/2 lg:block">
          {CARDS.map(c => (
            <div key={c.key} className="pointer-events-auto absolute" style={{ left: c.x, top: c.y }}>
              <HintCard img={c.img} eyebrow={c.eyebrow} title={c.title} sub={c.sub} />
            </div>
          ))}
        </div>

        {/* Планшет и телефон: те же карточки сеткой под Огоньком. */}
        <div className="relative -mt-6 mb-16 grid w-full max-w-[720px] grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
          {CARDS.map(c => <HintCard key={c.key} img={c.img} eyebrow={c.eyebrow} title={c.title} sub={c.sub} />)}
        </div>
      </div>
    </section>
  )
}
