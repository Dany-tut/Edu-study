// ─────────────────────────────────────────────────────────────────────────────
// Экранная клавиатура: сколько она отъедает снизу и открыта ли она вообще.
//
// ПОЧЕМУ ДВА ЧИСЛА, А НЕ ОДНО. Клавиатура ужимает только ВИДИМУЮ область
// (visualViewport), layout viewport остаётся во весь экран — поэтому всё
// прижатое к низу (док, кнопка «Проверить») оказывается под клавиатурой и его
// надо поднимать. Но iOS вдобавок СДВИГАЕТ видимую область вверх, чтобы поле
// ввода не пряталось под клавиатуру, и в этот момент vv.offsetTop > 0.
//
// Раньше высота считалась как innerHeight - vv.height - vv.offsetTop, то есть
// сдвиг вычитался из подъёма. Это верно только если fixed-элементы едут вместе
// с layout viewport; на деле Safari держит их у видимой области, и вычитание
// опускало кнопку ровно на величину сдвига — клавиатура наезжала на «Проверить»
// (и тем сильнее, чем ниже на экране поле ввода). Поэтому подъём = чистая
// высота клавиатуры, без offsetTop.
//
// А ещё из-за offsetTop «открыта» гасло само собой: сдвинули экран пальцем —
// разность ушла под порог, клавиатура «закрылась», и из-под неё вылезала нижняя
// навигация (её прячут именно по этому признаку). Признак открытости тоже
// считается без offsetTop и потому не зависит от прокрутки.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'

export interface KeyboardState {
  /** На сколько пикселей поднимать прижатое к низу. 0 — клавиатуры нет. */
  inset: number
  /** Клавиатура на экране. Не гаснет от прокрутки и сдвига видимой области. */
  open: boolean
}

// Ниже этого клавиатур не бывает: всё мельче — панели браузера и дрожь
// адресной строки, из-за которых разность высот вечно немного не нулевая.
const MIN_KEYBOARD = 120

const CLOSED: KeyboardState = { inset: 0, open: false }

let state: KeyboardState = CLOSED
const listeners = new Set<(s: KeyboardState) => void>()

function read(): KeyboardState {
  const vv = typeof window === 'undefined' ? null : window.visualViewport
  if (!vv) return CLOSED
  const height = Math.round(window.innerHeight - vv.height)
  return height >= MIN_KEYBOARD ? { inset: height, open: true } : CLOSED
}

function publish() {
  const next = read()
  if (next.inset === state.inset && next.open === state.open) return
  state = next
  listeners.forEach(fn => fn(next))
}

let wired = false
function wire() {
  if (wired || typeof window === 'undefined') return
  wired = true
  const vv = window.visualViewport
  // Замер «вдогонку»: и выезд клавиатуры, и её уход идут анимацией, а система
  // успевает прислать событие на полпути. Без добора экран остаётся с
  // промежуточным числом до следующего касания.
  const settle = () => { publish(); [80, 200, 420].forEach(ms => setTimeout(publish, ms)) }
  vv?.addEventListener('resize', settle)
  vv?.addEventListener('scroll', publish)
  window.addEventListener('orientationchange', settle)
  // Уход фокуса из поля — самый честный признак, что клавиатура закрывается,
  // и приходит он раньше, чем viewport признаётся в новом размере.
  window.addEventListener('focusout', settle, true)
  window.addEventListener('focusin', settle, true)
}

function subscribe(fn: (s: KeyboardState) => void) {
  wire()
  listeners.add(fn)
  publish()
  return () => { listeners.delete(fn) }
}

/** Полное состояние клавиатуры: высота подъёма + признак открытости. */
export function useKeyboardState(): KeyboardState {
  const [v, setV] = useState(state)
  useEffect(() => subscribe(setV), [])
  return v
}

/** На сколько поднять прижатое к низу (0 — клавиатуры нет). */
export function useKeyboardInset(): number {
  return useKeyboardState().inset
}

/** Клавиатура на экране — для того, что при ней просто прячется. */
export function useKeyboardOpen(): boolean {
  return useKeyboardState().open
}
