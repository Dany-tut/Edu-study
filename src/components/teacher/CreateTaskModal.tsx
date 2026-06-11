import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, Clock, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react'
import { students, groups } from '../../data/teacherMockData'
import TeacherSaveButton from './TeacherSaveButton'

// ─── Task types ───────────────────────────────────────────────────────────────

type TaskType = {
  id: string
  label: string
  keywords: string[]
  color: string
  bg: string
  textColor: string
}

const TASK_TYPES: TaskType[] = [
  { id: 'meeting',      label: 'Встреча',  keywords: ['встреча', 'встречу'],       color: '#16a87a', bg: '#d5f5e8', textColor: '#0e7a58' },
  { id: 'call',         label: 'Созвон',   keywords: ['созвон'],                    color: '#6C7BE8', bg: '#e6e9ff', textColor: '#3d4ecc' },
  { id: 'lesson',       label: 'Урок',     keywords: ['урок'],                      color: '#e07c2a', bg: '#fdefd8', textColor: '#b85e10' },
  { id: 'homework',     label: 'Домашка',  keywords: ['домашка', 'домашку', 'дз'], color: '#9B6DCC', bg: '#eedbff', textColor: '#7B3FCC' },
  { id: 'presentation', label: 'Преза',    keywords: ['преза', 'презентация'],      color: '#e0397a', bg: '#fde0ef', textColor: '#c41f60' },
]

function detectType(text: string): { type: TaskType; rest: string } | null {
  const trimmed = text.trimStart()
  const lower = trimmed.toLowerCase()
  for (const t of TASK_TYPES) {
    for (const kw of t.keywords) {
      if (lower === kw || lower.startsWith(kw + ' ')) {
        const rest = trimmed.slice(kw.length).trimStart()
        return { type: t, rest }
      }
    }
  }
  return null
}

function getSuggestionType(text: string): TaskType | null {
  const lower = text.toLowerCase().trimStart()
  if (!lower || lower.includes(' ')) return null
  for (const t of TASK_TYPES) {
    for (const kw of t.keywords) {
      if (kw.startsWith(lower) && kw.length > lower.length) {
        return t
      }
    }
  }
  return null
}

function getEntitySuggestions(titleText: string) {
  const atIdx = titleText.lastIndexOf('@')
  if (atIdx !== -1) {
    const query = titleText.slice(atIdx + 1).toLowerCase()
    if (query.length > 0) {
      const matchedStudents = students
        .filter(s => s.name.toLowerCase().startsWith(query))
        .slice(0, 5)
        .map(s => ({ kind: 'student' as const, id: s.id, label: s.name, sub: groups.find(g => g.id === s.groupId)?.name ?? '', triggerType: '@' as const }))
      return matchedStudents
    }
  }

  const idx = titleText.toLowerCase().lastIndexOf(' с ')
  if (idx === -1) return []
  const query = titleText.slice(idx + 3).toLowerCase()
  if (!query) return []

  const matchedStudents = students
    .filter(s => s.name.toLowerCase().includes(query))
    .slice(0, 4)
    .map(s => ({ kind: 'student' as const, id: s.id, label: s.name, sub: groups.find(g => g.id === s.groupId)?.name ?? '', triggerType: 'с' as const }))

  const matchedGroups = groups
    .filter(g => g.name.toLowerCase().includes(query))
    .slice(0, 3)
    .map(g => ({ kind: 'group' as const, id: g.id, label: g.name, sub: `${g.studentCount} студентов`, triggerType: 'с' as const }))

  return [...matchedStudents, ...matchedGroups]
}

// ─── Date/time helpers ────────────────────────────────────────────────────────

function todayStr() {
  const d = new Date()
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`
}
function nextHourStr() {
  const d = new Date()
  d.setHours(d.getHours() + 1, 0, 0, 0)
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
function parseDateStr(s: string): Date | null {
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (!m) return null
  return new Date(+m[3], +m[2] - 1, +m[1])
}
function formatDateStr(d: Date) {
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`
}

const RU_MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const RU_DAYS_SHORT = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

// ─── Calendar picker ──────────────────────────────────────────────────────────

