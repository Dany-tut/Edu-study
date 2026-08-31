import { useEffect, useRef } from 'react'
import { frictionStart, haptic, type Friction } from './feedback'
import { captureScreen, paintSnapshot, STAGE_ATTR, type Snapshot } from './screenSnapshot'
import { freezeDockLayer, viewportGap } from './dockLayer'

// ─────────────────────────────────────────────────────────────────────────────
// useSwipeBack — «свайп назад» жестом от левого края экрана (как в iOS).
//
// Жест не абстрактный «назад по кнопке», а прямое перетаскивание: страница
// уезжает ровно за пальцем, под ней открывается предыдущий экран, а пока она
// едет — под пальцем работает мягкий моторчик (lib/feedback.ts, frictionStart).
// Отпустил за порогом — страница доезжает и «назад» срабатывает; не дотянул —
// возвращается на место, и ничего не произошло.
//
// Что чем едет:
//   • уходящая страница — ЖИВОЕ дерево, а не копия. Копировать её на каждом
//     жесте нельзя: клон экрана стоит десятки миллисекунд, и жест начинался бы
//     с рывка. Вместо этого корень примораживается к окну (position:fixed на
//     весь экран + собственная прокрутка), и только после этого получает
//     transform. Заморозка обязательна: под transform’ом `position:fixed`
//     внутри считается от корня, и без неё доки уехали бы к низу документа.
//   • предыдущий экран — СНИМОК (lib/screenSnapshot.ts), снятый заранее, в
//     простое: в дереве его уже нет, при переходе он размонтировался.
//
// Переход выполняется в самом конце, под уже уехавшей страницей. Отсюда два
// важных свойства: жест можно отменить (навигация ещё не случилась) и подмены
// снимка на живой экран не видно.
//
// Каждый экран с кнопкой «Назад» регистрирует свой обработчик; жест дёргает
// ВЕРХНИЙ в стеке, так что вложенные экраны (домашка внутри урока, дрилл внутри
// тренажёра) закрываются по одному.
// ─────────────────────────────────────────────────────────────────────────────

type Entry = { fire: () => void }

const stack: Entry[] = []

/** Ширина зоны у левого края, из которой начинается жест (px). */
const EDGE = 20

/**
 * Есть ли сейчас, куда возвращаться этим жестом.
 *
 * Наружу — ради жестов, которые тоже хотят левый край: свайп по посту ленты
 * (components/trainer/FeedSwipe.tsx) отдаёт первые EDGE пикселей «назад», но
 * ТОЛЬКО когда «назад» кому-то нужно. На корневом экране (мобильная главная,
 * где лента и живёт) стек пуст, полоса ничья, и отбирать её у поста незачем.
 */
export function backArmed(): boolean {
  return stack.length > 0
}

/** Та же полоса, что отдана жесту «назад», — чтобы её не измеряли на глаз. */
export const BACK_EDGE = EDGE
/**
 * Слоп — путь пальца, до которого намерение НЕ разбирается вовсе.
 *
 * Без него разбор шёл на каждом движении и превращался в гонку: диагональное
 * начало прокрутки (dx 11, dy 7) успевало пройти горизонтальную проверку
 * раньше, чем срабатывало вето по вертикали, — и список уезжал вбок вместо
 * того, чтобы прокрутиться.
 */
const SLOP = 12
/**
 * Насколько горизонталь должна перевешивать вертикаль в момент разбора.
 * 2:1 — конус около 26°: пологие движения достаются прокрутке.
 */
const DOMINANCE = 2
/** Порог срабатывания: не меньше 76px и не меньше трети экрана. */
const MIN_TRIGGER = 76
const TRIGGER_RATIO = 0.32
/** Быстрый смах засчитывается и без порога (px/мс). */
const FLING = 0.5
/**
 * Насколько предыдущий экран отстаёт от уходящего (доля ширины).
 *
 * Ноль: нижний экран стоит НЕПОДВИЖНО, по нему просто проезжает карточка.
 * Классический параллакс (0.24) читался как «оба экрана едут» и мешал
 * закреплённым барам — они стоят, а фон под ними подтягивался вбок.
 */
const PARALLAX = 0
/** Затемнение предыдущего экрана, пока он «в глубине». */
const DIM = 0.2
/**
 * Скругление углов уезжающей страницы — под скругление экрана айфона.
 * Набегает за первые 26px хода: на нуле углы обязаны быть прямыми, иначе в
 * покое по краям экрана просвечивал бы нижний слой.
 */
const CORNER = 46
const CORNER_RAMP = 26
/** Домашняя кривая приложения — та же, что у доков и шапок. */
const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)'

