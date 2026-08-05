import { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Plus, Send, Video, Link2, Upload,
  BookOpen, AlignLeft, CheckSquare, Type, Shuffle,
  PenLine, Star, ChevronRight, ChevronDown, Users,
  X, FileText, NotebookPen, FolderOpen, Layers,
  GripVertical, ChevronLeft, ChevronUp, Unlock, Check, Calendar,
  ClipboardCheck, Clock, Trash2, FolderInput, Table as TableIcon, Search, ArrowUpDown, ArrowUp, ArrowDown, Camera, Copy,
} from 'lucide-react'
import { optimizePhoto, ImageTooLargeError } from '../../lib/imageOptim'
import { getContrastColor } from '../../lib/utils'
import { useTeacher } from '../../store/teacherStore'
import { useTaskBank } from '../../store/taskBankStore'
import { useT, t } from '../../lib/i18n'
import type { Task as BankTask } from '../../data/taskBankData'
import { courseSubjectOptions, isLanguageSubject } from '../../lib/subjects'
import AudioStimulusEditor from '../../components/teacher/AudioStimulusEditor'
import { useGroups, useAllStudents } from '../../lib/useGroups'
import TeacherSaveButton, { teacherSaveStyle, SAVE_ACCENTS } from '../../components/teacher/TeacherSaveButton'
import TeacherSelect from '../../components/teacher/TeacherSelect'
import ScrollFade from '../../components/ScrollFade'
import { useOverlayScroll, ScrollOverlays, OverlayScrollArea } from '../../components/teacher/OverlayScroll'
import { getOwnerId } from '../../lib/owner'
import TableEditor from '../../components/teacher/TableEditor'
import { typeVisual } from '../../data/taskTypeVisuals'
import { taskTypesFor, makeTask, TASK_TYPES as TASK_TYPES_BY_ID, type TaskTypeId } from '../../data/taskTypes'
import { supabase } from '../../lib/supabase'
import { readDraft, writeDraft, clearDrafts } from '../../lib/useDraft'

// ─── Types ────────────────────────────────────────────────────────────────────

type LessonMode = 'recording' | 'lesson' | 'homework' | 'students'

type HWTaskType = TaskTypeId

interface HWTask {
  id: string
  type: HWTaskType
  isHard: boolean
  label: string
  question?: string
  answer?: string
  choices?: string[]
  correctChoices?: number[]
  pairs?: Array<{ left: string; right: string }>
  /** Последовательность — элементы в правильном порядке (для type === 'sequence'). */
  sequenceItems?: string[]
  /** Таблица — заголовки колонок + строки-эталон + помеченные «?» ячейки + фото в ячейках. */
  table?: { headers: string[]; rows: string[][]; emptyCells?: Record<string, boolean>; blankCells?: Record<string, boolean>; cellImages?: Record<string, string>; cellImageSizes?: Record<string, number> }
  /** Условие-картинка. */
  image?: string
  /** Размер условия-картинки в % (10–100). */
  imageSize?: number
  /** wordBank / listenBank — эталонное предложение (режется по пробелам на плитки). */
  sentence?: string
  /** wordBank / listenBank — лишние плитки-обманки. */
  distractors?: string[]
  /** Аудио-стимул: путь в бакете task-media (5A) либо текст для синтеза. */
  audioUrl?: string
  ttsText?: string
  ttsVoice?: string
  /** Разрешить замедленное воспроизведение (кнопка «черепаха»). */
  allowSlow?: boolean
  /** speaking — сколько секунд на подготовку и на ответ. */
  prepSeconds?: number
  responseSeconds?: number
  /** speaking — эталонный текст для чтения вслух (если задание «прочитай», а не свободное). */
  targetText?: string
  /** id исходного задания в тренажёре (если задание добавлено «из тренажёра»). */
  bankId?: number
}

export interface CELesson {
  id: string
  title: string
  number: number
  /** Node kind: a normal lesson, or a final test that opens a quiz. */
  kind?: 'lesson' | 'test'
  /** Quiz tasks when kind === 'test'. */
  testTasks?: HWTask[]
  videoUrl?: string
  description?: string
  notebookFile?: string
  workbookFile?: string
  materialFile?: string
  // lesson-level audience (extra students beyond course audience)
  extraStudentIds?: string[]
  extraGroupIds?: string[]
  // homework for the LESSON (Урок) node
  hwTitle?: string
  hwTarget?: string
  hwDate?: string
  /** true once the teacher edits the homework due date by hand — stops it mirroring the lesson date. */
  hwDateManual?: boolean
  hwTasks?: HWTask[]
  // homework for the RECORDING (Запись) node
  recHwTitle?: string
  recHwTarget?: string
  recHwDate?: string
  recHwDateManual?: boolean
  recHwTasks?: HWTask[]
  // calendar scheduling — LESSON (Урок) event
  scheduledDate?: string   // DD.MM.YYYY
  scheduledTime?: string   // HH:MM
  scheduledDuration?: number // minutes (default 90)
  // calendar scheduling — RECORDING (Запись / live session) event
  recDate?: string   // DD.MM.YYYY
  recTime?: string   // HH:MM
  recDuration?: number // minutes (default 90)
  /**
   * true once the teacher sets the lesson (Урок) date by hand — detaches it from
   * the recording date so the two become separate track nodes. While false, the
   * lesson schedule mirrors the recording schedule (one node).
   */
  lessonSchedManual?: boolean
}

export interface CEModule {
  id: string
  label: string
  expanded: boolean
  lessonIds: string[]
}

export interface CourseEdData {
  id: string
  title: string
  subject: string
  level: string
  status: 'draft' | 'published'
  color: string
  bg: string
  groupIds: string[]
  studentIds: string[]
  modules: CEModule[]
  lessons: CELesson[]
  description?: string
  dbCourseId?: string
  lastEdited?: string
}

function uid() { return Math.random().toString(36).slice(2, 8) }

