import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, User, Plus } from 'lucide-react'
import type { Group } from '../../data/teacherMockData'
import { useStudents } from '../../lib/useGroups'
import { mergeIndividuals, type PersonGroup } from '../../lib/personGroups'

export type TabConfig = {
  tabs: { id: string; label: string }[]
  activeTab: string
  onTabChange: (id: string) => void
  onTabPlusClick?: (tabId: string) => void
}

const PAGE_BG = 'var(--color-bg)'
const CARD_W = 190
const CARD_H = 172
const GAP = 14
// Room for the active card's glow (3px ring + ~20px shadow blur + hover lift) —
// overflowX:auto forces overflowY:auto, so without this padding the shadow clips.
const PAD_TOP = 26
const PAD_BOTTOM = 22
const BTN_GAP = 8
const BTN_H = (CARD_H - BTN_GAP) / 2
// Horizontal edge fade for the scroll strip. Transparent under the pinned button
// (x < CARD_W), a short fade-in just past it, opaque middle, and a soft right edge.
const MASK_R = 56
// Right fade width is dynamic: full (MASK_R) while there's more to scroll, easing
// to 0 over the last MASK_R px so the fade disappears once you reach the end (and
// stays gone when the strip doesn't overflow at all).
const scrollMask = (rightFade: number) =>
  `linear-gradient(to right, transparent 0, transparent ${CARD_W}px, ` +
  `#000 ${CARD_W + 34}px, #000 calc(100% - ${rightFade}px), transparent 100%)`

// ─── Tab panel ───────────────────────────────────────────────────────────────
function TabPanel({ config }: { config: TabConfig }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const hasPlus = !!config.onTabPlusClick

  return (
    <div style={{ width: CARD_W, height: CARD_H, display: 'flex', flexDirection: 'column', gap: BTN_GAP }}>
      {config.tabs.map(tab => {
        const isActive = config.activeTab === tab.id
        const isHovered = hoveredId === tab.id
        return (
          <motion.button
            key={tab.id}
            type="button"
            whileTap={{ scale: 0.97 }}
            onHoverStart={() => setHoveredId(tab.id)}
            onHoverEnd={() => setHoveredId(null)}
            onClick={() => {
              if (hasPlus && isActive) {
                config.onTabPlusClick!(tab.id)
              } else {
                config.onTabChange(tab.id)
              }
            }}
            style={{
              position: 'relative', overflow: 'hidden',
              width: '100%', height: BTN_H, boxSizing: 'border-box',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isActive
                ? 'var(--grad-purple)'
                : 'rgba(var(--glass-rgb), 0.96)',
              border: isActive ? 'none' : '1px solid var(--color-border-glass)',
              borderRadius: 16, cursor: 'pointer',
              color: isActive ? '#fff' : 'var(--color-muted)',
              fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
              boxShadow: isActive ? '0 3px 10px rgba(99,84,207,0.28)' : '0 1px 4px rgba(0,0,0,0.06)',
              backdropFilter: isActive ? 'none' : 'blur(14px)',
              transition: 'background 0.18s, color 0.18s, box-shadow 0.18s',
            }}
          >
            <span style={{ transition: 'opacity 0.15s', opacity: hasPlus && isActive && isHovered ? 0 : 1 }}>
              {tab.label}
            </span>

            {/* Plus overlay — only on the active tab */}
            {hasPlus && isActive && (
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    key="plus"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ duration: 0.12 }}
                    style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      pointerEvents: 'none',
                    }}
                  >
                    <Plus size={20} strokeWidth={2.5} style={{ color: '#fff' }} />
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}

// ─── Two stacked action buttons ───────────────────────────────────────────────
function ActionPanel({
  onAddGroup,
  onAddIndividual,
}: { onAddGroup: () => void; onAddIndividual: () => void }) {
  return (
    <div style={{ width: CARD_W, height: CARD_H, display: 'flex', flexDirection: 'column', gap: BTN_GAP }}>
      <motion.button
        type="button"
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.97 }}
        onClick={onAddGroup}
        style={{
          width: '100%', height: BTN_H, boxSizing: 'border-box',
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--grad-purple)',
          border: 'none', borderRadius: 16, cursor: 'pointer',
          padding: '0 16px', color: '#fff', fontFamily: 'inherit',
          boxShadow: '0 3px 10px rgba(99,84,207,0.28)',
        }}
      >
        <div style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Plus size={14} strokeWidth={2.5} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>Создать{'\n'}группу</span>
      </motion.button>

      <motion.button
        type="button"
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.97 }}
        onClick={onAddIndividual}
        style={{
          width: '100%', height: BTN_H, boxSizing: 'border-box',
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(var(--glass-rgb), 0.96)',
          border: '1px solid rgba(155,109,255,0.35)',
          borderRadius: 16, cursor: 'pointer',
          padding: '0 16px', color: 'var(--color-purple)', fontFamily: 'inherit',
          backdropFilter: 'blur(14px)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(155,109,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <User size={13} strokeWidth={2.2} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2, textAlign: 'left' }}>Добавить{'\n'}1:1</span>
      </motion.button>
    </div>
  )
}

