/**
 * Колесо мыши над шапкой таблицы листает таблицу вбок.
 *
 * Мышь шлёт только deltaY, поэтому широкие таблицы (журнал, табель, финансы,
 * админка) листались вбок лишь с Shift. Один слушатель на всё приложение,
 * без копий по экранам:
 * - срабатывает над `<thead>` или над элементом с `data-wheel-x-head`
 *   (шапка-сетка не на таблице);
 * - листает ближайшего предка с горизонтальной прокруткой;
 * - трекпад вбок (|deltaX| ≥ |deltaY|), Shift и Ctrl/⌘ (зум) остаются браузеру;
 * - у края таблицы жест не перехватывается: колесо прокручивает страницу;
 * - на тач-устройствах wheel не приходит — ничего не меняется. iPad с мышью
 *   получает то же поведение, что ПК.
 * Прокрутка идёт через scrollLeft, поэтому фейды SCROLL-01 обновляются сами.
 */
const SCROLLABLE = /^(auto|scroll)$/

function horizontalScroller(from: Element): HTMLElement | null {
  let el: HTMLElement | null = from.parentElement
  while (el && el !== document.body && el !== document.documentElement) {
    if (el.scrollWidth - el.clientWidth > 1 && SCROLLABLE.test(getComputedStyle(el).overflowX)) return el
    el = el.parentElement
  }
  return null
}

export function headerWheelStep(e: Pick<WheelEvent, 'deltaY' | 'deltaMode'>, width: number) {
  return e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? width : 1)
}

function onWheel(e: WheelEvent) {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.shiftKey || !e.deltaY) return
  if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return
  const target = e.target instanceof Element ? e.target : null
  const head = target?.closest('thead, [data-wheel-x-head]')
  if (!head) return
  const scroller = horizontalScroller(head)
  if (!scroller) return
  const max = scroller.scrollWidth - scroller.clientWidth
  const next = Math.max(0, Math.min(max, scroller.scrollLeft + headerWheelStep(e, scroller.clientWidth)))
  if (Math.abs(next - scroller.scrollLeft) < 0.5) return
  e.preventDefault()
  scroller.scrollLeft = next
}

let installed = false
export function installTableHeaderWheel() {
  if (installed || typeof window === 'undefined') return
  installed = true
  // Не capture: окна с блокировкой прокрутки (useScrollLock) и свои обработчики
  // экранов решают раньше, а этот слушатель уважает их preventDefault.
  window.addEventListener('wheel', onWheel, { passive: false })
}
