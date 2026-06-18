import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, X, ClipboardCheck, Clock, CheckCircle2,
  Circle, Users, AlertCircle, Send, ClipboardList, Check, RotateCcw, Star,
  BookOpen,
} from 'lucide-react'
import {
  type HomeworkItem, type Group,
} from '../../data/teacherMockData'
import { useTeacher } from '../../store/teacherStore'
import TeacherSelect from '../../components/teacher/TeacherSelect'
import GroupStrip from '../../components/teacher/GroupStrip'
import { useGroups, useStudents } from '../../lib/useGroups'
import { useHomework, useHardSubmissions, type HardSub } from '../../lib/useHomework'
import { openLessonInCourseEditor } from '../../lib/teacherNav'

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
  done: 'var(--color-green-text)', reviewing: 'var(--color-peach-text)', waiting: 'var(--color-muted)', overdue: 'var(--color-red-text)',
}
const STATUS_BG: Record<string, string> = {
  done: 'var(--color-green-soft)', reviewing: 'var(--color-peach-soft)', waiting: 'var(--color-bg)', overdue: 'var(--color-red-soft)',
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(var(--glass-rgb), 0.88)',
      backdropFilter: 'blur(16px) saturate(180%)',
      WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      border: '1px solid var(--color-border-glass)',
      borderRadius: 22,
      boxShadow: 'var(--shadow-sm-page)',
      ...style,
    }}>{children}</div>
  )
}

