import { useSyncExternalStore } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Слой нижнего дока — #mobile-dock-layer из index.html.
//
// ЗАЧЕМ ОН ВООБЩЕ. В установленном PWA на iPhone вебвью на холодном запуске
// держит вьюпорт короче экрана (замер: innerHeight 812 при screen 874), а
// position:fixed WebKit обрезает ровно по этой ложной границе. Опустить
// прижатое к низу нельзя — срежется; заставить вебвью пересчитать вьюпорт
// тоже не выходит (ни height=device-height, ни программная прокрутка — чинит
// только живое касание). Зато 100dvh считается от полного экрана, поэтому
// обычный (не fixed) слой такой высоты сажает док на настоящий низ сразу.
//
// ВЫСОТА СЛОЯ — ИЗ JS, А НЕ 100dvh. Замер на устройстве: на холодном запуске
// dvh равен тому же короткому вьюпорту (812), а не экрану — то есть средствами
// CSS про настоящий низ экрана не знает никто. Знает только screen.height, им
// и правим высоту слоя, пока вьюпорт не выправится сам.
//
// Страница без слоя (его нет в разметке) ничего не теряет: вызывающий рисует
// док по-старому, fixed.
// ─────────────────────────────────────────────────────────────────────────────

/** Настоящая высота экрана, когда вьюпорт ей не равен (иначе 0). */
function screenGap(): number {
  const h = window.innerHeight
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  // Только установленный PWA на iPhone в портрете: в браузере разница между
  // экраном и вьюпортом законная (панели), у iPad — Split View, в ландшафте
  // screen.width/height на iOS не поворачиваются.
  if (!standalone || !/iPhone|iPod/.test(navigator.userAgent)) return 0
  if (!h || window.innerWidth >= h) return 0
  const g = Math.round(Math.max(window.screen.height, window.screen.width) - h)
  return g >= 20 && g <= 100 ? g : 0
}

// СЛОЙ ВКЛЮЧАЕТСЯ ТОЛЬКО НА КОРОТКОМ ВЬЮПОРТЕ. Слой обычный (не fixed), то
// есть он едет вместе с прокруткой документа. Экраны, у которых прокручивается
// сам документ (урок, домашка, «ДЗ»), из-за этого поднимали док вверх прямо
// посреди страницы. Пока вьюпорт равен экрану, слой не нужен вовсе — док
// рисуется по-старому, fixed; слой появляется только на холодном запуске PWA,
// пока живёт ложная граница вьюпорта, и гаснет, как только она выправилась.

let active = false
let cached: HTMLElement | null = null
const subs = new Set<() => void>()

function sync() {
  const el = document.getElementById('mobile-dock-layer')
  if (!el) return
  const gap = screenGap()
  // Выправился вьюпорт — гасим слой и больше не вмешиваемся.
  el.style.height = gap ? `${window.innerHeight + gap}px` : '100dvh'
  el.style.display = gap ? '' : 'none'
  const next = gap > 0
  if (next !== active) {
    active = next
    cached = next ? el : null
    subs.forEach(f => f())
  }
}

if (typeof window !== 'undefined') {
  sync()
  window.addEventListener('resize', sync)
  window.addEventListener('orientationchange', sync)
  window.addEventListener('pageshow', sync)
  window.visualViewport?.addEventListener('resize', sync)
  // Первое касание вьюпорт и чинит — сразу после него перемеряем.
  window.addEventListener('touchstart', () => setTimeout(sync, 60), { passive: true })
  ;[60, 300, 1000].forEach(ms => setTimeout(sync, ms))
}

/** Слой дока, если он сейчас нужен (иначе null — рисуй fixed). */
export function dockLayer(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  return cached
}

/** То же, но с перерисовкой, когда слой включается или гаснет. */
export function useDockLayer(): HTMLElement | null {
  return useSyncExternalStore(
    cb => { subs.add(cb); return () => { subs.delete(cb) } },
    dockLayer,
    () => null,
  )
}
