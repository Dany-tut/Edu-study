// ─────────────────────────────────────────────────────────────────────────────
// Нижний отступ дока — одно число на всё приложение, устойчивое к вранью
// safe-area-inset-bottom.
//
// Живой `env(safe-area-inset-bottom)` не константа: и Safari (нижняя панель на
// нелистающейся странице), и WKWebView (пока вебвью не пересчитал inset после
// первой прокрутки) какое-то время отдают в него больше, чем высота домашней
// полосы. Из-за этого док на «Главной» и «Курсах» висел заметно выше, а после
// захода в тренажёр — экран, который реально листается, — «отпускался» и больше
// не поднимался.
//
// Поэтому отступ не читается напрямую из CSS, а РАЗРЕШАЕТСЯ: мы замеряем env()
// зондом, держим МИНИМУМ увиденного за сессию (раздутые значения — всегда
// временные, спокойное — самое маленькое) и запоминаем его в localStorage,
// чтобы следующий запуск начинался уже со спокойного числа, а не с задранного.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'

/** Домашняя полоса iPhone — 34pt. Выше дока быть незачем никому. */
const CAP = 34
const KEY = 'mobile-bottom-safe'

const orientation = () => (window.innerHeight >= window.innerWidth ? 'portrait' : 'landscape')
const storeKey = () => `${KEY}:${orientation()}`

let probe: HTMLDivElement | null = null

/** Сырое значение env(safe-area-inset-bottom) в пикселях. */
function measure(): number {
  if (typeof document === 'undefined') return 0
  if (!probe || !probe.isConnected) {
    probe = document.createElement('div')
    probe.setAttribute('aria-hidden', 'true')
    probe.style.cssText =
      'position:fixed;left:-9999px;bottom:0;width:0;visibility:hidden;pointer-events:none;' +
      'height:env(safe-area-inset-bottom,0px)'
    document.body.appendChild(probe)
  }
  return Math.round(probe.getBoundingClientRect().height)
}

function clamp(v: number) { return Math.max(0, Math.min(CAP, v)) }

function stored(): number | null {
  try {
    const raw = Number(localStorage.getItem(storeKey()))
    return Number.isFinite(raw) && raw >= 0 && raw <= CAP ? raw : null
  } catch { return null }
}

let value = stored() ?? clamp(measure())
let seenOrientation = typeof window === 'undefined' ? 'portrait' : orientation()
const listeners = new Set<(v: number) => void>()

function commit(next: number) {
  if (next === value) return
  value = next
  try { localStorage.setItem(storeKey(), String(next)) } catch { /* приватный режим */ }
  listeners.forEach(fn => fn(next))
}

/** Замер: вниз опускаемся всегда, вверх — только после смены ориентации. */
function sample(reset = false) {
  const now = orientation()
  if (now !== seenOrientation) { seenOrientation = now; reset = true }
  const v = clamp(measure())
  if (reset) commit(v)          // новая ориентация — число берём заново
  else if (v < value) commit(v) // иначе только вниз: раздутое значение временное
}

let wired = false
function wire() {
  if (wired || typeof window === 'undefined') return
  wired = true
  // Первые секунды жизни экрана — когда вебвью и хром браузера ещё
  // договариваются о своих панелях.
  ;[0, 300, 1000, 2500].forEach(ms => setTimeout(() => sample(), ms))
  window.addEventListener('resize', () => sample())
  window.addEventListener('orientationchange', () => setTimeout(() => sample(true), 300))
  window.addEventListener('visibilitychange', () => sample())
  // capture:true — ловим прокрутку любого внутреннего контейнера, а не только окна.
  window.addEventListener('scroll', () => sample(), true)
  window.visualViewport?.addEventListener('resize', () => sample())
}

/** Отступ дока снизу в пикселях. Обновляется, когда система признаётся честно. */
export function useBottomSafe(): number {
  const [v, setV] = useState(value)
  useEffect(() => {
    wire()
    sample()
    listeners.add(setV)
    return () => { listeners.delete(setV) }
  }, [])
  return v
}
