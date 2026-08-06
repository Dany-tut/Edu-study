import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Send, Plus, X, Trash2,
  Star, ChevronDown, ChevronUp, Search,
  AlignLeft, CheckSquare, Type, Shuffle, Eye,
  BookOpen, AlertCircle, Check, GripVertical, Sparkles,
  ChevronLeft, ChevronRight, Calendar, Users,
  PenLine, ArrowUpDown, ArrowUp, ArrowDown, Table as TableIcon, Link2,
} from 'lucide-react'
import ScrollFade from '../../components/ScrollFade'
import { useTeacher } from '../../store/teacherStore'
import { useTaskBank } from '../../store/taskBankStore'
import { useT } from '../../lib/i18n'
import { supabase } from '../../lib/supabase'
import { cardChip, cardChipTone } from '../../lib/pillStyles'
import { useGroups, useStudents, useAllStudents, resolveIndividualGroup } from '../../lib/useGroups'
import { useHomework, type HardTaskDef } from '../../lib/useHomework'
import { usePersistentState, readDraft, writeDraft, clearDrafts } from '../../lib/useDraft'
import { useCourseLessons, type CourseLesson } from '../../lib/useCourseLessons'
import {
  SOURCES, linesForSelection, sectionsForSubject, topicsForSubject,
} from '../../data/taskBankData'
import type { Task as BankTask, Subject } from '../../data/taskBankData'
import { useCurriculum } from '../../store/curriculumStore'
import { useOptionMerger, sectionScope, topicScope, SOURCE_SCOPE } from '../../store/taskMetaStore'
import { useTeacherAccess } from '../../lib/teacherAccess'
import { bankSubjectOptionsFor, bankSubjectIdsFor, subjectIcon } from '../../lib/subjects'
import SubjectPicker from '../../components/teacher/SubjectPicker'
import TeacherSelect from '../../components/teacher/TeacherSelect'
import MultiSelectField from '../../components/MultiSelectField'
import TeacherSaveButton from '../../components/teacher/TeacherSaveButton'
import WhiteboardCanvas from '../../components/teacher/WhiteboardCanvas'
import RichConditionEditor from '../../components/teacher/RichConditionEditor'
import TableEditor from '../../components/teacher/TableEditor'
import GrowTextarea, { growMinHeight } from '../../components/teacher/GrowTextarea'
import { useOverlayScroll, ScrollOverlays, fadeMask } from '../../components/teacher/OverlayScroll'
import GoogleFormImportModal from '../../components/teacher/GoogleFormImportModal'
import type { ImportedQuestion } from '../../lib/googleFormsImport'
import { taskTypesFor, makeTask as makeRegistryTask, type TaskTypeId } from '../../data/taskTypes'

// ─── Types ─────────────────────────────────────────────────────────────────────

type HWTaskType = TaskTypeId

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
  // Дефолты по типу берутся из единого реестра (src/data/taskTypes.ts);
  // здесь добавляются только поля, специфичные для этой страницы.
  const { id: _id, label: _label, isHard: _isHard, ...defaults } = makeRegistryTask(type)
  return {
    id: Math.random().toString(36).slice(2),
    source: 'custom', modified: false,
    question: '', answer: '',
    ...defaults,
    type,
  }
}

function taskFromBank(bt: BankTask): HWTask {
  return {
    id: Math.random().toString(36).slice(2),
    source: 'bank', bankId: bt.id, modified: false,
    type: 'extended', question: bt.question, answer: bt.answer,
    image: bt.questionImage ?? null,
  }
}

// Google Forms never exposes the answer key to non-owners — imported questions
// always land without a correct answer; the teacher marks it in the card after.
function hwTaskFromImported(q: ImportedQuestion): HWTask {
  return {
    id: Math.random().toString(36).slice(2),
    source: 'custom', modified: false,
    type: q.type as HWTaskType,
    question: q.title,
    answer: '',
    choices: q.choices,
    correctChoices: (q.type === 'single' || q.type === 'multi') ? [] : undefined,
  }
}

