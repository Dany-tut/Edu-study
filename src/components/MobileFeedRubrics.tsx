import { useEffect, useRef, type RefObject } from 'react'
import { tactile } from '../lib/feedback'
import { RubricChip, type Rubric } from './FeedRubricChip'
import type { FeedFilter } from '../data/feed'

// ─────────────────────────────────────────────────────────────────────────────
// Рубрики ленты на телефоне: они же шапка экрана
//
// ПОЧЕМУ НЕ РЯДОМ С ПОСТАМИ. На большом экране ряд чипсов стоит над колонкой и
// никому не мешает — там есть лишние 40 px по вертикали. На телефоне такой ряд
// это минус строка ленты навсегда, а прижать его липким сверху значит поставить
// вторую панель под уже висящую шапку: два этажа хрома над одной колонкой
// постов.
//
// Поэтому рубрики НЕ ДОБАВЛЯЮТСЯ к шапке, а СТАНОВЯТСЯ ей. Верх главной —
// «сколько дней подряд» и «сколько XP»: это про сегодняшний заход, и читают их
// в первые секунды. Как только заголовки кончились и дальше идёт одна лента,
// счётчик стрика наверху уже ничего не сообщает, а место занимает. Ровно там он
// и уступает место рубрикам — одним переливом, без прыжка раскладки.
//
// СВАЙП. Ряд узкий (на 375 px в него влезает три чипса), и листать его пальцем
// ради четвёртой рубрики — работа. Поэтому рубрика переключается свайпом по
// самой ленте, как вкладки в мессенджере, а ряд едет следом и подтягивает
// выбранное в центр: он показывает, где ты, а не служит единственным способом
// переключиться.
//
// ПОДПИСЬ ТОЛЬКО У ВЫБРАННОЙ, остальные значками (см. FeedRubricChip). Восемь
// подписей в ряд на телефоне не влезают ни при какой вёрстке, а свёрнутый ряд
// помещается целиком — то есть по нему видно ВСЕ рубрики сразу, а не три из
// восьми, и свайп перестаёт быть единственным способом узнать, что там дальше.
// ─────────────────────────────────────────────────────────────────────────────

export type { Rubric }

/**
 * Ряд рубрик в стекле шапки.
 *
 * Ширину занимает всю доступную: это уже не таблетка-остров, а панель, и
 * центрировать её по остатку от колокольчика незачем.
 */
