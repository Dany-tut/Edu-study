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

/**
 * Пока `active`, фон не скроллится ни колесом, ни пальцем, ни клавишами.
 *
 * @param inside Само меню — внутри него скролл остаётся живым (длинный список
 *   со своим `overflowY`; ему нужен `overscrollBehavior: 'contain'`, иначе
 *   докрутив до края он потянет за собой фон).
 */
export function useScrollLock(active: boolean, inside?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!active) return

    const allowed = (target: EventTarget | null) => {
      const box = inside?.current
      return !!box && target instanceof Node && box.contains(target)
    }

    const onWheel = (e: WheelEvent) => { if (!allowed(e.target)) e.preventDefault() }
    // Два пальца — это зум, а не прокрутка: щипок оставляем.
    const onTouch = (e: TouchEvent) => { if (e.touches.length < 2 && !allowed(e.target)) e.preventDefault() }
    // Внутри меню клавиши свои: пробел нажимает строку списка, стрелки бегают
    // по ней. Глушим только то, что ушло бы в фон.
    const onKey = (e: KeyboardEvent) => {
      if (SCROLL_KEYS.has(e.key) && !allowed(e.target) && !isTyping(e.target)) e.preventDefault()
    }

    // capture: слушаем раньше содержимого страницы; passive: false — иначе
    // preventDefault у wheel/touchmove браузер игнорирует.
    const opts = { capture: true, passive: false } as const
    window.addEventListener('wheel', onWheel, opts)
    window.addEventListener('touchmove', onTouch, opts)
    window.addEventListener('keydown', onKey, opts)
    return () => {
      window.removeEventListener('wheel', onWheel, opts)
      window.removeEventListener('touchmove', onTouch, opts)
      window.removeEventListener('keydown', onKey, opts)
    }
  }, [active, inside])
}
