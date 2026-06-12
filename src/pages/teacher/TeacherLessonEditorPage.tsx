import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Send, Check, ChevronDown, Plus, X, Trash2,
  Video, Link2, ListVideo, NotebookPen, FileText, FolderOpen,
  GraduationCap, Lock, Sparkles, Upload, Calendar, Clock, Search,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { useTeacher } from '../../store/teacherStore'
import TeacherSaveButton from '../../components/teacher/TeacherSaveButton'
import type { HomeworkTemplate, Group, Student, ScheduleItem } from '../../data/teacherMockData'
import { useGroups, useAllStudents } from '../../lib/useGroups'
import { supabase } from '../../lib/supabase'

// ─── Static homework templates (formerly mock data) ────────────────────────────

const HOMEWORK_TEMPLATES: HomeworkTemplate[] = [
  { id: 't1',  title: 'Гидролиз солей — базовый',          subject: 'Химия',    level: 'basic', topic: 'Гидролиз солей',        taskCount: 8 },
  { id: 't2',  title: 'Гидролиз: сложные случаи',          subject: 'Химия',    level: 'hard',  topic: 'Гидролиз солей',        taskCount: 5 },
  { id: 't3',  title: 'Основные оксиды — базовый',         subject: 'Химия',    level: 'basic', topic: 'Оксиды',                taskCount: 10 },
  { id: 't4',  title: 'Сложные оксиды — продвинутый',      subject: 'Химия',    level: 'hard',  topic: 'Оксиды',                taskCount: 6 },
  { id: 't5',  title: 'Фотосинтез — схемы',                subject: 'Биология', level: 'basic', topic: 'Фотосинтез',            taskCount: 10 },
  { id: 't6',  title: 'Фотосинтез и дыхание — задачи C',   subject: 'Биология', level: 'hard',  topic: 'Фотосинтез',            taskCount: 4 },
  { id: 't7',  title: 'ОВР — базовый',                     subject: 'Химия',    level: 'basic', topic: 'Окислительно',          taskCount: 9 },
  { id: 't8',  title: 'ОВР — метод электронного баланса',  subject: 'Химия',    level: 'hard',  topic: 'Окислительно',          taskCount: 5 },
  { id: 't9',  title: 'Периодический закон',               subject: 'Химия',    level: 'basic', topic: 'Периодический',         taskCount: 12 },
  { id: 't10', title: 'Кислоты: классификация',            subject: 'Химия',    level: 'basic', topic: 'Кислоты',               taskCount: 6 },
]

// ─── Style helpers ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '9px 12px', borderRadius: 11,
  border: '1.5px solid rgba(0,0,0,0.09)',
  fontSize: 13, color: 'var(--color-text)',
  background: 'var(--color-bg-2)', outline: 'none',
  fontFamily: 'inherit',
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.4, marginBottom: 5 }}>{children}</div>
}

function tileBase(active: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 18, minHeight: 92, width: '100%',
    background: active ? 'rgba(var(--glass-rgb), 0.96)' : 'rgba(123,63,204,0.04)',
    border: active ? '1px solid var(--color-border-soft)' : '1.5px dashed rgba(123,63,204,0.3)',
    boxShadow: active ? '0 2px 12px rgba(0,0,0,0.05)' : 'none',
    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
  }
}

// ─── Date/time helpers & pickers (same as CreateTaskModal) ────────────────────

const navBtnStyle: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 8, border: 'none',
  background: 'var(--color-bg-3)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'var(--color-muted)',
}

function todayDotStr() {
  const d = new Date()
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`
}
function parseDateDot(s: string): Date | null {
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (!m) return null
  return new Date(+m[3], +m[2] - 1, +m[1])
}
function formatDateDot(d: Date) {
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`
}

const RU_MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const RU_DAYS_SHORT = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

function CalendarPickerLesson({ value, onChange, onClose }: { value: string; onChange: (v: string) => void; onClose: () => void }) {
  const selected = parseDateDot(value)
  const today = new Date()
  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth())

  function prevMonth() { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) } else setViewMonth(m => m - 1) }
  function nextMonth() { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) } else setViewMonth(m => m + 1) }

  const days: (Date | null)[] = []
  const first = new Date(viewYear, viewMonth, 1)
  let startDow = first.getDay() - 1
  if (startDow < 0) startDow = 6
  for (let i = 0; i < startDow; i++) days.push(null)
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  for (let i = 1; i <= daysInMonth; i++) days.push(new Date(viewYear, viewMonth, i))
  while (days.length % 7 !== 0) days.push(null)

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      style={{
        position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
        background: 'var(--color-bg-input)', border: '1.5px solid #EDEAF5', borderRadius: 16,
        boxShadow: '0 12px 40px rgba(0,0,0,0.14)', padding: '12px 14px 14px',
        minWidth: 232, userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button onClick={prevMonth} style={navBtnStyle}><ChevronLeft size={14} strokeWidth={2.2} /></button>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{RU_MONTHS[viewMonth]} {viewYear}</span>
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
          const sel = !!(selected && d.getFullYear() === selected.getFullYear() && d.getMonth() === selected.getMonth() && d.getDate() === selected.getDate())
          const tod = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
          return (
            <button key={i} onClick={() => { onChange(formatDateDot(d)); onClose() }}
              style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: sel ? 700 : 500, background: sel ? '#7B3FCC' : tod ? 'var(--color-purple-soft)' : 'transparent', color: sel ? '#fff' : tod ? '#7B3FCC' : 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.1s' }}
              onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-3)' }}
              onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLElement).style.background = tod ? 'var(--color-purple-soft)' : 'transparent' }}
            >{d.getDate()}</button>
          )
        })}
      </div>
    </motion.div>
  )
}

