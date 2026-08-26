// ─────────────────────────────────────────────────────────────────────────────
// Насколько низ вьюпорта НЕ совпадает с низом экрана.
//
// ЗАЧЕМ. В установленном PWA на iPhone вебвью на холодном запуске какое-то
// время живёт в уменьшенном вьюпорте: он кончается выше физического низа
// экрана (примерно на высоту домашней полосы), а env(safe-area-inset-bottom)
// при этом ещё нулевой. Верх от этого не страдает — там ошибка вьюпорта и
// нулевой env компенсируют друг друга, — а всё прижатое к низу (док, нижняя
// навигация) стоит слишком высоко. Стоит потянуть экран, вебвью пересчитывает
// вьюпорт на весь экран, и бар «сам» опускается на место у ученика на глазах.
//
// ПОЧЕМУ ИМЕННО ТАК МЕРЯЕМ. В standalone вебвью всегда занимает экран целиком,
// поэтому любая разница между screen.height и innerHeight — это ошибка, а не
// чей-то хром (в обычном Safari разница законная: панели, — там ноль). Число
// самокорректируется: как только вьюпорт станет верным, разница станет нулём,
// сдвиг снимется, и никакой «памяти» о поломке не останется.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'

/** Больше этого не бывает: домашняя полоса — 34pt. Всё крупнее — не наш случай. */
const MAX_SHIFT = 60

let value = 0
const listeners = new Set<(v: number) => void>()

function read(): number {
  if (typeof window === 'undefined') return 0
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  if (!standalone) return 0
  // Только iPhone. У iPad окно PWA законно бывает ниже экрана (Split View,
  // Slide Over), и там разница со screen.height — не поломка, а второе
  // приложение рядом; сдвиг увёл бы док под край окна.
  if (!/iPhone|iPod/.test(navigator.userAgent)) return 0
  const h = window.innerHeight
  // Только портрет: на iOS screen.width/height не поворачиваются вместе с
  // экраном, и в ландшафте сравнивать было бы не с чем.
  if (!h || window.innerWidth >= h) return 0
  const screenH = Math.max(window.screen.height, window.screen.width)
  const gap = Math.round(screenH - h)
  // Ниже 20 — не наш случай, а разнобой в округлении высот.
  return gap >= 20 && gap <= MAX_SHIFT ? gap : 0
}

function publish() {
  const next = read()
  if (next === value) return
  value = next
  listeners.forEach(fn => fn(next))
}

let wired = false
function wire() {
  if (wired || typeof window === 'undefined') return
  wired = true
  window.addEventListener('resize', publish)
  window.addEventListener('orientationchange', publish)
  window.addEventListener('pageshow', publish)
  window.visualViewport?.addEventListener('resize', publish)
  // Первое касание/прокрутка — ровно тот момент, когда вебвью и пересчитывает
  // вьюпорт; событие resize после него приходит не всегда, поэтому доберём
  // замером вдогонку.
  const settle = () => { publish(); [80, 300, 800].forEach(ms => setTimeout(publish, ms)) }
  window.addEventListener('touchstart', settle, { passive: true, capture: true })
  window.addEventListener('scroll', publish, true)
  settle()
}

/** На сколько опустить прижатое к низу, чтобы оно село на низ ЭКРАНА (0 — всё в порядке). */
export function useBottomShift(): number {
  // Первое значение считаем прямо на первом рендере: у нижней навигации
  // initial={false}, и с готовым числом она рисуется на месте сразу, без
  // видимого «доезда» вниз.
  const [v, setV] = useState(() => (value = read()))
  useEffect(() => {
    wire()
    listeners.add(setV)
    setV(value)
    return () => { listeners.delete(setV) }
  }, [])
  return v
}
