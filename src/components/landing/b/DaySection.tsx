// «Один день в Искре» (Figma 302:375 светлая, 303:649 тёмная). Вкладки по
// времени дня переключают текст и сцену экранов (Mac + iPhone в рамках кита).
// В макете нарисована вкладка 14:00 «Проверка ДЗ» — она открыта по умолчанию и
// в двух темах показывает свои снимки. Остальные вкладки собраны из библиотеки
// экранов той же страницы Figma («Mac · …», «iPhone · …»): там снимки только
// светлые, поэтому в тёмной теме они не меняются.
//
// Сцена задана в координатах макета (760 × 500) и масштабируется под ширину;
// ниже 1280 пустое поле над устройствами срезается. Ряд вкладок на узких
// экранах прокручивается вбок — с фейдами по краям и стрелками на ПК.

import { Check } from '../../icons/appIcons'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useT } from '../../../lib/i18n'
import { useTheme } from '../../../store/themeStore'
import { asset, IPhone, Mac, Section, SectionHead } from './kit'

type Device =
  | { kind: 'mac'; src: string; srcDark?: string; x: number; y: number; w: number; screenBg?: string }
  | { kind: 'iphone'; src: string; srcDark?: string; x: number; y: number; w: number }

type Tab = { id: string; time: string; label: string; title: string; text: string; points: string[]; devices: Device[] }

const TABS: Tab[] = [
  {
    id: 'morning', time: '09:00', label: 'Мой день',
    title: 'Утро начинается с «Моего дня»',
    text: 'Ближайшее занятие, неделя и что ждёт проверки — на одном экране. Посещаемость отмечается в журнале за пару касаний.',
    points: ['Ближайшее занятие и неделя', 'Переносы без переписки в чате', 'Отметки «был» и «пропуск» прямо с урока'],
    devices: [
      { kind: 'mac', src: 'day-mac-attendance.webp', x: 61, y: 141, w: 440 },
      { kind: 'iphone', src: 'day-iphone-myday.webp', x: 600, y: 135, w: 150 },
    ],
  },
  {
    id: 'review', time: '14:00', label: 'Проверка ДЗ',
    title: 'Проверка развёрнутых ответов, а не только тестов',
    text: 'Ответ ученика стоит рядом с эталоном. Оценка, комментарий, «На доработку» и пометки прямо поверх работы или фото.',
    points: ['Очередь сдач по ученикам', 'Порог зачёта и итог, который увидит ученик', 'История попыток каждой работы'],
    devices: [
      { kind: 'mac', src: 'day-mac-review-light.webp', srcDark: 'day-mac-review-dark.webp', x: 61, y: 141, w: 440, screenBg: '#f5f5f6' },
      { kind: 'iphone', src: 'day-iphone-review-light.webp', srcDark: 'day-iphone-review-dark.webp', x: 600, y: 135, w: 150 },
    ],
  },
  {
    id: 'journal', time: '16:00', label: 'Журнал',
    title: 'Журнал работ группы целиком',
    text: 'Все домашки по ученикам и датам: проценты, «Проверить», «Просрочено». Ученик видит свой журнал у себя в кабинете.',
    points: ['Работы по ученикам и по домашкам', 'Статусы сдачи видны сразу', 'Свой журнал работ у каждого ученика'],
    devices: [
      { kind: 'mac', src: 'day-mac-journal.webp', x: 61, y: 141, w: 440 },
      { kind: 'iphone', src: 'day-iphone-student-journal.webp', x: 600, y: 135, w: 150 },
    ],
  },
  {
    id: 'payments', time: '18:30', label: 'Ученики и оплаты',
    title: 'Ученики и оплаты рядом с уроками',
    text: 'Карточки учеников, оплаченные занятия, долги и доход за месяц — без отдельной таблицы.',
    points: ['Кто оплатил, а у кого просрочка', 'Доход за месяц', 'Ученики по группам и индивидуальные'],
    devices: [
      { kind: 'iphone', src: 'day-iphone-students.webp', x: 215, y: 100, w: 175 },
      { kind: 'iphone', src: 'day-iphone-finance.webp', x: 425, y: 112, w: 175 },
    ],
  },
  {
    id: 'summary', time: '21:00', label: 'Итоги группы',
    title: 'Итоги группы считаются сами',
    text: 'Средний результат, проверенные работы и темы, которые стоит разобрать на следующем занятии.',
    points: ['Средний процент по группе', 'Тема для разбора — подсказкой', 'Ученик видит свой прогресс на главной'],
    devices: [
      { kind: 'mac', src: 'day-mac-summary.webp', x: 61, y: 141, w: 440 },
      { kind: 'iphone', src: 'day-iphone-student-home.webp', x: 600, y: 135, w: 150 },
    ],
  },
]

