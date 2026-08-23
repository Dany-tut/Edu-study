import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef, useState, useLayoutEffect, useCallback, useEffect } from 'react'
import type { ReactNode, CSSProperties } from 'react'
import { useNavCollapse } from '../lib/useNavCollapse'
import { useKeyboardInset } from '../lib/useKeyboardInset'
import { tactile } from '../lib/feedback'
import { TAP_SCALE } from '../lib/mobileTokens'
import { useWheelHScroll } from '../lib/useWheelHScroll'

// ─────────────────────────────────────────────────────────────────────────────
// MobileDock — the floating glass control zone that rides just ABOVE the bottom
// nav (MOBILE ONLY). Same language as the trainer's control dock: it drops +
// packs closer when the nav collapses on scroll, and slides away with the nav
// when the keyboard opens. Holds CONTEXTUAL actions for the current screen
// (course/scope switcher, module index) — never navigation (that's the navbar).
// Desktop never imports this.
// ─────────────────────────────────────────────────────────────────────────────

const COLLAPSE = { duration: 0.28, ease: [0.32, 0.72, 0, 1] as const }

// Smoothed collapse state for the dock: swallows momentum/overscroll bounce
// (raw collapsed flipping false→true→false within a few frames) so the pill
// doesn't blink "appear → disappear → appear". Rapid flips are coalesced into
// the final value; a settled change applies after a short guard.
function useSmoothCollapse() {
  const raw = useNavCollapse()
  const [val, setVal] = useState(raw)
  const timer = useRef(0)
  useEffect(() => {
    clearTimeout(timer.current)
    // Only commit once the raw state has held steady for the guard window, so a
    // bounce that immediately reverses never reaches the animation.
    timer.current = window.setTimeout(() => setVal(raw), 150)
    return () => clearTimeout(timer.current)
  }, [raw])
  return val
}

// Disappear/appear on nav-collapse: blur + shrink + drop, ending fully hidden
// (opacity 0) so no ghost lingers. The blur lives on the glass element itself
// (same node as its backdrop-filter). Opacity is timed to fall only at the TAIL
// (see collapseTransition) — the pill blurs/shrinks away while still opaque, so
// the frost never flashes, then fades to 0 once it's already gone visually.
function collapseAnim(collapsed: boolean) {
  return {
    opacity: collapsed ? 0 : 1,
    filter: collapsed ? 'blur(9px)' : 'blur(0px)',
    scale: collapsed ? 0.9 : 1,
    // Slide DOWN far enough to slip behind the bottom nav (which sits at a
    // higher z-index) — the pill disappears under the nav, not over it.
    y: collapsed ? 46 : 0,
  }
}

function collapseTransition(collapsed: boolean) {
  return {
    ...COLLAPSE,
    // Hide: hold opacity until the blur/scale has done the disappearing, then
    // snap to 0 over the last beat. Show: fade in together with the un-blur.
    opacity: collapsed
      ? { delay: 0.16, duration: 0.14, ease: 'linear' as const }
      : { duration: 0.22 },
  }
}

const glassBase: CSSProperties = {
  background: 'rgba(var(--glass-rgb), 0.6)',
  backdropFilter: 'blur(28px) saturate(200%)',
  WebkitBackdropFilter: 'blur(28px) saturate(200%)',
  border: '1px solid var(--color-border-glass)',
  boxShadow: 'var(--shadow-pill), inset 0 1px 0 rgba(255,255,255,0.5)',
}

