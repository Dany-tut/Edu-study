import { useEffect, useRef } from 'react'
import { frictionStart, haptic, type Friction } from './feedback'
import { captureScreen, paintSnapshot, STAGE_ATTR, type Snapshot } from './screenSnapshot'
import { freezeDockLayer, viewportGap } from './dockLayer'
import { markScrollSet } from './useNavCollapse'

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
 * Метка закреплённого элемента: `data-swipe-pin="top" | "bottom" | "dock"`.
 *
 * Помеченное на время жеста НЕ едет со страницей — оно стоит, а страница
 * проходит под ним. Нижняя навигация (`bottom`) одна и та же на всех экранах,
 * поэтому она просто стоит («карточка проходит под баром»). Верхние кнопки
 * (`top`) и ряд управления над навигацией (`dock`) у каждого экрана свои,
 * поэтому их две: копия уходящего экрана видна справа от стыка, копия
 * нижнего — слева, и на линии стыка одна сменяет другую.
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
/**
 * Ход стыка, за который таблетка успевает перетечь (px).
 *
 * Морф ведёт не общий ход страницы, а край карточки: отсчёт начинается,
 * когда карточка вышла из-под таблетки, и длится этот путь. На собственной
 * ширине кнопки (кружок 38px) смена читалась бы щелчком.
 */
const SEAM_SPAN = 150
/**
 * Где по таблетке проходит начало её хода (доля ширины от левого края).
 *
 * Не середина: широкий чип от неё трогался слишком поздно и потом спешил —
 * до края экрана ему оставалось всего полсотни пикселей. Четверть — край
 * карточки уже заметно зашёл под таблетку, но она ещё вся на виду.
 */
const SEAM_BITE = 0.25
/** Дальше этой доли ширины экрана таблетки в пару не сводятся. */
const DROP_REACH = 0.35
/**
 * И насколько далеко может разъехаться их КРАЙ, за который держится корпус.
 *
 * Центры у соседних шапок расходятся легко (у одной кнопка «назад», у другой
 * широкая таблетка), а вот край — общее поле в 16px, и он почти совпадает.
 * Если край далеко, перетекать некуда: корпус пролетел бы через полшапки к
 * чужому месту. Такая таблетка просто гаснет, а её сосед снизу открывается
 * вместе с экраном.
 */
