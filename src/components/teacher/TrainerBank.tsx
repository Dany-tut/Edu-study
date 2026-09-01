import { useState, useRef, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, X, Check, Image as ImageIcon, Key, ListChecks, Eye, EyeOff,
  ChevronDown, Search, Shuffle, AlertCircle, Trash2, Save,
  LayoutGrid, List, ArrowUpDown, Pencil, Zap, Clock, Database,
} from 'lucide-react'
import TeacherSelect from './TeacherSelect'
import {
  SOURCES, linesForSelection, sectionsForSubject, topicsForSubject,
  type Task, type Subject, type QuestionType, type ScoreMode, type TaskChoice, type TaskAnswerKey, type TaskCriterion,
} from '../../data/taskBankData'
import { useStickyLift } from '../../lib/useStickyLift'
import { useTaskBank } from '../../store/taskBankStore'
import { useTeacher } from '../../store/teacherStore'
import { useTeacherAccess } from '../../lib/teacherAccess'
import { bankSubjectIdsFor, subjectIcon, allowedSubjectDefs } from '../../lib/subjects'
import { languageTaxonomy, type TaskLanguageTags } from '../../data/languageTaxonomy'
import { subjectTheme } from '../../lib/theme'
import { useTheme } from '../../store/themeStore'
import SubjectPicker from './SubjectPicker'
import { useCurriculum } from '../../store/curriculumStore'
import { useOptionMerger, sectionScope, topicScope, SOURCE_SCOPE } from '../../store/taskMetaStore'
import { cardChip, cardChipTone } from '../../lib/pillStyles'
import { copyToClipboard } from '../../lib/clipboard'
import MultiSelectField from '../MultiSelectField'
import { useScrollLock } from '../../lib/useScrollLock'
import { useT, t } from '../../lib/i18n'

// ─── Copyable №-badge (glass tooltip) ────────────────────────────────────────
function CopyableIdBadge({ id }: { id: number }) {
  const t = useT()
  const [tipped, setTipped] = useState(false)
  function copy(e: React.MouseEvent) {
    e.stopPropagation()
    void copyToClipboard(`№${id}`)
    setTipped(true)
    setTimeout(() => setTipped(false), 1400)
  }
  return (
    <span onClick={copy} title={t('Скопировать номер')}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
      <span style={cardChipTone('red')}>№{id}</span>
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
              background: 'rgba(var(--glass-rgb), 0.22)',
              backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
              border: '1px solid var(--color-border-glass)',
              boxShadow: '0 4px 18px rgba(42,125,79,0.18), 0 1px 4px rgba(0,0,0,0.08)',
              whiteSpace: 'nowrap',
            }}>
            <span style={{
              width: 18, height: 18, borderRadius: '50%',
              background: 'var(--grad-green)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: '0 2px 6px rgba(42,125,79,0.35)',
            }}>
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                <path d="M1.5 4.5l2.2 2.2 3.3-3.7" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-green-text)', letterSpacing: 0.1 }}>{t('Скопировано')}</span>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}

// ─── Copyable line-badge ──────────────────────────────────────────────────────
function CopyableLineBadge({ line, accent, accentBg }: { line: number; accent: string; accentBg: string }) {
  const t = useT()
  const [tipped, setTipped] = useState(false)
  function copy(e: React.MouseEvent) {
    e.stopPropagation()
    void copyToClipboard(`№${line}`)
    setTipped(true)
    setTimeout(() => setTipped(false), 1400)
  }
  return (
    <span onClick={copy} title={t('Скопировать линию')}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
      <span style={cardChip(accent)}>
        {line} {t('лин.')}
      </span>
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
              background: 'rgba(var(--glass-rgb), 0.22)',
              backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
              border: '1px solid var(--color-border-glass)',
              boxShadow: '0 4px 18px rgba(42,125,79,0.18), 0 1px 4px rgba(0,0,0,0.08)',
              whiteSpace: 'nowrap',
            }}>
            <span style={{
              width: 18, height: 18, borderRadius: '50%',
              background: 'var(--grad-green)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: '0 2px 6px rgba(42,125,79,0.35)',
            }}>
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                <path d="M1.5 4.5l2.2 2.2 3.3-3.7" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-green-text)', letterSpacing: 0.1 }}>{t('Скопировано')}</span>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}