function generateTimeSlots() {
  const slots: string[] = []
  for (let h = 0; h < 24; h++) for (const m of [0, 30]) slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
  return slots
}
const TIME_SLOTS = generateTimeSlots()

function TimePickerLesson({ value, onChange, onClose }: { value: string; onChange: (v: string) => void; onClose: () => void }) {
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const idx = TIME_SLOTS.indexOf(value)
    if (idx !== -1 && listRef.current) (listRef.current.children[idx] as HTMLElement)?.scrollIntoView({ block: 'center' })
  }, [value])
  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 100, background: 'var(--color-bg-input)', border: '1.5px solid #EDEAF5', borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.14)', overflow: 'hidden' }}
    >
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 32, zIndex: 1, background: 'linear-gradient(to bottom, var(--color-bg-input) 0%, transparent 100%)', pointerEvents: 'none', borderRadius: '14px 14px 0 0' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 32, zIndex: 1, background: 'linear-gradient(to top, var(--color-bg-input) 0%, transparent 100%)', pointerEvents: 'none', borderRadius: '0 0 14px 14px' }} />
        <div ref={listRef} style={{ maxHeight: 200, overflowY: 'auto', padding: '4px 6px', scrollbarWidth: 'none' }}>
          {TIME_SLOTS.map(t => {
            const active = t === value
            return (
              <button key={t} onClick={() => { onChange(t); onClose() }}
                style={{ width: '100%', border: 'none', background: active ? '#7B3FCC' : 'transparent', color: active ? '#fff' : 'var(--color-text)', padding: '7px 10px', textAlign: 'left', fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer', display: 'block', borderRadius: 9, transition: 'background 0.18s, color 0.18s' }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--color-purple-soft)' }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >{t}</button>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Upload tile (workbook / notes / materials) ────────────────────────────────

function fileExt(name: string) {
  const dot = name.lastIndexOf('.')
  const ext = dot >= 0 ? name.slice(dot + 1).toUpperCase() : 'ФАЙЛ'
  return ext.length > 4 ? ext.slice(0, 4) : ext
}

function UploadTile({
  icon: Icon, label, files, onAddFiles, onRemove, multiple,
}: {
  icon: React.ElementType; label: string
  files: string[]; onAddFiles: (names: string[]) => void; onRemove: (i: number) => void; multiple?: boolean
}) {
  const has = files.length > 0
  const inputRef = useRef<HTMLInputElement>(null)

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []).map(f => f.name)
    if (picked.length) onAddFiles(picked)
    e.target.value = '' // allow re-picking the same file
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
        multiple={multiple}
        onChange={handlePick}
        style={{ display: 'none' }}
      />
      <motion.button
        whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }}
        onClick={() => inputRef.current?.click()}
        style={tileBase(has)}
      >
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: has ? 'var(--color-purple-soft)' : 'rgba(123,63,204,0.1)', color: '#7B3FCC',
        }}>
          <Icon size={20} strokeWidth={1.9} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 650, color: 'var(--color-text)', lineHeight: 1.2 }}>{label}</p>
          <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>
            {has ? `${files.length} файл${files.length > 1 ? (files.length < 5 ? 'а' : 'ов') : ''}` : 'Загрузить файл'}
          </p>
        </div>
        {!has && <Upload size={16} style={{ color: 'var(--color-text-4)', flexShrink: 0 }} />}
        {has && multiple && <Plus size={16} style={{ color: '#7B3FCC', flexShrink: 0 }} />}
      </motion.button>

      {has && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
          {files.map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 10px', borderRadius: 9, background: 'var(--color-bg)',
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                background: 'linear-gradient(135deg, #C58BFF, #7B61FF)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 7, fontWeight: 800, color: '#fff',
              }}>{fileExt(f)}</div>
              <span style={{ flex: 1, fontSize: 11.5, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f}</span>
              <button
                onClick={() => onRemove(i)}
                style={{ width: 18, height: 18, borderRadius: 5, border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)', flexShrink: 0 }}
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Homework template picker dropdown ─────────────────────────────────────────

function HwPicker({
  level, value, suggestions, all, onPick, onCreateNew,
}: {
  level: 'basic' | 'hard'
  value: HomeworkTemplate | null
  suggestions: HomeworkTemplate[]
  all: HomeworkTemplate[]
  onPick: (t: HomeworkTemplate | null) => void
  onCreateNew: () => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  // Scroll-driven fade strength (0–1) for the top & bottom edges. Both start at
  // 0 so an un-scrolled list shows no fades; they grow as the user scrolls.
  const [fade, setFade] = useState({ top: 0, bottom: 0 })
  const ref = useRef<HTMLDivElement>(null)
  const isBase = level === 'basic'

  // Close the dropdown when clicking outside of it.
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const matches = (t: HomeworkTemplate) => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return t.title.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q) || t.topic.toLowerCase().includes(q)
  }

  const options = all.filter(t => t.level === level && matches(t))
  const suggested = suggestions.filter(t => t.level === level && matches(t))
  const suggestedIds = new Set(suggested.map(s => s.id))

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    const top = Math.min(1, el.scrollTop / 24)
    const bottom = Math.min(1, (el.scrollHeight - el.clientHeight - el.scrollTop) / 24)
    setFade({ top, bottom })
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => { if (!open) { setQuery(''); setFade({ top: 0, bottom: 0 }) } setOpen(o => !o) }}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', borderRadius: 12, border: 'none', cursor: 'pointer',
          background: value ? 'var(--color-surface)' : 'rgba(255,255,255,0.14)',
          color: value ? 'var(--color-text)' : '#fff',
          boxShadow: value ? '0 2px 10px rgba(0,0,0,0.08)' : 'none',
          fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        {isBase
          ? <GraduationCap size={18} strokeWidth={1.9} style={{ flexShrink: 0, color: value ? '#7B3FCC' : '#fff' }} />
          : <Lock size={16} strokeWidth={1.9} style={{ flexShrink: 0, color: value ? '#F59E0B' : '#fff' }} />
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.2 }}>
            {isBase ? 'Основная домашка' : 'Сложный уровень'}
          </div>
          <div style={{
            fontSize: 11.5, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            color: value ? '#7B3FCC' : 'rgba(255,255,255,0.8)', fontWeight: value ? 600 : 500,
          }}>
            {value ? `${value.title} · ${value.taskCount} зад.` : 'Выбрать из конструктора'}
          </div>
        </div>
        {value && (
          <button
            onClick={e => { e.stopPropagation(); onPick(null) }}
            style={{ width: 22, height: 22, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)', flexShrink: 0 }}
          >
            <X size={12} />
          </button>
        )}
        <ChevronDown size={15} style={{ flexShrink: 0, color: value ? 'var(--color-text-4)' : '#fff', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: isBase ? -6 : 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: isBase ? -6 : 6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            style={{
              position: 'absolute',
              ...(isBase
                ? { top: 'calc(100% + 6px)' }
                : { bottom: 'calc(100% + 6px)' }),
              left: 0, right: 0, zIndex: 60,
              padding: 8, borderRadius: 14,
              background: 'rgba(var(--glass-rgb), 0.6)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              border: '1px solid var(--color-border-glass)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
            }}
          >
            {/* Search — fixed above the scroll area */}
            <div style={{ position: 'relative', marginBottom: 6 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)', pointerEvents: 'none' }} />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Поиск шаблона..."
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '8px 10px 8px 32px',
                  borderRadius: 10, border: '1.5px solid rgba(0,0,0,0.08)',
                  fontSize: 12.5, color: 'var(--color-text)', background: 'rgba(var(--glass-rgb), 0.7)',
                  outline: 'none', fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Scroll area + edge fades. Fades grow with scroll position; both
                start at 0 so an un-scrolled list shows none. */}
            <div style={{ position: 'relative' }}>
              <div
                onScroll={onScroll}
                className="no-scrollbar"
                style={{ maxHeight: 234, overflowY: 'auto' }}
              >
                {suggested.length > 0 && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px 6px' }}>
                      <Sparkles size={12} style={{ color: '#7B3FCC' }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#7B3FCC', letterSpacing: 0.3 }}>ПОДХОДЯТ К УРОКУ</span>
                    </div>
                    {suggested.map(t => (
                      <HwOption key={t.id} t={t} active={value?.id === t.id} suggested onClick={() => { onPick(t); setOpen(false) }} />
                    ))}
                    <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '6px 8px' }} />
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.3, padding: '2px 8px 6px' }}>ВСЕ ШАБЛОНЫ</div>
                  </>
                )}
                {options.filter(t => !suggestedIds.has(t.id)).map(t => (
                  <HwOption key={t.id} t={t} active={value?.id === t.id} onClick={() => { onPick(t); setOpen(false) }} />
                ))}
                <div style={{ height: 8 }} />
                {options.length === 0 && suggested.length === 0 && (
                  <div style={{ padding: '12px 8px', fontSize: 12, color: 'var(--color-text-3)', textAlign: 'center' }}>Ничего не найдено</div>
                )}
                {/* Create new */}
                <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '6px 4px' }} />
                <button
                  onClick={() => { setOpen(false); onCreateNew() }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '9px 10px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: 'transparent', textAlign: 'left', fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-purple-soft)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: 'var(--color-purple-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={15} style={{ color: '#7B3FCC' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#7B3FCC' }}>Создать новую</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 1 }}>Перейти в конструктор</div>
                  </div>
                </button>
              </div>

              {/* Top fade */}
              <div aria-hidden style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 28,
                background: 'linear-gradient(to bottom, var(--color-surface), transparent)',
                opacity: fade.top, transition: 'opacity 0.2s ease', pointerEvents: 'none', borderRadius: '8px 8px 0 0',
              }} />
              {/* Bottom fade */}
              <div aria-hidden style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: 28,
                background: 'linear-gradient(to top, var(--color-surface), transparent)',
                opacity: fade.bottom, transition: 'opacity 0.2s ease', pointerEvents: 'none', borderRadius: '0 0 8px 8px',
              }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function HwOption({ t, active, suggested, onClick }: {
  t: HomeworkTemplate; active: boolean; suggested?: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        padding: '9px 10px', borderRadius: 10, border: 'none', cursor: 'pointer',
        background: active ? 'var(--color-purple-soft)' : 'transparent', textAlign: 'left', fontFamily: 'inherit',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--color-bg)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{
        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
        background: t.level === 'hard' ? 'var(--color-yellow-soft)' : 'var(--color-purple-soft)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {t.level === 'hard'
          ? <Lock size={14} style={{ color: '#F59E0B' }} />
          : <GraduationCap size={15} style={{ color: '#7B3FCC' }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 1 }}>{t.subject} · {t.taskCount} зад.</div>
      </div>
      {suggested && <Sparkles size={13} style={{ color: '#7B3FCC', flexShrink: 0 }} />}
      {active && <Check size={15} style={{ color: '#7B3FCC', flexShrink: 0 }} />}
    </button>
  )
}

