import { useState, useMemo, useRef, type ReactNode } from 'react'
import { useFloatingPill } from '../lib/useFloatingPill'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, Search, BookOpen, CheckCircle2, XCircle,
  Bookmark, Share2, AlertTriangle, Eye, Target, Filter,
} from 'lucide-react'
import {
  tasks, Task, Subject,
  BIOLOGY_SECTIONS, CHEMISTRY_SECTIONS,
  BIOLOGY_TOPICS, CHEMISTRY_TOPICS,
  SOURCES,
} from '../data/taskBankData'
import { useDashboard } from '../store/dashboardStore'
import { subjectTheme, PURPLE } from '../lib/theme'

type StatusFilter = 'all' | 'done' | 'undone'

// ── Scroll-fade list ─────────────────────────────────────────────────────────
// Vertical scroll area that fades content at whichever edge is still scrollable,
// so a long option list never looks hard-cut. (No rAF — pure scroll events.)
function ScrollFade({ children, maxHeight }: { children: ReactNode; maxHeight: number }) {
  const [edges, setEdges] = useState({ top: false, bottom: false })
  function update(el: HTMLElement) {
    const top = el.scrollTop > 2
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 2
    setEdges(prev => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }))
  }
  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={el => { if (el) update(el) }}
        onScroll={e => update(e.currentTarget)}
        style={{ maxHeight, overflowY: 'auto', overscrollBehavior: 'contain' }}
      >
        {children}
      </div>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 22, pointerEvents: 'none',
        background: 'linear-gradient(to bottom, rgba(255,255,255,0.98), transparent)',
        opacity: edges.top ? 1 : 0, transition: 'opacity 0.18s ease',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 22, pointerEvents: 'none',
        background: 'linear-gradient(to top, rgba(255,255,255,0.98), transparent)',
        opacity: edges.bottom ? 1 : 0, transition: 'opacity 0.18s ease',
      }} />
    </div>
  )
}