export default function MobileDock({ children }: { children: ReactNode }) {
  const collapsed = useSmoothCollapse()
  const kbOpen = useKeyboardInset() > 0
  return (
    <motion.div
      // Outer fixed layer: pinned to the safe-area edge, slides down with the
      // nav when the keyboard opens so it never crowds a focused field.
      initial={false}
      animate={{ y: kbOpen ? 140 : 0, opacity: kbOpen ? 0 : 1 }}
      transition={COLLAPSE}
      style={{
        position: 'fixed', left: 0, right: 0,
        bottom: 'env(safe-area-inset-bottom, 0px)',
        // Below the bottom nav (z-50) so the collapsing pill tucks UNDER it.
        zIndex: 40, display: 'flex', justifyContent: 'center',
        // Outer layer never intercepts taps — empty areas pass through to the
        // content; only the inner dock (pointerEvents: auto) is interactive.
        padding: '0 16px', pointerEvents: 'none',
      }}
    >
      <motion.div
        // Inner layer only positions the dock: 86px clearance above the expanded
        // nav, 74px when it collapses to 50. The disappear/appear blur lives on
        // the glass children themselves (DockSegment/DockCircle) — a `filter` on
        // THIS wrapper would suspend their backdrop-filter and pop the frost.
        initial={false}
        animate={{ marginBottom: collapsed ? 74 : 86 }}
        transition={COLLAPSE}
        style={{
          display: 'flex', gap: 10, alignItems: 'center',
          maxWidth: '100%',
          // Non-interactive while collapsed so it never blocks taps on the list.
          pointerEvents: collapsed ? 'none' : 'auto',
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

/** Horizontally-scrollable glass segment control — the course/scope switcher. */
export function DockSegment<T extends string | number>({
  options, value, onChange, accent,
}: {
  options: Array<{ id: T; label: ReactNode }>
  value: T
  onChange: (id: T) => void
  /** Заливка активной чипсы — цвет предмета. Без него: брендовый градиент. */
  accent?: string
}) {
  const collapsed = useSmoothCollapse()
  const scrollRef = useRef<HTMLDivElement>(null)
  // Edge fades reflect scroll position: melt only the side that has hidden
  // chips. If the row fits (no horizontal scroll) there's no fade at all, and
  // once scrolled fully to an edge that side's fade drops too.
  const [edges, setEdges] = useState({ left: false, right: false })
  const sync = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    // Tolerance guards against sub-pixel rounding reporting a phantom overflow.
    const overflow = el.scrollWidth - el.clientWidth
    const scrollable = overflow > 4
    const left = scrollable && el.scrollLeft > 4
    const right = scrollable && el.scrollLeft < overflow - 4
    setEdges(prev => (prev.left === left && prev.right === right ? prev : { left, right }))
  }, [])
  // Re-measure on mount, when the option set changes, and on any size change
  // (rotation, font load) — preview has no rAF, so ResizeObserver drives it.
  useLayoutEffect(() => {
    sync()
    const el = scrollRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    return () => ro.disconnect()
  }, [sync, options.length])

  // Ряд листается мышью: без этого колесо над доком не делало ничего —
  // скроллбар спрятан, перетаскивания на десктопе нет, ряд выглядел мёртвым.
  useWheelHScroll(scrollRef)

  // Клик по стрелке листает на 3/4 видимой ширины — на краю остаётся «якорь»
  // из предыдущего экрана, и ряд не перепрыгивает вслепую.
  const nudge = (dir: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const step = Math.max(90, el.clientWidth * 0.75)
    const from = el.scrollLeft
    const to = Math.max(0, Math.min(el.scrollWidth - el.clientWidth, from + (dir === 'left' ? -step : step)))
    el.scrollTo({ left: to, behavior: 'smooth' })
    // Плавность глушат prefers-reduced-motion и часть вебвью — молча. Если через
    // кадр ряд не тронулся, доводим рывком: кнопка обязана листать всегда.
    setTimeout(() => { if (el.scrollLeft === from && from !== to) el.scrollLeft = to }, 120)
  }

  // Keep the selected chip centred in the row so the active choice is always
  // fully readable (never clipped under an edge fade).
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const activeEl = el.querySelector('[data-active="true"]') as HTMLElement | null
    if (!activeEl) return
    const er = el.getBoundingClientRect()
    const ar = activeEl.getBoundingClientRect()
    const delta = (ar.left + ar.width / 2) - (er.left + er.width / 2)
    if (Math.abs(delta) > 1) el.scrollTo({ left: el.scrollLeft + delta, behavior: 'smooth' })
  }, [value])

  // Feather the visible edge(s) ~20px in; no fade when nothing is hidden.
  const FADE = 20
  const l = edges.left ? `transparent 0, #000 ${FADE}px` : '#000 0'
  const r = edges.right ? `#000 calc(100% - ${FADE}px), transparent 100%` : '#000 100%'
  const mask = (edges.left || edges.right) ? `linear-gradient(to right, ${l}, ${r})` : 'none'

  return (
    // Glass shell keeps its solid rounded shape; only the inner scroll row is
    // masked, so the chips melt at the edges while the pill stays intact. The
    // blur/opacity animation rides on THIS glass node so its frost survives.
    <motion.div
      initial={false}
      animate={collapseAnim(collapsed)}
      transition={collapseTransition(collapsed)}
      style={{ borderRadius: 999, maxWidth: 'min(78vw, 340px)', overflow: 'hidden', position: 'relative', transformOrigin: 'bottom center', ...glassBase }}
    >
      <div
        ref={scrollRef}
        onScroll={sync}
        className="no-scrollbar"
        style={{
          display: 'flex', alignItems: 'center', gap: 3, padding: 3,
          overflowX: 'auto',
          maskImage: mask, WebkitMaskImage: mask,
        }}
      >
        {options.map(opt => {
          const active = opt.id === value
          return (
            <motion.button
              key={String(opt.id)}
              type="button"
              data-active={active}
              whileTap={{ scale: TAP_SCALE }}
              onClick={() => { if (!active) { tactile(); onChange(opt.id) } }}
              style={{
                flexShrink: 0, height: 34, padding: '0 15px', borderRadius: 999,
                border: 'none', cursor: active ? 'default' : 'pointer',
                fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap',
                background: active ? (accent ?? 'var(--grad-purple)') : 'transparent',
                color: active ? '#fff' : 'var(--color-text-2)',
                transition: 'background 0.2s, color 0.2s',
              }}
            >
              {opt.label}
            </motion.button>
          )
        })}
      </div>
      {/* Стрелки у краёв. Маска-фейд по тёмному фону глазом не читается, и ряд
          выглядит просто обрезанным — «курсы кончились». Кнопка появляется
          только с той стороны, где спрятаны чипсы. [[reference-invisible-in-dark]] */}
      {(['left', 'right'] as const).map(side => (
        <button
          key={side}
          type="button"
          aria-hidden={!edges[side]}
          tabIndex={-1}
          onClick={() => nudge(side)}
          style={{
            position: 'absolute', [side]: 2, top: '50%', transform: 'translateY(-50%)',
            width: 22, height: 22, padding: 0, borderRadius: 999, border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--color-bg-3)', color: 'var(--color-text-2)',
            cursor: 'pointer', zIndex: 2,
            opacity: edges[side] ? 1 : 0,
            pointerEvents: edges[side] ? 'auto' : 'none',
            transition: 'opacity 0.18s ease',
          }}
        >
          {side === 'left' ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      ))}
    </motion.div>
  )
}

