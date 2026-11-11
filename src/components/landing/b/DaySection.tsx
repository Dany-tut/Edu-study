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
import './landing-motion.css'
import { useTheme } from '../../../store/themeStore'
import { asset, IPhone, Mac, Section, SectionHead } from './kit'
import OgonekModel from './OgonekModel'

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
      { kind: 'mac', src: 'day-mac-attendance-light.webp', srcDark: 'day-mac-attendance-dark.webp', x: 61, y: 141, w: 440 },
      { kind: 'iphone', src: 'day-iphone-myday.webp', srcDark: 'day-iphone-myday-dark.webp', x: 600, y: 135, w: 150 },
    ],
  },
  {
    id: 'review', time: '14:00', label: 'Проверка ДЗ',
    title: 'Проверка развёрнутых ответов, а не только тестов',
    text: 'Ответ ученика стоит рядом с эталоном. Оценка, комментарий, «На доработку» и пометки прямо поверх работы или фото.',
    points: ['Очередь сдач по ученикам', 'Порог зачёта и итог, который увидит ученик', 'История попыток каждой работы'],
    devices: [
      { kind: 'mac', src: 'day-mac-review-light.webp', srcDark: 'day-mac-review-dark.webp', x: 61, y: 141, w: 440 },
      { kind: 'iphone', src: 'day-iphone-review-light.webp', srcDark: 'day-iphone-review-dark.webp', x: 600, y: 135, w: 150 },
    ],
  },
  {
    id: 'journal', time: '16:00', label: 'Журнал',
    title: 'Журнал работ группы целиком',
    text: 'Все домашки по ученикам и датам: проценты, «Проверить», «Просрочено». Ученик видит свой журнал у себя в кабинете.',
    points: ['Работы по ученикам и по домашкам', 'Статусы сдачи видны сразу', 'Свой журнал работ у каждого ученика'],
    devices: [
      { kind: 'mac', src: 'day-mac-journal-light.webp', srcDark: 'day-mac-journal-dark.webp', x: 61, y: 141, w: 440 },
      { kind: 'iphone', src: 'day-iphone-student-journal.webp', x: 600, y: 135, w: 150 },
    ],
  },
  {
    id: 'payments', time: '18:30', label: 'Ученики и оплаты',
    title: 'Ученики и оплаты рядом с уроками',
    text: 'Карточки учеников, оплаченные занятия, долги и доход за месяц — без отдельной таблицы.',
    points: ['Кто оплатил, а у кого просрочка', 'Доход за месяц', 'Ученики по группам и индивидуальные'],
    devices: [
      { kind: 'iphone', src: 'day-iphone-students.webp', srcDark: 'day-iphone-students-dark.webp', x: 215, y: 100, w: 175 },
      { kind: 'iphone', src: 'day-iphone-finance.webp', srcDark: 'day-iphone-finance-dark.webp', x: 425, y: 112, w: 175 },
    ],
  },
  {
    id: 'summary', time: '21:00', label: 'Итоги группы',
    title: 'Итоги группы считаются сами',
    text: 'Средний результат, проверенные работы и темы, которые стоит разобрать на следующем занятии.',
    points: ['Средний процент по группе', 'Тема для разбора — подсказкой', 'Ученик видит свой прогресс на главной'],
    devices: [
      { kind: 'mac', src: 'day-mac-summary-light.webp', srcDark: 'day-mac-summary-dark.webp', x: 61, y: 141, w: 440 },
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

// Слоты устройств: рамки остаются на месте между вкладками, меняется только
// снимок внутри. Mac — один слот; айфоны раскладываются справа налево, чтобы
// «главный» айфон 09:00/14:00 переезжал на ближайшее место в 18:30, а второй
// проявлялся рядом. Отсутствующий во вкладке слот гаснет там, где стоял.
type SlotKey = 'mac' | 'iphone-0' | 'iphone-1'
const SLOT_KEYS: SlotKey[] = ['mac', 'iphone-0', 'iphone-1']

function slotsOf(tab: Tab): Partial<Record<SlotKey, Device>> {
  const out: Partial<Record<SlotKey, Device>> = {}
  const mac = tab.devices.find(d => d.kind === 'mac')
  if (mac) out.mac = mac
  tab.devices.filter(d => d.kind === 'iphone').sort((a, b) => b.x - a.x).slice(0, 2)
    .forEach((d, i) => { out[`iphone-${i}` as SlotKey] = d })
  return out
}

/** Где слот стоит, когда его нет во вкладке: последнее место из ближайших вкладок. */
function homeOf(key: SlotKey, from: number): Device | undefined {
  for (let k = 0; k < TABS.length; k++) {
    const d = slotsOf(TABS[(from - k + TABS.length) % TABS.length])[key]
    if (d) return d
  }
  return undefined
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return
    const on = () => setReduced(mq.matches)
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [])
  return reduced
}

const FLASH_IN = 180
const FLASH_OUT = 220

/** Один экран устройства: новый снимок грузится заранее, затем экран «гаснет» в
 *  белый (в тёмной теме — почти чёрный), снимок меняется и экран загорается. */
function DeviceSlot({ dev, src, visible, s, top, dark, reduced }: {
  dev: Device; src: string; visible: boolean; s: number; top: number; dark: boolean; reduced: boolean
}) {
  const [shown, setShown] = useState(src)
  const [flash, setFlash] = useState(false)
  const wasVisible = useRef(visible)

  useEffect(() => {
    const hiddenBefore = !wasVisible.current
    wasVisible.current = visible
    if (src === shown) { setFlash(false); return }
    // Скрытый слот и «уменьшить движение» — смена без вспышки.
    if (reduced || hiddenBefore || !visible) { setShown(src); setFlash(false); return }
    let cancelled = false
    const timers: number[] = []
    const go = () => {
      if (cancelled) return
      setFlash(true)
      timers.push(window.setTimeout(() => {
        setShown(src)
        timers.push(window.setTimeout(() => setFlash(false), 40))
      }, FLASH_IN))
    }
    const img = new Image()
    img.src = src
    if (typeof img.decode === 'function') img.decode().then(go, go)
    else { img.onload = go; img.onerror = go }
    return () => { cancelled = true; timers.forEach(clearTimeout) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, visible, reduced])

  const w = dev.w * s
  const radius = dev.kind === 'mac' ? (12 * w) / 1512 : (58 * w) / 402
  const inner = { transition: reduced ? 'none' : undefined }
  return (
    <div
      className="lp-day-dev"
      data-reduced={reduced || undefined}
      aria-hidden={!visible || undefined}
      style={{
        left: dev.x * s,
        top: (dev.y - top) * s,
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'scale(.94)',
        zIndex: dev.kind === 'mac' ? 1 : 2,
      }}
    >
      {dev.kind === 'mac'
        ? <Mac src={shown} width={w} style={inner} screenBg={dev.kind === 'mac' ? dev.screenBg : undefined} alt="" className="lp-day-device" />
        : <IPhone src={shown} width={w} style={inner} alt="" className="lp-day-device" />}
      <span
        aria-hidden
        className="lp-day-flash"
        style={{
          borderRadius: radius,
          background: dark ? '#16161a' : '#ffffff',
          opacity: flash ? 1 : 0,
          transitionDuration: reduced ? '0ms' : `${flash ? FLASH_IN : FLASH_OUT}ms`,
          transitionTimingFunction: flash ? 'ease-out' : 'ease-in-out',
        }}
      />
    </div>
  )
}

function Scene({ active, dark }: { active: number; dark: boolean }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const reduced = useReducedMotion()
  const full = width >= SCENE_W
  const s = Math.min(1, width / SCENE_W)
  const top = full ? 0 : TRIM_TOP
  const h = (full ? SCENE_H : TRIM_H) * s
  const slots = slotsOf(TABS[active])
  return (
    <div ref={ref} className="relative w-full xl:w-[760px] xl:shrink-0" style={{ height: h || undefined, aspectRatio: width ? undefined : `${SCENE_W} / ${TRIM_H}` }}>
      {width > 0 && SLOT_KEYS.map(key => {
        const dev = slots[key] ?? homeOf(key, active)
        if (!dev) return null
        const src = asset(dark && dev.srcDark ? dev.srcDark : dev.src)
        return <DeviceSlot key={key} dev={dev} src={src} visible={!!slots[key]} s={s} top={top} dark={dark} reduced={reduced} />
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

/** Текст вкладки: заголовок, абзац и пункты; `--i` — номер строки для задержки входа. */
function TabText({ tab, t }: { tab: Tab; t: (s: string) => string }) {
  return (
    <>
      <h3 style={{ ['--i' as string]: 0 }} className="text-[24px] font-bold leading-[1.18] tracking-[-0.224px] text-[var(--color-text)] sm:text-[28px]">{t(tab.title)}</h3>
      <p style={{ ['--i' as string]: 1 }} className="text-[16px] leading-[1.5] text-[var(--color-muted)]">{t(tab.text)}</p>
      {tab.points.map((p, i) => (
        <p key={p} style={{ ['--i' as string]: i + 2 }} className="flex items-start gap-2 text-[15px] text-[var(--color-text)]"><Check size={16} className="mt-[3px] shrink-0" aria-hidden />{t(p)}</p>
      ))}
    </>
  )
}

const TEXT_OUT = 190

export default function DaySection() {
  const t = useT()
  const { dark } = useTheme()
  const [active, setActive] = useState(1) // в макете открыта «14:00 · Проверка ДЗ»
  const [leaving, setLeaving] = useState<{ index: number; n: number } | null>(null)
  const [switched, setSwitched] = useState(false)
  const seq = useRef(0)
  const leaveTimer = useRef<number | undefined>(undefined)
  const tab = TABS[active]

  // Смена вкладки: старый текст уходит вверх с размытием, новый входит построчно.
  // Без AnimatePresence — слои лежат в одной ячейке сетки, высоту держит невидимый
  // «замерщик» со всеми вкладками, поэтому страница не прыгает.
  const activeRef = useRef(active)
  const pick = useCallback((i: number) => {
    const prev = activeRef.current
    if (prev === i) return
    activeRef.current = i
    seq.current += 1
    setLeaving({ index: prev, n: seq.current })
    setSwitched(true)
    setActive(i)
    window.clearTimeout(leaveTimer.current)
    leaveTimer.current = window.setTimeout(() => setLeaving(null), TEXT_OUT + 20)
  }, [])
  useEffect(() => () => window.clearTimeout(leaveTimer.current), [])

  const layer = 'flex flex-col items-start gap-4 [grid-area:1/1]'

  return (
    <Section className="pb-[10px] pt-20 sm:pt-[110px]">
      <SectionHead
        eyebrow={t('НАСТОЯЩИЕ ЭКРАНЫ')}
        title={t('Один день в Искре')}
        lead={<span className="mx-auto block max-w-[640px]">{t('Вкладки по времени дня — Огонёк показывает, что происходит в каждый момент.')}</span>}
        width={760}
      />

      <div className="mt-9">
        <TabRow active={active} onPick={pick} />
      </div>

      <div
        id="day-panel"
        role="tabpanel"
        aria-labelledby={`day-tab-${tab.id}`}
        className="mt-9 flex flex-col items-center gap-8 xl:flex-row xl:justify-center xl:gap-14"
      >
        <div className="flex w-full max-w-[560px] flex-col items-start gap-4 xl:w-[380px] xl:shrink-0">
          <OgonekModel pose="day" fallback="day-ogonek-pointing.webp" className="relative h-[110px] w-[70px]" />
          <div className="grid w-full">
            {TABS.map(x => (
              <div key={`size-${x.id}`} aria-hidden className={`${layer} invisible`}><TabText tab={x} t={t} /></div>
            ))}
            {leaving && leaving.index !== active && (
              <div key={`out-${leaving.n}`} aria-hidden className={`${layer} lp-day-out pointer-events-none`}><TabText tab={TABS[leaving.index]} t={t} /></div>
            )}
            <div key={`in-${tab.id}`} className={`${layer} ${switched ? 'lp-day-in' : ''}`}><TabText tab={tab} t={t} /></div>
          </div>
        </div>
        <Scene active={active} dark={dark} />
      </div>

      <p className="mt-9 text-center text-[13px] text-[var(--color-muted)]">{t('Демо-кабинет: ученики, оценки и суммы вымышленные')}</p>
    </Section>
  )
}
