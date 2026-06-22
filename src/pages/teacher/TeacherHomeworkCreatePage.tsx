import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Send, Plus, X, Trash2,
  Star, ChevronDown, ChevronUp, Search,
  AlignLeft, CheckSquare, Type, Shuffle, Eye,
  BookOpen, AlertCircle, Check, GripVertical, Sparkles,
  ChevronLeft, ChevronRight, Calendar, Users,
  PenLine, ArrowUpDown, ArrowUp, ArrowDown, Table as TableIcon,
} from 'lucide-react'
import { useTeacher } from '../../store/teacherStore'
import { useTaskBank } from '../../store/taskBankStore'
import { supabase } from '../../lib/supabase'
import { useGroups, useStudents, useAllStudents, resolveIndividualGroup } from '../../lib/useGroups'
import { useHomework, type HardTaskDef } from '../../lib/useHomework'
import { useCourseLessons, type CourseLesson } from '../../lib/useCourseLessons'
import {
  SOURCES, linesForSelection, sectionsForSubject, topicsForSubject,
} from '../../data/taskBankData'
import type { Task as BankTask, Subject } from '../../data/taskBankData'
import { useCurriculum } from '../../store/curriculumStore'
import { useOptionMerger, sectionScope, topicScope, SOURCE_SCOPE } from '../../store/taskMetaStore'
import TeacherSelect from '../../components/teacher/TeacherSelect'
import MultiSelectField from '../../components/MultiSelectField'
import TeacherSaveButton from '../../components/teacher/TeacherSaveButton'
import WhiteboardCanvas from '../../components/teacher/WhiteboardCanvas'
import RichConditionEditor from '../../components/teacher/RichConditionEditor'
import TableEditor from '../../components/teacher/TableEditor'

// ─── Types ─────────────────────────────────────────────────────────────────────

type HWTaskType = 'text' | 'choice' | 'fill' | 'match' | 'whiteboard' | 'sequence' | 'table'

type HWTask = {
  id: string
  source: 'custom' | 'bank'
  bankId?: number
  modified: boolean
  savedToTrainer?: 'update' | 'both' | 'skip'
  type: HWTaskType
  question: string
  answer: string
  image?: string | null
  choices?: string[]
  correctChoices?: number[]
  pairs?: { left: string; right: string }[]
  sequenceItems?: string[]
  table?: { headers: string[]; rows: string[][]; emptyCells?: Record<string, boolean>; blankCells?: Record<string, boolean>; cellImages?: Record<string, string>; cellImageSizes?: Record<string, number> }
  canvasData?: string
}

function makeTask(type: HWTaskType): HWTask {
  return {
    id: Math.random().toString(36).slice(2),
    source: 'custom', modified: false,
    type, question: '', answer: '',
    choices: type === 'choice' ? ['', '', '', ''] : undefined,
    correctChoices: type === 'choice' ? [0] : undefined,
    pairs: type === 'match' ? [{ left: '', right: '' }, { left: '', right: '' }] : undefined,
    sequenceItems: type === 'sequence' ? ['', ''] : undefined,
    table: type === 'table' ? { headers: ['Заголовок 1', 'Заголовок 2'], rows: [['', ''], ['', '']] } : undefined,
  }
}

function taskFromBank(bt: BankTask): HWTask {
  return {
    id: Math.random().toString(36).slice(2),
    source: 'bank', bankId: bt.id, modified: false,
    type: 'text', question: bt.question, answer: bt.answer,
    image: bt.questionImage ?? null,
  }
}

// Собрать определения сложных заданий для ученика: и банковские, и свободные.
// `key` стабилен — связывает определение ⇄ ответ ученика ⇄ ревью учителя.
function buildHardTaskDefs(tasks: HWTask[]): HardTaskDef[] {
  return tasks.map(t => ({
    key: t.bankId != null ? `b${t.bankId}` : `c${t.id}`,
    source: t.source,
    bankId: t.bankId,
    statement: t.question,
    image: t.image ?? null,
    answer: t.answer,
  }))
}

// ─── Style helpers ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '9px 12px', borderRadius: 11,
  border: 'none',
  fontSize: 13, color: 'var(--color-text)',
  background: 'var(--color-bg-input)', outline: 'none',
  fontFamily: 'inherit',
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.4, marginBottom: 5 }}>{children}</div>
}

function GlassCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(var(--glass-rgb), 0.88)',
      backdropFilter: 'blur(16px) saturate(180%)',
      WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      border: '1px solid var(--color-border-glass)',
      borderRadius: 18,
      boxShadow: 'var(--shadow-sm-page)',
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
      options={options.map(o => ({ value: o, label: o }))}
    />
  )
}

// ─── Task type config ──────────────────────────────────────────────────────────

