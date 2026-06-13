import { useRef } from 'react'
import { motion } from 'framer-motion'
import { Users } from 'lucide-react'
import type { Group } from '../../data/teacherMockData'

// PAGE_BG backs the pinned action card so group cards slide cleanly under it.
const PAGE_BG = 'var(--color-bg)'
const CARD_W = 190
const CARD_H = 172  // matches natural GroupCard content height (18/20px padding + full content)
const GAP = 14
const PAD_TOP = 12
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
        border: 'none', borderRadius: 22, cursor: 'pointer',
        padding: '18px 20px', color: '#fff',
        boxShadow: '0 4px 14px rgba(123,63,204,0.26), 7px 0 18px -8px rgba(30,20,60,0.18)',
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 10,
        background: 'rgba(255,255,255,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={17} strokeWidth={2.4} />
      </div>
      <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.25, whiteSpace: 'pre-line' }}>{label}</span>
    </motion.button>
  )
}

// ─── Group card — identical style to GroupCard in TeacherGroupsPage ───────────
function GroupMiniCard({
  group, isActive, onClick,
}: { group: Group; isActive: boolean; onClick: () => void }) {
  const progress = Math.round((group.lessonsCompleted / group.totalLessons) * 100)
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(0,0,0,0.10)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        width: CARD_W, height: CARD_H, boxSizing: 'border-box', flex: '0 0 auto',
        display: 'flex', flexDirection: 'column',
        background: isActive
          ? `${group.color}14`
          : 'rgba(var(--glass-rgb), 0.88)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: isActive
          ? `1.5px solid ${group.color}`
          : '1px solid var(--color-border-glass)',
        borderRadius: 22,
        boxShadow: isActive
          ? `0 0 0 3px ${group.color}33, 0 4px 20px rgba(0,0,0,0.06)`
          : 'var(--shadow-sm-page)',
        cursor: 'pointer', userSelect: 'none',
        padding: '18px 20px',
        transition: 'background 0.18s, border 0.18s, box-shadow 0.18s',
        overflow: 'hidden',
      }}
    >
      {/* Badge + count */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
          color: group.color,
          background: group.color + '22',
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

      {/* Name */}
      <div style={{
        fontSize: 15, fontWeight: 700, color: 'var(--color-text)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        marginBottom: 4,
      }}>
        {group.name}
      </div>

      {/* Date + progress */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 14 }}>
          с {group.startDate}
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: 'var(--color-muted)', fontWeight: 600 }}>Прогресс</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text)' }}>
              {group.lessonsCompleted}/{group.totalLessons}
            </span>
          </div>
          <div style={{ height: 6, background: 'var(--color-bg-5)', borderRadius: 99, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{ height: '100%', background: group.color, borderRadius: 99 }}
            />
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 4 }}>
            {progress}% выполнено
          </div>
        </div>
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
      {/* Scrollable group cards */}
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

      {/* Pinned action card — backed by a page-coloured plate so rounded corners
          always sit against the page, never a card sliding underneath. */}
      <div style={{ position: 'absolute', left: 0, top: PAD_TOP, width: CARD_W, height: CARD_H, zIndex: 5, background: PAGE_BG }}>
        <ActionCard label={actionLabel} icon={actionIcon} onClick={onAction} />
      </div>
    </div>
  )
}