// ── Filter field — input-style combobox, expands inline (never clipped) ──────
function FilterField({ label, options, value, onChange, accent }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void; accent: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const shown = query ? options.filter(o => o.toLowerCase().includes(query.toLowerCase())) : options

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '9px 12px', borderRadius: 13,
        background: '#FFFFFF',
        border: `1px solid ${open ? accent : value ? 'rgba(0,0,0,0.16)' : 'rgba(0,0,0,0.1)'}`,
        boxShadow: open ? `0 0 0 3px ${accent}22` : 'none',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
      }}>
        <input
          value={open ? query : value}
          placeholder={label}
          onFocus={() => { setOpen(true); setQuery('') }}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onChange={e => setQuery(e.target.value)}
          style={{
            flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
            fontSize: 13, fontWeight: value && !open ? 600 : 400,
            color: value && !open ? '#0B0B0D' : '#6F6F76',
          }}
        />
        {value && !open ? (
          <button onMouseDown={e => { e.preventDefault(); onChange('') }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9A9AA2', fontSize: 16, lineHeight: 1, padding: 0 }}>
            ×
          </button>
        ) : (
          <svg width="11" height="11" viewBox="0 0 10 10" fill="none" style={{ color: '#9A9AA2', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}>
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.12 }}
          style={{
            // Float over the filters below instead of pushing them down — a glass
            // sheet anchored to the field's bottom edge.
            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6, zIndex: 50,
            background: 'rgba(255,255,255,0.9)',
            backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.7)', borderRadius: 13,
            boxShadow: '0 14px 36px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.8)', overflow: 'hidden',
          }}
        >
          <ScrollFade maxHeight={190}>
            {/* Inset the rows so the active/hover fill floats inside the glass
                with a margin off the edges and rounded corners. */}
            <div style={{ padding: 5, display: 'flex', flexDirection: 'column' }}>
              {value && (
                <button onMouseDown={e => { e.preventDefault(); onChange(''); setOpen(false) }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  style={{ width: '100%', padding: '8px 8px', borderRadius: 9, textAlign: 'left', background: 'transparent', border: 'none', fontSize: 12, color: '#9A9AA2', cursor: 'pointer', transition: 'background 0.13s ease' }}>
                  — Сбросить
                </button>
              )}
              {shown.length === 0 ? (
                <div style={{ padding: '10px 8px', fontSize: 12, color: '#B5B5BC' }}>Ничего не найдено</div>
              ) : shown.map(opt => {
                const rest = opt === value ? `${accent}14` : 'transparent'
                return (
                  <button key={opt} onMouseDown={e => { e.preventDefault(); onChange(opt); setOpen(false) }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${accent}1f` }}
                    onMouseLeave={e => { e.currentTarget.style.background = rest }}
                    style={{ width: '100%', padding: '9px 8px', borderRadius: 9, textAlign: 'left', background: rest, border: 'none', fontSize: 12.5, cursor: 'pointer', color: '#0B0B0D', fontWeight: opt === value ? 700 : 400, transition: 'background 0.13s ease' }}>
                    {opt}
                  </button>
                )
              })}
            </div>
          </ScrollFade>
        </motion.div>
      )}
    </div>
  )
}

// ── Task card — same visual language as HomeworkFlow questions ───────────────
function TaskCard({ task, index, palette, favorites, onFavorite, answered, onAnswer }: {
  task: Task; index: number; palette: ReturnType<typeof subjectTheme>
  favorites: Set<number>; onFavorite: (id: number) => void
  answered: Map<number, { value: string; correct: boolean | null }>
  onAnswer: (id: number, value: string, correct: boolean | null) => void
}) {
  const [showSolution, setShowSolution] = useState(false)
  const [inputVal, setInputVal] = useState(answered.get(task.id)?.value ?? '')
  const [inputOverflow, setInputOverflow] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const [copied, setCopied] = useState(false)
  const [reported, setReported] = useState(false)
  const state = answered.get(task.id)
  const isFav = favorites.has(task.id)
  const isCorrect = state?.correct === true
  const isWrong   = state?.correct === false

  function check() {
    onAnswer(task.id, inputVal, inputVal.trim().toLowerCase() === task.answer.toLowerCase())
  }
  function share() {
    navigator.clipboard.writeText(`№${task.id} · ${task.question.slice(0, 80)}…`)
    setCopied(true); setTimeout(() => setCopied(false), 1400)
  }

  return (
    <div
      className="flex flex-col"
      style={{
        gap: 14, padding: 20, borderRadius: 26,
        background: 'rgba(255,255,255,0.96)',
        border: `1px solid ${isCorrect ? 'rgba(110,231,160,0.58)' : isWrong ? 'rgba(244,139,145,0.5)' : 'rgba(0,0,0,0.06)'}`,
        boxShadow: isCorrect ? '0 12px 34px rgba(110,231,160,0.14)' : isWrong ? '0 12px 34px rgba(244,139,145,0.12)' : '0 8px 24px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header: label + badges + result badge */}
      <div className="flex flex-wrap items-start justify-between" style={{ gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: palette.text }}>Задание {index + 1}</span>
            <span style={{ fontSize: 11, color: '#BDBDC2' }}>·</span>
            <span style={{ padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: '#FFE1E4', color: '#B03040' }}>№{task.id}</span>
            <span style={{ padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: 'rgba(0,0,0,0.05)', color: '#6F6F76' }}>{task.line} линия</span>
            <span style={{ padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: 'rgba(0,0,0,0.05)', color: '#6F6F76' }}>Часть {task.part}</span>
          </div>
          <p style={{ fontSize: 16, lineHeight: 1.45, fontWeight: 650, color: '#0B0B0D', whiteSpace: 'pre-wrap' }}>
            {task.question}
          </p>
        </div>
        {state !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 14, background: isCorrect ? '#DFF8D6' : '#FFE1E4', color: isCorrect ? '#2A7D4F' : '#A8282D', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
            {isCorrect ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
            {isCorrect ? 'Верно' : 'Неверно'}
          </div>
        )}
      </div>

      {/* Table */}
      {task.questionTable && (
        <table style={{ borderCollapse: 'collapse', fontSize: 13, border: '1px solid rgba(0,0,0,0.09)' }}>
          <thead>
            <tr>{task.questionTable.headers.map(h => (
              <th key={h} style={{ border: '1px solid rgba(0,0,0,0.08)', padding: '8px 14px', fontWeight: 700, background: 'rgba(0,0,0,0.025)', textAlign: 'left' }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {task.questionTable.rows.map((row, i) => (
              <tr key={i}>{row.map((cell, j) => (
                <td key={j} style={{ border: '1px solid rgba(0,0,0,0.08)', padding: '8px 14px' }}>{cell}</td>
              ))}</tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Answer + action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 140px', maxWidth: 210 }}>
          <input
            ref={inputRef}
            value={inputVal}
            onChange={e => {
              setInputVal(e.target.value)
              const measuredWidth = measureRef.current?.offsetWidth ?? 0
              const innerWidth = (inputRef.current?.clientWidth ?? 210) - 32
              setInputOverflow(measuredWidth > innerWidth)
            }}
            onKeyDown={e => e.key === 'Enter' && inputVal.trim() && check()}
            placeholder="Введи ответ"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '11px 16px', borderRadius: 16, fontSize: 14, outline: 'none',
              border: `1px solid ${state ? (isCorrect ? '#6EE7A0' : '#F48B91') : 'rgba(0,0,0,0.1)'}`,
              background: state ? (isCorrect ? '#DFF8D6' : '#FFE1E4') : '#FFFFFF',
            }}
          />
          <div style={{
            position: 'absolute', left: 1, top: 1, bottom: 1, width: 32,
            borderRadius: '15px 0 0 15px', pointerEvents: 'none',
            background: `linear-gradient(to right, ${state ? (isCorrect ? '#DFF8D6' : '#FFE1E4') : '#FFFFFF'}, transparent)`,
            opacity: inputVal ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }} />
          <div style={{
            position: 'absolute', right: 1, top: 1, bottom: 1, width: 32,
            borderRadius: '0 15px 15px 0', pointerEvents: 'none',
            background: `linear-gradient(to left, ${state ? (isCorrect ? '#DFF8D6' : '#FFE1E4') : '#FFFFFF'}, transparent)`,
            opacity: inputOverflow ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }} />
          <span ref={measureRef} style={{
            position: 'absolute', visibility: 'hidden', whiteSpace: 'pre',
            fontSize: 14, fontFamily: 'inherit', pointerEvents: 'none', top: -9999,
          }}>{inputVal}</span>
        </div>
        <button onClick={check} disabled={!inputVal.trim()} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '11px 20px', borderRadius: 999,
          background: inputVal.trim() ? palette.accent : '#E0E0E4',
          color: inputVal.trim() ? palette.onAccent : '#AAAAAF',
          border: 'none', outline: 'none', fontSize: 13, fontWeight: 700, cursor: inputVal.trim() ? 'pointer' : 'default',
          boxShadow: inputVal.trim() ? `0 8px 20px ${palette.ring}` : 'none',
          transition: 'all 0.18s ease',
        }}>
          <CheckCircle2 size={14} />Проверить
        </button>
        <button onClick={() => setShowSolution(s => !s)} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '11px 18px', borderRadius: 999,
          background: showSolution ? palette.soft : 'rgba(255,255,255,0.88)',
          border: `1px solid ${showSolution ? palette.accent : 'rgba(0,0,0,0.09)'}`,
          outline: 'none',
          fontSize: 13, cursor: 'pointer', color: showSolution ? palette.text : '#6F6F76', fontWeight: showSolution ? 700 : 500,
        }}>
          <Eye size={14} />Решение
        </button>
        <button onClick={() => onFavorite(task.id)} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '11px 18px', borderRadius: 999,
          background: isFav ? '#FFF9CC' : 'rgba(255,255,255,0.88)',
          border: `1px solid ${isFav ? '#F8EF8C' : 'rgba(0,0,0,0.09)'}`,
          outline: 'none',
          fontSize: 13, cursor: 'pointer', color: isFav ? '#7A6B00' : '#6F6F76', fontWeight: isFav ? 700 : 500,
        }}>
          <Bookmark size={14} fill={isFav ? 'currentColor' : 'none'} />
          {isFav ? 'В избранном' : 'В избранное'}
        </button>
      </div>

      {/* Solution block */}
      <AnimatePresence>
        {showSolution && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', background: palette.soft, borderRadius: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: palette.text }}>Правильный ответ</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0B0B0D' }}>{task.answer}</p>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: '#3A3A42', whiteSpace: 'pre-wrap' }}>{task.solution}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 2, borderTop: '1px solid rgba(0,0,0,0.04)' }}>
        <span style={{ fontSize: 11, color: '#B5B5BC', flex: 1 }}>{task.section} → {task.topic} · {task.source}</span>
        <button onClick={() => setReported(r => !r)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 8, background: 'none', border: 'none', fontSize: 11, color: reported ? '#C0187A' : '#B5B5BC', cursor: 'pointer' }}>
          <AlertTriangle size={10} />{reported ? 'Отправлено' : 'Ошибка'}
        </button>
        <button onClick={share} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 8, background: 'none', border: 'none', fontSize: 11, color: '#B5B5BC', cursor: 'pointer' }}>
          <Share2 size={10} />{copied ? 'Скопировано' : 'Поделиться'}
        </button>
      </div>
    </div>
  )
}

// ── Status tabs with floating glass pill ─────────────────────────────────────
const STATUS_OPTIONS: [StatusFilter, string][] = [
  ['all', 'Все'],
  ['undone', 'Не решённые'],
  ['done', 'Решённые'],
]

function StatusTabs({ value, onChange }: { value: StatusFilter; onChange: (v: StatusFilter) => void }) {
  const pill = useFloatingPill(value)
  return (
    <div
      ref={pill.containerRef}
      className="inline-flex items-center"
      style={{
        position: 'relative',
        gap: 0,
        padding: 3,
        borderRadius: 999,
        background: 'rgba(255,255,255,0.88)',
        border: '1px solid rgba(0,0,0,0.07)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {pill.pillRect && (
        <span
          style={{
            position: 'absolute',
            left: pill.pillRect.left,
            top: pill.pillRect.top,
            width: pill.pillRect.width,
            height: pill.pillRect.height,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid rgba(255,255,255,0.75)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}
      {STATUS_OPTIONS.map(([val, label]) => (
        <button
          key={val}
          ref={pill.registerItem(val)}
          onClick={() => onChange(val)}
          style={{
            position: 'relative', zIndex: 1,
            padding: '7px 14px', borderRadius: 999, border: 'none',
            background: 'transparent',
            color: value === val ? '#0B0B0D' : '#9A9AA2',
            fontSize: 12, fontWeight: value === val ? 700 : 500,
            cursor: 'pointer', whiteSpace: 'nowrap',
            transition: 'color 0.16s ease',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function TaskBankPage() {
  const setActivePage = useDashboard(s => s.setActivePage)
  const docked        = useDashboard(s => s.lessonScrolled)
  const activeSubjectId = useDashboard(s => s.activeSubjectId)

  const defaultSubject: Subject = activeSubjectId === 'chemistry' ? 'chemistry' : 'biology'
  const [subject, setSubject]   = useState<Subject>(defaultSubject)
  const [section, setSection]   = useState('')
  const [topic, setTopic]       = useState('')
  const [part, setPart]         = useState('')
  const [line, setLine]         = useState('')
  const [source, setSource]     = useState('')
  const [search, setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showFavOnly, setShowFavOnly]   = useState(false)
  const [favorites, setFavorites]       = useState<Set<number>>(new Set())
  const [answered, setAnswered] = useState<Map<number, { value: string; correct: boolean | null }>>(new Map())

  const palette      = subjectTheme(subject)
  const sections     = subject === 'biology' ? BIOLOGY_SECTIONS : CHEMISTRY_SECTIONS
  const topicsMap    = subject === 'biology' ? BIOLOGY_TOPICS : CHEMISTRY_TOPICS
  const topicOptions = section ? (topicsMap[section] ?? []) : Object.values(topicsMap).flat()
  const allLines     = useMemo(() => [...new Set(tasks.filter(t => t.subject === subject).map(t => t.line))].sort((a, b) => a - b).map(String), [subject])

  function toggleFav(id: number) {
    setFavorites(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function setAnswer(id: number, value: string, correct: boolean | null) {
    setAnswered(prev => new Map(prev).set(id, { value, correct }))
  }

  const filtered = useMemo(() => {
    let list = tasks.filter(t => t.subject === subject)
    if (section) list = list.filter(t => t.section === section)
    if (topic)   list = list.filter(t => t.topic === topic)
    if (part)    list = list.filter(t => t.part === Number(part))
    if (line)    list = list.filter(t => t.line === Number(line))
    if (source)  list = list.filter(t => t.source === source)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(t => t.question.toLowerCase().includes(q) || String(t.id).includes(q) || t.topic.toLowerCase().includes(q))
    }
    if (statusFilter === 'done')   list = list.filter(t => answered.get(t.id)?.correct === true)
    if (statusFilter === 'undone') list = list.filter(t => !answered.get(t.id))
    if (showFavOnly) list = list.filter(t => favorites.has(t.id))
    return [...list].sort((a, b) => a.id - b.id)
  }, [subject, section, topic, part, line, source, search, statusFilter, showFavOnly, answered, favorites])

  const doneCount  = tasks.filter(t => t.subject === subject && answered.get(t.id)?.correct).length
  const totalCount = tasks.filter(t => t.subject === subject).length
  const hasFilters = !!(section || topic || part || line || source)

  const dockGlass = {
    border: '1px solid rgba(255,255,255,0.9)',
    background: 'rgba(255,255,255,0.86)',
    backdropFilter: 'blur(14px) saturate(180%)',
    WebkitBackdropFilter: 'blur(14px) saturate(180%)',
    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.9), 0 6px 20px rgba(21,18,31,0.14)',
  } as const

  return (
    <div className="flex flex-col" style={{ gap: 16 }}>

      {/* Rest-state Back / title row — fades out when docked */}
      <motion.div
        className="flex items-center"
        style={{ gap: 16 }}
        animate={{ opacity: docked ? 0 : 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
          onClick={() => setActivePage('home')}
          className="flex items-center cursor-pointer flex-shrink-0"
          style={{ gap: 4, padding: '9px 16px 9px 12px', borderRadius: 999, border: '1px solid rgba(0,0,0,0.06)', background: 'rgba(255,255,255,0.96)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', color: '#0B0B0D', fontSize: 14, fontWeight: 600 }}
        >
          <ChevronLeft size={18} />Назад
        </motion.button>

        <h1
          className="flex-1 min-w-0 text-center"
          style={{ fontSize: 18, fontWeight: 700, color: '#0B0B0D', margin: 0 }}
        >
          Банк заданий ЕГЭ‑2026
        </h1>

        <div className="flex-shrink-0" style={{ width: 92 }} />
      </motion.div>

      {/* Docked twin — fixed on the topbar line, matches HomeworkFlow exactly */}
      <AnimatePresence>
        {docked && (
          <motion.div
            key="trainer-dock"
            className="flex items-center"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            style={{ position: 'fixed', top: 30, left: 32, right: 32, zIndex: 80, gap: 12, pointerEvents: 'none' }}
          >
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
              onClick={() => setActivePage('home')}
              className="flex items-center cursor-pointer flex-shrink-0"
              style={{ gap: 4, padding: '9px 16px 9px 12px', borderRadius: 999, ...dockGlass, color: '#0B0B0D', fontSize: 14, fontWeight: 600, pointerEvents: 'auto' }}
            >
              <ChevronLeft size={18} />Назад
            </motion.button>

            <div
              className="min-w-0 flex items-center"
              style={{ fontSize: 14, fontWeight: 700, color: '#0B0B0D', flexShrink: 1, padding: '9px 16px', borderRadius: 999, ...dockGlass, pointerEvents: 'auto' }}
            >
              <span className="truncate">Банк заданий · {subject === 'biology' ? 'Биология' : 'Химия'}</span>
            </div>

            <div style={{ flexGrow: 1, flexBasis: 0 }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Two-column card — exact same as HomeworkFlow ── */}
      <div
        className="grid grid-cols-1 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] items-stretch"
        style={{
          borderRadius: 32,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,248,250,0.98))',
          border: '1px solid rgba(255,255,255,0.62)',
          boxShadow: '0 24px 80px rgba(17,12,34,0.12)',
          overflow: 'hidden',
        }}
      >
        {/* Left sidebar */}
        <aside className="flex flex-col" style={{ padding: 16, gap: 16, borderRight: '1px solid rgba(0,0,0,0.06)', background: 'linear-gradient(180deg, rgba(250,250,252,0.98), rgba(245,245,247,0.98))' }}>

          {/* Subject gradient card — clicking it toggles between biology and chemistry */}
          <div
            onClick={() => { setSubject(subject === 'biology' ? 'chemistry' : 'biology'); setSection(''); setTopic('') }}
            style={{ padding: 16, borderRadius: 16, background: `linear-gradient(135deg, ${palette.accent}, ${palette.text})`, color: '#fff', boxShadow: `0 18px 44px ${palette.ring}`, cursor: 'pointer' }}
          >
            <div className="flex items-center" style={{ gap: 8, marginBottom: 10 }}>
              <BookOpen size={16} />
              <span style={{ fontSize: 12, fontWeight: 700 }}>Тренажёр ЕГЭ</span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {(['biology', 'chemistry'] as Subject[]).map(s => (
                <button key={s} onClick={e => { e.stopPropagation(); setSubject(s); setSection(''); setTopic('') }}
                  style={{
                    padding: '6px 12px', borderRadius: 999, border: '1.5px solid',
                    borderColor: subject === s ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
                    background: subject === s ? 'rgba(255,255,255,0.22)' : 'transparent',
                    color: 'white', fontSize: 12, fontWeight: subject === s ? 700 : 500, cursor: 'pointer',
                  }}>
                  {s === 'biology' ? 'Биология' : 'Химия'}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.45, color: 'rgba(255,255,255,0.88)' }}>
              Отработай все линии заданий и подготовься к экзамену.
            </p>
          </div>

          {/* Filters card */}
          <div className="flex flex-col" style={{ padding: 16, borderRadius: 16, background: 'rgba(255,255,255,0.94)', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 8px 24px rgba(0,0,0,0.05)', gap: 12 }}>
            <div className="flex items-center" style={{ gap: 7 }}>
              <Filter size={15} style={{ color: palette.text }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0B0B0D' }}>Фильтры</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <FilterField label="Раздел"   options={sections}     value={section} onChange={v => { setSection(v); setTopic('') }} accent={palette.accent} />
              <FilterField label="Тема"     options={topicOptions} value={topic}   onChange={setTopic} accent={palette.accent} />
              <FilterField label="Часть"    options={['1', '2']}   value={part}    onChange={setPart} accent={palette.accent} />
              <FilterField label="Линия"    options={allLines}     value={line}    onChange={setLine} accent={palette.accent} />
              <FilterField label="Источник" options={SOURCES}      value={source}  onChange={setSource} accent={palette.accent} />
            </div>
            {hasFilters && (
              <button onClick={() => { setSection(''); setTopic(''); setPart(''); setLine(''); setSource('') }}
                style={{ padding: '8px 0', borderRadius: 12, background: '#FFE1E4', border: 'none', fontSize: 12, color: '#B03040', cursor: 'pointer', fontWeight: 600 }}>
                Сбросить фильтры
              </button>
            )}
          </div>

          {/* Progress card */}
          <div className="flex flex-col" style={{ padding: 16, borderRadius: 16, background: 'rgba(255,255,255,0.94)', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 8px 24px rgba(0,0,0,0.05)', gap: 12 }}>
            <div className="flex items-center" style={{ gap: 7 }}>
              <Target size={15} style={{ color: palette.text }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0B0B0D' }}>Прогресс</span>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#6F6F76' }}>Решено верно</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0B0B0D' }}>{doneCount} / {totalCount}</span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: '#EBEBEF', overflow: 'hidden' }}>
                <motion.div animate={{ width: `${totalCount ? (doneCount / totalCount) * 100 : 0}%` }} transition={{ duration: 0.4 }}
                  style={{ height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${palette.accent}, ${palette.text})` }} />
              </div>
            </div>
            {[['В избранном', `${favorites.size}`], ['Показано', `${filtered.length}`]].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#6F6F76' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0B0B0D' }}>{val}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Right: search bar + tasks */}
        <main className="flex flex-col" style={{ padding: 24, gap: 18, background: 'radial-gradient(circle at top right, rgba(197,139,255,0.07), transparent 28%), #F8F8FA' }}>

          {/* Controls row */}
          <div className="flex items-center flex-wrap" style={{ gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: 'rgba(255,255,255,0.96)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 999, flex: '1 1 180px', maxWidth: 360, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <Search size={14} style={{ color: '#9A9AA2', flexShrink: 0 }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по тексту или №..."
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, background: 'transparent', color: '#0B0B0D' }} />
              {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9A9AA2', fontSize: 15, lineHeight: 1 }}>×</button>}
            </div>
            <StatusTabs value={statusFilter} onChange={setStatusFilter} />
            <button onClick={() => setShowFavOnly(f => !f)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '10px 14px', borderRadius: 999, background: showFavOnly ? '#FFF9CC' : 'rgba(255,255,255,0.9)', border: `1px solid ${showFavOnly ? '#F8EF8C' : 'rgba(0,0,0,0.08)'}`, fontSize: 12, cursor: 'pointer', color: showFavOnly ? '#7A6B00' : '#9A9AA2', fontWeight: showFavOnly ? 700 : 400 }}>
              <Bookmark size={13} fill={showFavOnly ? 'currentColor' : 'none'} />
              {showFavOnly ? `Избранное (${favorites.size})` : 'Избранное'}
            </button>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9A9AA2' }}>
              Всего: <strong style={{ color: '#0B0B0D' }}>{filtered.length}</strong>
            </span>
          </div>

          {/* Tasks */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#9A9AA2', fontSize: 14 }}>
              Заданий не найдено — измените фильтры
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: 12 }}>
              {filtered.map((task, i) => (
                <TaskCard key={task.id} task={task} index={i} palette={palette}
                  favorites={favorites} onFavorite={toggleFav}
                  answered={answered} onAnswer={setAnswer}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
