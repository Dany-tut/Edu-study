import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Send, Plus, X, Trash2,
  Star, ChevronDown, ChevronUp, Search,
  AlignLeft, CheckSquare, Type, Shuffle, Eye,
  BookOpen, AlertCircle, Check, GripVertical, Sparkles,
  ChevronLeft, ChevronRight, Calendar, Users,
} from 'lucide-react'
import { useTeacher } from '../../store/teacherStore'
import { useTaskBank } from '../../store/taskBankStore'
import { groups, students, courseLessons } from '../../data/teacherMockData'
import {
  BIOLOGY_SECTIONS, CHEMISTRY_SECTIONS,
  BIOLOGY_TOPICS, CHEMISTRY_TOPICS,
  SOURCES,
} from '../../data/taskBankData'
import type { Task as BankTask } from '../../data/taskBankData'
import TeacherSelect from '../../components/teacher/TeacherSelect'
import TeacherSaveButton from '../../components/teacher/TeacherSaveButton'

// ─── Types ─────────────────────────────────────────────────────────────────────

type HWTaskType = 'text' | 'choice' | 'fill' | 'match'

type HWTask = {
  id: string
  source: 'custom' | 'bank'
  bankId?: number
  modified: boolean
  savedToTrainer?: 'update' | 'both' | 'skip'
  type: HWTaskType
  question: string
  answer: string
  choices?: string[]
  correctChoices?: number[]
  pairs?: { left: string; right: string }[]
}

function makeTask(type: HWTaskType): HWTask {
  return {
    id: Math.random().toString(36).slice(2),
    source: 'custom', modified: false,
    type, question: '', answer: '',
    choices: type === 'choice' ? ['', '', '', ''] : undefined,
    correctChoices: type === 'choice' ? [0] : undefined,
    pairs: type === 'match' ? [{ left: '', right: '' }, { left: '', right: '' }] : undefined,
  }
}

function taskFromBank(bt: BankTask): HWTask {
  return {
    id: Math.random().toString(36).slice(2),
    source: 'bank', bankId: bt.id, modified: false,
    type: 'text', question: bt.question, answer: bt.answer,
  }
}

// ─── Style helpers ─────────────────────────────────────────────────────────────

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

function GlassCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.88)',
      backdropFilter: 'blur(16px) saturate(180%)',
      WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      border: '1px solid rgba(255,255,255,0.9)',
      borderRadius: 18,
      boxShadow: '0 4px 20px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.95)',
      ...style,
    }}>{children}</div>
  )
}

// ─── Filter select (styled like student TaskBankPage filter fields) ────────────

function FilterSelect({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void
}) {
  return (
    <TeacherSelect
      value={value}
      onChange={onChange}
      placeholder={label}
      options={[{ value: '', label }, ...options.map(o => ({ value: o, label: o }))]}
      triggerStyle={{
        background: '#FFFFFF',
        borderWidth: 1, borderStyle: 'solid',
        borderColor: value ? 'rgba(0,0,0,0.16)' : 'rgba(0,0,0,0.1)',
        borderRadius: 13, padding: '10px 14px',
        fontWeight: value ? 600 : 400,
        color: value ? '#0B0B0D' : '#6F6F76',
      }}
    />
  )
}

// ─── Task type config ──────────────────────────────────────────────────────────

const TASK_TYPES: { type: HWTaskType; label: string; icon: React.ElementType; color: string; bg: string }[] = [
  { type: 'text',   label: 'Текстовый ответ', icon: AlignLeft,   color: '#7B3FCC', bg: '#EEDBFF' },
  { type: 'choice', label: 'Выбор ответа',    icon: CheckSquare, color: '#1a7a3f', bg: '#DFF8D6' },
  { type: 'fill',   label: 'Вписать слово',   icon: Type,        color: '#8B4900', bg: '#FFE4BD' },
  { type: 'match',  label: 'Сопоставление',   icon: Shuffle,     color: '#CC4B7B', bg: '#FFE1F0' },
]

function typeConfig(t: HWTaskType) {
  return TASK_TYPES.find(x => x.type === t) ?? TASK_TYPES[0]
}

// ─── Difficulty badge ──────────────────────────────────────────────────────────

// ─── SaveToTrainer dialog ──────────────────────────────────────────────────────

