import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, X, ClipboardCheck, Clock, CheckCircle2,
  Circle, ChevronDown, Users, AlertCircle, Send, ClipboardList,
} from 'lucide-react'
import {
  groups, allHomework, students,
  type HomeworkItem, type Group,
} from '../../data/teacherMockData'
import { useTeacher } from '../../store/teacherStore'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.34, delay, ease: [0.22, 1, 0.36, 1] },
})

function hwStatus(hw: HomeworkItem): 'done' | 'reviewing' | 'waiting' | 'overdue' {
  if (hw.reviewedCount === hw.submittedCount && hw.submittedCount === hw.totalCount) return 'done'
  if (hw.reviewedCount < hw.submittedCount) return 'reviewing'
  if (hw.submittedCount < hw.totalCount) return 'waiting'
  return 'waiting'
}

const STATUS_LABEL: Record<string, string> = {
  done: 'Проверено', reviewing: 'На проверке', waiting: 'Ожидание', overdue: 'Просрочено',
}
const STATUS_COLOR: Record<string, string> = {
  done: '#1a7a3f', reviewing: '#8B4900', waiting: '#6F6F76', overdue: '#c0303a',
}
const STATUS_BG: Record<string, string> = {
  done: '#DFF8D6', reviewing: '#FFE4BD', waiting: '#F5F5F6', overdue: '#FFE1E4',
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.88)',
      backdropFilter: 'blur(16px) saturate(180%)',
      WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      border: '1px solid rgba(255,255,255,0.9)',
      borderRadius: 22,
      boxShadow: '0 4px 20px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.95)',
      ...style,
    }}>{children}</div>
  )
}

// ─── Assign form panel ─────────────────────────────────────────────────────────
function AssignForm({ onClose }: { onClose: () => void }) {
  const [selectedGroup, setSelectedGroup] = useState<string>('')
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [assignTo, setAssignTo] = useState<'group' | 'student'>('group')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const groupStudents = students.filter(s => s.groupId === selectedGroup)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(onClose, 1400)
  }

  return (
    <div
      style={{
        width: 332, flexShrink: 0, flex: 1, minHeight: 0,
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
        padding: '20px 20px 16px', flexShrink: 0,
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        borderTopLeftRadius: 19, borderTopRightRadius: 19,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0B0B0D' }}>Выдать домашнее задание</div>
        <button onClick={onClose} style={{
          width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6F6F76',
        }}>
          <X size={14} />
        </button>
      </div>

      {submitted ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}
        >
          <div style={{ width: 56, height: 56, borderRadius: 20, background: '#DFF8D6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={28} strokeWidth={2} style={{ color: '#1a7a3f' }} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0B0B0D' }}>ДЗ выдано!</div>
          <div style={{ fontSize: 12, color: '#6F6F76', textAlign: 'center' }}>Уведомление отправлено студентам</div>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Assign to toggle */}
          <div>
            <Label>Кому</Label>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              {(['group', 'student'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => { setAssignTo(mode); setSelectedStudent('') }}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600,
                    background: assignTo === mode ? '#EEDBFF' : '#F5F5F6',
                    color: assignTo === mode ? '#7B3FCC' : '#6F6F76',
                    transition: 'all 0.15s',
                  }}
                >
                  {mode === 'group' ? 'Группе' : 'Студенту'}
                </button>
              ))}
            </div>
          </div>

          {/* Group select */}
          <div>
            <Label>Группа</Label>
            <Select value={selectedGroup} onChange={e => { setSelectedGroup(e.target.value); setSelectedStudent('') }} required>
              <option value="">Выберите группу</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name} ({g.studentCount} чел.)</option>
              ))}
            </Select>
          </div>

          {/* Student select (only if assignTo = 'student') */}
          {assignTo === 'student' && (
            <div>
              <Label>Студент</Label>
              <Select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} required={assignTo === 'student'}>
                <option value="">Выберите студента</option>
                {groupStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>
          )}

          {/* Title */}
          <div>
            <Label>Тема задания</Label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Например: Задачи на гидролиз"
              required
              style={inputStyle}
            />
          </div>

          {/* Description */}
          <div>
            <Label>Описание (необязательно)</Label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Задание, ссылки, требования..."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }}
            />
          </div>

          {/* Due date */}
          <div>
            <Label>Дедлайн</Label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {/* Submit */}
          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              marginTop: 4, padding: '12px 0', borderRadius: 16, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #9B6DFF 0%, #7B3FCC 100%)',
              color: '#fff', fontSize: 14, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 16px rgba(123,63,204,0.32)',
            }}
          >
            <Send size={15} strokeWidth={2} />
            Выдать задание
          </motion.button>
        </form>
      )}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: '#9A9AA2', letterSpacing: 0.4, marginBottom: 4 }}>{children}</div>
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '10px 12px', borderRadius: 12,
  border: '1.5px solid rgba(0,0,0,0.1)',
  fontSize: 13, color: '#0B0B0D',
  background: '#F9F9FB',
  outline: 'none',
  fontFamily: 'inherit',
}

