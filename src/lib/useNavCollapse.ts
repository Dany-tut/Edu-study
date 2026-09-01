import { useEffect, useState } from 'react'

// Collapses the mobile bottom nav on scroll DOWN and restores it on scroll UP:
// the labels fade out and the dock shrinks a touch, then everything comes back
// when the user scrolls back up (or reaches the top). A capture-phase scroll
// listener catches whichever element is actually scrolling — the window or any
// inner scroll container the mobile screens use — so it works everywhere the
// nav is mounted without each page having to wire it up.

// ─────────────────────────────────────────────────────────────────────────────
// БАР СЛУШАЕТСЯ ПАЛЬЦА, А НЕ ПРИЛОЖЕНИЯ.
//
// Прокрутку двигает не только человек. Возврат назад — жестом или кнопкой —
// ставит открывшемуся экрану ЕГО прокрутку: `window.scrollTo` в конце жеста
// (lib/useSwipeBack.ts) и `box.scrollTop` доводки места (MobileScreen.tsx).
// Для слушателя это обычное «пролистал вниз» на сотни пикселей разом, и бар,
// развёрнутый на открытой карточке, сворачивался в мини ровно в тот момент,
// когда экран возвращался на место: человек не листал НИЧЕГО, а навигация
// уезжала.
//
// Поэтому состояние меняет только то, что похоже на палец:
//   • прыжок больше JUMP за одно событие пальцем не делается — это подстановка
//     прокрутки, и она лишь переносит точку отсчёта;
//   • первое событие незнакомой панели прокрутки — тоже только отметка. Экран
//     после возврата монтируется заново, и его коробка прокрутки — новая:
//     считать от нуля значило бы принять восстановленное место за прокрутку на
//     всю его глубину.
//
// Разворачиваться это не мешает: у верхнего края (y <= 4) бар разворачивается
// всегда — новый экран открывается сверху и обязан показать навигацию целой.
// Так возврат назад СОХРАНЯЕТ то состояние, из которого экран уходил.
// ─────────────────────────────────────────────────────────────────────────────

/** Прыжок за одно событие, которого палец не делает (px). */
const JUMP = 160

/**
 * Где каждая панель прокрутки стояла в прошлый раз.
 *
 * Карта общая на всё приложение, а не своя у каждого вызова хука: он живёт
 * сразу в нескольких компонентах (навигация, док, плеер), и своя точка
 * отсчёта у каждого означала бы, что док, смонтированный позже соседей,
 * принимает за прыжок первое же обычное событие.
 */
const lastY = new WeakMap<object, number>()

/** Ключ в карте: у окна это его панель прокрутки, у контейнера — он сам. */
const scrollKey = (target: Element | Window | null): object =>
  (target && target !== window ? target : document.scrollingElement) ?? window

/**
 * «Это не палец»: сдвинуть точку отсчёта перед подстановкой прокрутки.
 *
 * Порог JUMP ловит подстановку по размеру прыжка, но доводка места
 * (MobileScreen.tsx) ставит прокрутку НЕ разом: содержимое приезжает частями,
 * и место догоняется шагами — каждый сам по себе на палец похож. Тот, кто
 * прокрутку ставит, знает про себя точно, поэтому просто говорит об этом.
 */
export function markScrollSet(target: Element | Window | null, y: number) {
  lastY.set(scrollKey(target), Math.max(0, Math.round(y)))
}

export function useNavCollapse(threshold = 6) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const onScroll = (e: Event) => {
      const t = e.target as HTMLElement | Document | Window
      const el = t === document || t === window
        ? (document.scrollingElement as HTMLElement | null)
        : (t as HTMLElement)
      const raw = t === document || t === window
        ? window.scrollY
        : (t as HTMLElement).scrollTop
      if (typeof raw !== 'number') return
      // iOS-резинка отдаёт позиции ЗА пределами прокрутки: у нижнего края
      // отскок читался как «скролл вверх», и бар разворачивался сам, пока палец
      // ещё вёл вниз. Обрезаем позицию рамками контейнера — за краями dy = 0.
      const max = el ? Math.max(0, el.scrollHeight - el.clientHeight) : Infinity
      const y = Math.min(Math.max(raw, 0), max)
      const key = scrollKey(el)
      const prev = lastY.get(key)
      lastY.set(key, y)
      if (y <= 4) { setCollapsed(false); return }  // near the top → always expanded
      if (prev === undefined) return               // незнакомая панель — только отметка
      const dy = y - prev
      // Ignore micro-scrolls / momentum jitter so the bar doesn't flicker.
      if (Math.abs(dy) < threshold) return
      // Подстановка прокрутки — не палец: только переносим точку отсчёта.
      if (Math.abs(dy) > JUMP) return
      setCollapsed(dy > 0)                         // вниз → мини, вверх → целиком
    }
    // capture:true so scrolls inside nested containers bubble to us too.
    window.addEventListener('scroll', onScroll, true)
    return () => window.removeEventListener('scroll', onScroll, true)
  }, [threshold])

  return collapsed
}