function SaveToTrainerDialog({
  onChoice,
}: { onChoice: (c: 'update' | 'both' | 'skip') => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, backdropFilter: 'blur(4px)',
      }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        style={{
          background: '#fff', borderRadius: 22, padding: '28px 28px 22px',
          width: 380, boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: '#FFE4BD', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={20} style={{ color: '#8B4900' }} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0B0B0D' }}>Задание изменено</div>
        </div>
        <div style={{ fontSize: 13, color: '#6F6F76', marginBottom: 20, lineHeight: 1.55 }}>
          Это задание взято из тренажера и было изменено. Что сделать с обновлённой версией?
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { value: 'update' as const, label: 'Обновить в тренажере', desc: 'Заменить оригинал исправленным', color: '#7B3FCC', bg: '#EEDBFF' },
            { value: 'both'   as const, label: 'Сохранить оба',        desc: 'Добавить как новое, оригинал сохранить', color: '#1a7a3f', bg: '#DFF8D6' },
            { value: 'skip'   as const, label: 'Только в домашку',     desc: 'В тренажер не добавлять',              color: '#6F6F76', bg: '#F5F5F6' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => onChoice(opt.value)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 14px', borderRadius: 13,
                border: `1.5px solid ${opt.bg}`,
                background: opt.bg, cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: opt.color }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: '#9A9AA2', marginTop: 2 }}>{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Single task card (editable) ───────────────────────────────────────────────

function TaskCard({
  task, index, onUpdate, onDelete,
}: {
  task: HWTask; index: number
  onUpdate: (updated: Partial<HWTask>) => void
  onDelete: () => void
}) {
  const cfg = typeConfig(task.type)
  const [expanded, setExpanded] = useState(true)

  function updateQuestion(q: string) {
    const wasModified = task.source === 'bank' && q !== task.question
    onUpdate({ question: q, modified: wasModified || task.modified })
  }

  function updateAnswer(a: string) {
    const wasModified = task.source === 'bank' && a !== task.answer
    onUpdate({ answer: a, modified: wasModified || task.modified })
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.22 }}
    >
      <GlassCard style={{ overflow: 'hidden' }}>
        {/* Card header */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 14px',
            borderBottom: expanded ? '1px solid rgba(0,0,0,0.05)' : 'none',
            cursor: 'pointer',
          }}
          onClick={() => setExpanded(e => !e)}
        >
          <GripVertical size={14} style={{ color: '#C2C2C8', flexShrink: 0, cursor: 'grab' }} />
          <div style={{
            fontSize: 11, fontWeight: 700,
            color: cfg.color, background: cfg.bg,
            borderRadius: 7, padding: '2px 8px', flexShrink: 0,
          }}>
            {index + 1}. {cfg.label}
          </div>
          {task.source === 'bank' && (
            <div style={{
              fontSize: 10, fontWeight: 600, color: '#9A9AA2',
              background: '#F5F5F6', borderRadius: 6, padding: '2px 7px', flexShrink: 0,
            }}>
              из тренажера
            </div>
          )}
          {task.modified && (
            <div style={{
              fontSize: 10, fontWeight: 700, color: '#8B4900',
              background: '#FFE4BD', borderRadius: 6, padding: '2px 7px', flexShrink: 0,
            }}>
              изменено
            </div>
          )}
          <div style={{ flex: 1, fontSize: 12, color: '#9A9AA2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {task.question || <span style={{ fontStyle: 'italic' }}>без текста</span>}
          </div>
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            style={{
              width: 26, height: 26, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9A9AA2', flexShrink: 0,
            }}
          >
            <Trash2 size={13} />
          </button>
          <div style={{ color: '#C2C2C8', flexShrink: 0 }}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </div>

        {/* Card body */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Question */}
                <div>
                  <Label>Условие задания</Label>
                  <textarea
                    value={task.question}
                    onChange={e => updateQuestion(e.target.value)}
                    placeholder="Текст вопроса..."
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: 64 }}
                  />
                </div>

                {/* Choice options */}
                {task.type === 'choice' && task.choices && (
                  <div>
                    <Label>Варианты ответа</Label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {task.choices.map((ch, ci) => (
                        <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            onClick={() => {
                              const correct = task.correctChoices ?? [0]
                              const isCorrect = correct.includes(ci)
                              onUpdate({ correctChoices: isCorrect ? correct.filter(x => x !== ci) : [...correct, ci] })
                            }}
                            style={{
                              width: 22, height: 22, borderRadius: 6, border: '2px solid',
                              borderColor: (task.correctChoices ?? []).includes(ci) ? '#7B3FCC' : 'rgba(0,0,0,0.15)',
                              background: (task.correctChoices ?? []).includes(ci) ? '#7B3FCC' : 'transparent',
                              cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            {(task.correctChoices ?? []).includes(ci) && <Check size={12} style={{ color: '#fff' }} />}
                          </button>
                          <input
                            value={ch}
                            onChange={e => {
                              const choices = [...(task.choices ?? [])]
                              choices[ci] = e.target.value
                              onUpdate({ choices })
                            }}
                            placeholder={`Вариант ${ci + 1}`}
                            style={{ ...inputStyle, flex: 1 }}
                          />
                          {(task.choices ?? []).length > 2 && (
                            <button
                              onClick={() => {
                                const choices = (task.choices ?? []).filter((_, i) => i !== ci)
                                const correct = (task.correctChoices ?? []).filter(i => i !== ci).map(i => i > ci ? i - 1 : i)
                                onUpdate({ choices, correctChoices: correct })
                              }}
                              style={{ width: 22, height: 22, borderRadius: 6, border: 'none', background: 'rgba(0,0,0,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9A9AA2', flexShrink: 0 }}
                            >
                              <X size={11} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => onUpdate({ choices: [...(task.choices ?? []), ''] })}
                        style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: 'none', background: '#F5F5F6', cursor: 'pointer', fontSize: 12, color: '#6F6F76', fontFamily: 'inherit' }}
                      >
                        <Plus size={12} /> Добавить вариант
                      </button>
                    </div>
                  </div>
                )}

                {/* Match pairs */}
                {task.type === 'match' && task.pairs && (
                  <div>
                    <Label>Пары для сопоставления</Label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {task.pairs.map((pair, pi) => (
                        <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            value={pair.left}
                            onChange={e => {
                              const pairs = [...(task.pairs ?? [])]
                              pairs[pi] = { ...pairs[pi], left: e.target.value }
                              onUpdate({ pairs })
                            }}
                            placeholder={`Левая ${pi + 1}`}
                            style={{ ...inputStyle, flex: 1 }}
                          />
                          <div style={{ color: '#C2C2C8', fontSize: 16 }}>↔</div>
                          <input
                            value={pair.right}
                            onChange={e => {
                              const pairs = [...(task.pairs ?? [])]
                              pairs[pi] = { ...pairs[pi], right: e.target.value }
                              onUpdate({ pairs })
                            }}
                            placeholder={`Правая ${pi + 1}`}
                            style={{ ...inputStyle, flex: 1 }}
                          />
                          {(task.pairs ?? []).length > 2 && (
                            <button
                              onClick={() => onUpdate({ pairs: (task.pairs ?? []).filter((_, i) => i !== pi) })}
                              style={{ width: 22, height: 22, borderRadius: 6, border: 'none', background: 'rgba(0,0,0,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9A9AA2', flexShrink: 0 }}
                            >
                              <X size={11} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => onUpdate({ pairs: [...(task.pairs ?? []), { left: '', right: '' }] })}
                        style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: 'none', background: '#F5F5F6', cursor: 'pointer', fontSize: 12, color: '#6F6F76', fontFamily: 'inherit' }}
                      >
                        <Plus size={12} /> Добавить пару
                      </button>
                    </div>
                  </div>
                )}

                {/* Answer (for text/fill) */}
                {(task.type === 'text' || task.type === 'fill') && (
                  <div>
                    <Label>Правильный ответ</Label>
                    <input
                      value={task.answer}
                      onChange={e => updateAnswer(e.target.value)}
                      placeholder={task.type === 'fill' ? 'Слово или фраза...' : 'Эталонный ответ...'}
                      style={inputStyle}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </motion.div>
  )
}

// ─── Add task button with type picker ─────────────────────────────────────────

function AddTaskBtn({ onAdd }: { onAdd: (type: HWTaskType) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '9px 16px', borderRadius: 12, border: '1.5px dashed rgba(123,63,204,0.35)',
          background: 'rgba(123,63,204,0.05)', cursor: 'pointer',
          fontSize: 13, fontWeight: 600, color: '#7B3FCC', fontFamily: 'inherit',
          width: '100%', justifyContent: 'center',
        }}
      >
        <Plus size={14} strokeWidth={2.4} />
        Добавить задание
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.16 }}
            style={{
              position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0,
              background: '#fff', borderRadius: 14, overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.14)', zIndex: 100,
              border: '1px solid rgba(0,0,0,0.07)',
            }}
          >
            {TASK_TYPES.map(t => (
              <button
                key={t.type}
                onClick={() => { onAdd(t.type); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '10px 14px', border: 'none',
                  background: 'transparent', cursor: 'pointer', textAlign: 'left',
                  fontSize: 13, color: '#0B0B0D', fontFamily: 'inherit',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = t.bg)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ width: 28, height: 28, borderRadius: 8, background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <t.icon size={14} style={{ color: t.color }} />
                </div>
                <span style={{ fontWeight: 600 }}>{t.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Compose tab ───────────────────────────────────────────────────────────────

function ComposeTab({
  tasks, onUpdate, onDelete, onAdd,
}: {
  tasks: HWTask[]
  onUpdate: (id: string, p: Partial<HWTask>) => void
  onDelete: (id: string) => void
  onAdd: (type: HWTaskType) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <AnimatePresence>
        {tasks.map((t, i) => (
          <TaskCard
            key={t.id}
            task={t}
            index={i}
            onUpdate={p => onUpdate(t.id, p)}
            onDelete={() => onDelete(t.id)}
          />
        ))}
      </AnimatePresence>
      {tasks.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '40px 0', color: '#C2C2C8',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        }}>
          <BookOpen size={32} strokeWidth={1.2} />
          <div style={{ fontSize: 13, fontWeight: 600 }}>Добавьте первое задание</div>
        </div>
      )}
      <AddTaskBtn onAdd={onAdd} />
    </div>
  )
}

// ─── Bank task card (looks like student trainer card, no input/favorites, solution shown+editable) ──

function BankTaskCard({ task, index, added, onAdd }: {
  task: BankTask; index: number; added: boolean
  onAdd: (bt: BankTask, overrides: { question: string; answer: string; solution: string }, savedToTrainer?: 'update' | 'both') => void
}) {
  const addTaskToBank   = useTaskBank(s => s.addTask)
  const replaceTaskInBank = useTaskBank(s => s.replaceTask)
  const removeTaskFromBank = useTaskBank(s => s.removeTask)

  const [editedQuestion, setEditedQuestion] = useState(task.question)
  const [editedAnswer, setEditedAnswer]     = useState(task.answer)
  const [editedSolution, setEditedSolution] = useState(task.solution)
  const [reported, setReported] = useState(false)
  // id of the new trainer variant created via the toggle (null = toggle off)
  const [variantId, setVariantId] = useState<number | null>(null)
  // transient "Заменено ✓" confirmation
  const [justReplaced, setJustReplaced] = useState(false)

  const palette = {
    easy:   { accent: '#22C55E', soft: '#DFF8D6', text: '#1a7a3f' },
    medium: { accent: '#F59E0B', soft: '#FFE4BD', text: '#8B4900' },
    hard:   { accent: '#7B3FCC', soft: '#EEDBFF', text: '#7B3FCC' },
  }[task.difficulty]

  const modified =
    editedQuestion !== task.question ||
    editedAnswer !== task.answer ||
    editedSolution !== task.solution

  // Snapshot of just the editable fields → reused for new/replacement bank tasks.
  const editedFields = () => ({ question: editedQuestion, answer: editedAnswer, solution: editedSolution })

  // Keep the live variant in sync while the toggle stays on and edits continue.
  useEffect(() => {
    if (variantId !== null) replaceTaskInBank(variantId, editedFields())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editedQuestion, editedAnswer, editedSolution])

  function toggleVariant() {
    if (variantId !== null) {
      removeTaskFromBank(variantId)
      setVariantId(null)
    } else {
      // Same characteristics, new content, fresh searchable id.
      const { id: _omit, ...rest } = task
      addTaskToBank({ ...rest, ...editedFields() }).then(newId => setVariantId(newId))
    }
  }

  function replaceInTrainer() {
    replaceTaskInBank(task.id, editedFields())
    setJustReplaced(true)
    setTimeout(() => setJustReplaced(false), 2000)
  }

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', gap: 14,
        padding: 20, borderRadius: 26,
        background: 'rgba(255,255,255,0.96)',
        border: modified ? '1px solid rgba(123,63,204,0.35)' : '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
        transition: 'border-color 0.2s',
      }}
    >
      {/* Header: badges + actions */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#7B3FCC' }}>Задание {index + 1}</span>
            <span style={{ fontSize: 11, color: '#BDBDC2' }}>·</span>
            <span style={{ padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: '#FFE1E4', color: '#B03040' }}>№{task.id}</span>
            <span style={{ padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: 'rgba(0,0,0,0.05)', color: '#6F6F76' }}>{task.line} линия</span>
            <span style={{ padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: 'rgba(0,0,0,0.05)', color: '#6F6F76' }}>Часть {task.part}</span>
            {modified && (
              <span style={{ padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: '#EEDBFF', color: '#7B3FCC' }}>
                изменено
              </span>
            )}
          </div>
          {/* Editable question */}
          <AutoTextarea
            value={editedQuestion}
            onChange={setEditedQuestion}
            placeholder="Текст задания…"
            style={{ fontSize: 15, lineHeight: 1.45, fontWeight: 650, color: '#0B0B0D' }}
          />
        </div>

        {/* Right action cluster */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <button
            onClick={() => !added && onAdd(task, editedFields(), variantId !== null ? 'both' : justReplaced ? 'update' : undefined)}
            style={{
              padding: '8px 16px', borderRadius: 12, border: 'none',
              cursor: added ? 'default' : 'pointer',
              background: added ? '#DFF8D6' : 'linear-gradient(135deg, #9B6DFF 0%, #7B3FCC 100%)',
              color: added ? '#1a7a3f' : '#fff',
              fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5,
              boxShadow: added ? 'none' : '0 3px 12px rgba(123,63,204,0.32)',
              transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}
          >
            {added ? <><Check size={12} /> Добавлено</> : <><Plus size={12} /> Добавить</>}
          </button>

          {/* Trainer actions — appear once the task is edited; the row lingers
              briefly after "Заменить" (justReplaced) to show its confirmation,
              and stays while an add-as-new variant is active (variantId). */}
          <AnimatePresence>
            {(modified || justReplaced || variantId !== null) && (
              <motion.div
                initial={{ opacity: 0, y: -4, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -4, height: 0 }}
                transition={{ duration: 0.18 }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}
              >
                {/* Add-as-new-variant toggle — shown while editing or once a variant exists */}
                {(modified || variantId !== null) && (
                <button
                  onClick={toggleVariant}
                  title="Добавить как новое задание в тренажёр (новый номер)"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '6px 10px', borderRadius: 10, cursor: 'pointer',
                    border: variantId !== null ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(0,0,0,0.1)',
                    background: variantId !== null ? '#DFF8D6' : '#F4F4F6',
                    fontSize: 11.5, fontWeight: 700,
                    color: variantId !== null ? '#1a7a3f' : '#6F6F76',
                    fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all 0.15s',
                  }}
                >
                  <span style={{
                    width: 26, height: 15, borderRadius: 999, flexShrink: 0, position: 'relative',
                    background: variantId !== null ? '#22C55E' : '#C9C9D0', transition: 'background 0.18s',
                  }}>
                    <span style={{
                      position: 'absolute', top: 2, left: variantId !== null ? 13 : 2,
                      width: 11, height: 11, borderRadius: '50%', background: '#fff',
                      transition: 'left 0.18s', boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
                    }} />
                  </span>
                  {variantId !== null
                    ? <>В тренажёре · №{variantId}</>
                    : <>В тренажёр</>}
                </button>
                )}

                {/* Replace original — also shows the "Заменено" confirmation flash */}
                {(modified || justReplaced) && (
                <button
                  onClick={replaceInTrainer}
                  title="Заменить оригинал в тренажёре этим текстом"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px', borderRadius: 10, cursor: 'pointer',
                    border: justReplaced ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(0,0,0,0.1)',
                    background: justReplaced ? '#DFF8D6' : '#fff',
                    fontSize: 11.5, fontWeight: 700,
                    color: justReplaced ? '#1a7a3f' : '#B03040',
                    fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all 0.15s',
                  }}
                >
                  {justReplaced ? <><Check size={12} /> Заменено</> : <><Shuffle size={12} /> Заменить</>}
                </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Table (read-only) */}
      {task.questionTable && (
        <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.09)', alignSelf: 'flex-start', maxWidth: '100%' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%' }}>
            <thead>
              <tr>{task.questionTable.headers.map(h => (
                <th key={h} style={{ borderBottom: '1px solid rgba(0,0,0,0.09)', borderRight: '1px solid rgba(0,0,0,0.08)', padding: '9px 16px', fontWeight: 700, background: 'rgba(0,0,0,0.03)', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {task.questionTable.rows.map((row, ri) => (
                <tr key={ri} style={{ background: ri % 2 === 1 ? 'rgba(0,0,0,0.015)' : 'transparent' }}>{row.map((cell, ci) => (
                  <td key={ci} style={{ borderTop: ri > 0 ? '1px solid rgba(0,0,0,0.07)' : undefined, borderRight: '1px solid rgba(0,0,0,0.07)', padding: '9px 16px' }}>{cell}</td>
                ))}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Solution block — answer + solution editable */}
      <div style={{ padding: '14px 18px', background: palette.soft, borderRadius: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: palette.text, margin: 0 }}>Правильный ответ</p>
        <input
          value={editedAnswer}
          onChange={e => setEditedAnswer(e.target.value)}
          style={{
            ...inputStyle,
            fontWeight: 700, fontSize: 14,
            border: '1.5px solid rgba(0,0,0,0.1)',
            background: 'rgba(255,255,255,0.85)',
          }}
          placeholder="Введите правильный ответ..."
        />
        <p style={{ fontSize: 11, fontWeight: 700, color: palette.text, margin: '4px 0 0' }}>Пояснение</p>
        <AutoTextarea
          value={editedSolution}
          onChange={setEditedSolution}
          placeholder="Пояснение к решению…"
          style={{
            fontSize: 12, lineHeight: 1.6, color: '#3A3A42',
            background: 'rgba(255,255,255,0.6)', borderRadius: 10,
            padding: '8px 10px', borderColor: 'rgba(0,0,0,0.06)',
          }}
        />
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 2, borderTop: '1px solid rgba(0,0,0,0.04)' }}>
        <span style={{ fontSize: 11, color: '#B5B5BC', flex: 1 }}>{task.section} → {task.topic} · {task.source}</span>
        <button onClick={() => setReported(r => !r)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 8, background: 'none', border: 'none', fontSize: 11, color: reported ? '#C0187A' : '#B5B5BC', cursor: 'pointer', fontFamily: 'inherit' }}>
          <AlertCircle size={10} />{reported ? 'Отправлено' : 'Ошибка'}
        </button>
      </div>
    </div>
  )
}

// Auto-growing textarea that reads like plain text until focused — used for the
// inline-editable question and solution in the trainer picker.
function AutoTextarea({ value, onChange, placeholder, style }: {
  value: string; onChange: (v: string) => void; placeholder?: string; style?: React.CSSProperties
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  // Resting values — focus/blur restore to these instead of hardcoded defaults,
  // so a field with its own background/border keeps it after editing.
  const restBg = (style?.background as string) ?? 'transparent'
  const restBorder = (style?.borderColor as string) ?? 'transparent'
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={1}
      style={{
        width: '100%', boxSizing: 'border-box', display: 'block',
        resize: 'none', overflow: 'hidden',
        borderWidth: 1, borderStyle: 'solid', borderColor: 'transparent', borderRadius: 8,
        background: 'transparent', outline: 'none',
        padding: '2px 4px', margin: '-2px -4px',
        fontFamily: 'inherit', whiteSpace: 'pre-wrap',
        transition: 'background 0.15s, border-color 0.15s',
        ...style,
      }}
      onFocus={e => { e.currentTarget.style.background = 'rgba(123,63,204,0.04)'; e.currentTarget.style.borderColor = 'rgba(123,63,204,0.25)' }}
      onBlur={e => { e.currentTarget.style.background = restBg; e.currentTarget.style.borderColor = restBorder }}
    />
  )
}

// ─── Trainer tab (bank picker) ─────────────────────────────────────────────────

type TrainerFilters = { search: string; subject: string; section: string; topic: string; part: string; line: string; source: string }

function TrainerTab({
  addedIds, filters, onAdd,
}: {
  addedIds: Set<number>
  filters: TrainerFilters
  onAdd: (bt: BankTask, overrides: { question: string; answer: string; solution: string }, savedToTrainer?: 'update' | 'both') => void
}) {
  const bankTasks = useTaskBank(s => s.tasks)
  const filtered = bankTasks.filter(t => {
    if (filters.subject && t.subject !== filters.subject) return false
    if (filters.section && t.section !== filters.section) return false
    if (filters.topic && t.topic !== filters.topic) return false
    if (filters.part && t.part !== Number(filters.part)) return false
    if (filters.line && t.line !== Number(filters.line)) return false
    if (filters.source && t.source !== filters.source) return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!t.question.toLowerCase().includes(q) && !t.topic.toLowerCase().includes(q) && !t.section.toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#C2C2C8', fontSize: 13 }}>
          Нет заданий по выбранным фильтрам
        </div>
      )}
      {filtered.map((bt, i) => (
        <BankTaskCard
          key={bt.id}
          task={bt}
          index={i}
          added={addedIds.has(bt.id)}
          onAdd={onAdd}
        />
      ))}
    </div>
  )
}

// ─── Preview tab ───────────────────────────────────────────────────────────────

function PreviewTab({
  tasks, onDelete, onOpenTrainerDialog,
}: {
  tasks: HWTask[]
  onDelete: (id: string) => void
  onOpenTrainerDialog: (id: string) => void
}) {
  const bankTasks = useTaskBank(s => s.tasks)
  const [showAnswer, setShowAnswer] = useState<Set<string>>(new Set())

  function toggleAnswer(id: string) {
    setShowAnswer(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  if (tasks.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: '#C2C2C8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <Eye size={36} strokeWidth={1.2} />
        <div style={{ fontSize: 13, fontWeight: 600 }}>Добавьте задания для предпросмотра</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {tasks.map((t, i) => {
        const cfg = typeConfig(t.type)
        return (
          <GlassCard key={t.id} style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{
                width: 26, height: 26, borderRadius: 8, background: cfg.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: cfg.color, flexShrink: 0,
              }}>
                {i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, background: cfg.bg, borderRadius: 6, padding: '2px 7px' }}>
                    {cfg.label}
                  </span>
                  {t.modified && (
                    <button
                      onClick={() => onOpenTrainerDialog(t.id)}
                      style={{ fontSize: 10, fontWeight: 700, color: '#8B4900', background: '#FFE4BD', borderRadius: 6, padding: '2px 7px', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      ⚠ изменено
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 13, color: '#0B0B0D', lineHeight: 1.55, marginBottom: 8 }}>
                  {t.question || <span style={{ color: '#C2C2C8', fontStyle: 'italic' }}>Без текста</span>}
                </div>

                {t.type === 'choice' && t.choices && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                    {t.choices.map((ch, ci) => (
                      <div key={ci} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '5px 10px', borderRadius: 8,
                        background: (t.correctChoices ?? []).includes(ci) ? '#DFF8D6' : '#F5F5F6',
                      }}>
                        <div style={{
                          width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                          background: (t.correctChoices ?? []).includes(ci) ? '#1a7a3f' : '#C2C2C8',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {(t.correctChoices ?? []).includes(ci) && <Check size={10} style={{ color: '#fff' }} />}
                        </div>
                        <span style={{ fontSize: 12, color: '#0B0B0D' }}>{ch || `Вариант ${ci + 1}`}</span>
                      </div>
                    ))}
                  </div>
                )}

                {t.type === 'match' && t.pairs && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                    {t.pairs.map((p, pi) => (
                      <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, padding: '5px 10px', borderRadius: 8, background: '#EEDBFF', fontSize: 12, color: '#7B3FCC', fontWeight: 600 }}>
                          {p.left || `Левая ${pi + 1}`}
                        </div>
                        <span style={{ color: '#C2C2C8' }}>↔</span>
                        <div style={{ flex: 1, padding: '5px 10px', borderRadius: 8, background: '#FFE4BD', fontSize: 12, color: '#8B4900', fontWeight: 600 }}>
                          {p.right || `Правая ${pi + 1}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(t.type === 'text' || t.type === 'fill') && (
                  <button
                    onClick={() => toggleAnswer(t.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '4px 10px', borderRadius: 8, border: 'none',
                      background: showAnswer.has(t.id) ? '#DFF8D6' : '#F5F5F6',
                      cursor: 'pointer', fontSize: 11, fontWeight: 600,
                      color: showAnswer.has(t.id) ? '#1a7a3f' : '#6F6F76',
                      fontFamily: 'inherit', marginBottom: 4,
                    }}
                  >
                    <Eye size={12} />
                    {showAnswer.has(t.id) ? t.answer || 'нет ответа' : 'Показать ответ'}
                  </button>
                )}
              </div>
              <button
                onClick={() => onDelete(t.id)}
                style={{ width: 26, height: 26, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9A9AA2', flexShrink: 0 }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </GlassCard>
        )
      })}
    </div>
  )
}

// ─── Trainer filter panel (right side) ────────────────────────────────────────

function TrainerFilterPanel({
  filters, onChange,
}: {
  filters: TrainerFilters
  onChange: (f: Partial<TrainerFilters>) => void
}) {
  const bankTasks = useTaskBank(s => s.tasks)
  const sections = filters.subject === 'chemistry' ? CHEMISTRY_SECTIONS : BIOLOGY_SECTIONS
  const topicsMap = filters.subject === 'chemistry' ? CHEMISTRY_TOPICS : BIOLOGY_TOPICS
  const topicOptions = filters.section ? (topicsMap[filters.section] ?? []) : Object.values(topicsMap).flat()
  const allLines = [...new Set(bankTasks
    .filter(t => !filters.subject || t.subject === filters.subject)
    .map(t => t.line))].sort((a, b) => a - b).map(String)

  const hasFilters = !!(filters.section || filters.topic || filters.part || filters.line || filters.source)

  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.8 }}
      style={{
        width: 260, flexShrink: 0,
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.9)',
        borderRadius: 18,
        boxShadow: '0 4px 20px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.95)',
        display: 'flex', flexDirection: 'column', overflowY: 'auto', scrollbarGutter: 'stable',
        padding: '16px', gap: 10,
        margin: '20px 24px 20px 0',
      }}
    >
      {/* Header with filter icon */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
        <Search size={14} style={{ color: '#9A9AA2' }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0B0B0D' }}>Фильтры</span>
      </div>

      {/* Subject pills */}
      <div style={{ display: 'flex', gap: 5 }}>
        {[{ v: '', l: 'Все' }, { v: 'biology', l: 'Биология' }, { v: 'chemistry', l: 'Химия' }].map(opt => (
          <button
            key={opt.v}
            onClick={() => onChange({ subject: opt.v, section: '', topic: '' })}
            style={{
              flex: 1, padding: '6px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 600,
              background: filters.subject === opt.v ? '#EEDBFF' : '#F5F5F6',
              color: filters.subject === opt.v ? '#7B3FCC' : '#6F6F76',
              fontFamily: 'inherit', transition: 'all 0.15s',
            }}
          >
            {opt.l}
          </button>
        ))}
      </div>

      {/* Dropdown filters */}
      <FilterSelect label="Раздел" options={sections} value={filters.section}
        onChange={v => onChange({ section: v, topic: '' })} />
      <FilterSelect label="Тема" options={topicOptions} value={filters.topic}
        onChange={v => onChange({ topic: v })} />
      <FilterSelect label="Часть" options={['1', '2']} value={filters.part}
        onChange={v => onChange({ part: v })} />
      <FilterSelect label="Линия" options={allLines} value={filters.line}
        onChange={v => onChange({ line: v })} />
      <FilterSelect label="Источник" options={SOURCES} value={filters.source}
        onChange={v => onChange({ source: v })} />

      {hasFilters && (
        <button
          onClick={() => onChange({ section: '', topic: '', part: '', line: '', source: '' })}
          style={{ padding: '8px 0', borderRadius: 12, background: '#FFE1E4', border: 'none', fontSize: 12, color: '#B03040', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}
        >
          Сбросить фильтры
        </button>
      )}

      <div style={{ fontSize: 11, color: '#C2C2C8', textAlign: 'center', marginTop: 4 }}>
        {bankTasks.length} заданий в базе
      </div>
    </motion.div>
  )
}

// ─── Hard task accordion ───────────────────────────────────────────────────────

function HardTaskAccordion({
  groupId, tasks, onUpdate, onDelete, onAdd,
}: {
  groupId: string
  tasks: HWTask[]
  onUpdate: (id: string, p: Partial<HWTask>) => void
  onDelete: (id: string) => void
  onAdd: (type: HWTaskType) => void
}) {
  const [open, setOpen] = useState(false)
  const [assignTo, setAssignTo] = useState<'all' | 'selected'>('all')
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<'compose' | 'trainer'>('compose')
  const [trainerFilters, setTrainerFilters] = useState<TrainerFilters>({ search: '', subject: '', section: '', topic: '', part: '', line: '', source: '' })
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set())

  const groupStudents = students.filter(s => s.groupId === groupId)

  function toggleStudent(id: string) {
    setSelectedStudents(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function handleAddFromBank(bt: BankTask) {
    onAdd('text')
    const task = taskFromBank(bt)
    onUpdate(task.id, task)
    setAddedIds(prev => new Set(prev).add(bt.id))
  }

  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderRadius: open ? '16px 16px 0 0' : 16,
          border: '1.5px solid rgba(255,180,0,0.3)',
          background: open ? 'linear-gradient(135deg, #FFF8E6 0%, #FFFBF0 100%)' : 'rgba(255,248,230,0.6)',
          cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
        }}
      >
        <Star size={16} style={{ color: '#F59E0B', fill: '#F59E0B' }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#8B6000', flex: 1, textAlign: 'left' }}>
          Сложное задание
        </span>
        {tasks.length > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#8B6000', background: 'rgba(255,180,0,0.2)', borderRadius: 8, padding: '2px 8px' }}>
            {tasks.length} зад.
          </span>
        )}
        <span style={{ fontSize: 11, color: '#C2A000', fontWeight: 600 }}>
          {open ? 'Свернуть' : 'Добавить'}
        </span>
        {open ? <ChevronUp size={14} style={{ color: '#C2A000' }} /> : <ChevronDown size={14} style={{ color: '#C2A000' }} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              border: '1.5px solid rgba(255,180,0,0.3)', borderTop: 'none',
              borderRadius: '0 0 16px 16px',
              background: 'rgba(255,253,245,0.9)',
              padding: '16px',
              display: 'flex', flexDirection: 'column', gap: 14,
            }}>
              <div style={{ fontSize: 12, color: '#8B6000', lineHeight: 1.5 }}>
                Это задание откроется только студентам, набравшим <strong>80%+</strong> в основном ДЗ.
              </div>

              {/* Assign to */}
              <div>
                <Label>Назначить</Label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[{ v: 'all', l: 'Всем в группе' }, { v: 'selected', l: 'Выбранным' }].map(opt => (
                    <button
                      key={opt.v}
                      onClick={() => setAssignTo(opt.v as 'all' | 'selected')}
                      style={{
                        flex: 1, padding: '7px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                        fontSize: 12, fontWeight: 600,
                        background: assignTo === opt.v ? '#FEF3C7' : '#F5F5F6',
                        color: assignTo === opt.v ? '#8B6000' : '#6F6F76',
                        fontFamily: 'inherit', transition: 'all 0.15s',
                      }}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Student picker */}
              {assignTo === 'selected' && groupStudents.length > 0 && (
                <div>
                  <Label>Студенты ({selectedStudents.size} выбрано)</Label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
                    {groupStudents.map(s => {
                      const sel = selectedStudents.has(s.id)
                      return (
                        <button
                          key={s.id}
                          onClick={() => toggleStudent(s.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '7px 10px', borderRadius: 10,
                            border: 'none', cursor: 'pointer', textAlign: 'left',
                            background: sel ? '#FEF3C7' : '#F9F9FB',
                            fontFamily: 'inherit', transition: 'background 0.12s',
                          }}
                        >
                          <div style={{
                            width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                            background: sel ? '#F59E0B' : '#E0E0E6',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {sel
                              ? <Check size={12} style={{ color: '#fff' }} />
                              : <span style={{ fontSize: 9, fontWeight: 700, color: '#6F6F76' }}>
                                  {s.name.split(' ').map(p => p[0]).join('').slice(0, 2)}
                                </span>
                            }
                          </div>
                          <span style={{ fontSize: 12, color: '#0B0B0D', flex: 1 }}>{s.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Mini tabs */}
              <div>
                <div style={{ display: 'flex', gap: 4, marginBottom: 12, background: '#F5F5F6', borderRadius: 11, padding: 3 }}>
                  {[{ v: 'compose', l: 'Составить' }, { v: 'trainer', l: 'Из тренажера' }].map(t => (
                    <button
                      key={t.v}
                      onClick={() => setTab(t.v as 'compose' | 'trainer')}
                      style={{
                        flex: 1, padding: '7px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
                        fontSize: 12, fontWeight: 600,
                        background: tab === t.v ? '#fff' : 'transparent',
                        color: tab === t.v ? '#7B3FCC' : '#6F6F76',
                        fontFamily: 'inherit', transition: 'all 0.15s',
                        boxShadow: tab === t.v ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                      }}
                    >
                      {t.l}
                    </button>
                  ))}
                </div>

                {tab === 'compose' && (
                  <ComposeTab
                    tasks={tasks}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onAdd={onAdd}
                  />
                )}
                {tab === 'trainer' && (
                  <TrainerTab
                    addedIds={addedIds}
                    filters={trainerFilters}
                    onAdd={(bt, overrides, savedToTrainer) => {
                      const t = taskFromBank({ ...bt, question: overrides.question, answer: overrides.answer, solution: overrides.solution })
                      const edited = overrides.question !== bt.question || overrides.answer !== bt.answer || overrides.solution !== bt.solution
                      t.modified = edited && !savedToTrainer
                      t.savedToTrainer = savedToTrainer
                      onUpdate(t.id, t)
                      setAddedIds(prev => new Set(prev).add(bt.id))
                    }}
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Lesson picker (custom dropdown matching HwPicker style) ──────────────────

// ─── Date helpers ──────────────────────────────────────────────────────────────

const navBtnStyle: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 8, border: 'none',
  background: '#F7F5FC', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', color: '#6F6F76',
}
function todayDotStr() {
  const d = new Date()
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`
}
function parseDateDot(s: string): Date | null {
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (!m) return null
  return new Date(+m[3], +m[2]-1, +m[1])
}
function formatDateDot(d: Date) {
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`
}
const RU_MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const RU_DAYS_SHORT = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

function CalendarPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const today = todayDotStr()
  const parsed = parseDateDot(value)
  const todayDate = parseDateDot(today)!

  const [viewYear, setViewYear] = useState(() => parsed ? parsed.getFullYear() : todayDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(() => parsed ? parsed.getMonth() : todayDate.getMonth())

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  // Build calendar grid (Mon-first)
  const firstDay = new Date(viewYear, viewMonth, 1)
  const startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  function pickDay(day: number) {
    const d = new Date(viewYear, viewMonth, day)
    onChange(formatDateDot(d))
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 12px', borderRadius: 11, border: '1.5px solid rgba(0,0,0,0.09)',
          cursor: 'pointer', background: value ? '#F5F0FF' : '#F9F9FB',
          fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.15s',
        }}
      >
        <Calendar size={14} strokeWidth={2} style={{ flexShrink: 0, color: value ? '#7B3FCC' : '#9A9AA2' }} />
        <div style={{ flex: 1, fontSize: 13, color: value ? '#7B3FCC' : '#9A9AA2', fontWeight: value ? 600 : 400 }}>
          {value || 'Выберите дату'}
        </div>
        {value && (
          <button
            onClick={e => { e.stopPropagation(); onChange('') }}
            style={{ width: 20, height: 20, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9A9AA2', flexShrink: 0 }}
          >
            <X size={10} />
          </button>
        )}
        <ChevronDown size={13} style={{ flexShrink: 0, color: '#C2C2C8', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 999,
              background: '#fff', border: '1.5px solid #EDEAF5', borderRadius: 16,
              boxShadow: '0 8px 32px rgba(123,63,204,0.12)',
              padding: '14px 12px 12px',
            }}
          >
            {/* Month nav */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <button style={navBtnStyle} onClick={prevMonth}><ChevronLeft size={14} /></button>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0B0B0D' }}>{RU_MONTHS[viewMonth]} {viewYear}</span>
              <button style={navBtnStyle} onClick={nextMonth}><ChevronRight size={14} /></button>
            </div>

            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
              {RU_DAYS_SHORT.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#C2C2C8', padding: '2px 0' }}>{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {cells.map((day, i) => {
                if (!day) return <div key={i} />
                const cellStr = formatDateDot(new Date(viewYear, viewMonth, day))
                const isSelected = cellStr === value
                const isToday = cellStr === today
                return (
                  <button
                    key={i}
                    onClick={() => pickDay(day)}
                    style={{
                      width: '100%', aspectRatio: '1', borderRadius: 8, border: 'none',
                      cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: isSelected ? 700 : 400,
                      background: isSelected ? '#7B3FCC' : isToday ? '#F0E8FF' : 'transparent',
                      color: isSelected ? '#fff' : isToday ? '#7B3FCC' : '#0B0B0D',
                      transition: 'background 0.12s',
                    }}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Group picker ───────────────────────────────────────────────────────────────

function GroupPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = groups.find(g => g.id === value) ?? null

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 12px', borderRadius: 11, border: '1.5px solid rgba(0,0,0,0.09)',
          cursor: 'pointer', background: selected ? '#F5F0FF' : '#F9F9FB',
          fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.15s',
        }}
      >
        <Users size={14} strokeWidth={2} style={{ flexShrink: 0, color: selected ? '#7B3FCC' : '#9A9AA2' }} />
        <div style={{ flex: 1, fontSize: 13, color: selected ? '#7B3FCC' : '#9A9AA2', fontWeight: selected ? 600 : 400 }}>
          {selected ? selected.name : 'Выберите группу'}
        </div>
        {selected && (
          <button
            onClick={e => { e.stopPropagation(); onChange('') }}
            style={{ width: 20, height: 20, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9A9AA2', flexShrink: 0 }}
          >
            <X size={10} />
          </button>
        )}
        <ChevronDown size={13} style={{ flexShrink: 0, color: '#C2C2C8', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 999,
              background: '#fff', border: '1.5px solid #EDEAF5', borderRadius: 16,
              boxShadow: '0 8px 32px rgba(123,63,204,0.12)',
              overflow: 'hidden',
            }}
          >
            {groups.map(g => (
              <button
                key={g.id}
                onClick={() => { onChange(g.id); setOpen(false) }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  background: g.id === value ? '#F5F0FF' : 'transparent',
                  transition: 'background 0.12s', textAlign: 'left',
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: g.id === value ? '#EEDBFF' : '#F5F5F6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Users size={13} style={{ color: g.id === value ? '#7B3FCC' : '#9A9AA2' }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: g.id === value ? 700 : 500, color: g.id === value ? '#7B3FCC' : '#0B0B0D' }}>
                  {g.name}
                </span>
                {g.id === value && <Check size={13} style={{ marginLeft: 'auto', color: '#7B3FCC' }} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function LessonPicker({
  value, title, onChange,
}: {
  value: string
  title: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [fade, setFade] = useState({ top: 0, bottom: 0 })
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Suggest lessons whose title overlaps with the homework title
  const suggested = useMemo(() => {
    const t = title.trim().toLowerCase()
    if (!t) return []
    return courseLessons.filter(l => {
      const words = t.split(/\s+/).filter(w => w.length > 3)
      return words.some(w => l.lessonTitle.toLowerCase().includes(w))
    })
  }, [title])

  const suggestedIds = new Set(suggested.map(l => l.id))

  const filtered = courseLessons.filter(l => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return l.lessonTitle.toLowerCase().includes(q) || l.courseTitle.toLowerCase().includes(q)
  })

  const selected = courseLessons.find(l => l.id === value) ?? null

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    const top = Math.min(1, el.scrollTop / 24)
    const bottom = Math.min(1, (el.scrollHeight - el.clientHeight - el.scrollTop) / 24)
    setFade({ top, bottom })
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        onClick={() => { if (!open) { setQuery(''); setFade({ top: 0, bottom: 0 }) } setOpen(o => !o) }}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 12px', borderRadius: 11, border: '1.5px solid rgba(0,0,0,0.09)',
          cursor: 'pointer', background: selected ? '#F5F0FF' : '#F9F9FB',
          fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.15s',
        }}
      >
        <BookOpen size={14} strokeWidth={2} style={{ flexShrink: 0, color: selected ? '#7B3FCC' : '#9A9AA2' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {selected ? (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#7B3FCC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.lessonTitle}</div>
              <div style={{ fontSize: 10, color: '#9A9AA2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.courseTitle}</div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: '#9A9AA2' }}>Без привязки</div>
          )}
        </div>
        {selected && (
          <button
            onClick={e => { e.stopPropagation(); onChange('') }}
            style={{ width: 20, height: 20, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9A9AA2', flexShrink: 0 }}
          >
            <X size={10} />
          </button>
        )}
        <ChevronDown size={13} style={{ flexShrink: 0, color: '#C2C2C8', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 60,
              padding: 8, borderRadius: 14,
              background: 'rgba(255,255,255,0.96)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              border: '1px solid rgba(0,0,0,0.07)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.14)',
            }}
          >
            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 6 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9A9AA2', pointerEvents: 'none' }} />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Поиск урока..."
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '7px 10px 7px 30px',
                  borderRadius: 9, border: '1.5px solid rgba(0,0,0,0.08)',
                  fontSize: 12, color: '#0B0B0D', background: 'rgba(255,255,255,0.8)',
                  outline: 'none', fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <div onScroll={onScroll} className="no-scrollbar" style={{ maxHeight: 220, overflowY: 'auto' }}>
                {/* Clear option */}
                <button
                  onClick={() => { onChange(''); setOpen(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9, width: '100%',
                    padding: '8px 10px', borderRadius: 9, border: 'none', cursor: 'pointer',
                    background: !value ? '#EEDBFF' : 'transparent', textAlign: 'left', fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => { if (value) e.currentTarget.style.background = '#F5F5F6' }}
                  onMouseLeave={e => { if (value) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: '#F5F5F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={13} style={{ color: '#9A9AA2' }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: !value ? '#7B3FCC' : '#6F6F76' }}>Без привязки</span>
                  {!value && <Check size={13} style={{ color: '#7B3FCC', marginLeft: 'auto' }} />}
                </button>

                {/* Suggested section */}
                {suggested.length > 0 && !query && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 8px 4px' }}>
                      <Sparkles size={11} style={{ color: '#7B3FCC' }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#7B3FCC', letterSpacing: 0.3 }}>ПОДХОДЯТ К ТЕМЕ</span>
                    </div>
                    {suggested.map(l => (
                      <LessonOption key={l.id} lesson={l} active={value === l.id} suggested onClick={() => { onChange(l.id); setOpen(false) }} />
                    ))}
                    <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '6px 8px' }} />
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9A9AA2', letterSpacing: 0.3, padding: '2px 8px 4px' }}>ВСЕ УРОКИ</div>
                  </>
                )}

                {/* All lessons */}
                {filtered.filter(l => !suggestedIds.has(l.id) || !!query).map(l => (
                  <LessonOption key={l.id} lesson={l} active={value === l.id} onClick={() => { onChange(l.id); setOpen(false) }} />
                ))}

                {filtered.length === 0 && (
                  <div style={{ padding: '10px 8px', fontSize: 12, color: '#9A9AA2', textAlign: 'center' }}>Ничего не найдено</div>
                )}
              </div>

              {/* Edge fades */}
              <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 24, background: 'linear-gradient(to bottom, rgba(255,255,255,0.92), transparent)', opacity: fade.top, transition: 'opacity 0.2s', pointerEvents: 'none', borderRadius: '8px 8px 0 0' }} />
              <div aria-hidden style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 24, background: 'linear-gradient(to top, rgba(255,255,255,0.92), transparent)', opacity: fade.bottom, transition: 'opacity 0.2s', pointerEvents: 'none', borderRadius: '0 0 8px 8px' }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function LessonOption({ lesson, active, suggested, onClick }: {
  lesson: typeof courseLessons[0]; active: boolean; suggested?: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 9, width: '100%',
        padding: '8px 10px', borderRadius: 9, border: 'none', cursor: 'pointer',
        background: active ? '#EEDBFF' : 'transparent', textAlign: 'left', fontFamily: 'inherit',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F5F5F6' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: active ? '#EEDBFF' : '#F0EBF8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <BookOpen size={13} style={{ color: '#7B3FCC' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#0B0B0D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lesson.lessonTitle}</div>
        <div style={{ fontSize: 10, color: '#9A9AA2', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lesson.courseTitle}</div>
      </div>
      {suggested && <Sparkles size={12} style={{ color: '#7B3FCC', flexShrink: 0 }} />}
      {active && <Check size={13} style={{ color: '#7B3FCC', flexShrink: 0 }} />}
    </button>
  )
}

// ─── Left meta panel ───────────────────────────────────────────────────────────

type Meta = {
  assignTo: 'group' | 'student'
  groupId: string
  studentId: string
  title: string
  description: string
  dueDate: string
  lessonId: string
}

function LeftPanel({ meta, onChange }: { meta: Meta; onChange: (p: Partial<Meta>) => void }) {
  const groupStudents = students.filter(s => s.groupId === meta.groupId)

  return (
    <div style={{
      width: 260, flexShrink: 0,
      display: 'flex', flexDirection: 'column', gap: 0,
    }}>
      <GlassCard style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Кому */}
        <div>
          <Label>Кому</Label>
          <div style={{ display: 'flex', gap: 5 }}>
            {(['group', 'student'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => onChange({ assignTo: mode, studentId: '' })}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 11, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600,
                  background: meta.assignTo === mode ? '#EEDBFF' : '#F5F5F6',
                  color: meta.assignTo === mode ? '#7B3FCC' : '#6F6F76',
                  fontFamily: 'inherit', transition: 'all 0.15s',
                }}
              >
                {mode === 'group' ? 'Группе' : 'Студенту'}
              </button>
            ))}
          </div>
        </div>

        {/* Группа */}
        <div>
          <Label>Группа</Label>
          <GroupPicker value={meta.groupId} onChange={id => onChange({ groupId: id, studentId: '' })} />
        </div>

        {/* Student */}
        {meta.assignTo === 'student' && (
          <div>
            <Label>Студент</Label>
            <TeacherSelect
              value={meta.studentId}
              onChange={id => onChange({ studentId: id })}
              placeholder="Выберите студента"
              options={[{ value: '', label: 'Выберите студента' }, ...groupStudents.map(s => ({ value: s.id, label: s.name }))]}
            />
          </div>
        )}

        {/* Title */}
        <div>
          <Label>Тема задания</Label>
          <input
            value={meta.title}
            onChange={e => onChange({ title: e.target.value })}
            placeholder="Например: Задачи на гидролиз"
            style={inputStyle}
          />
        </div>

        {/* Description */}
        <div>
          <Label>Описание (необязательно)</Label>
          <textarea
            value={meta.description}
            onChange={e => onChange({ description: e.target.value })}
            placeholder="Задание, ссылки, требования..."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', minHeight: 68 }}
          />
        </div>

        {/* Due date */}
        <div>
          <Label>Дедлайн</Label>
          <CalendarPicker value={meta.dueDate} onChange={v => onChange({ dueDate: v })} />
        </div>

        {/* Lesson link */}
        <div>
          <Label>Привязать к уроку</Label>
          <LessonPicker value={meta.lessonId} title={meta.title} onChange={id => onChange({ lessonId: id })} />
        </div>
      </GlassCard>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

type MainTab = 'compose' | 'trainer' | 'preview'

export default function TeacherHomeworkCreatePage() {
  const setActivePage = useTeacher(s => s.setActivePage)
  const selectedGroupId = useTeacher(s => s.selectedGroupId)

  const [meta, setMeta] = useState<Meta>({
    // Prefill the group picked on the homework page; empty = assign to all.
    assignTo: 'group', groupId: selectedGroupId ?? '', studentId: '',
    title: '', description: '', dueDate: '', lessonId: '',
  })
  const [activeTab, setActiveTab] = useState<MainTab>('compose')
  const [hwTasks, setHwTasks] = useState<HWTask[]>([])
  const [hardTasks, setHardTasks] = useState<HWTask[]>([])
  const [trainerFilters, setTrainerFilters] = useState<TrainerFilters>({ search: '', subject: '', section: '', topic: '', part: '', line: '', source: '' })
  const [trainerAddedIds, setTrainerAddedIds] = useState<Set<number>>(new Set())
  const [trainerDialogTaskId, setTrainerDialogTaskId] = useState<string | null>(null)
  const [published, setPublished] = useState(false)
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)
  // Shared via the store so the dashboard hides the top-right widget pill while
  // the docked twin's draft/publish buttons occupy that corner.
  const docked = useTeacher(s => s.headerDocked)
  const setDocked = useTeacher(s => s.setHeaderDocked)

  const dockGlass = {
    border: '1px solid rgba(255,255,255,0.9)',
    background: 'rgba(255,255,255,0.86)',
    backdropFilter: 'blur(14px) saturate(180%)',
    WebkitBackdropFilter: 'blur(14px) saturate(180%)',
    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.9), 0 6px 20px rgba(21,18,31,0.14)',
  } as const

  const backBtn = <><ArrowLeft size={15} strokeWidth={2} /> Назад</>
  const draftLabel = 'Черновик'

  function updateMeta(p: Partial<Meta>) { setMeta(m => ({ ...m, ...p })) }

  function updateTask(id: string, p: Partial<HWTask>, isHard = false) {
    const setter = isHard ? setHardTasks : setHwTasks
    setter(ts => ts.map(t => t.id === id ? { ...t, ...p } : t))
  }

  function deleteTask(id: string, isHard = false) {
    const setter = isHard ? setHardTasks : setHwTasks
    setter(ts => ts.filter(t => t.id !== id))
    if (!isHard) {
      const removed = hwTasks.find(t => t.id === id)
      if (removed?.bankId) setTrainerAddedIds(prev => { const n = new Set(prev); n.delete(removed.bankId!); return n })
    }
  }

  function addCustomTask(type: HWTaskType, isHard = false) {
    const t = makeTask(type)
    if (isHard) setHardTasks(ts => [...ts, t])
    else setHwTasks(ts => [...ts, t])
  }

  function addFromBank(
    bt: BankTask,
    overrides: { question: string; answer: string; solution: string } = { question: bt.question, answer: bt.answer, solution: bt.solution },
    savedToTrainer?: 'update' | 'both',
  ) {
    const t = taskFromBank({ ...bt, question: overrides.question, answer: overrides.answer, solution: overrides.solution })
    // Mark as modified only if the teacher actually edited it AND didn't already
    // push it back to the trainer inline (replace / add-as-new) — that keeps the
    // publish-time "save to trainer?" dialog from re-asking about a resolved task.
    const edited = overrides.question !== bt.question || overrides.answer !== bt.answer || overrides.solution !== bt.solution
    t.modified = edited && !savedToTrainer
    t.savedToTrainer = savedToTrainer
    setHwTasks(ts => [...ts, t])
    setTrainerAddedIds(prev => new Set(prev).add(bt.id))
  }

  function handleTrainerDialog(choice: 'update' | 'both' | 'skip') {
    if (trainerDialogTaskId) {
      updateTask(trainerDialogTaskId, { savedToTrainer: choice, modified: false })
    }
    setTrainerDialogTaskId(null)
  }

  function handlePublish() {
    const modifiedBankTasks = hwTasks.filter(t => t.source === 'bank' && t.modified && !t.savedToTrainer)
    if (modifiedBankTasks.length > 0) {
      setTrainerDialogTaskId(modifiedBankTasks[0].id)
      return
    }
    if (meta.lessonId) {
      setShowPublishConfirm(true)
      return
    }
    doPublish()
  }

  function doPublish() {
    setShowPublishConfirm(false)
    setPublished(true)
    setTimeout(() => setActivePage('homework'), 1600)
  }

  const TABS: { key: MainTab; label: string; icon: React.ElementType }[] = [
    { key: 'compose', label: 'Составить', icon: AlignLeft },
    { key: 'trainer', label: 'Из тренажера', icon: BookOpen },
    { key: 'preview', label: 'Предпросмотр', icon: Eye },
  ]

  return (
    // Single scroll container — same pattern as TeacherLessonEditorPage.
    // marginTop:-100 / paddingTop:100 lets content scroll under the floating topbar.
    <div
      onScroll={e => setDocked((e.currentTarget as HTMLElement).scrollTop > 64)}
      style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarGutter: 'stable', marginTop: -100, paddingTop: 100 }}
    >
      {/* ── Docked twin — fixed on the topbar line ── */}
      <AnimatePresence>
        {docked && (
          <motion.div
            key="hw-dock"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'fixed', top: 30, left: 32, right: 32, zIndex: 80,
              display: 'flex', alignItems: 'center', gap: 12, pointerEvents: 'none',
            }}
          >
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
              onClick={() => setActivePage('homework')}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                padding: '9px 16px 9px 12px', borderRadius: 999, ...dockGlass,
                color: '#0B0B0D', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit', pointerEvents: 'auto',
              }}
            >
              {backBtn}
            </motion.button>

            <div style={{
              flexShrink: 1, minWidth: 0, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              padding: '9px 16px', borderRadius: 999, ...dockGlass,
              fontSize: 14, fontWeight: 700, color: '#0B0B0D', pointerEvents: 'auto',
            }}>
              {meta.title || 'Создать домашнее задание'}
            </div>

            <div style={{ flexGrow: 1, flexBasis: 0 }} />

            <button
              style={{
                flexShrink: 0, padding: '9px 16px', borderRadius: 999, ...dockGlass,
                cursor: 'pointer', fontSize: 13.5, fontWeight: 600, color: '#6F6F76',
                fontFamily: 'inherit', pointerEvents: 'auto',
              }}
            >
              {draftLabel}
            </button>
            <TeacherSaveButton
              label="Опубликовать" savedLabel="Опубликовано!"
              icon={<Send size={14} />}
              saved={published} onClick={handlePublish}
              style={{ boxShadow: '0 6px 20px rgba(123,63,204,0.32)', pointerEvents: 'auto' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── All page content in the scroll flow ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '4px 0 48px' }}>

        {/* Rest-state header — in scroll flow, fades out when docked. Title is
            absolutely centred on the viewport (not flex-centred between the side
            blocks), so it stays at the true screen centre regardless of the
            differing widths of the back button and the right-hand actions. */}
        <motion.div
          style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 24px 14px' }}
          animate={{ opacity: docked ? 0 : 1 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
            onClick={() => setActivePage('homework')}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
              padding: '9px 16px 9px 12px', borderRadius: 999, border: '1px solid rgba(0,0,0,0.06)',
              background: 'rgba(255,255,255,0.96)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
              color: '#0B0B0D', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {backBtn}
          </motion.button>

          <div style={{
            position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
            maxWidth: '44%', pointerEvents: 'none',
            fontSize: 18, fontWeight: 700, color: '#0B0B0D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center',
          }}>
            Создать домашнее задание
            {meta.title && <span style={{ color: '#9A9AA2', fontWeight: 500 }}> — {meta.title}</span>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{ fontSize: 12, color: '#9A9AA2', fontWeight: 600 }}>
              {hwTasks.length} зад.{hardTasks.length > 0 ? ` + ${hardTasks.length} сложн.` : ''}
            </div>
            <button
              style={{
                padding: '9px 18px', borderRadius: 999, border: '1px solid rgba(0,0,0,0.08)',
                background: 'rgba(255,255,255,0.96)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', cursor: 'pointer',
                fontSize: 13.5, fontWeight: 600, color: '#6F6F76', fontFamily: 'inherit',
              }}
            >
              {draftLabel}
            </button>
            <TeacherSaveButton
              label="Опубликовать" savedLabel="Опубликовано!"
              icon={<Send size={14} />}
              saved={published} onClick={handlePublish}
            />
          </div>
        </motion.div>

        {/* ── Three-column body ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>

        {/* Left panel */}
        <div style={{
          padding: '0 0 20px 24px', flexShrink: 0,
          position: 'sticky', top: 20,
        }}>
          <LeftPanel meta={meta} onChange={updateMeta} />
        </div>

        {/* Center */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '0 0 20px 20px' }}>

          {/* Tab bar */}
          <div style={{
            display: 'flex', gap: 4, marginBottom: 16,
            background: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(12px)',
            borderRadius: 14, padding: 4,
            alignSelf: 'flex-start',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            border: '1px solid rgba(255,255,255,0.9)',
          }}>
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 11, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600,
                  background: activeTab === tab.key ? '#fff' : 'transparent',
                  color: activeTab === tab.key ? '#7B3FCC' : '#6F6F76',
                  fontFamily: 'inherit', transition: 'all 0.15s',
                  boxShadow: activeTab === tab.key ? '0 2px 10px rgba(0,0,0,0.09)' : 'none',
                }}
              >
                <tab.icon size={14} />
                {tab.label}
                {tab.key === 'preview' && hwTasks.length > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    background: activeTab === tab.key ? '#EEDBFF' : '#E0E0E6',
                    color: activeTab === tab.key ? '#7B3FCC' : '#9A9AA2',
                    borderRadius: 6, padding: '1px 6px',
                  }}>
                    {hwTasks.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ paddingRight: 4 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                style={{ paddingBottom: 32 }}
              >
                {activeTab === 'compose' && (
                  <>
                    <ComposeTab
                      tasks={hwTasks}
                      onUpdate={(id, p) => updateTask(id, p)}
                      onDelete={id => deleteTask(id)}
                      onAdd={type => addCustomTask(type)}
                    />
                    <HardTaskAccordion
                      groupId={meta.groupId}
                      tasks={hardTasks}
                      onUpdate={(id, p) => updateTask(id, p, true)}
                      onDelete={id => deleteTask(id, true)}
                      onAdd={type => addCustomTask(type, true)}
                    />
                  </>
                )}
                {activeTab === 'trainer' && (
                  <TrainerTab
                    addedIds={trainerAddedIds}
                    filters={trainerFilters}
                    onAdd={addFromBank}
                  />
                )}
                {activeTab === 'preview' && (
                  <>
                    <PreviewTab
                      tasks={hwTasks}
                      onDelete={id => deleteTask(id)}
                      onOpenTrainerDialog={id => setTrainerDialogTaskId(id)}
                    />
                    {hardTasks.length > 0 && (
                      <div style={{ marginTop: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <Star size={14} style={{ color: '#F59E0B', fill: '#F59E0B' }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#8B6000' }}>Сложное задание (80%+)</span>
                        </div>
                        <PreviewTab
                          tasks={hardTasks}
                          onDelete={id => deleteTask(id, true)}
                          onOpenTrainerDialog={id => setTrainerDialogTaskId(id)}
                        />
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Right column — always reserves width so center never reflows on tab switch */}
        <div style={{ width: 284, flexShrink: 0, overflow: 'hidden' }}>
          <AnimatePresence>
            {activeTab === 'trainer' && (
              <TrainerFilterPanel
                key="trainer-filter"
                filters={trainerFilters}
                onChange={p => setTrainerFilters(f => ({ ...f, ...p }))}
              />
            )}
          </AnimatePresence>
        </div>
        </div>{/* end three-column */}
      </div>{/* end page content */}

      {/* SaveToTrainer dialog */}
      <AnimatePresence>
        {trainerDialogTaskId && (
          <SaveToTrainerDialog key="save-dialog" onChoice={handleTrainerDialog} />
        )}
      </AnimatePresence>

      {/* Publish with lesson confirmation */}
      <AnimatePresence>
        {showPublishConfirm && (() => {
          const lesson = courseLessons.find(l => l.id === meta.lessonId)
          return (
            <motion.div
              key="publish-confirm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 16 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                style={{ background: '#fff', borderRadius: 22, padding: '28px 28px 22px', width: 380, boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: '#EEDBFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BookOpen size={20} style={{ color: '#7B3FCC' }} />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0B0B0D' }}>Публикация домашки</div>
                </div>
                <div style={{ fontSize: 13, color: '#6F6F76', marginBottom: 6, lineHeight: 1.55 }}>
                  Домашнее задание будет привязано к уроку:
                </div>
                <div style={{ background: '#F5F0FF', borderRadius: 12, padding: '10px 14px', marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#7B3FCC' }}>{lesson?.lessonTitle}</div>
                  <div style={{ fontSize: 11, color: '#9A9AA2', marginTop: 2 }}>{lesson?.courseTitle}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setShowPublishConfirm(false)}
                    style={{ flex: 1, padding: '10px 0', borderRadius: 14, border: '1.5px solid rgba(0,0,0,0.1)', cursor: 'pointer', background: 'transparent', fontSize: 13, fontWeight: 600, color: '#6F6F76', fontFamily: 'inherit' }}
                  >
                    Отмена
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={doPublish}
                    style={{ flex: 2, padding: '10px 0', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #9B6DFF 0%, #7B3FCC 100%)', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(123,63,204,0.3)' }}
                  >
                    <Send size={14} /> Опубликовать
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}
