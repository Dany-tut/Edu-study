import { useState, type ReactNode, type CSSProperties } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// MobileScreen — the reusable phone shell (MOBILE ONLY; desktop never imports).
// Layout model (docs/MOBILE_SPEC.md §1.1, approved):
//   TOP    → floating glass widget/context; content scrolls UNDER it (fade).
//   MIDDLE → scroll body: one-screen rule, overscroll contained, no h-overflow.
//   BOTTOM → page controls (glass circles) + nav, 44px off the screen edge + safe-area.
//
// Honors: scroll-under + top fade (§1.3), no horizontal scroll (§1.3), overscroll
// contain (§1.3), shadows/glows not clipped (§1.4, overflow-x visible padding),
// safe-area top & bottom (§1.1).
// ─────────────────────────────────────────────────────────────────────────────

/** Distance the bottom dock floats off the screen edge (px), on top of safe-area. */
export const MOBILE_EDGE = 44
/** Default height reserved at the top for the floating widget zone. */
const DEFAULT_TOP_PAD = 96

export default function MobileScreen({
  topZone,
  topPad = DEFAULT_TOP_PAD,
  topRaise = 44,
  bottomDock,
  children,
  scrollKey,
}: {
  /** Floating glass widget/context pinned to the top. Content scrolls under it. */
  topZone?: ReactNode
  /** Height the top zone occupies — body padding + fade height match it. */
  topPad?: number
  /** How many px to pull the top chrome up into the safe-area band (0 = sit
   *  fully below the notch). Default 44 tucks it against the status-bar edge. */
  topRaise?: number
  /** Bottom dock: page controls + nav. Rendered fixed, 44px off edge + safe-area. */
  bottomDock?: ReactNode
  children: ReactNode
  /** Change to reset scroll fade state when the page swaps. */
  scrollKey?: string | number
}) {
  const TOP_ZONE = topPad
  const [scrolled, setScrolled] = useState(false)
  // Pull the floating top chrome up into the status-bar zone so there's no empty
  // safe-area band above it (clamped so non-notch devices stay at 0).
  const TOP_INSET = `max(0px, calc(env(safe-area-inset-top, 0px) - ${topRaise}px))`

  return (
    <div
      style={{
        position: 'relative',
        height: '100dvh',
        // overflow-x clip prevents accidental horizontal scroll without clipping
        // vertical shadows/glows of inner cards (which extend up/down, not sideways).
        overflowX: 'clip',
        overflowY: 'hidden',
        background: 'var(--color-bg)',
        // Reserve the top notch area, less 44px so the bar tucks up near the edge.
        paddingTop: TOP_INSET,
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
            padding: '12px 16px 0',
            pointerEvents: 'none',
          }}
        >
          <div style={{ pointerEvents: 'auto' }}>{topZone}</div>
        </div>
      )}

      {/* TOP fade strip — content melts under the widget. Fades from pixel 0 (never
          a hard band). Only visible once the body has scrolled. */}
      <div
        style={{
          position: 'absolute',
          top: TOP_INSET,
          left: 0,
          right: 0,
          height: TOP_ZONE,
          zIndex: 50,
          pointerEvents: 'none',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
          maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
          opacity: scrolled ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}
      />

      {/* MIDDLE — scroll body. scroll-under: paddingTop lifts content below the
          top zone; paddingBottom clears the bottom dock. */}
      <div
        key={scrollKey}
        onScroll={e => {
          const next = e.currentTarget.scrollTop > 4
          setScrolled(prev => (prev === next ? prev : next))
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