/**
 * Метка закреплённого элемента: `data-swipe-pin="top" | "bottom"`.
 *
 * Помеченное на время жеста НЕ едет со страницей — оно стоит, а страница
 * проходит под ним. Нижняя навигация одна и та же на всех экранах, поэтому
 * она просто стоит («карточка проходит под баром»). Верхние кнопки у каждого
 * экрана свои, поэтому их две: копия уходящего экрана видна справа от стыка,
 * копия нижнего — слева, и на линии стыка одна сменяет другую.
 */
const PIN_ATTR = 'data-swipe-pin'

/**
 * Метка морфящейся кнопки: `data-swipe-morph="<имя>"`.
 *
 * Одноимённые кнопки соседних экранов на свайпе не сменяют друг друга, а
 * перетекают: корпус тянется из круга в длинную таблетку по геометрии, а
 * содержимое расходится размытием и масштабом.
 *
 * Имя — только для исключений. По умолчанию таблетки шапки разбираются в
 * пары САМИ, по порядку слева направо: первая с первой, вторая со второй.
 * Кнопка без пары растворяется на месте.
 */
const MORPH_ATTR = 'data-swipe-morph'
/** Размытие содержимого на полпути морфа (px) и его подсадка по масштабу. */
const MORPH_BLUR = 7
const MORPH_SCALE = 0.9

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'LINK', 'TEMPLATE', 'NOSCRIPT'])

// ─── Память переходов ────────────────────────────────────────────────────────
//
// `current` — снимок текущего экрана, обновляемый в простое. Когда открывается
// следующий экран, этот снимок и есть «то, что под ним»: он снят, пока
// предыдущий экран ещё был на месте.
//
// Съёмка НИКОГДА не висит на тапе или на старте жеста: клон дерева стоит
// десятки миллисекунд, и человек почувствовал бы это как заедание интерфейса.
let current: Snapshot | null = null
const history: Snapshot[] = []
const HISTORY_MAX = 5

let captureTimer: ReturnType<typeof setTimeout> | null = null
let stageUp = false
// Взведён на время возврата: экран, который сейчас смонтируется, — это шаг
// НАЗАД, и класть под него ещё один уровень нельзя (иначе под уроком окажется
// домашка, из которой в него только что вернулись).
let returning = false

/** Жест мобильный: на настольной раскладке снимки не копим вовсе. */
function mobileish(): boolean {
  if (typeof window === 'undefined') return false
  if (navigator.maxTouchPoints > 0 || 'ontouchstart' in window) return true
  return window.innerWidth <= 1024
}

/**
 * Снять текущий экран, когда основной поток освободится.
 *
 * Троттл, а не дебаунс: экран живёт и мутирует постоянно (анимации, приходящие
 * данные), и «отложить ещё раз» означало бы не снять никогда.
 */
function scheduleCapture(delay = 400) {
  if (typeof window === 'undefined' || !mobileish()) return
  if (captureTimer) return
  captureTimer = setTimeout(() => {
    captureTimer = null
    // Пока сцена наверху, экран заморожен и сдвинут — снимать его нельзя.
    const run = () => { if (!stageUp) current = captureScreen() }
    const idle = (window as unknown as {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number
    }).requestIdleCallback
    if (typeof idle === 'function') idle(run, { timeout: 1500 })
    else run()
  }, delay)
}

function underSnapshot(): Snapshot | null {
  return history.length > 0 ? history[history.length - 1] : null
}

// ─── Сцена жеста ─────────────────────────────────────────────────────────────

type Stage = {
  /** Поставить уходящую страницу на x пикселей от левого края. */
  set(x: number): void
  /** Доиграть до конца (fired) или вернуть на место, с учётом скорости. */
  settle(fired: boolean, speed: number): Promise<void>
  /** Разморозить страницу и снять слой. */
  destroy(fired: boolean): void
}

