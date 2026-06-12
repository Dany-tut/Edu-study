import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Zap, Layers, Plus, Clock,
  GraduationCap, FileText, X, Check,
  Trash2, Link2, Database, Sparkles, ArrowUp, ArrowDown,
  CircleHelp, FlaskConical, Atom, Timer, Laugh,
  Image as ImageIcon, Key, ArrowLeft, Maximize2,
  ListChecks, Eye, EyeOff,
  CircleDot, Type as TypeIcon, Shuffle, ArrowUpDown, Table as TableIcon,
  AlignLeft, Pencil,
} from 'lucide-react'
import { useTeacher } from '../../store/teacherStore'
import { useTaskBank } from '../../store/taskBankStore'
import { TrainerBankBrowser, TrainerBankFilterPanel, emptyTrainerFilters, type TrainerFilters } from '../../components/teacher/TrainerBank'
import { useCourseLessons } from '../../lib/useCourseLessons'
import TeacherSelect from '../../components/teacher/TeacherSelect'
import TeacherSaveButton, { teacherSaveStyle, SAVE_ACCENTS } from '../../components/teacher/TeacherSaveButton'
import {
  type AnswerType, type Task as BankTask, type TaskChoice, type Subject,
  BIOLOGY_SECTIONS, CHEMISTRY_SECTIONS,
  BIOLOGY_TOPICS, CHEMISTRY_TOPICS, SOURCES,
} from '../../data/taskBankData'

type NewBankTask = Omit<BankTask, 'id'>
const LETTERS = 'АБВГДЕЖЗИКЛМНОП'

// The answer-block palette shown on the right of the task constructor.
const ANSWER_TYPES: { type: AnswerType; label: string; hint: string; Icon: React.ElementType }[] = [
  { type: 'single',    label: 'Один ответ',          hint: 'Выбор одного варианта',  Icon: CircleDot },
  { type: 'multi',     label: 'Несколько верных',    hint: 'Выбор нескольких',       Icon: ListChecks },
  { type: 'short',     label: 'Краткий ответ',       hint: 'Слово / число / формула', Icon: TypeIcon },
  { type: 'matching',  label: 'Сопоставление',       hint: 'Таблица А1 Б2 В3',        Icon: Shuffle },
  { type: 'sequence',  label: 'Последовательность',  hint: 'Расставить порядок',      Icon: ArrowUpDown },
  { type: 'tableFill', label: 'Заполнить таблицу',   hint: 'Ячейка «?» в таблице',    Icon: TableIcon },
  { type: 'extended',  label: 'Развёрнутый ответ',   hint: 'Текст + фото, критерии',  Icon: AlignLeft },
]

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'course' | 'trainer' | 'widget'
type CourseStatus = 'published' | 'draft'
type Difficulty = 'easy' | 'medium' | 'hard'
type WidgetType = 'quiz' | 'facts' | 'reactions' | 'pomodoro' | 'memes' | 'qod'
type QuestionType = 'choice' | 'free'

interface AnswerKey {
  id: string
  keyword: string
  points: number
}

type ScoreMode = 'perOption' | 'criteria' | 'whole'

interface Criterion {
  id: string
  text: string
  points: number
}

interface Lesson {
  id: string
  title: string
  trainerId: string | null
  widgetId: string | null
}

interface Course {
  id: string; title: string; subject: string; level: string
  description: string; lessons: Lesson[]
  color: string; bg: string; status: CourseStatus; lastEdited: string
}

interface BankQuestion {
  id: string; topic: string; text: string; answer: string; difficulty: Difficulty
}

interface TrainerAnswer { id: string; text: string; correct?: boolean; points?: number }

interface TrainerQ {
  id: string
  text: string
  answer: string
  subject?: string
  answers?: TrainerAnswer[]
  explanation?: string
  difficulty?: Difficulty
  part?: 1 | 2
  source: 'bank' | 'manual'
  questionType?: QuestionType
  answerKeys?: AnswerKey[]
  maxPoints?: number
  scoreMode?: ScoreMode
  criteria?: Criterion[]
  criteriaVisibleOnCheck?: boolean
  imageUrl?: string
}

interface Trainer {
  id: string; title: string; topic: string; difficulty: Difficulty
  timePerQuestion: number; questions: TrainerQ[]
  // Shared-bank task numbers (useTaskBank ids) this trainer is built from. The
  // `questions` array above is kept as a denormalised snapshot for cards/widgets.
  questionIds?: number[]
  subject?: string
  color: string; bg: string; lastEdited: string
}

interface WidgetItem {
  id: string
  // quiz / qod
  question?: string; options?: string[]; correct?: number
  // facts
  factTitle?: string; factText?: string; factImage?: string
  // reactions
  emoji?: string; quote?: string; lesson?: string
  // memes
  memeEmoji?: string; memeTitle?: string; memeCaption?: string
  // pomodoro (stored as single item)
  focusMin?: number; breakMin?: number
}

interface Widget {
  id: string; title: string; type: WidgetType
  linkedTrainerId: string | null; items: WidgetItem[]
  color: string; bg: string; lastEdited: string
}

// ─── Task bank ────────────────────────────────────────────────────────────────
const TASK_BANK: BankQuestion[] = [
  { id: 'tb1',  topic: 'Органика',   difficulty: 'easy',   text: 'Гомологи метана — это?',                      answer: 'Этан (C₂H₆), пропан (C₃H₈), бутан (C₄H₁₀)…'          },
  { id: 'tb2',  topic: 'Органика',   difficulty: 'medium', text: 'Реакция горения пропана',                     answer: 'C₃H₈ + 5O₂ → 3CO₂ + 4H₂O'                            },
  { id: 'tb3',  topic: 'Органика',   difficulty: 'medium', text: 'Изомеры бутана',                              answer: 'н-бутан и изобутан (метилпропан)'                       },
  { id: 'tb4',  topic: 'Органика',   difficulty: 'hard',   text: 'Бензол: особенности строения',                answer: 'Цикл из 6 C, делокализованные π-электроны, ароматичность'},
  { id: 'tb5',  topic: 'Неорганика', difficulty: 'hard',   text: 'Гидролиз хлорида алюминия',                  answer: 'AlCl₃ + 3H₂O ⇌ Al(OH)₃↓ + 3HCl'                      },
  { id: 'tb6',  topic: 'Неорганика', difficulty: 'medium', text: 'ОВР: как определить окислитель?',             answer: 'Принимает электроны, степень окисления снижается'        },
  { id: 'tb7',  topic: 'Неорганика', difficulty: 'easy',   text: 'Сильные кислоты',                            answer: 'HCl, H₂SO₄, HNO₃, HBr, HI, HClO₄'                    },
  { id: 'tb8',  topic: 'Неорганика', difficulty: 'medium', text: 'Электролитическая диссоциация NaCl',          answer: 'NaCl → Na⁺ + Cl⁻ (полный электролит)'                  },
  { id: 'tb9',  topic: 'Общая',      difficulty: 'medium', text: 'Закон Менделеева–Клапейрона',                answer: 'PV = νRT'                                               },
  { id: 'tb10', topic: 'Общая',      difficulty: 'hard',   text: 'Принцип Ле Шателье',                         answer: 'Равновесие смещается, ослабляя внешнее воздействие'      },
  { id: 'tb11', topic: 'Биология',   difficulty: 'hard',   text: 'Световая фаза фотосинтеза',                  answer: 'Тилакоиды; разложение H₂O, O₂, синтез АТФ и НАДФH'     },
  { id: 'tb12', topic: 'Биология',   difficulty: 'medium', text: 'Строение клеточной мембраны',                answer: 'Двойной фосфолипидный слой с белками'                    },
  { id: 'tb13', topic: 'Биология',   difficulty: 'easy',   text: 'Функции митохондрий',                        answer: 'Синтез АТФ, собственный геном, деление'                  },
  { id: 'tb14', topic: 'Биология',   difficulty: 'medium', text: 'Транспирация растений',                      answer: 'Испарение воды листьями, движет восходящий ток'          },
]

const TOPICS = [...new Set(TASK_BANK.map(q => q.topic))]

// ─── Initial mock data (mutable via state) ────────────────────────────────────
const COURSES_INIT: Course[] = [
  {
    id: 'c1', title: 'ЕГЭ по Химии — Полный курс', subject: 'Химия', level: 'ЕГЭ',
    description: 'Подготовка к ЕГЭ по химии с нуля до 90+ баллов',
    color: '#B98FFF', bg: 'var(--color-purple-soft)', status: 'published', lastEdited: '09.06',
    lessons: [
      { id: 'l1', title: 'Периодический закон', trainerId: 't3', widgetId: 'w2' },
      { id: 'l2', title: 'Гидролиз солей',      trainerId: 't1', widgetId: null  },
      { id: 'l3', title: 'Органические реакции', trainerId: null, widgetId: 'w1' },
    ],
  },
  {
    id: 'c2', title: 'ОГЭ по Химии — Базовый', subject: 'Химия', level: 'ОГЭ',
    description: 'Базовая подготовка к ОГЭ',
    color: '#9B6DFF', bg: 'var(--color-purple-soft)', status: 'published', lastEdited: '07.06',
    lessons: [
      { id: 'l4', title: 'Кислоты и основания', trainerId: 't5', widgetId: 'w2' },
      { id: 'l5', title: 'Соли и реакции',      trainerId: null, widgetId: null  },
    ],
  },
  {
    id: 'c3', title: 'ЕГЭ по Биологии — 2025', subject: 'Биология', level: 'ЕГЭ',
    description: 'Актуальная программа ЕГЭ 2025',
    color: '#5FD68A', bg: 'var(--color-green-soft)', status: 'draft', lastEdited: '05.06',
    lessons: [
      { id: 'l6', title: 'Фотосинтез', trainerId: 't4', widgetId: 'w1' },
    ],
  },
  {
    id: 'c4', title: 'Биохимия — Дополнительный', subject: 'Биология', level: 'ЕГЭ',
    description: 'Углублённый модуль по биохимии',
    color: '#3EC87A', bg: 'var(--color-green-soft)', status: 'draft', lastEdited: '01.06',
    lessons: [],
  },
]

const TRAINERS_INIT: Trainer[] = []

const WIDGETS_INIT: Widget[] = [
  {
    id: 'w1', title: 'Викторина: ЕГЭ Химия', type: 'quiz',
    linkedTrainerId: 't1', color: '#7B3FCC', bg: 'var(--color-purple-soft)', lastEdited: '10.06',
    items: [
      { id: 'i1', question: 'Что происходит при гидролизе соли слабой кислоты?', options: ['pH > 7', 'pH < 7', 'pH = 7', 'Реакция не идёт'], correct: 0 },
      { id: 'i2', question: 'Сильный электролит — это?', options: ['Уксусная кислота', 'HCl', 'NH₃', 'Вода'], correct: 1 },
    ],
  },
  {
    id: 'w2', title: 'Факты: Строение атома', type: 'facts',
    linkedTrainerId: null, color: '#1E9E63', bg: 'var(--color-green-soft)', lastEdited: '09.06',
    items: [
      { id: 'i3', factTitle: 'Ядро атома', factText: 'Протоны (+) и нейтроны, несёт 99,9% массы атома' },
      { id: 'i4', factTitle: 'Электроны', factText: 'Отрицательно заряженные частицы на орбиталях вокруг ядра' },
      { id: 'i5', factTitle: 'Орбитали', factText: 's, p, d, f — уровни энергии электронов' },
    ],
  },
  {
    id: 'w3', title: 'Реакции: Органическая химия', type: 'reactions',
    linkedTrainerId: null, color: '#1F6FB8', bg: 'var(--color-blue-pill-bg)', lastEdited: '07.06',
    items: [
      { id: 'i6', emoji: '🔥', quote: 'Реакция горения — самая экзотермическая!', lesson: 'Алканы' },
      { id: 'i7', emoji: '⚗️', quote: 'Полимеризация меняет всё вокруг нас', lesson: 'Полимеры' },
    ],
  },
  {
    id: 'w4', title: 'Фокус: Подготовка к ЕГЭ', type: 'pomodoro',
    linkedTrainerId: null, color: '#E0794B', bg: 'var(--color-peach-soft)', lastEdited: '05.06',
    items: [
      { id: 'i8', focusMin: 25, breakMin: 5 },
    ],
  },
]

// ─── Constants ────────────────────────────────────────────────────────────────
const WTYPE_LABEL: Record<WidgetType, string> = { quiz: 'Викторина', facts: 'Научные факты', reactions: 'Реакции', pomodoro: 'Фокус', memes: 'Мемы', qod: 'Вопрос дня' }
const WTYPE_ICON:  Record<WidgetType, React.ElementType> = { quiz: CircleHelp, facts: FlaskConical, reactions: Atom, pomodoro: Timer, memes: Laugh, qod: Sparkles }
const WTYPE_COLOR: Record<WidgetType, string> = { quiz: 'var(--color-purple-text,#7B3FCC)', facts: 'var(--color-green-text)', reactions: 'var(--color-blue-pill-text)', pomodoro: 'var(--color-peach-text)', memes: 'var(--color-purple-text,#C58BFF)', qod: 'var(--color-teal-pill-text)' }
const WTYPE_BG:    Record<WidgetType, string> = { quiz: 'var(--color-purple-soft)', facts: 'var(--color-green-soft)', reactions: 'var(--color-blue-pill-bg)', pomodoro: 'var(--color-peach-soft)', memes: 'var(--color-purple-soft)', qod: 'var(--color-teal-pill-bg)' }
const STATUS_LABEL: Record<CourseStatus, string> = { published: 'Опубликован', draft: 'Черновик' }
const STATUS_COLOR: Record<CourseStatus, string> = { published: 'var(--color-green-text)', draft: 'var(--color-peach-text)' }
const STATUS_BG:   Record<CourseStatus, string> = { published: 'var(--color-green-soft)', draft: 'var(--color-peach-soft)' }

// ─── Shared UI ────────────────────────────────────────────────────────────────
const inputSt: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '9px 12px',
  borderRadius: 11, border: '1.5px solid var(--color-border-medium)',
  fontSize: 13, color: 'var(--color-text)', background: 'var(--color-bg-input)',
  outline: 'none', fontFamily: 'inherit',
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

const dockGlass = {
  border: '1px solid var(--color-border-glass)',
  background: 'rgba(var(--glass-rgb), 0.86)',
  backdropFilter: 'blur(14px) saturate(180%)',
  WebkitBackdropFilter: 'blur(14px) saturate(180%)',
  boxShadow: 'var(--shadow-lg)',
} as const

function SectionHead({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', marginBottom: 8 }}>{children}</div>
}

function SegBtn({ label, active, color, bg, onClick }: { label: string; active: boolean; color: string; bg: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: '7px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
      fontSize: 12, fontWeight: 600,
      background: active ? bg : 'var(--color-bg)',
      color: active ? color : 'var(--color-muted)',
      transition: 'all 0.15s',
    }}>{label}</button>
  )
}

