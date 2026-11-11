// Первый экран лендинга B · «Огонёк-проводник» (Figma 302:295 светлая, 303:569
// тёмная). На ПК — сцена 1440 × 900 один в один с макетом: свечения, искорки,
// Огонёк по центру и четыре карточки-подсказки вокруг. Ниже 1024 карточки
// уходят в сетку под Огоньком, а сцена не обрезает текст.

import { useEffect, useState, type CSSProperties } from 'react'
import { useT } from '../../../lib/i18n'
import ThemeToggleBtn from '../../ThemeToggleBtn'
import IskraMark from '../IskraMark'
import { asset, PrimaryButton, SecondaryButton } from './kit'
import './landing-motion.css'
import HeroOgonek from './HeroOgonek'

type Actions = { onLogin: () => void }

// Регистрация преподавателя — экран входа учителя: вход через Яндекс или VK сам
// создаёт кабинет (самрег). Заявка осталась только для платных тарифов.
export const SIGNUP_HREF = '#/teacher'

// Искорки: россыпь без узора (детерминированный разброс, одинаковый при каждой
// загрузке), каждая дрейфует и мерцает в своём ритме.
type Spark = { x: number; y: number; s: 2 | 3 | 4; dur: number; delay: number; dx: number; o: number }
const SPARKS: Spark[] = (() => {
  let seed = 7
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }
  const out: Spark[] = []
  while (out.length < 34) {
    const x = Math.round(rnd() * 1400 + 20), y = Math.round(rnd() * 760 + 90)
    // не сыпем прямо на заголовок и кнопки
    if (x > 300 && x < 1140 && y > 110 && y < 420) continue
    out.push({ x, y, s: ([2, 3, 4] as const)[Math.floor(rnd() * 3)], dur: 6 + rnd() * 6, delay: -rnd() * 10, dx: Math.round((rnd() - 0.5) * 28), o: 0.45 + rnd() * 0.5 })
  }
  return out
})()

const CARDS = [
  { key: 'next', img: 'obj-calendar.webp', eyebrow: 'Ближайшее занятие', title: '12:00 — 13:30', sub: 'Хим ЕГЭ 2027 · Электролиз', x: 150, y: 560, dur: 5.6, delay: 0, ry: 9 },
  { key: 'group', img: 'obj-results.webp', eyebrow: 'Итоги группы', title: '77%', sub: 'Проверено работ · 260', x: 230, y: 730, dur: 6.4, delay: -2.1, ry: 9 },
  { key: 'review', img: 'obj-review.webp', eyebrow: 'Проверка ДЗ', title: 'Анна Соколова', sub: 'ОВР · ответ рядом с эталоном', x: 930, y: 540, dur: 6, delay: -1.2, ry: -9 },
  { key: 'pay', img: 'obj-wallet.webp', eyebrow: 'Оплаты', title: 'Доход за месяц', sub: 'Долги и просрочки — рядом', x: 990, y: 720, dur: 5.2, delay: -3.4, ry: -9 },
] as const