const TASK_TYPES: { type: HWTaskType; label: string; hint: string; icon: React.ElementType; color: string; bg: string }[] = [
  { type: 'text',       label: 'Текстовый ответ',    hint: 'Развёрнутый ответ',  icon: AlignLeft,   color: 'var(--color-accent)',           bg: 'var(--color-purple-soft)' },
  { type: 'choice',     label: 'Выбор ответа',        hint: 'Один или несколько', icon: CheckSquare, color: 'var(--color-green-text)',       bg: 'var(--color-green-soft)' },
  { type: 'fill',       label: 'Вписать слово',        hint: 'Слово / фраза',      icon: Type,        color: 'var(--color-peach-text)',       bg: 'var(--color-peach-soft)' },
  { type: 'match',      label: 'Сопоставление',        hint: 'Таблица А1 Б2 В3',   icon: Shuffle,     color: 'var(--color-rose-text)',        bg: 'var(--color-rose-soft)' },
  { type: 'sequence',   label: 'Последовательность',   hint: 'Расставить порядок', icon: ArrowUpDown, color: 'var(--color-yellow-text)',      bg: 'var(--color-yellow-soft)' },
  { type: 'table',      label: 'Таблица',              hint: 'Заполнить таблицу',  icon: TableIcon,   color: 'var(--color-teal-pill-text)',   bg: 'var(--color-teal-pill-bg)' },
  { type: 'whiteboard', label: 'Доска',                hint: 'Рисунок на доске',   icon: PenLine,     color: 'var(--color-blue-pill-text)',   bg: 'var(--color-blue-pill-bg)' },
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
          background: 'var(--color-bg-input)', borderRadius: 22, padding: '28px 28px 22px',
          width: 380, boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--color-peach-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={20} style={{ color: 'var(--color-peach-text)' }} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>Задание изменено</div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 20, lineHeight: 1.55 }}>
          Это задание взято из тренажера и было изменено. Что сделать с обновлённой версией?
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { value: 'update' as const, label: 'Обновить в тренажере', desc: 'Заменить оригинал исправленным', color: 'var(--color-accent)', bg: 'var(--color-purple-soft)' },
            { value: 'both'   as const, label: 'Сохранить оба',        desc: 'Добавить как новое, оригинал сохранить', color: 'var(--color-green-text)', bg: 'var(--color-green-soft)' },
            { value: 'skip'   as const, label: 'Только в домашку',     desc: 'В тренажер не добавлять',              color: 'var(--color-muted)', bg: 'var(--color-bg)' },
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
                <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 2 }}>{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Single task card (editable) ───────────────────────────────────────────────

const stripHtml = (html: string) =>
  html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

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
            borderBottom: expanded ? '1px solid var(--color-border-soft)' : 'none',
            cursor: 'pointer',
          }}
          onClick={() => setExpanded(e => !e)}
        >
          <GripVertical size={14} style={{ color: 'var(--color-text-4)', flexShrink: 0, cursor: 'grab' }} />
          <div style={{
            fontSize: 11, fontWeight: 700,
            color: cfg.color, background: cfg.bg,
            borderRadius: 7, padding: '2px 8px', flexShrink: 0,
          }}>
            {index + 1}. {cfg.label}
          </div>
          {task.source === 'bank' && (
            <div style={{
              fontSize: 10, fontWeight: 600, color: 'var(--color-text-3)',
              background: 'var(--color-bg)', borderRadius: 6, padding: '2px 7px', flexShrink: 0,
            }}>
              из тренажера
            </div>
          )}
          {task.modified && (
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--color-peach-text)',
              background: 'var(--color-peach-soft)', borderRadius: 6, padding: '2px 7px', flexShrink: 0,
            }}>
              изменено
            </div>
          )}
          <div style={{ flex: 1, fontSize: 12, color: 'var(--color-text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {stripHtml(task.question) || <span style={{ fontStyle: 'italic' }}>без текста</span>}
          </div>
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            style={{
              width: 26, height: 26, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'var(--color-bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)', flexShrink: 0,
            }}
          >
            <Trash2 size={13} />
          </button>
          <div style={{ color: 'var(--color-text-4)', flexShrink: 0 }}>
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
                  <RichConditionEditor
                    value={task.question}
                    onChange={updateQuestion}
                    placeholder="Условие задания..."
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
                              borderColor: (task.correctChoices ?? []).includes(ci) ? 'var(--color-accent)' : 'var(--color-border)',
                              background: (task.correctChoices ?? []).includes(ci) ? 'var(--color-accent)' : 'transparent',
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
                              style={{ width: 22, height: 22, borderRadius: 6, border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)', flexShrink: 0 }}
                            >
                              <X size={11} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => onUpdate({ choices: [...(task.choices ?? []), ''] })}
                        style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: 'none', background: 'var(--color-bg)', cursor: 'pointer', fontSize: 12, color: 'var(--color-muted)', fontFamily: 'inherit' }}
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
                          <div style={{ color: 'var(--color-text-4)', fontSize: 16 }}>↔</div>
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
                              style={{ width: 22, height: 22, borderRadius: 6, border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)', flexShrink: 0 }}
                            >
                              <X size={11} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => onUpdate({ pairs: [...(task.pairs ?? []), { left: '', right: '' }] })}
                        style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: 'none', background: 'var(--color-bg)', cursor: 'pointer', fontSize: 12, color: 'var(--color-muted)', fontFamily: 'inherit' }}
                      >
                        <Plus size={12} /> Добавить пару
                      </button>
                    </div>
                  </div>
                )}

                {/* Sequence items */}
                {task.type === 'sequence' && (() => {
                  const items = task.sequenceItems ?? ['', '']
                  const setItems = (next: string[]) => onUpdate({ sequenceItems: next })
                  const reorderBtn = (disabled: boolean): React.CSSProperties => ({
                    width: 24, height: 24, borderRadius: 6, border: 'none', background: 'var(--color-bg-3)',
                    cursor: disabled ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--color-text-3)', flexShrink: 0, opacity: disabled ? 0.4 : 1,
                  })
                  return (
                    <div>
                      <Label>Элементы в правильном порядке</Label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {items.map((it, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 24, height: 24, borderRadius: 8, flexShrink: 0, background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
                            <input value={it} onChange={e => { const n = [...items]; n[i] = e.target.value; setItems(n) }} placeholder={`Шаг ${i + 1}`} style={{ ...inputStyle, flex: 1 }} />
                            <button onClick={() => { if (i > 0) { const n = [...items];[n[i - 1], n[i]] = [n[i], n[i - 1]]; setItems(n) } }} disabled={i === 0} style={reorderBtn(i === 0)}><ArrowUp size={12} /></button>
                            <button onClick={() => { if (i < items.length - 1) { const n = [...items];[n[i + 1], n[i]] = [n[i], n[i + 1]]; setItems(n) } }} disabled={i === items.length - 1} style={reorderBtn(i === items.length - 1)}><ArrowDown size={12} /></button>
                            {items.length > 2 && (
                              <button onClick={() => setItems(items.filter((_, j) => j !== i))} style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)', flexShrink: 0 }}><X size={11} /></button>
                            )}
                          </div>
                        ))}
                        <button onClick={() => setItems([...items, ''])} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: 'none', background: 'var(--color-bg)', cursor: 'pointer', fontSize: 12, color: 'var(--color-muted)', fontFamily: 'inherit' }}>
                          <Plus size={12} /> Добавить шаг
                        </button>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 6 }}>Ученик увидит элементы вперемешку и расставит их в этом порядке.</div>
                    </div>
                  )
                })()}

                {/* Table builder */}
                {task.type === 'table' && (
                  <div>
                    <Label>Таблица — нажмите «Вписать» в ячейках, куда ученик пишет ответ</Label>
                    <TableEditor
                      value={task.table ?? { headers: ['Заголовок 1', 'Заголовок 2'], rows: [['', ''], ['', '']] }}
                      onChange={table => onUpdate({ table })}
                      accent={cfg.color}
                      accentBg={cfg.bg}
                      allowCellImages
                    />
                  </div>
                )}

                {/* Whiteboard canvas */}
                {task.type === 'whiteboard' && (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginBottom: 6 }}>Ученик нарисует ответ здесь</div>
                    <WhiteboardCanvas readOnly />
                  </div>
                )}

                {/* Answer (for text/fill) */}
                {(task.type === 'text' || task.type === 'fill') && (
                  <div>
                    <input
                      value={task.answer}
                      onChange={e => updateAnswer(e.target.value)}
                      placeholder={task.type === 'fill' ? 'Эталонный ответ...' : 'Эталонный ответ...'}
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

// ─── Right panel: task type picker (shown on compose tab) ─────────────────────

const TASK_TYPE_DESCS: Record<HWTaskType, string> = {
  text:       'Развёрнутый ответ',
  choice:     'Один или несколько',
  fill:       'Слово / фраза',
  match:      'Таблица А1 Б2 В3',
  sequence:   'Расставить порядок',
  table:      'Заполнить таблицу',
  whiteboard: 'Рисунок на доске',
}

function ComposeTypePanel({ onAdd, onAddHard }: { onAdd: (type: HWTaskType) => void; onAddHard: (type: HWTaskType) => void }) {
  const [active, setActive] = useState<HWTaskType | null>(null)
  function flash(type: HWTaskType, cb: (t: HWTaskType) => void) {
    cb(type); setActive(type); setTimeout(() => setActive(null), 280)
  }
  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.8 }}
      style={{
        width: 220, flexShrink: 0,
        background: 'rgba(var(--glass-rgb), 0.88)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid var(--color-border-glass)',
        borderRadius: 18,
        boxShadow: 'var(--shadow-sm-page)',
        padding: '16px 12px',
        display: 'flex', flexDirection: 'column', gap: 6,
        margin: '0 24px 20px 0',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, marginBottom: 4 }}>
        ТИП ЗАДАНИЯ
      </div>
      {TASK_TYPES.map(t => (
        <button
          key={t.type}
          onClick={() => flash(t.type, onAdd)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 13,
            border: `1.5px solid ${active === t.type ? t.color : 'transparent'}`,
            background: active === t.type ? t.bg : 'var(--color-bg-2)',
            cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
            transition: 'all 0.13s',
          }}
          onMouseEnter={e => { if (active !== t.type) (e.currentTarget as HTMLButtonElement).style.background = t.bg }}
          onMouseLeave={e => { if (active !== t.type) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-2)' }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 9, background: t.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <t.icon size={15} style={{ color: t.color }} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>{t.label}</div>
            <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 1 }}>{t.hint}</div>
          </div>
        </button>
      ))}
      <div style={{ height: 1, background: 'var(--color-border)', margin: '6px 0 2px' }} />
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, marginBottom: 2 }}>
        СЛОЖНОЕ ЗАДАНИЕ
      </div>
      {TASK_TYPES.slice(0, 2).map(t => (
        <button
          key={'hard-' + t.type}
          onClick={() => flash(t.type, onAddHard)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px', borderRadius: 11,
            border: '1.5px solid transparent',
            background: 'var(--color-yellow-soft)',
            cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
            transition: 'all 0.13s',
          }}
        >
          <Star size={13} style={{ color: '#F59E0B', fill: '#F59E0B', flexShrink: 0 }} />
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-yellow-text)' }}>{t.label}</div>
        </button>
      ))}
    </motion.div>
  )
}