const EDGE_REACH = 0.18
/** И насколько далеко по ВЕРТИКАЛИ: дальше — это уже соседняя строка шапки. */
const ROW_REACH = 26
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

  /**
   * Спрятать живую таблетку, запомнив её ПЕРВОЕ состояние.
   *
   * Один и тот же чип прячется несколько раз: при раздвоении у него две
   * пары. Вторая запись сохраняла как «исходное» уже `hidden`, и на возврате
   * чип оставался скрытым НАВСЕГДА — а следующий жест клонировал с него
   * пустышку. На экране это выглядело как пустой корпус и «работает через
   * раз».
   */
  const hidden = new Map<HTMLElement, string>()
  const hide = (el: HTMLElement) => {
    if (!hidden.has(el)) hidden.set(el, el.style.visibility)
    el.style.visibility = 'hidden'
  }
  /** Кадр морфа: стили элемента при ходе p (0 — уходящий экран, 1 — нижний). */
  type Morph = { el: HTMLElement; at(p: number): Record<string, string> }
  const morphs: Morph[] = []

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  /**
   * Перелить одно значение стиля в другое ПО ЧИСЛАМ.
   *
   * Тень и заливка у соседних таблеток разные, а корпус на экране должен быть
   * ОДИН и непрозрачный: два полупрозрачных стекла друг на друге дают просвет,
   * сквозь который виден нижний экран. Поэтому корпус не перекрашивается
   * подменой и не гасится — у него плавно едут числа: цвет заливки, смещения
   * и радиус тени. Формы не совпали (разное число слоёв) — переключаем на
   * половине хода, это редкий случай.
   */
  const mixStyle = (from: string, to: string, t: number) => {
    const fn = from.match(/-?\d*\.?\d+/g)
    const tn = to.match(/-?\d*\.?\d+/g)
    // Пустая строка — не значение: у отсоединённого узла вычисленных стилей
    // нет вовсе, и подмешивать её нельзя, иначе корпус остаётся ни с чем.
    if (!from) return to
    if (!to) return from
    if (!fn || !tn || fn.length !== tn.length) return t < 0.5 ? from : to
    let i = 0
    return from.replace(/-?\d*\.?\d+/g, () => {
      const v = lerp(Number(fn[i]), Number(tn[i]), t)
      i++
      return String(Math.round(v * 1000) / 1000)
    })
  }

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
   *
   * @param outer Наоборот — брать САМЫЕ ВНЕШНИЕ корпуса. Так устроен нижний
   *   док: у переключателя половин («Сцены ↔ Тексты») скруглены и стеклянная
   *   таблетка, и обе кнопки внутри неё. По правилу шапки корпус выпал бы из
   *   списка как обёртка — на экране остались бы стоять две кнопки без стекла,
   *   а само стекло уехало бы со страницей.
   */
  /**
   * Цвет виден: у `rgba(...)` с нулевой альфой красить нечем.
   *
   * Сравнивать со строкой `'rgba(0, 0, 0, 0)'` мало: прозрачная рамка стекла
   * приходит как `rgba(255, 255, 255, 0)` — тот же ноль, другая запись.
   */
  const solid = (c: string) => {
    const n = c.match(/-?\d*\.?\d+/g)
    return !!n && (n.length < 4 || Number(n[3]) > 0)
  }

  /**
   * Рисует ли узел КОРПУС: заливку, видимую рамку или тень.
   *
   * Рамку считаем по ШИРИНЕ и цвету, а не по стилю: сброс Tailwind ставит
   * всем узлам `border-style: solid` при нулевой ширине, и по стилю
   * «рисующим» выглядит даже пустой span.
   */
  const paints = (cs: CSSStyleDeclaration) => {
    const bw = parseFloat(cs.borderTopWidth)
    return solid(cs.backgroundColor)
      || (bw > 0 && solid(cs.borderTopColor))
      || cs.boxShadow !== 'none'
  }

  const chips = (root: ParentNode, outer = false) => {
    const all = Array.from(root.querySelectorAll<HTMLElement>('*')).filter(el => {
      if (!visible(el)) return false
      const cs = getComputedStyle(el)
      if (parseFloat(cs.borderTopLeftRadius) < 14) return false
      // Пустышка — не таблетка. По метке `data-swipe-pin` в шапку попадает и
      // невидимая область под палец (44px поверх кнопки колокольчика), и
      // круглые обёртки: скруглены, видимы, но не рисуют НИЧЕГО. Такая
      // забирала себе пару, а её «вид» — тайлвиндовский серый цвет рамки при
      // нулевой ширине — доставался корпусу настоящей кнопки. Проверка та же,
      // что у шапки без разметки (headerChips), — теперь общая.
      //
      // Именованная кнопка проходит и прозрачной: у переключателя курса фон
      // рисует отдельная едущая таблетка, а сам чипс прозрачный, — и без
      // исключения «назад» не находил, во что перетекать. Прозрачность тут не
      // помеха: к концу хода корпус и должен стать прозрачным, подложку
      // покажет нижний экран.
      return el.hasAttribute(MORPH_ATTR) || paints(cs)
    })
    return all
      .filter(el => (outer
        ? !all.some(other => other !== el && other.contains(el))
        : !all.some(other => other !== el && el.contains(other))))
      .sort((l, r) => l.getBoundingClientRect().left - r.getBoundingClientRect().left)
  }

  /**
   * Одна и та же таблетка по обе стороны стыка: то же место, тот же размер,
   * та же разметка.
   *
   * Разметку сверяем строкой, а не «на глаз по тексту»: у переключателя
   * половин текст один и тот же на обоих экранах, а подсвечена может быть
   * разная половина — такую пару перетекать НУЖНО.
   *
   * Две поправки к строке, обе про снимок:
   *   • `data-swipe-scroll` навешивает съёмка, чтобы вернуть прокрутку
   *     внутренним контейнерам (ряд чипсов дока — как раз такой);
   *   • пустой `style=""` остаётся от прошлого жеста: снятие слоя возвращает
   *     `visibility` в исходное пустое значение, и атрибут остаётся висеть.
   *     Без этой поправки приём работал бы ровно один раз — а дальше «через
   *     раз», самая дорогая порода багов в этом жесте.
   */
  const norm = (el: HTMLElement) => el.outerHTML
    .replace(/ data-swipe-scroll="[^"]*"/g, '')
    .replace(/ style=""/g, '')
  const near = (a: number, b: number) => Math.abs(a - b) <= 1
  const unchanged = (
    live: HTMLElement, twin: HTMLElement,
    ra: { left: number; top: number; w: number; h: number },
    rb: { left: number; top: number; w: number; h: number },
  ) => near(ra.left, rb.left) && near(ra.top, rb.top)
    && near(ra.w, rb.w) && near(ra.h, rb.h)
    && norm(live) === norm(twin)

  /**
   * Развести кнопки двух экранов в перетекающие пары.
   *
   * Сначала — именованные (исключения), потом остальные таблетки по порядку
   * встречи слева направо: первая с первой, вторая со второй. Лишние (у
   * одного экрана чипсов больше) остаются без пары и растворяются.
   */
  const pairMorphs = (fromChipsAll: HTMLElement[], toChipsAll: HTMLElement[]) => {
    if (fromChipsAll.length === 0) return
    const base = pinLayer.getBoundingClientRect()
    const rel = (el: HTMLElement) => {
      const b = el.getBoundingClientRect()
      return { left: b.left - base.left, top: b.top - base.top, w: b.width, h: b.height }
    }

    // [источник, цель, номер цели в группе]. Номер нужен потому, что одна
    // кнопка может делиться на несколько: у шапки урока справа одна дата, а
    // под ней — и уровень, и колокольчик.
    const pairs: [HTMLElement, HTMLElement, number][] = []
    const taken = new Set<HTMLElement>()
    // Именованные пары — исключения, разбираются первыми.
    for (const a of fromChipsAll) {
      const name = a.getAttribute(MORPH_ATTR)
      if (!name) continue
      const b = toChipsAll.find(el => el.getAttribute(MORPH_ATTR) === name && !taken.has(el))
      if (!b) continue
      pairs.push([a, b, 0])
      taken.add(a).add(b)
    }
    // ── Кто с кем ──
    //
    // По ближайшей: у каждой таблетки уходящего экрана партнёр — та, что
    // стоит к ней ближе всего по центру, и разбор идёт от самых близких пар
    // к дальним. Деление «левые к левым, правые к правым» по середине экрана
    // не годится: ширина таблетки зависит от содержимого (у курса — от
    // названия), и стоило ей смениться, как соседний чип переезжал через
    // середину и уводил пару себе — на экране «назад» превращалось в
    // «2 Lvl», а дата не менялась вовсе.
    //
    // Дальше DROP_REACH таблетки не сходятся: лучше пары нет, и обе просто
    // расходятся по прозрачности, чем тянуть кнопку через полшапки.
    const mid = (el: HTMLElement) => {
      const b = el.getBoundingClientRect()
      return b.left + b.width / 2
    }
    const fromChips = fromChipsAll.filter(el => !taken.has(el) && !pairs.some(([a]) => a.contains(el)))
    const toChips = toChipsAll.filter(el => !taken.has(el) && !pairs.some(([, b]) => b.contains(el)))
    const reach = W * DROP_REACH
    const edgeReach = W * EDGE_REACH
    // Край, за который держится корпус: у прижатой вправо — правый.
    const edge = (el: HTMLElement) => {
      const b = el.getBoundingClientRect()
      return mid(el) >= W / 2 ? b.right : b.left
    }
    // Вертикаль — жёстко: шапка бывает в две строки (у дрилла «назад» сверху,
    // название разбора под ним), и таблетка нижней строки уводила пару себе,
    // хотя по горизонтали стоит ровно под верхней.
    const midY = (el: HTMLElement) => {
      const b = el.getBoundingClientRect()
      return b.top + b.height / 2
    }
    const cand: { a: HTMLElement; b: HTMLElement; d: number }[] = []
    for (const a of fromChips) {
      const ea = edge(a)
      const ya = midY(a)
      for (const b of toChips) {
        const d = Math.abs(mid(a) - mid(b))
        if (d > reach) continue
        if (Math.abs(ea - edge(b)) > edgeReach) continue
        if (Math.abs(ya - midY(b)) > ROW_REACH) continue
        cand.push({ a, b, d })
      }
    }
    cand.sort((l, r) => l.d - r.d)
    // Цель занимается один раз, ИСТОЧНИК — сколько угодно: если под кнопкой
    // лежат две таблетки, она делится на две и каждая половина идёт в свою.
    // Раньше лишняя цель просто оставалась без пары, и дата «не превращалась».
    const groups = new Map<HTMLElement, HTMLElement[]>()
    for (const { a, b } of cand) {
      if (taken.has(b)) continue
      taken.add(b)
      const list = groups.get(a) ?? []
      list.push(b)
      groups.set(a, list)
    }
    for (const [a, list] of groups) list.forEach((b, i) => pairs.push([a, b, i]))

    // Геометрию снимаем ЗАРАНЕЕ, всю разом. Перенос первой же пары в
    // закреплённый слой вынимает таблетку из ряда, ряд схлопывается, и
    // следующая цель меряется уже на новом месте: колокольчик уезжал к левому
    // краю, а кнопка «морфилась» туда, где на экране ничего нет.
    const boxes = pairs.map(([a, b]) => ({ ra: rel(a), rb: rel(b) }))

    // Узлы снимка ТОЖЕ копируем, а не переносим. Снимок переиспользуется
    // (его раскладывают на каждом жесте), и вынутая таблетка пропадала из
    // него навсегда: со второго свайпа под кнопкой уже ничего не было, пара
    // не собиралась, и кнопка просто гасла пустым кружком.

    // Таблетки без пары тоже закрепляются: стоят на месте и гаснут, когда
    // стык проходит их середину. Иначе поведение зависело от того, нашёлся
    // ли двойник: не нашёлся — и кнопки просто уезжали со страницей, как
    // будто жест ничего не делает.
    for (const live of fromChips) {
      if (pairs.some(([a]) => a === live)) continue
      const ra = rel(live)
      if (!ra.w) continue
      const clone = live.cloneNode(true) as HTMLElement
      clone.style.visibility = ''
      clone.removeAttribute('id')
      clone.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'))
      place(clone, live.getBoundingClientRect(), zeroOrigin)
      hide(live)
      const inner = wrapKids(clone)
      const start = ra.left + ra.w * SEAM_BITE
      const span = Math.min(SEAM_SPAN, Math.max(8, W - start) * 0.85)
      const fade = (raw: number) => smooth(Math.min(1, Math.max(0, (raw * W - start) / span)))
      // Гаснет ВЕСЬ корпус, а не только содержимое. Пары нет — значит на месте
      // этой кнопки у нижнего экрана ничего нет, и пустая таблетка, повисшая
      // над чужим экраном, читается как мусор: на экране это был белый кружок
      // без стрелки.
      morphs.push({
        el: clone,
        at: raw => ({ opacity: String(1 - fade(raw)) }),
      }, {
        el: inner,
        at: raw => {
          const t = fade(raw)
          return {
            filter: `blur(${MORPH_BLUR * t}px)`,
            transform: `scale(${lerp(1, MORPH_SCALE, t)})`,
          }
        },
      })
    }

    for (let i = 0; i < pairs.length; i++) {
      const [live, twin, nth] = pairs[i]
      const { ra, rb } = boxes[i]
      if (!ra.w || !rb.w) continue

      // ── НЕ ИЗМЕНИЛОСЬ — ЗНАЧИТ, НИЧЕГО И НЕ ПРОИСХОДИТ ──
      //
      // Морф честно перетекал даже там, где с обеих сторон стоит ОДНА И ТА ЖЕ
      // таблетка: содержимое расходилось размытием и сходилось обратно. На
      // экране это читалось как «ряд над навигацией обновился» — мигание на
      // ровном месте. А ряд у соседних экранов чаще всего один и тот же
      // (предмет, половины режима, фильтры), и вести себя он должен как нижняя
      // навигация: просто стоять, пока страница проходит под ним.
      //
      // Одна копия в слой, обе стороны прячем, морфа нет вовсе.
      if (nth === 0 && unchanged(live, twin, ra, rb)) {
        const still = live.cloneNode(true) as HTMLElement
        still.style.visibility = ''
        still.removeAttribute('id')
        still.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'))
        place(still, live.getBoundingClientRect(), base)
        hide(live)
        hide(twin)
        continue
      }

      // Копия узла снимка, а не он сам: снимок раскладывается на каждом
      // жесте, и вынутая таблетка пропала бы из него навсегда.
      const b = twin.cloneNode(true) as HTMLElement
      b.style.visibility = ''
      b.removeAttribute('id')
      b.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'))
      hide(twin)

      // Копия, а не сам узел: живой принадлежит React и размонтируется
      // посреди жеста. Оригинал прячем — иначе он уедет со страницей и
      // таблетка задвоится.
      const a = live.cloneNode(true) as HTMLElement
      // Клон снимаем с уже спрятанного оригинала (при раздвоении — второй
      // раз), поэтому прячущий стиль с копии снимаем явно.
      a.style.visibility = ''
      a.removeAttribute('id')
      a.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'))
      hide(live)

      const ia = wrapKids(a)
      const ib = wrapKids(b)
      // Корпус на экране ОДИН — уходящей кнопки, и он всегда непрозрачен:
      // расхождение двух стёкол по прозрачности давало просвет, сквозь
      // который виден нижний экран. У нижней половины корпус снимаем, но
      // ЗАПОМНИВ его вид: в конце хода корпус обязан выглядеть ровно как
      // целевая таблетка, иначе на снятии слоя чипсы перерисовываются.
      // Вид целевой таблетки снимаем с ЖИВОГО узла снимка, а не с копии:
      // копия ещё не в документе, а у отсоединённого узла getComputedStyle
      // отдаёт пустые строки — корпус на середине хода терял заливку и
      // просвечивал.
      const look = getComputedStyle(twin)
      const skin = {
        background: look.backgroundColor,
        boxShadow: look.boxShadow,
        // ЦВЕТ РАМКИ БЕРЁМ, ТОЛЬКО ЕСЛИ ЦЕЛЬ ЕЁ РИСУЕТ. У узла с нулевой
        // шириной рамки цвет всё равно есть — сброс Tailwind оставляет свой
        // светло-серый, — и корпус, у которого рамка настоящая, перекрашивал
        // её в этот серый: на тёмной теме вокруг кнопки загорался светлый
        // ободок на ровном месте. Нет рамки у цели — уводим свою в прозрачную.
        borderColor: parseFloat(look.borderTopWidth) > 0 && solid(look.borderColor)
          ? look.borderColor
          : 'rgba(0, 0, 0, 0)',
      }
      // СНИМАТЬ — ЧЕРЕЗ `!important`, И ЭТО НЕ ПЕРЕСТРАХОВКА.
      //
      // У стеклянной таблетки размытие объявлено дважды: `backdrop-filter` и
      // `-webkit-backdrop-filter` (GlassPill в mobileChrome.tsx). Обычное
      // присваивание правит только первое, а второе остаётся и продолжает
      // РАБОТАТЬ: замер в браузере — после `style.backdropFilter = 'none'` и
      // даже после `setProperty('-webkit-backdrop-filter', 'none')`
      // вычисленное значение всё ещё `blur(20px) saturate(1.8)`; со ставкой
      // `important` — `none`.
      //
      // Цена ошибки видна с первого пикселя жеста: копия цели лежит ПОВЕРХ
      // уходящей таблетки и своим уцелевшим стеклом матирует её. Кнопка под
      // ним гаснет, а `saturate` тянет цвет — на тёмной теме таблетка сразу
      // окрашивается и обзаводится светлым краем, хотя ход ещё не начался.
      for (const prop of ['background', 'box-shadow', 'backdrop-filter', '-webkit-backdrop-filter']) {
        b.style.setProperty(prop, 'none', 'important')
      }
      b.style.setProperty('border', '0', 'important')

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

      // ── Ход СВОЕЙ таблетки ──
      //
      // Не общий ход страницы, а стык. Отсчёт — от СЕРЕДИНЫ таблетки: край
      // карточки дошёл до её половины — здесь она и начинает делиться и
      // перетекать. От левого края начинать нельзя (кнопка гасла бы, стоя
      // целиком на карточке), а от правого — поздно: широкий чип даты ждал
      // почти до конца свайпа и потом менялся впопыхах.
      //
      // Ход — SEAM_SPAN: на своей ширине кружок в 38px менялся бы щелчком.
      // Но не длиннее того, что осталось до края экрана: у таблетки, прижатой
      // вправо, карточка выходит из-под неё в самом конце, и полный ход она бы
      // не доиграла — на отпускании кнопка сменилась бы рывком.
      const start = ra.left + ra.w * SEAM_BITE
      // 0.85 остатка, а не весь: морф обязан ЗАКОНЧИТЬСЯ до того, как карточка
      // уйдёт с экрана. Иначе на отпускании кнопка досменивалась бы рывком уже
      // при снятии слоя.
      const span = Math.min(SEAM_SPAN, Math.max(8, W - start) * 0.85)
      const q = (p: number) => Math.min(1, Math.max(0, (p * W - start) / span))

      // Корпус обеих половин идёт по ОДНОЙ коробке — она и есть морф. Но
      // коробка НЕ ЕЗДИТ: она растёт и сжимается на своём месте, от своего
      // края. Пока левый и правый края интерполировались к чужим координатам,
      // таблетка пролетала через полэкрана к кнопке соседнего экрана — на
      // глаз это читалось как «прилетела откуда-то не пойми что». Края у
      // шапок общие (те же 16px полей), поэтому корпус и так приходит ровно
      // в коробку двойника.
      // Держится за свой край: прижатая влево — за левый, вправо — за правый.
      // Сам край при этом переезжает к краю цели, но это единицы пикселей у
      // общих полей шапки — и настоящий ход у отпочковавшейся половины,
      // которой надо отойти на место своей таблетки.
      const rightward = ra.left + ra.w / 2 >= W / 2
      const srcX = rightward ? ra.left + ra.w : ra.left
      const dstX = rightward ? rb.left + rb.w : rb.left
      const srcY = ra.top + ra.h / 2
      const dstY = rb.top + rb.h / 2
      const shell = (raw: number) => {
        const p = q(raw)
        const w = lerp(ra.w, rb.w, p)
        const h = lerp(ra.h, rb.h, p)
        const x = lerp(srcX, dstX, p)
        return {
          left: `${rightward ? x - w : x}px`,
          top: `${lerp(srcY, dstY, p) - h / 2}px`,
          width: `${w}px`,
          height: `${h}px`,
        }
      }
      morphs.push({ el: a, at: shell }, { el: b, at: shell })
      // Содержимое расходится: уходящее уплывает в размытие, приходящее из
      // него выступает. Сумма прозрачностей всегда единица — с перехлёстом
      // (уходящее гасло раньше, приходящее опаздывало) на середине хода
      // корпус стоял пустым, и морфа было не видно вовсе.
      // Прозрачность — на КОРПУСАХ (вместе с их тенью и стеклом), размытие и
      // масштаб — на содержимом. У отпочковавшейся половины уходящего
      // содержимого нет: оно живёт на первой, иначе стрелка двоилась бы.
      //
      // Отпочковавшаяся половина РОЖДАЕТСЯ, а не выезжает: заливка у неё сразу
      // полная, а недостающее добирается размытием — пока корпус ещё не набрал
      // плотность, он размыт, и таблетка словно лепится из первой. Полупрозрачный
      // корпус на её месте читался как чужая таблетка, проехавшая поверх.
      // Отпочковавшаяся половина РОЖДАЕТСЯ: заливку добирает быстро, а
      // недостающее держит размытие — иначе она читалась как чужая таблетка,
      // проехавшая поверх предыдущей.
      const born = (raw: number) => smooth(Math.min(1, q(raw) * 2.4))
      const skinFrom = {
        background: getComputedStyle(a).backgroundColor,
        boxShadow: getComputedStyle(a).boxShadow,
        borderColor: getComputedStyle(a).borderColor,
      }
      morphs.push({
        el: a,
        at: raw => {
          const t = smooth(q(raw))
          return {
            opacity: String(nth > 0 ? born(raw) : 1),
            filter: nth > 0 ? `blur(${MORPH_BLUR * (1 - born(raw))}px)` : 'none',
            background: mixStyle(skinFrom.background, skin.background, t),
            boxShadow: mixStyle(skinFrom.boxShadow, skin.boxShadow, t),
            borderColor: mixStyle(skinFrom.borderColor, skin.borderColor, t),
          }
        },
      }, {
        el: ia,
        at: raw => {
          const t = nth > 0 ? 1 : smooth(q(raw))
          return {
            opacity: String(1 - t),
            filter: `blur(${MORPH_BLUR * t}px)`,
            transform: `scale(${lerp(1, MORPH_SCALE, t)})`,
          }
        },
      }, {
        el: ib,
        at: raw => {
          const t = smooth(q(raw))
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
  /**
   * Прозрачность СО ВСЕЙ ЦЕПОЧКОЙ предков.
   *
   * У гаснущей шапки прозрачность стоит на строке, а не на кнопках внутри: у
   * самой таблетки `opacity` честная единица. Пока считалась только она,
   * призрак из уходящей шапки проходил как живой и вешался в слой — пустая
   * таблетка посреди экрана и «раз через раз работает».
   */
  const alpha = (el: HTMLElement) => {
    let a = 1
    for (let n: HTMLElement | null = el; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n)
      if (cs.visibility === 'hidden' || cs.display === 'none') return 0
      a *= Number(cs.opacity)
      if (a < 0.01) return 0
    }
    return a
  }

  const visible = (el: HTMLElement) => {
    const box = el.getBoundingClientRect()
    if (!box.width || !box.height) return false
    // Порог высокий: то, что наполовину растворилось, — это уходящий двойник,
    // а не то, на что смотрит человек.
    return alpha(el) > 0.6
  }

  /**
   * САМЫЙ видимый элемент по селектору, а не первый попавшийся.
   *
   * У урока две шапки разом — строка в потоке и её докнутый двойник, — и в
   * момент докования обе живы: одна гаснет, другая проявляется. Пока брался
   * первый попавшийся, в слой попадали обе: шеврон исчезал ещё до стыка,
   * вторая таблетка проявлялась сама собой, а на подходе стыка уже ничего не
   * происходило. Берём ту, что сейчас плотнее, и ровно одну.
   */
  const zeroOrigin = { left: 0, top: 0 }

  /**
   * Шапка экрана БЕЗ разметки.
   *
   * Метку `data-swipe-pin` носят не все экраны, а поведение должно быть
   * одинаковым везде. Признаки шапки: таблетка стоит в верхней полосе экрана,
   * невысокая и лежит в поднятом слое (fixed/absolute/sticky где-то по цепочке
   * родителей) — то есть плавает над содержимым, а не едет с ним. Содержимое
   * страницы под это не подходит и остаётся при странице.
   */
  const HEADER_BAND = 120
  const HEADER_MAX_H = 64
  const floats = (el: HTMLElement) => {
    for (let n: HTMLElement | null = el, i = 0; n && i < 8; n = n.parentElement, i++) {
      const pos = getComputedStyle(n).position
      if (pos === 'fixed' || pos === 'absolute' || pos === 'sticky') return true
    }
    return false
  }
  const headerChips = (scope: ParentNode, top0 = 0) => {
    // Запрет «не брать из снимка» нужен, когда шапку ищут на ЖИВОМ экране:
    // снимок лежит в том же документе, и без него мы хватали бы его узлы. Но
    // когда ищем шапку В САМОМ снимке, тот же запрет выбрасывал всё подряд, и
    // «К полкам» не находила, во что перетекать.
    const inSnapshot = wrap.contains(scope as Node)
    // Сначала геометрия, и только для выживших — стили: снимать computed style
    // со всего дерева на старте жеста нельзя, это те самые кадры, за которые
    // палец уже уехал.
    const near: HTMLElement[] = []
    for (const el of Array.from(scope.querySelectorAll<HTMLElement>('*'))) {
      const b = el.getBoundingClientRect()
      if (!b.width || !b.height || b.height > HEADER_MAX_H) continue
      if (b.bottom - top0 < 0 || b.top - top0 >= HEADER_BAND) continue
      if (pinLayer.contains(el)) continue
      if (!inSnapshot && wrap.contains(el)) continue
      near.push(el)
    }
    const found = near.filter(el => {
      const cs = getComputedStyle(el)
      if (parseFloat(cs.borderTopLeftRadius) < 14) return false
      // Пустышка (невидимая область касания, распорка) — не таблетка: она
      // ничего не рисует, а закрепить её значит повесить на экран пустоту.
      return paints(cs) && visible(el) && floats(el)
    })
    return found
      .filter(el => !found.some(other => other !== el && other.contains(el)))
      .sort((l, r) => l.getBoundingClientRect().left - r.getBoundingClientRect().left)
  }

  const densest = (found: HTMLElement[]) => {
    if (found.length < 2) return found[0] ?? null
    const rank = (el: HTMLElement) => {
      const b = el.getBoundingClientRect()
      return alpha(el) * 1e6 + b.width * b.height
    }
    return found.reduce((best, el) => (rank(el) > rank(best) ? el : best))
  }
  const pickVisible = (scope: ParentNode, sel: string) =>
    densest(Array.from(scope.querySelectorAll<HTMLElement>(sel)).filter(visible))

  const zero = { left: 0, top: 0 }
  // По одной живой шапке на вид: `pickVisible` уже отбирает самую плотную, а
  // прямой перебор всех совпадений вешал в слой ещё и ту, что в этот миг
  // гаснет.
  // Копии из снимка и из уже собранного слоя — не исходники.
  const alive = Array.from(document.querySelectorAll<HTMLElement>(`[${PIN_ATTR}]`))
    .filter(el => !wrap.contains(el) && !pinLayer.contains(el) && visible(el))
  const kinds = new Set(alive.map(el => el.getAttribute(PIN_ATTR) || ''))
  for (const kind of kinds) {
    const live = densest(alive.filter(el => el.getAttribute(PIN_ATTR) === kind))
    if (!live) continue
    const twin = pickVisible(underEl, `[${PIN_ATTR}="${kind}"]`)

    // Шапка и нижний док разбираются отдельно, ниже: там стоят не полосы
    // целиком, а таблетки — они у каждого экрана свои.
    if (kind === 'top' || kind === 'dock') continue

    // Нижний бар — целиком: он один и тот же на всех экранах.
    const box = live.getBoundingClientRect()
    const clone = live.cloneNode(true) as HTMLElement
    clone.removeAttribute('id')
    clone.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'))
    place(clone, box, zeroOrigin)
    hide(live)
    // Двойник из снимка только двоился бы. Прячем, а НЕ удаляем: снимок
    // раскладывается снова на следующем жесте, и удалённый бар пропал бы из
    // него навсегда.
    if (twin) hide(twin)
  }


  // ── Шапки ────────────────────────────────────────────────────────────────
  // Шапку НЕ закрепляем целиком: закреплённая вставала поперёк стыка —
  // заголовок урока тянулся сразу через оба экрана. Стоят и перетекают только
  // таблетки; всё остальное едет со страницей, как ехало. Список берём по
  // метке, а где метки нет — по виду (см. headerChips), чтобы жест вёл себя
  // одинаково на любом экране.
  const liveTop = densest(alive.filter(el => el.getAttribute(PIN_ATTR) === 'top'))
  const underTop = pickVisible(underEl, `[${PIN_ATTR}="top"]`)
  const underBase = underEl.getBoundingClientRect()
  // Метка сильнее автопоиска, но только пока под ней что-то есть: на полках
  // помеченная шапка экрана пустая (её содержимое уехало в нижний док), и
  // пустая метка перебивала поиск — «К полкам» не находила, во что перетекать.
  const pick = (marked: HTMLElement | null, auto: () => HTMLElement[]) => {
    const found = marked ? chips(marked) : []
    return found.length ? found : auto()
  }
  const liveChips = pick(liveTop, () => headerChips(document.body))
  const underChips = pick(underTop, () => headerChips(underEl, underBase.top))
  pairMorphs(liveChips, underChips)

  // ── Нижний док ───────────────────────────────────────────────────────────
  // Ряд управления над навигацией (предмет, половины режима, фильтры) стоит
  // ровно так же, как сама навигация: страница проходит под ним, а не тащит
  // его за собой. Пока он ехал со страницей, на экране было ДВА ряда разом —
  // уезжающий и тот, что на снимке нижнего экрана.
  //
  // Но не целиком, как навигацию: она одна на все экраны, а в доке у каждого
  // экрана свои кнопки. Поэтому здесь то же перетекание таблеток, что в шапке.
  //
  // И берём ВСЕ помеченные ряды, а не самый плотный (как у шапки): у шапки
  // двойник — это она же в другом состоянии, одна из двух лишняя, а внизу
  // рядов честно бывает несколько разом — над доком управления стоит ещё
  // плеер, и он такая же стоящая полоса.
  const dockChips = (rows: HTMLElement[]) => rows.flatMap(el => chips(el, true))
  const liveDock = dockChips(alive.filter(el => el.getAttribute(PIN_ATTR) === 'dock'))
  const underDock = dockChips(
    Array.from(underEl.querySelectorAll<HTMLElement>(`[${PIN_ATTR}="dock"]`)).filter(visible),
  )
  pairMorphs(liveDock, underDock)

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

    // Закреплённое стоит на месте — но перетекает: таблетки уходящего экрана
    // тянутся в таблетки нижнего тем же ходом, что и страница.
    setMorphs(p)
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
        // Морф ведёт стык, а не общий ход, — по ходу страницы он нелинеен, и
        // двух кадров мало: доводка срезала бы угол. Раскладываем на выборку.
        ...morphs.map(m => m.el.animate(
          Array.from({ length: 9 }, (_, i) => m.at(lerp(pFrom, pTo, i / 8))),
          opts,
        )),
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
      hidden.forEach((vis, el) => { el.style.visibility = vis })
      // cssText целиком: разом снимает и transform, и заморозку корня, и
      // z-index — ровно то, что было до жеста.
      movers.forEach(({ el, css }) => { el.style.cssText = css })
      if (gap) document.body.style.cssText = bodyCss
      if (shifted) shifted.style.cssText = shiftedCss
      // Прокрутку возвращаем уже разморозенному документу: ушли — на ту, что
      // была у открывшегося экрана, отменили — на свою.
      const back = fired ? (under?.scrollY ?? 0) : scrollY
      // Отметка «это не палец»: без неё нижняя навигация принимает возврат
      // прокрутки за прокрутку вниз и сворачивается в мини ровно на выходе
      // из экрана — человек не листал ничего (lib/useNavCollapse.ts).
      markScrollSet(window, back)
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