const navBtnStyle: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 8, border: 'none',
  background: '#F7F5FC', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#6F6F76',
}

function CalendarPicker({ value, onChange, onClose }: { value: string; onChange: (v: string) => void; onClose: () => void }) {
  const selected = parseDateStr(value)
  const today = new Date()

  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth())

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const days: (Date | null)[] = []
  const first = new Date(viewYear, viewMonth, 1)
  let startDow = first.getDay() - 1
  if (startDow < 0) startDow = 6
  for (let i = 0; i < startDow; i++) days.push(null)
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  for (let i = 1; i <= daysInMonth; i++) days.push(new Date(viewYear, viewMonth, i))
  while (days.length % 7 !== 0) days.push(null)

  function isSelected(d: Date) {
    return !!(selected && d.getFullYear() === selected.getFullYear() && d.getMonth() === selected.getMonth() && d.getDate() === selected.getDate())
  }
  function isToday(d: Date) {
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      style={{
        position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
        background: '#fff',
        border: '1.5px solid #EDEAF5',
        borderRadius: 16,
        boxShadow: '0 12px 40px rgba(0,0,0,0.14)',
        padding: '12px 14px 14px',
        minWidth: 232,
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button onClick={prevMonth} style={navBtnStyle}><ChevronLeft size={14} strokeWidth={2.2} /></button>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0B0B0D' }}>
          {RU_MONTHS[viewMonth]} {viewYear}
        </span>
        <button onClick={nextMonth} style={navBtnStyle}><ChevronRight size={14} strokeWidth={2.2} /></button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
        {RU_DAYS_SHORT.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#B0A8CC', paddingBottom: 4 }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {days.map((d, i) => {
          if (!d) return <div key={i} />
          const sel = isSelected(d)
          const tod = isToday(d)
          return (
            <button
              key={i}
              onClick={() => { onChange(formatDateStr(d)); onClose() }}
              style={{
                width: 30, height: 30, borderRadius: 8, border: 'none',
                cursor: 'pointer', fontSize: 12, fontWeight: sel ? 700 : 500,
                background: sel ? '#7B3FCC' : tod ? '#F0E8FF' : 'transparent',
                color: sel ? '#fff' : tod ? '#7B3FCC' : '#0B0B0D',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLElement).style.background = '#F7F5FC' }}
              onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLElement).style.background = tod ? '#F0E8FF' : 'transparent' }}
            >
              {d.getDate()}
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}

// ─── Time picker ──────────────────────────────────────────────────────────────

function generateTimeSlots() {
  const slots: string[] = []
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
    }
  }
  return slots
}
const TIME_SLOTS = generateTimeSlots()

