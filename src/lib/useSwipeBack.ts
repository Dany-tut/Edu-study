import { useEffect, useRef } from 'react'
import { frictionStart, haptic, type Friction } from './feedback'
import { captureScreen, paintSnapshot, STAGE_ATTR, type Snapshot } from './screenSnapshot'

// ─────────────────────────────────────────────────────────────────────────────
// useSwipeBack — «свайп назад» жестом от левого края экрана (как в iOS).
//
// Жест не абстрактный «назад по кнопке», а прямое перетаскивание: страница
// уезжает ровно за пальцем, под ней открывается предыдущий экран, а пока она
// едет — шуршит трение (lib/feedback.ts, frictionStart). Отпустил за порогом —
// страница доезжает и «назад» срабатывает; не дотянул — возвращается на место,
// и ничего не произошло.
//
// Как это устроено. Оба слоя — СНИМКИ (lib/screenSnapshot.ts), а не живой React:
//   • уходящий — снят в момент захвата жеста;
//   • открывающийся — снят раньше, на том тапе, которым сюда и вошли.
// Живое дерево на время жеста прячется (visibility), а сам переход выполняется
// в самом конце, уже под накрытым экраном. Отсюда два важных свойства: жест
// можно отменить (навигация ещё не случилась) и никакой transform не ломает
// `position:fixed` у живого дока — он на снимке.
//
// Каждый экран с кнопкой «Назад» регистрирует свой обработчик; жест дёргает
// ВЕРХНИЙ в стеке, так что вложенные экраны (домашка внутри урока, дрилл внутри
// тренажёра) закрываются по одному.
// ─────────────────────────────────────────────────────────────────────────────

type Entry = { fire: () => void }

const stack: Entry[] = []

/** Ширина зоны у левого края, из которой начинается жест (px). */
const EDGE = 28
/** Порог срабатывания: не меньше 76px и не меньше трети экрана. */
const MIN_TRIGGER = 76
const TRIGGER_RATIO = 0.32
/** Быстрый смах засчитывается и без порога (px/мс). */
const FLING = 0.5
/** Насколько предыдущий экран отстаёт от уходящего (доля ширины). */
const PARALLAX = 0.24
/** Затемнение предыдущего экрана, пока он «в глубине». */
const DIM = 0.2
/** Сколько живёт снимок-кандидат, снятый на тапе (мс). */
const PENDING_TTL = 4000
/** Домашняя кривая приложения — та же, что у доков и шапок. */
const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)'

// ─── Память переходов ────────────────────────────────────────────────────────
// pending — снимок экрана, сделанный на последнем тапе: кандидат в «предыдущий».
// history — что лежит под каждым уровнем вложенности. Растёт, когда открывается
// новый экран, и убывает, когда жест сработал.
let pending: Snapshot | null = null
const history: Snapshot[] = []
const HISTORY_MAX = 5

function underSnapshot(): Snapshot | null {
  return history.length > 0 ? history[history.length - 1] : null
}

// ─── Сцена жеста ─────────────────────────────────────────────────────────────

type Stage = {
  /** Поставить уходящую страницу на x пикселей от левого края. */
  set(x: number): void
  /** Доиграть до конца (fired) или вернуть на место, с учётом скорости. */
  settle(fired: boolean, speed: number): Promise<void>
  /** Снять сцену и вернуть живое дерево. */
  destroy(): void
  /** Прокрутка окна у открывающегося экрана — восстановить после перехода. */
  underScrollY: number
}

