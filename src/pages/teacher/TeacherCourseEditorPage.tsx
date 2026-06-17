import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Plus, Send, Video, Link2, Upload,
  BookOpen, AlignLeft, CheckSquare, Type, Shuffle,
  PenLine, Star, ChevronRight, ChevronDown, Users,
  X, FileText, NotebookPen, FolderOpen, Layers,
  GripVertical, ChevronLeft, Unlock, Check,
} from 'lucide-react'
import { useTeacher } from '../../store/teacherStore'
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
}

export interface CELesson {
  id: string
  title: string
  number: number
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
                background: assignTab === tab ? 'var(--color-accent)' : 'var(--color-bg-3)',
                color: assignTab === tab ? '#fff' : 'var(--color-text-2)',
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
              style={{ flex: 1, padding: '9px 18px', borderRadius: 12, border: 'none', background: 'var(--color-accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
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
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 14, border: 'none', background: 'var(--color-accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640, margin: '0 auto' }}>
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

// ─── CENTER: Homework tab (left panel + task list) ────────────────────────────

function CenterHomework({
  lesson, onUpdate,
}: {
  lesson: CELesson
  onUpdate: (updated: CELesson) => void
}) {
  const tasks = lesson.hwTasks ?? []

  function addTask(type: HWTaskType, isHard: boolean) {
    const newTask: HWTask = { id: uid(), type, isHard, label: typeLabel[type] }
    onUpdate({ ...lesson, hwTasks: [...tasks, newTask] })
  }

  function removeTask(id: string) {
    onUpdate({ ...lesson, hwTasks: tasks.filter(t => t.id !== id) })
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
            <input
              type="date"
              value={lesson.hwDate ?? ''}
              onChange={e => onUpdate({ ...lesson, hwDate: e.target.value })}
              style={{ ...inputSt, padding: '7px 10px', fontSize: 12 }}
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
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {tasks.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 180, gap: 10 }}>
              <BookOpen size={36} style={{ opacity: 0.2, color: 'var(--color-muted)' }} />
              <span style={{ fontSize: 14, color: 'var(--color-muted)' }}>Нажмите «+ Задание», чтобы добавить</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tasks.map((task, i) => {
                const t = TASK_TYPES.find(x => x.type === task.type)
                return (
                  <div key={task.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
                    background: 'var(--color-bg-2)', borderRadius: 14,
                    border: task.isHard ? '1.5px solid var(--color-yellow-text,#B45309)' : '1px solid var(--color-border-soft)',
                  }}>
                    <GripVertical size={14} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
                    {task.isHard && <Star size={13} style={{ color: '#F59E0B', fill: '#F59E0B', flexShrink: 0 }} />}
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: t?.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {t && <t.Icon size={13} style={{ color: t.color }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>Задание {i + 1}</span>
                      <span style={{ fontSize: 12, color: 'var(--color-muted)', marginLeft: 6 }}>
                        {typeLabel[task.type]}{task.isHard && ' · Сложный уровень'}
                      </span>
                    </div>
                    <button onClick={() => removeTask(task.id)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-muted)', display: 'flex', padding: 2 }}>
                      <X size={13} />
                    </button>
                  </div>
                )
              })}
            </div>
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
                background: addTab === tab ? 'var(--color-accent)' : 'var(--color-bg-3)',
                color: addTab === tab ? '#fff' : 'var(--color-text-2)',
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
  lesson, selected, onSelect,
}: {
  lesson: CELesson; selected: boolean; onSelect: () => void
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
        background: selected ? 'var(--color-accent)' : 'var(--color-bg-3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700, color: selected ? '#fff' : 'var(--color-muted)',
      }}>
        {lesson.number}
      </div>
      <span style={{
        flex: 1, fontSize: 12, fontWeight: selected ? 700 : 500,
        color: selected ? 'var(--color-accent)' : 'var(--color-text)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {lesson.title || 'Урок без названия'}
      </span>
      {/* indicator dots */}
      <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
        {lesson.videoUrl && <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-accent)', opacity: 0.7 }} title="Запись" />}
        {(lesson.hwTasks?.length ?? 0) > 0 && <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-green-text)', opacity: 0.7 }} title="ДЗ" />}
        {((lesson.extraStudentIds?.length ?? 0) + (lesson.extraGroupIds?.length ?? 0)) > 0 && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#F59E0B', opacity: 0.7 }} title="Доп. ученики" />}
      </div>
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

  const groupedIds = new Set(course.modules.flatMap(m => m.lessonIds))
  const ungrouped = course.lessons.filter(l => !groupedIds.has(l.id))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--color-border-soft)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Уроки</span>
        <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>{course.lessons.length} шт.</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
        {ungrouped.map(l => (
          <LessonRow key={l.id} lesson={l} selected={l.id === selectedLessonId} onSelect={() => onSelectLesson(l.id)} />
        ))}

        {course.modules.map(mod => {
          const modLessons = mod.lessonIds
            .map(id => course.lessons.find(l => l.id === id))
            .filter(Boolean) as CELesson[]
          return (
            <div key={mod.id} style={{ marginBottom: 6 }}>
              <button onClick={() => toggleModule(mod.id)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 10px', borderRadius: 10, border: 'none',
                background: 'var(--color-bg-2)', cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {mod.expanded
                  ? <ChevronDown size={12} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
                  : <ChevronRight size={12} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />}
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
                  >
                    {modLessons.map(l => (
                      <LessonRow key={l.id} lesson={l} selected={l.id === selectedLessonId} onSelect={() => onSelectLesson(l.id)} />
                    ))}
                    {modLessons.length === 0 && (
                      <div style={{ fontSize: 11, color: 'var(--color-muted)', padding: '6px 10px', fontStyle: 'italic' }}>
                        Нет уроков
                      </div>
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
            <button onClick={() => setAddingModule(true)} style={{
              width: '100%', padding: '6px 0', borderRadius: 9,
              border: '1.5px dashed var(--color-border)', background: 'transparent',
              cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: 'inherit',
            }}>
              <Layers size={11} /> Создать модуль
            </button>
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
        color: '#B98FFF', bg: 'var(--color-purple-soft)',
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

  function handleSave(overrideCourse?: CourseEdData) {
    setCourseEdited(JSON.stringify(overrideCourse ?? course))
    flash()
  }

  function handlePublish() {
    const updated = { ...course, status: 'published' as const }
    setCourse(updated)
    setCourseEdited(JSON.stringify(updated))
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
              {course.status !== 'published' && (
                <button onClick={() => handleSave()} style={{ flexShrink: 0, padding: '9px 16px', borderRadius: 999, ...dockGlass, cursor: 'pointer', fontSize: 13.5, fontWeight: 600, color: 'var(--color-muted)', fontFamily: 'inherit', pointerEvents: 'auto' }}>
                  Черновик
                </button>
              )}
              <TeacherSaveButton
                label={course.status === 'published' ? 'Сохранить' : 'Опубликовать'}
                savedLabel={course.status === 'published' ? 'Сохранено!' : 'Опубликовано!'}
                icon={<Send size={14} />}
                saved={savedFlash}
                onClick={course.status === 'published' ? () => handleSave() : handlePublish}
                style={{ boxShadow: '0 6px 20px rgba(123,63,204,0.32)', pointerEvents: 'auto' }} />
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
          {course.status !== 'published' && (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => handleSave()}
              style={{ padding: '9px 18px', borderRadius: 999, border: '1px solid var(--color-border-soft)', background: 'rgba(var(--glass-rgb), 0.96)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', color: 'var(--color-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
              Черновик
            </motion.button>
          )}
          <TeacherSaveButton
            label={course.status === 'published' ? 'Сохранить' : 'Опубликовать'}
            savedLabel={course.status === 'published' ? 'Сохранено!' : 'Опубликовано!'}
            icon={<Send size={14} />}
            saved={savedFlash}
            onClick={course.status === 'published' ? () => handleSave() : handlePublish}
            style={{ boxShadow: '0 6px 20px rgba(123,63,204,0.32)' }} />
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
                              : 'linear-gradient(135deg, #C58BFF, #7B61FF)',
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
