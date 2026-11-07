// ─────────────────────────────────────────────────────────────────────────────
// Мягкий край у ВСЕХ внутренних областей прокрутки — только iPhone и iPad
// (lib/platform.ts, IS_IOS). Android и ПК остаются на фейдах SCROLL-01.
//
// Ряды чипов, ленты карточек, списки в шторках сделаны в десятках мест и
// разными способами (useScrollFades, fadeMask, ScrollFade, свои маски, а
// кое-где фейда нет вовсе). Поэтому край ставится не в каждом компоненте, а
// здесь: наблюдатель находит любую переполненную область с overflow auto/scroll
// и кладёт рядом с ней прозрачный слой с прогрессивным размытием
// (components/SoftEdge.tsx — тот же рецепт) у тех краёв, за которыми есть
// содержимое. Существующие маски остаются: контент у края и растворяется, и
// размывается — как scroll edge effect «soft» в iOS 26.
//
// СЛОЙ — СОСЕД, А НЕ РЕБЁНОК. Внутри области он прокручивался бы вместе с
// содержимым. Сосед с position:absolute имеет тот же блок-контейнер, что и
// сама область, поэтому её offsetLeft/offsetTop — готовые координаты, а
// обрезка предками у них общая (ряд, ушедший под шапку, не вылезает поверх).
//
// Главные прокрутки экрана сюда не входят: у MobileScreen свой край
// ([data-mobile-scroll]), у документа — WindowSoftEdges. Поля ввода тоже.
// ─────────────────────────────────────────────────────────────────────────────

const LAYERS = [1, 3, 6, 10]
const OUT = 24 // px, на сколько полоса заходит за видимую область
const SETTLE = 5 // px, за которые размытие гаснет у границы области
const RAMP = 30 // px прокрутки, за которые край нарастает полностью
const EDGE_ATTR = 'data-soft-edge-for'
const OWN_MASK = 'data-soft-edge-mask'

type Side = 'top' | 'bottom' | 'left' | 'right'
type Entry = { overlay: HTMLDivElement; bands: Record<Side, HTMLDivElement>; ro: ResizeObserver; onScroll: () => void }

const tracked = new Map<HTMLElement, Entry>()
let seq = 0

function isPageScroller(el: HTMLElement) {
  return el === document.documentElement || el === document.body || el === document.scrollingElement
    || el.hasAttribute('data-mobile-scroll')
}

function skip(el: HTMLElement) {
  // fixed-область вне потока: у соседа-слоя был бы другой блок-контейнер.
  return isPageScroller(el) || getComputedStyle(el).position === 'fixed' || el.isContentEditable
    || el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement || el instanceof HTMLSelectElement
    || !!el.closest('[data-soft-edge],[data-no-soft-edge]')
}

function scrollable(el: HTMLElement) {
  const c = getComputedStyle(el)
  const x = /auto|scroll/.test(c.overflowX) && el.scrollWidth > el.clientWidth + 1
  const y = /auto|scroll/.test(c.overflowY) && el.scrollHeight > el.clientHeight + 1
  return { x, y }
}

function makeBand(): HTMLDivElement {
  const band = document.createElement('div')
  band.style.cssText = `position:absolute;pointer-events:none;opacity:0;transition:opacity 160ms linear;`
  LAYERS.forEach(blur => {
    const layer = document.createElement('div')
    layer.style.cssText = `position:absolute;inset:0;backdrop-filter:blur(${blur}px);-webkit-backdrop-filter:blur(${blur}px);mask-composite:intersect;-webkit-mask-composite:source-in;`
    band.appendChild(layer)
  })
  return band
}

/** Маски слоёв в точных px: WebKit у backdrop-слоёв не гасил calc()-точки,
 *  и на границе области оставалась ступенька. */
