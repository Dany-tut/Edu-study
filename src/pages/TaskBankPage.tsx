import { useState, useMemo, useRef, useEffect, type ReactNode } from 'react'
import { useFloatingPill } from '../lib/useFloatingPill'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, Search, BookOpen, CheckCircle2, XCircle,
  Bookmark, Share2, AlertTriangle, Eye, Target, Filter,
  LayoutGrid, List, ArrowUpDown,
} from 'lucide-react'
import {
  Task, Subject, CHEMISTRY_LINES, BIOLOGY_LINES,
} from '../data/taskBankData'
import { useTaskBank } from '../store/taskBankStore'
import { useDashboard } from '../store/dashboardStore'
import { subjectTheme, PURPLE } from '../lib/theme'

type StatusFilter = 'all' | 'done' | 'undone'
type SortMode = 'newest' | 'oldest' | 'subject' | 'line'
type ViewMode = 'list' | 'grid'

const SORT_OPTIONS: [SortMode, string][] = [
  ['newest', 'Новые'],
  ['oldest', 'Старые'],
  ['subject', 'По предмету'],
  ['line', 'По линии'],
]

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
        background: 'linear-gradient(to bottom, var(--color-bg), transparent)',
        opacity: edges.top ? 1 : 0, transition: 'opacity 0.18s ease',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 22, pointerEvents: 'none',
        background: 'linear-gradient(to top, var(--color-bg), transparent)',
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
        background: 'var(--color-bg-input)',
        border: `1px solid ${open ? accent : value ? 'var(--color-border)' : 'var(--color-border-soft)'}`,
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
            color: value && !open ? 'var(--color-text)' : 'var(--color-muted)',
          }}
        />
        {value && !open ? (
          <button onMouseDown={e => { e.preventDefault(); onChange('') }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', fontSize: 16, lineHeight: 1, padding: 0 }}>
            ×
          </button>
        ) : (
          <svg width="11" height="11" viewBox="0 0 10 10" fill="none" style={{ color: 'var(--color-text-3)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}>
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
            background: 'rgba(var(--glass-rgb), 0.9)',
            backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid var(--color-border-glass)', borderRadius: 13,
            boxShadow: '0 14px 36px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.07)', overflow: 'hidden',
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
                  style={{ width: '100%', padding: '8px 8px', borderRadius: 9, textAlign: 'left', background: 'transparent', border: 'none', fontSize: 12, color: 'var(--color-text-3)', cursor: 'pointer', transition: 'background 0.13s ease' }}>
                  — Сбросить
                </button>
              )}
              {shown.length === 0 ? (
                <div style={{ padding: '10px 8px', fontSize: 12, color: 'var(--color-text-5)' }}>Ничего не найдено</div>
              ) : shown.map(opt => {
                const rest = opt === value ? `${accent}14` : 'transparent'
                return (
                  <button key={opt} onMouseDown={e => { e.preventDefault(); onChange(opt); setOpen(false) }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${accent}1f` }}
                    onMouseLeave={e => { e.currentTarget.style.background = rest }}
                    style={{ width: '100%', padding: '9px 8px', borderRadius: 9, textAlign: 'left', background: rest, border: 'none', fontSize: 12.5, cursor: 'pointer', color: 'var(--color-text)', fontWeight: opt === value ? 700 : 400, transition: 'background 0.13s ease' }}>
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

// ── Copyable №-badge ─────────────────────────────────────────────────────────
function NumberBadge({ id, onCopied }: { id: number; onCopied: () => void }) {
  const [tipped, setTipped] = useState(false)
  function copy(e: React.MouseEvent) {
    e.stopPropagation()
    navigator.clipboard.writeText(`№${id}`)
    setTipped(true)
    onCopied()
    setTimeout(() => setTipped(false), 1400)
  }
  return (
    <span
      onClick={copy}
      title="Скопировать номер"
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
    >
      <span style={{ padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'var(--color-red-soft)', color: '#B03040', transition: 'background 0.15s ease' }}>
        №{id}
      </span>
      <AnimatePresence>
        {tipped && (
          <motion.span
            key="tip"
            initial={{ opacity: 0, scale: 0.78, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.78, y: 4 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
              pointerEvents: 'none', zIndex: 999,
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px 5px 7px',
              borderRadius: 999,
              background: 'rgba(var(--glass-rgb), 0.22)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              border: '1px solid var(--color-border-glass)',
              boxShadow: '0 4px 18px rgba(42,125,79,0.18), 0 1px 4px rgba(0,0,0,0.08)',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{
              width: 18, height: 18, borderRadius: '50%',
              background: 'linear-gradient(135deg, #34C877 0%, #2A7D4F 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(42,125,79,0.35)',
            }}>
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                <path d="M1.5 4.5l2.2 2.2 3.3-3.7" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#1a2a20', letterSpacing: 0.1 }}>Скопировано</span>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}

// ── Task card — same visual language as HomeworkFlow questions ───────────────
function TaskCard({ task, index, palette, favorites, onFavorite, answered, onAnswer, onCopyId, lineNames }: {
  task: Task; index: number; palette: ReturnType<typeof subjectTheme>
  lineNames: Record<number, string>
  favorites: Set<number>; onFavorite: (id: number) => void
  answered: Map<number, { value: string; correct: boolean | null }>
  onAnswer: (id: number, value: string, correct: boolean | null) => void
  onCopyId: () => void
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
        background: 'rgba(var(--glass-rgb), 0.96)',
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
            <NumberBadge id={task.id} onCopied={onCopyId} />
            <span style={{ padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: palette.soft, color: palette.text }}>
              {task.line} · {lineNames[task.line] ?? `Линия ${task.line}`}
            </span>
            <span style={{ padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: 'rgba(0,0,0,0.05)', color: 'var(--color-muted)' }}>Часть {task.part}</span>
          </div>
          <p style={{ fontSize: 16, lineHeight: 1.45, fontWeight: 650, color: 'var(--color-text)', whiteSpace: 'pre-wrap' }}>
            {task.question}
          </p>
        </div>
        {state !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 14, background: isCorrect ? 'var(--color-green-soft)' : 'var(--color-red-soft)', color: isCorrect ? '#2A7D4F' : '#A8282D', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
            {isCorrect ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
            {isCorrect ? 'Верно' : 'Неверно'}
          </div>
        )}
      </div>

      {/* Table */}
      {task.questionTable && (
        <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--color-border-medium)', alignSelf: 'flex-start', maxWidth: '100%' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%' }}>
            <thead>
              <tr>{task.questionTable.headers.map(h => (
                <th key={h} style={{ borderBottom: '1px solid var(--color-border-medium)', borderRight: '1px solid var(--color-border-medium)', padding: '9px 16px', fontWeight: 700, background: 'rgba(0,0,0,0.03)', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {task.questionTable.rows.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 1 ? 'rgba(0,0,0,0.015)' : 'transparent' }}>{row.map((cell, j) => (
                  <td key={j} style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : undefined, borderRight: '1px solid var(--color-border)', padding: '9px 16px' }}>{cell}</td>
                ))}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Image block */}
      {task.questionImage && (
        <img src={task.questionImage} alt="" style={{ maxWidth: '100%', borderRadius: 14, border: '1px solid var(--color-border-medium)', alignSelf: 'flex-start' }} />
      )}

      {/* Choice options */}
      {task.choices && task.choices.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {task.choices.map((c, i) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 12, background: 'rgba(0,0,0,0.025)', border: '1px solid var(--color-border-soft)' }}>
              <span style={{ width: 24, height: 24, borderRadius: task.answerType === 'multi' ? 7 : '50%', flexShrink: 0, background: 'var(--color-bg-input)', border: '1px solid rgba(0,0,0,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--color-muted)' }}>{'АБВГДЕЖЗИК'[i]}</span>
              <span style={{ fontSize: 14, color: 'var(--color-text)' }}>{c.text}</span>
            </div>
          ))}
          <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{task.answerType === 'multi' ? 'Введите буквы всех верных вариантов, напр. АБГ' : 'Введите букву верного варианта'}</div>
        </div>
      )}

      {/* Matching */}
      {task.matchLeft && task.matchRight && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {task.matchLeft.map((l, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, background: 'rgba(0,0,0,0.025)', border: '1px solid var(--color-border-soft)', fontSize: 13 }}>
                  <b style={{ color: palette.text }}>{'АБВГДЕЖЗИК'[i]}</b> {l}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {task.matchRight.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, background: 'rgba(0,0,0,0.025)', border: '1px solid var(--color-border-soft)', fontSize: 13 }}>
                  <b style={{ color: palette.text }}>{i + 1}</b> {r}
                </div>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 6 }}>Сопоставьте и введите, напр. А2 Б1 В3</div>
        </div>
      )}

      {/* Sequence */}
      {task.sequenceItems && task.sequenceItems.length > 0 && (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[...task.sequenceItems].sort((a, b) => a.localeCompare(b, 'ru')).map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, background: 'rgba(0,0,0,0.025)', border: '1px solid var(--color-border-soft)', fontSize: 13 }}>
                <b style={{ color: palette.text }}>{i + 1}</b> {s}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 6 }}>Введите порядок цифрами, напр. 3142</div>
        </div>
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
              border: `1px solid ${state ? (isCorrect ? '#6EE7A0' : '#F48B91') : 'var(--color-border-medium)'}`,
              background: state ? (isCorrect ? 'var(--color-green-soft)' : 'var(--color-red-soft)') : 'var(--color-bg-input)',
            }}
          />
          <div style={{
            position: 'absolute', left: 1, top: 1, bottom: 1, width: 32,
            borderRadius: '15px 0 0 15px', pointerEvents: 'none',
            background: `linear-gradient(to right, ${state ? (isCorrect ? 'var(--color-green-soft)' : 'var(--color-red-soft)') : 'var(--color-bg-input)'}, transparent)`,
            opacity: inputVal ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }} />
          <div style={{
            position: 'absolute', right: 1, top: 1, bottom: 1, width: 32,
            borderRadius: '0 15px 15px 0', pointerEvents: 'none',
            background: `linear-gradient(to left, ${state ? (isCorrect ? 'var(--color-green-soft)' : 'var(--color-red-soft)') : 'var(--color-bg-input)'}, transparent)`,
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
          background: inputVal.trim() ? palette.accent : 'var(--color-bg-5)',
          color: inputVal.trim() ? palette.onAccent : 'var(--color-text-3)',
          border: 'none', outline: 'none', fontSize: 13, fontWeight: 700, cursor: inputVal.trim() ? 'pointer' : 'default',
          boxShadow: inputVal.trim() ? `0 8px 20px ${palette.ring}` : 'none',
          transition: 'all 0.18s ease',
        }}>
          <CheckCircle2 size={14} />Проверить
        </button>
        <button onClick={() => setShowSolution(s => !s)} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '11px 18px', borderRadius: 999,
          background: showSolution ? palette.soft : 'rgba(var(--glass-rgb), 0.88)',
          border: `1px solid ${showSolution ? palette.accent : 'rgba(0,0,0,0.09)'}`,
          outline: 'none',
          fontSize: 13, cursor: 'pointer', color: showSolution ? palette.text : 'var(--color-muted)', fontWeight: showSolution ? 700 : 500,
        }}>
          <Eye size={14} />Решение
        </button>
        <button onClick={() => onFavorite(task.id)} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '11px 18px', borderRadius: 999,
          background: isFav ? 'var(--color-yellow-soft)' : 'rgba(var(--glass-rgb), 0.88)',
          border: `1px solid ${isFav ? '#F8EF8C' : 'rgba(0,0,0,0.09)'}`,
          outline: 'none',
          fontSize: 13, cursor: 'pointer', color: isFav ? '#7A6B00' : 'var(--color-muted)', fontWeight: isFav ? 700 : 500,
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
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{task.answer}</p>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-2)', whiteSpace: 'pre-wrap' }}>{task.solution}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 2, borderTop: '1px solid rgba(0,0,0,0.04)' }}>
        <span style={{ fontSize: 11, color: 'var(--color-text-5)', flex: 1 }}>{task.section} → {task.topic} · {task.source}</span>
        <button onClick={() => setReported(r => !r)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 8, background: 'none', border: 'none', fontSize: 11, color: reported ? '#C0187A' : 'var(--color-text-5)', cursor: 'pointer' }}>
          <AlertTriangle size={10} />{reported ? 'Отправлено' : 'Ошибка'}
        </button>
        <button onClick={share} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 8, background: 'none', border: 'none', fontSize: 11, color: 'var(--color-text-5)', cursor: 'pointer' }}>
          <Share2 size={10} />{copied ? 'Скопировано' : 'Поделиться'}
        </button>
      </div>
    </div>
  )
}

// ── Compact card — fits 4 per row ────────────────────────────────────────────
function CompactCard({ task, palette, favorites, onFavorite, answered, onAnswer, onCopyId, lineNames }: {
  task: Task; palette: ReturnType<typeof subjectTheme>
  lineNames: Record<number, string>
  favorites: Set<number>; onFavorite: (id: number) => void
  answered: Map<number, { value: string; correct: boolean | null }>
  onAnswer: (id: number, value: string, correct: boolean | null) => void
  onCopyId: () => void
}) {
  const [inputVal, setInputVal] = useState(answered.get(task.id)?.value ?? '')
  const [showSolution, setShowSolution] = useState(false)
  const state = answered.get(task.id)
  const isFav = favorites.has(task.id)
  const isCorrect = state?.correct === true
  const isWrong   = state?.correct === false

  function check() {
    onAnswer(task.id, inputVal, inputVal.trim().toLowerCase() === task.answer.toLowerCase())
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 10, padding: 14, borderRadius: 18,
      background: 'rgba(var(--glass-rgb), 0.97)',
      border: `1px solid ${isCorrect ? 'rgba(110,231,160,0.5)' : isWrong ? 'rgba(244,139,145,0.45)' : 'rgba(0,0,0,0.07)'}`,
      boxShadow: isCorrect ? '0 6px 18px rgba(110,231,160,0.1)' : isWrong ? '0 6px 18px rgba(244,139,145,0.08)' : '0 4px 14px rgba(0,0,0,0.04)',
      height: '100%', boxSizing: 'border-box',
    }}>
      {/* Badge row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
        <NumberBadge id={task.id} onCopied={onCopyId} />
        <span style={{ padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: palette.soft, color: palette.text }}>
          {task.line}
        </span>
      </div>

      {/* Question */}
      <p style={{ fontSize: 13, lineHeight: 1.4, fontWeight: 600, color: 'var(--color-text)', margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {task.question}
      </p>

      {/* Topic */}
      <span style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 'auto' }}>{task.topic}</span>

      {/* Answer row */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && inputVal.trim() && check()}
          placeholder="Ответ"
          style={{
            flex: 1, minWidth: 0, padding: '7px 10px', borderRadius: 10, fontSize: 12, outline: 'none',
            border: `1px solid ${state ? (isCorrect ? '#6EE7A0' : '#F48B91') : 'var(--color-border-medium)'}`,
            background: state ? (isCorrect ? 'var(--color-green-soft)' : 'var(--color-red-soft)') : 'var(--color-bg-input)',
          }}
        />
        <button onClick={check} disabled={!inputVal.trim()} style={{
          padding: '7px 10px', borderRadius: 10, border: 'none', fontSize: 12, fontWeight: 700,
          background: inputVal.trim() ? palette.accent : 'var(--color-bg-5)',
          color: inputVal.trim() ? palette.onAccent : 'var(--color-text-3)',
          cursor: inputVal.trim() ? 'pointer' : 'default', flexShrink: 0,
        }}>✓</button>
        <button onClick={() => setShowSolution(s => !s)} style={{
          padding: '7px 8px', borderRadius: 10, border: `1px solid ${showSolution ? palette.accent : 'rgba(0,0,0,0.09)'}`,
          background: showSolution ? palette.soft : 'transparent', cursor: 'pointer', flexShrink: 0,
        }}><Eye size={12} color={showSolution ? palette.text : 'var(--color-text-3)'} /></button>
        <button onClick={() => onFavorite(task.id)} style={{
          padding: '7px 8px', borderRadius: 10, border: `1px solid ${isFav ? '#F8EF8C' : 'rgba(0,0,0,0.09)'}`,
          background: isFav ? 'var(--color-yellow-soft)' : 'transparent', cursor: 'pointer', flexShrink: 0,
        }}><Bookmark size={12} color={isFav ? '#7A6B00' : 'var(--color-text-3)'} fill={isFav ? '#7A6B00' : 'none'} /></button>
      </div>

      {/* Solution */}
      <AnimatePresence>
        {showSolution && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '10px 12px', background: palette.soft, borderRadius: 12, fontSize: 12, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
              <strong style={{ color: palette.text }}>Ответ: </strong>{task.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Sort dropdown ─────────────────────────────────────────────────────────────
function SortDropdown({ value, onChange }: { value: SortMode; onChange: (v: SortMode) => void }) {
  const [open, setOpen] = useState(false)
  const label = SORT_OPTIONS.find(([v]) => v === value)?.[1] ?? 'Новые'
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '9px 13px', borderRadius: 999,
          background: open ? 'rgba(var(--glass-rgb), 0.98)' : 'rgba(var(--glass-rgb), 0.9)',
          border: `1px solid ${open ? 'rgba(0,0,0,0.14)' : 'rgba(0,0,0,0.08)'}`,
          boxShadow: open ? '0 0 0 3px rgba(0,0,0,0.05)' : 'none',
          fontSize: 12, fontWeight: 600, color: 'var(--color-text)', cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        <ArrowUpDown size={12} style={{ color: 'var(--color-text-3)' }} />
        {label}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: 'var(--color-text-3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.12 }}
          style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 6, zIndex: 50, minWidth: 150,
            background: 'rgba(var(--glass-rgb), 0.96)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid var(--color-border-glass)', borderRadius: 14,
            boxShadow: '0 12px 32px rgba(0,0,0,0.12)', overflow: 'hidden', padding: 5,
          }}
        >
          {SORT_OPTIONS.map(([val, label]) => (
            <button
              key={val}
              onMouseDown={e => { e.preventDefault(); onChange(val); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                width: '100%', padding: '9px 10px', borderRadius: 9, border: 'none',
                background: value === val ? 'rgba(0,0,0,0.05)' : 'transparent',
                fontSize: 13, fontWeight: value === val ? 700 : 400, color: 'var(--color-text)',
                cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)' }}
              onMouseLeave={e => { e.currentTarget.style.background = value === val ? 'rgba(0,0,0,0.05)' : 'transparent' }}
            >
              {label}
              {value === val && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#0B0B0D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </button>
          ))}
        </motion.div>
      )}
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
        background: 'rgba(var(--glass-rgb), 0.88)',
        border: '1px solid var(--color-border)',
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
            background: 'rgba(var(--glass-rgb), 0.82)',
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid var(--color-border-glass)',
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
            color: value === val ? 'var(--color-text)' : 'var(--color-text-3)',
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
  const tasks         = useTaskBank(s => s.tasks)
  const loadTasks     = useTaskBank(s => s.load)
  useEffect(() => { loadTasks(true) }, [])

  const defaultSubject: Subject = activeSubjectId === 'chemistry' ? 'chemistry' : 'biology'
  const [subject, setSubject]   = useState<Subject>(defaultSubject)
  const [section, setSection]   = useState('')
  const [topic, setTopic]       = useState('')
  const [part, setPart]         = useState('')
  const [line, setLine]         = useState('')
  const [source, setSource]     = useState('')
  const [search, setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortMode, setSortMode]         = useState<SortMode>('newest')
  const [viewMode, setViewMode]         = useState<ViewMode>('list')
  const [showFavOnly, setShowFavOnly]   = useState(false)
  const [favorites, setFavorites]       = useState<Set<number>>(new Set())
  const [answered, setAnswered] = useState<Map<number, { value: string; correct: boolean | null }>>(new Map())
  const [savedPill, setSavedPill] = useState(false)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleCopyId() {
    setSavedPill(true)
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSavedPill(false), 1800)
  }

  const palette      = subjectTheme(subject)
  const lineNames    = subject === 'chemistry' ? CHEMISTRY_LINES : BIOLOGY_LINES
  const subjectTasks = useMemo(() => tasks.filter(t => t.subject === subject), [tasks, subject])
  const sections     = useMemo(() => [...new Set(subjectTasks.map(t => t.section).filter(Boolean))].sort(), [subjectTasks])
  const topicOptions = useMemo(() => {
    const src = section ? subjectTasks.filter(t => t.section === section) : subjectTasks
    return [...new Set(src.map(t => t.topic).filter(Boolean))].sort()
  }, [subjectTasks, section])
  const allLines     = useMemo(() => [...new Set(subjectTasks.map(t => t.line))].sort((a, b) => a - b).map(n => `${n} · ${lineNames[n] ?? `Линия ${n}`}`), [subjectTasks, lineNames])
  const allSources   = useMemo(() => [...new Set(tasks.map(t => t.source).filter(Boolean))].sort(), [tasks])

  function toggleFav(id: number) {
    setFavorites(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function setAnswer(id: number, value: string, correct: boolean | null) {
    setAnswered(prev => new Map(prev).set(id, { value, correct }))
  }

  const filtered = useMemo(() => {
    // When searching, go global (all subjects); otherwise stay on the active tab
    let list = search
      ? tasks
      : tasks.filter(t => t.subject === subject)
    if (!search && section) list = list.filter(t => t.section === section)
    if (!search && topic)   list = list.filter(t => t.topic === topic)
    if (!search && part)    list = list.filter(t => t.part === Number(part))
    if (!search && line)    list = list.filter(t => t.line === Number(line.split(' · ')[0]))
    if (!search && source)  list = list.filter(t => t.source === source)
    if (search) {
      const q = search.toLowerCase().replace(/^№/, '')
      list = list.filter(t => t.question.toLowerCase().includes(q) || String(t.id).includes(q) || t.topic.toLowerCase().includes(q))
    }
    if (statusFilter === 'done')   list = list.filter(t => answered.get(t.id)?.correct === true)
    if (statusFilter === 'undone') list = list.filter(t => !answered.get(t.id))
    if (showFavOnly) list = list.filter(t => favorites.has(t.id))
    return [...list].sort((a, b) => {
      switch (sortMode) {
        case 'oldest':     return a.id - b.id
        case 'subject':    return a.subject.localeCompare(b.subject) || a.id - b.id
        case 'line':       return a.line - b.line || a.id - b.id
        default:           return b.id - a.id  // newest
      }
    })
  }, [tasks, subject, section, topic, part, line, source, search, statusFilter, showFavOnly, answered, favorites, sortMode])

  // Auto-switch subject tab when search results all belong to one subject
  useEffect(() => {
    if (!search || filtered.length === 0) return
    const subjects = new Set(filtered.map(t => t.subject))
    if (subjects.size === 1) {
      const only = [...subjects][0] as Subject
      if (only !== subject) { setSubject(only); setSection(''); setTopic('') }
    }
  }, [search, filtered])

  const doneCount  = tasks.filter(t => t.subject === subject && answered.get(t.id)?.correct).length
  const totalCount = tasks.filter(t => t.subject === subject).length
  const hasFilters = !!(section || topic || part || line || source)

  const dockGlass = {
    border: '1px solid var(--color-border-glass)',
    background: 'rgba(var(--glass-rgb), 0.86)',
    backdropFilter: 'blur(14px) saturate(180%)',
    WebkitBackdropFilter: 'blur(14px) saturate(180%)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 8px 28px rgba(21,18,31,0.26), 0 2px 8px rgba(21,18,31,0.10)',
  } as const

  return (
    <div className="flex flex-col" style={{ gap: 16 }}>

      {/* Glass pill "Сохранено" */}
      <AnimatePresence>
        {savedPill && (
          <motion.div
            key="saved-pill"
            initial={{ opacity: 0, y: 16, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.92 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
              zIndex: 9999, pointerEvents: 'none',
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 999,
              background: 'rgba(var(--glass-rgb), 0.88)',
              backdropFilter: 'blur(24px) saturate(200%)',
              WebkitBackdropFilter: 'blur(24px) saturate(200%)',
              border: '1px solid var(--color-border-glass)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
          >
            <span style={{
              width: 20, height: 20, borderRadius: '50%', background: '#2A7D4F',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: '0 3px 10px rgba(42,125,79,0.35)',
            }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2.5 2.5 3.5-4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap' }}>Сохранено в буфере</span>
          </motion.div>
        )}
      </AnimatePresence>

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
          style={{ gap: 4, padding: '9px 16px 9px 12px', borderRadius: 999, border: '1px solid var(--color-border-soft)', background: 'rgba(var(--glass-rgb), 0.96)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', color: 'var(--color-text)', fontSize: 14, fontWeight: 600 }}
        >
          <ChevronLeft size={18} />Назад
        </motion.button>

        <h1
          className="flex-1 min-w-0 text-center"
          style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}
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
              style={{ gap: 4, padding: '9px 16px 9px 12px', borderRadius: 999, ...dockGlass, color: 'var(--color-text)', fontSize: 14, fontWeight: 600, pointerEvents: 'auto' }}
            >
              <ChevronLeft size={18} />Назад
            </motion.button>

            <div
              className="min-w-0 flex items-center"
              style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', flexShrink: 1, padding: '9px 16px', borderRadius: 999, ...dockGlass, pointerEvents: 'auto' }}
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
          background: 'rgba(var(--glass-rgb), 0.98)',
          border: '1px solid var(--color-border-glass)',
          boxShadow: '0 24px 80px rgba(17,12,34,0.12)',
          overflow: 'hidden',
        }}
      >
        {/* Left sidebar */}
        <aside className="flex flex-col" style={{ padding: 16, gap: 16, borderRight: '1px solid var(--color-border-soft)', background: 'var(--color-bg-2)' }}>

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
                    borderColor: subject === s ? 'var(--color-border-glass)' : 'var(--color-border-medium)',
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
          <div className="flex flex-col" style={{ padding: 16, borderRadius: 16, background: 'rgba(var(--glass-rgb), 0.94)', border: '1px solid var(--color-border-soft)', boxShadow: '0 8px 24px rgba(0,0,0,0.05)', gap: 12 }}>
            <div className="flex items-center" style={{ gap: 7 }}>
              <Filter size={15} style={{ color: palette.text }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Фильтры</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <FilterField label="Раздел"   options={sections}     value={section} onChange={v => { setSection(v); setTopic('') }} accent={palette.accent} />
              <FilterField label="Тема"     options={topicOptions} value={topic}   onChange={setTopic} accent={palette.accent} />
              <FilterField label="Часть"    options={['1', '2']}   value={part}    onChange={setPart} accent={palette.accent} />
              <FilterField label="Линия"    options={allLines}     value={line}    onChange={setLine} accent={palette.accent} />
              <FilterField label="Источник" options={allSources}  value={source}  onChange={setSource} accent={palette.accent} />
            </div>
            {hasFilters && (
              <button onClick={() => { setSection(''); setTopic(''); setPart(''); setLine(''); setSource('') }}
                style={{ padding: '8px 0', borderRadius: 12, background: 'var(--color-red-soft)', border: 'none', fontSize: 12, color: '#B03040', cursor: 'pointer', fontWeight: 600 }}>
                Сбросить фильтры
              </button>
            )}
          </div>

          {/* Progress card */}
          <div className="flex flex-col" style={{ padding: 16, borderRadius: 16, background: 'rgba(var(--glass-rgb), 0.94)', border: '1px solid var(--color-border-soft)', boxShadow: '0 8px 24px rgba(0,0,0,0.05)', gap: 12 }}>
            <div className="flex items-center" style={{ gap: 7 }}>
              <Target size={15} style={{ color: palette.text }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Прогресс</span>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>Решено верно</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>{doneCount} / {totalCount}</span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: 'var(--color-bg-5)', overflow: 'hidden' }}>
                <motion.div animate={{ width: `${totalCount ? (doneCount / totalCount) * 100 : 0}%` }} transition={{ duration: 0.4 }}
                  style={{ height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${palette.accent}, ${palette.text})` }} />
              </div>
            </div>
            {[['В избранном', `${favorites.size}`], ['Показано', `${filtered.length}`]].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{val}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Right: search bar + tasks */}
        <main className="flex flex-col" style={{ padding: 24, gap: 18, background: 'radial-gradient(circle at top right, rgba(197,139,255,0.07), transparent 28%), var(--color-bg)' }}>

          {/* Controls row */}
          <div className="flex items-center flex-wrap" style={{ gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: 'rgba(var(--glass-rgb), 0.96)', border: '1px solid var(--color-border-medium)', borderRadius: 999, flex: '1 1 180px', maxWidth: 320, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <Search size={14} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по тексту или №..."
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, background: 'transparent', color: 'var(--color-text)' }} />
              {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', fontSize: 15, lineHeight: 1 }}>×</button>}
            </div>
            <StatusTabs value={statusFilter} onChange={setStatusFilter} />

            {/* Sort dropdown */}
            <SortDropdown value={sortMode} onChange={setSortMode} />

            <button onClick={() => setShowFavOnly(f => !f)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '10px 14px', borderRadius: 999, background: showFavOnly ? 'var(--color-yellow-soft)' : 'rgba(255,255,255,0.9)', border: `1px solid ${showFavOnly ? '#F8EF8C' : 'rgba(0,0,0,0.08)'}`, fontSize: 12, cursor: 'pointer', color: showFavOnly ? '#7A6B00' : 'var(--color-text-3)', fontWeight: showFavOnly ? 700 : 400 }}>
              <Bookmark size={13} fill={showFavOnly ? 'currentColor' : 'none'} />
              {showFavOnly ? `Избранное (${favorites.size})` : 'Избранное'}
            </button>


            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-3)' }}>
              Всего: <strong style={{ color: 'var(--color-text)' }}>{filtered.length}</strong>
            </span>

            {/* View-mode toggle */}
            <div style={{ display: 'flex', borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden', flexShrink: 0 }}>
              {(['list', 'grid'] as ViewMode[]).map(mode => (
                <button key={mode} onClick={() => setViewMode(mode)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 34, height: 34, border: 'none', cursor: 'pointer',
                  background: viewMode === mode ? palette.soft : 'rgba(var(--glass-rgb), 0.9)',
                  color: viewMode === mode ? palette.text : 'var(--color-text-3)',
                  transition: 'all 0.15s ease',
                }}>
                  {mode === 'list' ? <List size={14} /> : <LayoutGrid size={14} />}
                </button>
              ))}
            </div>
          </div>

          {/* Tasks */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-3)', fontSize: 14 }}>
              Заданий не найдено — измените фильтры
            </div>
          ) : viewMode === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {filtered.map(task => (
                <CompactCard key={task.id} task={task} palette={palette}
                  favorites={favorites} onFavorite={toggleFav}
                  answered={answered} onAnswer={setAnswer}
                  onCopyId={handleCopyId} lineNames={lineNames}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: 12 }}>
              {filtered.map((task, i) => (
                <TaskCard key={task.id} task={task} index={i} palette={palette}
                  favorites={favorites} onFavorite={toggleFav}
                  answered={answered} onAnswer={setAnswer}
                  onCopyId={handleCopyId} lineNames={lineNames}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