function buildStage(under: Snapshot | null, card: Snapshot): Stage {
  const W = Math.max(1, window.innerWidth)

  const wrap = document.createElement('div')
  wrap.setAttribute(STAGE_ATTR, '')
  wrap.setAttribute('aria-hidden', 'true')
  wrap.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:2147483000',
    'overflow:hidden', 'pointer-events:none',
    'background:var(--color-bg)',
  ].join(';')

  // Нижний слой — предыдущий экран. Свой transform обязателен: он делает слой
  // точкой отсчёта для `position:fixed` внутри снимка, иначе нижний док уехал
  // бы к низу документа вместо низа экрана.
  const underEl = document.createElement('div')
  underEl.style.cssText = [
    'position:absolute', 'inset:0', 'overflow:hidden',
    'will-change:transform', `transform:translate3d(${-PARALLAX * W}px,0,0)`,
  ].join(';')
  paintSnapshot(underEl, under, true)

  const dim = document.createElement('div')
  dim.style.cssText = [
    'position:absolute', 'inset:0', 'background:#000',
    `opacity:${DIM}`, 'pointer-events:none',
  ].join(';')

  // Верхний слой — уходящая страница, с тенью по левому краю.
  const cardEl = document.createElement('div')
  cardEl.style.cssText = [
    'position:absolute', 'inset:0', 'overflow:hidden',
    'background:var(--color-bg)',
    'will-change:transform', 'transform:translate3d(0,0,0)',
    'box-shadow:-12px 0 34px rgba(0,0,0,0.32)',
  ].join(';')
  paintSnapshot(cardEl, card, false)

  wrap.append(underEl, dim, cardEl)
  document.body.appendChild(wrap)

  // Живое дерево прячем целиком — вместе с порталами (модалки, подсказки живут
  // рядом с #root). visibility, а не display: не трогаем вёрстку и не рвём
  // прокрутку, пока сцена наверху.
  const hidden: { el: HTMLElement; prev: string }[] = []
  for (const el of Array.from(document.body.children)) {
    if (!(el instanceof HTMLElement) || el === wrap) continue
    hidden.push({ el, prev: el.style.visibility })
    el.style.visibility = 'hidden'
  }

  let x = 0

  const apply = (next: number) => {
    x = next
    const p = Math.min(1, Math.max(0, next / W))
    cardEl.style.transform = `translate3d(${next}px,0,0)`
    underEl.style.transform = `translate3d(${-PARALLAX * W * (1 - p)}px,0,0)`
    dim.style.opacity = String(DIM * (1 - p))
  }

  return {
    underScrollY: under?.scrollY ?? 0,
    set: apply,
    async settle(fired, speed) {
      const to = fired ? W : 0
      const dist = Math.abs(to - x)
      // Длительность от остатка пути и скорости пальца: доводка не должна
      // «догонять» быстрый смах медленнее, чем он шёл.
      const dur = Math.min(380, Math.max(140, dist / Math.max(0.7, speed * 1.15)))
      if (typeof cardEl.animate !== 'function') { apply(to); return }

      const from = x
      const pFrom = Math.min(1, Math.max(0, from / W))
      const pTo = Math.min(1, Math.max(0, to / W))
      const opts: KeyframeAnimationOptions = { duration: dur, easing: EASE, fill: 'forwards' }
      const anims = [
        cardEl.animate(
          [{ transform: `translate3d(${from}px,0,0)` }, { transform: `translate3d(${to}px,0,0)` }],
          opts,
        ),
        underEl.animate(
          [
            { transform: `translate3d(${-PARALLAX * W * (1 - pFrom)}px,0,0)` },
            { transform: `translate3d(${-PARALLAX * W * (1 - pTo)}px,0,0)` },
          ],
          opts,
        ),
        dim.animate([{ opacity: DIM * (1 - pFrom) }, { opacity: DIM * (1 - pTo) }], opts),
      ]
      // Гонка со сторожем: если вкладку свернули посреди жеста, анимация
      // встаёт и `finished` не наступает никогда — а сцена в это время
      // накрывает всё приложение. Ждём не дольше самой доводки с запасом.
      await Promise.race([
        Promise.all(anims.map(a => a.finished.catch(() => undefined))),
        new Promise(r => setTimeout(r, dur + 250)),
      ])
      apply(to)
      anims.forEach(a => a.cancel())
    },
    destroy() {
      wrap.remove()
      hidden.forEach(({ el, prev }) => { el.style.visibility = prev })
    },
  }
}

// ─── Жест ────────────────────────────────────────────────────────────────────

let installed = false