// Сцена макета 760 × 500; ниже ПК срезаем пустое поле сверху и снизу.
const SCENE_W = 760
const SCENE_H = 500
const TRIM_TOP = 95
const TRIM_H = 395

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setW(el.clientWidth)
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

function Scene({ tab, dark }: { tab: Tab; dark: boolean }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const full = width >= SCENE_W
  const s = Math.min(1, width / SCENE_W)
  const top = full ? 0 : TRIM_TOP
  const h = (full ? SCENE_H : TRIM_H) * s
  return (
    <div ref={ref} className="relative w-full xl:w-[760px] xl:shrink-0" style={{ height: h || undefined, aspectRatio: width ? undefined : `${SCENE_W} / ${TRIM_H}` }}>
      {width > 0 && tab.devices.map((d, i) => {
        const src = asset(dark && d.srcDark ? d.srcDark : d.src)
        const style = { position: 'absolute' as const, left: d.x * s, top: (d.y - top) * s }
        return d.kind === 'mac'
          ? <Mac key={`${tab.id}-${i}`} src={src} width={d.w * s} style={style} screenBg={d.screenBg} alt="" />
          : <IPhone key={`${tab.id}-${i}`} src={src} width={d.w * s} style={style} alt="" />
      })}
    </div>
  )
}