function PanelHeader({ title, accent, accentBg, Icon, onClose, onExpand }: {
  title: string; accent: string; accentBg: string; Icon: React.ElementType; onClose: () => void; onExpand?: () => void
}) {
  return (
    <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid var(--color-border-soft)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 11, background: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={15} strokeWidth={2} style={{ color: accent }} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{title}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {onExpand && (
          <button onClick={onExpand} title="Раскрыть на всю" style={{ height: 26, padding: '0 10px', borderRadius: 999, border: 'none', cursor: 'pointer', background: accentBg, display: 'flex', alignItems: 'center', gap: 5, color: accent, fontSize: 11.5, fontWeight: 700, fontFamily: 'inherit' }}>
            <Maximize2 size={12} strokeWidth={2.4} /> Раскрыть
          </button>
        )}
        <button onClick={onClose} style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'var(--color-bg-5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)', flexShrink: 0 }}>
          <X size={13} />
        </button>
      </div>
    </div>
  )
}

// Per-type accent keyed off the legacy `accent` colour the call sites already pass.
function SaveBtn({ accent, onClick }: { accent: string; accentBg?: string; onClick: () => void }) {
  const a = (accent === '#8B4900' || accent === 'var(--color-peach-text)') ? SAVE_ACCENTS.trainer
    : (accent === '#1a7a3f' || accent === 'var(--color-green-text)') ? SAVE_ACCENTS.widget
    : SAVE_ACCENTS.purple
  return <TeacherSaveButton label="Сохранить" accent={a} fullWidth onClick={onClick} />
}

function uid() { return Math.random().toString(36).slice(2, 8) }

// "+" insert control with its OWN hover zone in the gutter: the circle only
// appears when the cursor enters this handle's zone (passed via `style`), so
// neighbouring "+"s don't all light up together.
function InsertHandle({ accent, title, onClick, style }: {
  accent: string; title: string; onClick: () => void; style: React.CSSProperties
}) {
  const [h, setH] = useState(false)
  return (
    <div
      title={title}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      onClick={e => { e.preventDefault(); e.stopPropagation(); onClick() }}
      style={{ position: 'absolute', zIndex: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: '50%', background: accent, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.28)', pointerEvents: 'none',
        opacity: h ? 1 : 0, transform: h ? 'scale(1)' : 'scale(0.6)',
        transition: 'opacity 0.12s ease, transform 0.12s ease',
      }}>
        <Plus size={12} strokeWidth={3} />
      </div>
    </div>
  )
}

// ─── Course Editor ────────────────────────────────────────────────────────────
function CourseEditor({
  course, trainers, widgets, onSave, onClose, onExpand,
}: {
  course: Course
  trainers: Trainer[]
  widgets: Widget[]
  onSave: (c: Course) => void
  onClose: () => void
  onExpand: () => void
}) {
  const [title, setTitle] = useState(course.title)
  const [subject, setSubject] = useState(course.subject)
  const [level, setLevel] = useState(course.level)
  const [description, setDescription] = useState(course.description)
  const [status, setStatus] = useState<CourseStatus>(course.status)
  const [lessons, setLessons] = useState<Lesson[]>(course.lessons)
  const [newLessonTitle, setNewLessonTitle] = useState('')
  const [saved, setSaved] = useState(false)

  function addLessonByTitle(title: string) {
    setLessons(prev => [...prev, { id: uid(), title, trainerId: null, widgetId: null }])
  }
  function addLesson() {
    if (!newLessonTitle.trim()) return
    addLessonByTitle(newLessonTitle.trim())
    setNewLessonTitle('')
  }

  function removeLesson(id: string) { setLessons(prev => prev.filter(l => l.id !== id)) }

  function moveLesson(idx: number, dir: -1 | 1) {
    setLessons(prev => {
      const next = [...prev]
      const to = idx + dir
      if (to < 0 || to >= next.length) return prev;
      [next[idx], next[to]] = [next[to], next[idx]]
      return next
    })
  }

  function setLessonLink(id: string, key: 'trainerId' | 'widgetId', val: string | null) {
    setLessons(prev => prev.map(l => l.id === id ? { ...l, [key]: val } : l))
  }

  function handleSave() {
    onSave({ ...course, title, subject, level, description, status, lessons, lastEdited: new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) })
    setSaved(true)
    setTimeout(() => setSaved(false), 1400)
  }

  return (
    <motion.div
      initial={{ x: 380, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 380, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 30, mass: 0.9 }}
      style={{ position: 'absolute', top: 108, right: 24, bottom: 28, width: 360, zIndex: 10, borderRadius: 20, background: 'rgba(var(--glass-rgb), 0.97)', border: '1px solid var(--color-border)', boxShadow: '0 10px 34px rgba(0,0,0,0.10)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <PanelHeader title="Редактор курса" accent="var(--color-accent)" accentBg="var(--color-purple-soft)" Icon={BookOpen} onClose={onClose} onExpand={onExpand} />

      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', overflowX: 'hidden', scrollbarGutter: 'stable', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Title */}
        <div><Label>Название</Label>
          <input value={title} onChange={e => setTitle(e.target.value)} style={inputSt} />
        </div>

        {/* Subject + Level */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div><Label>Предмет</Label>
            <TeacherSelect value={subject} onChange={setSubject} options={['Химия', 'Биология']} />
          </div>
          <div><Label>Уровень</Label>
            <TeacherSelect value={level} onChange={setLevel} options={['ЕГЭ', 'ОГЭ', 'Углублённый', 'Интенсив']} />
          </div>
        </div>

        {/* Description */}
        <div><Label>Описание</Label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
            style={{ ...inputSt, resize: 'vertical', minHeight: 56 }} />
        </div>

        {/* Status */}
        <div><Label>Статус</Label>
          <div style={{ display: 'flex', gap: 6 }}>
            <SegBtn label="Черновик"    active={status === 'draft'}     color="#8B4900" bg="var(--color-peach-soft)" onClick={() => setStatus('draft')} />
            <SegBtn label="Опубликован" active={status === 'published'} color="#1a7a3f" bg="var(--color-green-soft)" onClick={() => setStatus('published')} />
          </div>
        </div>

        {/* Lessons */}
        <div>
          <SectionHead>Уроки ({lessons.length})</SectionHead>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
            {lessons.map((lesson, idx) => (
              <div key={lesson.id} style={{ background: 'var(--color-bg-2)', borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{lesson.title}</div>
                  <button onClick={() => moveLesson(idx, -1)} disabled={idx === 0}
                    style={{ width: 22, height: 22, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'var(--color-bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)', opacity: idx === 0 ? 0.3 : 1 }}>
                    <ArrowUp size={11} />
                  </button>
                  <button onClick={() => moveLesson(idx, 1)} disabled={idx === lessons.length - 1}
                    style={{ width: 22, height: 22, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'var(--color-bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)', opacity: idx === lessons.length - 1 ? 0.3 : 1 }}>
                    <ArrowDown size={11} />
                  </button>
                  <button onClick={() => removeLesson(lesson.id)}
                    style={{ width: 22, height: 22, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'var(--color-red-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-red-text)' }}>
                    <Trash2 size={11} />
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 2 }}>ТРЕНАЖЁР</div>
                    <TeacherSelect small value={lesson.trainerId ?? ''} onChange={v => setLessonLink(lesson.id, 'trainerId', v || null)}
                      triggerStyle={{ padding: '5px 8px', fontSize: 11 }}
                      options={[{ value: '', label: '— нет —' }, ...trainers.map(t => ({ value: t.id, label: t.title.slice(0, 22) }))]} />
                  </div>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 2 }}>ВИДЖЕТ</div>
                    <TeacherSelect small value={lesson.widgetId ?? ''} onChange={v => setLessonLink(lesson.id, 'widgetId', v || null)}
                      triggerStyle={{ padding: '5px 8px', fontSize: 11 }}
                      options={[{ value: '', label: '— нет —' }, ...widgets.map(w => ({ value: w.id, label: w.title.slice(0, 22) }))]} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add lesson — with suggestions from the lesson library */}
          <div style={{ display: 'flex', gap: 6 }}>
            <LessonNameInput value={newLessonTitle} onChange={setNewLessonTitle} onAdd={addLessonByTitle} />
            <motion.button whileTap={{ scale: 0.95 }} onClick={addLesson}
              style={{ width: 36, height: 36, borderRadius: 11, border: 'none', cursor: 'pointer', background: 'var(--color-purple-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)', flexShrink: 0 }}>
              <Plus size={16} strokeWidth={2.4} />
            </motion.button>
          </div>
        </div>

        <AnimatePresence>
          {saved && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--color-green-soft)', borderRadius: 12, fontSize: 13, fontWeight: 600, color: 'var(--color-green-text)' }}>
              <Check size={14} strokeWidth={2.5} /> Изменения сохранены
            </motion.div>
          )}
        </AnimatePresence>

        <SaveBtn accent="#7B3FCC" accentBg="#EEDBFF" onClick={handleSave} />
      </div>
    </motion.div>
  )
}