// ── Date-shift helpers — used by «Выдать новой группе» to slide the whole
// calendar so a cloned course starts fresh on a new date. Dates are DD.MM.YYYY.
function dotToDate(d?: string): Date | null {
  if (!d) return null
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(d)
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null
}
function dateToDot(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`
}
function shiftDot(d: string | undefined, days: number): string | undefined {
  const base = dotToDate(d)
  if (!base) return d
  base.setDate(base.getDate() + days)
  return dateToDot(base)
}
// Earliest lesson/recording date across the course — the anchor we pin to the new start.
function earliestCourseDate(lessons: CELesson[]): Date | null {
  let min: Date | null = null
  for (const l of lessons) {
    for (const d of [l.scheduledDate, l.recDate]) {
      const dt = dotToDate(d)
      if (dt && (!min || dt < min)) min = dt
    }
  }
  return min
}

// Map each editor lesson → the short_id it is (or will be) persisted under.
// A lesson's short_id must be STABLE across reorders/renames: it's the key that
// ties lesson_progress rows and calendar events to the lesson. We therefore
// derive it from the lesson's identity, NOT from its position or `number`:
//   • a lesson loaded from the DB already carries its short_id as `id`
//     (`${courseShortId}-N`) — reuse it verbatim.
//   • a brand-new lesson (uuid id) gets the next free numeric suffix, never a
//     position-derived one, so it can't collide with / clobber an existing ref.
// The old scheme (`${courseShortId}-${lesson.number}`) renumbered short_ids
// whenever `number`/position drifted, orphaning progress rows → lessons the
// teacher had opened showed up locked in the student track.
export function lessonShortIdMap(courseShortId: string, lessons: CELesson[]): Record<string, string> {
  const prefix = `${courseShortId}-`
  const map: Record<string, string> = {}
  let maxN = -1
  for (const l of lessons) {
    if (l.id.startsWith(prefix)) {
      const suffix = l.id.slice(prefix.length)
      if (/^\d+$/.test(suffix)) { map[l.id] = l.id; maxN = Math.max(maxN, Number(suffix)) }
    }
  }
  for (const l of lessons) {
    if (!map[l.id]) { maxN += 1; map[l.id] = `${prefix}${maxN}` }
  }
  return map
}

// ─── Style constants ──────────────────────────────────────────────────────────

const inputSt: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '9px 12px',
  borderRadius: 11, border: '1.5px solid var(--color-border-medium)',
  fontSize: 13, color: 'var(--color-text)', background: 'var(--color-bg-input)',
  outline: 'none', fontFamily: 'inherit',
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.4, marginBottom: 5 }}>
      {children}
    </div>
  )
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
    }}>
      {children}
    </div>
  )
}

// ─── Task type definitions ────────────────────────────────────────────────────

// Палитра, подписи и дефолты берутся из единого реестра (src/data/taskTypes.ts).
// Чтобы добавить новый тип задания, правится только реестр — здесь ничего.
// All types (incl. language) — panels filter to what the current course should
// show. `languageOnly` gates the language types behind a language subject.
const TASK_TYPES: { type: HWTaskType; label: string; hint: string; Icon: React.ElementType; color: string; bg: string; languageOnly: boolean }[] =
  taskTypesFor({ language: true }).map(d => ({
    type: d.id, label: d.label, hint: d.hint, Icon: d.Icon, ...d.visual, languageOnly: d.languageOnly,
  }))

// Свежее задание с дефолтами по типу — общая фабрика для всех мест добавления.
function makeHWTask(type: HWTaskType, isHard: boolean): HWTask {
  return makeTask(type, isHard, uid()) as HWTask
}

// Задание «из тренажёра»: переносим условие + ответ, а табличные задания —
// сразу как тип «Таблица».
function hwTaskFromBank(bt: BankTask, isHard: boolean): HWTask {
  const hasTable = !!bt.questionTable && bt.questionTable.headers.length > 0
  return {
    id: uid(),
    type: hasTable ? 'tableFill' : 'extended',
    isHard,
    label: TASK_TYPES_BY_ID[hasTable ? 'tableFill' : 'extended'].label,
    question: bt.question,
    answer: bt.answer,
    table: hasTable ? { headers: [...bt.questionTable!.headers], rows: bt.questionTable!.rows.map(r => [...r]) } : undefined,
    image: bt.questionImage ?? undefined,
    bankId: bt.id,
  }
}

// ─── LEFT: Course title + description (no lesson selected) ───────────────────

function LeftCourseMeta({
  course, setCourse,
}: {
  course: CourseEdData
  setCourse: React.Dispatch<React.SetStateAction<CourseEdData>>
}) {
  const t = useT()
  // Title is a textarea so long names wrap onto a 2nd line instead of clipping;
  // auto-grow it to fit its content (1–2+ lines) on mount and on edit.
  const titleRef = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = titleRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [course.title])
  return (
    <OverlayScrollArea style={{ flex: 1 }} padding={16} scrollStyle={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Title */}
      <textarea
        ref={titleRef}
        rows={1}
        value={course.title}
        onChange={e => setCourse(c => ({ ...c, title: e.target.value }))}
        style={{ ...inputSt, fontSize: 14, fontWeight: 600, padding: '11px 14px', lineHeight: 1.35, resize: 'none', overflow: 'hidden' }}
        placeholder={t('Название курса')}
      />

      {/* Subject + level */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <Label>{t('Предмет')}</Label>
          <TeacherSelect
            value={course.subject}
            options={COURSE_SUBJECTS.map(o => ({ ...o, label: t(o.label) }))}
            onChange={v => setCourse(c => ({ ...c, subject: v }))}
            placeholder={t('Выберите предмет')}
            clearable={false}
            accent="var(--color-green-text)"
            accentBg="var(--color-green-soft)"
          />
        </div>
        <div>
          <Label>{t('Уровень')}</Label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['ОГЭ', 'ЕГЭ', 'Олимпиада', 'Школа'].map(l => {
              const active = course.level === l
              return (
                <button
                  key={l}
                  onClick={() => setCourse(c => ({ ...c, level: l }))}
                  style={{
                    padding: '7px 14px', borderRadius: 10, cursor: 'pointer',
                    border: 'none',
                    background: active ? 'var(--color-green-soft)' : 'var(--color-bg-3)',
                    color: active ? 'var(--color-green-text)' : 'var(--color-text-3)',
                    fontWeight: active ? 600 : 400, fontSize: 13,
                    transition: 'all 0.12s',
                  }}
                >{t(l)}</button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Description */}
      <textarea
        value={course.description ?? ''}
        onChange={e => setCourse(c => ({ ...c, description: e.target.value }))}
        style={{ ...inputSt, resize: 'none', minHeight: 160, lineHeight: 1.6 }}
        placeholder={t('Описание курса — что разберём, для кого курс, что получит ученик…')}
      />
    </OverlayScrollArea>
  )
}

// ─── CENTER: Course access — who gets the course (no lesson selected) ─────────

// Subjects a course can belong to — sourced from the subject registry.
const COURSE_SUBJECTS = courseSubjectOptions()

type AccessMode = 'full' | 'custom' | 'by_date'
const ACCESS_MODE_OPTIONS: Array<{ value: AccessMode; label: string }> = [
  { value: 'custom', label: 'Настраиваемый' },
  { value: 'full', label: 'Всё открыто' },
  { value: 'by_date', label: 'По датам' },
]

function AccessModeSelect({
  value, onChange, placeholder,
}: {
  value: AccessMode | ''
  onChange: (v: AccessMode) => void
  placeholder?: string
}) {
  const t = useT()
  return (
    <TeacherSelect
      value={value}
      options={ACCESS_MODE_OPTIONS.map(o => ({ ...o, label: t(o.label) }))}
      onChange={v => onChange(v as AccessMode)}
      placeholder={placeholder ?? t('Доступ')}
      clearable={false}
      small
      accent="var(--color-green-text)"
      accentBg="var(--color-green-soft)"
      triggerStyle={{ minWidth: 150, background: 'var(--color-bg-5)', border: '1px solid var(--color-border-medium)' }}
    />
  )
}

// Assign list with a search box on top and a 5-item preview (rest collapsed) so a
// long roster never dumps the whole list into the editor. Selected items always
// show regardless of the preview cap so they can be toggled off.
const ASSIGN_PREVIEW = 5
function AssignPicker({
  items, selectedIds, onToggle, kind,
}: {
  items: Array<{ id: string; name: string }>
  selectedIds: string[]
  onToggle: (id: string) => void
  kind: 'group' | 'student'
}) {
  const t = useT()
  const [q, setQ] = useState('')
  const [expanded, setExpanded] = useState(false)
  const query = q.trim().toLowerCase()
  const filtered = query ? items.filter(i => i.name.toLowerCase().includes(query)) : items
  const selectedSet = new Set(selectedIds)
  // Always surface selected items; fill the rest up to the preview cap.
  const shown = (query || expanded)
    ? filtered
    : [...filtered.filter(i => selectedSet.has(i.id)), ...filtered.filter(i => !selectedSet.has(i.id))].slice(0, Math.max(ASSIGN_PREVIEW, selectedIds.length))
  const hiddenCount = filtered.length - shown.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--color-bg)', border: '1px solid var(--color-border-soft)',
        borderRadius: 10, padding: '8px 12px',
      }}>
        <Search size={15} style={{ color: 'var(--color-text-3)' }} />
        <input
          value={q} onChange={e => setQ(e.target.value)}
          placeholder={kind === 'group' ? t('Поиск группы…') : t('Поиск ученика…')}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--color-text)' }}
        />
        {q && <X size={13} style={{ color: 'var(--color-text-3)', cursor: 'pointer' }} onClick={() => setQ('')} />}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {shown.map(item => {
          const on = selectedSet.has(item.id)
          return (
            <button key={item.id} onClick={() => onToggle(item.id)} style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '9px 14px', borderRadius: 12,
              border: on ? '1.5px solid var(--color-green-text)' : '1.5px solid var(--color-border)',
              background: on ? 'var(--color-green-soft)' : 'transparent',
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.14s',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: on ? 'var(--color-green-text)' : 'var(--color-bg-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
                color: on ? '#fff' : 'var(--color-muted)', flexShrink: 0,
              }}>
                {kind === 'group' ? <Users size={13} style={{ color: on ? '#fff' : 'var(--color-muted)' }} /> : item.name.slice(0, 1).toUpperCase()}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: on ? 'var(--color-green-text)' : 'var(--color-text)', flex: 1, textAlign: 'left' }}>
                {item.name}
              </span>
              {on && <X size={11} style={{ color: 'var(--color-green-text)' }} />}
            </button>
          )
        })}
        {shown.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--color-muted)', padding: '12px 0' }}>
            {items.length === 0 ? (kind === 'group' ? t('Групп нет') : t('Ученики не найдены')) : t('Ничего не нашлось')}
          </div>
        )}
      </div>

      {!query && !expanded && hiddenCount > 0 && (
        <button onClick={() => setExpanded(true)} style={{
          alignSelf: 'flex-start', padding: '6px 12px', borderRadius: 999,
          background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)',
          color: 'var(--color-text-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          {t('Показать всех')} ({hiddenCount})
        </button>
      )}
      {!query && expanded && (
        <button onClick={() => setExpanded(false)} style={{
          alignSelf: 'flex-start', padding: '6px 12px', borderRadius: 999,
          background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)',
          color: 'var(--color-text-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          {t('Свернуть')}
        </button>
      )}
    </div>
  )
}

function CenterCourseAccess({
  course, setCourse, groups, allStudents, accessModes, setAccessModes,
}: {
  course: CourseEdData
  setCourse: React.Dispatch<React.SetStateAction<CourseEdData>>
  groups: Array<{ id: string; name: string }>
  allStudents: Array<{ id: string; name: string; groupId?: string }>
  accessModes: Record<string, AccessMode>
  setAccessModes: React.Dispatch<React.SetStateAction<Record<string, AccessMode>>>
}) {
  const t = useT()
  const [assignTab, setAssignTab] = useState<'group' | 'student'>('group')

  const modeOf = (id: string): AccessMode => accessModes[id] ?? 'by_date'
  const setStudentMode = (id: string, mode: AccessMode) =>
    setAccessModes(m => ({ ...m, [id]: mode }))
  // A group's mode is applied to every current member (stored per-student).
  const memberIdsOf = (groupId: string) =>
    allStudents.filter(s => s.groupId === groupId).map(s => s.id)
  const groupMode = (groupId: string): AccessMode | 'mixed' => {
    const ids = memberIdsOf(groupId)
    if (ids.length === 0) return 'by_date'
    const first = modeOf(ids[0])
    return ids.every(id => modeOf(id) === first) ? first : 'mixed'
  }
  const setGroupMode = (groupId: string, mode: AccessMode) =>
    setAccessModes(m => {
      const next = { ...m }
      for (const id of memberIdsOf(groupId)) next[id] = mode
      return next
    })

  function toggleGroup(id: string) {
    setCourse(c => ({
      ...c,
      groupIds: c.groupIds.includes(id) ? c.groupIds.filter(x => x !== id) : [...c.groupIds, id],
    }))
  }

  function toggleStudent(id: string) {
    setCourse(c => ({
      ...c,
      studentIds: c.studentIds.includes(id) ? c.studentIds.filter(x => x !== id) : [...c.studentIds, id],
    }))
  }

  const assignedGroups = groups.filter(g => course.groupIds.includes(g.id))
  const assignedStudents = allStudents.filter(s => course.studentIds.includes(s.id))

  return (
    <OverlayScrollArea style={{ flex: 1 }} padding="32px 48px">
      <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>

        {/* Who gets the course */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Users size={15} style={{ color: 'var(--color-green-text)' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{t('Кому дать доступ')}</span>
            <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{t('— кому виден весь курс')}</span>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {(['group', 'student'] as const).map(tab => (
              <button key={tab} onClick={() => setAssignTab(tab)} style={{
                padding: '6px 18px', borderRadius: 999, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 700,
                background: assignTab === tab ? 'var(--color-green-soft)' : 'var(--color-bg-3)',
                color: assignTab === tab ? 'var(--color-green-text)' : 'var(--color-text-2)',
                transition: 'all 0.15s', fontFamily: 'inherit',
              }}>
                {tab === 'group' ? t('Группе') : t('Ученику')}
              </button>
            ))}
          </div>

          {assignTab === 'group' && (
            <AssignPicker
              kind="group"
              items={groups}
              selectedIds={course.groupIds}
              onToggle={toggleGroup}
            />
          )}

          {assignTab === 'student' && (
            <AssignPicker
              kind="student"
              items={allStudents}
              selectedIds={course.studentIds}
              onToggle={toggleStudent}
            />
          )}

          {/* Assigned + access mode per audience member */}
          {(assignedGroups.length > 0 || assignedStudents.length > 0) && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-2)', marginBottom: 8 }}>
                {t('Уровень доступа')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {assignedGroups.map(g => {
                  const gm = groupMode(g.id)
                  return (
                    <div key={g.id} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 12px', borderRadius: 12, background: 'var(--color-green-soft)',
                    }}>
                      <Users size={13} style={{ color: 'var(--color-green-text)' }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-green-text)', flex: 1 }}>{g.name}</span>
                      <AccessModeSelect
                        value={gm === 'mixed' ? '' : gm}
                        onChange={v => setGroupMode(g.id, v)}
                        placeholder={gm === 'mixed' ? t('Разный') : undefined}
                      />
                    </div>
                  )
                })}
                {assignedStudents.map(s => (
                  <div key={s.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 12px', borderRadius: 12, background: 'var(--color-bg-3)',
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', flex: 1 }}>{s.name}</span>
                    <AccessModeSelect value={modeOf(s.id)} onChange={v => setStudentMode(s.id, v)} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.5 }}>
                <b>{t('Всё открыто')}</b> {t('— доступны все уроки сразу ·')} <b>{t('Настраиваемый')}</b> {t('— открываешь уроки вручную ·')}{' '}
                <b>{t('По датам')}</b> {t('— урок открывается, когда наступает его дата (для онгоинг-курса)')}
              </div>
            </div>
          )}
        </div>
      </div>
    </OverlayScrollArea>
  )
}

// ─── CENTER: Recording tab ────────────────────────────────────────────────────

// ─── Reusable "Дата и время" glass card ──────────────────────────────────────
// Used on BOTH the «Запись» and «Урок» tabs. scope='rec' edits the recording
// (live-session) schedule; scope='lesson' edits the lesson schedule. Setting the
// recording date/time/duration mirrors into the lesson schedule (date+time+
// duration) until the teacher edits the lesson date by hand (lessonSchedManual) —
// at which point the two diverge into separate track nodes.
function ScheduleCard({
  scope, lesson, onUpdate,
}: {
  scope: 'rec' | 'lesson'
  lesson: CELesson
  onUpdate: (updated: CELesson) => void
}) {
  const t = useT()
  const isRec = scope === 'rec'
  const date = isRec ? lesson.recDate : lesson.scheduledDate
  const time = isRec ? lesson.recTime : lesson.scheduledTime
  const duration = isRec ? lesson.recDuration : lesson.scheduledDuration
  const mirrors = !lesson.lessonSchedManual // recording → lesson mirror is active

  function setDate(v: string) {
    const next: CELesson = { ...lesson }
    if (isRec) {
      next.recDate = v || undefined
      if (mirrors) {
        next.scheduledDate = v || undefined
        if (!lesson.hwDateManual) next.hwDate = v || undefined
      }
    } else {
      next.scheduledDate = v || undefined
      // Editing the lesson date by hand detaches it from the recording date;
      // clearing it re-attaches (resumes mirroring the recording date).
      next.lessonSchedManual = !!v
      if (!v) {
        next.scheduledDate = lesson.recDate
        next.scheduledTime = lesson.recTime
        next.scheduledDuration = lesson.recDuration
      }
      if (!lesson.hwDateManual) next.hwDate = next.scheduledDate
    }
    onUpdate(next)
  }
  function setTime(v: string) {
    const next: CELesson = { ...lesson }
    if (isRec) {
      next.recTime = v || undefined
      if (mirrors) next.scheduledTime = v || undefined
    } else {
      next.scheduledTime = v || undefined
      if (v) next.lessonSchedManual = true
    }
    onUpdate(next)
  }
  function setDuration(v: number) {
    const next: CELesson = { ...lesson }
    if (isRec) {
      next.recDuration = v
      if (mirrors) next.scheduledDuration = v
    } else {
      next.scheduledDuration = v
      next.lessonSchedManual = true
    }
    onUpdate(next)
  }
  function clearAll() {
    if (isRec) {
      const next: CELesson = { ...lesson, recDate: undefined, recTime: undefined, recDuration: undefined }
      if (mirrors) {
        next.scheduledDate = undefined; next.scheduledTime = undefined; next.scheduledDuration = undefined
        if (!lesson.hwDateManual) next.hwDate = undefined
      }
      onUpdate(next)
    } else {
      // Top × = fully clear this lesson's schedule to empty. When the lesson is
      // mirroring the recording, the recording IS the source, so wipe it too —
      // otherwise the field would just re-mirror back and never go to zero.
      const next: CELesson = {
        ...lesson, lessonSchedManual: false,
        scheduledDate: undefined, scheduledTime: undefined, scheduledDuration: undefined,
      }
      if (mirrors) {
        next.recDate = undefined; next.recTime = undefined; next.recDuration = undefined
      }
      if (!lesson.hwDateManual) next.hwDate = undefined
      onUpdate(next)
    }
  }

  const accent = 'var(--color-green-text)'
  const footerText = isRec
    ? (mirrors
        ? t('Появится у ученика как запись · урок зеркалит эту дату')
        : `${t('Появится у ученика как запись')} ${date} ${t('в')} ${time}`)
    : (lesson.lessonSchedManual
        ? `${t('Отдельный узел «Урок»')} ${date} ${t('в')} ${time}`
        : t('Зеркалит «Запись» — пока даты совпадают, это один узел'))

  return (
    <div style={{
      width: 248, flexShrink: 0,
      background: 'rgba(var(--glass-rgb), 0.88)',
      backdropFilter: 'blur(16px) saturate(180%)',
      WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      border: '1px solid var(--color-border-glass)',
      boxShadow: 'var(--shadow-sm-page)',
      borderRadius: 18, padding: '16px 16px 18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
        <Calendar size={14} style={{ color: date ? accent : 'var(--color-muted)' }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: date ? 'var(--color-text)' : 'var(--color-text-3)' }}>
          {isRec ? t('Дата записи') : t('Дата урока')}
        </span>
        {date && (
          <button
            onClick={clearAll}
            style={{ marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-4)', padding: 0 }}
          >
            <X size={13} />
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <CalendarPicker value={date ?? ''} onChange={setDate} placeholder={t('Дата')} />
        <PickerSelect
          value={time ?? ''}
          onChange={setTime}
          icon={Clock}
          placeholder={t('Начало')}
          allowEmpty
          options={Array.from({ length: 32 }, (_, i) => {
            const h = Math.floor(i / 2) + 7
            const m = i % 2 === 0 ? '00' : '30'
            const tm = `${String(h).padStart(2, '0')}:${m}`
            return { value: tm, label: tm }
          })}
        />
        <PickerSelect
          value={String(duration ?? 90)}
          onChange={v => setDuration(Number(v))}
          icon={Clock}
          options={[45, 60, 90, 120, 150, 180].map(m => ({
            value: String(m),
            label: m < 60 ? `${m} ${t('мин')}` : `${m / 60} ${t('ч')}${m % 60 ? ` ${m % 60} ${t('м')}` : ''}`,
          }))}
        />
      </div>
      {date && time && (
        <div style={{ marginTop: 12, fontSize: 11, color: accent, display: 'flex', alignItems: 'flex-start', gap: 5, lineHeight: 1.4 }}>
          <Check size={12} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{footerText}</span>
        </div>
      )}
    </div>
  )
}

function CenterRecording({
  lesson, onSaveVideo,
}: {
  lesson: CELesson
  onSaveVideo: (url: string) => void
}) {
  const t = useT()
  const [linkMode, setLinkMode] = useState(false)
  const [videoUrl, setVideoUrl] = useState(lesson.videoUrl ?? '')

  const content = (() => {
  if (lesson.videoUrl && !linkMode) {
    return (
      <OverlayScrollArea style={{ flex: 1 }} padding="28px 36px">
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Label>{t('Запись урока')}</Label>
            <button onClick={() => { setVideoUrl(lesson.videoUrl ?? ''); setLinkMode(true) }}
              style={{ fontSize: 11, color: 'var(--color-green-text)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
              {t('Изменить')}
            </button>
          </div>
          <div style={{
            padding: '14px 16px', borderRadius: 14, background: 'var(--color-bg-2)',
            border: '1.5px solid var(--color-border-medium)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Video size={16} style={{ color: 'var(--color-green-text)' }} />
            </div>
            <span style={{ fontSize: 13, color: 'var(--color-text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lesson.videoUrl}
            </span>
          </div>
        </div>
      </OverlayScrollArea>
    )
  }

  if (linkMode) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Label>{t('Ссылка на запись')}</Label>
          <input
            value={videoUrl}
            onChange={e => setVideoUrl(e.target.value)}
            placeholder={t('Вставьте ссылку RuTube / YouTube')}
            style={{ ...inputSt, fontSize: 14, padding: '12px 16px' }}
            autoFocus
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setLinkMode(false)}
              style={{ padding: '9px 18px', borderRadius: 12, border: '1.5px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {t('Отмена')}
            </button>
            <button onClick={() => { onSaveVideo(videoUrl); setLinkMode(false) }}
              style={{ flex: 1, padding: '9px 18px', borderRadius: 12, border: 'none', background: 'var(--color-green-soft)', color: 'var(--color-green-text)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {t('Сохранить')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--color-green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Video size={32} style={{ color: 'var(--color-green-text)' }} />
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>{t('Добавьте запись урока')}</div>
          <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>{t('После созвона — вставьте ссылку RuTube / YouTube')}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setLinkMode(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 14, border: 'none', background: 'var(--color-green-soft)', color: 'var(--color-green-text)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Link2 size={14} /> {t('Вставить ссылку')}
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 14, border: '1.5px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Upload size={14} /> {t('Загрузить файл')}
          </button>
        </div>
      </div>
    </div>
  )
  })()

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {content}
    </div>
  )
}

// ─── CENTER: Lesson content tab ───────────────────────────────────────────────

type FileField = 'workbookFile' | 'notebookFile' | 'materialFile'

const FILE_CARDS: Array<{ field: FileField; Icon: React.ElementType; label: string }> = [
  { field: 'workbookFile', Icon: NotebookPen, label: 'Рабочая тетрадь' },
  { field: 'notebookFile', Icon: FileText,    label: 'Конспект' },
  { field: 'materialFile', Icon: FolderOpen,  label: 'Материалы' },
]

function CenterLesson({
  lesson, onUpdate,
}: {
  lesson: CELesson
  onUpdate: (updated: CELesson) => void
}) {
  const t = useT()
  const refWorkbook = useRef<HTMLInputElement>(null)
  const refNotebook = useRef<HTMLInputElement>(null)
  const refMaterial = useRef<HTMLInputElement>(null)
  const inputRefs: Record<FileField, React.RefObject<HTMLInputElement | null>> = {
    workbookFile: refWorkbook,
    notebookFile: refNotebook,
    materialFile: refMaterial,
  }
  const [pastePicker, setPastePicker] = useState<File | null>(null)

  function applyFile(field: FileField, file: File) {
    onUpdate({ ...lesson, [field]: file.name })
  }

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const file = e.clipboardData?.files?.[0]
      if (!file) return
      e.preventDefault()
      setPastePicker(file)
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [])

  return (
    <OverlayScrollArea style={{ flex: 1 }} padding="28px 36px">
      <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <Label>{t('Название урока')}</Label>
          <input
            value={lesson.title}
            onChange={e => onUpdate({ ...lesson, title: e.target.value })}
            style={{ ...inputSt, fontSize: 15, fontWeight: 600 }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {FILE_CARDS.map(({ field, Icon, label }) => {
            const fileName = lesson[field] as string | undefined
            return (
              <div key={field} style={{ position: 'relative' }}>
                <input
                  ref={inputRefs[field]}
                  type="file"
                  style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) applyFile(field, f); e.target.value = '' }}
                />
                <button
                  onClick={() => inputRefs[field].current?.click()}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    padding: '16px 12px', borderRadius: 16, width: '100%',
                    border: fileName ? '1.5px solid var(--color-green-text)' : '1.5px dashed var(--color-border-medium)',
                    background: fileName ? 'var(--color-green-soft)' : 'transparent',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--color-green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={18} style={{ color: 'var(--color-green-text)' }} />
                  </div>
                  <div style={{ textAlign: 'center', width: '100%', minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: fileName ? 'var(--color-green-text)' : 'var(--color-text-2)' }}>{t(label)}</div>
                    <div style={{ fontSize: 10, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: fileName ? 'var(--color-green-text)' : 'var(--color-muted)' }}>
                      {fileName ?? t('Загрузить файл')}
                    </div>
                  </div>
                </button>
                {fileName && (
                  <button
                    onClick={e => { e.stopPropagation(); onUpdate({ ...lesson, [field]: undefined }) }}
                    style={{
                      position: 'absolute', top: 6, right: 6,
                      border: 'none', background: 'var(--color-green-soft)',
                      borderRadius: '50%', width: 18, height: 18,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: 'var(--color-green-text)', padding: 0,
                    }}
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div>
          <Label>{t('Описание урока')}</Label>
          <textarea
            value={lesson.description ?? ''}
            onChange={e => onUpdate({ ...lesson, description: e.target.value })}
            style={{ ...inputSt, resize: 'none', minHeight: 100, lineHeight: 1.6 }}
            placeholder={t('Краткое содержание урока, что разобрали, ключевые моменты…')}
          />
        </div>
      </div>

      {/* Ctrl+V paste picker */}
      <AnimatePresence>
        {pastePicker && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 300,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
            }}
            onClick={() => setPastePicker(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'var(--color-bg-card, var(--color-bg))',
                border: '1px solid var(--color-border-glass)',
                borderRadius: 20, padding: '20px 20px 16px',
                display: 'flex', flexDirection: 'column', gap: 8,
                width: 290, boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', marginBottom: 2 }}>{t('Куда добавить файл?')}</div>
              <div style={{
                fontSize: 11, color: 'var(--color-muted)', wordBreak: 'break-all',
                padding: '6px 10px', borderRadius: 8, background: 'var(--color-bg-3)', marginBottom: 4,
              }}>
                {pastePicker.name}
              </div>
              {FILE_CARDS.map(({ field, Icon, label }) => (
                <button key={field}
                  onClick={() => { applyFile(field, pastePicker); setPastePicker(null) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 12,
                    border: '1.5px solid var(--color-border)',
                    background: lesson[field] ? 'var(--color-green-soft)' : 'transparent',
                    cursor: 'pointer', fontFamily: 'inherit',
                    color: lesson[field] ? 'var(--color-green-text)' : 'var(--color-text)',
                    fontSize: 13, fontWeight: 600,
                  }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--color-green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={14} style={{ color: 'var(--color-green-text)' }} />
                  </div>
                  {t(label)}
                  {lesson[field] && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--color-muted)', fontWeight: 400 }}>{t('заменить')}</span>}
                </button>
              ))}
              <button onClick={() => setPastePicker(null)}
                style={{ padding: '7px', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-muted)', fontSize: 12, fontFamily: 'inherit', marginTop: 2 }}>
                {t('Отмена')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </OverlayScrollArea>
  )
}

// ─── Calendar picker ─────────────────────────────────────────────────────────

const navBtnSt: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 8, border: 'none',
  background: 'var(--color-bg-2)', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)',
}
const RU_MONTHS_CAL = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const RU_DAYS_SHORT = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

function parseDateDot(s: string): Date | null {
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (!m) return null
  return new Date(+m[3], +m[2]-1, +m[1])
}
function formatDateDot(d: Date) {
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`
}
function todayDotStr() {
  const d = new Date()
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`
}

// Custom styled dropdown (matches CalendarPicker) — replaces native <select>.
function pickerOptionStyle(active: boolean): React.CSSProperties {
  // Rounded inset rows — same recipe as the student trainer's MultiSelectField.
  return {
    width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 9, border: 'none',
    cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: active ? 700 : 500,
    background: active ? 'var(--color-green-soft)' : 'transparent',
    color: active ? 'var(--color-green-text)' : 'var(--color-text)',
    transition: 'background 0.12s',
  }
}

function PickerSelect({ value, onChange, options, placeholder, width, icon: Icon, allowEmpty }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  width?: number
  icon?: React.ElementType
  allowEmpty?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  // Dropdown is portaled to <body> so the rail's overflow:hidden can't clip it.
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)

  useLayoutEffect(() => {
    if (!open) return
    function place() {
      const r = ref.current?.getBoundingClientRect()
      if (r) setPos({ top: r.bottom + 6, left: r.left, width: r.width })
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      const tgt = e.target as Node
      if (ref.current?.contains(tgt) || popRef.current?.contains(tgt)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const selected = options.find(o => o.value === value)

  return (
    <div ref={ref} style={{ position: 'relative', width: width ?? '100%' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 10px', borderRadius: 11, border: 'none',
          cursor: 'pointer', background: 'var(--color-bg-input)',
          fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.15s', fontSize: 12,
        }}
      >
        {Icon && <Icon size={13} style={{ flexShrink: 0, color: value ? 'var(--color-text)' : 'var(--color-text-3)' }} />}
        <span style={{ flex: 1, color: value ? 'var(--color-text)' : 'var(--color-text-3)', fontWeight: value ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.label ?? placeholder ?? '—'}
        </span>
        <ChevronDown size={11} style={{ flexShrink: 0, color: 'var(--color-text-4)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
      </button>
      {createPortal(
        <AnimatePresence>
        {open && pos && (
          <motion.div
            ref={popRef}
            initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.16 }}
            style={{
              position: 'fixed', top: pos.top, left: pos.left, zIndex: 4000, width: pos.width,
              minWidth: width ?? 110,
              background: 'rgba(var(--glass-rgb), 0.97)',
              backdropFilter: 'blur(16px) saturate(180%)',
              WebkitBackdropFilter: 'blur(16px) saturate(180%)',
              border: '1px solid var(--color-border-medium)',
              borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              padding: 6, overflow: 'hidden',
            }}
          >
            <ScrollFade maxHeight={224} bg="rgba(var(--glass-rgb), 0.97)" overlayScrollbar>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {allowEmpty && (
                  <button onClick={() => { onChange(''); setOpen(false) }} style={pickerOptionStyle(value === '')}
                    onMouseEnter={e => { if (value !== '') (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-5)' }}
                    onMouseLeave={e => { if (value !== '') (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >—</button>
                )}
                {options.map(o => (
                  <button key={o.value} onClick={() => { onChange(o.value); setOpen(false) }} style={pickerOptionStyle(o.value === value)}
                    onMouseEnter={e => { if (o.value !== value) (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-5)' }}
                    onMouseLeave={e => { if (o.value !== value) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </ScrollFade>
          </motion.div>
        )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  )
}

function CalendarPicker({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const t = useT()
  const ph = placeholder ?? t('Выберите дату')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  // Dropdown is portaled to <body> so the rail's overflow:hidden can't clip it.
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const parsed = parseDateDot(value)
  const todayDate = parseDateDot(todayDotStr())!
  const [viewYear, setViewYear] = useState(() => parsed ? parsed.getFullYear() : todayDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(() => parsed ? parsed.getMonth() : todayDate.getMonth())

  useLayoutEffect(() => {
    if (!open) return
    function place() {
      const r = ref.current?.getBoundingClientRect()
      if (r) setPos({ top: r.bottom + 6, left: r.left })
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      const tgt = e.target as Node
      if (ref.current?.contains(tgt) || popRef.current?.contains(tgt)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function prevMonth() { viewMonth === 0 ? (setViewMonth(11), setViewYear(y => y-1)) : setViewMonth(m => m-1) }
  function nextMonth() { viewMonth === 11 ? (setViewMonth(0), setViewYear(y => y+1)) : setViewMonth(m => m+1) }

  const firstDay = new Date(viewYear, viewMonth, 1)
  const startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  function pickDay(day: number) {
    onChange(formatDateDot(new Date(viewYear, viewMonth, day)))
    setOpen(false)
  }

  const todayStr = todayDotStr()

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 10px', borderRadius: 11, border: 'none',
          cursor: 'pointer', background: 'var(--color-bg-input)',
          fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.15s', fontSize: 12,
        }}
      >
        <Calendar size={13} style={{ flexShrink: 0, color: value ? 'var(--color-text)' : 'var(--color-text-3)' }} />
        <span style={{ flex: 1, color: value ? 'var(--color-text)' : 'var(--color-text-3)', fontWeight: value ? 600 : 400 }}>
          {value || ph}
        </span>
        {value ? (
          <button onClick={e => { e.stopPropagation(); onChange('') }}
            style={{ width: 18, height: 18, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(52,168,83,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-green-text)', flexShrink: 0, padding: 0 }}>
            <X size={10} />
          </button>
        ) : (
          <ChevronDown size={11} style={{ flexShrink: 0, color: 'var(--color-text-4)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
        )}
      </button>
      {createPortal(
        <AnimatePresence>
        {open && pos && (
          <motion.div
            ref={popRef}
            initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.16 }}
            style={{
              position: 'fixed', top: pos.top, left: pos.left, zIndex: 4000, minWidth: 260,
              background: 'rgba(var(--glass-rgb), 0.97)',
              backdropFilter: 'blur(16px) saturate(180%)',
              WebkitBackdropFilter: 'blur(16px) saturate(180%)',
              border: '1px solid var(--color-border-medium)',
              borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', padding: '14px 12px 12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <button style={navBtnSt} onClick={prevMonth}><ChevronLeft size={13} /></button>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{t(RU_MONTHS_CAL[viewMonth])} {viewYear}</span>
              <button style={navBtnSt} onClick={nextMonth}><ChevronRight size={13} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
              {RU_DAYS_SHORT.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: 'var(--color-text-4)', padding: '2px 0' }}>{t(d)}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {cells.map((day, idx) => {
                if (!day) return <div key={idx} />
                const thisStr = formatDateDot(new Date(viewYear, viewMonth, day))
                const isSelected = thisStr === value
                const isToday = thisStr === todayStr
                return (
                  <button key={idx} onClick={() => pickDay(day)} style={{
                    width: '100%', aspectRatio: '1', borderRadius: 8, border: 'none',
                    cursor: 'pointer', fontSize: 12, fontWeight: isSelected || isToday ? 700 : 400,
                    background: isSelected ? 'var(--color-green-soft)' : isToday ? 'var(--color-green-soft)' : 'transparent',
                    color: isSelected ? 'var(--color-green-text)' : isToday ? 'var(--color-green-text)' : 'var(--color-text)',
                    transition: 'background 0.12s',
                  }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-3)' }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = isToday ? 'var(--color-green-soft)' : 'transparent' }}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
              <button onClick={() => { onChange(''); setOpen(false) }}
                style={{ fontSize: 12, color: 'var(--color-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                {t('Очистить')}
              </button>
              <button onClick={() => { onChange(todayStr); setOpen(false) }}
                style={{ fontSize: 12, color: 'var(--color-green-text)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
                {t('Сегодня')}
              </button>
            </div>
          </motion.div>
        )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  )
}

// ─── Task card (inline editor, same design as TeacherHomeworkCreatePage) ─────

const IMG_SIZES: { label: string; value: number }[] = [
  { label: 'S', value: 25 },
  { label: 'M', value: 50 },
  { label: 'L', value: 75 },
  { label: '↔', value: 100 },
]

function HWTaskCard({ task, index, onUpdate, onDelete, onGripDown }: {
  task: HWTask; index: number
  onUpdate: (t: HWTask) => void
  onDelete: () => void
  onGripDown?: () => void
}) {
  const t = useT()
  const cfg = TASK_TYPES.find(x => x.type === task.type)!
  const [expanded, setExpanded] = useState(true)
  const imgInputRef = useRef<HTMLInputElement>(null)
  const choices = task.choices ?? ['', '', '', '']
  const correctChoices = task.correctChoices ?? [0]
  const pairs = task.pairs ?? [{ left: '', right: '' }, { left: '', right: '' }]

  return (
    <GlassCard style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px',
          borderBottom: expanded ? '1px solid var(--color-border-soft)' : 'none',
          cursor: 'pointer',
        }}
      >
        <GripVertical
          size={13}
          style={{ color: 'var(--color-text-4)', flexShrink: 0, cursor: 'grab' }}
          onClick={e => e.stopPropagation()}
          onMouseDown={() => onGripDown?.()}
        />
        {task.isHard && <Star size={12} style={{ color: '#F59E0B', fill: '#F59E0B', flexShrink: 0 }} />}
        <div style={{
          fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg,
          borderRadius: 7, padding: '2px 8px', flexShrink: 0,
        }}>
          {index + 1}. {t(cfg.label)}
        </div>
        <div style={{ flex: 1, fontSize: 12, color: 'var(--color-text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {task.question || <span style={{ fontStyle: 'italic' }}>{t('без текста')}</span>}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          style={{ width: 26, height: 26, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--color-bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)', flexShrink: 0 }}
        >
          <X size={12} />
        </button>
        <div style={{ color: 'var(--color-text-4)', flexShrink: 0 }}>
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </div>
      </div>

      {/* Body */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Question */}
              <textarea
                value={task.question ?? ''}
                onChange={e => onUpdate({ ...task, question: e.target.value })}
                placeholder={t('Условие задания...')}
                style={{ ...inputSt, resize: 'none', minHeight: 72, fontSize: 13, lineHeight: 1.55 }}
              />

              {/* Условие-картинка */}
              <input ref={imgInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0]; if (!file) return
                  optimizePhoto(file)
                    .then(url => onUpdate({ ...task, image: url, imageSize: task.imageSize ?? 100 }))
                    .catch(err => { if (err instanceof ImageTooLargeError) window.alert(err.message); else throw err })
                  e.target.value = ''
                }}
              />
              {task.image ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {IMG_SIZES.map(s => (
                      <button key={s.value} onClick={() => onUpdate({ ...task, imageSize: s.value })}
                        style={{ padding: '3px 9px', borderRadius: 7, border: `1.5px solid ${(task.imageSize ?? 100) === s.value ? cfg.color : 'var(--color-border-medium)'}`, background: (task.imageSize ?? 100) === s.value ? cfg.bg : 'var(--color-bg-2)', color: (task.imageSize ?? 100) === s.value ? cfg.color : 'var(--color-text-3)', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit' }}>
                        {s.label}
                      </button>
                    ))}
                    <span style={{ fontSize: 11, color: 'var(--color-text-3)', marginLeft: 2 }}>{task.imageSize ?? 100}%</span>
                    <button onClick={() => imgInputRef.current?.click()} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 8, border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer', fontSize: 11, color: 'var(--color-text-3)', fontFamily: 'inherit' }}>
                      <Camera size={12} /> {t('Заменить')}
                    </button>
                    <button onClick={() => onUpdate({ ...task, image: undefined, imageSize: undefined })} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 8, border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer', color: 'var(--color-text-3)' }}>
                      <X size={12} />
                    </button>
                  </div>
                  <div style={{ alignSelf: 'flex-start', width: `${task.imageSize ?? 100}%` }}>
                    <img src={task.image} alt="" style={{ display: 'block', width: '100%', borderRadius: 10, border: '1px solid var(--color-border-medium)' }} />
                  </div>
                </div>
              ) : (
                <button onClick={() => imgInputRef.current?.click()}
                  style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 9, border: '1.5px dashed var(--color-border-medium)', background: 'var(--color-bg-2)', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-3)', fontFamily: 'inherit' }}>
                  <Camera size={13} /> {t('Добавить фото к условию')}
                </button>
              )}

              {/* Choice options */}
              {(task.type === 'single' || task.type === 'multi') && (
                <div>
                  <Label>{t('Варианты ответа')}</Label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {choices.map((ch, ci) => {
                      const isCorrect = correctChoices.includes(ci)
                      const letter = 'АБВГДЕЖЗИ'[ci] ?? String(ci + 1)
                      return (
                      <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button
                          onClick={() => {
                            if (task.type === 'single') {
                              onUpdate({ ...task, correctChoices: [ci] })
                            } else {
                              onUpdate({ ...task, correctChoices: isCorrect ? correctChoices.filter(x => x !== ci) : [...correctChoices, ci] })
                            }
                          }}
                          style={{
                            width: 24, height: 24,
                            borderRadius: task.type === 'single' ? '50%' : 7,
                            border: `2px solid ${isCorrect ? cfg.color : 'var(--color-border-medium)'}`,
                            background: isCorrect ? cfg.color : 'transparent',
                            cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            position: 'relative', transition: 'all 0.14s',
                          }}
                        >
                          {isCorrect && <Check size={13} strokeWidth={3} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: getContrastColor(cfg.color) }} />}
                        </button>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', borderRadius: 12, border: `2px solid ${isCorrect ? cfg.color : 'var(--color-border-medium)'}`, background: 'var(--color-bg-input)', overflow: 'hidden', transition: 'all 0.14s' }}>
                          <div style={{ width: 32, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: isCorrect ? cfg.color : 'var(--color-text-2)', flexShrink: 0 }}>{letter}</div>
                          <input
                            value={ch}
                            onChange={e => { const next = [...choices]; next[ci] = e.target.value; onUpdate({ ...task, choices: next }) }}
                            placeholder={`${t('Вариант')} ${letter}…`}
                            style={{ flex: 1, padding: '10px 12px 10px 0', border: 'none', background: 'transparent', color: 'var(--color-text)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
                          />
                        </div>
                        {choices.length > 2 && (
                          <button
                            onClick={() => {
                              const next = choices.filter((_, i) => i !== ci)
                              const correct = correctChoices.filter(i => i !== ci).map(i => i > ci ? i - 1 : i)
                              onUpdate({ ...task, choices: next, correctChoices: correct })
                            }}
                            style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'var(--color-red-soft)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-red-text)', flexShrink: 0 }}
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                      )
                    })}
                    <button
                      onClick={() => onUpdate({ ...task, choices: [...choices, ''] })}
                      style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer', fontSize: 12, color: 'var(--color-muted)', fontFamily: 'inherit' }}
                    >
                      <Plus size={12} /> {t('Добавить вариант')}
                    </button>
                  </div>
                </div>
              )}

              {/* Match pairs */}
              {task.type === 'matching' && (
                <div>
                  <Label>{t('Пары для сопоставления')}</Label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {pairs.map((pair, pi) => (
                      <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          value={pair.left}
                          onChange={e => { const next = [...pairs]; next[pi] = { ...pair, left: e.target.value }; onUpdate({ ...task, pairs: next }) }}
                          placeholder={`${t('Левая')} ${pi + 1}`}
                          style={{ ...inputSt, flex: 1 }}
                        />
                        <div style={{ color: 'var(--color-text-4)', fontSize: 16, flexShrink: 0 }}>↔</div>
                        <input
                          value={pair.right}
                          onChange={e => { const next = [...pairs]; next[pi] = { ...pair, right: e.target.value }; onUpdate({ ...task, pairs: next }) }}
                          placeholder={`${t('Правая')} ${pi + 1}`}
                          style={{ ...inputSt, flex: 1 }}
                        />
                        {pairs.length > 2 && (
                          <button
                            onClick={() => onUpdate({ ...task, pairs: pairs.filter((_, i) => i !== pi) })}
                            style={{ width: 22, height: 22, borderRadius: 6, border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)', flexShrink: 0 }}
                          >
                            <X size={11} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => onUpdate({ ...task, pairs: [...pairs, { left: '', right: '' }] })}
                      style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer', fontSize: 12, color: 'var(--color-muted)', fontFamily: 'inherit' }}
                    >
                      <Plus size={12} /> {t('Добавить пару')}
                    </button>
                  </div>
                </div>
              )}

              {/* Sequence — items stored in the correct order */}
              {task.type === 'sequence' && (() => {
                const items = task.sequenceItems ?? ['', '']
                const setItems = (next: string[]) => onUpdate({ ...task, sequenceItems: next })
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
                          <input value={it} onChange={e => { const n = [...items]; n[i] = e.target.value; setItems(n) }} placeholder={`${t('Шаг')} ${i + 1}`} style={{ ...inputSt, flex: 1 }} />
                          <button onClick={() => { if (i > 0) { const n = [...items];[n[i - 1], n[i]] = [n[i], n[i - 1]]; setItems(n) } }} disabled={i === 0} style={reorderBtn(i === 0)} title={t('Выше')}><ArrowUp size={12} /></button>
                          <button onClick={() => { if (i < items.length - 1) { const n = [...items];[n[i + 1], n[i]] = [n[i], n[i + 1]]; setItems(n) } }} disabled={i === items.length - 1} style={reorderBtn(i === items.length - 1)} title={t('Ниже')}><ArrowDown size={12} /></button>
                          {items.length > 2 && (
                            <button onClick={() => setItems(items.filter((_, j) => j !== i))} style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)', flexShrink: 0 }}><X size={11} /></button>
                          )}
                        </div>
                      ))}
                      <button onClick={() => setItems([...items, ''])} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer', fontSize: 12, color: 'var(--color-muted)', fontFamily: 'inherit' }}>
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
                    onChange={table => onUpdate({ ...task, table })}
                    accent={cfg.color}
                    accentBg={cfg.bg}
                    allowCellImages
                  />
                </div>
              )}

              {/* Whiteboard — ученик нарисует ответ */}
              {task.type === 'whiteboard' && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 9, padding: '12px 14px',
                  borderRadius: 12, border: '1.5px dashed var(--color-border)',
                  background: 'var(--color-blue-pill-bg)',
                }}>
                  <PenLine size={15} style={{ color: 'var(--color-blue-pill-text)', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--color-blue-pill-text)', fontWeight: 600 }}>
                    {t('Ученик нарисует решение по этому вопросу на доске')}
                  </span>
                </div>
              )}

              {/* Answer for extended / fill */}
              {(task.type === 'extended' || task.type === 'fill') && (
                <input
                  value={task.answer ?? ''}
                  onChange={e => onUpdate({ ...task, answer: e.target.value })}
                  placeholder={t('Эталонный ответ...')}
                  style={inputSt}
                />
              )}

              {/* wordBank / listenBank — reference sentence + optional distractor tiles */}
              {(task.type === 'wordBank' || task.type === 'listenBank') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    value={task.sentence ?? ''}
                    onChange={e => onUpdate({ ...task, sentence: e.target.value })}
                    placeholder={t('Эталонное предложение — разобьётся на плитки по словам')}
                    style={inputSt}
                  />
                  <input
                    value={(task.distractors ?? []).join(', ')}
                    onChange={e => onUpdate({ ...task, distractors: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    placeholder={t('Лишние слова-обманки через запятую (необязательно)')}
                    style={inputSt}
                  />
                </div>
              )}

              {/* listenType — audio stimulus + reference answer (auto-graded) */}
              {task.type === 'listenType' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <AudioStimulusEditor
                    value={{ audioUrl: task.audioUrl, ttsText: task.ttsText, allowSlow: task.allowSlow }}
                    onChange={patch => onUpdate({ ...task, ...patch })}
                    inputStyle={inputSt}
                  />
                  <input
                    value={task.answer ?? ''}
                    onChange={e => onUpdate({ ...task, answer: e.target.value })}
                    placeholder={t('Что ученик должен напечатать (эталон)')}
                    style={inputSt}
                  />
                </div>
              )}

              {/* speaking — read-aloud target + response window (teacher-reviewed) */}
              {task.type === 'speaking' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    value={task.targetText ?? ''}
                    onChange={e => onUpdate({ ...task, targetText: e.target.value })}
                    placeholder={t('Текст для чтения вслух (необязательно — иначе свободный ответ)')}
                    style={inputSt}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="number" min={0} value={task.prepSeconds ?? 20}
                      onChange={e => onUpdate({ ...task, prepSeconds: Number(e.target.value) })}
                      placeholder={t('Подготовка, сек')} style={{ ...inputSt, flex: 1 }} />
                    <input type="number" min={5} value={task.responseSeconds ?? 90}
                      onChange={e => onUpdate({ ...task, responseSeconds: Number(e.target.value) })}
                      placeholder={t('Ответ, сек')} style={{ ...inputSt, flex: 1 }} />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  )
}

// ─── Homework field map ───────────────────────────────────────────────────────
// Each lesson carries two independent homeworks — one for the «Урок» node and one
// for the «Запись» node. The hwTab toggle (lifted to the page) picks which.

function hwFields(hwTab: 'lesson' | 'rec') {
  return hwTab === 'rec'
    ? { title: 'recHwTitle', date: 'recHwDate', dateManual: 'recHwDateManual', tasks: 'recHwTasks' } as const
    : { title: 'hwTitle',    date: 'hwDate',    dateManual: 'hwDateManual',    tasks: 'hwTasks' } as const
}

// ─── Bank picker (collapsible «Из тренажёра» list) ───────────────────────────

function BankPicker({ onPick, hard }: { onPick: (bt: BankTask) => void; hard?: boolean }) {
  const t = useT()
  const bankTasks = useTaskBank(s => s.tasks)
  const loadBank = useTaskBank(s => s.load)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  useEffect(() => { loadBank() }, [loadBank])

  const filtered = search.trim()
    ? bankTasks.filter(t => t.question.toLowerCase().includes(search.toLowerCase()))
    : bankTasks

  const accent = hard ? '#B45309' : 'var(--color-text-2)'
  const accentBg = hard ? 'rgba(245,158,11,0.1)' : 'transparent'
  const border = hard ? 'rgba(245,158,11,0.4)' : 'var(--color-border)'

  return (
    <div>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%',
        padding: '10px 12px', borderRadius: 13, border: `1.5px dashed ${border}`,
        background: accentBg, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: accent,
      }}>
        <BookOpen size={14} /> {open ? t('Скрыть тренажёр') : t('Из тренажёра')}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}
          >
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ position: 'relative' }}>
                <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-4)' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t('Поиск задания…')}
                  style={{ ...inputSt, fontSize: 11.5, padding: '6px 9px 6px 26px' }}
                />
              </div>
              <OverlayScrollArea style={{ maxHeight: 260 }} bg="rgba(var(--glass-rgb), 0.7)" scrollStyle={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {filtered.slice(0, 80).map(bt => (
                  <button
                    key={bt.id}
                    onClick={() => onPick(bt)}
                    style={{ textAlign: 'left', padding: '7px 9px', borderRadius: 9, border: 'none', background: 'var(--color-bg-2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11.5, color: 'var(--color-text-2)', display: 'flex', gap: 6, alignItems: 'flex-start' }}
                  >
                    <Plus size={11} style={{ flexShrink: 0, marginTop: 2, color: 'var(--color-green-text)' }} />
                    <span style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {bt.questionTable ? '📊 ' : ''}{bt.question || t('Без текста')}
                    </span>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div style={{ fontSize: 11, color: 'var(--color-muted)', padding: '6px 8px' }}>
                    {bankTasks.length === 0 ? t('Банк пуст') : t('Ничего не найдено')}
                  </div>
                )}
              </OverlayScrollArea>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── LEFT: Homework meta + task-type picker ──────────────────────────────────

function HomeworkLeftPanel({
  lesson, onUpdate, hwTab, setHwTab, isLanguage = false,
}: {
  lesson: CELesson
  onUpdate: (updated: CELesson) => void
  hwTab: 'lesson' | 'rec'
  setHwTab: (t: 'lesson' | 'rec') => void
  isLanguage?: boolean
}) {
  const t = useT()
  const F = hwFields(hwTab)
  const tasks = (lesson[F.tasks] as HWTask[] | undefined) ?? []
  // Language types only appear for language courses; other courses keep the base palette.
  const palette = TASK_TYPES.filter(tt => isLanguage || !tt.languageOnly)

  // Аккордеон: открыта ровно одна секция (по умолчанию — обычные типы).
  const [openSection, setOpenSection] = useState<'basic' | 'hard'>('basic')
  const { ref: hwScrollRef, fade: hwFade, thumb: hwThumb, onScroll: onHwScroll } = useOverlayScroll()
  const basicCount = tasks.filter(t => !t.isHard).length
  const hardCount = tasks.filter(t => t.isHard).length

  function patch(p: Partial<CELesson>) { onUpdate({ ...lesson, ...p }) }

  function addTask(type: HWTaskType, isHard: boolean) {
    patch({ [F.tasks]: [...tasks, makeHWTask(type, isHard)] })
  }

  function addFromBank(bt: BankTask, isHard: boolean) {
    patch({ [F.tasks]: [...tasks, hwTaskFromBank(bt, isHard)] })
  }

  // Сложные задания: развёрнутый ответ, выбор и доска (ребёнок рисует решение).
  const hardTaskTypes = TASK_TYPES.filter(t => t.type === 'extended' || t.type === 'single' || t.type === 'multi' || t.type === 'whiteboard')

  return (
    <div style={{
      width: 248, flexShrink: 0,
      background: 'rgba(var(--glass-rgb), 0.88)',
      backdropFilter: 'blur(16px) saturate(180%)',
      WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      border: '1px solid var(--color-border-glass)',
      boxShadow: 'var(--shadow-sm-page)',
      borderRadius: 18,
      display: 'flex', flexDirection: 'column',
      maxHeight: 'calc(100vh - 120px)', position: 'relative', overflow: 'hidden',
    }}>
      <ScrollOverlays fade={hwFade} thumb={hwThumb} bg="rgba(var(--glass-rgb), 0.88)" />
      <div ref={hwScrollRef} onScroll={onHwScroll} className="no-scrollbar" style={{
        flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain',
        padding: '16px 14px 18px', display: 'flex', flexDirection: 'column', gap: 12,
      }}>
      {/* Target toggle: lesson HW vs recording HW — single line, no icons */}
      <div style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 12, background: 'var(--color-bg-2)' }}>
        {([
          { id: 'lesson', label: 'ДЗ урока', n: (lesson.hwTasks ?? []).length },
          { id: 'rec',    label: 'ДЗ записи', n: (lesson.recHwTasks ?? []).length },
        ] as const).map(tt => (
          <button key={tt.id} onClick={() => setHwTab(tt.id)} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 8px', borderRadius: 9,
            border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
            background: hwTab === tt.id ? 'var(--color-green-soft)' : 'transparent',
            color: hwTab === tt.id ? 'var(--color-green-text)' : 'var(--color-text-3)',
            transition: 'background 0.13s',
          }}>
            {t(tt.label)}
            {tt.n > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: hwTab === tt.id ? 'var(--btn-green-bg)' : 'var(--color-bg-3)', color: hwTab === tt.id ? '#fff' : 'var(--color-muted)' }}>{tt.n}</span>
            )}
          </button>
        ))}
      </div>

      <div>
        <input
          value={(lesson[F.title] as string | undefined) ?? ''}
          onChange={e => patch({ [F.title]: e.target.value })}
          style={{ ...inputSt, padding: '7px 10px', fontSize: 12 }}
          placeholder={t('Название задания')}
        />
      </div>
      <div>
        <CalendarPicker
          value={(lesson[F.date] as string | undefined) ?? ''}
          placeholder={t('Дата сдачи')}
          // Editing the due date by hand detaches it from the lesson/recording date;
          // clearing it re-attaches so it resumes mirroring that date.
          onChange={v => patch({ [F.date]: v, [F.dateManual]: !!v })}
        />
      </div>

      <div style={{ height: 1, background: 'var(--color-border-soft)', margin: '2px 0' }} />

      {/* Аккордеон: открыта всегда ровно одна секция (тип / сложное). */}
      <AccordionSection
        title={t('ТИП ЗАДАНИЯ')}
        count={basicCount}
        open={openSection === 'basic'}
        onToggle={() => setOpenSection(s => s === 'basic' ? 'hard' : 'basic')}
      >
        {palette.map(tt => (
          <button key={tt.type} onClick={() => addTask(tt.type, false)} title={t(tt.hint)} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 10px', borderRadius: 13,
            border: 'none', background: 'var(--color-bg-2)',
            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%',
            transition: 'opacity 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <div style={{ width: 34, height: 34, borderRadius: 9, background: tt.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <tt.Icon size={15} style={{ color: tt.color }} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>{t(tt.label)}</div>
              <div style={{ fontSize: 10, color: 'var(--color-muted)', marginTop: 1 }}>{t(tt.hint)}</div>
            </div>
          </button>
        ))}
        <BankPicker onPick={bt => addFromBank(bt, false)} />
      </AccordionSection>

      <div style={{ height: 1, background: 'var(--color-border-soft)', margin: '2px 4px' }} />

      <AccordionSection
        title={t('СЛОЖНОЕ ЗАДАНИЕ')}
        count={hardCount}
        accent="#B45309"
        open={openSection === 'hard'}
        onToggle={() => setOpenSection(s => s === 'hard' ? 'basic' : 'hard')}
      >
        {hardTaskTypes.map(tt => (
          <button key={tt.type + '_hard'} onClick={() => addTask(tt.type, true)} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 12px', borderRadius: 13,
            border: 'none', background: 'rgba(245,158,11,0.1)',
            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%',
            transition: 'opacity 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <Star size={14} style={{ color: '#F59E0B', fill: '#F59E0B', flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#B45309' }}>{t(tt.label)}</span>
          </button>
        ))}
        <BankPicker hard onPick={bt => addFromBank(bt, true)} />
      </AccordionSection>
      </div>
    </div>
  )
}

// ─── Collapsible section header (mutually-exclusive accordion) ───────────────

function AccordionSection({ title, count, open, onToggle, accent, children }: {
  title: string
  count: number
  open: boolean
  onToggle: () => void
  accent?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 8px', borderRadius: 11, border: 'none',
          background: open ? 'var(--color-bg-2)' : 'transparent',
          cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.13s',
        }}
        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-2)' }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
      >
        <span style={{ flex: 1, textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: accent ?? 'var(--color-text-3)' }}>
          {title}
        </span>
        {count > 0 && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 999,
            background: accent ? 'rgba(245,158,11,0.15)' : 'var(--color-bg-3)',
            color: accent ?? 'var(--color-muted)',
          }}>{count}</span>
        )}
        <ChevronDown size={15} style={{ flexShrink: 0, color: accent ?? 'var(--color-text-3)', transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform 0.18s' }} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8 }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── CENTER: Homework task list only ─────────────────────────────────────────

function CenterHomework({
  lesson, onUpdate, hwTab,
}: {
  lesson: CELesson
  onUpdate: (updated: CELesson) => void
  hwTab: 'lesson' | 'rec'
}) {
  const t = useT()
  const F = hwFields(hwTab)
  const tasks = (lesson[F.tasks] as HWTask[] | undefined) ?? []

  // Drag-to-reorder. The whole card can't be `draggable` (it would block text
  // selection inside the textareas), so dragging is «armed» only on grip
  // mousedown and disarmed on dragend.
  const [armedId, setArmedId] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropIdx, setDropIdx] = useState<number | null>(null)
  const clearDrag = () => { setDragId(null); setDropIdx(null); setArmedId(null) }

  function patch(p: Partial<CELesson>) { onUpdate({ ...lesson, ...p }) }
  function removeTask(id: string) { patch({ [F.tasks]: tasks.filter(t => t.id !== id) }) }
  function updateTask(updated: HWTask) { patch({ [F.tasks]: tasks.map(t => t.id === updated.id ? updated : t) }) }

  function commitDrop() {
    if (dragId == null || dropIdx == null) { clearDrag(); return }
    const cur = [...tasks]
    const from = cur.findIndex(t => t.id === dragId)
    if (from === -1) { clearDrag(); return }
    const [moved] = cur.splice(from, 1)
    const insertAt = from < dropIdx ? dropIdx - 1 : dropIdx
    cur.splice(insertAt, 0, moved)
    patch({ [F.tasks]: cur })
    clearDrag()
  }

  const DropLine = () => (
    <div style={{ height: 2, background: 'var(--color-green-text)', borderRadius: 2, margin: '-4px 0', pointerEvents: 'none' }} />
  )

  return (
    <OverlayScrollArea style={{ flex: 1 }} padding="20px 24px">
      {tasks.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280, gap: 10 }}>
          <BookOpen size={36} style={{ opacity: 0.15, color: 'var(--color-muted)' }} />
          <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>{t('Выберите тип задания слева')}</span>
        </div>
      ) : (
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
            onDrop={e => { e.preventDefault(); commitDrop() }}
            onDragOver={e => e.preventDefault()}
          >
            {tasks.map((task, i) => (
              <div
                key={task.id}
                draggable={armedId === task.id}
                onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDragId(task.id) }}
                onDragEnd={clearDrag}
                onDragOver={e => {
                  if (dragId == null) return
                  e.preventDefault()
                  const rect = e.currentTarget.getBoundingClientRect()
                  setDropIdx(e.clientY < rect.top + rect.height / 2 ? i : i + 1)
                }}
                style={{ opacity: dragId === task.id ? 0.4 : 1 }}
              >
                {dragId != null && dropIdx === i && <DropLine />}
                <HWTaskCard
                  task={task}
                  index={i}
                  onUpdate={updateTask}
                  onDelete={() => removeTask(task.id)}
                  onGripDown={() => setArmedId(task.id)}
                />
                {dragId != null && dropIdx === tasks.length && i === tasks.length - 1 && <DropLine />}
              </div>
            ))}
          </div>
        </div>
      )}
    </OverlayScrollArea>
  )
}

// ─── CENTER: Test node editor (final test quiz) ───────────────────────────────

function CenterTestView({
  lesson, onUpdate, onBack,
}: {
  lesson: CELesson
  onUpdate: (updated: CELesson) => void
  onBack: () => void
}) {
  const t = useT()
  const tasks = lesson.testTasks ?? []
  function removeTask(id: string) { onUpdate({ ...lesson, testTasks: tasks.filter(t => t.id !== id) }) }
  function updateTask(updated: HWTask) { onUpdate({ ...lesson, testTasks: tasks.map(t => t.id === updated.id ? updated : t) }) }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '10px 16px 12px', borderBottom: '1px solid var(--color-border-soft)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 11px', borderRadius: 999, background: 'var(--color-green-soft)', color: 'var(--color-green-text)', fontSize: 11, fontWeight: 700 }}>
            <ClipboardCheck size={12} /> {t('Финальный тест')}
          </div>
        </div>
        <Label>{t('Название теста')}</Label>
        <input value={lesson.title} onChange={e => onUpdate({ ...lesson, title: e.target.value })} style={{ ...inputSt, padding: '8px 11px', fontSize: 13 }} placeholder={t('Например: Контрольная по модулю 1')} />
        <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
          <Unlock size={11} /> {t('Откроется у студента автоматически после прохождения предыдущего модуля')}
        </div>
      </div>

      {/* Task list — centred, same shape as the homework editor */}
      <OverlayScrollArea style={{ flex: 1 }} padding="20px 24px">
        {tasks.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280, gap: 10 }}>
            <ClipboardCheck size={36} style={{ opacity: 0.15, color: 'var(--color-muted)' }} />
            <span style={{ fontSize: 13, color: 'var(--color-muted)', textAlign: 'center', maxWidth: 240 }}>{t('Выберите тип вопроса слева — составьте сами или возьмите из тренажёра')}</span>
          </div>
        ) : (
          <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tasks.map((task, i) => (
              <HWTaskCard key={task.id} task={task} index={i} onUpdate={updateTask} onDelete={() => removeTask(task.id)} />
            ))}
          </div>
        )}
      </OverlayScrollArea>
    </div>
  )
}

// ─── LEFT: Test question-type picker (matches HomeworkLeftPanel as a rail card) ─
function TestLeftPanel({ lesson, onUpdate, isLanguage = false }: {
  lesson: CELesson
  onUpdate: (updated: CELesson) => void
  isLanguage?: boolean
}) {
  const t = useT()
  const tasks = lesson.testTasks ?? []
  const palette = TASK_TYPES.filter(tt => isLanguage || !tt.languageOnly)
  const addTask = (type: HWTaskType) => onUpdate({ ...lesson, testTasks: [...tasks, makeHWTask(type, false)] })
  const addFromBank = (bt: BankTask) => onUpdate({ ...lesson, testTasks: [...tasks, hwTaskFromBank(bt, false)] })
  return (
    <OverlayScrollArea
      style={{ width: 248, flexShrink: 0, background: 'rgba(var(--glass-rgb), 0.7)', border: '1px solid var(--color-border-glass)', borderRadius: 18, maxHeight: 'calc(100vh - 120px)' }}
      bg="rgba(var(--glass-rgb), 0.7)"
      padding="16px 14px 18px"
      scrollStyle={{ gap: 10, display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.8, padding: '0 4px' }}>{t('СОСТАВИТЬ ВОПРОС')}</div>
      {palette.map(tt => (
        <button key={tt.type} onClick={() => addTask(tt.type)} title={t(tt.hint)} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px', borderRadius: 13,
          border: 'none', background: 'var(--color-bg-2)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%',
          transition: 'opacity 0.12s',
        }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          <div style={{ width: 34, height: 34, borderRadius: 9, background: tt.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <tt.Icon size={15} style={{ color: tt.color }} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>{t(tt.label)}</div>
            <div style={{ fontSize: 10, color: 'var(--color-muted)', marginTop: 1 }}>{t(tt.hint)}</div>
          </div>
        </button>
      ))}
      <BankPicker onPick={addFromBank} />
    </OverlayScrollArea>
  )
}

// ─── Students audience helpers (shared by left rail + center roster) ─────────

function useLessonAudience(
  lesson: CELesson,
  course: CourseEdData,
  groups: Array<{ id: string; name: string }>,
  allStudents: Array<{ id: string; name: string; groupId?: string }>,
) {
  const extraGroupIds = lesson.extraGroupIds ?? []
  const extraStudentIds = lesson.extraStudentIds ?? []

  const courseGroups = groups.filter(g => course.groupIds.includes(g.id))
  const courseStudents = allStudents.filter(s => course.studentIds.includes(s.id))
  const extraGroups = groups.filter(g => extraGroupIds.includes(g.id))
  const extraStudentsList = allStudents.filter(s => extraStudentIds.includes(s.id))

  const courseGroupStudents = allStudents.filter(s => courseGroups.some(g => g.id === s.groupId))
  const totalBaseline = new Set([...courseGroupStudents.map(s => s.id), ...courseStudents.map(s => s.id)])

  return { extraGroupIds, extraStudentIds, courseGroups, courseStudents, extraGroups, extraStudentsList, courseGroupStudents, totalBaseline }
}

// ─── LEFT rail: students — search + add controls ─────────────────────────────

function StudentsLeftPanel({
  lesson, onUpdate, course, groups, allStudents,
}: {
  lesson: CELesson
  onUpdate: (updated: CELesson) => void
  course: CourseEdData
  groups: Array<{ id: string; name: string }>
  allStudents: Array<{ id: string; name: string; groupId?: string }>
}) {
  const t = useT()
  const [addTab, setAddTab] = useState<'group' | 'student'>('student')
  const { ref: choicesRef, fade: choicesFade, thumb: choicesThumb, onScroll: handleChoicesScroll } = useOverlayScroll()
  const [query, setQuery] = useState('')

  const { extraGroupIds, extraStudentIds, totalBaseline } = useLessonAudience(lesson, course, groups, allStudents)

  function toggleExtraGroup(id: string) {
    onUpdate({
      ...lesson,
      extraGroupIds: extraGroupIds.includes(id) ? extraGroupIds.filter(x => x !== id) : [...extraGroupIds, id],
    })
  }
  function toggleExtraStudent(id: string) {
    onUpdate({
      ...lesson,
      extraStudentIds: extraStudentIds.includes(id) ? extraStudentIds.filter(x => x !== id) : [...extraStudentIds, id],
    })
  }

  const q = query.trim().toLowerCase()
  const studentChoices = allStudents
    .filter(s => !totalBaseline.has(s.id))
    .filter(s => !q || s.name.toLowerCase().includes(q))
  const groupChoices = groups
    .filter(g => !course.groupIds.includes(g.id))
    .filter(g => !q || g.name.toLowerCase().includes(q))

  return (
    <div style={{
      width: 248, flexShrink: 0,
      background: 'rgba(var(--glass-rgb), 0.88)',
      backdropFilter: 'blur(16px) saturate(180%)',
      WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      border: '1px solid var(--color-border-glass)',
      boxShadow: 'var(--shadow-sm-page)',
      borderRadius: 18, padding: '16px 16px 18px',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <Users size={14} style={{ color: 'var(--color-green-text)' }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{t('Добавить к уроку')}</span>
      </div>

      {/* student / group toggle */}
      <div style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 12, background: 'var(--color-bg-2)' }}>
        {(['student', 'group'] as const).map(tab => (
          <button key={tab} onClick={() => setAddTab(tab)} style={{
            flex: 1, padding: '6px 8px', borderRadius: 9, border: 'none', cursor: 'pointer',
            fontSize: 11.5, fontWeight: 700, fontFamily: 'inherit',
            background: addTab === tab ? 'var(--color-green-soft)' : 'transparent',
            color: addTab === tab ? 'var(--color-green-text)' : 'var(--color-text-3)',
            transition: 'background 0.13s',
          }}>
            {tab === 'group' ? t('Группа') : t('Ученик')}
          </button>
        ))}
      </div>

      {/* search */}
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={addTab === 'student' ? t('Поиск ученика…') : t('Поиск группы…')}
        style={{ ...inputSt, padding: '7px 10px', fontSize: 12 }}
      />

      {/* choices list */}
      <div style={{ minHeight: 0, position: 'relative' }}>
        <ScrollOverlays fade={choicesFade} thumb={choicesThumb} bg="rgba(var(--glass-rgb), 0.88)" />
        <div ref={choicesRef} onScroll={handleChoicesScroll} className="no-scrollbar" style={{ maxHeight: 306, overflowY: 'auto', overscrollBehavior: 'contain', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {addTab === 'student' && studentChoices.map(s => {
          const on = extraStudentIds.includes(s.id)
          return (
            <button key={s.id} onClick={() => toggleExtraStudent(s.id)} style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '7px 10px', borderRadius: 11,
              border: on ? '1.5px solid var(--color-green-text)' : '1.5px solid var(--color-border)',
              background: on ? 'var(--color-green-soft)' : 'transparent',
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.14s',
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: on ? 'var(--color-green-text)' : 'var(--color-bg-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
                color: on ? '#fff' : 'var(--color-muted)', flexShrink: 0,
              }}>
                {s.name.slice(0, 1).toUpperCase()}
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: on ? 'var(--color-green-text)' : 'var(--color-text)' }}>
                {s.name}
              </span>
              {on ? <Check size={12} style={{ color: 'var(--color-green-text)', flexShrink: 0 }} /> : <Plus size={12} style={{ color: 'var(--color-text-4)', flexShrink: 0 }} />}
            </button>
          )
        })}
        {addTab === 'student' && studentChoices.length === 0 && (
          <span style={{ fontSize: 11.5, color: 'var(--color-muted)', padding: '4px 2px' }}>
            {q ? t('Никого не найдено') : t('Все ученики уже в базовой аудитории')}
          </span>
        )}

        {addTab === 'group' && groupChoices.map(g => {
          const on = extraGroupIds.includes(g.id)
          return (
            <button key={g.id} onClick={() => toggleExtraGroup(g.id)} style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '7px 10px', borderRadius: 11,
              border: on ? '1.5px solid var(--color-green-text)' : '1.5px solid var(--color-border)',
              background: on ? 'var(--color-green-soft)' : 'transparent',
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.14s',
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: on ? 'var(--color-green-text)' : 'var(--color-bg-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Users size={13} style={{ color: on ? '#fff' : 'var(--color-muted)' }} />
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: on ? 'var(--color-green-text)' : 'var(--color-text)' }}>
                {g.name}
              </span>
              {on ? <Check size={12} style={{ color: 'var(--color-green-text)', flexShrink: 0 }} /> : <Plus size={12} style={{ color: 'var(--color-text-4)', flexShrink: 0 }} />}
            </button>
          )
        })}
        {addTab === 'group' && groupChoices.length === 0 && (
          <span style={{ fontSize: 11.5, color: 'var(--color-muted)', padding: '4px 2px' }}>
            {q ? t('Ничего не найдено') : t('Все группы уже в базовой аудитории')}
          </span>
        )}
        </div>
      </div>
    </div>
  )
}

// ─── CENTER: Lesson-level students tab — who actually has access ─────────────

function CenterLessonStudents({
  lesson, onUpdate, course, groups, allStudents, accessModes, setAccessModes,
}: {
  lesson: CELesson
  onUpdate: (updated: CELesson) => void
  course: CourseEdData
  groups: Array<{ id: string; name: string }>
  allStudents: Array<{ id: string; name: string; groupId?: string }>
  accessModes: Record<string, AccessMode>
  setAccessModes: React.Dispatch<React.SetStateAction<Record<string, AccessMode>>>
}) {
  const t = useT()
  const {
    extraGroupIds, extraStudentIds,
    courseGroups, courseStudents, extraGroups, extraStudentsList, totalBaseline,
  } = useLessonAudience(lesson, course, groups, allStudents)

  // Course-wide access mode (full / custom / by_date) is per-student, shared by
  // every lesson — surfaced here so it's reachable where teachers look. Editing
  // it changes the whole course, not just this lesson.
  const modeOf = (id: string): AccessMode => accessModes[id] ?? 'by_date'
  const setStudentMode = (id: string, mode: AccessMode) =>
    setAccessModes(m => ({ ...m, [id]: mode }))
  const memberIdsOf = (groupId: string) =>
    allStudents.filter(s => s.groupId === groupId).map(s => s.id)
  const groupMode = (groupId: string): AccessMode | 'mixed' => {
    const ids = memberIdsOf(groupId)
    if (ids.length === 0) return 'by_date'
    const first = modeOf(ids[0])
    return ids.every(id => modeOf(id) === first) ? first : 'mixed'
  }
  const setGroupMode = (groupId: string, mode: AccessMode) =>
    setAccessModes(m => {
      const next = { ...m }
      for (const id of memberIdsOf(groupId)) next[id] = mode
      return next
    })

  function removeExtraGroup(id: string) {
    onUpdate({ ...lesson, extraGroupIds: extraGroupIds.filter(x => x !== id) })
  }
  function removeExtraStudent(id: string) {
    onUpdate({ ...lesson, extraStudentIds: extraStudentIds.filter(x => x !== id) })
  }

  // total reach: baseline + extra students + students inside extra groups
  const extraGroupStudentIds = allStudents.filter(s => extraGroups.some(g => g.id === s.groupId)).map(s => s.id)
  const totalReach = new Set([...totalBaseline, ...extraStudentIds, ...extraGroupStudentIds])

  const baselineEmpty = totalBaseline.size === 0
  const extraEmpty = extraGroups.length === 0 && extraStudentsList.length === 0
  const n = totalReach.size
  const reachWord = n === 1 ? t('ученик') : n >= 2 && n <= 4 ? t('ученика') : t('учеников')
  const reachVerb = n === 1 ? t('видит этот урок') : t('видят этот урок')

  return (
    <OverlayScrollArea style={{ flex: 1 }} padding="24px 36px">
      <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>

        {/* Total reach headline */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 14,
          background: 'var(--color-green-soft)', border: '1px solid var(--color-border-glass)',
        }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--color-green-text)33', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Users size={18} style={{ color: 'var(--color-green-text)' }} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-green-text)', lineHeight: 1.1 }}>
              {n} {reachWord}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 1 }}>{reachVerb}</div>
          </div>
        </div>

        {/* Baseline inherited from course */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-muted)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-2)' }}>
              {t('Базовая аудитория курса')}
            </span>
            <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>· {totalBaseline.size} {t('уч.')}</span>
          </div>
          {baselineEmpty ? (
            <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>
              {t('Никто не назначен на курс — задайте аудиторию в настройках курса')}
            </span>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {courseGroups.map(g => (
                <div key={g.id} style={{
                  padding: '4px 11px', borderRadius: 999,
                  background: 'var(--color-bg-3)', fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <Users size={10} /> {g.name}
                </div>
              ))}
              {courseStudents.map(s => (
                <div key={s.id} style={{
                  padding: '4px 11px', borderRadius: 999,
                  background: 'var(--color-bg-3)', fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)',
                }}>
                  {s.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Course-wide access mode — how lessons open for each baseline member */}
        {!baselineEmpty && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-green-text)' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-2)' }}>
                {t('Как открываются уроки')}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-muted)', marginBottom: 10, marginLeft: 16 }}>
              {t('Порядок открытия уроков для каждого участника курса')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {courseGroups.map(g => {
                const gm = groupMode(g.id)
                return (
                  <div key={g.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 10px 7px 8px', borderRadius: 12, background: 'var(--color-green-soft)',
                  }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--color-green-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Users size={14} style={{ color: '#fff' }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-green-text)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</span>
                    <AccessModeSelect
                      value={gm === 'mixed' ? '' : gm}
                      onChange={v => setGroupMode(g.id, v)}
                      placeholder={gm === 'mixed' ? t('Разный') : undefined}
                    />
                  </div>
                )
              })}
              {courseStudents.map(s => (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 10px 7px 8px', borderRadius: 12, background: 'var(--color-bg-3)',
                }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-green-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {s.name.slice(0, 1).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                  <AccessModeSelect value={modeOf(s.id)} onChange={v => setStudentMode(s.id, v)} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[
                { label: 'По датам', desc: 'открывается в свою дату, прошлые — сразу' },
                { label: 'Всё открыто', desc: 'доступны все уроки' },
                { label: 'Настраиваемый', desc: 'открываешь вручную' },
              ].map(m => (
                <div key={m.label} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.4 }}>
                  <span style={{ flexShrink: 0, fontWeight: 700, color: 'var(--color-text-3)', minWidth: 96 }}>{t(m.label)}</span>
                  <span>{t(m.desc)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--color-border-soft)' }} />

        {/* Extra audience for this lesson */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-green-text)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
              {t('Дополнительно для этого урока')}
            </span>
            {!extraEmpty && (
              <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>
                · {extraGroups.length + extraStudentsList.length}
              </span>
            )}
          </div>

          {extraEmpty ? (
            <div style={{
              padding: '16px 14px', borderRadius: 12, border: '1.5px dashed var(--color-border-medium)',
              fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.5, textAlign: 'center',
            }}>
              {t('Добавьте учеников или группы в панели слева — они получат доступ к этому уроку сверх базовой аудитории курса.')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {extraGroups.map(g => (
                <div key={g.id} style={{
                  display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', borderRadius: 12,
                  background: 'var(--color-green-soft)', border: '1px solid var(--color-border-glass)',
                }}>
                  <Users size={14} style={{ color: 'var(--color-green-text)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, flex: 1, color: 'var(--color-green-text)' }}>{g.name}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--color-green-text)', opacity: 0.7 }}>{t('группа')}</span>
                  <button onClick={() => removeExtraGroup(g.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-green-text)', padding: 0, display: 'flex', flexShrink: 0 }}>
                    <X size={13} />
                  </button>
                </div>
              ))}
              {extraStudentsList.map(s => (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', borderRadius: 12,
                  background: 'var(--color-green-soft)', border: '1px solid var(--color-border-glass)',
                }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--color-green-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {s.name.slice(0, 1).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, flex: 1, color: 'var(--color-green-text)' }}>{s.name}</span>
                  <button onClick={() => removeExtraStudent(s.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-green-text)', padding: 0, display: 'flex', flexShrink: 0 }}>
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </OverlayScrollArea>
  )
}

// ─── RIGHT panel: always lesson list ─────────────────────────────────────────

function LessonRow({
  lesson, selected, isOpen, checked, multiMode, displayIndex, onClick, onDelete,
}: {
  lesson: CELesson; selected: boolean; isOpen?: boolean
  checked?: boolean; multiMode?: boolean; displayIndex?: number
  onClick: (e: React.MouseEvent) => void; onDelete: () => void
}) {
  const t = useT()
  return (
    <motion.button
      className="lesson-row"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      onMouseEnter={e => { if (!selected && !checked) e.currentTarget.style.background = 'var(--color-bg-2)' }}
      onMouseLeave={e => { if (!selected && !checked) e.currentTarget.style.background = 'transparent' }}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 10px', borderRadius: 10, border: 'none', cursor: 'pointer',
        background: checked || selected ? 'color-mix(in srgb, var(--color-green-soft) 55%, transparent)' : 'transparent',
        boxShadow: checked ? 'inset 0 0 0 1.5px color-mix(in srgb, var(--color-green-text) 55%, transparent)' : undefined,
        transition: 'background 0.13s, box-shadow 0.13s', fontFamily: 'inherit', textAlign: 'left',
        marginBottom: 2,
      }}
    >
      <div style={{
        width: 24, height: 24, borderRadius: 7, flexShrink: 0,
        background: lesson.kind === 'test'
          ? (selected ? 'color-mix(in srgb, color-mix(in srgb, var(--color-teal-pill-text) 62%, var(--color-green-text)) 72%, #000)' : 'var(--color-green-soft)')
          : (selected ? 'color-mix(in srgb, color-mix(in srgb, var(--color-teal-pill-text) 62%, var(--color-green-text)) 72%, #000)' : 'var(--color-bg-3)'),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700,
        color: lesson.kind === 'test'
          ? (selected ? '#fff' : 'var(--color-green-text)')
          : (selected ? '#fff' : 'var(--color-muted)'),
      }}>
        {lesson.kind === 'test' ? <ClipboardCheck size={13} /> : (displayIndex ?? lesson.number)}
      </div>
      <span style={{
        flex: 1, fontSize: 12, fontWeight: selected ? 700 : 500,
        color: selected ? 'color-mix(in srgb, color-mix(in srgb, var(--color-teal-pill-text) 55%, var(--color-green-text)) 78%, #000)' : 'var(--color-text)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {lesson.title || (lesson.kind === 'test' ? t('Тест без названия') : t('Урок без названия'))}
      </span>
      {/* Open-for-students badge */}
      {isOpen && (
        <span title={t('Открыт ученикам')} style={{
          display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0,
          padding: '2px 7px 2px 5px', borderRadius: 999,
          background: 'var(--color-green-soft)', color: 'var(--color-green-text)',
          fontSize: 10, fontWeight: 700,
        }}>
          <Unlock size={9} strokeWidth={2.5} /> {t('Открыт')}
        </span>
      )}
      {/* Multi-select check → checkmark; selected → trash; otherwise indicator dots */}
      {multiMode ? (
        <div style={{
          width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: checked ? 'var(--color-green-text)' : 'transparent',
          border: checked ? 'none' : '1.5px solid var(--color-border)',
          color: '#fff', transition: 'background 0.13s',
        }}>
          {checked && <Check size={11} strokeWidth={3} />}
        </div>
      ) : selected ? (
        <div
          role="button"
          aria-label={t('Удалить')}
          title={t('Удалить')}
          onClick={e => { e.stopPropagation(); onDelete() }}
          style={{
            width: 22, height: 22, borderRadius: 6, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-red-text)', background: 'rgba(192,48,58,0.12)', cursor: 'pointer',
            transition: 'background 0.13s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(192,48,58,0.2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(192,48,58,0.12)')}
        >
          <Trash2 size={13} />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          {lesson.kind === 'test'
            ? (lesson.testTasks?.length ?? 0) > 0 && <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-green-text)', opacity: 0.7 }} title={t('Вопросы')} />
            : <>
                {lesson.videoUrl && <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-green-text)', opacity: 0.7 }} title={t('Запись')} />}
                {(lesson.hwTasks?.length ?? 0) > 0 && <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-green-text)', opacity: 0.7 }} title={t('ДЗ')} />}
                {((lesson.extraStudentIds?.length ?? 0) + (lesson.extraGroupIds?.length ?? 0)) > 0 && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#F59E0B', opacity: 0.7 }} title={t('Доп. ученики')} />}
              </>}
        </div>
      )}
    </motion.button>
  )
}

function RightPanelLessons({
  course, setCourse, selectedLessonId, onSelectLesson, openLessonShortIds, lessonShortIdById,
}: {
  course: CourseEdData
  setCourse: React.Dispatch<React.SetStateAction<CourseEdData>>
  selectedLessonId: string | null
  onSelectLesson: (id: string) => void
  openLessonShortIds: Set<string>
  lessonShortIdById: Record<string, string>
}) {
  const t = useT()
  const [newTitle, setNewTitle] = useState('')
  const [addingModule, setAddingModule] = useState(false)
  const [newModuleLabel, setNewModuleLabel] = useState('')
  const [dragging, setDragging] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<{ moduleId: string; index: number } | null>(null)
  // Multi-select (Shift/Ctrl) + active-module target for new lessons
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [anchorId, setAnchorId] = useState<string | null>(null)
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null)
  const [moveMenuOpen, setMoveMenuOpen] = useState(false)
  // Double-click a module header to rename it inline.
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null)
  const [editingModuleLabel, setEditingModuleLabel] = useState('')
  const { ref: scrollRef, fade, thumb, onScroll: onScrollFade } = useOverlayScroll()

  // Append a new lesson into the active module (falls back to the last one).
  function appendLesson(lesson: CELesson) {
    setCourse(c => {
      const updatedLessons = [...c.lessons, lesson]
      if (c.modules.length === 0) return { ...c, lessons: updatedLessons }
      const targetId = activeModuleId && c.modules.some(m => m.id === activeModuleId)
        ? activeModuleId
        : c.modules[c.modules.length - 1].id
      const mods = c.modules.map(m =>
        m.id === targetId ? { ...m, lessonIds: [...m.lessonIds, lesson.id] } : m
      )
      return { ...c, lessons: updatedLessons, modules: mods }
    })
  }

  function addLesson() {
    const title = newTitle.trim()
    if (!title) return
    const lessonId = uid()
    appendLesson({ id: lessonId, title, number: course.lessons.length + 1 })
    setNewTitle('')
    onSelectLesson(lessonId)
  }

  function addTest() {
    const lessonId = uid()
    appendLesson({ id: lessonId, title: t('Финальный тест'), number: course.lessons.length + 1, kind: 'test', testTasks: [] })
    onSelectLesson(lessonId)
  }

  function addModule() {
    const label = newModuleLabel.trim()
    if (!label) return
    const mod: CEModule = { id: uid(), label, expanded: true, lessonIds: [] }
    setCourse(c => ({ ...c, modules: [...c.modules, mod] }))
    setNewModuleLabel('')
    setAddingModule(false)
  }

  function toggleModule(id: string) {
    setCourse(c => ({
      ...c,
      modules: c.modules.map(m => m.id === id ? { ...m, expanded: !m.expanded } : m),
    }))
  }

  function renameModule(id: string, label: string) {
    const trimmed = label.trim()
    if (!trimmed) return
    setCourse(c => ({
      ...c,
      modules: c.modules.map(m => m.id === id ? { ...m, label: trimmed } : m),
    }))
  }

  function deleteLesson(lessonId: string) {
    setCourse(c => ({
      ...c,
      lessons: c.lessons.filter(l => l.id !== lessonId),
      modules: c.modules.map(m => ({ ...m, lessonIds: m.lessonIds.filter(id => id !== lessonId) })),
    }))
    if (selectedLessonId === lessonId) onSelectLesson('')
  }

  function moveLessonToModule(lessonId: string, targetModuleId: string, targetIndex: number) {
    setCourse(c => {
      const srcMod = c.modules.find(m => m.lessonIds.includes(lessonId))
      let insertIndex = targetIndex
      if (srcMod?.id === targetModuleId) {
        const srcIdx = srcMod.lessonIds.indexOf(lessonId)
        if (targetIndex > srcIdx) insertIndex--
      }
      const mods = c.modules.map(m => ({ ...m, lessonIds: m.lessonIds.filter(id => id !== lessonId) }))
      return {
        ...c,
        modules: mods.map(m => {
          if (m.id !== targetModuleId) return m
          const ids = [...m.lessonIds]
          ids.splice(Math.max(0, insertIndex), 0, lessonId)
          return { ...m, lessonIds: ids }
        }),
      }
    })
  }

  function clearDrag() { setDragging(null); setDropTarget(null) }

  const DropLine = () => (
    <div style={{ height: 2, background: 'var(--color-green-text)', borderRadius: 2, margin: '2px 0', pointerEvents: 'none' }} />
  )

  const groupedIds = new Set(course.modules.flatMap(m => m.lessonIds))
  const ungrouped = course.lessons.filter(l => !groupedIds.has(l.id))

  // Lesson ids in visual (top-to-bottom) order — drives Shift range-select.
  const orderedIds = [
    ...ungrouped.map(l => l.id),
    ...course.modules.flatMap(m => m.lessonIds.filter(id => course.lessons.some(l => l.id === id))),
  ]
  // 1-based display position per lesson (follows visual order, not creation order).
  const displayIndexById: Record<string, number> = {}
  orderedIds.forEach((id, i) => { displayIndexById[id] = i + 1 })

  const multiMode = selectedIds.size > 0

  function clearSelection() { setSelectedIds(new Set()); setAnchorId(null); setMoveMenuOpen(false) }

  // Click on a lesson row. Plain → open it. Ctrl/Cmd → toggle in selection.
  // Shift → select the contiguous range from the anchor.
  function handleRowClick(id: string, e: React.MouseEvent) {
    if (e.shiftKey && anchorId) {
      const a = orderedIds.indexOf(anchorId)
      const b = orderedIds.indexOf(id)
      if (a !== -1 && b !== -1) {
        const [lo, hi] = a < b ? [a, b] : [b, a]
        setSelectedIds(new Set(orderedIds.slice(lo, hi + 1)))
      }
      return
    }
    if (e.metaKey || e.ctrlKey) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
      setAnchorId(id)
      return
    }
    clearSelection()
    setAnchorId(id)
    onSelectLesson(id)
  }

  // Move every selected lesson into a module (appended, keeping their order).
  function bulkMoveToModule(targetModuleId: string) {
    const ids = orderedIds.filter(id => selectedIds.has(id))
    setCourse(c => {
      const mods = c.modules.map(m => ({ ...m, lessonIds: m.lessonIds.filter(id => !selectedIds.has(id)) }))
      return {
        ...c,
        modules: mods.map(m => m.id === targetModuleId ? { ...m, lessonIds: [...m.lessonIds, ...ids] } : m),
      }
    })
    clearSelection()
  }

  function bulkDelete() {
    setCourse(c => ({
      ...c,
      lessons: c.lessons.filter(l => !selectedIds.has(l.id)),
      modules: c.modules.map(m => ({ ...m, lessonIds: m.lessonIds.filter(id => !selectedIds.has(id)) })),
    }))
    if (selectedLessonId && selectedIds.has(selectedLessonId)) onSelectLesson('')
    clearSelection()
  }

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
      onDragEnd={clearDrag}
    >
      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--color-border-soft)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{t('Уроки')}</span>
        <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>{course.lessons.length} {t('шт.')}</span>
      </div>

      {/* Bulk-action bar — visible once one or more lessons are multi-selected */}
      <AnimatePresence>
        {multiMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.16 }}
            style={{ flexShrink: 0, overflow: 'visible', borderBottom: '1px solid var(--color-border-soft)', position: 'relative', zIndex: 5 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'var(--color-green-soft)' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-green-text)', flex: 1 }}>
                {t('Выбрано:')} {selectedIds.size}
              </span>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setMoveMenuOpen(o => !o)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4, padding: '5px 9px', borderRadius: 8,
                    border: 'none', background: 'var(--color-green-text)', color: '#fff', cursor: 'pointer',
                    fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
                  }}
                >
                  <FolderInput size={12} /> {t('В модуль')}
                </button>
                <AnimatePresence>
                  {moveMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.13 }}
                      style={{
                        position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 20,
                        minWidth: 160, maxHeight: 240, overflowY: 'auto', padding: 4, paddingRight: 10,
                        borderRadius: 10, background: 'var(--color-bg-card, var(--color-bg))',
                        border: '1px solid var(--color-border)', boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
                      }}
                    >
                      {course.modules.length === 0 ? (
                        <div style={{ fontSize: 11, color: 'var(--color-muted)', padding: '8px 10px' }}>{t('Нет модулей')}</div>
                      ) : course.modules.map(m => (
                        <button
                          key={m.id}
                          onClick={() => bulkMoveToModule(m.id)}
                          style={{
                            width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: 7,
                            border: 'none', background: 'transparent', cursor: 'pointer',
                            fontSize: 12, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'inherit',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-2)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          {m.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button
                onClick={bulkDelete}
                title={t('Удалить выбранные')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '5px 9px', borderRadius: 8,
                  border: 'none', background: 'rgba(192,48,58,0.14)', color: 'var(--color-red-text)',
                  cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
                }}
              >
                <Trash2 size={12} /> {t('Удалить')}
              </button>
              <button
                onClick={clearSelection}
                title={t('Снять выделение')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26,
                  borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--color-text-3)', cursor: 'pointer',
                }}
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        <ScrollOverlays fade={fade} thumb={thumb} />
        {/* Click on the empty area (not a row/module) clears every selection. */}
        <div
          ref={scrollRef}
          onScroll={onScrollFade}
          className="no-scrollbar"
          style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}
          onClick={e => {
            if (e.target !== e.currentTarget) return
            clearSelection()
            setActiveModuleId(null)
            if (selectedLessonId) onSelectLesson('')
          }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault()
            if (dragging && dropTarget) moveLessonToModule(dragging, dropTarget.moduleId, dropTarget.index)
            clearDrag()
          }}
        >
        {ungrouped.map(l => (
          <div
            key={l.id}
            draggable
            onDragStart={() => setDragging(l.id)}
            style={{ cursor: 'grab' }}
          >
            <LessonRow lesson={l} selected={l.id === selectedLessonId} isOpen={openLessonShortIds.has(lessonShortIdById[l.id])} checked={selectedIds.has(l.id)} multiMode={multiMode} displayIndex={displayIndexById[l.id]} onClick={e => handleRowClick(l.id, e)} onDelete={() => deleteLesson(l.id)} />
          </div>
        ))}

        {course.modules.map(mod => {
          const modLessons = mod.lessonIds
            .map(id => course.lessons.find(l => l.id === id))
            .filter(Boolean) as CELesson[]
          const isTarget = dropTarget?.moduleId === mod.id
          const isActive = activeModuleId === mod.id
          return (
            <div key={mod.id} style={{ marginBottom: 6 }}>
              <button
                onClick={() => {
                  setActiveModuleId(prev => prev === mod.id ? null : mod.id)
                  if (!mod.expanded) toggleModule(mod.id)
                }}
                title={t('Новые уроки будут добавляться в этот модуль')}
                onDragOver={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  // Don't auto-expand collapsed modules — just mark this one as the
                  // drop target (lesson lands at the end) and let the highlight show it.
                  setDropTarget({ moduleId: mod.id, index: modLessons.length })
                }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 10px', borderRadius: 10, border: 'none',
                  background: isActive || (dragging && isTarget) ? 'var(--color-green-soft)' : 'var(--color-bg-2)',
                  boxShadow: (dragging && isTarget) || isActive ? 'inset 0 0 0 1.5px var(--color-green-text)' : undefined,
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.13s, box-shadow 0.13s',
                }}
              >
                <span
                  role="button"
                  aria-label={mod.expanded ? t('Свернуть') : t('Развернуть')}
                  onClick={e => { e.stopPropagation(); toggleModule(mod.id) }}
                  style={{ display: 'flex', flexShrink: 0, cursor: 'pointer', padding: 1, margin: -1 }}
                >
                  <ChevronDown
                    size={13}
                    style={{
                      color: isActive ? 'var(--color-green-text)' : 'var(--color-muted)',
                      transform: mod.expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                      transition: 'transform 0.18s ease',
                    }}
                  />
                </span>
                {editingModuleId === mod.id ? (
                  <input
                    autoFocus
                    value={editingModuleLabel}
                    onChange={e => setEditingModuleLabel(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    onBlur={() => { renameModule(mod.id, editingModuleLabel); setEditingModuleId(null) }}
                    onKeyDown={e => {
                      e.stopPropagation()
                      if (e.key === 'Enter') { renameModule(mod.id, editingModuleLabel); setEditingModuleId(null) }
                      else if (e.key === 'Escape') setEditingModuleId(null)
                    }}
                    style={{
                      flex: 1, minWidth: 0, fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                      color: 'var(--color-text)', background: 'var(--color-bg)',
                      border: '1.5px solid var(--color-green-text)', borderRadius: 6, padding: '2px 6px', outline: 'none',
                    }}
                  />
                ) : (
                  <span
                    onDoubleClick={e => { e.stopPropagation(); setEditingModuleLabel(mod.label); setEditingModuleId(mod.id) }}
                    title={t('Двойной клик — переименовать')}
                    style={{ flex: 1, fontSize: 12, fontWeight: 700, color: isActive ? 'var(--color-green-text)' : 'var(--color-text)', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {mod.label}
                  </span>
                )}
                {dragging && isTarget && !mod.expanded && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-green-text)', background: 'var(--color-bg)', borderRadius: 999, padding: '2px 6px', flexShrink: 0 }}>
                    {t('в конец')}
                  </span>
                )}
                <span style={{ fontSize: 10, color: 'var(--color-muted)', flexShrink: 0 }}>{modLessons.length}</span>
              </button>
              <AnimatePresence>
                {mod.expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    style={{ overflow: 'hidden', paddingLeft: 10, paddingTop: 3, paddingBottom: 3 }}
                    onDragOver={e => {
                      e.preventDefault()
                      if (dropTarget?.moduleId !== mod.id) {
                        setDropTarget({ moduleId: mod.id, index: modLessons.length })
                      }
                    }}
                  >
                    {modLessons.length === 0 ? (
                      isTarget
                        ? <DropLine />
                        : <div style={{ fontSize: 11, color: 'var(--color-muted)', padding: '6px 10px', fontStyle: 'italic' }}>{t('Нет уроков')}</div>
                    ) : (
                      <>
                        {modLessons.map((l, i) => (
                          <div key={l.id}>
                            {isTarget && dropTarget!.index === i && <DropLine />}
                            <div
                              draggable
                              onDragStart={e => { e.stopPropagation(); setDragging(l.id) }}
                              onDragOver={e => {
                                e.preventDefault()
                                e.stopPropagation()
                                const rect = e.currentTarget.getBoundingClientRect()
                                const index = e.clientY < rect.top + rect.height / 2 ? i : i + 1
                                setDropTarget({ moduleId: mod.id, index })
                              }}
                              style={{ cursor: 'grab' }}
                            >
                              <LessonRow lesson={l} selected={l.id === selectedLessonId} isOpen={openLessonShortIds.has(lessonShortIdById[l.id])} checked={selectedIds.has(l.id)} multiMode={multiMode} displayIndex={displayIndexById[l.id]} onClick={e => handleRowClick(l.id, e)} onDelete={() => deleteLesson(l.id)} />
                            </div>
                          </div>
                        ))}
                        {isTarget && dropTarget!.index === modLessons.length && <DropLine />}
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}

        {course.lessons.length === 0 && (
          <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--color-muted)', fontSize: 12 }}>
            {t('Уроки ещё не добавлены')}
          </div>
        )}
        </div>
      </div>

      <div style={{ padding: '10px 12px', borderTop: '1px solid var(--color-border-soft)', flexShrink: 0 }}>
        {addingModule ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input
              value={newModuleLabel}
              onChange={e => setNewModuleLabel(e.target.value)}
              placeholder={t('Название модуля')}
              style={{ ...inputSt, fontSize: 12, padding: '7px 10px' }}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') addModule(); if (e.key === 'Escape') setAddingModule(false) }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setAddingModule(false)}
                style={{ flex: 1, padding: '6px 0', borderRadius: 9, border: '1.5px solid var(--color-border)', background: 'transparent', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--color-text-2)', fontFamily: 'inherit' }}>
                {t('Отмена')}
              </button>
              <button onClick={addModule}
                style={{ flex: 1, padding: '6px 0', borderRadius: 9, border: 'none', background: 'var(--color-green-soft)', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: 'var(--color-green-text)', fontFamily: 'inherit' }}>
                {t('Создать')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder={t('Название урока…')}
                style={{ ...inputSt, fontSize: 12, padding: '7px 10px' }}
                onKeyDown={e => { if (e.key === 'Enter') addLesson() }}
              />
              <button onClick={addLesson} style={{
                width: 32, height: 32, borderRadius: 9, border: 'none',
                background: 'var(--color-green-soft)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-green-text)', flexShrink: 0,
              }}>
                <Plus size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setAddingModule(true)} style={{
                flex: 1, padding: '6px 0', borderRadius: 9,
                border: '1.5px dashed var(--color-border)', background: 'transparent',
                cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: 'inherit',
              }}>
                <Layers size={11} /> {t('Модуль')}
              </button>
              <button onClick={addTest} style={{
                flex: 1, padding: '6px 0', borderRadius: 9,
                border: '1.5px dashed var(--color-green-text)', background: 'transparent',
                cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--color-green-text)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: 'inherit',
              }}>
                <ClipboardCheck size={11} /> {t('Тест')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Lesson mode tabs ─────────────────────────────────────────────────────────

const LESSON_MODES: { id: LessonMode; label: string }[] = [
  { id: 'lesson',    label: 'Урок' },
  { id: 'recording', label: 'Запись' },
  { id: 'homework',  label: 'Домашки' },
  { id: 'students',  label: 'Ученики' },
]

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TeacherCourseEditorPage() {
  const t = useT()
  const { setActivePage, editingCourseJson, setCourseEdited } = useTeacher()
  const { groups } = useGroups()
  const allStudents = useAllStudents()

  const [course, setCourse] = useState<CourseEdData>(() => {
    const base: CourseEdData = editingCourseJson
      ? JSON.parse(editingCourseJson) as CourseEdData
      : {
          id: uid(), title: '', subject: 'Химия', level: 'ЕГЭ', status: 'draft',
          color: 'var(--color-purple)', bg: 'var(--color-green-soft)',
          groupIds: [], studentIds: [],
          modules: [{ id: uid(), label: 'Модуль 1', expanded: true, lessonIds: [] }],
          lessons: [],
        }
    // Unsaved edits win over the snapshot the editor was opened with: the
    // constructor (goToCourseEditor) fetches the course from Supabase before
    // opening the editor, and that fetched data must NOT clobber a draft the
    // teacher never got to save. The draft is cleared on successful save, so
    // when no draft exists we fall through to the fresh DB snapshot.
    const draft = readDraft<CourseEdData>(`coursed.${base.dbCourseId ?? base.id}.course`)
    return draft ?? base
  })

  // ── Draft persistence ───────────────────────────────────────────────────────
  // Mirror every edit of the main course object into sessionStorage so no input
  // is lost on a reload/remount. Cleared ONLY after a successful save (see
  // handleSave/handlePublish/handleUnpublish/autosave) — never on unmount.
  // Oversized writes (base64 images can blow the ~5MB quota) are silently
  // skipped inside writeDraft; the ce-session mirror below still covers reloads.
  const draftNs = `coursed.${course.dbCourseId ?? course.id}.`
  const draftKey = `${draftNs}course`
  // Monotonic edit counter: a save only clears the draft if no NEWER edit
  // happened while the (async) sync was in flight — otherwise clearing would
  // throw away input entered during the network round-trip.
  const draftSeq = useRef(0)
  useEffect(() => {
    draftSeq.current++
    // Skip the initial render: merely opening a course must not create a draft
    // that would later shadow fresh DB data.
    if (draftSeq.current === 1) return
    writeDraft(draftKey, course)
  }, [course, draftKey])

  function clearCourseDraftAfterSync(seqAtSave: number, synced: boolean) {
    if (synced && draftSeq.current === seqAtSave) clearDrafts(draftNs)
  }

  // Remember which lesson + tab the teacher was on, so a page refresh lands them
  // back where they were (per-tab, keyed by course).
  const posKey = `ce-pos:${course.dbCourseId ?? course.id}`
  const savedPos = (() => {
    try {
      const raw = sessionStorage.getItem(posKey)
      return raw ? (JSON.parse(raw) as { lessonId?: string; mode?: LessonMode }) : null
    } catch { return null }
  })()

  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(
    savedPos?.lessonId && course.lessons.some(l => l.id === savedPos.lessonId) ? savedPos.lessonId : null
  )
  const [lessonMode, setLessonMode] = useState<LessonMode>(savedPos?.mode ?? 'lesson')

  useEffect(() => {
    try {
      if (selectedLessonId) {
        sessionStorage.setItem(posKey, JSON.stringify({ lessonId: selectedLessonId, mode: lessonMode }))
      } else {
        sessionStorage.removeItem(posKey)
      }
    } catch { /* sessionStorage unavailable — non-fatal */ }
  }, [selectedLessonId, lessonMode, posKey])

  // Keep the editor session JSON in sync with live edits, so a refresh restores
  // the latest course state (not just the snapshot from when the editor opened).
  useEffect(() => {
    try { sessionStorage.setItem('ce-session', JSON.stringify(course)) } catch { /* non-fatal */ }
  }, [course])
  // Homework target toggle (ДЗ урока vs ДЗ записи) — lifted here so the left
  // meta rail and the center task list stay in sync.
  const [hwTab, setHwTab] = useState<'lesson' | 'rec'>('lesson')
  const [openingLesson, setOpeningLesson] = useState(false)
  // Lessons open to students, keyed by persisted short_id (not by `number` —
  // CELesson.number is 1-based append order, while the persisted lesson short_id
  // follows the 0-based module order, so number-matching mis-targets lessons).
  const [openLessonShortIds, setOpenLessonShortIds] = useState<Set<string>>(new Set())

  // Map each editor lesson → the short_id syncAccessToSupabase persists for it.
  // Uses lesson.number (1-based creation order) so short_id stays stable when
  // lessons are reordered — otherwise open-badge would follow position, not lesson.
  const lessonShortIdById = useMemo(
    () => lessonShortIdMap(course.dbCourseId ?? course.id, course.lessons),
    [course])

  // Load which lessons are already open for students (any non-locked progress).
  useEffect(() => {
    if (!course.dbCourseId) return
    let cancelled = false
    ;(async () => {
      const { data: courseRow } = await supabase
        .from('courses')
        .select('lessons(short_id)')
        .eq('short_id', course.dbCourseId)
        .single()
      const lessons = (courseRow?.lessons ?? []) as Array<{ short_id: string }>
      if (lessons.length === 0) return
      const { data: progress } = await supabase
        .from('lesson_progress')
        .select('lesson_ref, status')
        .in('lesson_ref', lessons.map(l => l.short_id))
        .neq('status', 'locked')
      if (cancelled) return
      const open = new Set<string>()
      for (const row of (progress ?? []) as Array<{ lesson_ref: string; status: string }>) {
        open.add(row.lesson_ref)
      }
      setOpenLessonShortIds(open)
    })()
    return () => { cancelled = true }
  }, [course.dbCourseId])

  // Per-student access mode (course_enrollments), keyed by student_id.
  // 'full' → all lessons open · 'custom' → teacher unlocks by hand ·
  // 'by_date' → lessons open as their scheduled date passes. Absent → 'custom'.
  const [accessModes, setAccessModes] = useState<Record<string, 'full' | 'custom' | 'by_date'>>({})
  useEffect(() => {
    if (!course.dbCourseId) return
    let cancelled = false
    ;(async () => {
      const { data: courseRow } = await supabase
        .from('courses').select('id').eq('short_id', course.dbCourseId).single()
      if (!courseRow?.id) return
      const { data: enr } = await supabase
        .from('course_enrollments')
        .select('student_id, access_mode')
        .eq('course_id', courseRow.id)
      if (cancelled) return
      const map: Record<string, 'full' | 'custom' | 'by_date'> = {}
      for (const row of (enr ?? []) as Array<{ student_id: string; access_mode: 'full' | 'custom' | 'by_date' }>) {
        map[row.student_id] = row.access_mode
      }
      setAccessModes(map)
    })()
    return () => { cancelled = true }
  }, [course.dbCourseId])

  const [savedFlash, setSavedFlash] = useState(false)
  const [saving, setSaving] = useState(false)
  const [publishErr, setPublishErr] = useState<string | null>(null)

  // ── Autosave ──────────────────────────────────────────────────────────────
  // Persist edits ~900ms after the teacher stops changing things, so they never
  // have to press "Сохранить" after every action. Keeps whatever status the
  // course already has (a draft stays a draft, published stays published — we
  // never auto-publish). Guarded to already-saved courses so a brand-new draft
  // isn't written to the DB on the first keystroke, and the first render (the
  // initial load from JSON) is skipped.
  const autosaveArmed = useRef(false)
  useEffect(() => {
    if (!course.dbCourseId) return
    if (!autosaveArmed.current) { autosaveArmed.current = true; return }
    const t = setTimeout(() => {
      setCourseEdited(JSON.stringify(course))
      const seq = draftSeq.current
      syncAccessToSupabase(course).then(ok => clearCourseDraftAfterSync(seq, ok))
      flash()
    }, 900)
    return () => clearTimeout(t)
  }, [course])

  async function openLessonForStudents(lessonId: string) {
    if (!course.dbCourseId) return
    const lessonShortId = lessonShortIdById[lessonId]
    if (!lessonShortId) return

    // Gate per-lesson publish the same way as the course: needs an audience and
    // a date+time. Otherwise only saving to draft is allowed.
    const lesson = course.lessons.find(l => l.id === lessonId)
    const hasAudience = course.groupIds.length > 0 || course.studentIds.length > 0
    if (!hasAudience) {
      setPublishErr(t('Выберите, кому виден курс (группа или ученик) — иначе урок нельзя открыть.'))
      return
    }
    if (lesson && !lessonScheduled(lesson)) {
      setPublishErr(`${t('Укажите дату и время для урока «')}${lesson.title || `${t('Урок')} ${lesson.number}`}${t('» — иначе его нельзя открыть.')}`)
      return
    }
    setPublishErr(null)
    setOpeningLesson(true)

    // Assigned students who should get this lesson opened (group members + direct).
    const targetStudentIds = [...new Set([
      ...allStudents.filter(s => course.groupIds.includes(s.groupId)).map(s => s.id),
      ...course.studentIds,
    ])]

    // A diverged lesson is two track nodes: the lesson (short_id) and the
    // recording (`${short_id}~rec`). Open BOTH so each is independently unlockable.
    const el = course.lessons.find(l => l.id === lessonId)
    const diverged = !!el?.lessonSchedManual && !!el?.recDate
      && (el.recDate !== el.scheduledDate || el.recTime !== el.scheduledTime)
    const refs = diverged ? [lessonShortId, `${lessonShortId}~rec`] : [lessonShortId]

    // Unlock + seed one node ref for all target students (never clobbering
    // existing progress like 'done'). Course assignment alone creates no
    // lesson_progress rows, so we seed 'current' for anyone without a row yet.
    async function openRef(ref: string) {
      await supabase
        .from('lesson_progress')
        .update({ status: 'current' })
        .eq('lesson_ref', ref)
        .eq('status', 'locked')
      if (targetStudentIds.length === 0) return
      const { data: existing } = await supabase
        .from('lesson_progress')
        .select('student_id')
        .eq('lesson_ref', ref)
        .in('student_id', targetStudentIds)
      const have = new Set((existing ?? []).map((r: { student_id: string }) => r.student_id))
      const newRows = targetStudentIds
        .filter(id => !have.has(id))
        .map(id => ({ student_id: id, lesson_ref: ref, subject: course.dbCourseId, status: 'current' }))
      if (newRows.length > 0) {
        const { error } = await supabase.from('lesson_progress').insert(newRows)
        if (error) console.error('lesson_progress seed failed:', error)
      }
    }

    try {
      for (const ref of refs) await openRef(ref)
      setOpenLessonShortIds(prev => new Set(prev).add(lessonShortId))
    } finally {
      setOpeningLesson(false)
    }
  }

  const selectedLesson = selectedLessonId
    ? course.lessons.find(l => l.id === selectedLessonId) ?? null
    : null

  function updateLesson(updated: CELesson) {
    setCourse(c => ({ ...c, lessons: c.lessons.map(l => l.id === updated.id ? updated : l) }))
  }

  function handleSelectLesson(id: string) {
    setSelectedLessonId(id)
    setLessonMode('lesson')
  }

  function handleBack() {
    setCourseEdited(JSON.stringify(course))
    setActivePage('constructor')
  }

  function flash() {
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2000)
  }

  // Returns true when the course row (title/description/status/access) made it
  // to the DB — the signal that the sessionStorage draft can be dropped.
  async function syncAccessToSupabase(c: CourseEdData): Promise<boolean> {
    const shortId = c.dbCourseId ?? c.id

    // created_by is REQUIRED: courses RLS `write_own_courses` gates every write
    // with `with_check (created_by = auth.uid())`. A new-course INSERT that omits
    // it lands created_by=NULL → RLS rejects the row → upsert returns null → the
    // course silently never persists (shows "Опубликован" locally, absent in DB).
    const ownerId = await getOwnerId()

    const { data: courseUpsert, error: courseErr } = await supabase
      .from('courses')
      .upsert(
        {
          short_id: shortId,
          title: c.title, subject: c.subject, level: c.level,
          description: c.description ?? '',
          status: c.status, color: c.color, bg: c.bg,
          group_ids: c.groupIds, student_ids: c.studentIds,
          created_by: ownerId,
        },
        { onConflict: 'short_id' }
      )
      .select('id')
      .single()

    if (courseErr) console.error('[syncAccessToSupabase] course upsert failed', courseErr)
    const courseDbId = courseUpsert?.id
    if (!courseDbId) return false

    // ── Persist modules + lessons so the student track renders ──────────────
    // The student reader (fetchCourseStructure) reads lessons through
    // course_modules → lessons, so every lesson must live under a module.
    // Build the ordered lesson list: module order, then each module's lessonIds,
    // with any ungrouped lesson appended to the first module.
    const editorModules = c.modules.length > 0
      ? c.modules
      : [{ id: 'm0', label: 'Модуль 1', expanded: true, lessonIds: c.lessons.map(l => l.id) }]
    const firstModuleLocalId = editorModules[0].id

    // 1. Reuse existing modules by position; create missing, drop extras.
    const { data: existingMods } = await supabase
      .from('course_modules')
      .select('id, position')
      .eq('course_id', courseDbId)
      .order('position')
    const existing = (existingMods ?? []) as Array<{ id: string; position: number }>
    const moduleDbIdByLocalId: Record<string, string> = {}
    for (let i = 0; i < editorModules.length; i++) {
      const m = editorModules[i]
      let dbId = existing[i]?.id
      if (dbId) {
        await supabase.from('course_modules').update({ label: m.label, position: i }).eq('id', dbId)
      } else {
        const { data: ins } = await supabase
          .from('course_modules')
          .insert({ course_id: courseDbId, label: m.label, position: i })
          .select('id')
          .single()
        dbId = ins?.id
      }
      if (dbId) moduleDbIdByLocalId[m.id] = dbId
    }
    for (let i = editorModules.length; i < existing.length; i++) {
      await supabase.from('course_modules').delete().eq('id', existing[i].id)
    }

    // 2. Order lessons (module order → lessonIds → ungrouped to first module).
    const ordered: Array<{ lesson: CELesson; moduleLocalId: string }> = []
    const seen = new Set<string>()
    for (const m of editorModules) {
      for (const lid of m.lessonIds) {
        const lesson = c.lessons.find(l => l.id === lid)
        if (lesson && !seen.has(lid)) { ordered.push({ lesson, moduleLocalId: m.id }); seen.add(lid) }
      }
    }
    for (const lesson of c.lessons) {
      if (!seen.has(lesson.id)) { ordered.push({ lesson, moduleLocalId: firstModuleLocalId }); seen.add(lesson.id) }
    }

    // 3. Upsert lessons with a stable per-lesson short_id (see lessonShortIdMap),
    //    preserving lesson_progress across reorders (keyed by short_id, not FK).
    const shortIdByLessonId = lessonShortIdMap(shortId, c.lessons)
    const lessonRows = ordered.map(({ lesson, moduleLocalId }, i) => ({
      short_id: shortIdByLessonId[lesson.id] ?? `${shortId}-${i}`,
      course_id: courseDbId,
      module_id: moduleDbIdByLocalId[moduleLocalId] ?? null,
      title: lesson.title,
      position: i,
      lesson_number: i,
      youtube_url: lesson.videoUrl ?? null,
      description: lesson.description ?? null,
      kind: lesson.kind ?? 'lesson',
      test_tasks: lesson.testTasks ?? [],
      scheduled_date: lesson.scheduledDate ?? null,
      scheduled_time: lesson.scheduledTime ?? null,
      scheduled_duration: lesson.scheduledDuration ?? null,
      rec_date: lesson.recDate ?? null,
      rec_time: lesson.recTime ?? null,
      rec_duration: lesson.recDuration ?? null,
      lesson_sched_manual: lesson.lessonSchedManual ?? false,
      // Homework («Домашки» tab) lives only in editor state — persist it as a
      // JSONB blob so it survives a re-entry. Hard tasks live inline in the
      // task arrays via the isHard flag.
      homework: {
        hwTitle: lesson.hwTitle ?? null,
        hwTarget: lesson.hwTarget ?? null,
        hwDate: lesson.hwDate ?? null,
        hwDateManual: lesson.hwDateManual ?? false,
        hwTasks: lesson.hwTasks ?? [],
        recHwTitle: lesson.recHwTitle ?? null,
        recHwTarget: lesson.recHwTarget ?? null,
        recHwDate: lesson.recHwDate ?? null,
        recHwDateManual: lesson.recHwDateManual ?? false,
        recHwTasks: lesson.recHwTasks ?? [],
      },
    }))
    if (lessonRows.length > 0) {
      await supabase.from('lessons').upsert(lessonRows, { onConflict: 'short_id' })
      // Adopt the persisted short_id as each lesson's editor id, so a freshly
      // created lesson (uuid id) doesn't get a NEW suffix allocated on the next
      // autosave — which would insert a duplicate lesson. Idempotent once ids
      // already match their short_id.
      const idChanged = c.lessons.some(l => shortIdByLessonId[l.id] && shortIdByLessonId[l.id] !== l.id)
      if (idChanged) {
        setCourse(prev => ({
          ...prev,
          lessons: prev.lessons.map(l => shortIdByLessonId[l.id] ? { ...l, id: shortIdByLessonId[l.id] } : l),
          modules: prev.modules.map(m => ({
            ...m,
            lessonIds: m.lessonIds.map(id => shortIdByLessonId[id] ?? id),
          })),
        }))
      }
    }
    // 4. Drop lessons removed in the editor (schedule_lessons.lesson_id → SET NULL).
    const keepShortIds = lessonRows.map(r => r.short_id)
    let delQuery = supabase.from('lessons').delete().eq('course_id', courseDbId)
    if (keepShortIds.length > 0) delQuery = delQuery.not('short_id', 'in', `(${keepShortIds.join(',')})`)
    await delQuery

    // ── Sync per-student access mode (course_enrollments) ───────────────────
    // Audience = directly-assigned students + members of assigned groups.
    // Each gets an enrollment row carrying its access mode (default 'custom').
    const groupMemberIds = allStudents
      .filter(s => s.groupId && c.groupIds.includes(s.groupId))
      .map(s => s.id)
    const audienceIds = [...new Set([...c.studentIds, ...groupMemberIds])]
    const effMode = (id: string): 'full' | 'custom' | 'by_date' => accessModes[id] ?? 'by_date'

    // Drop enrollments for students no longer in the audience, then upsert the rest.
    {
      let del = supabase.from('course_enrollments').delete().eq('course_id', courseDbId)
      if (audienceIds.length > 0) del = del.not('student_id', 'in', `(${audienceIds.join(',')})`)
      await del
      if (audienceIds.length > 0) {
        const enrRows = audienceIds.map(id => ({ course_id: courseDbId, student_id: id, access_mode: effMode(id) }))
        const { error } = await supabase.from('course_enrollments').upsert(enrRows, { onConflict: 'course_id,student_id' })
        if (error) console.error('course_enrollments upsert failed:', error)
      }
    }

    // 'full' students get every lesson opened now (seed 'current', never clobber
    // 'done'). 'by_date' is computed at read time; 'custom' stays manual — so
    // neither seeds here.
    {
      const fullIds = audienceIds.filter(id => effMode(id) === 'full')
      const refs = keepShortIds
      if (fullIds.length > 0 && refs.length > 0) {
        await supabase
          .from('lesson_progress')
          .update({ status: 'current' })
          .in('lesson_ref', refs)
          .in('student_id', fullIds)
          .eq('status', 'locked')
        const { data: existing } = await supabase
          .from('lesson_progress')
          .select('student_id, lesson_ref')
          .in('lesson_ref', refs)
          .in('student_id', fullIds)
        const have = new Set((existing ?? []).map((r: { student_id: string; lesson_ref: string }) => `${r.student_id}|${r.lesson_ref}`))
        const newRows: object[] = []
        for (const id of fullIds) for (const ref of refs) {
          if (!have.has(`${id}|${ref}`)) newRows.push({ student_id: id, lesson_ref: ref, subject: shortId, status: 'current' })
        }
        if (newRows.length > 0) {
          const { error } = await supabase.from('lesson_progress').insert(newRows)
          if (error) console.error('full-access seed failed:', error)
        }
      }
    }

    // Map each editor lesson to its persisted global index for scheduling below.
    const lessonIndexById: Record<string, number> = {}
    ordered.forEach(({ lesson }, i) => { lessonIndexById[lesson.id] = i })

    // Sync scheduled lessons to calendar. A lesson contributes a calendar event
    // for its lesson schedule and/or its recording schedule.
    const scheduledLessons = c.lessons.filter(l =>
      (l.scheduledDate && l.scheduledTime) || (l.recDate && l.recTime))
    if (c.groupIds.length === 0 && c.studentIds.length === 0) return true

    // Fetch course row + lessons from DB to get UUIDs
    const { data: courseRow } = await supabase
      .from('courses')
      .select('id, lessons(id, lesson_number, title)')
      .eq('short_id', shortId)
      .single()
    if (!courseRow) return true

    const dbLessons = (courseRow.lessons ?? []) as Array<{ id: string; lesson_number: number; title: string }>

    // Helper: DD.MM.YYYY → YYYY-MM-DD
    function dotToIso(d: string) {
      const [dd, mm, yyyy] = d.split('.')
      return `${yyyy}-${mm}-${dd}`
    }
    // Helper: add minutes to HH:MM
    function addMinutes(time: string, mins: number) {
      const [h, m] = time.split(':').map(Number)
      const total = h * 60 + m + mins
      return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
    }

    const rows: object[] = []
    for (const lesson of scheduledLessons) {
      const dbLesson = dbLessons.find(l => l.lesson_number === lessonIndexById[lesson.id])
      if (!dbLesson) continue

      // Emit one calendar event (group-scoped + student-scoped rows).
      function pushEvent(date: string, time: string, dur: number | undefined, nodeType: 'lesson' | 'rec') {
        const base = {
          lesson_id: dbLesson!.id,
          date: dotToIso(date),
          time_start: time,
          time_end: addMinutes(time, dur ?? 90),
          lesson_title: lesson.title || dbLesson!.title,
          // Must match lessons.lesson_number (0-based) so resolveScheduleLesson's
          // byNumber lookup lands on the right lesson — NOT lessonIndex + 1.
          lesson_number: lessonIndexById[lesson.id],
          subject: c.subject,
          status: 'upcoming',
          node_type: nodeType,
        }
        for (const groupId of c.groupIds) rows.push({ ...base, group_id: groupId, student_id: null })
        for (const studentId of c.studentIds) rows.push({ ...base, group_id: null, student_id: studentId })
      }

      const hasLesson = !!(lesson.scheduledDate && lesson.scheduledTime)
      const hasRec = !!(lesson.recDate && lesson.recTime)
      // Recording diverged from the lesson → two distinct calendar events.
      const diverged = hasRec && (lesson.recDate !== lesson.scheduledDate || lesson.recTime !== lesson.scheduledTime)

      if (hasLesson) pushEvent(lesson.scheduledDate!, lesson.scheduledTime!, lesson.scheduledDuration, 'lesson')
      if (diverged || (hasRec && !hasLesson)) {
        pushEvent(lesson.recDate!, lesson.recTime!, lesson.recDuration, 'rec')
      }
    }

    // Rebuild the calendar for the WHOLE course: wipe every schedule row for its
    // lessons, then insert the fresh set. Deleting only the lessons that still
    // produce a row (the old behaviour) orphaned entries whenever a date was
    // cleared or a recording stopped diverging → phantom calendar dates.
    const allLessonIds = dbLessons.map(l => l.id)
    if (allLessonIds.length > 0) {
      const { error: delErr } = await supabase
        .from('schedule_lessons')
        .delete()
        .in('lesson_id', allLessonIds)
      if (delErr) console.error('schedule_lessons delete failed:', delErr)
    }
    if (rows.length > 0) {
      const { error: insErr } = await supabase
        .from('schedule_lessons')
        .insert(rows)
      if (insErr) console.error('schedule_lessons insert failed:', insErr)
    }
    return true
  }

  // ── «Выдать новой группе» — clone this course as a fresh, independent stream
  // for another group: new short_ids (zero shared progress), no old students,
  // and all dates slid so the first lesson lands on the chosen start date. ──
  const [handoutOpen, setHandoutOpen] = useState(false)
  const [handoutGroupId, setHandoutGroupId] = useState<string | null>(null)
  const [handoutTitle, setHandoutTitle] = useState('')
  const [handoutStart, setHandoutStart] = useState('') // YYYY-MM-DD
  const [handoutBusy, setHandoutBusy] = useState(false)
  const [handoutDone, setHandoutDone] = useState(false)

  const courseHasDates = course.lessons.some(l => l.scheduledDate || l.recDate)
  const handoutGroups = groups.filter(g => !course.groupIds.includes(g.id))

  function openHandout() {
    setHandoutGroupId(null)
    setHandoutTitle(`${course.title} · ${t('поток 2')}`)
    setHandoutStart('')
    setHandoutDone(false)
    setHandoutOpen(true)
  }

  function buildHandoutClone(opts: { groupId: string; title: string; newStartIso?: string }): CourseEdData {
    const { groupId, title, newStartIso } = opts
    let deltaDays = 0
    const anchor = earliestCourseDate(course.lessons)
    if (newStartIso && anchor) {
      const target = new Date(`${newStartIso}T00:00:00`)
      deltaDays = Math.round((target.getTime() - anchor.getTime()) / 86400000)
    }
    // New lesson ids, dates shifted, lesson-level audiences (referencing the old
    // group/students) cleared so nothing leaks from the source course.
    const idMap: Record<string, string> = {}
    const lessons = course.lessons.map(l => {
      const nid = uid(); idMap[l.id] = nid
      return {
        ...l, id: nid,
        extraStudentIds: undefined, extraGroupIds: undefined,
        scheduledDate: shiftDot(l.scheduledDate, deltaDays),
        recDate: shiftDot(l.recDate, deltaDays),
        hwDate: shiftDot(l.hwDate, deltaDays),
        recHwDate: shiftDot(l.recHwDate, deltaDays),
      }
    })
    const modules = course.modules.map(m => ({ ...m, id: uid(), lessonIds: m.lessonIds.map(id => idMap[id] ?? id) }))
    return {
      ...course,
      id: uid(),
      dbCourseId: undefined,
      title: title.trim() || course.title,
      groupIds: [groupId],
      studentIds: [],
      modules,
      lessons,
      lastEdited: undefined,
    }
  }

  async function runHandout() {
    if (!handoutGroupId || handoutBusy) return
    setHandoutBusy(true)
    const clone = buildHandoutClone({ groupId: handoutGroupId, title: handoutTitle, newStartIso: handoutStart || undefined })
    const ok = await syncAccessToSupabase(clone)
    setHandoutBusy(false)
    if (ok) { setHandoutDone(true); setTimeout(() => setHandoutOpen(false), 1200) }
    else setPublishErr(t('Не удалось создать копию курса — проверьте, что вы вошли в аккаунт учителя, и попробуйте снова.'))
  }

  function handleSave(overrideCourse?: CourseEdData) {
    const c = overrideCourse ?? course
    setCourseEdited(JSON.stringify(c))
    const seq = draftSeq.current
    setSaving(true)
    // Floor the "saving" state so the fill + spinner are perceptible even when
    // the write returns almost instantly.
    Promise.all([syncAccessToSupabase(c), new Promise(r => setTimeout(r, 550))]).then(([ok]) => {
      setSaving(false)
      clearCourseDraftAfterSync(seq, ok as boolean)
      if (ok) { setPublishErr(null); flash() }
      else setPublishErr(t('Не удалось сохранить курс — проверьте, что вы вошли в аккаунт учителя, и попробуйте снова.'))
    })
  }

  // A lesson counts as "scheduled" when it has both a date and a time on either
  // the Урок event or the Запись event. Test nodes don't need scheduling.
  function lessonScheduled(l: CELesson): boolean {
    if (l.kind === 'test') return true
    return !!((l.scheduledDate && l.scheduledTime) || (l.recDate && l.recTime))
  }

  // Returns an error string if the course can't be published yet, else null.
  // Publish requires an audience (кому/для кого) and a date+time for AT LEAST ONE
  // lesson — остальные уроки можно оставить без расписания.
  function publishBlocker(c: CourseEdData): string | null {
    const hasAudience = c.groupIds.length > 0 || c.studentIds.length > 0
    if (!hasAudience) return t('Выберите, кому виден курс (группа или ученик) — иначе можно только сохранить в черновик.')
    const realLessons = c.lessons.filter(l => l.kind !== 'test')
    if (realLessons.length > 0 && !realLessons.some(lessonScheduled)) {
      return t('Укажите дату и время хотя бы для одного урока — иначе можно только сохранить в черновик.')
    }
    return null
  }

  function handlePublish() {
    const blocker = publishBlocker(course)
    if (blocker) {
      setPublishErr(blocker)
      return
    }
    setPublishErr(null)
    const updated = { ...course, status: 'published' as const }
    setCourse(updated)
    setCourseEdited(JSON.stringify(updated))
    // setCourse above bumps draftSeq on the next render — capture seq+1 so the
    // status flip itself doesn't block the post-save draft cleanup.
    const seq = draftSeq.current + 1
    setSaving(true)
    Promise.all([syncAccessToSupabase(updated), new Promise(r => setTimeout(r, 550))]).then(([ok]) => {
      setSaving(false)
      clearCourseDraftAfterSync(seq, ok as boolean)
      if (ok) flash()
      else setPublishErr(t('Не удалось опубликовать курс — проверьте, что вы вошли в аккаунт учителя, и попробуйте снова.'))
    })
  }

  function handleUnpublish() {
    const updated = { ...course, status: 'draft' as const }
    setCourse(updated)
    setCourseEdited(JSON.stringify(updated))
    const seq = draftSeq.current + 1
    syncAccessToSupabase(updated).then(ok => clearCourseDraftAfterSync(seq, ok))
    flash()
  }

  const docked = useTeacher(s => s.headerDocked)
  const setDocked = useTeacher(s => s.setHeaderDocked)
  useEffect(() => () => setDocked(false), [])

  const dockGlass = {
    border: '1px solid var(--color-border-glass)',
    background: 'rgba(var(--glass-rgb), 0.86)',
    backdropFilter: 'blur(14px) saturate(180%)',
    WebkitBackdropFilter: 'blur(14px) saturate(180%)',
    boxShadow: 'var(--shadow-lg)',
  } as const

  // Highlighted "Черновик" look — shown while the course IS a draft, so it reads
  // as the current state rather than a muted secondary action.
  const draftActiveStyle = {
    border: '1.5px solid var(--color-yellow-text)',
    background: 'var(--color-yellow-soft)',
    color: 'var(--color-yellow-text)',
    fontWeight: 700,
  } as const

  // Live publish gate — drives the disabled state of the Опубликовать button.
  const liveBlocker = course.status === 'published' ? null : publishBlocker(course)
  // Clear a shown error once the teacher fixes what was missing.
  useEffect(() => { if (!liveBlocker) setPublishErr(null) }, [liveBlocker])

  const courseTitle = course.title || t('Создать курс')

  return (
    <div
      onScroll={e => setDocked((e.currentTarget as HTMLElement).scrollTop > 64)}
      style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarGutter: 'stable', marginTop: -100, paddingTop: 100 }}
    >
      {/* ── Docked twin ── */}
      <div className="docked-pills-row" style={{ position: 'fixed', top: 30, left: 32, right: 32, zIndex: 80, pointerEvents: 'none' }}>
        <AnimatePresence>
          {docked && (
            <motion.div
              key="course-editor-dock"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: [0, 6, -3.5, 1.5, -0.5, 0] }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.38, ease: [0.34, 1.56, 0.64, 1] }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, pointerEvents: 'none' }}
            >
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={handleBack}
                style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, padding: '9px 16px 9px 12px', borderRadius: 999, ...dockGlass, color: 'var(--color-text)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', pointerEvents: 'auto' }}>
                <ArrowLeft size={15} strokeWidth={2} /> {t('Назад')}
              </motion.button>
              <div style={{ flexShrink: 1, minWidth: 0, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '9px 16px', borderRadius: 999, ...dockGlass, fontSize: 14, fontWeight: 700, color: 'var(--color-text)', pointerEvents: 'auto' }}>
                {courseTitle}
              </div>
              <div style={{ flexGrow: 1 }} />
              {course.status !== 'published' ? (
                <button onClick={() => handleSave()} style={{ flexShrink: 0, padding: '9px 16px', borderRadius: 999, ...dockGlass, ...draftActiveStyle, cursor: 'pointer', fontSize: 13.5, fontFamily: 'inherit', pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-yellow-text)', flexShrink: 0 }} /> {t('Черновик')}
                </button>
              ) : (
                <button onClick={handleUnpublish} style={{ flexShrink: 0, padding: '9px 16px', borderRadius: 999, ...dockGlass, cursor: 'pointer', fontSize: 13.5, fontWeight: 600, color: 'var(--color-muted)', fontFamily: 'inherit', pointerEvents: 'auto' }}>
                  {t('В черновик')}
                </button>
              )}
              <TeacherSaveButton
                label={course.status === 'published' ? t('Сохранить') : t('Опубликовать')}
                savedLabel={course.status === 'published' ? t('Сохранено!') : t('Опубликовано!')}
                icon={<Send size={14} />}
                saved={savedFlash}
                saving={saving}
                onClick={course.status === 'published' ? () => handleSave() : handlePublish}
                style={{ pointerEvents: 'auto' }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── At-rest header ── */}
      <motion.div
        animate={{ opacity: docked ? 0 : 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 24px 14px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={handleBack}
            style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, padding: '9px 16px 9px 12px', borderRadius: 999, border: '1px solid var(--color-border-soft)', background: 'rgba(var(--glass-rgb), 0.96)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', color: 'var(--color-text)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            <ArrowLeft size={15} strokeWidth={2} /> {t('Назад')}
          </motion.button>
          <AnimatePresence>
            {selectedLesson && (
              <motion.button
                key="back-to-course"
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.16 }}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                onClick={() => setSelectedLessonId(null)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, padding: '9px 16px 9px 12px', borderRadius: 999, border: '1px solid var(--color-border-soft)', background: 'rgba(var(--glass-rgb), 0.96)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', color: 'var(--color-text-2)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                <ChevronLeft size={15} strokeWidth={2} /> {t('Курс')}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>{courseTitle}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {course.dbCourseId && (
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={openHandout}
              title={t('Скопировать курс для другой группы со своим стартом дат')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, padding: '9px 15px', borderRadius: 999, border: '1px solid var(--color-border-soft)', background: 'rgba(var(--glass-rgb), 0.96)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', color: 'var(--color-text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Copy size={14} strokeWidth={2} /> {t('Выдать группе')}
            </motion.button>
          )}
          {course.status !== 'published' ? (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => handleSave()}
              style={{ padding: '9px 18px', borderRadius: 999, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', ...draftActiveStyle, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-yellow-text)', flexShrink: 0 }} /> {t('Черновик')}
            </motion.button>
          ) : (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleUnpublish}
              style={{ padding: '9px 18px', borderRadius: 999, border: '1px solid var(--color-border-soft)', background: 'rgba(var(--glass-rgb), 0.96)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', color: 'var(--color-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
              {t('В черновик')}
            </motion.button>
          )}
          <TeacherSaveButton
            label={course.status === 'published' ? t('Сохранить') : t('Опубликовать')}
            savedLabel={course.status === 'published' ? t('Сохранено!') : t('Опубликовано!')}
            icon={<Send size={14} />}
            saved={savedFlash}
            saving={saving}
            onClick={course.status === 'published' ? () => handleSave() : handlePublish}
            style={{}} />
        </div>
      </motion.div>

      {/* ── «Выдать новой группе» modal ── */}
      {handoutOpen && createPortal(
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => !handoutBusy && setHandoutOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}>
          <motion.div
            initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }}
            onClick={e => e.stopPropagation()}
            style={{ width: 460, maxWidth: '92vw', maxHeight: '88vh', overflow: 'auto', background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)', borderRadius: 20, boxShadow: '0 24px 70px rgba(0,0,0,0.4)', padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--color-green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Copy size={17} strokeWidth={2.2} color="var(--color-green-text)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--color-text)' }}>{t('Выдать новой группе')}</div>
                <div style={{ fontSize: 12.5, color: 'var(--color-muted)' }}>{t('Свежая копия курса — свой старт, ноль прогресса')}</div>
              </div>
              <button onClick={() => !handoutBusy && setHandoutOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', padding: 4 }}><X size={18} /></button>
            </div>

            {/* Group picker */}
            <div style={{ marginTop: 16, fontSize: 12.5, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 8 }}>{t('Кому выдать')}</div>
            {handoutGroups.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--color-muted)', padding: '10px 12px', background: 'var(--color-bg-3)', borderRadius: 12 }}>
                {t('Все группы уже назначены на этот курс. Создайте новую группу в разделе «Группы».')}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflow: 'auto' }}>
                {handoutGroups.map(g => {
                  const on = handoutGroupId === g.id
                  return (
                    <button key={g.id} onClick={() => setHandoutGroupId(g.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', borderRadius: 12, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                        border: on ? '1px solid var(--color-green-text)' : '1px solid var(--color-border-soft)',
                        background: on ? 'var(--color-green-soft)' : 'var(--color-bg-3)' }}>
                      <Users size={15} color={on ? 'var(--color-green-text)' : 'var(--color-muted)'} />
                      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: on ? 'var(--color-green-text)' : 'var(--color-text)' }}>{g.name}</span>
                      {on && <Check size={15} color="var(--color-green-text)" />}
                    </button>
                  )
                })}
              </div>
            )}

            {/* New start date — only when the course actually has a calendar to shift */}
            {courseHasDates && (
              <>
                <div style={{ marginTop: 16, fontSize: 12.5, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={14} /> {t('Старт нового потока')}
                </div>
                <input type="date" value={handoutStart} onChange={e => setHandoutStart(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid var(--color-border-soft)', background: 'var(--color-bg-3)', color: 'var(--color-text)', fontSize: 13.5, fontFamily: 'inherit' }} />
                <div style={{ fontSize: 11.5, color: 'var(--color-muted)', marginTop: 6 }}>
                  {handoutStart ? t('Все даты уроков и домашек сдвинутся так, чтобы первый урок был в этот день (интервалы сохранятся).') : t('Оставьте пустым — даты скопируются как есть.')}
                </div>
              </>
            )}

            {/* Title */}
            <div style={{ marginTop: 16, fontSize: 12.5, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 8 }}>{t('Название копии')}</div>
            <input value={handoutTitle} onChange={e => setHandoutTitle(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid var(--color-border-soft)', background: 'var(--color-bg-3)', color: 'var(--color-text)', fontSize: 13.5, fontFamily: 'inherit' }} />

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => !handoutBusy && setHandoutOpen(false)}
                style={{ padding: '11px 18px', borderRadius: 999, border: '1px solid var(--color-border-soft)', background: 'transparent', color: 'var(--color-text-2)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                {t('Отмена')}
              </button>
              <TeacherSaveButton
                label={t('Создать копию')}
                savedLabel={t('Готово!')}
                icon={<Copy size={14} />}
                accent={SAVE_ACCENTS.success}
                fullWidth
                saved={handoutDone}
                saving={handoutBusy}
                savingLabel={t('Создаю…')}
                disabled={!handoutGroupId}
                onClick={runHandout}
                style={{ flex: 1 }} />
            </div>
          </motion.div>
        </motion.div>,
        document.body
      )}

      {/* ── Publish-blocked banner ── */}
      <AnimatePresence>
        {publishErr && (
          <motion.div
            key="publish-err"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            style={{
              margin: '0 24px 8px', padding: '10px 14px', borderRadius: 12,
              border: '1px solid var(--color-red-soft)', background: 'var(--color-red-soft)',
              color: 'var(--color-red-text)', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <span style={{ flexShrink: 0 }}>⚠️</span>
            <span>{publishErr}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 3-column body ── */}
      <div style={{ display: 'flex', gap: 14, padding: '4px 20px 24px', minHeight: 'calc(100vh - 100px)' }}>

        {/* LEFT rail — single column whose WIDTH animates between the course
            card (320), the lesson rail (248) and collapsed (0, for a test).
            One element with mode="wait" → course↔lesson glides instead of
            snapping; within a lesson the inner card cross-fades per tab. */}
        <AnimatePresence mode="wait" initial={false}>
          {!selectedLesson ? (
            <motion.div
              key="meta-rail"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 248 }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={{ flexShrink: 0, alignSelf: 'flex-start', overflow: 'hidden', position: 'sticky', top: 4 }}
            >
              {/* Hugs its content, same 248 width as the lesson rail. */}
              <div style={{ width: 248 }}>
                <GlassCard style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <LeftCourseMeta course={course} setCourse={setCourse} />
                </GlassCard>
              </div>
            </motion.div>
          ) : selectedLesson.kind !== 'test' ? (
            <motion.div
              key="lesson-rail"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 248 }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={{ flexShrink: 0, alignSelf: 'flex-start', overflow: 'hidden', position: 'sticky', top: 4 }}
            >
              {/* Inner fixed-width so the rail content never reflows while the
                  outer width animates. Per-tab card cross-fades. */}
              <div style={{ width: 248 }}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={lessonMode === 'homework' ? 'rail-hw' : lessonMode === 'students' ? 'rail-students' : 'rail-sched'}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.13 }}
                  >
                    {(lessonMode === 'recording' || lessonMode === 'lesson') && (
                      <ScheduleCard
                        scope={lessonMode === 'recording' ? 'rec' : 'lesson'}
                        lesson={selectedLesson}
                        onUpdate={updateLesson}
                      />
                    )}
                    {lessonMode === 'homework' && (
                      <HomeworkLeftPanel
                        lesson={selectedLesson}
                        onUpdate={updateLesson}
                        hwTab={hwTab}
                        setHwTab={setHwTab}
                        isLanguage={isLanguageSubject(course.subject)}
                      />
                    )}
                    {lessonMode === 'students' && (
                      <StudentsLeftPanel
                        lesson={selectedLesson}
                        onUpdate={updateLesson}
                        course={course}
                        groups={groups}
                        allStudents={allStudents}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="test-rail"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 248 }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={{ flexShrink: 0, alignSelf: 'flex-start', overflow: 'hidden', position: 'sticky', top: 4 }}
            >
              <div style={{ width: 248 }}>
                <TestLeftPanel lesson={selectedLesson} onUpdate={updateLesson} isLanguage={isLanguageSubject(course.subject)} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CENTER — no `layout`: flexbox already reflows it smoothly as the
            left rail width animates; an extra layout anim would fight that. */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <AnimatePresence mode="wait" initial={false}>
            {!selectedLesson ? (
              /* ── Course meta view ── */
              <motion.div key="course-meta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <CenterCourseAccess
                  course={course} setCourse={setCourse}
                  groups={groups} allStudents={allStudents}
                  accessModes={accessModes} setAccessModes={setAccessModes}
                />
              </motion.div>
            ) : (
              /* ── Lesson editor view ── */
              <motion.div key={`lesson-${selectedLesson.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {selectedLesson.kind === 'test' ? (
                  <CenterTestView
                    lesson={selectedLesson}
                    onUpdate={updateLesson}
                    onBack={() => setSelectedLessonId(null)}
                  />
                ) : (
                <>
                {/* Lesson header: back + tabs */}
                <div style={{ padding: '10px 16px 12px', borderBottom: '1px solid var(--color-border-soft)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {selectedLesson.title || t('Урок без названия')}
                    </span>
                    {course.dbCourseId && (() => {
                      const isOpened = openLessonShortIds.has(lessonShortIdById[selectedLesson.id])
                      return (
                        <motion.button
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => openLessonForStudents(selectedLesson.id)}
                          disabled={openingLesson}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '6px 14px', borderRadius: 999, border: 'none',
                            background: isOpened
                              ? 'var(--grad-green-open)'
                              : 'var(--btn-green-bg)',
                            color: '#fff',
                            fontSize: 12, fontWeight: 700,
                            cursor: openingLesson ? 'wait' : 'pointer',
                            fontFamily: 'inherit', flexShrink: 0,
                            boxShadow: isOpened
                              ? 'var(--glow-green-open)'
                              : 'var(--btn-green-glow)',
                            transition: 'background 0.3s, box-shadow 0.3s',
                            opacity: openingLesson ? 0.7 : 1,
                          }}
                        >
                          {isOpened
                            ? <><Check size={13} /> {t('Открыт')}</>
                            : <><Unlock size={13} /> {t('Открыть урок')}</>
                          }
                        </motion.button>
                      )
                    })()}
                  </div>
                  <div style={{ display: 'flex', background: 'var(--color-bg-3)', borderRadius: 12, padding: 3, gap: 2 }}>
                    {LESSON_MODES.map(m => {
                      const active = lessonMode === m.id
                      return (
                        <button key={m.id} onClick={() => setLessonMode(m.id)} onMouseDown={e => e.preventDefault()} style={{
                          position: 'relative', flex: 1, padding: '7px 10px', borderRadius: 9,
                          border: 'none', cursor: 'pointer', background: 'transparent',
                          color: active ? 'var(--color-green-text)' : 'var(--color-text)',
                          fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                          transition: 'color 0.2s', outline: 'none',
                        }}>
                          {active && (
                            <motion.span
                              layoutId="lessonModePill"
                              transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                              style={{
                                position: 'absolute', inset: 0, borderRadius: 9,
                                background: 'var(--color-green-soft)',
                                border: '1.5px solid var(--color-green-text)',
                              }}
                            />
                          )}
                          <span style={{ position: 'relative', zIndex: 1 }}>{t(m.label)}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Tab content */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={lessonMode}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.16 }}
                    style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                  >
                    {lessonMode === 'recording' && (
                      <CenterRecording
                        lesson={selectedLesson}
                        onSaveVideo={url => updateLesson({ ...selectedLesson, videoUrl: url })}
                      />
                    )}
                    {lessonMode === 'lesson' && (
                      <CenterLesson lesson={selectedLesson} onUpdate={updateLesson} />
                    )}
                    {lessonMode === 'homework' && (
                      <CenterHomework lesson={selectedLesson} onUpdate={updateLesson} hwTab={hwTab} />
                    )}
                    {lessonMode === 'students' && (
                      <CenterLessonStudents
                        lesson={selectedLesson} onUpdate={updateLesson}
                        course={course} groups={groups} allStudents={allStudents}
                        accessModes={accessModes} setAccessModes={setAccessModes}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
                </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT: always lesson list */}
        <GlassCard style={{ width: 288, flexShrink: 0, alignSelf: 'flex-start', position: 'sticky', top: 4, maxHeight: 'calc(100vh - 190px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <RightPanelLessons
            course={course} setCourse={setCourse}
            selectedLessonId={selectedLessonId} onSelectLesson={handleSelectLesson}
            openLessonShortIds={openLessonShortIds} lessonShortIdById={lessonShortIdById}
          />
        </GlassCard>

      </div>
    </div>
  )
}