// ─── Compose tab ───────────────────────────────────────────────────────────────

function ComposeTab({
  tasks, onUpdate, onDelete,
}: {
  tasks: HWTask[]
  onUpdate: (id: string, p: Partial<HWTask>) => void
  onDelete: (id: string) => void
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
          textAlign: 'center', padding: '60px 0', color: 'var(--color-text-4)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        }}>
          <BookOpen size={36} strokeWidth={1.2} />
          <div style={{ fontSize: 13, fontWeight: 600 }}>Выберите тип задания справа</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-5)' }}>и оно появится здесь</div>
        </div>
      )}
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
    easy:   { accent: '#22C55E', soft: 'var(--color-green-soft)', text: 'var(--color-green-text)' },
    medium: { accent: '#F59E0B', soft: 'var(--color-peach-soft)', text: 'var(--color-peach-text)' },
    hard:   { accent: 'var(--color-accent)', soft: 'var(--color-purple-soft)', text: 'var(--color-accent)' },
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
        background: 'rgba(var(--glass-rgb), 0.96)',
        border: modified ? '1px solid rgba(99,84,207,0.35)' : '1px solid var(--color-border-soft)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
        transition: 'border-color 0.2s',
      }}
    >
      {/* Header: badges + actions */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-accent)' }}>Задание {index + 1}</span>
            <span style={{ fontSize: 11, color: '#BDBDC2' }}>·</span>
            <span style={{ padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'var(--color-red-soft)', color: 'var(--color-red-text)' }}>№{task.id}</span>
            <span style={{ padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: 'var(--color-bg-3)', color: 'var(--color-muted)' }}>{task.line} линия</span>
            <span style={{ padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: 'var(--color-bg-3)', color: 'var(--color-muted)' }}>Часть {task.part}</span>
            {modified && (
              <span style={{ padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'var(--color-purple-soft)', color: 'var(--color-accent)' }}>
                изменено
              </span>
            )}
          </div>
          {/* Editable question */}
          <AutoTextarea
            value={editedQuestion}
            onChange={setEditedQuestion}
            placeholder="Текст задания…"
            style={{ fontSize: 15, lineHeight: 1.45, fontWeight: 650, color: 'var(--color-text)' }}
          />
        </div>

        {/* Right action cluster */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <button
            onClick={() => !added && onAdd(task, editedFields(), variantId !== null ? 'both' : justReplaced ? 'update' : undefined)}
            style={{
              padding: '8px 16px', borderRadius: 12, border: 'none',
              cursor: added ? 'default' : 'pointer',
              background: added ? 'var(--color-green-soft)' : 'var(--grad-purple)',
              color: added ? 'var(--color-green-text)' : '#fff',
              fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5,
              boxShadow: added ? 'none' : '0 3px 12px rgba(99,84,207,0.32)',
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
                    border: variantId !== null ? '1px solid rgba(34,197,94,0.4)' : '1px solid var(--color-border-strong)',
                    background: variantId !== null ? 'var(--color-green-soft)' : 'var(--color-bg-3)',
                    fontSize: 11.5, fontWeight: 700,
                    color: variantId !== null ? 'var(--color-green-text)' : 'var(--color-muted)',
                    fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all 0.15s',
                  }}
                >
                  <span style={{
                    width: 26, height: 15, borderRadius: 999, flexShrink: 0, position: 'relative',
                    background: variantId !== null ? '#22C55E' : 'var(--color-bg-5)', transition: 'background 0.18s',
                  }}>
                    <span style={{
                      position: 'absolute', top: 2, left: variantId !== null ? 13 : 2,
                      width: 11, height: 11, borderRadius: '50%', background: 'var(--color-bg-input)',
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
                    border: justReplaced ? '1px solid rgba(34,197,94,0.4)' : '1px solid var(--color-border-strong)',
                    background: justReplaced ? 'var(--color-green-soft)' : 'var(--color-surface)',
                    fontSize: 11.5, fontWeight: 700,
                    color: justReplaced ? 'var(--color-green-text)' : 'var(--color-red-text)',
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

      {/* Image / table in teacher-configured order */}
      {(task.blockOrder ?? ['image', 'table']).map(blockKey => {
        if (blockKey === 'image' && task.questionImage) return (
          <img key="image" src={task.questionImage} alt="" style={{ maxWidth: `${task.questionImageSize ?? 100}%`, borderRadius: 14, border: '1px solid var(--color-border-medium)', alignSelf: 'flex-start', display: 'block' }} />
        )
        if (blockKey === 'table' && task.questionTable) return (
          <div key="table" style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--color-border-medium)', alignSelf: 'flex-start', maxWidth: '100%' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%' }}>
              <thead>
                <tr>{task.questionTable.headers.map((h, hi, arr) => (
                  <th key={h} style={{ borderBottom: '1px solid var(--color-border-medium)', borderRight: hi < arr.length - 1 ? '1px solid var(--color-border-medium)' : undefined, padding: '10px 16px', fontWeight: 700, background: 'var(--color-table-header-bg)', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {task.questionTable.rows.map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 1 ? 'rgba(0,0,0,0.02)' : undefined }}>{row.map((cell, ci) => (
                    <td key={ci} style={{ borderTop: '1px solid var(--color-border)', borderRight: ci < row.length - 1 ? '1px solid var(--color-border)' : undefined, padding: '9px 16px', color: 'var(--color-text)' }}>{cell}</td>
                  ))}</tr>
                ))}
              </tbody>
            </table>
          </div>
        )
        return null
      })}

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
            background: 'rgba(var(--glass-rgb), 0.85)',
          }}
          placeholder="Введите правильный ответ..."
        />
        <p style={{ fontSize: 11, fontWeight: 700, color: palette.text, margin: '4px 0 0' }}>Пояснение</p>
        <AutoTextarea
          value={editedSolution}
          onChange={setEditedSolution}
          placeholder="Пояснение к решению…"
          style={{
            fontSize: 12, lineHeight: 1.6, color: 'var(--color-text-2)',
            background: 'rgba(var(--glass-rgb), 0.6)', borderRadius: 10,
            padding: '8px 10px', borderColor: 'var(--color-border-soft)',
          }}
        />
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 2, borderTop: '1px solid var(--color-border-soft)' }}>
        <span style={{ fontSize: 11, color: 'var(--color-text-5)', flex: 1 }}>{task.section} → {task.topic} · {task.source}</span>
        <button onClick={() => setReported(r => !r)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 8, background: 'none', border: 'none', fontSize: 11, color: reported ? '#C0187A' : 'var(--color-text-5)', cursor: 'pointer', fontFamily: 'inherit' }}>
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
      onFocus={e => { e.currentTarget.style.background = 'rgba(99,84,207,0.04)'; e.currentTarget.style.borderColor = 'rgba(99,84,207,0.25)' }}
      onBlur={e => { e.currentTarget.style.background = restBg; e.currentTarget.style.borderColor = restBorder }}
    />
  )
}