export function RubricBar({ chips, value, onChange, accent }: {
  chips: Rubric[]
  value: FeedFilter
  onChange: (id: FeedFilter) => void
  /** Цвет предмета — им красится выбранная рубрика. */
  accent: string
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef(new Map<string, HTMLElement>())

  // Выбранное подтягивается в центр: при свайпе по ленте ряд не листают руками,
  // и активный чипс иначе остаётся за краем — по шапке было бы не понять, в
  // какой ты рубрике.
  useEffect(() => {
    const center = () => {
      const box = scrollRef.current
      const el = itemRefs.current.get(value)
      if (!box || !el) return
      const left = el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2
      const to = Math.max(0, Math.min(left, box.scrollWidth - box.clientWidth))
      // Прокрутка вручную, а не scrollIntoView: он тянет к себе и внешнюю
      // панель прокрутки экрана — лента уезжала бы вверх от смены рубрики.
      if (typeof box.scrollTo === 'function') box.scrollTo({ left: to, behavior: 'smooth' })
      else box.scrollLeft = to
    }
    center()
    // Второй заход — после того, как подписи доехали. В момент тапа выбранный
    // чипс ещё значок, а прошлый ещё со словом: центр, посчитанный по этим
    // ширинам, промахивается ровно на длину подписи.
    const again = setTimeout(center, 280)
    return () => clearTimeout(again)
  }, [value, chips.length])

  return (
    <div
      ref={scrollRef}
      className="no-scrollbar"
      style={{
        // Зазор в два пикселя — свёрнутый ряд из восьми рубрик обязан влезть в
        // 375 px целиком: прокручиваемая шапка не показывает, что там дальше.
        display: 'flex', alignItems: 'center', gap: 2,
        overflowX: 'auto', overscrollBehaviorX: 'contain',
        padding: 4, borderRadius: 999,
        background: 'rgba(var(--glass-rgb), var(--glass-fill-strong))',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid var(--color-border-glass)',
        boxShadow: 'var(--shadow-bar)',
      }}
    >
      {chips.map(c => {
        const on = c.id === value
        return (
          <div
            key={c.id}
            ref={node => { if (node) itemRefs.current.set(c.id, node); else itemRefs.current.delete(c.id) }}
            // Ряд перестал зависеть от длины подписи. Значки держат свой размер,
            // а выбранная рубрика забирает ВЕСЬ остаток ширины — и он же её и
            // ограничивает: раньше подпись просто раздвигала ряд, восемь рубрик
            // переставали помещаться в 375 px, и он уползал под колокольчик,
            // хотя прокручиваемая шапка про спрятанное ничего не сообщает.
            // Растёт, но НЕ сжимается (1 0 auto): подпись выбранной рубрики —
            // это заголовок ленты, ужимать её нельзя. Если ряд всё же не влез,
            // работает прежний горизонтальный скролл, а не обрезка слова.
            style={on ? { display: 'flex', flex: '1 0 auto', minWidth: 0 } : { display: 'flex', flex: '0 1 auto', minWidth: 0 }}
          >
            <RubricChip
              rubric={c}
              on={on}
              label={on}
              grow={on}
              accent={accent}
              onClick={() => { if (!on) { tactile(); onChange(c.id) } }}
            />
          </div>
        )
      })}
    </div>
  )
}

/** Насколько далеко нужно увести палец, чтобы рубрика сменилась. */
const SWIPE = 56
/** Дальше этого лента за пальцем не едет — жест «отзывается», а не таскается. */
const RUBBER = 44

/**
 * Свайп по ленте — соседняя рубрика.
 *
 * ЖЕСТ ВЕДЁМ НА touch-СОБЫТИЯХ, А НЕ НА pointer. Лента живёт внутри
 * прокручиваемой панели, и на iOS первое же вертикальное движение пальца
 * приходит как `pointercancel`: обработчик на pointermove замолкает ровно
 * тогда, когда человек ведёт пальцем по списку. У touch такого нет, но за это
 * приходится платить `passive: false` и ручным preventDefault — иначе браузер
 * начнёт прокрутку одновременно с нашим жестом.
 *
 * НАПРАВЛЕНИЕ РЕШАЕТСЯ ОДИН РАЗ. Пока не понятно, куда ведут, не мешаем
 * никому; как только по горизонтали набежало заметно больше, чем по вертикали,
 * жест наш до конца касания. Обратное тоже верно: начал листать вниз — свайп в
 * этом касании уже не сработает, даже если палец повело вбок.
 */
export function useRubricSwipe(
  ref: RefObject<HTMLElement | null>,
  { chips, value, onChange, enabled }: {
    chips: Rubric[]
    value: FeedFilter
    onChange: (id: FeedFilter) => void
    enabled: boolean
  },
): void {
  // Свежие значения для обработчика: слушатели вешаются один раз на узел, а
  // рубрики и выбранное меняются под ними — [[stale-props-fast-taps]].
  const live = useRef({ chips, value, onChange, enabled })
  live.current = { chips, value, onChange, enabled }

  // `enabled` в зависимостях не ради самого флага (он читается из live), а ради
  // МОМЕНТА: на первом рендере узла ленты ещё нет, и эффект с одним лишь [ref]
  // навесил бы слушателей ровно никуда. Флаг поднимается уже при живой ленте —
  // на этом прогоне они и садятся на узел.
  useEffect(() => {
    const el = ref.current
    if (!el) return

    let startX = 0, startY = 0
    let axis: 'x' | 'y' | null = null
    let active = false
    let dx = 0

    // СМЕЩЕНИЕ ПИШЕМ ПРЯМО В СТИЛЬ, А НЕ В СОСТОЯНИЕ. Каждый touchmove — это
    // кадр: состояние перерисовывало бы всю главную вместе с полусотней постов
    // ленты по десять раз в секунду. Узел здесь один и известен, React о его
    // transform ничего не знает и знать не должен.
    const shift = (x: number, snap: boolean) => {
      dx = x
      el.style.transition = snap ? 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)' : 'none'
      el.style.transform = x ? `translate3d(${x}px, 0, 0)` : ''
    }

    const reset = () => { active = false; axis = null; shift(0, true) }

    const onStart = (e: TouchEvent) => {
      if (!live.current.enabled || e.touches.length !== 1) return
      active = true
      axis = null
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
    }

    const onMove = (e: TouchEvent) => {
      if (!active || e.touches.length !== 1) return
      const mx = e.touches[0].clientX - startX
      const my = e.touches[0].clientY - startY
      if (axis === null) {
        if (Math.abs(mx) < 10 && Math.abs(my) < 10) return
        axis = Math.abs(mx) > Math.abs(my) * 1.4 ? 'x' : 'y'
        if (axis === 'y') { active = false; return }
      }
      // Прокрутку экрана в этом касании берём на себя.
      if (e.cancelable) e.preventDefault()
      // На краю списка рубрик лента почти не поддаётся: упор виден пальцем.
      const { chips: cs, value: v } = live.current
      const i = cs.findIndex(c => c.id === v)
      const edge = (mx > 0 && i <= 0) || (mx < 0 && i >= cs.length - 1)
      const soft = RUBBER * Math.tanh(mx / (RUBBER * 2))
      shift(edge ? soft * 0.25 : soft, false)
    }

    const onEnd = () => {
      if (!active || axis !== 'x') { reset(); return }
      const { chips: cs, value: v, onChange: fire } = live.current
      const i = cs.findIndex(c => c.id === v)
      // Знак берём у накопленного смещения, а не у последнего события: у
      // touchend координат нет вовсе.
      if (Math.abs(dx) >= SWIPE * 0.55) {
        const next = dx < 0 ? i + 1 : i - 1
        if (i >= 0 && next >= 0 && next < cs.length) { tactile(); fire(cs[next].id) }
      }
      reset()
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', reset)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', reset)
    }
  }, [ref, enabled])
}