function Select({ children, value, onChange, required }: {
  children: React.ReactNode; value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; required?: boolean
}) {
  return (
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={onChange} required={required} style={{
        ...inputStyle, appearance: 'none', paddingRight: 32, cursor: 'pointer',
      }}>
        {children}
      </select>
      <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#9A9AA2', pointerEvents: 'none' }} />
    </div>
  )
}

// ─── Homework row ──────────────────────────────────────────────────────────────
function HwRow({ hw, index, isSelected, onClick }: {
  hw: HomeworkItem; index: number; isSelected: boolean; onClick: () => void
}) {
  const status = hwStatus(hw)
  const submittedPct = hw.totalCount > 0 ? Math.round((hw.submittedCount / hw.totalCount) * 100) : 0
  const reviewedPct = hw.submittedCount > 0 ? Math.round((hw.reviewedCount / hw.submittedCount) * 100) : 0

  return (
    <motion.tr
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, delay: index * 0.04 }}
      onClick={onClick}
      style={{
        cursor: 'pointer',
        background: isSelected ? '#EEDBFF' : 'transparent',
        borderLeft: isSelected ? '3px solid #7B3FCC' : '3px solid transparent',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.022)' }}
      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      {/* Group chip */}
      <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.04)', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: hw.color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#0B0B0D' }}>{hw.groupName}</span>
        </div>
      </td>

      {/* Title */}
      <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.04)', maxWidth: 260 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0B0B0D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {hw.title}
        </div>
      </td>

      {/* Assigned */}
      <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.04)', fontSize: 12, color: '#9A9AA2', whiteSpace: 'nowrap' }}>
        {hw.assignedAt}
      </td>

      {/* Due */}
      <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.04)', fontSize: 12, color: '#6F6F76', whiteSpace: 'nowrap' }}>
        {hw.dueDate}
      </td>

      {/* Submitted bar */}
      <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 6, background: 'rgba(0,0,0,0.07)', borderRadius: 99, overflow: 'hidden', minWidth: 60 }}>
            <div style={{ height: '100%', width: `${submittedPct}%`, background: '#9B6DFF', borderRadius: 99, transition: 'width 0.5s' }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#6F6F76', flexShrink: 0 }}>
            {hw.submittedCount}/{hw.totalCount}
          </span>
        </div>
      </td>

      {/* Reviewed */}
      <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 6, background: 'rgba(0,0,0,0.07)', borderRadius: 99, overflow: 'hidden', minWidth: 60 }}>
            <div style={{ height: '100%', width: `${reviewedPct}%`, background: '#1a7a3f', borderRadius: 99, transition: 'width 0.5s' }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#6F6F76', flexShrink: 0 }}>
            {hw.reviewedCount}/{hw.submittedCount || 0}
          </span>
        </div>
      </td>

      {/* Status */}
      <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.04)', textAlign: 'right' }}>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: STATUS_COLOR[status],
          background: STATUS_BG[status],
          borderRadius: 8, padding: '3px 9px', whiteSpace: 'nowrap',
        }}>
          {STATUS_LABEL[status]}
        </span>
      </td>
    </motion.tr>
  )
}