// ─── Trainer tab (bank picker) ─────────────────────────────────────────────────

type TrainerFilters = { search: string; subject: string; sections: string[]; topics: string[]; parts: string[]; lines: string[]; source: string }

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
    if (filters.sections.length && !filters.sections.includes(t.section)) return false
    if (filters.topics.length && !filters.topics.includes(t.topic)) return false
    if (filters.parts.length && !filters.parts.includes(String(t.part))) return false
    if (filters.lines.length && !filters.lines.includes(String(t.line))) return false
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
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-4)', fontSize: 13 }}>
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
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-4)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
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
                      style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-peach-text)', background: 'var(--color-peach-soft)', borderRadius: 6, padding: '2px 7px', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      ⚠ изменено
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.55, marginBottom: 8 }}>
                  {stripHtml(t.question) || <span style={{ color: 'var(--color-text-4)', fontStyle: 'italic' }}>Без текста</span>}
                </div>

                {t.type === 'choice' && t.choices && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                    {t.choices.map((ch, ci) => (
                      <div key={ci} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '5px 10px', borderRadius: 8,
                        background: (t.correctChoices ?? []).includes(ci) ? 'var(--color-green-soft)' : 'var(--color-bg)',
                      }}>
                        <div style={{
                          width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                          background: (t.correctChoices ?? []).includes(ci) ? 'var(--color-green-text)' : 'var(--color-text-4)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {(t.correctChoices ?? []).includes(ci) && <Check size={10} style={{ color: '#fff' }} />}
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--color-text)' }}>{ch || `Вариант ${ci + 1}`}</span>
                      </div>
                    ))}
                  </div>
                )}

                {t.type === 'match' && t.pairs && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                    {t.pairs.map((p, pi) => (
                      <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, padding: '5px 10px', borderRadius: 8, background: 'var(--color-purple-soft)', fontSize: 12, color: 'var(--color-accent)', fontWeight: 600 }}>
                          {p.left || `Левая ${pi + 1}`}
                        </div>
                        <span style={{ color: 'var(--color-text-4)' }}>↔</span>
                        <div style={{ flex: 1, padding: '5px 10px', borderRadius: 8, background: 'var(--color-peach-soft)', fontSize: 12, color: 'var(--color-peach-text)', fontWeight: 600 }}>
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
                      background: showAnswer.has(t.id) ? 'var(--color-green-soft)' : 'var(--color-bg)',
                      cursor: 'pointer', fontSize: 11, fontWeight: 600,
                      color: showAnswer.has(t.id) ? 'var(--color-green-text)' : 'var(--color-muted)',
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
                style={{ width: 26, height: 26, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--color-bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)', flexShrink: 0 }}
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
  const merge = useOptionMerger()
  useCurriculum(s => s.version) // re-render when the taxonomy is edited
  const subjScopes = filters.subject ? [filters.subject] : ['biology', 'chemistry']
  const sectionOptions = merge(
    sectionsForSubject((filters.subject || 'biology') as Subject),
    subjScopes.map(s => sectionScope(s)),
  )
  const topicsMap = topicsForSubject((filters.subject || 'biology') as Subject)
  const baseTopicOptions = filters.sections.length
    ? [...new Set(filters.sections.flatMap(s => topicsMap[s] ?? []))]
    : Object.values(topicsMap).flat()
  const topicOptions = merge(baseTopicOptions, filters.sections.length ? filters.sections.map(s => topicScope(filters.subject, s)) : subjScopes.map(s => topicScope(s, '')))
  const allLines = (() => {
    const nums = [...new Set(bankTasks
      .filter(t => !filters.subject || t.subject === filters.subject)
      .map(t => t.line))].sort((a, b) => a - b)
    if (filters.subject && (filters.sections.length || filters.parts.length)) {
      const set = new Set(linesForSelection(filters.subject as Subject, filters.sections, filters.parts))
      return nums.filter(n => set.has(n)).map(String)
    }
    return nums.map(String)
  })()

  const hasFilters = !!(filters.sections.length || filters.topics.length || filters.parts.length || filters.lines.length || filters.source)

  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.8 }}
      style={{
        width: 260, flexShrink: 0,
        background: 'rgba(var(--glass-rgb), 0.88)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid var(--color-border-glass)',
        borderRadius: 18,
        boxShadow: 'var(--shadow-sm-page)',
        display: 'flex', flexDirection: 'column', overflowY: 'auto', scrollbarGutter: 'stable',
        padding: '16px', gap: 10,
        margin: '0 24px 20px 0',
      }}
    >
      {/* Header with filter icon */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
        <Search size={14} style={{ color: 'var(--color-text-3)' }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Фильтры</span>
      </div>

      {/* Subject pills */}
      <div style={{ display: 'flex', gap: 5 }}>
        {[{ v: '', l: 'Все' }, { v: 'biology', l: 'Биология' }, { v: 'chemistry', l: 'Химия' }].map(opt => (
          <button
            key={opt.v}
            onClick={() => onChange({ subject: opt.v, sections: [], topics: [], lines: [] })}
            style={{
              flex: 1, padding: '6px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 600,
              background: filters.subject === opt.v ? 'var(--color-purple-soft)' : 'var(--color-bg)',
              color: filters.subject === opt.v ? 'var(--color-accent)' : 'var(--color-muted)',
              fontFamily: 'inherit', transition: 'all 0.15s',
            }}
          >
            {opt.l}
          </button>
        ))}
      </div>

      {/* Dropdown filters */}
      <MultiSelectField label="Раздел" options={sectionOptions} values={filters.sections}
        onChange={v => onChange({ sections: v })} small />
      <MultiSelectField label="Тема" options={topicOptions} values={filters.topics}
        onChange={v => onChange({ topics: v })} small />
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Часть</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['1', '2'] as string[]).map(p => {
            const active = filters.parts.includes(p)
            return (
              <button key={p} onClick={() => onChange({ parts: active ? filters.parts.filter(x => x !== p) : [...filters.parts, p] })}
                style={{ flex: 1, padding: '7px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                  background: active ? 'rgba(139,92,246,0.15)' : 'var(--color-bg-3)',
                  color: active ? 'var(--color-purple-text)' : 'var(--color-muted)' }}>
                {p}
              </button>
            )
          })}
        </div>
      </div>
      <MultiSelectField label="Линия" options={allLines} values={filters.lines}
        onChange={v => onChange({ lines: v })} small />
      <FilterSelect label="Источник" options={merge(SOURCES, SOURCE_SCOPE)} value={filters.source}
        onChange={v => onChange({ source: v })} />

      {hasFilters && (
        <button
          onClick={() => onChange({ sections: [], topics: [], parts: [], lines: [], source: '' })}
          style={{ padding: '8px 0', borderRadius: 12, background: 'var(--color-red-soft)', border: 'none', fontSize: 12, color: 'var(--color-red-text)', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}
        >
          Сбросить фильтры
        </button>
      )}

      <div style={{ fontSize: 11, color: 'var(--color-text-4)', textAlign: 'center', marginTop: 4 }}>
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
  const [trainerFilters, setTrainerFilters] = useState<TrainerFilters>({ search: '', subject: '', sections: [], topics: [], parts: [], lines: [], source: '' })
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set())

  const { students: groupStudents } = useStudents(groupId)

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
          background: open ? 'var(--color-yellow-soft)' : 'var(--color-yellow-soft)',
          cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
        }}
      >
        <Star size={16} style={{ color: '#F59E0B', fill: '#F59E0B' }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-yellow-text)', flex: 1, textAlign: 'left' }}>
          Сложное задание
        </span>
        {tasks.length > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-yellow-text)', background: 'rgba(255,180,0,0.2)', borderRadius: 8, padding: '2px 8px' }}>
            {tasks.length} зад.
          </span>
        )}
        <span style={{ fontSize: 11, color: 'var(--color-yellow-text)', fontWeight: 600 }}>
          {open ? 'Свернуть' : 'Добавить'}
        </span>
        {open ? <ChevronUp size={14} style={{ color: 'var(--color-yellow-text)' }} /> : <ChevronDown size={14} style={{ color: 'var(--color-yellow-text)' }} />}
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
              background: 'var(--color-bg-2)',
              padding: '16px',
              display: 'flex', flexDirection: 'column', gap: 14,
            }}>
              <div style={{ fontSize: 12, color: 'var(--color-yellow-text)', lineHeight: 1.5 }}>
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
                        background: assignTo === opt.v ? 'var(--color-yellow-soft)' : 'var(--color-bg)',
                        color: assignTo === opt.v ? 'var(--color-yellow-text)' : 'var(--color-muted)',
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
                            background: sel ? 'var(--color-yellow-soft)' : 'var(--color-bg-2)',
                            fontFamily: 'inherit', transition: 'background 0.12s',
                          }}
                        >
                          <div style={{
                            width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                            background: sel ? '#F59E0B' : 'var(--color-bg-3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {sel
                              ? <Check size={12} style={{ color: '#fff' }} />
                              : <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-muted)' }}>
                                  {s.name.split(' ').map(p => p[0]).join('').slice(0, 2)}
                                </span>
                            }
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--color-text)', flex: 1 }}>{s.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Mini tabs */}
              <div>
                <div style={{ display: 'flex', gap: 4, marginBottom: 12, background: 'var(--color-bg)', borderRadius: 11, padding: 3 }}>
                  {[{ v: 'compose', l: 'Составить' }, { v: 'trainer', l: 'Из тренажера' }].map(t => (
                    <button
                      key={t.v}
                      onClick={() => setTab(t.v as 'compose' | 'trainer')}
                      style={{
                        flex: 1, padding: '7px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
                        fontSize: 12, fontWeight: 600,
                        background: tab === t.v ? 'var(--color-surface)' : 'transparent',
                        color: tab === t.v ? 'var(--color-accent)' : 'var(--color-muted)',
                        fontFamily: 'inherit', transition: 'all 0.15s',
                        boxShadow: tab === t.v ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                      }}
                    >
                      {t.l}
                    </button>
                  ))}
                </div>

                {tab === 'compose' && (
                  <>
                    <ComposeTab tasks={tasks} onUpdate={onUpdate} onDelete={onDelete} />
                    <div style={{ marginTop: 10 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {TASK_TYPES.map(t => (
                          <button key={t.type} onClick={() => onAdd(t.type)} style={{
                            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 10,
                            border: 'none', background: t.bg, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: t.color, fontFamily: 'inherit',
                          }}>
                            <t.icon size={12} /> {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
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
  background: 'var(--color-bg-2)', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)',
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
          padding: '9px 12px', borderRadius: 11, border: 'none',
          cursor: 'pointer', background: 'var(--color-bg-input)',
          fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.15s',
        }}
      >
        <Calendar size={14} strokeWidth={2} style={{ flexShrink: 0, color: value ? 'var(--color-text)' : 'var(--color-text-3)' }} />
        <div style={{ flex: 1, fontSize: 13, color: value ? 'var(--color-text)' : 'var(--color-text-3)', fontWeight: value ? 600 : 400 }}>
          {value || 'Выберите дату'}
        </div>
        {value && (
          <span
            role="button"
            tabIndex={0}
            onClick={e => { e.stopPropagation(); onChange('') }}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onChange('') } }}
            style={{ width: 20, height: 20, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'var(--color-bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)', flexShrink: 0 }}
          >
            <X size={10} />
          </span>
        )}
        <ChevronDown size={13} style={{ flexShrink: 0, color: 'var(--color-text-4)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
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
              background: 'rgba(var(--glass-rgb), 0.96)',
              backdropFilter: 'blur(16px) saturate(180%)',
              WebkitBackdropFilter: 'blur(16px) saturate(180%)',
              border: '1px solid var(--color-border-glass)', borderRadius: 16,
              boxShadow: 'var(--shadow-dropdown)',
              padding: '14px 12px 12px',
            }}
          >
            {/* Month nav */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <button style={navBtnStyle} onClick={prevMonth}><ChevronLeft size={14} /></button>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{RU_MONTHS[viewMonth]} {viewYear}</span>
              <button style={navBtnStyle} onClick={nextMonth}><ChevronRight size={14} /></button>
            </div>

            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
              {RU_DAYS_SHORT.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: 'var(--color-text-4)', padding: '2px 0' }}>{d}</div>
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
                      background: isSelected ? 'var(--color-accent)' : isToday ? 'var(--color-purple-soft)' : 'transparent',
                      color: isSelected ? '#fff' : isToday ? 'var(--color-accent)' : 'var(--color-text)',
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
  const { groups } = useGroups()
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
          padding: '9px 12px', borderRadius: 11, border: 'none',
          cursor: 'pointer', background: 'var(--color-bg-input)',
          fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.15s',
        }}
      >
        <Users size={14} strokeWidth={2} style={{ flexShrink: 0, color: selected ? 'var(--color-accent)' : 'var(--color-text-3)' }} />
        <div style={{ flex: 1, fontSize: 13, color: selected ? 'var(--color-accent)' : 'var(--color-text-3)', fontWeight: selected ? 600 : 400 }}>
          {selected ? selected.name : 'Группа'}
        </div>
        {selected && (
          <span
            role="button"
            tabIndex={0}
            onClick={e => { e.stopPropagation(); onChange('') }}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onChange('') } }}
            style={{ width: 20, height: 20, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'var(--color-bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)', flexShrink: 0 }}
          >
            <X size={10} />
          </span>
        )}
        <ChevronDown size={13} style={{ flexShrink: 0, color: 'var(--color-text-4)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
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
              background: 'rgba(var(--glass-rgb), 0.96)',
              backdropFilter: 'blur(16px) saturate(180%)',
              WebkitBackdropFilter: 'blur(16px) saturate(180%)',
              border: '1px solid var(--color-border-glass)', borderRadius: 16,
              boxShadow: 'var(--shadow-dropdown)',
              padding: 6,
            }}
          >
            {groups.map(g => (
              <button
                key={g.id}
                onClick={() => { onChange(g.id); setOpen(false) }}
                onMouseEnter={e => { if (g.id !== value) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-5)' }}
                onMouseLeave={e => { if (g.id !== value) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  background: g.id === value ? 'var(--color-purple-soft)' : 'transparent',
                  transition: 'background 0.12s', textAlign: 'left',
                }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                  background: g.id === value ? 'var(--color-accent-soft, var(--color-purple-soft))' : 'var(--color-bg-3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Users size={13} style={{ color: g.id === value ? 'var(--color-accent)' : 'var(--color-text-3)' }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: g.id === value ? 650 : 500, color: g.id === value ? 'var(--color-accent)' : 'var(--color-text)' }}>
                  {g.name}
                </span>
                {g.id === value && <Check size={13} style={{ marginLeft: 'auto', color: 'var(--color-accent)', flexShrink: 0 }} />}
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
  const courseLessons = useCourseLessons()

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
          padding: '9px 12px', borderRadius: 11, border: 'none',
          cursor: 'pointer', background: 'var(--color-bg-input)',
          fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.15s',
        }}
      >
        <BookOpen size={14} strokeWidth={2} style={{ flexShrink: 0, color: selected ? 'var(--color-accent)' : 'var(--color-text-3)' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {selected ? (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.lessonTitle}</div>
              <div style={{ fontSize: 10, color: 'var(--color-text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.courseTitle}</div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--color-text-3)' }}>Без привязки</div>
          )}
        </div>
        {selected && (
          <span
            role="button"
            tabIndex={0}
            onClick={e => { e.stopPropagation(); onChange('') }}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onChange('') } }}
            style={{ width: 20, height: 20, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'var(--color-bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)', flexShrink: 0 }}
          >
            <X size={10} />
          </span>
        )}
        <ChevronDown size={13} style={{ flexShrink: 0, color: 'var(--color-text-4)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
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
              background: 'rgba(var(--glass-rgb), 0.96)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.14)',
            }}
          >
            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 6 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)', pointerEvents: 'none' }} />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Поиск урока..."
                style={{
                  width: '100%', boxSizing: 'border-box', padding: `7px ${query ? 30 : 10}px 7px 30px`,
                  borderRadius: 9, border: 'none',
                  fontSize: 12, color: 'var(--color-text)', background: 'var(--color-bg-input)',
                  outline: 'none', fontFamily: 'inherit',
                }}
              />
              {query && (
                <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--color-text-3)', display: 'flex', alignItems: 'center' }}>
                  <X size={13} />
                </button>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <div onScroll={onScroll} className="no-scrollbar" style={{ maxHeight: 220, overflowY: 'auto' }}>
                {/* Clear option */}
                <button
                  onClick={() => { onChange(''); setOpen(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9, width: '100%',
                    padding: '8px 10px', borderRadius: 9, border: 'none', cursor: 'pointer',
                    background: !value ? 'var(--color-purple-soft)' : 'transparent', textAlign: 'left', fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => { if (value) e.currentTarget.style.background = 'var(--color-bg)' }}
                  onMouseLeave={e => { if (value) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={13} style={{ color: 'var(--color-text-3)' }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: !value ? 'var(--color-accent)' : 'var(--color-muted)' }}>Без привязки</span>
                  {!value && <Check size={13} style={{ color: 'var(--color-accent)', marginLeft: 'auto' }} />}
                </button>

                {/* Suggested section */}
                {suggested.length > 0 && !query && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 8px 4px' }}>
                      <Sparkles size={11} style={{ color: 'var(--color-accent)' }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-accent)', letterSpacing: 0.3 }}>ПОДХОДЯТ К ТЕМЕ</span>
                    </div>
                    {suggested.map(l => (
                      <LessonOption key={l.id} lesson={l} active={value === l.id} suggested onClick={() => { onChange(l.id); setOpen(false) }} />
                    ))}
                    <div style={{ height: 1, background: 'var(--color-border-soft)', margin: '6px 8px' }} />
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.3, padding: '2px 8px 4px' }}>ВСЕ УРОКИ</div>
                  </>
                )}

                {/* All lessons */}
                {filtered.filter(l => !suggestedIds.has(l.id) || !!query).map(l => (
                  <LessonOption key={l.id} lesson={l} active={value === l.id} onClick={() => { onChange(l.id); setOpen(false) }} />
                ))}

                {filtered.length === 0 && (
                  <div style={{ padding: '10px 8px', fontSize: 12, color: 'var(--color-text-3)', textAlign: 'center' }}>Ничего не найдено</div>
                )}
              </div>

              {/* Edge fades */}
              <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 24, background: 'linear-gradient(to bottom, var(--color-bg-input), transparent)', opacity: fade.top, transition: 'opacity 0.2s', pointerEvents: 'none', borderRadius: '8px 8px 0 0' }} />
              <div aria-hidden style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 24, background: 'linear-gradient(to top, var(--color-bg-input), transparent)', opacity: fade.bottom, transition: 'opacity 0.2s', pointerEvents: 'none', borderRadius: '0 0 8px 8px' }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function LessonOption({ lesson, active, suggested, onClick }: {
  lesson: CourseLesson; active: boolean; suggested?: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 9, width: '100%',
        padding: '8px 10px', borderRadius: 9, border: 'none', cursor: 'pointer',
        background: active ? 'var(--color-purple-soft)' : 'transparent', textAlign: 'left', fontFamily: 'inherit',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--color-bg)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: active ? 'var(--color-purple-soft)' : 'var(--color-bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <BookOpen size={13} style={{ color: 'var(--color-accent)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lesson.lessonTitle}</div>
        <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lesson.courseTitle}</div>
      </div>
      {suggested && <Sparkles size={12} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />}
      {active && <Check size={13} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />}
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
  const allStudents = useAllStudents()

  return (
    <div style={{
      width: 260, flexShrink: 0,
      display: 'flex', flexDirection: 'column', gap: 0,
    }}>
      <GlassCard style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Кому */}
        <div style={{ display: 'flex', gap: 5 }}>
          {(['group', 'student'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => onChange({ assignTo: mode, studentId: '' })}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 11, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600,
                background: meta.assignTo === mode ? 'var(--color-purple-soft)' : 'var(--color-bg)',
                color: meta.assignTo === mode ? 'var(--color-accent)' : 'var(--color-muted)',
                fontFamily: 'inherit', transition: 'all 0.15s',
              }}
            >
              {mode === 'group' ? 'Группе' : 'Студенту'}
            </button>
          ))}
        </div>

        {/* Группа — only in group mode */}
        {meta.assignTo === 'group' && (
          <GroupPicker value={meta.groupId} onChange={id => onChange({ groupId: id, studentId: '' })} />
        )}

        {/* Student — direct picker across all students */}
        {meta.assignTo === 'student' && (
          <TeacherSelect
            value={meta.studentId}
            onChange={id => onChange({ studentId: id })}
            placeholder="Студент"
            options={allStudents.map(s => ({ value: s.id, label: s.name }))}
          />
        )}

        {/* Title */}
        <input
          value={meta.title}
          onChange={e => onChange({ title: e.target.value })}
          placeholder="Тема задания"
          style={inputStyle}
        />

        {/* Description */}
        <textarea
          value={meta.description}
          onChange={e => onChange({ description: e.target.value })}
          placeholder="Описание, ссылки, требования..."
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', minHeight: 68 }}
        />

        {/* Due date */}
        <CalendarPicker value={meta.dueDate} onChange={v => onChange({ dueDate: v })} />

        {/* Lesson link */}
        <LessonPicker value={meta.lessonId} title={meta.title} onChange={id => onChange({ lessonId: id })} />
      </GlassCard>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

