// ─────────────────────────────────────────────────────────────────────────────
// Экранная клавиатура: сколько она отъедает снизу и открыта ли она вообще.
//
// ПОЧЕМУ ДВА ЧИСЛА, А НЕ ОДНО. Клавиатура ужимает только ВИДИМУЮ область
// (visualViewport), layout viewport остаётся во весь экран — поэтому всё
// прижатое к низу (док, кнопка «Проверить») оказывается под клавиатурой и его
// надо поднимать. Но iOS вдобавок СДВИГАЕТ видимую область вверх, чтобы поле
// ввода не пряталось под клавиатуру, и в этот момент vv.offsetTop > 0.
//
// СКОЛЬКО ПОДНИМАТЬ — НЕ СЧИТАЕТСЯ, А ЗАМЕРЯЕТСЯ. Формулу приходилось менять
// дважды в разные стороны, и оба раза она была права ровно наполовину. Дело в
// том, что fixed-элемент ведёт себя по-разному: в обычной вкладке Safari он
// остаётся у layout viewport (то есть под клавиатурой — поднимать надо на всю
// её высоту), а в установленном на экран PWA едет вместе с видимой областью
// (то есть уже стоит над клавиатурой — поднимать не надо вовсе). Считая
// вслепую, мы либо прятали «Проверить» под клавиатуру, либо выбрасывали кнопку
// на середину задания.
//
// Поэтому в документе живёт невидимая метка, прижатая к низу ровно так же, как
// док и кнопка. Подъём — это её собственный «нахлёст»: насколько низ метки
// оказался ниже видимой области. Метка отвечает за обе среды сразу и не
// зависит от того, что именно Safari решит сделать в следующей версии.
//
// Признак «открыта» при этом считается по чистой разности высот, без offsetTop:
// иначе он гас сам собой от сдвига видимой области (тронули страницу пальцем —
// разность ушла под порог), и из-под клавиатуры выезжала нижняя навигация,
// которую прячут именно по этому признаку.
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

// Невидимая метка у нижнего края — эталон для всего, что прижато к низу.
// Ставится один раз и живёт до конца сессии: создавать её на каждый замер
// нельзя, браузер отдаёт положение только после укладки.
let mark: HTMLElement | null = null

function overlap(vv: VisualViewport): number {
  if (typeof document === 'undefined' || !document.body) return 0
  if (!mark || !mark.isConnected) {
    mark = document.createElement('div')
    mark.setAttribute('aria-hidden', 'true')
    mark.style.cssText =
      'position:fixed;left:0;bottom:0;width:1px;height:1px;padding:0;margin:0;'
      + 'visibility:hidden;pointer-events:none;z-index:-1'
    document.body.appendChild(mark)
  }
  // Низ метки — в координатах layout viewport; видимая область занимает в них
  // полосу [offsetTop, offsetTop + height]. Разность и есть то, что съедено.
  return Math.round(mark.getBoundingClientRect().bottom - (vv.offsetTop + vv.height))
}

function read(): KeyboardState {
  const vv = typeof window === 'undefined' ? null : window.visualViewport
  if (!vv) return CLOSED
  const height = Math.round(window.innerHeight - vv.height)
  if (height < MIN_KEYBOARD) return CLOSED
  // Нахлёст не бывает больше клавиатуры и меньше нуля: за пределами этого
  // отрезка замер поймал промежуточный кадр анимации, а не положение.
  const lift = Math.max(0, Math.min(height, overlap(vv)))
  return { inset: lift, open: true }
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
