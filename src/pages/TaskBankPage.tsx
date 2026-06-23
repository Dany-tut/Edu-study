import { useState, useMemo, useRef, useEffect, type ReactNode } from 'react'
import ScrollFade from '../components/ScrollFade'
import { useFloatingPill } from '../lib/useFloatingPill'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, Search, BookOpen, CheckCircle2, XCircle,
  Bookmark, Share2, AlertTriangle, Eye, Sparkles, Target, Filter,
  LayoutGrid, List, ArrowUpDown, ArrowUp, X, TrendingUp, FlaskConical, Bell,
} from 'lucide-react'
import {
  Task, Subject,
  BIOLOGY_SECTION_LINE_MAP, BIOLOGY_DIAGNOSTIC_SAMPLE_LINES, BIOLOGY_ROUTE,
  linesForSelection, lineNamesForSubject,
  sectionsForSubject, topicsForSelection, sectionsForParts, partsForSections,
} from '../data/taskBankData'
import MultiSelectField from '../components/MultiSelectField'
import { useCurriculum } from '../store/curriculumStore'
import { useTaskBank } from '../store/taskBankStore'
import { useOptionMerger, sectionScope, topicScope, SOURCE_SCOPE } from '../store/taskMetaStore'
import { useDashboard } from '../store/dashboardStore'
import { useTrainerProgress } from '../store/trainerProgressStore'
import { subjectTheme, PURPLE } from '../lib/theme'
import { getContrastColor } from '../lib/utils'
import { useTheme } from '../store/themeStore'
import { useIsDesktop } from '../lib/useIsDesktop'
import MobileScreen from '../components/MobileScreen'
import MobileBottomNav from '../components/MobileBottomNav'
import MobileSheet from '../components/MobileSheet'
import { GlassPill, GlassIconButton } from '../components/mobileChrome'
import { glassCircle } from '../lib/mobileTokens'
import { tactile } from '../lib/feedback'

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
// ── Filter field — input-style combobox, expands inline (never clipped) ──────
function FilterField({ label, options, value, onChange, accent }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void; accent: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const shown = query ? options.filter(o => o.toLowerCase().includes(query.toLowerCase())) : options

  return (
    <div style={{ position: 'relative' }}>
      <div
        onMouseDown={e => {
          if (e.target === inputRef.current) {
            if (open) { e.preventDefault(); setOpen(false); inputRef.current?.blur() }
            return
          }
          e.preventDefault()
          if (open) {
            setOpen(false)
            inputRef.current?.blur()
          } else {
            setOpen(true)
            setQuery('')
            inputRef.current?.focus()
          }
        }}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '9px 12px', borderRadius: 13,
          background: 'var(--color-bg-input)',
          border: 'none',
          transition: 'background 0.15s ease',
          cursor: 'pointer',
        }}>
        <input
          ref={inputRef}
          value={open ? query : value}
          placeholder={label}
          onFocus={() => { setOpen(true); setQuery('') }}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onChange={e => setQuery(e.target.value)}
          style={{
            flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
            fontSize: 13, fontWeight: value && !open ? 600 : 400,
            color: value && !open ? 'var(--color-text)' : 'var(--color-muted)',
            cursor: 'pointer',
          }}
        />
        {value && !open ? (
          <button onMouseDown={e => { e.preventDefault(); onChange('') }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', fontSize: 16, lineHeight: 1, padding: 0 }}>
            ×
          </button>
        ) : (
          <svg width="11" height="11" viewBox="0 0 10 10" fill="none" style={{ color: 'var(--color-text-3)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease', pointerEvents: 'none' }}>
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
            boxShadow: 'var(--shadow-modal-sm)', overflow: 'hidden',
          }}
        >
          <ScrollFade maxHeight={190} bg="rgba(var(--glass-rgb), 0.9)" scrollClassName="no-scrollbar">
            {/* Inset the rows so the active/hover fill floats inside the glass
                with a margin off the edges and rounded corners. */}
            <div style={{ padding: 5, display: 'flex', flexDirection: 'column' }}>
              {value && (
                <button onMouseDown={e => { e.preventDefault(); onChange(''); setOpen(false) }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-5)' }}
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
      <span style={{ padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'var(--color-red-soft)', color: 'var(--color-red-text)', transition: 'background 0.15s ease' }}>
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
              background: 'var(--grad-green)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(42,125,79,0.35)',
            }}>
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                <path d="M1.5 4.5l2.2 2.2 3.3-3.7" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-green-text)', letterSpacing: 0.1 }}>Скопировано</span>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}

