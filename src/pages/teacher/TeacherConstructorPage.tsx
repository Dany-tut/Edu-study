import { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Zap, Layers, Plus, Clock,
  GraduationCap, Brain, FileText, X, Check,
  Trash2, Link2, Database, Sparkles, ArrowUp, ArrowDown,
  CircleHelp, FlaskConical, Atom, Timer, Laugh,
  Image as ImageIcon, Key, ArrowLeft, Maximize2,
  ListChecks, Eye, EyeOff,
  CircleDot, Type as TypeIcon, Shuffle, ArrowUpDown, Table as TableIcon,
  AlignLeft, Pencil, ClipboardCopy, Target, ChevronDown, ChevronUp,
  CheckCircle, Circle, Globe, Copy, Search, LayoutGrid,
  Settings, TrendingUp, ArrowLeftRight, RotateCcw, Palette,
  ChevronLeft, ChevronRight, Calendar, Users,
} from 'lucide-react'
import RichConditionEditor from '../../components/teacher/RichConditionEditor'
import {
  loadDiagQuestions, fetchDiagQuestions, saveDiagQuestions,
  loadAnonResults, linkAnonResult, unlinkAnonResult, deleteAnonResult,
  createTestAssignment, loadTestAssignments, deleteTestAssignment, loadAssignmentResults,
  type DiagQuestion, type DiagSubject, type AnonDiagResult, type TestAssignment,
  DEFAULT_QUESTIONS,
} from '../../data/diagnosticData'
import { useAllStudents, useGroups } from '../../lib/useGroups'
import { supabase } from '../../lib/supabase'
import { AP_DB_COURSE_BY_CONSTRUCTOR_ID } from '../../data/apChemistry'
import { AP_LESSON_CONTENT } from '../../data/apChemistryLessons'
import type { LessonContentData, LessonParagraph, HomeworkQuizQuestion, HomeworkTeacherTask } from '../../data/lessonContent'
import { useTeacher } from '../../store/teacherStore'
import { useTaskBank } from '../../store/taskBankStore'
import { TrainerBankBrowser, TrainerBankFilterPanel, emptyTrainerFilters, type TrainerFilters } from '../../components/teacher/TrainerBank'
import CurriculumManager from '../../components/teacher/CurriculumManager'
import { useCourseLessons } from '../../lib/useCourseLessons'
import TeacherSelect from '../../components/teacher/TeacherSelect'
import { useTaskMeta, mergeOptions, sectionScope, topicScope, SOURCE_SCOPE } from '../../store/taskMetaStore'
import TeacherSaveButton, { teacherSaveStyle, SAVE_ACCENTS } from '../../components/teacher/TeacherSaveButton'
import {
  type AnswerType, type Task as BankTask, type TaskChoice, type Subject,
  BIOLOGY_SECTIONS, CHEMISTRY_SECTIONS,
  BIOLOGY_TOPICS, CHEMISTRY_TOPICS, SOURCES,
} from '../../data/taskBankData'
import { AP_CHEM_COURSES, AP_CHEM_TRAINERS, AP_CHEM_WIDGETS, mergeById } from '../../data/apChemistry'
import {
  loadScreeningConfig, fetchScreeningConfig, saveScreeningConfig,
  DEFAULT_SCREENING_CONFIG, activeDomains,
  type ScreeningConfig, type DomainKey, type MatrixRuleKey, type SeriesType, type AnalogyItem, type MatchTask,
} from '../../data/screeningConfig'

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
type Tab = 'course' | 'trainer' | 'widget' | 'testing' | 'bank'
export type CourseStatus = 'published' | 'draft'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type WidgetType = 'quiz' | 'facts' | 'reactions' | 'pomodoro' | 'memes' | 'qod'
export type QuestionType = 'choice' | 'free'

export interface AnswerKey {
  id: string
  keyword: string
  points: number
}

export type ScoreMode = 'perOption' | 'criteria' | 'whole'

export interface Criterion {
  id: string
  text: string
  points: number
}

export interface Lesson {
  id: string
  title: string
  trainerId: string | null
  widgetId: string | null
}

export interface Course {
  id: string; title: string; subject: string; level: string
  description: string; lessons: Lesson[]
  color: string; bg: string; status: CourseStatus; lastEdited: string
  /** short_id of the matching Supabase course, when this course is published to
   *  the DB. Enrollment (writing lesson_progress) targets this course's lessons. */
  dbCourseId?: string
  /** Access assignment saved on the course (group_ids / student_ids in the DB).
   *  Distinct from enrollment (lesson_progress) — these are "кому дать доступ". */
  groupIds?: string[]; studentIds?: string[]
}

interface BankQuestion {
  id: string; topic: string; text: string; answer: string; difficulty: Difficulty
}

export interface TrainerAnswer { id: string; text: string; correct?: boolean; points?: number }

export interface TrainerQ {
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

export interface Trainer {
  id: string; title: string; topic: string; difficulty: Difficulty
  timePerQuestion: number; questions: TrainerQ[]
  // Shared-bank task numbers (useTaskBank ids) this trainer is built from. The
  // `questions` array above is kept as a denormalised snapshot for cards/widgets.
  questionIds?: number[]
  subject?: string
  color: string; bg: string; lastEdited: string
}

export interface WidgetItem {
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

export interface Widget {
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
    color: 'var(--color-purple)', bg: 'var(--color-purple-soft)', status: 'published', lastEdited: '09.06',
    lessons: [
      { id: 'l1', title: 'Периодический закон', trainerId: 't3', widgetId: 'w2' },
      { id: 'l2', title: 'Гидролиз солей',      trainerId: 't1', widgetId: null  },
      { id: 'l3', title: 'Органические реакции', trainerId: null, widgetId: 'w1' },
    ],
  },
  {
    id: 'c2', title: 'ОГЭ по Химии — Базовый', subject: 'Химия', level: 'ОГЭ',
    description: 'Базовая подготовка к ОГЭ',
    color: 'var(--color-purple)', bg: 'var(--color-purple-soft)', status: 'published', lastEdited: '07.06',
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
    linkedTrainerId: 't1', color: 'var(--color-accent)', bg: 'var(--color-purple-soft)', lastEdited: '10.06',
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
const WTYPE_COLOR: Record<WidgetType, string> = { quiz: 'var(--color-purple-text,var(--color-accent))', facts: 'var(--color-green-text)', reactions: 'var(--color-blue-pill-text)', pomodoro: 'var(--color-peach-text)', memes: 'var(--color-purple-text,var(--color-purple))', qod: 'var(--color-teal-pill-text)' }
const WTYPE_BG:    Record<WidgetType, string> = { quiz: 'var(--color-purple-soft)', facts: 'var(--color-green-soft)', reactions: 'var(--color-blue-pill-bg)', pomodoro: 'var(--color-peach-soft)', memes: 'var(--color-purple-soft)', qod: 'var(--color-teal-pill-bg)' }
const STATUS_LABEL: Record<CourseStatus, string> = { published: 'Опубликован', draft: 'Черновик' }
const STATUS_COLOR: Record<CourseStatus, string> = { published: 'var(--color-green-text)', draft: 'var(--color-peach-text)' }
const STATUS_BG:   Record<CourseStatus, string> = { published: 'var(--color-green-soft)', draft: 'var(--color-peach-soft)' }

// Module-level cache — survives page remounts (navigate away and back)
let _cachedCourses: Course[] | null = null
let _cachedTrainers: Trainer[] | null = null
let _cachedWidgets: Widget[] | null = null

// ─── DB → local mappers ───────────────────────────────────────────────────────
function fmtDate(iso: string | null | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
}
function dbCourseToLocal(c: any): Course {
  const lessons = (c.lessons ?? [])
    .sort((a: any, b: any) => a.lesson_number - b.lesson_number)
    .map((l: any) => ({ id: l.short_id ?? l.id, title: l.title, trainerId: l.trainer_id ?? null, widgetId: l.widget_id ?? null }))
  return {
    id: c.short_id, title: c.title, subject: c.subject ?? 'Химия', level: c.level ?? 'ЕГЭ',
    description: c.description ?? '', color: c.color ?? 'var(--color-purple)', bg: c.bg ?? 'var(--color-purple-soft)',
    status: (c.status as CourseStatus) ?? 'draft', lastEdited: fmtDate(c.updated_at ?? c.created_at),
    dbCourseId: c.short_id, lessons,
    groupIds: c.group_ids ?? [], studentIds: c.student_ids ?? [],
  }
}
function dbTrainerToLocal(t: any): Trainer {
  return {
    id: t.id, title: t.title, topic: t.topic ?? '', difficulty: (t.difficulty as Difficulty) ?? 'medium',
    timePerQuestion: t.time_per_question ?? 30, questions: t.questions ?? [],
    subject: t.subject, color: t.color ?? 'var(--color-purple)', bg: t.bg ?? 'var(--color-purple-soft)',
    lastEdited: fmtDate(t.updated_at ?? t.created_at),
  }
}
function dbWidgetToLocal(w: any): Widget {
  return {
    id: w.id, title: w.title, type: w.type as WidgetType,
    linkedTrainerId: w.linked_trainer_id ?? null, items: w.items ?? [],
    color: w.color ?? 'var(--color-purple)', bg: w.bg ?? 'var(--color-purple-soft)',
    lastEdited: fmtDate(w.updated_at ?? w.created_at),
  }
}

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
      background: active ? bg : 'var(--color-bg-3)',
      color: active ? color : 'var(--color-text-2)',
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
        <div>
          <Label>Предмет</Label>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['Химия', 'Биология'] as const).map(s => (
              <SegBtn key={s} label={s} active={subject === s} color="var(--color-purple-text)" bg="var(--color-purple-soft)" onClick={() => setSubject(s)} />
            ))}
          </div>
        </div>
        <div>
          <TeacherSelect value={level} onChange={setLevel} placeholder="Уровень" options={['ЕГЭ', 'ОГЭ', 'AP', 'Углублённый', 'Интенсив']} />
        </div>

