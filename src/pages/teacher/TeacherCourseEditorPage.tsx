import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Plus, Send, Video, Link2, Upload,
  BookOpen, AlignLeft, CheckSquare, Type, Shuffle,
  PenLine, Star, ChevronRight, ChevronDown, Users,
  X, FileText, NotebookPen, FolderOpen, Layers,
  GripVertical, ChevronLeft, ChevronUp, Unlock, Check, Calendar,
  ClipboardCheck, Clock, Trash2,
} from 'lucide-react'
import { useTeacher } from '../../store/teacherStore'
import { useTaskBank } from '../../store/taskBankStore'
import type { Task as BankTask } from '../../data/taskBankData'
import { useGroups, useAllStudents } from '../../lib/useGroups'
import TeacherSaveButton, { teacherSaveStyle } from '../../components/teacher/TeacherSaveButton'
import { supabase } from '../../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

type LessonMode = 'recording' | 'lesson' | 'homework' | 'students'

type HWTaskType = 'text' | 'choice' | 'fill' | 'match' | 'whiteboard'

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
  // homework per lesson
  hwTitle?: string
  hwTarget?: string
  hwDate?: string
  hwTasks?: HWTask[]
  // calendar scheduling
  scheduledDate?: string   // DD.MM.YYYY
  scheduledTime?: string   // HH:MM
  scheduledDuration?: number // minutes (default 90)
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

const TASK_TYPES: { type: HWTaskType; label: string; hint: string; Icon: React.ElementType; color: string; bg: string }[] = [
  { type: 'text',       label: 'Текстовый ответ', hint: 'Развёрнутый ответ',  Icon: AlignLeft,   color: 'var(--color-accent)',         bg: 'var(--color-purple-soft)' },
  { type: 'choice',     label: 'Выбор ответа',    hint: 'Один или несколько', Icon: CheckSquare, color: 'var(--color-green-text)',     bg: 'var(--color-green-soft)' },
  { type: 'fill',       label: 'Вписать слово',   hint: 'Слово / фраза',      Icon: Type,        color: 'var(--color-peach-text)',     bg: 'var(--color-peach-soft)' },
  { type: 'match',      label: 'Сопоставление',   hint: 'Таблица А1 Б2 В3',   Icon: Shuffle,     color: 'var(--color-rose-text)',      bg: 'var(--color-rose-soft)' },
  { type: 'whiteboard', label: 'Доска',            hint: 'Рисунок на доске',   Icon: PenLine,     color: 'var(--color-blue-pill-text)', bg: 'var(--color-blue-pill-bg)' },
]

const typeLabel: Record<HWTaskType, string> = {
  text: 'Текстовый ответ', choice: 'Выбор ответа',
  fill: 'Вписать слово', match: 'Сопоставление', whiteboard: 'Доска',
}

// ─── CENTER: Course meta (no lesson selected) ────────────────────────────────