function buildStage(under: Snapshot | null): Stage {
  const W = Math.max(1, window.innerWidth)
  const scrollY = Math.round(window.scrollY)
  // ── Геометрия слоёв: до настоящего низа экрана ──
  //
  // В установленном PWA вебвью держит ДОКУМЕНТ короче окна и режет
  // `position:fixed` по этой, документной границе. Замер на устройстве:
  // innerHeight 874, documentElement.clientHeight 812. Слои жеста стояли на
  // `inset:0`; рамка корня честно возвращала 0…874, а краска обрывалась на
  // 812 — уезжающая страница показывала скругление ВЫШЕ низа экрана, и снизу
  // оставалась полоса голого холста в 62px.
  //
  // Мерить это через `screen.height` (как lib/dockLayer.ts, которому нужно
  // другое — ложная граница ОКНА) нельзя: на том же устройстве screen 874 =
  // innerHeight, и зазора «по экрану» нет вовсе.
  //
  // Пока зазор есть, слои обычные (не fixed) и высотой в окно: обрезка бьёт
  // только по fixed, а обычный слой рисуется до самого низа. Отсчёт ведём от
  // текущей прокрутки. Зазора нет — всё как было, fixed.
  const clip = Math.round(window.innerHeight - document.documentElement.clientHeight)
  const gap = Math.max(0, clip, viewportGap())
  // Высота — настоящий экран: окно плюс зазор ОКНА (не документного).
  const H = window.innerHeight + Math.max(0, viewportGap())
  const POS = gap ? 'absolute' : 'fixed'
  const TOP = gap ? scrollY : 0

  // Пока сцена наверху, слой доков не переставляем: заморозка корня сбрасывает
  // прокрутку документа, и слой дёргался бы вслед за ней.
  freezeDockLayer(true)

  // ── Нижний слой: предыдущий экран ──
  const wrap = document.createElement('div')
  wrap.setAttribute(STAGE_ATTR, '')
  wrap.setAttribute('aria-hidden', 'true')
  wrap.style.cssText = [
    `position:${POS}`, 'left:0', 'right:0', `top:${TOP}px`, `height:${H}px`, 'z-index:0',
    'overflow:hidden', 'pointer-events:none',
    'background:var(--color-bg)',
  ].join(';')

  // Свой transform обязателен и здесь: он делает слой точкой отсчёта для
  // `position:fixed` внутри снимка, иначе нижний док на снимке уехал бы к низу
  // документа вместо низа экрана.
  const underEl = document.createElement('div')
  underEl.style.cssText = [
    'position:absolute', 'inset:0', 'overflow:hidden',
    'will-change:transform', `transform:translate3d(${-PARALLAX * W}px,0,0)`,
  ].join(';')
  paintSnapshot(underEl, under)

  const dim = document.createElement('div')
  dim.style.cssText = [
    'position:absolute', 'inset:0', 'background:#000', `opacity:${DIM}`,
  ].join(';')

  // Подложка с запасом за кромки экрана. Слои жеста — `position:fixed`, то есть
  // ровно по коробке окна; на айфоне под этой коробкой остаётся зона домашней
  // полосы, и в неё на время жеста просвечивало белым. Заливка с напуском по
  // 200px закрывает и её, и любой похожий зазор сверху.
  const bleed = document.createElement('div')
  bleed.setAttribute(STAGE_ATTR, '')
  bleed.setAttribute('aria-hidden', 'true')
  bleed.style.cssText = [
    `position:${POS}`, 'left:0', 'right:0', `top:${TOP - 200}px`,
    `height:${H + 400}px`,
    'z-index:0', 'pointer-events:none', 'background:var(--color-bg)',
  ].join(';')

  // Корень уходит из потока — документ схлопывается, браузер сбрасывает
  // прокрутку в 0, и вся сцена (она стоит на `top:scrollY`) уезжает вверх.
  // Держим высоту документа на время жеста.
  const bodyCss = document.body.style.cssText
  if (gap) document.body.style.minHeight = `${scrollY + H}px`

  wrap.append(underEl, dim)
  document.body.insertBefore(wrap, document.body.firstChild)
  document.body.insertBefore(bleed, wrap)

  // ── Верхний слой: живая страница ──
  // Едут все слои приложения разом — корень и порталы (модалки, подсказки
  // живут рядом с #root), иначе открытая шторка осталась бы висеть на месте.
  const movers: { el: HTMLElement; css: string }[] = []
  for (const el of Array.from(document.body.children)) {
    if (!(el instanceof HTMLElement) || el === wrap) continue
    if (SKIP_TAGS.has(el.tagName)) continue
    movers.push({ el, css: el.style.cssText })
  }

  // Корень берём из movers, а не поиском по id: это заведомо ЖИВОЙ узел, а не
  // одноимённый клон из снимка.
  const root = movers.find(m => m.el.id === 'root')?.el ?? null

  // Прокрутку страницы переносим внутрь ОТРИЦАТЕЛЬНЫМ ОТСТУПОМ первого ребёнка,
  // а не прокруткой самого корня (`root.scrollTop = scrollY`, как было).
  //
  // Разница видна на любом прокрученном экране. Под transform’ом всё, что внутри
  // объявлено `position:fixed` (доки, нижняя навигация), считается от коробки
  // корня. Пока корень был скроллером, эти слои ЕХАЛИ ВМЕСТЕ С ПРОКРУТКОЙ и на
  // старте жеста подпрыгивали вверх ровно на scrollY — навигация оказывалась
  // посреди экрана. С отступом коробка корня остаётся экраном, доки стоят на
  // своих местах, а вверх уезжает только содержимое.
  const shifted = (root && scrollY > 0 ? root.firstElementChild : null) as HTMLElement | null
  const shiftedCss = shifted ? shifted.style.cssText : ''
  if (root) {
    // Заморозка: коробка корня становится ровно экраном, а прокрутка окна
    // переезжает внутрь него. Без этого transform ниже сломал бы отсчёт у
    // `position:fixed` — доки прыгнули бы к низу документа.
    root.style.position = POS
    root.style.top = `${TOP}px`
    root.style.left = '0'
    root.style.right = '0'
    // Высотой, а не `bottom:0`: низ коробки окна не всегда низ экрана.
    root.style.height = `${H}px`
    root.style.overflow = 'hidden'
    // Своя заливка обязательна: фон приложения лежит на body (index.css), а
    // #root прозрачен — отъезжающая страница просвечивала бы насквозь, и на
    // экране оказывались бы видны оба экрана разом.
    root.style.background = 'var(--color-bg)'
    // Тень ложится на открывающийся экран — она и создаёт ощущение, что
    // страница лежит СВЕРХУ, а не нарисована рядом. Мягкая и узкая: прежняя
    // (-18px / 46px / 0.38) красила треть открывшегося экрана в серое и
    // читалась как грязь под краем, а не как высота.
    root.style.boxShadow = '-6px 0 18px rgba(0,0,0,0.13)'
  }
  if (shifted) shifted.style.marginTop = `${-scrollY}px`

  // Прокрутку возвращаем НАСИЛЬНО. Корень ушёл из потока, и браузер успевает
  // сбросить scrollY в 0 ещё до того, как подействует `body.minHeight`. Слой
  // доков не fixed: он стоит на `top:scrollY`, и после сброса оказывался ниже
  // экрана ровно на прокрутку — нижняя навигация уезжала за край, и по низу
  // оставалась её белая полоса без скруглений. Заодно фиксируем сам слой: пока
  // сцена наверху, его никто не пересчитывает (freezeDockLayer выше).
  if (gap) {
    const layer = document.getElementById('mobile-dock-layer')
    if (layer) layer.style.top = `${scrollY}px`
    if (Math.round(window.scrollY) !== scrollY) window.scrollTo(0, scrollY)
  }

  movers.forEach(({ el }) => {
    el.style.zIndex = el.style.zIndex || '1'
    el.style.willChange = 'transform'
  })

  // ── Закреплённые элементы ───────────────────────────────────────────────
  // Слой создаётся ПОСЛЕ списка movers — значит, сам он никуда не едет.
  const pinLayer = document.createElement('div')
  pinLayer.setAttribute(STAGE_ATTR, '')
  pinLayer.setAttribute('aria-hidden', 'true')
  pinLayer.style.cssText = [
    `position:${POS}`, 'left:0', 'right:0', `top:${TOP}px`, `height:${H}px`,
    'z-index:90', 'pointer-events:none', 'overflow:hidden',
  ].join(';')
  document.body.appendChild(pinLayer)

  type Pin = { live: HTMLElement; vis: string }
  /** Кадр морфа: стили элемента при ходе p (0 — уходящий экран, 1 — нижний). */
  type Morph = { el: HTMLElement; at(p: number): Record<string, string> }
  const pins: Pin[] = []
  const morphs: Morph[] = []

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  /** Сглаживание для содержимого: линейная подмена читается как щелчок. */
  const smooth = (t: number) => {
    const c = Math.min(1, Math.max(0, t))
    return c * c * (3 - 2 * c)
  }

  /** Поставить узел в слой ровно туда, где он сейчас виден на экране. */
  const place = (el: HTMLElement, box: DOMRect, origin: { left: number; top: number }) => {
    el.style.position = 'absolute'
    el.style.margin = '0'
    el.style.transform = 'none'
    el.style.left = `${box.left - origin.left}px`
    el.style.top = `${box.top - origin.top}px`
    el.style.width = `${box.width}px`
    el.style.height = `${box.height}px`
    pinLayer.appendChild(el)
  }

  /**
   * Содержимое кнопки — в свою обёртку.
   *
   * Гасить надо именно его, а не саму кнопку: корпус в это время тянется. И
   * обёртка обязательна, а не перебор детей, — у кнопки бывает голый текст
   * («12 Lvl»), а текстовому узлу стиль не назначишь.
   */
  const wrapKids = (el: HTMLElement) => {
    const box = document.createElement('div')
    box.style.cssText = [
      'display:flex', 'align-items:center', 'justify-content:center',
      'gap:6px', 'width:100%', 'height:100%', 'white-space:nowrap',
      'will-change:opacity,filter,transform',
    ].join(';')
    while (el.firstChild) box.appendChild(el.firstChild)
    el.appendChild(box)
    return box
  }

  /**
   * Таблетки шапки — сами по себе, без разметки.
   *
   * Признак таблетки — скруглённый корпус: у шапок приложения это круглая
   * кнопка, стеклянная таблетка или чип. Обёртки отбрасываем: если внутри
   * лежит такая же таблетка, корпус здесь не свой, а групповой.
   */
  const chips = (root: ParentNode) => {
    const all = Array.from(root.querySelectorAll<HTMLElement>('*')).filter(el => {
      if (!visible(el)) return false
      return parseFloat(getComputedStyle(el).borderTopLeftRadius) >= 14
    })
    return all
      .filter(el => !all.some(other => other !== el && el.contains(other)))
      .sort((l, r) => l.getBoundingClientRect().left - r.getBoundingClientRect().left)
  }

  /**
   * Развести кнопки двух экранов в перетекающие пары.
   *
   * Сначала — именованные (исключения), потом остальные таблетки по порядку
   * встречи слева направо: первая с первой, вторая со второй. Лишние (у
   * одного экрана чипсов больше) остаются без пары и растворяются.
   */
  const pairMorphs = (from: HTMLElement, to: HTMLElement | null) => {
    if (!to) return
    const base = pinLayer.getBoundingClientRect()
    const rel = (el: HTMLElement) => {
      const b = el.getBoundingClientRect()
      return { left: b.left - base.left, top: b.top - base.top, w: b.width, h: b.height }
    }

    const pairs: [HTMLElement, HTMLElement][] = []
    const taken = new Set<HTMLElement>()
    for (const a of Array.from(from.querySelectorAll<HTMLElement>(`[${MORPH_ATTR}]`))) {
      if (!visible(a)) continue
      const b = pickVisible(to, `[${MORPH_ATTR}="${a.getAttribute(MORPH_ATTR)}"]`)
      if (!b) continue
      pairs.push([a, b])
      taken.add(a).add(b)
    }
    const left = chips(from).filter(el => !taken.has(el) && !pairs.some(([a]) => a.contains(el)))
    const right = chips(to).filter(el => !taken.has(el) && !pairs.some(([, b]) => b.contains(el)))
    for (let i = 0; i < Math.min(left.length, right.length); i++) pairs.push([left[i], right[i]])

    for (const [live, b] of pairs) {
      const ra = rel(live)
      const rb = rel(b)
      if (!ra.w || !rb.w) continue

      // Копия, а не сам узел: живой принадлежит React и размонтируется
      // посреди жеста. Оригинал прячем — иначе он уедет со страницей и
      // таблетка задвоится.
      const a = live.cloneNode(true) as HTMLElement
      a.removeAttribute('id')
      a.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'))
      pins.push({ live, vis: live.style.visibility })
      live.style.visibility = 'hidden'

      const ia = wrapKids(a)
      const ib = wrapKids(b)
      // Корпус на экране один: у кнопки нижнего экрана снимаем всё, что его
      // рисует, иначе два стекла легли бы друг на друга и потемнели.
      b.style.background = 'none'
      b.style.boxShadow = 'none'
      b.style.border = '0'

      for (const el of [a, b]) {
        el.style.position = 'absolute'
        el.style.margin = '0'
        el.style.padding = '0'
        el.style.overflow = 'hidden'
        el.style.display = 'flex'
        el.style.alignItems = 'center'
        el.style.justifyContent = 'center'
        el.style.willChange = 'left,top,width,height'
        pinLayer.appendChild(el)
      }

      // Корпус обеих половин идёт по ОДНОЙ коробке — она и есть морф.
      const shell = (p: number) => ({
        left: `${lerp(ra.left, rb.left, p)}px`,
        top: `${lerp(ra.top, rb.top, p)}px`,
        width: `${lerp(ra.w, rb.w, p)}px`,
        height: `${lerp(ra.h, rb.h, p)}px`,
      })
      morphs.push({ el: a, at: shell }, { el: b, at: shell })
      // Содержимое расходится: уходящее уплывает в размытие, приходящее из
      // него выступает. Опорные точки не 0 и 1, а с перехлёстом — иначе на
      // середине хода в таблетке пусто.
      morphs.push({
        el: ia,
        at: p => {
          const t = smooth(p * 1.35)
          return {
            opacity: String(1 - t),
            filter: `blur(${MORPH_BLUR * t}px)`,
            transform: `scale(${lerp(1, MORPH_SCALE, t)})`,
          }
        },
      }, {
        el: ib,
        at: p => {
          const t = smooth(p * 1.35 - 0.35)
          return {
            opacity: String(t),
            filter: `blur(${MORPH_BLUR * (1 - t)}px)`,
            transform: `scale(${lerp(2 - MORPH_SCALE, 1, t)})`,
          }
        },
      })
    }
  }

  /**
   * Видно ли элемент прямо сейчас.
   *
   * У экрана бывает ДВЕ шапки разом: у урока строка в потоке и её
   * закреплённый двойник, и та, что не в ходу, погашена прозрачностью, а не
   * снята. Без этой проверки в слой попадала невидимая, забирала себе пару
   * для морфа — и видимой кнопке перетекать было уже не во что.
   */
  const visible = (el: HTMLElement) => {
    const box = el.getBoundingClientRect()
    if (!box.width || !box.height) return false
    const cs = getComputedStyle(el)
    return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05
  }

  /** Первый ВИДИМЫЙ элемент по селектору (см. `visible`). */
  const pickVisible = (scope: ParentNode, sel: string) =>
    Array.from(scope.querySelectorAll<HTMLElement>(sel)).find(visible) ?? null

  const zero = { left: 0, top: 0 }
  for (const live of Array.from(document.querySelectorAll<HTMLElement>(`[${PIN_ATTR}]`))) {
    // Копии из снимка и из уже собранного слоя — не исходники.
    if (wrap.contains(live) || pinLayer.contains(live)) continue
    if (!visible(live)) continue
    const kind = live.getAttribute(PIN_ATTR) || ''
    const twin = pickVisible(underEl, `[${PIN_ATTR}="${kind}"]`)

    if (kind === 'top') {
      // Шапку НЕ закрепляем целиком. Закреплённая шапка вставала поперёк
      // стыка: заголовок урока тянулся сразу через оба экрана, а корпуса
      // кнопок оставались пустыми. Стоят и перетекают только те таблетки, у
      // которых нашлась пара; всё остальное едет со страницей, как ехало.
      pairMorphs(live, twin)
      continue
    }

    // Нижний бар — целиком: он один и тот же на всех экранах.
    const box = live.getBoundingClientRect()
    const clone = live.cloneNode(true) as HTMLElement
    clone.removeAttribute('id')
    clone.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'))
    place(clone, box, zero)
    pins.push({ live, vis: live.style.visibility })
    live.style.visibility = 'hidden'
    // Двойник из снимка только двоился бы.
    twin?.remove()
  }

  /** Поставить морф на ход p — и на пальце, и в доводке одним кодом. */
  const setMorphs = (p: number) => {
    for (const m of morphs) Object.assign(m.el.style, m.at(p))
  }
  setMorphs(0)

  let x = 0

  const apply = (next: number) => {
    x = next
    const p = Math.min(1, Math.max(0, next / W))
    const shift = `translate3d(${next}px,0,0)`
    movers.forEach(({ el }) => { el.style.transform = shift })
    if (root) root.style.borderRadius = `${CORNER * Math.min(1, next / CORNER_RAMP)}px`
    underEl.style.transform = `translate3d(${-PARALLAX * W * (1 - p)}px,0,0)`
    dim.style.opacity = String(DIM * (1 - p))

    // Закреплённое стоит; у верхних кнопок по линии стыка одна половина
    // сменяет другую. Затемнение нижнего экрана лежит слоем НИЖЕ, поэтому
    // его копии затемняем сами — иначе кнопка была бы ярче своего экрана.
    // Геометрия снята один раз, на сборке сцены: замер в каждом кадре жеста
    // заставлял бы браузер пересчитывать раскладку под пальцем.
    for (const pin of pins) {
      if (pin.kind !== 'top') continue
      const cut = Math.min(pin.width, Math.max(0, next - pin.left))
      pin.clone.style.clipPath = `inset(0 0 0 ${cut}px)`
      if (pin.under) {
        const uCut = Math.min(pin.uWidth, Math.max(0, next - pin.uLeft))
        pin.under.style.clipPath = `inset(0 ${pin.uWidth - uCut}px 0 0)`
        pin.under.style.filter = `brightness(${1 - DIM * (1 - p)})`
      }
    }
  }

  return {
    set: apply,
    async settle(fired, speed) {
      const to = fired ? W : 0
      const dist = Math.abs(to - x)
      // Длительность от остатка пути и скорости пальца: доводка не должна
      // «догонять» быстрый смах медленнее, чем он шёл.
      const dur = Math.min(380, Math.max(140, dist / Math.max(0.7, speed * 1.15)))
      const canAnimate = typeof underEl.animate === 'function'
      if (!canAnimate) { apply(to); return }

      const from = x
      const pFrom = Math.min(1, Math.max(0, from / W))
      const pTo = Math.min(1, Math.max(0, to / W))
      const opts: KeyframeAnimationOptions = { duration: dur, easing: EASE, fill: 'forwards' }
      const anims = [
        ...movers.map(({ el }) => el.animate(
          [{ transform: `translate3d(${from}px,0,0)` }, { transform: `translate3d(${to}px,0,0)` }],
          opts,
        )),
        underEl.animate(
          [
            { transform: `translate3d(${-PARALLAX * W * (1 - pFrom)}px,0,0)` },
            { transform: `translate3d(${-PARALLAX * W * (1 - pTo)}px,0,0)` },
          ],
          opts,
        ),
        dim.animate([{ opacity: DIM * (1 - pFrom) }, { opacity: DIM * (1 - pTo) }], opts),
        // Морф — линейная интерполяция, поэтому доводка описывается ровно
        // двумя кадрами: кривую наложит сам WAAPI, как и на страницу.
        ...morphs.map(m => m.el.animate([m.at(pFrom), m.at(pTo)], opts)),
      ]
      // Гонка со сторожем: если вкладку свернули посреди жеста, анимация встаёт
      // и `finished` не наступает никогда — а страница в это время висит
      // отодвинутой. Ждём не дольше самой доводки с запасом.
      await Promise.race([
        Promise.all(anims.map(a => a.finished.catch(() => undefined))),
        new Promise(r => setTimeout(r, dur + 250)),
      ])
      apply(to)
      anims.forEach(a => a.cancel())
    },
    destroy(fired) {
      wrap.remove()
      bleed.remove()
      pinLayer.remove()
      pins.forEach(pin => { pin.live.style.visibility = pin.vis })
      // cssText целиком: разом снимает и transform, и заморозку корня, и
      // z-index — ровно то, что было до жеста.
      movers.forEach(({ el, css }) => { el.style.cssText = css })
      if (gap) document.body.style.cssText = bodyCss
      if (shifted) shifted.style.cssText = shiftedCss
      // Прокрутку возвращаем уже разморозенному документу: ушли — на ту, что
      // была у открывшегося экрана, отменили — на свою.
      const back = fired ? (under?.scrollY ?? 0) : scrollY
      window.scrollTo(0, back)
      // Слой доков размораживаем ПОСЛЕ возврата прокрутки: sync() ставит его
      // top по scrollY, и разморозка до этого посадила бы его по старой.
      freezeDockLayer(false)
    },
  }
}