// ─── Trainer Editor ───────────────────────────────────────────────────────────
function TrainerEditor({
  trainer, onSave, onClose,
}: { trainer: Trainer; onSave: (t: Trainer) => void; onClose: () => void }) {
  const [title, setTitle] = useState(trainer.title)
  const [topic, setTopic] = useState(trainer.topic)
  const [difficulty, setDifficulty] = useState<Difficulty>(trainer.difficulty)
  const [timePerQ, setTimePerQ] = useState(trainer.timePerQuestion)
  const [source, setSource] = useState<'bank' | 'manual'>('bank')
  const [bankTopic, setBankTopic] = useState(TOPICS[0])
  const [bankCount, setBankCount] = useState(5)
  const [questions, setQuestions] = useState<TrainerQ[]>(trainer.questions)
  const [manQ, setManQ] = useState('')
  const [manA, setManA] = useState('')
  const [saved, setSaved] = useState(false)

  function loadFromBank() {
    const pool = TASK_BANK.filter(q => q.topic === bankTopic)
    const picked = pool.slice(0, bankCount).map(q => ({ id: q.id, text: q.text, answer: q.answer, source: 'bank' as const }))
    setQuestions(picked)
  }

  function addManual() {
    if (!manQ.trim() || !manA.trim()) return
    setQuestions(prev => [...prev, { id: uid(), text: manQ.trim(), answer: manA.trim(), source: 'manual' }])
    setManQ(''); setManA('')
  }

  function removeQ(id: string) { setQuestions(prev => prev.filter(q => q.id !== id)) }

  function handleSave() {
    onSave({ ...trainer, title, topic, difficulty, timePerQuestion: timePerQ, questions, lastEdited: new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) })
    setSaved(true); setTimeout(() => setSaved(false), 1400)
  }

  return (
    <motion.div
      initial={{ x: 380, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 380, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 30, mass: 0.9 }}
      style={{ position: 'absolute', top: 108, right: 24, bottom: 28, width: 360, zIndex: 10, borderRadius: 20, background: 'rgba(var(--glass-rgb), 0.97)', border: '1px solid var(--color-border)', boxShadow: '0 10px 34px rgba(0,0,0,0.10)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <PanelHeader title="Редактор тренажёра" accent="#8B4900" accentBg="var(--color-peach-soft)" Icon={Zap} onClose={onClose} />

      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', overflowX: 'hidden', scrollbarGutter: 'stable', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Title + topic */}
        <div><Label>Название</Label><input value={title} onChange={e => setTitle(e.target.value)} style={inputSt} /></div>
        <div><Label>Тема</Label>
          <TeacherSelect value={topic} onChange={setTopic} options={[...TOPICS, 'Смешанный']} />
        </div>

        {/* Time */}
        <div><Label>Минут / вопрос</Label>
          <input type="number" min={1} max={10} value={timePerQ} onChange={e => setTimePerQ(Number(e.target.value))} style={inputSt} />
        </div>

        {/* Source */}
        <div><Label>Источник вопросов</Label>
          <div style={{ display: 'flex', gap: 6 }}>
            <SegBtn label="Из банка заданий" active={source === 'bank'}   color="var(--color-accent)" bg="var(--color-purple-soft)" onClick={() => setSource('bank')} />
            <SegBtn label="Вручную"          active={source === 'manual'} color="#8B4900" bg="var(--color-peach-soft)" onClick={() => setSource('manual')} />
          </div>
        </div>

        {source === 'bank' && (
          <div style={{ background: 'var(--color-bg-2)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SectionHead>Параметры банка</SectionHead>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 8 }}>
              <div><Label>Тема банка</Label>
                <TeacherSelect value={bankTopic} onChange={setBankTopic} options={TOPICS} />
              </div>
              <div><Label>Кол-во</Label>
                <input type="number" min={1} max={TASK_BANK.filter(q => q.topic === bankTopic).length}
                  value={bankCount} onChange={e => setBankCount(Number(e.target.value))} style={inputSt} />
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
              Доступно: {TASK_BANK.filter(q => q.topic === bankTopic).length} вопросов
            </div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={loadFromBank}
              style={{ padding: '9px 0', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'var(--color-purple-soft)', color: 'var(--color-accent)', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Database size={13} strokeWidth={2} /> Загрузить из банка
            </motion.button>
          </div>
        )}

        {source === 'manual' && (
          <div style={{ background: 'var(--color-bg-2)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SectionHead>Добавить вопрос</SectionHead>
            <input value={manQ} onChange={e => setManQ(e.target.value)} placeholder="Текст вопроса…" style={inputSt} />
            <input value={manA} onChange={e => setManA(e.target.value)} placeholder="Правильный ответ…" style={inputSt} />
            <motion.button whileTap={{ scale: 0.97 }} onClick={addManual}
              style={{ padding: '8px 0', borderRadius: 11, border: 'none', cursor: 'pointer', background: 'var(--color-peach-soft)', color: 'var(--color-peach-text)', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <Plus size={13} /> Добавить
            </motion.button>
          </div>
        )}

        {/* Questions list */}
        <div>
          <SectionHead>Вопросы ({questions.length})</SectionHead>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {questions.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--color-text-3)', textAlign: 'center', padding: '12px 0' }}>
                Нет вопросов — загрузите из банка или добавьте вручную
              </div>
            )}
            {questions.map((q, i) => (
              <div key={q.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', background: 'var(--color-bg-2)', borderRadius: 10 }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, background: q.source === 'bank' ? 'var(--color-purple-soft)' : 'var(--color-peach-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: q.source === 'bank' ? 'var(--color-accent)' : 'var(--color-peach-text)', flexShrink: 0, marginTop: 1 }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.text}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.answer}</div>
                </div>
                <button onClick={() => removeQ(q.id)} style={{ width: 20, height: 20, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'var(--color-red-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-red-text)', flexShrink: 0 }}>
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {saved && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--color-green-soft)', borderRadius: 12, fontSize: 13, fontWeight: 600, color: 'var(--color-green-text)' }}>
              <Check size={14} strokeWidth={2.5} /> Сохранено
            </motion.div>
          )}
        </AnimatePresence>
        <SaveBtn accent="#8B4900" accentBg="var(--color-peach-soft)" onClick={handleSave} />
      </div>
    </motion.div>
  )
}

// ─── Widget Editor ────────────────────────────────────────────────────────────
function WidgetEditor({
  widget, trainers, onSave, onClose,
}: { widget: Widget; trainers: Trainer[]; onSave: (w: Widget) => void; onClose: () => void }) {
  const [title, setTitle] = useState(widget.title)
  const [type, setType] = useState<WidgetType>(widget.type)
  const [linkedId, setLinkedId] = useState<string>(widget.linkedTrainerId ?? '')
  const [items, setItems] = useState<WidgetItem[]>(widget.items)
  const [saved, setSaved] = useState(false)

  // Shared text inputs reused across types
  const [fcTerm, setFcTerm] = useState('')
  const [fcDef, setFcDef] = useState('')
  const [dLabel, setDLabel] = useState('')
  // Quiz / qod
  const [qText, setQText] = useState('')
  const [qOpts, setQOpts] = useState(['', '', '', ''])
  const [qCorr, setQCorr] = useState(0)
  // Pomodoro settings
  const existingPomo = widget.items[0]
  const [pomoFocus, setPomoFocus] = useState(existingPomo?.focusMin ?? 25)
  const [pomoBreak, setPomoBreak] = useState(existingPomo?.breakMin ?? 5)

  function autoPopulate() {
    const trainer = trainers.find(t => t.id === linkedId)
    if (!trainer) return
    if (type === 'quiz' || type === 'qod') {
      setItems(trainer.questions.map(q => ({
        id: uid(), question: q.text,
        options: [q.answer, 'Неверный ответ A', 'Неверный ответ B', 'Неверный ответ C'],
        correct: 0,
      })))
    } else if (type === 'facts') {
      setItems(trainer.questions.map(q => ({ id: uid(), factTitle: q.text.slice(0, 40), factText: q.answer })))
    }
  }

  function addFlashcard() {
    if (!fcTerm.trim() || !fcDef.trim()) return
    setItems(prev => [...prev, { id: uid(), factTitle: fcTerm.trim(), factText: fcDef.trim() }])
    setFcTerm(''); setFcDef('')
  }

  function addQuiz() {
    if (!qText.trim()) return
    setItems(prev => [...prev, { id: uid(), question: qText.trim(), options: [...qOpts], correct: qCorr }])
    setQText(''); setQOpts(['', '', '', '']); setQCorr(0)
  }

  function removeItem(id: string) { setItems(prev => prev.filter(i => i.id !== id)) }

  function handleSave() {
    const finalItems = type === 'pomodoro'
      ? [{ id: 'pomo', focusMin: pomoFocus, breakMin: pomoBreak }]
      : items
    onSave({ ...widget, title, type, linkedTrainerId: linkedId || null, items: finalItems, lastEdited: new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) })
    setSaved(true); setTimeout(() => setSaved(false), 1400)
  }

  const TypeIcon = WTYPE_ICON[type]

  return (
    <motion.div
      initial={{ x: 380, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 380, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 30, mass: 0.9 }}
      style={{ position: 'absolute', top: 108, right: 24, bottom: 28, width: 360, zIndex: 10, borderRadius: 20, background: 'rgba(var(--glass-rgb), 0.97)', border: '1px solid var(--color-border)', boxShadow: '0 10px 34px rgba(0,0,0,0.10)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <PanelHeader title="Редактор виджета" accent="#1a7a3f" accentBg="var(--color-green-soft)" Icon={Layers} onClose={onClose} />

      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', overflowX: 'hidden', scrollbarGutter: 'stable', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div><Label>Название</Label><input value={title} onChange={e => setTitle(e.target.value)} style={inputSt} /></div>

        {/* Type selector */}
        <div>
          <Label>Тип виджета</Label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {(['quiz', 'facts', 'reactions', 'pomodoro', 'memes', 'qod'] as WidgetType[]).map(wt => {
              const WIcon = WTYPE_ICON[wt]
              const isActive = type === wt
              return (
                <button key={wt} onClick={() => setType(wt)} style={{
                  padding: '8px 10px', borderRadius: 11,
                  border: isActive ? `1.5px solid ${WTYPE_COLOR[wt]}` : '1.5px solid transparent',
                  background: isActive ? WTYPE_BG[wt] : 'var(--color-bg)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600,
                  color: isActive ? 'var(--color-purple-text, #E8D0FF)' : 'var(--color-muted)', transition: 'all 0.15s',
                }}>
                  <WIcon size={13} strokeWidth={2} />
                  {WTYPE_LABEL[wt]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Auto-populate from trainer (only for quiz/facts) */}
        {(type === 'quiz' || type === 'facts') && (
          <div style={{ background: 'var(--color-green-soft)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SectionHead>Автонаполнение из тренажёра</SectionHead>
            <TeacherSelect value={linkedId} onChange={setLinkedId} placeholder="— выберите тренажёр —"
              accent="#1a7a3f" accentBg="var(--color-green-soft)"
              options={[{ value: '', label: '— выберите тренажёр —' }, ...trainers.map(t => ({ value: t.id, label: `${t.title} (${t.questions.length} вопр.)` }))]} />
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={autoPopulate} disabled={!linkedId}
              style={{
                padding: '9px 0', borderRadius: 12, border: 'none', cursor: linkedId ? 'pointer' : 'not-allowed',
                background: linkedId ? 'var(--color-green-soft)' : 'var(--color-bg)', color: linkedId ? 'var(--color-green-text)' : 'var(--color-text-3)',
                fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
              <Sparkles size={13} strokeWidth={2} />
              Наполнить автоматически
            </motion.button>
          </div>
        )}

        {/* Manual content builder */}
        <div style={{ background: 'var(--color-bg-2)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionHead>
            {type === 'pomodoro' ? 'Настройки таймера' : 'Добавить вручную'}
          </SectionHead>

          {(type === 'quiz' || type === 'qod') && (
            <>
              <input value={qText} onChange={e => setQText(e.target.value)} placeholder="Вопрос…" style={inputSt} />
              {qOpts.map((opt, oi) => (
                <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button onClick={() => setQCorr(oi)} style={{
                    width: 20, height: 20, borderRadius: '50%', border: '2px solid', flexShrink: 0,
                    borderColor: qCorr === oi ? WTYPE_COLOR[type] : 'var(--color-text-4)',
                    background: qCorr === oi ? WTYPE_COLOR[type] : 'transparent', cursor: 'pointer',
                  }} />
                  <input value={opt} onChange={e => { const o = [...qOpts]; o[oi] = e.target.value; setQOpts(o) }}
                    placeholder={`Вариант ${oi + 1}…`} style={{ ...inputSt, flex: 1 }} />
                </div>
              ))}
              <div style={{ fontSize: 10, color: 'var(--color-text-3)' }}>● — правильный ответ</div>
              <motion.button whileTap={{ scale: 0.97 }} onClick={addQuiz}
                style={{ padding: '7px 0', borderRadius: 11, border: 'none', cursor: 'pointer', background: WTYPE_BG[type], color: WTYPE_COLOR[type], fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <Plus size={13} /> Добавить вопрос
              </motion.button>
            </>
          )}

          {type === 'facts' && (
            <>
              <input value={fcTerm} onChange={e => setFcTerm(e.target.value)} placeholder="Заголовок факта…" style={inputSt} />
              <textarea value={fcDef} onChange={e => setFcDef(e.target.value)} placeholder="Текст факта…" rows={3}
                style={{ ...inputSt, resize: 'vertical' }} />
              <motion.button whileTap={{ scale: 0.97 }} onClick={addFlashcard}
                style={{ padding: '7px 0', borderRadius: 11, border: 'none', cursor: 'pointer', background: WTYPE_BG.facts, color: WTYPE_COLOR.facts, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <Plus size={13} /> Добавить факт
              </motion.button>
            </>
          )}

          {type === 'reactions' && (
            <>
              <input value={fcTerm} onChange={e => setFcTerm(e.target.value)} placeholder="Эмодзи (напр. 🔥)…" style={inputSt} />
              <input value={fcDef} onChange={e => setFcDef(e.target.value)} placeholder="Цитата / реплика…" style={inputSt} />
              <input value={dLabel} onChange={e => setDLabel(e.target.value)} placeholder="Название урока / темы…" style={inputSt} />
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => {
                if (!fcTerm.trim()) return
                setItems(prev => [...prev, { id: uid(), emoji: fcTerm.trim(), quote: fcDef.trim(), lesson: dLabel.trim() }])
                setFcTerm(''); setFcDef(''); setDLabel('')
              }}
                style={{ padding: '7px 0', borderRadius: 11, border: 'none', cursor: 'pointer', background: WTYPE_BG.reactions, color: WTYPE_COLOR.reactions, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <Plus size={13} /> Добавить реакцию
              </motion.button>
            </>
          )}

          {type === 'pomodoro' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <Label>Фокус (мин)</Label>
                  <input type="number" min={5} max={60} value={pomoFocus}
                    onChange={e => setPomoFocus(Number(e.target.value))} style={inputSt} />
                </div>
                <div>
                  <Label>Перерыв (мин)</Label>
                  <input type="number" min={1} max={30} value={pomoBreak}
                    onChange={e => setPomoBreak(Number(e.target.value))} style={inputSt} />
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
                Эти настройки будут применены к таймеру Фокус у студентов
              </div>
            </>
          )}

          {type === 'memes' && (
            <>
              <input value={fcTerm} onChange={e => setFcTerm(e.target.value)} placeholder="Эмодзи (напр. 😅)…" style={inputSt} />
              <input value={fcDef} onChange={e => setFcDef(e.target.value)} placeholder="Название мема…" style={inputSt} />
              <input value={dLabel} onChange={e => setDLabel(e.target.value)} placeholder="Подпись / шутка…" style={inputSt} />
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => {
                if (!fcDef.trim()) return
                setItems(prev => [...prev, { id: uid(), memeEmoji: fcTerm.trim() || '😄', memeTitle: fcDef.trim(), memeCaption: dLabel.trim() }])
                setFcTerm(''); setFcDef(''); setDLabel('')
              }}
                style={{ padding: '7px 0', borderRadius: 11, border: 'none', cursor: 'pointer', background: WTYPE_BG.memes, color: WTYPE_COLOR.memes, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <Plus size={13} /> Добавить мем
              </motion.button>
            </>
          )}
        </div>

        {/* Items preview */}
        {type !== 'pomodoro' && (
          <div>
            <SectionHead>{WTYPE_LABEL[type]}: {items.length} элементов</SectionHead>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {items.slice(0, 6).map((item, i) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--color-bg-2)', borderRadius: 9 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 5, background: WTYPE_BG[type], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: WTYPE_COLOR[type], flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1, fontSize: 11, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.question ?? item.factTitle ?? item.emoji ?? item.memeEmoji ?? '—'}
                    {(item.factTitle || item.emoji || item.memeTitle) && (
                      <span style={{ color: 'var(--color-text-3)' }}> · {item.factText?.slice(0, 30) ?? item.quote?.slice(0, 30) ?? item.memeTitle?.slice(0, 30)}</span>
                    )}
                  </div>
                  <button onClick={() => removeItem(item.id)} style={{ width: 18, height: 18, borderRadius: 5, border: 'none', cursor: 'pointer', background: 'var(--color-red-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-red-text)', flexShrink: 0 }}>
                    <X size={9} />
                  </button>
                </div>
              ))}
              {items.length > 6 && (
                <div style={{ fontSize: 11, color: 'var(--color-text-3)', textAlign: 'center', padding: '4px 0' }}>
                  +{items.length - 6} ещё
                </div>
              )}
              {items.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--color-text-3)', textAlign: 'center', padding: '10px 0' }}>
                  Нет элементов — добавьте вручную или из тренажёра
                </div>
              )}
            </div>
          </div>
        )}

        <AnimatePresence>
          {saved && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--color-green-soft)', borderRadius: 12, fontSize: 13, fontWeight: 600, color: 'var(--color-green-text)' }}>
              <Check size={14} strokeWidth={2.5} /> Сохранено
            </motion.div>
          )}
        </AnimatePresence>
        <SaveBtn accent="#1a7a3f" accentBg="var(--color-green-soft)" onClick={handleSave} />
      </div>
    </motion.div>
  )
}

// ─── Card components ──────────────────────────────────────────────────────────
function CourseCard({ course, isSelected, onClick }: { course: Course; isSelected: boolean; onClick: () => void }) {
  return (
    <motion.div
      whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={onClick}
      style={{
        background: isSelected ? course.bg : 'rgba(var(--glass-rgb), 0.88)',
        backdropFilter: 'blur(16px) saturate(180%)', WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: isSelected ? `1.5px solid ${course.color}` : '1px solid var(--color-border-glass)',
        borderRadius: 20, padding: 18, cursor: 'pointer',
        boxShadow: isSelected ? `0 0 0 3px ${course.color}22, 0 6px 24px rgba(0,0,0,0.08)` : '0 3px 16px rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column', gap: 10, transition: 'all 0.18s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: course.color + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <BookOpen size={17} strokeWidth={2} style={{ color: course.color }} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: STATUS_COLOR[course.status], background: STATUS_BG[course.status], borderRadius: 7, padding: '2px 8px' }}>
          {STATUS_LABEL[course.status]}
        </span>
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.3, marginBottom: 4 }}>{course.title}</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{course.subject} · {course.level}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--color-border-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--color-muted)', fontSize: 12 }}>
          <GraduationCap size={13} strokeWidth={1.8} />
          <span>{course.lessons.length} уроков</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-3)', fontSize: 11 }}>
          <Clock size={11} strokeWidth={2} />{course.lastEdited}
        </div>
      </div>
    </motion.div>
  )
}

function TrainerCard({ trainer, isSelected, onClick }: { trainer: Trainer; isSelected: boolean; onClick: () => void }) {
  return (
    <motion.div
      whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={onClick}
      style={{
        background: isSelected ? trainer.bg : 'rgba(var(--glass-rgb), 0.88)',
        backdropFilter: 'blur(16px) saturate(180%)', WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: isSelected ? `1.5px solid ${trainer.color}` : '1px solid var(--color-border-glass)',
        borderRadius: 20, padding: 18, cursor: 'pointer',
        boxShadow: isSelected ? `0 0 0 3px ${trainer.color}22, 0 6px 24px rgba(0,0,0,0.08)` : '0 3px 16px rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column', gap: 10, transition: 'all 0.18s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: trainer.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Zap size={17} strokeWidth={2} style={{ color: trainer.color }} />
        </div>
        <div />
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.3, marginBottom: 4 }}>{trainer.title}</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{trainer.topic} · {trainer.timePerQuestion} мин/вопрос</div>
        {trainer.questionIds && trainer.questionIds.length > 0 && (
          <div style={{ marginTop: 5, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {trainer.questionIds.map(id => (
              <span key={id} onClick={e => e.stopPropagation()} style={{ padding: '1px 7px', borderRadius: 999, background: 'var(--color-red-soft)', color: 'var(--color-red-text)', fontSize: 10, fontWeight: 800, userSelect: 'text', cursor: 'text' }}>№{id}</span>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--color-border-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--color-muted)', fontSize: 12 }}>
          <FileText size={13} strokeWidth={1.8} />
          <span>{trainer.questions.length} вопросов</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-3)', fontSize: 11 }}>
          <Clock size={11} strokeWidth={2} />{trainer.lastEdited}
        </div>
      </div>
    </motion.div>
  )
}

function WidgetCard({ widget, isSelected, onClick }: { widget: Widget; isSelected: boolean; onClick: () => void }) {
  const TypeIcon = WTYPE_ICON[widget.type]
  return (
    <motion.div
      whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={onClick}
      style={{
        background: isSelected ? WTYPE_BG[widget.type] : 'rgba(var(--glass-rgb), 0.88)',
        backdropFilter: 'blur(16px) saturate(180%)', WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: isSelected ? `1.5px solid ${WTYPE_COLOR[widget.type]}` : '1px solid var(--color-border-glass)',
        borderRadius: 20, padding: 18, cursor: 'pointer',
        boxShadow: isSelected ? `0 0 0 3px ${WTYPE_COLOR[widget.type]}22, 0 6px 24px rgba(0,0,0,0.08)` : '0 3px 16px rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column', gap: 10, transition: 'all 0.18s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: WTYPE_BG[widget.type], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <TypeIcon size={17} strokeWidth={2} style={{ color: WTYPE_COLOR[widget.type] }} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: WTYPE_COLOR[widget.type], background: WTYPE_BG[widget.type], borderRadius: 6, padding: '2px 8px' }}>
          {WTYPE_LABEL[widget.type]}
        </span>
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.3, marginBottom: 4 }}>{widget.title}</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{widget.items.length} элементов</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--color-border-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--color-muted)', fontSize: 12 }}>
          <Layers size={13} strokeWidth={1.8} />
          {widget.linkedTrainerId
            ? <span style={{ color: 'var(--color-accent)' }}><Link2 size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />Из тренажёра</span>
            : <span>Вручную</span>
          }
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-3)', fontSize: 11 }}>
          <Clock size={11} strokeWidth={2} />{widget.lastEdited}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Tab pill (list view) ─────────────────────────────────────────────────────
function TabBtn({ tab, activeTab, label, icon: Icon, color, bg, onClick, onPlus }: {
  tab: Tab; activeTab: Tab; label: string; icon: React.ElementType
  color: string; bg: string; onClick: () => void; onPlus: () => void
}) {
  const isActive = tab === activeTab
  const [hover, setHover] = useState(false)
  return (
    <motion.button
      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 20px', borderRadius: 16,
        border: 'none', cursor: 'pointer',
        background: isActive ? bg : 'rgba(var(--glass-rgb), 0.72)',
        color: isActive ? color : 'var(--color-muted)', fontSize: 14, fontWeight: 600,
        boxShadow: isActive ? `0 0 0 1.5px ${color}44, 0 4px 14px rgba(0,0,0,0.06)` : '0 2px 8px rgba(0,0,0,0.04)',
        transition: 'all 0.15s',
      }}>
      <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />{label}
      <AnimatePresence>
        {isActive && hover && (
          <motion.span
            key="plus"
            initial={{ width: 0, opacity: 0, marginLeft: -8 }}
            animate={{ width: 18, opacity: 1, marginLeft: 0 }}
            exit={{ width: 0, opacity: 0, marginLeft: -8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            onClick={e => { e.stopPropagation(); onPlus() }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', flexShrink: 0, color,
            }}
          >
            <Plus size={16} strokeWidth={2.6} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

// ─── Lesson name input with suggestions (existing course lessons) ─────────────
function LessonNameInput({ value, onChange, onAdd }: {
  value: string; onChange: (v: string) => void; onAdd: (title: string) => void
}) {
  const [open, setOpen] = useState(false)
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

  const q = value.trim().toLowerCase()
  // Unique lesson titles from the mock course library, matched against the query.
  const suggestions = [...new Map(courseLessons.map(l => [l.lessonTitle, l])).values()]
    .filter(l => !q || l.lessonTitle.toLowerCase().includes(q))
    .slice(0, 6)

  function commit(title: string) {
    onAdd(title)
    onChange('')
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1 }}>
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => { if (e.key === 'Enter' && value.trim()) commit(value.trim()) }}
        placeholder="Название урока…"
        style={{ ...inputSt, width: '100%' }}
      />
      <AnimatePresence>
        {open && suggestions.length > 0 && (
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px 6px' }}>
              <Sparkles size={11} style={{ color: 'var(--color-accent)' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-accent)', letterSpacing: 0.3 }}>ИЗ БИБЛИОТЕКИ УРОКОВ</span>
            </div>
            {suggestions.map(l => (
              <button
                key={l.id}
                onClick={() => commit(l.lessonTitle)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9, width: '100%',
                  padding: '8px 10px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  background: 'transparent', textAlign: 'left', fontFamily: 'inherit',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: 'var(--color-purple-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BookOpen size={13} style={{ color: 'var(--color-accent)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.lessonTitle}</div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.courseTitle}</div>
                </div>
                <Plus size={13} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Creator view (split layout: left settings + center content) ──────────────
// Creator chrome is unified on the purple accent to match the lesson editor
// and homework-create pages; per-type colors stay only in the list view.
const CREATOR_CFG = {
  course:  { label: 'Курс',     Icon: BookOpen, color: 'var(--color-green-text)',     bg: 'var(--color-green-soft)',   accent: 'var(--color-green-text)' },
  trainer: { label: 'Тренажёр', Icon: Zap,      color: 'var(--color-accent)',         bg: 'var(--color-purple-soft)', accent: 'var(--color-accent)' },
  widget:  { label: 'Виджет',   Icon: Layers,   color: 'var(--color-blue-pill-text)', bg: 'var(--color-blue-pill-bg)', accent: 'var(--color-blue-pill-text)' },
}

function CreatorView({
  initialMode,
  editCourse,
  editingTask,
  trainers,
  widgets,
  onSaveTrainer,
  onSaveCourse,
  onSaveWidget,
  onCancel,
}: {
  initialMode: Tab
  editCourse?: Course | null
  editTrainer?: Trainer | null
  editingTask?: BankTask | null
  trainers: Trainer[]
  widgets: Widget[]
  onSaveTrainer: (t: Trainer) => void
  onSaveCourse: (c: Course) => void
  onSaveWidget: (w: Widget) => void
  onCancel: () => void
}) {
  const [mode, setMode] = useState<Tab>(initialMode)
  const addTask = useTaskBank(s => s.addTask)
  const replaceTask = useTaskBank(s => s.replaceTask)

  // ── Task-authoring state (the "trainer" tab now authors a bank task) ──
  // Meta → where the task lives in the bank / how the student finds it.
  const [tkSubject, setTkSubject] = useState<'Химия' | 'Биология'>(editingTask?.subject === 'biology' ? 'Биология' : 'Химия')
  const [tkSection, setTkSection] = useState(editingTask?.section ?? '')
  const [tkTopic, setTkTopic] = useState(editingTask?.topic ?? '')
  const [tkPart, setTkPart] = useState<1 | 2>(editingTask?.part ?? 1)
  const [tkLine, setTkLine] = useState(editingTask?.line ?? 1)
  const [tkSource, setTkSource] = useState(editingTask?.source ?? SOURCES[SOURCES.length - 1]) // «Авторский»
  const [tkDifficulty, setTkDifficulty] = useState<Difficulty>(editingTask?.difficulty ?? 'medium')

  // Условие — question text + optional content blocks (image / table)
  const [tkQuestion, setTkQuestion] = useState(editingTask?.question ?? '')
  const [tkImage, setTkImage] = useState(editingTask?.questionImage ?? '')
  const [tkHasTable, setTkHasTable] = useState(!!(editingTask?.questionTable))
  const [tkTableHeaders, setTkTableHeaders] = useState<string[]>(editingTask?.questionTable?.headers ?? ['', ''])
  const [tkTableRows, setTkTableRows] = useState<string[][]>(editingTask?.questionTable?.rows ?? [['', ''], ['', '']])

  // Ответ — which block + its config
  const [tkAnswerType, setTkAnswerType] = useState<AnswerType>(editingTask?.answerType ?? 'single')
  // single / multi
  const [tkChoices, setTkChoices] = useState<string[]>(
    editingTask?.choices?.length ? editingTask.choices.map((c: TaskChoice) => c.text) : ['', '', '', '']
  )
  const [tkCorrect, setTkCorrect] = useState<number[]>(
    editingTask?.choices?.length
      ? editingTask.choices.map((c: TaskChoice, i: number) => c.correct ? i : -1).filter((i: number) => i >= 0)
      : [0]
  )
  const [tkChoicePts, setTkChoicePts] = useState<number[]>(
    editingTask?.choices?.length ? editingTask.choices.map((c: TaskChoice) => c.points ?? 0) : [1, 0, 0, 0]
  )
  // short / tableFill / extended — single reference answer string
  const [tkShortAnswer, setTkShortAnswer] = useState(
    (editingTask?.answerType === 'short' || editingTask?.answerType === 'tableFill' || editingTask?.answerType === 'extended')
      ? (editingTask.answer ?? '') : ''
  )
  const [tkAllowPhoto, setTkAllowPhoto] = useState(editingTask?.allowPhoto ?? true)
  // matching — left prompts mapped to right options
  const [tkMatchLeft, setTkMatchLeft] = useState<string[]>(editingTask?.matchLeft ?? ['', ''])
  const [tkMatchRight, setTkMatchRight] = useState<string[]>(editingTask?.matchRight ?? ['', ''])
  const [tkMatchMap, setTkMatchMap] = useState<number[]>(
    editingTask?.matchLeft ? editingTask.matchLeft.map((_: string, i: number) => i) : [0, 1]
  )
  // sequence — items already in the correct order
  const [tkSeq, setTkSeq] = useState<string[]>(editingTask?.sequenceItems ?? ['', ''])

  const [tkSolution, setTkSolution] = useState(editingTask?.solution ?? '')
  const [explPhotos, setExplPhotos] = useState<string[]>([])
  const explTextareaRef = useRef<HTMLTextAreaElement>(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const [savedTaskId, setSavedTaskId] = useState<number | null>(null)
  // Clicked cell → selects its row/column for deletion.
  const [sel, setSel] = useState<{ type: 'row' | 'col'; index: number } | null>(null)
  // Measured gridline boundary positions (relative to the bordered table box) so
  // the "+" handles can live OUTSIDE the table while the table itself stays clipped.
  const tblBoxRef = useRef<HTMLDivElement>(null)
  const [tblBounds, setTblBounds] = useState<{ colX: number[]; rowY: number[]; w: number; h: number }>({ colX: [], rowY: [], w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = tblBoxRef.current
    if (!tkHasTable || !el) return
    const measure = () => {
      const er = el.getBoundingClientRect()
      const colX: number[] = []
      el.querySelectorAll('thead th').forEach((th, i) => {
        const r = (th as HTMLElement).getBoundingClientRect()
        if (i === 0) colX.push(r.left - er.left)
        colX.push(r.right - er.left)
      })
      const rowY: number[] = []
      el.querySelectorAll('tbody tr').forEach((tr, i) => {
        const r = (tr as HTMLElement).getBoundingClientRect()
        if (i === 0) rowY.push(r.top - er.top)
        rowY.push(r.bottom - er.top)
      })
      setTblBounds({ colX, rowY, w: er.width, h: er.height })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [tkHasTable, tkTableHeaders.length, tkTableRows.length])

  // ── Scoring (shared across answer types) ──
  const [trMaxPoints, setTrMaxPoints] = useState(editingTask?.maxPoints ?? 1)
  const [answerKeys, setAnswerKeys] = useState<AnswerKey[]>(editingTask?.answerKeys as AnswerKey[] ?? [])
  const [newKw, setNewKw] = useState('')
  const [newKwPts, setNewKwPts] = useState(1)
  const [scoreMode, setScoreMode] = useState<ScoreMode>(editingTask?.scoreMode ?? 'whole')
  const [criteria, setCriteria] = useState<Criterion[]>(editingTask?.criteria as Criterion[] ?? [])
  const [newCrit, setNewCrit] = useState('')
  const [newCritPts, setNewCritPts] = useState(1)
  const [criteriaVisible, setCriteriaVisible] = useState(editingTask?.criteriaVisibleOnCheck ?? false)

  const isChoiceType = tkAnswerType === 'single' || tkAnswerType === 'multi'
  const tkTopicMap = tkSubject === 'Химия' ? CHEMISTRY_TOPICS : BIOLOGY_TOPICS
  const tkSectionList = tkSubject === 'Химия' ? CHEMISTRY_SECTIONS : BIOLOGY_SECTIONS
  const tkTopicList = tkSection ? (tkTopicMap[tkSection] ?? []) : Object.values(tkTopicMap).flat()

  // ── Course state (pre-filled when editing an existing course) ──
  const [cTitle, setCTitle] = useState(editCourse?.title ?? 'Новый курс')
  const [cSubject, setCSubject] = useState(editCourse?.subject ?? 'Химия')
  const [cLevel, setCLevel] = useState(editCourse?.level ?? 'ЕГЭ')
  const [cDesc, setCDesc] = useState(editCourse?.description ?? '')
  const [cStatus, setCStatus] = useState<CourseStatus>(editCourse?.status ?? 'draft')
  const [cLessons, setCLessons] = useState<Lesson[]>(editCourse?.lessons ?? [])
  const [newLessonTitle, setNewLessonTitle] = useState('')

  // ── Widget state ──
  const [wTitle, setWTitle] = useState('Новый виджет')
  const [wType, setWType] = useState<WidgetType>('quiz')
  const [wLinkedId, setWLinkedId] = useState('')
  const [wItems, setWItems] = useState<WidgetItem[]>([])
  const [wQText, setWQText] = useState('')
  const [wQOpts, setWQOpts] = useState(['', '', '', ''])
  const [wQCorr, setWQCorr] = useState(0)
  const [wFcTerm, setWFcTerm] = useState('')
  const [wFcDef, setWFcDef] = useState('')

  const cfg = CREATOR_CFG[mode]

  function addKey() {
    if (!newKw.trim()) return
    setAnswerKeys(prev => [...prev, { id: uid(), keyword: newKw.trim(), points: newKwPts }])
    setNewKw(''); setNewKwPts(1)
  }
  function removeKey(id: string) { setAnswerKeys(prev => prev.filter(k => k.id !== id)) }

  function addCriterion() {
    if (!newCrit.trim()) return
    setCriteria(prev => [...prev, { id: uid(), text: newCrit.trim(), points: newCritPts }])
    setNewCrit(''); setNewCritPts(1)
  }
  function removeCriterion(id: string) { setCriteria(prev => prev.filter(c => c.id !== id)) }

  // ── Answer-block helpers ──
  function toggleCorrect(i: number) {
    setTkCorrect(prev =>
      tkAnswerType === 'single'
        ? [i]                                            // radio
        : prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i].sort((a, b) => a - b))
  }
  function setChoice(i: number, v: string) { setTkChoices(prev => prev.map((c, j) => j === i ? v : c)) }
  function addChoice() {
    setTkChoices(prev => [...prev, ''])
    setTkChoicePts(prev => [...prev, 0])
  }
  function removeChoice(i: number) {
    if (tkChoices.length <= 2) return
    setTkChoices(prev => prev.filter((_, j) => j !== i))
    setTkChoicePts(prev => prev.filter((_, j) => j !== i))
    setTkCorrect(prev => prev.filter(x => x !== i).map(x => (x > i ? x - 1 : x)))
  }

  // matching rows (left prompt ↔ right option, paired by index in tkMatchMap)
  function addMatchRow() {
    setTkMatchLeft(prev => [...prev, ''])
    setTkMatchRight(prev => [...prev, ''])
    setTkMatchMap(prev => [...prev, prev.length])
  }
  function removeMatchRow(i: number) {
    if (tkMatchLeft.length <= 2) return
    setTkMatchLeft(prev => prev.filter((_, j) => j !== i))
    setTkMatchRight(prev => prev.filter((_, j) => j !== i))
    setTkMatchMap(prev => prev.filter((_, j) => j !== i).map(x => (x >= tkMatchRight.length - 1 ? Math.max(0, x - 1) : x)))
  }

  // sequence rows (stored in correct order; teacher reorders with arrows)
  function addSeqRow() { setTkSeq(prev => [...prev, '']) }
  function removeSeqRow(i: number) { if (tkSeq.length > 2) setTkSeq(prev => prev.filter((_, j) => j !== i)) }
  function moveSeq(i: number, dir: -1 | 1) {
    setTkSeq(prev => {
      const to = i + dir
      if (to < 0 || to >= prev.length) return prev
      const next = [...prev];[next[i], next[to]] = [next[to], next[i]]; return next
    })
  }

  // table-block cell helpers
  function setTableCell(r: number, c: number, v: string) {
    setTkTableRows(prev => prev.map((row, ri) => ri === r ? row.map((cell, ci) => ci === c ? v : cell) : row))
  }
  function setTableHeader(c: number, v: string) { setTkTableHeaders(prev => prev.map((h, ci) => ci === c ? v : h)) }
  // Insert a row/column at an explicit boundary index (Notion-style hover handles).
  function insertTableRow(index: number) {
    setTkTableRows(prev => {
      const blank = (prev[0] ?? ['', '']).map(() => '')
      const n = [...prev]; n.splice(index, 0, blank); return n
    })
  }
  function insertTableCol(index: number) {
    setTkTableHeaders(prev => { const n = [...prev]; n.splice(index, 0, ''); return n })
    setTkTableRows(prev => prev.map(row => { const n = [...row]; n.splice(index, 0, ''); return n }))
  }
  function removeTableRow(r: number) { setTkTableRows(prev => prev.length > 1 ? prev.filter((_, ri) => ri !== r) : prev); setSel(null) }
  function removeTableCol(c: number) {
    if (tkTableHeaders.length <= 1) return
    setTkTableHeaders(prev => prev.filter((_, i) => i !== c))
    setTkTableRows(prev => prev.map(row => row.filter((_, i) => i !== c)))
    setSel(null)
  }
  // Delete/Backspace removes the selected row/column. While a cell with text is
  // being edited we let the key edit the text instead (only act on empty fields).
  function onTableKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!sel || (e.key !== 'Delete' && e.key !== 'Backspace')) return
    const el = e.target as HTMLElement
    if (el.tagName === 'INPUT' && (el as HTMLInputElement).value.length > 0) return
    e.preventDefault()
    if (sel.type === 'row') removeTableRow(sel.index)
    else removeTableCol(sel.index)
  }

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setTkImage(String(reader.result))
    reader.readAsDataURL(file)
  }

  function resetTaskForm() {
    setTkQuestion(''); setTkImage(''); setTkHasTable(false)
    setTkTableHeaders(['', '']); setTkTableRows([['', ''], ['', '']])
    setTkChoices(['', '', '', '']); setTkCorrect([0]); setTkChoicePts([1, 0, 0, 0])
    setTkShortAnswer('')
    setTkMatchLeft(['', '']); setTkMatchRight(['', '']); setTkMatchMap([0, 1])
    setTkSeq(['', '']); setTkSolution('')
    setAnswerKeys([]); setCriteria([])
  }

  const critTotal = criteria.reduce((s, c) => s + c.points, 0)
  // Max points the task awards, depending on the chosen scoring mode.
  // perOption sums the points of the options marked correct.
  const correctOptPts = tkCorrect.reduce((s, i) => s + (tkChoicePts[i] || 0), 0)
  const computedMax =
    scoreMode === 'perOption' ? correctOptPts
    : scoreMode === 'criteria' ? critTotal
    : trMaxPoints

  function addLesson() {
    if (!newLessonTitle.trim()) return
    addLessonByTitle(newLessonTitle.trim())
    setNewLessonTitle('')
  }
  function addLessonByTitle(title: string) {
    setCLessons(prev => [...prev, { id: uid(), title, trainerId: null, widgetId: null }])
  }

  function addWidgetItem() {
    if (wType === 'quiz' || wType === 'qod') {
      if (!wQText.trim()) return
      setWItems(prev => [...prev, { id: uid(), question: wQText.trim(), options: [...wQOpts], correct: wQCorr }])
      setWQText(''); setWQOpts(['', '', '', '']); setWQCorr(0)
    } else if (wType === 'facts') {
      if (!wFcTerm.trim()) return
      setWItems(prev => [...prev, { id: uid(), factTitle: wFcTerm.trim(), factText: wFcDef.trim() }])
      setWFcTerm(''); setWFcDef('')
    }
  }

  // Assemble the authored task into a bank-ready record, or null if incomplete.
  function buildTask(): NewBankTask | null {
    const q = tkQuestion.trim()
    if (!q) return null
    const table = tkHasTable ? { headers: tkTableHeaders, rows: tkTableRows } : undefined
    const base = {
      subject: (tkSubject === 'Химия' ? 'chemistry' : 'biology') as Subject,
      section: tkSection || tkSectionList[0],
      topic: tkTopic || tkTopicList[0] || '—',
      part: tkPart, line: tkLine, source: tkSource,
      question: q, solution: tkSolution.trim(),
      difficulty: tkDifficulty,
      answerType: tkAnswerType,
      questionImage: tkImage || undefined,
      questionTable: table,
      scoreMode,
      criteria: scoreMode === 'criteria' && criteria.length ? criteria : undefined,
      criteriaVisibleOnCheck: scoreMode === 'criteria' ? criteriaVisible : undefined,
      maxPoints: computedMax || 1,
    }

    if (tkAnswerType === 'single' || tkAnswerType === 'multi') {
      const choices = tkChoices
        .map((text, i) => ({ id: uid(), text: text.trim(), correct: tkCorrect.includes(i), points: scoreMode === 'perOption' ? tkChoicePts[i] : undefined }))
        .filter(c => c.text)
      const correctCount = tkChoices.filter((t, i) => tkCorrect.includes(i) && t.trim()).length
      if (choices.length < 2 || correctCount === 0) return null
      const answer = tkChoices.map((t, i) => ({ t, i })).filter(({ t, i }) => tkCorrect.includes(i) && t.trim()).map(({ i }) => LETTERS[i]).join('')
      return { ...base, questionType: 'choice', choices, answer }
    }
    if (tkAnswerType === 'matching') {
      const left = tkMatchLeft.map(s => s.trim())
      const right = tkMatchRight.map(s => s.trim())
      if (left.length < 2 || left.some(s => !s) || right.some(s => !s)) return null
      const answer = left.map((_, i) => `${LETTERS[i]}${tkMatchMap[i] + 1}`).join(' ')
      return { ...base, questionType: 'free', matchLeft: left, matchRight: right, answer }
    }
    if (tkAnswerType === 'sequence') {
      const items = tkSeq.map(s => s.trim())
      if (items.length < 2 || items.some(s => !s)) return null
      const answer = items.map((_, i) => i + 1).join('')
      return { ...base, questionType: 'free', sequenceItems: items, answer }
    }
    if (tkAnswerType === 'tableFill') {
      if (!table) return null
      const ans = tkShortAnswer.trim()
      if (!ans) return null
      return { ...base, questionType: 'free', answer: ans }
    }
    // short / extended
    const ans = tkShortAnswer.trim()
    if (tkAnswerType === 'short' && !ans) return null
    return {
      ...base, questionType: 'free', answer: ans,
      answerKeys: scoreMode === 'perOption' && answerKeys.length ? answerKeys : undefined,
      allowPhoto: tkAnswerType === 'extended' ? tkAllowPhoto : undefined,
    }
  }
  const builtTask = mode === 'trainer' ? buildTask() : null

  async function handleSave() {
    const dateStr = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
    if (mode === 'trainer') {
      const task = buildTask()
      if (!task) return

      if (editingTask) {
        // Update existing task in the bank, then close without creating a new trainer card.
        replaceTask(editingTask.id, task)
        onCancel()
        return
      }

      const newId = await addTask(task)

      // Create a trainer card so the task appears in the Тренажёр list.
      const isBio = tkSubject === 'Биология'
      const trainerColor = isBio ? '#5FD68A' : '#B98FFF'
      const trainerBg    = isBio ? '#D6F5E3' : '#EFE0FF'
      const trainerTitle = (tkTopic || tkSection || tkQuestion.slice(0, 40)).trim() || 'Новое задание'
      const newTrainer: Trainer = {
        id: uid(),
        title: trainerTitle,
        topic: tkTopic || tkSection || 'Общая',
        difficulty: tkDifficulty,
        timePerQuestion: 2,
        questions: [{
          id: String(newId),
          text: tkQuestion.trim(),
          answer: task.answer ?? '',
          source: 'bank',
          difficulty: tkDifficulty,
          part: tkPart,
        }],
        questionIds: [newId],
        subject: (tkSubject === 'Химия' ? 'chemistry' : 'biology'),
        color: trainerColor,
        bg: trainerBg,
        lastEdited: dateStr,
      }
      onSaveTrainer(newTrainer)
      resetTaskForm()
    } else if (mode === 'course') {
      const c: Course = {
        id: editCourse?.id ?? uid(), title: cTitle, subject: cSubject, level: cLevel,
        description: cDesc, lessons: cLessons, status: cStatus,
        color: editCourse?.color ?? '#B98FFF', bg: editCourse?.bg ?? '#EFE0FF', lastEdited: dateStr,
      }
      onSaveCourse(c)
    } else {
      const w: Widget = {
        id: uid(), title: wTitle, type: wType,
        linkedTrainerId: wLinkedId || null, items: wItems,
        color: WTYPE_COLOR[wType], bg: WTYPE_BG[wType], lastEdited: dateStr,
      }
      onSaveWidget(w)
    }
  }

  const canSave = mode === 'trainer' ? builtTask !== null
    : mode === 'course' ? cTitle.trim().length > 0
    : wTitle.trim().length > 0

  const docked = useTeacher(s => s.headerDocked)
  const setDocked = useTeacher(s => s.setHeaderDocked)
  useEffect(() => () => setDocked(false), [])

  const currentName = (mode === 'trainer' ? tkQuestion : mode === 'course' ? cTitle : wTitle).trim()
  const createLabel = mode === 'trainer' ? (editingTask ? 'Редактировать задание' : 'Создать задание') : mode === 'course' ? (editCourse ? 'Редактировать курс' : 'Создать курс') : 'Создать виджет'
  const saveLabel = mode === 'trainer' ? (editingTask ? 'Сохранить изменения' : 'Сохранить в банк') : mode === 'course' ? 'Сохранить курс' : 'Сохранить виджет'
  const paramsLabel = mode === 'course' ? 'Параметры курса' : mode === 'trainer' ? 'Параметры задания' : 'Параметры виджета'

  const savePillStyle: React.CSSProperties = teacherSaveStyle({ disabled: !canSave })

  return (
    // Single scroll container — same pattern as TeacherHomeworkCreatePage.
    // The page root is already lifted by -100, so paddingTop:100 alone lets
    // content scroll under the floating topbar.
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onScroll={e => setDocked((e.currentTarget as HTMLElement).scrollTop > 64)}
      style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarGutter: 'stable', paddingTop: 100 }}
    >
      {/* ── Docked twin — fixed on the topbar line ── */}
      <AnimatePresence>
        {docked && (
          <motion.div
            key="creator-dock"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: [0, 6, -3.5, 1.5, -0.5, 0] }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.38, ease: [0.34, 1.56, 0.64, 1] }}
            style={{
              position: 'fixed', top: 30, left: 32, right: 32, zIndex: 80,
              display: 'flex', alignItems: 'center', gap: 12, pointerEvents: 'none',
            }}
          >
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
              onClick={onCancel}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                padding: '9px 16px 9px 12px', borderRadius: 999, ...dockGlass,
                color: 'var(--color-text)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit', pointerEvents: 'auto',
              }}
            >
              <ArrowLeft size={15} strokeWidth={2} /> Назад
            </motion.button>

            <div style={{
              flexShrink: 1, minWidth: 0, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              padding: '9px 16px', borderRadius: 999, ...dockGlass,
              fontSize: 14, fontWeight: 700, color: 'var(--color-text)', pointerEvents: 'auto',
            }}>
              {currentName || createLabel}
            </div>

            <div style={{ flexGrow: 1, flexBasis: 0 }} />

            <motion.button
              whileHover={{ scale: canSave ? 1.03 : 1 }} whileTap={{ scale: canSave ? 0.97 : 1 }}
              onClick={handleSave}
              style={{ ...savePillStyle, pointerEvents: 'auto' }}
            >
              <Check size={14} strokeWidth={2.5} /> {saveLabel}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── All page content in the scroll flow ── */}
      <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 0 48px' }}>

        {/* Rest-state header — in scroll flow, fades out when docked */}
        <motion.div
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 24px 14px' }}
          animate={{ opacity: docked ? 0 : 1 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
            onClick={onCancel}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
              padding: '9px 16px 9px 12px', borderRadius: 999, border: '1px solid var(--color-border-soft)',
              background: 'rgba(var(--glass-rgb), 0.96)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
              color: 'var(--color-text)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <ArrowLeft size={15} strokeWidth={2} /> Назад
          </motion.button>

          <div style={{ flex: 1, minWidth: 0, fontSize: 18, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>
            {createLabel}
            {mode !== 'trainer' && currentName && <span style={{ color: 'var(--color-text-3)', fontWeight: 500 }}> — {currentName}</span>}
          </div>

          <motion.button
            whileHover={{ scale: canSave ? 1.03 : 1 }} whileTap={{ scale: canSave ? 0.97 : 1 }}
            onClick={handleSave}
            style={savePillStyle}
          >
            <Check size={14} strokeWidth={2.5} /> {saveLabel}
          </motion.button>
        </motion.div>

        {/* ── Body: left sticky panel + center ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>

        {/* LEFT: settings panel — sticky glass card */}
        <div style={{ padding: '0 0 20px 24px', flexShrink: 0, position: 'sticky', top: 20 }}>
          <GlassCard style={{ width: 260, boxSizing: 'border-box', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
            {paramsLabel}
          </div>

          {/* ─ Task meta left ─ */}
          {mode === 'trainer' && <>
            <div>
              <Label>Предмет</Label>
              <TeacherSelect value={tkSubject} onChange={v => { setTkSubject(v as 'Химия' | 'Биология'); setTkSection(''); setTkTopic('') }} options={['Химия', 'Биология']} />
            </div>
            <div><Label>Раздел</Label>
              <TeacherSelect value={tkSection} onChange={v => { setTkSection(v); setTkTopic('') }} placeholder="— выбрать —"
                options={[{ value: '', label: '— любой —' }, ...tkSectionList.map(s => ({ value: s, label: s }))]} />
            </div>
            <div><Label>Тема</Label>
              <TeacherSelect value={tkTopic} onChange={setTkTopic} placeholder="— выбрать —"
                options={[{ value: '', label: '— любая —' }, ...tkTopicList.map(s => ({ value: s, label: s }))]} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div><Label>Часть</Label>
                <TeacherSelect value={String(tkPart)} onChange={v => setTkPart(Number(v) as 1 | 2)}
                  options={[{ value: '1', label: 'Часть 1' }, { value: '2', label: 'Часть 2' }]} />
              </div>
              <div><Label>Линия</Label>
                <input type="number" min={1} max={35} value={tkLine}
                  onChange={e => setTkLine(Math.max(1, Number(e.target.value)))} style={inputSt} />
              </div>
            </div>
            <div><Label>Источник</Label>
              <TeacherSelect value={tkSource} onChange={setTkSource} options={SOURCES} />
            </div>
            {/* Points summary */}
            <div style={{ background: canSave ? 'var(--color-green-soft)' : 'var(--color-bg-2)', borderRadius: 12, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: canSave ? 'var(--color-green-text)' : 'var(--color-text-3)', marginBottom: 4 }}>
                {canSave ? '✓ Задание готово' : 'Заполните условие и ответ'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                {ANSWER_TYPES.find(a => a.type === tkAnswerType)?.label} · {computedMax || 1} {(computedMax || 1) === 1 ? 'балл' : (computedMax || 1) < 5 ? 'балла' : 'баллов'}
              </div>
            </div>
          </>}

          {/* ─ Course left ─ */}
          {mode === 'course' && <>
            <div><Label>Название</Label>
              <input value={cTitle} onChange={e => setCTitle(e.target.value)} style={inputSt} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div><Label>Предмет</Label>
                <TeacherSelect value={cSubject} onChange={setCSubject} options={['Химия', 'Биология']} />
              </div>
              <div><Label>Уровень</Label>
                <TeacherSelect value={cLevel} onChange={setCLevel} options={['ЕГЭ', 'ОГЭ', 'Углублённый', 'Интенсив']} />
              </div>
            </div>
            <div><Label>Описание</Label>
              <textarea value={cDesc} onChange={e => setCDesc(e.target.value)} rows={3}
                style={{ ...inputSt, resize: 'vertical' }} placeholder="Краткое описание курса…" />
            </div>
            <div><Label>Статус</Label>
              <div style={{ display: 'flex', gap: 6 }}>
                <SegBtn label="Черновик" active={cStatus === 'draft'} color="#8B4900" bg="var(--color-peach-soft)" onClick={() => setCStatus('draft')} />
                <SegBtn label="Опубликован" active={cStatus === 'published'} color="#1a7a3f" bg="var(--color-green-soft)" onClick={() => setCStatus('published')} />
              </div>
            </div>
          </>}

          {/* ─ Widget left ─ */}
          {mode === 'widget' && <>
            <div><Label>Название</Label>
              <input value={wTitle} onChange={e => setWTitle(e.target.value)} style={inputSt} />
            </div>
            <div><Label>Тип виджета</Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {(['quiz', 'facts', 'reactions', 'pomodoro'] as WidgetType[]).map(wt => {
                  const WIcon = WTYPE_ICON[wt]
                  return (
                    <button key={wt} onClick={() => setWType(wt)} style={{
                      padding: '8px 10px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 7,
                      border: wType === wt ? `1.5px solid ${WTYPE_COLOR[wt]}` : '1.5px solid transparent',
                      background: wType === wt ? WTYPE_BG[wt] : 'var(--color-bg)', cursor: 'pointer',
                      fontSize: 12, fontWeight: 600,
                      color: wType === wt ? 'var(--color-purple-text, #E8D0FF)' : 'var(--color-muted)', transition: 'all 0.15s',
                    }}>
                      <WIcon size={13} strokeWidth={2} />{WTYPE_LABEL[wt]}
                    </button>
                  )
                })}
              </div>
            </div>
            <div><Label>Привязать тренажёр</Label>
              <TeacherSelect value={wLinkedId} onChange={setWLinkedId} placeholder="— нет —"
                options={[{ value: '', label: '— нет —' }, ...trainers.map(t => ({ value: t.id, label: t.title.slice(0, 28) }))]} />
            </div>
          </>}
          </GlassCard>
        </div>

        {/* CENTER: type pills + content form */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '0 24px 20px 20px' }}>

          {/* Type pills — styled like the homework-create tab bar */}
          <div style={{
            display: 'flex', gap: 4, marginBottom: 16,
            background: 'rgba(var(--glass-rgb), 0.7)',
            backdropFilter: 'blur(12px)',
            borderRadius: 14, padding: 4,
            alignSelf: 'flex-start',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            border: '1px solid var(--color-border-glass)',
          }}>
            {(['course', 'trainer', 'widget'] as Tab[]).map(t => {
              const c = CREATOR_CFG[t]
              const isActive = mode === t
              return (
                <button key={t} onClick={() => setMode(t)} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 11, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600,
                  background: isActive ? 'var(--color-surface)' : 'transparent',
                  color: isActive ? c.color : 'var(--color-muted)',
                  fontFamily: 'inherit', transition: 'all 0.15s',
                  boxShadow: isActive ? '0 2px 10px rgba(0,0,0,0.09)' : 'none',
                }}>
                  <c.Icon size={14} strokeWidth={isActive ? 2.2 : 1.8} />
                  {c.label}
                </button>
              )
            })}
          </div>

          <GlassCard style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ─── TASK center: block-based authoring ─── */}
          {mode === 'trainer' && <>
            {/* success flash */}
            <AnimatePresence>
              {savedFlash && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--color-green-soft)', borderRadius: 14, fontSize: 13, fontWeight: 700, color: 'var(--color-green-text)', border: '1.5px solid #b4e8c2' }}>
                  <Check size={15} strokeWidth={2.5} />
                  <span>Задание сохранено в банк</span>
                  {savedTaskId !== null && (
                    <span style={{ marginLeft: 4, padding: '2px 10px', borderRadius: 999, background: 'var(--color-bg-input)', color: 'var(--color-green-text)', fontSize: 13, fontWeight: 800, letterSpacing: 0.2, border: '1.5px solid #b4e8c2' }}>
                      №{savedTaskId}
                    </span>
                  )}
                  <span style={{ marginLeft: 4, fontSize: 12, fontWeight: 600, color: 'var(--color-green-text)' }}>— дайте этот номер ученику, чтобы найти задание в тренажёре</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 1 ─ Условие */}
            <div>
              <SectionHead>Условие задания</SectionHead>
              <textarea value={tkQuestion} onChange={e => setTkQuestion(e.target.value)}
                placeholder="Введите текст задания…" rows={4}
                style={{ ...inputSt, resize: 'vertical', minHeight: 88, fontSize: 14 }} />
            </div>

            {/* image block */}
            {tkImage && (
              <div>
                <Label>Изображение</Label>
                <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--color-border-medium)', alignSelf: 'flex-start', maxWidth: 360 }}>
                  <img src={tkImage} alt="" style={{ display: 'block', maxWidth: '100%' }} />
                  <button onClick={() => setTkImage('')} style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,0.55)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* table block */}
            {tkHasTable && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
                  <Label>Таблица условия{tkAnswerType === 'tableFill' ? ' — впишите «?» в проверяемую ячейку' : ''}</Label>
                  <button onClick={() => { setTkHasTable(false); setSel(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-red-text)', fontSize: 12, fontWeight: 600 }}>Убрать</button>
                </div>
                {/* Outer wrapper with gutters on every side; the table is clipped for
                    clean rounded corners, the "+" handles sit OUTSIDE it in the gutters. */}
                <div onKeyDown={onTableKeyDown} style={{ position: 'relative', padding: 20 }}>
                  <div ref={tblBoxRef} style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--color-border-strong)' }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
                      <thead><tr>{tkTableHeaders.map((h, c) => {
                        const colSel = sel?.type === 'col' && sel.index === c
                        return (
                          <th key={c} onClick={() => setSel({ type: 'col', index: c })}
                            style={{ borderRight: '1px solid var(--color-border-medium)', borderBottom: '1px solid var(--color-border-strong)', background: colSel ? cfg.bg : 'var(--color-bg-3)', padding: 0, cursor: 'pointer', transition: 'background 0.12s' }}>
                            <input value={h} onChange={e => setTableHeader(c, e.target.value)} onFocus={() => setSel({ type: 'col', index: c })} placeholder={`Заголовок ${c + 1}`}
                              style={{ width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', background: 'transparent', padding: '8px 10px', fontWeight: 700, fontFamily: 'inherit', fontSize: 13 }} />
                          </th>
                        )
                      })}</tr></thead>
                      <tbody>{tkTableRows.map((row, r) => (
                        <tr key={r}>{row.map((cell, c) => {
                          const hl = (sel?.type === 'row' && sel.index === r) || (sel?.type === 'col' && sel.index === c)
                          return (
                            <td key={c} onClick={() => setSel({ type: 'row', index: r })}
                              style={{ borderRight: '1px solid var(--color-border)', borderTop: r > 0 ? '1px solid var(--color-border)' : undefined, padding: 0, cursor: 'pointer', background: hl ? cfg.bg : 'transparent', transition: 'background 0.12s' }}>
                              <input value={cell} onChange={e => setTableCell(r, c, e.target.value)} onFocus={() => setSel({ type: 'row', index: r })} placeholder="—"
                                style={{ width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', background: 'transparent', padding: '8px 10px', fontFamily: 'inherit', fontSize: 13 }} />
                            </td>
                          )
                        })}</tr>
                      ))}</tbody>
                    </table>
                  </div>
                  {/* column "+" in the TOP gutter, row "+" in the LEFT gutter — measured boundaries */}
                  {tblBounds.colX.map((x, i) => (
                    <InsertHandle key={`c${i}`} accent={cfg.color} title="Добавить столбец" onClick={() => insertTableCol(i)}
                      style={{ left: 20 + x - 18, top: 0, width: 36, height: 20 }} />
                  ))}
                  {tblBounds.rowY.map((y, j) => (
                    <InsertHandle key={`r${j}`} accent={cfg.color} title="Добавить строку" onClick={() => insertTableRow(j)}
                      style={{ left: 0, top: 20 + y - 18, width: 20, height: 36 }} />
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 6 }}>Внутри таблицы клик выделяет строку (по ячейке) или столбец (по заголовку), удалить выделенное — клавишей Delete. Кружки «+» по краям: сверху добавляют столбец, слева — строку.</div>
              </div>
            )}

            {/* 2 ─ Блок ответа */}
            <div style={{ borderTop: '1px solid var(--color-border-soft)', paddingTop: 16 }}>
              <SectionHead>Блок ответа · {ANSWER_TYPES.find(a => a.type === tkAnswerType)?.label}</SectionHead>

              {/* single / multi */}
              {isChoiceType && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {tkChoices.map((ans, i) => {
                    const isCorrect = tkCorrect.includes(i)
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => toggleCorrect(i)} style={{
                          width: 22, height: 22, borderRadius: tkAnswerType === 'single' ? '50%' : 7, flexShrink: 0,
                          border: isCorrect ? 'none' : '2px solid var(--color-text-4)',
                          background: isCorrect ? cfg.color : 'transparent',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {isCorrect && <Check size={11} strokeWidth={3} style={{ color: '#fff' }} />}
                        </button>
                        <span style={{ width: 24, height: 24, borderRadius: 8, flexShrink: 0, background: isCorrect ? cfg.bg : 'var(--color-bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: isCorrect ? cfg.color : 'var(--color-text-3)' }}>{LETTERS[i]}</span>
                        <input value={ans} onChange={e => setChoice(i, e.target.value)} placeholder={`Вариант ${LETTERS[i]}…`}
                          style={{ ...inputSt, flex: 1, border: isCorrect ? `1.5px solid ${cfg.color}55` : '1.5px solid var(--color-border-medium)', background: isCorrect ? `${cfg.bg}88` : 'var(--color-bg-2)' }} />
                        {scoreMode === 'perOption' && (
                          <input type="number" min={0} max={20} value={tkChoicePts[i] ?? 0}
                            onChange={e => setTkChoicePts(prev => prev.map((p, j) => j === i ? Number(e.target.value) : p))}
                            onFocus={e => e.target.select()}
                            style={{ ...inputSt, width: 52, textAlign: 'center', padding: '9px 6px', flexShrink: 0 }} />
                        )}
                        {tkChoices.length > 2 && (
                          <button onClick={() => removeChoice(i)} style={{ width: 22, height: 22, borderRadius: 7, border: 'none', cursor: 'pointer', background: 'var(--color-red-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-red-text)', flexShrink: 0 }}><X size={10} /></button>
                        )}
                      </div>
                    )
                  })}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
                    <button onClick={addChoice} style={{ padding: '6px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', background: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}><Plus size={13} /> Вариант</button>
                    <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{tkAnswerType === 'single' ? 'Отметьте один верный вариант' : 'Отметьте все верные варианты'}</span>
                  </div>
                </div>
              )}

              {/* short */}
              {tkAnswerType === 'short' && (
                <div>
                  <input value={tkShortAnswer} onChange={e => setTkShortAnswer(e.target.value)}
                    placeholder="Правильный ответ — слово, число или формула" style={inputSt} />
                  <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 6 }}>Ответ ученика сверяется без учёта регистра.</div>
                </div>
              )}

              {/* tableFill */}
              {tkAnswerType === 'tableFill' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>Таблица условия — выше. Впишите «?» в проверяемую ячейку, а сюда — правильный термин.</div>
                  <Label>Правильный термин для ячейки «?»</Label>
                  <input value={tkShortAnswer} onChange={e => setTkShortAnswer(e.target.value)} placeholder="Напр. Палеонтология" style={inputSt} />
                </div>
              )}

              {/* matching */}
              {tkAnswerType === 'matching' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>Левый столбец (А, Б, В…) сопоставляется с правым (1, 2, 3…). Выберите верный номер для каждой строки.</div>
                  {tkMatchLeft.map((l, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 24, height: 24, borderRadius: 8, flexShrink: 0, background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{LETTERS[i]}</span>
                      <input value={l} onChange={e => setTkMatchLeft(prev => prev.map((x, j) => j === i ? e.target.value : x))} placeholder="Левый элемент…" style={{ ...inputSt, flex: 1 }} />
                      <span style={{ flexShrink: 0, color: 'var(--color-text-3)', fontWeight: 700 }}>→</span>
                      <input value={tkMatchRight[i]} onChange={e => setTkMatchRight(prev => prev.map((x, j) => j === i ? e.target.value : x))} placeholder={`${i + 1}. Правый элемент…`} style={{ ...inputSt, flex: 1 }} />
                      <div style={{ width: 64, flexShrink: 0 }}>
                        <TeacherSelect small value={String(tkMatchMap[i] + 1)} onChange={v => setTkMatchMap(prev => prev.map((x, j) => j === i ? Number(v) - 1 : x))}
                          options={tkMatchRight.map((_, j) => ({ value: String(j + 1), label: `= ${j + 1}` }))} />
                      </div>
                      {tkMatchLeft.length > 2 && (
                        <button onClick={() => removeMatchRow(i)} style={{ width: 22, height: 22, borderRadius: 7, border: 'none', cursor: 'pointer', background: 'var(--color-red-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-red-text)', flexShrink: 0 }}><X size={10} /></button>
                      )}
                    </div>
                  ))}
                  <button onClick={addMatchRow} style={{ alignSelf: 'flex-start', padding: '6px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', background: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}><Plus size={13} /> Пара</button>
                </div>
              )}

              {/* sequence */}
              {tkAnswerType === 'sequence' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>Введите элементы в правильном порядке — ученику они покажутся перемешанными.</div>
                  {tkSeq.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 24, height: 24, borderRadius: 8, flexShrink: 0, background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
                      <input value={s} onChange={e => setTkSeq(prev => prev.map((x, j) => j === i ? e.target.value : x))} placeholder={`Шаг ${i + 1}…`} style={{ ...inputSt, flex: 1 }} />
                      <button onClick={() => moveSeq(i, -1)} disabled={i === 0} style={{ width: 22, height: 22, borderRadius: 6, border: 'none', cursor: i === 0 ? 'default' : 'pointer', background: 'var(--color-bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)', opacity: i === 0 ? 0.3 : 1, flexShrink: 0 }}><ArrowUp size={11} /></button>
                      <button onClick={() => moveSeq(i, 1)} disabled={i === tkSeq.length - 1} style={{ width: 22, height: 22, borderRadius: 6, border: 'none', cursor: i === tkSeq.length - 1 ? 'default' : 'pointer', background: 'var(--color-bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)', opacity: i === tkSeq.length - 1 ? 0.3 : 1, flexShrink: 0 }}><ArrowDown size={11} /></button>
                      {tkSeq.length > 2 && (
                        <button onClick={() => removeSeqRow(i)} style={{ width: 22, height: 22, borderRadius: 7, border: 'none', cursor: 'pointer', background: 'var(--color-red-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-red-text)', flexShrink: 0 }}><X size={10} /></button>
                      )}
                    </div>
                  ))}
                  <button onClick={addSeqRow} style={{ alignSelf: 'flex-start', padding: '6px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', background: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}><Plus size={13} /> Шаг</button>
                </div>
              )}

              {/* extended */}
              {tkAnswerType === 'extended' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <Label>Эталонный ответ (для проверяющего)</Label>
                    <textarea value={tkShortAnswer} onChange={e => setTkShortAnswer(e.target.value)} rows={3}
                      placeholder="Развёрнутый эталон ответа…" style={{ ...inputSt, resize: 'vertical' }} />
                  </div>
                  <button onClick={() => setTkAllowPhoto(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 12, cursor: 'pointer', border: `1.5px solid ${tkAllowPhoto ? cfg.color + '55' : 'var(--color-border-medium)'}`, background: tkAllowPhoto ? `${cfg.bg}88` : 'var(--color-bg-2)', textAlign: 'left', width: '100%' }}>
                    <span style={{ width: 34, height: 20, borderRadius: 10, flexShrink: 0, position: 'relative', background: tkAllowPhoto ? cfg.color : 'var(--color-text-4)', transition: 'background 0.15s' }}>
                      <span style={{ position: 'absolute', top: 2, left: tkAllowPhoto ? 16 : 2, width: 16, height: 16, borderRadius: '50%', background: 'var(--color-bg-input)', transition: 'left 0.15s' }} />
                    </span>
                    <ImageIcon size={15} strokeWidth={2} style={{ color: tkAllowPhoto ? cfg.color : 'var(--color-text-3)' }} />
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>Разрешить прикрепить фото решения</div>
                  </button>
                </div>
              )}
            </div>

            {/* 3 ─ Оценивание */}
            <div style={{ borderTop: '1px solid var(--color-border-soft)', paddingTop: 16 }}>
              <Label>Как оценивать</Label>
              <div style={{ display: 'flex', gap: 6, marginTop: 2, marginBottom: 12 }}>
                {([['perOption', 'За ответы'], ['criteria', 'По критериям'], ['whole', 'За всё задание']] as [ScoreMode, string][]).map(([m, label]) => (
                  <button key={m} onClick={() => setScoreMode(m)} style={{
                    padding: '9px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: scoreMode === m ? cfg.bg : 'var(--color-bg-3)', color: scoreMode === m ? cfg.color : 'var(--color-muted)',
                    fontSize: 13, fontWeight: 600, boxShadow: scoreMode === m ? `0 0 0 1.5px ${cfg.color}44` : 'none', transition: 'all 0.15s',
                  }}>{label}</button>
                ))}
              </div>

              {/* whole */}
              {scoreMode === 'whole' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="number" min={1} max={20} value={trMaxPoints} onChange={e => setTrMaxPoints(Number(e.target.value))} onFocus={e => e.target.select()} style={{ ...inputSt, width: 90, textAlign: 'center' }} />
                  <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>баллов целиком за верный ответ</span>
                </div>
              )}

              {/* perOption hint for non-choice types → keyword scoring */}
              {scoreMode === 'perOption' && !isChoiceType && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Key size={14} strokeWidth={2} style={{ color: cfg.color }} />
                    <Label>Ключи ответа — за каждое слово свой балл</Label>
                  </div>
                  {answerKeys.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {answerKeys.map(k => (
                        <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 12, background: 'var(--color-bg-input)', border: '1px solid var(--color-border-medium)' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: cfg.color, opacity: 0.7 }} />
                          <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{k.keyword}</div>
                          <div style={{ padding: '3px 10px', borderRadius: 8, background: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>+{k.points}</div>
                          <button onClick={() => removeKey(k.id)} style={{ width: 22, height: 22, borderRadius: 7, border: 'none', cursor: 'pointer', background: 'var(--color-red-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-red-text)', flexShrink: 0 }}><X size={10} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}><Label>Ключевое слово</Label>
                      <input value={newKw} onChange={e => setNewKw(e.target.value)} onKeyDown={e => e.key === 'Enter' && addKey()} placeholder="Напр. дыхание, теплоотдача…" style={inputSt} />
                    </div>
                    <div style={{ width: 80 }}><Label>Баллов</Label>
                      <input type="number" min={1} max={20} value={newKwPts} onChange={e => setNewKwPts(Number(e.target.value))} onFocus={e => e.target.select()} style={inputSt} />
                    </div>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={addKey} style={{ height: 38, width: 38, borderRadius: 12, border: 'none', cursor: 'pointer', background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Plus size={16} strokeWidth={2.4} /></motion.button>
                  </div>
                </div>
              )}
              {scoreMode === 'perOption' && isChoiceType && (
                <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>Баллы за каждый вариант задаются в блоке ответа выше.</div>
              )}

              {/* criteria */}
              {scoreMode === 'criteria' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ListChecks size={14} strokeWidth={2} style={{ color: cfg.color }} />
                    <Label>Критерии оценивания — у каждого свои баллы</Label>
                  </div>
                  {criteria.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {criteria.map((c, idx) => (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 12, background: 'var(--color-bg-input)', border: '1px solid var(--color-border-medium)' }}>
                          <span style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{idx + 1}</span>
                          <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{c.text}</div>
                          <div style={{ padding: '3px 10px', borderRadius: 8, background: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>+{c.points}</div>
                          <button onClick={() => removeCriterion(c.id)} style={{ width: 22, height: 22, borderRadius: 7, border: 'none', cursor: 'pointer', background: 'var(--color-red-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-red-text)', flexShrink: 0 }}><X size={10} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}><Label>Критерий</Label>
                      <input value={newCrit} onChange={e => setNewCrit(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCriterion()} placeholder="Напр. записано уравнение реакции…" style={inputSt} />
                    </div>
                    <div style={{ width: 80 }}><Label>Баллов</Label>
                      <input type="number" min={1} max={20} value={newCritPts} onChange={e => setNewCritPts(Number(e.target.value))} onFocus={e => e.target.select()} style={inputSt} />
                    </div>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={addCriterion} style={{ height: 38, width: 38, borderRadius: 12, border: 'none', cursor: 'pointer', background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Plus size={16} strokeWidth={2.4} /></motion.button>
                  </div>
                  <button onClick={() => setCriteriaVisible(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 12, cursor: 'pointer', border: `1.5px solid ${criteriaVisible ? cfg.color + '55' : 'var(--color-border-medium)'}`, background: criteriaVisible ? `${cfg.bg}88` : 'var(--color-bg-2)', textAlign: 'left', width: '100%' }}>
                    <span style={{ width: 34, height: 20, borderRadius: 10, flexShrink: 0, position: 'relative', background: criteriaVisible ? cfg.color : 'var(--color-text-4)' }}>
                      <span style={{ position: 'absolute', top: 2, left: criteriaVisible ? 16 : 2, width: 16, height: 16, borderRadius: '50%', background: 'var(--color-bg-input)', transition: 'left 0.15s' }} />
                    </span>
                    {criteriaVisible ? <Eye size={15} strokeWidth={2} style={{ color: cfg.color }} /> : <EyeOff size={15} strokeWidth={2} style={{ color: 'var(--color-text-3)' }} />}
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>Показывать критерии студенту при проверке</div>
                  </button>
                </div>
              )}
            </div>

            {/* 4 ─ Объяснение */}
            <div style={{ borderTop: '1px solid var(--color-border-soft)', paddingTop: 16 }}>
              <Label>Объяснение / решение (показывается после ответа)</Label>
              <div style={{ border: '1.5px solid var(--color-border-medium)', borderRadius: 12, background: 'var(--color-green-soft)', overflow: 'hidden' }}>
                <textarea
                  ref={explTextareaRef}
                  value={tkSolution}
                  onChange={e => {
                    setTkSolution(e.target.value)
                    const el = e.target
                    el.style.height = 'auto'
                    el.style.height = Math.max(90, el.scrollHeight) + 'px'
                  }}
                  onFocus={e => {
                    const el = e.target
                    el.style.height = 'auto'
                    el.style.height = Math.max(90, el.scrollHeight) + 'px'
                  }}
                  placeholder="Почему этот ответ верный…"
                  rows={3}
                  style={{ ...inputSt, resize: 'none', background: 'transparent', border: 'none', borderRadius: 0, minHeight: 90, width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}
                />
                {explPhotos.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 12px 12px' }}>
                    {explPhotos.map((src, i) => (
                      <div key={i} style={{ position: 'relative', display: 'inline-block' }}>
                        <img src={src} alt="" style={{ maxWidth: 180, maxHeight: 140, borderRadius: 8, objectFit: 'cover', display: 'block' }} />
                        <button
                          onClick={() => setExplPhotos(prev => prev.filter((_, j) => j !== i))}
                          style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.55)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, lineHeight: 1 }}
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ borderTop: '1px solid var(--color-border)', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--color-green-text)', fontWeight: 600, userSelect: 'none' }}>
                    <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => {
                      const files = Array.from(e.target.files || [])
                      files.forEach(file => {
                        const reader = new FileReader()
                        reader.onload = ev => {
                          if (ev.target?.result) setExplPhotos(prev => [...prev, ev.target!.result as string])
                        }
                        reader.readAsDataURL(file)
                      })
                      e.target.value = ''
                    }} />
                    <ImageIcon size={14} />
                    Добавить фото
                  </label>
                </div>
              </div>
            </div>
          </>}

          {/* ─── COURSE center ─── */}
          {mode === 'course' && (
            <div>
              <SectionHead>Уроки курса ({cLessons.length})</SectionHead>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {cLessons.map((lesson, idx) => (
                  <div key={lesson.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--color-bg-input)', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                    <div style={{ width: 22, height: 22, borderRadius: 7, background: 'var(--color-purple-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#7B3FCC', flexShrink: 0 }}>{idx + 1}</div>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{lesson.title}</div>
                    <button onClick={() => setCLessons(prev => prev.map((l, i) => {
                      if (i === idx - 1) return cLessons[idx]
                      if (i === idx) return cLessons[idx - 1]
                      return l
                    }))} disabled={idx === 0} style={{ width: 22, height: 22, borderRadius: 6, border: 'none', cursor: idx === 0 ? 'not-allowed' : 'pointer', background: 'var(--color-bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)', opacity: idx === 0 ? 0.3 : 1 }}>
                      <ArrowUp size={11} />
                    </button>
                    <button onClick={() => setCLessons(prev => prev.filter(l => l.id !== lesson.id))} style={{ width: 22, height: 22, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'var(--color-red-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-red-text)' }}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <LessonNameInput value={newLessonTitle} onChange={setNewLessonTitle} onAdd={addLessonByTitle} />
                <motion.button whileTap={{ scale: 0.95 }} onClick={addLesson}
                  style={{ width: 38, height: 38, borderRadius: 11, border: 'none', cursor: 'pointer', background: 'var(--color-purple-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7B3FCC', flexShrink: 0 }}>
                  <Plus size={16} strokeWidth={2.4} />
                </motion.button>
              </div>
            </div>
          )}

          {/* ─── WIDGET center ─── */}
          {mode === 'widget' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <SectionHead>Содержимое — {WTYPE_LABEL[wType]}</SectionHead>
              {(wType === 'quiz' || wType === 'qod') && <>
                <div><Label>Вопрос</Label><input value={wQText} onChange={e => setWQText(e.target.value)} placeholder="Текст вопроса…" style={inputSt} /></div>
                {wQOpts.map((opt, oi) => (
                  <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button onClick={() => setWQCorr(oi)} style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid', flexShrink: 0, borderColor: wQCorr === oi ? WTYPE_COLOR[wType] : 'var(--color-text-4)', background: wQCorr === oi ? WTYPE_COLOR[wType] : 'transparent', cursor: 'pointer' }} />
                    <input value={opt} onChange={e => { const o = [...wQOpts]; o[oi] = e.target.value; setWQOpts(o) }} placeholder={`Вариант ${oi + 1}…`} style={{ ...inputSt, flex: 1 }} />
                  </div>
                ))}
              </>}
              {wType === 'facts' && <>
                <div><Label>Заголовок факта</Label><input value={wFcTerm} onChange={e => setWFcTerm(e.target.value)} style={inputSt} /></div>
                <div><Label>Текст факта</Label><textarea value={wFcDef} onChange={e => setWFcDef(e.target.value)} rows={3} style={{ ...inputSt, resize: 'vertical' }} /></div>
              </>}
              <motion.button whileTap={{ scale: 0.97 }} onClick={addWidgetItem}
                style={{ padding: '9px 0', borderRadius: 12, border: 'none', cursor: 'pointer', background: WTYPE_BG[wType], color: WTYPE_COLOR[wType], fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Plus size={13} /> Добавить элемент
              </motion.button>
              {wItems.length > 0 && (
                <div>
                  <SectionHead>Добавлено: {wItems.length}</SectionHead>
                  {wItems.slice(0, 5).map((item, i) => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--color-bg-2)', borderRadius: 9, marginBottom: 4 }}>
                      <div style={{ width: 18, height: 18, borderRadius: 5, background: WTYPE_BG[wType], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: WTYPE_COLOR[wType] }}>{i + 1}</div>
                      <div style={{ flex: 1, fontSize: 11, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.question ?? item.factTitle ?? '—'}</div>
                      <button onClick={() => setWItems(prev => prev.filter(x => x.id !== item.id))} style={{ width: 18, height: 18, borderRadius: 5, border: 'none', cursor: 'pointer', background: 'var(--color-red-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-red-text)' }}><X size={9} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          </GlassCard>
        </div>{/* end center column */}

        {/* RIGHT: block palette (trainer mode) */}
        {mode === 'trainer' && (
          <div style={{ padding: '0 24px 20px 0', flexShrink: 0, position: 'sticky', top: 20 }}>
            <GlassCard style={{ width: 248, boxSizing: 'border-box', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <SectionHead>Тип ответа</SectionHead>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {ANSWER_TYPES.map(({ type, label, hint, Icon }) => {
                    const active = tkAnswerType === type
                    return (
                      <button key={type} onClick={() => {
                        setTkAnswerType(type)
                        if (type === 'tableFill') setTkHasTable(true)
                        if (type === 'multi' && tkCorrect.length === 0) setTkCorrect([0])
                        if (type === 'single' && tkCorrect.length > 1) setTkCorrect([tkCorrect[0]])
                      }} style={{
                        display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 11,
                        border: active ? `1.5px solid ${cfg.color}` : '1.5px solid transparent',
                        background: active ? cfg.bg : 'var(--color-bg)', cursor: 'pointer', textAlign: 'left', width: '100%',
                      }}>
                        <Icon size={15} strokeWidth={2} style={{ color: active ? cfg.color : 'var(--color-text-3)', flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: active ? cfg.color : 'var(--color-text)' }}>{label}</div>
                          <div style={{ fontSize: 10.5, color: active ? 'var(--color-accent)' : 'var(--color-text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: active ? 0.75 : 1 }}>{hint}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--color-border-soft)', paddingTop: 14 }}>
                <SectionHead>Блоки условия</SectionHead>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 11, background: 'var(--color-bg)', cursor: 'pointer' }}>
                    <ImageIcon size={15} strokeWidth={2} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-text)' }}>{tkImage ? 'Заменить фото' : 'Добавить фото'}</div>
                    <input type="file" accept="image/*" onChange={onPickImage} style={{ display: 'none' }} />
                  </label>
                  <button onClick={() => setTkHasTable(v => !v)} style={{
                    display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 11,
                    border: tkHasTable ? `1.5px solid ${cfg.color}` : '1.5px solid transparent',
                    background: tkHasTable ? cfg.bg : 'var(--color-bg)', cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}>
                    <TableIcon size={15} strokeWidth={2} style={{ color: tkHasTable ? cfg.color : 'var(--color-text-3)', flexShrink: 0 }} />
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: tkHasTable ? cfg.color : 'var(--color-text)' }}>{tkHasTable ? 'Таблица добавлена' : 'Добавить таблицу'}</div>
                  </button>
                </div>
              </div>
            </GlassCard>
          </div>
        )}
        </div>{/* end body row */}
      </div>{/* end page content */}
    </motion.div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function TeacherConstructorPage() {
  const [activeTab, setActiveTab] = useState<Tab>('course')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creatorMode, setCreatorMode] = useState<Tab | null>(null)
  const [editCourse, setEditCourse] = useState<Course | null>(null)
  const [editTrainer, setEditTrainer] = useState<Trainer | null>(null)
  const [selectedTrainerId, setSelectedTrainerId] = useState<string | null>(null)
  const [courses, setCourses] = useState<Course[]>(() => {
    try { const s = localStorage.getItem('constructor-courses'); return s ? JSON.parse(s) : COURSES_INIT } catch { return COURSES_INIT }
  })
  const [trainers, setTrainers] = useState<Trainer[]>(() => {
    try {
      const s = localStorage.getItem('constructor-trainers')
      const v = localStorage.getItem('constructor-trainers-v')
      if (s && v === '2') return JSON.parse(s)
    } catch {}
    return TRAINERS_INIT
  })
  const [widgets, setWidgets] = useState<Widget[]>(() => {
    try { const s = localStorage.getItem('constructor-widgets'); return s ? JSON.parse(s) : WIDGETS_INIT } catch { return WIDGETS_INIT }
  })
  const [editMode, setEditMode] = useState(false)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())

  useEffect(() => { try { localStorage.setItem('constructor-courses', JSON.stringify(courses)) } catch {} }, [courses])
  useEffect(() => { try { localStorage.setItem('constructor-trainers', JSON.stringify(trainers)); localStorage.setItem('constructor-trainers-v', '2') } catch {} }, [trainers])
  useEffect(() => { try { localStorage.setItem('constructor-widgets', JSON.stringify(widgets)) } catch {} }, [widgets])

  const [bankFilters, setBankFilters] = useState<TrainerFilters>(emptyTrainerFilters)
  const removeTask = useTaskBank(s => s.removeTask)
  const loadTasks = useTaskBank(s => s.load)
  useEffect(() => { loadTasks() }, [])

  // Open straight into a creator view when navigated here from the topbar "+" menu.
  const constructorIntent = useTeacher(s => s.constructorIntent)
  const clearConstructorIntent = useTeacher(s => s.clearConstructorIntent)
  useEffect(() => {
    if (!constructorIntent) return
    setActiveTab(constructorIntent)
    setEditCourse(null)
    setCreatorMode(constructorIntent)
    setSelectedId(null)
    clearConstructorIntent()
  }, [constructorIntent, clearConstructorIntent])

  // Open straight into trainer task editor when pencil is clicked on a bank card.
  const editTaskIntent = useTeacher(s => s.editTaskIntent)
  const clearEditTaskIntent = useTeacher(s => s.clearEditTaskIntent)
  const allTasks = useTaskBank(s => s.tasks)
  const [editingTask, setEditingTask] = useState<BankTask | null>(null)
  useEffect(() => {
    if (editTaskIntent == null) return
    const task = allTasks.find(t => t.id === editTaskIntent) ?? null
    setActiveTab('trainer')
    setEditCourse(null)
    setCreatorMode('trainer')
    setSelectedId(null)
    setEditingTask(task)
    clearEditTaskIntent()
  }, [editTaskIntent, clearEditTaskIntent])

  const selectedCourse  = courses.find(c => c.id === selectedId) ?? null
  const selectedTrainer = trainers.find(t => t.id === selectedId) ?? null
  const selectedWidget  = widgets.find(w => w.id === selectedId) ?? null
  // Whether the side editor panel is open — drives the synchronized list shift.
  const panelOpen = (!!selectedCourse && activeTab === 'course') || (!!selectedWidget && activeTab === 'widget')

  function openItem(id: string) { setSelectedId(prev => prev === id ? null : id) }
  function closeEditor() { setSelectedId(null) }

  function handleTabChange(t: Tab) {
    setActiveTab(t); setSelectedId(null); setCreatorMode(null); setEditCourse(null); setEditTrainer(null); setSelectedTrainerId(null)
    setEditMode(false); setCheckedIds(new Set())
  }

  function handlePlus() {
    setEditCourse(null); setEditTrainer(null)
    setCreatorMode(activeTab)
    setSelectedId(null)
    setEditMode(false); setCheckedIds(new Set())
  }

  function toggleEditMode() {
    setEditMode(prev => !prev)
    setCheckedIds(new Set())
    setSelectedId(null)
  }

  function toggleCheck(id: string) {
    setCheckedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function deleteChecked() {
    if (activeTab === 'course') setCourses(prev => prev.filter(c => !checkedIds.has(c.id)))
    else if (activeTab === 'trainer') setTrainers(prev => prev.filter(t => !checkedIds.has(t.id)))
    else setWidgets(prev => prev.filter(w => !checkedIds.has(w.id)))
    setCheckedIds(new Set())
    setEditMode(false)
  }

  // Trainer cards open straight into the full-screen bank-browser editor.
  function handleOpenTrainer(t: Trainer) {
    setEditTrainer(t)
    setCreatorMode('trainer')
    setSelectedId(null)
  }

  // "Раскрыть на всю" — open the full-screen editor pre-loaded to edit this course.
  function handleExpandCourse(c: Course) {
    setEditCourse(c)
    setCreatorMode('course')
    setSelectedId(null)
  }

  function handleSaveTrainer(t: Trainer) {
    // Upsert: update in place when editing, else prepend.
    setTrainers(prev => prev.some(x => x.id === t.id) ? prev.map(x => x.id === t.id ? t : x) : [t, ...prev])
    setCreatorMode(null)
    setEditTrainer(null)
    setActiveTab('trainer')
    setSelectedId(t.id)
  }

  function handleSaveCourse(c: Course) {
    // Upsert: update in place when editing an existing course, else prepend.
    setCourses(prev => prev.some(x => x.id === c.id) ? prev.map(x => x.id === c.id ? c : x) : [c, ...prev])
    setCreatorMode(null)
    setEditCourse(null)
    setActiveTab('course')
    setSelectedId(c.id)
  }

  function handleSaveWidget(w: Widget) {
    setWidgets(prev => [w, ...prev])
    setCreatorMode(null)
    setActiveTab('widget')
    setSelectedId(w.id)
  }

  const tabCfg = {
    course:  { label: 'Курс',     Icon: BookOpen, color: 'var(--color-green-text)',     bg: 'var(--color-green-soft)' },
    trainer: { label: 'Тренажёр', Icon: Zap,      color: 'var(--color-accent)',         bg: 'var(--color-purple-soft)' },
    widget:  { label: 'Виджет',   Icon: Layers,   color: 'var(--color-blue-pill-text)', bg: 'var(--color-blue-pill-bg)' },
  }

  return (
    // overflow:visible + marginTop:-100 so both sub-views can lift content under the topbar blur.
    <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'visible', marginTop: -100 }}>
      <AnimatePresence mode="wait">
        {creatorMode ? (
          <CreatorView
            key={editCourse ? `edit-${editCourse.id}` : editTrainer ? `edit-tr-${editTrainer.id}` : editingTask ? `edit-task-${editingTask.id}` : 'creator'}
            initialMode={creatorMode}
            editCourse={editCourse}
            editTrainer={editTrainer}
            editingTask={editingTask}
            trainers={trainers}
            widgets={widgets}
            onSaveTrainer={handleSaveTrainer}
            onSaveCourse={handleSaveCourse}
            onSaveWidget={handleSaveWidget}
            onCancel={() => { setCreatorMode(null); setEditCourse(null); setEditTrainer(null); setEditingTask(null) }}
          />
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ flex: 1, display: 'flex', minWidth: 0, overflow: 'hidden', position: 'relative' }}
          >
            <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', scrollbarGutter: 'stable', padding: '100px 32px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {/* Edit-mode toggle — square button */}
                <motion.button
                  whileTap={{ scale: 0.93 }}
                  onClick={toggleEditMode}
                  title={editMode ? 'Выйти из режима редактирования' : 'Редактировать'}
                  style={{
                    width: 44, padding: '10px 0', borderRadius: 16, border: 'none', cursor: 'pointer', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: editMode ? 'var(--color-red-soft)' : 'rgba(var(--glass-rgb), 0.88)',
                    color: editMode ? 'var(--color-red-text)' : 'var(--color-muted)',
                    boxShadow: editMode ? '0 0 0 1.5px #c0303a44, 0 4px 14px rgba(0,0,0,0.06)' : '0 2px 8px rgba(0,0,0,0.07)',
                    transition: 'all 0.15s',
                  }}
                >
                  {editMode ? <X size={17} strokeWidth={2.4} /> : <Pencil size={16} strokeWidth={2} />}
                </motion.button>

                {(['course', 'trainer', 'widget'] as Tab[]).map(t => {
                  const cfg = tabCfg[t]
                  return <TabBtn key={t} tab={t} activeTab={activeTab} label={cfg.label} icon={cfg.Icon} color={cfg.color} bg={cfg.bg}
                    onClick={() => t === activeTab ? handlePlus() : handleTabChange(t)} onPlus={handlePlus} />
                })}

                {/* Delete bar — shown when items are checked */}
                <AnimatePresence>
                  {editMode && checkedIds.size > 0 && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.92, x: -10 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.92, x: -10 }}
                      transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                      onClick={deleteChecked}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        padding: '10px 18px', borderRadius: 14, border: 'none', cursor: 'pointer',
                        background: '#c0303a', color: '#fff', fontSize: 13, fontWeight: 700,
                        boxShadow: '0 4px 14px rgba(192,48,58,0.32)',
                      }}
                    >
                      <Trash2 size={14} strokeWidth={2.4} />
                      Удалить {checkedIds.size}
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
              {activeTab === 'trainer' && (
                <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <TrainerBankBrowser
                      filters={bankFilters}
                      selectedIds={new Set()}
                      onToggleSelected={() => {}}
                      onForkSelected={() => {}}
                      onDeleteTask={id => removeTask(id)}
                      showSelect={false}
                      compact={true}
                      accent="var(--color-purple-text)"
                      accentBg="var(--color-purple-soft)"
                    />
                  </div>
                  <TrainerBankFilterPanel
                    filters={bankFilters}
                    onChange={f => setBankFilters(prev => ({ ...prev, ...f }))}
                    accent="var(--color-purple-text)"
                    accentBg="var(--color-purple-soft)"
                  />
                </div>
              )}
              <motion.div
                animate={{ marginRight: panelOpen && !editMode ? 384 : 0 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: activeTab === 'trainer' ? 'none' : 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                {activeTab === 'course' && courses.map(c => (
                  <div key={c.id} style={{ position: 'relative' }}>
                    <CourseCard course={c} isSelected={!editMode && selectedId === c.id}
                      onClick={() => editMode ? toggleCheck(c.id) : openItem(c.id)} />
                    {editMode && (
                      <div onClick={() => toggleCheck(c.id)} style={{
                        position: 'absolute', top: 12, left: 12, width: 22, height: 22, borderRadius: 7,
                        border: checkedIds.has(c.id) ? '2px solid #c0303a' : '2px solid rgba(0,0,0,0.18)',
                        background: checkedIds.has(c.id) ? '#c0303a' : 'rgba(var(--glass-rgb), 0.9)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'all 0.14s', zIndex: 5,
                        boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
                      }}>
                        {checkedIds.has(c.id) && <Check size={13} strokeWidth={3} style={{ color: '#fff' }} />}
                      </div>
                    )}
                  </div>
                ))}
                {activeTab === 'widget' && widgets.map(w => (
                  <div key={w.id} style={{ position: 'relative' }}>
                    <WidgetCard widget={w} isSelected={!editMode && selectedId === w.id}
                      onClick={() => editMode ? toggleCheck(w.id) : openItem(w.id)} />
                    {editMode && (
                      <div onClick={() => toggleCheck(w.id)} style={{
                        position: 'absolute', top: 12, left: 12, width: 22, height: 22, borderRadius: 7,
                        border: checkedIds.has(w.id) ? '2px solid #c0303a' : '2px solid rgba(0,0,0,0.18)',
                        background: checkedIds.has(w.id) ? '#c0303a' : 'rgba(255,255,255,0.9)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'all 0.14s', zIndex: 5,
                        boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
                      }}>
                        {checkedIds.has(w.id) && <Check size={13} strokeWidth={3} style={{ color: '#fff' }} />}
                      </div>
                    )}
                  </div>
                ))}
              </motion.div>
            </div>
            <AnimatePresence>
              {selectedCourse && activeTab === 'course' && (
                <CourseEditor key={selectedCourse.id} course={selectedCourse} trainers={trainers} widgets={widgets}
                  onSave={c => setCourses(prev => prev.map(x => x.id === c.id ? c : x))} onClose={closeEditor}
                  onExpand={() => handleExpandCourse(selectedCourse)} />
              )}
              {/* Trainer editing now happens in the full-screen CreatorView (bank browser) */}
              {selectedWidget && activeTab === 'widget' && (
                <WidgetEditor key={selectedWidget.id} widget={selectedWidget} trainers={trainers}
                  onSave={w => setWidgets(prev => prev.map(x => x.id === w.id ? w : x))} onClose={closeEditor} />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
