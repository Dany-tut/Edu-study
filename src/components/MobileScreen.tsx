import { useRef, useState, type ReactNode, type CSSProperties } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// MobileScreen — the reusable phone shell (MOBILE ONLY; desktop never imports).
// Top-bar logic mirrors the portfolio top-nav: a single floating glass pill
// pinned just below the safe-area edge (small gap), NO separate blur/shadow band
// (the pill's own backdrop-blur handles scroll-under), and a scroll-collapse —
// the bar hides on scroll-down and returns on scroll-up / at the top.
// ─────────────────────────────────────────────────────────────────────────────

/** Distance the bottom dock floats off the screen edge (px), on top of safe-area. */
export const MOBILE_EDGE = 44
/** Default height reserved at the top for the floating widget zone. */
const DEFAULT_TOP_PAD = 96

export default function MobileScreen({
  topZone,
  topPad = DEFAULT_TOP_PAD,
  topRaise = 0,
  bottomDock,
  children,
  scrollKey,
}: {
  /** Floating glass widget/context pinned to the top. Content scrolls under it. */
  topZone?: ReactNode
  /** Height the top zone occupies — body padding matches it. */
  topPad?: number
  /** How many px to pull the top chrome up into the safe-area band (0 = sit just
   *  below the notch). */
  topRaise?: number
  /** Bottom dock: page controls + nav. Rendered fixed, 44px off edge + safe-area. */
  bottomDock?: ReactNode
  children: ReactNode
  /** Change to reset scroll state when the page swaps. */
  scrollKey?: string | number
}) {
  const TOP_ZONE = topPad
  // Collapse the floating bar on scroll-down, restore on scroll-up / at top.
  const [collapsed, setCollapsed] = useState(false)
  const lastYRef = useRef(0)
  // No top safe-area gap — the bar sits at the very top edge (small fixed offset).
  void topRaise
  const TOP_INSET = '6px'

  return (
    <div
      style={{
        position: 'relative',
        height: '100dvh',
        overflowX: 'clip',
        overflowY: 'hidden',
        background: 'var(--color-bg)',
      }}
    >
      {/* TOP — floating glass widget zone. pointer-events pass through empty areas.
          Collapses upward on scroll-down (portfolio scroll-collapse). */}
      {topZone != null && (
        <div
          style={{
            position: 'absolute',
            top: TOP_INSET,
            left: 0,
            right: 0,
            zIndex: 60,
            padding: '0 16px',
            pointerEvents: 'none',
            transform: collapsed ? 'translateY(-150%)' : 'translateY(0)',
            opacity: collapsed ? 0 : 1,
            transition: 'transform 0.34s cubic-bezier(0.16,1,0.3,1), opacity 0.24s ease',
          }}
        >
          <div style={{ pointerEvents: 'auto' }}>{topZone}</div>
        </div>
      )}

      {/* MIDDLE — scroll body. scroll-under: paddingTop lifts content below the
          top zone; paddingBottom clears the bottom dock. */}
      <div
        key={scrollKey}
        onScroll={e => {
          const y = e.currentTarget.scrollTop
          const dy = y - lastYRef.current
          lastYRef.current = y
          if (y <= 8) setCollapsed(false)
          else if (dy > 6) setCollapsed(true)
          else if (dy < -6) setCollapsed(false)
        }}
        className="no-scrollbar"
        style={{
          height: '100%',
          overflowY: 'auto',
          overflowX: 'clip',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          paddingTop: topZone != null ? TOP_ZONE : 16,
          paddingLeft: 16,
          paddingRight: 16,
          // Bottom: dock height (~64) + controls headroom + 44 edge + safe-area.
          paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${MOBILE_EDGE + 92}px)`,
        }}
      >
        {children}
      </div>

      {/* BOTTOM — fixed dock: page controls + nav. 44px off edge + safe-area. */}
      {bottomDock != null && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 70,
            paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${MOBILE_EDGE - 16}px)`,
            paddingLeft: 16,
            paddingRight: 16,
            pointerEvents: 'none',
          }}
        >
          <div style={{ pointerEvents: 'auto' }}>{bottomDock}</div>
        </div>
      )}
    </div>
  )
}

/** Bottom fade so list content melts into the dock instead of hard-cutting. */
export function bottomDockFade(): CSSProperties {
  return {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
    zIndex: 65,
    pointerEvents: 'none',
    background: 'linear-gradient(to top, var(--color-bg), transparent)',
  }
}