function needsAnswerFlag(t: HWTask): boolean {
  if (t.type === 'single' || t.type === 'multi') return (t.correctChoices ?? []).length === 0
  if (t.type === 'fill' || t.type === 'extended') return !t.answer?.trim()
  return false
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

// Единый реестр (src/data/taskTypes.ts) — подписи, иконки и цвета одни и те же
// здесь, в редакторе курса и в тренажёре. Раньше цвета были продублированы
// вручную и успели разойтись с общей палитрой.
const TASK_TYPES: { type: HWTaskType; label: string; hint: string; icon: React.ElementType; color: string; bg: string }[] =
  taskTypesFor().map(d => ({
    type: d.id, label: d.label, hint: d.hint, icon: d.Icon, ...d.visual,
  }))

function typeConfig(t: HWTaskType) {
  return TASK_TYPES.find(x => x.type === t) ?? TASK_TYPES[0]
}

// ─── Difficulty badge ──────────────────────────────────────────────────────────

// ─── SaveToTrainer dialog ──────────────────────────────────────────────────────

function SaveToTrainerDialog({
  onChoice,
}: { onChoice: (c: 'update' | 'both' | 'skip') => void }) {
  const t = useT()
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
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>{t('Задание изменено')}</div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 20, lineHeight: 1.55 }}>
          {t('Это задание взято из тренажера и было изменено. Что сделать с обновлённой версией?')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { value: 'update' as const, label: t('Обновить в тренажере'), desc: t('Заменить оригинал исправленным'), color: 'var(--color-accent)', bg: 'var(--color-purple-soft)' },
            { value: 'both'   as const, label: t('Сохранить оба'),        desc: t('Добавить как новое, оригинал сохранить'), color: 'var(--color-green-text)', bg: 'var(--color-green-soft)' },
            { value: 'skip'   as const, label: t('Только в домашку'),     desc: t('В тренажер не добавлять'),              color: 'var(--color-muted)', bg: 'var(--color-bg)' },
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
  const t = useT()
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
          <div style={cardChip(cfg.color, { flexShrink: 0 })}>
            {index + 1}. {t(cfg.label)}
          </div>
          {task.source === 'bank' && (
            <div style={cardChipTone('neutral', { flexShrink: 0 })}>
              {t('из тренажера')}
            </div>
          )}
          {task.modified && (
            <div style={cardChipTone('peach', { flexShrink: 0 })}>
              {t('изменено')}
            </div>
          )}
          {needsAnswerFlag(task) && (
            <div style={cardChipTone('peach', { flexShrink: 0 })}>
              {t('нет ответа')}
            </div>
          )}
          <div style={{ flex: 1, fontSize: 12, color: 'var(--color-text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {stripHtml(task.question) || <span style={{ fontStyle: 'italic' }}>{t('без текста')}</span>}
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
                    placeholder={t('Условие задания...')}
                    // Растёт по тексту вместо внутреннего скролла; minHeight —
                    // три строки плюс место, которое autoGrow резервирует под
                    // панель инструментов (иначе она наезжает на текст).
                    autoGrow
                    minHeight={growMinHeight(3, 16, 6) + 54}
                  />
                </div>

                {/* Choice options */}
                {(task.type === 'single' || task.type === 'multi') && task.choices && (
                  <div>
                    <Label>{t('Варианты ответа')}</Label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {task.choices.map((ch, ci) => (
                        <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            onClick={() => {
                              if (task.type === 'single') {
                                onUpdate({ correctChoices: [ci] })
                              } else {
                                const correct = task.correctChoices ?? [0]
                                const isCorrect = correct.includes(ci)
                                onUpdate({ correctChoices: isCorrect ? correct.filter(x => x !== ci) : [...correct, ci] })
                              }
                            }}
                            style={{
                              width: 22, height: 22,
                              borderRadius: task.type === 'single' ? '50%' : 6,
                              border: '2px solid',
                              borderColor: (task.correctChoices ?? []).includes(ci) ? 'var(--color-accent)' : 'var(--color-border)',
                              // Заливка под белой галочкой — приглушённый вариант: --color-accent
                              // подобран как цвет текста и в тёмной теме давал 2.2:1.
                              background: (task.correctChoices ?? []).includes(ci) ? 'var(--color-control-accent)' : 'transparent',
                              cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            {(task.correctChoices ?? []).includes(ci) && <Check size={12} style={{ color: '#fff' }} />}
                          </button>
                          <GrowTextarea
                            value={ch}
                            onChange={v => {
                              const choices = [...(task.choices ?? [])]
                              choices[ci] = v
                              onUpdate({ choices })
                            }}
                            placeholder={`${t('Вариант')} ${ci + 1}`}
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
                        <Plus size={12} /> {t('Добавить вариант')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Match pairs */}
                {task.type === 'matching' && task.pairs && (
                  <div>
                    <Label>{t('Пары для сопоставления')}</Label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {task.pairs.map((pair, pi) => (
                        <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <GrowTextarea
                            value={pair.left}
                            onChange={v => {
                              const pairs = [...(task.pairs ?? [])]
                              pairs[pi] = { ...pairs[pi], left: v }
                              onUpdate({ pairs })
                            }}
                            placeholder={`${t('Левая')} ${pi + 1}`}
                            style={{ ...inputStyle, flex: 1 }}
                          />
                          <div style={{ color: 'var(--color-text-4)', fontSize: 16 }}>↔</div>
                          <GrowTextarea
                            value={pair.right}
                            onChange={v => {
                              const pairs = [...(task.pairs ?? [])]
                              pairs[pi] = { ...pairs[pi], right: v }
                              onUpdate({ pairs })
                            }}
                            placeholder={`${t('Правая')} ${pi + 1}`}
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
                        <Plus size={12} /> {t('Добавить пару')}
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
                      <Label>{t('Элементы в правильном порядке')}</Label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {items.map((it, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 24, height: 24, borderRadius: 8, flexShrink: 0, background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
                            <GrowTextarea value={it} onChange={v => { const n = [...items]; n[i] = v; setItems(n) }} placeholder={`${t('Шаг')} ${i + 1}`} style={{ ...inputStyle, flex: 1 }} />
                            <button onClick={() => { if (i > 0) { const n = [...items];[n[i - 1], n[i]] = [n[i], n[i - 1]]; setItems(n) } }} disabled={i === 0} style={reorderBtn(i === 0)}><ArrowUp size={12} /></button>
                            <button onClick={() => { if (i < items.length - 1) { const n = [...items];[n[i + 1], n[i]] = [n[i], n[i + 1]]; setItems(n) } }} disabled={i === items.length - 1} style={reorderBtn(i === items.length - 1)}><ArrowDown size={12} /></button>
                            {items.length > 2 && (
                              <button onClick={() => setItems(items.filter((_, j) => j !== i))} style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)', flexShrink: 0 }}><X size={11} /></button>
                            )}
                          </div>
                        ))}
                        <button onClick={() => setItems([...items, ''])} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: 'none', background: 'var(--color-bg)', cursor: 'pointer', fontSize: 12, color: 'var(--color-muted)', fontFamily: 'inherit' }}>
                          <Plus size={12} /> {t('Добавить шаг')}
                        </button>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 6 }}>{t('Ученик увидит элементы вперемешку и расставит их в этом порядке.')}</div>
                    </div>
                  )
                })()}

                {/* Table builder */}
                {task.type === 'tableFill' && (
                  <div>
                    <Label>{t('Таблица — нажмите «Вписать» в ячейках, куда ученик пишет ответ')}</Label>
                    <TableEditor
                      value={task.table ?? { headers: [t('Заголовок 1'), t('Заголовок 2')], rows: [['', ''], ['', '']] }}
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
                    <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginBottom: 6 }}>{t('Ученик нарисует ответ здесь')}</div>
                    <WhiteboardCanvas readOnly />
                  </div>
                )}

                {/* Answer (for extended/fill) */}
                {(task.type === 'extended' || task.type === 'fill') && (
                  <div>
                    <GrowTextarea
                      value={task.answer}
                      onChange={updateAnswer}
                      placeholder={t('Эталонный ответ...')}
                      minHeight={growMinHeight(3, 13, 9, 0)}
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

const TASK_TYPE_DESCS: Record<HWTaskType, string> = Object.fromEntries(
  taskTypesFor({ language: true }).map(d => [d.id, d.hint]),
) as Record<HWTaskType, string>

function ComposeTypePanel({ onAdd, onAddHard, onImport, onImportHard }: {
  onAdd: (type: HWTaskType) => void; onAddHard: (type: HWTaskType) => void
  onImport: () => void; onImportHard: () => void
}) {
  const t = useT()
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
        width: 240, flexShrink: 0,
        background: 'rgba(var(--glass-rgb), 0.88)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid var(--color-border-glass)',
        borderRadius: 18,
        boxShadow: 'var(--shadow-sm-page)',
        padding: '16px',
        display: 'flex', flexDirection: 'column', gap: 6,
        margin: '0 24px 20px 0',
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
        {t('ТИП ЗАДАНИЯ')}
      </div>
      {TASK_TYPES.map(tt => (
        <button
          key={tt.type}
          onClick={() => flash(tt.type, onAdd)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 13,
            border: `1.5px solid ${active === tt.type ? tt.color : 'transparent'}`,
            background: active === tt.type ? tt.bg : 'var(--color-bg-2)',
            cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
            transition: 'all 0.13s',
          }}
          onMouseEnter={e => { if (active !== tt.type) (e.currentTarget as HTMLButtonElement).style.background = tt.bg }}
          onMouseLeave={e => { if (active !== tt.type) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-2)' }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 9, background: tt.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <tt.icon size={15} style={{ color: tt.color }} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>{t(tt.label)}</div>
            <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 1 }}>{t(tt.hint)}</div>
          </div>
        </button>
      ))}
      <button
        onClick={onImport}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 12px', borderRadius: 13,
          border: '1.5px dashed var(--color-border-medium)',
          background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
          color: 'var(--color-muted)', fontSize: 11.5, fontWeight: 600,
        }}
      >
        <Link2 size={14} style={{ flexShrink: 0 }} />
        {t('Импорт из Google Forms')}
      </button>
      <div style={{ height: 1, background: 'var(--color-border)', margin: '6px 0 2px' }} />
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
        {t('СЛОЖНОЕ ЗАДАНИЕ')}
      </div>
      {TASK_TYPES.slice(0, 2).map(tt => (
        <button
          key={'hard-' + tt.type}
          onClick={() => flash(tt.type, onAddHard)}
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
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-yellow-text)' }}>{t(tt.label)}</div>
        </button>
      ))}
      <button
        onClick={onImportHard}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 12px', borderRadius: 11,
          border: '1.5px dashed var(--color-border-medium)',
          background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
          color: 'var(--color-muted)', fontSize: 11, fontWeight: 600,
        }}
      >
        <Link2 size={12} style={{ flexShrink: 0 }} />
        {t('Импорт из Google Forms')}
      </button>
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
  const t = useT()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <AnimatePresence>
        {tasks.map((task, i) => (
          <TaskCard
            key={task.id}
            task={task}
            index={i}
            onUpdate={p => onUpdate(task.id, p)}
            onDelete={() => onDelete(task.id)}
          />
        ))}
      </AnimatePresence>
      {tasks.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '60px 0', color: 'var(--color-text-4)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        }}>
          <BookOpen size={36} strokeWidth={1.2} />
          <div style={{ fontSize: 13, fontWeight: 600 }}>{t('Выберите тип задания справа')}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-5)' }}>{t('и оно появится здесь')}</div>
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
  const t = useT()
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
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-accent)' }}>{t('Задание')} {index + 1}</span>
            <span style={{ fontSize: 11, color: '#BDBDC2' }}>·</span>
            <span style={cardChipTone('red')}>№{task.id}</span>
            <span style={cardChipTone('neutral')}>{task.line} {t('линия')}</span>
            <span style={cardChipTone('neutral')}>{t('Часть')} {task.part}</span>
            {modified && (
              <span style={cardChip('var(--color-accent)')}>
                {t('изменено')}
              </span>
            )}
          </div>
          {/* Editable question */}
          <AutoTextarea
            value={editedQuestion}
            onChange={setEditedQuestion}
            placeholder={t('Текст задания…')}
            minHeight={growMinHeight(3, 15, 2, 1)}
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
            {added ? <><Check size={12} /> {t('Добавлено')}</> : <><Plus size={12} /> {t('Добавить')}</>}
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
                  title={t('Добавить как новое задание в тренажёр (новый номер)')}
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
                    ? <>{t('В тренажёре')} · №{variantId}</>
                    : <>{t('В тренажёр')}</>}
                </button>
                )}

                {/* Replace original — also shows the "Заменено" confirmation flash */}
                {(modified || justReplaced) && (
                <button
                  onClick={replaceInTrainer}
                  title={t('Заменить оригинал в тренажёре этим текстом')}
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
                  {justReplaced ? <><Check size={12} /> {t('Заменено')}</> : <><Shuffle size={12} /> {t('Заменить')}</>}
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
        <p style={{ fontSize: 12, fontWeight: 700, color: palette.text, margin: 0 }}>{t('Правильный ответ')}</p>
        <GrowTextarea
          value={editedAnswer}
          onChange={setEditedAnswer}
          minHeight={growMinHeight(3, 14, 9)}
          style={{
            ...inputStyle,
            fontWeight: 700, fontSize: 14,
            border: '1.5px solid rgba(0,0,0,0.1)',
            background: 'rgba(var(--glass-rgb), 0.85)',
          }}
          placeholder={t('Введите правильный ответ...')}
        />
        <p style={{ fontSize: 11, fontWeight: 700, color: palette.text, margin: '4px 0 0' }}>{t('Пояснение')}</p>
        <AutoTextarea
          value={editedSolution}
          onChange={setEditedSolution}
          placeholder={t('Пояснение к решению…')}
          minHeight={growMinHeight(3, 12, 8, 1)}
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
          <AlertCircle size={10} />{reported ? t('Отправлено') : t('Ошибка')}
        </button>
      </div>
    </div>
  )
}