// ─── Homework detail panel ─────────────────────────────────────────────────────
function HwDetail({ hw, group, onClose }: { hw: HomeworkItem; group: Group; onClose: () => void }) {
  const status = hwStatus(hw)
  const groupStudents = students.filter(s => s.groupId === hw.groupId)
  const openHomeworkReview = useTeacher(s => s.openHomeworkReview)
  const hwReviews = useTeacher(s => s.reviews[hw.id]) ?? {}
  const pendingReview = hw.submittedCount - hw.reviewedCount

  return (
    <div
      style={{
        width: 332, flexShrink: 0, flex: 1, minHeight: 0,
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(0,0,0,0.07)',
        borderRadius: 20,
        margin: '36px 12px 12px 0',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(0,0,0,0.10)',
      }}
    >
      <div style={{ padding: '18px 18px 14px', background: group.colorSoft, borderBottom: `1px solid ${group.color}33`, flexShrink: 0, borderTopLeftRadius: 19, borderTopRightRadius: 19 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0B0B0D', lineHeight: 1.3, marginBottom: 6 }}>{hw.title}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: group.color + '33', borderRadius: 7, padding: '2px 8px' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: group.color }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#0B0B0D' }}>{hw.groupName}</span>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6F6F76', flexShrink: 0,
          }}>
            <X size={13} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'Назначено', value: hw.assignedAt, icon: Clock, color: '#6F6F76', bg: '#F5F5F6' },
            { label: 'Дедлайн', value: hw.dueDate, icon: AlertCircle, color: '#8B4900', bg: '#FFE4BD' },
            { label: 'Сдали', value: `${hw.submittedCount}/${hw.totalCount}`, icon: ClipboardCheck, color: '#7B3FCC', bg: '#EEDBFF' },
            { label: 'Проверено', value: `${hw.reviewedCount}/${hw.submittedCount}`, icon: CheckCircle2, color: '#1a7a3f', bg: '#DFF8D6' },
          ].map(item => (
            <div key={item.label} style={{ background: item.bg, borderRadius: 12, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: item.color, marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 16, fontWeight: 750, color: '#0B0B0D' }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Status badge */}
        <div style={{ textAlign: 'center' }}>
          <span style={{
            fontSize: 12, fontWeight: 700, color: STATUS_COLOR[status],
            background: STATUS_BG[status], borderRadius: 10, padding: '5px 14px',
          }}>
            {STATUS_LABEL[status]}
          </span>
        </div>

        {/* Continue / start review */}
        {hw.submittedCount > 0 && (
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => openHomeworkReview(hw.id)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: pendingReview > 0
                ? 'linear-gradient(135deg, #9B6DFF 0%, #7B3FCC 100%)'
                : 'rgba(123,63,204,0.10)',
              color: pendingReview > 0 ? '#fff' : '#7B3FCC',
              fontSize: 14, fontWeight: 700,
              boxShadow: pendingReview > 0 ? '0 4px 16px rgba(123,63,204,0.32)' : 'none',
            }}
          >
            <ClipboardList size={16} strokeWidth={2.2} />
            {pendingReview > 0 ? `Проверить ДЗ · ${pendingReview}` : 'Пересмотреть работы'}
          </motion.button>
        )}

        {/* Student list */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9A9AA2', letterSpacing: 0.4, marginBottom: 8, textTransform: 'uppercase' }}>
            Студенты
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {groupStudents.map((s, i) => {
              const submitted = i < hw.submittedCount
              const verdict = hwReviews[s.id]?.verdict
              const reviewed = i < hw.reviewedCount || !!verdict
              const returned = verdict === 'returned'
              const initials = s.name.split(' ').map(p => p[0]).join('').slice(0, 2)
              return (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 10px', borderRadius: 10,
                  background: returned ? '#FFE4BD' : reviewed ? '#DFF8D6' : submitted ? '#EEDBFF' : '#F5F5F6',
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                    background: group.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700, color: '#fff',
                  }}>
                    {initials}
                  </div>
                  <span style={{ flex: 1, fontSize: 12, color: '#0B0B0D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.name}
                  </span>
                  {/* Two-status icons: submitted + reviewed */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    {/* Submitted by student */}
                    <div title={submitted ? 'Сдал' : 'Не сдал'} style={{
                      width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: submitted ? '#EEDBFF' : 'rgba(0,0,0,0.04)',
                    }}>
                      <ClipboardCheck size={12} strokeWidth={2.2} style={{ color: submitted ? '#7B3FCC' : '#C2C2C8' }} />
                    </div>
                    {/* Reviewed by teacher */}
                    <div title={returned ? 'На доработку' : reviewed ? 'Проверено' : 'Не проверено'} style={{
                      width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: returned ? '#FFE4BD' : reviewed ? '#DFF8D6' : 'rgba(0,0,0,0.04)',
                    }}>
                      {returned
                        ? <Clock size={12} strokeWidth={2.2} style={{ color: '#8B4900' }} />
                        : <CheckCircle2 size={12} strokeWidth={2.2} style={{ color: reviewed ? '#1a7a3f' : '#C2C2C8' }} />
                      }
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Stat chips ────────────────────────────────────────────────────────────────
function StatChip({ label, value, color, bg }: { label: string; value: string | number; color: string; bg: string }) {
  return (
    <div style={{
      background: bg, borderRadius: 14, padding: '10px 16px',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 750, color: '#0B0B0D' }}>{value}</div>
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function TeacherHomeworkPage() {
  const setActivePage = useTeacher(s => s.setActivePage)
  const reviews = useTeacher(s => s.reviews)
  const [filterGroup, setFilterGroup] = useState<string>('all')
  const [selectedHwId, setSelectedHwId] = useState<string | null>(null)
  const [showAssignForm, setShowAssignForm] = useState(false)

  // Fold the teacher's in-session reviews into each row so the "Проверено"
  // counter and status update live as homework gets graded.
  const homework: HomeworkItem[] = allHomework.map(hw => {
    const reviewed = reviews[hw.id]
    if (!reviewed) return hw
    return { ...hw, reviewedCount: Math.max(hw.reviewedCount, Object.keys(reviewed).length) }
  })

  const filtered = filterGroup === 'all'
    ? homework
    : homework.filter(hw => hw.groupId === filterGroup)

  const selectedHw = homework.find(hw => hw.id === selectedHwId) ?? null
  const selectedGroup = selectedHw ? groups.find(g => g.id === selectedHw.groupId) ?? null : null

  const totalPending = homework.reduce((a, hw) => a + (hw.submittedCount - hw.reviewedCount), 0)

  const panelOpen = showAssignForm || (!!selectedHw && !!selectedGroup)

  function openHw(id: string) {
    setSelectedHwId(prev => prev === id ? null : id)
    setShowAssignForm(false)
  }

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
      {/* Main area */}
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '0 32px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Stats row */}
        <motion.div {...fadeUp(0.04)} style={{ display: 'flex', gap: 10 }}>
          <StatChip label="На проверке" value={totalPending} color="#8B4900" bg="#FFE4BD" />
        </motion.div>

        {/* Toolbar: filter chips + button */}
        <motion.div {...fadeUp(0.08)} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {['all', ...groups.map(g => g.id)].map(gid => {
            const g = groups.find(x => x.id === gid)
            const isActive = filterGroup === gid
            return (
              <button
                key={gid}
                onClick={() => setFilterGroup(gid)}
                style={{
                  padding: '6px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600,
                  background: isActive ? (g?.colorSoft ?? '#EEDBFF') : '#F5F5F6',
                  color: isActive ? (g?.color ?? '#7B3FCC') : '#6F6F76',
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                {g && <div style={{ width: 7, height: 7, borderRadius: '50%', background: g.color }} />}
                {gid === 'all' ? 'Все группы' : g?.name}
              </button>
            )
          })}
          <div style={{ flex: 1 }} />
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={() => setActivePage('homework-create')}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 16px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #9B6DFF 0%, #7B3FCC 100%)',
              color: '#fff', fontSize: 13, fontWeight: 700,
              boxShadow: '0 4px 14px rgba(123,63,204,0.30)',
            }}
          >
            <Plus size={15} strokeWidth={2.4} />
            Создать ДЗ
          </motion.button>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0, marginRight: panelOpen ? 344 : 0 }}
          transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
        >
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.018)' }}>
                    {['Группа', 'Задание', 'Назначено', 'Дедлайн', 'Сдано', 'Проверено', 'Статус'].map(col => (
                      <th key={col} style={{
                        padding: '10px 16px', textAlign: 'left',
                        fontSize: 11, fontWeight: 700, color: '#9A9AA2',
                        letterSpacing: 0.3, whiteSpace: 'nowrap',
                        borderBottom: '1px solid rgba(0,0,0,0.06)',
                      }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((hw, i) => (
                    <HwRow
                      key={hw.id}
                      hw={hw}
                      index={i}
                      isSelected={selectedHwId === hw.id}
                      onClick={() => openHw(hw.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Right panels — absolute overlay so the table simply shifts under them */}
      <AnimatePresence>
        {(showAssignForm || (selectedHw && selectedGroup)) && (
          <motion.div
            key="hw-panel"
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
            {showAssignForm ? (
              <AssignForm onClose={() => setShowAssignForm(false)} />
            ) : selectedHw && selectedGroup ? (
              <HwDetail
                key={selectedHw.id}
                hw={selectedHw}
                group={selectedGroup}
                onClose={() => setSelectedHwId(null)}
              />
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