// ─── Assign form panel ─────────────────────────────────────────────────────────
function AssignForm({ onClose }: { onClose: () => void }) {
  const { groups } = useGroups()
  const [selectedGroup, setSelectedGroup] = useState<string>('')
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [assignTo, setAssignTo] = useState<'group' | 'student'>('group')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const { students } = useStudents(selectedGroup || null)

  const groupStudents = students

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedGroup || (assignTo === 'student' && !selectedStudent)) return
    setSubmitted(true)
    setTimeout(onClose, 1400)
  }

  return (
    <div
      style={{
        width: 332, flexShrink: 0, flex: 1, minHeight: 0,
        background: 'rgba(var(--glass-rgb), 0.96)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid var(--color-border)',
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
        borderBottom: '1px solid var(--color-border-soft)',
        borderTopLeftRadius: 19, borderTopRightRadius: 19,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>Выдать домашнее задание</div>
        <button onClick={onClose} style={{
          width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'var(--color-bg-5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)',
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
          <div style={{ width: 56, height: 56, borderRadius: 20, background: 'var(--color-green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={28} strokeWidth={2} style={{ color: 'var(--color-green-text)' }} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>ДЗ выдано!</div>
          <div style={{ fontSize: 12, color: 'var(--color-muted)', textAlign: 'center' }}>Уведомление отправлено студентам</div>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', scrollbarGutter: 'stable', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

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
                    background: assignTo === mode ? 'var(--color-purple-soft)' : 'var(--color-bg)',
                    color: assignTo === mode ? 'var(--color-accent)' : 'var(--color-muted)',
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
            <TeacherSelect value={selectedGroup} onChange={v => { setSelectedGroup(v); setSelectedStudent('') }}
              placeholder="Группа"
              options={groups.map(g => ({ value: g.id, label: `${g.name} (${g.studentCount} чел.)` }))} />
          </div>

          {/* Student select (only if assignTo = 'student') */}
          {assignTo === 'student' && (
            <div>
              <TeacherSelect value={selectedStudent} onChange={setSelectedStudent}
                placeholder="Студент"
                options={groupStudents.map(s => ({ value: s.id, label: s.name }))} />
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
              background: 'var(--grad-purple)',
              color: '#fff', fontSize: 14, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 16px rgba(99,84,207,0.32)',
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
  return <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.4, marginBottom: 4 }}>{children}</div>
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '10px 12px', borderRadius: 12,
  border: '1.5px solid rgba(0,0,0,0.1)',
  fontSize: 13, color: 'var(--color-text)',
  background: 'var(--color-bg-2)',
  outline: 'none',
  fontFamily: 'inherit',
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
        background: isSelected ? 'var(--color-purple-soft)' : 'transparent',
        borderLeft: isSelected ? '3px solid var(--color-accent)' : '3px solid transparent',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-2)' }}
      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      {/* Group chip */}
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border-soft)', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: hw.color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>{hw.groupName}</span>
        </div>
      </td>

      {/* Title + two inline segments: основное / сложное */}
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border-soft)', maxWidth: 280 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 5 }}>
          {hw.title || <span style={{ color: 'var(--color-text-4)', fontStyle: 'italic' }}>Без названия</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 7,
            background: 'var(--color-purple-soft)', color: 'var(--color-accent)',
          }}>
            <ClipboardCheck size={11} strokeWidth={2.4} /> Основное
          </span>
          {(hw.hardTotal ?? hw.hardTaskIds?.length ?? 0) > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 7,
              background: 'var(--color-yellow-soft)', color: 'var(--color-yellow-text)',
            }}>
              <Star size={10} strokeWidth={0} fill="currentColor" /> Сложное
            </span>
          )}
        </div>
      </td>

      {/* Assigned */}
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border-soft)', fontSize: 12, color: 'var(--color-text-3)', whiteSpace: 'nowrap' }}>
        {hw.assignedAt}
      </td>

      {/* Due */}
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border-soft)', fontSize: 12, color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
        {hw.dueDate}
      </td>

      {/* Submitted bar */}
      <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 6, background: 'var(--color-bg-5)', borderRadius: 99, overflow: 'hidden', minWidth: 60 }}>
            <div style={{ height: '100%', width: `${submittedPct}%`, background: 'var(--color-purple)', borderRadius: 99, transition: 'width 0.5s' }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', flexShrink: 0 }}>
            {hw.submittedCount}/{hw.totalCount}
          </span>
        </div>
      </td>

      {/* Reviewed */}
      <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 6, background: 'var(--color-bg-5)', borderRadius: 99, overflow: 'hidden', minWidth: 60 }}>
            <div style={{ height: '100%', width: `${reviewedPct}%`, background: 'var(--color-green-accent)', borderRadius: 99, transition: 'width 0.5s' }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', flexShrink: 0 }}>
            {hw.reviewedCount}/{hw.submittedCount || 0}
          </span>
        </div>
      </td>

      {/* Status */}
      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border-soft)', textAlign: 'right' }}>
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
  const { students: dbStudents } = useStudents(hw.groupId)
  const openHomeworkReview = useTeacher(s => s.openHomeworkReview)
  const openCourseEditor = useTeacher(s => s.openCourseEditor)
  const openHomeworkEdit = useTeacher(s => s.openHomeworkEdit)
  const hwReviews = useTeacher(s => s.reviews[hw.id]) ?? {}
  const pendingReview = hw.submittedCount - hw.reviewedCount
  const [lessonBusy, setLessonBusy] = useState(false)
  const hardCount = hw.hardTotal ?? hw.hardTaskIds?.length ?? 0
  const hasHard = hardCount > 0
  // Auto-created 1:1 groups have no enrolled student row — show the named
  // student (the group is named after them) so the card isn't empty.
  const groupStudents: { id: string; name: string }[] = dbStudents.length > 0
    ? dbStudents
    : group.isIndividual
      ? [{ id: hw.id + '-self', name: group.name }]
      : dbStudents

  return (
    <div
      style={{
        width: 332, flexShrink: 0, flex: 1, minHeight: 0,
        background: 'rgba(var(--glass-rgb), 0.96)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid var(--color-border)',
        borderRadius: 20,
        margin: '36px 12px 12px 0',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(0,0,0,0.10)',
      }}
    >
      <div style={{ padding: '18px 18px 14px', background: group.color + '1A', borderBottom: `1px solid ${group.color}33`, flexShrink: 0, borderTopLeftRadius: 19, borderTopRightRadius: 19 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.3, marginBottom: 6 }}>{hw.title}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: group.color + '28', borderRadius: 7, padding: '2px 8px' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: group.color }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: group.color }}>{hw.groupName}</span>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'var(--color-bg-5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)', flexShrink: 0,
          }}>
            <X size={13} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', scrollbarGutter: 'stable', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'Назначено', value: hw.assignedAt, icon: Clock, color: 'var(--color-muted)', labelColor: 'var(--color-muted)', bg: 'var(--color-bg)' },
            { label: 'Дедлайн', value: hw.dueDate, icon: AlertCircle, color: 'var(--color-peach-text)', labelColor: 'var(--color-peach-text)', bg: 'var(--color-peach-soft)' },
            { label: 'Сдали', value: `${hw.submittedCount}/${hw.totalCount}`, icon: ClipboardCheck, color: 'var(--color-purple)', labelColor: 'var(--color-purple)', bg: 'var(--color-purple-soft)' },
            { label: 'Проверено', value: `${hw.reviewedCount}/${hw.submittedCount}`, icon: CheckCircle2, color: 'var(--color-green-text)', labelColor: 'var(--color-green-text)', bg: 'var(--color-green-soft)' },
          ].map(item => (
            <div key={item.label} style={{ background: item.bg, borderRadius: 12, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: item.labelColor, opacity: 0.75, marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 16, fontWeight: 750, color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Two inline segments: основное / сложное (not separate sections) */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, background: 'var(--color-purple-soft)', borderRadius: 12, padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <ClipboardCheck size={12} strokeWidth={2.4} style={{ color: 'var(--color-accent)' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-accent)' }}>Основное</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 750, color: 'var(--color-accent)' }}>{hw.submittedCount}/{hw.totalCount}</div>
          </div>
          <div style={{
            flex: 1, borderRadius: 12, padding: '10px 12px',
            background: hasHard ? 'var(--color-yellow-soft)' : 'var(--color-bg)',
            opacity: hasHard ? 1 : 0.6,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <Star size={11} strokeWidth={0} fill="currentColor" style={{ color: hasHard ? 'var(--color-yellow-text)' : 'var(--color-text-4)' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: hasHard ? 'var(--color-yellow-text)' : 'var(--color-text-4)' }}>Сложное</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 750, color: hasHard ? 'var(--color-yellow-text)' : 'var(--color-text-4)' }}>
              {hasHard ? `${hardCount} зад.` : '—'}
            </div>
          </div>
        </div>

        {/* Open something to review / tweak: the linked lesson when one is
            attached, otherwise the homework itself (homework can exist without
            a lesson). */}
        <motion.button
          whileHover={{ scale: lessonBusy ? 1 : 1.02 }} whileTap={{ scale: lessonBusy ? 1 : 0.98 }}
          onClick={async () => {
            if (hw.lessonId) {
              setLessonBusy(true)
              await openLessonInCourseEditor(hw.lessonId, openCourseEditor)
              setLessonBusy(false)
            } else {
              // No lesson — open this homework in the composer for editing.
              openHomeworkEdit(hw.id)
            }
          }}
          disabled={lessonBusy}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '11px 0', borderRadius: 14, border: '1px solid var(--color-border-medium)',
            cursor: lessonBusy ? 'default' : 'pointer', background: 'var(--color-bg-2)', color: 'var(--color-text)',
            fontSize: 13, fontWeight: 700, fontFamily: 'inherit', opacity: lessonBusy ? 0.6 : 1,
          }}
        >
          {hw.lessonId
            ? <BookOpen size={15} strokeWidth={2.2} style={{ color: 'var(--color-accent)' }} />
            : <ClipboardList size={15} strokeWidth={2.2} style={{ color: 'var(--color-accent)' }} />}
          {lessonBusy ? 'Открываю…' : hw.lessonId ? 'Открыть урок' : 'Открыть домашку'}
        </motion.button>

        {/* Continue / start review */}
        {hw.submittedCount > 0 && (
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => openHomeworkReview(hw.id)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: pendingReview > 0
                ? 'var(--grad-purple)'
                : 'rgba(99,84,207,0.10)',
              color: pendingReview > 0 ? '#fff' : 'var(--color-accent)',
              fontSize: 14, fontWeight: 700,
              boxShadow: pendingReview > 0 ? '0 4px 16px rgba(99,84,207,0.32)' : 'none',
            }}
          >
            <ClipboardList size={16} strokeWidth={2.2} />
            {pendingReview > 0 ? `Проверить ДЗ · ${pendingReview}` : 'Пересмотреть работы'}
          </motion.button>
        )}

        {/* Student list */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.4, marginBottom: 8, textTransform: 'uppercase' }}>
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
                  background: returned ? 'var(--color-peach-soft)' : reviewed ? 'var(--color-green-soft)' : submitted ? 'var(--color-purple-soft)' : 'var(--color-bg)',
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                    background: group.color + '99',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700, color: '#fff',
                  }}>
                    {initials}
                  </div>
                  <span style={{ flex: 1, fontSize: 12, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.name}
                  </span>
                  {/* Two-status icons: submitted + reviewed */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    {/* Submitted by student */}
                    <div title={submitted ? 'Сдал' : 'Не сдал'} style={{
                      width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: submitted ? 'var(--color-purple-soft)' : 'var(--color-bg-3)',
                    }}>
                      <ClipboardCheck size={12} strokeWidth={2.2} style={{ color: submitted ? 'var(--color-accent)' : 'var(--color-text-4)' }} />
                    </div>
                    {/* Reviewed by teacher */}
                    <div title={returned ? 'На доработку' : reviewed ? 'Проверено' : 'Не проверено'} style={{
                      width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: returned ? 'var(--color-peach-soft)' : reviewed ? 'var(--color-green-soft)' : 'var(--color-bg-3)',
                    }}>
                      {returned
                        ? <Clock size={12} strokeWidth={2.2} style={{ color: 'var(--color-peach-text)' }} />
                        : <CheckCircle2 size={12} strokeWidth={2.2} style={{ color: reviewed ? 'var(--color-green-text)' : 'var(--color-text-4)' }} />
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

// ─── Hard submissions section ──────────────────────────────────────────────────
function HardSubRow({ sub, isSelected, onClick }: { sub: HardSub; isSelected: boolean; onClick: () => void }) {
  const date = sub.updatedAt ? new Date(sub.updatedAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) : ''
  const initials = sub.studentName.split(' ').map((p: string) => p[0]).join('').slice(0, 2)
  const isPending = sub.status === 'submitted'

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ backgroundColor: 'var(--color-bg-2)' }}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
        background: isSelected ? 'var(--color-purple-soft)' : 'transparent',
        border: isSelected ? '1px solid rgba(99,84,207,0.2)' : '1px solid transparent',
        transition: 'background 0.15s',
      }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 11, flexShrink: 0,
        background: 'var(--grad-purple)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: '#fff',
      }}>
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sub.studentName}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sub.lessonTitle || sub.baseRef}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{date}</span>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 7,
          background: isPending ? 'var(--color-purple-soft)' : sub.status === 'completed' ? 'var(--color-green-soft)' : 'var(--color-peach-soft)',
          color: isPending ? 'var(--color-purple-text)' : sub.status === 'completed' ? 'var(--color-green-text)' : 'var(--color-peach-text)',
        }}>
          {isPending ? 'На проверке' : sub.status === 'completed' ? 'Принято' : 'На доработку'}
        </span>
      </div>
    </motion.div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function TeacherHomeworkPage() {
  const openHomeworkCreate = useTeacher(s => s.openHomeworkCreate)
  const openHardReview = useTeacher(s => s.openHardReview)
  const reviews = useTeacher(s => s.reviews)
  const filterGroup = useTeacher(s => s.selectedGroupId)
  const setFilterGroup = useTeacher(s => s.setSelectedGroupId)
  const [selectedHwId, setSelectedHwId] = useState<string | null>(null)
  const [showAssignForm, setShowAssignForm] = useState(false)
  const { groups } = useGroups()
  const regularGroups = groups.filter(g => !g.isIndividual)
  const individualGroups = groups.filter(g => g.isIndividual)
  const { homework: dbHomework, loading: hwLoading } = useHomework()
  const { submissions: hardSubs } = useHardSubmissions()

  // Use DB homework directly; merge local review counts from Zustand
  const homework: HomeworkItem[] = dbHomework.map(hw => {
    const localReviewed = reviews[hw.id]
    const reviewedCount = localReviewed
      ? Math.max(hw.reviewedCount, Object.keys(localReviewed).length)
      : hw.reviewedCount
    return { ...hw, reviewedCount }
  })

  const filtered = filterGroup
    ? homework.filter(hw => hw.groupId === filterGroup)
    : homework

  const selectedHw = homework.find(hw => hw.id === selectedHwId) ?? null
  const selectedGroup = selectedHw ? groups.find(g => g.id === selectedHw.groupId) ?? null : null

  const panelOpen = showAssignForm || (!!selectedHw && !!selectedGroup)
  const pendingHardCount = hardSubs.filter(s => s.status === 'submitted').length

  function openHw(id: string) {
    setSelectedHwId(prev => prev === id ? null : id)
    setShowAssignForm(false)
  }

  return (
    // overflow:visible so the lifted scroll pane below isn't clipped at the row
    // edge; the slide-in panel overflowing right is clipped by .dashboard-root.
    <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'visible', position: 'relative' }}>
      {/* Main area — lifted under the topbar so content melts into the
          progressive-blur strip instead of hard-clipping (student-page recipe) */}
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', scrollbarGutter: 'stable', marginTop: -100, padding: '100px 32px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Group strip: "Создать ДЗ" + groups + 1:1 individuals */}
        <motion.div {...fadeUp(0.08)}>
          <GroupStrip
            groups={regularGroups}
            individualGroups={individualGroups}
            selectedGroupId={filterGroup}
            onSelectGroup={setFilterGroup}
            actionLabel={"Создать\nдомашку"}
            actionIcon={Plus}
            onAction={openHomeworkCreate}
          />
        </motion.div>

        {/* Hard-level submissions */}
        {hardSubs.length > 0 && (
          <motion.div
            {...fadeUp(0.12)}
            style={{ marginRight: panelOpen ? 344 : 0, transition: 'margin-right 0.34s cubic-bezier(0.22,1,0.36,1)' }}
          >
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-soft)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Star size={15} style={{ color: 'var(--color-accent)' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Хард-уровень · Сданные работы</span>
                </div>
                {pendingHardCount > 0 && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
                    background: 'var(--color-purple-soft)', color: 'var(--color-accent)',
                  }}>
                    {pendingHardCount} на проверке
                  </span>
                )}
              </div>
              <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {hardSubs.map(sub => (
                  <HardSubRow
                    key={sub.id}
                    sub={sub}
                    isSelected={false}
                    onClick={() => openHardReview(sub.id)}
                  />
                ))}
              </div>
            </Card>
          </motion.div>
        )}

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
                  <tr style={{ background: 'var(--color-bg-2)' }}>
                    {['Группа', 'Задание', 'Назначено', 'Дедлайн', 'Сдано', 'Проверено', 'Статус'].map(col => (
                      <th key={col} style={{
                        padding: '10px 16px', textAlign: 'left',
                        fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)',
                        letterSpacing: 0.3, whiteSpace: 'nowrap',
                        borderBottom: '1px solid var(--color-border-soft)',
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