function HintCard({ img, eyebrow, title, sub, ry = -9 }: { img: string; eyebrow: string; title: string; sub: string; ry?: number }) {
  const t = useT()
  return (
    <div style={{ '--lp-ry': `${ry}deg` } as CSSProperties} className="lp-tilt flex items-center gap-[14px] rounded-[22px] border border-[var(--color-border-soft)] bg-[var(--color-bg-card)] py-4 pl-[18px] pr-5 shadow-[0px_18px_36px_-12px_rgba(38,26,89,0.22)] backdrop-blur-[12px]">
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
export function LandingHeader({ onLogin }: Actions) {
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
      className={`fixed inset-x-0 top-0 z-30 transition-[padding] duration-300 ease-out ${scrolled ? 'px-4' : 'px-0'}`}
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {/* При прокрутке шапка плавно стягивается из полосы во всю ширину в
          плавающую капсулу по центру: морф max-width, высоты, радиуса и стекла. */}
      <div
        className={`mx-auto flex w-full items-center transition-[max-width,height,margin-top,border-radius,padding,gap,background-color,box-shadow,border-color,backdrop-filter] duration-300 ease-out ${
          scrolled
            ? 'mt-2.5 h-[64px] max-w-[1080px] gap-5 rounded-[22px] border border-[var(--color-border-soft)] bg-[color-mix(in_srgb,var(--color-bg)_82%,transparent)] py-2 pl-4 pr-2 shadow-[0_14px_34px_-14px_rgba(38,26,89,0.45)] backdrop-blur-[16px]'
            : 'mt-0 h-[72px] max-w-[1440px] gap-7 rounded-none border border-transparent bg-transparent px-4 shadow-none sm:px-8 xl:px-14'
        }`}
      >
        <a href="#top" className="iskra-host flex shrink-0 items-center gap-[10px] text-[20px] font-bold text-[var(--color-text)]">
          <IskraMark size={30} />
          Искра
        </a>
        <nav className="hidden items-center gap-[22px] text-[14px] font-medium text-[var(--color-muted)] lg:flex">
          {links.map(([href, label]) => (
            <a key={href} href={href} data-hover="link" className="transition-colors hover:text-[var(--color-text)]">{t(label)}</a>
          ))}
        </nav>
        <div className="ml-auto flex min-w-0 items-center gap-2.5">
          <ThemeToggleBtn />
          <SecondaryButton size="sm" onClick={onLogin} className="h-[46px]">
            <span className="hidden sm:inline">{t('Личный кабинет')}</span>
            <span className="sm:hidden">{t('Войти')}</span>
          </SecondaryButton>
          <PrimaryButton size="sm" href={SIGNUP_HREF} className="hidden h-[46px] md:inline-flex">{t('Зарегистрироваться')}</PrimaryButton>
        </div>
      </div>
    </header>
  )
}

export default function HeroSection({ onLogin }: Actions) {
  const t = useT()
  return (
    <section id="top" className="relative w-full overflow-x-clip">
      {/* Декор сцены 1440: свечения и искорки стоят там же, где в макете. */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[960px] w-[1440px] -translate-x-1/2">
        {/* Верхнее свечение приглушено: под заголовком оно делало градиент грязным. */}
        <img src={asset('hero-glow-top.svg')} alt="" className="absolute max-w-none opacity-60" style={{ left: 220 - 120, top: -300 - 120, width: 1240, height: 860 }} />
        <img src={asset('hero-glow-mid.svg')} alt="" className="absolute max-w-none" style={{ left: 520 - 90, top: 560 - 90, width: 600, height: 480 }} />
        <img src={asset('hero-glow-left.svg')} alt="" className="absolute max-w-none" style={{ left: -200 - 120, top: 400 - 120, width: 740, height: 740 }} />
        {SPARKS.map((p, i) => (
          <img
            key={i}
            src={asset(`spark-${p.s}.svg`)}
            alt=""
            className="lp-spark absolute"
            style={{ left: p.x, top: p.y, width: p.s, height: p.s, '--lp-dur': `${p.dur}s`, '--lp-delay': `${p.delay}s`, '--lp-dx': `${p.dx}px`, '--lp-o': p.o } as CSSProperties}
          />
        ))}
      </div>

      <div className="relative mx-auto flex w-full max-w-[1440px] flex-col items-center px-4 pt-[112px] sm:px-8 lg:h-[960px] lg:pt-[130px]">
        <div className="flex w-full max-w-[900px] flex-col items-center gap-[22px] text-center">
          <h1 className="text-[38px] font-bold leading-[1.04] tracking-[-1px] text-[var(--color-text)] sm:text-[52px] lg:text-[68px] lg:tracking-[-1.7px]">
            {t('Учите с огоньком —')}
            <br />
            <span className="bg-gradient-to-r from-[#7a5cff] via-[#c35cf2] to-[#ff9a3c] bg-clip-text text-transparent">{t('рутину возьмёт Искра')}</span>
          </h1>
          <p className="max-w-[640px] text-[17px] leading-[1.5] text-[var(--color-muted)] sm:text-[20px]">
            {t('Расписание, домашки с проверкой, журнал и оплаты — вокруг вас, а не в пяти чатах. Огонёк покажет, как всё устроено.')}
          </p>
          <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-start">
            <PrimaryButton href={SIGNUP_HREF}>{t('Зарегистрироваться')}</PrimaryButton>
            <SecondaryButton onClick={onLogin}>{t('Войти в кабинет')}</SecondaryButton>
          </div>
        </div>

        {/* Огонёк на стеклянной подставке — живой (HeroOgonek). */}
        <HeroOgonek />

        {/* ПК: карточки на своих местах сцены 1440. */}
        <div className="pointer-events-none absolute left-1/2 top-0 hidden h-[960px] w-[1440px] -translate-x-1/2 lg:block">
          {CARDS.map(c => (
            <div key={c.key} className="lp-drift pointer-events-auto absolute" style={{ left: c.x, top: c.y, '--lp-dur': `${c.dur}s`, '--lp-delay': `${c.delay}s` } as CSSProperties}>
              <HintCard img={c.img} eyebrow={c.eyebrow} title={c.title} sub={c.sub} ry={c.ry} />
            </div>
          ))}
        </div>

        {/* Планшет и телефон: те же карточки сеткой под Огоньком. */}
        <div className="relative mb-16 mt-6 grid w-full max-w-[720px] grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
          {CARDS.map(c => <HintCard key={c.key} img={c.img} eyebrow={c.eyebrow} title={c.title} sub={c.sub} />)}
        </div>
      </div>
    </section>
  )
}
