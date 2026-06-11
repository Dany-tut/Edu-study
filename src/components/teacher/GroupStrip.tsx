import { useRef } from 'react'
import { motion } from 'framer-motion'
import { Users } from 'lucide-react'
import type { Group } from '../../data/teacherMockData'

// Page background the strip sits on — used to back the pinned card so its
// rounded corners always read against the page, never a card sliding underneath.
const PAGE_BG = 'var(--color-bg)'
const CARD_W = 190
const CARD_H = 88
const GAP = 14
const PAD_TOP = 6
const PAD_BOTTOM = 10

// ─── Fixed action card (pinned; groups scroll cleanly under it) ────────────────
function ActionCard({
  label, icon: Icon, onClick,
}: { label: string; icon: React.ElementType; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        width: CARD_W, height: CARD_H, boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        alignItems: 'flex-start', textAlign: 'left',
        background: 'linear-gradient(135deg, #9B6DFF 0%, #7B3FCC 100%)',
        border: 'none', borderRadius: 18, cursor: 'pointer',
        padding: '14px 16px', color: '#fff',
        // Subtle drop shadow + a soft shadow cast to the RIGHT so cards read as
        // sliding cleanly underneath the card (replaces the old gradient fade).
        boxShadow: '0 4px 14px rgba(123,63,204,0.26), 7px 0 18px -8px rgba(30,20,60,0.18)',
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 10,
        background: 'rgba(var(--glass-rgb), 0.22)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={17} strokeWidth={2.4} />
      </div>
      <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>{label}</span>
    </motion.button>
  )
}

// ─── Group mini card ───────────────────────────────────────────────────────────
function GroupMiniCard({
  group, isActive, onClick,
}: { group: Group; isActive: boolean; onClick: () => void }) {
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 8px 22px rgba(0,0,0,0.09)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        width: CARD_W, height: CARD_H, boxSizing: 'border-box', flex: '0 0 auto',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        background: isActive ? `${group.color}14` : 'rgba(var(--glass-rgb), 0.97)',
        border: isActive ? `1.5px solid ${group.color}` : '1px solid var(--color-border-soft)',
        borderRadius: 18, cursor: 'pointer', userSelect: 'none',
        padding: '14px 16px',
        boxShadow: isActive
          ? `0 0 0 3px ${group.color}22, 0 4px 16px rgba(0,0,0,0.05)`
          : '0 2px 10px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
          color: group.color, background: group.colorSoft,
          padding: '3px 9px', borderRadius: 8,
          border: `1px solid ${group.color}33`,
        }}>
          {group.level}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-muted)' }}>
          <Users size={13} strokeWidth={1.8} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>{group.studentCount}</span>
        </div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {group.name}
      </div>
    </motion.div>
  )
}

// ─── Strip ──────────────────────────────────────────────────────────────────────
export default function GroupStrip({
  groups,
  selectedGroupId, onSelectGroup,
  actionLabel, actionIcon, onAction,
}: {
  groups: Group[]
  selectedGroupId: string | null
  onSelectGroup: (id: string | null) => void
  actionLabel: string
  actionIcon: React.ElementType
  onAction: () => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragState = useRef<{ startX: number; scrollLeft: number; moved: boolean } | null>(null)

  function handleWheel(e: React.WheelEvent) {
    const el = scrollRef.current
    if (!el) return
    // Only hijack genuinely horizontal gestures; vertical wheel scrolls the page.
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
    if (el.scrollWidth - el.clientWidth <= 1) return
    e.preventDefault()
    el.scrollLeft += e.deltaX
  }

  function handleMouseDown(e: React.MouseEvent) {
    const el = scrollRef.current
    if (!el) return
    dragState.current = { startX: e.pageX, scrollLeft: el.scrollLeft, moved: false }
  }
  function handleMouseMove(e: React.MouseEvent) {
    const el = scrollRef.current
    if (!el || !dragState.current) return
    const dx = e.pageX - dragState.current.startX
    if (Math.abs(dx) > 3) dragState.current.moved = true
    el.scrollLeft = dragState.current.scrollLeft - dx
  }
  function handleMouseUp() { dragState.current = null }

  return (
    <div style={{ position: 'relative', height: CARD_H + PAD_TOP + PAD_BOTTOM }}>
      {/* Scrollable group cards — start past the pinned card and slide under it */}
      <div
        ref={scrollRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          display: 'flex', gap: GAP, alignItems: 'center',
          height: '100%', boxSizing: 'border-box',
          overflowX: 'auto',
          paddingTop: PAD_TOP, paddingBottom: PAD_BOTTOM,
          paddingLeft: CARD_W + GAP,
          scrollbarWidth: 'none',
        }}
      >
        {groups.map(group => (
          <GroupMiniCard
            key={group.id}
            group={group}
            isActive={selectedGroupId === group.id}
            onClick={() => {
              if (dragState.current?.moved) return
              onSelectGroup(selectedGroupId === group.id ? null : group.id)
            }}
          />
        ))}
      </div>

      {/* Pinned action card — backed by a page-coloured plate so the rounded
          corners always sit against the page, never a card sliding underneath. */}
      <div style={{ position: 'absolute', left: 0, top: PAD_TOP, width: CARD_W, height: CARD_H, zIndex: 5, background: PAGE_BG }}>
        <ActionCard label={actionLabel} icon={actionIcon} onClick={onAction} />
      </div>
    </div>
  )
}