// ─── Shared filter shape ───────────────────────────────────────────────────────
export type TrainerFilters = {
  search: string; subject: string; sections: string[]; topics: string[]; parts: string[]; lines: string[]; source: string
  // Языковая разметка (task_bank.payload): у языкового предмета нет ни раздела
  // ЕГЭ, ни части, ни линии — отбор идёт по уровню и навыку. Поля
  // необязательные, чтобы не ломать вторую копию типа в создании ДЗ.
  levels?: string[]; skills?: string[]
}
export const emptyTrainerFilters: TrainerFilters = {
  search: '', subject: '', sections: [], topics: [], parts: [], lines: [], source: '', levels: [], skills: [],
}

/** Что показывает банк: сами задания или их разметку (разделы, темы, части,
 *  линии). Разметка — настройка банка, поэтому и живёт рядом с его отбором. */
export type BankView = 'tasks' | 'map'

type SortMode = 'newest' | 'oldest' | 'subject' | 'line'
type ViewMode = 'list' | 'grid'
const SORT_OPTS: [SortMode, string][] = [
  ['newest', 'Новые'], ['oldest', 'Старые'], ['subject', 'По предмету'], ['line', 'По линии'],
]

// ─── Helpers ────────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2)
const plBall = (n: number) => (n === 1 ? t('балл') : n >= 2 && n <= 4 ? t('балла') : t('баллов'))

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '9px 12px', borderRadius: 11,
  border: 'none',
  fontSize: 13, color: 'var(--color-text)',
  background: 'var(--color-bg-2)', outline: 'none',
  fontFamily: 'inherit',
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.4, marginBottom: 5 }}>{children}</div>
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
    difficulty: t.difficulty ?? 'medium',
  }
}