function TimePicker({ value, onChange, onClose }: { value: string; onChange: (v: string) => void; onClose: () => void }) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const idx = TIME_SLOTS.indexOf(value)
    if (idx !== -1 && listRef.current) {
      const item = listRef.current.children[idx] as HTMLElement
      item?.scrollIntoView({ block: 'center' })
    }
  }, [value])

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      style={{
        position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 100,
        background: '#fff',
        border: '1.5px solid #EDEAF5',
        borderRadius: 14,
        boxShadow: '0 12px 40px rgba(0,0,0,0.14)',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'relative' }}>
        {/* top fade */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 32, zIndex: 1,
          background: 'linear-gradient(to bottom, #fff 0%, rgba(255,255,255,0) 100%)',
          pointerEvents: 'none',
          borderRadius: '14px 14px 0 0',
        }} />
        {/* bottom fade */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 32, zIndex: 1,
          background: 'linear-gradient(to top, #fff 0%, rgba(255,255,255,0) 100%)',
          pointerEvents: 'none',
          borderRadius: '0 0 14px 14px',
        }} />
      <div ref={listRef} style={{ maxHeight: 200, overflowY: 'auto', padding: '4px 6px', scrollbarWidth: 'none' }}>
        {TIME_SLOTS.map(t => {
          const active = t === value
          return (
            <button
              key={t}
              onClick={() => { onChange(t); onClose() }}
              style={{
                width: '100%', border: 'none',
                background: active ? '#7B3FCC' : 'transparent',
                color: active ? '#fff' : '#0B0B0D',
                padding: '7px 10px', textAlign: 'left',
                fontSize: 13, fontWeight: active ? 700 : 500,
                cursor: 'pointer', display: 'block',
                borderRadius: 9,
                transition: 'background 0.18s, color 0.18s',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#F3EEFF' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              {t}
            </button>
          )
        })}
      </div>
      </div>
    </motion.div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypePill({ type, onRemove }: { type: TaskType; onRemove: () => void }) {
  return (
    <motion.span
      initial={{ opacity: 0, maxWidth: 0, paddingLeft: 0, paddingRight: 0 }}
      animate={{ opacity: 1, maxWidth: 120, paddingLeft: 10, paddingRight: 10 }}
      exit={{ opacity: 0, maxWidth: 0, paddingLeft: 0, paddingRight: 0 }}
      transition={{ duration: 0.15, ease: 'easeInOut' }}
      onClick={onRemove}
      style={{
        display: 'inline-flex', alignItems: 'center',
        overflow: 'hidden', whiteSpace: 'nowrap',
        padding: '2px 10px',
        borderRadius: 8, flexShrink: 0,
        background: type.bg, color: type.textColor,
        fontSize: 13, fontWeight: 650, lineHeight: 1,
        border: `1.5px solid ${type.color}33`,
        userSelect: 'none', cursor: 'pointer',
      }}
    >
      {type.label}
    </motion.span>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface InitialTask {
  typeId: string | null
  typeLabel: string | null
  typeBg: string | null
  typeColor: string | null
  title: string
  date: string
  time: string
  comment: string
}

interface CreateTaskModalProps {
  onClose: () => void
  initialTask?: InitialTask
  onSave?: (task: {
    type: TaskType | null
    title: string
    date: string
    time: string
    comment: string
  }) => void
}

export default function CreateTaskModal({ onClose, onSave, initialTask }: CreateTaskModalProps) {
  const initType = initialTask?.typeId
    ? TASK_TYPES.find(t => t.id === initialTask.typeId) ?? null
    : null

  const [taskType, setTaskType] = useState<TaskType | null>(initType)
  const [titleText, setTitleText]   = useState(initialTask?.title ?? '')
  const [date, setDate]             = useState(initialTask?.date ?? todayStr())
  const [time, setTime]             = useState(initialTask?.time ?? nextHourStr())
  const [comment, setComment]       = useState(initialTask?.comment ?? '')
  const [saved, setSaved]           = useState(false)

  const [showCalendar, setShowCalendar] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)
  const timePickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (showCalendar && calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setShowCalendar(false)
      }
      if (showTimePicker && timePickerRef.current && !timePickerRef.current.contains(e.target as Node)) {
        setShowTimePicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showCalendar, showTimePicker])

  const suggestion = useMemo(() => (!taskType ? getSuggestionType(titleText) : null), [taskType, titleText])
  const entitySuggestions = useMemo(() => getEntitySuggestions(titleText), [titleText])

  function handleTitleChange(raw: string) {
    if (!taskType) {
      const detected = detectType(raw)
      if (detected) {
        setTaskType(detected.type)
        setTitleText(detected.rest)
        return
      }
    }
    // Auto-insert @ when typing a name after "с " that matches a student
    if (!raw.includes('@')) {
      const sMatch = raw.match(/^((?:.*\s)?с\s+)([А-ЯЁA-Z][а-яёa-zА-ЯЁ].*)$/)
      if (sMatch) {
        const prefix = sMatch[1]
        const name = sMatch[2]
        const matchExists = students.some(s => s.name.toLowerCase().startsWith(name.toLowerCase()))
        if (matchExists) {
          setTitleText(prefix + '@' + name)
          return
        }
      }
    }
    setTitleText(raw)
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!taskType && suggestion && (e.key === 'Tab' || e.key === 'ArrowRight')) {
      e.preventDefault()
      setTaskType(suggestion)
      setTitleText('')
      return
    }
    if ((e.key === 'Backspace' || e.key === 'Delete') && taskType && titleText === '') {
      setTaskType(null)
    }
  }

  function acceptEntitySuggestion(label: string) {
    const idx = titleText.toLowerCase().lastIndexOf(' с ')
    if (idx !== -1) {
      setTitleText(titleText.slice(0, idx + 3) + label)
    } else {
      setTitleText(titleText + label)
    }
    inputRef.current?.focus()
  }

  function handleSave() {
    setSaved(true)
    setTimeout(() => {
      onSave?.({ type: taskType, title: titleText, date, time, comment })
      onClose()
    }, 400)
  }

  const canSave = titleText.trim().length > 0 || taskType !== null

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="task-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(20,16,32,0.38)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          paddingTop: 80,
        }}
      >
        <motion.div
          key="task-modal"
          initial={{ scale: 0.88, opacity: 0, y: -24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: -16 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.85 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: 480, borderRadius: 26,
            background: 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(24px) saturate(200%)',
            border: '1px solid rgba(255,255,255,0.9)',
            boxShadow: '0 24px 72px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,1)',
            overflow: 'visible',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 20px 0',
          }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#0B0B0D' }}>{initialTask ? 'Редактировать' : 'Новая задача'}</span>
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: '50%',
                background: '#F4F2F8', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#6F6F76',
              }}
            >
              <X size={14} strokeWidth={2.2} />
            </button>
          </div>

          <div style={{ padding: '14px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Smart title input */}
            <div style={{ position: 'relative' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#F7F5FC', borderRadius: 14,
                padding: '10px 14px',
                border: '1.5px solid transparent',
                transition: 'border-color 0.15s',
              }}
                onFocusCapture={e => (e.currentTarget.style.borderColor = '#C4B0F0')}
                onBlurCapture={e => (e.currentTarget.style.borderColor = 'transparent')}
              >
                <AnimatePresence>
                  {taskType && (
                    <TypePill
                      type={taskType}
                      onRemove={() => { setTaskType(null); setTitleText('') }}
                    />
                  )}
                </AnimatePresence>

                <div style={{ flex: 1, position: 'relative' }}>
                  {!taskType && suggestion && (
                    <span
                      style={{
                        position: 'absolute', top: 0, left: 0,
                        fontSize: 15, fontWeight: 500, lineHeight: '22px', pointerEvents: 'none',
                        userSelect: 'none', whiteSpace: 'nowrap',
                      }}
                    >
                      <span style={{ color: '#0B0B0D' }}>{titleText}</span>
                      <span style={{ color: '#C8C0E0' }}>
                        {suggestion.label.slice(titleText.length)}
                      </span>
                    </span>
                  )}
                  <input
                    ref={inputRef}
                    value={titleText}
                    onChange={e => handleTitleChange(e.target.value)}
                    onKeyDown={handleTitleKeyDown}
                    placeholder={taskType ? 'с кем / о чём…' : 'Встреча, Созвон, Урок…'}
                    style={{
                      width: '100%', border: 'none', outline: 'none',
                      background: 'transparent',
                      fontSize: 15, fontWeight: 500,
                      color: suggestion ? 'transparent' : '#0B0B0D',
                      caretColor: '#0B0B0D',
                      lineHeight: '22px',
                    }}
                  />
                </div>
              </div>

              {/* Entity autocomplete dropdown */}
              <AnimatePresence>
                {entitySuggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                      marginTop: 6,
                      background: 'rgba(255,255,255,0.98)',
                      border: '1px solid rgba(196,176,240,0.5)',
                      borderRadius: 14,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                      overflow: 'hidden',
                    }}
                  >
                    {entitySuggestions.map(ent => (
                      <button
                        key={ent.id}
                        onMouseDown={e => { e.preventDefault(); acceptEntitySuggestion(ent.label) }}
                        style={{
                          width: '100%', border: 'none', background: 'none',
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '9px 14px', cursor: 'pointer', textAlign: 'left',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#F7F5FC')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        <div style={{
                          width: 30, height: 30, borderRadius: 10, flexShrink: 0,
                          background: ent.kind === 'group' ? '#EFE0FF' : '#E8F4FD',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 700,
                          color: ent.kind === 'group' ? '#7B3FCC' : '#3a6fbf',
                        }}>
                          {ent.kind === 'group' ? '👥' : ent.label.split(' ').map((w: string) => w[0]).slice(0,2).join('')}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#0B0B0D' }}>{ent.label}</div>
                          <div style={{ fontSize: 11, color: '#9090A0', marginTop: 1 }}>{ent.sub}</div>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Type pills row */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {TASK_TYPES.map(t => {
                const active = taskType?.id === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => { setTaskType(active ? null : t); inputRef.current?.focus() }}
                    style={{
                      padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
                      fontSize: 12, fontWeight: 650,
                      background: active ? t.bg : '#F4F2F8',
                      color: active ? t.textColor : '#6F6F76',
                      border: active ? `1.5px solid ${t.color}44` : '1.5px solid transparent',
                      transition: 'all 0.15s',
                    }}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: '#F0EDF8', margin: '0 -20px', width: 'calc(100% + 40px)' }} />

            {/* Date + Time */}
            <div style={{ display: 'flex', gap: 10 }}>
              {/* Date */}
              <div ref={calendarRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, position: 'relative' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#9090A0', letterSpacing: 0.3, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={10} strokeWidth={2} />
                  ДАТА
                </span>
                <button
                  onClick={() => { setShowCalendar(v => !v); setShowTimePicker(false) }}
                  style={{
                    padding: '9px 12px', borderRadius: 12,
                    border: `1.5px solid ${showCalendar ? '#C4B0F0' : '#EDEAF5'}`,
                    background: '#F7F5FC', fontSize: 14, fontWeight: 500, color: '#0B0B0D',
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                    transition: 'border-color 0.15s',
                  }}
                >
                  {date}
                </button>
                <AnimatePresence>
                  {showCalendar && (
                    <CalendarPicker
                      value={date}
                      onChange={v => setDate(v)}
                      onClose={() => setShowCalendar(false)}
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Time */}
              <div ref={timePickerRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, position: 'relative' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#9090A0', letterSpacing: 0.3, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={10} strokeWidth={2} />
                  ВРЕМЯ
                </span>
                <button
                  onClick={() => { setShowTimePicker(v => !v); setShowCalendar(false) }}
                  style={{
                    padding: '9px 12px', borderRadius: 12,
                    border: `1.5px solid ${showTimePicker ? '#C4B0F0' : '#EDEAF5'}`,
                    background: '#F7F5FC', fontSize: 14, fontWeight: 500, color: '#0B0B0D',
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                    transition: 'border-color 0.15s',
                  }}
                >
                  {time}
                </button>
                <AnimatePresence>
                  {showTimePicker && (
                    <TimePicker
                      value={time}
                      onChange={v => setTime(v)}
                      onClose={() => setShowTimePicker(false)}
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Comment */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#9090A0', letterSpacing: 0.3, display: 'flex', alignItems: 'center', gap: 4 }}>
                <MessageSquare size={10} strokeWidth={2} />
                КОММЕНТАРИЙ
              </span>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Заметки, ссылки, напоминание…"
                rows={2}
                style={{
                  padding: '9px 12px', borderRadius: 12, border: '1.5px solid #EDEAF5',
                  background: '#F7F5FC', fontSize: 14, color: '#0B0B0D',
                  outline: 'none', width: '100%', boxSizing: 'border-box',
                  resize: 'none', fontFamily: 'inherit', lineHeight: 1.5,
                }}
                onFocus={e => (e.target.style.borderColor = '#C4B0F0')}
                onBlur={e => (e.target.style.borderColor = '#EDEAF5')}
              />
            </label>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 14,
                  border: '1.5px solid #E8E4F0', background: 'transparent',
                  fontSize: 14, fontWeight: 600, color: '#6F6F76', cursor: 'pointer',
                }}
              >
                Отмена
              </button>
              <TeacherSaveButton
                label="Сохранить" savedLabel="Сохранено"
                saved={saved} disabled={!canSave}
                onClick={handleSave}
                style={{ flex: 2 }}
              />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}