// Auto-growing textarea that reads like plain text until focused — used for the
// inline-editable question and solution in the trainer picker.
function AutoTextarea({ value, onChange, placeholder, minHeight = 0, style }: {
  value: string; onChange: (v: string) => void; placeholder?: string; minHeight?: number; style?: React.CSSProperties
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(minHeight, el.scrollHeight)}px`
  }, [value, minHeight])
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
  const t = useT()
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
          {t('Нет заданий по выбранным фильтрам')}
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
  const t = useT()
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
        <div style={{ fontSize: 13, fontWeight: 600 }}>{t('Добавьте задания для предпросмотра')}</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {tasks.map((task, i) => {
        const cfg = typeConfig(task.type)
        return (
          <GlassCard key={task.id} style={{ padding: '14px 16px' }}>
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
                  <span style={cardChip(cfg.color)}>
                    {t(cfg.label)}
                  </span>
                  {task.modified && (
                    <button
                      onClick={() => onOpenTrainerDialog(task.id)}
                      style={cardChipTone('peach', { border: 'none', cursor: 'pointer', fontFamily: 'inherit' })}
                    >
                      ⚠ {t('изменено')}
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.55, marginBottom: 8 }}>
                  {stripHtml(task.question) || <span style={{ color: 'var(--color-text-4)', fontStyle: 'italic' }}>{t('Без текста')}</span>}
                </div>

                {(task.type === 'single' || task.type === 'multi') && task.choices && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                    {task.choices.map((ch, ci) => (
                      <div key={ci} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '5px 10px', borderRadius: 8,
                        background: (task.correctChoices ?? []).includes(ci) ? 'var(--color-green-soft)' : 'var(--color-bg)',
                      }}>
                        <div style={{
                          width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                          background: (task.correctChoices ?? []).includes(ci) ? 'var(--color-green-text)' : 'var(--color-text-4)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {(task.correctChoices ?? []).includes(ci) && <Check size={10} style={{ color: '#fff' }} />}
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--color-text)' }}>{ch || `${t('Вариант')} ${ci + 1}`}</span>
                      </div>
                    ))}
                  </div>
                )}

                {task.type === 'matching' && task.pairs && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                    {task.pairs.map((p, pi) => (
                      <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, padding: '5px 10px', borderRadius: 8, background: 'var(--color-purple-soft)', fontSize: 12, color: 'var(--color-accent)', fontWeight: 600 }}>
                          {p.left || `${t('Левая')} ${pi + 1}`}
                        </div>
                        <span style={{ color: 'var(--color-text-4)' }}>↔</span>
                        <div style={{ flex: 1, padding: '5px 10px', borderRadius: 8, background: 'var(--color-peach-soft)', fontSize: 12, color: 'var(--color-peach-text)', fontWeight: 600 }}>
                          {p.right || `${t('Правая')} ${pi + 1}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(task.type === 'extended' || task.type === 'fill') && (
                  <button
                    onClick={() => toggleAnswer(task.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '4px 10px', borderRadius: 8, border: 'none',
                      background: showAnswer.has(task.id) ? 'var(--color-green-soft)' : 'var(--color-bg)',
                      cursor: 'pointer', fontSize: 11, fontWeight: 600,
                      color: showAnswer.has(task.id) ? 'var(--color-green-text)' : 'var(--color-muted)',
                      fontFamily: 'inherit', marginBottom: 4,
                    }}
                  >
                    <Eye size={12} />
                    {showAnswer.has(task.id) ? task.answer || t('нет ответа') : t('Показать ответ')}
                  </button>
                )}
              </div>
              <button
                onClick={() => onDelete(task.id)}
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
  const t = useT()
  const bankTasks = useTaskBank(s => s.tasks)
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
  const { ref: filterScrollRef, fade: filterFade, thumb: filterThumb, onScroll: onFilterScroll } = useOverlayScroll()

  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.8 }}
      style={{
        width: 240, flexShrink: 0,
        background: 'rgba(var(--glass-rgb), 0.88)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid var(--color-border-glass)',
        borderRadius: 18,
        boxShadow: 'var(--shadow-sm-page)',
        display: 'flex', flexDirection: 'column',
        position: 'relative', overflow: 'hidden',
        margin: '0 24px 20px 0',
      }}
    >
      <ScrollOverlays thumb={filterThumb} />
      <div ref={filterScrollRef} onScroll={onFilterScroll} className="no-scrollbar" style={{
        flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain',
        display: 'flex', flexDirection: 'column', padding: '16px', gap: 10,
        ...fadeMask(filterFade),
      }}>
      {/* Header with filter icon */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
        <Search size={14} style={{ color: 'var(--color-text-3)' }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{t('Фильтры')}</span>
      </div>

      {/* Subject picker — adaptive (segments ≤3, dropdown 4+), scoped to teacher's bank subjects */}
      <SubjectPicker
        options={bankSubjectOptionsFor(allowedSubjects).map(o => ({ value: o.value, label: t(o.label), icon: o.value ? subjectIcon(o.value) : undefined }))}
        value={filters.subject}
        onChange={v => onChange({ subject: v, sections: [], topics: [], lines: [] })}
        accent="var(--color-accent)" accentBg="var(--color-purple-soft)" activeColor="var(--color-accent)"
        idleBg="var(--color-bg)" size="sm"
        ariaLabel={t('Предмет')}
      />

      {/* Dropdown filters */}
      <MultiSelectField label={t('Раздел')} options={sectionOptions} values={filters.sections}
        onChange={v => onChange({ sections: v })} small />
      <MultiSelectField label={t('Тема')} options={topicOptions} values={filters.topics}
        onChange={v => onChange({ topics: v })} small />
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('Часть')}</div>
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
      <MultiSelectField label={t('Линия')} options={allLines} values={filters.lines}
        onChange={v => onChange({ lines: v })} small />
      <FilterSelect label={t('Источник')} options={merge(SOURCES, SOURCE_SCOPE)} value={filters.source}
        onChange={v => onChange({ source: v })} />

      {hasFilters && (
        <button
          onClick={() => onChange({ sections: [], topics: [], parts: [], lines: [], source: '' })}
          style={{ padding: '8px 0', borderRadius: 12, background: 'var(--color-red-soft)', border: 'none', fontSize: 12, color: 'var(--color-red-text)', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}
        >
          {t('Сбросить фильтры')}
        </button>
      )}

      <div style={{ fontSize: 11, color: 'var(--color-text-4)', textAlign: 'center', marginTop: 4 }}>
        {bankTasks.length} {t('заданий в базе')}
      </div>
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
  const t = useT()
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
    onAdd('extended')
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
          {t('Сложное задание')}
        </span>
        {tasks.length > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-yellow-text)', background: 'rgba(255,180,0,0.2)', borderRadius: 8, padding: '2px 8px' }}>
            {tasks.length} {t('зад.')}
          </span>
        )}
        <span style={{ fontSize: 11, color: 'var(--color-yellow-text)', fontWeight: 600 }}>
          {open ? t('Свернуть') : t('Добавить')}
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
                {t('Это задание откроется только студентам, набравшим')} <strong>80%+</strong> {t('в основном ДЗ.')}
              </div>

              {/* Assign to */}
              <div>
                <Label>{t('Назначить')}</Label>
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
                      {t(opt.l)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Student picker */}
              {assignTo === 'selected' && groupStudents.length > 0 && (
                <div>
                  <Label>{t('Студенты')} ({selectedStudents.size} {t('выбрано')})</Label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto', paddingRight: 10 }}>
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
                  {[{ v: 'compose', l: 'Составить' }, { v: 'trainer', l: 'Из тренажера' }].map(opt => (
                    <button
                      key={opt.v}
                      onClick={() => setTab(opt.v as 'compose' | 'trainer')}
                      style={{
                        flex: 1, padding: '7px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
                        fontSize: 12, fontWeight: 600,
                        background: tab === opt.v ? 'var(--color-surface)' : 'transparent',
                        color: tab === opt.v ? 'var(--color-accent)' : 'var(--color-muted)',
                        fontFamily: 'inherit', transition: 'all 0.15s',
                        boxShadow: tab === opt.v ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                      }}
                    >
                      {t(opt.l)}
                    </button>
                  ))}
                </div>

                {tab === 'compose' && (
                  <>
                    <ComposeTab tasks={tasks} onUpdate={onUpdate} onDelete={onDelete} />
                    <div style={{ marginTop: 10 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {TASK_TYPES.map(tt => (
                          <button key={tt.type} onClick={() => onAdd(tt.type)} style={{
                            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 10,
                            border: 'none', background: tt.bg, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: tt.color, fontFamily: 'inherit',
                          }}>
                            <tt.icon size={12} /> {t(tt.label)}
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
                      const nt = taskFromBank({ ...bt, question: overrides.question, answer: overrides.answer, solution: overrides.solution })
                      const edited = overrides.question !== bt.question || overrides.answer !== bt.answer || overrides.solution !== bt.solution
                      nt.modified = edited && !savedToTrainer
                      nt.savedToTrainer = savedToTrainer
                      onUpdate(nt.id, nt)
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
  const t = useT()
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
          {value || t('Выберите дату')}
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
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{t(RU_MONTHS[viewMonth])} {viewYear}</span>
              <button style={navBtnStyle} onClick={nextMonth}><ChevronRight size={14} /></button>
            </div>

            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
              {RU_DAYS_SHORT.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: 'var(--color-text-4)', padding: '2px 0' }}>{t(d)}</div>
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
  const t = useT()
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
          {selected ? selected.name : t('Группа')}
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
            <ScrollFade maxHeight={260} bg="rgba(var(--glass-rgb), 0.96)" overlayScrollbar>
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
            </ScrollFade>
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
  const t = useT()
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
    const q = title.trim().toLowerCase()
    if (!q) return []
    return courseLessons.filter(l => {
      const words = q.split(/\s+/).filter(w => w.length > 3)
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
            <div style={{ fontSize: 13, color: 'var(--color-text-3)' }}>{t('Без привязки')}</div>
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
                placeholder={t('Поиск урока...')}
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

            <div style={{ position: 'relative', overflow: 'hidden' }}>
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
                  <span style={{ fontSize: 12, fontWeight: 600, color: !value ? 'var(--color-accent)' : 'var(--color-muted)' }}>{t('Без привязки')}</span>
                  {!value && <Check size={13} style={{ color: 'var(--color-accent)', marginLeft: 'auto' }} />}
                </button>

                {/* Suggested section */}
                {suggested.length > 0 && !query && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 8px 4px' }}>
                      <Sparkles size={11} style={{ color: 'var(--color-accent)' }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-accent)', letterSpacing: 0.3 }}>{t('ПОДХОДЯТ К ТЕМЕ')}</span>
                    </div>
                    {suggested.map(l => (
                      <LessonOption key={l.id} lesson={l} active={value === l.id} suggested onClick={() => { onChange(l.id); setOpen(false) }} />
                    ))}
                    <div style={{ height: 1, background: 'var(--color-border-soft)', margin: '6px 8px' }} />
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.3, padding: '2px 8px 4px' }}>{t('ВСЕ УРОКИ')}</div>
                  </>
                )}

                {/* All lessons */}
                {filtered.filter(l => !suggestedIds.has(l.id) || !!query).map(l => (
                  <LessonOption key={l.id} lesson={l} active={value === l.id} onClick={() => { onChange(l.id); setOpen(false) }} />
                ))}

                {filtered.length === 0 && (
                  <div style={{ padding: '10px 8px', fontSize: 12, color: 'var(--color-text-3)', textAlign: 'center' }}>{t('Ничего не найдено')}</div>
                )}
              </div>

              {/* Edge fades */}
              <div aria-hidden style={{ position: 'absolute', top: -2, left: 0, right: 0, height: 26, background: 'linear-gradient(to bottom, var(--color-bg-input), transparent)', opacity: fade.top, transition: 'opacity 0.2s', pointerEvents: 'none' }} />
              <div aria-hidden style={{ position: 'absolute', bottom: -2, left: 0, right: 0, height: 26, background: 'linear-gradient(to top, var(--color-bg-input), transparent)', opacity: fade.bottom, transition: 'opacity 0.2s', pointerEvents: 'none' }} />
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
  const t = useT()
  const allStudents = useAllStudents()
  const [subjectFilter, setSubjectFilter] = useState('')

  // Distinct subjects across the teacher's individual students, for the scoping filter
  const subjects = Array.from(new Set(allStudents.map(s => s.subject).filter(Boolean))) as string[]
  const scopedStudents = subjectFilter
    ? allStudents.filter(s => s.subject === subjectFilter)
    : allStudents

  return (
    <div style={{
      width: 240, flexShrink: 0,
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
              {mode === 'group' ? t('Группе') : t('Студенту')}
            </button>
          ))}
        </div>

        {/* Группа — only in group mode */}
        {meta.assignTo === 'group' && (
          <GroupPicker value={meta.groupId} onChange={id => onChange({ groupId: id, studentId: '' })} />
        )}

        {/* Student — direct picker, optionally scoped by subject */}
        {meta.assignTo === 'student' && (
          <>
            {subjects.length > 1 && (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {[{ v: '', label: 'Все' }, ...subjects.map(s => ({ v: s, label: s }))].map(opt => (
                  <button
                    key={opt.v || 'all'}
                    onClick={() => { setSubjectFilter(opt.v); onChange({ studentId: '' }) }}
                    style={{
                      padding: '6px 12px', borderRadius: 9, border: 'none', cursor: 'pointer',
                      fontSize: 11, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s',
                      background: subjectFilter === opt.v ? 'var(--color-purple-soft)' : 'var(--color-bg)',
                      color: subjectFilter === opt.v ? 'var(--color-accent)' : 'var(--color-muted)',
                    }}
                  >
                    {t(opt.label)}
                  </button>
                ))}
              </div>
            )}
            <TeacherSelect
              value={meta.studentId}
              onChange={id => onChange({ studentId: id })}
              placeholder={t('Студент')}
              options={scopedStudents.map(s => ({
                value: s.id,
                label: s.subject ? `${s.name} · ${s.subject}` : s.name,
              }))}
            />
          </>
        )}

        {/* Title */}
        <input
          value={meta.title}
          onChange={e => onChange({ title: e.target.value })}
          placeholder={t('Тема задания')}
          style={inputStyle}
        />

        {/* Description */}
        <textarea
          value={meta.description}
          onChange={e => onChange({ description: e.target.value })}
          placeholder={t('Описание, ссылки, требования...')}
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

// Drop base64-capable fields before drafting a task list (sessionStorage quota).
function stripHeavyFields(tasks: HWTask[]) {
  return tasks.map(({ image, canvasData, table, ...t }) => ({
    ...t,
    table: table ? { ...table, cellImages: undefined } : undefined,
  }))
}

export default function TeacherHomeworkCreatePage() {
  const t = useT()
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

  // Draft namespace, scoped by the edited homework so drafts don't leak between entities.
  const draftScope = `hwcreate.${editingHomeworkId ?? 'new'}`
  // Snapshot before the persistence effects below write initial values into storage.
  const [hadDraft] = useState(() => ({
    meta: readDraft(`${draftScope}.meta`) !== null,
    tasks: readDraft(`${draftScope}.hwTasks`) !== null || readDraft(`${draftScope}.hardTasks`) !== null,
  }))

  const [meta, setMeta] = usePersistentState<Meta>(`${draftScope}.meta`, () => ({
    // "ДЗ допом" from the roster pre-scopes a single student; otherwise prefill
    // the group picked on the homework page (empty = assign to all).
    assignTo: hwPresetStudentId ? 'student' : 'group',
    groupId: hwPresetStudentId ? '' : (selectedGroupId ?? ''),
    studentId: hwPresetStudentId ?? '',
    title: '', description: '', dueDate: '', lessonId: '',
  }))
  // Consume the preset once so re-entering the composer normally doesn't re-trigger it.
  // The explicit "ДЗ допом" target also wins over a restored draft's target.
  useEffect(() => {
    if (!hwPresetStudentId) return
    setMeta(m => m.studentId === hwPresetStudentId ? m : { ...m, assignTo: 'student', studentId: hwPresetStudentId, groupId: '' })
    clearHwPreset()
  }, [hwPresetStudentId, clearHwPreset, setMeta])
  const { students: groupStudents } = useStudents(meta.groupId || null)
  const [activeTab, setActiveTab] = useState<MainTab>('compose')
  const [hwTasks, setHwTasks] = useState<HWTask[]>(() => readDraft<HWTask[]>(`${draftScope}.hwTasks`) ?? [])
  const [hardTasks, setHardTasks] = useState<HWTask[]>(() => readDraft<HWTask[]>(`${draftScope}.hardTasks`) ?? [])
  // Persist task lists without base64 payloads (photos/whiteboard) — sessionStorage quota.
  useEffect(() => { writeDraft(`${draftScope}.hwTasks`, stripHeavyFields(hwTasks)) }, [draftScope, hwTasks])
  useEffect(() => { writeDraft(`${draftScope}.hardTasks`, stripHeavyFields(hardTasks)) }, [draftScope, hardTasks])

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
    // A restored draft means a reload interrupted an edit — it wins over the DB row.
    if (hadDraft.meta && hadDraft.tasks) return
    supabase
      .from('homework')
      .select('group_id, title, due_date, task_ids, hard_task_ids, hard_tasks, lesson_id')
      .eq('id', editingHomeworkId)
      .single()
      .then(({ data }) => {
        if (!data) return
        if (!hadDraft.tasks) {
          const hardIds: number[] = Array.isArray(data.hard_task_ids) ? data.hard_task_ids : []
          const allIds: number[] = Array.isArray(data.task_ids) ? data.task_ids : []
          setEditHardDefs(Array.isArray(data.hard_tasks) ? (data.hard_tasks as HardTaskDef[]) : [])
          setEditTaskIds({ regular: allIds.filter(id => !hardIds.includes(id)), hard: hardIds })
        }
        if (hadDraft.meta) return
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
  }, [editingHomeworkId, loadBank, hadDraft, setMeta])

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
  // Rebuilt from the restored draft so trainer rows keep their "added" state.
  const [trainerAddedIds, setTrainerAddedIds] = useState<Set<number>>(
    () => new Set(hwTasks.filter(t => t.bankId != null).map(t => t.bankId!)),
  )
  const [trainerDialogTaskId, setTrainerDialogTaskId] = useState<string | null>(null)
  const [importTarget, setImportTarget] = useState<'basic' | 'hard' | null>(null)
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

  const backBtn = <><ArrowLeft size={15} strokeWidth={2} /> {t('Назад')}</>
  const draftLabel = t('Черновик')

  function updateMeta(p: Partial<Meta>) { setMeta(m => ({ ...m, ...p })) }

  // Explicit "Назад" = user abandons the form — the one place a draft dies unsaved.
  function exitPage() {
    clearDrafts(`${draftScope}.`)
    setActivePage('homework')
  }

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

  function addImportedTasks(questions: ImportedQuestion[], isHard: boolean) {
    const tasks = questions.map(hwTaskFromImported)
    if (isHard) setHardTasks(ts => [...ts, ...tasks])
    else setHwTasks(ts => [...ts, ...tasks])
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
      clearDrafts(`${draftScope}.`)
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
              onClick={exitPage}
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
              {meta.title || (isEditing ? t('Редактировать домашку') : t('Создать домашнее задание'))}
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
              label={isEditing ? t('Сохранить') : t('Опубликовать')} savedLabel={isEditing ? t('Сохранено!') : t('Опубликовано!')}
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
            onClick={exitPage}
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
            {isEditing ? t('Редактировать домашку') : t('Создать домашнее задание')}
            {meta.title && <span style={{ color: 'var(--color-text-3)', fontWeight: 500 }}> — {meta.title}</span>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600 }}>
              {hwTasks.length} {t('зад.')}{hardTasks.length > 0 ? ` + ${hardTasks.length} ${t('сложн.')}` : ''}
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
              label={isEditing ? t('Сохранить') : t('Опубликовать')} savedLabel={isEditing ? t('Сохранено!') : t('Опубликовано!')}
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
                {t(tab.label)}
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
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-yellow-text)' }}>{t('Сложное задание (80%+)')}</span>
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

        {/* Right column — overflow прячет въезжающую панель, но заодно резал её
            тень сверху и слева: даём запас и возвращаем колонку отрицательными
            полями. Слева 16px — ровно в паддинг центра, чтобы полоса не легла
            поверх карточек заданий и не перехватывала клики. */}
        <div style={{
          flexShrink: 0, position: 'sticky', top: 20 - 12, alignSelf: 'flex-start', overflow: 'hidden',
          margin: '-12px 0 0 -16px', padding: '12px 0 0 16px',
        }}>
          <AnimatePresence mode="wait">
            {activeTab === 'compose' && (
              <ComposeTypePanel
                key="compose-types"
                onAdd={type => addCustomTask(type)}
                onAddHard={type => addCustomTask(type, true)}
                onImport={() => setImportTarget('basic')}
                onImportHard={() => setImportTarget('hard')}
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

      {/* Google Forms import */}
      <GoogleFormImportModal
        open={importTarget !== null}
        onClose={() => setImportTarget(null)}
        onImport={(form, selectedIds) => {
          const isHard = importTarget === 'hard'
          addImportedTasks(form.questions.filter(q => selectedIds.includes(q.id)), isHard)
        }}
      />

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
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>{t('Публикация домашки')}</div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 6, lineHeight: 1.55 }}>
                  {t('Домашнее задание будет привязано к уроку:')}
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
                    {t('Отмена')}
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={doPublish}
                    style={{ flex: 2, padding: '10px 0', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'var(--grad-purple)', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(99,84,207,0.3)' }}
                  >
                    <Send size={14} /> {t('Опубликовать')}
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