function CenterCourseMeta({
  course, setCourse, groups, allStudents,
}: {
  course: CourseEdData
  setCourse: React.Dispatch<React.SetStateAction<CourseEdData>>
  groups: Array<{ id: string; name: string }>
  allStudents: Array<{ id: string; name: string; groupId?: string }>
}) {
  const [assignTab, setAssignTab] = useState<'group' | 'student'>('group')

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
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>

        {/* Title */}
        <div>
          <Label>Название курса</Label>
          <input
            value={course.title}
            onChange={e => setCourse(c => ({ ...c, title: e.target.value }))}
            style={{ ...inputSt, fontSize: 16, fontWeight: 600, padding: '11px 14px' }}
            placeholder="Например: ЕГЭ по Химии"
          />
        </div>

        {/* Description */}
        <div>
          <Label>Описание курса</Label>
          <textarea
            value={course.description ?? ''}
            onChange={e => setCourse(c => ({ ...c, description: e.target.value }))}
            style={{ ...inputSt, resize: 'none', minHeight: 90, lineHeight: 1.6 }}
            placeholder="Краткое описание — что разберём, для кого курс, что получит ученик…"
          />
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--color-border-soft)' }} />

        {/* Who gets the course */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Users size={15} style={{ color: 'var(--color-accent)' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>Ученики курса</span>
            <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>— кому виден весь курс</span>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {(['group', 'student'] as const).map(tab => (
              <button key={tab} onClick={() => setAssignTab(tab)} style={{
                padding: '6px 18px', borderRadius: 999, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 700,
                background: assignTab === tab ? 'var(--color-purple-soft)' : 'var(--color-bg-3)',
                color: assignTab === tab ? 'var(--color-accent)' : 'var(--color-text-2)',
                transition: 'all 0.15s', fontFamily: 'inherit',
              }}>
                {tab === 'group' ? 'Группе' : 'Ученику'}
              </button>
            ))}
          </div>

          {assignTab === 'group' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {groups.map(g => (
                <button key={g.id} onClick={() => toggleGroup(g.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '9px 14px', borderRadius: 12,
                  border: course.groupIds.includes(g.id) ? '1.5px solid var(--color-accent)' : '1.5px solid var(--color-border)',
                  background: course.groupIds.includes(g.id) ? 'var(--color-purple-soft)' : 'transparent',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.14s',
                }}>
                  <Users size={13} style={{ color: course.groupIds.includes(g.id) ? 'var(--color-accent)' : 'var(--color-muted)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: course.groupIds.includes(g.id) ? 'var(--color-accent)' : 'var(--color-text)', flex: 1, textAlign: 'left' }}>
                    {g.name}
                  </span>
                  {course.groupIds.includes(g.id) && <X size={11} style={{ color: 'var(--color-accent)' }} />}
                </button>
              ))}
            </div>
          )}

          {assignTab === 'student' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {allStudents.map(s => (
                <button key={s.id} onClick={() => toggleStudent(s.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '9px 14px', borderRadius: 12,
                  border: course.studentIds.includes(s.id) ? '1.5px solid var(--color-accent)' : '1.5px solid var(--color-border)',
                  background: course.studentIds.includes(s.id) ? 'var(--color-purple-soft)' : 'transparent',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.14s',
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: course.studentIds.includes(s.id) ? 'var(--color-accent)' : 'var(--color-bg-3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                    color: course.studentIds.includes(s.id) ? '#fff' : 'var(--color-muted)', flexShrink: 0,
                  }}>
                    {s.name.slice(0, 1).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: course.studentIds.includes(s.id) ? 'var(--color-accent)' : 'var(--color-text)', flex: 1, textAlign: 'left' }}>
                    {s.name}
                  </span>
                  {course.studentIds.includes(s.id) && <X size={11} style={{ color: 'var(--color-accent)' }} />}
                </button>
              ))}
              {allStudents.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--color-muted)', padding: '12px 0' }}>Ученики не найдены</div>
              )}
            </div>
          )}

          {/* Summary chips */}
          {(assignedGroups.length > 0 || assignedStudents.length > 0) && (
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {assignedGroups.map(g => (
                <div key={g.id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 999,
                  background: 'var(--color-purple-soft)', fontSize: 12, fontWeight: 600, color: 'var(--color-accent)',
                }}>
                  <Users size={10} /> {g.name}
                </div>
              ))}
              {assignedStudents.map(s => (
                <div key={s.id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 999,
                  background: 'var(--color-bg-3)', fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)',
                }}>
                  {s.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── CENTER: Recording tab ────────────────────────────────────────────────────

function CenterRecording({
  lesson, onSaveVideo,
}: {
  lesson: CELesson
  onSaveVideo: (url: string) => void
}) {
  const [linkMode, setLinkMode] = useState(false)
  const [videoUrl, setVideoUrl] = useState(lesson.videoUrl ?? '')

  if (lesson.videoUrl && !linkMode) {
    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 36px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Label>Запись урока</Label>
            <button onClick={() => { setVideoUrl(lesson.videoUrl ?? ''); setLinkMode(true) }}
              style={{ fontSize: 11, color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
              Изменить
            </button>
          </div>
          <div style={{
            padding: '14px 16px', borderRadius: 14, background: 'var(--color-bg-2)',
            border: '1.5px solid var(--color-border-medium)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-purple-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Video size={16} style={{ color: 'var(--color-accent)' }} />
            </div>
            <span style={{ fontSize: 13, color: 'var(--color-text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lesson.videoUrl}
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (linkMode) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Label>Ссылка на запись</Label>
          <input
            value={videoUrl}
            onChange={e => setVideoUrl(e.target.value)}
            placeholder="Вставьте ссылку RuTube / YouTube"
            style={{ ...inputSt, fontSize: 14, padding: '12px 16px' }}
            autoFocus
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setLinkMode(false)}
              style={{ padding: '9px 18px', borderRadius: 12, border: '1.5px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Отмена
            </button>
            <button onClick={() => { onSaveVideo(videoUrl); setLinkMode(false) }}
              style={{ flex: 1, padding: '9px 18px', borderRadius: 12, border: 'none', background: 'var(--color-purple-soft)', color: 'var(--color-accent)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Сохранить
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--color-purple-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Video size={32} style={{ color: 'var(--color-accent)' }} />
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>Добавьте запись урока</div>
          <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>После созвона — вставьте ссылку RuTube / YouTube</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setLinkMode(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 14, border: 'none', background: 'var(--color-purple-soft)', color: 'var(--color-accent)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Link2 size={14} /> Вставить ссылку
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 14, border: '1.5px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Upload size={14} /> Загрузить файл
          </button>
        </div>
      </div>
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
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 36px' }}>
      <div style={{ display: 'flex', gap: 18, maxWidth: 900, margin: '0 auto', alignItems: 'flex-start' }}>

        {/* LEFT card — scheduling */}
        <div style={{
          width: 248, flexShrink: 0,
          background: 'rgba(var(--glass-rgb), 0.7)', border: '1px solid var(--color-border-glass)',
          borderRadius: 18, padding: '16px 16px 18px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
            <Calendar size={14} style={{ color: lesson.scheduledDate ? 'var(--color-accent)' : 'var(--color-muted)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: lesson.scheduledDate ? 'var(--color-text)' : 'var(--color-text-3)' }}>
              Дата и время
            </span>
            {lesson.scheduledDate && (
              <button
                onClick={() => onUpdate({ ...lesson, scheduledDate: undefined, scheduledTime: undefined, scheduledDuration: undefined })}
                style={{ marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-4)', padding: 0 }}
              >
                <X size={13} />
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <Label>Дата</Label>
              <CalendarPicker
                value={lesson.scheduledDate ?? ''}
                onChange={v => onUpdate({ ...lesson, scheduledDate: v || undefined })}
              />
            </div>
            <div>
              <Label>Начало</Label>
              <PickerSelect
                value={lesson.scheduledTime ?? ''}
                onChange={v => onUpdate({ ...lesson, scheduledTime: v || undefined })}
                icon={Clock}
                placeholder="—"
                allowEmpty
                options={Array.from({ length: 32 }, (_, i) => {
                  const h = Math.floor(i / 2) + 7
                  const m = i % 2 === 0 ? '00' : '30'
                  const t = `${String(h).padStart(2, '0')}:${m}`
                  return { value: t, label: t }
                })}
              />
            </div>
            <div>
              <Label>Длительность</Label>
              <PickerSelect
                value={String(lesson.scheduledDuration ?? 90)}
                onChange={v => onUpdate({ ...lesson, scheduledDuration: Number(v) })}
                options={[45, 60, 90, 120, 150, 180].map(m => ({
                  value: String(m),
                  label: m < 60 ? `${m} мин` : `${m / 60} ч${m % 60 ? ` ${m % 60} м` : ''}`,
                }))}
              />
            </div>
          </div>
          {lesson.scheduledDate && lesson.scheduledTime && (
            <div style={{ marginTop: 12, fontSize: 11, color: 'var(--color-accent)', display: 'flex', alignItems: 'flex-start', gap: 5, lineHeight: 1.4 }}>
              <Check size={12} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>Появится в календаре ученика {lesson.scheduledDate} в {lesson.scheduledTime}</span>
            </div>
          )}
        </div>

        {/* RIGHT column — lesson content */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <Label>Название урока</Label>
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
                    border: fileName ? '1.5px solid var(--color-accent)' : '1.5px dashed var(--color-border-medium)',
                    background: fileName ? 'var(--color-purple-soft)' : 'transparent',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--color-purple-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={18} style={{ color: 'var(--color-accent)' }} />
                  </div>
                  <div style={{ textAlign: 'center', width: '100%', minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: fileName ? 'var(--color-accent)' : 'var(--color-text-2)' }}>{label}</div>
                    <div style={{ fontSize: 10, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: fileName ? 'var(--color-accent)' : 'var(--color-muted)' }}>
                      {fileName ?? 'Загрузить файл'}
                    </div>
                  </div>
                </button>
                {fileName && (
                  <button
                    onClick={e => { e.stopPropagation(); onUpdate({ ...lesson, [field]: undefined }) }}
                    style={{
                      position: 'absolute', top: 6, right: 6,
                      border: 'none', background: 'var(--color-purple-soft)',
                      borderRadius: '50%', width: 18, height: 18,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: 'var(--color-accent)', padding: 0,
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
          <Label>Описание урока</Label>
          <textarea
            value={lesson.description ?? ''}
            onChange={e => onUpdate({ ...lesson, description: e.target.value })}
            style={{ ...inputSt, resize: 'none', minHeight: 100, lineHeight: 1.6 }}
            placeholder="Краткое содержание урока, что разобрали, ключевые моменты…"
          />
        </div>
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
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', marginBottom: 2 }}>Куда добавить файл?</div>
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
                    background: lesson[field] ? 'var(--color-purple-soft)' : 'transparent',
                    cursor: 'pointer', fontFamily: 'inherit',
                    color: lesson[field] ? 'var(--color-accent)' : 'var(--color-text)',
                    fontSize: 13, fontWeight: 600,
                  }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--color-purple-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={14} style={{ color: 'var(--color-accent)' }} />
                  </div>
                  {label}
                  {lesson[field] && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--color-muted)', fontWeight: 400 }}>заменить</span>}
                </button>
              ))}
              <button onClick={() => setPastePicker(null)}
                style={{ padding: '7px', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-muted)', fontSize: 12, fontFamily: 'inherit', marginTop: 2 }}>
                Отмена
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
  return {
    width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 9, border: 'none',
    cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: active ? 700 : 500,
    background: active ? 'var(--color-purple-soft)' : 'transparent',
    color: active ? 'var(--color-accent)' : 'var(--color-text)',
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

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
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
          padding: '7px 10px', borderRadius: 11, border: '1.5px solid var(--color-border-medium)',
          cursor: 'pointer', background: value ? 'var(--color-purple-soft)' : 'var(--color-bg-input)',
          fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.15s', fontSize: 12,
        }}
      >
        {Icon && <Icon size={13} style={{ flexShrink: 0, color: value ? 'var(--color-accent)' : 'var(--color-text-3)' }} />}
        <span style={{ flex: 1, color: value ? 'var(--color-accent)' : 'var(--color-text-3)', fontWeight: value ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.label ?? placeholder ?? '—'}
        </span>
        <ChevronDown size={11} style={{ flexShrink: 0, color: 'var(--color-text-4)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.16 }}
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 999, width: '100%',
              minWidth: width ?? 110, maxHeight: 240, overflowY: 'auto',
              background: 'var(--color-bg-input)', border: '1.5px solid var(--color-border-medium)',
              borderRadius: 14, boxShadow: '0 8px 32px rgba(99,84,207,0.14)', padding: 6,
              display: 'flex', flexDirection: 'column', gap: 2,
            }}
          >
            {allowEmpty && (
              <button onClick={() => { onChange(''); setOpen(false) }} style={pickerOptionStyle(value === '')}>—</button>
            )}
            {options.map(o => (
              <button key={o.value} onClick={() => { onChange(o.value); setOpen(false) }} style={pickerOptionStyle(o.value === value)}>
                {o.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CalendarPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const parsed = parseDateDot(value)
  const todayDate = parseDateDot(todayDotStr())!
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
          padding: '7px 10px', borderRadius: 11, border: '1.5px solid var(--color-border-medium)',
          cursor: 'pointer', background: value ? 'var(--color-purple-soft)' : 'var(--color-bg-input)',
          fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.15s', fontSize: 12,
        }}
      >
        <Calendar size={13} style={{ flexShrink: 0, color: value ? 'var(--color-accent)' : 'var(--color-text-3)' }} />
        <span style={{ flex: 1, color: value ? 'var(--color-accent)' : 'var(--color-text-3)', fontWeight: value ? 600 : 400 }}>
          {value || 'Выберите дату'}
        </span>
        {value && (
          <button onClick={e => { e.stopPropagation(); onChange('') }}
            style={{ width: 18, height: 18, borderRadius: 5, border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)', flexShrink: 0, padding: 0 }}>
            <X size={9} />
          </button>
        )}
        <ChevronDown size={11} style={{ flexShrink: 0, color: 'var(--color-text-4)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.16 }}
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 999, minWidth: 260,
              background: 'var(--color-bg-input)', border: '1.5px solid var(--color-border-medium)',
              borderRadius: 16, boxShadow: '0 8px 32px rgba(99,84,207,0.14)', padding: '14px 12px 12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <button style={navBtnSt} onClick={prevMonth}><ChevronLeft size={13} /></button>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{RU_MONTHS_CAL[viewMonth]} {viewYear}</span>
              <button style={navBtnSt} onClick={nextMonth}><ChevronRight size={13} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
              {RU_DAYS_SHORT.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: 'var(--color-text-4)', padding: '2px 0' }}>{d}</div>
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
                    background: isSelected ? 'var(--color-purple-soft)' : isToday ? 'var(--color-purple-soft)' : 'transparent',
                    color: isSelected ? 'var(--color-accent)' : isToday ? 'var(--color-accent)' : 'var(--color-text)',
                    transition: 'background 0.12s',
                  }}>
                    {day}
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
              <button onClick={() => { onChange(''); setOpen(false) }}
                style={{ fontSize: 12, color: 'var(--color-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                Очистить
              </button>
              <button onClick={() => { onChange(todayStr); setOpen(false) }}
                style={{ fontSize: 12, color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
                Сегодня
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Task card (inline editor, same design as TeacherHomeworkCreatePage) ─────

function HWTaskCard({ task, index, onUpdate, onDelete }: {
  task: HWTask; index: number
  onUpdate: (t: HWTask) => void
  onDelete: () => void
}) {
  const cfg = TASK_TYPES.find(x => x.type === task.type)!
  const [expanded, setExpanded] = useState(true)
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
        <GripVertical size={13} style={{ color: 'var(--color-text-4)', flexShrink: 0 }} onClick={e => e.stopPropagation()} />
        {task.isHard && <Star size={12} style={{ color: '#F59E0B', fill: '#F59E0B', flexShrink: 0 }} />}
        <div style={{
          fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg,
          borderRadius: 7, padding: '2px 8px', flexShrink: 0,
        }}>
          {index + 1}. {cfg.label}
        </div>
        <div style={{ flex: 1, fontSize: 12, color: 'var(--color-text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {task.question || <span style={{ fontStyle: 'italic' }}>без текста</span>}
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
                placeholder="Условие задания..."
                style={{ ...inputSt, resize: 'none', minHeight: 72, fontSize: 13, lineHeight: 1.55 }}
              />

              {/* Choice options */}
              {task.type === 'choice' && (
                <div>
                  <Label>Варианты ответа</Label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {choices.map((ch, ci) => (
                      <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          onClick={() => {
                            const isCorrect = correctChoices.includes(ci)
                            onUpdate({ ...task, correctChoices: isCorrect ? correctChoices.filter(x => x !== ci) : [...correctChoices, ci] })
                          }}
                          style={{
                            width: 22, height: 22, borderRadius: 6, border: '2px solid',
                            borderColor: correctChoices.includes(ci) ? 'var(--color-accent)' : 'var(--color-border)',
                            background: correctChoices.includes(ci) ? 'var(--color-accent)' : 'transparent',
                            cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          {correctChoices.includes(ci) && <Check size={12} style={{ color: '#fff' }} />}
                        </button>
                        <input
                          value={ch}
                          onChange={e => { const next = [...choices]; next[ci] = e.target.value; onUpdate({ ...task, choices: next }) }}
                          placeholder={`Вариант ${ci + 1}`}
                          style={{ ...inputSt, flex: 1 }}
                        />
                        {choices.length > 2 && (
                          <button
                            onClick={() => {
                              const next = choices.filter((_, i) => i !== ci)
                              const correct = correctChoices.filter(i => i !== ci).map(i => i > ci ? i - 1 : i)
                              onUpdate({ ...task, choices: next, correctChoices: correct })
                            }}
                            style={{ width: 22, height: 22, borderRadius: 6, border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)', flexShrink: 0 }}
                          >
                            <X size={11} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => onUpdate({ ...task, choices: [...choices, ''] })}
                      style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer', fontSize: 12, color: 'var(--color-muted)', fontFamily: 'inherit' }}
                    >
                      <Plus size={12} /> Добавить вариант
                    </button>
                  </div>
                </div>
              )}

              {/* Match pairs */}
              {task.type === 'match' && (
                <div>
                  <Label>Пары для сопоставления</Label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {pairs.map((pair, pi) => (
                      <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          value={pair.left}
                          onChange={e => { const next = [...pairs]; next[pi] = { ...pair, left: e.target.value }; onUpdate({ ...task, pairs: next }) }}
                          placeholder={`Левая ${pi + 1}`}
                          style={{ ...inputSt, flex: 1 }}
                        />
                        <div style={{ color: 'var(--color-text-4)', fontSize: 16, flexShrink: 0 }}>↔</div>
                        <input
                          value={pair.right}
                          onChange={e => { const next = [...pairs]; next[pi] = { ...pair, right: e.target.value }; onUpdate({ ...task, pairs: next }) }}
                          placeholder={`Правая ${pi + 1}`}
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
                      <Plus size={12} /> Добавить пару
                    </button>
                  </div>
                </div>
              )}

              {/* Answer for text / fill */}
              {(task.type === 'text' || task.type === 'fill') && (
                <input
                  value={task.answer ?? ''}
                  onChange={e => onUpdate({ ...task, answer: e.target.value })}
                  placeholder="Эталонный ответ..."
                  style={inputSt}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  )
}

// ─── CENTER: Homework tab (left panel + task list) ────────────────────────────

function CenterHomework({
  lesson, onUpdate,
}: {
  lesson: CELesson
  onUpdate: (updated: CELesson) => void
}) {
  const tasks = lesson.hwTasks ?? []

  function addTask(type: HWTaskType, isHard: boolean) {
    const newTask: HWTask = {
      id: uid(), type, isHard, label: typeLabel[type],
      choices: type === 'choice' ? ['', '', '', ''] : undefined,
      correctChoices: type === 'choice' ? [0] : undefined,
      pairs: type === 'match' ? [{ left: '', right: '' }, { left: '', right: '' }] : undefined,
    }
    onUpdate({ ...lesson, hwTasks: [...tasks, newTask] })
  }

  function removeTask(id: string) {
    onUpdate({ ...lesson, hwTasks: tasks.filter(t => t.id !== id) })
  }

  function updateTask(updated: HWTask) {
    onUpdate({ ...lesson, hwTasks: tasks.map(t => t.id === updated.id ? updated : t) })
  }

  const hardTaskTypes = TASK_TYPES.filter(t => t.type === 'text' || t.type === 'choice')

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Homework meta — top bar */}
      <div style={{ padding: '16px 24px 12px', borderBottom: '1px solid var(--color-border-soft)', flexShrink: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, maxWidth: 500 }}>
          <div>
            <Label>Название задания</Label>
            <input
              value={lesson.hwTitle ?? ''}
              onChange={e => onUpdate({ ...lesson, hwTitle: e.target.value })}
              style={{ ...inputSt, padding: '7px 10px', fontSize: 12 }}
              placeholder="Тема ДЗ"
            />
          </div>
          <div>
            <Label>Срок сдачи</Label>
            <CalendarPicker
              value={lesson.hwDate ?? ''}
              onChange={v => onUpdate({ ...lesson, hwDate: v })}
            />
          </div>
        </div>
      </div>

      {/* Two-column body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left: task type picker */}
        <div style={{
          width: 212, flexShrink: 0,
          borderRight: '1px solid var(--color-border-soft)',
          overflowY: 'auto', padding: '14px 10px',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.8, padding: '0 4px', marginBottom: 4 }}>
            ТИП ЗАДАНИЯ
          </div>
          {TASK_TYPES.map(t => (
            <button key={t.type} onClick={() => addTask(t.type, false)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 10px', borderRadius: 13,
              border: 'none', background: 'var(--color-bg-2)',
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%',
              transition: 'opacity 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <div style={{ width: 34, height: 34, borderRadius: 9, background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <t.Icon size={15} style={{ color: t.color }} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>{t.label}</div>
                <div style={{ fontSize: 10, color: 'var(--color-muted)', marginTop: 1 }}>{t.hint}</div>
              </div>
            </button>
          ))}

          <div style={{ height: 1, background: 'var(--color-border-soft)', margin: '6px 4px' }} />

          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.8, padding: '0 4px', marginBottom: 4 }}>
            СЛОЖНОЕ ЗАДАНИЕ
          </div>
          {hardTaskTypes.map(t => (
            <button key={t.type + '_hard'} onClick={() => addTask(t.type, true)} style={{
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
              <span style={{ fontSize: 12, fontWeight: 700, color: '#B45309' }}>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Right: task list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
          {tasks.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 10 }}>
              <BookOpen size={36} style={{ opacity: 0.15, color: 'var(--color-muted)' }} />
              <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>Выберите тип задания слева</span>
            </div>
          ) : (
            <AnimatePresence>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tasks.map((task, i) => (
                  <HWTaskCard
                    key={task.id}
                    task={task}
                    index={i}
                    onUpdate={updateTask}
                    onDelete={() => removeTask(task.id)}
                  />
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>

      </div>
    </div>
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
  const tasks = lesson.testTasks ?? []
  const [bankOpen, setBankOpen] = useState(false)
  const [bankSearch, setBankSearch] = useState('')
  const bankTasks = useTaskBank(s => s.tasks)
  const loadBank = useTaskBank(s => s.load)
  useEffect(() => { loadBank() }, [loadBank])

  function addTask(type: HWTaskType) {
    const newTask: HWTask = {
      id: uid(), type, isHard: false, label: typeLabel[type],
      choices: type === 'choice' ? ['', '', '', ''] : undefined,
      correctChoices: type === 'choice' ? [0] : undefined,
      pairs: type === 'match' ? [{ left: '', right: '' }, { left: '', right: '' }] : undefined,
    }
    onUpdate({ ...lesson, testTasks: [...tasks, newTask] })
  }
  function addFromBank(bt: BankTask) {
    const newTask: HWTask = { id: uid(), type: 'text', isHard: false, label: typeLabel.text, question: bt.question, answer: bt.answer }
    onUpdate({ ...lesson, testTasks: [...tasks, newTask] })
  }
  function removeTask(id: string) { onUpdate({ ...lesson, testTasks: tasks.filter(t => t.id !== id) }) }
  function updateTask(updated: HWTask) { onUpdate({ ...lesson, testTasks: tasks.map(t => t.id === updated.id ? updated : t) }) }

  const filteredBank = bankSearch.trim()
    ? bankTasks.filter(t => t.question.toLowerCase().includes(bankSearch.toLowerCase()))
    : bankTasks

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '10px 16px 12px', borderBottom: '1px solid var(--color-border-soft)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 999, border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)', fontFamily: 'inherit' }}>
            <ChevronLeft size={13} /> Курс
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 11px', borderRadius: 999, background: 'var(--color-green-soft)', color: 'var(--color-green-text)', fontSize: 11, fontWeight: 700 }}>
            <ClipboardCheck size={12} /> Финальный тест
          </div>
        </div>
        <Label>Название теста</Label>
        <input value={lesson.title} onChange={e => onUpdate({ ...lesson, title: e.target.value })} style={{ ...inputSt, padding: '8px 11px', fontSize: 13 }} placeholder="Например: Контрольная по модулю 1" />
        <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
          <Unlock size={11} /> Откроется у студента автоматически после прохождения предыдущего модуля
        </div>
      </div>

      {/* Two-column body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: question pickers */}
        <div style={{ width: 212, flexShrink: 0, borderRight: '1px solid var(--color-border-soft)', overflowY: 'auto', padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.8, padding: '0 4px', marginBottom: 4 }}>СОСТАВИТЬ ВОПРОС</div>
          {TASK_TYPES.map(t => (
            <button key={t.type} onClick={() => addTask(t.type)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', borderRadius: 13, border: 'none', background: 'var(--color-bg-2)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <t.Icon size={15} style={{ color: t.color }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>{t.label}</span>
            </button>
          ))}
          <button onClick={() => setBankOpen(o => !o)} style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 13, border: '1.5px dashed var(--color-border)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)' }}>
            <BookOpen size={13} /> {bankOpen ? 'Скрыть банк' : 'Из тренажёра'}
          </button>
          {bankOpen && (
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <input value={bankSearch} onChange={e => setBankSearch(e.target.value)} placeholder="Поиск…" style={{ ...inputSt, fontSize: 11, padding: '6px 9px' }} />
              <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
                {filteredBank.slice(0, 60).map(bt => (
                  <button key={bt.id} onClick={() => addFromBank(bt)} style={{ textAlign: 'left', padding: '7px 8px', borderRadius: 9, border: 'none', background: 'var(--color-bg-2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, color: 'var(--color-text-2)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <Plus size={11} style={{ flexShrink: 0, marginTop: 1, color: 'var(--color-accent)' }} />
                    <span style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{bt.question || 'Без текста'}</span>
                  </button>
                ))}
                {filteredBank.length === 0 && <div style={{ fontSize: 11, color: 'var(--color-muted)', padding: '6px 8px' }}>Банк пуст</div>}
              </div>
            </div>
          )}
        </div>

        {/* Right: task list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
          {tasks.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 10 }}>
              <ClipboardCheck size={36} style={{ opacity: 0.15, color: 'var(--color-muted)' }} />
              <span style={{ fontSize: 13, color: 'var(--color-muted)', textAlign: 'center', maxWidth: 240 }}>Добавьте вопросы слева — составьте сами или возьмите из тренажёра</span>
            </div>
          ) : (
            <AnimatePresence>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tasks.map((task, i) => (
                  <HWTaskCard key={task.id} task={task} index={i} onUpdate={updateTask} onDelete={() => removeTask(task.id)} />
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── CENTER: Lesson-level students tab ───────────────────────────────────────

function CenterLessonStudents({
  lesson, onUpdate, course, groups, allStudents,
}: {
  lesson: CELesson
  onUpdate: (updated: CELesson) => void
  course: CourseEdData
  groups: Array<{ id: string; name: string }>
  allStudents: Array<{ id: string; name: string; groupId?: string }>
}) {
  const [addTab, setAddTab] = useState<'group' | 'student'>('student')

  const extraGroupIds = lesson.extraGroupIds ?? []
  const extraStudentIds = lesson.extraStudentIds ?? []

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

  const courseGroups = groups.filter(g => course.groupIds.includes(g.id))
  const courseStudents = allStudents.filter(s => course.studentIds.includes(s.id))
  const extraGroups = groups.filter(g => extraGroupIds.includes(g.id))
  const extraStudentsList = allStudents.filter(s => extraStudentIds.includes(s.id))

  // Students who are in course groups
  const courseGroupStudents = allStudents.filter(s => courseGroups.some(g => g.id === s.groupId))
  const totalBaseline = new Set([...courseGroupStudents.map(s => s.id), ...courseStudents.map(s => s.id)])

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 36px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Baseline inherited from course */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-muted)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-2)' }}>
              Базовая аудитория курса
            </span>
            <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>· {totalBaseline.size} уч.</span>
          </div>
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
            {totalBaseline.size === 0 && (
              <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                Никто не назначен на курс — задайте аудиторию в настройках курса
              </span>
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--color-border-soft)' }} />

        {/* Extra audience for this lesson */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-accent)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
              Дополнительно для этого урока
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
            Добавьте учеников или группы, которые получат доступ к этому уроку сверх базовой аудитории курса.
          </p>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {(['student', 'group'] as const).map(tab => (
              <button key={tab} onClick={() => setAddTab(tab)} style={{
                padding: '5px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 700,
                background: addTab === tab ? 'var(--color-purple-soft)' : 'var(--color-bg-3)',
                color: addTab === tab ? 'var(--color-accent)' : 'var(--color-text-2)',
                transition: 'all 0.15s', fontFamily: 'inherit',
              }}>
                {tab === 'group' ? 'Группу' : 'Ученика'}
              </button>
            ))}
          </div>

          {addTab === 'student' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {allStudents.filter(s => !totalBaseline.has(s.id)).map(s => (
                <button key={s.id} onClick={() => toggleExtraStudent(s.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '8px 12px', borderRadius: 11,
                  border: extraStudentIds.includes(s.id) ? '1.5px solid var(--color-accent)' : '1.5px solid var(--color-border)',
                  background: extraStudentIds.includes(s.id) ? 'var(--color-purple-soft)' : 'transparent',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.14s',
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: extraStudentIds.includes(s.id) ? 'var(--color-accent)' : 'var(--color-bg-3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                    color: extraStudentIds.includes(s.id) ? '#fff' : 'var(--color-muted)', flexShrink: 0,
                  }}>
                    {s.name.slice(0, 1).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, flex: 1, textAlign: 'left', color: extraStudentIds.includes(s.id) ? 'var(--color-accent)' : 'var(--color-text)' }}>
                    {s.name}
                  </span>
                  {extraStudentIds.includes(s.id) && <X size={11} style={{ color: 'var(--color-accent)' }} />}
                </button>
              ))}
              {allStudents.filter(s => !totalBaseline.has(s.id)).length === 0 && (
                <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>Все ученики уже в базовой аудитории</span>
              )}
            </div>
          )}

          {addTab === 'group' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {groups.filter(g => !course.groupIds.includes(g.id)).map(g => (
                <button key={g.id} onClick={() => toggleExtraGroup(g.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '8px 12px', borderRadius: 11,
                  border: extraGroupIds.includes(g.id) ? '1.5px solid var(--color-accent)' : '1.5px solid var(--color-border)',
                  background: extraGroupIds.includes(g.id) ? 'var(--color-purple-soft)' : 'transparent',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.14s',
                }}>
                  <Users size={13} style={{ color: extraGroupIds.includes(g.id) ? 'var(--color-accent)' : 'var(--color-muted)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, flex: 1, textAlign: 'left', color: extraGroupIds.includes(g.id) ? 'var(--color-accent)' : 'var(--color-text)' }}>
                    {g.name}
                  </span>
                  {extraGroupIds.includes(g.id) && <X size={11} style={{ color: 'var(--color-accent)' }} />}
                </button>
              ))}
              {groups.filter(g => !course.groupIds.includes(g.id)).length === 0 && (
                <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>Все группы уже в базовой аудитории</span>
              )}
            </div>
          )}

          {/* Extra summary chips */}
          {(extraGroups.length > 0 || extraStudentsList.length > 0) && (
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {extraGroups.map(g => (
                <div key={g.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, background: 'var(--color-purple-soft)', fontSize: 12, fontWeight: 600, color: 'var(--color-accent)' }}>
                  <Users size={10} /> {g.name}
                </div>
              ))}
              {extraStudentsList.map(s => (
                <div key={s.id} style={{ padding: '4px 10px', borderRadius: 999, background: 'var(--color-purple-soft)', fontSize: 12, fontWeight: 600, color: 'var(--color-accent)' }}>
                  {s.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── RIGHT panel: always lesson list ─────────────────────────────────────────

function LessonRow({
  lesson, selected, onSelect, onDelete,
}: {
  lesson: CELesson; selected: boolean; onSelect: () => void; onDelete: () => void
}) {
  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 10px', borderRadius: 10, border: 'none', cursor: 'pointer',
        background: selected ? 'var(--color-purple-soft)' : 'transparent',
        transition: 'background 0.13s', fontFamily: 'inherit', textAlign: 'left',
        marginBottom: 2,
      }}
    >
      <div style={{
        width: 24, height: 24, borderRadius: 7, flexShrink: 0,
        background: lesson.kind === 'test'
          ? (selected ? 'var(--color-green-text)' : 'var(--color-green-soft)')
          : (selected ? 'var(--color-accent)' : 'var(--color-bg-3)'),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700,
        color: lesson.kind === 'test'
          ? (selected ? '#fff' : 'var(--color-green-text)')
          : (selected ? '#fff' : 'var(--color-muted)'),
      }}>
        {lesson.kind === 'test' ? <ClipboardCheck size={13} /> : lesson.number}
      </div>
      <span style={{
        flex: 1, fontSize: 12, fontWeight: selected ? 700 : 500,
        color: selected ? (lesson.kind === 'test' ? 'var(--color-green-text)' : 'var(--color-accent)') : 'var(--color-text)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {lesson.title || (lesson.kind === 'test' ? 'Тест без названия' : 'Урок без названия')}
      </span>
      {/* When selected — trash to delete; otherwise indicator dots */}
      {selected ? (
        <div
          role="button"
          aria-label="Удалить"
          title="Удалить"
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
            ? (lesson.testTasks?.length ?? 0) > 0 && <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-green-text)', opacity: 0.7 }} title="Вопросы" />
            : <>
                {lesson.videoUrl && <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-accent)', opacity: 0.7 }} title="Запись" />}
                {(lesson.hwTasks?.length ?? 0) > 0 && <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-green-text)', opacity: 0.7 }} title="ДЗ" />}
                {((lesson.extraStudentIds?.length ?? 0) + (lesson.extraGroupIds?.length ?? 0)) > 0 && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#F59E0B', opacity: 0.7 }} title="Доп. ученики" />}
              </>}
        </div>
      )}
    </motion.button>
  )
}

function RightPanelLessons({
  course, setCourse, selectedLessonId, onSelectLesson,
}: {
  course: CourseEdData
  setCourse: React.Dispatch<React.SetStateAction<CourseEdData>>
  selectedLessonId: string | null
  onSelectLesson: (id: string) => void
}) {
  const [newTitle, setNewTitle] = useState('')
  const [addingModule, setAddingModule] = useState(false)
  const [newModuleLabel, setNewModuleLabel] = useState('')
  const [dragging, setDragging] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<{ moduleId: string; index: number } | null>(null)

  function addLesson() {
    const t = newTitle.trim()
    if (!t) return
    const lessonId = uid()
    const lesson: CELesson = { id: lessonId, title: t, number: course.lessons.length + 1 }
    setCourse(c => {
      const updatedLessons = [...c.lessons, lesson]
      if (c.modules.length > 0) {
        const mods = c.modules.map((m, i) =>
          i === c.modules.length - 1 ? { ...m, lessonIds: [...m.lessonIds, lessonId] } : m
        )
        return { ...c, lessons: updatedLessons, modules: mods }
      }
      return { ...c, lessons: updatedLessons }
    })
    setNewTitle('')
    onSelectLesson(lessonId)
  }

  function addTest() {
    const lessonId = uid()
    const test: CELesson = {
      id: lessonId, title: 'Финальный тест', number: course.lessons.length + 1,
      kind: 'test', testTasks: [],
    }
    setCourse(c => {
      const updatedLessons = [...c.lessons, test]
      if (c.modules.length > 0) {
        const mods = c.modules.map((m, i) =>
          i === c.modules.length - 1 ? { ...m, lessonIds: [...m.lessonIds, lessonId] } : m
        )
        return { ...c, lessons: updatedLessons, modules: mods }
      }
      return { ...c, lessons: updatedLessons }
    })
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
    <div style={{ height: 2, background: 'var(--color-accent)', borderRadius: 2, margin: '2px 0', pointerEvents: 'none' }} />
  )

  const groupedIds = new Set(course.modules.flatMap(m => m.lessonIds))
  const ungrouped = course.lessons.filter(l => !groupedIds.has(l.id))

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      onDragEnd={clearDrag}
    >
      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--color-border-soft)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Уроки</span>
        <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>{course.lessons.length} шт.</span>
      </div>

      <div
        style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}
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
            <LessonRow lesson={l} selected={l.id === selectedLessonId} onSelect={() => onSelectLesson(l.id)} onDelete={() => deleteLesson(l.id)} />
          </div>
        ))}

        {course.modules.map(mod => {
          const modLessons = mod.lessonIds
            .map(id => course.lessons.find(l => l.id === id))
            .filter(Boolean) as CELesson[]
          const isTarget = dropTarget?.moduleId === mod.id
          return (
            <div key={mod.id} style={{ marginBottom: 6 }}>
              <button
                onClick={() => toggleModule(mod.id)}
                onDragOver={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (!mod.expanded) {
                    setCourse(c => ({ ...c, modules: c.modules.map(m => m.id === mod.id ? { ...m, expanded: true } : m) }))
                  }
                  setDropTarget({ moduleId: mod.id, index: modLessons.length })
                }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 10px', borderRadius: 10, border: 'none',
                  background: dragging && isTarget && !mod.expanded ? 'var(--color-purple-soft)' : 'var(--color-bg-2)',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.13s',
                }}
              >
                <ChevronDown
                  size={13}
                  style={{
                    color: 'var(--color-muted)', flexShrink: 0,
                    transform: mod.expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                    transition: 'transform 0.18s ease',
                  }}
                />
                <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: 'var(--color-text)', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {mod.label}
                </span>
                <span style={{ fontSize: 10, color: 'var(--color-muted)', flexShrink: 0 }}>{modLessons.length}</span>
              </button>
              <AnimatePresence>
                {mod.expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    style={{ overflow: 'hidden', paddingLeft: 10 }}
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
                        : <div style={{ fontSize: 11, color: 'var(--color-muted)', padding: '6px 10px', fontStyle: 'italic' }}>Нет уроков</div>
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
                              <LessonRow lesson={l} selected={l.id === selectedLessonId} onSelect={() => onSelectLesson(l.id)} onDelete={() => deleteLesson(l.id)} />
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
            Уроки ещё не добавлены
          </div>
        )}
      </div>

      <div style={{ padding: '10px 12px', borderTop: '1px solid var(--color-border-soft)', flexShrink: 0 }}>
        {addingModule ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input
              value={newModuleLabel}
              onChange={e => setNewModuleLabel(e.target.value)}
              placeholder="Название модуля"
              style={{ ...inputSt, fontSize: 12, padding: '7px 10px' }}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') addModule(); if (e.key === 'Escape') setAddingModule(false) }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setAddingModule(false)}
                style={{ flex: 1, padding: '6px 0', borderRadius: 9, border: '1.5px solid var(--color-border)', background: 'transparent', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--color-text-2)', fontFamily: 'inherit' }}>
                Отмена
              </button>
              <button onClick={addModule}
                style={{ flex: 1, padding: '6px 0', borderRadius: 9, border: 'none', background: 'var(--color-purple-soft)', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: 'var(--color-accent)', fontFamily: 'inherit' }}>
                Создать
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Название урока…"
                style={{ ...inputSt, fontSize: 12, padding: '7px 10px' }}
                onKeyDown={e => { if (e.key === 'Enter') addLesson() }}
              />
              <button onClick={addLesson} style={{
                width: 32, height: 32, borderRadius: 9, border: 'none',
                background: 'var(--color-purple-soft)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-accent)', flexShrink: 0,
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
                <Layers size={11} /> Модуль
              </button>
              <button onClick={addTest} style={{
                flex: 1, padding: '6px 0', borderRadius: 9,
                border: '1.5px dashed var(--color-green-text)', background: 'transparent',
                cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--color-green-text)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: 'inherit',
              }}>
                <ClipboardCheck size={11} /> Тест
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
  { id: 'recording', label: 'Запись' },
  { id: 'lesson',    label: 'Урок' },
  { id: 'homework',  label: 'Домашки' },
  { id: 'students',  label: 'Ученики' },
]

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TeacherCourseEditorPage() {
  const { setActivePage, editingCourseJson, setCourseEdited } = useTeacher()
  const { groups } = useGroups()
  const allStudents = useAllStudents()

  const [course, setCourse] = useState<CourseEdData>(() => {
    if (!editingCourseJson) {
      return {
        id: uid(), title: '', subject: 'Химия', level: 'ЕГЭ', status: 'draft',
        color: 'var(--color-purple)', bg: 'var(--color-purple-soft)',
        groupIds: [], studentIds: [],
        modules: [{ id: uid(), label: 'Модуль 1', expanded: true, lessonIds: [] }],
        lessons: [],
      }
    }
    return JSON.parse(editingCourseJson) as CourseEdData
  })

  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [lessonMode, setLessonMode] = useState<LessonMode>('recording')
  const [openingLesson, setOpeningLesson] = useState(false)
  const [openedLessonId, setOpenedLessonId] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)

  async function openLessonForStudents(lessonNumber: number) {
    if (!course.dbCourseId) return
    setOpeningLesson(true)
    try {
      const { data: courseRow } = await supabase
        .from('courses')
        .select('lessons(short_id, lesson_number)')
        .eq('short_id', course.dbCourseId)
        .single()
      const lessons = (courseRow?.lessons ?? []) as Array<{ short_id: string; lesson_number: number }>
      const lessonShortId = lessons.find(l => l.lesson_number === lessonNumber)?.short_id
      if (!lessonShortId) return
      await supabase
        .from('lesson_progress')
        .update({ status: 'current' })
        .eq('lesson_ref', lessonShortId)
        .eq('status', 'locked')
      setOpenedLessonId(selectedLessonId)
      setTimeout(() => setOpenedLessonId(null), 3000)
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
    setLessonMode('recording')
  }

  function handleBack() {
    setCourseEdited(JSON.stringify(course))
    setActivePage('constructor')
  }

  function flash() {
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2000)
  }

  async function syncAccessToSupabase(c: CourseEdData) {
    const shortId = c.dbCourseId ?? c.id

    const { data: courseUpsert } = await supabase
      .from('courses')
      .upsert(
        {
          short_id: shortId,
          title: c.title, subject: c.subject, level: c.level,
          description: c.description ?? '',
          status: c.status, color: c.color, bg: c.bg,
          group_ids: c.groupIds, student_ids: c.studentIds,
        },
        { onConflict: 'short_id' }
      )
      .select('id')
      .single()

    const courseDbId = courseUpsert?.id
    if (!courseDbId) return

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

    // 3. Upsert lessons with stable short_id (= `${shortId}-${globalIndex}`),
    //    preserving lesson_progress (keyed by short_id, not FK).
    const lessonRows = ordered.map(({ lesson, moduleLocalId }, i) => ({
      short_id: `${shortId}-${i}`,
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
    }))
    if (lessonRows.length > 0) {
      await supabase.from('lessons').upsert(lessonRows, { onConflict: 'short_id' })
    }
    // 4. Drop lessons removed in the editor (schedule_lessons.lesson_id → SET NULL).
    const keepShortIds = lessonRows.map(r => r.short_id)
    let delQuery = supabase.from('lessons').delete().eq('course_id', courseDbId)
    if (keepShortIds.length > 0) delQuery = delQuery.not('short_id', 'in', `(${keepShortIds.join(',')})`)
    await delQuery

    // Map each editor lesson to its persisted global index for scheduling below.
    const lessonIndexById: Record<string, number> = {}
    ordered.forEach(({ lesson }, i) => { lessonIndexById[lesson.id] = i })

    // Sync scheduled lessons to calendar
    const scheduledLessons = c.lessons.filter(l => l.scheduledDate && l.scheduledTime)
    if (scheduledLessons.length === 0 || c.groupIds.length === 0) return

    // Fetch course row + lessons from DB to get UUIDs
    const { data: courseRow } = await supabase
      .from('courses')
      .select('id, lessons(id, lesson_number, title)')
      .eq('short_id', shortId)
      .single()
    if (!courseRow) return

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
      const isoDate = dotToIso(lesson.scheduledDate!)
      const timeStart = lesson.scheduledTime!
      const timeEnd = addMinutes(timeStart, lesson.scheduledDuration ?? 90)
      for (const groupId of c.groupIds) {
        rows.push({
          lesson_id: dbLesson.id,
          group_id: groupId,
          date: isoDate,
          time_start: timeStart,
          time_end: timeEnd,
          lesson_title: lesson.title || dbLesson.title,
          lesson_number: lesson.number,
          subject: c.subject,
          status: 'scheduled',
        })
      }
    }

    if (rows.length > 0) {
      // Delete stale entries for these lessons first, then insert fresh
      const lessonIds = [...new Set(rows.map((r: any) => r.lesson_id))]
      await supabase
        .from('schedule_lessons')
        .delete()
        .in('lesson_id', lessonIds)
      await supabase
        .from('schedule_lessons')
        .insert(rows)
    }
  }

  function handleSave(overrideCourse?: CourseEdData) {
    const c = overrideCourse ?? course
    setCourseEdited(JSON.stringify(c))
    syncAccessToSupabase(c)
    flash()
  }

  function handlePublish() {
    const updated = { ...course, status: 'published' as const }
    setCourse(updated)
    setCourseEdited(JSON.stringify(updated))
    syncAccessToSupabase(updated)
    flash()
  }

  function handleUnpublish() {
    const updated = { ...course, status: 'draft' as const }
    setCourse(updated)
    setCourseEdited(JSON.stringify(updated))
    syncAccessToSupabase(updated)
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

  const courseTitle = course.title || 'Создать курс'

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
                <ArrowLeft size={15} strokeWidth={2} /> Назад
              </motion.button>
              <div style={{ flexShrink: 1, minWidth: 0, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '9px 16px', borderRadius: 999, ...dockGlass, fontSize: 14, fontWeight: 700, color: 'var(--color-text)', pointerEvents: 'auto' }}>
                {courseTitle}
              </div>
              <div style={{ flexGrow: 1 }} />
              {course.status !== 'published' ? (
                <button onClick={() => handleSave()} style={{ flexShrink: 0, padding: '9px 16px', borderRadius: 999, ...dockGlass, cursor: 'pointer', fontSize: 13.5, fontWeight: 600, color: 'var(--color-muted)', fontFamily: 'inherit', pointerEvents: 'auto' }}>
                  Черновик
                </button>
              ) : (
                <button onClick={handleUnpublish} style={{ flexShrink: 0, padding: '9px 16px', borderRadius: 999, ...dockGlass, cursor: 'pointer', fontSize: 13.5, fontWeight: 600, color: 'var(--color-muted)', fontFamily: 'inherit', pointerEvents: 'auto' }}>
                  В черновик
                </button>
              )}
              <TeacherSaveButton
                label={course.status === 'published' ? 'Сохранить' : 'Опубликовать'}
                savedLabel={course.status === 'published' ? 'Сохранено!' : 'Опубликовано!'}
                icon={<Send size={14} />}
                saved={savedFlash}
                onClick={course.status === 'published' ? () => handleSave() : handlePublish}
                style={{ boxShadow: '0 6px 20px rgba(99,84,207,0.32)', pointerEvents: 'auto' }} />
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
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={handleBack}
          style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, padding: '9px 16px 9px 12px', borderRadius: 999, border: '1px solid var(--color-border-soft)', background: 'rgba(var(--glass-rgb), 0.96)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', color: 'var(--color-text)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <ArrowLeft size={15} strokeWidth={2} /> Назад
        </motion.button>
        <div style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>{courseTitle}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {course.status !== 'published' ? (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => handleSave()}
              style={{ padding: '9px 18px', borderRadius: 999, border: '1px solid var(--color-border-soft)', background: 'rgba(var(--glass-rgb), 0.96)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', color: 'var(--color-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
              Черновик
            </motion.button>
          ) : (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleUnpublish}
              style={{ padding: '9px 18px', borderRadius: 999, border: '1px solid var(--color-border-soft)', background: 'rgba(var(--glass-rgb), 0.96)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', color: 'var(--color-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
              В черновик
            </motion.button>
          )}
          <TeacherSaveButton
            label={course.status === 'published' ? 'Сохранить' : 'Опубликовать'}
            savedLabel={course.status === 'published' ? 'Сохранено!' : 'Опубликовано!'}
            icon={<Send size={14} />}
            saved={savedFlash}
            onClick={course.status === 'published' ? () => handleSave() : handlePublish}
            style={{ boxShadow: '0 6px 20px rgba(99,84,207,0.32)' }} />
        </div>
      </motion.div>

      {/* ── 2-column body ── */}
      <div style={{ display: 'flex', gap: 14, padding: '4px 20px 24px', minHeight: 'calc(100vh - 100px)' }}>

        {/* CENTER */}
        <GlassCard style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <AnimatePresence mode="wait">
            {!selectedLesson ? (
              /* ── Course meta view ── */
              <motion.div key="course-meta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <CenterCourseMeta
                  course={course} setCourse={setCourse}
                  groups={groups} allStudents={allStudents}
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
                    <button onClick={() => setSelectedLessonId(null)} style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '5px 10px', borderRadius: 999, border: 'none',
                      background: 'var(--color-bg-3)', cursor: 'pointer',
                      fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)',
                      fontFamily: 'inherit',
                    }}>
                      <ChevronLeft size={13} /> Курс
                    </button>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {selectedLesson.title || 'Урок без названия'}
                    </span>
                    {course.dbCourseId && (() => {
                      const isOpened = openedLessonId === selectedLesson.id
                      return (
                        <motion.button
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => openLessonForStudents(selectedLesson.number)}
                          disabled={openingLesson}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '6px 14px', borderRadius: 999, border: 'none',
                            background: isOpened
                              ? 'linear-gradient(135deg, #4ADE80, #22C55E)'
                              : 'var(--grad-purple)',
                            color: '#fff',
                            fontSize: 12, fontWeight: 700,
                            cursor: openingLesson ? 'wait' : 'pointer',
                            fontFamily: 'inherit', flexShrink: 0,
                            boxShadow: isOpened
                              ? '0 4px 14px rgba(74,222,128,0.35)'
                              : '0 4px 14px rgba(123,97,255,0.35)',
                            transition: 'background 0.3s, box-shadow 0.3s',
                            opacity: openingLesson ? 0.7 : 1,
                          }}
                        >
                          {isOpened
                            ? <><Check size={13} /> Открыт</>
                            : <><Unlock size={13} /> Открыть урок</>
                          }
                        </motion.button>
                      )
                    })()}
                  </div>
                  <div style={{ display: 'flex', background: 'var(--color-bg-3)', borderRadius: 12, padding: 3, gap: 2 }}>
                    {LESSON_MODES.map(m => (
                      <button key={m.id} onClick={() => setLessonMode(m.id)} style={{
                        flex: 1, padding: '7px 10px', borderRadius: 9,
                        border: 'none', cursor: 'pointer',
                        background: lessonMode === m.id ? 'var(--color-purple-soft)' : 'transparent',
                        color: lessonMode === m.id ? 'var(--color-accent)' : 'var(--color-text)',
                        fontSize: 13, fontWeight: 600, transition: 'all 0.15s', fontFamily: 'inherit',
                      }}>
                        {m.label}
                      </button>
                    ))}
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
                      <CenterHomework lesson={selectedLesson} onUpdate={updateLesson} />
                    )}
                    {lessonMode === 'students' && (
                      <CenterLessonStudents
                        lesson={selectedLesson} onUpdate={updateLesson}
                        course={course} groups={groups} allStudents={allStudents}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
                </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>

        {/* RIGHT: always lesson list */}
        <GlassCard style={{ width: 288, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <RightPanelLessons
            course={course} setCourse={setCourse}
            selectedLessonId={selectedLessonId} onSelectLesson={handleSelectLesson}
          />
        </GlassCard>

      </div>
    </div>
  )
}
