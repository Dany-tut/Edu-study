// ─────────────────────────────────────────────────────────────────────────────
// ВРЕМЕННЫЙ ЗАМЕР ШАПКИ. Снять, как только расхождение по высоте объяснено.
//
// Показывает прямо на устройстве: сколько на самом деле отдаёт
// env(safe-area-inset-top) и где стоит каждая таблетка шапки текущего экрана.
// В превью safe-area равен нулю, поэтому разницу, которая живёт только на
// телефоне, здесь не увидеть в принципе — а по скриншотам она мерится на глаз
// и спор идёт по кругу.
// ─────────────────────────────────────────────────────────────────────────────

const BAND = 200
const MAX_H = 64

function safeTop(): number {
  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;top:0;height:env(safe-area-inset-top,0px);width:1px;pointer-events:none'
  document.body.appendChild(probe)
  const h = probe.getBoundingClientRect().height
  probe.remove()
  return Math.round(h)
}

/** Цепочка родителей верхней таблетки: где именно набегает лишний отступ. */
function chain(el: HTMLElement | null): string[] {
  const out: string[] = []
  for (let n = el, i = 0; n && i < 6; n = n.parentElement, i++) {
    const b = n.getBoundingClientRect()
    const cs = getComputedStyle(n)
    out.push(`${n.tagName} ${Math.round(b.top)}/${Math.round(b.height)} pt${cs.paddingTop} mt${cs.marginTop}`)
  }
  return out
}

let firstPill: HTMLElement | null = null

function pills(): string[] {
  const near: HTMLElement[] = []
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('*'))) {
    if (el.hasAttribute('data-pill-probe')) continue
    const b = el.getBoundingClientRect()
    if (!b.width || b.height < 20 || b.height > MAX_H) continue
    if (b.top < 0 || b.top > BAND) continue
    near.push(el)
  }
  const chips = near.filter(el => {
    const cs = getComputedStyle(el)
    if (parseFloat(cs.borderTopLeftRadius) < 14) return false
    if (Number(cs.opacity) < 0.5 || cs.visibility === 'hidden') return false
    const bw = parseFloat(cs.borderTopWidth)
    return cs.backgroundColor !== 'rgba(0, 0, 0, 0)'
      || (bw > 0 && cs.borderTopColor !== 'rgba(0, 0, 0, 0)')
      || cs.boxShadow !== 'none'
  })
  const top = chips
    .filter(el => !chips.some(o => o !== el && o.contains(el)))
    .sort((l, r) => l.getBoundingClientRect().left - r.getBoundingClientRect().left)
  firstPill = top[0] ?? null
  return top
    .slice(0, 5)
    .map(el => {
      const b = el.getBoundingClientRect()
      const txt = (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 10) || '·'
      return `${Math.round(b.top)}/${Math.round(b.height)} "${txt}"`
    })
}

if (typeof window !== 'undefined') {
  const box = document.createElement('div')
  box.setAttribute('data-pill-probe', '')
  box.style.cssText = [
    'position:fixed', 'left:6px', 'bottom:120px', 'right:6px', 'z-index:99998',
    'pointer-events:none', 'background:rgba(0,0,0,0.84)', 'color:#fff',
    'padding:6px 8px', 'border-radius:10px', 'white-space:pre-wrap',
    'font:600 10px/1.35 ui-monospace,monospace',
  ].join(';')
  const tick = () => {
    const rows = pills()
    box.textContent = [
      `safe-top ${safeTop()}`,
      ...rows,
      '—',
      ...chain(firstPill),
    ].join('\n')
  }
  const start = () => {
    document.body.appendChild(box)
    tick()
    setInterval(tick, 1200)
  }
  if (document.body) start()
  else window.addEventListener('DOMContentLoaded', start)
}
