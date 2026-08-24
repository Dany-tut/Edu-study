import { useEffect, useRef } from 'react'
import { tactile } from './feedback'

// ─────────────────────────────────────────────────────────────────────────────
// useSwipeBack — «свайп назад» жестом от левого края экрана (как в iOS).
//
// Каждый экран с кнопкой «Назад» регистрирует свой обработчик; жест дёргает
// ВЕРХНИЙ в стеке (последний зарегистрированный), так что вложенные экраны
// (домашка внутри урока, дрилл внутри тренажёра) закрываются по одному.
// Слушатели — одни на документ, ставятся при первом регистранте.
//
// Пока палец едет, у края всплывает стеклянный кружок со стрелкой и растёт по
// мере прогресса; отпустили за порогом — срабатывает «назад» с тактильным
// откликом, не дотянули — кружок уезжает обратно.
// ─────────────────────────────────────────────────────────────────────────────

type Entry = { fire: () => void }

const stack: Entry[] = []

/** Ширина зоны у левого края, из которой начинается жест (px). */
const EDGE = 28
/** Горизонтальный путь пальца, после которого отпускание = «назад» (px). */
const TRIGGER = 76

let installed = false
let bubble: HTMLDivElement | null = null

function ensureBubble(): HTMLDivElement {
  if (bubble) return bubble
  const el = document.createElement('div')
  // Инлайн-стили: элемент живёт вне React-дерева, css-классов у него нет.
  // Цвета — только через var(), чтобы кружок жил в обеих темах.
  el.style.cssText = [
    'position:fixed', 'left:0', 'top:50%', 'z-index:5000',
    'width:42px', 'height:42px', 'border-radius:999px',
    'display:flex', 'align-items:center', 'justify-content:center',
    'background:rgba(var(--glass-rgb),0.92)',
    'border:1px solid var(--color-border-glass)',
    'box-shadow:var(--shadow-lg)',
    'backdrop-filter:blur(14px) saturate(180%)',
    '-webkit-backdrop-filter:blur(14px) saturate(180%)',
    'color:var(--color-text)',
    'pointer-events:none',
    'transform:translate(-48px,-50%)',
    'opacity:0',
    'transition:none',
  ].join(';')
  el.innerHTML =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>'
  document.body.appendChild(el)
  bubble = el
  return el
}

function moveBubble(progress: number, y: number) {
  const el = ensureBubble()
  el.style.transition = 'none'
  const eased = Math.min(1, progress)
  // Кружок выезжает из-за края и «дожимается» до упора к порогу срабатывания.
  el.style.transform = `translate(${-48 + eased * 62}px, -50%) scale(${0.7 + eased * 0.3})`
  el.style.top = `${y}px`
  el.style.opacity = String(Math.min(1, eased * 1.6))
}

function hideBubble(fired: boolean) {
  if (!bubble) return
  const el = bubble
  el.style.transition = 'transform 0.22s ease, opacity 0.22s ease'
  el.style.opacity = '0'
  el.style.transform = fired ? 'translate(20px,-50%) scale(0.6)' : 'translate(-48px,-50%) scale(0.7)'
}

function install() {
  if (installed) return
  installed = true

  let tracking = false
  let captured = false
  let startX = 0
  let startY = 0
  let dx = 0

  document.addEventListener('touchstart', e => {
    tracking = false
    captured = false
    if (stack.length === 0 || e.touches.length !== 1) return
    const t = e.touches[0]
    if (t.clientX > EDGE) return
    tracking = true
    startX = t.clientX
    startY = t.clientY
    dx = 0
  }, { passive: true })

  document.addEventListener('touchmove', e => {
    if (!tracking || e.touches.length !== 1) return
    const t = e.touches[0]
    dx = t.clientX - startX
    const dy = t.clientY - startY
    if (!captured) {
      // Вертикаль победила — это скролл, отпускаем жест насовсем.
      if (Math.abs(dy) > 16 && Math.abs(dy) > Math.abs(dx)) { tracking = false; return }
      if (dx > 10 && Math.abs(dx) > Math.abs(dy) * 1.4) captured = true
      else return
    }
    // Жест наш: не даём странице скроллиться под пальцем.
    if (e.cancelable) e.preventDefault()
    moveBubble(dx / TRIGGER, startY)
  }, { passive: false })

  const finish = (cancelled: boolean) => {
    if (!tracking) return
    tracking = false
    if (!captured) return
    const fired = !cancelled && dx >= TRIGGER && stack.length > 0
    hideBubble(fired)
    if (fired) {
      tactile()
      stack[stack.length - 1].fire()
    }
  }
  document.addEventListener('touchend', () => finish(false), { passive: true })
  document.addEventListener('touchcancel', () => finish(true), { passive: true })
}

/**
 * Регистрирует обработчик «назад» для свайпа от левого края, пока компонент
 * смонтирован (и пока enabled). Последний зарегистрированный — главный.
 */
export function useSwipeBack(onBack: (() => void) | null | undefined, enabled = true) {
  const fn = useRef(onBack)
  fn.current = onBack
  const active = Boolean(onBack) && enabled

  useEffect(() => {
    if (!active) return
    install()
    const entry: Entry = { fire: () => fn.current?.() }
    stack.push(entry)
    return () => {
      const i = stack.indexOf(entry)
      if (i >= 0) stack.splice(i, 1)
    }
  }, [active])
}