function install() {
  if (installed) return
  installed = true

  let tracking = false
  let captured = false
  let startX = 0
  let startY = 0
  let dx = 0
  let lastX = 0
  let lastT = 0
  let speed = 0
  let past = false
  let stage: Stage | null = null
  let friction: Friction | null = null
  let trigger = MIN_TRIGGER
  // Пройденный путь тапа: по нему отличаем нажатие от прокрутки.
  let tapDrift = 0

  const reset = () => {
    tracking = false
    captured = false
    stage = null
    friction = null
    past = false
  }

  document.addEventListener('touchstart', e => {
    if (stage) return // жест уже доигрывает — новый не начинаем
    reset()
    if (e.touches.length !== 1) return
    const t = e.touches[0]
    startX = t.clientX
    startY = t.clientY
    lastX = t.clientX
    lastT = e.timeStamp
    dx = 0
    speed = 0
    tapDrift = 0
    trigger = Math.max(MIN_TRIGGER, window.innerWidth * TRIGGER_RATIO)
    if (stack.length === 0) return
    if (t.clientX > EDGE) return
    tracking = true
  }, { passive: true })

  document.addEventListener('touchmove', e => {
    if (e.touches.length !== 1) return
    const t = e.touches[0]
    tapDrift = Math.max(tapDrift, Math.abs(t.clientX - startX), Math.abs(t.clientY - startY))
    if (!tracking) return

    dx = t.clientX - startX
    const dy = t.clientY - startY

    if (!captured) {
      // Вертикаль победила — это прокрутка, жест отпускаем насовсем.
      if (Math.abs(dy) > 16 && Math.abs(dy) > Math.abs(dx)) { tracking = false; return }
      if (!(dx > 10 && Math.abs(dx) > Math.abs(dy) * 1.4)) return
      captured = true
      // Сцену строим в момент захвата, а не на touchstart: снимок стоит
      // несколько миллисекунд, и платить за него на каждом касании края незачем.
      const card = captureScreen()
      if (card) stage = buildStage(underSnapshot(), card)
      friction = frictionStart()
    }

    // Жест наш: под пальцем ничего не прокручивается.
    if (e.cancelable) e.preventDefault()

    const dt = Math.max(1, e.timeStamp - lastT)
    const inst = (t.clientX - lastX) / dt
    // Сглаживаем: кадры тача приходят неровно, и сырое значение прыгает.
    speed = speed * 0.6 + inst * 0.4
    lastX = t.clientX
    lastT = e.timeStamp

    // Левее нуля страница не уходит, но и не упирается намертво — вязкий ход.
    const x = dx >= 0 ? dx : dx * 0.25
    stage?.set(Math.max(0, x))
    friction?.move(Math.abs(inst), x / trigger)

    // Засечка на пороге — в обе стороны: человек должен чувствовать, где
    // «отпущу — уйдёт», не глядя на экран.
    const nowPast = x >= trigger
    if (nowPast !== past) { past = nowPast; friction?.detent() }
  }, { passive: false })

  const finish = async (cancelled: boolean) => {
    // Тап (палец почти не двигался) — снимаем кандидата в «предыдущий экран».
    // Момент точный: click, а с ним и переход, случится уже после touchend.
    if (!captured && !cancelled && tapDrift < 12 && startX > EDGE) {
      pending = captureScreen()
    }
    if (!tracking || !captured) { reset(); return }
    tracking = false

    const x = Math.max(0, dx)
    const fired = !cancelled && stack.length > 0 && (x >= trigger || (speed > FLING && x > 24))

    friction?.stop(fired)
    const localStage = stage
    const localSpeed = Math.abs(speed)
    if (fired) haptic(12)

    await localStage?.settle(fired, localSpeed)

    if (fired) {
      // Переход выполняем под накрытым экраном: на нём сейчас снимок того же
      // самого предыдущего экрана, поэтому подмены не видно.
      if (history.length > 0) history.pop()
      pending = null
      const entry = stack[stack.length - 1]
      entry?.fire()
      if (localStage && localStage.underScrollY > 0) {
        window.scrollTo(0, localStage.underScrollY)
      }
    }

    // Даём React дорисовать живой экран под сценой и только потом снимаем её.
    // Через setTimeout, а не rAF: в превью rAF не тикает (см. память проекта),
    // и сцена осталась бы висеть поверх приложения.
    const drop = () => {
      if (fired && localStage && localStage.underScrollY > 0) {
        window.scrollTo(0, localStage.underScrollY)
      }
      localStage?.destroy()
    }
    if (fired) setTimeout(drop, 80)
    else drop()

    reset()
  }

  document.addEventListener('touchend', () => { void finish(false) }, { passive: true })
  document.addEventListener('touchcancel', () => { void finish(true) }, { passive: true })
}

/**
 * Регистрирует обработчик «назад» для свайпа от левого края, пока компонент
 * смонтирован (и пока enabled). Последний зарегистрированный — главный.
 */
export function useSwipeBack(onBack: (() => void) | null | undefined, enabled = true) {
  const fn = useRef(onBack)
  fn.current = onBack
  const active = Boolean(onBack) && enabled

  useEffect(() => {
    if (!active) return
    install()

    // Экран открылся — значит, снимок с того тапа и есть «то, что под ним».
    if (pending && Date.now() - pending.at < PENDING_TTL) {
      history.push(pending)
      if (history.length > HISTORY_MAX) history.shift()
      pending = null
    }

    const entry: Entry = { fire: () => fn.current?.() }
    stack.push(entry)

    return () => {
      const i = stack.indexOf(entry)
      if (i >= 0) stack.splice(i, 1)
      // Вернулись на корневой экран (кнопкой, а не жестом) — глубину забываем.
      // Проверка отложенная: при смене экрана стек на миг пустеет между
      // размонтированием старого и монтированием нового.
      setTimeout(() => { if (stack.length === 0) history.length = 0 }, 0)
    }
  }, [active])
}