// ─── Regular group card ───────────────────────────────────────────────────────
function GroupMiniCard({
  group, isActive, onClick, onAddToGroup,
}: { group: Group; isActive: boolean; onClick: () => void; onAddToGroup?: () => void }) {
  const progress = Math.round((group.lessonsCompleted / group.totalLessons) * 100)
  const [hovered, setHovered] = useState(false)
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(0,0,0,0.10)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: CARD_W, height: CARD_H, boxSizing: 'border-box', flex: '0 0 auto',
        display: 'flex', flexDirection: 'column',
        background: isActive ? `${group.color}14` : 'rgba(var(--glass-rgb), 0.88)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: isActive ? `1.5px solid ${group.color}` : '1px solid var(--color-border-glass)',
        borderRadius: 22,
        boxShadow: isActive ? `0 0 0 3px ${group.color}33, 0 4px 20px rgba(0,0,0,0.06)` : 'var(--shadow-sm-page)',
        cursor: 'pointer', userSelect: 'none',
        padding: '18px 20px',
        transition: 'background 0.18s, border 0.18s, box-shadow 0.18s',
        overflow: 'hidden', position: 'relative',
      }}
    >
      {/* Add existing student to this group — hover affordance */}
      <AnimatePresence>
        {onAddToGroup && hovered && (
          <motion.button
            key="add"
            initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.14 }}
            onClick={e => { e.stopPropagation(); onAddToGroup() }}
            title="Добавить ученика в группу"
            style={{
              position: 'absolute', top: 10, right: 10, zIndex: 6,
              width: 26, height: 26, borderRadius: 9, padding: 0,
              background: group.color, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', boxShadow: `0 2px 8px ${group.color}66`,
            }}
          >
            <Plus size={15} strokeWidth={2.6} />
          </motion.button>
        )}
      </AnimatePresence>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: group.color, background: group.color + '22', padding: '3px 9px', borderRadius: 8, border: `1px solid ${group.color}33` }}>
          {group.level}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-muted)' }}>
          <Users size={13} strokeWidth={1.8} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>{group.studentCount}</span>
        </div>
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>
        {group.name}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 14 }}>
          с {group.startDate}
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: 'var(--color-muted)', fontWeight: 600 }}>Прогресс</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text)' }}>{group.lessonsCompleted}/{group.totalLessons}</span>
          </div>
          <div style={{ height: 6, background: 'var(--color-bg-5)', borderRadius: 99, overflow: 'hidden' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{ height: '100%', background: group.color, borderRadius: 99 }} />
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 4 }}>{progress}% выполнено</div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Individual (1:1) student card ────────────────────────────────────────────
const attColor = (a: number) => a >= 90 ? 'var(--color-green-text)' : a >= 70 ? 'var(--color-yellow-text)' : 'var(--color-red-text)'
const hwColor = (h: number) => h >= 80 ? 'var(--color-green-text)' : h >= 60 ? 'var(--color-yellow-text)' : 'var(--color-red-text)'

function MetricCell({ label, value, color, divider }: { label: string; value: string; color: string; divider?: boolean }) {
  return (
    <div style={{ flex: 1, textAlign: 'center', borderLeft: divider ? '1px solid var(--color-border-soft)' : undefined }}>
      <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--color-text-3)' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 800, color, marginTop: 1 }}>{value}</div>
    </div>
  )
}

