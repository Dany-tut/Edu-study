import { useEffect, type RefObject } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Замок скролла на время открытого меню
//
// ЗАЧЕМ. Список висит абсолютом над содержимым, и колесо мыши под ним крутило
// фон: меню уезжало вместе с триггером, а страница под ним меняла вид, хотя
// человек ещё выбирает. Пока меню открыто, фон стоит.
//
// ПОЧЕМУ НЕ overflow: hidden. Страница кабинета скроллится не окном, а
// внутренней колонкой (DashboardPage: overflowY на <main>), плюс у рейла
// тренажёра свой скролл — «заморозить body» тут просто ни на что не влияет.
// А убрать полосу прокрутки у колонки нельзя: содержимое дёрнется на её
// ширину в момент открытия. Поэтому глушим сами события.
// ─────────────────────────────────────────────────────────────────────────────

const SCROLL_KEYS = new Set([
  'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ',
])

/** Ввод, у которого свои значения этих клавиш: там глушить нельзя. */
function isTyping(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null
  if (!node || !node.tagName) return false
  const tag = node.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable
}

/** Может ли `el` сам прокрутиться на (dx, dy) — есть ли у него куда ехать. */
function canScrollBy(el: HTMLElement, dx: number, dy: number): boolean {
  const style = getComputedStyle(el)
  const scrollsY = /(auto|scroll|overlay)/.test(style.overflowY)
  const scrollsX = /(auto|scroll|overlay)/.test(style.overflowX)
  if (dy !== 0 && scrollsY) {
    if (dy > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true
    if (dy < 0 && el.scrollTop > 0) return true
  }
  if (dx !== 0 && scrollsX) {
    if (dx > 0 && el.scrollLeft + el.clientWidth < el.scrollWidth - 1) return true
    if (dx < 0 && el.scrollLeft > 0) return true
  }
  return false
}

/**
 * Пока `active`, фон не скроллится ни колесом, ни пальцем, ни клавишами.
 *
 * @param inside Само меню — внутри него скролл остаётся живым (длинный список
 *   со своим `overflowY`). Но только пока ему есть куда ехать: жест, который
 *   меню уже не может принять (список короткий или упёрся в край), глушится —
 *   иначе браузер передаёт его дальше, и на iOS едет страница под окном.
 *   `overscrollBehavior: 'contain'` этого не спасает: у списка без переполнения
 *   Safari его не применяет.
 */
export function useScrollLock(active: boolean, inside?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!active) return

    // Жест внутри меню пропускаем, если хоть один скроллер от цели до самого
    // меню способен сдвинуться в эту сторону.
    const inBox = (target: EventTarget | null): target is Node => {
      const box = inside?.current
      return !!box && target instanceof Node && box.contains(target)
    }
    const allowed = (target: EventTarget | null, dx: number, dy: number) => {
      const box = inside?.current
      if (!box || !inBox(target)) return false
      let el: HTMLElement | null = target instanceof HTMLElement ? target : target.parentElement
      while (el) {
        if (canScrollBy(el, dx, dy)) return true
        if (el === box) break
        el = el.parentElement
      }
      return false
    }

    const onWheel = (e: WheelEvent) => { if (!allowed(e.target, e.deltaX, e.deltaY)) e.preventDefault() }

    // У touchmove нет дельты — считаем её от прошлого положения пальца.
    // Палец вниз — содержимое едет вверх, поэтому знак обратный.
    let lastX = 0
    let lastY = 0
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      lastX = e.touches[0].clientX
      lastY = e.touches[0].clientY
    }
    // Два пальца — это зум, а не прокрутка: щипок оставляем.
    const onTouch = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      const { clientX, clientY } = e.touches[0]
      const dx = lastX - clientX
      const dy = lastY - clientY
      lastX = clientX
      lastY = clientY
      if (dx === 0 && dy === 0) return
      // Уже начатую прокрутку iOS не даёт отменить (cancelable = false) —
      // тогда и пытаться незачем.
      if (e.cancelable && !allowed(e.target, dx, dy)) e.preventDefault()
    }
    // Внутри меню клавиши свои: пробел нажимает строку списка, стрелки бегают
    // по ней. Глушим только то, что ушло бы в фон.
    const onKey = (e: KeyboardEvent) => {
      if (SCROLL_KEYS.has(e.key) && !inBox(e.target) && !isTyping(e.target)) e.preventDefault()
    }

    // capture: слушаем раньше содержимого страницы; passive: false — иначе
    // preventDefault у wheel/touchmove браузер игнорирует.
    const opts = { capture: true, passive: false } as const
    window.addEventListener('wheel', onWheel, opts)
    // touchstart только запоминает палец — ему passive можно.
    window.addEventListener('touchstart', onTouchStart, { capture: true, passive: true })
    window.addEventListener('touchmove', onTouch, opts)
    window.addEventListener('keydown', onKey, opts)
    return () => {
      window.removeEventListener('wheel', onWheel, opts)
      window.removeEventListener('touchstart', onTouchStart, { capture: true })
      window.removeEventListener('touchmove', onTouch, opts)
      window.removeEventListener('keydown', onKey, opts)
    }
  }, [active, inside])
}
