import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Plus, Send, Video, Link2, Upload,
  BookOpen, AlignLeft, CheckSquare, Type, Shuffle,
  PenLine, Star, ChevronRight, ChevronDown, Users,
  X, FileText, NotebookPen, FolderOpen, Layers,
  GripVertical,
} from 'lucide-react'
import { useTeacher } from '../../store/teacherStore'
import { useGroups, useAllStudents } from '../../lib/useGroups'
import TeacherSelect from '../../components/teacher/TeacherSelect'

// ─── Types ────────────────────────────────────────────────────────────────────

type LessonMode = 'recording' | 'lesson' | 'homework' | 'students'

export interface CELesson {
  id: string
  title: string
  number: number
  videoUrl?: string
  description?: string
  notebookFile?: string
  workbookFile?: string
  materialFile?: string
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

type HWTaskType = 'text' | 'choice' | 'fill' | 'match' | 'whiteboard'

interface HWTask {
  id: string
  type: HWTaskType
  isHard: boolean
  label: string
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

// ─── Left panel — default (course meta) ──────────────────────────────────────

function LeftPanelCourse({
  course, setCourse, groups,
}: {
  course: CourseEdData
  setCourse: React.Dispatch<React.SetStateAction<CourseEdData>>
  groups: Array<{ id: string; name: string }>
}) {
  const [assignTab, setAssignTab] = useState<'group' | 'student'>('group')

  function toggleGroup(id: string) {
    setCourse(c => ({
      ...c,
      groupIds: c.groupIds.includes(id) ? c.groupIds.filter(x => x !== id) : [...c.groupIds, id],
    }))
  }

  const assigned = groups.filter(g => course.groupIds.includes(g.id))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '18px 16px' }}>
      <div>
        <Label>Название курса</Label>
        <input
          value={course.title}
          onChange={e => setCourse(c => ({ ...c, title: e.target.value }))}
          style={inputSt}
          placeholder="Например: ЕГЭ по Химии"
        />
      </div>