// ─── Homework selector card (purple, mirrors student HomeworkCard) ─────────────

function HomeworkSelectorCard({
  lessonTitle, basic, hard, onBasic, onHard, onCreateNew,
}: {
  lessonTitle: string
  basic: HomeworkTemplate | null; hard: HomeworkTemplate | null
  onBasic: (t: HomeworkTemplate | null) => void
  onHard: (t: HomeworkTemplate | null) => void
  onCreateNew: () => void
}) {
  // Suggest templates whose topic appears in the lesson title (case-insensitive,
  // word-stem match). "Основные оксиды" → suggests both Оксиды templates.
  const suggestions = useMemo(() => {
    const title = lessonTitle.toLowerCase()
    if (!title.trim()) return []
    return HOMEWORK_TEMPLATES.filter(t => {
      const stem = t.topic.toLowerCase().slice(0, 5)
      return title.includes(t.topic.toLowerCase()) || title.includes(stem)
    })
  }, [lessonTitle])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 6,
      padding: 8, borderRadius: 20,
      background: 'linear-gradient(135deg, #C58BFF 0%, #7B61FF 100%)',
      boxShadow: '0 12px 28px rgba(123,97,255,0.28)',
      minHeight: 92,
    }}>
      <HwPicker level="basic" value={basic} suggestions={suggestions} all={HOMEWORK_TEMPLATES} onPick={onBasic} onCreateNew={onCreateNew} />
      <HwPicker level="hard" value={hard} suggestions={suggestions} all={HOMEWORK_TEMPLATES} onPick={onHard} onCreateNew={onCreateNew} />
    </div>
  )
}