/** Round floating glass action — opens a sheet, toggles a view, etc. */
export function DockCircle({
  icon, onClick, badge, active = false, ariaLabel,
}: {
  icon: ReactNode
  onClick: () => void
  badge?: number
  active?: boolean
  ariaLabel?: string
}) {
  const collapsed = useSmoothCollapse()
  return (
    <motion.button
      type="button"
      aria-label={ariaLabel}
      whileTap={{ scale: 0.9 }}
      initial={false}
      animate={collapseAnim(collapsed)}
      transition={collapseTransition(collapsed)}
      onClick={() => { tactile(); onClick() }}
      style={{
        position: 'relative', width: 46, height: 46, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 999, cursor: 'pointer', padding: 0, transformOrigin: 'bottom center',
        color: active ? 'var(--color-accent)' : 'var(--color-text-2)',
        ...glassBase,
      }}
    >
      {icon}
      {badge != null && badge > 0 && (
        <span style={{
          position: 'absolute', top: -2, right: -2,
          minWidth: 17, height: 17, padding: '0 4px', borderRadius: 999,
          background: 'var(--grad-purple)', color: '#fff',
          fontSize: 10, fontWeight: 800, border: '1.5px solid var(--color-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{badge > 99 ? '99+' : badge}</span>
      )}
    </motion.button>
  )
}

/**
 * Чужой элемент в доке — переключатель предмета тренажёра.
 *
 * Соседние круги гаснут сами (DockCircle), и без такой обёртки посторонняя
 * таблетка оставалась бы висеть одна посреди экрана, когда весь док уже уехал
 * под навигацию. Размытия здесь нет намеренно: `filter` на обёртке глушит
 * backdrop-filter ребёнка, и на возврате его матовость вспыхивает через кадр.
 */
export function DockSlot({ children }: { children: ReactNode }) {
  const collapsed = useSmoothCollapse()
  return (
    <motion.div
      initial={false}
      animate={{ opacity: collapsed ? 0 : 1, scale: collapsed ? 0.9 : 1, y: collapsed ? 46 : 0 }}
      transition={collapseTransition(collapsed)}
      style={{ display: 'flex', minWidth: 0, transformOrigin: 'bottom center' }}
    >
      {children}
    </motion.div>
  )
}
