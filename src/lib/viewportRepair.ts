// ─────────────────────────────────────────────────────────────────────────────
// Починка укороченного вьюпорта на холодном запуске PWA (iPhone).
//
// ЧТО ЛОМАЕТСЯ. В установленном приложении вебвью какое-то время держит
// вьюпорт короче экрана. Замер на iPhone 16 Pro (экран 874pt):
//     сразу после запуска  innerHeight 812  (недостача 62 — верхний вырез)
//     после первого свайпа innerHeight 874
// Всё прижатое к низу (док, нижняя навигация) садится на этот ложный низ и
// стоит выше физического края, пока ученик не тронет экран.
//
// ПОЧЕМУ НЕ КОМПЕНСИРУЕМ СДВИГОМ. Первым заходом мы просто опускали нижний
// слой на величину недостачи. Не работает: WebKit обрезает position:fixed по
// границам вьюпорта, и опущенная навигация оказалась срезанной по низу.
// Лечить надо не последствие, а сам вьюпорт — заставить вебвью пересчитать
// его сразу, не дожидаясь касания.
//
// ЧЕМ ТОЛКАЕМ. По очереди, с перезамером после каждого шага:
//   1) height=device-height в meta viewport — прямое указание высоты; именно
//      её вебвью и не вывел сам;
//   2) толчок прокруткой корня на 1px — рукотворная копия того свайпа,
//      который чинит всё вручную.
// Если не помогло ни то, ни другое — meta возвращаем как было, чтобы не
// оставлять на странице последствий неудачной попытки.
// ─────────────────────────────────────────────────────────────────────────────

/** Меньше этого — разнобой округлений, а не поломка. */
const MIN_GAP = 20
/** Больше этого — не наш случай (недостача равна вырезу, 62). */
const MAX_GAP = 100

function gap(): number {
  if (typeof window === 'undefined') return 0
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  if (!standalone) return 0
  // Только iPhone: у iPad окно PWA законно бывает ниже экрана (Split View).
  if (!/iPhone|iPod/.test(navigator.userAgent)) return 0
  const h = window.innerHeight
  // Только портрет: на iOS screen.width/height не поворачиваются с экраном.
  if (!h || window.innerWidth >= h) return 0
  const g = Math.round(Math.max(window.screen.height, window.screen.width) - h)
  return g >= MIN_GAP && g <= MAX_GAP ? g : 0
}

let step = 0
let original = ''
let done = false

function nudge() {
  if (done || typeof document === 'undefined') return
  if (!gap()) {
    // Вьюпорт верный: если чинили meta и это помогло — оставляем как есть,
    // высота device-height ничему не мешает.
    done = true
    return
  }
  const meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null
  if (step === 0 && meta) {
    original = meta.content
    meta.content = `${original}, height=device-height`
  } else if (step === 1) {
    // Толчок прокруткой: корень на пиксель выше экрана, съездить туда и
    // обратно. Без временной прибавки высоты прокручивать нечего.
    const root = document.documentElement
    const prev = root.style.height
    root.style.height = 'calc(100% + 1px)'
    window.scrollTo(0, 1)
    window.scrollTo(0, 0)
    root.style.height = prev
  } else {
    // Не помогло ничего — снимаем свою правку meta и больше не трогаем.
    if (meta && original) meta.content = original
    done = true
    return
  }
  step++
}

/** Запускается один раз на старте приложения (main.tsx). */
export function repairViewport() {
  if (typeof window === 'undefined') return
  if (!gap()) return
  nudge()
  // Перезамер вдогонку: вебвью применяет новую высоту не в том же кадре.
  ;[60, 200, 500, 1000, 1800].forEach(ms => setTimeout(nudge, ms))
  // Первое касание чинит вьюпорт и само по себе — после него проверять нечего.
  window.addEventListener('touchstart', () => { setTimeout(nudge, 60) }, { passive: true, once: true })
}