// ─── Жест ────────────────────────────────────────────────────────────────────

let installed = false

function install() {
  if (installed || typeof document === 'undefined') return
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

  const reset = () => {
    tracking = false
    captured = false
    stage = null
    friction = null
    past = false
    stageUp = false
  }

  document.addEventListener('touchstart', e => {
    if (stageUp) return // жест уже доигрывает — новый не начинаем
    reset()
    if (e.touches.length !== 1 || stack.length === 0) return
    const t = e.touches[0]
    if (t.clientX > EDGE) return
    tracking = true
    startX = t.clientX
    startY = t.clientY
    lastX = t.clientX
    lastT = e.timeStamp
    dx = 0
    speed = 0
    trigger = Math.max(MIN_TRIGGER, window.innerWidth * TRIGGER_RATIO)
  }, { passive: true })

  document.addEventListener('touchmove', e => {
    if (!tracking || e.touches.length !== 1) return
    const t = e.touches[0]
    dx = t.clientX - startX
    const dy = t.clientY - startY

    if (!captured) {
      // Намерение разбираем РОВНО ОДИН РАЗ — когда палец прошёл слоп. Раньше
      // судить не по чему, позже поздно: прокрутка уже началась бы.
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SLOP) return
      if (!(dx > 0 && Math.abs(dx) > Math.abs(dy) * DOMINANCE)) {
        // Это прокрутка. Отпускаем жест насовсем: пересматривать решение по
        // ходу нельзя, иначе оно снова становится гонкой.
        tracking = false
        return
      }
      captured = true
      stageUp = true
      stage = buildStage(underSnapshot())
      // Звук — канал вспомогательный: на iOS контекст бывает «перехвачен»
      // чужим воспроизведением, и его отказ НЕ должен ронять сам жест.
      try { friction = frictionStart() } catch { friction = null }
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
    const x = Math.max(0, dx >= 0 ? dx : dx * 0.25)
    stage?.set(x)
    friction?.move(Math.abs(inst), x / trigger)

    // Засечка на пороге — в обе стороны: человек должен чувствовать, где
    // «отпущу — уйдёт», не глядя на экран.
    const nowPast = x >= trigger
    if (nowPast !== past) {
      past = nowPast
      // Отдача — на самом жесте, а не внутри звука: если аудиоконтекст
      // недоступен, щелчок в палец на пороге всё равно обязан быть.
      haptic([6, 2, 3])
      friction?.detent()
    }
  }, { passive: false })

  const finish = async (cancelled: boolean) => {
    // Сцены нет — сбрасываем всегда. Иначе один прерванный жест (исключение
    // в доводке, перерисовка посреди анимации) оставлял бы stageUp взведённым,
    // и свайп умирал бы до перезагрузки страницы.
    if (!tracking || !captured) { if (!stage) reset(); return }
    tracking = false

    const x = Math.max(0, dx)
    const fired = !cancelled && stack.length > 0 && (x >= trigger || (speed > FLING && x > 24))
    const localStage = stage

    friction?.stop(fired)
    if (fired) haptic(12)

    await localStage?.settle(fired, Math.abs(speed))

    if (fired) {
      // Переход выполняем под уехавшей страницей: на экране сейчас снимок того
      // же самого предыдущего экрана, поэтому подмены не видно.
      // Снятый с полки снимок и становится «текущим»: это ровно тот экран,
      // который сейчас откроется, — и второй свайп подряд покажет верное.
      const revealed = history.pop() ?? null
      if (revealed) current = revealed
      returning = true
      stack[stack.length - 1]?.fire()
      // Эффекты монтирования React успевают до макрозадачи таймера.
      setTimeout(() => { returning = false }, 0)
    }

    // Даём React дорисовать живой экран и только потом снимаем слой.
    // Через setTimeout, а не rAF: в превью rAF не тикает (см. память проекта),
    // и страница осталась бы отодвинутой.
    const drop = () => {
      localStage?.destroy(fired)
      reset()
      scheduleCapture(500)
    }
    if (fired) setTimeout(drop, 80)
    else drop()
  }

  document.addEventListener('touchend', () => { void finish(false) }, { passive: true })
  document.addEventListener('touchcancel', () => { void finish(true) }, { passive: true })
}

