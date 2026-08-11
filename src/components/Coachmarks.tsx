import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useT } from '../lib/i18n'

// Онбординг по интерфейсу: затемняем экран, вырезаем в затемнении окно вокруг
// нужного элемента и объясняем словами, что это.
//
// ПОЧЕМУ НЕ ОДИН ЭКРАН-ИНСТРУКЦИЯ. Список правил перед началом читают через
// строчку и забывают до того, как он понадобится. Подсказка, привязанная к
// конкретной кнопке, объясняет ровно в тот момент, когда на кнопку смотрят.
//
// ПОЧЕМУ ПОРТАЛ И FIXED. Подсветка обязана лежать поверх всего и не зависеть от
// того, у какого родителя overflow: hidden или transform, — иначе она
// обрезается ближайшей карточкой. Отсюда портал в body и position: fixed.
//
// ПОЧЕМУ ТАЙМЕРЫ, А НЕ requestAnimationFrame. rAF в превью не срабатывает
// вообще (см. память проекта), а замер после scrollIntoView нужен обязательно:
// до окончания прокрутки координаты элемента ещё старые.

export interface CoachStep {
  /** Элемент, на который показываем. null — шаг без цели, карточка по центру. */
  ref?: React.RefObject<HTMLElement | null>
  /**
   * Имя шага для владельца подсказок. Нужно тем шагам, на которых экран не
   * только рассказывает, но и показывает: по нему владелец узнаёт, что шаг
   * открыт, и запускает свою анимацию (см. onStepChange).
   */
  id?: string
  title: string
  /** Не только строка: шаг может показывать живую легенду, меняющуюся на ходу. */
  text: React.ReactNode
}

/** Отступ подсветки от элемента и зазор до карточки. */
const PAD = 8
/** Скругление рамки, когда у самого элемента его нет. */
const DEFAULT_R = 16
const GAP = 14
const CARD_W = 320
/** Поле карточки-подсказки. Одно число на все стороны — см. вёрстку карточки. */
const PADDING = 16
/**
 * Скругление карточки считается от кнопки, а не подбирается на глаз.
 *
 * «Дальше» — таблетка высотой 38, то есть её угол очерчен радиусом 19, и стоит
 * она в 17 пикселях от края (поле 16 + рамка 1). Чтобы угол карточки шёл
 * ВРОВЕНЬ с углом кнопки, а не пересекал его, внешний радиус обязан быть суммой:
 * 17 + 19. Тогда зазор между двумя дугами одинаков по всей дуге — то же правило,
 * по которому скругляют корпус вокруг экрана.
 */
const BTN_R = 19
const CARD_R = PADDING + 1 + BTN_R

/** Замер цели: где она и с каким скруглением её обводить. */
interface Box { top: number; left: number; width: number; height: number; radius: number }

const same = (a: Box, b: Box) =>
  a.top === b.top && a.left === b.left && a.width === b.width
  && a.height === b.height && a.radius === b.radius