function maskBand(band: HTMLDivElement, side: Side, along: number, cross: number) {
  const key = `${along}x${cross}`
  if (band.dataset.size === key) return
  band.dataset.size = key
  const toward = side === 'top' ? 'to top' : side === 'bottom' ? 'to bottom' : side === 'left' ? 'to left' : 'to right'
  const across = side === 'top' || side === 'bottom' ? 'to right' : 'to bottom'
  const total = cross + 2 * OUT
  const settle = Math.min(SETTLE, along / 2)
  ;[...band.children].forEach((child, i) => {
    // Ступени радиуса — по видимой части (от внутренней границы полосы к краю);
    // у самой границы области размытие сходит на нет.
    const start = Math.min(along * (i / LAYERS.length), along - settle)
    const full = Math.min(along * ((i + 1) / LAYERS.length), along - settle)
    const mask = `linear-gradient(${toward}, transparent ${start}px, #000 ${Math.max(full, start + 1)}px, #000 ${along - settle}px, transparent ${along}px), `
      + `linear-gradient(${across}, transparent ${OUT}px, #000 ${OUT + SETTLE}px, #000 ${total - OUT - SETTLE}px, transparent ${total - OUT}px)`
    const st = (child as HTMLElement).style
    st.setProperty('mask-image', mask)
    st.setProperty('-webkit-mask-image', mask)
  })
}

function sync(el: HTMLElement, e: Entry) {
  if (!el.isConnected || !el.parentElement) return untrack(el)
  // React мог переставить узлы: слой всегда стоит сразу за своей областью.
  if (el.nextElementSibling !== e.overlay) el.after(e.overlay)
  const { x, y } = scrollable(el)
  const w = el.clientWidth, h = el.clientHeight
  const o = e.overlay.style
  o.left = `${el.offsetLeft + el.clientLeft}px`
  o.top = `${el.offsetTop + el.clientTop}px`
  o.width = `${w}px`
  o.height = `${h}px`
  const q = (v: number) => Math.round(Math.min(1, Math.max(0, v / RAMP)) * 20) / 20
  const rtl = getComputedStyle(el).direction === 'rtl'
  const left = rtl ? el.scrollWidth - w + el.scrollLeft : el.scrollLeft
  const amount: Record<Side, number> = {
    top: y ? q(el.scrollTop) : 0,
    bottom: y ? q(el.scrollHeight - h - el.scrollTop) : 0,
    left: x ? q(left) : 0,
    right: x ? q(el.scrollWidth - w - left) : 0,
  }
  const bandX = Math.min(36, w / 5), bandY = Math.min(36, h / 5)
  // Своего растворения у области нет (а SCROLL-01 его требует) — ставим своё,
  // иначе размытие кончалось бы на границе области резкой линией.
  if (el.hasAttribute(OWN_MASK)) {
    const ramp = (dir: string, a: number, b: number, size: number) =>
      `linear-gradient(${dir}, rgba(0,0,0,${1 - a}), #000 ${size}px, #000 calc(100% - ${size}px), rgba(0,0,0,${1 - b}))`
    const masks = [y && ramp('to bottom', amount.top, amount.bottom, bandY), x && ramp('to right', amount.left, amount.right, bandX)].filter(Boolean) as string[]
    const value = masks.length ? masks.join(', ') : 'none'
    el.style.setProperty('mask-image', value)
    el.style.setProperty('-webkit-mask-image', value)
    el.style.setProperty('-webkit-mask-composite', 'source-in')
    el.style.setProperty('mask-composite', 'intersect')
  }
  for (const side of ['top', 'bottom', 'left', 'right'] as Side[]) {
    const b = e.bands[side].style
    const horizontal = side === 'left' || side === 'right'
    // WebKit на границе backdrop-filter подмешивает пустоту — у края полосы
    // проступала тонкая линия. Полоса выходит за область на OUT с наружной
    // стороны и с обоих концов, а маски гасят её ровно на границе области:
    // край размытия оказывается снаружи и невидим.
    const along = horizontal ? bandX : bandY
    b.top = side === 'bottom' ? `${h - bandY}px` : side === 'top' ? `${-OUT}px` : `${-OUT}px`
    b.left = side === 'right' ? `${w - bandX}px` : side === 'left' ? `${-OUT}px` : `${-OUT}px`
    b.width = horizontal ? `${along + OUT}px` : `${w + 2 * OUT}px`
    b.height = horizontal ? `${h + 2 * OUT}px` : `${along + OUT}px`
    b.opacity = String(amount[side])
    if (amount[side] > 0) maskBand(e.bands[side], side, along, horizontal ? h : w)
  }
}

