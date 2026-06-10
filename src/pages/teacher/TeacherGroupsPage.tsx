import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, ChevronUp, ChevronDown, X,
  Phone, Send, User,
  TrendingUp, ClipboardCheck, Clock, Award,
  ChevronsUpDown, ExternalLink,
} from 'lucide-react'
import {
  groups, students,
  type Group, type Student,
} from '../../data/teacherMockData'
import { useTeacher } from '../../store/teacherStore'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.38, delay, ease: [0.22, 1, 0.36, 1] },
})

// ─── Glass card ──────────────────────────────────────────────────────────────
function Card({
  children, style, onClick,
}: { children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.9)',
        borderRadius: 22,
        boxShadow: '0 4px 20px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.95)',
        padding: 20,
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ─── Group card ───────────────────────────────────────────────────────────────
function GroupCard({
  group, isActive, onClick,
}: { group: Group; isActive: boolean; onClick: () => void }) {
  const progress = Math.round((group.lessonsCompleted / group.totalLessons) * 100)
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(0,0,0,0.10)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      data-group-card
      data-compact="false"
      className="group-card"
      style={{
        background: isActive ? `${group.color}14` : 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: isActive ? `1.5px solid ${group.color}` : '1px solid rgba(255,255,255,0.9)',
        borderRadius: 22,
        boxShadow: isActive
          ? `0 0 0 3px ${group.color}33, 0 4px 20px rgba(0,0,0,0.06)`
          : '0 4px 20px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.95)',
        cursor: 'pointer',
        flex: '1 1 180px',
        overflow: 'hidden',
      }}
    >
      {/* Level badge + count */}
      <div className="group-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
          color: group.color.replace(')', ', 0.8)').replace('rgb', 'rgba'),
          background: group.colorSoft,
          padding: '3px 9px', borderRadius: 8,
          border: `1px solid ${group.color}33`,
        }}>
          {group.level}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6F6F76' }}>
          <Users size={13} strokeWidth={1.8} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>{group.studentCount}</span>
        </div>
      </div>

      {/* Name */}
      <div className="group-card-name" style={{ fontWeight: 700, color: '#0B0B0D' }}>
        {group.name}
      </div>

      {/* Date + progress — hidden in compact via CSS */}
      <div className="group-card-details">
        <div style={{ fontSize: 12, color: '#6F6F76', marginBottom: 14 }}>
          с {group.startDate}
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: '#6F6F76', fontWeight: 600 }}>Прогресс</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#0B0B0D' }}>
              {group.lessonsCompleted}/{group.totalLessons}
            </span>
          </div>
          <div style={{ height: 6, background: 'rgba(0,0,0,0.07)', borderRadius: 99, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{ height: '100%', background: group.color, borderRadius: 99 }}
            />
          </div>
          <div style={{ fontSize: 10, color: '#9A9AA2', marginTop: 4 }}>{progress}% выполнено</div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Sort helpers ─────────────────────────────────────────────────────────────
type SortKey = 'name' | 'lastVisit' | 'hwScore' | 'testScore' | 'trialScore' | 'attendance' | 'lastPayment' | 'debt'
type SortDir = 'asc' | 'desc'

function sortStudents(list: Student[], key: SortKey, dir: SortDir) {
  return [...list].sort((a, b) => {
    let av: number | string = (a as Record<string, unknown>)[key] as number | string ?? -1
    let bv: number | string = (b as Record<string, unknown>)[key] as number | string ?? -1
    if (typeof av === 'string' && typeof bv === 'string') {
      // dd.mm.yyyy → yyyymmdd for lastVisit; ISO dates sort lexically already
      const toTs = (s: string) => s.includes('.') ? s.split('.').reverse().join('') : s
      av = toTs(av); bv = toTs(bv)
    }
    if (av < bv) return dir === 'asc' ? -1 : 1
    if (av > bv) return dir === 'asc' ? 1 : -1
    return 0
  })
}

// ─── Table header cell ────────────────────────────────────────────────────────
function Th({
  label, sortKey, currentKey, dir, onSort, right, last,
}: {
  label: string; sortKey: SortKey; currentKey: SortKey; dir: SortDir
  onSort: (k: SortKey) => void; right?: boolean; last?: boolean
}) {
  const active = currentKey === sortKey
  return (
    <th
      onClick={() => onSort(sortKey)}
      style={{
        padding: last ? '10px 24px 10px 12px' : '10px 12px',
        textAlign: right ? 'center' : 'left',
        fontSize: 11, fontWeight: 700, color: active ? '#7B3FCC' : '#9A9AA2',
        letterSpacing: 0.3, cursor: 'pointer', whiteSpace: 'nowrap',
        userSelect: 'none',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
        {label}
        {active
          ? dir === 'asc'
            ? <ChevronUp size={11} />
            : <ChevronDown size={11} />
          : <ChevronsUpDown size={11} style={{ opacity: 0.4 }} />
        }
      </span>
    </th>
  )
}

function ScorePill({ value, max = 100 }: { value: number | null; max?: number }) {
  if (value === null) return <span style={{ color: '#C2C2C8', fontSize: 12 }}>—</span>
  const pct = value / max
  const color = pct >= 0.8 ? '#1a7a3f' : pct >= 0.6 ? '#7a6500' : '#c0303a'
  const bg    = pct >= 0.8 ? '#DFF8D6' : pct >= 0.6 ? '#FFF9CC' : '#FFE1E4'
  return (
    <span style={{
      display: 'inline-block', minWidth: 34,
      fontSize: 12, fontWeight: 700, color,
      background: bg, borderRadius: 7, padding: '2px 7px', textAlign: 'center',
    }}>
      {value}
    </span>
  )
}

// ─── Student profile panel ────────────────────────────────────────────────────
function StudentPanel({
  student, group, onClose,
}: { student: Student; group: Group; onClose: () => void }) {
  const initials = student.name.split(' ').map(p => p[0]).join('').slice(0, 2)
  const [comment, setComment] = useState(student.comment ?? '')
  return (
    <motion.div
      initial={{ x: 360, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 360, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.8 }}
      style={{
        width: 320, flexShrink: 0, flex: 1, minHeight: 0,
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(0,0,0,0.07)',
        borderRadius: 20,
        margin: '36px 12px 12px 0',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(0,0,0,0.10)',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '20px 20px 16px',
        background: group.colorSoft,
        borderBottom: `1px solid ${group.color}44`,
        borderTopLeftRadius: 19,
        borderTopRightRadius: 19,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 16,
              background: group.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 700, color: '#fff',
              flexShrink: 0,
            }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0B0B0D', lineHeight: 1.2 }}>
                {student.name}
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 5,
                background: group.color + '33', borderRadius: 7, padding: '2px 8px',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: group.color }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#0B0B0D' }}>{group.name}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              border: 'none', cursor: 'pointer',
              background: 'rgba(0,0,0,0.07)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#6F6F76', flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Contacts */}
        <section>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9A9AA2', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>
            Контакты
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <ContactRow icon={Phone} label={student.phone} href={`tel:${student.phone}`} />
            {student.telegramLink && (
              <ContactRow icon={Send} label={`@${student.telegramLink}`} href={`https://t.me/${student.telegramLink}`} />
            )}
            {student.parentContact && (
              <ContactRow icon={User} label={`Родитель: ${student.parentContact}`} href={`tel:${student.parentContact}`} />
            )}
          </div>
        </section>

        {/* Scores */}
        <section>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9A9AA2', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>
            Показатели
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ScoreBar label="ДЗ" icon={ClipboardCheck} value={student.hwScore} color="#5FD68A" bg="#D6F5E3" />
            <ScoreBar label="Тесты" icon={TrendingUp} value={student.testScore} color="#B98FFF" bg="#EFE0FF" />
            {student.trialScore !== null && (
              <ScoreBar label="Пробник" icon={Award} value={student.trialScore} color="#F5A623" bg="#FFF3D6" />
            )}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '7px 10px', background: '#F5F5F6', borderRadius: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Clock size={13} strokeWidth={2} style={{ color: '#6F6F76' }} />
                <span style={{ fontSize: 12, color: '#6F6F76' }}>Посещаемость</span>
              </div>
              <span style={{
                fontSize: 13, fontWeight: 700,
                color: student.attendance >= 90 ? '#1a7a3f' : student.attendance >= 70 ? '#7a6500' : '#c0303a',
              }}>
                {student.attendance}%
              </span>
            </div>
          </div>
        </section>

        {/* Goal */}
        <section>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9A9AA2', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>
            Цель
          </div>
          <div style={{
            background: '#FFF9CC', border: '1px solid #F8C99166',
            borderRadius: 12, padding: '10px 12px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 12, color: '#6F6F76' }}>Желаемый балл ЕГЭ</span>
            <span style={{ fontSize: 18, fontWeight: 750, color: '#7a6500' }}>{student.desiredScore}</span>
          </div>
        </section>

        {/* Info */}
        <section>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9A9AA2', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>
            Прочее
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <InfoRow label="Начал(а)" value={student.startedAt} />
            <InfoRow label="Последний вход" value={student.lastVisit} />
          </div>
        </section>

        {/* Comment */}
        <section>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9A9AA2', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>
            Комментарий
          </div>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Добавить комментарий..."
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#F5F5F6', border: '1.5px solid transparent',
              borderRadius: 12, padding: '10px 12px',
              fontSize: 12, color: '#3A3A40', lineHeight: 1.6,
              resize: 'none', outline: 'none', fontFamily: 'inherit',
              transition: 'border-color 0.15s, background 0.15s',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = group.color
              e.currentTarget.style.background = '#fff'
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'transparent'
              e.currentTarget.style.background = '#F5F5F6'
            }}
          />
        </section>
      </div>
    </motion.div>
  )
}

function ContactRow({ icon: Icon, label, href }: { icon: React.ElementType; label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 10px', background: '#F5F5F6',
        borderRadius: 10, textDecoration: 'none',
        color: '#0B0B0D', fontSize: 12, fontWeight: 500,
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#EEDBFF')}
      onMouseLeave={e => (e.currentTarget.style.background = '#F5F5F6')}
    >
      <Icon size={13} strokeWidth={2} style={{ color: '#7B3FCC', flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{label}</span>
      <ExternalLink size={11} style={{ color: '#9A9AA2' }} />
    </a>
  )
}

function ScoreBar({ label, icon: Icon, value, color, bg }: {
  label: string; icon: React.ElementType; value: number; color: string; bg: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon size={12} strokeWidth={2} style={{ color }} />
          <span style={{ fontSize: 11, color: '#6F6F76', fontWeight: 600 }}>{label}</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
      </div>
      <div style={{ height: 5, background: 'rgba(0,0,0,0.06)', borderRadius: 99, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ height: '100%', background: color, borderRadius: 99, opacity: 0.8 }}
        />
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
      <span style={{ fontSize: 12, color: '#9A9AA2' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#0B0B0D' }}>{value}</span>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TeacherGroupsPage() {
  const { selectedGroupId, setSelectedGroupId } = useTeacher()
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const tableRef = useRef<HTMLDivElement>(null)
  const groupsScrollRef = useRef<HTMLDivElement>(null)
  const mainScrollRef = useRef<HTMLDivElement>(null)
  const groupsStickyRef = useRef<HTMLDivElement>(null)
  const groupsLabelRef = useRef<HTMLDivElement>(null)
  // scrolled state removed — compact handled via direct DOM manipulation (no re-renders)

  useEffect(() => {
    if (!selectedGroupId && groups.length > 0) {
      setSelectedGroupId(groups[0].id)
    }
  }, [])

  useEffect(() => {
    const el = mainScrollRef.current
    if (!el) return
    let wasCompact = false
    const onScroll = () => {
      // Hysteresis band (expand < 16, compact > 48) so the toggle can't
      // flip-flop when the scroll position sits right at the threshold.
      const compact = wasCompact ? el.scrollTop > 16 : el.scrollTop > 48
      if (compact === wasCompact) return
      wasCompact = compact
      const sticky = groupsStickyRef.current
      const label = groupsLabelRef.current
      if (sticky) {
        sticky.style.paddingBottom = compact ? '10px' : '14px'
        sticky.style.marginBottom = compact ? '8px' : '20px'
      }
      if (label) {
        label.style.marginBottom = compact ? '8px' : '12px'
      }
      // toggle data-compact on all group cards
      sticky?.querySelectorAll('[data-group-card]').forEach(card => {
        (card as HTMLElement).dataset.compact = compact ? 'true' : 'false'
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  function handleGroupsWheel(e: React.WheelEvent) {
    const el = groupsScrollRef.current
    if (!el) return
    // Only treat genuinely horizontal gestures (trackpad swipe / shift+wheel) as
    // strip scrolling. A vertical wheel must always bubble up to the table's
    // vertical scroll — hijacking it made the table refuse to scroll and the
    // sticky cards jerk sideways instead.
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
    if (el.scrollWidth - el.clientWidth <= 1) return
    e.preventDefault()
    el.scrollLeft += e.deltaX
  }

  const dragState = useRef<{ startX: number; scrollLeft: number } | null>(null)

  function handleGroupsMouseDown(e: React.MouseEvent) {
    const el = groupsScrollRef.current
    if (!el) return
    dragState.current = { startX: e.pageX, scrollLeft: el.scrollLeft }
    el.style.cursor = 'grabbing'
  }

  function handleGroupsMouseMove(e: React.MouseEvent) {
    if (!dragState.current) return
    const el = groupsScrollRef.current
    if (!el) return
    el.scrollLeft = dragState.current.scrollLeft - (e.pageX - dragState.current.startX)
  }

  function handleGroupsMouseUp() {
    dragState.current = null
    if (groupsScrollRef.current) groupsScrollRef.current.style.cursor = 'grab'
  }

  const activeGroup = groups.find(g => g.id === selectedGroupId) ?? null
  const groupStudents = activeGroup
    ? sortStudents(students.filter(s => s.groupId === activeGroup.id), sortKey, sortDir)
    : []
  const activeStudent = students.find(s => s.id === activeStudentId) ?? null
  const activeStudentGroup = activeStudent ? groups.find(g => g.id === activeStudent.groupId) ?? null : null

  function handleGroupClick(group: Group) {
    if (selectedGroupId === group.id) {
      setSelectedGroupId(null)
      setActiveStudentId(null)
    } else {
      setSelectedGroupId(group.id)
      setActiveStudentId(null)
      setSortKey('name')
      setSortDir('asc')
    }
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>

      {/* Column: fixed group header + scrollable table below */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

        {/* Group cards — fixed header (NOT inside the scroll area, so compressing
            it never shifts the table's scroll position), compresses on scroll */}
        <motion.div
          {...fadeUp(0.04)}
          ref={groupsStickyRef}
          style={{
            flexShrink: 0,
            background: '#F5F5F6',
            paddingLeft: 32, paddingRight: 32,
            paddingTop: 0,
            paddingBottom: 14,
            marginBottom: 20,
            transition: 'padding-bottom 0.28s ease, margin-bottom 0.28s ease',
          }}
        >
          <div ref={groupsLabelRef} style={{
            fontSize: 12, fontWeight: 700, color: '#9A9AA2', letterSpacing: 0.4,
            marginBottom: 12,
            transition: 'margin-bottom 0.28s ease',
          }}>
            ГРУППЫ
          </div>
          <div style={{ position: 'relative' }}>
            <div
              ref={groupsScrollRef}
              onWheel={handleGroupsWheel}
              onMouseDown={handleGroupsMouseDown}
              onMouseMove={handleGroupsMouseMove}
              onMouseUp={handleGroupsMouseUp}
              onMouseLeave={handleGroupsMouseUp}
              style={{
                display: 'flex', gap: 14,
                overflowX: 'auto', paddingTop: 6, paddingBottom: 6,
                scrollbarWidth: 'none',
                marginLeft: -32, marginRight: -32,
                paddingLeft: 32, paddingRight: 32,
                cursor: 'grab',
                userSelect: 'none',
              }}
            >
              {groups.map((group, i) => (
                <motion.div key={group.id} {...fadeUp(0.04 + i * 0.05)} style={{ flex: '0 0 calc(20% - 12px)', minWidth: 180 }}>
                  <GroupCard
                    group={group}
                    isActive={selectedGroupId === group.id}
                    onClick={() => handleGroupClick(group)}
                  />
                </motion.div>
              ))}
            </div>
            {/* Right fade */}
            <div style={{
              position: 'absolute', right: -32, top: 0, bottom: 6,
              width: 100, pointerEvents: 'none',
              background: 'linear-gradient(to right, transparent, #F5F5F6)',
            }} />
          </div>
          {/* Bottom fade — softens rows scrolling up under the sticky bar */}
          <div style={{
            position: 'absolute', left: 0, right: 0, top: 'calc(100% - 20px)',
            height: 44, pointerEvents: 'none',
            background: 'linear-gradient(to bottom, #F5F5F6 0%, #F5F5F6 45%, rgba(245,245,246,0) 100%)',
          }} />
        </motion.div>

      {/* Main scrollable area (table only) */}
      <div ref={mainScrollRef} style={{ flex: 1, minWidth: 0, overflowY: 'scroll', scrollbarGutter: 'stable', padding: '0 32px 32px' }}>

        {/* Student table */}
        <AnimatePresence>
          {activeGroup && (
            <motion.div
              ref={tableRef}
              key="student-table"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0, marginRight: activeStudentId ? 344 : 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                {/* Table header */}
                <div style={{
                  padding: '14px 20px 0',
                  display: 'flex', alignItems: 'center', gap: 10,
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                  paddingBottom: 0,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%', background: activeGroup.color,
                    }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0B0B0D' }}>
                      {activeGroup.name}
                    </span>
                    <span style={{ fontSize: 12, color: '#9A9AA2' }}>
                      · {groupStudents.length} студентов
                    </span>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,0,0,0.018)' }}>
                        <Th label="Студент"        sortKey="name"       currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                        <Th label="Посл. вход"     sortKey="lastVisit"  currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                        <Th label="ДЗ"             sortKey="hwScore"    currentKey={sortKey} dir={sortDir} onSort={handleSort} right />
                        <Th label="Тест"           sortKey="testScore"  currentKey={sortKey} dir={sortDir} onSort={handleSort} right />
                        <Th label="Пробник"        sortKey="trialScore"   currentKey={sortKey} dir={sortDir} onSort={handleSort} right />
                        <Th label="Посещ."         sortKey="attendance"   currentKey={sortKey} dir={sortDir} onSort={handleSort} right />
                        <Th label="Посл. оплата"   sortKey="lastPayment"  currentKey={sortKey} dir={sortDir} onSort={handleSort} right />
                        <Th label="Долг"           sortKey="debt"         currentKey={sortKey} dir={sortDir} onSort={handleSort} right last />
                      </tr>
                    </thead>
                    <tbody>
                      {groupStudents.map((student, i) => {
                        const isSelected = student.id === activeStudentId
                        const initials = student.name.split(' ').map(p => p[0]).join('').slice(0, 2)
                        return (
                          <motion.tr
                            key={student.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.24, delay: i * 0.04 }}
                            onClick={() => setActiveStudentId(isSelected ? null : student.id)}
                            style={{
                              cursor: 'pointer',
                              background: isSelected ? activeGroup.colorSoft : 'transparent',
                              borderLeft: isSelected ? `3px solid ${activeGroup.color}` : '3px solid transparent',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => {
                              if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.022)'
                            }}
                            onMouseLeave={e => {
                              if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'
                            }}
                          >
                            {/* Name */}
                            <td style={{ padding: '11px 12px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                  width: 30, height: 30, borderRadius: 10, flexShrink: 0,
                                  background: activeGroup.color,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 11, fontWeight: 700, color: '#fff',
                                }}>
                                  {initials}
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#0B0B0D', whiteSpace: 'nowrap' }}>
                                  {student.name}
                                </span>
                              </div>
                            </td>
                            {/* Last visit */}
                            <td style={{ padding: '11px 12px', borderBottom: '1px solid rgba(0,0,0,0.04)', fontSize: 12, color: '#6F6F76', whiteSpace: 'nowrap' }}>
                              {student.lastVisit}
                            </td>
                            {/* Scores */}
                            <td style={{ padding: '11px 12px', borderBottom: '1px solid rgba(0,0,0,0.04)', textAlign: 'center' }}>
                              <ScorePill value={student.hwScore} />
                            </td>
                            <td style={{ padding: '11px 12px', borderBottom: '1px solid rgba(0,0,0,0.04)', textAlign: 'center' }}>
                              <ScorePill value={student.testScore} />
                            </td>
                            <td style={{ padding: '11px 12px', borderBottom: '1px solid rgba(0,0,0,0.04)', textAlign: 'center' }}>
                              <ScorePill value={student.trialScore} />
                            </td>
                            {/* Attendance */}
                            <td style={{ padding: '11px 12px', borderBottom: '1px solid rgba(0,0,0,0.04)', textAlign: 'center' }}>
                              <span style={{
                                fontSize: 12, fontWeight: 700,
                                color: student.attendance >= 90 ? '#1a7a3f' : student.attendance >= 70 ? '#7a6500' : '#c0303a',
                              }}>
                                {student.attendance}%
                              </span>
                            </td>
                            {/* Last payment */}
                            <td style={{ padding: '11px 12px', borderBottom: '1px solid rgba(0,0,0,0.04)', textAlign: 'center' }}>
                              <span style={{ fontSize: 12, color: student.lastPayment ? '#6F6F76' : '#BBBBBB' }}>
                                {student.lastPayment
                                  ? new Date(student.lastPayment).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                  : '—'}
                              </span>
                            </td>
                            {/* Debt */}
                            <td style={{ padding: '11px 24px 11px 12px', borderBottom: '1px solid rgba(0,0,0,0.04)', textAlign: 'center' }}>
                              {student.debt != null && student.debt > 0 ? (
                                <span style={{
                                  fontSize: 12, fontWeight: 700,
                                  color: '#c0303a',
                                  background: '#FFF0F0',
                                  border: '1px solid #f5c6c6',
                                  borderRadius: 6,
                                  padding: '2px 7px',
                                }}>
                                  {student.debt.toLocaleString('ru-RU')} ₽
                                </span>
                              ) : (
                                <span style={{ fontSize: 12, color: '#BBBBBB' }}>—</span>
                              )}
                            </td>
                          </motion.tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!activeGroup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            style={{
              textAlign: 'center', padding: '48px 0', color: '#9A9AA2',
            }}
          >
            <Users size={36} strokeWidth={1.3} style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: '#6F6F76' }}>Выберите группу</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>чтобы увидеть список студентов</div>
          </motion.div>
        )}
      </div>
      </div>

      {/* Student side panel — absolute overlay, doesn't compress group cards */}
      <AnimatePresence>
        {activeStudent && activeStudentGroup && (
          <motion.div
            initial={{ x: 360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 360, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 30, mass: 0.9 }}
            style={{
              position: 'absolute', right: 0, top: 0, bottom: 0,
              width: 344, zIndex: 10,
              display: 'flex', flexDirection: 'column',
            }}
          >
            <StudentPanel
              student={activeStudent}
              group={activeStudentGroup}
              onClose={() => setActiveStudentId(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