function IndividualCard({
  group, isActive, onClick,
}: { group: Group; isActive: boolean; onClick: () => void }) {
  const initials = group.name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()
  // The 1:1 group owns one student row — pull its metrics for the status footer.
  const { students } = useStudents(group.id)
  const stu = students[0] ?? null
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(0,0,0,0.10)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        width: CARD_W, height: CARD_H, boxSizing: 'border-box', flex: '0 0 auto',
        display: 'flex', flexDirection: 'column',
        background: isActive ? `${group.color}14` : 'rgba(var(--glass-rgb), 0.88)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: isActive ? `1.5px solid ${group.color}` : '1px solid var(--color-border-glass)',
        borderRadius: 22,
        boxShadow: isActive ? `0 0 0 3px ${group.color}33, 0 4px 20px rgba(0,0,0,0.06)` : 'var(--shadow-sm-page)',
        cursor: 'pointer', userSelect: 'none',
        padding: '15px 16px',
        transition: 'background 0.18s, border 0.18s, box-shadow 0.18s',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* 1:1 + level badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 11 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: group.color, background: group.color + '22', padding: '2px 8px', borderRadius: 7, border: `1px solid ${group.color}33` }}>
          1:1
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', background: 'var(--color-bg-5)', padding: '2px 8px', borderRadius: 6 }}>
          {group.level}
        </span>
        <User size={13} strokeWidth={1.8} style={{ color: 'var(--color-text-4)', marginLeft: 'auto' }} />
      </div>

      {/* Avatar + name + subject */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minHeight: 0 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 13, flexShrink: 0,
          background: `linear-gradient(135deg, ${group.color}, ${group.color}cc)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 800, color: '#fff',
          boxShadow: `0 2px 8px ${group.color}44`,
        }}>
          {initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {group.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {group.icon} {[group.subject, ...(group.tracks ?? []).map(t => t.subject).filter(Boolean)].join(' · ')}
          </div>
        </div>
      </div>

      {/* Status footer: live metrics from the student record */}
      <div style={{ display: 'flex', gap: 6, marginTop: 11, paddingTop: 10, borderTop: '1px solid var(--color-border-soft)' }}>
        <MetricCell label="Посещ." value={stu ? `${stu.attendance}%` : '—'} color={stu ? attColor(stu.attendance) : 'var(--color-text-4)'} />
        <MetricCell label="ДЗ" value={stu ? `${stu.hwScore}` : '—'} color={stu ? hwColor(stu.hwScore) : 'var(--color-text-4)'} divider />
        <MetricCell label="Цель" value={stu?.desiredScore ? `${stu.desiredScore}` : '—'} color="var(--color-accent)" divider />
      </div>
    </motion.div>
  )
}

// ─── Merged person card (several 1:1 subject-groups → one card with chips) ─────
function PersonCard({
  person, isActive, onClick,
}: { person: PersonGroup; isActive: boolean; onClick: () => void }) {
  const initials = person.name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(0,0,0,0.10)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        width: CARD_W, height: CARD_H, boxSizing: 'border-box', flex: '0 0 auto',
        display: 'flex', flexDirection: 'column',
        background: isActive ? `${person.color}14` : 'rgba(var(--glass-rgb), 0.88)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: isActive ? `1.5px solid ${person.color}` : '1px solid var(--color-border-glass)',
        borderRadius: 22,
        boxShadow: isActive ? `0 0 0 3px ${person.color}33, 0 4px 20px rgba(0,0,0,0.06)` : 'var(--shadow-sm-page)',
        cursor: 'pointer', userSelect: 'none',
        padding: '15px 16px',
        transition: 'background 0.18s, border 0.18s, box-shadow 0.18s',
        overflow: 'hidden', position: 'relative',
      }}
    >
      {/* 1:1 badge + count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 11 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: person.color, background: person.color + '22', padding: '2px 8px', borderRadius: 7, border: `1px solid ${person.color}33` }}>
          1:1
        </span>
        <User size={13} strokeWidth={1.8} style={{ color: 'var(--color-text-4)', marginLeft: 'auto' }} />
      </div>

      {/* Avatar + name + subject count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 13, flexShrink: 0,
          background: `linear-gradient(135deg, ${person.color}, ${person.color}cc)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 800, color: '#fff',
          boxShadow: `0 2px 8px ${person.color}44`,
        }}>
          {initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {person.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 3 }}>
            {person.subjects.length} {pluralSubjects(person.subjects.length)}
          </div>
        </div>
      </div>

      {/* Subject chips (labels only) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignContent: 'flex-start', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {person.subjects.map(s => (
          <span key={s.groupId} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 600, color: s.color,
            background: s.color + '1E', border: `1px solid ${s.color}3A`,
            borderRadius: 8, padding: '3px 9px', maxWidth: '100%',
          }}>
            <span>{s.icon}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.subject}</span>
          </span>
        ))}
      </div>
    </motion.div>
  )
}

function pluralSubjects(n: number): string {
  const mod10 = n % 10, mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'предмет'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'предмета'
  return 'предметов'
}

// ─── Strip ────────────────────────────────────────────────────────────────────
export default function GroupStrip({
  groups,
  individualGroups = [],
  selectedGroupId,
  onSelectGroup,
  onAddGroup,
  onAddIndividual,
  tabConfig,
  actionLabel,
  actionIcon: LegacyIcon,
  onAction,
  onAddToGroup,
  mergePersons = false,
}: {
  groups: Group[]
  individualGroups?: Group[]
  selectedGroupId: string | null
  onSelectGroup: (id: string | null) => void
  onAddGroup?: () => void
  onAddIndividual?: () => void
  tabConfig?: TabConfig
  actionLabel?: string
  actionIcon?: React.ElementType
  onAction?: () => void
  /** Hover "+" on a regular group card → enroll an existing student into it. */
  onAddToGroup?: (groupId: string) => void
  /** Merge a person's several 1:1 subject-groups into one card with subject chips. */
  mergePersons?: boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragState = useRef<{ startX: number; scrollLeft: number; moved: boolean } | null>(null)
  const [rightFade, setRightFade] = useState(0)

  // Track distance to the right end → shrink the right fade as we approach it.
  const recomputeFade = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const remaining = el.scrollWidth - el.clientWidth - el.scrollLeft
    setRightFade(Math.max(0, Math.min(MASK_R, remaining)))
  }, [])

  // Recompute on mount, on data changes, and on any size change (no rAF in preview).
  useEffect(() => {
    recomputeFade()
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(recomputeFade)
    ro.observe(el)
    return () => ro.disconnect()
  }, [recomputeFade, groups.length, individualGroups.length])

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

  const hasIndividual = individualGroups.length > 0

  return (
    <div style={{ position: 'relative', height: CARD_H + PAD_TOP + PAD_BOTTOM }}>
      <div
        ref={scrollRef}
        onScroll={recomputeFade}
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
          // Horizontal-only fade: `to right` keeps vertical alpha at 100%, so the
          // active card's glow/lift is never clipped top/bottom. The left band
          // (x < CARD_W) is fully transparent → cards' hover/selection/borders can
          // never peek out above, below, or beside the pinned action button; they
          // fade back in just past it. The right edge softens the scroll cutoff.
          WebkitMaskImage: scrollMask(rightFade),
          maskImage: scrollMask(rightFade),
        }}
      >
        {/* Regular group cards */}
        {groups.map(group => (
          <GroupMiniCard
            key={group.id}
            group={group}
            isActive={selectedGroupId === group.id}
            onClick={() => { if (!dragState.current?.moved) onSelectGroup(selectedGroupId === group.id ? null : group.id) }}
            onAddToGroup={onAddToGroup ? () => onAddToGroup(group.id) : undefined}
          />
        ))}

        {/* Divider between groups and individuals */}
        {hasIndividual && groups.length > 0 && (
          <div style={{ width: 1, height: CARD_H * 0.6, background: 'var(--color-border-soft)', flexShrink: 0, borderRadius: 1, alignSelf: 'center' }} />
        )}

        {/* Individual (1:1) cards — optionally merged per person */}
        {mergePersons
          ? mergeIndividuals(individualGroups).map(person => {
              const active = person.memberIds.includes(selectedGroupId ?? '')
              // Single-subject person keeps the rich metric card; multi-subject
              // collapses into a chip card.
              if (person.memberIds.length === 1) {
                const g = individualGroups.find(ig => ig.id === person.memberIds[0])!
                return (
                  <IndividualCard
                    key={person.id}
                    group={g}
                    isActive={active}
                    onClick={() => { if (!dragState.current?.moved) onSelectGroup(active ? null : person.id) }}
                  />
                )
              }
              return (
                <PersonCard
                  key={person.id}
                  person={person}
                  isActive={active}
                  onClick={() => { if (!dragState.current?.moved) onSelectGroup(active ? null : person.id) }}
                />
              )
            })
          : individualGroups.map(group => (
              <IndividualCard
                key={group.id}
                group={group}
                isActive={selectedGroupId === group.id}
                onClick={() => { if (!dragState.current?.moved) onSelectGroup(selectedGroupId === group.id ? null : group.id) }}
              />
            ))}
      </div>

      {/* Pinned action panel — tab mode / dual add mode / legacy single-action */}
      <div style={{ position: 'absolute', left: 0, top: PAD_TOP, width: CARD_W, height: CARD_H, zIndex: 5, background: PAGE_BG }}>
        {tabConfig
          ? <TabPanel config={tabConfig} />
          : onAddGroup && onAddIndividual
            ? <ActionPanel onAddGroup={onAddGroup} onAddIndividual={onAddIndividual} />
            : <LegacySingleAction label={actionLabel ?? ''} icon={LegacyIcon} onClick={onAction ?? (() => {})} />
        }
      </div>
    </div>
  )
}

function LegacySingleAction({ label, icon: Icon, onClick }: { label: string; icon?: React.ElementType; onClick: () => void }) {
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
        background: 'var(--grad-purple)',
        border: 'none', borderRadius: 22, cursor: 'pointer',
        padding: '18px 20px', color: '#fff', fontFamily: 'inherit',
        boxShadow: '0 4px 14px rgba(99,84,207,0.26), 7px 0 18px -8px rgba(30,20,60,0.18)',
      }}
    >
      <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {Icon && <Icon size={17} strokeWidth={2.4} />}
      </div>
      <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.25, whiteSpace: 'pre-line' }}>{label}</span>
    </motion.button>
  )
}