// ─── Rich, editable question card ───────────────────────────────────────────────
export function BankQuestionCard({
  task, index, selected, onToggleSelected, onForkSelected, onDelete, showSelect = true, compact = false, accent = 'var(--color-peach-text)', accentBg = 'var(--color-peach-soft)', isEdited = false,
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
  isEdited?: boolean
}) {
  const t = useT()
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
  const [difficulty, setDifficulty] = useState<Task['difficulty']>(init.difficulty)
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

  const current = { question, answer, solution, image, qType, scoreMode, choices, answerKeys, criteria, criteriaVisible, wholePoints, difficulty }
  const dirty = JSON.stringify(current) !== JSON.stringify(init)

  function patch(): Partial<Task> {
    const derivedAnswer = qType === 'choice' ? (choices[correctIdx]?.text || answer) : answer
    return {
      question, answer: derivedAnswer, solution, questionImage: image, difficulty,
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
  async function doSaveAsNew() {
    const { id: _omit, ...rest } = task
    const newId = await addTaskToBank({ ...rest, ...patch() } as Omit<Task, 'id'>)
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
      animate={isEdited ? {
        boxShadow: ['0 0 0 0px rgba(99,84,207,0)', '0 0 0 3px rgba(99,84,207,0.5)', '0 0 0 3px rgba(99,84,207,0.5)', '0 0 0 0px rgba(99,84,207,0)'],
      } : {}}
      transition={isEdited ? { duration: 2, ease: 'easeOut', times: [0, 0.1, 0.8, 1] } : {}}
      style={{
        position: 'relative',
        display: 'flex', flexDirection: 'column', gap: compact ? 0 : 12,
        padding: compact ? '10px 14px' : 18, borderRadius: compact ? 16 : 22,
        background: isEdited ? 'rgba(238,219,255,0.22)' : 'rgba(var(--glass-rgb), 0.97)',
        border: isEdited ? '1.5px solid var(--color-purple)' : selected ? `1.5px solid ${accent}` : dirty ? '1.5px solid rgba(99,84,207,0.3)' : '1px solid var(--color-border-glass)',
        boxShadow: compact ? '0 1px 6px rgba(0,0,0,0.05)' : '0 6px 20px rgba(0,0,0,0.04)', transition: 'border-color 0.2s',
      }}>
      {compact ? (
        /* ── Compact row ── */
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <CopyableIdBadge id={task.id} />
            <span style={cardChipTone('neutral')}>{task.line} лин.</span>
            {dirty && <span style={cardChipTone('purple')}>{t('изм.')}</span>}
          </div>
          <p style={{ flex: 1, minWidth: 0, margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {task.question.split('\n')[0] || <span style={{ color: 'var(--color-text-4)' }}>{t('Без текста')}</span>}
          </p>
          <span style={{ flexShrink: 0, fontSize: 11, color: 'var(--color-text-5)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.topic}</span>
          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            <button onClick={() => openEdit(task.id)} style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, cursor: 'pointer',
              background: 'var(--color-bg-3)', color: 'var(--color-muted)', border: 'none', fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
            }}>{t('Изменить')}</button>
            {onDelete && (
              <button onClick={onDelete} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, cursor: 'pointer',
                background: 'var(--color-red-soft)', color: 'var(--color-red-text)', border: 'none',
              }}><Trash2 size={13} /></button>
            )}
          </div>
        </div>
      ) : (
        /* ── Full header ── */
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: accent }}>{t('Вопрос')} {index + 1}</span>
              <span style={{ fontSize: 11, color: '#BDBDC2' }}>·</span>
              <CopyableIdBadge id={task.id} />
              <span style={cardChipTone('neutral')}>{task.line} {t('линия')}</span>
              <span style={cardChipTone('neutral')}>{t('Часть')} {task.part}</span>
              <span style={cardChip(accent)}>{computedMax} {plBall(computedMax)}</span>
              {dirty && <span style={cardChipTone('purple')}>{t('изменено')}</span>}
            </div>
            <p style={{ fontSize: 14.5, lineHeight: 1.4, fontWeight: 650, color: 'var(--color-text)', margin: 0, whiteSpace: 'pre-wrap' }}>
              {question || <span style={{ color: 'var(--color-text-4)' }}>{t('Без текста')}</span>}
            </p>
          </div>
          {showSelect && (
            <button onClick={onToggleSelected} title={selected ? t('Убрать из тренажёра') : t('Добавить в тренажёр')}
              style={{
                flexShrink: 0, padding: '8px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: selected ? accentBg : 'var(--grad-purple)',
                color: selected ? accent : '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5,
                boxShadow: selected ? 'none' : '0 3px 12px rgba(99,84,207,0.3)', whiteSpace: 'nowrap',
              }}>
              {selected ? <><Check size={12} /> {t('В тренажёре')}</> : <><Plus size={12} /> {t('В тренажёр')}</>}
            </button>
          )}
        </div>
      )}

      {/* Table (read-only) */}
      {!compact && task.questionTable && (
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--color-border-medium)', alignSelf: 'flex-start', maxWidth: '100%' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%' }}>
            <thead><tr>{task.questionTable.headers.map((h, hi, arr) => (
              <th key={h} style={{ borderBottom: '1px solid var(--color-border-medium)', borderRight: hi < arr.length - 1 ? '1px solid var(--color-border-medium)' : undefined, padding: '10px 14px', fontWeight: 700, background: 'var(--color-table-header-bg)', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
            ))}</tr></thead>
            <tbody>{task.questionTable.rows.map((row, ri) => (
              <tr key={ri} style={{ background: ri % 2 === 1 ? 'rgba(0,0,0,0.02)' : undefined }}>{row.map((cell, ci) => (
                <td key={ci} style={{ borderTop: '1px solid var(--color-border)', borderRight: ci < row.length - 1 ? '1px solid var(--color-border)' : undefined, padding: '8px 14px', color: 'var(--color-text)' }}>{cell}</td>
              ))}</tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {/* Image preview */}
      {!compact && image && (
        <div style={{ position: 'relative', alignSelf: 'flex-start', maxWidth: 240 }}>
          <img src={image} alt="" style={{ maxWidth: 240, maxHeight: 160, borderRadius: 12, display: 'block', border: '1px solid var(--color-border-medium)' }} />
        </div>
      )}

      {/* Collapsed answer summary */}
      {!compact && (
        <div style={{ padding: '10px 14px', background: 'var(--color-green-soft)', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-green-text)', flexShrink: 0 }}>{t('Ответ:')}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{answer || '—'}</span>
        </div>
      )}


      {/* Footer: source (full mode only) */}
      {!compact && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 2 }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-5)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.section} → {task.topic} · {task.source}</span>
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
              <button onClick={() => openEdit(task.id)} title={t('Изменить')}
                style={{ width: 28, height: 28, borderRadius: 9, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-3)', color: 'var(--color-muted)' }}>
                <Pencil size={12} />
              </button>
              {onDelete && (
                <button onClick={onDelete} title={t('Удалить')}
                  style={{ width: 28, height: 28, borderRadius: 9, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-red-soft)', color: 'var(--color-red-text)' }}>
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
  const t = useT()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{icon}<Label>{title}</Label></div>
      {rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rows.map((r, idx) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 12, background: 'var(--color-bg-input)', border: '1px solid var(--color-border-medium)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              {numbered
                ? <span style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, background: accentBg, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{idx + 1}</span>
                : <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: accent, opacity: 0.7 }} />}
              <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{r.text}</div>
              <div style={{ padding: '3px 10px', borderRadius: 8, background: accentBg, color: accent, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>+{r.points} {plBall(r.points)}</div>
              <button onClick={() => onRemove(r.id)} style={iconBtn('var(--color-red-soft)', 'var(--color-red-text)')}><X size={10} /></button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}><Label>{numbered ? t('Критерий') : t('Ключевое слово')}</Label>
          <input value={newText} onChange={e => setNewText(e.target.value)} onKeyDown={e => e.key === 'Enter' && onAdd()} placeholder={placeholder} style={inputStyle} />
        </div>
        <div style={{ width: 76 }}><Label>{t('Баллов')}</Label>
          <input type="number" min={1} value={newPts} onChange={e => setNewPts(Number(e.target.value))} style={inputStyle} />
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={onAdd} style={{ height: 38, width: 38, borderRadius: 12, border: 'none', cursor: 'pointer', background: accentBg, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Plus size={16} strokeWidth={2.4} />
        </motion.button>
      </div>
      {rows.length === 0 && (
        <div style={{ padding: 14, borderRadius: 12, border: '1.5px dashed var(--color-border-medium)', textAlign: 'center', fontSize: 12, color: 'var(--color-text-3)' }}>{emptyHint}</div>
      )}
    </div>
  )
}

function segStyle(active: boolean, color: string, bg: string): React.CSSProperties {
  return {
    padding: '9px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
    background: active ? bg : 'var(--color-bg-3)', color: active ? color : 'var(--color-muted)',
    fontSize: 13, fontWeight: 600, boxShadow: active ? `0 0 0 1.5px ${color}44` : 'none', transition: 'all 0.15s', fontFamily: 'inherit',
  }
}
function iconBtn(bg: string, color: string): React.CSSProperties {
  return { width: 22, height: 22, borderRadius: 7, border: 'none', cursor: 'pointer', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }
}

// ─── Compact grid tile (4 per row) ──────────────────────────────────────────────
function BankGridCard({
  task, selected, onToggleSelected, onForkSelected, onDelete, showSelect, accent, accentBg, isNew, isEdited, editMode,
}: {
  task: Task; selected: boolean; isNew?: boolean; isEdited?: boolean
  onToggleSelected: () => void; onForkSelected: (newId: number) => void
  onDelete?: () => void; showSelect: boolean; accent: string; accentBg: string; editMode?: boolean
}) {
  const t = useT()
  const openEdit = useTeacher(s => s.openConstructorEditTask)
  const dark = useTheme(s => s.dark)
  // Subject tint comes from the registry, so a third bank subject colours itself.
  const subjectColor = subjectTheme(task.subject, dark).text

  return (
    <motion.div
      whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
      onClick={() => editMode ? onToggleSelected() : openEdit(task.id)}
      animate={isEdited ? {
        boxShadow: ['0 0 0 0px rgba(99,84,207,0)', '0 0 0 3px rgba(99,84,207,0.5)', '0 0 0 3px rgba(99,84,207,0.5)', '0 0 0 0px rgba(99,84,207,0)'],
        borderColor: ['var(--color-purple)', 'var(--color-purple)', 'var(--color-purple)', 'var(--color-border-glass)'],
      } : isNew ? {
        boxShadow: ['0 0 0 0px rgba(99,84,207,0)', '0 0 0 3px rgba(99,84,207,0.35)', '0 0 0 0px rgba(99,84,207,0)'],
        borderColor: [undefined, 'var(--color-purple)', undefined],
      } : {}}
      transition={isEdited ? { duration: 2, ease: 'easeOut', times: [0, 0.1, 0.8, 1] } : { duration: 1.2, ease: 'easeOut' }}
      style={{
        position: 'relative',
        display: 'flex', flexDirection: 'column', gap: 10, padding: '18px 18px 12px', borderRadius: 20,
        background: isEdited ? 'rgba(238,219,255,0.28)' : isNew ? 'rgba(238,219,255,0.18)' : 'rgba(var(--glass-rgb), 0.97)',
        border: selected ? `1.5px solid ${accent}` : '1px solid var(--color-border-glass)',
        boxShadow: selected ? `0 0 0 3px ${accent}22, 0 6px 24px rgba(0,0,0,0.08)` : '0 3px 16px rgba(0,0,0,0.06)', height: '100%', boxSizing: 'border-box',
        transition: 'background 0.4s ease', cursor: 'pointer',
      }}
    >
      {isEdited && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'absolute', top: 10, right: 10, zIndex: 6, padding: '3px 9px', borderRadius: 999,
            background: 'var(--color-purple)', color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: 0.2,
            boxShadow: '0 2px 10px rgba(99,84,207,0.45)', whiteSpace: 'nowrap' }}>
          {t('Изменено')}
        </motion.div>
      )}
      {editMode && (
        <div onClick={e => { e.stopPropagation(); onToggleSelected() }} style={{
          position: 'absolute', top: 10, left: 10, width: 22, height: 22, borderRadius: 7, zIndex: 5,
          border: selected ? '2px solid #c0303a' : '1.5px solid var(--color-border-medium)',
          background: selected ? '#c0303a' : 'var(--color-bg-5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.14s',
          boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
        }}>
          {selected && <Check size={13} strokeWidth={3} style={{ color: '#fff' }} />}
        </div>
      )}
      {/* Head: icon box + badges */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--color-bg-5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Zap size={17} strokeWidth={2} style={{ color: subjectColor }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <CopyableLineBadge line={task.line} accent={accent} accentBg={accentBg} />
          <CopyableIdBadge id={task.id} />
        </div>
      </div>

      {/* Body: question title + topic */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.3, marginBottom: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {task.question.split('\n')[0] || <span style={{ color: 'var(--color-text-4)' }}>{t('Без текста')}</span>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {task.topic}
        </div>
      </div>

      {/* Footer: part label | add button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--color-border-soft)' }}>
        <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{task.part === 1 ? t('I часть') : t('II часть')}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {showSelect && (
            <button onClick={onToggleSelected} title={selected ? t('Убрать из тренажёра') : t('Добавить в тренажёр')}
              style={{ width: 26, height: 26, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: selected ? accentBg : 'var(--grad-purple)', color: selected ? accent : '#fff' }}>
              {selected ? <Check size={11} strokeWidth={3} /> : <Plus size={11} strokeWidth={3} />}
            </button>
          )}
        </div>
      </div>

    </motion.div>
  )
}

// ─── Custom sort dropdown ────────────────────────────────────────────────────────
function BankSortDropdown({ value, onChange }: { value: SortMode; onChange: (v: SortMode) => void }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const label = SORT_OPTS.find(([v]) => v === value)?.[1] ?? 'Новые'
  // Список висит абсолютом над сеткой заданий и едет вместе с триггером: колесо
  // под ним прокручивало страницу, и выбор шёл поверх меняющегося экрана. Пока
  // открыт — фон стоит, крутится только сам список (lib/useScrollLock).
  useScrollLock(open, menuRef)
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999,
          background: open ? 'rgba(var(--glass-rgb), 0.98)' : 'rgba(var(--glass-rgb), 0.9)',
          border: `1px solid ${open ? 'var(--color-border-strong)' : 'var(--color-border)'}`,
          fontSize: 12, fontWeight: 600, color: 'var(--color-text)', cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <ArrowUpDown size={12} style={{ color: 'var(--color-text-3)' }} />
        <span style={{ minWidth: 88, textAlign: 'left' }}>{t(label)}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: 'var(--color-text-3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.12 }}
          style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 6, zIndex: 50, minWidth: 160,
            background: 'rgba(var(--glass-rgb), 0.97)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid var(--color-border-glass)', borderRadius: 14,
            boxShadow: '0 12px 32px rgba(0,0,0,0.12)', padding: 5,
            // Свой скролл — единственный живой, пока меню открыто. `contain`
            // обязателен: докрутив до края, список потянул бы за собой фон.
            maxHeight: 'min(60vh, 320px)', overflowY: 'auto', overscrollBehavior: 'contain',
          }}
        >
          {SORT_OPTS.map(([val, lbl]) => (
            <button key={val}
              onMouseDown={e => { e.preventDefault(); onChange(val); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                width: '100%', padding: '9px 10px', borderRadius: 9, border: 'none',
                background: value === val ? 'rgba(99,84,207,0.07)' : 'transparent',
                fontSize: 13, fontWeight: value === val ? 700 : 400, color: 'var(--color-text)',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,84,207,0.07)' }}
              onMouseLeave={e => { e.currentTarget.style.background = value === val ? 'rgba(99,84,207,0.07)' : 'transparent' }}
            >
              {t(lbl)}
              {value === val && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="var(--color-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  )
}

// ─── Browser (filtered list of cards) ───────────────────────────────────────────
export function TrainerBankBrowser({
  filters, selectedIds, onToggleSelected, onForkSelected, onDeleteTask, showSelect = true, compact = false, accent = 'var(--color-peach-text)', accentBg = 'var(--color-peach-soft)', editMode = false,
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
  editMode?: boolean
}) {
  const t = useT()
  const tasks = useTaskBank(s => s.tasks)
  const recentlyEditedId = useTaskBank(s => s.recentlyEditedId)
  const clearRecentlyEdited = useTaskBank(s => s.clearRecentlyEdited)
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [newlyAddedId, setNewlyAddedId] = useState<number | null>(null)
  const [editedFlashId, setEditedFlashId] = useState<number | null>(null)
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

  // When the teacher returns after editing a card ("Заменить"/constructor),
  // pin it to the very top and flash it for 3s, then clear the marker.
  useEffect(() => {
    if (recentlyEditedId == null) return
    setEditedFlashId(recentlyEditedId)
    clearRecentlyEdited()
    const t = setTimeout(() => setEditedFlashId(null), 2000)
    return () => clearTimeout(t)
  }, [recentlyEditedId, clearRecentlyEdited])

  const filtered = useMemo(() => {
    let list = tasks.filter(t => {
      if (filters.subject && t.subject !== filters.subject) return false
      if (filters.sections.length && !filters.sections.includes(t.section)) return false
      if (filters.topics.length && !filters.topics.includes(t.topic)) return false
      if (filters.parts.length && !filters.parts.includes(String(t.part))) return false
      if (filters.lines.length && !filters.lines.includes(String(t.line))) return false
      // Языковая разметка живёт в payload — фильтры уровня/навыка читают её.
      if (filters.levels?.length || filters.skills?.length) {
        const tags = (t.payload ?? {}) as TaskLanguageTags
        if (filters.levels?.length && !filters.levels.includes(tags.level ?? '')) return false
        if (filters.skills?.length && !filters.skills.includes(tags.skill ?? '')) return false
      }
      if (filters.source && t.source !== filters.source) return false
      if (filters.search) {
        const q = filters.search.toLowerCase().replace(/^№/, '')
        if (!t.question.toLowerCase().includes(q) && !t.topic.toLowerCase().includes(q) && !t.section.toLowerCase().includes(q) && !String(t.id).includes(q)) return false
      }
      return true
    })
    const sorted = [...list].sort((a, b) => {
      switch (sortMode) {
        case 'oldest':     return a.id - b.id
        case 'subject':    return a.subject.localeCompare(b.subject) || a.id - b.id
        case 'line':       return a.line - b.line || a.id - b.id
        default:           return b.id - a.id
      }
    })
    // Lift the just-edited card to the very top so the teacher sees their change.
    if (editedFlashId != null) {
      const i = sorted.findIndex(t => t.id === editedFlashId)
      if (i > 0) sorted.unshift(sorted.splice(i, 1)[0])
    }
    return sorted
  }, [tasks, filters, sortMode, editedFlashId])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Controls bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <BankSortDropdown value={sortMode} onChange={setSortMode} />
        <div style={{ display: 'flex', padding: 2, borderRadius: 9, background: 'var(--color-bg-3)', gap: 2 }}>
          {([['grid', <LayoutGrid size={13} />], ['list', <List size={13} />]] as const).map(([mode, icon]) => (
            <button key={mode} onClick={() => setViewMode(mode as ViewMode)} style={{
              padding: '5px 8px', borderRadius: 7, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
              background: viewMode === mode ? 'var(--color-surface)' : 'transparent', color: viewMode === mode ? 'var(--color-text)' : 'var(--color-text-3)',
              boxShadow: viewMode === mode ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.14s',
            }}>{icon}</button>
          ))}
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-3)' }}>{filtered.length} {t('заданий')}</span>
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-4)', fontSize: 13 }}>{t('Нет заданий по выбранным фильтрам')}</div>
      )}

      {viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
          {filtered.map(t => (
            <BankGridCard key={t.id} task={t}
              selected={selectedIds.has(t.id)}
              onToggleSelected={() => onToggleSelected(t.id)}
              onForkSelected={newId => onForkSelected(t.id, newId)}
              onDelete={onDeleteTask ? () => onDeleteTask(t.id) : undefined}
              showSelect={showSelect} accent={accent} accentBg={accentBg}
              isNew={t.id === newlyAddedId} isEdited={t.id === editedFlashId} editMode={editMode} />
          ))}
        </div>
      ) : (
        filtered.map((t, i) => (
          <BankQuestionCard key={t.id} task={t} index={i}
            selected={selectedIds.has(t.id)}
            onToggleSelected={() => onToggleSelected(t.id)}
            onForkSelected={newId => onForkSelected(t.id, newId)}
            onDelete={onDeleteTask ? () => onDeleteTask(t.id) : undefined}
            showSelect={showSelect} compact={false} accent={accent} accentBg={accentBg}
            isEdited={t.id === editedFlashId} />
        ))
      )}
    </div>
  )
}

// ─── Filter panel (right rail) ──────────────────────────────────────────────────
export function TrainerBankFilterPanel({
  filters, onChange, accent = 'var(--color-peach-text)', accentBg = 'var(--color-peach-soft)',
  view, onViewChange,
}: {
  filters: TrainerFilters
  onChange: (f: Partial<TrainerFilters>) => void
  accent?: string
  accentBg?: string
  /** Задания ↔ Разметка. Переключатель живёт в панели: он такой же отбор банка,
   *  как раздел или линия, и над списком он занимал целый ряд впустую. */
  view?: BankView
  onViewChange?: (v: BankView) => void
}) {
  const t = useT()
  const tasks = useTaskBank(s => s.tasks)
  const merge = useOptionMerger()
  useCurriculum(s => s.version) // re-render when the taxonomy is edited
  const allowedSubjects = useTeacherAccess(s => s.subjects) // [] for admins/unrestricted = all
  const bankIds = bankSubjectIdsFor(allowedSubjects)
  const defaultBankId = bankIds[0] || 'biology'
  const subjScopes = filters.subject ? [filters.subject] : bankIds
  const sectionOptions = merge(
    sectionsForSubject((filters.subject || defaultBankId) as Subject),
    subjScopes.map(s => sectionScope(s)),
  )
  const topicsMap = topicsForSubject((filters.subject || defaultBankId) as Subject)
  const baseTopicOptions = filters.sections.length
    ? [...new Set(filters.sections.flatMap(s => topicsMap[s] ?? []))]
    : Object.values(topicsMap).flat()
  const topicOptions = merge(baseTopicOptions, filters.sections.length ? filters.sections.map(s => topicScope(filters.subject, s)) : subjScopes.map(s => topicScope(s, '')))
  // Lines: cascade off sections+parts when a subject is chosen; otherwise list
  // every line present in the bank.
  const allLines = useMemo(() => {
    const nums = [...new Set(tasks.filter(t => !filters.subject || t.subject === filters.subject).map(t => t.line))].sort((a, b) => a - b)
    if (filters.subject && (filters.sections.length || filters.parts.length)) {
      const set = new Set(linesForSelection(filters.subject as Subject, filters.sections, filters.parts))
      return nums.filter(n => set.has(n)).map(String)
    }
    return nums.map(String)
  }, [tasks, filters.subject, filters.sections, filters.parts])
  const hasFilters = !!(filters.sections.length || filters.topics.length || filters.parts.length || filters.lines.length || filters.source || filters.levels?.length || filters.skills?.length)

  // Предметы фильтра — весь реестр в рамках доступа учителя, а не два банковых.
  // Задание в банке заводится под любой предмет, значит и отбирать надо по
  // любому. Список из 4+ пунктов SubjectPicker сам рисует выпадашкой.
  const subjectOptions = useMemo(() => [
    { value: '', label: 'Все' },
    ...allowedSubjectDefs(allowedSubjects).map(s => ({ value: s.id, label: s.name })),
  ], [allowedSubjects])

  // Разметка ЕГЭ (раздел → тема → часть → линия) у языка отсутствует: у его
  // заданий эти поля пустые, поэтому вместо них показываем уровень и навык.
  const langTax = languageTaxonomy(filters.subject)
  const isMap = view === 'map'
  // Прилипшая панель обязана стоять до конца прокрутки — см. lib/useStickyLift.
  const box = useRef<HTMLDivElement>(null)
  const lift = useStickyLift(box)

  return (
    <motion.div
      ref={box}
      initial={false}
      style={{
        ...lift,
        width: 264, flexShrink: 0, alignSelf: 'flex-start', position: 'sticky', top: 20,
        background: 'rgba(var(--glass-rgb), 0.9)', backdropFilter: 'blur(16px) saturate(180%)', WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: '1px solid var(--color-border-glass)', borderRadius: 18, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', padding: 16,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}
    >
      {onViewChange && (
        <div style={{ display: 'flex', gap: 6 }}>
          {([['tasks', t('Задания'), Zap], ['map', t('Разметка'), Database]] as const).map(([v, label, Icon]) => {
            const on = view === v
            return (
              <button key={v} onClick={() => onViewChange(v)}
                style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: on ? (accentBg ?? 'var(--color-purple-soft)') : 'var(--color-bg-3)',
                  color: on ? accent : 'var(--color-muted)', transition: 'all 0.15s' }}>
                <Icon size={13} strokeWidth={2.2} /> {label}
              </button>
            )
          })}
        </div>
      )}

      {isMap ? null : <>
      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Search size={15} style={{ color: accent }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{t('Фильтры')}</span>
      </div>
      <div style={{ position: 'relative' }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)' }} />
        <input value={filters.search} onChange={e => onChange({ search: e.target.value })} placeholder={t('Поиск по тексту или №…')}
          style={{ ...inputStyle, paddingLeft: 30, paddingRight: filters.search ? 30 : undefined }} />
        {filters.search && (
          <button onClick={() => onChange({ search: '' })} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--color-text-3)', display: 'flex', alignItems: 'center' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Subject picker — adaptive (segments ≤3, dropdown 4+), scoped to teacher's bank subjects */}
      <SubjectPicker
        options={subjectOptions.map(o => ({ value: o.value, label: t(o.label), icon: o.value ? subjectIcon(o.value) : undefined }))}
        value={filters.subject}
        onChange={v => onChange({ subject: v, sections: [], topics: [], lines: [], parts: [], levels: [], skills: [] })}
        accent={accent} accentBg={accentBg ?? 'var(--color-purple-soft)'}
        ariaLabel={t('Предмет')}
      />

      {langTax ? (
        <>
          <MultiSelectField label={t('Уровень')} values={filters.levels ?? []} options={langTax.levels} onChange={v => onChange({ levels: v })} accent={accent} accentBg={accentBg} />
          <MultiSelectField label={t('Навык')} values={filters.skills ?? []} options={langTax.skills} onChange={v => onChange({ skills: v })} accent={accent} accentBg={accentBg} />
          <MultiSelectField label={t('Тема')} values={filters.topics} options={langTax.topics} onChange={v => onChange({ topics: v })} accent={accent} accentBg={accentBg} />
        </>
      ) : (
        <>
          <MultiSelectField label={t('Раздел')} values={filters.sections} options={sectionOptions} onChange={v => onChange({ sections: v })} accent={accent} accentBg={accentBg} />
          <MultiSelectField label={t('Тема')} values={filters.topics} options={topicOptions} onChange={v => onChange({ topics: v })} accent={accent} accentBg={accentBg} />
          <div style={{ display: 'flex', gap: 6 }}>
            {(['1', '2'] as string[]).map(p => {
              const active = filters.parts.includes(p)
              return (
                <button key={p} onClick={() => onChange({ parts: active ? filters.parts.filter(x => x !== p) : [...filters.parts, p] })}
                  style={{ flex: 1, padding: '7px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                    background: active ? (accentBg ?? 'rgba(139,92,246,0.15)') : 'var(--color-bg-3)',
                    color: active ? 'var(--color-purple-text)' : 'var(--color-muted)' }}>
                  {p === '1' ? t('I часть') : t('II часть')}
                </button>
              )
            })}
          </div>
          <MultiSelectField label={t('Линия')} values={filters.lines} options={allLines} onChange={v => onChange({ lines: v })} accent={accent} accentBg={accentBg} />
        </>
      )}
      <FilterField label={t('Источник')} value={filters.source} options={merge(SOURCES, SOURCE_SCOPE)} onChange={v => onChange({ source: v })} />

      {hasFilters && (
        <button onClick={() => onChange({ sections: [], topics: [], parts: [], lines: [], source: '', levels: [], skills: [] })}
          style={{ padding: '8px 0', borderRadius: 10, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-input)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Trash2 size={12} /> {t('Сбросить фильтры')}
        </button>
      )}
      </>}

      <div style={{ fontSize: 11, color: 'var(--color-text-3)', textAlign: 'center', paddingTop: 2 }}>{tasks.length} {t('заданий в базе')}</div>
    </motion.div>
  )
}

function FilterField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <TeacherSelect
      value={value}
      onChange={onChange}
      placeholder={label}
      options={options.map(o => ({ value: o, label: o }))}
    />
  )
}