// ─── Timecode editor ───────────────────────────────────────────────────────────

type Timecode = { time: string; label: string }

function TimecodeEditor({ codes, onChange }: { codes: Timecode[]; onChange: (c: Timecode[]) => void }) {
  return (
    <div className="flex flex-col h-full" style={{
      borderRadius: 24, background: 'rgba(var(--glass-rgb), 0.96)',
      border: '1px solid var(--color-border-soft)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
      padding: 16, gap: 8, maxHeight: '54vh',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        <ListVideo size={17} style={{ color: '#7B3FCC' }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>Таймкоды</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflowY: 'auto', scrollbarGutter: 'stable' }}>
        {codes.map((tc, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              value={tc.time}
              onChange={e => { const c = [...codes]; c[i] = { ...c[i], time: e.target.value }; onChange(c) }}
              placeholder="00:00"
              style={{ ...inputStyle, width: 60, padding: '7px 8px', textAlign: 'center', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}
            />
            <input
              value={tc.label}
              onChange={e => { const c = [...codes]; c[i] = { ...c[i], label: e.target.value }; onChange(c) }}
              placeholder="Глава..."
              style={{ ...inputStyle, flex: 1, padding: '7px 10px' }}
            />
            <button
              onClick={() => onChange(codes.filter((_, j) => j !== i))}
              style={{ width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)', flexShrink: 0 }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        {codes.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-4)', fontSize: 12 }}>
            Добавьте главы видео
          </div>
        )}
      </div>
      <button
        onClick={() => onChange([...codes, { time: '', label: '' }])}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '8px 0', borderRadius: 11, border: '1.5px dashed rgba(123,63,204,0.35)',
          background: 'rgba(123,63,204,0.05)', cursor: 'pointer',
          fontSize: 12.5, fontWeight: 600, color: '#7B3FCC', fontFamily: 'inherit',
        }}
      >
        <Plus size={13} /> Таймкод
      </button>
    </div>
  )
}

// ─── Video zone ────────────────────────────────────────────────────────────────