/** Ряд вкладок: прокручивается вбок, когда не помещается; фейды и стрелки по краям. */
function TabRow({ active, onPick }: { active: number; onPick: (i: number) => void }) {
  const t = useT()
  const scroller = useRef<HTMLDivElement>(null)
  const btns = useRef<Array<HTMLButtonElement | null>>([])
  const [edge, setEdge] = useState({ left: false, right: false })

  const update = useCallback(() => {
    const el = scroller.current
    if (!el) return
    setEdge({ left: el.scrollLeft > 2, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 })
  }, [])

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    el.addEventListener('scroll', update, { passive: true })
    return () => { ro.disconnect(); el.removeEventListener('scroll', update) }
  }, [update])

  // Активная вкладка всегда видна в ряду.
  useEffect(() => {
    const el = scroller.current
    const b = btns.current[active]
    if (!el || !b || el.scrollWidth <= el.clientWidth) return
    const target = b.offsetLeft - (el.clientWidth - b.offsetWidth) / 2
    el.scrollTo({ left: target, behavior: 'smooth' })
  }, [active])

  const nudge = (dir: -1 | 1) => scroller.current?.scrollBy({ left: dir * 240, behavior: 'smooth' })

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    let next = active
    if (e.key === 'ArrowRight') next = (active + 1) % TABS.length
    else if (e.key === 'ArrowLeft') next = (active - 1 + TABS.length) % TABS.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = TABS.length - 1
    else return
    e.preventDefault()
    onPick(next)
    btns.current[next]?.focus()
  }

  const fade = 40
  const mask = `linear-gradient(to right, ${edge.left ? 'transparent' : '#000'} 0, #000 ${fade}px, #000 calc(100% - ${fade}px), ${edge.right ? 'transparent' : '#000'} 100%)`

  const arrow = 'absolute top-1/2 z-10 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-border-soft)] bg-[var(--color-bg-card)] text-[var(--color-text)] shadow-sm transition-colors hover:bg-[var(--color-accent-soft)] md:flex'

  return (
    <div className="relative mx-auto w-full max-w-max">
      {edge.left && (
        <button type="button" aria-label={t('Назад')} onClick={() => nudge(-1)} className={`${arrow} -left-1`}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      )}
      <div
        ref={scroller}
        role="tablist"
        aria-label={t('Один день в Искре')}
        onKeyDown={onKey}
        className="flex gap-2 overflow-x-auto px-px py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      >
        {TABS.map((tab, i) => {
          const on = i === active
          return (
            <button
              key={tab.id}
              ref={el => { btns.current[i] = el }}
              type="button"
              role="tab"
              id={`day-tab-${tab.id}`}
              aria-selected={on}
              aria-controls="day-panel"
              tabIndex={on ? 0 : -1}
              onClick={() => onPick(i)}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-[99px] py-2.5 pl-4 pr-[18px] transition-colors ${
                on
                  ? 'border border-transparent bg-gradient-to-r from-[#786bd6] to-[#6f3fbf]'
                  : 'border border-[var(--color-border-soft)] bg-[var(--color-bg-card)] hover:bg-[var(--color-accent-soft)]'
              }`}
            >
              <span className={`text-[14px] font-bold ${on ? 'text-white/75' : 'text-[var(--color-accent)]'}`}>{tab.time}</span>
              <span className={`text-[15px] font-semibold ${on ? 'text-white' : 'text-[var(--color-muted)]'}`}>{t(tab.label)}</span>
            </button>
          )
        })}
      </div>
      {edge.right && (
        <button type="button" aria-label={t('Дальше')} onClick={() => nudge(1)} className={`${arrow} -right-1`}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="m6 3 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      )}
    </div>
  )
}

export default function DaySection() {
  const t = useT()
  const { dark } = useTheme()
  const [active, setActive] = useState(1) // в макете открыта «14:00 · Проверка ДЗ»
  const tab = TABS[active]
  const panel = useRef<HTMLDivElement>(null)
  const first = useRef(true)

  // Мягкая смена содержимого вкладки (без движения при «уменьшить движение»).
  useEffect(() => {
    if (first.current) { first.current = false; return }
    const el = panel.current
    if (!el || typeof el.animate !== 'function') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.2,.7,.2,1)' })
  }, [active])

  return (
    <Section className="pb-[10px] pt-20 sm:pt-[110px]">
      <SectionHead
        eyebrow={t('НАСТОЯЩИЕ ЭКРАНЫ')}
        title={t('Один день в Искре')}
        lead={<span className="mx-auto block max-w-[640px]">{t('Вкладки по времени дня — Огонёк показывает, что происходит в каждый момент.')}</span>}
        width={760}
      />

      <div className="mt-9">
        <TabRow active={active} onPick={setActive} />
      </div>

      <div
        ref={panel}
        id="day-panel"
        role="tabpanel"
        aria-labelledby={`day-tab-${tab.id}`}
        className="mt-9 flex flex-col items-center gap-8 xl:flex-row xl:justify-center xl:gap-14"
      >
        <div className="flex w-full max-w-[560px] flex-col items-start gap-4 xl:w-[380px] xl:shrink-0">
          <img src={asset('day-ogonek-pointing.webp')} alt="" aria-hidden loading="lazy" decoding="async" className="h-[110px] w-[70px] object-contain" />
          <h3 className="text-[24px] font-bold leading-[1.18] tracking-[-0.224px] text-[var(--color-text)] sm:text-[28px]">{t(tab.title)}</h3>
          <p className="text-[16px] leading-[1.5] text-[var(--color-muted)]">{t(tab.text)}</p>
          {tab.points.map(p => (
            <p key={p} className="flex items-start gap-2 text-[15px] text-[var(--color-text)]"><Check size={16} className="mt-[3px] shrink-0" aria-hidden />{t(p)}</p>
          ))}
        </div>
        <Scene tab={tab} dark={dark} />
      </div>

      <p className="mt-9 text-center text-[13px] text-[var(--color-muted)]">{t('Демо-кабинет: ученики, оценки и суммы вымышленные')}</p>
    </Section>
  )
}