      <div>
        <Label>Кому</Label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {(['group', 'student'] as const).map(tab => (
            <button key={tab} onClick={() => setAssignTab(tab)} style={{
              flex: 1, padding: '6px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
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
                padding: '8px 12px', borderRadius: 11,
                border: course.groupIds.includes(g.id) ? '1.5px solid var(--color-accent)' : '1.5px solid var(--color-border)',
                background: course.groupIds.includes(g.id) ? 'var(--color-purple-soft)' : 'transparent',
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.14s',
              }}>
                <Users size={13} style={{ color: course.groupIds.includes(g.id) ? 'var(--color-accent)' : 'var(--color-muted)', flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: course.groupIds.includes(g.id) ? 'var(--color-accent)' : 'var(--color-text)' }}>
                  {g.name}
                </span>
                {course.groupIds.includes(g.id) && (
                  <X size={11} style={{ color: 'var(--color-accent)', marginLeft: 'auto' }} />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {assigned.length > 0 && (
        <div>
          <Label>Зачислено</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {assigned.map(g => (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 11px', background: 'var(--color-bg-2)', borderRadius: 11 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-accent)', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>{g.name}</span>
                <button onClick={() => toggleGroup(g.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-muted)', padding: 2, display: 'flex' }}>
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <Label>Описание курса</Label>
        <textarea
          value={course.description ?? ''}
          onChange={e => setCourse(c => ({ ...c, description: e.target.value }))}
          style={{ ...inputSt, resize: 'none', minHeight: 72, lineHeight: 1.5 }}
          placeholder="Краткое описание…"
        />
      </div>
    </div>
  )
}

// ─── Left panel — homework mode ───────────────────────────────────────────────

function LeftPanelHomework({
  hwTitle, setHwTitle, hwTarget, setHwTarget,
  hwDate, setHwDate, hwTimeStart, setHwTimeStart, hwTimeEnd, setHwTimeEnd,
  groups,
}: {
  hwTitle: string; setHwTitle: (v: string) => void
  hwTarget: string; setHwTarget: (v: string) => void
  hwDate: string; setHwDate: (v: string) => void
  hwTimeStart: string; setHwTimeStart: (v: string) => void
  hwTimeEnd: string; setHwTimeEnd: (v: string) => void
  groups: Array<{ id: string; name: string }>
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '18px 16px' }}>
      <div>
        <Label>Название задания</Label>
        <input value={hwTitle} onChange={e => setHwTitle(e.target.value)} style={inputSt} placeholder="Тема задания" />
      </div>
      <div>
        <Label>Кому</Label>
        <TeacherSelect
          value={hwTarget}
          onChange={setHwTarget}
          placeholder="Группа или ученик"
          options={groups.map(g => ({ value: g.id, label: g.name }))}
        />
      </div>
      <div>
        <Label>Дата</Label>
        <input type="date" value={hwDate} onChange={e => setHwDate(e.target.value)} style={inputSt} />
      </div>
      <div>
        <Label>Время</Label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 6 }}>
          <input value={hwTimeStart} onChange={e => setHwTimeStart(e.target.value)} placeholder="09:00" style={inputSt} />
          <span style={{ color: 'var(--color-muted)', fontSize: 13 }}>—</span>
          <input value={hwTimeEnd} onChange={e => setHwTimeEnd(e.target.value)} placeholder="10:30" style={inputSt} />
        </div>
      </div>
    </div>
  )
}

// ─── Center: Recording mode ───────────────────────────────────────────────────

function CenterRecording({
  lesson, onSaveVideo,
}: {
  lesson: CELesson | null
  onSaveVideo: (url: string) => void
}) {
  const [linkMode, setLinkMode] = useState(false)
  const [videoUrl, setVideoUrl] = useState(lesson?.videoUrl ?? '')

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
            <button onClick={() => setLinkMode(false)} style={{ padding: '9px 18px', borderRadius: 12, border: '1.5px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
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
          <button onClick={() => setLinkMode(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 14, border: 'none', background: 'var(--color-accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
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

// ─── Center: Lesson mode ──────────────────────────────────────────────────────

function CenterLesson({
  lesson, onUpdate,
}: {
  lesson: CELesson | null
  onUpdate: (updated: CELesson) => void
}) {
  if (!lesson) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <BookOpen size={36} style={{ opacity: 0.25, color: 'var(--color-muted)' }} />
        <span style={{ fontSize: 14, color: 'var(--color-muted)' }}>Выберите урок из списка справа</span>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
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
          {[
            { Icon: NotebookPen, label: 'Рабочая тетрадь', sub: 'Загрузить файл' },
            { Icon: FileText,    label: 'Конспект',        sub: 'Загрузить файл' },
            { Icon: FolderOpen,  label: 'Материалы',       sub: 'Загрузить файл' },
          ].map(({ Icon, label, sub }) => (
            <button key={label} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              padding: '16px 12px', borderRadius: 16,
              border: '1.5px dashed var(--color-border-medium)',
              background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--color-purple-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} style={{ color: 'var(--color-accent)' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-2)' }}>{label}</div>
                <div style={{ fontSize: 10, color: 'var(--color-muted)', marginTop: 2 }}>{sub}</div>
              </div>
            </button>
          ))}
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
  )
}

// ─── Center: Homework mode ────────────────────────────────────────────────────

function CenterHomework({
  lesson, tasks, onRemoveTask,
}: {
  lesson: CELesson | null
  tasks: HWTask[]
  onRemoveTask: (id: string) => void
}) {
  if (!lesson) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <AlignLeft size={36} style={{ opacity: 0.25, color: 'var(--color-muted)' }} />
        <span style={{ fontSize: 14, color: 'var(--color-muted)' }}>Выберите урок справа, чтобы добавить домашку</span>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
      {tasks.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 220, gap: 10 }}>
          <BookOpen size={40} style={{ opacity: 0.2, color: 'var(--color-muted)' }} />
          <span style={{ fontSize: 14, color: 'var(--color-muted)' }}>Выберите тип задания справа</span>
          <span style={{ fontSize: 12, color: 'var(--color-muted)', opacity: 0.7 }}>и оно появится здесь</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 640, margin: '0 auto' }}>
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
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
                    Задание {i + 1}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--color-muted)', marginLeft: 6 }}>
                    {typeLabel[task.type]}
                    {task.isHard && ' · Сложный уровень'}
                  </span>
                </div>
                <button onClick={() => onRemoveTask(task.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-muted)', display: 'flex', padding: 2 }}>
                  <X size={13} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Center: Students mode ────────────────────────────────────────────────────

function CenterStudents({
  course, groups, allStudents,
}: {
  course: CourseEdData
  groups: Array<{ id: string; name: string; studentCount?: number }>
  allStudents: Array<{ id: string; name: string; groupId?: string }>
}) {
  const assignedGroups = groups.filter(g => course.groupIds.includes(g.id))

  if (assignedGroups.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <Users size={36} style={{ opacity: 0.25, color: 'var(--color-muted)' }} />
        <span style={{ fontSize: 14, color: 'var(--color-muted)' }}>Добавьте группы через левую панель</span>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
      {assignedGroups.map(g => {
        const students = allStudents.filter(s => s.groupId === g.id)
        return (
          <div key={g.id} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-accent)' }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{g.name}</span>
              <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>· {students.length} студентов</span>
            </div>
            <div style={{ background: 'rgba(var(--glass-rgb), 0.6)', border: '1px solid var(--color-border-glass)', borderRadius: 14, overflow: 'hidden' }}>
              {students.length === 0 ? (
                <div style={{ padding: '16px', fontSize: 12, color: 'var(--color-muted)', textAlign: 'center' }}>
                  Студенты не найдены
                </div>
              ) : students.map((s, i) => (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  borderBottom: i < students.length - 1 ? '1px solid var(--color-border-soft)' : 'none',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', background: 'var(--color-purple-soft)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: 'var(--color-accent)', flexShrink: 0,
                  }}>
                    {s.name.slice(0, 1).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Right panel: Lesson list ─────────────────────────────────────────────────

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
      {/* Header */}
      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--color-border-soft)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Уроки</span>
        <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>{course.lessons.length} шт.</span>
      </div>

      {/* Scrollable lesson list */}
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

      {/* Add controls */}
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
              <button onClick={() => setAddingModule(false)} style={{ flex: 1, padding: '6px 0', borderRadius: 9, border: '1.5px solid var(--color-border)', background: 'transparent', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--color-text-2)', fontFamily: 'inherit' }}>
                Отмена
              </button>
              <button onClick={addModule} style={{ flex: 1, padding: '6px 0', borderRadius: 9, border: 'none', background: 'var(--color-purple-soft)', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: 'var(--color-accent)', fontFamily: 'inherit' }}>
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

// ─── Right panel: Homework task types ────────────────────────────────────────

function RightPanelHomework({
  onAdd, onAddHard,
}: {
  onAdd: (type: HWTaskType) => void
  onAddHard: (type: HWTaskType) => void
}) {
  const [flash, setFlash] = useState<string | null>(null)

  function handle(type: HWTaskType, hard: boolean) {
    const key = `${hard ? 'hard-' : ''}${type}`
    setFlash(key)
    setTimeout(() => setFlash(null), 280)
    hard ? onAddHard(type) : onAdd(type)
  }

  return (
    <div style={{ padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 5, overflowY: 'auto', height: '100%' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, marginBottom: 4 }}>
        ТИП ЗАДАНИЯ
      </div>
      {TASK_TYPES.map(t => (
        <button
          key={t.type}
          onClick={() => handle(t.type, false)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
            borderRadius: 13, border: `1.5px solid ${flash === t.type ? t.color : 'transparent'}`,
            background: flash === t.type ? t.bg : 'var(--color-bg-2)',
            cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.13s',
          }}
          onMouseEnter={e => { if (flash !== t.type) (e.currentTarget as HTMLButtonElement).style.background = t.bg }}
          onMouseLeave={e => { if (flash !== t.type) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-2)' }}
        >
          <div style={{ width: 32, height: 32, borderRadius: 9, background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <t.Icon size={15} style={{ color: t.color }} />
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
      {TASK_TYPES.slice(0, 2).map(t => {
        const key = `hard-${t.type}`
        return (
          <button key={key} onClick={() => handle(t.type, true)} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
            borderRadius: 11, border: '1.5px solid transparent',
            background: flash === key ? 'var(--color-yellow-soft,rgba(245,158,11,0.1))' : 'var(--color-yellow-soft,rgba(245,158,11,0.08))',
            cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.13s',
          }}>
            <Star size={13} style={{ color: '#F59E0B', fill: '#F59E0B', flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#B45309' }}>{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Mode tabs ────────────────────────────────────────────────────────────────

const MODES: { id: LessonMode; label: string }[] = [
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

  const [mode, setMode] = useState<LessonMode>('recording')
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)

  // Homework fields
  const [hwTitle, setHwTitle] = useState('')
  const [hwTarget, setHwTarget] = useState('')
  const [hwDate, setHwDate] = useState('')
  const [hwTimeStart, setHwTimeStart] = useState('')
  const [hwTimeEnd, setHwTimeEnd] = useState('')
  const [hwTasks, setHwTasks] = useState<HWTask[]>([])

  const selectedLesson = selectedLessonId
    ? course.lessons.find(l => l.id === selectedLessonId) ?? null
    : null

  function updateLesson(updated: CELesson) {
    setCourse(c => ({ ...c, lessons: c.lessons.map(l => l.id === updated.id ? updated : l) }))
  }

  function addHwTask(type: HWTaskType, hard = false) {
    setHwTasks(prev => [...prev, { id: uid(), type, isHard: hard, label: typeLabel[type] }])
  }

  function removeHwTask(id: string) {
    setHwTasks(prev => prev.filter(t => t.id !== id))
  }

  function handleBack() {
    setCourseEdited(JSON.stringify(course))
    setActivePage('constructor')
  }

  function handleSave() {
    setCourseEdited(JSON.stringify(course))
  }

  const isHomework = mode === 'homework'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 24px 14px',
        borderBottom: '1px solid var(--color-border-soft)', flexShrink: 0,
      }}>
        <motion.button onClick={handleBack} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 12,
          border: '1.5px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)',
          fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
        }}>
          <ArrowLeft size={14} /> Назад
        </motion.button>

        <span style={{ flex: 1, fontSize: 17, fontWeight: 700, color: 'var(--color-text)', textAlign: 'center' }}>
          {course.title || 'Создать курс'}
        </span>

        <motion.button onClick={handleSave} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} style={{
          padding: '7px 18px', borderRadius: 12, border: '1.5px solid var(--color-border)',
          background: 'transparent', color: 'var(--color-text)', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
        }}>
          Черновик
        </motion.button>
        <motion.button onClick={() => { setCourse(c => ({ ...c, status: 'published' })); handleSave() }}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '7px 20px', borderRadius: 12,
          border: 'none', background: 'var(--color-accent)', color: '#fff',
          fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
        }}>
          <Send size={13} /> Опубликовать
        </motion.button>
      </div>

      {/* ── 3-column body ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 14, padding: '14px 20px 20px', overflow: 'hidden' }}>

        {/* LEFT PANEL */}
        <GlassCard style={{ width: 264, flexShrink: 0, overflowY: 'auto' }}>
          <AnimatePresence mode="wait">
            {isHomework ? (
              <motion.div key="hw-left" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }}>
                <LeftPanelHomework
                  hwTitle={hwTitle} setHwTitle={setHwTitle}
                  hwTarget={hwTarget} setHwTarget={setHwTarget}
                  hwDate={hwDate} setHwDate={setHwDate}
                  hwTimeStart={hwTimeStart} setHwTimeStart={setHwTimeStart}
                  hwTimeEnd={hwTimeEnd} setHwTimeEnd={setHwTimeEnd}
                  groups={groups}
                />
              </motion.div>
            ) : (
              <motion.div key="course-left" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }}>
                <LeftPanelCourse course={course} setCourse={setCourse} groups={groups} />
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>

        {/* CENTER */}
        <GlassCard style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Mode tabs */}
          <div style={{
            display: 'flex', gap: 4, padding: '12px 16px', borderBottom: '1px solid var(--color-border-soft)',
            flexShrink: 0,
          }}>
            {MODES.map(m => (
              <button key={m.id} onClick={() => setMode(m.id)} style={{
                padding: '7px 20px', borderRadius: 999, border: 'none', cursor: 'pointer',
                background: mode === m.id ? 'var(--color-accent)' : 'var(--color-bg-3)',
                color: mode === m.id ? '#fff' : 'var(--color-text-2)',
                fontSize: 13, fontWeight: 600, transition: 'all 0.15s', fontFamily: 'inherit',
              }}>
                {m.label}
              </button>
            ))}
          </div>

          {/* Mode content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
              {mode === 'recording' && (
                <CenterRecording
                  lesson={selectedLesson}
                  onSaveVideo={url => selectedLesson && updateLesson({ ...selectedLesson, videoUrl: url })}
                />
              )}
              {mode === 'lesson' && (
                <CenterLesson lesson={selectedLesson} onUpdate={updateLesson} />
              )}
              {mode === 'homework' && (
                <CenterHomework lesson={selectedLesson} tasks={hwTasks} onRemoveTask={removeHwTask} />
              )}
              {mode === 'students' && (
                <CenterStudents course={course} groups={groups} allStudents={allStudents} />
              )}
            </motion.div>
          </AnimatePresence>
        </GlassCard>

        {/* RIGHT PANEL */}
        <GlassCard style={{ width: 288, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <AnimatePresence mode="wait">
            {isHomework ? (
              <motion.div key="hw-right" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.18 }}
                style={{ flex: 1, overflow: 'hidden' }}>
                <RightPanelHomework onAdd={t => addHwTask(t, false)} onAddHard={t => addHwTask(t, true)} />
              </motion.div>
            ) : (
              <motion.div key="lessons-right" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.18 }}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <RightPanelLessons
                  course={course} setCourse={setCourse}
                  selectedLessonId={selectedLessonId} onSelectLesson={setSelectedLessonId}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>

      </div>
    </div>
  )
}