function track(el: HTMLElement) {
  const overlay = document.createElement('div')
  overlay.setAttribute('data-soft-edge', 'inner')
  overlay.setAttribute(EDGE_ATTR, String(++seq))
  overlay.setAttribute('aria-hidden', 'true')
  // Без overflow:hidden: WebKit режет по этой рамке и то, что размывает, —
  // у границы выходил ореол-линия. Всё, что за пределами области, и так
  // погашено масками полос (они кончаются ровно на её границе).
  overlay.style.cssText = 'position:absolute;pointer-events:none;z-index:1;'
  const bands = { top: makeBand(), bottom: makeBand(), left: makeBand(), right: makeBand() }
  Object.values(bands).forEach(b => overlay.appendChild(b))
  el.after(overlay)
  const c = getComputedStyle(el)
  if ((c.webkitMaskImage || c.maskImage || 'none') === 'none') el.setAttribute(OWN_MASK, '')
  let frame = 0
  const onScroll = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; const e = tracked.get(el); if (e) sync(el, e) }) }
  const ro = new ResizeObserver(onScroll)
  ro.observe(el)
  if (el.firstElementChild) ro.observe(el.firstElementChild)
  el.addEventListener('scroll', onScroll, { passive: true })
  const entry: Entry = { overlay, bands, ro, onScroll }
  tracked.set(el, entry)
  sync(el, entry)
}

function untrack(el: HTMLElement) {
  const e = tracked.get(el)
  if (!e) return
  e.ro.disconnect()
  el.removeEventListener('scroll', e.onScroll)
  e.overlay.remove()
  if (el.hasAttribute(OWN_MASK)) {
    el.removeAttribute(OWN_MASK)
    for (const p of ['mask-image', '-webkit-mask-image', 'mask-composite', '-webkit-mask-composite']) el.style.removeProperty(p)
  }
  tracked.delete(el)
}

function scan() {
  for (const [el, e] of tracked) sync(el, e)
  for (const el of document.body.querySelectorAll<HTMLElement>('*')) {
    if (tracked.has(el) || el.hasAttribute('data-soft-edge')) continue
    // Дешёвая проверка до getComputedStyle: переполнена ли вообще.
    if (el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1) continue
    if (el.clientWidth < 24 || el.clientHeight < 16 || skip(el)) continue
    const { x, y } = scrollable(el)
    if (x || y) track(el)
  }
}

export function startSoftEdges() {
  // Не debounce, а редкий тик: анимации меняют DOM непрерывно, и сброс
  // таймера на каждой мутации не дал бы сканеру запуститься вовсе.
  let timer = 0
  const schedule = () => { if (timer) return; timer = window.setTimeout(() => { timer = 0; scan() }, 250) }
  // Наши же слои тоже мутации — их не считаем, иначе сканер будил бы себя.
  new MutationObserver(records => {
    if (records.every(r => r.target instanceof Element && r.target.closest('[data-soft-edge]'))) return
    schedule()
  }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] })
  // Прокрутка внутренней области, которую сканер ещё не видел (выросла без мутаций).
  document.addEventListener('scroll', e => {
    const el = e.target
    if (el instanceof HTMLElement && !tracked.has(el)) schedule()
  }, { capture: true, passive: true })
  window.addEventListener('resize', schedule)
  schedule()
}