export default function Coachmarks({ steps, open, onClose, accent, onStepChange }: {
  steps: CoachStep[]
  open: boolean
  onClose: () => void
  accent: string
  /**
   * Какой шаг сейчас открыт (его `id`) — null, когда подсказки закрыты. По этому
   * сигналу владелец включает показ: например, стопка карточек на шаге про жесты
   * сама уезжает влево-вправо, вместо того чтобы жесты описывать словами.
   */
  onStepChange?: (id: string | null) => void
}) {
  const t = useT()
  const [i, setI] = useState(0)
  // Замер цели: координаты И скругление одним объектом. Скругление берётся у
  // самого элемента, а не задаётся числом: у рамки ровно тот же радиус, что у
  // блока под ней, — один в один, иначе она читается как чужая деталь поверх
  // вёрстки.
  const [box, setBox] = useState<Box | null>(null)
  const timers = useRef<number[]>([])
  // Высота карточки нужна ДО того, как её ставить: на телефоне подсвеченный
  // блок занимает почти весь экран, и без реальной высоты карточка ложится
  // поверх того, на что показывает.
  const cardRef = useRef<HTMLDivElement | null>(null)
  const [cardH, setCardH] = useState(0)

  const step = steps[i]
  // Шаги пересобираются на каждый рендер владельца, поэтому берём их через ref:
  // иначе measure менял бы идентичность, эффект перезапускался бы на каждый
  // рендер и сам себя кормил новым замером — бесконечный цикл.
  const stepsRef = useRef(steps)
  stepsRef.current = steps

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = [] }

  const measure = useCallback(() => {
    const el = stepsRef.current[i]?.ref?.current
    if (!el) { setBox(b => (b === null ? b : null)); return }
    const r = el.getBoundingClientRect()
    // У контейнера (сетка плашек, колонка вопросов) своего скругления нет —
    // берём его у первой карточки внутри: край контейнера совпадает с её краем,
    // так что рамка всё равно получается параллельной тому, что видно.
    const own = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0
    const kid = own > 0 ? 0
      : parseFloat(getComputedStyle(el.firstElementChild ?? el).borderTopLeftRadius) || 0
    const rad = own || kid
    const next: Box = {
      top: r.top, left: r.left, width: r.width, height: r.height,
      radius: rad > 0 ? rad : DEFAULT_R,
    }
    // Возвращаем прежний объект, если ничего не сдвинулось: React пропустит
    // рендер, и замеры по скроллу перестанут дёргать дерево вхолостую.
    setBox(b => (b && same(b, next) ? b : next))
  }, [i])

  useEffect(() => { if (open) setI(0) }, [open])

  // Шаг сообщается наружу по id, а не по номеру: номера съезжают, как только
  // список шагов собирается по условиям, а id остаётся тем же.
  const stepId = open ? stepsRef.current[i]?.id ?? null : null
  useEffect(() => { onStepChange?.(stepId) }, [stepId, onStepChange])

  // Шаг сменился: подвести элемент к центру экрана и замерить — сразу (чтобы
  // подсветка не мигала на старом месте) и ещё раз после прокрутки.
  useLayoutEffect(() => {
    if (!open) return
    clearTimers()
    const el = stepsRef.current[i]?.ref?.current
    if (!el) { setBox(null); return }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    measure()
    timers.current.push(window.setTimeout(measure, 220))
    timers.current.push(window.setTimeout(measure, 520))
    return clearTimers
  }, [open, i, measure])

  useEffect(() => {
    if (!open) return
    const onScroll = () => measure()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    const ro = new ResizeObserver(onScroll)
    ro.observe(document.body)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
      ro.disconnect()
    }
  }, [open, measure])

  useLayoutEffect(() => {
    const el = cardRef.current
    if (!el) return
    const upd = () => setCardH(el.offsetHeight)
    upd()
    const ro = new ResizeObserver(upd)
    ro.observe(el)
    return () => ro.disconnect()
  }, [open, i])

  const next = useCallback(() => {
    if (i + 1 >= steps.length) onClose()
    else setI(i + 1)
  }, [i, steps.length, onClose])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' || e.key === 'Enter') next()
      if (e.key === 'ArrowLeft') setI(v => Math.max(0, v - 1))
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, next, onClose])

  if (!open || !step || typeof document === 'undefined') return null

  const last = i + 1 >= steps.length
  const vw = window.innerWidth
  const vh = window.innerHeight
  const cardW = Math.min(CARD_W, vw - 24)

  // Карточка: под элементом, если снизу есть место, иначе над ним. Если не
  // помещается ни там, ни там (высокий блок на телефоне) — прижимаем к низу
  // экрана: перекрыть часть подсветки лучше, чем уехать за край.
  const h = cardH || 200
  let cardStyle: React.CSSProperties
  if (box) {
    const bottom = box.top + box.height
    const left = Math.max(12, Math.min(box.left + box.width / 2 - cardW / 2, vw - cardW - 12))
    const below = bottom + PAD + GAP + h + 12 <= vh
    const above = box.top - PAD - GAP - h - 12 >= 0
    const top = below ? bottom + PAD + GAP
      : above ? box.top - PAD - GAP - h
      : vh - h - 12
    cardStyle = { left, top: Math.max(12, Math.min(top, vh - h - 12)) }
  } else {
    cardStyle = { left: (vw - cardW) / 2, top: Math.max(12, (vh - h) / 2) }
  }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000 }}>
      {/* Затемнение + «дырка». Клик по фону = следующий шаг: так проходят
          онбординг те, кто не читает кнопки. */}
      <div
        onClick={next}
        style={{
          position: 'absolute', inset: 0, cursor: 'pointer',
          background: box ? 'transparent' : 'rgba(8,8,12,0.62)',
        }}
      />
      {box && (
        <div
          style={{
            position: 'absolute', pointerEvents: 'none',
            left: box.left - PAD, top: box.top - PAD,
            width: box.width + PAD * 2, height: box.height + PAD * 2,
            borderRadius: box.radius, border: `2px solid ${accent}`,
            boxShadow: `0 0 0 9999px rgba(8,8,12,0.62), 0 0 0 6px ${accent}33`,
            transition: 'left .2s ease, top .2s ease, width .2s ease, height .2s ease',
          }}
        />
      )}

      {/* Поля со всех сторон одинаковые: кнопка «Дальше» — самый крупный якорь
          в карточке, и разные отступы до правого и до нижнего края видно
          невооружённым глазом. Радиус — от кнопки, см. CARD_R. */}
      <div
        ref={cardRef}
        style={{
          position: 'absolute', width: cardW, padding: PADDING, borderRadius: CARD_R,
          background: 'var(--color-bg-2)', border: '1px solid var(--color-border-strong)',
          boxShadow: 'var(--shadow-lg)', ...cardStyle,
        }}
      >
        <button
          onClick={onClose}
          aria-label={t('Закрыть подсказки')}
          style={{
            // Крестик выравнен по полю, как текст, а не задвинут в угол: в углу
            // он спорил бы с большой дугой карточки.
            position: 'absolute', top: PADDING, right: PADDING, width: 26, height: 26,
            borderRadius: '50%',
            border: 'none', background: 'var(--color-bg-3)', color: 'var(--color-text-3)',
            cursor: 'pointer', display: 'grid', placeItems: 'center',
          }}
        >
          <X size={14} />
        </button>

        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.4, color: accent, marginBottom: 5 }}>
          {i + 1} / {steps.length}
        </div>
        <div style={{ fontSize: 16, fontWeight: 750, color: 'var(--color-text)', marginBottom: 6, paddingRight: 28 }}>
          {step.title}
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--color-text-2)' }}>
          {step.text}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
          {/* Точки ужимаются, кнопки — нет. Иначе на длинном туре ряд точек
              вместе с «Пропустить» не влезал в ширину карточки и выталкивал
              «Дальше» за поле: справа оставалось 16 пикселей вместо 17, и на
              последнем шаге (где «Пропустить» нет) кнопка вставала иначе, чем
              на всех предыдущих. */}
          <div style={{ display: 'flex', gap: 5, flex: '1 1 0', minWidth: 0, overflow: 'hidden' }}>
            {steps.map((_, k) => (
              <span key={k} style={{
                width: k === i ? 16 : 6, height: 6, borderRadius: 999, flexShrink: 0,
                background: k === i ? accent : 'var(--color-border-strong)',
                transition: 'width .2s ease',
              }} />
            ))}
          </div>
          {!last && (
            <button
              onClick={onClose}
              style={{
                flexShrink: 0,
                padding: '8px 12px', borderRadius: 999, border: 'none', background: 'transparent',
                color: 'var(--color-text-3)', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 13, fontWeight: 650,
              }}
            >
              {t('Пропустить')}
            </button>
          )}
          <button
            onClick={next}
            style={{
              flexShrink: 0,
              padding: '9px 16px', borderRadius: 999, border: 'none', background: accent,
              color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700,
            }}
          >
            {last ? t('Понятно') : t('Дальше')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