function VideoZone({ url, onChange }: { url: string; onChange: (u: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  if (url) {
    return (
      <div style={{
        position: 'relative', width: '100%', height: '54vh', borderRadius: 24, overflow: 'hidden',
        background: 'linear-gradient(135deg, #2A2A2C, #111113)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14,
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18, background: 'rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Video size={30} style={{ color: '#fff' }} />
        </div>
        <div style={{ textAlign: 'center', padding: '0 20px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Запись прикреплена</div>
          <div style={{ fontSize: 12, color: 'var(--color-border-glass)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 360, whiteSpace: 'nowrap' }}>{url}</div>
        </div>
        <button
          onClick={() => onChange('')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 11,
            border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.16)',
            color: '#fff', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit',
          }}
        >
          <X size={13} /> Удалить
        </button>
      </div>
    )
  }

  return (
    <div style={{
      width: '100%', height: '54vh', borderRadius: 24,
      border: '2px dashed rgba(123,63,204,0.3)', background: 'rgba(123,63,204,0.03)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 18, background: 'rgba(123,63,204,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Video size={30} style={{ color: '#7B3FCC' }} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>Добавьте запись урока</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-3)' }}>После созвона — вставьте ссылку RuTube / YouTube</div>
      </div>

      {editing ? (
        <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 440 }}>
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && draft.trim()) { onChange(draft.trim()); setEditing(false) } }}
            placeholder="https://rutube.ru/video/..."
            style={{ ...inputStyle, flex: 1, background: 'var(--color-bg-input)' }}
          />
          <button
            onClick={() => { if (draft.trim()) { onChange(draft.trim()); setEditing(false) } }}
            style={{
              padding: '0 16px', borderRadius: 11, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #9B6DFF, #7B3FCC)', color: '#fff',
              fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
            }}
          >
            ОК
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setEditing(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 12,
              border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #9B6DFF, #7B3FCC)',
              color: '#fff', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit',
              boxShadow: '0 4px 14px rgba(123,63,204,0.3)',
            }}
          >
            <Link2 size={15} /> Вставить ссылку
          </button>
          <button
            onClick={() => onChange('https://rutube.ru/video/upload-' + Math.random().toString(36).slice(2, 8))}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 12,
              border: '1.5px solid rgba(0,0,0,0.1)', cursor: 'pointer', background: 'transparent',
              color: 'var(--color-muted)', fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit',
            }}
          >
            <Upload size={15} /> Загрузить файл
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Left meta panel ───────────────────────────────────────────────────────────

type Recipient = { kind: 'group' | 'student'; id: string }

type Meta = {
  recipients: Recipient[]
  title: string
  lessonNumber: string
  date: string
  startTime: string
  endTime: string
}

// Resolve a recipient to display props (name, sub-label, icon/initials, color)
function resolveRecipient(r: Recipient, groups: Group[], students: Student[]) {
  if (r.kind === 'group') {
    const g = groups.find(x => x.id === r.id)
    return {
      name: g?.name ?? 'Группа',
      sub: g ? `${g.level} · ${g.subject}` : '',
      icon: g?.icon ?? '👥',
      initials: '',
      color: '#7B3FCC',
    }
  }
  const s = students.find(x => x.id === r.id)
  const initials = (s?.name ?? '?').split(' ').map(p => p[0]).join('').slice(0, 2)
  const g = s ? groups.find(x => x.id === s.groupId) : undefined
  return {
    name: s?.name ?? 'Студент',
    sub: g?.name ?? '',
    icon: '',
    initials,
    color: 'var(--color-green-text)',
  }
}

// ─── Audience picker (multi group / student) ───────────────────────────────────

function AudiencePicker({
  recipients, onChange,
}: { recipients: Recipient[]; onChange: (r: Recipient[]) => void }) {
  const { groups } = useGroups()
  const students = useAllStudents()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  // Close the dropdown when clicking outside of it.
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery('') }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const has = (kind: 'group' | 'student', id: string) =>
    recipients.some(r => r.kind === kind && r.id === id)

  function add(kind: 'group' | 'student', id: string) {
    if (has(kind, id)) return
    onChange([...recipients, { kind, id }])
    setQuery('')
  }
  function remove(kind: 'group' | 'student', id: string) {
    onChange(recipients.filter(r => !(r.kind === kind && r.id === id)))
  }

  const q = query.trim().toLowerCase()
  const groupMatches = groups.filter(g =>
    !has('group', g.id) && (!q || g.name.toLowerCase().includes(q) || g.subject.toLowerCase().includes(q)))
  const studentMatches = students.filter(s =>
    !has('student', s.id) && (!q || s.name.toLowerCase().includes(q)))

  return (
    <div ref={ref}>
      <Label>Кому</Label>

      {/* Selected chips */}
      {recipients.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {recipients.map(r => {
            const d = resolveRecipient(r, groups, students)
            return (
              <div
                key={`${r.kind}-${r.id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 6px 4px 5px', borderRadius: 9,
                  background: r.kind === 'group' ? 'var(--color-purple-soft)' : 'var(--color-green-soft)',
                  maxWidth: '100%',
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: r.kind === 'group' ? 'var(--color-surface)' : d.color,
                  fontSize: r.kind === 'group' ? 11 : 8.5, fontWeight: 800,
                  color: '#fff',
                }}>
                  {r.kind === 'group' ? <span>{d.icon}</span> : d.initials}
                </div>
                <span style={{
                  fontSize: 11.5, fontWeight: 600,
                  color: r.kind === 'group' ? '#7B3FCC' : 'var(--color-green-text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {d.name}
                </span>
                <button
                  onClick={() => remove(r.kind, r.id)}
                  style={{
                    width: 16, height: 16, borderRadius: 5, border: 'none', cursor: 'pointer',
                    background: 'rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: r.kind === 'group' ? '#7B3FCC' : 'var(--color-green-text)', flexShrink: 0,
                  }}
                >
                  <X size={9} strokeWidth={2.6} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Add button + dropdown */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, width: '100%',
            padding: '9px 12px', borderRadius: 11, cursor: 'pointer',
            border: '1.5px dashed rgba(123,63,204,0.35)',
            background: open ? 'rgba(123,63,204,0.08)' : 'rgba(123,63,204,0.04)',
            color: '#7B3FCC', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit',
          }}
        >
          <Plus size={14} strokeWidth={2.4} />
          {recipients.length === 0 ? 'Группа или ученик' : 'Добавить ещё'}
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                background: 'var(--color-bg-input)', borderRadius: 14, zIndex: 200,
                boxShadow: '0 12px 36px rgba(0,0,0,0.16)',
                border: '1px solid var(--color-border)', overflow: 'hidden',
              }}
            >
              {/* Search */}
              <div style={{ padding: 8, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)', pointerEvents: 'none' }} />
                  <input
                    autoFocus
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Поиск группы или ученика…"
                    style={{ ...inputStyle, paddingLeft: 30 }}
                  />
                </div>
              </div>

              <div style={{ maxHeight: 260, overflowY: 'auto', padding: 6 }}>
                {/* Groups */}
                {groupMatches.length > 0 && (
                  <>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.4, padding: '6px 8px 4px' }}>ГРУППЫ</div>
                    {groupMatches.map(g => (
                      <button
                        key={g.id}
                        onClick={() => add('group', g.id)}
                        style={pickerRow}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-4)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: 'var(--color-purple-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                          {g.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
                          <div style={{ fontSize: 10.5, color: 'var(--color-text-3)' }}>{g.level} · {g.subject}</div>
                        </div>
                        <Plus size={13} style={{ color: '#7B3FCC', flexShrink: 0 }} />
                      </button>
                    ))}
                  </>
                )}

                {/* Students */}
                {studentMatches.length > 0 && (
                  <>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.4, padding: '8px 8px 4px' }}>УЧЕНИКИ</div>
                    {studentMatches.slice(0, 40).map(s => {
                      const initials = s.name.split(' ').map(p => p[0]).join('').slice(0, 2)
                      const g = groups.find(x => x.id === s.groupId)
                      return (
                        <button
                          key={s.id}
                          onClick={() => add('student', s.id)}
                          style={pickerRow}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-4)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: 'var(--color-green-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 800, color: '#fff' }}>
                            {initials}
                          </div>
                          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                            <div style={{ fontSize: 10.5, color: 'var(--color-text-3)' }}>{g?.name ?? ''}</div>
                          </div>
                          <Plus size={13} style={{ color: 'var(--color-green-text)', flexShrink: 0 }} />
                        </button>
                      )
                    })}
                  </>
                )}

                {groupMatches.length === 0 && studentMatches.length === 0 && (
                  <div style={{ padding: '20px 8px', textAlign: 'center', fontSize: 12, color: 'var(--color-text-4)' }}>
                    Ничего не найдено
                  </div>
                )}
              </div>

              <div style={{ padding: 8, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                <button
                  onClick={() => { setOpen(false); setQuery('') }}
                  style={{
                    width: '100%', padding: '8px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: 'var(--color-bg)', color: 'var(--color-muted)', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit',
                  }}
                >
                  Готово
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

const pickerRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 9, width: '100%',
  padding: '7px 8px', borderRadius: 10, border: 'none', cursor: 'pointer',
  background: 'transparent', fontFamily: 'inherit', transition: 'background 0.12s',
}

function LeftPanel({ meta, onChange }: { meta: Meta; onChange: (p: Partial<Meta>) => void }) {
  const [showCal, setShowCal] = useState(false)
  const [showStartTime, setShowStartTime] = useState(false)
  const [showEndTime, setShowEndTime] = useState(false)
  const calRef = useRef<HTMLDivElement>(null)
  const startRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (showCal && calRef.current && !calRef.current.contains(e.target as Node)) setShowCal(false)
      if (showStartTime && startRef.current && !startRef.current.contains(e.target as Node)) setShowStartTime(false)
      if (showEndTime && endRef.current && !endRef.current.contains(e.target as Node)) setShowEndTime(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [showCal, showStartTime, showEndTime])

  const displayDate = meta.date || todayDotStr()

  return (
    <div style={{
      width: 260, flexShrink: 0,
      padding: 16, borderRadius: 18,
      background: 'rgba(var(--glass-rgb), 0.88)',
      backdropFilter: 'blur(16px) saturate(180%)',
      WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      border: '1px solid var(--color-border-glass)',
      boxShadow: 'var(--shadow-sm-page)',
      display: 'flex', flexDirection: 'column', gap: 14,
      alignSelf: 'flex-start',
    }}>
      <AudiencePicker
        recipients={meta.recipients}
        onChange={r => onChange({ recipients: r })}
      />

      <div>
        <Label>Название урока</Label>
        <input
          value={meta.title}
          onChange={e => onChange({ title: e.target.value })}
          placeholder="Например: Основные оксиды"
          style={inputStyle}
        />
        <div style={{ fontSize: 10.5, color: 'var(--color-text-4)', marginTop: 4, lineHeight: 1.4 }}>
          По названию подберём домашки из конструктора
        </div>
      </div>

      <div>
        <Label>Номер занятия</Label>
        <input
          value={meta.lessonNumber}
          onChange={e => onChange({ lessonNumber: e.target.value })}
          placeholder="35"
          style={inputStyle}
        />
      </div>

      <div>
        <Label>Дата</Label>
        <div ref={calRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowCal(v => !v); setShowStartTime(false); setShowEndTime(false) }}
            style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', border: `1.5px solid ${showCal ? 'rgba(123,63,204,0.55)' : 'var(--color-border)'}`, background: showCal ? 'var(--color-bg-3)' : 'var(--color-bg-2)', paddingLeft: 11, textAlign: 'left' }}
          >
            <Calendar size={13} color="#9A9AA2" style={{ flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{displayDate}</span>
          </button>
          <AnimatePresence>
            {showCal && (
              <CalendarPickerLesson
                value={displayDate}
                onChange={v => { onChange({ date: v }); }}
                onClose={() => setShowCal(false)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      <div>
        <Label>Время</Label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div ref={startRef} style={{ position: 'relative', flex: 1 }}>
            <button
              onClick={() => { setShowStartTime(v => !v); setShowCal(false); setShowEndTime(false) }}
              style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', border: `1.5px solid ${showStartTime ? 'rgba(123,63,204,0.55)' : 'var(--color-border)'}`, background: showStartTime ? 'var(--color-bg-3)' : 'var(--color-bg-2)', paddingLeft: 10, textAlign: 'left' }}
            >
              <Clock size={13} color="#9A9AA2" style={{ flexShrink: 0 }} />
              <span>{meta.startTime || '—'}</span>
            </button>
            <AnimatePresence>
              {showStartTime && (
                <TimePickerLesson
                  value={meta.startTime}
                  onChange={v => onChange({ startTime: v })}
                  onClose={() => setShowStartTime(false)}
                />
              )}
            </AnimatePresence>
          </div>
          <span style={{ color: 'var(--color-text-4)', fontSize: 14 }}>—</span>
          <div ref={endRef} style={{ position: 'relative', flex: 1 }}>
            <button
              onClick={() => { setShowEndTime(v => !v); setShowCal(false); setShowStartTime(false) }}
              style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', border: `1.5px solid ${showEndTime ? 'rgba(123,63,204,0.55)' : 'var(--color-border)'}`, background: showEndTime ? 'var(--color-bg-3)' : 'var(--color-bg-2)', paddingLeft: 10, textAlign: 'left' }}
            >
              <Clock size={13} color="#9A9AA2" style={{ flexShrink: 0 }} />
              <span>{meta.endTime || '—'}</span>
            </button>
            <AnimatePresence>
              {showEndTime && (
                <TimePickerLesson
                  value={meta.endTime}
                  onChange={v => onChange({ endTime: v })}
                  onClose={() => setShowEndTime(false)}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function TeacherLessonEditorPage() {
  const setActivePage = useTeacher(s => s.setActivePage)
  const editingScheduleId = useTeacher(s => s.editingScheduleId)

  const [source, setSource] = useState<ScheduleItem | null>(null)
  useEffect(() => {
    if (!editingScheduleId) { setSource(null); return }
    supabase
      .from('schedule_lessons')
      .select('*, groups(name, icon, color, color_soft, subject)')
      .eq('id', editingScheduleId)
      .single()
      .then(({ data }) => {
        if (!data) return
        setSource({
          id: String(data.id),
          groupId: data.group_id,
          groupName: data.groups?.name ?? '',
          icon: data.groups?.icon ?? '📚',
          time: (data.time_start ?? '').slice(0, 5),
          endTime: (data.time_end ?? '').slice(0, 5),
          topic: data.lesson_title ?? '',
          lessonNumber: data.lesson_number ?? 0,
          subject: data.subject ?? data.groups?.subject ?? '',
          status: 'upcoming' as const,
          studentCount: 0,
          color: data.groups?.color ?? '#9B6DFF',
          colorSoft: data.groups?.color_soft ?? '#E4D9FF',
        })
      })
  }, [editingScheduleId])

  const isNew = !source

  const [meta, setMeta] = useState<Meta>({
    recipients: [],
    title: '',
    lessonNumber: '',
    date: todayDotStr(),
    startTime: '',
    endTime: '',
  })

  useEffect(() => {
    if (!source) return
    setMeta(m => ({
      ...m,
      recipients: source.groupId ? [{ kind: 'group', id: source.groupId }] : m.recipients,
      title: source.topic || m.title,
      lessonNumber: String(source.lessonNumber || '') || m.lessonNumber,
      startTime: source.time || m.startTime,
      endTime: source.endTime || m.endTime,
    }))
  }, [source])
  const [videoUrl, setVideoUrl] = useState('')
  const [timecodes, setTimecodes] = useState<Timecode[]>([])
  const [workbook, setWorkbook] = useState<string[]>([])
  const [notes, setNotes] = useState<string[]>([])
  const [materials, setMaterials] = useState<string[]>([])
  const [basicHw, setBasicHw] = useState<HomeworkTemplate | null>(null)
  const [hardHw, setHardHw] = useState<HomeworkTemplate | null>(null)
  const [description, setDescription] = useState('')
  const [published, setPublished] = useState(false)

  // Scroll-driven header dock — same logic as the student lesson/homework pages:
  // a single boolean threshold (scrollTop > 64) flips the rest-state header row
  // out and a fixed "docked twin" of glass pills in, while the page scrolls UP
  // under the shell's floating topbar + progressive-blur strip.
  const [docked, setDocked] = useState(false)

  const { groups } = useGroups()

  function updateMeta(p: Partial<Meta>) { setMeta(m => ({ ...m, ...p })) }

  async function handlePublish() {
    const parts = meta.date.split('.')
    const isoDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : meta.date
    const groupRecipients = meta.recipients.filter(r => r.kind === 'group')

    if (editingScheduleId) {
      await supabase.from('schedule_lessons').update({
        lesson_title: meta.title,
        lesson_number: meta.lessonNumber ? Number(meta.lessonNumber) : null,
        date: isoDate,
        time_start: meta.startTime || null,
        time_end: meta.endTime || null,
      }).eq('id', editingScheduleId)
    } else if (groupRecipients.length > 0) {
      await Promise.all(groupRecipients.map(r => {
        const group = groups.find(g => g.id === r.id)
        return supabase.from('schedule_lessons').insert({
          group_id: r.id,
          lesson_title: meta.title,
          lesson_number: meta.lessonNumber ? Number(meta.lessonNumber) : null,
          date: isoDate,
          time_start: meta.startTime || null,
          time_end: meta.endTime || null,
          subject: group?.subject ?? '',
          status: 'upcoming',
        })
      }))
    }

    setPublished(true)
    setTimeout(() => setActivePage('home'), 1600)
  }

  // Shared glass recipe for the docked top-line pills — matched to the teacher
  // topbar so every floating surface reads as one consistent piece of glass.
  const dockGlass = {
    border: '1px solid var(--color-border-glass)',
    background: 'rgba(var(--glass-rgb), 0.86)',
    backdropFilter: 'blur(14px) saturate(180%)',
    WebkitBackdropFilter: 'blur(14px) saturate(180%)',
    boxShadow: 'var(--shadow-lg)',
  } as const

  const backBtn = (
    <>
      <ArrowLeft size={15} strokeWidth={2} /> Назад
    </>
  )
  const draftLabel = 'Черновик'

  return (
    // Single scroll container. The teacher shell wrapper sits 100px down (topbar
    // reservation); marginTop:-100 lifts the pane up to the viewport top so it
    // can scroll UNDER the floating topbar, and paddingTop:100 re-insets the
    // content below the topbar at rest — exactly the student lesson page recipe.
    // The wrapper's overflow:visible (set for this page) keeps the lifted top
    // from being clipped.
    <div
      onScroll={e => setDocked((e.currentTarget as HTMLElement).scrollTop > 64)}
      style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarGutter: 'stable', marginTop: -100, paddingTop: 100 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '4px 32px 48px' }}>

        {/* ── Rest-state header row — in the scroll flow below the topbar; fades
            out as the page docks. Its docked twin (below) sits ON the topbar line. ── */}
        <motion.div
          style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
          animate={{ opacity: docked ? 0 : 1 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
            onClick={() => setActivePage('home')}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
              padding: '9px 16px 9px 12px', borderRadius: 999, border: '1px solid var(--color-border-soft)',
              background: 'rgba(var(--glass-rgb), 0.96)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
              color: 'var(--color-text)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {backBtn}
          </motion.button>

          <div style={{
            position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
            maxWidth: '44%', pointerEvents: 'none',
            fontSize: 18, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center',
          }}>
            {isNew ? 'Создать урок' : 'Урок'}
            {meta.title && <span style={{ color: 'var(--color-text-3)', fontWeight: 500 }}> — {meta.title}</span>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <button
              style={{
                padding: '9px 18px', borderRadius: 999, border: '1px solid var(--color-border-medium)',
                background: 'rgba(var(--glass-rgb), 0.96)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', cursor: 'pointer',
                fontSize: 13.5, fontWeight: 600, color: 'var(--color-muted)', fontFamily: 'inherit',
              }}
            >
              {draftLabel}
            </button>
            <TeacherSaveButton
              label="Опубликовать урок" savedLabel="Опубликовано!"
              icon={<Send size={14} />}
              saved={published} onClick={handlePublish}
            />
          </div>
        </motion.div>

        {/* ── Docked twin — fixed at the topbar line, escaping the scroll
            container's top padding so it sits ON the topbar row. Glass pills to
            match the topbar; fades / slides in on scroll. ── */}
        <div className="docked-pills-row" style={{ position: 'fixed', top: 30, left: 32, right: 32, zIndex: 80, pointerEvents: 'none' }}>
        <AnimatePresence>
          {docked && (
            <motion.div
              key="editor-dock"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, pointerEvents: 'none',
              }}
            >
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                onClick={() => setActivePage('home')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                  padding: '9px 16px 9px 12px', borderRadius: 999, ...dockGlass,
                  color: 'var(--color-text)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit', pointerEvents: 'auto',
                }}
              >
                {backBtn}
              </motion.button>

              <div
                style={{
                  flexShrink: 1, minWidth: 0, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  padding: '9px 16px', borderRadius: 999, ...dockGlass,
                  fontSize: 14, fontWeight: 700, color: 'var(--color-text)', pointerEvents: 'auto',
                }}
              >
                {meta.title || (isNew ? 'Создать урок' : 'Урок')}
              </div>

              <div style={{ flexGrow: 1, flexBasis: 0 }} />

              <button
                style={{
                  flexShrink: 0, padding: '9px 16px', borderRadius: 999, ...dockGlass,
                  cursor: 'pointer', fontSize: 13.5, fontWeight: 600, color: 'var(--color-muted)',
                  fontFamily: 'inherit', pointerEvents: 'auto',
                }}
              >
                {draftLabel}
              </button>
              <TeacherSaveButton
                label="Опубликовать урок" savedLabel="Опубликовано!"
                icon={<Send size={14} />}
                saved={published} onClick={handlePublish}
                style={{ boxShadow: '0 6px 20px rgba(123,63,204,0.32)', pointerEvents: 'auto' }}
              />
            </motion.div>
          )}
        </AnimatePresence>
        </div>

        {/* ── Body ── */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

          {/* Left meta panel — sticky so its fields stay visible while scrolling. */}
          <div style={{ position: 'sticky', top: 108, flexShrink: 0 }}>
            <LeftPanel meta={meta} onChange={updateMeta} />
          </div>

          {/* Center */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Row 1: video + timecodes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 16, alignItems: 'stretch' }}>
              <VideoZone url={videoUrl} onChange={setVideoUrl} />
              <TimecodeEditor codes={timecodes} onChange={setTimecodes} />
            </div>

            {/* Row 2: materials + homework */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14, alignItems: 'start' }}>
              <UploadTile icon={NotebookPen} label="Рабочая тетрадь" files={workbook}
                onAddFiles={names => setWorkbook(f => [...f, ...names])}
                onRemove={i => setWorkbook(f => f.filter((_, j) => j !== i))} />
              <UploadTile icon={FileText} label="Конспект" files={notes}
                onAddFiles={names => setNotes(f => [...f, ...names])}
                onRemove={i => setNotes(f => f.filter((_, j) => j !== i))} />
              <UploadTile icon={FolderOpen} label="Материалы" files={materials} multiple
                onAddFiles={names => setMaterials(f => [...f, ...names])}
                onRemove={i => setMaterials(f => f.filter((_, j) => j !== i))} />
              <HomeworkSelectorCard
                lessonTitle={meta.title}
                basic={basicHw} hard={hardHw}
                onBasic={setBasicHw} onHard={setHardHw}
                onCreateNew={() => setActivePage('homework-create')}
              />
            </div>

            {/* Description */}
            <section style={{
              display: 'flex', flexDirection: 'column', gap: 12,
              padding: 24, borderRadius: 24,
              background: 'rgba(var(--glass-rgb), 0.96)', border: '1px solid var(--color-border-soft)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={17} style={{ color: '#7B3FCC' }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>Описание урока</span>
              </div>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Краткое содержание урока, что разобрали, ключевые моменты..."
                rows={5}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 120, lineHeight: 1.6, background: 'var(--color-bg-input)' }}
              />
            </section>

          </div>
        </div>
      </div>
    </div>
  )
}
