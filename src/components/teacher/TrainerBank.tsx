import { useState, useRef, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, X, Check, Image as ImageIcon, Key, ListChecks, Eye, EyeOff,
  ChevronDown, Search, Shuffle, AlertCircle, Trash2, Save,
  LayoutGrid, List, ArrowUpDown, Pencil,
} from 'lucide-react'
import {
  BIOLOGY_SECTIONS, CHEMISTRY_SECTIONS, BIOLOGY_TOPICS, CHEMISTRY_TOPICS, SOURCES,
  type Task, type QuestionType, type ScoreMode, type TaskChoice, type TaskAnswerKey, type TaskCriterion,
} from '../../data/taskBankData'
import { useTaskBank } from '../../store/taskBankStore'
import { useTeacher } from '../../store/teacherStore'

// ─── Copyable №-badge (glass tooltip) ────────────────────────────────────────
function CopyableIdBadge({ id }: { id: number }) {
  const [tipped, setTipped] = useState(false)
  function copy(e: React.MouseEvent) {
    e.stopPropagation()
    navigator.clipboard.writeText(`№${id}`)
    setTipped(true)
    setTimeout(() => setTipped(false), 1400)
  }
  return (
    <span onClick={copy} title="Скопировать номер"
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
      <span style={{ padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 800, background: '#FFE1E4', color: '#B03040' }}>№{id}</span>
      <AnimatePresence>
        {tipped && (
          <motion.span key="tip"
            initial={{ opacity: 0, scale: 0.78, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.78, y: 4 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
              pointerEvents: 'none', zIndex: 999,
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px 5px 7px', borderRadius: 999,
              background: 'rgba(255,255,255,0.22)',
              backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
              border: '1px solid rgba(255,255,255,0.55)',
              boxShadow: '0 4px 18px rgba(42,125,79,0.18), 0 1px 4px rgba(0,0,0,0.08)',
              whiteSpace: 'nowrap',
            }}>
            <span style={{
              width: 18, height: 18, borderRadius: '50%',
              background: 'linear-gradient(135deg, #34C877 0%, #2A7D4F 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
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

// ─── Shared filter shape ───────────────────────────────────────────────────────
export type TrainerFilters = {
  search: string; subject: string; section: string; topic: string; part: string; line: string; source: string
}
export const emptyTrainerFilters: TrainerFilters = {
  search: '', subject: '', section: '', topic: '', part: '', line: '', source: '',
}

type SortMode = 'newest' | 'oldest' | 'subject' | 'line'
type ViewMode = 'list' | 'grid'
const SORT_OPTS: [SortMode, string][] = [
  ['newest', 'Новые'], ['oldest', 'Старые'], ['subject', 'По предмету'], ['line', 'По линии'],
]

// ─── Helpers ────────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2)
const plBall = (n: number) => (n === 1 ? 'балл' : n >= 2 && n <= 4 ? 'балла' : 'баллов')

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '9px 12px', borderRadius: 11,
  border: '1.5px solid rgba(0,0,0,0.09)',
  fontSize: 13, color: '#0B0B0D',
  background: '#F9F9FB', outline: 'none',
  fontFamily: 'inherit', transition: 'border-color 0.15s',
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: '#9A9AA2', letterSpacing: 0.4, marginBottom: 5 }}>{children}</div>
}

// Default scoring derivation for a task that has none set yet.
function deriveQuestionType(t: Task): QuestionType { return t.questionType ?? (t.choices?.length ? 'choice' : 'free') }
function deriveScoreMode(t: Task): ScoreMode { return t.scoreMode ?? (t.criteria?.length ? 'criteria' : t.answerKeys?.length ? 'perOption' : 'whole') }
const defaultChoices = (): TaskChoice[] => [0, 1, 2, 3].map(i => ({ id: `c${i}`, text: '', correct: i === 0, points: i === 0 ? 1 : 0 }))

// The editable snapshot of a task — used both to seed state and to detect edits,
// so default-seeded fields (e.g. empty choices for a free question) don't read
// as "modified" on first render.
function editableOf(t: Task) {
  return {
    question: t.question, answer: t.answer, solution: t.solution, image: t.questionImage,
    qType: deriveQuestionType(t), scoreMode: deriveScoreMode(t),
    choices: t.choices ?? defaultChoices(),
    answerKeys: t.answerKeys ?? [], criteria: t.criteria ?? [],
    criteriaVisible: !!t.criteriaVisibleOnCheck, wholePoints: t.maxPoints ?? 1,
  }
}

// ─── Rich, editable question card ───────────────────────────────────────────────
export function BankQuestionCard({
  task, index, selected, onToggleSelected, onForkSelected, onDelete, showSelect = true, compact = false, accent = '#8B4900', accentBg = '#FFE4BD',
}: {
  task: Task
  index: number
  selected: boolean
  onToggleSelected: () => void
  onForkSelected: (newId: number) => void
  onDelete?: () => void
  showSelect?: boolean
  compact?: boolean
  accent?: string
  accentBg?: string
}) {
  const replaceTaskInBank = useTaskBank(s => s.replaceTask)
  const addTaskToBank = useTaskBank(s => s.addTask)
  const openEdit = useTeacher(s => s.openConstructorEditTask)

  const [reported, setReported] = useState(false)
  const [justSaved, setJustSaved] = useState<'' | 'replaced' | 'forked'>('')
  const [hovered, setHovered] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Editable copies
  const init = useMemo(() => editableOf(task), [task])
  const [question, setQuestion] = useState(init.question)
  const [answer, setAnswer] = useState(init.answer)
  const [solution, setSolution] = useState(init.solution)
  const [image, setImage] = useState<string | undefined>(init.image)
  const [qType, setQType] = useState<QuestionType>(init.qType)
  const [scoreMode, setScoreMode] = useState<ScoreMode>(init.scoreMode)
  const [choices, setChoices] = useState<TaskChoice[]>(init.choices)
  const [answerKeys, setAnswerKeys] = useState<TaskAnswerKey[]>(init.answerKeys)
  const [criteria, setCriteria] = useState<TaskCriterion[]>(init.criteria)
  const [criteriaVisible, setCriteriaVisible] = useState(init.criteriaVisible)
  const [wholePoints, setWholePoints] = useState(init.wholePoints)
  const [newKw, setNewKw] = useState(''); const [newKwPts, setNewKwPts] = useState(1)
  const [newCrit, setNewCrit] = useState(''); const [newCritPts, setNewCritPts] = useState(1)

  const correctIdx = Math.max(0, choices.findIndex(c => c.correct))
  const critTotal = criteria.reduce((s, c) => s + c.points, 0)
  const keyTotal = answerKeys.reduce((s, k) => s + k.points, 0)
  const computedMax =
    scoreMode === 'whole' ? wholePoints
    : scoreMode === 'criteria' ? critTotal
    : qType === 'choice' ? (choices[correctIdx]?.points ?? 0)
    : keyTotal

  const current = { question, answer, solution, image, qType, scoreMode, choices, answerKeys, criteria, criteriaVisible, wholePoints }
  const dirty = JSON.stringify(current) !== JSON.stringify(init)

  function patch(): Partial<Task> {
    const derivedAnswer = qType === 'choice' ? (choices[correctIdx]?.text || answer) : answer
    return {
      question, answer: derivedAnswer, solution, questionImage: image,
      questionType: qType, scoreMode, maxPoints: computedMax,
      choices: qType === 'choice' ? choices : undefined,
      answerKeys: qType === 'free' && scoreMode === 'perOption' ? answerKeys : undefined,
      criteria: scoreMode === 'criteria' ? criteria : undefined,
      criteriaVisibleOnCheck: scoreMode === 'criteria' ? criteriaVisible : undefined,
    }
  }

  function flash(kind: 'replaced' | 'forked') { setJustSaved(kind); setTimeout(() => setJustSaved(''), 1800) }

  // "Заменить" — overwrite this number in the shared bank → propagates everywhere
  // it's referenced (homeworks, student trainer, other trainers).
  function doReplace() { replaceTaskInBank(task.id, patch()); flash('replaced') }

  // "Сохранить как новый" — fork a brand-new searchable number, leaving the
  // original untouched. If this card is in the trainer, swap selection over.
  function doSaveAsNew() {
    const { id: _omit, ...rest } = task
    const newId = addTaskToBank({ ...rest, ...patch() } as Omit<Task, 'id'>)
    if (selected) onForkSelected(newId)
    flash('forked')
  }

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) setImage(URL.createObjectURL(f))
    e.target.value = ''
  }


  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'flex', flexDirection: 'column', gap: compact ? 0 : 12,
        padding: compact ? '10px 14px' : 18, borderRadius: compact ? 14 : 22,
        background: 'rgba(255,255,255,0.97)',
        border: selected ? `1.5px solid ${accent}` : dirty ? '1.5px solid rgba(123,63,204,0.3)' : '1px solid rgba(0,0,0,0.06)',
        boxShadow: compact ? '0 1px 4px rgba(0,0,0,0.04)' : '0 6px 20px rgba(0,0,0,0.04)', transition: 'border-color 0.2s',
      }}>
      {compact ? (
        /* ── Compact row ── */
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <CopyableIdBadge id={task.id} />
            <span style={{ padding: '2px 6px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: 'rgba(0,0,0,0.05)', color: '#6F6F76' }}>{task.line} лин.</span>
            {dirty && <span style={{ padding: '2px 6px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: '#EEDBFF', color: '#7B3FCC' }}>изм.</span>}
          </div>
          <p style={{ flex: 1, minWidth: 0, margin: 0, fontSize: 13, fontWeight: 600, color: '#0B0B0D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {task.question.split('\n')[0] || <span style={{ color: '#C2C2C8' }}>Без текста</span>}
          </p>
          <span style={{ flexShrink: 0, fontSize: 11, color: '#B5B5BC', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.topic}</span>
          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            <button onClick={() => openEdit(task.id)} style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, cursor: 'pointer',
              background: '#F4F4F6', color: '#6F6F76', border: 'none', fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
            }}>Изменить</button>
            {onDelete && (
              <button onClick={onDelete} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, cursor: 'pointer',
                background: '#FFF0F0', color: '#c0303a', border: 'none',
              }}><Trash2 size={13} /></button>
            )}
          </div>
        </div>
      ) : (
        /* ── Full header ── */
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: accent }}>Вопрос {index + 1}</span>
              <span style={{ fontSize: 11, color: '#BDBDC2' }}>·</span>
              <CopyableIdBadge id={task.id} />
              <span style={{ padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: 'rgba(0,0,0,0.05)', color: '#6F6F76' }}>{task.line} линия</span>
              <span style={{ padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: 'rgba(0,0,0,0.05)', color: '#6F6F76' }}>Часть {task.part}</span>
              <span style={{ padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: accentBg, color: accent }}>{computedMax} {plBall(computedMax)}</span>
              {dirty && <span style={{ padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: '#EEDBFF', color: '#7B3FCC' }}>изменено</span>}
            </div>
            <p style={{ fontSize: 14.5, lineHeight: 1.4, fontWeight: 650, color: '#0B0B0D', margin: 0, whiteSpace: 'pre-wrap' }}>
              {question || <span style={{ color: '#C2C2C8' }}>Без текста</span>}
            </p>
          </div>
          {showSelect && (
            <button onClick={onToggleSelected} title={selected ? 'Убрать из тренажёра' : 'Добавить в тренажёр'}
              style={{
                flexShrink: 0, padding: '8px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: selected ? accentBg : 'linear-gradient(135deg, #9B6DFF 0%, #7B3FCC 100%)',
                color: selected ? accent : '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5,
                boxShadow: selected ? 'none' : '0 3px 12px rgba(123,63,204,0.3)', whiteSpace: 'nowrap',
              }}>
              {selected ? <><Check size={12} /> В тренажёре</> : <><Plus size={12} /> В тренажёр</>}
            </button>
          )}
        </div>
      )}

      {/* Table (read-only) */}
      {!compact && task.questionTable && (
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.09)', alignSelf: 'flex-start', maxWidth: '100%' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>{task.questionTable.headers.map(h => (
              <th key={h} style={{ borderBottom: '1px solid rgba(0,0,0,0.09)', borderRight: '1px solid rgba(0,0,0,0.08)', padding: '8px 14px', fontWeight: 700, background: 'rgba(0,0,0,0.03)', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
            ))}</tr></thead>
            <tbody>{task.questionTable.rows.map((row, ri) => (
              <tr key={ri}>{row.map((cell, ci) => (
                <td key={ci} style={{ borderTop: ri > 0 ? '1px solid rgba(0,0,0,0.07)' : undefined, borderRight: '1px solid rgba(0,0,0,0.07)', padding: '8px 14px' }}>{cell}</td>
              ))}</tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {/* Image preview */}
      {!compact && image && (
        <div style={{ position: 'relative', alignSelf: 'flex-start', maxWidth: 240 }}>
          <img src={image} alt="" style={{ maxWidth: 240, maxHeight: 160, borderRadius: 12, display: 'block', border: '1px solid rgba(0,0,0,0.08)' }} />
        </div>
      )}

      {/* Collapsed answer summary */}
      {!compact && (
        <div style={{ padding: '10px 14px', background: '#F0FBF4', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#1a7a3f', flexShrink: 0 }}>Ответ:</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#0B0B0D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{answer || '—'}</span>
        </div>
      )}


      {/* Footer: source (full mode only) */}
      {!compact && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 2 }}>
          <span style={{ fontSize: 11, color: '#B5B5BC', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.section} → {task.topic} · {task.source}</span>
        </div>
      )}

      {/* Hover icon buttons — top-right corner (full mode only) */}
      {!compact && (
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              style={{ position: 'absolute', top: 14, right: 14, display: 'flex', gap: 5, zIndex: 2 }}
            >
              <button onClick={() => openEdit(task.id)} title="Изменить"
                style={{ width: 28, height: 28, borderRadius: 9, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F0F3', color: '#6F6F76' }}>
                <Pencil size={12} />
              </button>
              {onDelete && (
                <button onClick={onDelete} title="Удалить"
                  style={{ width: 28, height: 28, borderRadius: 9, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFF0F0', color: '#c0303a' }}>
                  <Trash2 size={12} />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  )
}

// Reusable add/remove rubric list (answer keys & criteria share the shape)
function KeyRubric({
  icon, title, numbered, rows, onRemove, newText, setNewText, newPts, setNewPts, onAdd, placeholder, accent, accentBg, emptyHint,
}: {
  icon: React.ReactNode; title: string; numbered?: boolean
  rows: { id: string; text: string; points: number }[]
  onRemove: (id: string) => void
  newText: string; setNewText: (v: string) => void; newPts: number; setNewPts: (v: number) => void
  onAdd: () => void; placeholder: string; accent: string; accentBg: string; emptyHint: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{icon}<Label>{title}</Label></div>
      {rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rows.map((r, idx) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 12, background: '#fff', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              {numbered
                ? <span style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, background: accentBg, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{idx + 1}</span>
                : <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: accent, opacity: 0.7 }} />}
              <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#0B0B0D' }}>{r.text}</div>
              <div style={{ padding: '3px 10px', borderRadius: 8, background: accentBg, color: accent, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>+{r.points} {plBall(r.points)}</div>
              <button onClick={() => onRemove(r.id)} style={iconBtn('#FFE1E4', '#c0303a')}><X size={10} /></button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}><Label>{numbered ? 'Критерий' : 'Ключевое слово'}</Label>
          <input value={newText} onChange={e => setNewText(e.target.value)} onKeyDown={e => e.key === 'Enter' && onAdd()} placeholder={placeholder} style={inputStyle} />
        </div>
        <div style={{ width: 76 }}><Label>Баллов</Label>
          <input type="number" min={1} value={newPts} onChange={e => setNewPts(Number(e.target.value))} style={inputStyle} />
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={onAdd} style={{ height: 38, width: 38, borderRadius: 12, border: 'none', cursor: 'pointer', background: accentBg, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Plus size={16} strokeWidth={2.4} />
        </motion.button>
      </div>
      {rows.length === 0 && (
        <div style={{ padding: 14, borderRadius: 12, border: '1.5px dashed rgba(0,0,0,0.12)', textAlign: 'center', fontSize: 12, color: '#9A9AA2' }}>{emptyHint}</div>
      )}
    </div>
  )
}

function segStyle(active: boolean, color: string, bg: string): React.CSSProperties {
  return {
    padding: '9px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
    background: active ? bg : '#F0F0F3', color: active ? color : '#6F6F76',
    fontSize: 13, fontWeight: 600, boxShadow: active ? `0 0 0 1.5px ${color}44` : 'none', transition: 'all 0.15s', fontFamily: 'inherit',
  }
}
function iconBtn(bg: string, color: string): React.CSSProperties {
  return { width: 22, height: 22, borderRadius: 7, border: 'none', cursor: 'pointer', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }
}

// ─── Compact grid tile (4 per row) ──────────────────────────────────────────────
function BankGridCard({
  task, selected, onToggleSelected, onForkSelected, onDelete, showSelect, accent, accentBg, isNew,
}: {
  task: Task; selected: boolean; isNew?: boolean
  onToggleSelected: () => void; onForkSelected: (newId: number) => void
  onDelete?: () => void; showSelect: boolean; accent: string; accentBg: string
}) {
  const openEdit = useTeacher(s => s.openConstructorEditTask)
  const [hovered, setHovered] = useState(false)
  const subjectLabel = task.subject === 'biology' ? 'Биол.' : 'Хим.'
  const subjectBg = task.subject === 'biology' ? '#DFF8D6' : '#EEDBFF'
  const subjectColor = task.subject === 'biology' ? '#1a7a3f' : '#7B3FCC'
  const showActions = hovered

  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      animate={isNew ? {
        boxShadow: ['0 0 0 0px rgba(123,63,204,0)', '0 0 0 3px rgba(123,63,204,0.35)', '0 0 0 0px rgba(123,63,204,0)'],
        borderColor: [undefined, '#9B6DFF', undefined],
      } : {}}
      transition={{ duration: 1.2, ease: 'easeOut' }}
      style={{
        position: 'relative',
        display: 'flex', flexDirection: 'column', gap: 8, padding: 12, borderRadius: 16,
        background: isNew ? 'rgba(238,219,255,0.18)' : 'rgba(255,255,255,0.97)',
        border: selected ? `1.5px solid ${accent}` : '1px solid rgba(0,0,0,0.07)',
        boxShadow: '0 3px 10px rgba(0,0,0,0.05)', height: '100%', boxSizing: 'border-box',
        transition: 'background 0.4s ease',
      }}
    >
      {/* Icon buttons — top-right corner, fade in on hover */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4, zIndex: 2 }}
          >
            {showSelect && (
              <button onClick={onToggleSelected} title={selected ? 'Убрать из тренажёра' : 'Добавить в тренажёр'}
                style={{ width: 26, height: 26, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: selected ? accentBg : 'linear-gradient(135deg, #9B6DFF, #7B3FCC)', color: selected ? accent : '#fff' }}>
                {selected ? <Check size={11} strokeWidth={3} /> : <Plus size={11} strokeWidth={3} />}
              </button>
            )}
            <button onClick={() => openEdit(task.id)} title="Изменить"
              style={{ width: 26, height: 26, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F0F3', color: '#6F6F76' }}>
              <Pencil size={11} />
            </button>
            {onDelete && (
              <button onClick={onDelete} title="Удалить"
                style={{ width: 26, height: 26, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFF0F0', color: '#c0303a' }}>
                <Trash2 size={11} />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Badge row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        <CopyableIdBadge id={task.id} />
        <span style={{ padding: '2px 6px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: subjectBg, color: subjectColor }}>{subjectLabel}</span>
        <span style={{ padding: '2px 6px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: 'rgba(0,0,0,0.05)', color: '#6F6F76' }}>{task.line} лин.</span>
      </div>

      {/* Question preview */}
      <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, lineHeight: 1.4, color: '#0B0B0D', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {task.question.split('\n')[0] || <span style={{ color: '#C2C2C8' }}>Без текста</span>}
      </p>

      {/* Topic */}
      <span style={{ fontSize: 10.5, color: '#9A9AA2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 'auto' }}>{task.topic}</span>

    </motion.div>
  )
}

// ─── Custom sort dropdown ────────────────────────────────────────────────────────
function BankSortDropdown({ value, onChange }: { value: SortMode; onChange: (v: SortMode) => void }) {
  const [open, setOpen] = useState(false)
  const label = SORT_OPTS.find(([v]) => v === value)?.[1] ?? 'Новые'
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999,
          background: open ? '#fff' : 'rgba(255,255,255,0.9)',
          border: `1px solid ${open ? 'rgba(0,0,0,0.14)' : 'rgba(0,0,0,0.09)'}`,
          fontSize: 12, fontWeight: 600, color: '#0B0B0D', cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <ArrowUpDown size={12} style={{ color: '#9A9AA2' }} />
        {label}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: '#9A9AA2', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.12 }}
          style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 6, zIndex: 50, minWidth: 160,
            background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.8)', borderRadius: 14,
            boxShadow: '0 12px 32px rgba(0,0,0,0.12)', padding: 5,
          }}
        >
          {SORT_OPTS.map(([val, lbl]) => (
            <button key={val}
              onMouseDown={e => { e.preventDefault(); onChange(val); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                width: '100%', padding: '9px 10px', borderRadius: 9, border: 'none',
                background: value === val ? 'rgba(123,63,204,0.07)' : 'transparent',
                fontSize: 13, fontWeight: value === val ? 700 : 400, color: '#0B0B0D',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(123,63,204,0.07)' }}
              onMouseLeave={e => { e.currentTarget.style.background = value === val ? 'rgba(123,63,204,0.07)' : 'transparent' }}
            >
              {lbl}
              {value === val && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#7B3FCC" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  )
}

// ─── Browser (filtered list of cards) ───────────────────────────────────────────
export function TrainerBankBrowser({
  filters, selectedIds, onToggleSelected, onForkSelected, onDeleteTask, showSelect = true, compact = false, accent = '#8B4900', accentBg = '#FFE4BD',
}: {
  filters: TrainerFilters
  selectedIds: Set<number>
  onToggleSelected: (id: number) => void
  onForkSelected: (oldId: number, newId: number) => void
  onDeleteTask?: (id: number) => void
  showSelect?: boolean
  compact?: boolean
  accent?: string
  accentBg?: string
}) {
  const tasks = useTaskBank(s => s.tasks)
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [newlyAddedId, setNewlyAddedId] = useState<number | null>(null)
  const prevTaskIds = useRef<Set<number>>(new Set(tasks.map(t => t.id)))

  // Detect newly added task and flash it for 2s
  useEffect(() => {
    const currentIds = new Set(tasks.map(t => t.id))
    for (const id of currentIds) {
      if (!prevTaskIds.current.has(id)) {
        setNewlyAddedId(id)
        setTimeout(() => setNewlyAddedId(null), 2000)
        break
      }
    }
    prevTaskIds.current = currentIds
  }, [tasks])

  const filtered = useMemo(() => {
    let list = tasks.filter(t => {
      if (filters.subject && t.subject !== filters.subject) return false
      if (filters.section && t.section !== filters.section) return false
      if (filters.topic && t.topic !== filters.topic) return false
      if (filters.part && t.part !== Number(filters.part)) return false
      if (filters.line && t.line !== Number(filters.line)) return false
      if (filters.source && t.source !== filters.source) return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (!t.question.toLowerCase().includes(q) && !t.topic.toLowerCase().includes(q) && !t.section.toLowerCase().includes(q) && !String(t.id).includes(q)) return false
      }
      return true
    })
    return [...list].sort((a, b) => {
      switch (sortMode) {
        case 'oldest':     return a.id - b.id
        case 'subject':    return a.subject.localeCompare(b.subject) || a.id - b.id
        case 'line':       return a.line - b.line || a.id - b.id
        default:           return b.id - a.id
      }
    })
  }, [tasks, filters, sortMode])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Controls bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <BankSortDropdown value={sortMode} onChange={setSortMode} />
        <div style={{ display: 'flex', padding: 2, borderRadius: 9, background: '#F0F0F3', gap: 2 }}>
          {([['grid', <LayoutGrid size={13} />], ['list', <List size={13} />]] as const).map(([mode, icon]) => (
            <button key={mode} onClick={() => setViewMode(mode as ViewMode)} style={{
              padding: '5px 8px', borderRadius: 7, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
              background: viewMode === mode ? '#fff' : 'transparent', color: viewMode === mode ? '#0B0B0D' : '#9A9AA2',
              boxShadow: viewMode === mode ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.14s',
            }}>{icon}</button>
          ))}
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9A9AA2' }}>{filtered.length} заданий</span>
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#C2C2C8', fontSize: 13 }}>Нет заданий по выбранным фильтрам</div>
      )}

      {viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {filtered.map(t => (
            <BankGridCard key={t.id} task={t}
              selected={selectedIds.has(t.id)}
              onToggleSelected={() => onToggleSelected(t.id)}
              onForkSelected={newId => onForkSelected(t.id, newId)}
              onDelete={onDeleteTask ? () => onDeleteTask(t.id) : undefined}
              showSelect={showSelect} accent={accent} accentBg={accentBg}
              isNew={t.id === newlyAddedId} />
          ))}
        </div>
      ) : (
        filtered.map((t, i) => (
          <BankQuestionCard key={t.id} task={t} index={i}
            selected={selectedIds.has(t.id)}
            onToggleSelected={() => onToggleSelected(t.id)}
            onForkSelected={newId => onForkSelected(t.id, newId)}
            onDelete={onDeleteTask ? () => onDeleteTask(t.id) : undefined}
            showSelect={showSelect} compact={false} accent={accent} accentBg={accentBg} />
        ))
      )}
    </div>
  )
}

// ─── Filter panel (right rail) ──────────────────────────────────────────────────
export function TrainerBankFilterPanel({
  filters, onChange, accent = '#8B4900', accentBg = '#FFE4BD',
}: {
  filters: TrainerFilters
  onChange: (f: Partial<TrainerFilters>) => void
  accent?: string
  accentBg?: string
}) {
  const tasks = useTaskBank(s => s.tasks)
  const sections = filters.subject === 'chemistry' ? CHEMISTRY_SECTIONS : BIOLOGY_SECTIONS
  const topicsMap = filters.subject === 'chemistry' ? CHEMISTRY_TOPICS : BIOLOGY_TOPICS
  const topicOptions = filters.section ? (topicsMap[filters.section] ?? []) : Object.values(topicsMap).flat()
  const allLines = [...new Set(tasks.filter(t => !filters.subject || t.subject === filters.subject).map(t => t.line))].sort((a, b) => a - b).map(String)
  const hasFilters = !!(filters.section || filters.topic || filters.part || filters.line || filters.source)

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.22 }}
      style={{
        width: 264, flexShrink: 0, alignSelf: 'flex-start', position: 'sticky', top: 20,
        background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(16px) saturate(180%)', WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.9)', borderRadius: 18, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', padding: 16,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}
    >
      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Search size={15} style={{ color: accent }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: '#0B0B0D' }}>Фильтры</span>
      </div>
      <div style={{ position: 'relative' }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9A9AA2' }} />
        <input value={filters.search} onChange={e => onChange({ search: e.target.value })} placeholder="Поиск по тексту или №…"
          style={{ ...inputStyle, paddingLeft: 30 }} />
      </div>

      {/* Subject pills */}
      <div style={{ display: 'flex', gap: 6 }}>
        {([['', 'Все'], ['biology', 'Биология'], ['chemistry', 'Химия']] as [string, string][]).map(([v, l]) => (
          <button key={v} onClick={() => onChange({ subject: v, section: '', topic: '', line: '' })}
            style={{ flex: 1, padding: '7px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
              background: filters.subject === v ? accentBg : '#F0F0F3', color: filters.subject === v ? accent : '#6F6F76' }}>{l}</button>
        ))}
      </div>

      <FilterField label="Раздел" value={filters.section} options={sections} onChange={v => onChange({ section: v, topic: '' })} />
      <FilterField label="Тема" value={filters.topic} options={topicOptions} onChange={v => onChange({ topic: v })} />
      <FilterField label="Часть" value={filters.part} options={['1', '2']} onChange={v => onChange({ part: v })} />
      <FilterField label="Линия" value={filters.line} options={allLines} onChange={v => onChange({ line: v })} />
      <FilterField label="Источник" value={filters.source} options={SOURCES} onChange={v => onChange({ source: v })} />

      {hasFilters && (
        <button onClick={() => onChange({ section: '', topic: '', part: '', line: '', source: '' })}
          style={{ padding: '8px 0', borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#6F6F76', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Trash2 size={12} /> Сбросить фильтры
        </button>
      )}

      <div style={{ fontSize: 11, color: '#9A9AA2', textAlign: 'center', paddingTop: 2 }}>{tasks.length} заданий в базе</div>
    </motion.div>
  )
}

function FilterField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <div style={{ position: 'relative' }}>
        <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, appearance: 'none', cursor: 'pointer', color: value ? '#0B0B0D' : '#9A9AA2' }}>
          <option value="">— любой —</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#9A9AA2', pointerEvents: 'none' }} />
      </div>
    </div>
  )
}