// Слушатели и первый снимок ставим сразу при загрузке модуля, а не при первом
// экране с кнопкой «назад»: снимок нужен как раз ДО того, как с главной уйдут
// в урок. Пара заходов — экран на старте ещё показывает скелетоны.
if (typeof window !== 'undefined') {
  install()
  ;[900, 2600].forEach(ms => setTimeout(() => scheduleCapture(0), ms))
  // Прокрутили — снимок устарел: под пальцем показался бы список, отмотанный
  // к началу. capture:true — scroll не всплывает.
  window.addEventListener('scroll', () => scheduleCapture(600), { capture: true, passive: true })
  // Экран дорисовался (пришли данные, сменилась вкладка) — снимок устарел.
  // Без этого первый же свайп после запуска показывал бы под собой главную с
  // недогруженными карточками: съёмка на старте застаёт её полупустой.
  if (typeof MutationObserver === 'function') {
    const root = document.getElementById('root')
    if (root) new MutationObserver(() => scheduleCapture(700)).observe(root, {
      childList: true, subtree: true, characterData: true,
    })
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) scheduleCapture(400)
  })
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

    // Экран открылся — значит, снимок предыдущего и есть «то, что под ним».
    // Один и тот же снимок дважды не кладём: две раскладки в DOM (настольная и
    // мобильная) регистрируют по обработчику на один экран.
    if (!returning && current && history[history.length - 1] !== current) {
      history.push(current)
      if (history.length > HISTORY_MAX) history.shift()
    }
    scheduleCapture(500)

    const entry: Entry = { fire: () => fn.current?.() }
    stack.push(entry)

    return () => {
      const i = stack.indexOf(entry)
      if (i >= 0) stack.splice(i, 1)
      scheduleCapture(500)
      // Вернулись на корневой экран (кнопкой, а не жестом) — глубину забываем.
      // Проверка отложенная: при смене экрана стек на миг пустеет между
      // размонтированием старого и монтированием нового.
      setTimeout(() => { if (stack.length === 0) history.length = 0 }, 0)
    }
  }, [active])
}