type MainTab = 'compose' | 'trainer' | 'preview'

export default function TeacherHomeworkCreatePage() {
  const setActivePage = useTeacher(s => s.setActivePage)
  const selectedGroupId = useTeacher(s => s.selectedGroupId)
  const editingHomeworkId = useTeacher(s => s.editingHomeworkId)
  const hwPresetStudentId = useTeacher(s => s.hwPresetStudentId)
  const clearHwPreset = useTeacher(s => s.clearHwPreset)
  const isEditing = !!editingHomeworkId
  const allCourseLessons = useCourseLessons()
  const { createHomework, updateHomework } = useHomework()
  const bankTasks = useTaskBank(s => s.tasks)
  const loadBank = useTaskBank(s => s.load)

  const [meta, setMeta] = useState<Meta>({
    // "ДЗ допом" from the roster pre-scopes a single student; otherwise prefill
    // the group picked on the homework page (empty = assign to all).
    assignTo: hwPresetStudentId ? 'student' : 'group',
    groupId: hwPresetStudentId ? '' : (selectedGroupId ?? ''),
    studentId: hwPresetStudentId ?? '',
    title: '', description: '', dueDate: '', lessonId: '',
  })
  // Consume the preset once so re-entering the composer normally doesn't re-trigger it.
  useEffect(() => { if (hwPresetStudentId) clearHwPreset() }, [hwPresetStudentId, clearHwPreset])
  const { students: groupStudents } = useStudents(meta.groupId || null)
  const [activeTab, setActiveTab] = useState<MainTab>('compose')
  const [hwTasks, setHwTasks] = useState<HWTask[]>([])
  const [hardTasks, setHardTasks] = useState<HWTask[]>([])

  // Edit mode — step 1: fetch the homework once, prefill meta immediately, stash
  // its task ids, and kick off a task-bank load (the composer doesn't load it on
  // its own). Step 2 (below) rebuilds the task cards once the bank arrives.
  const prefilledRef = useRef(false)
  const tasksBuiltRef = useRef(false)
  const [editTaskIds, setEditTaskIds] = useState<{ regular: number[]; hard: number[] } | null>(null)
  const [editHardDefs, setEditHardDefs] = useState<HardTaskDef[] | null>(null)
  useEffect(() => {
    if (!editingHomeworkId || prefilledRef.current) return
    prefilledRef.current = true
    loadBank()
    supabase
      .from('homework')
      .select('group_id, title, due_date, task_ids, hard_task_ids, hard_tasks, lesson_id')
      .eq('id', editingHomeworkId)
      .single()
      .then(({ data }) => {
        if (!data) return
        const hardIds: number[] = Array.isArray(data.hard_task_ids) ? data.hard_task_ids : []
        const allIds: number[] = Array.isArray(data.task_ids) ? data.task_ids : []
        setEditHardDefs(Array.isArray(data.hard_tasks) ? (data.hard_tasks as HardTaskDef[]) : [])
        setEditTaskIds({ regular: allIds.filter(id => !hardIds.includes(id)), hard: hardIds })
        const due = data.due_date
          ? (() => { const [y, m, d] = String(data.due_date).split('-'); return `${d}.${m}.${y}` })()
          : ''
        setMeta(mm => ({
          ...mm,
          assignTo: 'group',
          groupId: data.group_id ?? '',
          dueDate: due,
          title: data.title ?? '',
          lessonId: data.lesson_id ?? '',
        }))
      })
  }, [editingHomeworkId, loadBank])

  // Step 2: reconstruct the task cards from bank ids, once the bank is loaded.
  useEffect(() => {
    if (!editTaskIds || tasksBuiltRef.current || bankTasks.length === 0) return
    tasksBuiltRef.current = true
    const buildFrom = (ids: number[]) => ids
      .map(id => bankTasks.find(b => b.id === id))
      .filter((b): b is BankTask => !!b)
      .map(taskFromBank)
    setHwTasks(buildFrom(editTaskIds.regular))
    // Сложные задания восстанавливаем из hard_tasks (банк + свободные); если их
    // нет (старое ДЗ до перехода) — падаем на банковские id, как раньше.
    if (editHardDefs && editHardDefs.length > 0) {
      setHardTasks(editHardDefs.map(d => ({
        id: d.key.startsWith('c') ? d.key.slice(1) : Math.random().toString(36).slice(2),
        source: d.source, bankId: d.bankId, modified: false,
        type: 'text' as HWTaskType, question: d.statement, answer: d.answer ?? '',
        image: d.image ?? null,
      })))
    } else {
      setHardTasks(buildFrom(editTaskIds.hard))
    }
  }, [editTaskIds, bankTasks, editHardDefs])
  const [trainerFilters, setTrainerFilters] = useState<TrainerFilters>({ search: '', subject: '', sections: [], topics: [], parts: [], lines: [], source: '' })
  const [trainerAddedIds, setTrainerAddedIds] = useState<Set<number>>(new Set())
  const [trainerDialogTaskId, setTrainerDialogTaskId] = useState<string | null>(null)
  const [published, setPublished] = useState(false)
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)
  // Shared via the store so the dashboard hides the top-right widget pill while
  // the docked twin's draft/publish buttons occupy that corner.
  const docked = useTeacher(s => s.headerDocked)
  const setDocked = useTeacher(s => s.setHeaderDocked)

  const dockGlass = {
    border: '1px solid var(--color-border-glass)',
    background: 'rgba(var(--glass-rgb), 0.86)',
    backdropFilter: 'blur(14px) saturate(180%)',
    WebkitBackdropFilter: 'blur(14px) saturate(180%)',
    boxShadow: 'var(--shadow-lg)',
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

  async function doPublish() {
    setShowPublishConfirm(false)

    // Resolve the target group + roster size. For "Студенту" we attach the
    // homework to the student's personal 1:1 group (reuse or auto-create), so it
    // shows up as a card under their name on the homework page.
    let targetGroupId = meta.assignTo === 'group' ? meta.groupId : ''
    let totalStudents = groupStudents.length
    if (meta.assignTo === 'student' && meta.studentId) {
      targetGroupId = (await resolveIndividualGroup(meta.studentId)) ?? ''
      totalStudents = 1
    }

    if (targetGroupId) {
      const regularIds = hwTasks.filter(t => t.bankId != null).map(t => t.bankId!)
      const hardIds = hardTasks.filter(t => t.bankId != null).map(t => t.bankId!)
      const parts = meta.dueDate.split('.')
      const isoDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : meta.dueDate
      const payload = {
        groupId: targetGroupId,
        title: meta.title,
        dueDate: isoDate,
        taskIds: [...regularIds, ...hardIds],
        totalStudents,
        lessonId: meta.lessonId || null,
        hardTaskIds: hardIds,
        hardTotal: hardTasks.length,
        // Полные определения сложных заданий (банк + свободные) — источник правды
        // для пер-задачного рендера у ученика.
        hardTasks: buildHardTaskDefs(hardTasks),
      }
      if (editingHomeworkId) await updateHomework(editingHomeworkId, payload)
      else await createHomework(payload)
    }
    // For edit mode the roster size shouldn't change just because the composer
    // resolved a fresh 1:1 group — keep the existing group (handled above by
    // assignTo defaulting to 'group' with the loaded groupId).
    setPublished(true)
    setTimeout(() => setActivePage('homework'), 1600)
  }

  const TABS: { key: MainTab; label: string; icon: React.ElementType }[] = [
    { key: 'compose', label: 'Составить', icon: AlignLeft },
    { key: 'trainer', label: 'Из тренажера', icon: BookOpen },
  ]

  return (
    // Single scroll container — same pattern as TeacherLessonEditorPage.
    // marginTop:-100 / paddingTop:100 lets content scroll under the floating topbar.
    <div
      onScroll={e => setDocked((e.currentTarget as HTMLElement).scrollTop > 64)}
      style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarGutter: 'stable', marginTop: -100, paddingTop: 100 }}
    >
      {/* ── Docked twin — fixed on the topbar line ── */}
      <div className="docked-pills-row" style={{ position: 'fixed', top: 30, left: 32, right: 32, zIndex: 80, pointerEvents: 'none' }}>
      <AnimatePresence>
        {docked && (
          <motion.div
            key="hw-dock"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: [0, 6, -3.5, 1.5, -0.5, 0] }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.38, ease: [0.34, 1.56, 0.64, 1] }}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, pointerEvents: 'none',
            }}
          >
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
              onClick={() => setActivePage('homework')}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                padding: '9px 16px 9px 12px', borderRadius: 999, ...dockGlass,
                color: 'var(--color-text)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit', pointerEvents: 'auto',
              }}
            >
              {backBtn}
            </motion.button>

            <div style={{
              flexShrink: 1, minWidth: 0, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              padding: '9px 16px', borderRadius: 999, ...dockGlass,
              fontSize: 14, fontWeight: 700, color: 'var(--color-text)', pointerEvents: 'auto',
            }}>
              {meta.title || (isEditing ? 'Редактировать домашку' : 'Создать домашнее задание')}
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
              label={isEditing ? 'Сохранить' : 'Опубликовать'} savedLabel={isEditing ? 'Сохранено!' : 'Опубликовано!'}
              icon={<Send size={14} />}
              saved={published} onClick={handlePublish}
              style={{ boxShadow: '0 6px 20px rgba(99,84,207,0.32)', pointerEvents: 'auto' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      </div>

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
            fontSize: 18, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center',
          }}>
            {isEditing ? 'Редактировать домашку' : 'Создать домашнее задание'}
            {meta.title && <span style={{ color: 'var(--color-text-3)', fontWeight: 500 }}> — {meta.title}</span>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600 }}>
              {hwTasks.length} зад.{hardTasks.length > 0 ? ` + ${hardTasks.length} сложн.` : ''}
            </div>
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
              label={isEditing ? 'Сохранить' : 'Опубликовать'} savedLabel={isEditing ? 'Сохранено!' : 'Опубликовано!'}
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
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '0 20px 20px 20px' }}>

          {/* Tab bar */}
          <div style={{
            display: 'flex', gap: 4, marginBottom: 16,
            background: 'rgba(var(--glass-rgb), 0.7)',
            backdropFilter: 'blur(12px)',
            borderRadius: 14, padding: 4,
            alignSelf: 'flex-start',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            border: '1px solid var(--color-border-glass)',
          }}>
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 11, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600,
                  background: activeTab === tab.key ? 'var(--color-surface)' : 'transparent',
                  color: activeTab === tab.key ? 'var(--color-accent)' : 'var(--color-muted)',
                  fontFamily: 'inherit', transition: 'all 0.15s',
                  boxShadow: activeTab === tab.key ? '0 2px 10px rgba(0,0,0,0.09)' : 'none',
                }}
              >
                <tab.icon size={14} />
                {tab.label}
                {tab.key === 'preview' && hwTasks.length > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    background: activeTab === tab.key ? 'var(--color-purple-soft)' : 'var(--color-bg-3)',
                    color: activeTab === tab.key ? 'var(--color-accent)' : 'var(--color-text-3)',
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
                    />
                    {hardTasks.length > 0 && (
                      <HardTaskAccordion
                        groupId={meta.groupId}
                        tasks={hardTasks}
                        onUpdate={(id, p) => updateTask(id, p, true)}
                        onDelete={id => deleteTask(id, true)}
                        onAdd={type => addCustomTask(type, true)}
                      />
                    )}
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
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-yellow-text)' }}>Сложное задание (80%+)</span>
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

        {/* Right column */}
        <div style={{ flexShrink: 0, position: 'sticky', top: 20, alignSelf: 'flex-start', overflow: 'hidden' }}>
          <AnimatePresence mode="wait">
            {activeTab === 'compose' && (
              <ComposeTypePanel
                key="compose-types"
                onAdd={type => addCustomTask(type)}
                onAddHard={type => addCustomTask(type, true)}
              />
            )}
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
          const lesson = allCourseLessons.find(l => l.id === meta.lessonId)
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
                style={{ background: 'var(--color-bg-input)', borderRadius: 22, padding: '28px 28px 22px', width: 380, boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--color-purple-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BookOpen size={20} style={{ color: 'var(--color-accent)' }} />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>Публикация домашки</div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 6, lineHeight: 1.55 }}>
                  Домашнее задание будет привязано к уроку:
                </div>
                <div style={{ background: 'var(--color-purple-soft)', borderRadius: 12, padding: '10px 14px', marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-accent)' }}>{lesson?.lessonTitle}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 2 }}>{lesson?.courseTitle}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setShowPublishConfirm(false)}
                    style={{ flex: 1, padding: '10px 0', borderRadius: 14, border: '1.5px solid rgba(0,0,0,0.1)', cursor: 'pointer', background: 'transparent', fontSize: 13, fontWeight: 600, color: 'var(--color-muted)', fontFamily: 'inherit' }}
                  >
                    Отмена
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={doPublish}
                    style={{ flex: 2, padding: '10px 0', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'var(--grad-purple)', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(99,84,207,0.3)' }}
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