        {/* Description */}
        <div><Label>Описание</Label>
          <textarea ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }} value={description} onChange={e => { setDescription(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
            style={{ ...inputSt, resize: 'none', minHeight: 56, overflow: 'hidden' }} />
        </div>

        {/* Status */}
        <div><Label>Статус</Label>
          <div style={{ display: 'flex', gap: 6 }}>
            <SegBtn label="Черновик"    active={status === 'draft'}     color="var(--color-peach-text)" bg="var(--color-peach-soft)" onClick={() => setStatus('draft')} />
            <SegBtn label="Опубликован" active={status === 'published'} color="var(--color-green-text)" bg="var(--color-green-soft)" onClick={() => setStatus('published')} />
          </div>
        </div>

        {/* Lessons */}
        <div>
          <SectionHead>Уроки ({lessons.length})</SectionHead>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
            {lessons.map((lesson, idx) => (
              <div key={lesson.id} style={{ background: 'var(--color-bg-2)', borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--color-purple-text)' }}>{lesson.title}</div>
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
                      placeholder="Тренажёр"
                      options={trainers.map(t => ({ value: t.id, label: t.title.slice(0, 22) }))} />
                  </div>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 2 }}>ВИДЖЕТ</div>
                    <TeacherSelect small value={lesson.widgetId ?? ''} onChange={v => setLessonLink(lesson.id, 'widgetId', v || null)}
                      triggerStyle={{ padding: '5px 8px', fontSize: 11 }}
                      placeholder="Виджет"
                      options={widgets.map(w => ({ value: w.id, label: w.title.slice(0, 22) }))} />
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

        <SaveBtn accent="var(--color-accent)" accentBg="var(--color-purple-soft)" onClick={handleSave} />
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
        <div>
          <TeacherSelect value={topic} onChange={setTopic} placeholder="Тема" options={[...TOPICS, 'Смешанный']} />
        </div>

        {/* Time */}
        <div><Label>Минут / вопрос</Label>
          <input type="number" min={1} max={10} value={timePerQ} onChange={e => setTimePerQ(Number(e.target.value))} style={inputSt} />
        </div>

        {/* Source */}
        <div><Label>Источник вопросов</Label>
          <div style={{ display: 'flex', gap: 6 }}>
            <SegBtn label="Из банка заданий" active={source === 'bank'}   color="var(--color-accent)" bg="var(--color-purple-soft)" onClick={() => setSource('bank')} />
            <SegBtn label="Вручную"          active={source === 'manual'} color="var(--color-peach-text)" bg="var(--color-peach-soft)" onClick={() => setSource('manual')} />
          </div>
        </div>

        {source === 'bank' && (
          <div style={{ background: 'var(--color-bg-2)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SectionHead>Параметры банка</SectionHead>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 8 }}>
              <div>
                <TeacherSelect value={bankTopic} onChange={setBankTopic} placeholder="Тема банка" options={TOPICS} />
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
                  color: isActive ? WTYPE_COLOR[wt] : 'var(--color-muted)', transition: 'all 0.15s',
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
            <TeacherSelect value={linkedId} onChange={setLinkedId} placeholder="Тренажёр"
              accent="#1a7a3f" accentBg="var(--color-green-soft)"
              options={trainers.map(t => ({ value: t.id, label: `${t.title} (${t.questions.length} вопр.)` }))} />
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

// Shared card shell used by all three tab types.
// accentColor may be hex (#3EC87A) or a CSS var — icon box and glow use accentBg to stay safe.
export interface CardActions {
  onEdit?: () => void
  onDuplicate?: () => void
  onDelete?: () => void
}

// Hover-reveal action cluster (Редактировать / Дублировать / Удалить) shared by
// every constructor card. Each button stops propagation so it never triggers the
// card's own onClick (open editor).
function CardActionBar({ actions, visible, accentColor }: { actions: CardActions; visible: boolean; accentColor: string }) {
  const btn = (onClick: () => void, title: string, danger: boolean, children: React.ReactNode) => (
    <button
      title={title}
      onClick={e => { e.stopPropagation(); onClick() }}
      style={{
        width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid var(--color-border-soft)', background: 'var(--color-surface)', cursor: 'pointer',
        color: danger ? '#c0303a' : accentColor, padding: 0, transition: 'all 0.12s',
      }}
    >{children}</button>
  )
  return (
    <div style={{
      position: 'absolute', top: 10, right: 10, display: 'flex', gap: 5, zIndex: 6,
      opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(-3px)',
      pointerEvents: visible ? 'auto' : 'none', transition: 'opacity 0.14s, transform 0.14s',
    }}>
      {actions.onEdit && btn(actions.onEdit, 'Редактировать', false, <Pencil size={13} strokeWidth={2} />)}
      {actions.onDuplicate && btn(actions.onDuplicate, 'Дублировать', false, <Copy size={13} strokeWidth={2} />)}
      {actions.onDelete && btn(actions.onDelete, 'Удалить', true, <Trash2 size={13} strokeWidth={2} />)}
    </div>
  )
}

function ContentCard({ accentColor, accentBg, isSelected, onClick, icon, iconBg, badge, title, subtitle, footerLeft, footerRight, extra, actions }: {
  accentColor: string
  accentBg: string
  isSelected: boolean
  onClick: () => void
  icon: React.ReactNode
  iconBg?: string
  badge?: React.ReactNode
  title: string
  subtitle: React.ReactNode
  footerLeft: React.ReactNode
  footerRight: React.ReactNode
  extra?: React.ReactNode
  actions?: CardActions
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <motion.div
      whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={onClick}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: isSelected ? accentBg : 'rgba(var(--glass-rgb), 0.88)',
        backdropFilter: 'blur(16px) saturate(180%)', WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: isSelected ? `1.5px solid ${accentColor}` : '1px solid var(--color-border-glass)',
        borderRadius: 20, padding: '18px 18px 12px', cursor: 'pointer',
        boxShadow: isSelected ? `0 0 0 3px ${accentColor}22, 0 6px 24px rgba(0,0,0,0.08)` : '0 3px 16px rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column', gap: 10, transition: 'all 0.18s',
      }}
    >
      {actions && <CardActionBar actions={actions} visible={hovered} accentColor={accentColor} />}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: iconBg ?? 'var(--color-bg-5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
        <div style={{ opacity: actions && hovered ? 0 : 1, transition: 'opacity 0.14s' }}>{badge}</div>
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.3, marginBottom: 4, minHeight: '2.6em', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{subtitle}</div>
        {extra}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--color-border-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--color-muted)', fontSize: 12 }}>{footerLeft}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-3)', fontSize: 11 }}>{footerRight}</div>
      </div>
    </motion.div>
  )
}

const COURSE_COLOR    = 'var(--color-purple)'            // hex — for border/shadow concatenation
const COURSE_BG       = 'var(--color-purple-soft)'
const TRAINER_COLOR   = 'var(--color-purple)'
const TRAINER_BG      = 'var(--color-purple-soft)'

// Footer chip: one unified access badge. Count = people with access ("кому дан
// доступ", group_ids + student_ids). A green check overlay means lessons are
// already opened for at least one of them (enrolled — lesson_progress exists).
function StudentsBadge({ access, enrolled }: { access: { id: string; name: string }[]; enrolled: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false)
  const count = access.length
  const enrolledIds = new Set(enrolled.map(s => s.id))
  const opened = enrolledIds.size > 0
  return (
    <span
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
      onClick={e => e.stopPropagation()}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 4, cursor: count ? 'default' : 'inherit', color: opened ? 'var(--color-purple-text)' : undefined }}
    >
      <span style={{ position: 'relative', display: 'inline-flex' }}>
        <Users size={13} strokeWidth={1.8} />
        {opened && (
          <span style={{ position: 'absolute', right: -4, bottom: -3, width: 8, height: 8, borderRadius: '50%', background: 'var(--color-green-text)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={8} strokeWidth={3} style={{ color: '#fff' }} />
          </span>
        )}
      </span>
      <span>{count}</span>
      <AnimatePresence>
        {open && count > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            style={{
              position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
              zIndex: 20, minWidth: 170, maxWidth: 240, maxHeight: 240, overflowY: 'auto',
              background: 'rgba(var(--glass-rgb), 0.97)', backdropFilter: 'blur(16px) saturate(180%)', WebkitBackdropFilter: 'blur(16px) saturate(180%)',
              border: '1px solid var(--color-border-glass)', borderRadius: 12, padding: '8px 10px',
              boxShadow: '0 8px 28px rgba(0,0,0,0.16)', cursor: 'default',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 }}>
              Доступ · {count}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {access.map(s => (
                <div key={s.id} style={{ fontSize: 12, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {enrolledIds.has(s.id)
                    ? <CheckCircle size={11} strokeWidth={2.5} style={{ color: 'var(--color-green-text)', flexShrink: 0 }} />
                    : <Circle size={11} strokeWidth={2} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle size={9} strokeWidth={2.5} style={{ color: 'var(--color-green-text)' }} /> уроки открыты
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}

function CourseCard({ course, isSelected, onClick, actions, students, access }: { course: Course; isSelected: boolean; onClick: () => void; actions?: CardActions; students?: { id: string; name: string }[]; access?: { id: string; name: string }[] }) {
  return (
    <ContentCard
      accentColor={COURSE_COLOR} accentBg={COURSE_BG} actions={actions}
      isSelected={isSelected} onClick={onClick}
      icon={<BookOpen size={17} strokeWidth={2} style={{ color: 'var(--color-purple-text)' }} />}
      badge={<span style={{ fontSize: 10, fontWeight: 700, color: STATUS_COLOR[course.status], background: STATUS_BG[course.status], borderRadius: 7, padding: '2px 8px' }}>{STATUS_LABEL[course.status]}</span>}
      title={course.title}
      subtitle={`${course.subject} · ${course.level}`}
      footerLeft={
        <>
          <GraduationCap size={13} strokeWidth={1.8} /><span>{course.lessons.length} уроков</span>
          {access && access.length > 0 && (
            <>
              <span style={{ opacity: 0.4 }}>·</span>
              <StudentsBadge access={access} enrolled={students ?? []} />
            </>
          )}
        </>
      }
      footerRight={<><Clock size={11} strokeWidth={2} />{course.lastEdited}</>}
    />
  )
}

function TrainerCard({ trainer, isSelected, onClick }: { trainer: Trainer; isSelected: boolean; onClick: () => void }) {
  return (
    <ContentCard
      accentColor={TRAINER_COLOR} accentBg={TRAINER_BG}
      isSelected={isSelected} onClick={onClick}
      icon={<Zap size={17} strokeWidth={2} style={{ color: 'var(--color-purple-text)' }} />}
      title={trainer.title}
      subtitle={`${trainer.topic} · ${trainer.timePerQuestion} мин/вопрос`}
      extra={trainer.questionIds && trainer.questionIds.length > 0 ? (
        <div style={{ marginTop: 5, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {trainer.questionIds.map(id => (
            <span key={id} onClick={e => e.stopPropagation()} style={{ padding: '1px 7px', borderRadius: 999, background: 'var(--color-red-soft)', color: 'var(--color-red-text)', fontSize: 10, fontWeight: 800, userSelect: 'text', cursor: 'text' }}>№{id}</span>
          ))}
        </div>
      ) : undefined}
      footerLeft={<><FileText size={13} strokeWidth={1.8} /><span>{trainer.questions.length} вопросов</span></>}
      footerRight={<><Clock size={11} strokeWidth={2} />{trainer.lastEdited}</>}
    />
  )
}

function WidgetCard({ widget, isSelected, onClick, actions }: { widget: Widget; isSelected: boolean; onClick: () => void; actions?: CardActions }) {
  const TypeIcon = WTYPE_ICON[widget.type]
  return (
    <ContentCard
      accentColor={WTYPE_COLOR[widget.type]} accentBg={WTYPE_BG[widget.type]} actions={actions}
      isSelected={isSelected} onClick={onClick}
      icon={<TypeIcon size={17} strokeWidth={2} style={{ color: WTYPE_COLOR[widget.type] }} />}
      badge={<span style={{ fontSize: 10, fontWeight: 700, color: WTYPE_COLOR[widget.type], background: WTYPE_BG[widget.type], borderRadius: 7, padding: '2px 8px' }}>{WTYPE_LABEL[widget.type]}</span>}
      title={widget.title}
      subtitle={`${widget.items.length} элементов`}
      footerLeft={
        widget.linkedTrainerId
          ? <><Link2 size={13} strokeWidth={1.8} style={{ color: 'var(--color-accent)' }} /><span style={{ color: 'var(--color-accent)' }}>Из тренажёра</span></>
          : <><Pencil size={13} strokeWidth={1.8} /><span>Вручную</span></>
      }
      footerRight={<><Clock size={11} strokeWidth={2} />{widget.lastEdited}</>}
    />
  )
}

// ─── Widget filter + groups ───────────────────────────────────────────────────
export type WidgetSortMode = 'newest' | 'oldest' | 'az' | 'items'
export type WidgetViewMode = 'cards' | 'groups'

export interface WidgetFilters {
  search: string
  type: WidgetType | ''
  linked: '' | 'linked' | 'unlinked'
  sort: WidgetSortMode
  viewMode: WidgetViewMode
  activeGroup: WidgetType | ''
}
export const emptyWidgetFilters: WidgetFilters = {
  search: '', type: '', linked: '', sort: 'newest', viewMode: 'cards', activeGroup: '',
}

const WIDGET_SORT_OPTS: [WidgetSortMode, string][] = [
  ['newest', 'Новые'], ['oldest', 'Старые'], ['az', 'А → Я'], ['items', 'По элементам'],
]

function WidgetSortDropdown({ value, onChange }: { value: WidgetSortMode; onChange: (v: WidgetSortMode) => void }) {
  const [open, setOpen] = useState(false)
  const label = WIDGET_SORT_OPTS.find(([v]) => v === value)?.[1] ?? 'Новые'
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} onBlur={() => setTimeout(() => setOpen(false), 120)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999,
          background: open ? 'rgba(var(--glass-rgb), 0.98)' : 'rgba(var(--glass-rgb), 0.9)', border: `1px solid ${open ? 'var(--color-border-strong)' : 'var(--color-border)'}`,
          fontSize: 12, fontWeight: 600, color: 'var(--color-text)', cursor: 'pointer', fontFamily: 'inherit' }}>
        <ArrowUpDown size={12} style={{ color: 'var(--color-text-3)' }} />
        <span style={{ display: 'grid', justifyItems: 'start' }}>
          {WIDGET_SORT_OPTS.map(([, lbl]) => (
            <span key={lbl} aria-hidden style={{ gridArea: '1 / 1', height: 0, overflow: 'hidden', visibility: 'hidden' }}>{lbl}</span>
          ))}
          <span style={{ gridArea: '1 / 1' }}>{label}</span>
        </span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: 'var(--color-text-3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}
            style={{ position: 'absolute', top: '100%', left: 0, marginTop: 6, zIndex: 50, minWidth: 160,
              background: 'rgba(var(--glass-rgb), 0.97)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid var(--color-border-glass)', borderRadius: 14, boxShadow: '0 12px 32px rgba(0,0,0,0.12)', padding: 5 }}>
            {WIDGET_SORT_OPTS.map(([val, lbl]) => (
              <button key={val} onMouseDown={e => { e.preventDefault(); onChange(val); setOpen(false) }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  width: '100%', padding: '9px 10px', borderRadius: 9, border: 'none',
                  background: value === val ? 'rgba(99,84,207,0.07)' : 'transparent',
                  fontSize: 13, fontWeight: value === val ? 700 : 400, color: 'var(--color-text)',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,84,207,0.07)' }}
                onMouseLeave={e => { e.currentTarget.style.background = value === val ? 'rgba(99,84,207,0.07)' : 'transparent' }}>
                {lbl}
                {value === val && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="var(--color-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

type CourseSortMode = 'newest' | 'oldest' | 'az'
const COURSE_SORT_OPTS: [CourseSortMode, string][] = [
  ['newest', 'Новые'], ['oldest', 'Старые'], ['az', 'А → Я'],
]

function CourseSortDropdown({ value, onChange }: { value: CourseSortMode; onChange: (v: CourseSortMode) => void }) {
  const [open, setOpen] = useState(false)
  const label = COURSE_SORT_OPTS.find(([v]) => v === value)?.[1] ?? 'Новые'
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} onBlur={() => setTimeout(() => setOpen(false), 120)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999,
          background: open ? 'rgba(var(--glass-rgb), 0.98)' : 'rgba(var(--glass-rgb), 0.9)', border: `1px solid ${open ? 'var(--color-border-strong)' : 'var(--color-border)'}`,
          fontSize: 12, fontWeight: 600, color: 'var(--color-text)', cursor: 'pointer', fontFamily: 'inherit' }}>
        <ArrowUpDown size={12} style={{ color: 'var(--color-text-3)' }} />
        <span style={{ display: 'grid', justifyItems: 'start' }}>
          {COURSE_SORT_OPTS.map(([, lbl]) => (
            <span key={lbl} aria-hidden style={{ gridArea: '1 / 1', height: 0, overflow: 'hidden', visibility: 'hidden' }}>{lbl}</span>
          ))}
          <span style={{ gridArea: '1 / 1' }}>{label}</span>
        </span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: 'var(--color-text-3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}
            style={{ position: 'absolute', top: '100%', left: 0, marginTop: 6, zIndex: 50, minWidth: 160,
              background: 'rgba(var(--glass-rgb), 0.97)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid var(--color-border-glass)', borderRadius: 14, boxShadow: '0 12px 32px rgba(0,0,0,0.12)', padding: 5 }}>
            {COURSE_SORT_OPTS.map(([val, lbl]) => (
              <button key={val} onMouseDown={e => { e.preventDefault(); onChange(val); setOpen(false) }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  width: '100%', padding: '9px 10px', borderRadius: 9, border: 'none',
                  background: value === val ? 'rgba(99,84,207,0.07)' : 'transparent',
                  fontSize: 13, fontWeight: value === val ? 700 : 400, color: 'var(--color-text)',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,84,207,0.07)' }}
                onMouseLeave={e => { e.currentTarget.style.background = value === val ? 'rgba(99,84,207,0.07)' : 'transparent' }}>
                {lbl}
                {value === val && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="var(--color-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Segmented status filter: Все / Черновик / Опубликован.
function CourseStatusFilter({ value, onChange }: { value: '' | CourseStatus; onChange: (v: '' | CourseStatus) => void }) {
  const opts: ['' | CourseStatus, string][] = [['', 'Все'], ['draft', 'Черновик'], ['published', 'Опубликован']]
  return (
    <div style={{ display: 'flex', padding: 2, borderRadius: 999, background: 'var(--color-bg-3)', gap: 2 }}>
      {opts.map(([val, lbl]) => {
        const active = value === val
        return (
          <button key={val || 'all'} onClick={() => onChange(val)}
            style={{ padding: '5px 12px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 12, fontWeight: active ? 700 : 500,
              background: active ? 'var(--color-surface)' : 'transparent',
              color: active ? (val === 'published' ? 'var(--color-green-text)' : val === 'draft' ? 'var(--color-peach-text)' : 'var(--color-text)') : 'var(--color-text-3)',
              boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.14s' }}>
            <span style={{ display: 'grid', justifyItems: 'center' }}>
              <span aria-hidden style={{ gridArea: '1 / 1', height: 0, overflow: 'hidden', visibility: 'hidden', fontWeight: 700 }}>{lbl}</span>
              <span style={{ gridArea: '1 / 1' }}>{lbl}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function WidgetFilterPanel({
  filters, onChange, total,
}: { filters: WidgetFilters; onChange: (f: Partial<WidgetFilters>) => void; total: number }) {
  const accent = 'var(--color-green-text)'
  const accentBg = 'var(--color-green-soft)'
  const hasFilters = !!(filters.search || filters.type || filters.linked)
  const inputSt: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 11,
    border: '1.5px solid var(--color-border-medium)', fontSize: 13, color: 'var(--color-text)',
    background: 'var(--color-bg-2)', outline: 'none', fontFamily: 'inherit',
  }
  const pill = (active: boolean) => ({
    padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
    background: active ? accentBg : 'var(--color-bg-3)', color: active ? accent : 'var(--color-muted)',
  } as React.CSSProperties)

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.22 }}
      style={{
        width: 264, flexShrink: 0, alignSelf: 'flex-start', position: 'sticky', top: 20,
        background: 'rgba(var(--glass-rgb), 0.9)', backdropFilter: 'blur(16px) saturate(180%)', WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: '1px solid var(--color-border-glass)', borderRadius: 18, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', padding: 16,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Search size={15} style={{ color: accent }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>Фильтры</span>
      </div>

      <div style={{ position: 'relative' }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)' }} />
        <input value={filters.search} onChange={e => onChange({ search: e.target.value })} placeholder="Поиск по названию…"
          style={{ ...inputSt, paddingLeft: 30, paddingRight: filters.search ? 30 : undefined }} />
        {filters.search && (
          <button onClick={() => onChange({ search: '' })} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--color-text-3)', display: 'flex', alignItems: 'center' }}>
            <X size={14} />
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Тип</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          <button onClick={() => onChange({ type: '' })} style={pill(filters.type === '')}>Все</button>
          {(Object.entries(WTYPE_LABEL) as [WidgetType, string][]).map(([wt, label]) => (
            <button key={wt} onClick={() => onChange({ type: filters.type === wt ? '' : wt })} style={pill(filters.type === wt)}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Привязка</span>
        <div style={{ display: 'flex', gap: 5 }}>
          {([['', 'Все'], ['linked', 'Из тренажёра'], ['unlinked', 'Вручную']] as [WidgetFilters['linked'], string][]).map(([v, l]) => (
            <button key={v} onClick={() => onChange({ linked: v })}
              style={{ ...pill(filters.linked === v), flex: 1, padding: '6px 0' }}>{l}</button>
          ))}
        </div>
      </div>

      {filters.viewMode === 'groups' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Группа</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            <button onClick={() => onChange({ activeGroup: '' })} style={pill(filters.activeGroup === '')}>Все</button>
            {(Object.entries(WTYPE_LABEL) as [WidgetType, string][]).map(([wt, label]) => (
              <button key={wt} onClick={() => onChange({ activeGroup: filters.activeGroup === wt ? '' : wt })} style={pill(filters.activeGroup === wt)}>{label}</button>
            ))}
          </div>
        </div>
      )}

      {hasFilters && (
        <button onClick={() => onChange({ search: '', type: '', linked: '', activeGroup: '' })}
          style={{ padding: '8px 0', borderRadius: 10, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-input)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Trash2 size={12} /> Сбросить фильтры
        </button>
      )}

      <div style={{ fontSize: 11, color: 'var(--color-text-3)', textAlign: 'center', paddingTop: 2 }}>{total} виджетов</div>
    </motion.div>
  )
}

// ─── Widget groups view (always-expanded sections) ────────────────────────────
function WidgetGroupsView({
  widgets, activeGroup, editMode, checkedIds, onToggleCheck, onOpenWidget, onDuplicateWidget, onDeleteWidget,
}: {
  widgets: Widget[]; activeGroup: WidgetType | ''
  editMode: boolean; checkedIds: Set<string>
  onToggleCheck: (id: string) => void; onOpenWidget: (w: Widget) => void
  onDuplicateWidget: (w: Widget) => void; onDeleteWidget: (w: Widget) => void
}) {
  const groups = useMemo(() =>
    (Object.keys(WTYPE_LABEL) as WidgetType[])
      .map(wt => ({ wt, ws: widgets.filter(w => w.type === wt) }))
      .filter(g => g.ws.length > 0),
    [widgets])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {groups.map(({ wt, ws }) => {
        if (activeGroup && activeGroup !== wt) return null
        const TypeIcon = WTYPE_ICON[wt]
        return (
          <div key={wt}>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 9, background: WTYPE_BG[wt], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <TypeIcon size={13} strokeWidth={2} style={{ color: WTYPE_COLOR[wt] }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{WTYPE_LABEL[wt]}</span>
              <span style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 500 }}>{ws.length}</span>
              <div style={{ flex: 1, height: 1, background: 'var(--color-border-soft)', marginLeft: 4 }} />
            </div>
            {/* Cards grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {ws.map((w, i) => (
                <motion.div key={w.id} style={{ position: 'relative' }}
                  initial={{ opacity: 0, y: 14, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: i * 0.03, type: 'spring', stiffness: 380, damping: 28 }}>
                  <WidgetCard widget={w} isSelected={false}
                    onClick={() => editMode ? onToggleCheck(w.id) : onOpenWidget(w)}
                    actions={undefined} />
                  {editMode && (
                    <>
                      <div onClick={() => onToggleCheck(w.id)} style={{
                        position: 'absolute', top: 12, left: 12, width: 22, height: 22, borderRadius: 7,
                        border: checkedIds.has(w.id) ? '2px solid #c0303a' : '1.5px solid var(--color-border-medium)',
                        background: checkedIds.has(w.id) ? '#c0303a' : 'var(--color-bg-5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'all 0.14s', zIndex: 5, boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
                      }}>
                        {checkedIds.has(w.id) && <Check size={13} strokeWidth={3} style={{ color: '#fff' }} />}
                      </div>
                      <button onClick={e => { e.stopPropagation(); onDuplicateWidget(w) }} title="Дублировать"
                        style={{ position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: 8, border: 'none',
                          background: 'rgba(var(--glass-rgb), 0.92)', boxShadow: '0 1px 6px rgba(0,0,0,0.14)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 5, color: 'var(--color-muted)' }}>
                        <Copy size={13} strokeWidth={2} />
                      </button>
                    </>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
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

// ─── Rich text toolbar button ─────────────────────────────────────────────────

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
  course:  { label: 'Курс',     Icon: BookOpen, color: 'var(--color-accent)',         bg: 'var(--color-purple-soft)',  accent: 'var(--color-accent)' },
  trainer: { label: 'Тренажёр', Icon: Zap,      color: 'var(--color-accent)',         bg: 'var(--color-purple-soft)', accent: 'var(--color-accent)' },
  widget:  { label: 'Виджет',   Icon: Layers,   color: 'var(--color-blue-pill-text)', bg: 'var(--color-blue-pill-bg)', accent: 'var(--color-blue-pill-text)' },
}

// ─── Lesson content editor (konspekt + homework, persisted to Supabase) ───────
// Opens for a lesson that maps to a DB course (dbCourseId). Loads lessons.content
// (or the code default as a starting point) and saves edits back to lessons.content,
// which the student lesson page reads via getLessonDetail.
interface LessonTimecodeRow { time: string; label: string; seconds: number }
function parseSeconds(time: string): number {
  const parts = time.split(':').map(n => parseInt(n, 10) || 0)
  return parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0]
}

function LessonFullEditor({ dbCourseId, lessons, lessonIndex, onSwitch, onClose }: {
  dbCourseId: string
  lessons: { title: string }[]
  lessonIndex: number
  onSwitch: (idx: number) => void
  onClose: () => void
}) {
  const shortId = `${dbCourseId}-${lessonIndex}`
  const lessonTitle = lessons[lessonIndex]?.title ?? ''
  const emptyTask: HomeworkTeacherTask = { topic: '', prompt: '', teacherNote: '', placeholder: '', acceptedFormats: [] }
  const [tab, setTab] = useState<'record' | 'lesson'>('lesson')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  // Урок (content)
  const [paras, setParas] = useState<LessonParagraph[]>([])
  const [quiz, setQuiz] = useState<HomeworkQuizQuestion[]>([])
  const [hardTask, setHardTask] = useState<HomeworkTeacherTask>(emptyTask)
  // Запись (recording / session)
  const [videoUrl, setVideoUrl] = useState('')
  const [description, setDescription] = useState('')
  const [timecodes, setTimecodes] = useState<LessonTimecodeRow[]>([])

  useEffect(() => {
    let alive = true
    setLoading(true); setMsg('')
    supabase.from('lessons').select('content, youtube_url, description, timecodes').eq('short_id', shortId).single().then(({ data }) => {
      if (!alive) return
      const dbc = (data?.content ?? undefined) as LessonContentData | undefined
      const src = (dbc && dbc.paragraphs?.length) ? dbc : AP_LESSON_CONTENT[shortId]
      setParas((src?.paragraphs ?? [{ id: uid(), text: '' }]).map(p => ({ ...p })))
      setQuiz((src?.quiz ?? []).map(q => ({ ...q, options: q.options.map(o => ({ ...o })) })))
      setHardTask(src?.hardTask ? { ...src.hardTask } : emptyTask)
      setVideoUrl(data?.youtube_url ?? '')
      setDescription(data?.description ?? '')
      setTimecodes(Array.isArray(data?.timecodes) ? (data!.timecodes as LessonTimecodeRow[]) : [])
      setLoading(false)
    })
    return () => { alive = false }
  }, [shortId])

  async function save() {
    setSaving(true); setMsg('')
    const content: LessonContentData = { paragraphs: paras.filter(p => p.text.trim()), quiz, hardTask }
    const patch = {
      content,
      youtube_url: videoUrl.trim() || null,
      description: description.trim() || null,
      timecodes: timecodes.filter(t => t.time.trim() || t.label.trim()).map(t => ({ ...t, seconds: parseSeconds(t.time) })),
    }
    // .select() returns affected rows — an empty array means RLS blocked the write
    // (e.g. the teacher session expired); Postgres reports that without an error.
    const { data, error } = await supabase.from('lessons').update(patch).eq('short_id', shortId).select('short_id')
    setSaving(false)
    if (error) setMsg(`Ошибка: ${error.message}`)
    else if (!data || data.length === 0) setMsg('Не сохранено: нет прав. Войдите в аккаунт преподавателя заново.')
    else setMsg('✓ Сохранено — ученики увидят обновление')
  }

  const setPara = (id: string, text: string) => setParas(prev => prev.map(p => p.id === id ? { ...p, text } : p))
  const addQuestion = () => setQuiz(prev => [...prev, { id: uid(), prompt: '', options: [0, 1, 2].map(i => ({ id: `${uid()}${i}`, text: '' })), correctOptionId: '', explanation: '' }])
  const setQ = (qi: number, patch: Partial<HomeworkQuizQuestion>) => setQuiz(prev => prev.map((q, i) => i === qi ? { ...q, ...patch } : q))
  const setOpt = (qi: number, oid: string, text: string) => setQuiz(prev => prev.map((q, i) => i === qi ? { ...q, options: q.options.map(o => o.id === oid ? { ...o, text } : o) } : q))

  const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 800, color: 'var(--color-text-3)', letterSpacing: 0.4, textTransform: 'uppercase', margin: '6px 0' }
  const miniBtn = (bg: string, color: string): React.CSSProperties => ({ width: 26, height: 26, borderRadius: 8, border: 'none', cursor: 'pointer', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 })
  const dashBtn: React.CSSProperties = { alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 9, border: '1px dashed var(--color-border-medium)', background: 'transparent', color: 'var(--color-accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 2 }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 24px', borderBottom: '1px solid var(--color-border-soft)', flexShrink: 0 }}>
        <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px 8px 10px', borderRadius: 999, border: '1px solid var(--color-border-soft)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <ArrowLeft size={15} /> Назад
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lessonTitle || 'Урок'}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>Связано с базой · {shortId}</div>
        </div>
        {msg && <span style={{ fontSize: 12, fontWeight: 600, color: msg.startsWith('✓') ? 'var(--color-green-text)' : 'var(--color-red-text)' }}>{msg}</span>}
        <button onClick={save} disabled={saving || loading}
          style={{ padding: '9px 18px', borderRadius: 999, border: 'none', background: 'var(--color-purple-soft)', color: 'var(--color-accent)', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Сохраняю…' : 'Сохранить в базу'}
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {/* CENTER — tabbed content */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* tabs */}
          <div style={{ display: 'flex', gap: 6, padding: '14px 24px 0' }}>
            {([['lesson', 'Урок'], ['record', 'Запись']] as const).map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)}
                style={{ padding: '9px 18px', borderRadius: 11, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                  background: tab === k ? 'var(--color-purple-soft)' : 'transparent', color: tab === k ? 'var(--color-purple-text)' : 'var(--color-muted)' }}>
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: 40, color: 'var(--color-muted)', fontSize: 13 }}>Загрузка…</div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 24px 32px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {tab === 'lesson' && <>
                <div style={sectionTitle}>Конспект</div>
                {paras.map((p, i) => (
                  <div key={p.id} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 11, color: 'var(--color-text-3)', width: 18, paddingTop: 10, flexShrink: 0 }}>{i + 1}</span>
                    <textarea value={p.text} onChange={e => setPara(p.id, e.target.value)} rows={3} placeholder="Текст абзаца конспекта…" style={{ ...inputSt, resize: 'vertical', minHeight: 64, lineHeight: 1.5 }} />
                    <button onClick={() => setParas(prev => prev.filter(x => x.id !== p.id))} style={miniBtn('var(--color-red-soft)', 'var(--color-red-text)')}><Trash2 size={13} /></button>
                  </div>
                ))}
                <button onClick={() => setParas(prev => [...prev, { id: uid(), text: '' }])} style={dashBtn}><Plus size={13} /> Добавить абзац</button>

                <div style={{ ...sectionTitle, marginTop: 16 }}>Домашка · базовый тест</div>
                {quiz.map((q, qi) => (
                  <div key={q.id} style={{ border: '1px solid var(--color-border-soft)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 6 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)' }}>Вопрос {qi + 1}</span>
                      <div style={{ flex: 1 }} />
                      <button onClick={() => setQuiz(prev => prev.filter((_, i) => i !== qi))} style={miniBtn('var(--color-red-soft)', 'var(--color-red-text)')}><Trash2 size={12} /></button>
                    </div>
                    <input value={q.prompt} onChange={e => setQ(qi, { prompt: e.target.value })} placeholder="Текст вопроса" style={inputSt} />
                    {q.options.map(o => (
                      <label key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="radio" name={`correct-${q.id}`} checked={q.correctOptionId === o.id} onChange={() => setQ(qi, { correctOptionId: o.id })} title="Верный ответ" />
                        <input value={o.text} onChange={e => setOpt(qi, o.id, e.target.value)} placeholder="Вариант ответа" style={{ ...inputSt, flex: 1 }} />
                      </label>
                    ))}
                    <input value={q.explanation} onChange={e => setQ(qi, { explanation: e.target.value })} placeholder="Пояснение (после ответа)" style={{ ...inputSt, fontSize: 12 }} />
                  </div>
                ))}
                <button onClick={addQuestion} style={dashBtn}><Plus size={13} /> Добавить вопрос</button>

                <div style={{ ...sectionTitle, marginTop: 16 }}>Домашка · хард-задание (на проверку преподавателю)</div>
                <input value={hardTask.topic} onChange={e => setHardTask(t => ({ ...t, topic: e.target.value }))} placeholder="Тема задания" style={inputSt} />
                <textarea value={hardTask.prompt} onChange={e => setHardTask(t => ({ ...t, prompt: e.target.value }))} rows={3} placeholder="Условие задания…" style={{ ...inputSt, resize: 'vertical', minHeight: 64, marginTop: 6 }} />
              </>}

              {tab === 'record' && <>
                <div style={sectionTitle}>Видео записи урока</div>
                <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="Ссылка RuTube / YouTube" style={inputSt} />

                <div style={{ ...sectionTitle, marginTop: 16 }}>Таймкоды</div>
                {timecodes.map((tc, ti) => (
                  <div key={ti} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input value={tc.time} onChange={e => setTimecodes(prev => prev.map((x, i) => i === ti ? { ...x, time: e.target.value } : x))} placeholder="00:00" style={{ ...inputSt, width: 80, flexShrink: 0 }} />
                    <input value={tc.label} onChange={e => setTimecodes(prev => prev.map((x, i) => i === ti ? { ...x, label: e.target.value } : x))} placeholder="Название главы" style={{ ...inputSt, flex: 1 }} />
                    <button onClick={() => setTimecodes(prev => prev.filter((_, i) => i !== ti))} style={miniBtn('var(--color-red-soft)', 'var(--color-red-text)')}><Trash2 size={13} /></button>
                  </div>
                ))}
                <button onClick={() => setTimecodes(prev => [...prev, { time: '', label: '', seconds: 0 }])} style={dashBtn}><Plus size={13} /> Добавить таймкод</button>

                <div style={{ ...sectionTitle, marginTop: 16 }}>Краткое описание урока</div>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Что разобрали, ключевые моменты…" style={{ ...inputSt, resize: 'vertical', minHeight: 88 }} />

                <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 12, lineHeight: 1.5 }}>
                  Расписание (дата/время) и получатели задаются при назначении урока группе/ученику — раздел «Зачислить на курс» и страница «Создать урок».
                </div>
              </>}
            </div>
          )}
        </div>

        {/* RIGHT — lessons list panel */}
        <div style={{ width: 280, flexShrink: 0, borderLeft: '1px solid var(--color-border-soft)', overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ ...sectionTitle, padding: '0 4px' }}>Уроки курса ({lessons.length})</div>
          {lessons.map((l, i) => (
            <button key={i} onClick={() => i !== lessonIndex && onSwitch(i)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left', padding: '9px 10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                background: i === lessonIndex ? 'var(--color-purple-soft)' : 'transparent' }}>
              <span style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, background: i === lessonIndex ? 'var(--color-purple-text)' : 'var(--color-bg-3)', color: i === lessonIndex ? '#fff' : 'var(--color-muted)', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 600, color: i === lessonIndex ? 'var(--color-purple-text)' : 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function CreatorView({
  initialMode,
  editCourse,
  editTrainer,
  editingTask,
  editWidget,
  trainers,
  widgets,
  onSaveTrainer,
  onSaveCourse,
  onSaveWidget,
  onCancel,
}: {
  initialMode: Exclude<Tab, 'testing' | 'bank'>
  editCourse?: Course | null
  editTrainer?: Trainer | null
  editingTask?: BankTask | null
  editWidget?: Widget | null
  trainers: Trainer[]
  widgets: Widget[]
  onSaveTrainer: (t: Trainer) => void
  onSaveCourse: (c: Course) => void
  onSaveWidget: (w: Widget) => void
  onCancel: () => void
}) {
  const [mode, setMode] = useState<Exclude<Tab, 'testing' | 'bank'>>(initialMode)
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
  const [tkImageSize, setTkImageSize] = useState<number>(() => { const v = editingTask?.questionImageSize; return typeof v === 'number' ? v : 100 })
  const [tkHasTable, setTkHasTable] = useState(!!(editingTask?.questionTable))
  const [tkTableHeaders, setTkTableHeaders] = useState<string[]>(editingTask?.questionTable?.headers ?? ['', ''])
  const [tkTableRows, setTkTableRows] = useState<string[][]>(editingTask?.questionTable?.rows ?? [['', ''], ['', '']])
  const [tkEmptyCells, setTkEmptyCells] = useState<Record<string, boolean>>(editingTask?.questionTable?.emptyCells ?? {})
  const [tkActiveCell, setTkActiveCell] = useState<string | null>(null)
  const [tkBlockOrder, setTkBlockOrder] = useState<Array<'image' | 'table'>>(editingTask?.blockOrder ?? ['image', 'table'])
  const [tkImageCollapsed, setTkImageCollapsed] = useState(false)
  const [tkTableCollapsed, setTkTableCollapsed] = useState(false)

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
  const condImgFileRef = useRef<HTMLInputElement>(null)
  const [condImgPickerOpen, setCondImgPickerOpen] = useState(false)
  const condImgPasteZoneRef = useRef<HTMLDivElement>(null)
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
  // Teacher-editable option scopes (built-ins layered with added/removed edits).
  const metaAddOption = useTaskMeta(s => s.addOption)
  const metaRemoveOption = useTaskMeta(s => s.removeOption)
  const metaAdded = useTaskMeta(s => s.added)
  const metaRemoved = useTaskMeta(s => s.removed)
  const metaState = { added: metaAdded, removed: metaRemoved }
  const tkSubjKey = tkSubject === 'Химия' ? 'chemistry' : 'biology'
  const sectionScopeKey = sectionScope(tkSubjKey)
  const topicScopeKey = topicScope(tkSubjKey, tkSection)
  const tkSectionList = mergeOptions(tkSubject === 'Химия' ? CHEMISTRY_SECTIONS : BIOLOGY_SECTIONS, sectionScopeKey, metaState)
  const baseTopicList = tkSection ? (tkTopicMap[tkSection] ?? []) : Object.values(tkTopicMap).flat()
  const tkTopicList = mergeOptions(baseTopicList, topicScopeKey, metaState)
  const tkSourceList = mergeOptions(SOURCES, SOURCE_SCOPE, metaState)

  // ── Course state (pre-filled when editing an existing course) ──
  const [cTitle, setCTitle] = useState(editCourse?.title ?? 'Новый курс')
  const [cSubject, setCSubject] = useState(editCourse?.subject ?? 'Химия')
  const [cLevel, setCLevel] = useState(editCourse?.level ?? 'ЕГЭ')
  const [cDesc, setCDesc] = useState(editCourse?.description ?? '')
  const [cStatus, setCStatus] = useState<CourseStatus>(editCourse?.status ?? 'draft')
  const [cLessons, setCLessons] = useState<Lesson[]>(editCourse?.lessons ?? [])
  const [newLessonTitle, setNewLessonTitle] = useState('')

  // ── Course enrollment ("зачислить через курс") ──
  const { groups: enrollGroups } = useGroups()
  const enrollStudents = useAllStudents()
  const [assignMode, setAssignMode] = useState<'group' | 'student'>('group')
  const [assignGroupId, setAssignGroupId] = useState('')
  const [assignStudentId, setAssignStudentId] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const [enrollMsg, setEnrollMsg] = useState('')
  const [enrolledList, setEnrolledList] = useState<Array<{ id: string; name: string }>>([])

  async function loadEnrolledStudents(dbId: string) {
    const { data } = await supabase
      .from('lesson_progress')
      .select('student_id')
      .eq('subject', dbId)
    if (!data) return
    const ids = [...new Set(data.map(r => r.student_id))]
    const matched = enrollStudents.filter(s => ids.includes(s.id))
    setEnrolledList(matched)
  }

  // The Supabase course this constructor course maps to (published-to-DB).
  const enrollDbId = editCourse?.dbCourseId ?? (editCourse ? AP_DB_COURSE_BY_CONSTRUCTOR_ID[editCourse.id] : undefined)

  useEffect(() => {
    if (enrollDbId && enrollStudents.length > 0) loadEnrolledStudents(enrollDbId)
    else setEnrolledList([])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollDbId, enrollStudents.length])
  const [editingLessonIdx, setEditingLessonIdx] = useState<number | null>(null)

  async function enrollCourse() {
    if (!enrollDbId) return
    const targets = assignMode === 'group'
      ? enrollStudents.filter(s => s.groupId === assignGroupId)
      : enrollStudents.filter(s => s.id === assignStudentId)
    if (!targets.length) { setEnrollMsg('Выберите получателя'); return }
    setEnrolling(true); setEnrollMsg('')
    const { data: course } = await supabase
      .from('courses').select('lessons(short_id, lesson_number)').eq('short_id', enrollDbId).single()
    const lessons = ((course?.lessons ?? []) as Array<{ short_id: string; lesson_number: number }>)
    if (!lessons.length) { setEnrolling(false); setEnrollMsg('В курсе нет уроков в БД'); return }
    const rows = targets.flatMap(s => lessons.map(l => ({
      student_id: s.id, lesson_ref: l.short_id, subject: enrollDbId,
      status: l.lesson_number === 0 ? 'current' : 'locked',
    })))
    const { error } = await supabase.from('lesson_progress').upsert(rows, { onConflict: 'student_id,lesson_ref' })
    setEnrolling(false)
    if (!error) loadEnrolledStudents(enrollDbId)
    setEnrollMsg(error ? `Ошибка: ${error.message}` : `✓ Зачислено: ${targets.length} ученик(ов) · ${lessons.length} уроков`)
  }

  // ── Widget state ──
  const [wTitle, setWTitle] = useState(editWidget?.title ?? 'Новый виджет')
  const [wType, setWType] = useState<WidgetType>(editWidget?.type ?? 'quiz')
  const [wLinkedId, setWLinkedId] = useState(editWidget?.linkedTrainerId ?? '')
  const [wItems, setWItems] = useState<WidgetItem[]>(editWidget?.items ?? [])
  const [wQText, setWQText] = useState('')
  const [wQOpts, setWQOpts] = useState(['', '', '', ''])
  const [wQCorr, setWQCorr] = useState(0)
  const [wFcTerm, setWFcTerm] = useState('')
  const [wFcDef, setWFcDef] = useState('')
  const [wDLabel, setWDLabel] = useState('')
  const [wPomoFocus, setWPomoFocus] = useState(
    editWidget?.type === 'pomodoro' && editWidget.items[0] ? (editWidget.items[0] as { focusMin: number }).focusMin : 25
  )
  const [wPomoBreak, setWPomoBreak] = useState(
    editWidget?.type === 'pomodoro' && editWidget.items[0] ? (editWidget.items[0] as { breakMin: number }).breakMin : 5
  )

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

  // Paste a full table from clipboard (e.g. copied from a website) into the top-left header cell.
  function handleTablePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text/plain')
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '')
    if (lines.length < 1) return
    const parsed = lines.map(l => l.split('\t'))
    const colCount = Math.max(...parsed.map(r => r.length))
    if (colCount < 2 && lines.length < 2) return // looks like a plain word, don't intercept
    e.preventDefault()
    const headers = parsed[0].map(c => c.trim())
    // pad headers to colCount
    while (headers.length < colCount) headers.push('')
    const rows = parsed.slice(1).map(row => {
      const cells = row.map(c => c.trim())
      while (cells.length < colCount) cells.push('')
      return cells
    })
    if (rows.length === 0) rows.push(headers.map(() => ''))
    setTkTableHeaders(headers)
    setTkTableRows(rows)
    setTkEmptyCells({})
    setTkActiveCell(null)
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
    } else if (wType === 'reactions') {
      if (!wFcTerm.trim()) return
      setWItems(prev => [...prev, { id: uid(), emoji: wFcTerm.trim(), quote: wFcDef.trim(), lesson: wDLabel.trim() }])
      setWFcTerm(''); setWFcDef(''); setWDLabel('')
    } else if (wType === 'memes') {
      if (!wFcDef.trim()) return
      setWItems(prev => [...prev, { id: uid(), memeEmoji: wFcTerm.trim() || '😄', memeTitle: wFcDef.trim(), memeCaption: wDLabel.trim() }])
      setWFcTerm(''); setWFcDef(''); setWDLabel('')
    }
  }

  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()

  // Assemble the authored task into a bank-ready record, or null if incomplete.
  function buildTask(): NewBankTask | null {
    if (!stripHtml(tkQuestion)) return null  // validate with stripped, save raw HTML
    const table = tkHasTable
      ? { headers: tkTableHeaders, rows: tkTableRows, emptyCells: Object.keys(tkEmptyCells).length ? tkEmptyCells : undefined }
      : undefined
    const base = {
      subject: (tkSubject === 'Химия' ? 'chemistry' : 'biology') as Subject,
      section: tkSection || tkSectionList[0],
      topic: tkTopic || tkTopicList[0] || '—',
      part: tkPart, line: tkLine, source: tkSource,
      question: tkQuestion, solution: tkSolution.trim(),  // preserve HTML formatting
      difficulty: tkDifficulty,
      answerType: tkAnswerType,
      questionImage: tkImage || undefined,
      questionImageSize: tkImage ? tkImageSize : undefined,
      questionTable: table,
      blockOrder: (tkImage && tkHasTable) ? tkBlockOrder : undefined,
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
      const trainerColor = isBio ? '#5FD68A' : 'var(--color-purple)'
      const trainerBg    = isBio ? '#D6F5E3' : '#EFE0FF'
      const trainerTitle = (tkTopic || tkSection || stripHtml(tkQuestion).slice(0, 40)).trim() || 'Новое задание'
      const newTrainer: Trainer = {
        id: uid(),
        title: trainerTitle,
        topic: tkTopic || tkSection || 'Общая',
        difficulty: tkDifficulty,
        timePerQuestion: 2,
        questions: [{
          id: String(newId),
          text: stripHtml(tkQuestion),
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
        color: editCourse?.color ?? 'var(--color-purple)', bg: editCourse?.bg ?? '#EFE0FF', lastEdited: dateStr,
        dbCourseId: editCourse?.dbCourseId,
      }
      onSaveCourse(c)
    } else {
      const finalWItems = wType === 'pomodoro'
        ? [{ id: 'pomo', focusMin: wPomoFocus, breakMin: wPomoBreak }]
        : wItems
      const w: Widget = {
        id: editWidget?.id ?? uid(), title: wTitle, type: wType,
        linkedTrainerId: wLinkedId || null, items: finalWItems,
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

  const currentName = (mode === 'trainer' ? stripHtml(tkQuestion) : mode === 'course' ? cTitle : wTitle).trim()
  const createLabel = mode === 'trainer' ? (editingTask ? 'Редактировать задание' : 'Создать задание') : mode === 'course' ? (editCourse ? 'Редактировать курс' : 'Создать курс') : (editWidget ? 'Редактировать виджет' : 'Создать виджет')
  const saveLabel = 'Сохранить'
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
      <div className="docked-pills-row" style={{ position: 'fixed', top: 30, left: 32, right: 32, zIndex: 80, pointerEvents: 'none' }}>
      <AnimatePresence>
        {docked && (
          <motion.div
            key="creator-dock"
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

            <div style={{ flexShrink: 0, width: 248, display: 'flex', justifyContent: 'center' }}>
              <motion.button
                whileHover={{ scale: canSave ? 1.03 : 1 }} whileTap={{ scale: canSave ? 0.97 : 1 }}
                onClick={handleSave}
                style={{ ...savePillStyle, pointerEvents: 'auto' }}
              >
                <Check size={14} strokeWidth={2.5} /> {saveLabel}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* ── All page content in the scroll flow ── */}
      <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 0 48px' }}>

        {/* Rest-state header — in scroll flow, fades out when docked */}
        <motion.div
          style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 24px 14px' }}
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

          {/* Absolutely centred — stays at true screen centre regardless of button widths */}
          <div style={{
            position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
            maxWidth: '44%', pointerEvents: 'none',
            fontSize: 18, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center',
          }}>
            {createLabel}
            {mode !== 'trainer' && currentName && <span style={{ color: 'var(--color-text-3)', fontWeight: 500 }}> — {currentName}</span>}
          </div>

          <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
            <motion.button
              whileHover={{ scale: canSave ? 1.03 : 1 }} whileTap={{ scale: canSave ? 0.97 : 1 }}
              onClick={handleSave}
              style={savePillStyle}
            >
              <Check size={14} strokeWidth={2.5} /> {saveLabel}
            </motion.button>
          </div>
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
              <div style={{ display: 'flex', gap: 6 }}>
                {(['Химия', 'Биология'] as const).map(s => (
                  <SegBtn key={s} label={s} active={tkSubject === s} color="var(--color-purple-text)" bg="var(--color-purple-soft)" onClick={() => { setTkSubject(s); setTkSection(''); setTkTopic('') }} />
                ))}
              </div>
            </div>
            <div>
              <TeacherSelect value={tkSection} onChange={v => { setTkSection(v); setTkTopic('') }} placeholder="Раздел"
                options={tkSectionList}
                onAddOption={l => metaAddOption(sectionScopeKey, l)}
                onDeleteOption={v => metaRemoveOption(sectionScopeKey, v)} />
            </div>
            <div>
              <TeacherSelect value={tkTopic} onChange={setTkTopic} placeholder="Тема"
                options={tkTopicList}
                onAddOption={l => metaAddOption(topicScopeKey, l)}
                onDeleteOption={v => metaRemoveOption(topicScopeKey, v)} />
            </div>
            <div>
              <Label>Часть</Label>
              <div style={{ display: 'flex', gap: 8 }}>
                {([1, 2] as const).map(p => (
                  <SegBtn key={p} label={`Часть ${p}`} active={tkPart === p}
                    color="var(--color-purple-text)" bg="var(--color-purple-soft)"
                    onClick={() => setTkPart(p)} />
                ))}
              </div>
            </div>
            <div><Label>Линия</Label>
              <input type="number" min={1} max={35} value={tkLine}
                onChange={e => setTkLine(Math.max(1, Number(e.target.value)))} style={inputSt} />
            </div>
            <div>
              <TeacherSelect value={tkSource} onChange={setTkSource} placeholder="Источник" options={tkSourceList}
                onAddOption={l => metaAddOption(SOURCE_SCOPE, l)}
                onDeleteOption={v => metaRemoveOption(SOURCE_SCOPE, v)} />
            </div>
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
            <div><Label>Предмет</Label>
              <input value={cSubject} onChange={e => setCSubject(e.target.value)} style={inputSt} placeholder="Например, Химия" />
            </div>
            <div>
              <TeacherSelect value={cLevel} onChange={setCLevel} placeholder="Уровень" options={['ЕГЭ', 'ОГЭ', 'AP', 'Углублённый', 'Интенсив']} />
            </div>
            <div><Label>Описание</Label>
              <textarea ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }} value={cDesc} onChange={e => { setCDesc(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                style={{ ...inputSt, resize: 'none', overflow: 'hidden' }} placeholder="Краткое описание курса…" />
            </div>
            <div><Label>Статус</Label>
              <div style={{ display: 'flex', gap: 6 }}>
                <SegBtn label="Черновик" active={cStatus === 'draft'} color="var(--color-peach-text)" bg="var(--color-peach-soft)" onClick={() => setCStatus('draft')} />
                <SegBtn label="Опубликован" active={cStatus === 'published'} color="var(--color-green-text)" bg="var(--color-green-soft)" onClick={() => setCStatus('published')} />
              </div>
            </div>

            {/* Зачисление — назначить курс группе или отдельному студенту */}
            <div>
              <Label>Зачислить на курс</Label>
              {enrollDbId ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <SegBtn label="Группе" active={assignMode === 'group'} color="var(--color-accent)" bg="var(--color-purple-soft)" onClick={() => { setAssignMode('group'); setEnrollMsg('') }} />
                    <SegBtn label="Студенту" active={assignMode === 'student'} color="var(--color-accent)" bg="var(--color-purple-soft)" onClick={() => { setAssignMode('student'); setEnrollMsg('') }} />
                  </div>
                  {assignMode === 'group' ? (
                    <TeacherSelect value={assignGroupId} onChange={setAssignGroupId} placeholder="Выберите группу"
                      options={enrollGroups.map(g => ({ value: g.id, label: g.name }))} />
                  ) : (
                    <TeacherSelect value={assignStudentId} onChange={setAssignStudentId} placeholder="Выберите студента"
                      options={enrollStudents.map(s => ({ value: s.id, label: s.name }))} />
                  )}
                  <button onClick={enrollCourse} disabled={enrolling}
                    style={{ padding: '9px 14px', borderRadius: 11, border: 'none', cursor: enrolling ? 'default' : 'pointer', background: 'var(--color-purple-soft)', color: 'var(--color-accent)', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', opacity: enrolling ? 0.6 : 1 }}>
                    {enrolling ? 'Зачисляю…' : 'Зачислить'}
                  </button>
                  {enrollMsg && <div style={{ fontSize: 12, fontWeight: 600, color: enrollMsg.startsWith('✓') ? 'var(--color-green-text)' : 'var(--color-red-text)' }}>{enrollMsg}</div>}
                  {enrolledList.length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Зачислены ({enrolledList.length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {enrolledList.map(s => (
                          <div key={s.id} style={{ fontSize: 12, color: 'var(--color-text-2)', background: 'var(--color-bg-2)', borderRadius: 7, padding: '4px 8px' }}>
                            {s.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--color-text-3)', lineHeight: 1.4 }}>
                  Курс ещё не опубликован в базе — зачисление недоступно. Сейчас доступно для курсов AP Chemistry.
                </div>
              )}
            </div>
          </>}

          {/* ─ Widget left ─ */}
          {mode === 'widget' && <>
            <div><Label>Название</Label>
              <input value={wTitle} onChange={e => setWTitle(e.target.value)} style={inputSt} />
            </div>
            <div><Label>Тип виджета</Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {(['quiz', 'facts', 'reactions', 'pomodoro', 'memes', 'qod'] as WidgetType[]).map(wt => {
                  const WIcon = WTYPE_ICON[wt]
                  return (
                    <button key={wt} onClick={() => setWType(wt)} style={{
                      padding: '8px 10px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 7,
                      border: wType === wt ? `1.5px solid ${WTYPE_COLOR[wt]}` : '1.5px solid transparent',
                      background: wType === wt ? WTYPE_BG[wt] : 'var(--color-bg)', cursor: 'pointer',
                      fontSize: 12, fontWeight: 600,
                      color: wType === wt ? WTYPE_COLOR[wt] : 'var(--color-muted)', transition: 'all 0.15s',
                    }}>
                      <WIcon size={13} strokeWidth={2} />{WTYPE_LABEL[wt]}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <TeacherSelect value={wLinkedId} onChange={setWLinkedId} placeholder="Тренажёр"
                options={trainers.map(t => ({ value: t.id, label: t.title }))} />
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
            {(['trainer', 'widget'] as const).map(t => {
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
              <RichConditionEditor value={tkQuestion} onChange={setTkQuestion} inputSt={inputSt} />
            </div>

            {/* image / table blocks — rendered in configurable order, each collapsible */}
            {tkBlockOrder.map(blockKey => {
              if (blockKey === 'image' && !tkImage) return null
              if (blockKey === 'table' && !tkHasTable) return null
              const isImage = blockKey === 'image'
              const collapsed = isImage ? tkImageCollapsed : tkTableCollapsed
              const setCollapsed = isImage ? setTkImageCollapsed : setTkTableCollapsed
              const bothExist = !!tkImage && tkHasTable
              const labelText = isImage
                ? 'Изображение'
                : `Таблица условия${tkAnswerType === 'tableFill' ? ' — впишите «?» в проверяемую ячейку' : ''}`
              return (
                <div key={blockKey}>
                  {/* block header row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: collapsed ? 0 : 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.4, flex: 1 }}>{labelText}</span>
                    {bothExist && (
                      <button
                        onClick={() => setTkBlockOrder(prev => [...prev].reverse() as Array<'image' | 'table'>)}
                        title="Поменять местами с другим блоком"
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 7, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >
                        <ArrowUpDown size={11} />поменять
                      </button>
                    )}
                    <button
                      onClick={() => setCollapsed((v: boolean) => !v)}
                      title={collapsed ? 'Развернуть' : 'Свернуть'}
                      style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                    >{collapsed ? '▸' : '▾'}</button>
                    {!isImage && (
                      <button onClick={() => { setTkHasTable(false); setSel(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-red-text)', fontSize: 12, fontWeight: 600, padding: 0 }}>Убрать</button>
                    )}
                  </div>
                  {!collapsed && isImage && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {/* size presets */}
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        {([30, 50, 70, 100] as const).map(sz => {
                          const labels = { 30: 'S', 50: 'M', 70: 'L', 100: '↔' }
                          const titles = { 30: 'Маленькое (30%)', 50: 'Среднее (50%)', 70: 'Большое (70%)', 100: 'Полная ширина' }
                          const active = tkImageSize === sz
                          return (
                            <button key={sz} title={titles[sz]} onClick={() => setTkImageSize(sz)}
                              style={{ padding: '3px 10px', borderRadius: 8, border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border-medium)'}`, background: active ? 'var(--color-purple-soft)' : 'var(--color-bg-2)', color: active ? 'var(--color-accent)' : 'var(--color-text-2)', fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.12s' }}>
                              {labels[sz]}
                            </button>
                          )
                        })}
                        <span style={{ fontSize: 11, color: 'var(--color-muted)', marginLeft: 4 }}>{tkImageSize}%</span>
                      </div>
                      {/* image + resize handle */}
                      <div style={{ position: 'relative', alignSelf: 'flex-start', width: `${tkImageSize}%` }}>
                        <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--color-border-medium)' }}>
                          <img src={tkImage} alt="" style={{ display: 'block', width: '100%' }} />
                          <button onClick={() => setTkImage('')} style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,0.55)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <X size={13} />
                          </button>
                        </div>
                        {/* drag-resize grip */}
                        <div
                          onMouseDown={e => {
                            e.preventDefault()
                            const parentW = (e.currentTarget.parentElement?.parentElement as HTMLElement)?.getBoundingClientRect().width
                            if (!parentW) return
                            const startX = e.clientX
                            const startPct = tkImageSize
                            const onMove = (me: MouseEvent) => setTkImageSize(Math.min(100, Math.max(10, Math.round(startPct + (me.clientX - startX) / parentW * 100))))
                            const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
                            document.addEventListener('mousemove', onMove)
                            document.addEventListener('mouseup', onUp)
                          }}
                          style={{ position: 'absolute', right: -12, top: 0, bottom: 0, width: 24, cursor: 'ew-resize', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}
                        >
                          <div style={{ width: 4, height: 40, borderRadius: 2, background: 'var(--color-border-medium)' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  {!collapsed && !isImage && (
                    <>
                      {/* Outer wrapper with gutters on every side; the table is clipped for
                          clean rounded corners, the "+" handles sit OUTSIDE it in the gutters. */}
                      <div onKeyDown={onTableKeyDown} onClick={() => setSel(null)} style={{ position: 'relative', padding: 20 }}>
                        <div ref={tblBoxRef} style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--color-border-strong)' }}>
                          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
                            <thead><tr>{tkTableHeaders.map((h, c) => {
                              const colSel = sel?.type === 'col' && sel.index === c
                              return (
                                <th key={c} onDoubleClick={() => setSel({ type: 'col', index: c })}
                                  style={{ borderRight: '1px solid var(--color-border-medium)', borderBottom: '1px solid var(--color-border-strong)', background: colSel ? cfg.bg : 'var(--color-table-header-bg)', padding: 0, cursor: 'text', transition: 'background 0.12s', minWidth: 90 }}>
                                  <input value={h} onChange={e => setTableHeader(c, e.target.value)} placeholder={`Заголовок ${c + 1}`}
                                    onPaste={c === 0 ? handleTablePaste : undefined}
                                    style={{ width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', background: 'transparent', color: 'var(--color-text)', padding: '8px 10px', fontWeight: 700, fontFamily: 'inherit', fontSize: 13 }} />
                                </th>
                              )
                            })}</tr></thead>
                            <tbody>{tkTableRows.map((row, r) => (
                              <tr key={r}>{row.map((cell, c) => {
                                const hl = (sel?.type === 'row' && sel.index === r) || (sel?.type === 'col' && sel.index === c)
                                const key = `${r},${c}`
                                const isExplicitlyEmpty = !!tkEmptyCells[key]
                                const isActive = tkActiveCell === key
                                const showChoice = !isExplicitlyEmpty && !isActive && cell === ''
                                return (
                                  <td key={c}
                                    onClick={() => { if (showChoice) setTkActiveCell(key) }}
                                    onDoubleClick={() => setSel({ type: 'row', index: r })}
                                    style={{ borderRight: '1px solid var(--color-border)', borderTop: r > 0 ? '1px solid var(--color-border)' : undefined, padding: 0, cursor: showChoice ? 'pointer' : 'text', background: hl ? cfg.bg : 'var(--color-table-cell-bg)', transition: 'background 0.12s', position: 'relative' }}>
                                    {isExplicitlyEmpty ? (
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', minHeight: 34, gap: 4 }}>
                                        <span style={{ fontSize: 11, color: 'var(--color-text-4)', fontStyle: 'italic' }}>пусто</span>
                                        <button
                                          onMouseDown={e => { e.stopPropagation(); setTkEmptyCells(prev => { const n = { ...prev }; delete n[key]; return n }); setTkActiveCell(key) }}
                                          style={{ fontSize: 10, color: 'var(--color-text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: '1px 4px', borderRadius: 4, lineHeight: 1 }}
                                          title="Вписать"
                                        >✎</button>
                                      </div>
                                    ) : showChoice ? (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 8px', minHeight: 34 }}>
                                        <button
                                          onMouseDown={e => { e.stopPropagation(); setTkActiveCell(key) }}
                                          style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, border: `1px solid ${cfg.color}55`, background: cfg.bg, color: cfg.color, cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1.2 }}
                                        >Вписать</button>
                                        <button
                                          onMouseDown={e => { e.stopPropagation(); setTkEmptyCells(prev => ({ ...prev, [key]: true })) }}
                                          style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1.2 }}
                                        >Пусто</button>
                                      </div>
                                    ) : (
                                      <input
                                        autoFocus={isActive}
                                        value={cell}
                                        onChange={e => setTableCell(r, c, e.target.value)}
                                        onFocus={() => setTkActiveCell(key)}
                                        onBlur={() => { if (cell === '') setTkActiveCell(null) }}
                                        placeholder="—"
                                        style={{ width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', background: 'transparent', padding: '8px 10px', fontFamily: 'inherit', fontSize: 13, color: 'var(--color-text)' }}
                                      />
                                    )}
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
                    </>
                  )}
                </div>
              )
            })}

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
                  onPaste={e => {
                    const items = Array.from(e.clipboardData?.items || [])
                    const imageItems = items.filter(it => it.type.startsWith('image/'))
                    if (imageItems.length === 0) return
                    e.preventDefault()
                    imageItems.forEach(item => {
                      const file = item.getAsFile()
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = ev => {
                        if (ev.target?.result) setExplPhotos(prev => [...prev, ev.target!.result as string])
                      }
                      reader.readAsDataURL(file)
                    })
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
                    <div style={{ width: 22, height: 22, borderRadius: 7, background: 'var(--color-purple-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--color-purple-text)', flexShrink: 0 }}>{idx + 1}</div>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--color-purple-text)' }}>{lesson.title}</div>
                    {enrollDbId && (
                      <button onClick={() => setEditingLessonIdx(idx)} title="Редактировать контент урока (конспект + ДЗ)"
                        style={{ width: 22, height: 22, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'var(--color-purple-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-purple-text)' }}>
                        <FileText size={11} />
                      </button>
                    )}
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
                  style={{ width: 38, height: 38, borderRadius: 11, border: 'none', cursor: 'pointer', background: 'var(--color-purple-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-purple-text)', flexShrink: 0 }}>
                  <Plus size={16} strokeWidth={2.4} />
                </motion.button>
              </div>

              {editingLessonIdx !== null && enrollDbId && (
                <LessonFullEditor
                  dbCourseId={enrollDbId}
                  lessons={cLessons.map(l => ({ title: l.title }))}
                  lessonIndex={editingLessonIdx}
                  onSwitch={setEditingLessonIdx}
                  onClose={() => setEditingLessonIdx(null)}
                />
              )}
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
                    <button onClick={() => setWQCorr(oi)} style={{ width: 22, height: 22, borderRadius: '50%', border: wQCorr === oi ? 'none' : '2px solid var(--color-text-4)', flexShrink: 0, background: wQCorr === oi ? WTYPE_COLOR[wType] : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {wQCorr === oi && <Check size={11} strokeWidth={3} style={{ color: '#fff' }} />}
                    </button>
                    <input value={opt} onChange={e => { const o = [...wQOpts]; o[oi] = e.target.value; setWQOpts(o) }} placeholder={`Вариант ${oi + 1}…`}
                      style={{ ...inputSt, flex: 1, border: wQCorr === oi ? `1.5px solid ${WTYPE_COLOR[wType]}55` : '1.5px solid var(--color-border-medium)', background: wQCorr === oi ? `${WTYPE_BG[wType]}88` : 'var(--color-bg-2)' }} />
                  </div>
                ))}
                <div style={{ fontSize: 10, color: 'var(--color-text-3)' }}>● — правильный ответ</div>
              </>}

              {wType === 'facts' && <>
                <div><Label>Заголовок факта</Label><input value={wFcTerm} onChange={e => setWFcTerm(e.target.value)} style={inputSt} /></div>
                <div><Label>Текст факта</Label><textarea value={wFcDef} onChange={e => setWFcDef(e.target.value)} rows={3} style={{ ...inputSt, resize: 'vertical' }} /></div>
              </>}

              {wType === 'reactions' && <>
                <div><Label>Эмодзи</Label><input value={wFcTerm} onChange={e => setWFcTerm(e.target.value)} placeholder="напр. 🔥" style={inputSt} /></div>
                <div><Label>Цитата / реплика</Label><input value={wFcDef} onChange={e => setWFcDef(e.target.value)} placeholder="Текст реакции…" style={inputSt} /></div>
                <div><Label>Название урока / темы</Label><input value={wDLabel} onChange={e => setWDLabel(e.target.value)} placeholder="Урок или тема…" style={inputSt} /></div>
              </>}

              {wType === 'pomodoro' && <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <Label>Фокус (мин)</Label>
                    <input type="number" min={5} max={90} value={wPomoFocus} onChange={e => setWPomoFocus(Number(e.target.value))} style={inputSt} />
                  </div>
                  <div>
                    <Label>Перерыв (мин)</Label>
                    <input type="number" min={1} max={30} value={wPomoBreak} onChange={e => setWPomoBreak(Number(e.target.value))} style={inputSt} />
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-3)', background: 'var(--color-peach-soft)', borderRadius: 10, padding: '10px 12px' }}>
                  Эти настройки применятся к таймеру «Фокус» у студентов
                </div>
              </>}

              {wType === 'memes' && <>
                <div><Label>Эмодзи</Label><input value={wFcTerm} onChange={e => setWFcTerm(e.target.value)} placeholder="напр. 😅" style={inputSt} /></div>
                <div><Label>Название мема</Label><input value={wFcDef} onChange={e => setWFcDef(e.target.value)} placeholder="Заголовок…" style={inputSt} /></div>
                <div><Label>Подпись / шутка</Label><input value={wDLabel} onChange={e => setWDLabel(e.target.value)} placeholder="Пуанта…" style={inputSt} /></div>
              </>}

              {wType !== 'pomodoro' && (
                <motion.button whileTap={{ scale: 0.97 }} onClick={addWidgetItem}
                  style={{ padding: '9px 0', borderRadius: 12, border: 'none', cursor: 'pointer', background: WTYPE_BG[wType], color: WTYPE_COLOR[wType], fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Plus size={13} /> Добавить элемент
                </motion.button>
              )}

              {wType === 'pomodoro' && wItems.length === 0 && (
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setWItems([{ id: 'pomo', focusMin: wPomoFocus, breakMin: wPomoBreak }])}
                  style={{ padding: '9px 0', borderRadius: 12, border: 'none', cursor: 'pointer', background: WTYPE_BG.pomodoro, color: WTYPE_COLOR.pomodoro, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Check size={13} /> Применить настройки
                </motion.button>
              )}
              {wType === 'pomodoro' && wItems.length > 0 && (
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setWItems([{ id: 'pomo', focusMin: wPomoFocus, breakMin: wPomoBreak }])}
                  style={{ padding: '9px 0', borderRadius: 12, border: 'none', cursor: 'pointer', background: WTYPE_BG.pomodoro, color: WTYPE_COLOR.pomodoro, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Check size={13} /> Обновить: {wPomoFocus} / {wPomoBreak} мин
                </motion.button>
              )}

              {wItems.length > 0 && wType !== 'pomodoro' && (
                <div>
                  <SectionHead>Добавлено: {wItems.length}</SectionHead>
                  {wItems.slice(0, 6).map((item, i) => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--color-bg-2)', borderRadius: 9, marginBottom: 4 }}>
                      <div style={{ width: 18, height: 18, borderRadius: 5, background: WTYPE_BG[wType], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: WTYPE_COLOR[wType] }}>{i + 1}</div>
                      <div style={{ flex: 1, fontSize: 11, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.question ?? item.factTitle ?? item.emoji ?? item.memeTitle ?? '—'}
                        {(item.factText || item.quote || item.memeCaption) && (
                          <span style={{ color: 'var(--color-text-3)' }}> · {(item.factText ?? item.quote ?? item.memeCaption ?? '').slice(0, 30)}</span>
                        )}
                      </div>
                      <button onClick={() => setWItems(prev => prev.filter(x => x.id !== item.id))} style={{ width: 18, height: 18, borderRadius: 5, border: 'none', cursor: 'pointer', background: 'var(--color-red-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-red-text)' }}><X size={9} /></button>
                    </div>
                  ))}
                  {wItems.length > 6 && (
                    <div style={{ fontSize: 11, color: 'var(--color-text-3)', textAlign: 'center', padding: '4px 0' }}>+{wItems.length - 6} ещё</div>
                  )}
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
                        border: active ? `1.5px solid ${cfg.color}` : '1.5px solid var(--color-border)',
                        background: active ? cfg.bg : 'var(--color-bg-2)', cursor: 'pointer', textAlign: 'left', width: '100%',
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
                  <div>
                    <button
                      onClick={() => {
                        setCondImgPickerOpen(v => !v)
                        setTimeout(() => condImgPasteZoneRef.current?.focus(), 50)
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 11, background: 'var(--color-bg-2)', cursor: 'pointer', border: '1.5px solid var(--color-border)', width: '100%', textAlign: 'left' }}
                    >
                      <ImageIcon size={15} strokeWidth={2} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-text)' }}>{tkImage ? 'Заменить фото' : 'Добавить фото'}</div>
                    </button>
                    {condImgPickerOpen && (
                      <div style={{ margin: '4px 0 6px', borderRadius: 10, border: '1.5px dashed var(--color-border-medium)', overflow: 'hidden' }}>
                        <div
                          ref={condImgPasteZoneRef}
                          tabIndex={0}
                          onPaste={e => {
                            const items = Array.from(e.clipboardData?.items ?? [])
                            const imgItem = items.find(it => it.type.startsWith('image/'))
                            if (!imgItem) return
                            e.preventDefault()
                            const file = imgItem.getAsFile()
                            if (!file) return
                            const reader = new FileReader()
                            reader.onload = ev => { setTkImage(String(ev.target?.result)); setCondImgPickerOpen(false) }
                            reader.readAsDataURL(file)
                          }}
                          style={{ padding: '12px 10px', textAlign: 'center', fontSize: 12, color: 'var(--color-text-3)', outline: 'none', cursor: 'default', background: 'var(--color-bg-2)' }}
                        >
                          Нажмите <kbd style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border-medium)', borderRadius: 4, padding: '1px 5px', fontFamily: 'inherit', fontSize: 11 }}>Ctrl+V</kbd> чтобы вставить фото
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 10px', borderTop: '1px solid var(--color-border-soft)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)', background: 'var(--color-bg-2)' }}>
                          <ImageIcon size={13} />
                          Выбрать файл
                          <input ref={condImgFileRef} type="file" accept="image/*" onChange={e => { onPickImage(e); setCondImgPickerOpen(false) }} style={{ display: 'none' }} />
                        </label>
                      </div>
                    )}
                  </div>
                  <button onClick={() => setTkHasTable(v => !v)} style={{
                    display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 11,
                    border: tkHasTable ? `1.5px solid ${cfg.color}` : '1.5px solid var(--color-border)',
                    background: tkHasTable ? cfg.bg : 'var(--color-bg-2)', cursor: 'pointer', textAlign: 'left', width: '100%',
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

// ─── Diagnostic management ─────────────────────────────────────────────────────
const BASE_URL = window.location.origin + window.location.pathname

const SUBJECT_META: Record<DiagSubject, { label: string; accent: string; soft: string }> = {
  biology:      { label: 'Биология',          accent: '#22c55e', soft: 'var(--color-green-soft)'  },
  chemistry:    { label: 'Химия',             accent: '#8B5CF6', soft: 'var(--color-purple-soft)' },
  logic:        { label: 'Скрининг мышления', accent: '#f59e0b', soft: 'var(--color-yellow-soft)' },
  'ap-chem-ru': { label: 'AP Chemistry (RU)', accent: '#3b82f6', soft: 'rgba(59,130,246,0.12)'   },
  'ap-chem-en': { label: 'AP Chemistry (EN)', accent: '#14b8a6', soft: 'rgba(20,184,166,0.12)'   },
}
const DIAG_SUBJECTS: DiagSubject[] = ['biology', 'chemistry', 'logic', 'ap-chem-ru', 'ap-chem-en']
const SUBJECT_ICON_MAP: Record<DiagSubject, React.ElementType> = {
  biology: FlaskConical,
  chemistry: Atom,
  logic: Target,
  'ap-chem-ru': Atom,
  'ap-chem-en': Globe,
}

// Runtime meta for custom user-created tests
const CUSTOM_META = new Map<string, { label: string; accent: string; soft: string }>()
function getSubjectMeta(subject: string) {
  return (SUBJECT_META as Record<string, { label: string; accent: string; soft: string }>)[subject]
    ?? CUSTOM_META.get(subject)
    ?? { label: subject, accent: '#8B5CF6', soft: 'var(--color-purple-soft)' }
}
function getSubjectIcon(subject: string): React.ElementType {
  return (SUBJECT_ICON_MAP as Record<string, React.ElementType>)[subject] ?? FileText
}

export interface CustomTest { id: string; label: string; accent: string }
const CUSTOM_TESTS_KEY = 'constructor-custom-tests'
function loadCustomTests(): CustomTest[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_TESTS_KEY) ?? '[]') } catch { return [] }
}
function persistCustomTests(tests: CustomTest[]) { localStorage.setItem(CUSTOM_TESTS_KEY, JSON.stringify(tests)) }
// Register loaded custom tests into CUSTOM_META so cards/editors pick them up
function hydrateCustomMeta(tests: CustomTest[]) {
  tests.forEach(t => CUSTOM_META.set(t.id, { label: t.label, accent: t.accent, soft: t.accent + '22' }))
}

const CREATOR_ACCENTS = [
  { hex: '#8B5CF6', soft: 'var(--color-purple-soft)' },
  { hex: '#22c55e', soft: 'var(--color-green-soft)'  },
  { hex: '#ef4444', soft: 'rgba(239,68,68,0.1)'      },
  { hex: '#3b82f6', soft: 'rgba(59,130,246,0.12)'    },
  { hex: '#f59e0b', soft: 'rgba(245,158,11,0.11)'    },
  { hex: '#ec4899', soft: 'rgba(236,72,153,0.12)'    },
]

function DiagnosticSubjectPanel({ subject }: { subject: DiagSubject }) {
  const { label, accent, soft } = SUBJECT_META[subject]

  const [questions, setQuestions] = useState<DiagQuestion[]>(() => loadDiagQuestions(subject))
  const [expanded, setExpanded] = useState(false)
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const [editText, setEditText] = useState('')
  const [editOpts, setEditOpts] = useState<string[]>([])
  const [editCorrect, setEditCorrect] = useState(0)
  useEffect(() => { fetchDiagQuestions(subject).then(setQuestions) }, [subject])

  function save(qs: DiagQuestion[]) {
    setQuestions(qs)
    saveDiagQuestions(subject, qs)
  }

  function startEdit(idx: number) {
    const q = questions[idx]
    setEditIdx(idx)
    setEditText(q.text)
    setEditOpts([...q.options])
    setEditCorrect(q.correct)
  }

  function commitEdit() {
    if (editIdx === null) return
    const updated = questions.map((q, i) => i === editIdx
      ? { ...q, text: editText, options: editOpts, correct: editCorrect }
      : q
    )
    save(updated)
    setEditIdx(null)
  }

  function removeQuestion(idx: number) {
    save(questions.filter((_, i) => i !== idx))
    if (editIdx === idx) setEditIdx(null)
  }

  function resetToDefault() {
    const def = DEFAULT_QUESTIONS[subject]
    save(def)
    setEditIdx(null)
  }

  function copyLink() {
    const url = `${BASE_URL}#/diagnostic?subject=${subject}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{
      background: 'rgba(var(--glass-rgb), 0.9)',
      border: '1px solid var(--color-border-glass)',
      borderRadius: 18, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: `${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {(() => { const I = SUBJECT_ICON_MAP[subject]; return <I size={18} style={{ color: accent }} /> })()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>{label}</div>
          <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>{questions.length} вопросов</div>
        </div>

        {/* Copy link button */}
        <button
          onClick={copyLink}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 14px', borderRadius: 12, cursor: 'pointer',
            border: `1.5px solid ${copied ? '#22c55e' : accent}`,
            background: copied ? 'var(--color-green-soft)' : `${accent}15`,
            color: copied ? 'var(--color-green-text)' : accent,
            fontSize: 12, fontWeight: 700, transition: 'all 0.18s', flexShrink: 0,
          }}
        >
          {copied ? <Check size={13} /> : <ClipboardCopy size={13} />}
          {copied ? 'Скопировано!' : 'Скопировать ссылку'}
        </button>

        {/* Expand/collapse */}
        <button
          onClick={() => setExpanded(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', display: 'flex', alignItems: 'center' }}
        >
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* Question list */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--color-border-soft)', padding: '12px 20px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {questions.map((q, idx) => (
            <div key={q.id} style={{
              borderRadius: 12, border: `1px solid ${editIdx === idx ? accent : 'var(--color-border)'}`,
              background: editIdx === idx ? `${accent}08` : 'var(--color-bg-2)',
              overflow: 'hidden',
            }}>
              {editIdx === idx ? (
                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    rows={2}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--color-border-medium)', background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none' }}
                  />
                  {editOpts.map((opt, oi) => (
                    <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        onClick={() => setEditCorrect(oi)}
                        style={{
                          width: 20, height: 20, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                          border: `2px solid ${editCorrect === oi ? accent : 'var(--color-border-medium)'}`,
                          background: editCorrect === oi ? accent : 'transparent',
                        }}
                      />
                      <input
                        value={opt}
                        onChange={e => { const o = [...editOpts]; o[oi] = e.target.value; setEditOpts(o) }}
                        style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--color-border-medium)', background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 12, fontFamily: 'inherit', outline: 'none' }}
                      />
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button onClick={() => setEditIdx(null)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Отмена</button>
                    <button onClick={commitEdit} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: accent, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}><Check size={12} />Сохранить</button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                    background: accent, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, marginTop: 1,
                  }}>{idx + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text)', marginBottom: 3 }}>{q.text}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>
                      ✓ {q.options[q.correct]}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => startEdit(idx)} style={{ padding: '4px 8px', borderRadius: 7, border: '1px solid var(--color-border)', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Ред.</button>
                    <button onClick={() => removeQuestion(idx)} style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: 'var(--color-red-soft)', color: 'var(--color-red-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={11} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Footer actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              onClick={resetToDefault}
              style={{ flex: 1, padding: '8px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Сбросить к стандарту
            </button>
            <div style={{ fontSize: 11, color: 'var(--color-muted)', display: 'flex', alignItems: 'center', paddingLeft: 4 }}>
              Ссылка диагностики:<br /><code style={{ fontSize: 10 }}>/#/diagnostic?subject={subject}</code>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StudentPickerModal({ onPick, onClose }: { onPick: (studentId: string, name: string) => void; onClose: () => void }) {
  const allStudents = useAllStudents()
  const [search, setSearch] = useState('')
  const filtered = allStudents.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))

  return createPortal(
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 400, background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 22, overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.22)' }}
      >
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--color-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>Выбрать ученика</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'var(--color-bg-5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)' }}><X size={14} /></button>
        </div>
        <div style={{ padding: '12px 16px 8px' }}>
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по имени…"
            style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 11, border: '1.5px solid var(--color-border-medium)', background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
          />
        </div>
        <div style={{ maxHeight: 300, overflowY: 'auto', padding: '4px 10px 14px' }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 13, color: 'var(--color-muted)' }}>Ученики не найдены</div>
          )}
          {filtered.map(s => (
            <button
              key={s.id}
              onClick={() => onPick(s.id, s.name)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'transparent', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', transition: 'background 0.12s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-purple-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--color-accent)', flexShrink: 0 }}>
                {s.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </div>,
    document.body
  )
}

function DiagnosticStudentCard({
  result, allStudents, onLink, onUnlink, onDelete,
}: {
  result: AnonDiagResult
  allStudents: { id: string; name: string }[]
  onLink: () => void
  onUnlink: () => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [questions, setQuestions] = useState(() => loadDiagQuestions(result.subject))
  useEffect(() => { fetchDiagQuestions(result.subject).then(setQuestions) }, [result.subject])

  const sections = Object.entries(result.results)
  const totalCorrect = sections.reduce((s, [, v]) => s + v.correct, 0)
  const totalQ = sections.reduce((s, [, v]) => s + v.total, 0)
  const pct = totalQ ? Math.round((totalCorrect / totalQ) * 100) : 0
  const { accent, soft, label: subjectLabel } = SUBJECT_META[result.subject as DiagSubject] ?? { accent: '#8B5CF6', soft: 'var(--color-purple-soft)', label: result.subject }
  const date = new Date(result.timestamp).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
  const time = new Date(result.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  const pctColor = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444'
  const initials = result.name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
  const weakSections = sections.filter(([, v]) => v.total > 0 && v.correct / v.total < 0.5)
  const linkedStudent = result.linkedStudentId ? allStudents.find(s => s.id === result.linkedStudentId) : null

  return (
    <div style={{
      background: 'rgba(var(--glass-rgb), 0.9)', border: `1px solid ${expanded ? accent + '44' : 'var(--color-border-glass)'}`,
      borderRadius: 18, overflow: 'hidden', transition: 'border-color 0.2s',
    }}>
      {/* Collapsed row — click to expand */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${accent}88, ${accent}44)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 800, color: '#fff',
        }}>{initials || '?'}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {result.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
            <span style={{ padding: '1px 7px', borderRadius: 6, background: accent, color: '#fff', fontSize: 10, fontWeight: 700 }}>{subjectLabel}</span>
            <span>{date} · {time}</span>
            {linkedStudent && (
              <span style={{ color: '#22c55e', fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                <Check size={10} strokeWidth={2.5} /> {linkedStudent.name.split(' ')[0]}
              </span>
            )}
          </div>
        </div>

        <div style={{
          width: 52, height: 52, borderRadius: 14, flexShrink: 0,
          background: `${pctColor}15`, border: `2px solid ${pctColor}33`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: pctColor, lineHeight: 1 }}>{pct}%</div>
          <div style={{ fontSize: 9, color: 'var(--color-muted)', marginTop: 1 }}>{totalCorrect}/{totalQ}</div>
        </div>

        <ChevronDown size={16} style={{
          color: 'var(--color-text-3)', flexShrink: 0,
          transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s',
        }} />
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ borderTop: `1px solid ${accent}22`, padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Section breakdown */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 8, letterSpacing: 0.4 }}>РЕЗУЛЬТАТЫ ПО РАЗДЕЛАМ</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sections.map(([sec, { correct: c, total: t }]) => {
                    const p = t ? Math.round((c / t) * 100) : 0
                    const col = p >= 70 ? '#22c55e' : p >= 40 ? '#f59e0b' : '#ef4444'
                    return (
                      <div key={sec}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 12, color: 'var(--color-text-2)', fontWeight: 600 }}>{sec}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: col }}>{c}/{t} · {p}%</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 999, background: 'var(--color-bg-5)' }}>
                          <motion.div
                            initial={{ width: 0 }} animate={{ width: `${p}%` }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            style={{ height: '100%', borderRadius: 999, background: col }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Weak spots */}
              {weakSections.length > 0 && (
                <div style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>⚠ Слабые темы для проработки</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {weakSections.map(([sec, { correct: c, total: t }]) => (
                      <div key={sec} style={{ fontSize: 12, color: 'var(--color-text-2)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{sec}</span>
                        <span style={{ fontWeight: 700, color: '#ef4444' }}>{Math.round((c / t) * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Per-question answers */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 8, letterSpacing: 0.4 }}>ОТВЕТЫ НА ВОПРОСЫ</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {questions.map((q, i) => {
                    const chosen = result.answers?.[q.id]
                    const isCorrect = chosen === q.correct
                    const hasAnswer = chosen !== undefined
                    return (
                      <div key={q.id} style={{
                        borderRadius: 11,
                        border: `1px solid ${hasAnswer ? (isCorrect ? '#22c55e33' : '#ef444433') : 'var(--color-border-soft)'}`,
                        background: hasAnswer ? (isCorrect ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)') : 'var(--color-bg-2)',
                        padding: '9px 12px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
                            background: hasAnswer ? (isCorrect ? '#22c55e22' : '#ef444422') : 'var(--color-bg-5)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 9, fontWeight: 800, color: hasAnswer ? (isCorrect ? '#22c55e' : '#ef4444') : 'var(--color-text-3)',
                          }}>{i + 1}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.4, marginBottom: 4 }}>{q.text}</div>
                            {hasAnswer ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <div style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                                  {isCorrect
                                    ? <CheckCircle size={11} style={{ color: '#22c55e', flexShrink: 0 }} />
                                    : <Circle size={11} style={{ color: '#ef4444', flexShrink: 0 }} />}
                                  <span style={{ color: isCorrect ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                                    {q.options[chosen]}
                                  </span>
                                </div>
                                {!isCorrect && (
                                  <div style={{ fontSize: 11, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <CheckCircle size={11} style={{ color: '#22c55e', flexShrink: 0 }} />
                                    <span style={{ color: 'var(--color-muted)' }}>Верно:</span>
                                    <span style={{ fontWeight: 600, color: 'var(--color-text-2)' }}>{q.options[q.correct]}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>— нет ответа</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Footer: link + delete */}
              <div style={{ display: 'flex', gap: 8, paddingTop: 2 }}>
                {result.linkedStudentId ? (
                  <>
                    <div style={{ flex: 1, padding: '9px 12px', borderRadius: 10, background: 'var(--color-green-soft)', border: '1px solid #86efac44', fontSize: 12, fontWeight: 600, color: 'var(--color-green-text)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Check size={13} strokeWidth={2.5} /> {linkedStudent?.name ?? 'Привязан'}
                    </div>
                    <button onClick={onUnlink} style={{ padding: '9px 14px', borderRadius: 10, border: 'none', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Отвязать</button>
                  </>
                ) : (
                  <button
                    onClick={onLink}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1.5px solid ${accent}`, background: accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit' }}
                  >
                    <Key size={13} strokeWidth={2.4} /> Выбрать ученика
                  </button>
                )}
                <button
                  onClick={e => { e.stopPropagation(); onDelete() }}
                  style={{ width: 38, borderRadius: 10, border: 'none', background: 'var(--color-red-soft)', color: 'var(--color-red-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                >
                  <Trash2 size={14} />
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DiagnosticManagement({ onBack }: { onBack: () => void }) {
  const [anonResults, setAnonResults] = useState<AnonDiagResult[]>([])
  const [pickerFor, setPickerFor] = useState<string | null>(null)
  const allStudents = useAllStudents()

  async function refreshResults() {
    const data = await loadAnonResults()
    setAnonResults(data)
  }

  useEffect(() => { refreshResults() }, [])

  async function handleLink(resultId: string, studentId: string) {
    await linkAnonResult(resultId, studentId)
    await refreshResults()
    setPickerFor(null)
  }

  async function handleUnlink(resultId: string) {
    await unlinkAnonResult(resultId)
    await refreshResults()
  }

  async function handleDelete(resultId: string) {
    await deleteAnonResult(resultId)
    await refreshResults()
  }

  return (
    <motion.div
      key="testing"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ flex: 1, display: 'flex', minWidth: 0, overflow: 'hidden', position: 'relative' }}
    >
      <AnimatePresence>
        {pickerFor && (
          <StudentPickerModal
            onPick={(studentId) => handleLink(pickerFor, studentId)}
            onClose={() => setPickerFor(null)}
          />
        )}
      </AnimatePresence>

      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', scrollbarGutter: 'stable', padding: '100px 32px 48px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Back button */}
        <div>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
            onClick={onBack}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 16px 9px 12px', borderRadius: 999,
              border: '1px solid var(--color-border-soft)',
              background: 'rgba(var(--glass-rgb), 0.9)',
              color: 'var(--color-text)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <ArrowLeft size={15} strokeWidth={2} /> Назад
          </motion.button>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--color-purple-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Target size={20} style={{ color: 'var(--color-accent)' }} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text)' }}>Диагностическое тестирование</div>
            <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>Скопируй ссылку и отправь ученику — результаты появятся здесь</div>
          </div>
        </div>

        {/* How it works */}
        <div style={{
          padding: '14px 18px', borderRadius: 14,
          background: 'var(--color-purple-soft)',
          border: '1px solid rgba(99,84,207,0.2)',
          display: 'flex', gap: 14, alignItems: 'flex-start',
        }}>
          <ClipboardCopy size={18} style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>Как это работает</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-2)', lineHeight: 1.6 }}>
              1. Скопируй ссылку нужного предмета<br />
              2. Отправь ученику в мессенджере или через ДЗ<br />
              3. Ученик вводит ФИО и проходит тест без регистрации<br />
              4. Результаты появляются ниже — нажми «Выбрать ученика» чтобы привязать к профилю
            </div>
          </div>
        </div>

        {/* Biology panel */}
        <DiagnosticSubjectPanel subject="biology" />

        {/* Chemistry panel */}
        <DiagnosticSubjectPanel subject="chemistry" />

        {/* Logic / cognitive screening panel */}
        <DiagnosticSubjectPanel subject="logic" />

        {/* Results section */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Database size={14} style={{ color: 'var(--color-accent)' }} />
            Результаты тестирований
            {anonResults.length > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-accent)', background: 'var(--color-purple-soft)', borderRadius: 7, padding: '2px 8px' }}>
                {anonResults.length}
              </span>
            )}
            <button
              onClick={refreshResults}
              title="Обновить"
              style={{
                marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 12px', borderRadius: 999, border: 'none', cursor: 'pointer',
                background: 'var(--color-bg-3)', color: 'var(--color-muted)',
                fontSize: 11, fontWeight: 600,
              }}
            >
              ↻ Обновить
            </button>
          </div>
          {anonResults.length === 0 ? (
            <div style={{
              padding: '24px', borderRadius: 16, border: '1.5px dashed var(--color-border-medium)',
              textAlign: 'center', color: 'var(--color-muted)', fontSize: 13,
            }}>
              Ещё никто не прошёл тест. Скопируй ссылку выше и отправь ученику.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {anonResults.map(r => (
                <DiagnosticStudentCard
                  key={r.id}
                  result={r}
                  allStudents={allStudents}
                  onLink={() => setPickerFor(r.id)}
                  onUnlink={() => handleUnlink(r.id)}
                  onDelete={() => handleDelete(r.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─── DiagResultsTable — inline table below cards ──────────────────────────────
function DiagResultsTable({
  subject, results, selectedResultId, onSelectResult, onOpenEditor, onRefresh,
}: {
  subject: DiagSubject
  results: AnonDiagResult[]
  selectedResultId: string | null
  onSelectResult: (id: string) => void
  onOpenEditor: () => void
  onRefresh: () => void
}) {
  const { label, accent, soft } = SUBJECT_META[subject]
  const [copied, setCopied] = useState(false)

  function copyLink() {
    navigator.clipboard.writeText(`${BASE_URL}#/diagnostic?subject=${subject}`)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    <div style={{ background: 'rgba(var(--glass-rgb), 0.95)', border: '1px solid var(--color-border)', borderRadius: 22, overflow: 'hidden' }}>
      {/* Table header toolbar */}
      <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--color-border-soft)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{label}</div>
          <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 1 }}>
            {results.length > 0 ? `${results.length} прохождени${results.length === 1 ? 'е' : 'й'}` : 'Ещё никто не прошёл'}
            &nbsp;·&nbsp;<span style={{ color: accent, fontWeight: 600 }}>Второй клик = редактор</span>
          </div>
        </div>
        <button onClick={onRefresh} style={{ padding: '6px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'var(--color-bg-3)', color: 'var(--color-muted)', fontSize: 12, fontWeight: 600 }}>↻</button>
        <button onClick={copyLink} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 12, border: 'none', cursor: 'pointer', background: copied ? 'var(--color-green-soft)' : soft, color: copied ? 'var(--color-green-text)' : '#fff', fontSize: 12, fontWeight: 700 }}>
          {copied ? <Check size={13} /> : <Link2 size={13} />}
          {copied ? 'Скопировано!' : 'Ссылка'}
        </button>
        <button onClick={onOpenEditor} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'var(--color-bg-3)', color: 'var(--color-text-2)', fontSize: 12, fontWeight: 700 }}>
          <Pencil size={13} /> Редактор
        </button>
      </div>

      {results.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-muted)', fontSize: 13 }}>
          Ещё никто не прошёл. Отправь ссылку ученику.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--color-bg-3)' }}>
              {['Ученик', 'Дата', 'Результат', 'Разделы (слабые)', 'Статус'].map((h, i) => (
                <th key={h} style={{ padding: '9px 16px', textAlign: i >= 2 ? 'center' : 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', whiteSpace: 'nowrap', borderBottom: '1px solid var(--color-border-soft)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => {
              const sections = Object.entries(r.results)
              const totalC = sections.reduce((s, [, v]) => s + v.correct, 0)
              const totalQ = sections.reduce((s, [, v]) => s + v.total, 0)
              const pct = totalQ ? Math.round((totalC / totalQ) * 100) : 0
              const pctColor = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444'
              const weak = sections.filter(([, v]) => v.total > 0 && v.correct / v.total < 0.5).map(([k]) => k)
              const date = new Date(r.timestamp).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
              const initials = r.name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
              const isSelected = r.id === selectedResultId
              return (
                <motion.tr
                  key={r.id}
                  onClick={() => onSelectResult(r.id)}
                  animate={{ background: isSelected ? `${accent}10` : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}
                  style={{ cursor: 'pointer', borderBottom: '1px solid var(--color-border-soft)', borderLeft: isSelected ? `3px solid ${accent}` : '3px solid transparent' }}
                  whileHover={{ background: `${accent}08` }}
                >
                  <td style={{ padding: '11px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: `${accent}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: accent }}>
                        {initials || '?'}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{r.name}</div>
                        {r.linkedStudentId && <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}><Check size={9} /> привязан</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>{date}</td>
                  <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: pctColor, lineHeight: 1 }}>{pct}%</div>
                      <div style={{ fontSize: 9, color: 'var(--color-muted)' }}>{totalC}/{totalQ}</div>
                    </div>
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {weak.length === 0
                        ? <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 600 }}>Всё ок</span>
                        : weak.slice(0, 3).map(s => (
                            <span key={s} style={{ fontSize: 9, padding: '2px 7px', borderRadius: 6, background: '#ef444420', color: '#ef4444', fontWeight: 600 }}>{s}</span>
                          ))
                      }
                    </div>
                  </td>
                  <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                    {r.linkedStudentId
                      ? <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 7, background: 'var(--color-green-soft)', color: 'var(--color-green-text)', fontWeight: 700 }}>Привязан</span>
                      : <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 7, background: 'var(--color-bg-3)', color: 'var(--color-muted)', fontWeight: 600 }}>Аноним</span>
                    }
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ─── DiagResultStudentPanel — right-side panel for selected result ─────────────
function DiagResultStudentPanel({
  result, allStudents, onClose, onRefresh,
}: {
  result: AnonDiagResult
  allStudents: { id: string; name: string }[]
  onClose: () => void
  onRefresh: () => void
}) {
  const { accent, soft } = SUBJECT_META[result.subject]
  const Icon = SUBJECT_ICON_MAP[result.subject]
  const [pickerOpen, setPickerOpen] = useState(false)

  const sections = Object.entries(result.results)
  const totalC = sections.reduce((s, [, v]) => s + v.correct, 0)
  const totalQ = sections.reduce((s, [, v]) => s + v.total, 0)
  const pct = totalQ ? Math.round((totalC / totalQ) * 100) : 0
  const pctColor = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444'
  const initials = result.name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
  const linkedStudent = result.linkedStudentId ? allStudents.find(s => s.id === result.linkedStudentId) : null
  const date = new Date(result.timestamp).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })
  const time = new Date(result.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

  async function handleLink(studentId: string) {
    await linkAnonResult(result.id, studentId)
    await onRefresh()
    setPickerOpen(false)
  }
  async function handleUnlink() {
    await unlinkAnonResult(result.id)
    await onRefresh()
  }
  async function handleDelete() {
    await deleteAnonResult(result.id)
    await onRefresh()
    onClose()
  }

  return (
    <>
      <AnimatePresence>
        {pickerOpen && (
          <StudentPickerModal onPick={(sid) => handleLink(sid)} onClose={() => setPickerOpen(false)} />
        )}
      </AnimatePresence>
      <motion.div
        initial={{ x: 380, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 380, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 30, mass: 0.9 }}
        style={{ position: 'absolute', top: 108, right: 24, bottom: 28, width: 352, zIndex: 20, borderRadius: 20, background: 'rgba(var(--glass-rgb), 0.97)', border: '1px solid var(--color-border)', boxShadow: '0 10px 34px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <PanelHeader title={result.name} accent={accent} accentBg={soft} Icon={Icon} onClose={onClose} />
        <div style={{ flex: 1, overflowY: 'auto', scrollbarGutter: 'stable', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Score ring */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 16, background: `${pctColor}10`, border: `1px solid ${pctColor}22` }}>
            <div style={{ width: 60, height: 60, borderRadius: 18, background: `${pctColor}20`, border: `3px solid ${pctColor}44`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: pctColor, lineHeight: 1 }}>{pct}%</div>
              <div style={{ fontSize: 9, color: 'var(--color-muted)', marginTop: 2 }}>{totalC}/{totalQ}</div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Общий результат</div>
              <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 2 }}>{date}</div>
              <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>{time}</div>
            </div>
          </div>

          {/* Fluid summary */}
          {(() => {
            const sortedBySec = [...sections].sort((a, b) => {
              const pa = a[1].total ? a[1].correct / a[1].total : 0
              const pb = b[1].total ? b[1].correct / b[1].total : 0
              return pb - pa
            })
            const best = sortedBySec[0]
            const worst = sortedBySec[sortedBySec.length - 1]
            const bestPct = best ? Math.round((best[1].correct / best[1].total) * 100) : 0
            const worstPct = worst ? Math.round((worst[1].correct / worst[1].total) * 100) : 0
            const summary = pct >= 85
              ? `Уверенный результат${best ? ` — особенно силён в разделе «${best[0]}» (${bestPct}%)` : ''}.`
              : pct >= 65
              ? `Хороший уровень${best ? `, сильнее всего «${best[0]}»` : ''}${worst && worstPct < 70 ? `, стоит подтянуть «${worst[0]}» (${worstPct}%)` : ''}.`
              : pct >= 40
              ? `Средний результат. ${worst ? `Слабее всего показал себя в «${worst[0]}» (${worstPct}%) — рекомендуется дополнительная проработка.` : ''}`
              : `Низкий результат${worst ? ` — особенно в разделе «${worst[0]}» (${worstPct}%)` : ''}. Нужна серьёзная работа над базой.`
            return (
              <div style={{ padding: '10px 14px', borderRadius: 12, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)', fontSize: 12, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
                {summary}
              </div>
            )
          })()}

          {/* Sections */}
          <div>
            <SectionHead>Разбивка по разделам</SectionHead>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sections.map(([sec, v]) => {
                const p = v.total ? Math.round((v.correct / v.total) * 100) : 0
                const c = p >= 70 ? '#22c55e' : p >= 40 ? '#f59e0b' : '#ef4444'
                return (
                  <div key={sec} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: 'var(--color-bg-2)', border: `1px solid ${c}22` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', marginBottom: 3 }}>{sec}</div>
                      <div style={{ height: 4, borderRadius: 999, background: 'var(--color-bg-3)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${p}%`, background: c, borderRadius: 999, transition: 'width 0.4s' }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: c, flexShrink: 0 }}>{p}%</div>
                    <div style={{ fontSize: 10, color: 'var(--color-muted)', flexShrink: 0 }}>{v.correct}/{v.total}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Link to student */}
          <div>
            <SectionHead>Ученик</SectionHead>
            {linkedStudent ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 14, background: 'var(--color-green-soft)', border: '1px solid rgba(34,197,94,0.25)' }}>
                <Check size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{linkedStudent.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-green-text)' }}>Привязан к профилю</div>
                </div>
                <button onClick={handleUnlink} style={{ padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.12)', color: '#ef4444', fontSize: 11, fontWeight: 700 }}>Отвязать</button>
              </div>
            ) : (
              <button
                onClick={() => setPickerOpen(true)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '12px', borderRadius: 14, border: `1.5px dashed ${accent}55`, cursor: 'pointer', background: soft, color: '#fff', fontSize: 13, fontWeight: 700 }}
              >
                <GraduationCap size={15} /> Назначить ученика
              </button>
            )}
          </div>

          {/* Delete */}
          <button onClick={handleDelete} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'var(--color-red-soft)', color: 'var(--color-red-text)', fontSize: 12, fontWeight: 700 }}>
            <Trash2 size={13} /> Удалить результат
          </button>
        </div>
      </motion.div>
    </>
  )
}

// ─── Date/time picker helpers ─────────────────────────────────────────────────
const RU_MONTHS_SHORT = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек']
const RU_MONTHS_FULL  = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const RU_DAYS_SHORT   = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

function parseDateISO(v: string): Date | null {
  if (!v) return null
  const [y, m, d] = v.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}
function formatDateISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function formatDateDisplay(iso: string): string {
  const d = parseDateISO(iso)
  if (!d) return ''
  return `${String(d.getDate()).padStart(2,'0')} ${RU_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

function generateTimeSlotsDiag() {
  const s: string[] = []
  for (let h = 0; h < 24; h++) for (const m of [0, 30]) s.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
  return s
}
const TIME_SLOTS_DIAG = generateTimeSlotsDiag()

const calNavBtn: React.CSSProperties = { width: 28, height: 28, borderRadius: 8, border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-2)', flexShrink: 0 }

function DiagCalendarPicker({ value, onChange, onClose }: { value: string; onChange: (v: string) => void; onClose: () => void }) {
  const selected = parseDateISO(value)
  const today = new Date()
  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth())

  function prevMonth() { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) } else setViewMonth(m => m - 1) }
  function nextMonth() { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) } else setViewMonth(m => m + 1) }

  const days: (Date | null)[] = []
  const first = new Date(viewYear, viewMonth, 1)
  let startDow = first.getDay() - 1; if (startDow < 0) startDow = 6
  for (let i = 0; i < startDow; i++) days.push(null)
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  for (let i = 1; i <= daysInMonth; i++) days.push(new Date(viewYear, viewMonth, i))
  while (days.length % 7 !== 0) days.push(null)

  return (
    <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.15 }}
      style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 200, background: 'var(--color-bg-input)', border: '1.5px solid var(--color-border-glass)', borderRadius: 16, boxShadow: '0 12px 40px rgba(0,0,0,0.18)', padding: '12px 14px 14px', minWidth: 238, userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button onClick={prevMonth} style={calNavBtn}><ChevronLeft size={14} /></button>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{RU_MONTHS_FULL[viewMonth]} {viewYear}</span>
        <button onClick={nextMonth} style={calNavBtn}><ChevronRight size={14} /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
        {RU_DAYS_SHORT.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: 'var(--color-muted)', paddingBottom: 4 }}>{d}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {days.map((d, i) => {
          if (!d) return <div key={i} />
          const sel = !!(selected && d.toDateString() === selected.toDateString())
          const tod = d.toDateString() === today.toDateString()
          return (
            <button key={i} onClick={() => { onChange(formatDateISO(d)); onClose() }}
              style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: sel ? 700 : 500, background: sel ? 'var(--color-accent)' : tod ? 'var(--color-purple-soft)' : 'transparent', color: sel ? '#fff' : tod ? 'var(--color-accent)' : 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.1s' }}>
              {d.getDate()}
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}

function DiagTimePicker({ value, onChange, onClose }: { value: string; onChange: (v: string) => void; onClose: () => void }) {
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const idx = TIME_SLOTS_DIAG.indexOf(value)
    if (idx !== -1 && listRef.current) (listRef.current.children[idx] as HTMLElement)?.scrollIntoView({ block: 'center' })
  }, [value])
  return (
    <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.15 }}
      style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 200, background: 'var(--color-bg-input)', border: '1.5px solid var(--color-border-glass)', borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.18)', overflow: 'hidden' }}>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 28, zIndex: 1, background: 'linear-gradient(to bottom, var(--color-bg-input), transparent)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 28, zIndex: 1, background: 'linear-gradient(to top, var(--color-bg-input), transparent)', pointerEvents: 'none' }} />
        <div ref={listRef} style={{ maxHeight: 200, overflowY: 'auto', padding: '4px 6px', scrollbarWidth: 'none' }}>
          {TIME_SLOTS_DIAG.map(t => {
            const active = t === value
            return (
              <button key={t} onClick={() => { onChange(t); onClose() }}
                style={{ width: '100%', border: 'none', background: active ? 'var(--color-accent)' : 'transparent', color: active ? '#fff' : 'var(--color-text)', padding: '7px 10px', textAlign: 'left', fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer', display: 'block', borderRadius: 9, transition: 'background 0.18s, color 0.18s' }}>
                {t}
              </button>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}

// ─── DiagnosticEditorFullPage — 2-column: left=assignment, right=questions ────
function DiagnosticEditorFullPage({
  subject, onClose,
  groups, allStudents,
  assignments, onAssign, onDeleteAssignment,
}: {
  subject: DiagSubject; onClose: () => void
  groups: import('../../data/teacherMockData').Group[]
  allStudents: import('../../data/teacherMockData').Student[]
  assignments: TestAssignment[]
  onAssign: (a: Omit<TestAssignment, 'id' | 'createdAt'>) => void
  onDeleteAssignment: (id: string) => void
}) {
  const { label, accent, soft } = getSubjectMeta(subject)
  const Icon = getSubjectIcon(subject)
  const [questions, setQuestions] = useState<DiagQuestion[]>(() => loadDiagQuestions(subject))
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [editOpts, setEditOpts] = useState<string[]>([])
  const [editCorrect, setEditCorrect] = useState(0)
  const [dirty, setDirty] = useState(false)
  const [docked, setDocked] = useState(false)

  // ── Assignment panel state ──
  const [assignType, setAssignType] = useState<'test' | 'trial'>('test')
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set())
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [calOpen, setCalOpen] = useState(false)
  const [timeOpen, setTimeOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [expandedAssignId, setExpandedAssignId] = useState<string | null>(null)
  const [assignResults, setAssignResults] = useState<AnonDiagResult[]>([])

  const thisAssignments = assignments.filter(a => a.subject === subject)

  useEffect(() => {
    if (expandedAssignId) loadAssignmentResults(expandedAssignId).then(setAssignResults)
    else setAssignResults([])
  }, [expandedAssignId])

  const toggleGroup = (id: string) => setSelectedGroupIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleStudent = (id: string) => setSelectedStudentIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  async function handleAssign() {
    if (selectedGroupIds.size === 0 && selectedStudentIds.size === 0) return
    setSaving(true)
    await onAssign({
      title: `${label} · ${assignType === 'trial' ? 'Пробник' : 'Тест'}`,
      subject, assignType,
      groupIds: Array.from(selectedGroupIds),
      studentIds: Array.from(selectedStudentIds),
      dueDate: dueDate || undefined,
      closed: false,
    })
    setSelectedGroupIds(new Set()); setSelectedStudentIds(new Set()); setDueDate('')
    setSaving(false)
  }

  function copyLink() {
    navigator.clipboard.writeText(`${BASE_URL}#/diagnostic?subject=${subject}`)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  useEffect(() => { fetchDiagQuestions(subject).then(setQuestions) }, [subject])

  function save(qs: DiagQuestion[]) { setQuestions(qs); saveDiagQuestions(subject, qs); setDirty(false) }
  function startEdit(idx: number) { const q = questions[idx]; setEditIdx(idx); setEditText(q.text); setEditOpts([...q.options]); setEditCorrect(q.correct); setDirty(false) }
  function commitEdit() {
    if (editIdx === null) return
    save(questions.map((q, i) => i === editIdx ? { ...q, text: editText, options: editOpts, correct: editCorrect } : q))
    setEditIdx(null)
  }
  function removeQuestion(idx: number) { save(questions.filter((_, i) => i !== idx)); if (editIdx === idx) setEditIdx(null) }
  function resetToDefault() { save(DEFAULT_QUESTIONS[subject]); setEditIdx(null) }
  function addQuestion() {
    const newQ: DiagQuestion = { id: `q-${Date.now()}`, section: questions[questions.length - 1]?.section ?? 'Раздел 1', text: '', options: ['', '', '', ''], correct: 0 }
    const next = [...questions, newQ]
    save(next)
    setEditIdx(next.length - 1); setEditText(''); setEditOpts(['', '', '', '']); setEditCorrect(0); setDirty(true)
  }

  const canAssign = selectedGroupIds.size > 0 || selectedStudentIds.size > 0
  const [distMode, setDistMode] = useState<'assign' | 'link'>('assign')

  return (
    <motion.div
      key={`diag-editor-${subject}`}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onScroll={e => setDocked((e.currentTarget as HTMLElement).scrollTop > 64)}
      style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarGutter: 'stable', paddingTop: 100 }}
    >
      {/* ── Docked top bar ── */}
      <div className="docked-pills-row" style={{ position: 'fixed', top: 30, left: 32, right: 32, zIndex: 80, pointerEvents: 'none' }}>
        <AnimatePresence>
          {docked && (
            <motion.div
              key="diag-dock"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: [0, 6, -3.5, 1.5, -0.5, 0] }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.38, ease: [0.34, 1.56, 0.64, 1] }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, pointerEvents: 'none' }}
            >
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={onClose}
                style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, padding: '9px 16px 9px 12px', borderRadius: 999, ...dockGlass, color: 'var(--color-text)', fontSize: 14, fontWeight: 600, cursor: 'pointer', pointerEvents: 'auto' }}>
                <ArrowLeft size={15} strokeWidth={2} /> Назад
              </motion.button>
              <div style={{ padding: '9px 16px', borderRadius: 999, ...dockGlass, fontSize: 14, fontWeight: 700, color: 'var(--color-text)', pointerEvents: 'auto' }}>
                {label}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── In-flow header ── */}
      <motion.div
        animate={{ opacity: docked ? 0 : 1 }} transition={{ duration: 0.2 }}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 24px 20px' }}
      >
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={onClose}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '9px 16px 9px 12px', borderRadius: 999, border: '1px solid var(--color-border-soft)', background: 'rgba(var(--glass-rgb), 0.96)', color: 'var(--color-text)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <ArrowLeft size={15} strokeWidth={2} /> Назад
        </motion.button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: soft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={16} style={{ color: accent }} />
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>{label}</span>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={resetToDefault} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--color-border-soft)', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Сбросить к стандарту
          </button>
        </div>
      </motion.div>

      {/* ── 2-column body ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, padding: '0 24px 48px' }}>

        {/* ── LEFT: assignment panel ── */}
        <div style={{ width: 300, flexShrink: 0, position: 'sticky', top: 110, alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* 3-mode card */}
          <GlassCard style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Mode tabs */}
            <div style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 12, background: 'var(--color-bg-3)' }}>
              {([
                { id: 'assign', icon: Target, label: 'Назначить' },
                { id: 'link',   icon: Link2,  label: 'По ссылке' },
              ] as const).map(({ id, icon: Icon2, label }) => (
                <button key={id} onClick={() => setDistMode(id)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 4px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 700, transition: 'all 0.14s',
                    background: distMode === id ? 'var(--color-surface, var(--color-bg-input))' : 'transparent',
                    color: distMode === id ? accent : 'var(--color-text-3)',
                    boxShadow: distMode === id ? '0 1px 6px rgba(0,0,0,0.10)' : 'none',
                  }}>
                  <Icon2 size={12} /> {label}
                </button>
              ))}
            </div>

            {/* ── Mode: Назначить ── */}
            {distMode === 'assign' && (
              <>
                {/* Type toggle */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['test', 'trial'] as const).map(t => (
                    <button key={t} onClick={() => setAssignType(t)}
                      style={{ flex: 1, padding: '7px 0', borderRadius: 9, border: `1.5px solid ${assignType === t ? accent : 'var(--color-border-medium)'}`, background: assignType === t ? soft : 'transparent', color: assignType === t ? accent : 'var(--color-text-3)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.13s' }}>
                      {t === 'test' ? 'Контрольная' : 'Пробник'}
                    </button>
                  ))}
                </div>

                {/* Groups */}
                {groups.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>Группы</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {groups.map(g => (
                        <button key={g.id} onClick={() => toggleGroup(g.id)}
                          style={{ padding: '4px 10px', borderRadius: 8, border: `1.5px solid ${selectedGroupIds.has(g.id) ? g.color : 'var(--color-border-soft)'}`, background: selectedGroupIds.has(g.id) ? g.color + '22' : 'transparent', color: selectedGroupIds.has(g.id) ? g.color : 'var(--color-text-3)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.13s' }}>
                          {g.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Individual students */}
                {allStudents.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>Ученики</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, maxHeight: 100, overflowY: 'auto' }}>
                      {allStudents.map(s => (
                        <button key={s.id} onClick={() => toggleStudent(s.id)}
                          style={{ padding: '4px 10px', borderRadius: 8, border: `1.5px solid ${selectedStudentIds.has(s.id) ? accent : 'var(--color-border-soft)'}`, background: selectedStudentIds.has(s.id) ? soft : 'transparent', color: selectedStudentIds.has(s.id) ? accent : 'var(--color-text-3)', fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.13s' }}>
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Due date + time */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>Срок (необязательно)</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {/* Calendar trigger */}
                    <div style={{ position: 'relative', flex: 1 }}>
                      <button onClick={() => { setCalOpen(o => !o); setTimeOpen(false) }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px', borderRadius: 9, border: `1.5px solid ${calOpen ? accent : 'var(--color-border-medium)'}`, background: 'var(--color-bg-input)', color: dueDate ? 'var(--color-text)' : 'var(--color-text-3)', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', transition: 'border-color 0.15s', fontWeight: dueDate ? 600 : 400 }}>
                        <Calendar size={13} style={{ flexShrink: 0, color: accent }} />
                        <span style={{ flex: 1, textAlign: 'left' }}>{dueDate ? formatDateDisplay(dueDate) : 'Дата'}</span>
                        {dueDate && <button onClick={e => { e.stopPropagation(); setDueDate('') }} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: 'var(--color-text-3)', lineHeight: 1, fontSize: 13, display: 'flex' }}>×</button>}
                      </button>
                      <AnimatePresence>
                        {calOpen && <DiagCalendarPicker value={dueDate} onChange={v => { setDueDate(v); setCalOpen(false) }} onClose={() => setCalOpen(false)} />}
                      </AnimatePresence>
                    </div>
                    {/* Time trigger */}
                    <div style={{ position: 'relative', width: 80 }}>
                      <button onClick={() => { setTimeOpen(o => !o); setCalOpen(false) }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 5, padding: '8px 8px', borderRadius: 9, border: `1.5px solid ${timeOpen ? accent : 'var(--color-border-medium)'}`, background: 'var(--color-bg-input)', color: dueTime ? 'var(--color-text)' : 'var(--color-text-3)', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', transition: 'border-color 0.15s', fontWeight: dueTime ? 600 : 400 }}>
                        <Clock size={13} style={{ flexShrink: 0, color: accent }} />
                        <span>{dueTime || 'Время'}</span>
                      </button>
                      <AnimatePresence>
                        {timeOpen && <DiagTimePicker value={dueTime} onChange={v => { setDueTime(v); setTimeOpen(false) }} onClose={() => setTimeOpen(false)} />}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                <button onClick={handleAssign} disabled={saving || !canAssign}
                  style={{ padding: '10px', borderRadius: 11, border: 'none', background: canAssign ? accent : 'var(--color-bg-5)', color: canAssign ? '#fff' : 'var(--color-text-3)', fontSize: 13, fontWeight: 700, cursor: canAssign ? 'pointer' : 'not-allowed', fontFamily: 'inherit', transition: 'all 0.13s' }}>
                  {saving ? 'Назначаем…' : 'Назначить тест'}
                </button>
              </>
            )}

            {/* ── Mode: По ссылке (новый ученик) ── */}
            {distMode === 'link' && (
              <>
                <div style={{ fontSize: 12, color: 'var(--color-text-3)', lineHeight: 1.5 }}>
                  Человек проходит тест по ссылке, вводит имя и появляется в таблице результатов. Подходит для первичной диагностики.
                </div>
                <button onClick={copyLink}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px 14px', borderRadius: 11, cursor: 'pointer', border: `1.5px solid ${copied ? 'var(--color-green-text)' : accent}`, fontFamily: 'inherit', background: copied ? 'var(--color-green-soft)' : soft, color: copied ? 'var(--color-green-text)' : accent, fontSize: 13, fontWeight: 700, transition: 'all 0.18s' }}>
                  {copied ? <Check size={14} /> : <Link2 size={14} />}
                  {copied ? 'Ссылка скопирована!' : 'Копировать ссылку'}
                </button>
                <div style={{ fontSize: 11, color: 'var(--color-muted)', textAlign: 'center' }}>
                  После прохождения результат появится в таблице ниже
                </div>
              </>
            )}

          </GlassCard>

          {/* Existing assignments for this test */}
          {thisAssignments.length > 0 && (
            <GlassCard style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Назначения ({thisAssignments.length})
              </div>
              {thisAssignments.map(a => {
                const isExp = expandedAssignId === a.id
                const aGroups = groups.filter(g => a.groupIds.includes(g.id))
                const aStudents = allStudents.filter(s => a.studentIds.includes(s.id))
                return (
                  <div key={a.id}>
                    <div
                      onClick={() => setExpandedAssignId(prev => prev === a.id ? null : a.id)}
                      style={{ padding: '9px 12px', borderRadius: 10, background: isExp ? soft : 'var(--color-bg-2)', border: `1px solid ${isExp ? accent : 'var(--color-border)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.13s' }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                        <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 2, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {aGroups.map(g => <span key={g.id} style={{ color: g.color }}>● {g.name}</span>)}
                          {aStudents.map(s => <span key={s.id}>{s.name}</span>)}
                          {a.dueDate && <span>до {a.dueDate}</span>}
                        </div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); onDeleteAssignment(a.id) }}
                        style={{ width: 22, height: 22, borderRadius: 7, border: 'none', background: 'var(--color-red-soft)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-red-text)', flexShrink: 0 }}>
                        <Trash2 size={10} />
                      </button>
                    </div>
                    {isExp && (
                      <div style={{ margin: '4px 0 2px 8px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {assignResults.length === 0 ? (
                          <div style={{ fontSize: 11, color: 'var(--color-muted)', padding: '6px 10px' }}>Никто ещё не сдал</div>
                        ) : assignResults.map(r => {
                          const pct = r.results ? Math.round(Object.values(r.results).reduce((acc, s) => acc + s.correct, 0) / Math.max(1, Object.values(r.results).reduce((acc, s) => acc + s.total, 0)) * 100) : 0
                          const col = pct >= 70 ? '#34C877' : pct >= 40 ? '#F5A623' : '#F48B91'
                          return (
                            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: 'var(--color-bg)' }}>
                              <span style={{ fontSize: 11, color: 'var(--color-text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: col }}>{pct}%</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </GlassCard>
          )}
        </div>

        {/* ── RIGHT: editor + question list ── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 16, alignItems: 'flex-start' }}>

          {/* Question editor */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <AnimatePresence mode="wait">
              {editIdx !== null ? (
                <motion.div
                  key={`edit-${editIdx}`}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  <GlassCard style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{editIdx + 1}</div>
                      <div style={{ flex: 1, fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>Редактирование вопроса</div>
                      <button onClick={() => removeQuestion(editIdx)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 9, border: 'none', background: 'var(--color-red-soft)', color: 'var(--color-red-text)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        <X size={13} /> Удалить
                      </button>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Текст вопроса</div>
                      <textarea
                        value={editText} onChange={e => { setEditText(e.target.value); setDirty(true) }} rows={4}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${accent}55`, background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.5 }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Варианты ответов <span style={{ color: 'var(--color-muted)', fontWeight: 400, textTransform: 'none' }}>— нажми кружок чтобы отметить правильный</span></div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {editOpts.map((opt, oi) => (
                          <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <button onClick={() => { setEditCorrect(oi); setDirty(true) }}
                              style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, cursor: 'pointer', border: `2px solid ${editCorrect === oi ? accent : 'var(--color-border-medium)'}`, background: editCorrect === oi ? accent : 'transparent', transition: 'all 0.14s', position: 'relative' }}>
                              {editCorrect === oi && <Check size={13} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff', strokeWidth: 3 }} />}
                            </button>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', borderRadius: 12, border: `1.5px solid ${editCorrect === oi ? accent + '66' : 'var(--color-border-medium)'}`, background: editCorrect === oi ? soft : 'var(--color-bg-input)', overflow: 'hidden', transition: 'all 0.14s' }}>
                              <div style={{ width: 32, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: editCorrect === oi ? accent : 'var(--color-muted)', flexShrink: 0 }}>{String.fromCharCode(65 + oi)}</div>
                              <input value={opt} onChange={e => { const o = [...editOpts]; o[oi] = e.target.value; setEditOpts(o); setDirty(true) }}
                                style={{ flex: 1, padding: '10px 12px 10px 0', border: 'none', background: 'transparent', color: 'var(--color-text)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
                      <button onClick={() => setEditIdx(null)} style={{ padding: '10px 20px', borderRadius: 12, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Отмена</button>
                      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={commitEdit}
                        style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: accent, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'inherit' }}>
                        <Check size={15} strokeWidth={2.5} /> Сохранить вопрос
                      </motion.button>
                    </div>
                  </GlassCard>
                </motion.div>
              ) : (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                >
                  {/* Preview header — full read-only run-through before sending / assigning */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '2px 2px 2px' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: soft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={20} style={{ color: accent }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>Превью теста «{label}»</div>
                      <div style={{ fontSize: 12.5, color: 'var(--color-muted)' }}>
                        {questions.length} вопросов · нажми вопрос справа, чтобы редактировать
                      </div>
                    </div>
                  </div>

                  {questions.length === 0 ? (
                    <GlassCard style={{ padding: '40px 24px', textAlign: 'center', fontSize: 13, color: 'var(--color-muted)' }}>
                      Пока нет вопросов — добавь первый справа.
                    </GlassCard>
                  ) : (
                    questions.map((q, idx) => (
                      <GlassCard key={q.id} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${accent}22`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{idx + 1}</div>
                          <div style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.5, paddingTop: 3 }}>{q.text || 'Без текста'}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 40 }}>
                          {q.options.map((opt, oi) => {
                            const isCorrect = q.correct === oi
                            return (
                              <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 10, borderRadius: 11, border: `1.5px solid ${isCorrect ? accent + '66' : 'var(--color-border-medium)'}`, background: isCorrect ? soft : 'var(--color-bg-input)', padding: '9px 12px' }}>
                                <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, border: `2px solid ${isCorrect ? accent : 'var(--color-border-medium)'}`, background: isCorrect ? accent : 'transparent', position: 'relative' }}>
                                  {isCorrect && <Check size={12} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff', strokeWidth: 3 }} />}
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: isCorrect ? accent : 'var(--color-muted)', flexShrink: 0 }}>{String.fromCharCode(65 + oi)}</div>
                                <div style={{ flex: 1, fontSize: 13.5, color: 'var(--color-text)' }}>{opt || <span style={{ color: 'var(--color-text-4)' }}>—</span>}</div>
                              </div>
                            )
                          })}
                        </div>
                      </GlassCard>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Question list — sticky on the right */}
          <div style={{ width: 220, flexShrink: 0, position: 'sticky', top: 110, alignSelf: 'flex-start' }}>
            <GlassCard style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', padding: '2px 4px 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {questions.length} вопросов
              </div>
              {questions.map((q, idx) => (
                <button key={q.id} onClick={() => editIdx === idx ? setEditIdx(null) : startEdit(idx)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 8px', borderRadius: 10, border: 'none', cursor: 'pointer', background: editIdx === idx ? soft : 'transparent', color: editIdx === idx ? accent : 'var(--color-text)', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.12s' }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, background: editIdx === idx ? accent : `${accent}22`, color: editIdx === idx ? '#fff' : accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>{idx + 1}</div>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: editIdx === idx ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.text || 'Без текста'}</div>
                </button>
              ))}
              <button onClick={addQuestion}
                style={{ marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '8px', borderRadius: 10, border: `1.5px dashed ${accent}66`, background: 'transparent', color: accent, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Plus size={13} /> Добавить вопрос
              </button>
            </GlassCard>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Screening Editor Full Page ───────────────────────────────────────────────
const SCR_ACC = '#f59e0b'
const SCR_SOFT = 'rgba(245,158,11,0.11)'

const RULE_LABELS: Record<MatrixRuleKey, string> = {
  shape: 'Форма', size: 'Размер', fill: 'Заливка',
  rotation: 'Поворот', count: 'Количество', distribute3: 'Латинский квадрат', xor: 'XOR',
}
const ALL_RULES: MatrixRuleKey[] = ['shape','size','fill','rotation','count','distribute3','xor']

const SERIES_LABELS: Record<SeriesType, string> = {
  arithmetic: 'Арифметика', geometric: 'Геометрия',
  fibonacci: 'Фибоначчи', alternating: 'Чередование', letters: 'Буквы',
}
const ALL_SERIES: SeriesType[] = ['arithmetic','geometric','fibonacci','alternating','letters']

function ScrToggle({ on, label, onChange }: { on: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
        borderRadius: 10, border: `1.5px solid ${on ? SCR_ACC : 'var(--color-border-medium)'}`,
        background: on ? SCR_SOFT : 'var(--color-bg-3)',
        color: on ? SCR_ACC : 'var(--color-text-3)', fontSize: 13, fontWeight: 700,
        cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
      }}
    >
      <div style={{ width: 14, height: 14, borderRadius: '50%', background: on ? SCR_ACC : 'var(--color-border-medium)', flexShrink: 0, transition: 'background 0.15s' }} />
      {label}
    </button>
  )
}

function ScrNumInput({ label, value, min, max, step = 1, onChange }: {
  label: string; value: number; min?: number; max?: number; step?: number; onChange: (v: number) => void
}) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <input
        type="number" value={value} min={min} max={max} step={step}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: 90, padding: '8px 12px', borderRadius: 10, border: `1.5px solid ${SCR_ACC}55`, background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
      />
    </div>
  )
}

function ScrPills<T extends string>({ label, all, active, labelMap, onChange }: {
  label: string; all: T[]; active: T[]; labelMap: Record<T, string>; onChange: (v: T[]) => void
}) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {all.map(key => {
          const on = active.includes(key)
          return (
            <button key={key} onClick={() => onChange(on ? active.filter(k => k !== key) : [...active, key])}
              style={{ padding: '5px 12px', borderRadius: 8, border: `1.5px solid ${on ? SCR_ACC : 'var(--color-border-medium)'}`, background: on ? SCR_SOFT : 'var(--color-bg-3)', color: on ? SCR_ACC : 'var(--color-text-3)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.13s' }}>
              {labelMap[key]}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ScreeningDomainEditor({
  domainKey, cfg, onPatch,
}: {
  domainKey: DomainKey
  cfg: ScreeningConfig
  onPatch: (key: DomainKey, p: Record<string, unknown>) => void
}) {
  const dom = cfg[domainKey]
  const p = (patch: Record<string, unknown>) => onPatch(domainKey, patch)
  const row: React.CSSProperties = { display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }

  // common: count + adaptiveStopFails
  const commonCount = (
    <div style={row}>
      {'count' in dom && (
        <ScrNumInput label="Кол-во вопросов" value={(dom as { count: number }).count} min={1} max={40} onChange={v => p({ count: v })} />
      )}
      {dom.adaptive && (
        <ScrNumInput label="Стоп после N ошибок" value={dom.adaptiveStopFails} min={1} max={5} onChange={v => p({ adaptiveStopFails: v })} />
      )}
    </div>
  )

  if (domainKey === 'matrices') {
    const m = cfg.matrices
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {commonCount}
        <div style={row}>
          <ScrNumInput label="Мин. уровень" value={m.minLevel} min={1} max={5} onChange={v => p({ minLevel: v })} />
          <ScrNumInput label="Макс. уровень" value={m.maxLevel} min={1} max={5} onChange={v => p({ maxLevel: v })} />
        </div>
        <ScrPills label="Правила генерации" all={ALL_RULES} active={m.rules} labelMap={RULE_LABELS}
          onChange={v => p({ rules: v })} />
      </div>
    )
  }

  if (domainKey === 'series') {
    const s = cfg.series
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {commonCount}
        <div style={row}>
          <ScrNumInput label="Мин. уровень" value={s.minLevel} min={1} max={5} onChange={v => p({ minLevel: v })} />
          <ScrNumInput label="Макс. уровень" value={s.maxLevel} min={1} max={5} onChange={v => p({ maxLevel: v })} />
        </div>
        <ScrPills label="Типы рядов" all={ALL_SERIES} active={s.types} labelMap={SERIES_LABELS}
          onChange={v => p({ types: v })} />
      </div>
    )
  }

  if (domainKey === 'analogies') {
    const an = cfg.analogies
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {commonCount}
        <ScreeningAnalogyEditor items={an.pool} onChange={pool => p({ pool })} />
      </div>
    )
  }

  if (domainKey === 'rotation') {
    const ro = cfg.rotation
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {commonCount}
        <div style={row}>
          <ScrNumInput label="Мин. уровень" value={ro.minLevel} min={1} max={5} onChange={v => p({ minLevel: v })} />
          <ScrNumInput label="Макс. уровень" value={ro.maxLevel} min={1} max={5} onChange={v => p({ maxLevel: v })} />
        </div>
      </div>
    )
  }

  if (domainKey === 'memory') {
    const mem = cfg.memory
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={row}>
          <ScrNumInput label="Мин. спан" value={mem.minSpan} min={2} max={10} onChange={v => p({ minSpan: v })} />
          <ScrNumInput label="Макс. спан" value={mem.maxSpan} min={2} max={12} onChange={v => p({ maxSpan: v })} />
          <ScrNumInput label="Вспышка (мс)" value={mem.flashMs} min={200} max={2000} step={50} onChange={v => p({ flashMs: v })} />
        </div>
        <ScrToggle on={mem.backward} label="Обратный порядок" onChange={v => p({ backward: v })} />
        {dom.adaptive && (
          <ScrNumInput label="Стоп после N ошибок" value={dom.adaptiveStopFails} min={1} max={5} onChange={v => p({ adaptiveStopFails: v })} />
        )}
      </div>
    )
  }

  if (domainKey === 'stroop') {
    const st = cfg.stroop
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={row}>
          <ScrNumInput label="Кол-во попыток" value={st.trials} min={4} max={40} onChange={v => p({ trials: v })} />
          <ScrNumInput label="Дедлайн (мс, 0=нет)" value={st.deadlineMs} min={0} max={10000} step={100} onChange={v => p({ deadlineMs: v })} />
          <ScrNumInput label="Конгруэнтных (%)" value={Math.round(st.congruentRatio * 100)} min={0} max={100} onChange={v => p({ congruentRatio: v / 100 })} />
        </div>
        <ScrToggle on={st.measureRT} label="Измерять время реакции" onChange={v => p({ measureRT: v })} />
        <ScreeningColorEditor colors={st.colors} onChange={colors => p({ colors })} />
      </div>
    )
  }

  if (domainKey === 'speed') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <ScrNumInput label="Длительность (сек)" value={cfg.speed.durationSec} min={10} max={180} onChange={v => p({ durationSec: v })} />
      </div>
    )
  }

  if (domainKey === 'matching') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <ScreeningMatchEditor tasks={cfg.matching.tasks} onChange={tasks => p({ tasks })} />
      </div>
    )
  }

  return null
}

// Analogy pool editor
function ScreeningAnalogyEditor({ items, onChange }: { items: AnalogyItem[]; onChange: (v: AnalogyItem[]) => void }) {
  const [editId, setEditId] = useState<string | null>(null)
  const [ea, setEa] = useState(''); const [eb, setEb] = useState(''); const [ec, setEc] = useState('')
  const [eans, setEans] = useState(''); const [edist, setEdist] = useState(''); const [elv, setElv] = useState(1)

  function startEdit(it: AnalogyItem) {
    setEditId(it.id); setEa(it.a); setEb(it.b); setEc(it.c)
    setEans(it.answer); setEdist(it.distractors.join(', ')); setElv(it.level)
  }
  function commitEdit() {
    if (!editId) return
    onChange(items.map(it => it.id === editId ? { ...it, a: ea, b: eb, c: ec, answer: eans, distractors: edist.split(',').map(s => s.trim()).filter(Boolean), level: elv } : it))
    setEditId(null)
  }
  function addItem() {
    const id = `an-${Date.now()}`
    onChange([...items, { id, a: '', b: '', c: '', answer: '', distractors: [], level: 1 }])
    startEdit({ id, a: '', b: '', c: '', answer: '', distractors: [], level: 1 })
  }

  const inputStyle: React.CSSProperties = { flex: 1, padding: '7px 10px', borderRadius: 9, border: `1.5px solid ${SCR_ACC}44`, background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 13, fontFamily: 'inherit', outline: 'none', minWidth: 60 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Пул аналогий ({items.length})</div>
      {items.map((it, idx) => (
        <div key={it.id} style={{ borderRadius: 12, border: `1px solid ${editId === it.id ? SCR_ACC : 'var(--color-border)'}`, background: editId === it.id ? SCR_SOFT : 'var(--color-bg-2)', overflow: 'hidden' }}>
          {editId === it.id ? (
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input value={ea} onChange={e => setEa(e.target.value)} placeholder="A" style={{ ...inputStyle, maxWidth: 100 }} />
                <span style={{ alignSelf: 'center', color: 'var(--color-muted)', fontSize: 13 }}>→</span>
                <input value={eb} onChange={e => setEb(e.target.value)} placeholder="B" style={{ ...inputStyle, maxWidth: 100 }} />
                <span style={{ alignSelf: 'center', color: 'var(--color-muted)', fontSize: 13 }}>|</span>
                <input value={ec} onChange={e => setEc(e.target.value)} placeholder="C" style={{ ...inputStyle, maxWidth: 100 }} />
                <span style={{ alignSelf: 'center', color: 'var(--color-muted)', fontSize: 13 }}>→</span>
                <input value={eans} onChange={e => setEans(e.target.value)} placeholder="Ответ" style={{ ...inputStyle, maxWidth: 120 }} />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input value={edist} onChange={e => setEdist(e.target.value)} placeholder="Дистракторы через запятую" style={{ ...inputStyle }} />
                <select value={elv} onChange={e => setElv(Number(e.target.value))} style={{ padding: '7px 10px', borderRadius: 9, border: `1.5px solid ${SCR_ACC}44`, background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
                  {[1,2,3,4,5].map(l => <option key={l} value={l}>Ур. {l}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setEditId(null)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Отмена</button>
                <button onClick={() => onChange(items.filter(i => i.id !== it.id))} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'var(--color-red-soft)', color: 'var(--color-red-text)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Удалить</button>
                <button onClick={commitEdit} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: SCR_ACC, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Сохранить</button>
              </div>
            </div>
          ) : (
            <button onClick={() => startEdit(it)} style={{ width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, background: `${SCR_ACC}22`, color: SCR_ACC, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>{idx + 1}</div>
              <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {it.a} → {it.b} | {it.c} → <b>{it.answer || '?'}</b>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: SCR_ACC, background: SCR_SOFT, borderRadius: 6, padding: '2px 7px', flexShrink: 0 }}>Ур. {it.level}</span>
            </button>
          )}
        </div>
      ))}
      <button onClick={addItem} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 10, border: `1.5px dashed ${SCR_ACC}66`, background: 'transparent', color: SCR_ACC, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
        <Plus size={14} /> Добавить аналогию
      </button>
    </div>
  )
}

// Stroop color editor
function ScreeningColorEditor({ colors, onChange }: { colors: { name: string; hex: string }[]; onChange: (v: { name: string; hex: string }[]) => void }) {
  const inputStyle: React.CSSProperties = { padding: '7px 10px', borderRadius: 9, border: `1.5px solid ${SCR_ACC}44`, background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Цвета Струпа</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {colors.map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: c.hex, flexShrink: 0, border: '1px solid rgba(0,0,0,0.1)' }} />
            <input value={c.name} onChange={e => { const next = [...colors]; next[i] = { ...c, name: e.target.value }; onChange(next) }}
              placeholder="НАЗВАНИЕ" style={{ ...inputStyle, width: 140 }} />
            <input type="color" value={c.hex} onChange={e => { const next = [...colors]; next[i] = { ...c, hex: e.target.value }; onChange(next) }}
              style={{ width: 44, height: 34, padding: 2, borderRadius: 8, border: `1.5px solid ${SCR_ACC}44`, background: 'var(--color-bg-input)', cursor: 'pointer' }} />
            {colors.length > 2 && (
              <button onClick={() => onChange(colors.filter((_, j) => j !== i))}
                style={{ padding: '4px 8px', borderRadius: 7, border: 'none', background: 'var(--color-red-soft)', color: 'var(--color-red-text)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                <X size={12} />
              </button>
            )}
          </div>
        ))}
        <button onClick={() => onChange([...colors, { name: '', hex: '#000000' }])}
          style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: `1.5px dashed ${SCR_ACC}66`, background: 'transparent', color: SCR_ACC, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Plus size={13} /> Добавить цвет
        </button>
      </div>
    </div>
  )
}

// Matching tasks editor
function ScreeningMatchEditor({ tasks, onChange }: { tasks: MatchTask[]; onChange: (v: MatchTask[]) => void }) {
  const [openId, setOpenId] = useState<string | null>(tasks[0]?.id ?? null)

  function updateTask(id: string, patch: Partial<MatchTask>) {
    onChange(tasks.map(t => t.id === id ? { ...t, ...patch } : t))
  }
  function addTask() {
    const id = `mt-${Date.now()}`
    const t: MatchTask = { id, title: '', pairs: [{ left: '', right: '' }] }
    onChange([...tasks, t])
    setOpenId(id)
  }
  function removeTask(id: string) { onChange(tasks.filter(t => t.id !== id)); if (openId === id) setOpenId(null) }
  function updatePair(taskId: string, idx: number, side: 'left' | 'right', val: string) {
    const task = tasks.find(t => t.id === taskId)!
    const pairs = task.pairs.map((p, i) => i === idx ? { ...p, [side]: val } : p)
    updateTask(taskId, { pairs })
  }
  function addPair(taskId: string) {
    const task = tasks.find(t => t.id === taskId)!
    updateTask(taskId, { pairs: [...task.pairs, { left: '', right: '' }] })
  }
  function removePair(taskId: string, idx: number) {
    const task = tasks.find(t => t.id === taskId)!
    updateTask(taskId, { pairs: task.pairs.filter((_, i) => i !== idx) })
  }

  const inputStyle: React.CSSProperties = { flex: 1, padding: '7px 10px', borderRadius: 9, border: `1.5px solid ${SCR_ACC}44`, background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 13, fontFamily: 'inherit', outline: 'none', minWidth: 80 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Задания на сопоставление ({tasks.length})</div>
      {tasks.map((task, ti) => (
        <div key={task.id} style={{ borderRadius: 12, border: `1px solid ${openId === task.id ? SCR_ACC : 'var(--color-border)'}`, background: 'var(--color-bg-2)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer' }} onClick={() => setOpenId(openId === task.id ? null : task.id)}>
            <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, background: `${SCR_ACC}22`, color: SCR_ACC, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>{ti + 1}</div>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title || 'Без названия'}</div>
            <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>{task.pairs.length} пар</span>
            {openId === task.id ? <ChevronUp size={15} style={{ color: SCR_ACC, flexShrink: 0 }} /> : <ChevronDown size={15} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />}
          </div>
          {openId === task.id && (
            <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--color-border-soft)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input value={task.title} onChange={e => updateTask(task.id, { title: e.target.value })}
                placeholder="Название задания" style={{ ...inputStyle, marginTop: 10 }} />
              {task.pairs.map((pair, pi) => (
                <div key={pi} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input value={pair.left} onChange={e => updatePair(task.id, pi, 'left', e.target.value)} placeholder="Левая часть" style={inputStyle} />
                  <span style={{ color: 'var(--color-muted)', fontSize: 14, flexShrink: 0 }}>→</span>
                  <input value={pair.right} onChange={e => updatePair(task.id, pi, 'right', e.target.value)} placeholder="Правая часть" style={inputStyle} />
                  {task.pairs.length > 1 && (
                    <button onClick={() => removePair(task.id, pi)} style={{ padding: '5px', borderRadius: 7, border: 'none', background: 'var(--color-red-soft)', color: 'var(--color-red-text)', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                <button onClick={() => addPair(task.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: `1.5px dashed ${SCR_ACC}66`, background: 'transparent', color: SCR_ACC, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Plus size={13} /> Пара
                </button>
                <button onClick={() => removeTask(task.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: 'none', background: 'var(--color-red-soft)', color: 'var(--color-red-text)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Trash2 size={13} /> Удалить задание
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
      <button onClick={addTask} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 10, border: `1.5px dashed ${SCR_ACC}66`, background: 'transparent', color: SCR_ACC, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
        <Plus size={14} /> Добавить задание
      </button>
    </div>
  )
}

function ScreeningEditorFullPage({ onClose }: { onClose: () => void }) {
  const [cfg, setCfg] = useState<ScreeningConfig>(() => loadScreeningConfig())
  const [selectedDomain, setSelectedDomain] = useState<DomainKey | 'meta'>('meta')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [docked, setDocked] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)

  useEffect(() => { fetchScreeningConfig().then(c => { setCfg(c); setDirty(false) }) }, [])

  function patchDomain(key: DomainKey, p: Record<string, unknown>) {
    setCfg(prev => ({ ...prev, [key]: { ...prev[key], ...p } }))
    setDirty(true)
  }
  function patchMeta(p: { title?: string; description?: string }) {
    setCfg(prev => ({ ...prev, ...p }))
    setDirty(true)
  }

  async function handleSave() {
    setSaving(true)
    await saveScreeningConfig(cfg)
    setSaving(false)
    setDirty(false)
  }

  function resetToDefault() { setCfg(DEFAULT_SCREENING_CONFIG); setDirty(true) }

  const savePillStyle: React.CSSProperties = teacherSaveStyle({ disabled: saving })
  const dg = dockGlass

  const dom = selectedDomain === 'meta' ? null : cfg[selectedDomain as DomainKey]
  const info = dom?.info

  return (
    <motion.div
      key="screening-editor"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onScroll={e => setDocked((e.currentTarget as HTMLElement).scrollTop > 64)}
      style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarGutter: 'stable', paddingTop: 100 }}
    >
      {/* Docked top bar */}
      <div className="docked-pills-row" style={{ position: 'fixed', top: 30, left: 32, right: 32, zIndex: 80, pointerEvents: 'none' }}>
        <AnimatePresence>
          {docked && (
            <motion.div key="scr-dock"
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: [0, 6, -3.5, 1.5, -0.5, 0] }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.38, ease: [0.34, 1.56, 0.64, 1] }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, pointerEvents: 'none' }}
            >
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={onClose}
                style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, padding: '9px 16px 9px 12px', borderRadius: 999, ...dg, color: 'var(--color-text)', fontSize: 14, fontWeight: 600, cursor: 'pointer', pointerEvents: 'auto', fontFamily: 'inherit' }}>
                <ArrowLeft size={15} strokeWidth={2} /> Назад
              </motion.button>
              <div style={{ flexShrink: 1, minWidth: 0, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '9px 16px', borderRadius: 999, ...dg, fontSize: 14, fontWeight: 700, color: 'var(--color-text)', pointerEvents: 'auto' }}>
                {cfg.title || 'Скрининг мышления'}
              </div>
              <div style={{ flexGrow: 1 }} />
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleSave}
                style={{ ...savePillStyle, flexShrink: 0, pointerEvents: 'auto' }}>
                <Check size={14} strokeWidth={2.5} /> {saving ? 'Сохраняю…' : 'Сохранить'}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 0 48px' }}>
        {/* In-flow header */}
        <motion.div animate={{ opacity: docked ? 0 : 1 }} transition={{ duration: 0.2 }}
          style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 24px 14px' }}
        >
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={onClose}
            style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, padding: '9px 16px 9px 12px', borderRadius: 999, border: '1px solid var(--color-border-soft)', background: 'rgba(var(--glass-rgb), 0.96)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', color: 'var(--color-text)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            <ArrowLeft size={15} strokeWidth={2} /> Назад
          </motion.button>
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap' }}>
            {cfg.title || 'Скрининг мышления'}
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            <button onClick={resetToDefault} style={{ padding: '9px 16px', borderRadius: 999, border: '1px solid var(--color-border-soft)', background: 'rgba(var(--glass-rgb),0.96)', color: 'var(--color-text-3)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Сбросить к стандарту
            </button>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleSave} style={savePillStyle}>
              <Check size={14} strokeWidth={2.5} /> {saving ? 'Сохраняю…' : dirty ? 'Сохранить' : 'Сохранено'}
            </motion.button>
          </div>
        </motion.div>

        {/* Body */}
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>

          {/* LEFT: domain list */}
          <div style={{ padding: '0 0 20px 24px', flexShrink: 0, position: 'sticky', top: 110, alignSelf: 'flex-start' }}>
            <GlassCard style={{ width: 230, boxSizing: 'border-box', padding: 12, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', padding: '2px 4px 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {activeDomains(cfg).length} из {cfg.order.length} активных
              </div>
              <button onClick={() => setSelectedDomain('meta')}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 10, border: 'none', cursor: 'pointer', background: selectedDomain === 'meta' ? SCR_SOFT : 'transparent', color: selectedDomain === 'meta' ? SCR_ACC : 'var(--color-text)', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.12s', marginBottom: 4 }}>
                <Settings size={17} strokeWidth={2} style={{ flexShrink: 0, color: selectedDomain === 'meta' ? SCR_ACC : 'var(--color-text-2)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: selectedDomain === 'meta' ? 700 : 500 }}>Общие настройки</div>
                  <div style={{ fontSize: 10, color: selectedDomain === 'meta' ? SCR_ACC : 'var(--color-muted)', marginTop: 1 }}>Название, описание</div>
                </div>
                {selectedDomain === 'meta' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: SCR_ACC, flexShrink: 0 }} />}
              </button>
              <div style={{ height: 1, background: 'var(--color-border-soft)', margin: '4px 0 8px' }} />
              {cfg.order.map(key => {
                const d = cfg[key]
                const isSel = selectedDomain === key
                return (
                  <button key={key} onClick={() => setSelectedDomain(key)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 10, border: 'none', cursor: 'pointer', background: isSel ? SCR_SOFT : 'transparent', color: isSel ? SCR_ACC : d.enabled ? 'var(--color-text)' : 'var(--color-text-3)', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.12s' }}
                  >
                    {(() => { const DomIcon = DOMAIN_ICONS[key]; return <DomIcon size={17} strokeWidth={2} style={{ flexShrink: 0, color: isSel ? SCR_ACC : d.enabled ? 'var(--color-text-2)' : 'var(--color-text-3)' }} /> })()}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: isSel ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.info.short}</div>
                      <div style={{ fontSize: 10, color: d.enabled ? (isSel ? SCR_ACC : 'var(--color-muted)') : 'var(--color-text-3)', marginTop: 1 }}>{d.enabled ? 'активен' : 'выключен'}</div>
                    </div>
                    {isSel && <div style={{ width: 6, height: 6, borderRadius: '50%', background: SCR_ACC, flexShrink: 0 }} />}
                  </button>
                )
              })}
            </GlassCard>
          </div>

          {/* CENTER: domain editor */}
          <div style={{ flex: 1, minWidth: 0, padding: '0 24px 0 16px' }}>
            <AnimatePresence mode="wait">
              <motion.div key={selectedDomain}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                {selectedDomain === 'meta' ? (
                  <GlassCard style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 14, background: SCR_SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Settings size={24} strokeWidth={2} style={{ color: SCR_ACC }} />
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text)' }}>Общие настройки</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Название теста</div>
                      <input
                        value={cfg.title}
                        onChange={e => patchMeta({ title: e.target.value })}
                        placeholder="Название скрининга…"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 12, border: `1.5px solid ${SCR_ACC}66`, background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 15, fontWeight: 600, fontFamily: 'inherit', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Описание</div>
                      <textarea
                        value={cfg.description ?? ''}
                        onChange={e => patchMeta({ description: e.target.value })}
                        rows={4}
                        placeholder="Краткое описание, для кого и зачем этот тест…"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 12, border: `1.5px solid ${SCR_ACC}44`, background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.6 }}
                      />
                    </div>
                    <div style={{ padding: 14, borderRadius: 12, background: SCR_SOFT, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: SCR_ACC }}>Как работает скрининг</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-2)', lineHeight: 1.6 }}>
                        Включи или выключи нужные домены в списке слева. Для каждого домена настрой количество заданий, адаптивность и диапазон уровней. Порядок доменов в списке — порядок прохождения.
                      </div>
                    </div>
                  </GlassCard>
                ) : dom ? (
                <GlassCard style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {/* Domain header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    {(() => { const DomIcon = DOMAIN_ICONS[selectedDomain as DomainKey]; return (
                      <div style={{ width: 56, height: 56, borderRadius: 16, background: SCR_SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <DomIcon size={28} strokeWidth={2} style={{ color: SCR_ACC }} />
                      </div>
                    ) })()}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text)' }}>{info!.label}</div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: SCR_ACC, background: SCR_SOFT, borderRadius: 7, padding: '2px 8px', letterSpacing: 0.3 }}>{info!.chc}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>{info!.dimension}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginTop: 6, lineHeight: 1.5 }}>{info!.measures}</div>
                    </div>
                  </div>

                  {/* Common: enabled + adaptive */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Включение</div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <ScrToggle on={dom.enabled} label={dom.enabled ? 'Домен включён' : 'Домен выключен'}
                        onChange={v => patchDomain(selectedDomain as DomainKey, { enabled: v })} />
                      <ScrToggle on={dom.adaptive} label={dom.adaptive ? 'Адаптивный' : 'Фиксированный'}
                        onChange={v => patchDomain(selectedDomain as DomainKey, { adaptive: v })} />
                    </div>
                  </div>

                  {/* Domain-specific */}
                  <ScreeningDomainEditor domainKey={selectedDomain as DomainKey} cfg={cfg} onPatch={patchDomain} />

                  {/* Methodology — what this block measures, how it works, what it determines */}
                  <div style={{ borderTop: '1px solid var(--color-border-soft)', paddingTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: '50%', border: `1.5px solid ${SCR_ACC}`, color: SCR_ACC, fontSize: 10, fontStyle: 'italic', fontWeight: 800 }}>i</span>
                      Методология
                    </div>
                    {([
                      ['Как устроено', info!.how],
                      ['Что определяет', info!.determines],
                      ['Научная основа', info!.science],
                    ] as [string, string][]).map(([h, body]) => (
                      <div key={h}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: SCR_ACC, marginBottom: 3 }}>{h}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--color-text-2)', lineHeight: 1.55 }}>{body}</div>
                      </div>
                    ))}
                  </div>

                </GlassCard>
                ) : null}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Screening domain display meta for test creator ───────────────────────────
const SCR_DOMAIN_META: Record<DomainKey, { short: string; emoji: string }> = {
  matrices:  { short: 'Матрицы',   emoji: '🧩' },
  series:    { short: 'Серии',     emoji: '📈' },
  analogies: { short: 'Аналогии',  emoji: '🔀' },
  rotation:  { short: 'Вращение',  emoji: '🔁' },
  memory:    { short: 'Память',    emoji: '🧠' },
  stroop:    { short: 'Струп',     emoji: '🎨' },
  speed:     { short: 'Скорость',  emoji: '⚡' },
  matching:  { short: 'Связи',     emoji: '🔗' },
}
const DOMAIN_ICONS: Record<DomainKey, React.ElementType> = {
  matrices:  LayoutGrid,
  series:    TrendingUp,
  analogies: ArrowLeftRight,
  rotation:  RotateCcw,
  memory:    Brain,
  stroop:    Palette,
  speed:     Zap,
  matching:  Link2,
}

// ─── Diagnostic Test Creator ─────────────────────────────────────────────────
function DiagnosticTestCreator({ onSave, onCancel }: {
  onSave: (id: string, label: string, accent: string) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [accent, setAccent] = useState(CREATOR_ACCENTS[0].hex)
  const [questions, setQuestions] = useState<DiagQuestion[]>([])
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [editOpts, setEditOpts] = useState<string[]>(['', '', '', ''])
  const [editCorrect, setEditCorrect] = useState(0)
  const [editSection, setEditSection] = useState('')
  const [editType, setEditType] = useState<'mc' | 'screening'>('mc')
  const [editScrDomain, setEditScrDomain] = useState<DomainKey>('matrices')
  const [editScrCount, setEditScrCount] = useState(5)
  const [docked, setDocked] = useState(false)

  const soft = CREATOR_ACCENTS.find(a => a.hex === accent)?.soft ?? accent + '22'
  const canSave = title.trim().length > 0

  function startEdit(idx: number, q?: DiagQuestion) {
    const src = q ?? questions[idx]
    setEditIdx(idx); setEditText(src.text); setEditOpts([...src.options]); setEditCorrect(src.correct); setEditSection(src.section ?? '')
    const anyQ = src as DiagQuestion & { type?: string; screeningDomain?: string; screeningCount?: number }
    setEditType((anyQ.type as 'mc' | 'screening') ?? 'mc')
    setEditScrDomain((anyQ.screeningDomain as DomainKey) ?? 'matrices')
    setEditScrCount(anyQ.screeningCount ?? 5)
  }
  function addQuestion(type: 'mc' | 'screening' = 'mc') {
    const base: DiagQuestion = { id: `q-${Date.now()}`, section: editSection || title || 'Раздел 1', text: '', options: ['', '', '', ''], correct: 0 }
    const newQ = type === 'screening'
      ? { ...base, type: 'screening', screeningDomain: 'matrices', screeningCount: 5, text: `Блок: ${SCR_DOMAIN_META.matrices.short} (5 заданий)` }
      : { ...base, type: 'mc' }
    setQuestions(prev => { const next = [...prev, newQ]; startEdit(next.length - 1, newQ); return next })
  }
  function commitEdit() {
    if (editIdx === null) return
    setQuestions(prev => prev.map((q, i) => {
      if (i !== editIdx) return q
      const base = { ...q, section: editSection || q.section }
      if (editType === 'screening') {
        return { ...base, type: 'screening', screeningDomain: editScrDomain, screeningCount: editScrCount,
          text: `Блок: ${SCR_DOMAIN_META[editScrDomain].short} (${editScrCount} заданий)`, options: ['', '', '', ''] as string[], correct: 0 }
      }
      return { ...base, type: 'mc', text: editText, options: editOpts, correct: editCorrect }
    }))
    setEditIdx(null)
  }
  function removeQuestion(idx: number) { setQuestions(prev => prev.filter((_, i) => i !== idx)); if (editIdx === idx) setEditIdx(null) }

  async function handleSave() {
    if (!canSave) return
    const id = `custom-${title.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '-')}-${Date.now()}`
    const saved = editIdx !== null
      ? questions.map((q, i) => i === editIdx ? { ...q, text: editText, options: editOpts, correct: editCorrect, section: editSection || q.section } : q)
      : questions
    await saveDiagQuestions(id as DiagSubject, saved)
    onSave(id, title.trim(), accent)
  }

  const savePillStyle: React.CSSProperties = teacherSaveStyle({ disabled: !canSave })
  const dg = dockGlass

  return (
    <motion.div
      key="test-creator"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onScroll={e => setDocked((e.currentTarget as HTMLElement).scrollTop > 64)}
      style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarGutter: 'stable', paddingTop: 100 }}
    >
      <div className="docked-pills-row" style={{ position: 'fixed', top: 30, left: 32, right: 32, zIndex: 80, pointerEvents: 'none' }}>
        <AnimatePresence>
          {docked && (
            <motion.div key="creator-dock"
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: [0, 6, -3.5, 1.5, -0.5, 0] }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.38, ease: [0.34, 1.56, 0.64, 1] }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, pointerEvents: 'none' }}
            >
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={onCancel}
                style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, padding: '9px 16px 9px 12px', borderRadius: 999, ...dg, color: 'var(--color-text)', fontSize: 14, fontWeight: 600, cursor: 'pointer', pointerEvents: 'auto', fontFamily: 'inherit' }}>
                <ArrowLeft size={15} strokeWidth={2} /> Назад
              </motion.button>
              <div style={{ flexShrink: 1, minWidth: 0, maxWidth: 280, padding: '9px 16px', borderRadius: 999, ...dg, fontSize: 14, fontWeight: 700, color: 'var(--color-text)', pointerEvents: 'auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {title || 'Новый тест'}
              </div>
              <div style={{ flexGrow: 1 }} />
              <motion.button whileHover={{ scale: canSave ? 1.03 : 1 }} whileTap={{ scale: canSave ? 0.97 : 1 }} onClick={handleSave}
                style={{ ...savePillStyle, flexShrink: 0, pointerEvents: 'auto' }}>
                <Check size={14} strokeWidth={2.5} /> Создать тест
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 0 48px' }}>
        <motion.div animate={{ opacity: docked ? 0 : 1 }} transition={{ duration: 0.2 }}
          style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 24px 14px' }}
        >
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={onCancel}
            style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, padding: '9px 16px 9px 12px', borderRadius: 999, border: '1px solid var(--color-border-soft)', background: 'rgba(var(--glass-rgb), 0.96)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', color: 'var(--color-text)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            <ArrowLeft size={15} strokeWidth={2} /> Назад
          </motion.button>
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap' }}>
            {title || 'Новый тест'}
          </div>
          <motion.button whileHover={{ scale: canSave ? 1.03 : 1 }} whileTap={{ scale: canSave ? 0.97 : 1 }} onClick={handleSave} style={savePillStyle}>
            <Check size={14} strokeWidth={2.5} /> Создать тест
          </motion.button>
        </motion.div>

        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          {/* LEFT: name + color + questions list */}
          <div style={{ padding: '0 0 20px 24px', flexShrink: 0, position: 'sticky', top: 110, alignSelf: 'flex-start' }}>
            <GlassCard style={{ width: 230, boxSizing: 'border-box', padding: 16, display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Название теста</div>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Физика, Математика…" autoFocus
                  style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 10, border: `1.5px solid ${canSave ? accent + '66' : 'var(--color-border-medium)'}`, background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 13, fontFamily: 'inherit', outline: 'none', transition: 'border 0.15s' }} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Цвет</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {CREATOR_ACCENTS.map(a => (
                    <button key={a.hex} onClick={() => setAccent(a.hex)}
                      style={{ width: 28, height: 28, borderRadius: '50%', border: accent === a.hex ? '3px solid var(--color-text)' : '2px solid transparent', background: a.hex, cursor: 'pointer', outline: 'none', transition: 'border 0.15s', flexShrink: 0 }} />
                  ))}
                </div>
              </div>
              <div style={{ borderTop: '1px solid var(--color-border-soft)' }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Вопросы {questions.length > 0 && `(${questions.length})`}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {questions.map((q, idx) => (
                    <button key={q.id} onClick={() => editIdx === idx ? setEditIdx(null) : startEdit(idx)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 8px', borderRadius: 8, border: 'none', cursor: 'pointer', background: editIdx === idx ? soft : 'transparent', color: editIdx === idx ? accent : 'var(--color-text)', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.12s' }}>
                      <div style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, background: editIdx === idx ? accent : `${accent}22`, color: editIdx === idx ? '#fff' : accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800 }}>{idx + 1}</div>
                      <div style={{ flex: 1, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: editIdx === idx ? 600 : 400 }}>{q.text || 'Без текста'}</div>
                    </button>
                  ))}
                </div>
                <button onClick={() => addQuestion()}
                  style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '7px 8px', borderRadius: 8, border: `1.5px dashed ${accent}66`, background: 'transparent', color: accent, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Plus size={13} /> Добавить вопрос
                </button>
              </div>
            </GlassCard>
          </div>

          {/* CENTER: question editor */}
          <div style={{ flex: 1, minWidth: 0, padding: '0 16px 0 16px' }}>
            <AnimatePresence mode="wait">
              {editIdx !== null ? (
                <motion.div key={`edit-${editIdx}`}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}
                >
                  <GlassCard style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{editIdx + 1}</div>
                      <div style={{ flex: 1, fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>Вопрос {editIdx + 1}</div>
                      <button onClick={() => removeQuestion(editIdx)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 9, border: 'none', background: 'var(--color-red-soft)', color: 'var(--color-red-text)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        <X size={13} /> Удалить
                      </button>
                    </div>
                    {editType === 'screening' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20, borderRadius: 14, background: accent + '18', border: `1.5px solid ${accent}44` }}>
                        {(() => { const DI = DOMAIN_ICONS[editScrDomain]; return <div style={{ width: 52, height: 52, borderRadius: 14, background: accent + '28', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><DI size={26} strokeWidth={2} style={{ color: accent }} /></div> })()}
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>Скрининг-блок: {SCR_DOMAIN_META[editScrDomain].short}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-2)', lineHeight: 1.6 }}>
                            {editScrCount} автоматически генерируемых заданий этого типа<br />будут вставлены в тест в этом месте.
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Раздел / тема</div>
                          <input value={editSection} onChange={e => setEditSection(e.target.value)} placeholder="Например: Механика"
                            style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 10, border: `1.5px solid ${accent}44`, background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Текст вопроса</div>
                          <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={4} placeholder="Введите вопрос…"
                            style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${accent}55`, background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.5 }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Варианты ответов <span style={{ color: 'var(--color-muted)', fontWeight: 400, textTransform: 'none' }}>— нажми кружок чтобы отметить правильный</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {editOpts.map((opt, oi) => (
                              <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <button onClick={() => setEditCorrect(oi)}
                                  style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, cursor: 'pointer', border: `2px solid ${editCorrect === oi ? accent : 'var(--color-border-medium)'}`, background: editCorrect === oi ? accent : 'transparent', transition: 'all 0.14s', position: 'relative' }}>
                                  {editCorrect === oi && <Check size={13} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff', strokeWidth: 3 }} />}
                                </button>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', borderRadius: 12, border: `1.5px solid ${editCorrect === oi ? accent + '88' : 'var(--color-border-medium)'}`, background: editCorrect === oi ? accent : 'var(--color-bg-input)', overflow: 'hidden', transition: 'all 0.14s' }}>
                                  <div style={{ width: 32, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: editCorrect === oi ? '#fff' : 'var(--color-text-2)', flexShrink: 0 }}>{String.fromCharCode(65 + oi)}</div>
                                  <input value={opt} onChange={e => { const o = [...editOpts]; o[oi] = e.target.value; setEditOpts(o) }}
                                    style={{ flex: 1, padding: '10px 12px 10px 0', border: 'none', background: 'transparent', color: 'var(--color-text)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
                      <button onClick={() => setEditIdx(null)} style={{ padding: '10px 20px', borderRadius: 12, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Отмена</button>
                      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={commitEdit}
                        style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: accent, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'inherit' }}>
                        <Check size={15} strokeWidth={2.5} /> Сохранить вопрос
                      </motion.button>
                    </div>
                  </GlassCard>
                </motion.div>
              ) : (
                <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <GlassCard style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center' }}>
                    <div style={{ width: 64, height: 64, borderRadius: 20, background: soft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={30} style={{ color: accent }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text)', marginBottom: 6 }}>{title || 'Назови тест слева'}</div>
                      <div style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.6, maxWidth: 380 }}>
                        Введи название, выбери цвет — потом добавляй вопросы.<br />
                        Каждый вопрос: текст + 4 варианта + 1 правильный.
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>С чего начнём?</div>
                    <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 420 }}>
                      <button onClick={() => addQuestion('mc')}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '18px 14px', borderRadius: 16, border: `2px solid ${accent}55`, background: soft, color: 'var(--color-text)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', transition: 'all 0.14s' }}>
                        <FileText size={24} style={{ color: accent }} />
                        <span style={{ fontSize: 14, fontWeight: 700 }}>Обычный вопрос</span>
                        <span style={{ fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.4 }}>Текст + 4 варианта,<br />один правильный</span>
                      </button>
                      <button onClick={() => addQuestion('screening')}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '18px 14px', borderRadius: 16, border: `2px solid ${accent}55`, background: soft, color: 'var(--color-text)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', transition: 'all 0.14s' }}>
                        <Brain size={24} style={{ color: accent }} />
                        <span style={{ fontSize: 14, fontWeight: 700 }}>Скрининг-блок</span>
                        <span style={{ fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.4 }}>Авто-генерируемые<br />когнитивные задания</span>
                      </button>
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT: type selector + screening options */}
          <div style={{ padding: '0 24px 20px 0', flexShrink: 0, position: 'sticky', top: 110, alignSelf: 'flex-start' }}>
            <GlassCard style={{ width: 216, boxSizing: 'border-box', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Тип вопроса</div>
              {(['mc', 'screening'] as const).map(t => (
                <button key={t} onClick={() => editIdx !== null && setEditType(t)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 12, border: `2px solid ${editType === t && editIdx !== null ? accent : 'var(--color-border-medium)'}`, background: editType === t && editIdx !== null ? accent : 'var(--color-bg-2)', color: editType === t && editIdx !== null ? '#fff' : editIdx !== null ? 'var(--color-text-2)' : 'var(--color-muted)', fontWeight: 600, fontSize: 13, cursor: editIdx !== null ? 'pointer' : 'default', fontFamily: 'inherit', transition: 'all 0.14s', textAlign: 'left' }}>
                  {t === 'mc' ? <><FileText size={14} style={{ flexShrink: 0 }} /> Текст / выбор</> : <><Brain size={14} style={{ flexShrink: 0 }} /> Скрининг-блок</>}
                </button>
              ))}
              {editType === 'screening' && editIdx !== null && (
                <>
                  <div style={{ borderTop: '1px solid var(--color-border-soft)', marginTop: 4, paddingTop: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Домен</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                      {(Object.keys(SCR_DOMAIN_META) as DomainKey[]).map(k => {
                        const DI = DOMAIN_ICONS[k]
                        const isSel = editScrDomain === k
                        return (
                          <button key={k} onClick={() => setEditScrDomain(k)}
                            style={{ padding: '8px 6px', borderRadius: 10, border: `2px solid ${isSel ? accent : 'var(--color-border-medium)'}`, background: isSel ? accent : 'var(--color-bg-2)', color: isSel ? '#fff' : 'var(--color-text-2)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                            <DI size={18} strokeWidth={2} />
                            <span style={{ fontSize: 9, fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}>{SCR_DOMAIN_META[k].short}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Кол-во: {editScrCount}</div>
                    <input type="range" min={1} max={20} value={editScrCount} onChange={e => setEditScrCount(Number(e.target.value))}
                      style={{ width: '100%', accentColor: accent }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--color-muted)', marginTop: 2 }}>
                      <span>1</span><span>10</span><span>20</span>
                    </div>
                  </div>
                  <div style={{ padding: 10, borderRadius: 10, background: accent + '18', border: `1px solid ${accent}40`, fontSize: 11, color: 'var(--color-text)', lineHeight: 1.5 }}>
                    {(() => { const DI = DOMAIN_ICONS[editScrDomain]; return <strong style={{ color: accent, display: 'inline-flex', alignItems: 'center', gap: 5 }}><DI size={12} strokeWidth={2.5} /> {SCR_DOMAIN_META[editScrDomain].short}</strong> })()}{' '}— {editScrCount} заданий будут вставлены в этом месте.
                  </div>
                </>
              )}
            </GlassCard>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Diagnostic Card ─────────────────────────────────────────────────────────
function DiagnosticCard({ subject, isSelected, onClick }: { subject: DiagSubject; isSelected: boolean; onClick: () => void }) {
  const { label, accent, soft } = getSubjectMeta(subject)
  const Icon = getSubjectIcon(subject)
  const [questions, setQuestions] = useState(() => loadDiagQuestions(subject))
  const [anonCount, setAnonCount] = useState(0)
  useEffect(() => { fetchDiagQuestions(subject).then(setQuestions) }, [subject])
  useEffect(() => {
    loadAnonResults().then(all => setAnonCount(all.filter(r => r.subject === subject).length))
  }, [subject])
  return (
    <ContentCard
      accentColor={accent} accentBg={accent + '14'}
      isSelected={isSelected} onClick={onClick}
      icon={<Icon size={17} strokeWidth={2} style={{ color: accent }} />}
      badge={<span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-purple-text,var(--color-accent))', background: 'var(--color-purple-soft)', borderRadius: 7, padding: '2px 8px' }}>Диагностика</span>}
      title={label}
      subtitle={subject === 'logic' ? `${loadScreeningConfig().order.length} доменов` : `${questions.length} вопросов`}
      footerLeft={<><Database size={13} strokeWidth={1.8} /><span>{anonCount > 0 ? `${anonCount} прошли тест` : 'Нет сдач'}</span></>}
      footerRight={<><Target size={11} strokeWidth={2} />{subject === 'logic' ? 'Скрининг' : 'Тест'}</>}
    />
  )
}

function CustomTestCard({ test, isSelected, onClick }: { test: CustomTest; isSelected: boolean; onClick: () => void }) {
  const { label, accent } = test
  const soft = accent + '22'
  const [qCount, setQCount] = useState(0)
  const [anonCount, setAnonCount] = useState(0)
  useEffect(() => { loadAnonResults().then(all => { setAnonCount(all.filter(r => r.subject === test.id).length); setQCount(loadDiagQuestions(test.id as DiagSubject).length) }) }, [test.id])
  return (
    <ContentCard
      accentColor={accent} accentBg={soft}
      isSelected={isSelected} onClick={onClick}
      icon={<FileText size={17} strokeWidth={2} style={{ color: accent }} />}
      badge={<span style={{ fontSize: 10, fontWeight: 700, color: accent, background: soft, borderRadius: 7, padding: '2px 8px' }}>Свой тест</span>}
      title={label}
      subtitle={qCount > 0 ? `${qCount} вопросов` : 'Нет вопросов'}
      footerLeft={<><Database size={13} strokeWidth={1.8} /><span>{anonCount > 0 ? `${anonCount} прошли тест` : 'Нет сдач'}</span></>}
      footerRight={<><Target size={11} strokeWidth={2} />Тест</>}
    />
  )
}

// ─── Diagnostic Selection Panel (right-side: buttons + results table) ────────
function DiagnosticSelectionPanel({ subject, onClose, onEditTest }: {
  subject: DiagSubject
  onClose: () => void
  onEditTest: () => void
}) {
  const { label, accent, soft } = getSubjectMeta(subject)
  const Icon = getSubjectIcon(subject)
  const [questions, setQuestions] = useState(() => loadDiagQuestions(subject))
  const [copied, setCopied] = useState(false)
  const [anonResults, setAnonResults] = useState<AnonDiagResult[]>([])
  const [pickerFor, setPickerFor] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const allStudents = useAllStudents()
  useEffect(() => { fetchDiagQuestions(subject).then(setQuestions) }, [subject])

  // Group questions by section
  const sections = useMemo(() => {
    const map: Record<string, DiagQuestion[]> = {}
    questions.forEach(q => {
      const s = q.section ?? 'Общее'
      if (!map[s]) map[s] = []
      map[s].push(q)
    })
    return Object.entries(map)
  }, [questions])

  async function refreshResults() {
    const all = await loadAnonResults()
    setAnonResults(all.filter(r => r.subject === subject))
  }
  useEffect(() => { refreshResults() }, [subject])

  function copyLink() {
    navigator.clipboard.writeText(`${BASE_URL}#/diagnostic?subject=${subject}`)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }
  async function handleLink(resultId: string, studentId: string) { await linkAnonResult(resultId, studentId); await refreshResults(); setPickerFor(null) }
  async function handleUnlink(resultId: string) { await unlinkAnonResult(resultId); await refreshResults() }
  async function handleDelete(resultId: string) { await deleteAnonResult(resultId); await refreshResults() }

  return (
    <>
      <AnimatePresence>
        {pickerFor && (
          <StudentPickerModal onPick={(sid) => handleLink(pickerFor, sid)} onClose={() => setPickerFor(null)} />
        )}
      </AnimatePresence>
      <motion.div
        initial={{ x: 380, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 380, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 30, mass: 0.9 }}
        style={{ position: 'absolute', top: 108, right: 24, bottom: 28, width: 360, zIndex: 10, borderRadius: 20, background: 'rgba(var(--glass-rgb), 0.97)', border: '1px solid var(--color-border)', boxShadow: '0 10px 34px rgba(0,0,0,0.10)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <PanelHeader title={label} accent={accent} accentBg={soft} Icon={Icon} onClose={onClose} />
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', overflowX: 'hidden', scrollbarGutter: 'stable', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={copyLink}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                padding: '11px 14px', borderRadius: 12, cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                background: copied ? 'var(--color-green-soft)' : soft,
                color: copied ? 'var(--color-green-text)' : accent,
                fontSize: 13, fontWeight: 700, transition: 'all 0.18s',
              }}
            >
              {copied ? <Check size={14} /> : <Link2 size={14} />}
              {copied ? 'Скопировано!' : 'Ссылка'}
            </button>
            <button
              onClick={onEditTest}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                padding: '11px 14px', borderRadius: 12, cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                background: 'var(--color-bg-3)',
                color: 'var(--color-text-2)',
                fontSize: 13, fontWeight: 700, transition: 'all 0.18s',
              }}
            >
              <Pencil size={14} /> Редактировать
            </button>
          </div>

          {/* Sections overview */}
          <div>
            <SectionHead>{sections.length} тем · {questions.length} вопросов</SectionHead>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {sections.map(([sectionName, qs]) => {
                const isExp = expandedSection === sectionName
                return (
                  <div key={sectionName} style={{ borderRadius: 12, border: `1px solid ${isExp ? accent : 'var(--color-border)'}`, overflow: 'hidden', transition: 'border-color 0.15s' }}>
                    <button
                      onClick={() => setExpandedSection(prev => prev === sectionName ? null : sectionName)}
                      style={{ width: '100%', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8, background: isExp ? `${accent}10` : 'var(--color-bg-2)', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                    >
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{qs.length}</div>
                      <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: isExp ? accent : 'var(--color-text)' }}>{sectionName}</div>
                      {isExp ? <ChevronUp size={13} style={{ color: accent, flexShrink: 0 }} /> : <ChevronDown size={13} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />}
                    </button>
                    {isExp && (
                      <div style={{ borderTop: `1px solid ${accent}22`, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                        {qs.map((q, i) => (
                          <div key={q.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <div style={{ width: 18, height: 18, borderRadius: 5, background: 'var(--color-bg-3)', color: 'var(--color-text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, flexShrink: 0, marginTop: 2 }}>{i + 1}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 11.5, color: 'var(--color-text)', fontWeight: 600, marginBottom: 2, lineHeight: 1.35 }}>{q.text}</div>
                              <div style={{ fontSize: 10.5, color: 'var(--color-muted)' }}>✓ {q.options[q.correct]}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Results */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Database size={13} style={{ color: accent }} />
              Результаты
              {anonResults.length > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: accent, background: soft, borderRadius: 6, padding: '1px 7px' }}>
                  {anonResults.length}
                </span>
              )}
              <button onClick={refreshResults} title="Обновить" style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: 999, border: 'none', cursor: 'pointer', background: 'var(--color-bg-3)', color: 'var(--color-muted)', fontSize: 10, fontWeight: 600 }}>↻</button>
            </div>
            {anonResults.length === 0 ? (
              <div style={{ padding: '24px 16px', borderRadius: 12, border: '1.5px dashed var(--color-border-medium)', textAlign: 'center', color: 'var(--color-muted)', fontSize: 12 }}>
                Ещё никто не прошёл тест
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {anonResults.map(r => (
                  <DiagnosticStudentCard
                    key={r.id} result={r} allStudents={allStudents}
                    onLink={() => setPickerFor(r.id)}
                    onUnlink={() => handleUnlink(r.id)}
                    onDelete={() => handleDelete(r.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  )
}

// ─── Diagnostic Editor Panel (questions editor) ───────────────────────────────
function DiagnosticEditorPanel({ subject, onClose }: { subject: DiagSubject; onClose: () => void }) {
  const { label, accent, soft } = SUBJECT_META[subject]
  const Icon = SUBJECT_ICON_MAP[subject]

  const [questions, setQuestions] = useState<DiagQuestion[]>(() => loadDiagQuestions(subject))
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [editOpts, setEditOpts] = useState<string[]>([])
  const [editCorrect, setEditCorrect] = useState(0)
  useEffect(() => { fetchDiagQuestions(subject).then(setQuestions) }, [subject])

  function save(qs: DiagQuestion[]) { setQuestions(qs); saveDiagQuestions(subject, qs) }
  function startEdit(idx: number) { const q = questions[idx]; setEditIdx(idx); setEditText(q.text); setEditOpts([...q.options]); setEditCorrect(q.correct) }
  function commitEdit() {
    if (editIdx === null) return
    save(questions.map((q, i) => i === editIdx ? { ...q, text: editText, options: editOpts, correct: editCorrect } : q))
    setEditIdx(null)
  }
  function removeQuestion(idx: number) { save(questions.filter((_, i) => i !== idx)); if (editIdx === idx) setEditIdx(null) }
  function resetToDefault() { save(DEFAULT_QUESTIONS[subject]); setEditIdx(null) }

  return (
    <motion.div
      initial={{ x: 380, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 380, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 30, mass: 0.9 }}
      style={{ position: 'absolute', top: 108, right: 24, bottom: 28, width: 360, zIndex: 20, borderRadius: 20, background: 'rgba(var(--glass-rgb), 0.97)', border: '1px solid var(--color-border)', boxShadow: '0 10px 34px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <PanelHeader title={`Редактор: ${label}`} accent={accent} accentBg={soft} Icon={Icon} onClose={onClose} />
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', overflowX: 'hidden', scrollbarGutter: 'stable', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SectionHead>Вопросы ({questions.length})</SectionHead>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {questions.map((q, idx) => (
            <div key={q.id} style={{ borderRadius: 12, border: `1px solid ${editIdx === idx ? accent : 'var(--color-border)'}`, background: editIdx === idx ? `${accent}08` : 'var(--color-bg-2)', overflow: 'hidden' }}>
              {editIdx === idx ? (
                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={2}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--color-border-medium)', background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none' }} />
                  {editOpts.map((opt, oi) => (
                    <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button onClick={() => setEditCorrect(oi)}
                        style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, cursor: 'pointer', border: `2px solid ${editCorrect === oi ? accent : 'var(--color-border-medium)'}`, background: editCorrect === oi ? accent : 'transparent' }} />
                      <input value={opt} onChange={e => { const o = [...editOpts]; o[oi] = e.target.value; setEditOpts(o) }}
                        style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--color-border-medium)', background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button onClick={() => setEditIdx(null)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Отмена</button>
                    <button onClick={commitEdit} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: accent, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}><Check size={12} />Сохранить</button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, marginTop: 1 }}>{idx + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text)', marginBottom: 3 }}>{q.text}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>✓ {q.options[q.correct]}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => startEdit(idx)} style={{ padding: '4px 8px', borderRadius: 7, border: '1px solid var(--color-border)', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Ред.</button>
                    <button onClick={() => removeQuestion(idx)} style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: 'var(--color-red-soft)', color: 'var(--color-red-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={11} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
          <button onClick={resetToDefault} style={{ padding: '8px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Сбросить к стандарту
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function TeacherConstructorPage() {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const s = localStorage.getItem('constructor-active-tab') as Tab | null
    return (s && ['course','trainer','widget','testing'].includes(s)) ? s : 'course'
  })
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    localStorage.getItem('constructor-selected-id')
  )
  useEffect(() => { localStorage.setItem('constructor-active-tab', activeTab) }, [activeTab])
  useEffect(() => {
    if (selectedId) localStorage.setItem('constructor-selected-id', selectedId)
    else localStorage.removeItem('constructor-selected-id')
  }, [selectedId])
  const [diagEditing, setDiagEditing] = useState<string | null>(null)
  const [diagCreating, setDiagCreating] = useState(false)
  const [customTests, setCustomTests] = useState<CustomTest[]>(() => {
    const loaded = loadCustomTests()
    hydrateCustomMeta(loaded)
    return loaded
  })
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null)
  const [diagAnonResults, setDiagAnonResults] = useState<AnonDiagResult[]>([])
  const diagAllStudents = useAllStudents()
  const { groups: diagGroups } = useGroups()
  const [assignments, setAssignments] = useState<TestAssignment[]>([])
  const [assignModal, setAssignModal] = useState<{ subject: string; title: string } | null>(null)
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null)
  const [assignmentResults, setAssignmentResults] = useState<AnonDiagResult[]>([])

  useEffect(() => {
    if (activeTab === 'testing') {
      loadAnonResults().then(setDiagAnonResults)
      loadTestAssignments().then(setAssignments)
    }
  }, [activeTab])

  useEffect(() => {
    if (selectedAssignmentId) {
      loadAssignmentResults(selectedAssignmentId).then(setAssignmentResults)
    } else {
      setAssignmentResults([])
    }
  }, [selectedAssignmentId])
  const [creatorMode, setCreatorMode] = useState<Exclude<Tab, 'testing' | 'bank'> | null>(null)
  const [editCourse, setEditCourse] = useState<Course | null>(null)
  const [editTrainer, setEditTrainer] = useState<Trainer | null>(null)
  const [editWidget, setEditWidget] = useState<Widget | null>(null)
  const [selectedTrainerId, setSelectedTrainerId] = useState<string | null>(null)
  const [courses, setCourses] = useState<Course[]>(_cachedCourses ?? [])
  const [trainers, setTrainers] = useState<Trainer[]>(_cachedTrainers ?? [])
  const [widgets, setWidgets] = useState<Widget[]>(_cachedWidgets ?? [])
  const [dbLoading, setDbLoading] = useState(_cachedCourses === null)
  const [editMode, setEditMode] = useState(false)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function loadAll() {
      const [{ data: cData }, { data: tData }, { data: wData }] = await Promise.all([
        supabase.from('courses').select('*, lessons(*)').order('created_at'),
        supabase.from('trainers').select('*').order('created_at'),
        supabase.from('widgets').select('*').order('created_at'),
      ])
      const c = cData ? cData.map(dbCourseToLocal) : []
      const t = tData ? tData.map(dbTrainerToLocal) : []
      const w = wData ? wData.map(dbWidgetToLocal) : []
      _cachedCourses = c; _cachedTrainers = t; _cachedWidgets = w
      setCourses(prev => {
        const dbIds = new Set(c.map((x: Course) => x.id))
        const localOnly = prev.filter(x => !dbIds.has(x.id))
        return [...localOnly, ...c]
      })
      setTrainers(t); setWidgets(w)
      setDbLoading(false)
    }
    loadAll()
  }, [])

  // Enrolled students per course (subject = course.dbCourseId in lesson_progress).
  const [enrollmentByCourse, setEnrollmentByCourse] = useState<Record<string, { id: string; name: string }[]>>({})
  useEffect(() => {
    if (!courses.length || !diagAllStudents.length) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase.from('lesson_progress').select('student_id, subject')
      if (!data || cancelled) return
      const bySubject: Record<string, Set<string>> = {}
      for (const r of data as Array<{ student_id: string; subject: string | null }>) {
        if (!r.subject) continue
        ;(bySubject[r.subject] ??= new Set()).add(r.student_id)
      }
      const nameById = new Map(diagAllStudents.map(s => [s.id, s.name]))
      const map: Record<string, { id: string; name: string }[]> = {}
      for (const c of courses) {
        const dbId = c.dbCourseId ?? AP_DB_COURSE_BY_CONSTRUCTOR_ID[c.id]
        const ids = dbId ? bySubject[dbId] : undefined
        if (!ids) continue
        map[c.id] = [...ids].filter(id => nameById.has(id)).map(id => ({ id, name: nameById.get(id)! }))
      }
      if (!cancelled) setEnrollmentByCourse(map)
    })()
    return () => { cancelled = true }
  }, [courses, diagAllStudents.length])

  // People with access per course — group_ids expanded to members + direct
  // student_ids, deduped. This is "кому дан доступ" (видимость курса).
  const accessByCourse = useMemo(() => {
    const map: Record<string, { id: string; name: string }[]> = {}
    for (const c of courses) {
      const groupIds = c.groupIds ?? []
      const studentIds = c.studentIds ?? []
      if (!groupIds.length && !studentIds.length) continue
      const ids = new Set<string>(studentIds)
      for (const s of diagAllStudents) if (s.groupId && groupIds.includes(s.groupId)) ids.add(s.id)
      const people = diagAllStudents.filter(s => ids.has(s.id)).map(s => ({ id: s.id, name: s.name }))
      if (people.length) map[c.id] = people
    }
    return map
  }, [courses, diagAllStudents])

  useEffect(() => { _cachedCourses = courses }, [courses])
  useEffect(() => { _cachedTrainers = trainers }, [trainers])
  useEffect(() => { _cachedWidgets = widgets }, [widgets])

  const [bankFilters, setBankFilters] = useState<TrainerFilters>(emptyTrainerFilters)
  const [widgetFilters, setWidgetFilters] = useState<WidgetFilters>(emptyWidgetFilters)
  const filteredWidgets = useMemo(() => {
    let ws = widgets
    if (widgetFilters.search) ws = ws.filter(w => w.title.toLowerCase().includes(widgetFilters.search.toLowerCase()))
    if (widgetFilters.type) ws = ws.filter(w => w.type === widgetFilters.type)
    if (widgetFilters.linked === 'linked') ws = ws.filter(w => !!w.linkedTrainerId)
    if (widgetFilters.linked === 'unlinked') ws = ws.filter(w => !w.linkedTrainerId)
    const sorted = [...ws]
    if (widgetFilters.sort === 'newest') return [...sorted].reverse()
    if (widgetFilters.sort === 'az') return [...sorted].sort((a, b) => a.title.localeCompare(b.title, 'ru'))
    if (widgetFilters.sort === 'items') return [...sorted].sort((a, b) => b.items.length - a.items.length)
    return sorted
  }, [widgets, widgetFilters])
  const [courseSort, setCourseSort] = useState<CourseSortMode>('newest')
  const [courseStatus, setCourseStatus] = useState<'' | CourseStatus>('')
  const filteredCourses = useMemo(() => {
    let cs = courses
    if (courseStatus) cs = cs.filter(c => c.status === courseStatus)
    const sorted = [...cs]
    if (courseSort === 'newest') return sorted.reverse()
    if (courseSort === 'az') return sorted.sort((a, b) => a.title.localeCompare(b.title, 'ru'))
    return sorted
  }, [courses, courseSort, courseStatus])
  const removeTask = useTaskBank(s => s.removeTask)
  const addBankTask = useTaskBank(s => s.addTask)
  const loadTasks = useTaskBank(s => s.load)
  useEffect(() => { loadTasks() }, [])

  // Open straight into a creator view when navigated here from the topbar "+" menu.
  const constructorIntent = useTeacher(s => s.constructorIntent)
  const clearConstructorIntent = useTeacher(s => s.clearConstructorIntent)
  useEffect(() => {
    if (!constructorIntent) return
    if (constructorIntent === 'course') {
      clearConstructorIntent()
      goToNewCourseEditor()
      return
    }
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

  // ── Course editor page navigation ──────────────────────────────────────────
  const openCourseEditor = useTeacher(s => s.openCourseEditor)
  const courseEditedJson = useTeacher(s => s.courseEditedJson)
  const setCourseEdited  = useTeacher(s => s.setCourseEdited)

  // When the user returns from the course editor, sync the updated data back.
  useEffect(() => {
    if (!courseEditedJson) return
    try {
      const ed = JSON.parse(courseEditedJson) as {
        id: string; title: string; subject: string; level: string
        status: 'draft' | 'published'; color: string; bg: string
        description?: string; dbCourseId?: string
        lessons: Array<{ id: string; title: string; number?: number; videoUrl?: string; description?: string }>
        modules: Array<{ id: string; label: string; lessonIds: string[] }>
        groupIds?: string[]; studentIds?: string[]
      }
      const updated: Course = {
        id: ed.id, title: ed.title, subject: ed.subject, level: ed.level,
        description: ed.description ?? '', status: ed.status,
        color: ed.color, bg: ed.bg, dbCourseId: ed.dbCourseId,
        lastEdited: new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
        lessons: ed.lessons.map(l => ({ id: l.id, title: l.title, trainerId: null, widgetId: null })),
        groupIds: ed.groupIds ?? [], studentIds: ed.studentIds ?? [],
      }
      setCourses(prev => prev.some(c => c.id === updated.id) ? prev.map(c => c.id === updated.id ? updated : c) : [updated, ...prev])
    } catch {}
    setCourseEdited(null)
  }, [courseEditedJson])

  async function goToCourseEditor(course: Course) {
    let groupIds: string[] = []
    let studentIds: string[] = []
    let modules: Array<{ id: string; label: string; expanded: boolean; lessonIds: string[] }> = []
    let lessons: Array<Record<string, unknown>> = []

    if (course.dbCourseId) {
      const { data: dbCourse } = await supabase
        .from('courses')
        .select('id, group_ids, student_ids, course_modules(id, label, position), lessons(short_id, title, lesson_number, position, module_id, youtube_url, description, kind, test_tasks, scheduled_date, scheduled_time, scheduled_duration, rec_date, rec_time, rec_duration, lesson_sched_manual)')
        .eq('short_id', course.dbCourseId)
        .single()
      if (dbCourse) {
        groupIds = (dbCourse as any).group_ids ?? []
        studentIds = (dbCourse as any).student_ids ?? []
        const dbModules = [...((dbCourse as any).course_modules ?? [])].sort((a, b) => a.position - b.position)
        const dbLessons = [...((dbCourse as any).lessons ?? [])].sort((a, b) => (a.lesson_number ?? a.position ?? 0) - (b.lesson_number ?? b.position ?? 0))
        lessons = dbLessons.map((l: any, i: number) => ({
          id: l.short_id,
          title: l.title,
          number: (l.lesson_number ?? i) + 1,
          kind: l.kind === 'test' ? 'test' : 'lesson',
          testTasks: Array.isArray(l.test_tasks) ? l.test_tasks : [],
          videoUrl: l.youtube_url ?? undefined,
          description: l.description ?? undefined,
          scheduledDate: l.scheduled_date ?? undefined,
          scheduledTime: l.scheduled_time ?? undefined,
          scheduledDuration: l.scheduled_duration ?? undefined,
          recDate: l.rec_date ?? undefined,
          recTime: l.rec_time ?? undefined,
          recDuration: l.rec_duration ?? undefined,
          lessonSchedManual: l.lesson_sched_manual ?? false,
        }))
        if (dbModules.length > 0) {
          modules = dbModules.map((m: any) => ({
            id: m.id, label: m.label, expanded: true,
            lessonIds: dbLessons.filter((l: any) => l.module_id === m.id).map((l: any) => l.short_id),
          }))
          const grouped = new Set(modules.flatMap(m => m.lessonIds))
          const ungrouped = dbLessons.filter((l: any) => !grouped.has(l.short_id)).map((l: any) => l.short_id)
          if (ungrouped.length) modules[0].lessonIds.push(...ungrouped)
        }
      }
    }

    // Fallbacks when the course isn't persisted to the DB yet.
    if (lessons.length === 0) {
      lessons = course.lessons.map((l, i) => ({ id: l.id, title: l.title, number: i + 1 }))
    }
    if (modules.length === 0) {
      modules = [{ id: uid(), label: 'Модуль 1', expanded: true, lessonIds: lessons.map(l => l.id as string) }]
    }

    const edData = {
      id: course.id, title: course.title, subject: course.subject, level: course.level,
      status: course.status, color: course.color, bg: course.bg,
      description: course.description ?? '', dbCourseId: course.dbCourseId,
      groupIds, studentIds, modules, lessons,
    }
    openCourseEditor(JSON.stringify(edData))
  }

  function goToNewCourseEditor() {
    const id = uid()
    const edData = {
      id, title: '', subject: 'Химия', level: 'ЕГЭ', status: 'draft',
      color: 'var(--color-purple)', bg: 'var(--color-purple-soft)',
      description: '', groupIds: [], studentIds: [],
      modules: [{ id: uid(), label: 'Модуль 1', expanded: true, lessonIds: [] }],
      lessons: [],
    }
    openCourseEditor(JSON.stringify(edData))
  }

  const selectedCourse  = courses.find(c => c.id === selectedId) ?? null
  const selectedWidget  = widgets.find(w => w.id === selectedId) ?? null
  // Side panel only for courses now; widgets open full-screen like trainers.
  const panelOpen = !!selectedCourse && activeTab === 'course'

  function openItem(id: string) { setSelectedId(prev => prev === id ? null : id) }
  function openDiagCard(subject: DiagSubject) {
    setDiagEditing(subject)
    setSelectedId(null)
    setSelectedResultId(null)
    loadAnonResults().then(setDiagAnonResults)
  }
  function closeEditor() { setSelectedId(null); setDiagEditing(null); setSelectedResultId(null) }

  function handleTabChange(t: Tab) {
    setActiveTab(t); setSelectedId(null); setDiagEditing(null); setDiagCreating(false); setSelectedResultId(null); setCreatorMode(null); setEditCourse(null); setEditTrainer(null); setEditWidget(null); setSelectedTrainerId(null)
    setEditMode(false); setCheckedIds(new Set())
    if (t === 'testing') loadAnonResults().then(setDiagAnonResults)
  }

  function handlePlus() {
    if (activeTab === 'bank') return // the bank tab manages taxonomy inline; nothing to create
    if (activeTab === 'testing') { setDiagCreating(true); return }
    if (activeTab === 'course') { goToNewCourseEditor(); return }
    setEditCourse(null); setEditTrainer(null); setEditWidget(null)
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

  async function deleteChecked() {
    if (activeTab === 'course') {
      const toDelete = courses.filter(c => checkedIds.has(c.id))
      setCourses(prev => prev.filter(c => !checkedIds.has(c.id)))
      await Promise.all(toDelete.map(c => {
        const shortId = c.dbCourseId ?? (isUUID(c.id) ? c.id : null)
        return shortId ? supabase.from('courses').delete().eq('short_id', shortId) : Promise.resolve()
      }))
    } else if (activeTab === 'trainer') {
      checkedIds.forEach(id => removeTask(Number(id)))
      const uuids = [...checkedIds].filter(id => isUUID(id))
      if (uuids.length) await supabase.from('trainers').delete().in('id', uuids)
    } else if (activeTab === 'testing') {
      setCustomTests(prev => prev.filter(ct => !checkedIds.has(ct.id)))
    } else {
      const toDelete = widgets.filter(w => checkedIds.has(w.id))
      setWidgets(prev => prev.filter(w => !checkedIds.has(w.id)))
      const uuids = toDelete.map(w => w.id).filter(id => isUUID(id))
      if (uuids.length) await supabase.from('widgets').delete().in('id', uuids)
    }
    setCheckedIds(new Set())
    setEditMode(false)
  }

  function duplicateChecked() {
    if (activeTab === 'course') {
      courses.filter(c => checkedIds.has(c.id)).forEach(c => duplicateCourse(c))
    } else if (activeTab === 'widget') {
      widgets.filter(w => checkedIds.has(w.id)).forEach(w => duplicateWidget(w))
    } else if (activeTab === 'trainer') {
      allTasks.filter(t => checkedIds.has(String(t.id))).forEach(t => {
        const { id: _drop, ...copy } = t as any
        addBankTask({ ...copy, text: copy.text ? `${copy.text} (копия)` : copy.text })
      })
    } else if (activeTab === 'testing') {
      customTests.filter(ct => checkedIds.has(ct.id)).forEach(ct => {
        const copy: typeof ct = { ...ct, id: uid(), label: `${ct.label} (копия)` }
        CUSTOM_META.set(copy.id, { label: copy.label, accent: copy.accent, soft: copy.accent + '22' })
        setCustomTests(prev => { const next = [...prev, copy]; persistCustomTests(next); return next })
      })
    }
    setCheckedIds(new Set())
  }

  // Trainer cards open straight into the full-screen bank-browser editor.
  function handleOpenTrainer(t: Trainer) {
    setEditTrainer(t)
    setCreatorMode('trainer')
    setSelectedId(null)
  }

  // Course card click — open the new 3-column course editor page.
  function handleExpandCourse(c: Course) {
    goToCourseEditor(c)
  }

  function handleSaveTrainer(t: Trainer) {
    setTrainers(prev => prev.some(x => x.id === t.id) ? prev.map(x => x.id === t.id ? t : x) : [t, ...prev])
    setCreatorMode(null)
    setEditTrainer(null)
    setActiveTab('trainer')
    setSelectedId(t.id)
    syncTrainerToDb(t)
  }

  function isUUID(s: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) }

  async function syncTrainerToDb(t: Trainer) {
    const row: any = {
      title: t.title, topic: t.topic, subject: t.subject ?? 'Химия',
      difficulty: t.difficulty, time_per_question: t.timePerQuestion,
      questions: t.questions, color: t.color, bg: t.bg,
    }
    if (isUUID(t.id)) row.id = t.id
    const { data, error } = await supabase.from('trainers').upsert(row, { onConflict: 'id' }).select('id').single()
    if (error) { console.error('[syncTrainerToDb]', error); return }
    if (data && data.id !== t.id) {
      setTrainers(prev => prev.map(x => x.id === t.id ? { ...x, id: data.id } : x))
    }
  }

  async function syncWidgetToDb(w: Widget) {
    const linkedUuid = w.linkedTrainerId && isUUID(w.linkedTrainerId) ? w.linkedTrainerId : null
    const row: any = {
      title: w.title, type: w.type, linked_trainer_id: linkedUuid,
      items: w.items, color: w.color, bg: w.bg,
    }
    if (isUUID(w.id)) row.id = w.id
    const { data, error } = await supabase.from('widgets').upsert(row, { onConflict: 'id' }).select('id').single()
    if (error) { console.error('[syncWidgetToDb]', error); return }
    if (data && data.id !== w.id) {
      setWidgets(prev => prev.map(x => x.id === w.id ? { ...x, id: data.id } : x))
    }
  }

  async function syncCourseToDb(c: Course) {
    const shortId = c.dbCourseId ?? c.id
    try {
      const { data: dbCourse, error } = await supabase
        .from('courses')
        .upsert(
          { short_id: shortId, title: c.title, subject: c.subject, level: c.level, description: c.description, status: c.status, color: c.color, bg: c.bg },
          { onConflict: 'short_id' }
        )
        .select('id, short_id')
        .single()
      if (error || !dbCourse) { console.error('[syncCourseToDb] course upsert failed', error); return }

      if (c.lessons.length > 0) {
        const { error: lessErr } = await supabase.from('lessons').upsert(
          c.lessons.map((l, i) => ({
            short_id: `${shortId}-${i}`,
            course_id: dbCourse.id,
            title: l.title,
            position: i,
            lesson_number: i,
          })),
          { onConflict: 'short_id' }
        )
        if (lessErr) console.error('[syncCourseToDb] lessons upsert failed', lessErr)
      }

      // Stamp dbCourseId on the local course so enrollment + lesson editor unlock
      setCourses(prev => prev.map(x => x.id === c.id ? { ...x, dbCourseId: shortId } : x))
      // If the editor is still open for this course, unlock it in-place
      setEditCourse(prev => prev?.id === c.id ? { ...prev, dbCourseId: shortId } : prev)
    } catch (e) {
      console.error('[syncCourseToDb] unexpected error', e)
    }
  }

  function handleSaveCourse(c: Course) {
    // Upsert: update in place when editing an existing course, else prepend.
    setCourses(prev => prev.some(x => x.id === c.id) ? prev.map(x => x.id === c.id ? c : x) : [c, ...prev])
    setCreatorMode(null)
    setEditCourse(null)
    setActiveTab('course')
    setSelectedId(null)
    syncCourseToDb(c)
  }

  function handleOpenWidget(w: Widget) {
    setEditWidget(w)
    setCreatorMode('widget')
    setSelectedId(null)
  }

  function handleSaveWidget(w: Widget) {
    setWidgets(prev => prev.some(x => x.id === w.id) ? prev.map(x => x.id === w.id ? w : x) : [w, ...prev])
    setCreatorMode(null)
    setEditWidget(null)
    setActiveTab('widget')
    setSelectedId(w.id)
    syncWidgetToDb(w)
  }

  const stamp = () => new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })

  // Per-card actions: duplicate clones with fresh ids + "(копия)" as a draft;
  // delete confirms first (irreversible).
  function duplicateCourse(c: Course) {
    const copy: Course = { ...c, id: uid(), title: `${c.title} (копия)`, status: 'draft', lessons: c.lessons.map(l => ({ ...l, id: uid() })), lastEdited: stamp() }
    setCourses(prev => [copy, ...prev])
  }
  async function deleteCourse(c: Course) {
    if (!window.confirm(`Удалить курс «${c.title}»? Это действие необратимо.`)) return
    setCourses(prev => prev.filter(x => x.id !== c.id))
    if (selectedId === c.id) setSelectedId(null)
    const shortId = c.dbCourseId ?? (isUUID(c.id) ? c.id : null)
    if (shortId) await supabase.from('courses').delete().eq('short_id', shortId)
  }
  function duplicateWidget(w: Widget) {
    const copy: Widget = { ...w, id: uid(), title: `${w.title} (копия)`, items: w.items.map(it => ({ ...it, id: uid() })), lastEdited: stamp() }
    setWidgets(prev => [copy, ...prev])
  }
  async function deleteWidget(w: Widget) {
    if (!window.confirm(`Удалить виджет «${w.title}»?`)) return
    setWidgets(prev => prev.filter(x => x.id !== w.id))
    if (selectedId === w.id) setSelectedId(null)
    if (isUUID(w.id)) await supabase.from('widgets').delete().eq('id', w.id)
  }

  const tabCfg = {
    course:   { label: 'Курс',        Icon: BookOpen, color: 'var(--color-accent)',         bg: 'var(--color-purple-soft)' },
    trainer:  { label: 'Тренажёр',    Icon: Zap,      color: 'var(--color-accent)',         bg: 'var(--color-purple-soft)' },
    widget:   { label: 'Виджет',      Icon: Layers,   color: 'var(--color-blue-pill-text)', bg: 'var(--color-blue-pill-bg)' },
    testing:  { label: 'Тестирование', Icon: Target,  color: 'var(--color-teal-pill-text,#0d9488)', bg: 'var(--color-teal-pill-bg,rgba(13,148,136,0.12))' },
    bank:     { label: 'Банк заданий', Icon: Database, color: 'var(--color-accent)',         bg: 'var(--color-purple-soft)' },
  }

  return (
    // overflow:visible + marginTop:-100 so both sub-views can lift content under the topbar blur.
    <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'visible', marginTop: -100 }}>
      <AnimatePresence mode="wait">
        {creatorMode ? (
          <CreatorView
            key={editCourse ? `edit-${editCourse.id}` : editTrainer ? `edit-tr-${editTrainer.id}` : editingTask ? `edit-task-${editingTask.id}` : editWidget ? `edit-w-${editWidget.id}` : 'creator'}
            initialMode={creatorMode}
            editCourse={editCourse}
            editTrainer={editTrainer}
            editingTask={editingTask}
            editWidget={editWidget}
            trainers={trainers}
            widgets={widgets}
            onSaveTrainer={handleSaveTrainer}
            onSaveCourse={handleSaveCourse}
            onSaveWidget={handleSaveWidget}
            onCancel={() => { setCreatorMode(null); setEditCourse(null); setEditTrainer(null); setEditingTask(null); setEditWidget(null) }}
          />
        ) : diagCreating ? (
          <DiagnosticTestCreator
            onSave={(id, label, accent) => {
              const newTest: CustomTest = { id, label, accent }
              CUSTOM_META.set(id, { label, accent, soft: accent + '22' })
              setCustomTests(prev => {
                const next = [...prev, newTest]
                persistCustomTests(next)
                return next
              })
              setDiagCreating(false)
              setDiagEditing(id)
            }}
            onCancel={() => setDiagCreating(false)}
          />
        ) : diagEditing === 'logic' ? (
          <ScreeningEditorFullPage onClose={() => setDiagEditing(null)} />
        ) : diagEditing ? (
          <DiagnosticEditorFullPage
            key={`diag-editor-${diagEditing}`}
            subject={diagEditing as DiagSubject}
            onClose={() => setDiagEditing(null)}
            groups={diagGroups}
            allStudents={diagAllStudents}
            assignments={assignments}
            onAssign={async (a) => {
              const created = await createTestAssignment(a)
              if (created) setAssignments(prev => [created, ...prev])
            }}
            onDeleteAssignment={async id => {
              await deleteTestAssignment(id)
              setAssignments(prev => prev.filter(a => a.id !== id))
            }}
          />
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ flex: 1, display: 'flex', minWidth: 0, overflow: 'hidden', position: 'relative' }}
          >
            <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', scrollbarGutter: 'stable', padding: '100px 32px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', position: 'relative' }}>
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

                {(['course', 'trainer', 'widget', 'testing', 'bank'] as const).map(t => {
                  const cfg = tabCfg[t]
                  return <TabBtn key={t} tab={t} activeTab={activeTab} label={cfg.label} icon={cfg.Icon} color={cfg.color} bg={cfg.bg}
                    onClick={() => t === activeTab ? handlePlus() : handleTabChange(t)} onPlus={handlePlus} />
                })}

                {/* Action bar — inline, pushed right with auto margin, no layout shift */}
                <AnimatePresence>
                  {editMode && checkedIds.size > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.92 }}
                      transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                      style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}
                    >
                      {(activeTab !== 'testing' || customTests.some(ct => checkedIds.has(ct.id))) && (
                        <button
                          onClick={duplicateChecked}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 7,
                            padding: '10px 18px', borderRadius: 14, border: '1.5px solid var(--color-border-medium)', cursor: 'pointer',
                            background: 'rgba(var(--glass-rgb),0.9)', color: 'var(--color-text)', fontSize: 13, fontWeight: 700,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          } as React.CSSProperties}
                        >
                          <Copy size={14} strokeWidth={2.4} />
                          Дублировать {checkedIds.size}
                        </button>
                      )}
                      <button
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
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {activeTab === 'trainer' && (
                <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <TrainerBankBrowser
                      filters={bankFilters}
                      selectedIds={new Set([...checkedIds].map(Number).filter(n => !isNaN(n)))}
                      onToggleSelected={id => toggleCheck(String(id))}
                      onForkSelected={() => {}}
                      onDeleteTask={id => removeTask(id)}
                      showSelect={false}
                      compact={true}
                      editMode={editMode}
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
              {activeTab === 'bank' && <CurriculumManager />}
              {activeTab === 'widget' && (
                <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Controls bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <WidgetSortDropdown value={widgetFilters.sort} onChange={v => setWidgetFilters(prev => ({ ...prev, sort: v }))} />
                      <div style={{ display: 'flex', padding: 2, borderRadius: 9, background: 'var(--color-bg-3)', gap: 2 }}>
                        <button onClick={() => setWidgetFilters(prev => ({ ...prev, viewMode: 'cards', activeGroup: '' }))}
                          title="Карточками"
                          style={{ padding: '5px 8px', borderRadius: 7, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                            background: widgetFilters.viewMode === 'cards' ? 'var(--color-surface)' : 'transparent',
                            color: widgetFilters.viewMode === 'cards' ? 'var(--color-text)' : 'var(--color-text-3)',
                            boxShadow: widgetFilters.viewMode === 'cards' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.14s' }}>
                          <LayoutGrid size={13} />
                        </button>
                        <button onClick={() => setWidgetFilters(prev => ({ ...prev, viewMode: 'groups' }))}
                          title="Группами"
                          style={{ padding: '5px 8px', borderRadius: 7, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                            background: widgetFilters.viewMode === 'groups' ? 'var(--color-surface)' : 'transparent',
                            color: widgetFilters.viewMode === 'groups' ? 'var(--color-text)' : 'var(--color-text-3)',
                            boxShadow: widgetFilters.viewMode === 'groups' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.14s' }}>
                          <Layers size={13} />
                        </button>
                      </div>
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-3)' }}>{filteredWidgets.length} виджетов</span>
                    </div>

                    {/* Cards view */}
                    {widgetFilters.viewMode === 'cards' && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                        {filteredWidgets.map(w => (
                          <div key={w.id} style={{ position: 'relative' }}>
                            <WidgetCard widget={w} isSelected={false}
                              onClick={() => editMode ? toggleCheck(w.id) : handleOpenWidget(w)}
                              actions={undefined} />
                            {editMode && (
                              <>
                                <div onClick={() => toggleCheck(w.id)} style={{
                                  position: 'absolute', top: 12, left: 12, width: 22, height: 22, borderRadius: 7,
                                  border: checkedIds.has(w.id) ? '2px solid #c0303a' : '1.5px solid var(--color-border-medium)',
                                  background: checkedIds.has(w.id) ? '#c0303a' : 'var(--color-bg-5)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  cursor: 'pointer', transition: 'all 0.14s', zIndex: 5, boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
                                }}>
                                  {checkedIds.has(w.id) && <Check size={13} strokeWidth={3} style={{ color: '#fff' }} />}
                                </div>
                                <button onClick={e => { e.stopPropagation(); duplicateWidget(w) }} title="Дублировать"
                                  style={{ position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: 8, border: 'none',
                                    background: 'rgba(var(--glass-rgb), 0.92)', boxShadow: '0 1px 6px rgba(0,0,0,0.14)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 5, color: 'var(--color-muted)' }}>
                                  <Copy size={13} strokeWidth={2} />
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Groups view */}
                    {widgetFilters.viewMode === 'groups' && (
                      <WidgetGroupsView
                        widgets={filteredWidgets}
                        activeGroup={widgetFilters.activeGroup}
                        editMode={editMode}
                        checkedIds={checkedIds}
                        onToggleCheck={toggleCheck}
                        onOpenWidget={handleOpenWidget}
                        onDuplicateWidget={duplicateWidget}
                        onDeleteWidget={deleteWidget}
                      />
                    )}
                  </div>
                  <WidgetFilterPanel
                    filters={widgetFilters}
                    onChange={f => setWidgetFilters(prev => ({ ...prev, ...f }))}
                    total={filteredWidgets.length}
                  />
                </div>
              )}
              {dbLoading && (
                <div style={{ color: 'var(--color-text-3)', fontSize: 14, padding: '32px 0', textAlign: 'center' }}>Загрузка…</div>
              )}
              {activeTab === 'course' && !dbLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <CourseSortDropdown value={courseSort} onChange={setCourseSort} />
                  <CourseStatusFilter value={courseStatus} onChange={setCourseStatus} />
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-3)' }}>{filteredCourses.length} курсов</span>
                </div>
              )}
              <div
                style={{ display: (activeTab === 'trainer' || activeTab === 'widget' || activeTab === 'bank') ? 'none' : 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                {activeTab === 'course' && filteredCourses.map(c => (
                  <div key={c.id} style={{ position: 'relative' }}>
                    <CourseCard course={c} isSelected={false}
                      students={enrollmentByCourse[c.id]}
                      access={accessByCourse[c.id]}
                      onClick={() => editMode ? toggleCheck(c.id) : handleExpandCourse(c)}
                      actions={undefined} />
                    {editMode && (
                      <>
                        <div onClick={() => toggleCheck(c.id)} style={{
                          position: 'absolute', top: 12, left: 12, width: 22, height: 22, borderRadius: 7,
                          border: checkedIds.has(c.id) ? '2px solid #c0303a' : '1.5px solid var(--color-border-medium)',
                          background: checkedIds.has(c.id) ? '#c0303a' : 'var(--color-bg-5)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', transition: 'all 0.14s', zIndex: 5,
                          boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
                        }}>
                          {checkedIds.has(c.id) && <Check size={13} strokeWidth={3} style={{ color: '#fff' }} />}
                        </div>
                        <button onClick={e => { e.stopPropagation(); duplicateCourse(c) }} title="Дублировать"
                          style={{ position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: 8, border: 'none',
                            background: 'rgba(var(--glass-rgb), 0.92)', boxShadow: '0 1px 6px rgba(0,0,0,0.14)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 5, color: 'var(--color-muted)' }}>
                          <Copy size={13} strokeWidth={2} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
                {activeTab === 'testing' && DIAG_SUBJECTS.map(subject => (
                  <div key={subject} style={{ position: 'relative' }}>
                    <DiagnosticCard
                      subject={subject}
                      isSelected={selectedId === subject}
                      onClick={() => editMode ? toggleCheck(subject) : openDiagCard(subject)}
                    />
                    {editMode && (
                      <div onClick={() => toggleCheck(subject)} style={{
                        position: 'absolute', top: 12, left: 12, width: 22, height: 22, borderRadius: 7,
                        border: checkedIds.has(subject) ? '2px solid #c0303a' : '1.5px solid var(--color-border-medium)',
                        background: checkedIds.has(subject) ? '#c0303a' : 'var(--color-bg-5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'all 0.14s', zIndex: 5, boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
                      }}>
                        {checkedIds.has(subject) && <Check size={13} strokeWidth={3} style={{ color: '#fff' }} />}
                      </div>
                    )}
                  </div>
                ))}
                {activeTab === 'testing' && customTests.map(ct => (
                  <div key={ct.id} style={{ position: 'relative' }}>
                    <CustomTestCard
                      test={ct}
                      isSelected={selectedId === ct.id}
                      onClick={() => editMode ? toggleCheck(ct.id) : openDiagCard(ct.id as DiagSubject)}
                    />
                    {editMode && (
                      <div onClick={() => toggleCheck(ct.id)} style={{
                        position: 'absolute', top: 12, left: 12, width: 22, height: 22, borderRadius: 7,
                        border: checkedIds.has(ct.id) ? '2px solid #c0303a' : '1.5px solid var(--color-border-medium)',
                        background: checkedIds.has(ct.id) ? '#c0303a' : 'var(--color-bg-5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'all 0.14s', zIndex: 5, boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
                      }}>
                        {checkedIds.has(ct.id) && <Check size={13} strokeWidth={3} style={{ color: '#fff' }} />}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Inline results table — appears below cards on first click */}
              <AnimatePresence mode="wait">
                {activeTab === 'testing' && selectedId && (
                  <motion.div
                    key={`table-${selectedId}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, marginRight: selectedResultId ? 368 : 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <DiagResultsTable
                      subject={selectedId as DiagSubject}
                      results={diagAnonResults.filter(r => r.subject === selectedId)}
                      selectedResultId={selectedResultId}
                      onSelectResult={id => setSelectedResultId(prev => prev === id ? null : id)}
                      onOpenEditor={() => openDiagCard(selectedId as DiagSubject)}
                      onRefresh={() => loadAnonResults().then(setDiagAnonResults)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {activeTab === 'testing' && selectedResultId && (() => {
                const result = diagAnonResults.find(r => r.id === selectedResultId)
                return result ? (
                  <DiagResultStudentPanel
                    key={selectedResultId}
                    result={result}
                    allStudents={diagAllStudents}
                    onClose={() => setSelectedResultId(null)}
                    onRefresh={() => loadAnonResults().then(setDiagAnonResults)}
                  />
                ) : null
              })()}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}

// ─── Assign test modal ────────────────────────────────────────────────────────
function AssignTestModal({
  subject, title, groups, allStudents, onClose, onSave,
}: {
  subject: string; title: string
  groups: import('../../data/teacherMockData').Group[]
  allStudents: import('../../data/teacherMockData').Student[]
  onClose: () => void
  onSave: (a: Omit<TestAssignment, 'id' | 'createdAt'>) => void
}) {
  const [assignType, setAssignType] = useState<'test' | 'trial'>('test')
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set())
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)

  const toggleGroup = (id: string) => setSelectedGroupIds(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
  const toggleStudent = (id: string) => setSelectedStudentIds(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const canSave = selectedGroupIds.size > 0 || selectedStudentIds.size > 0

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    await onSave({
      title: `${title} · ${assignType === 'trial' ? 'Пробник' : 'Тест'}`,
      subject,
      assignType,
      groupIds: Array.from(selectedGroupIds),
      studentIds: Array.from(selectedStudentIds),
      dueDate: dueDate || undefined,
      closed: false,
    })
    setSaving(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 16 }}
        transition={{ type: 'spring', stiffness: 360, damping: 32 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 500, background: 'var(--color-bg-input)', borderRadius: 24, border: '1px solid var(--color-border-glass)', boxShadow: '0 32px 80px rgba(0,0,0,0.22)', overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--color-border-soft)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 750, color: 'var(--color-text)' }}>Назначить тест</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>{title}</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'var(--color-bg-5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Type */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>Тип</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['test', 'trial'] as const).map(t => (
                <button key={t} onClick={() => setAssignType(t)}
                  style={{ padding: '7px 16px', borderRadius: 10, border: `1.5px solid ${assignType === t ? 'var(--color-accent)' : 'var(--color-border-medium)'}`, background: assignType === t ? 'var(--color-purple-soft)' : 'transparent', color: assignType === t ? 'var(--color-accent)' : 'var(--color-text-3)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.13s' }}>
                  {t === 'test' ? 'Контрольная' : 'Пробник (ЕГЭ)'}
                </button>
              ))}
            </div>
          </div>

          {/* Groups */}
          {groups.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>Группы</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {groups.map(g => (
                  <button key={g.id} onClick={() => toggleGroup(g.id)}
                    style={{ padding: '5px 12px', borderRadius: 8, border: `1.5px solid ${selectedGroupIds.has(g.id) ? g.color : 'var(--color-border-soft)'}`, background: selectedGroupIds.has(g.id) ? g.color + '22' : 'transparent', color: selectedGroupIds.has(g.id) ? g.color : 'var(--color-text-3)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.13s' }}>
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Individual students */}
          {allStudents.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>Отдельные ученики</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 120, overflowY: 'auto' }}>
                {allStudents.map(s => (
                  <button key={s.id} onClick={() => toggleStudent(s.id)}
                    style={{ padding: '4px 10px', borderRadius: 8, border: `1.5px solid ${selectedStudentIds.has(s.id) ? 'var(--color-accent)' : 'var(--color-border-soft)'}`, background: selectedStudentIds.has(s.id) ? 'var(--color-purple-soft)' : 'transparent', color: selectedStudentIds.has(s.id) ? 'var(--color-accent)' : 'var(--color-text-3)', fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.13s' }}>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Due date */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>Дедлайн (необязательно)</div>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              style={{ padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--color-border-medium)', background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 13, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }} />
          </div>

          <button onClick={handleSave} disabled={!canSave || saving}
            style={{ padding: '12px', borderRadius: 12, border: 'none', background: canSave ? 'var(--color-purple-soft)' : 'var(--color-bg-5)', color: canSave ? 'var(--color-accent)' : 'var(--color-text-3)', fontSize: 14, fontWeight: 700, cursor: canSave ? 'pointer' : 'not-allowed', fontFamily: 'inherit', transition: 'all 0.13s' }}>
            {saving ? 'Сохраняем…' : 'Назначить тест'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Assignments panel ────────────────────────────────────────────────────────
function AssignmentsPanel({
  assignments, allStudents, groups, selectedId, results, onSelect, onDelete,
}: {
  assignments: TestAssignment[]
  allStudents: import('../../data/teacherMockData').Student[]
  groups: import('../../data/teacherMockData').Group[]
  selectedId: string | null
  results: AnonDiagResult[]
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <div style={{ padding: '24px 32px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Target size={14} style={{ color: 'var(--color-teal-pill-text, #0d9488)' }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-2)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Назначенные тесты</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-accent)', background: 'var(--color-purple-soft)', borderRadius: 7, padding: '1px 8px' }}>{assignments.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {assignments.map(a => {
          const assignedGroups = groups.filter(g => a.groupIds.includes(g.id))
          const assignedStudents = allStudents.filter(s => a.studentIds.includes(s.id))
          const isOpen = selectedId === a.id
          const doneCount = isOpen ? results.length : 0
          return (
            <div key={a.id}>
              <div
                onClick={() => onSelect(a.id)}
                style={{ padding: '12px 16px', borderRadius: 14, background: 'var(--color-bg-card)', border: `1.5px solid ${isOpen ? 'var(--color-accent)' : 'var(--color-border-soft)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'border-color 0.15s' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 3 }}>{a.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-3)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {assignedGroups.map(g => <span key={g.id} style={{ color: g.color }}>● {g.name}</span>)}
                    {assignedStudents.map(s => <span key={s.id}>{s.name}</span>)}
                    {a.dueDate && <span>до {a.dueDate}</span>}
                  </div>
                </div>
                <span style={{ padding: '3px 9px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: a.assignType === 'trial' ? 'rgba(245,166,35,0.12)' : 'var(--color-purple-soft)', color: a.assignType === 'trial' ? '#F5A623' : 'var(--color-purple-text)' }}>
                  {a.assignType === 'trial' ? 'Пробник' : 'Тест'}
                </span>
                <button onClick={e => { e.stopPropagation(); onDelete(a.id) }}
                  style={{ width: 26, height: 26, borderRadius: 8, border: 'none', background: 'var(--color-red-soft)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-red-text)', flexShrink: 0 }}>
                  <Trash2 size={12} />
                </button>
              </div>

              {/* Results for this assignment */}
              {isOpen && (
                <div style={{ margin: '8px 0 4px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {results.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--color-muted)', padding: '8px 12px' }}>Никто ещё не сдал</div>
                  ) : results.map(r => {
                    const pct = r.results ? Math.round(Object.values(r.results).reduce((a, s) => a + s.correct, 0) / Math.max(1, Object.values(r.results).reduce((a, s) => a + s.total, 0)) * 100) : 0
                    const col = pct >= 70 ? '#34C877' : pct >= 40 ? '#F5A623' : '#F48B91'
                    return (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: 'var(--color-bg)' }}>
                        <span style={{ fontSize: 12, color: 'var(--color-text)', flex: 1 }}>{r.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{new Date(r.timestamp).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: col, minWidth: 36, textAlign: 'right' }}>{pct}%</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
