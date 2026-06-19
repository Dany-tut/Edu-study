import { type ReactNode, type CSSProperties } from 'react'

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
  // Portfolio top-nav logic: the bar floats just below the safe-area edge, and
  // content scrolls EDGE-TO-EDGE under it (paddingTop = safe-area + bar height),
  // so the notch/home-indicator zones are filled by content, never an empty band.
  void topRaise
  const SAFE_TOP = 'env(safe-area-inset-top, 0px)'
  const SAFE_BOTTOM = 'env(safe-area-inset-bottom, 0px)'
  const TOP_INSET = `calc(${SAFE_TOP} + 8px)`

  return (
    <div
      style={{
        position: 'relative',
        height: '100dvh',
        overflowX: 'clip',
        overflowY: 'hidden',
        // No solid fill — content scrolls edge-to-edge under the floating bars
        // and Safari tints the safe-area zones natively (body provides the base).
        background: 'transparent',
      }}
    >
      {/* TOP — floating glass widget zone. pointer-events pass through empty areas. */}
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
          }}
        >
          <div style={{ pointerEvents: 'auto' }}>{topZone}</div>
        </div>
      )}

      {/* MIDDLE — scroll body. scroll-under: paddingTop lifts content below the
          top zone; paddingBottom clears the bottom dock. */}
      <div
        key={scrollKey}
        className="no-scrollbar"
        style={{
          height: '100%',
          overflowY: 'auto',
          overflowX: 'clip',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          paddingTop: topZone != null ? `calc(${SAFE_TOP} + ${TOP_ZONE}px)` : `calc(${SAFE_TOP} + 16px)`,
          paddingLeft: 16,
          paddingRight: 16,
          // Bottom: home-indicator safe-area + dock/nav clearance.
          paddingBottom: `calc(${SAFE_BOTTOM} + ${MOBILE_EDGE + 92}px)`,
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
            paddingBottom: `${MOBILE_EDGE - 16}px`,
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