// ── Task card — same visual language as HomeworkFlow questions ───────────────
function TaskCard({ task, index, palette, favorites, onFavorite, answered, onAnswer, onCopyId, lineNames, mobile }: {
  task: Task; index: number; palette: ReturnType<typeof subjectTheme>
  lineNames: Record<number, string>
  favorites: Set<number>; onFavorite: (id: number) => void
  answered: Map<number, { value: string; correct: boolean | null }>
  onAnswer: (id: number, value: string, correct: boolean | null) => void
  onCopyId: () => void
  mobile?: boolean
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

  // Tactility is mobile-only — desktop trainer shouldn't blip/vibrate on every click.
  const tap = () => { if (mobile) tactile() }
  function check() {
    tap()
    onAnswer(task.id, inputVal, inputVal.trim().toLowerCase() === task.answer.toLowerCase())
  }
  function share() {
    navigator.clipboard.writeText(`№${task.id} · ${task.question.replace(/<[^>]*>/g, '').slice(0, 80)}…`)
    setCopied(true); setTimeout(() => setCopied(false), 1400)
  }

  return (
    <div
      className="flex flex-col"
      style={{
        gap: 14, padding: '20px 20px 12px 20px', borderRadius: 26,
        position: 'relative',
        background: 'rgba(var(--glass-rgb), 0.96)',
        border: `1px solid ${isCorrect ? 'rgba(110,231,160,0.58)' : isWrong ? 'rgba(244,139,145,0.5)' : 'var(--color-border-soft)'}`,
        boxShadow: isCorrect ? '0 8px 24px rgba(110,231,160,0.14)' : isWrong ? '0 8px 24px rgba(244,139,145,0.12)' : 'none',
      }}
    >
      {/* Header: label + badges | result badge + bookmark */}
      <div className="flex items-start justify-between" style={{ gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: palette.text }}>Задание {index + 1}</span>
            <span style={{ fontSize: 11, color: '#BDBDC2' }}>·</span>
            <NumberBadge id={task.id} onCopied={onCopyId} />
            <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: `${palette.accent}33`, color: 'var(--color-text)' }}>
              {task.line} · {lineNames[task.line] ?? `Линия ${task.line}`}
            </span>
            <span style={{ padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: 'rgba(0,0,0,0.05)', color: 'var(--color-muted)' }}>Часть {task.part}</span>
          </div>
          {!mobile && (
            <div style={{ fontSize: 16, lineHeight: 1.45, fontWeight: 650, color: 'var(--color-text)' }}
              dangerouslySetInnerHTML={{ __html: task.question }} />
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {state !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 14, background: isCorrect ? 'var(--color-green-soft)' : 'var(--color-red-soft)', color: isCorrect ? 'var(--color-green-text)' : 'var(--color-red-text)', fontSize: 13, fontWeight: 700 }}>
              {isCorrect ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
              {isCorrect ? 'Верно' : 'Неверно'}
            </div>
          )}
          <button
            onClick={() => { tap(); onFavorite(task.id) }}
            style={{
              width: 36, height: 36, borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isFav ? 'var(--color-yellow-soft)' : 'rgba(var(--glass-rgb), 0.88)',
              border: `1px solid ${isFav ? '#F8EF8C' : 'var(--color-border-medium)'}`,
              cursor: 'pointer', outline: 'none',
              transition: 'all 0.18s ease',
            }}
          >
            <Bookmark size={16} fill={isFav ? 'currentColor' : 'none'} color={isFav ? '#7A6B00' : 'var(--color-text-3)'} />
          </button>
        </div>
      </div>

      {/* On mobile the question spans the full card width (below the header row),
          so the result badge + bookmark don't squeeze it into a narrow column. */}
      {mobile && (
        <div style={{ fontSize: 14, lineHeight: 1.5, fontWeight: 650, color: 'var(--color-text)', marginTop: -4 }}
          dangerouslySetInnerHTML={{ __html: task.question }} />
      )}

      {/* Image / table blocks in teacher-configured order */}
      {(task.blockOrder ?? ['image', 'table']).map(blockKey => {
        if (blockKey === 'image' && task.questionImage) return (
          <img key="image" src={task.questionImage} alt="" style={{ maxWidth: `${task.questionImageSize ?? 100}%`, borderRadius: 14, border: '1px solid var(--color-border-medium)', alignSelf: 'flex-start', display: 'block' }} />
        )
        if (blockKey === 'table' && task.questionTable) return (
          <div key="table" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: 16, border: '1px solid var(--color-border-medium)', alignSelf: 'flex-start', maxWidth: '100%' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: mobile ? 12 : 13, minWidth: mobile ? 240 : undefined }}>
              <thead>
                <tr>{task.questionTable.headers.map((h, hi, arr) => (
                  <th key={h} style={{ borderBottom: '1px solid var(--color-border-medium)', borderRight: hi < arr.length - 1 ? '1px solid var(--color-border-medium)' : undefined, padding: mobile ? '7px 10px' : '10px 16px', fontWeight: 700, background: 'var(--color-table-header-bg)', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {task.questionTable.rows.map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 1 ? 'rgba(0,0,0,0.02)' : undefined }}>
                    {row.map((cell, j) => {
                      const isEmpty = !!task.questionTable!.emptyCells?.[`${i},${j}`]
                      const isBlank = !!task.questionTable!.blankCells?.[`${i},${j}`]
                      return (
                        <td key={j} style={{ borderTop: '1px solid var(--color-border)', borderRight: j < row.length - 1 ? '1px solid var(--color-border)' : undefined, padding: mobile ? '7px 10px' : '9px 16px', background: isEmpty ? 'rgba(var(--glass-rgb),0.6)' : undefined, minWidth: isEmpty ? 56 : undefined, color: 'var(--color-text)' }}>
                          {isEmpty ? ' ' : isBlank ? '—' : cell}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
        return null
      })}

      {/* Choice options */}
      {task.choices && task.choices.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {task.choices.map((c, i) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'rgba(var(--glass-rgb),0.7)', border: '1px solid var(--color-border-soft)', minHeight: 42 }}>
              <span style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: 'var(--color-bg-input)', border: '1px solid var(--color-border-medium)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--color-text-2)', marginTop: 1 }}>{'АБВГДЕЖЗИК'[i]}</span>
              <span style={{ fontSize: mobile ? 13 : 15, color: 'var(--color-text)', lineHeight: 1.45, paddingTop: 2 }}>{c.text}</span>
            </div>
          ))}
          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>{task.answerType === 'multi' ? 'Введите буквы всех верных вариантов, напр. АБГ' : 'Введите букву верного варианта'}</div>
        </div>
      )}

      {/* Matching */}
      {task.matchLeft && task.matchRight && (() => {
        const maxLen = Math.max(task.matchLeft.length, task.matchRight.length)
        return (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {Array.from({ length: maxLen }).map((_, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignItems: 'stretch' }}>
                  {task.matchLeft![i] !== undefined ? (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'rgba(var(--glass-rgb),0.7)', border: '1px solid var(--color-border-soft)', minHeight: 42 }}>
                      <span style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: 'var(--color-bg-input)', border: '1px solid var(--color-border-medium)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--color-text-2)', marginTop: 1 }}>{'АБВГДЕЖЗИК'[i]}</span>
                      <span style={{ fontSize: mobile ? 13 : 15, color: 'var(--color-text)', lineHeight: 1.45, paddingTop: 2 }}>{task.matchLeft![i]}</span>
                    </div>
                  ) : <div />}
                  {task.matchRight![i] !== undefined ? (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'rgba(0,0,0,0.03)', border: '1px solid var(--color-border-soft)', minHeight: 42 }}>
                      <span style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: 'rgba(var(--glass-rgb),0.9)', border: '1px solid var(--color-border-medium)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--color-text-2)', marginTop: 1 }}>{i + 1}</span>
                      <span style={{ fontSize: mobile ? 13 : 15, color: 'var(--color-text)', lineHeight: 1.45, paddingTop: 2 }}>{task.matchRight![i]}</span>
                    </div>
                  ) : <div />}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 6 }}>Сопоставьте и введите, напр. А2 Б1 В3</div>
          </div>
        )
      })()}

      {/* Sequence */}
      {task.sequenceItems && task.sequenceItems.length > 0 && (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[...task.sequenceItems].sort((a, b) => a.localeCompare(b, 'ru')).map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'rgba(var(--glass-rgb),0.7)', border: '1px solid var(--color-border-soft)', minHeight: 42 }}>
                <span style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: 'var(--color-bg-input)', border: '1px solid var(--color-border-medium)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--color-text-2)', marginTop: 1 }}>{i + 1}</span>
                <span style={{ fontSize: mobile ? 13 : 15, color: 'var(--color-text)', lineHeight: 1.45, paddingTop: 2 }}>{s}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 6 }}>Введите порядок цифрами, напр. 3142</div>
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
              padding: '11px 16px', borderRadius: 16, fontSize: mobile ? 16 : 14, outline: 'none',
              border: `1px solid ${state ? (isCorrect ? '#6EE7A0' : '#F48B91') : 'var(--color-border-medium)'}`,
              background: state ? (isCorrect ? 'var(--color-green-soft)' : 'var(--color-red-soft)') : 'var(--color-bg-input)',
            }}
          />
          <div style={{
            position: 'absolute', left: 1, top: 1, bottom: 1, width: 32,
            borderRadius: '15px 0 0 15px', pointerEvents: 'none',
            background: `linear-gradient(to right, ${state ? (isCorrect ? 'var(--color-green-soft)' : 'var(--color-red-soft)') : 'var(--color-bg-input)'}, transparent)`,
            opacity: inputOverflow ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }} />
          <span ref={measureRef} style={{
            position: 'absolute', visibility: 'hidden', whiteSpace: 'pre',
            fontSize: 14, fontFamily: 'inherit', pointerEvents: 'none', top: -9999,
          }}>{inputVal}</span>
        </div>
        <AnimatePresence>
          {inputVal.trim() && (
            <motion.div
              key="task-actions"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              style={{ display: 'flex', gap: 8, alignItems: 'center' }}
            >
              <button onClick={check} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '11px 20px', borderRadius: 16,
                background: palette.accent, color: palette.onAccent,
                border: 'none', outline: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                boxShadow: `0 4px 14px ${palette.ring}`,
                transition: 'all 0.18s ease',
              }}>
                <CheckCircle2 size={14} />Проверить
              </button>
              {state !== undefined && (
                <button onClick={() => { tap(); setShowSolution(s => !s) }} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '11px 18px', borderRadius: 16,
                  background: showSolution ? palette.soft : 'rgba(var(--glass-rgb), 0.88)',
                  border: showSolution ? 'none' : '1px solid var(--color-border-medium)',
                  outline: 'none',
                  fontSize: 13, cursor: 'pointer', color: showSolution ? palette.text : 'var(--color-muted)', fontWeight: showSolution ? 700 : 500,
                }}>
                  <Eye size={14} />Решение
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
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
        <span style={{ fontSize: 11, color: 'var(--color-muted)', flex: 1 }}>{task.section} → {task.topic} · {task.source}</span>
        <button onClick={() => setReported(r => !r)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 8, background: 'none', border: 'none', fontSize: 11, color: reported ? '#C0187A' : 'var(--color-text-3)', cursor: 'pointer' }}>
          <AlertTriangle size={10} />{reported ? 'Отправлено' : 'Ошибка'}
        </button>
        <button onClick={share} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 8, background: 'none', border: 'none', fontSize: 11, color: 'var(--color-text-3)', cursor: 'pointer' }}>
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
        <span style={{ padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: `${palette.soft}99`, color: `${palette.text}cc`, border: `1px solid ${palette.soft}` }}>
          {task.line}
        </span>
      </div>

      {/* Question */}
      <div style={{ fontSize: 13, lineHeight: 1.4, fontWeight: 600, color: 'var(--color-text)', margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        dangerouslySetInnerHTML={{ __html: task.question }} />

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
        <button onClick={() => state !== undefined && setShowSolution(s => !s)} style={{
          padding: '7px 8px', borderRadius: 10, border: `1px solid ${showSolution ? palette.accent : 'var(--color-border-medium)'}`,
          background: showSolution ? palette.soft : 'transparent', cursor: state !== undefined ? 'pointer' : 'default', flexShrink: 0,
          opacity: state !== undefined ? 1 : 0.35,
        }}><Eye size={12} color={showSolution ? palette.text : 'var(--color-text-3)'} /></button>
        <button onClick={() => onFavorite(task.id)} style={{
          padding: '7px 8px', borderRadius: 10, border: `1px solid ${isFav ? '#F8EF8C' : 'var(--color-border-medium)'}`,
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
  const wrapRef = useRef<HTMLDivElement>(null)
  const label = SORT_OPTIONS.find(([v]) => v === value)?.[1] ?? 'Новые'
  // While the menu is open: swallow wheel events over the dropdown so the page
  // behind it doesn't scroll (native listener — React's wheel handler is passive
  // and can't preventDefault); but if the wheel happens anywhere else on the
  // page, gently close the menu.
  useEffect(() => {
    const el = wrapRef.current
    if (!open || !el) return
    const block = (e: WheelEvent) => e.preventDefault()
    const closeOnOutsideWheel = (e: WheelEvent) => {
      if (!el.contains(e.target as Node)) setOpen(false)
    }
    el.addEventListener('wheel', block, { passive: false })
    window.addEventListener('wheel', closeOnOutsideWheel, { capture: true, passive: true })
    return () => {
      el.removeEventListener('wheel', block)
      window.removeEventListener('wheel', closeOnOutsideWheel, { capture: true })
    }
  }, [open])
  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '9px 13px', borderRadius: 999,
          background: 'rgba(var(--glass-rgb), 0.92)',
          border: `1px solid ${open ? 'var(--color-border)' : 'var(--color-border-soft)'}`,
          boxShadow: open ? '0 0 0 3px rgba(0,0,0,0.06), var(--shadow-modal-sm)' : 'none',
          fontSize: 12, fontWeight: 600, color: 'var(--color-text)', cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        <ArrowUpDown size={12} style={{ color: 'var(--color-text-3)' }} />
        <span style={{ display: 'grid', justifyItems: 'start' }}>
          {SORT_OPTIONS.map(([, lbl]) => (
            <span key={lbl} aria-hidden style={{ gridArea: '1 / 1', height: 0, overflow: 'hidden', visibility: 'hidden' }}>{lbl}</span>
          ))}
          <span style={{ gridArea: '1 / 1' }}>{label}</span>
        </span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: 'var(--color-text-3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 6, zIndex: 50, minWidth: 150,
            background: 'rgba(var(--glass-rgb), 0.96)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid var(--color-border)', borderRadius: 14,
            boxShadow: 'var(--shadow-dropdown)', overflow: 'hidden', padding: 5,
          }}
        >
          {SORT_OPTIONS.map(([val, label]) => (
            <button
              key={val}
              onMouseDown={e => { e.preventDefault(); onChange(val); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                width: '100%', padding: '9px 10px', borderRadius: 9, border: 'none',
                background: value === val ? 'var(--color-bg-5)' : 'transparent',
                fontSize: 13, fontWeight: value === val ? 700 : 400, color: 'var(--color-text)',
                cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-5)' }}
              onMouseLeave={e => { e.currentTarget.style.background = value === val ? 'var(--color-bg-5)' : 'transparent' }}
            >
              {label}
              {value === val && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </button>
          ))}
        </motion.div>
      )}
      </AnimatePresence>
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
            background: 'linear-gradient(var(--tab-pill-active), var(--tab-pill-active)), rgba(var(--glass-rgb), 0.82)',
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            boxShadow: 'var(--shadow-tab-pill)',
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
          <span style={{ display: 'grid', justifyItems: 'center' }}>
            <span aria-hidden style={{ gridArea: '1 / 1', height: 0, overflow: 'hidden', visibility: 'hidden', fontWeight: 700 }}>{label}</span>
            <span style={{ gridArea: '1 / 1' }}>{label}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

// ── Фича 1: Smart suggest — показывает линии при выборе раздела ──────────────
function SuggestBox({ section, lineNames, onPickLine, accent }: {
  section: string
  lineNames: Record<number, string>
  onPickLine: (line: string) => void
  accent: string
}) {
  const map = BIOLOGY_SECTION_LINE_MAP[section]
  if (!map || (map.lines.length === 0 && map.part2Lines.length === 0)) return null
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18 }}
      style={{ overflow: 'hidden' }}
    >
      <div style={{
        marginTop: 2, padding: '10px 12px', borderRadius: 12,
        background: `${accent}22`, border: `1px solid ${accent}44`,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: accent, marginBottom: 7, display: 'flex', alignItems: 'center', gap: 5, lineHeight: 1.2 }}>
          <Sparkles size={15} />
          Рекомендуемые линии для «{section}»
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {map.lines.map(n => (
            <button key={n} onClick={() => onPickLine(`${n} · ${lineNames[n] ?? `Линия ${n}`}`)}
              style={{
                padding: '4px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: accent, color: getContrastColor(accent),
                boxShadow: `0 2px 6px ${accent}44`,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.82' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
            >
              №{n}
            </button>
          ))}
          {map.part2Lines.map(n => (
            <button key={n} onClick={() => onPickLine(`${n} · ${lineNames[n] ?? `Линия ${n}`}`)}
              style={{
                padding: '4px 9px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer',
                background: `${accent}33`, border: `1px solid ${accent}66`, color: accent,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${accent}48` }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${accent}33` }}
            >
              №{n} · Ч2
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ── Stat chip — big number by default, label on hover, detail on click ───────
function StatChip({ value, label, detail, bg, border, color, active, onClick }: {
  value: number; label: string; detail?: string
  bg: string; border: string; color: string
  active: boolean; onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <motion.button
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      style={{
        flex: 1, minWidth: 0,
        padding: '10px 14px', borderRadius: 16,
        background: bg, border: `1.5px solid ${active ? color : border}`,
        boxShadow: active ? `0 0 0 3px ${color}22` : 'none',
        cursor: 'pointer', outline: 'none',
        display: 'flex', alignItems: 'center', gap: 9,
        overflow: 'hidden', textAlign: 'left',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      <motion.span
        animate={{ fontSize: hovered ? '17px' : '26px' }}
        transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
        style={{ fontWeight: 750, color, lineHeight: 1, flexShrink: 0 }}
      >
        {value}
      </motion.span>
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, overflow: 'hidden' }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color, lineHeight: 1.3, whiteSpace: 'normal' }}>{label}</span>
            {detail && <span style={{ fontSize: 11, color, opacity: 0.68, lineHeight: 1.25 }}>{detail}</span>}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

// ── Stats bar — row of chips + expandable detail area ────────────────────────
function StatsBar({ doneCount, wrongCount, totalCount, favCount, todayCorrect, todayWrong, palette, onOpenModal, onRetryWrong, onToggleFav, showFavOnly }: {
  doneCount: number; wrongCount: number; totalCount: number; favCount: number
  todayCorrect: number; todayWrong: number
  palette: ReturnType<typeof subjectTheme>
  onOpenModal: () => void; onRetryWrong: () => void
  onToggleFav: () => void; showFavOnly: boolean
}) {
  const [active, setActive] = useState<'correct' | 'today' | 'wrong' | 'fav' | null>(null)
  const toggle = (key: typeof active) => setActive(a => a === key ? null : key)
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <StatChip
          value={doneCount}
          label="Решено верно"
          detail={`из ${totalCount} заданий`}
          bg="var(--color-green-soft)"
          border="rgba(110,231,160,0.28)"
          color="var(--color-green-text)"
          active={active === 'correct'}
          onClick={() => toggle('correct')}
        />
        <StatChip
          value={todayCorrect}
          label="Верно сегодня"
          detail={todayWrong > 0 ? `${todayWrong} ошибок` : 'отличный день!'}
          bg="rgba(139,92,246,0.10)"
          border="rgba(139,92,246,0.22)"
          color="#7c3aed"
          active={active === 'today'}
          onClick={() => toggle('today')}
        />
        <StatChip
          value={wrongCount}
          label="Ошибок"
          detail="нажми — повторить"
          bg="var(--color-red-soft)"
          border="rgba(244,139,145,0.28)"
          color="var(--color-red-text)"
          active={active === 'wrong'}
          onClick={() => toggle('wrong')}
        />
        <StatChip
          value={favCount}
          label="В избранном"
          detail={showFavOnly ? 'скрыть остальные' : 'показать только'}
          bg="var(--color-yellow-soft, rgba(248,239,140,0.22))"
          border="rgba(248,200,50,0.3)"
          color="#7A6B00"
          active={active === 'fav' || showFavOnly}
          onClick={() => toggle('fav')}
        />
      </div>

      <AnimatePresence>
        {active && (
          <motion.div
            key={active}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              padding: '12px 16px', borderRadius: 14,
              background: 'rgba(var(--glass-rgb), 0.96)',
              border: '1px solid var(--color-border-soft)',
              display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
            }}>
              {active === 'correct' && (<>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>Правильность</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-green-text)' }}>{pct}%</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 999, background: 'var(--color-bg-5)', overflow: 'hidden', display: 'flex' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }}
                      style={{ height: '100%', background: 'var(--color-green-accent)', flexShrink: 0 }} />
                    <motion.div initial={{ width: 0 }} animate={{ width: `${totalCount ? wrongCount / totalCount * 100 : 0}%` }} transition={{ duration: 0.5 }}
                      style={{ height: '100%', background: '#F48B91', flexShrink: 0 }} />
                  </div>
                </div>
                <button onClick={onOpenModal}
                  style={{ padding: '7px 14px', borderRadius: 10, border: 'none', background: `${palette.accent}20`, color: palette.text, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Детали →
                </button>
              </>)}

              {active === 'today' && (<>
                <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>Сегодня:</span>
                {todayCorrect > 0 && <span style={{ padding: '4px 12px', borderRadius: 999, background: 'var(--color-green-soft)', color: 'var(--color-green-text)', fontSize: 13, fontWeight: 700 }}>✓ {todayCorrect} верно</span>}
                {todayWrong   > 0 && <span style={{ padding: '4px 12px', borderRadius: 999, background: 'var(--color-red-soft)',   color: 'var(--color-red-text)',   fontSize: 13, fontWeight: 700 }}>✗ {todayWrong} ошибок</span>}
                {todayCorrect === 0 && todayWrong === 0 && <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>Ещё не решал сегодня</span>}
              </>)}

              {active === 'wrong' && (<>
                <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{wrongCount} заданий с ошибкой</span>
                {wrongCount > 0 && (
                  <button onClick={() => { onRetryWrong(); setActive(null) }}
                    style={{ padding: '7px 14px', borderRadius: 10, border: 'none', background: 'var(--color-red-soft)', color: 'var(--color-red-text)', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <XCircle size={13} />Повторить ошибки
                  </button>
                )}
                <button onClick={onOpenModal}
                  style={{ padding: '7px 14px', borderRadius: 10, border: '1px solid var(--color-border-medium)', background: 'transparent', color: 'var(--color-text-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Полная статистика
                </button>
              </>)}

              {active === 'fav' && (<>
                <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{favCount} в избранном</span>
                <button onClick={() => { onToggleFav(); setActive(null) }}
                  style={{ padding: '7px 14px', borderRadius: 10, border: `1px solid ${showFavOnly ? 'rgba(248,200,50,0.4)' : 'var(--color-border-medium)'}`, background: showFavOnly ? 'rgba(248,239,140,0.22)' : 'transparent', color: showFavOnly ? '#7A6B00' : 'var(--color-text-2)', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Bookmark size={13} fill={showFavOnly ? 'currentColor' : 'none'} />
                  {showFavOnly ? 'Показать все' : 'Только избранное'}
                </button>
              </>)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── LS keys for trainer persistence ─────────────────────────────────────────
const LS_ANSWERED  = 'trainer_answered_v1'
const LS_FAVORITES = 'trainer_favorites_v1'

// ── Progress modal ────────────────────────────────────────────────────────────
function ProgressModal({
  tasks, answered, favorites, palette, lineNames,
  onClose, onRetryMistakes, onSimilarTasks,
}: {
  tasks: Task[]
  answered: Map<number, { value: string; correct: boolean | null; date?: string }>
  favorites: Set<number>
  palette: ReturnType<typeof subjectTheme>
  lineNames: Record<number, string>
  onClose: () => void
  onRetryMistakes: () => void
  onSimilarTasks: (lines: number[]) => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const totalCorrect = useMemo(() => [...answered.values()].filter(a => a.correct === true).length, [answered])
  const totalWrong   = useMemo(() => [...answered.values()].filter(a => a.correct === false).length, [answered])
  const todayCorrect = useMemo(() => [...answered.values()].filter(a => a.correct === true  && a.date === today).length, [answered, today])
  const todayWrong   = useMemo(() => [...answered.values()].filter(a => a.correct === false && a.date === today).length, [answered, today])

  const sectionStats = useMemo(() => {
    const s: Record<string, { correct: number; wrong: number }> = {}
    tasks.forEach(t => {
      const ans = answered.get(t.id)
      if (!ans || ans.correct === null) return
      const sec = t.section || 'Без раздела'
      if (!s[sec]) s[sec] = { correct: 0, wrong: 0 }
      ans.correct ? s[sec].correct++ : s[sec].wrong++
    })
    return Object.entries(s).sort((a, b) => (b[1].correct + b[1].wrong) - (a[1].correct + a[1].wrong))
  }, [tasks, answered])

  const wrongTasks = useMemo(() => tasks.filter(t => answered.get(t.id)?.correct === false), [tasks, answered])
  const wrongLines = useMemo(() => [...new Set(wrongTasks.map(t => t.line))], [wrongTasks])

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 520, maxHeight: '85dvh',
          background: 'rgba(var(--glass-rgb), 0.98)',
          backdropFilter: 'blur(28px) saturate(200%)',
          WebkitBackdropFilter: 'blur(28px) saturate(200%)',
          border: '1px solid var(--color-border-glass)',
          borderRadius: 28, boxShadow: '0 28px 70px rgba(0,0,0,0.22)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--color-border-soft)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 17, fontWeight: 750, color: 'var(--color-text)' }}>Мой прогресс</div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)' }}>
              <X size={14} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { val: totalCorrect, label: 'Верно', bg: 'var(--color-green-soft)', border: 'rgba(110,231,160,0.3)', color: 'var(--color-green-text)' },
              { val: totalWrong,   label: 'Ошибок', bg: 'var(--color-red-soft)',   border: 'rgba(244,139,145,0.3)', color: 'var(--color-red-text)' },
              { val: favorites.size, label: 'Избранное', bg: `${palette.accent}18`, border: `${palette.accent}33`, color: palette.text },
            ].map(({ val, label, bg, border, color }) => (
              <div key={label} style={{ padding: '10px 12px', borderRadius: 14, background: bg, border: `1px solid ${border}`, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 750, color, lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: 11, color, opacity: 0.75, marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {(todayCorrect > 0 || todayWrong > 0) && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>Сегодня</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {todayCorrect > 0 && <span style={{ padding: '5px 12px', borderRadius: 999, background: 'var(--color-green-soft)', color: 'var(--color-green-text)', fontSize: 13, fontWeight: 700 }}>✓ {todayCorrect} верно</span>}
                {todayWrong   > 0 && <span style={{ padding: '5px 12px', borderRadius: 999, background: 'var(--color-red-soft)',   color: 'var(--color-red-text)',   fontSize: 13, fontWeight: 700 }}>✗ {todayWrong} ошибок</span>}
              </div>
            </div>
          )}

          {sectionStats.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>По разделам</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {sectionStats.map(([sec, s]) => {
                  const total = s.correct + s.wrong
                  const pct = total ? s.correct / total : 0
                  return (
                    <div key={sec}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{sec}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, flexShrink: 0, marginLeft: 8, color: pct === 1 ? 'var(--color-green-text)' : s.wrong > 0 ? 'var(--color-red-text)' : 'var(--color-text-3)' }}>{s.correct}/{total}</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 999, background: 'var(--color-bg-5)', overflow: 'hidden', display: 'flex' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }} transition={{ duration: 0.5 }}
                          style={{ height: '100%', background: 'var(--color-green-accent)', flexShrink: 0 }} />
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(s.wrong / total) * 100}%` }} transition={{ duration: 0.5 }}
                          style={{ height: '100%', background: '#F48B91', flexShrink: 0 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {wrongTasks.length > 0 && (
            <div style={{ paddingBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.8, textTransform: 'uppercase' }}>Ошибки ({wrongTasks.length})</div>
                <button onClick={onRetryMistakes} style={{ padding: '4px 12px', borderRadius: 999, border: 'none', background: `${palette.accent}22`, color: palette.text, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  Повторить все →
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {wrongTasks.slice(0, 12).map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 11, background: 'var(--color-red-soft)', border: '1px solid rgba(244,139,145,0.25)' }}>
                    <span style={{ padding: '2px 7px', borderRadius: 7, fontSize: 10, fontWeight: 700, background: 'rgba(244,139,145,0.35)', color: 'var(--color-red-text)', flexShrink: 0 }}>#{t.id}</span>
                    <span style={{ flex: 1, fontSize: 12, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} dangerouslySetInnerHTML={{ __html: t.question.replace(/<[^>]*>/g, '').slice(0, 55) }} />
                    <span style={{ fontSize: 10, color: 'var(--color-text-3)', flexShrink: 0 }}>Л.{t.line}</span>
                  </div>
                ))}
                {wrongTasks.length > 12 && <div style={{ fontSize: 12, color: 'var(--color-text-3)', textAlign: 'center' }}>и ещё {wrongTasks.length - 12}…</div>}
              </div>
            </div>
          )}

          {answered.size === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🎯</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-2)' }}>Ещё нет решённых заданий</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-3)', marginTop: 5 }}>Начни отвечать — здесь появится статистика</div>
            </div>
          )}
        </div>

        {/* Footer */}
        {wrongTasks.length > 0 && (
          <div style={{ padding: '14px 24px 20px', flexShrink: 0, display: 'flex', gap: 8 }}>
            <button onClick={onRetryMistakes}
              style={{ flex: 1, padding: '11px 0', borderRadius: 14, border: 'none', background: palette.accent, color: palette.onAccent, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: `0 6px 18px ${palette.ring}` }}>
              <XCircle size={14} />Повторить ошибки
            </button>
            {wrongLines.length > 0 && (
              <button onClick={() => onSimilarTasks(wrongLines)}
                style={{ flex: 1, padding: '11px 0', borderRadius: 14, border: `1px solid ${palette.accent}44`, background: `${palette.accent}14`, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: palette.text, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Target size={14} />Похожие задания
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ── Mobile progress bottom sheet (replaces centered modal on phone) ────────
function MobileProgressSheet({ open, onClose, tasks, answered, favorites, palette, lineNames, onRetryMistakes, onSimilarTasks }: {
  open: boolean; onClose: () => void
  tasks: Task[]
  answered: Map<number, { value: string; correct: boolean | null; date?: string }>
  favorites: Set<number>
  palette: ReturnType<typeof subjectTheme>
  lineNames: Record<number, string>
  onRetryMistakes: () => void
  onSimilarTasks: (lines: number[]) => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const totalCorrect = useMemo(() => [...answered.values()].filter(a => a.correct === true).length, [answered])
  const totalWrong   = useMemo(() => [...answered.values()].filter(a => a.correct === false).length, [answered])
  const todayCorrect = useMemo(() => [...answered.values()].filter(a => a.correct === true  && a.date === today).length, [answered, today])
  const wrongTasks   = useMemo(() => tasks.filter(t => answered.get(t.id)?.correct === false), [tasks, answered])
  const wrongLines   = useMemo(() => [...new Set(wrongTasks.map(t => t.line))], [wrongTasks])

  const sectionStats = useMemo(() => {
    const s: Record<string, { correct: number; wrong: number }> = {}
    tasks.forEach(t => {
      const ans = answered.get(t.id)
      if (!ans || ans.correct === null) return
      const sec = t.section || 'Без раздела'
      if (!s[sec]) s[sec] = { correct: 0, wrong: 0 }
      ans.correct ? s[sec].correct++ : s[sec].wrong++
    })
    return Object.entries(s).sort((a, b) => (b[1].correct + b[1].wrong) - (a[1].correct + a[1].wrong)).slice(0, 6)
  }, [tasks, answered])

  return (
    <MobileSheet open={open} onClose={onClose} title="Мой прогресс">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { val: totalCorrect, label: 'Верно', bg: 'var(--color-green-soft)', color: 'var(--color-green-text)' },
            { val: totalWrong,   label: 'Ошибок', bg: 'var(--color-red-soft)',   color: 'var(--color-red-text)' },
            { val: favorites.size, label: 'Избранное', bg: `${palette.accent}18`, color: palette.text },
          ].map(({ val, label, bg, color }) => (
            <div key={label} style={{ padding: '10px 8px', borderRadius: 14, background: bg, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 750, color, lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: 10, color, opacity: 0.75, marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Today */}
        {todayCorrect > 0 && (
          <div style={{ padding: '10px 12px', borderRadius: 12, background: 'var(--color-green-soft)' }}>
            <span style={{ fontSize: 12, color: 'var(--color-green-text)', fontWeight: 700 }}>Сегодня верно: {todayCorrect}</span>
          </div>
        )}

        {/* By section */}
        {sectionStats.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>По разделам</div>
            {sectionStats.map(([sec, s]) => {
              const total = s.correct + s.wrong
              const pct = total ? s.correct / total : 0
              return (
                <div key={sec}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{sec}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, flexShrink: 0, marginLeft: 8, color: pct === 1 ? 'var(--color-green-text)' : s.wrong > 0 ? 'var(--color-red-text)' : 'var(--color-text-3)' }}>{s.correct}/{total}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 999, background: 'var(--color-bg-5)', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${pct * 100}%`, height: '100%', background: 'var(--color-green-accent)', flexShrink: 0 }} />
                    <div style={{ width: `${(s.wrong / total) * 100}%`, height: '100%', background: '#F48B91', flexShrink: 0 }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Actions */}
        {wrongTasks.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 4 }}>
            <button onClick={onRetryMistakes}
              style={{ width: '100%', padding: '13px', borderRadius: 14, border: 'none', background: palette.accent, color: palette.onAccent, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: `0 4px 14px ${palette.ring}` }}>
              <XCircle size={15} />Повторить ошибки ({wrongTasks.length})
            </button>
            {wrongLines.length > 0 && (
              <button onClick={() => onSimilarTasks(wrongLines)}
                style={{ width: '100%', padding: '13px', borderRadius: 14, border: `1px solid ${palette.accent}44`, background: `${palette.accent}14`, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: palette.text, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Target size={15} />Похожие задания
              </button>
            )}
          </div>
        )}

        {answered.size === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-3)' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Ещё нет решённых заданий</div>
            <div style={{ fontSize: 12 }}>Начни отвечать — здесь появится статистика</div>
          </div>
        )}
      </div>
    </MobileSheet>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function TaskBankPage() {
  const { dark } = useTheme()
  const isDesktop = useIsDesktop()
  const [sheet, setSheet] = useState<'filters' | 'sort' | 'search' | null>(null)
  const setActivePage = useDashboard(s => s.setActivePage)
  const docked        = useDashboard(s => s.lessonScrolled)
  const activeSubjectId = useDashboard(s => s.activeSubjectId)
  const tasks         = useTaskBank(s => s.tasks)
  const loadTasks     = useTaskBank(s => s.load)
  useEffect(() => { loadTasks(true) }, [])

  const defaultSubject: Subject = (() => {
    const saved = localStorage.getItem('taskbank_subject')
    if (saved === 'biology' || saved === 'chemistry') return saved
    return activeSubjectId === 'chemistry' ? 'chemistry' : 'biology'
  })()
  const [subject, setSubject]   = useState<Subject>(defaultSubject)
  const setSubjectPersist = (s: Subject) => { localStorage.setItem('taskbank_subject', s); setSubject(s) }
  const [sections, setSections] = useState<string[]>([])
  const [topics, setTopics]     = useState<string[]>([])
  const [parts, setParts]       = useState<string[]>([])
  const [lines, setLines]       = useState<string[]>([])
  const [source, setSource]     = useState('')
  const [search, setSearch]     = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortMode, setSortMode]         = useState<SortMode>('newest')
  const viewMode: ViewMode = 'list'
  const [showFavOnly, setShowFavOnly]   = useState(false)
  const [showWrongOnly, setShowWrongOnly] = useState(false)
  const [wrongSimilarLines, setWrongSimilarLines] = useState<Set<number>>(new Set())
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [favorites, setFavorites]       = useState<Set<number>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(LS_FAVORITES) || '[]') as number[]) } catch { return new Set() }
  })
  const [answered, setAnswered] = useState<Map<number, { value: string; correct: boolean | null; date?: string }>>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(LS_ANSWERED) || '{}') as Record<string, { value: string; correct: boolean | null; date?: string }>
      return new Map(Object.entries(raw).map(([k, v]) => [Number(k), v]))
    } catch { return new Map() }
  })
  const [savedPill, setSavedPill] = useState(false)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Scroll-to-top button ──────────────────────────────────────────────────
  const [showScrollTop, setShowScrollTop] = useState(false)
  useEffect(() => {
    const container = document.querySelector('.dashboard-main') as HTMLElement | null
    if (!container) return
    const onScroll = () => setShowScrollTop(container.scrollTop > 350)
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => container.removeEventListener('scroll', onScroll)
  }, [])

  // ── Persist trainer progress ──────────────────────────────────────────────
  useEffect(() => {
    const obj: Record<number, { value: string; correct: boolean | null; date?: string }> = {}
    answered.forEach((v, k) => { obj[k] = v })
    try { localStorage.setItem(LS_ANSWERED, JSON.stringify(obj)) } catch {}
  }, [answered])
  useEffect(() => {
    try { localStorage.setItem(LS_FAVORITES, JSON.stringify([...favorites])) } catch {}
  }, [favorites])



  function handleCopyId() {
    setSavedPill(true)
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSavedPill(false), 1800)
  }

  const palette      = subjectTheme(subject, dark)
  const curriculumVersion = useCurriculum(s => s.version) // re-render when the teacher edits the taxonomy
  const lineNames    = useMemo(() => lineNamesForSubject(subject), [subject, curriculumVersion])
  const merge        = useOptionMerger()
  const subjectTasks = useMemo(() => tasks.filter(t => t.subject === subject), [tasks, subject])
  // Options mirror the teacher's PROGRAM (curriculum), not just the tasks that
  // happen to exist — so the student sees every раздел/тема/линия/часть the
  // teacher defined. Picking Часть N then narrows them via the curriculum map.
  const baseSections = useMemo(() => {
    const all = [...new Set([...sectionsForSubject(subject), ...subjectTasks.map(t => t.section).filter(Boolean)])]
    if (!parts.length) return all.sort()
    const inPart = new Set(sectionsForParts(subject, parts))
    return all.filter(s => inPart.has(s)).sort()
  }, [subject, subjectTasks, parts, curriculumVersion])
  const sectionOptions = merge(baseSections, sectionScope(subject))
  const baseTopics   = useMemo(() => {
    const taskTopics = (sections.length ? subjectTasks.filter(t => sections.includes(t.section)) : subjectTasks).map(t => t.topic).filter(Boolean)
    return [...new Set([...topicsForSelection(subject, sections), ...taskTopics])].sort()
  }, [subject, subjectTasks, sections, curriculumVersion])
  const topicOptions = merge(baseTopics, sections.length ? sections.map(s => topicScope(subject, s)) : topicScope(subject, ''))
  // Reverse cascade: which parts the program defines within the chosen sections —
  // so a Часть with no content greys out (and auto-clears if it was selected).
  const availableParts = useMemo(() => partsForSections(subject, sections), [subject, sections, curriculumVersion])
  useEffect(() => {
    if (parts.some(p => !availableParts.includes(p as '1' | '2'))) {
      setParts(parts.filter(p => availableParts.includes(p as '1' | '2')))
    }
  }, [availableParts]) // eslint-disable-line react-hooks/exhaustive-deps
  // Lines come straight from the curriculum map for the chosen sections + parts
  // (every program line, whether or not a task exists for it yet).
  const allLines     = useMemo(() => {
    return linesForSelection(subject, sections, parts).map(n => `${n} · ${lineNames[n] ?? `Линия ${n}`}`)
  }, [subject, lineNames, sections, parts, curriculumVersion])
  const baseSources  = useMemo(() => [...new Set(tasks.map(t => t.source).filter(Boolean))].sort(), [tasks])
  const allSources   = merge(baseSources, SOURCE_SCOPE)

  function toggleFav(id: number) {
    setFavorites(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function setAnswer(id: number, value: string, correct: boolean | null) {
    const date = new Date().toISOString().slice(0, 10)
    setAnswered(prev => new Map(prev).set(id, { value, correct, date }))
  }

  const filtered = useMemo(() => {
    // When searching, go global (all subjects); otherwise stay on the active tab
    let list = search
      ? tasks
      : tasks.filter(t => t.subject === subject)
    if (!search && sections.length) list = list.filter(t => sections.includes(t.section))
    if (!search && topics.length)   list = list.filter(t => topics.includes(t.topic))
    if (!search && parts.length)    list = list.filter(t => parts.includes(String(t.part)))
    if (!search && lines.length) {
      const lineNums = new Set(lines.map(l => Number(l.split(' · ')[0])))
      list = list.filter(t => lineNums.has(t.line))
    }
    if (!search && source)  list = list.filter(t => t.source === source)
    if (search) {
      const q = search.toLowerCase().replace(/^№/, '')
      list = list.filter(t => t.question.replace(/<[^>]*>/g, '').toLowerCase().includes(q) || String(t.id).includes(q) || t.topic.toLowerCase().includes(q))
    }
    if (statusFilter === 'done')   list = list.filter(t => answered.get(t.id)?.correct === true)
    if (statusFilter === 'undone') list = list.filter(t => !answered.get(t.id))
    if (showWrongOnly) list = list.filter(t => answered.get(t.id)?.correct === false)
    if (wrongSimilarLines.size > 0 && !search) list = list.filter(t => wrongSimilarLines.has(t.line))
    if (showFavOnly) list = list.filter(t => favorites.has(t.id))
    return [...list].sort((a, b) => {
      switch (sortMode) {
        case 'oldest':     return a.id - b.id
        case 'subject':    return a.subject.localeCompare(b.subject) || a.id - b.id
        case 'line':       return a.line - b.line || a.id - b.id
        default:           return b.id - a.id  // newest
      }
    })
  }, [tasks, subject, sections, topics, parts, lines, source, search, statusFilter, showFavOnly, showWrongOnly, wrongSimilarLines, answered, favorites, sortMode])

  // Auto-switch subject tab when search results all belong to one subject
  useEffect(() => {
    if (!search || filtered.length === 0) return
    const subjects = new Set(filtered.map(t => t.subject))
    if (subjects.size === 1) {
      const only = [...subjects][0] as Subject
      if (only !== subject) { setSubjectPersist(only); setSections([]); setTopics([]); setLines([]) }
    }
  }, [search, filtered])

  const doneCount  = tasks.filter(t => t.subject === subject && answered.get(t.id)?.correct === true).length
  const wrongCount = tasks.filter(t => t.subject === subject && answered.get(t.id)?.correct === false).length
  const totalCount = tasks.filter(t => t.subject === subject).length
  const today = new Date().toISOString().slice(0, 10)
  const todayCorrect = useMemo(() => [...answered.values()].filter(a => a.correct === true  && a.date === today).length, [answered, today])
  const todayWrong   = useMemo(() => [...answered.values()].filter(a => a.correct === false && a.date === today).length, [answered, today])

  const updateProgress = useTrainerProgress(s => s.update)
  const openModal = useTrainerProgress(s => s.openModal)
  const setOpenModal = useTrainerProgress(s => s.setOpenModal)
  useEffect(() => {
    updateProgress({ doneCount, wrongCount, totalCount, favCount: favorites.size, todayCorrect, todayWrong, subject })
  }, [doneCount, wrongCount, totalCount, favorites.size, todayCorrect, todayWrong, subject])
  useEffect(() => {
    if (openModal) { setShowProgressModal(true); setOpenModal(false) }
  }, [openModal])

  const hasFilters = !!(sections.length || topics.length || parts.length || lines.length || source)
  const clearFilters = () => { setSections([]); setTopics([]); setParts([]); setLines([]); setSource('') }
  const resetOnSubject = () => { setSections([]); setTopics([]); setLines([]) }

  const dockGlass = {
    border: '1px solid var(--color-border-glass)',
    background: 'rgba(var(--glass-rgb), 0.86)',
    backdropFilter: 'blur(14px) saturate(180%)',
    WebkitBackdropFilter: 'blur(14px) saturate(180%)',
    boxShadow: 'var(--shadow-lg)',
  } as const

  // ── Mobile layout (MOBILE ONLY; desktop return below is untouched) ──────────
  // Tasks are primary (full-width list); filters/sort/search live in glass
  // circles at the bottom that open bottom-sheets (§1.2). Desktop sidebar/dock
  // never renders here.
  if (!isDesktop) {
    const activeFilters = sections.length + topics.length + parts.length + lines.length + (source ? 1 : 0)
    const dockCircle = (key: string, icon: ReactNode, onClick: () => void, opts: { label: string; badge?: number; active?: boolean } = { label: '' }) => (
      <motion.button
        key={key}
        whileTap={{ scale: 0.9 }}
        onClick={() => { tactile(); onClick() }}
        aria-label={opts.label}
        style={{ ...glassCircle, width: 50, height: 50, position: 'relative', color: opts.active ? 'var(--color-accent)' : 'var(--color-text-2)' }}
      >
        {icon}
        {!!opts.badge && opts.badge > 0 && (
          <span style={{ position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, padding: '0 4px', borderRadius: 999, background: 'var(--color-accent)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {opts.badge}
          </span>
        )}
      </motion.button>
    )

    return (
      <>
        <MobileProgressSheet
          open={showProgressModal}
          onClose={() => setShowProgressModal(false)}
          tasks={subjectTasks} answered={answered} favorites={favorites} palette={palette} lineNames={lineNames}
          onRetryMistakes={() => { setShowWrongOnly(true); setWrongSimilarLines(new Set()); setShowProgressModal(false) }}
          onSimilarTasks={lines => { setWrongSimilarLines(new Set(lines)); setShowWrongOnly(false); setSections([]); setLines([]); setShowProgressModal(false) }}
        />

        <MobileScreen
          topPad={74}
          scrollKey={subject}
          topZone={
            <div className="flex items-center justify-between" style={{ gap: 8 }}>
              <GlassPill onClick={() => { setSubjectPersist(subject === 'biology' ? 'chemistry' : 'biology'); resetOnSubject() }}>
                <FlaskConical size={15} style={{ color: 'var(--color-accent)' }} />
                {subject === 'biology' ? 'Биология' : 'Химия'}
              </GlassPill>
              <div className="flex items-center" style={{ gap: 8 }}>
                <GlassPill>
                  <BookOpen size={14} style={{ color: 'var(--color-accent)' }} />
                  {filtered.length}
                </GlassPill>
                <GlassIconButton icon={<Bell size={16} />} dot ariaLabel="Уведомления" />
              </div>
            </div>
          }
        >
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--color-text-3)', fontSize: 14 }}>
              Заданий не найдено — измените фильтры
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map((task, i) => (
                <TaskCard key={task.id} task={task} index={i} palette={palette}
                  favorites={favorites} onFavorite={toggleFav}
                  answered={answered} onAnswer={setAnswer}
                  onCopyId={handleCopyId} lineNames={lineNames} mobile
                />
              ))}
            </div>
          )}
        </MobileScreen>

        {/* Control dock — glass circles, sits above the bottom nav */}
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)', zIndex: 65, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ display: 'flex', gap: 12, pointerEvents: 'auto' }}>
            {dockCircle('search', <Search size={20} />, () => setSheet('search'), { label: 'Поиск', badge: search ? 1 : 0, active: !!search })}
            {dockCircle('filter', <Filter size={20} />, () => setSheet('filters'), { label: 'Фильтры', badge: activeFilters })}
            {dockCircle('sort', <ArrowUpDown size={20} />, () => setSheet('sort'), { label: 'Сортировка' })}
            {dockCircle('fav', <Bookmark size={20} fill={showFavOnly ? 'currentColor' : 'none'} />, () => setShowFavOnly(f => !f), { label: 'Избранное', active: showFavOnly })}
          </div>
        </div>

        {/* Search sheet */}
        <MobileSheet open={sheet === 'search'} onClose={() => setSheet(null)} title="Поиск">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', height: 46, borderRadius: 999, background: 'var(--color-bg-input)', border: '1px solid var(--color-border-soft)' }}>
            <Search size={16} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />
            {/* fontSize 16 prevents iOS auto-zoom on focus */}
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="По тексту или №..."
              style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: 16, color: 'var(--color-text)' }} />
            {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', display: 'flex', flexShrink: 0 }}><X size={16} /></button>}
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--color-muted)' }}>Найдено заданий: {filtered.length}</div>
        </MobileSheet>

        {/* Filters sheet */}
        <MobileSheet open={sheet === 'filters'} onClose={() => setSheet(null)} title="Фильтры">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <MultiSelectField label="Раздел" options={sectionOptions} values={sections} onChange={setSections} accent={palette.accent} accentBg={`${palette.accent}22`} />
            <MultiSelectField label="Тема" options={topicOptions} values={topics} onChange={setTopics} accent={palette.accent} accentBg={`${palette.accent}22`} />
            <div style={{ display: 'flex', gap: 8 }}>
              {['1', '2'].map(p => {
                const active = parts.includes(p)
                const avail = availableParts.includes(p as '1' | '2')
                return (
                <button key={p} disabled={!avail} onClick={() => { tactile(); setParts(active ? parts.filter(x => x !== p) : [...parts, p]) }} style={{
                  flex: 1, padding: '11px 12px', borderRadius: 13, fontSize: 14, fontWeight: 600, cursor: avail ? 'pointer' : 'not-allowed',
                  background: active ? `${palette.accent}22` : 'var(--color-bg-input)',
                  border: 'none',
                  color: active ? palette.accent : 'var(--color-muted)',
                  opacity: avail ? 1 : 0.4,
                }}>
                  Часть {p}
                </button>
              )})}
            </div>
            <MultiSelectField label="Линия" options={allLines} values={lines} onChange={setLines} accent={palette.accent} accentBg={`${palette.accent}22`} />
            <FilterField label="Источник" options={allSources} value={source} onChange={setSource} accent={palette.accent} />
            <StatusTabs value={statusFilter} onChange={setStatusFilter} />
            {hasFilters && (
              <button onClick={() => { tactile(); clearFilters() }}
                style={{ marginTop: 2, padding: '11px', borderRadius: 12, background: 'rgba(176,48,64,0.10)', border: 'none', fontSize: 13, color: 'var(--color-red-text)', cursor: 'pointer', fontWeight: 600 }}>
                Сбросить фильтры
              </button>
            )}
          </div>
        </MobileSheet>

        {/* Sort sheet */}
        <MobileSheet open={sheet === 'sort'} onClose={() => setSheet(null)} title="Сортировка">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {SORT_OPTIONS.map(([mode, label]) => (
              <button key={mode} onClick={() => { tactile(); setSortMode(mode); setSheet(null) }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 14px', borderRadius: 12, border: 'none', cursor: 'pointer', background: sortMode === mode ? 'var(--color-purple-soft)' : 'transparent', color: sortMode === mode ? 'var(--color-accent)' : 'var(--color-text)', fontSize: 15, fontWeight: 600 }}>
                {label}
                {sortMode === mode && <CheckCircle2 size={18} />}
              </button>
            ))}
          </div>
        </MobileSheet>

        <MobileBottomNav />
      </>
    )
  }

  return (
    <div className="flex flex-col" style={{ gap: 16 }}>

      {/* Progress modal */}
      <AnimatePresence>
        {showProgressModal && (
          <ProgressModal
            tasks={subjectTasks}
            answered={answered}
            favorites={favorites}
            palette={palette}
            lineNames={lineNames}
            onClose={() => setShowProgressModal(false)}
            onRetryMistakes={() => { setShowWrongOnly(true); setWrongSimilarLines(new Set()); setShowProgressModal(false) }}
            onSimilarTasks={lines => { setWrongSimilarLines(new Set(lines)); setShowWrongOnly(false); setSections([]); setLines([]); setShowProgressModal(false) }}
          />
        )}
      </AnimatePresence>

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
              boxShadow: 'var(--shadow-filter)',
            }}
          >
            <span style={{
              width: 20, height: 20, borderRadius: '50%', background: 'var(--color-green-accent)',
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

      {/* Scroll-to-top button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            key="scroll-top"
            initial={{ opacity: 0, y: 20, scale: 0.82 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.88 }}
            transition={{ duration: 0.28, ease: [0.34, 1.56, 0.64, 1] }}
            onClick={() => (document.querySelector('.dashboard-main') as HTMLElement | null)?.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{
              position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
              zIndex: 9998,
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '11px 22px 11px 18px',
              borderRadius: 999,
              background: dark ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.72)',
              backdropFilter: 'blur(32px) saturate(180%)',
              WebkitBackdropFilter: 'blur(32px) saturate(180%)',
              border: dark ? '1px solid rgba(255,255,255,0.16)' : '1px solid rgba(255,255,255,0.9)',
              boxShadow: dark
                ? '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)'
                : '0 4px 20px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
              cursor: 'pointer', outline: 'none',
              color: 'var(--color-text)',
              fontSize: 13, fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowUp size={15} strokeWidth={2.5} />
            Наверх
          </motion.button>
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
      <div className="docked-pills-row" style={{ position: 'fixed', top: 30, left: 32, right: 32, zIndex: 80, pointerEvents: 'none' }}>
      <AnimatePresence>
        {docked && (
          <motion.div
            key="trainer-dock"
            className="flex items-center"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: [0, 6, -3.5, 1.5, -0.5, 0] }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.38, ease: [0.34, 1.56, 0.64, 1] }}
            style={{ gap: 12, pointerEvents: 'none' }}
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
      </div>

      {/* ── Separated layout: sticky left card + independent scrolling center ── */}
      <div className="flex flex-col lg:flex-row lg:items-start" style={{ gap: 20 }}>

        {/* Left sidebar — standalone sticky card.
            top must equal the card's natural flow offset inside the scroll pane
            (paddingTop 100 + the row's start ≈ 157px from the pane top → 57).
            If it's larger, sticky pins the card 3px BELOW its rest position, so
            it visibly twitches whenever the result list shrinks below the fold
            and the pane stops scrolling (sticky disengages back to flow). */}
        <div className="lg:sticky" style={{ top: 57, flexShrink: 0 }}>
        <aside className="flex flex-col" style={{
          width: 300, padding: 16, gap: 16,
          borderRadius: 24,
          background: 'rgba(var(--glass-rgb), 0.97)',
          border: '1px solid var(--color-border-glass)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        }}>

          {/* Subject gradient card — clicking it toggles between biology and chemistry */}
          <div
            onClick={() => { setSubjectPersist(subject === 'biology' ? 'chemistry' : 'biology'); resetOnSubject() }}
            style={{ padding: 16, borderRadius: 16, background: `linear-gradient(135deg, ${palette.accent}cc, ${palette.text}cc)`, color: '#fff', boxShadow: `0 18px 44px ${palette.ring}`, cursor: 'pointer', userSelect: 'none' }}
          >
            <div className="flex items-center" style={{ gap: 8, marginBottom: 10 }}>
              <BookOpen size={16} />
              <span style={{ fontSize: 12, fontWeight: 700 }}>Тренажёр ЕГЭ</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              {(['biology', 'chemistry'] as Subject[]).map(s => (
                <button key={s} onClick={e => { e.stopPropagation(); setSubjectPersist(s); resetOnSubject() }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    height: 28, padding: '0 12px', borderRadius: 999, border: '1.5px solid',
                    borderColor: subject === s ? 'var(--color-border-glass)' : 'var(--color-border-medium)',
                    background: subject === s ? 'rgba(255,255,255,0.22)' : 'transparent',
                    color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    whiteSpace: 'nowrap', lineHeight: 1, boxSizing: 'border-box',
                  }}>
                  {s === 'biology' ? 'Биология' : 'Химия'}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.45, color: 'rgba(255,255,255,0.88)' }}>
              Отработай все линии заданий<br />и подготовься к экзамену.
            </p>
          </div>

          {/* Filters card */}
          <div className="flex flex-col" style={{ padding: 16, borderRadius: 16, background: 'rgba(var(--glass-rgb), 0.94)', border: '1px solid var(--color-border-soft)', boxShadow: '0 8px 24px rgba(0,0,0,0.05)', gap: 12 }}>
            <div className="flex items-center" style={{ gap: 7 }}>
              <Filter size={15} style={{ color: palette.text }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Фильтры</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <MultiSelectField label="Раздел" options={sectionOptions} values={sections} onChange={setSections} accent={palette.accent} accentBg={`${palette.accent}22`} />
              <AnimatePresence>
                {sections.length > 0 && subject === 'biology' && (
                  <SuggestBox
                    section={sections[sections.length - 1]}
                    lineNames={lineNames}
                    onPickLine={v => { setLines(prev => prev.includes(v) ? prev : [...prev, v]) }}
                    accent={palette.accent}
                  />
                )}
              </AnimatePresence>
              <MultiSelectField label="Тема" options={topicOptions} values={topics} onChange={setTopics} accent={palette.accent} accentBg={`${palette.accent}22`} />
              <div style={{ display: 'flex', gap: 6 }}>
                {['1', '2'].map(p => {
                  const active = parts.includes(p)
                  const avail = availableParts.includes(p as '1' | '2')
                  return (
                  <button key={p} disabled={!avail} onClick={() => setParts(active ? parts.filter(x => x !== p) : [...parts, p])} style={{
                    flex: 1, padding: '9px 12px', borderRadius: 13, fontSize: 13, fontWeight: 600, cursor: avail ? 'pointer' : 'not-allowed',
                    background: active ? `${palette.accent}22` : 'var(--color-bg-input)',
                    border: 'none',
                    color: active ? palette.accent : 'var(--color-muted)',
                    opacity: avail ? 1 : 0.4,
                    transition: 'all 0.15s ease',
                  }}>
                    Часть {p}
                  </button>
                )})}
              </div>
              <MultiSelectField label="Линия" options={allLines} values={lines} onChange={setLines} accent={palette.accent} accentBg={`${palette.accent}22`} />
              <FilterField label="Источник" options={allSources}  value={source}  onChange={setSource} accent={palette.accent} />
            </div>
            {hasFilters && (
              <button onClick={clearFilters}
                style={{ padding: '8px 0', borderRadius: 12, background: 'rgba(176,48,64,0.10)', border: '1px solid rgba(176,48,64,0.18)', fontSize: 12, color: 'rgba(176,48,64,0.75)', cursor: 'pointer', fontWeight: 600 }}>
                Сбросить фильтры
              </button>
            )}
          </div>

        </aside>
        </div>

        {/* Center: search + tasks */}
        <main className="flex flex-col" style={{ flex: 1, minWidth: 0, gap: 18 }}>

          {/* Controls row */}
          <div className="flex items-center flex-wrap" style={{ gap: 10 }}>
            <div
              onClick={() => { setSearchOpen(true); searchInputRef.current?.focus(); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: 'rgba(var(--glass-rgb), 0.96)', border: `1px solid ${searchOpen || search ? 'var(--color-accent, #7c3aed)' : 'var(--color-border-medium)'}`, borderRadius: 999, width: searchOpen || search ? 260 : 112, transition: 'width 0.22s cubic-bezier(.4,0,.2,1), border-color 0.15s', overflow: 'hidden', cursor: searchOpen || search ? 'text' : 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', flexShrink: 0 }}>
              <Search size={14} style={{ color: searchOpen || search ? 'var(--color-text)' : 'var(--color-text-3)', flexShrink: 0 }} />
              <input
                ref={searchInputRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => { if (!search) setSearchOpen(false); }}
                placeholder={searchOpen || search ? 'Поиск по тексту или №...' : 'Поиск'}
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, background: 'transparent', color: 'var(--color-text)', minWidth: 0, width: searchOpen || search ? 'auto' : 0, pointerEvents: searchOpen || search ? 'auto' : 'none' }}
              />
              {search && <button onClick={e => { e.stopPropagation(); setSearch(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', fontSize: 15, lineHeight: 1, flexShrink: 0 }}>×</button>}
            </div>
            <StatusTabs value={statusFilter} onChange={setStatusFilter} />

            {/* Sort dropdown */}
            <SortDropdown value={sortMode} onChange={setSortMode} />

            <button onClick={() => setShowFavOnly(f => !f)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '10px 14px', borderRadius: 999, background: showFavOnly ? (dark ? 'rgba(248,239,140,0.18)' : 'rgba(248,239,140,0.28)') : 'rgba(var(--glass-rgb), 0.88)', border: `1px solid ${showFavOnly ? (dark ? 'rgba(248,239,140,0.45)' : 'rgba(248,239,140,0.55)') : 'var(--color-border-medium)'}`, fontSize: 12, cursor: 'pointer', color: showFavOnly ? (dark ? '#F4E97A' : '#8A7800') : 'var(--color-text-3)', fontWeight: showFavOnly ? 700 : 400 }}>
              <Bookmark size={13} fill={showFavOnly ? 'currentColor' : 'none'} />
              {showFavOnly ? `Избранное (${favorites.size})` : 'Избранное'}
            </button>


            <span style={{ marginLeft: 'auto', fontSize: 12, color: dark ? 'var(--color-text-3)' : 'var(--color-text-2)' }}>
              Всего: {filtered.length}
            </span>

          </div>

          {/* Tasks */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-3)', fontSize: 14 }}>
              Заданий не найдено — измените фильтры
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
