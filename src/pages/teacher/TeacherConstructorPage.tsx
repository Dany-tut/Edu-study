import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, forwardRef, useImperativeHandle, type ReactNode } from 'react'
import Skeleton from '../../components/Skeleton'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Zap, Layers, Plus, Clock,
  GraduationCap, Brain, FileText, X, Check,
  Trash2, Link2, Database, Sparkles, ArrowUp, ArrowDown,
  CircleHelp, FlaskConical, Atom, Dna, Timer, Laugh,
  Image as ImageIcon, Key, ArrowLeft, Maximize2,
  ListChecks, Eye, EyeOff,
  CircleDot, Type as TypeIcon, Shuffle, ArrowUpDown, Table as TableIcon,
  AlignLeft, Pencil, ClipboardCopy, Target, ChevronDown, ChevronUp,
  CheckCircle, Circle, Globe, Copy, Search, LayoutGrid,
  Settings, TrendingUp, ArrowLeftRight, RotateCcw, Palette,
  ChevronLeft, ChevronRight, Calendar, Users, UsersRound, Pipette,
  Calculator, Star, Lightbulb, Microscope, Music, Sigma,
  Lock,
} from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import RichConditionEditor, { parseSmartPaste } from '../../components/teacher/RichConditionEditor'
import TableEditor from '../../components/teacher/TableEditor'
import GrowTextarea, { growMinHeight } from '../../components/GrowTextarea'
import Checkbox from '../../components/Checkbox'
import ScrollFade from '../../components/ScrollFade'
import { typeVisual } from '../../data/taskTypeVisuals'
import { bankSubjectOptions, subjectIcon, getSubject, isLanguageSubject, SUBJECTS } from '../../lib/subjects'
import { taskTypesFor } from '../../data/taskTypes'
import { languageTaxonomy } from '../../data/languageTaxonomy'
import { levelOptions, matchesLevel, levelOptionsForSubject, usesLanguageLevels } from '../../lib/courseLevels'
import {
  loadDiagQuestions, fetchDiagQuestions, saveDiagQuestions,
  loadAnonResults, linkAnonResult, unlinkAnonResult, deleteAnonResult,
  createTestAssignment, loadTestAssignments, deleteTestAssignment, loadAssignmentResults,
  fetchCustomTestsMeta, saveCustomTestMeta, deleteCustomTestMeta, updateCustomTestAccent, updateCustomTestIcon, updateCustomTestChip,
  loadBuiltinChip, saveBuiltinChip, loadBuiltinLabel, saveBuiltinLabel,
  type DiagQuestion, type DiagSubject, type AnonDiagResult, type TestAssignment,
  type CustomTestMeta,
  DEFAULT_QUESTIONS,
} from '../../data/diagnosticData'
import { useAllStudents, useGroups, fetchSharedCourseIds, groupStudentsByPerson } from '../../lib/useGroups'
import { getContrastColor, getCircleShadow, fillUnderWhite } from '../../lib/utils'
import { copyToClipboard } from '../../lib/clipboard'
import { supabase } from '../../lib/supabase'
import { getOwnerId } from '../../lib/owner'
import { useTeacherAccess } from '../../lib/teacherAccess'
import { optimizePhoto, ImageTooLargeError } from '../../lib/imageOptim'
import { usePersistentState, readDraft, writeDraft, clearDrafts } from '../../lib/useDraft'
import { AP_DB_COURSE_BY_CONSTRUCTOR_ID } from '../../data/apChemistry'
import { COURSE_SEEDS, seedTooltip, seedCourseId, type CourseSeed } from '../../data/courseSeeds'
import { AP_LESSON_CONTENT } from '../../data/apChemistryLessons'
import type { LessonContentData, LessonParagraph, HomeworkQuizQuestion, HomeworkTeacherTask } from '../../data/lessonContent'
import { paragraphsToTheory } from '../../lib/theoryImages'
import { parseLessonFiles } from '../../lib/lessonFiles'
import { useTeacher } from '../../store/teacherStore'
import { useTheme } from '../../store/themeStore'
import { useT, t } from '../../lib/i18n'
import { cardChip, cardChipTone } from '../../lib/pillStyles'
import { useTaskBank } from '../../store/taskBankStore'
import { TrainerBankBrowser, TrainerBankFilterPanel, emptyTrainerFilters, type TrainerFilters } from '../../components/teacher/TrainerBank'
import GoogleFormImportModal from '../../components/teacher/GoogleFormImportModal'
import { questionToBankTask, type ImportedQuestion } from '../../lib/googleFormsImport'
import CurriculumManager from '../../components/teacher/CurriculumManager'
import { useCourseLessons } from '../../lib/useCourseLessons'
import TeacherSelect from '../../components/teacher/TeacherSelect'
import { useTaskMeta, mergeOptions, sectionScope, topicScope, SOURCE_SCOPE } from '../../store/taskMetaStore'
import TeacherSaveButton, { teacherSaveStyle, SAVE_ACCENTS } from '../../components/teacher/TeacherSaveButton'
import {
  type AnswerType, type Task as BankTask, type TaskChoice, type Subject,
  BIOLOGY_SECTIONS, CHEMISTRY_SECTIONS,
  BIOLOGY_TOPICS, CHEMISTRY_TOPICS, SOURCES,
  CHEMISTRY_LINES, BIOLOGY_LINES,
  sectionsForSubject, topicsForSelection, linesForSelection,
} from '../../data/taskBankData'
import { AP_CHEM_COURSES, AP_CHEM_TRAINERS, AP_CHEM_WIDGETS, mergeById } from '../../data/apChemistry'
import {
  loadScreeningConfig, fetchScreeningConfig, saveScreeningConfig,
  DEFAULT_SCREENING_CONFIG, activeDomains,
  type ScreeningConfig, type DomainKey, type MatrixRuleKey, type SeriesType, type AnalogyItem, type MatchTask,
} from '../../data/screeningConfig'
import { DEFAULT_IMAGE_SIZE } from '../../data/taskTypes'

type NewBankTask = Omit<BankTask, 'id'>
const LETTERS = 'АБВГДЕЖЗИКЛМНОП'

// Палитра типов ответа справа от конструктора задания.
//
// Берётся из единого реестра (src/data/taskTypes.ts). Здесь был шестой по счёту
// рукописный список тех же типов, и он отставал сильнее всех: ни одного
// языкового типа, поэтому в банк заданий нельзя было добавить ни диктант, ни
// сборку предложения, ни запись голоса — только «химические» семь.
//
// Языковые типы показываются, когда выбран языковой предмет: химику они в
// палитре не нужны, а языковику без них банк бесполезен.
function answerTypesFor(subjectIsLanguage: boolean): { type: AnswerType; label: string; hint: string; Icon: React.ElementType }[] {
  return taskTypesFor({ language: subjectIsLanguage })
    // Доска рисуется на холсте и в банк заданий не кладётся.
    .filter(d => d.id !== 'whiteboard')
    .map(d => ({ type: d.id as AnswerType, label: t(d.label), hint: t(d.hint), Icon: d.Icon }))
}

// ─── Google Forms bulk import — categorize before writing to the bank ─────────
// The bank requires subject/section/topic/part/line on every task, none of
// which a Google Form carries — the teacher sets one set of values applied to
// every imported question (editable afterward per-task like any bank task).
function GoogleFormBankCategoryModal({
  questions, initialSubject, onClose, onConfirm,
}: {
  questions: ImportedQuestion[]
  initialSubject: Subject
  onClose: () => void
  onConfirm: (meta: { subject: Subject; section: string; topic: string; part: 1 | 2; line: number; source: string }) => Promise<void>
}) {
  const t = useT()
  const [subject, setSubject] = useState<Subject>(initialSubject)
  const [section, setSection] = useState('')
  const [topic, setTopic] = useState('')
  const [part, setPart] = useState<1 | 2>(1)
  const [line, setLine] = useState(1)
  const [source, setSource] = useState(SOURCES[SOURCES.length - 1])
  const [saving, setSaving] = useState(false)

  const sections = sectionsForSubject(subject)
  const topics = section ? topicsForSelection(subject, [section]) : []
  const lines = linesForSelection(subject, section ? [section] : [], [String(part)])

  async function handleConfirm() {
    setSaving(true)
    try {
      await onConfirm({ subject, section, topic, part, line, source })
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--color-bg-input)', borderRadius: 22, padding: '24px', width: 380, maxWidth: '92vw', boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>{t('Категория для')} {questions.length} {t('заданий')}</div>
        <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 16, lineHeight: 1.5 }}>
          {t('Применится ко всем импортируемым вопросам — потом можно поменять у каждого отдельно.')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <TeacherSelect value={subject} onChange={v => { setSubject(v as Subject); setSection(''); setTopic('') }} placeholder={t("Предмет")}
            options={bankSubjectOptions(false).map(o => ({ value: o.value, label: t(o.label) }))} />
          <TeacherSelect value={section} onChange={v => { setSection(v); setTopic('') }} placeholder={t("Раздел")}
            options={sections.map(s => ({ value: s, label: s }))} />
          <TeacherSelect value={topic} onChange={setTopic} placeholder={t("Тема")}
            options={topics.map(t => ({ value: t, label: t }))} />
          <div style={{ display: 'flex', gap: 8 }}>
            <TeacherSelect value={String(part)} onChange={v => setPart(Number(v) as 1 | 2)} placeholder={t("Часть")}
              options={[{ value: '1', label: t('Часть 1') }, { value: '2', label: t('Часть 2') }]} />
            <TeacherSelect value={String(line)} onChange={v => setLine(Number(v))} placeholder={t("Линия")}
              options={lines.map(l => ({ value: String(l), label: `№${l}` }))} />
          </div>
          <TeacherSelect value={source} onChange={setSource} placeholder={t("Источник")}
            options={SOURCES.map(s => ({ value: s, label: s }))} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button onClick={onClose} style={{ padding: '9px 16px', borderRadius: 12, border: '1.5px solid var(--color-border)', background: 'transparent', color: 'var(--color-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{t('Отмена')}</button>
          <button onClick={handleConfirm} disabled={saving}
            style={{ padding: '9px 18px', borderRadius: 12, border: 'none', cursor: saving ? 'default' : 'pointer', background: 'var(--color-accent)', color: '#fff', fontSize: 13, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
            {t('Импортировать')} {questions.length}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}

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
  /** Длительность урока в минутах. Не задана — считаем по умолчанию (90). */
  minutes?: number
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
  /** Course owned by another teacher, shared to this one — read-only here. */
  shared?: boolean
  /** ISO-время создания и последней публикации. По ним и строится порядок карточек
   *  («Новые»/«Старые»), чтобы правка курса не переставляла его в списке. */
  createdAt?: string
  publishedAt?: string
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
  /** ISO-время создания — порядок карточек считается по нему, а не по позиции
   *  в массиве состояния (сохранение переставляет элемент внутри массива). */
  createdAt?: string
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
  /** ISO-время создания — по нему строится порядок карточек «Новые»/«Старые».
   *  Статуса «Опубликован» у виджета нет, поднимать его нечему. */
  createdAt?: string
}

// ─── Task bank ────────────────────────────────────────────────────────────────
const TASK_BANK: BankQuestion[] = [
  { id: 'tb1',  topic: 'Органика',   difficulty: 'easy',   text: t('Гомологи метана — это?'),                      answer: t('Этан (C₂H₆), пропан (C₃H₈), бутан (C₄H₁₀)…')          },
  { id: 'tb2',  topic: 'Органика',   difficulty: 'medium', text: t('Реакция горения пропана'),                     answer: 'C₃H₈ + 5O₂ → 3CO₂ + 4H₂O'                            },
  { id: 'tb3',  topic: 'Органика',   difficulty: 'medium', text: t('Изомеры бутана'),                              answer: t('н-бутан и изобутан (метилпропан)')                       },
  { id: 'tb4',  topic: 'Органика',   difficulty: 'hard',   text: t('Бензол: особенности строения'),                answer: t('Цикл из 6 C, делокализованные π-электроны, ароматичность')},
  { id: 'tb5',  topic: 'Неорганика', difficulty: 'hard',   text: t('Гидролиз хлорида алюминия'),                  answer: 'AlCl₃ + 3H₂O ⇌ Al(OH)₃↓ + 3HCl'                      },
  { id: 'tb6',  topic: 'Неорганика', difficulty: 'medium', text: t('ОВР: как определить окислитель?'),             answer: t('Принимает электроны, степень окисления снижается')        },
  { id: 'tb7',  topic: 'Неорганика', difficulty: 'easy',   text: t('Сильные кислоты'),                            answer: 'HCl, H₂SO₄, HNO₃, HBr, HI, HClO₄'                    },
  { id: 'tb8',  topic: 'Неорганика', difficulty: 'medium', text: t('Электролитическая диссоциация NaCl'),          answer: t('NaCl → Na⁺ + Cl⁻ (полный электролит)')                  },
  { id: 'tb9',  topic: 'Общая',      difficulty: 'medium', text: t('Закон Менделеева–Клапейрона'),                answer: 'PV = νRT'                                               },
  { id: 'tb10', topic: 'Общая',      difficulty: 'hard',   text: t('Принцип Ле Шателье'),                         answer: t('Равновесие смещается, ослабляя внешнее воздействие')      },
  { id: 'tb11', topic: 'Биология',   difficulty: 'hard',   text: t('Световая фаза фотосинтеза'),                  answer: t('Тилакоиды; разложение H₂O, O₂, синтез АТФ и НАДФH')     },
  { id: 'tb12', topic: 'Биология',   difficulty: 'medium', text: t('Строение клеточной мембраны'),                answer: t('Двойной фосфолипидный слой с белками')                    },
  { id: 'tb13', topic: 'Биология',   difficulty: 'easy',   text: t('Функции митохондрий'),                        answer: t('Синтез АТФ, собственный геном, деление')                  },
  { id: 'tb14', topic: 'Биология',   difficulty: 'medium', text: t('Транспирация растений'),                      answer: t('Испарение воды листьями, движет восходящий ток')          },
]

const TOPICS = [...new Set(TASK_BANK.map(q => q.topic))]

// ─── Initial mock data (mutable via state) ────────────────────────────────────
const COURSES_INIT: Course[] = [
  {
    id: 'c1', title: t('ЕГЭ по Химии — Полный курс'), subject: 'Химия', level: 'ЕГЭ',
    description: t('Подготовка к ЕГЭ по химии с нуля до 90+ баллов'),
    color: 'var(--color-purple)', bg: 'var(--color-purple-soft)', status: 'published', lastEdited: '09.06',
    lessons: [
      { id: 'l1', title: t('Периодический закон'), trainerId: 't3', widgetId: 'w2' },
      { id: 'l2', title: t('Гидролиз солей'),      trainerId: 't1', widgetId: null  },
      { id: 'l3', title: t('Органические реакции'), trainerId: null, widgetId: 'w1' },
    ],
  },
  {
    id: 'c2', title: t('ОГЭ по Химии — Базовый'), subject: 'Химия', level: 'ОГЭ',
    description: t('Базовая подготовка к ОГЭ'),
    color: 'var(--color-purple)', bg: 'var(--color-purple-soft)', status: 'published', lastEdited: '07.06',
    lessons: [
      { id: 'l4', title: t('Кислоты и основания'), trainerId: 't5', widgetId: 'w2' },
      { id: 'l5', title: t('Соли и реакции'),      trainerId: null, widgetId: null  },
    ],
  },
  {
    id: 'c3', title: t('ЕГЭ по Биологии — 2025'), subject: 'Биология', level: 'ЕГЭ',
    description: t('Актуальная программа ЕГЭ 2025'),
    color: '#5FD68A', bg: 'var(--color-green-soft)', status: 'draft', lastEdited: '05.06',
    lessons: [
      { id: 'l6', title: t('Фотосинтез'), trainerId: 't4', widgetId: 'w1' },
    ],
  },
  {
    id: 'c4', title: t('Биохимия — Дополнительный'), subject: 'Биология', level: 'ЕГЭ',
    description: t('Углублённый модуль по биохимии'),
    color: '#3EC87A', bg: 'var(--color-green-soft)', status: 'draft', lastEdited: '01.06',
    lessons: [],
  },
]

const TRAINERS_INIT: Trainer[] = []

const WIDGETS_INIT: Widget[] = [
  {
    id: 'w1', title: t('Викторина: ЕГЭ Химия'), type: 'quiz',
    linkedTrainerId: 't1', color: 'var(--color-accent)', bg: 'var(--color-purple-soft)', lastEdited: '10.06',
    items: [
      { id: 'i1', question: t('Что происходит при гидролизе соли слабой кислоты?'), options: ['pH > 7', 'pH < 7', 'pH = 7', 'Реакция не идёт'], correct: 0 },
      { id: 'i2', question: t('Сильный электролит — это?'), options: ['Уксусная кислота', 'HCl', 'NH₃', 'Вода'], correct: 1 },
    ],
  },
  {
    id: 'w2', title: t('Факты: Строение атома'), type: 'facts',
    linkedTrainerId: null, color: '#1E9E63', bg: 'var(--color-green-soft)', lastEdited: '09.06',
    items: [
      { id: 'i3', factTitle: t('Ядро атома'), factText: t('Протоны (+) и нейтроны, несёт 99,9% массы атома') },
      { id: 'i4', factTitle: t('Электроны'), factText: t('Отрицательно заряженные частицы на орбиталях вокруг ядра') },
      { id: 'i5', factTitle: t('Орбитали'), factText: t('s, p, d, f — уровни энергии электронов') },
    ],
  },
  {
    id: 'w3', title: t('Реакции: Органическая химия'), type: 'reactions',
    linkedTrainerId: null, color: '#1F6FB8', bg: 'var(--color-blue-pill-bg)', lastEdited: '07.06',
    items: [
      { id: 'i6', emoji: '🔥', quote: t('Реакция горения — самая экзотермическая!'), lesson: t('Алканы') },
      { id: 'i7', emoji: '⚗️', quote: t('Полимеризация меняет всё вокруг нас'), lesson: t('Полимеры') },
    ],
  },
  {
    id: 'w4', title: t('Фокус: Подготовка к ЕГЭ'), type: 'pomodoro',
    linkedTrainerId: null, color: '#E0794B', bg: 'var(--color-peach-soft)', lastEdited: '05.06',
    items: [
      { id: 'i8', focusMin: 25, breakMin: 5 },
    ],
  },
]

// ─── Constants ────────────────────────────────────────────────────────────────
const WTYPE_LABEL: Record<WidgetType, string> = { quiz: t('Викторина'), facts: t('Научные факты'), reactions: t('Реакции'), pomodoro: t('Фокус'), memes: t('Мемы'), qod: t('Вопрос дня') }
const WTYPE_ICON:  Record<WidgetType, React.ElementType> = { quiz: CircleHelp, facts: FlaskConical, reactions: Atom, pomodoro: Timer, memes: Laugh, qod: Sparkles }
const WTYPE_COLOR: Record<WidgetType, string> = { quiz: 'var(--color-accent)', facts: 'var(--color-green-text)', reactions: 'var(--color-blue-pill-text)', pomodoro: 'var(--color-peach-text)', memes: 'var(--color-accent)', qod: 'var(--color-teal-pill-text)' }
const WTYPE_BG:    Record<WidgetType, string> = { quiz: 'var(--color-purple-soft)', facts: 'var(--color-green-soft)', reactions: 'var(--color-blue-pill-bg)', pomodoro: 'var(--color-peach-soft)', memes: 'var(--color-purple-soft)', qod: 'var(--color-teal-pill-bg)' }
const STATUS_LABEL: Record<CourseStatus, string> = { published: t('Опубликован'), draft: t('Черновик') }
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
function dbCourseToLocal(c: any, uid?: string | null): Course {
  const lessons = (c.lessons ?? [])
    .sort((a: any, b: any) => a.lesson_number - b.lesson_number)
    .map((l: any) => ({
      id: l.short_id ?? l.id, title: l.title, trainerId: l.trainer_id ?? null, widgetId: l.widget_id ?? null,
      minutes: l.scheduled_duration ?? l.rec_duration ?? undefined,
    }))
  return {
    id: c.short_id, title: c.title, subject: c.subject ?? 'Химия', level: c.level ?? 'ЕГЭ',
    description: c.description ?? '', color: c.color ?? 'var(--color-purple)', bg: c.bg ?? 'var(--color-purple-soft)',
    status: (c.status as CourseStatus) ?? 'draft', lastEdited: fmtDate(c.updated_at ?? c.created_at),
    dbCourseId: c.short_id, lessons,
    groupIds: c.group_ids ?? [], studentIds: c.student_ids ?? [],
    shared: uid != null && c.created_by != null && c.created_by !== uid,
    createdAt: c.created_at ?? undefined, publishedAt: c.published_at ?? undefined,
  }
}
function dbTrainerToLocal(t: any): Trainer {
  return {
    id: t.id, title: t.title, topic: t.topic ?? '', difficulty: (t.difficulty as Difficulty) ?? 'medium',
    timePerQuestion: t.time_per_question ?? 30, questions: t.questions ?? [],
    subject: t.subject, color: t.color ?? 'var(--color-purple)', bg: t.bg ?? 'var(--color-purple-soft)',
    lastEdited: fmtDate(t.updated_at ?? t.created_at),
    createdAt: t.created_at ?? undefined,
  }
}
function dbWidgetToLocal(w: any): Widget {
  return {
    id: w.id, title: w.title, type: w.type as WidgetType,
    linkedTrainerId: w.linked_trainer_id ?? null, items: w.items ?? [],
    color: w.color ?? 'var(--color-purple)', bg: w.bg ?? 'var(--color-purple-soft)',
    lastEdited: fmtDate(w.updated_at ?? w.created_at),
    createdAt: w.created_at ?? undefined,
  }
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
const inputSt: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '9px 12px',
  borderRadius: 11, border: 'none',
  fontSize: 13, color: 'var(--color-text)', background: 'var(--color-bg-input)',
  outline: 'none', fontFamily: 'inherit',
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>{children}</div>
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
  return <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>{children}</div>
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
  const t = useT()
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
          <button onClick={onExpand} title={t("Раскрыть на всю")} style={{ height: 26, padding: '0 10px', borderRadius: 999, border: 'none', cursor: 'pointer', background: accentBg, display: 'flex', alignItems: 'center', gap: 5, color: accent, fontSize: 11.5, fontWeight: 700, fontFamily: 'inherit' }}>
            <Maximize2 size={12} strokeWidth={2.4} /> {t('Раскрыть')}
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
  const t = useT()
  const a = (accent === '#8B4900' || accent === 'var(--color-peach-text)') ? SAVE_ACCENTS.trainer
    : (accent === '#1a7a3f' || accent === 'var(--color-green-text)') ? SAVE_ACCENTS.widget
    : SAVE_ACCENTS.purple
  return <TeacherSaveButton label={t("Сохранить")} accent={a} fullWidth onClick={onClick} />
}

function uid() { return Math.random().toString(36).slice(2, 8) }

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
  const t = useT()
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
      <PanelHeader title={t("Редактор курса")} accent="var(--color-accent)" accentBg="var(--color-purple-soft)" Icon={BookOpen} onClose={onClose} onExpand={onExpand} />

      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', overflowX: 'hidden', scrollbarGutter: 'stable', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Title */}
        <div><Label>{t('Название')}</Label>
          <input value={title} onChange={e => setTitle(e.target.value)} style={inputSt} />
        </div>

        {/* Subject + Level */}
        <div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['Химия', 'Биология'] as const).map(s => (
              <SegBtn key={s} label={t(s)} active={subject === s} color="var(--color-purple-text)" bg="var(--color-purple-soft)" onClick={() => setSubject(s)} />
            ))}
          </div>
        </div>
        <div>
          <TeacherSelect value={level} onChange={setLevel} placeholder={t("Уровень")} options={['ЕГЭ', 'ОГЭ', 'AP', 'Углублённый', 'Интенсив']} />
        </div>

        {/* Description */}
        <div><Label>{t('Описание')}</Label>
          <textarea ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }} value={description} onChange={e => { setDescription(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
            style={{ ...inputSt, resize: 'none', minHeight: 56, overflow: 'hidden' }} />
        </div>

        {/* Status */}
        <div><Label>{t('Статус')}</Label>
          <div style={{ display: 'flex', gap: 6 }}>
            <SegBtn label={t("Черновик")}    active={status === 'draft'}     color="var(--color-peach-text)" bg="var(--color-peach-soft)" onClick={() => setStatus('draft')} />
            <SegBtn label={t("Опубликован")} active={status === 'published'} color="var(--color-green-text)" bg="var(--color-green-soft)" onClick={() => setStatus('published')} />
          </div>
        </div>

        {/* Lessons */}
        <div>
          <SectionHead>{t('Уроки (')}{lessons.length})</SectionHead>
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
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 2 }}>{t('ТРЕНАЖЁР')}</div>
                    <TeacherSelect small value={lesson.trainerId ?? ''} onChange={v => setLessonLink(lesson.id, 'trainerId', v || null)}
                      triggerStyle={{ padding: '4px 7px', fontSize: 11 }}
                      placeholder={t("Тренажёр")}
                      options={trainers.map(t => ({ value: t.id, label: t.title.slice(0, 22) }))} />
                  </div>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 2 }}>{t('ВИДЖЕТ')}</div>
                    <TeacherSelect small value={lesson.widgetId ?? ''} onChange={v => setLessonLink(lesson.id, 'widgetId', v || null)}
                      triggerStyle={{ padding: '4px 7px', fontSize: 11 }}
                      placeholder={t("Виджет")}
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
              <Check size={14} strokeWidth={2.5} /> {t('Изменения сохранены')}
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
  const t = useT()
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
      <PanelHeader title={t("Редактор тренажёра")} accent="#8B4900" accentBg="var(--color-peach-soft)" Icon={Zap} onClose={onClose} />

      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', overflowX: 'hidden', scrollbarGutter: 'stable', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Title + topic */}
        <div><Label>{t('Название')}</Label><input value={title} onChange={e => setTitle(e.target.value)} style={inputSt} /></div>
        <div>
          <TeacherSelect value={topic} onChange={setTopic} placeholder={t("Тема")} options={[...TOPICS, 'Смешанный']} />
        </div>

        {/* Time */}
        <div><Label>{t('Минут / вопрос')}</Label>
          <input type="number" min={1} max={10} value={timePerQ} onChange={e => setTimePerQ(Number(e.target.value))} style={inputSt} />
        </div>

        {/* Source */}
        <div><Label>{t('Источник вопросов')}</Label>
          <div style={{ display: 'flex', gap: 6 }}>
            <SegBtn label={t("Из банка заданий")} active={source === 'bank'}   color="var(--color-accent)" bg="var(--color-purple-soft)" onClick={() => setSource('bank')} />
            <SegBtn label={t("Вручную")}          active={source === 'manual'} color="var(--color-peach-text)" bg="var(--color-peach-soft)" onClick={() => setSource('manual')} />
          </div>
        </div>

        {source === 'bank' && (
          <div style={{ background: 'var(--color-bg-2)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SectionHead>{t('Параметры банка')}</SectionHead>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 8 }}>
              <div>
                <TeacherSelect value={bankTopic} onChange={setBankTopic} placeholder={t("Тема банка")} options={TOPICS} />
              </div>
              <div><Label>{t('Кол-во')}</Label>
                <input type="number" min={1} max={TASK_BANK.filter(q => q.topic === bankTopic).length}
                  value={bankCount} onChange={e => setBankCount(Number(e.target.value))} style={inputSt} />
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
              {t('Доступно:')} {TASK_BANK.filter(q => q.topic === bankTopic).length} {t('вопросов')}
            </div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={loadFromBank}
              style={{ padding: '9px 0', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'var(--color-purple-soft)', color: 'var(--color-accent)', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Database size={13} strokeWidth={2} /> {t('Загрузить из банка')}
            </motion.button>
          </div>
        )}

        {source === 'manual' && (
          <div style={{ background: 'var(--color-bg-2)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SectionHead>{t('Добавить вопрос')}</SectionHead>
            <input value={manQ} onChange={e => setManQ(e.target.value)} placeholder={t("Текст вопроса…")} style={inputSt} />
            <input value={manA} onChange={e => setManA(e.target.value)} placeholder={t("Правильный ответ…")} style={inputSt} />
            <motion.button whileTap={{ scale: 0.97 }} onClick={addManual}
              style={{ padding: '8px 0', borderRadius: 11, border: 'none', cursor: 'pointer', background: 'var(--color-peach-soft)', color: 'var(--color-peach-text)', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <Plus size={13} /> {t('Добавить')}
            </motion.button>
          </div>
        )}

        {/* Questions list */}
        <div>
          <SectionHead>{t('Вопросы (')}{questions.length})</SectionHead>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {questions.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--color-text-3)', textAlign: 'center', padding: '12px 0' }}>
                {t('Нет вопросов — загрузите из банка или добавьте вручную')}
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
              <Check size={14} strokeWidth={2.5} /> {t('Сохранено')}
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
  const t = useT()
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
        options: [q.answer, t('Неверный ответ A'), t('Неверный ответ B'), t('Неверный ответ C')],
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
      <PanelHeader title={t("Редактор виджета")} accent="#1a7a3f" accentBg="var(--color-green-soft)" Icon={Layers} onClose={onClose} />

      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', overflowX: 'hidden', scrollbarGutter: 'stable', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div><Label>{t('Название')}</Label><input value={title} onChange={e => setTitle(e.target.value)} style={inputSt} /></div>

        {/* Type selector */}
        <div>
          <Label>{t('Тип виджета')}</Label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {(['quiz', 'facts', 'reactions', 'pomodoro', 'memes', 'qod'] as WidgetType[]).map(wt => {
              const WIcon = WTYPE_ICON[wt]
              const isActive = type === wt
              return (
                <button key={wt} onClick={() => setType(wt)} style={{
                  padding: '8px 10px', borderRadius: 11,
                  border: 'none',
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
            <SectionHead>{t('Автонаполнение из тренажёра')}</SectionHead>
            <TeacherSelect value={linkedId} onChange={setLinkedId} placeholder={t("Тренажёр")}
              accent="#1a7a3f" accentBg="var(--color-green-soft)"
              options={trainers.map(tr => ({ value: tr.id, label: (tr.title) + ' (' + (tr.questions.length) + t(' вопр.)') }))} />
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={autoPopulate} disabled={!linkedId}
              style={{
                padding: '9px 0', borderRadius: 12, border: 'none', cursor: linkedId ? 'pointer' : 'not-allowed',
                background: linkedId ? 'var(--color-green-soft)' : 'var(--color-bg)', color: linkedId ? 'var(--color-green-text)' : 'var(--color-text-3)',
                fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
              <Sparkles size={13} strokeWidth={2} />
              {t('Наполнить автоматически')}
            </motion.button>
          </div>
        )}

        {/* Manual content builder */}
        <div style={{ background: 'var(--color-bg-2)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionHead>
            {type === 'pomodoro' ? t('Настройки таймера') : t('Добавить вручную')}
          </SectionHead>

          {(type === 'quiz' || type === 'qod') && (
            <>
              <input
                value={qText}
                onChange={e => setQText(e.target.value)}
                placeholder={t("Вопрос…")}
                style={inputSt}
                onPaste={e => {
                  const text = e.clipboardData.getData('text/plain')
                  const parsed = parseSmartPaste(text)
                  if (parsed) {
                    e.preventDefault()
                    setQText(parsed.question)
                    setQOpts(parsed.options.length >= 4 ? parsed.options : [...parsed.options, ...Array(Math.max(0, 4 - parsed.options.length)).fill('')])
                    setQCorr(0)
                  }
                }}
              />
              {qOpts.map((opt, oi) => (
                <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button onClick={() => setQCorr(oi)} style={{
                    width: 20, height: 20, borderRadius: '50%', border: '2px solid', flexShrink: 0,
                    borderColor: qCorr === oi ? WTYPE_COLOR[type] : 'var(--color-text-4)',
                    background: qCorr === oi ? WTYPE_COLOR[type] : 'transparent', cursor: 'pointer',
                  }} />
                  <input value={opt} onChange={e => { const o = [...qOpts]; o[oi] = e.target.value; setQOpts(o) }}
                    placeholder={t('Вариант ') + (oi + 1) + '…'} style={{ ...inputSt, flex: 1 }} />
                </div>
              ))}
              <div style={{ fontSize: 10, color: 'var(--color-text-3)' }}>{t('● — правильный ответ')}</div>
              <motion.button whileTap={{ scale: 0.97 }} onClick={addQuiz}
                style={{ padding: '7px 0', borderRadius: 11, border: 'none', cursor: 'pointer', background: WTYPE_BG[type], color: WTYPE_COLOR[type], fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <Plus size={13} /> {t('Добавить вопрос')}
              </motion.button>
            </>
          )}

          {type === 'facts' && (
            <>
              <input value={fcTerm} onChange={e => setFcTerm(e.target.value)} placeholder={t("Заголовок факта…")} style={inputSt} />
              <textarea value={fcDef} onChange={e => setFcDef(e.target.value)} placeholder={t("Текст факта…")} rows={3}
                style={{ ...inputSt, resize: 'vertical' }} />
              <motion.button whileTap={{ scale: 0.97 }} onClick={addFlashcard}
                style={{ padding: '7px 0', borderRadius: 11, border: 'none', cursor: 'pointer', background: WTYPE_BG.facts, color: WTYPE_COLOR.facts, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <Plus size={13} /> {t('Добавить факт')}
              </motion.button>
            </>
          )}

          {type === 'reactions' && (
            <>
              <input value={fcTerm} onChange={e => setFcTerm(e.target.value)} placeholder={t("Эмодзи (напр. 🔥)…")} style={inputSt} />
              <input value={fcDef} onChange={e => setFcDef(e.target.value)} placeholder={t("Цитата / реплика…")} style={inputSt} />
              <input value={dLabel} onChange={e => setDLabel(e.target.value)} placeholder={t("Название урока / темы…")} style={inputSt} />
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => {
                if (!fcTerm.trim()) return
                setItems(prev => [...prev, { id: uid(), emoji: fcTerm.trim(), quote: fcDef.trim(), lesson: dLabel.trim() }])
                setFcTerm(''); setFcDef(''); setDLabel('')
              }}
                style={{ padding: '7px 0', borderRadius: 11, border: 'none', cursor: 'pointer', background: WTYPE_BG.reactions, color: WTYPE_COLOR.reactions, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <Plus size={13} /> {t('Добавить реакцию')}
              </motion.button>
            </>
          )}

          {type === 'pomodoro' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <Label>{t('Фокус (мин)')}</Label>
                  <input type="number" min={5} max={60} value={pomoFocus}
                    onChange={e => setPomoFocus(Number(e.target.value))} style={inputSt} />
                </div>
                <div>
                  <Label>{t('Перерыв (мин)')}</Label>
                  <input type="number" min={1} max={30} value={pomoBreak}
                    onChange={e => setPomoBreak(Number(e.target.value))} style={inputSt} />
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
                {t('Эти настройки будут применены к таймеру Фокус у студентов')}
              </div>
            </>
          )}

          {type === 'memes' && (
            <>
              <input value={fcTerm} onChange={e => setFcTerm(e.target.value)} placeholder={t("Эмодзи (напр. 😅)…")} style={inputSt} />
              <input value={fcDef} onChange={e => setFcDef(e.target.value)} placeholder={t("Название мема…")} style={inputSt} />
              <input value={dLabel} onChange={e => setDLabel(e.target.value)} placeholder={t("Подпись / шутка…")} style={inputSt} />
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => {
                if (!fcDef.trim()) return
                setItems(prev => [...prev, { id: uid(), memeEmoji: fcTerm.trim() || '😄', memeTitle: fcDef.trim(), memeCaption: dLabel.trim() }])
                setFcTerm(''); setFcDef(''); setDLabel('')
              }}
                style={{ padding: '7px 0', borderRadius: 11, border: 'none', cursor: 'pointer', background: WTYPE_BG.memes, color: WTYPE_COLOR.memes, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <Plus size={13} /> {t('Добавить мем')}
              </motion.button>
            </>
          )}
        </div>

        {/* Items preview */}
        {type !== 'pomodoro' && (
          <div>
            <SectionHead>{WTYPE_LABEL[type]}: {items.length} {t('элементов')}</SectionHead>
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
                  +{items.length - 6} {t('ещё')}
                </div>
              )}
              {items.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--color-text-3)', textAlign: 'center', padding: '10px 0' }}>
                  {t('Нет элементов — добавьте вручную или из тренажёра')}
                </div>
              )}
            </div>
          </div>
        )}

        <AnimatePresence>
          {saved && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--color-green-soft)', borderRadius: 12, fontSize: 13, fontWeight: 600, color: 'var(--color-green-text)' }}>
              <Check size={14} strokeWidth={2.5} /> {t('Сохранено')}
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
  const t = useT()
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
      {actions.onEdit && btn(actions.onEdit, t('Редактировать'), false, <Pencil size={13} strokeWidth={2} />)}
      {actions.onDuplicate && btn(actions.onDuplicate, t('Дублировать'), false, <Copy size={13} strokeWidth={2} />)}
      {actions.onDelete && btn(actions.onDelete, t('Удалить'), true, <Trash2 size={13} strokeWidth={2} />)}
    </div>
  )
}

function ContentCard({ accentColor, accentBg, borderColor, isSelected, onClick, icon, iconBg, badge, title, subtitle, footerLeft, footerRight, extra, actions }: {
  accentColor: string
  accentBg: string
  borderColor?: string
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
        border: isSelected ? `1.5px solid ${borderColor ?? accentColor}` : '1px solid var(--color-border-glass)',
        borderRadius: 20, padding: '18px 18px 12px', cursor: 'pointer',
        boxShadow: isSelected ? `0 0 0 3px ${(borderColor ?? accentColor)}22, 0 6px 24px rgba(0,0,0,0.08)` : '0 3px 16px rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column', gap: 10, transition: 'all 0.18s', height: '100%',
      }}
    >
      {actions && <CardActionBar actions={actions} visible={hovered} accentColor={accentColor} />}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: iconBg ?? 'var(--color-bg-5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, opacity: actions && hovered ? 0 : 1, transition: 'opacity 0.14s' }}>{badge}</div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.3, marginBottom: 4, minHeight: '2.6em', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{subtitle}</div>
        {extra}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--color-border-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--color-muted)', fontSize: 12, minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{footerLeft}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-3)', fontSize: 11, flexShrink: 0, whiteSpace: 'nowrap' }}>{footerRight}</div>
      </div>
    </motion.div>
  )
}

const COURSE_COLOR    = 'var(--color-purple)'            // hex — for border/shadow concatenation
const COURSE_BG       = 'var(--color-purple-soft)'

// Урок без проставленной длительности считаем стандартным: 90 минут — то же
// значение по умолчанию, что подставляет редактор урока.
const DEFAULT_LESSON_MINUTES = 90

/**
 * Часы курса для карточки — сумма длительностей уроков; невыставленные считаются
 * по 90 мин, поэтому подпись есть у каждого курса, а не только у расписанных
 * вручную. Готовый курс считается так же: у его уроков длительность проставлена
 * в спеке, поэтому плитка показывает то же число, что и после «Сохранить».
 * Ориентир по учебным часам (guidedHours) — другая величина, он в описании.
 */
function courseHours(course: Course): string {
  const minutes = course.lessons.reduce((sum, l) => sum + (l.minutes ?? DEFAULT_LESSON_MINUTES), 0)
  const hours = minutes / 60
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1).replace('.', ',')
}
const TRAINER_COLOR   = 'var(--color-purple)'
const TRAINER_BG      = 'var(--color-purple-soft)'

// Footer chip: one unified access badge. Count = people with access ("кому дан
// доступ", group_ids + student_ids). A green check overlay means lessons are
// already opened for at least one of them (enrolled — lesson_progress exists).
function StudentsBadge({ access, enrolled }: { access: { id: string; name: string }[]; enrolled: { id: string; name: string }[] }) {
  const t = useT()
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
        <UsersRound size={14} strokeWidth={1.9} />
        {opened && (
          <span style={{
            position: 'absolute', right: -4, bottom: -3, width: 9, height: 9, borderRadius: '50%',
            background: 'var(--color-green-text)', border: '1.5px solid var(--color-bg)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'content-box',
          }}>
            <Check size={6} strokeWidth={4} style={{ color: '#fff' }} />
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
              zIndex: 20, minWidth: 170, maxWidth: 240,
              background: 'rgba(var(--glass-rgb), 0.97)', backdropFilter: 'blur(16px) saturate(180%)', WebkitBackdropFilter: 'blur(16px) saturate(180%)',
              border: '1px solid var(--color-border-glass)', borderRadius: 12, padding: '8px 10px',
              boxShadow: '0 8px 28px rgba(0,0,0,0.16)', cursor: 'default',
            }}
          >
            {/* Зазоры 8px — ровно на вылет фейда ScrollFade (top/bottom: -8), иначе градиент лёг бы на подписи. */}
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 8 }}>
              {t('Доступ ·')} {count}
            </div>
            <ScrollFade maxHeight={186} bg="rgba(var(--glass-rgb), 0.97)" fadeHeight={18} overlayScrollbar
              scrollStyle={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {access.map(s => (
                <div key={s.id} style={{ fontSize: 12, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {enrolledIds.has(s.id)
                    ? <CheckCircle size={11} strokeWidth={2.5} style={{ color: 'var(--color-green-text)', flexShrink: 0 }} />
                    : <Circle size={11} strokeWidth={2} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                </div>
              ))}
            </ScrollFade>
            <div style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle size={9} strokeWidth={2.5} style={{ color: 'var(--color-green-text)' }} /> {t('уроки открыты')}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}

function CourseCard({ course, isSelected, onClick, actions, students, access }: { course: Course; isSelected: boolean; onClick: () => void; actions?: CardActions; students?: { id: string; name: string }[]; access?: { id: string; name: string }[] }) {
  const t = useT()
  return (
    <ContentCard
      accentColor={COURSE_COLOR} accentBg={COURSE_BG} actions={actions}
      isSelected={isSelected} onClick={onClick}
      icon={<BookOpen size={17} strokeWidth={2} style={{ color: 'var(--color-purple-text)' }} />}
      badge={
        <div style={{ display: 'flex', gap: 5 }}>
          <span style={cardChip(STATUS_COLOR[course.status])}>{STATUS_LABEL[course.status]}</span>
          {course.shared && <span style={cardChip('var(--color-purple-text)')}>{t('Общий')}</span>}
        </div>
      }
      title={course.title}
      subtitle={`${course.subject} · ${course.level}`}
      footerLeft={
        <>
          <GraduationCap size={13} strokeWidth={1.8} /><span>{course.lessons.length} {t('уроков')}</span>
          {access && access.length > 0 && (
            <>
              <span style={{ opacity: 0.4 }}>·</span>
              <StudentsBadge access={access} enrolled={students ?? []} />
            </>
          )}
        </>
      }
      footerRight={<><Clock size={11} strokeWidth={2} />{courseHours(course)} {t('ч')}</>}
    />
  )
}

// Готовый курс как обычная карточка списка. Своего вида у него нет: в списке он
// такая же плитка, как «Физика» или «Биология», просто пока не в БД — уроки тут
// заглушки под счётчик, настоящие соберёт seed.build() при открытии.
// Готовые курсы в БД не лежат, времени создания у них нет — держим их первыми
// под «Новые» (и последними под «Старые»), как было до сортировки по времени.
const SEED_SORT_AT = '9999-12-31T00:00:00.000Z'

/** Ключ порядка карточки курса: момент публикации, иначе момент создания. */
function courseSortAt(c: Course) {
  return c.publishedAt ?? c.createdAt ?? ''
}

/** Те же правила, что и у триггера courses_stamp_published_at в БД: создание
 *  штампуем один раз, публикацию — только на переходе в «Опубликован». Нужно,
 *  чтобы порядок встал сразу после «Сохранить», без перезагрузки списка. */
function withSortTimes(c: Course, prev?: Course | null): Course {
  const now = new Date().toISOString()
  const own = c.createdAt && c.createdAt !== SEED_SORT_AT ? c.createdAt : undefined
  return {
    ...c,
    createdAt: prev?.createdAt ?? own ?? now,
    publishedAt: c.status === 'published'
      ? (prev?.status === 'published' ? prev.publishedAt ?? now : now)
      : undefined,
  }
}

/** То же для тренажёров и виджетов: статуса публикации у них нет, поэтому
 *  порядок держится на одном времени создания и правка его не трогает. */
function withCreatedAt<T extends { createdAt?: string }>(item: T, prev?: T | null): T {
  return { ...item, createdAt: prev?.createdAt ?? item.createdAt ?? new Date().toISOString() }
}

function seedToCourse(seed: CourseSeed, id: string): Course {
  const s = seed.summary
  return {
    id, title: s.title, subject: seed.subject, level: s.level,
    description: s.scopeNote ?? '',
    lessons: Array.from({ length: s.units }, (_, i) => ({
      id: `${id}-l${i + 1}`, title: '', trainerId: null, widgetId: null, minutes: s.lessonMinutes,
    })),
    color: COURSE_COLOR, bg: COURSE_BG, status: 'draft', lastEdited: '',
    createdAt: SEED_SORT_AT,
  }
}

function TrainerCard({ trainer, isSelected, onClick }: { trainer: Trainer; isSelected: boolean; onClick: () => void }) {
  const t = useT()
  return (
    <ContentCard
      accentColor={TRAINER_COLOR} accentBg={TRAINER_BG}
      isSelected={isSelected} onClick={onClick}
      icon={<Zap size={17} strokeWidth={2} style={{ color: 'var(--color-purple-text)' }} />}
      title={trainer.title}
      subtitle={(trainer.topic) + ' · ' + (trainer.timePerQuestion) + t(' мин/вопрос')}
      extra={trainer.questionIds && trainer.questionIds.length > 0 ? (
        <div style={{ marginTop: 5, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {trainer.questionIds.map(id => (
            <span key={id} onClick={e => e.stopPropagation()} style={cardChipTone('red', { userSelect: 'text', cursor: 'text' })}>№{id}</span>
          ))}
        </div>
      ) : undefined}
      footerLeft={<><FileText size={13} strokeWidth={1.8} /><span>{trainer.questions.length} {t('вопросов')}</span></>}
      footerRight={<><Clock size={11} strokeWidth={2} />{trainer.lastEdited}</>}
    />
  )
}

function WidgetCard({ widget, isSelected, onClick, actions }: { widget: Widget; isSelected: boolean; onClick: () => void; actions?: CardActions }) {
  const t = useT()
  const TypeIcon = WTYPE_ICON[widget.type]
  return (
    <ContentCard
      accentColor={WTYPE_COLOR[widget.type]} accentBg={WTYPE_BG[widget.type]} actions={actions}
      isSelected={isSelected} onClick={onClick}
      icon={<TypeIcon size={17} strokeWidth={2} style={{ color: WTYPE_COLOR[widget.type] }} />}
      badge={<span style={cardChip(WTYPE_COLOR[widget.type])}>{WTYPE_LABEL[widget.type]}</span>}
      title={widget.title}
      subtitle={(widget.items.length) + t(' элементов')}
      footerLeft={
        widget.linkedTrainerId
          ? <><Link2 size={13} strokeWidth={1.8} style={{ color: 'var(--color-accent)' }} /><span style={{ color: 'var(--color-accent)' }}>{t('Из тренажёра')}</span></>
          : <><Pencil size={13} strokeWidth={1.8} /><span>{t('Вручную')}</span></>
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
  ['newest', t('Новые')], ['oldest', t('Старые')], ['az', t('А → Я')], ['items', t('По элементам')],
]

function WidgetSortDropdown({ value, onChange }: { value: WidgetSortMode; onChange: (v: WidgetSortMode) => void }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const label = WIDGET_SORT_OPTS.find(([v]) => v === value)?.[1] ?? t('Новые')
  const accent = 'var(--color-blue-pill-text)'
  const accentSoft = 'color-mix(in srgb, var(--color-blue-pill-text) 11%, transparent)'
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} onBlur={() => setTimeout(() => setOpen(false), 120)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999,
          background: open ? 'rgba(var(--glass-rgb), 0.98)' : 'rgba(var(--glass-rgb), 0.9)', border: `1px solid ${open ? 'var(--color-border-strong)' : 'var(--color-border)'}`,
          fontSize: 12, fontWeight: 600, color: 'var(--color-text)', cursor: 'pointer', fontFamily: 'inherit' }}>
        <ArrowUpDown size={12} style={{ color: 'var(--color-text-3)' }} />
        <span style={{ minWidth: 88, textAlign: 'left' }}>{label}</span>
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
                  background: value === val ? accentSoft : 'transparent',
                  fontSize: 13, fontWeight: value === val ? 700 : 400, color: 'var(--color-text)',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                onMouseEnter={e => { e.currentTarget.style.background = accentSoft }}
                onMouseLeave={e => { e.currentTarget.style.background = value === val ? accentSoft : 'transparent' }}>
                {lbl}
                {value === val && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
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
  ['newest', t('Новые')], ['oldest', t('Старые')], ['az', t('А → Я')],
]

function CourseSortDropdown({ value, onChange }: { value: CourseSortMode; onChange: (v: CourseSortMode) => void }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const label = COURSE_SORT_OPTS.find(([v]) => v === value)?.[1] ?? t('Новые')
  const accent = 'var(--color-green-text)'
  const accentSoft = 'color-mix(in srgb, var(--color-green-text) 11%, transparent)'
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} onBlur={() => setTimeout(() => setOpen(false), 120)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999,
          background: open ? 'rgba(var(--glass-rgb), 0.98)' : 'rgba(var(--glass-rgb), 0.9)', border: `1px solid ${open ? 'var(--color-border-strong)' : 'var(--color-border)'}`,
          fontSize: 12, fontWeight: 600, color: 'var(--color-text)', cursor: 'pointer', fontFamily: 'inherit' }}>
        <ArrowUpDown size={12} style={{ color: 'var(--color-text-3)' }} />
        <span style={{ minWidth: 88, textAlign: 'left' }}>{label}</span>
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
                  background: value === val ? accentSoft : 'transparent',
                  fontSize: 13, fontWeight: value === val ? 700 : 400, color: 'var(--color-text)',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                onMouseEnter={e => { e.currentTarget.style.background = accentSoft }}
                onMouseLeave={e => { e.currentTarget.style.background = value === val ? accentSoft : 'transparent' }}>
                {lbl}
                {value === val && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Дропдаун-фильтр списка курсов (предмет, уровень). От CourseSortDropdown
 * отличается тем, что опции приходят снаружи и зависят от данных: если
 * фильтровать не по чему (один предмет, ни одного заполненного уровня) —
 * кнопка не рисуется вообще, чтобы не занимать строку мёртвым контролом.
 */
/**
 * Разделитель в списке опций фасета: строка-маркер, которую дропдаун рисует
 * тонкой чертой вместо кнопки. Так список предметов делится на «все» → языки →
 * остальные, не заводя второй тип данных для опций.
 */
const FACET_SEP = '\u0000sep'

function CourseFacetDropdown({ value, options, allLabel, icon, minWidth = 92, iconGap = 6, labels, searchable, onChange }: {
  value: string
  options: string[]
  allLabel: string
  icon: ReactNode
  /**
   * Подписи для опций, если значение — не то, что видит глаз (у фильтра по
   * ученику значение это ключ человека, а в кнопке должно стоять имя).
   */
  labels?: Record<string, string>
  /** Строка поиска над списком: у учеников опций десятки, глазами не найти. */
  searchable?: boolean
  minWidth?: number
  /**
   * Отступ иконка→текст. Дефолт годится для эмодзи и иконок с полями, но у
   * стрелочных lucide-иконок штрих доходит до края бокса, и при gap 6 остриё
   * почти касается буквы — таким иконкам ставим 9.
   */
  iconGap?: number
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  if (options.filter(o => o !== FACET_SEP).length < 2) return null
  const label = (v: string) => labels?.[v] ?? v
  const accent = 'var(--color-green-text)'
  const accentSoft = 'color-mix(in srgb, var(--color-green-text) 11%, transparent)'
  // Группы разделены — значит и «все» отделяем от них, иначе первая группа
  // слипается с общей строкой.
  const grouped = options.includes(FACET_SEP)
  const q = query.trim().toLowerCase()
  // Под поиском разделители групп теряют смысл — они делят полный список.
  const shown = q ? options.filter(o => o !== FACET_SEP && label(o).toLowerCase().includes(q)) : options
  const rows = q ? shown : ['', ...(grouped ? [FACET_SEP] : []), ...shown]
  return (
    // Закрытие ловим на обёртке, а не на кнопке: со строкой поиска фокус уходит
    // с кнопки внутрь меню, и «потерял фокус — закрылись» захлопывало список
    // сразу после открытия.
    <div style={{ position: 'relative' }}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) { setOpen(false); setQuery('') } }}>
      <button onClick={() => { setOpen(o => !o); setQuery('') }}
        style={{ display: 'flex', alignItems: 'center', gap: iconGap, padding: '7px 12px', borderRadius: 999,
          background: open ? 'rgba(var(--glass-rgb), 0.98)' : 'rgba(var(--glass-rgb), 0.9)',
          border: `1px solid ${value ? 'var(--color-border-strong)' : open ? 'var(--color-border-strong)' : 'var(--color-border)'}`,
          fontSize: 12, fontWeight: value ? 700 : 600, color: 'var(--color-text)', cursor: 'pointer', fontFamily: 'inherit' }}>
        <span style={{ display: 'flex', color: 'var(--color-text-3)' }}>{icon}</span>
        <span style={{ minWidth, textAlign: 'left' }}>{value ? label(value) : allLabel}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: 'var(--color-text-3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}
            style={{ position: 'absolute', top: '100%', left: 0, marginTop: 6, zIndex: 50, minWidth: 170,
              background: 'rgba(var(--glass-rgb), 0.97)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid var(--color-border-glass)', borderRadius: 14, boxShadow: '0 12px 32px rgba(0,0,0,0.12)', padding: 5 }}>
            {searchable && (
              <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
                onMouseDown={e => e.stopPropagation()}
                placeholder={allLabel}
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', marginBottom: 4,
                  borderRadius: 9, border: '1px solid var(--color-border)', background: 'var(--color-bg-3)',
                  fontSize: 13, color: 'var(--color-text)', fontFamily: 'inherit', outline: 'none' }} />
            )}
            <ScrollFade maxHeight={310} bg="rgba(var(--glass-rgb), 0.97)" overlayScrollbar>
              {rows.map((val, i) => val === FACET_SEP ? (
                <div key={`sep${i}`} style={{ height: 1, margin: '5px 8px', background: 'var(--color-border)' }} />
              ) : (
                <button key={val || '__all'} onMouseDown={e => { e.preventDefault(); onChange(val); setOpen(false); setQuery('') }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    width: '100%', padding: '9px 10px', borderRadius: 9, border: 'none',
                    background: value === val ? accentSoft : 'transparent',
                    fontSize: 13, fontWeight: value === val ? 700 : 400, color: 'var(--color-text)',
                    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                  onMouseEnter={e => { e.currentTarget.style.background = accentSoft }}
                  onMouseLeave={e => { e.currentTarget.style.background = value === val ? accentSoft : 'transparent' }}>
                  {val ? label(val) : allLabel}
                  {value === val && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </button>
              ))}
            </ScrollFade>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Segmented status filter: Все / Черновик / Опубликован.
function CourseStatusFilter({ value, onChange }: { value: '' | CourseStatus; onChange: (v: '' | CourseStatus) => void }) {
  const t = useT()
  const opts: ['' | CourseStatus, string][] = [['', t('Все')], ['draft', t('Черновик')], ['published', t('Опубликован')]]
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
  const t = useT()
  const accent = 'var(--color-blue-pill-text)'
  const accentBg = 'var(--color-blue-pill-bg)'
  const hasFilters = !!(filters.search || filters.type || filters.linked)
  const inputSt: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 11,
    border: 'none', fontSize: 13, color: 'var(--color-text)',
    background: 'var(--color-bg-input)', outline: 'none', fontFamily: 'inherit',
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
        width: 240, flexShrink: 0, alignSelf: 'flex-start', position: 'sticky', top: 20,
        background: 'rgba(var(--glass-rgb), 0.9)', backdropFilter: 'blur(16px) saturate(180%)', WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: '1px solid var(--color-border-glass)', borderRadius: 18, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', padding: 16,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Search size={15} style={{ color: accent }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{t('Фильтры')}</span>
      </div>

      <div style={{ position: 'relative' }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)' }} />
        <input value={filters.search} onChange={e => onChange({ search: e.target.value })} placeholder={t("Поиск по названию…")}
          style={{ ...inputSt, paddingLeft: 30, paddingRight: filters.search ? 30 : undefined }} />
        {filters.search && (
          <button onClick={() => onChange({ search: '' })} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--color-text-3)', display: 'flex', alignItems: 'center' }}>
            <X size={14} />
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('Тип')}</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          <button onClick={() => onChange({ type: '' })} style={pill(filters.type === '')}>{t('Все')}</button>
          {(Object.entries(WTYPE_LABEL) as [WidgetType, string][]).map(([wt, label]) => (
            <button key={wt} onClick={() => onChange({ type: filters.type === wt ? '' : wt })} style={pill(filters.type === wt)}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('Привязка')}</span>
        <div style={{ display: 'flex', gap: 5 }}>
          {([['', t('Все')], ['linked', t('Тренажёр')], ['unlinked', t('Вручную')]] as [WidgetFilters['linked'], string][]).map(([v, l]) => (
            <button key={v} onClick={() => onChange({ linked: v })}
              style={{ ...pill(filters.linked === v), flex: 1, padding: '6px 0' }}>{l}</button>
          ))}
        </div>
      </div>

      {filters.viewMode === 'groups' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('Группа')}</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            <button onClick={() => onChange({ activeGroup: '' })} style={pill(filters.activeGroup === '')}>{t('Все')}</button>
            {(Object.entries(WTYPE_LABEL) as [WidgetType, string][]).map(([wt, label]) => (
              <button key={wt} onClick={() => onChange({ activeGroup: filters.activeGroup === wt ? '' : wt })} style={pill(filters.activeGroup === wt)}>{label}</button>
            ))}
          </div>
        </div>
      )}

      {hasFilters && (
        <button onClick={() => onChange({ search: '', type: '', linked: '', activeGroup: '' })}
          style={{ padding: '8px 0', borderRadius: 10, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-input)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Trash2 size={12} /> {t('Сбросить фильтры')}
        </button>
      )}

      <div style={{ fontSize: 11, color: 'var(--color-text-3)', textAlign: 'center', paddingTop: 2 }}>{total} {t('виджетов')}</div>
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
  const t = useT()
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
                      <button onClick={e => { e.stopPropagation(); onDuplicateWidget(w) }} title={t("Дублировать")}
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
  const t = useT()
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
        placeholder={t("Название урока…")}
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
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-accent)', letterSpacing: 0.3 }}>{t('ИЗ БИБЛИОТЕКИ УРОКОВ')}</span>
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
// `fill` — заливка под белой галочкой/текстом: color подобран как ЦВЕТ ТЕКСТА
// и в залитом кружке давал 1.7–2.2:1. Совпадает по смыслу с typeVisual().fill,
// который подмешивается поверх в режиме тренажёра.
const CREATOR_CFG = {
  course:  { label: t('Курс'),     Icon: BookOpen, color: 'var(--color-accent)',         bg: 'var(--color-purple-soft)',  accent: 'var(--color-accent)',         fill: 'var(--color-control-accent)' },
  trainer: { label: t('Тренажёр'), Icon: Zap,      color: 'var(--color-accent)',         bg: 'var(--color-purple-soft)', accent: 'var(--color-accent)',         fill: 'var(--color-control-accent)' },
  widget:  { label: t('Виджет'),   Icon: Layers,   color: 'var(--color-blue-pill-text)', bg: 'var(--color-blue-pill-bg)', accent: 'var(--color-blue-pill-text)', fill: 'var(--color-blue-fill)' },
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
  const t = useT()
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
    if (error) setMsg(t('Ошибка: ') + (error.message))
    else if (!data || data.length === 0) setMsg(t('Не сохранено: нет прав. Войдите в аккаунт преподавателя заново.'))
    else setMsg(t('✓ Сохранено — ученики увидят обновление'))
  }

  const setPara = (id: string, text: string) => setParas(prev => prev.map(p => p.id === id ? { ...p, text } : p))
  const addQuestion = () => setQuiz(prev => [...prev, { id: uid(), prompt: '', options: [0, 1, 2].map(i => ({ id: `${uid()}${i}`, text: '' })), correctOptionId: '', explanation: '' }])
  const setQ = (qi: number, patch: Partial<HomeworkQuizQuestion>) => setQuiz(prev => prev.map((q, i) => i === qi ? { ...q, ...patch } : q))
  const setOpt = (qi: number, oid: string, text: string) => setQuiz(prev => prev.map((q, i) => i === qi ? { ...q, options: q.options.map(o => o.id === oid ? { ...o, text } : o) } : q))

  const sectionTitle: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }
  const miniBtn = (bg: string, color: string): React.CSSProperties => ({ width: 26, height: 26, borderRadius: 8, border: 'none', cursor: 'pointer', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 })
  const dashBtn: React.CSSProperties = { alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 9, border: '1px dashed var(--color-border-medium)', background: 'transparent', color: 'var(--color-accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 2 }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 24px', borderBottom: '1px solid var(--color-border-soft)', flexShrink: 0 }}>
        <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px 8px 10px', borderRadius: 999, border: '1px solid var(--color-border-soft)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <ArrowLeft size={15} /> {t('Назад')}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lessonTitle || t('Урок')}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{t('Связано с базой ·')} {shortId}</div>
        </div>
        {msg && <span style={{ fontSize: 12, fontWeight: 600, color: msg.startsWith('✓') ? 'var(--color-green-text)' : 'var(--color-red-text)' }}>{msg}</span>}
        <button onClick={save} disabled={saving || loading}
          style={{ padding: '9px 18px', borderRadius: 999, border: 'none', background: 'var(--color-purple-soft)', color: 'var(--color-accent)', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? t('Сохраняю…') : t('Сохранить в базу')}
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {/* CENTER — tabbed content */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* tabs */}
          <div style={{ display: 'flex', gap: 6, padding: '14px 24px 0' }}>
            {([['lesson', t('Урок')], ['record', t('Запись')]] as const).map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)}
                style={{ padding: '9px 18px', borderRadius: 11, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                  background: tab === k ? 'var(--color-purple-soft)' : 'transparent', color: tab === k ? 'var(--color-purple-text)' : 'var(--color-muted)' }}>
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: 40 }}><Skeleton.List rows={4} /></div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 24px 32px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {tab === 'lesson' && <>
                <div style={sectionTitle}>{t('Конспект')}</div>
                {paras.map((p, i) => (
                  <div key={p.id} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 11, color: 'var(--color-text-3)', width: 18, paddingTop: 10, flexShrink: 0 }}>{i + 1}</span>
                    <textarea value={p.text} onChange={e => setPara(p.id, e.target.value)} rows={3} placeholder={t("Текст абзаца конспекта…")} style={{ ...inputSt, resize: 'vertical', minHeight: 64, lineHeight: 1.5 }} />
                    <button onClick={() => setParas(prev => prev.filter(x => x.id !== p.id))} style={miniBtn('var(--color-red-soft)', 'var(--color-red-text)')}><Trash2 size={13} /></button>
                  </div>
                ))}
                <button onClick={() => setParas(prev => [...prev, { id: uid(), text: '' }])} style={dashBtn}><Plus size={13} /> {t('Добавить абзац')}</button>

                <div style={{ ...sectionTitle, marginTop: 16 }}>{t('Домашка · базовый тест')}</div>
                {quiz.map((q, qi) => (
                  <div key={q.id} style={{ border: '1px solid var(--color-border-soft)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 6 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)' }}>{t('Вопрос')} {qi + 1}</span>
                      <div style={{ flex: 1 }} />
                      <button onClick={() => setQuiz(prev => prev.filter((_, i) => i !== qi))} style={miniBtn('var(--color-red-soft)', 'var(--color-red-text)')}><Trash2 size={12} /></button>
                    </div>
                    <input value={q.prompt} onChange={e => setQ(qi, { prompt: e.target.value })} placeholder={t("Текст вопроса")} style={inputSt}
                      onPaste={e => {
                        const text = e.clipboardData.getData('text/plain')
                        const parsed = parseSmartPaste(text)
                        if (parsed) {
                          e.preventDefault()
                          const newOpts = parsed.options.map((t, i) => ({ id: q.options[i]?.id ?? uid(), text: t }))
                          setQ(qi, { prompt: parsed.question, options: newOpts, correctOptionId: newOpts[0].id })
                        }
                      }}
                    />
                    {/* Верный вариант — галочка внутри самого поля: отдельного
                        контрола сбоку нет, отмеченное поле обведено акцентом.
                        Снять галочку нельзя, её можно только перенести. */}
                    {q.options.map(o => {
                      const isCorrect = q.correctOptionId === o.id
                      return (
                        <div key={o.id} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '0 9px 0 0', borderRadius: 11,
                          // Обводка тенью, а не border: поля вокруг здесь без рамки,
                          // и 1.5px по краю сделали бы строку варианта на 3px выше.
                          boxShadow: isCorrect ? 'inset 0 0 0 1.5px var(--color-control-accent)' : 'none',
                          background: 'var(--color-bg-input)', transition: 'box-shadow 0.14s',
                        }}>
                          <input
                            value={o.text}
                            onChange={e => setOpt(qi, o.id, e.target.value)}
                            placeholder={t("Вариант ответа")}
                            style={{ ...inputSt, flex: 1, minWidth: 0, padding: '9px 0 9px 12px', borderRadius: 0, background: 'transparent' }}
                          />
                          <span title={t("Верный ответ")} style={{ display: 'flex', flexShrink: 0 }}>
                            <Checkbox
                              checked={isCorrect}
                              onChange={() => setQ(qi, { correctOptionId: o.id })}
                              size={20}
                            />
                          </span>
                        </div>
                      )
                    })}
                    <input value={q.explanation} onChange={e => setQ(qi, { explanation: e.target.value })} placeholder={t("Пояснение (после ответа)")} style={{ ...inputSt, fontSize: 12 }} />
                  </div>
                ))}
                <button onClick={addQuestion} style={dashBtn}><Plus size={13} /> {t('Добавить вопрос')}</button>

                <div style={{ ...sectionTitle, marginTop: 16 }}>{t('Домашка · хард-задание (на проверку преподавателю)')}</div>
                <input value={hardTask.topic} onChange={e => setHardTask(t => ({ ...t, topic: e.target.value }))} placeholder={t("Тема задания")} style={inputSt} />
                <textarea value={hardTask.prompt} onChange={e => setHardTask(t => ({ ...t, prompt: e.target.value }))} rows={3} placeholder={t("Условие задания…")} style={{ ...inputSt, resize: 'vertical', minHeight: 64, marginTop: 6 }} />
              </>}

              {tab === 'record' && <>
                <div style={sectionTitle}>{t('Видео записи урока')}</div>
                <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder={t("Ссылка RuTube / YouTube / своя (ONIX Stream и т.п.)")} style={inputSt} />

                <div style={{ ...sectionTitle, marginTop: 16 }}>{t('Таймкоды')}</div>
                {timecodes.map((tc, ti) => (
                  <div key={ti} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input value={tc.time} onChange={e => setTimecodes(prev => prev.map((x, i) => i === ti ? { ...x, time: e.target.value } : x))} placeholder="00:00" style={{ ...inputSt, width: 80, flexShrink: 0 }} />
                    <input value={tc.label} onChange={e => setTimecodes(prev => prev.map((x, i) => i === ti ? { ...x, label: e.target.value } : x))} placeholder={t("Название главы")} style={{ ...inputSt, flex: 1 }} />
                    <button onClick={() => setTimecodes(prev => prev.filter((_, i) => i !== ti))} style={miniBtn('var(--color-red-soft)', 'var(--color-red-text)')}><Trash2 size={13} /></button>
                  </div>
                ))}
                <button onClick={() => setTimecodes(prev => [...prev, { time: '', label: '', seconds: 0 }])} style={dashBtn}><Plus size={13} /> {t('Добавить таймкод')}</button>

                <div style={{ ...sectionTitle, marginTop: 16 }}>{t('Краткое описание урока')}</div>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder={t("Что разобрали, ключевые моменты…")} style={{ ...inputSt, resize: 'vertical', minHeight: 88 }} />

                <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 12, lineHeight: 1.5 }}>
                  {t('Расписание (дата/время) и получатели задаются при назначении урока группе/ученику — раздел «Зачислить на курс» и страница «Создать урок».')}
                </div>
              </>}
            </div>
          )}
        </div>

        {/* RIGHT — lessons list panel */}
        <div style={{ width: 280, flexShrink: 0, borderLeft: '1px solid var(--color-border-soft)', overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ ...sectionTitle, padding: '0 4px' }}>{t('Уроки курса (')}{lessons.length})</div>
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
  const t = useT()
  const [mode, setMode] = useState<Exclude<Tab, 'testing' | 'bank'>>(initialMode)
  const addTask = useTaskBank(s => s.addTask)
  const replaceTask = useTaskBank(s => s.replaceTask)

  // ── Task-authoring state (the "trainer" tab now authors a bank task) ──
  // Draft-backed: every user-entered field survives a reload (images excluded —
  // base64 blows the sessionStorage quota). Namespace is scoped by the edited
  // task id; a saved draft wins over the DB values inside usePersistentState.
  const tkDraft = `taskctor.${editingTask?.id ?? 'new'}.`
  // Meta → where the task lives in the bank / how the student finds it.
  // Предмет задания — русское название из реестра, а не пара «Химия|Биология».
  // Ограничение двумя предметами и держало банк закрытым для языков.
  const [tkSubject, setTkSubject] = usePersistentState<string>(tkDraft + 'subject', getSubject(editingTask?.subject)?.name ?? 'Химия')
  // Палитра типов ответа зависит от предмета: языковые типы показываем только
  // языковикам, иначе химик получает в списке диктант и запись голоса.
  const ANSWER_TYPES = useMemo(() => answerTypesFor(isLanguageSubject(tkSubject)), [tkSubject])
  // Разметка языкового задания: уровень / навык / тема / формат экзамена.
  // Уровень ОДИН — минимальный, с которого задание имеет смысл давать.
  const langTax = useMemo(() => languageTaxonomy(tkSubject), [tkSubject])
  const [tkLevel, setTkLevel] = usePersistentState(tkDraft + 'level', '')
  const [tkSkill, setTkSkill] = usePersistentState(tkDraft + 'skill', '')
  const [tkExamTask, setTkExamTask] = usePersistentState(tkDraft + 'examTask', '')
  const [tkSection, setTkSection] = usePersistentState(tkDraft + 'section', editingTask?.section ?? '')
  const [tkTopic, setTkTopic] = usePersistentState(tkDraft + 'topic', editingTask?.topic ?? '')
  const [tkPart, setTkPart] = usePersistentState<1 | 2>(tkDraft + 'part', editingTask?.part ?? 1)
  const [tkLine, setTkLine] = usePersistentState(tkDraft + 'line', editingTask?.line ?? 1)
  const [tkSource, setTkSource] = usePersistentState(tkDraft + 'source', editingTask?.source ?? SOURCES[SOURCES.length - 1]) // «Авторский»
  const [tkDifficulty, setTkDifficulty] = usePersistentState<Difficulty>(tkDraft + 'difficulty', editingTask?.difficulty ?? 'medium')

  // Условие — question text + optional content blocks (image / table)
  const [tkQuestion, setTkQuestion] = usePersistentState(tkDraft + 'question', editingTask?.question ?? '')
  const [tkImage, setTkImage] = useState(editingTask?.questionImage ?? '')
  const [tkImageSize, setTkImageSize] = usePersistentState<number>(tkDraft + 'imageSize', () => { const v = editingTask?.questionImageSize; return typeof v === 'number' ? v : DEFAULT_IMAGE_SIZE })
  const [tkHasTable, setTkHasTable] = usePersistentState(tkDraft + 'hasTable', !!(editingTask?.questionTable))
  const [tkTableHeaders, setTkTableHeaders] = usePersistentState<string[]>(tkDraft + 'tableHeaders', editingTask?.questionTable?.headers ?? ['', ''])
  const [tkTableRows, setTkTableRows] = usePersistentState<string[][]>(tkDraft + 'tableRows', editingTask?.questionTable?.rows ?? [['', ''], ['', '']])
  const [tkEmptyCells, setTkEmptyCells] = usePersistentState<Record<string, boolean>>(tkDraft + 'emptyCells', editingTask?.questionTable?.emptyCells ?? {})
  const [tkBlankCells, setTkBlankCells] = usePersistentState<Record<string, boolean>>(tkDraft + 'blankCells', editingTask?.questionTable?.blankCells ?? {})
  const [tkTableCellImages, setTkTableCellImages] = useState<Record<string, string>>(editingTask?.questionTable?.cellImages ?? {})
  const [tkTableCellImageSizes, setTkTableCellImageSizes] = usePersistentState<Record<string, number>>(tkDraft + 'tableCellImageSizes', editingTask?.questionTable?.cellImageSizes ?? {})
  const [tkBlockOrder, setTkBlockOrder] = usePersistentState<Array<'image' | 'table'>>(tkDraft + 'blockOrder', editingTask?.blockOrder ?? ['image', 'table'])
  const [tkImageCollapsed, setTkImageCollapsed] = useState(false)
  const [tkTableCollapsed, setTkTableCollapsed] = useState(false)

  // Ответ — which block + its config
  const [tkAnswerType, setTkAnswerType] = usePersistentState<AnswerType>(tkDraft + 'answerType', editingTask?.answerType ?? 'single')
  // single / multi
  const [tkChoices, setTkChoices] = usePersistentState<string[]>(tkDraft + 'choices',
    editingTask?.choices?.length ? editingTask.choices.map((c: TaskChoice) => c.text) : ['', '', '', '']
  )
  const [tkCorrect, setTkCorrect] = usePersistentState<number[]>(tkDraft + 'correct',
    editingTask?.choices?.length
      ? editingTask.choices.map((c: TaskChoice, i: number) => c.correct ? i : -1).filter((i: number) => i >= 0)
      : [0]
  )
  const [tkChoicePts, setTkChoicePts] = usePersistentState<number[]>(tkDraft + 'choicePts',
    editingTask?.choices?.length ? editingTask.choices.map((c: TaskChoice) => c.points ?? 0) : [1, 0, 0, 0]
  )
  // fill / tableFill / extended — single reference answer string
  const [tkShortAnswer, setTkShortAnswer] = usePersistentState(tkDraft + 'shortAnswer',
    (editingTask?.answerType === 'fill' || editingTask?.answerType === 'tableFill' || editingTask?.answerType === 'extended')
      ? (editingTask.answer ?? '') : ''
  )
  const [tkAllowPhoto, setTkAllowPhoto] = usePersistentState(tkDraft + 'allowPhoto', editingTask?.allowPhoto ?? true)
  // matching — left prompts mapped to right options
  const [tkMatchLeft, setTkMatchLeft] = usePersistentState<string[]>(tkDraft + 'matchLeft', editingTask?.matchLeft ?? ['', ''])
  const [tkMatchRight, setTkMatchRight] = usePersistentState<string[]>(tkDraft + 'matchRight', editingTask?.matchRight ?? ['', ''])
  const [tkMatchMap, setTkMatchMap] = usePersistentState<number[]>(tkDraft + 'matchMap',
    editingTask?.matchLeft ? editingTask.matchLeft.map((_: string, i: number) => i) : [0, 1]
  )
  // sequence — items already in the correct order
  const [tkSeq, setTkSeq] = usePersistentState<string[]>(tkDraft + 'seq', editingTask?.sequenceItems ?? ['', ''])

  const [tkSolution, setTkSolution] = usePersistentState(tkDraft + 'solution', editingTask?.solution ?? '')
  const [explPhotos, setExplPhotos] = useState<string[]>([])
  const explTextareaRef = useRef<HTMLTextAreaElement>(null)
  const condImgFileRef = useRef<HTMLInputElement>(null)
  const [condImgPickerOpen, setCondImgPickerOpen] = useState(false)
  const condImgPasteZoneRef = useRef<HTMLDivElement>(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const [savedTaskId, setSavedTaskId] = useState<number | null>(null)

  // ── Scoring (shared across answer types) ──
  const [trMaxPoints, setTrMaxPoints] = usePersistentState(tkDraft + 'maxPoints', editingTask?.maxPoints ?? 1)
  const [answerKeys, setAnswerKeys] = usePersistentState<AnswerKey[]>(tkDraft + 'answerKeys', editingTask?.answerKeys as AnswerKey[] ?? [])
  const [newKw, setNewKw] = usePersistentState(tkDraft + 'newKw', '')
  const [newKwPts, setNewKwPts] = usePersistentState(tkDraft + 'newKwPts', 1)
  const [scoreMode, setScoreMode] = usePersistentState<ScoreMode>(tkDraft + 'scoreMode', editingTask?.scoreMode ?? 'whole')
  const [criteria, setCriteria] = usePersistentState<Criterion[]>(tkDraft + 'criteria', editingTask?.criteria as Criterion[] ?? [])
  const [newCrit, setNewCrit] = usePersistentState(tkDraft + 'newCrit', '')
  const [newCritPts, setNewCritPts] = usePersistentState(tkDraft + 'newCritPts', 1)
  const [criteriaVisible, setCriteriaVisible] = usePersistentState(tkDraft + 'criteriaVisible', editingTask?.criteriaVisibleOnCheck ?? false)

  const isChoiceType = tkAnswerType === 'single' || tkAnswerType === 'multi'
  // Таксономия (разделы/темы/линии) есть только у экзаменационных предметов.
  // Для остальных — включая языки — она пустая: раньше любой предмет кроме
  // химии сваливался на биологию, и языковик получал разделы про клетку.
  const tkSubjDef = getSubject(tkSubject)
  const tkTopicMap = tkSubjDef?.id === 'chemistry' ? CHEMISTRY_TOPICS
    : tkSubjDef?.id === 'biology' ? BIOLOGY_TOPICS
    : {} as typeof CHEMISTRY_TOPICS
  // Teacher-editable option scopes (built-ins layered with added/removed edits).
  const metaAddOption = useTaskMeta(s => s.addOption)
  const metaRemoveOption = useTaskMeta(s => s.removeOption)
  const metaAdded = useTaskMeta(s => s.added)
  const metaRemoved = useTaskMeta(s => s.removed)
  const metaState = { added: metaAdded, removed: metaRemoved }
  const tkSubjKey = tkSubjDef?.id ?? 'chemistry'
  const sectionScopeKey = sectionScope(tkSubjKey)
  const topicScopeKey = topicScope(tkSubjKey, tkSection)
  const tkSectionList = mergeOptions(
    tkSubjDef?.id === 'chemistry' ? CHEMISTRY_SECTIONS
      : tkSubjDef?.id === 'biology' ? BIOLOGY_SECTIONS
      : [],
    sectionScopeKey, metaState)
  const baseTopicList = tkSection ? (tkTopicMap[tkSection] ?? []) : Object.values(tkTopicMap).flat()
  const tkTopicList = mergeOptions(baseTopicList, topicScopeKey, metaState)
  const tkSourceList = mergeOptions(SOURCES, SOURCE_SCOPE, metaState)
  const tkLineMap = tkSubject === 'Химия' ? CHEMISTRY_LINES : BIOLOGY_LINES
  const tkLineOptions = Object.entries(tkLineMap).map(([num, name]) => ({ value: num, label: `${num} · ${name}` }))

  // ── Course state (pre-filled when editing an existing course) ──
  const [cTitle, setCTitle] = useState(editCourse?.title ?? t('Новый курс'))
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
    if (!targets.length) { setEnrollMsg(t('Выберите получателя')); return }
    setEnrolling(true); setEnrollMsg('')
    const { data: course } = await supabase
      .from('courses').select('lessons(short_id, lesson_number)').eq('short_id', enrollDbId).single()
    const lessons = ((course?.lessons ?? []) as Array<{ short_id: string; lesson_number: number }>)
    if (!lessons.length) { setEnrolling(false); setEnrollMsg(t('В курсе нет уроков в БД')); return }
    const rows = targets.flatMap(s => lessons.map(l => ({
      student_id: s.id, lesson_ref: l.short_id, subject: enrollDbId,
      status: l.lesson_number === 0 ? 'current' : 'locked',
    })))
    const { error } = await supabase.from('lesson_progress').upsert(rows, { onConflict: 'student_id,lesson_ref' })
    setEnrolling(false)
    if (!error) loadEnrolledStudents(enrollDbId)
    setEnrollMsg(error ? t('Ошибка: ') + (error.message) : t('✓ Зачислено: ') + (targets.length) + t(' ученик(ов) · ') + (lessons.length) + t(' уроков'))
  }

  // ── Widget state ──
  const [wTitle, setWTitle] = useState(editWidget?.title ?? t('Новый виджет'))
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

  // In trainer mode the editor accent follows the selected answer type's own
  // colour (per-type palette), so the body matches its picker tile. Other modes
  // keep their fixed creator accent.
  const cfg = mode === 'trainer'
    ? { ...CREATOR_CFG.trainer, ...typeVisual(tkAnswerType) }
    : CREATOR_CFG[mode]

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

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    optimizePhoto(file).then(src => { if (src) setTkImage(src) }).catch(e => { if (e instanceof ImageTooLargeError) window.alert(e.message) })
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
      ? { headers: tkTableHeaders, rows: tkTableRows, emptyCells: Object.keys(tkEmptyCells).length ? tkEmptyCells : undefined, blankCells: Object.keys(tkBlankCells).length ? tkBlankCells : undefined, cellImages: Object.keys(tkTableCellImages).length ? tkTableCellImages : undefined, cellImageSizes: Object.keys(tkTableCellImageSizes).length ? tkTableCellImageSizes : undefined }
      : undefined
    const base = {
      // Слаг предмета из реестра: языковое задание должно сохраниться как
      // 'korean'/'english', а не свалиться в биологию, как было раньше.
      subject: tkSubjKey as Subject,
      // У языкового задания разметки ЕГЭ нет — в базе эти поля с миграции 0050
      // необязательны, и подставлять туда чужие значения незачем.
      section: langTax ? '' : (tkSection || tkSectionList[0]),
      topic: langTax ? tkTopic : (tkTopic || tkTopicList[0] || '—'),
      part: tkPart, line: tkLine, source: tkSource,
      // Языковая разметка: уровень / навык / тема / формат экзамена.
      // Едет в payload, поэтому новый тип разметки не требует миграции.
      ...(langTax ? {
        payload: {
          level: tkLevel || undefined,
          skill: tkSkill || undefined,
          topic: tkTopic || undefined,
          examTask: tkExamTask || undefined,
        },
      } : {}),
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
    // fill / extended
    const ans = tkShortAnswer.trim()
    if (tkAnswerType === 'fill' && !ans) return null
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
        clearDrafts(tkDraft)
        onCancel()
        return
      }

      const newId = await addTask(task)

      // Create a trainer card so the task appears in the Тренажёр list.
      const isBio = tkSubject === 'Биология'
      const trainerColor = isBio ? '#5FD68A' : 'var(--color-purple)'
      const trainerBg    = isBio ? '#D6F5E3' : '#EFE0FF'
      const trainerTitle = (tkTopic || tkSection || stripHtml(tkQuestion).slice(0, 40)).trim() || t('Новое задание')
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
        subject: tkSubjKey,
        color: trainerColor,
        bg: trainerBg,
        lastEdited: dateStr,
      }
      onSaveTrainer(newTrainer)
      clearDrafts(tkDraft)
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

  // Explicit close (Назад) — the user walks away from the form, drop its drafts.
  function handleCancel() {
    clearDrafts(tkDraft)
    onCancel()
  }

  const canSave = mode === 'trainer' ? builtTask !== null
    : mode === 'course' ? cTitle.trim().length > 0
    : wTitle.trim().length > 0

  const docked = useTeacher(s => s.headerDocked)
  const setDocked = useTeacher(s => s.setHeaderDocked)
  useEffect(() => () => setDocked(false), [])

  const currentName = (mode === 'trainer' ? stripHtml(tkQuestion) : mode === 'course' ? cTitle : wTitle).trim()
  const createLabel = mode === 'trainer' ? (editingTask ? t('Редактировать задание') : t('Создать задание')) : mode === 'course' ? (editCourse ? t('Редактировать курс') : t('Создать курс')) : (editWidget ? t('Редактировать виджет') : t('Создать виджет'))
  const saveLabel = t('Сохранить')
  const paramsLabel = mode === 'course' ? t('Параметры курса') : mode === 'trainer' ? t('Параметры задания') : t('Параметры виджета')

  const savePillStyle: React.CSSProperties = teacherSaveStyle({ disabled: !canSave })

  return (
    // Single scroll container — same pattern as TeacherHomeworkCreatePage.
    // The page root is already lifted by -100, so paddingTop:100 alone lets
    // content scroll under the floating topbar.
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onScroll={e => setDocked((e.currentTarget as HTMLElement).scrollTop > 64)}
      style={{ flex: 1, height: '100vh', overflowY: 'auto', scrollbarGutter: 'stable', paddingTop: 100 }}
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
              onClick={handleCancel}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                padding: '9px 16px 9px 12px', borderRadius: 999, ...dockGlass,
                color: 'var(--color-text)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit', pointerEvents: 'auto',
              }}
            >
              <ArrowLeft size={15} strokeWidth={2} /> {t('Назад')}
            </motion.button>

            <div style={{
              flexShrink: 1, minWidth: 0, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
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
            onClick={handleCancel}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
              padding: '9px 16px 9px 12px', borderRadius: 999, border: '1px solid var(--color-border-soft)',
              background: 'rgba(var(--glass-rgb), 0.96)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
              color: 'var(--color-text)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <ArrowLeft size={15} strokeWidth={2} /> {t('Назад')}
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
            {/* Предмет — выпадающий список по всему реестру. Двух кнопок
                «Химия | Биология» не хватало: языковые предметы в банк заданий
                попасть просто не могли, а вместе с ними и языковые типы. */}
            <div>
              <TeacherSelect
                value={tkSubject}
                onChange={v => { setTkSubject(v); setTkSection(''); setTkTopic('') }}
                placeholder={t('Предмет')}
                options={SUBJECTS.map(s => ({ value: s.name, label: `${s.icon} ${s.name}` }))}
              />
            </div>
            {/* Разметка. У языкового предмета своя: уровень / навык / тема —
                оси независимые, потому что тема «еда» бывает и в чтении, и в
                говорении. Разметка ЕГЭ (раздел → тема → часть) для языка
                бессмысленна и в базе теперь необязательна (миграция 0050). */}
            {langTax ? (
              <>
                <div>
                  <TeacherSelect value={tkLevel} onChange={setTkLevel} placeholder={t('Уровень')}
                    options={langTax.levels} />
                </div>
                <div>
                  <TeacherSelect value={tkSkill} onChange={setTkSkill} placeholder={t('Навык')}
                    options={langTax.skills} />
                </div>
                <div>
                  <TeacherSelect value={tkTopic} onChange={setTkTopic} placeholder={t('Тема')}
                    options={langTax.topics} />
                </div>
                {langTax.examTasks.length > 0 && (
                  <div>
                    <TeacherSelect value={tkExamTask} onChange={setTkExamTask} placeholder={t('Формат экзамена — необязательно')}
                      options={langTax.examTasks} />
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <TeacherSelect value={tkSection} onChange={v => { setTkSection(v); setTkTopic('') }} placeholder={t("Раздел")}
                    options={tkSectionList}
                    onAddOption={l => metaAddOption(sectionScopeKey, l)}
                    onDeleteOption={v => metaRemoveOption(sectionScopeKey, v)} />
                </div>
                <div>
                  <TeacherSelect value={tkTopic} onChange={setTkTopic} placeholder={t("Тема")}
                    options={tkTopicList}
                    onAddOption={l => metaAddOption(topicScopeKey, l)}
                    onDeleteOption={v => metaRemoveOption(topicScopeKey, v)} />
                </div>
                <div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {([1, 2] as const).map(p => (
                      <SegBtn key={p} label={t('Часть ') + (p)} active={tkPart === p}
                        color="var(--color-purple-text)" bg="var(--color-purple-soft)"
                        onClick={() => setTkPart(p)} />
                    ))}
                  </div>
                </div>
              </>
            )}
            <div>
              {/* Difficulty — drives the «Простые/Сложные» sort in the trainer. */}
              <div style={{ display: 'flex', gap: 8 }}>
                {([['easy', t('Простое')], ['medium', t('Среднее')], ['hard', t('Сложное')]] as const).map(([d, label]) => (
                  <SegBtn key={d} label={label} active={tkDifficulty === d}
                    color="var(--color-purple-text)" bg="var(--color-purple-soft)"
                    onClick={() => setTkDifficulty(d)} />
                ))}
              </div>
            </div>
            <div>
              <TeacherSelect value={String(tkLine)} onChange={v => setTkLine(Number(v))} placeholder={t("Линия")} options={tkLineOptions} />
            </div>
            <div>
              <TeacherSelect value={tkSource} onChange={setTkSource} placeholder={t("Источник")} options={tkSourceList}
                onAddOption={l => metaAddOption(SOURCE_SCOPE, l)}
                onDeleteOption={v => metaRemoveOption(SOURCE_SCOPE, v)} />
            </div>
            <div style={{ background: canSave ? 'var(--color-green-soft)' : 'var(--color-bg-2)', borderRadius: 12, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: canSave ? 'var(--color-green-text)' : 'var(--color-text-3)', marginBottom: 4 }}>
                {canSave ? t('✓ Задание готово') : t('Заполните условие и ответ')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                {ANSWER_TYPES.find(a => a.type === tkAnswerType)?.label} · {computedMax || 1} {(computedMax || 1) === 1 ? t('балл') : (computedMax || 1) < 5 ? t('балла') : t('баллов')}
              </div>
            </div>
          </>}

          {/* ─ Course left ─ */}
          {mode === 'course' && <>
            <div><Label>{t('Название')}</Label>
              <input value={cTitle} onChange={e => setCTitle(e.target.value)} style={inputSt} />
            </div>
            <div><Label>{t('Предмет')}</Label>
              <input value={cSubject} onChange={e => setCSubject(e.target.value)} style={inputSt} placeholder={t("Например, Химия")} />
            </div>
            <div>
              {/* Предмет здесь вводится текстом: если он опознан как язык —
                  предлагаем языковые ступени (CEFR + TOPIK/JLPT/HSK), иначе
                  привычный школьный набор. */}
              <TeacherSelect value={cLevel} onChange={setCLevel} placeholder={t("Уровень")}
                options={usesLanguageLevels(cSubject) ? levelOptionsForSubject(cSubject) : ['ЕГЭ', 'ОГЭ', 'AP', 'Углублённый', 'Интенсив']} />
            </div>
            <div><Label>{t('Описание')}</Label>
              <textarea ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }} value={cDesc} onChange={e => { setCDesc(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                style={{ ...inputSt, resize: 'none', overflow: 'hidden' }} placeholder={t("Краткое описание курса…")} />
            </div>
            <div><Label>{t('Статус')}</Label>
              <div style={{ display: 'flex', gap: 6 }}>
                <SegBtn label={t("Черновик")} active={cStatus === 'draft'} color="var(--color-peach-text)" bg="var(--color-peach-soft)" onClick={() => setCStatus('draft')} />
                <SegBtn label={t("Опубликован")} active={cStatus === 'published'} color="var(--color-green-text)" bg="var(--color-green-soft)" onClick={() => setCStatus('published')} />
              </div>
            </div>

            {/* Зачисление — назначить курс группе или отдельному студенту */}
            <div>
              <Label>{t('Зачислить на курс')}</Label>
              {enrollDbId ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <SegBtn label={t("Группе")} active={assignMode === 'group'} color="var(--color-accent)" bg="var(--color-purple-soft)" onClick={() => { setAssignMode('group'); setEnrollMsg('') }} />
                    <SegBtn label={t("Студенту")} active={assignMode === 'student'} color="var(--color-accent)" bg="var(--color-purple-soft)" onClick={() => { setAssignMode('student'); setEnrollMsg('') }} />
                  </div>
                  {assignMode === 'group' ? (
                    <TeacherSelect value={assignGroupId} onChange={setAssignGroupId} placeholder={t("Выберите группу")}
                      options={enrollGroups.filter(g => g.subject === cSubject).map(g => ({ value: g.id, label: g.name }))} />
                  ) : (
                    <TeacherSelect value={assignStudentId} onChange={setAssignStudentId} placeholder={t("Выберите студента")}
                      options={enrollStudents.filter(s => s.subject === cSubject).map(s => ({ value: s.id, label: s.name }))} />
                  )}
                  <button onClick={enrollCourse} disabled={enrolling}
                    style={{ padding: '9px 14px', borderRadius: 11, border: 'none', cursor: enrolling ? 'default' : 'pointer', background: 'var(--color-purple-soft)', color: 'var(--color-accent)', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', opacity: enrolling ? 0.6 : 1 }}>
                    {enrolling ? t('Зачисляю…') : t('Зачислить')}
                  </button>
                  {enrollMsg && <div style={{ fontSize: 12, fontWeight: 600, color: enrollMsg.startsWith('✓') ? 'var(--color-green-text)' : 'var(--color-red-text)' }}>{enrollMsg}</div>}
                  {enrolledList.length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {t('Зачислены (')}{enrolledList.length})
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
                  {t('Курс ещё не опубликован в базе — зачисление недоступно. Сейчас доступно для курсов AP Chemistry.')}
                </div>
              )}
            </div>
          </>}

          {/* ─ Widget left ─ */}
          {mode === 'widget' && <>
            <div><Label>{t('Название')}</Label>
              <input value={wTitle} onChange={e => setWTitle(e.target.value)} style={inputSt} />
            </div>
            <div><Label>{t('Тип виджета')}</Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {(['quiz', 'facts', 'reactions', 'pomodoro', 'memes', 'qod'] as WidgetType[]).map(wt => {
                  const WIcon = WTYPE_ICON[wt]
                  return (
                    <button key={wt} onClick={() => setWType(wt)} style={{
                      padding: '8px 10px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 7,
                      border: 'none',
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
              <TeacherSelect value={wLinkedId} onChange={setWLinkedId} placeholder={t("Тренажёр")}
                options={trainers.map(t => ({ value: t.id, label: t.title }))} />
            </div>
          </>}
          </GlassCard>
        </div>

        {/* CENTER: type pills + content form */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '0 24px 20px 20px' }}>

          <GlassCard style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* ─── TASK center: block-based authoring ─── */}
          {mode === 'trainer' && <>
            {/* Card header — type badge + question preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderBottom: '1px solid var(--color-border-soft)', flexShrink: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg, borderRadius: 7, padding: '2px 8px', flexShrink: 0 }}>
                {ANSWER_TYPES.find(a => a.type === tkAnswerType)?.label ?? t('Задание')}
              </div>
              <div style={{ flex: 1, fontSize: 12, color: 'var(--color-text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {stripHtml(tkQuestion).trim() || <span style={{ fontStyle: 'italic' }}>{t('без текста условия')}</span>}
              </div>
            </div>
            {/* Body */}
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* success flash */}
            <AnimatePresence>
              {savedFlash && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--color-green-soft)', borderRadius: 14, fontSize: 13, fontWeight: 700, color: 'var(--color-green-text)', border: '1.5px solid #b4e8c2' }}>
                  <Check size={15} strokeWidth={2.5} />
                  <span>{t('Задание сохранено в банк')}</span>
                  {savedTaskId !== null && (
                    <span style={{ marginLeft: 4, padding: '2px 10px', borderRadius: 999, background: 'var(--color-bg-input)', color: 'var(--color-green-text)', fontSize: 13, fontWeight: 800, letterSpacing: 0.2, border: '1.5px solid #b4e8c2' }}>
                      №{savedTaskId}
                    </span>
                  )}
                  <span style={{ marginLeft: 4, fontSize: 12, fontWeight: 600, color: 'var(--color-green-text)' }}>{t('— дайте этот номер ученику, чтобы найти задание в тренажёре')}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 1 ─ Условие */}
            <div>
              <SectionHead>{t('Условие задания')}</SectionHead>
              <RichConditionEditor
                value={tkQuestion}
                onChange={setTkQuestion}
                inputSt={{ ...inputSt, borderRadius: 16 }}
                // Растёт по тексту вместо внутреннего скролла; minHeight — три
                // строки плюс место, зарезервированное под панель инструментов.
                autoGrow
                minHeight={growMinHeight(3, 16, 6) + 54}
                onSmartPaste={(_q, opts) => {
                  if (!isChoiceType) return
                  setTkChoices(opts.length >= 2 ? opts : [...opts, ...Array(2 - opts.length).fill('')])
                  setTkCorrect([0])
                  setTkChoicePts(opts.map((_, i) => i === 0 ? 1 : 0))
                }}
              />
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
                ? t('Изображение')
                : t('Таблица условия') + (tkAnswerType === 'tableFill' ? t(' — впишите «?» в проверяемую ячейку') : t(''))
              return (
                <div key={blockKey}>
                  {/* block header row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: collapsed ? 0 : 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.4, flex: 1 }}>{labelText}</span>
                    {bothExist && (
                      <button
                        onClick={() => setTkBlockOrder(prev => [...prev].reverse() as Array<'image' | 'table'>)}
                        title={t("Поменять местами с другим блоком")}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 7, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >
                        <ArrowUpDown size={11} />{t('поменять')}
                      </button>
                    )}
                    <button
                      onClick={() => setCollapsed((v: boolean) => !v)}
                      title={collapsed ? t('Развернуть') : t('Свернуть')}
                      style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >{collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}</button>
                    {!isImage && (
                      <button onClick={() => setTkHasTable(false)} style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 7, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)', color: 'var(--color-red-text)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}><X size={10} />{t('Убрать')}</button>
                    )}
                  </div>
                  {!collapsed && isImage && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {/* size presets */}
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        {([30, 50, 70, 100] as const).map(sz => {
                          const labels = { 30: 'S', 50: 'M', 70: 'L', 100: '↔' }
                          const titles = { 30: t('Маленькое (30%)'), 50: t('Среднее (50%)'), 70: t('Большое (70%)'), 100: t('Полная ширина') }
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
                    <TableEditor
                      value={{ headers: tkTableHeaders, rows: tkTableRows, emptyCells: tkEmptyCells, blankCells: tkBlankCells, cellImages: tkTableCellImages, cellImageSizes: tkTableCellImageSizes }}
                      onChange={v => { setTkTableHeaders(v.headers); setTkTableRows(v.rows); setTkEmptyCells(v.emptyCells ?? {}); setTkBlankCells(v.blankCells ?? {}); setTkTableCellImages(v.cellImages ?? {}); setTkTableCellImageSizes(v.cellImageSizes ?? {}) }}
                      accent={cfg.color}
                      accentBg={cfg.bg}
                      allowCellImages
                    />
                  )}
                </div>
              )
            })}

            {/* 2 ─ Блок ответа */}
            <div style={{ borderTop: '1px solid var(--color-border-soft)', paddingTop: 16 }}>
              <SectionHead>{t('Блок ответа ·')} {ANSWER_TYPES.find(a => a.type === tkAnswerType)?.label}</SectionHead>

              {/* single / multi */}
              {isChoiceType && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {tkChoices.map((ans, i) => {
                    const isCorrect = tkCorrect.includes(i)
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button onClick={() => toggleCorrect(i)} style={{
                          width: 24, height: 24, borderRadius: tkAnswerType === 'single' ? '50%' : 7, flexShrink: 0,
                          // Заливка — приглушённый cfg.fill, а не cfg.color: тот подобран как
                          // цвет текста и рамок, под белой галочкой давал 1.7:1. Галочка белая
                          // жёстко: getContrastColor не разбирает var(), то есть всё равно
                          // возвращал бы белую — но уже поверх светлой заливки.
                          border: `2px solid ${isCorrect ? cfg.fill : 'var(--color-border-medium)'}`,
                          background: isCorrect ? cfg.fill : 'transparent',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          position: 'relative', transition: 'all 0.14s',
                        }}>
                          {isCorrect && <Check size={13} strokeWidth={3} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff' }} />}
                        </button>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', borderRadius: 12, border: `2px solid ${isCorrect ? cfg.color : 'var(--color-border-medium)'}`, background: 'var(--color-bg-input)', overflow: 'hidden', transition: 'all 0.14s' }}>
                          <div style={{ width: 32, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: isCorrect ? cfg.color : 'var(--color-text-2)', flexShrink: 0 }}>{LETTERS[i]}</div>
                          <GrowTextarea value={ans} onChange={v => setChoice(i, v)} placeholder={t('Вариант ') + (LETTERS[i]) + '…'}
                            style={{ flex: 1, padding: '10px 12px 10px 0', border: 'none', borderRadius: 0, background: 'transparent', color: 'var(--color-text)', fontSize: 14, lineHeight: 1.4, fontFamily: 'inherit', outline: 'none' }} />
                        </div>
                        {scoreMode === 'perOption' && (
                          <input type="number" min={0} max={20} value={tkChoicePts[i] ?? 0}
                            onChange={e => setTkChoicePts(prev => prev.map((p, j) => j === i ? Number(e.target.value) : p))}
                            onFocus={e => e.target.select()}
                            style={{ ...inputSt, width: 52, textAlign: 'center', padding: '9px 6px', flexShrink: 0, border: '1.5px solid var(--color-border-medium)', borderRadius: 10 }} />
                        )}
                        {tkChoices.length > 2 && (
                          <button onClick={() => removeChoice(i)} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--color-red-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-red-text)', flexShrink: 0 }}><X size={13} /></button>
                        )}
                      </div>
                    )
                  })}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
                    <button onClick={addChoice} style={{ padding: '6px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', background: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}><Plus size={13} /> {t('Вариант')}</button>
                    <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{tkAnswerType === 'single' ? t('Отметьте один верный вариант') : t('Отметьте все верные варианты')}</span>
                  </div>
                </div>
              )}

              {/* fill */}
              {tkAnswerType === 'fill' && (
                <div>
                  <GrowTextarea value={tkShortAnswer} onChange={setTkShortAnswer}
                    placeholder={t("Правильный ответ — слово, число или формула")}
                    minHeight={growMinHeight(3, 13, 9, 0)} style={inputSt} />
                  <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 6 }}>{t('Ответ ученика сверяется без учёта регистра.')}</div>
                </div>
              )}

              {/* tableFill */}
              {tkAnswerType === 'tableFill' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>{t('Таблица условия — выше. Впишите «?» в проверяемую ячейку, а сюда — правильный термин.')}</div>
                  <Label>{t('Правильный термин для ячейки «?»')}</Label>
                  <GrowTextarea value={tkShortAnswer} onChange={setTkShortAnswer} placeholder={t("Напр. Палеонтология")}
                    minHeight={growMinHeight(3, 13, 9, 0)} style={inputSt} />
                </div>
              )}

              {/* matching */}
              {tkAnswerType === 'matching' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>{t('Левый столбец (А, Б, В…) сопоставляется с правым (1, 2, 3…). Выберите верный номер для каждой строки.')}</div>
                  {tkMatchLeft.map((l, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ width: 24, height: 24, borderRadius: 8, flexShrink: 0, background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{LETTERS[i]}</span>
                      <GrowTextarea value={l} onChange={v => setTkMatchLeft(prev => prev.map((x, j) => j === i ? v : x))} placeholder={t("Левый элемент…")} style={{ ...inputSt, flex: 1 }} />
                      <span style={{ flexShrink: 0, color: 'var(--color-text-3)', fontWeight: 700 }}>→</span>
                      <GrowTextarea value={tkMatchRight[i]} onChange={v => setTkMatchRight(prev => prev.map((x, j) => j === i ? v : x))} placeholder={(i + 1) + t('. Правый элемент…')} style={{ ...inputSt, flex: 1 }} />
                      <div style={{ width: 64, flexShrink: 0 }}>
                        <TeacherSelect small value={String(tkMatchMap[i] + 1)} onChange={v => setTkMatchMap(prev => prev.map((x, j) => j === i ? Number(v) - 1 : x))}
                          options={tkMatchRight.map((_, j) => ({ value: String(j + 1), label: `= ${j + 1}` }))} />
                      </div>
                      {tkMatchLeft.length > 2 && (
                        <button onClick={() => removeMatchRow(i)} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--color-red-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-red-text)', flexShrink: 0 }}><X size={13} /></button>
                      )}
                    </div>
                  ))}
                  <button onClick={addMatchRow} style={{ alignSelf: 'flex-start', padding: '6px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', background: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}><Plus size={13} /> {t('Пара')}</button>
                </div>
              )}

              {/* sequence */}
              {tkAnswerType === 'sequence' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>{t('Введите элементы в правильном порядке — ученику они покажутся перемешанными.')}</div>
                  {tkSeq.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ width: 24, height: 24, borderRadius: 8, flexShrink: 0, background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
                      <GrowTextarea value={s} onChange={v => setTkSeq(prev => prev.map((x, j) => j === i ? v : x))} placeholder={t('Шаг ') + (i + 1) + '…'} style={{ ...inputSt, flex: 1 }} />
                      <button onClick={() => moveSeq(i, -1)} disabled={i === 0} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', cursor: i === 0 ? 'default' : 'pointer', background: 'var(--color-bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)', opacity: i === 0 ? 0.3 : 1, flexShrink: 0 }}><ArrowUp size={13} /></button>
                      <button onClick={() => moveSeq(i, 1)} disabled={i === tkSeq.length - 1} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', cursor: i === tkSeq.length - 1 ? 'default' : 'pointer', background: 'var(--color-bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)', opacity: i === tkSeq.length - 1 ? 0.3 : 1, flexShrink: 0 }}><ArrowDown size={13} /></button>
                      {tkSeq.length > 2 && (
                        <button onClick={() => removeSeqRow(i)} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--color-red-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-red-text)', flexShrink: 0 }}><X size={13} /></button>
                      )}
                    </div>
                  ))}
                  <button onClick={addSeqRow} style={{ alignSelf: 'flex-start', padding: '6px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', background: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}><Plus size={13} /> {t('Шаг')}</button>
                </div>
              )}

              {/* extended */}
              {tkAnswerType === 'extended' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <Label>{t('Эталонный ответ (для проверяющего)')}</Label>
                    <GrowTextarea value={tkShortAnswer} onChange={setTkShortAnswer}
                      minHeight={growMinHeight(3, 13, 9, 0)}
                      placeholder={t("Развёрнутый эталон ответа…")} style={inputSt} />
                  </div>
                  <button onClick={() => setTkAllowPhoto(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 12, cursor: 'pointer', border: `1.5px solid ${tkAllowPhoto ? cfg.color + '55' : 'var(--color-border-medium)'}`, background: tkAllowPhoto ? `${cfg.bg}88` : 'var(--color-bg-2)', textAlign: 'left', width: '100%' }}>
                    <span style={{ width: 34, height: 20, borderRadius: 10, flexShrink: 0, position: 'relative', background: tkAllowPhoto ? cfg.color : 'var(--color-text-4)', transition: 'background 0.15s' }}>
                      <span style={{ position: 'absolute', top: 2, left: tkAllowPhoto ? 16 : 2, width: 16, height: 16, borderRadius: '50%', background: 'var(--color-bg-input)', transition: 'left 0.15s' }} />
                    </span>
                    <ImageIcon size={15} strokeWidth={2} style={{ color: tkAllowPhoto ? cfg.color : 'var(--color-text-3)' }} />
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{t('Разрешить прикрепить фото решения')}</div>
                  </button>
                </div>
              )}
            </div>

            {/* 3 ─ Оценивание */}
            <div style={{ borderTop: '1px solid var(--color-border-soft)', paddingTop: 16 }}>
              <Label>{t('Как оценивать')}</Label>
              <div style={{ display: 'flex', gap: 6, marginTop: 2, marginBottom: 12 }}>
                {([['perOption', t('За ответы')], ['criteria', t('По критериям')], ['whole', t('За всё задание')]] as [ScoreMode, string][]).map(([m, label]) => (
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
                  <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{t('баллов целиком за верный ответ')}</span>
                </div>
              )}

              {/* perOption hint for non-choice types → keyword scoring */}
              {scoreMode === 'perOption' && !isChoiceType && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Key size={14} strokeWidth={2} style={{ color: cfg.color }} />
                    <Label>{t('Ключи ответа — за каждое слово свой балл')}</Label>
                  </div>
                  {answerKeys.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {answerKeys.map(k => (
                        <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 12, background: 'var(--color-bg-input)', border: '1px solid var(--color-border-medium)' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: cfg.color, opacity: 0.7 }} />
                          <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{k.keyword}</div>
                          <div style={{ padding: '3px 10px', borderRadius: 8, background: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>+{k.points}</div>
                          <button onClick={() => removeKey(k.id)} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--color-red-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-red-text)', flexShrink: 0 }}><X size={13} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}><Label>{t('Ключевое слово')}</Label>
                      <input value={newKw} onChange={e => setNewKw(e.target.value)} onKeyDown={e => e.key === 'Enter' && addKey()} placeholder={t("Напр. дыхание, теплоотдача…")} style={inputSt} />
                    </div>
                    <div style={{ width: 80 }}><Label>{t('Баллов')}</Label>
                      <input type="number" min={1} max={20} value={newKwPts} onChange={e => setNewKwPts(Number(e.target.value))} onFocus={e => e.target.select()} style={inputSt} />
                    </div>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={addKey} style={{ height: 38, width: 38, borderRadius: 12, border: 'none', cursor: 'pointer', background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Plus size={16} strokeWidth={2.4} /></motion.button>
                  </div>
                </div>
              )}
              {scoreMode === 'perOption' && isChoiceType && (
                <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{t('Баллы за каждый вариант задаются в блоке ответа выше.')}</div>
              )}

              {/* criteria */}
              {scoreMode === 'criteria' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ListChecks size={14} strokeWidth={2} style={{ color: cfg.color }} />
                    <Label>{t('Критерии оценивания — у каждого свои баллы')}</Label>
                  </div>
                  {criteria.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {criteria.map((c, idx) => (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 12, background: 'var(--color-bg-input)', border: '1px solid var(--color-border-medium)' }}>
                          <span style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{idx + 1}</span>
                          <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{c.text}</div>
                          <div style={{ padding: '3px 10px', borderRadius: 8, background: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>+{c.points}</div>
                          <button onClick={() => removeCriterion(c.id)} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--color-red-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-red-text)', flexShrink: 0 }}><X size={13} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}><Label>{t('Критерий')}</Label>
                      <input value={newCrit} onChange={e => setNewCrit(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCriterion()} placeholder={t("Напр. записано уравнение реакции…")} style={inputSt} />
                    </div>
                    <div style={{ width: 80 }}><Label>{t('Баллов')}</Label>
                      <input type="number" min={1} max={20} value={newCritPts} onChange={e => setNewCritPts(Number(e.target.value))} onFocus={e => e.target.select()} style={inputSt} />
                    </div>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={addCriterion} style={{ height: 38, width: 38, borderRadius: 12, border: 'none', cursor: 'pointer', background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Plus size={16} strokeWidth={2.4} /></motion.button>
                  </div>
                  <button onClick={() => setCriteriaVisible(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 12, cursor: 'pointer', border: `1.5px solid ${criteriaVisible ? cfg.color + '55' : 'var(--color-border-medium)'}`, background: criteriaVisible ? `${cfg.bg}88` : 'var(--color-bg-2)', textAlign: 'left', width: '100%' }}>
                    <span style={{ width: 34, height: 20, borderRadius: 10, flexShrink: 0, position: 'relative', background: criteriaVisible ? cfg.color : 'var(--color-text-4)' }}>
                      <span style={{ position: 'absolute', top: 2, left: criteriaVisible ? 16 : 2, width: 16, height: 16, borderRadius: '50%', background: 'var(--color-bg-input)', transition: 'left 0.15s' }} />
                    </span>
                    {criteriaVisible ? <Eye size={15} strokeWidth={2} style={{ color: cfg.color }} /> : <EyeOff size={15} strokeWidth={2} style={{ color: 'var(--color-text-3)' }} />}
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{t('Показывать критерии студенту при проверке')}</div>
                  </button>
                </div>
              )}
            </div>

            {/* 4 ─ Объяснение */}
            <div style={{ borderTop: '1px solid var(--color-border-soft)', paddingTop: 16 }}>
              <Label>{t('Объяснение / решение (показывается после ответа)')}</Label>
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
                      optimizePhoto(file).then(src => { if (src) setExplPhotos(prev => [...prev, src]) }).catch(e => { if (e instanceof ImageTooLargeError) window.alert(e.message) })
                    })
                  }}
                  placeholder={t("Почему этот ответ верный…")}
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
                        optimizePhoto(file).then(src => { if (src) setExplPhotos(prev => [...prev, src]) }).catch(e => { if (e instanceof ImageTooLargeError) window.alert(e.message) })
                      })
                      e.target.value = ''
                    }} />
                    <ImageIcon size={14} />
                    {t('Добавить фото')}
                  </label>
                </div>
              </div>
            </div>
            </div>{/* end body */}
          </>}

          {/* ─── COURSE center ─── */}
          {mode === 'course' && (
            <div style={{ padding: '20px 22px' }}>
              <SectionHead>{t('Уроки курса (')}{cLessons.length})</SectionHead>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {cLessons.map((lesson, idx) => (
                  <div key={lesson.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--color-bg-input)', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                    <div style={{ width: 22, height: 22, borderRadius: 7, background: 'var(--color-purple-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--color-purple-text)', flexShrink: 0 }}>{idx + 1}</div>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--color-purple-text)' }}>{lesson.title}</div>
                    {enrollDbId && (
                      <button onClick={() => setEditingLessonIdx(idx)} title={t("Редактировать контент урока (конспект + ДЗ)")}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '20px 22px' }}>
              <SectionHead>{t('Содержимое —')} {WTYPE_LABEL[wType]}</SectionHead>

              {(wType === 'quiz' || wType === 'qod') && <>
                <div><Label>{t('Вопрос')}</Label><input value={wQText} onChange={e => setWQText(e.target.value)} placeholder={t("Текст вопроса…")} style={inputSt}
                  onPaste={e => {
                    const text = e.clipboardData.getData('text/plain')
                    const parsed = parseSmartPaste(text)
                    if (parsed) {
                      e.preventDefault()
                      setWQText(parsed.question)
                      setWQOpts(parsed.options.length >= 4 ? parsed.options : [...parsed.options, ...Array(Math.max(0, 4 - parsed.options.length)).fill('')])
                      setWQCorr(0)
                    }
                  }}
                /></div>
                {wQOpts.map((opt, oi) => (
                  <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button onClick={() => setWQCorr(oi)} style={{ width: 22, height: 22, borderRadius: '50%', border: wQCorr === oi ? 'none' : '2px solid var(--color-text-4)', flexShrink: 0, background: wQCorr === oi ? WTYPE_COLOR[wType] : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {wQCorr === oi && <Check size={11} strokeWidth={3} style={{ color: '#fff' }} />}
                    </button>
                    <input value={opt} onChange={e => { const o = [...wQOpts]; o[oi] = e.target.value; setWQOpts(o) }} placeholder={t('Вариант ') + (oi + 1) + '…'}
                      style={{ ...inputSt, flex: 1, border: wQCorr === oi ? `1.5px solid ${WTYPE_COLOR[wType]}55` : '1.5px solid var(--color-border-medium)', background: wQCorr === oi ? `${WTYPE_BG[wType]}88` : 'var(--color-bg-input)' }} />
                  </div>
                ))}
                <div style={{ fontSize: 10, color: 'var(--color-text-3)' }}>{t('● — правильный ответ')}</div>
              </>}

              {wType === 'facts' && <>
                <div><Label>{t('Заголовок факта')}</Label><input value={wFcTerm} onChange={e => setWFcTerm(e.target.value)} style={inputSt} /></div>
                <div><Label>{t('Текст факта')}</Label><textarea value={wFcDef} onChange={e => setWFcDef(e.target.value)} rows={3} style={{ ...inputSt, resize: 'vertical' }} /></div>
              </>}

              {wType === 'reactions' && <>
                <div><Label>{t('Эмодзи')}</Label><input value={wFcTerm} onChange={e => setWFcTerm(e.target.value)} placeholder={t("напр. 🔥")} style={inputSt} /></div>
                <div><Label>{t('Цитата / реплика')}</Label><input value={wFcDef} onChange={e => setWFcDef(e.target.value)} placeholder={t("Текст реакции…")} style={inputSt} /></div>
                <div><Label>{t('Название урока / темы')}</Label><input value={wDLabel} onChange={e => setWDLabel(e.target.value)} placeholder={t("Урок или тема…")} style={inputSt} /></div>
              </>}

              {wType === 'pomodoro' && <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <Label>{t('Фокус (мин)')}</Label>
                    <input type="number" min={5} max={90} value={wPomoFocus} onChange={e => setWPomoFocus(Number(e.target.value))} style={inputSt} />
                  </div>
                  <div>
                    <Label>{t('Перерыв (мин)')}</Label>
                    <input type="number" min={1} max={30} value={wPomoBreak} onChange={e => setWPomoBreak(Number(e.target.value))} style={inputSt} />
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-3)', background: 'var(--color-peach-soft)', borderRadius: 10, padding: '10px 12px' }}>
                  {t('Эти настройки применятся к таймеру «Фокус» у студентов')}
                </div>
              </>}

              {wType === 'memes' && <>
                <div><Label>{t('Эмодзи')}</Label><input value={wFcTerm} onChange={e => setWFcTerm(e.target.value)} placeholder={t("напр. 😅")} style={inputSt} /></div>
                <div><Label>{t('Название мема')}</Label><input value={wFcDef} onChange={e => setWFcDef(e.target.value)} placeholder={t("Заголовок…")} style={inputSt} /></div>
                <div><Label>{t('Подпись / шутка')}</Label><input value={wDLabel} onChange={e => setWDLabel(e.target.value)} placeholder={t("Пуанта…")} style={inputSt} /></div>
              </>}

              {wType !== 'pomodoro' && (
                <motion.button whileTap={{ scale: 0.97 }} onClick={addWidgetItem}
                  style={{ padding: '9px 0', borderRadius: 12, border: 'none', cursor: 'pointer', background: WTYPE_BG[wType], color: WTYPE_COLOR[wType], fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Plus size={13} /> {t('Добавить элемент')}
                </motion.button>
              )}

              {wType === 'pomodoro' && wItems.length === 0 && (
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setWItems([{ id: 'pomo', focusMin: wPomoFocus, breakMin: wPomoBreak }])}
                  style={{ padding: '9px 0', borderRadius: 12, border: 'none', cursor: 'pointer', background: WTYPE_BG.pomodoro, color: WTYPE_COLOR.pomodoro, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Check size={13} /> {t('Применить настройки')}
                </motion.button>
              )}
              {wType === 'pomodoro' && wItems.length > 0 && (
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setWItems([{ id: 'pomo', focusMin: wPomoFocus, breakMin: wPomoBreak }])}
                  style={{ padding: '9px 0', borderRadius: 12, border: 'none', cursor: 'pointer', background: WTYPE_BG.pomodoro, color: WTYPE_COLOR.pomodoro, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Check size={13} /> {t('Обновить:')} {wPomoFocus} / {wPomoBreak} {t('мин')}
                </motion.button>
              )}

              {wItems.length > 0 && wType !== 'pomodoro' && (
                <div>
                  <SectionHead>{t('Добавлено:')} {wItems.length}</SectionHead>
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
                    <div style={{ fontSize: 11, color: 'var(--color-text-3)', textAlign: 'center', padding: '4px 0' }}>+{wItems.length - 6} {t('ещё')}</div>
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
                <SectionHead>{t('Тип ответа')}</SectionHead>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {ANSWER_TYPES.map(({ type, label, hint, Icon }) => {
                    const active = tkAnswerType === type
                    const v = typeVisual(type)
                    return (
                      <button key={type} onClick={() => {
                        setTkAnswerType(type)
                        if (type === 'tableFill') setTkHasTable(true)
                        if (type === 'multi' && tkCorrect.length === 0) setTkCorrect([0])
                        if (type === 'single' && tkCorrect.length > 1) setTkCorrect([tkCorrect[0]])
                      }} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 13,
                        border: active ? `1.5px solid ${v.color}` : '1.5px solid transparent',
                        background: active ? v.bg : 'var(--color-bg-2)', cursor: 'pointer', textAlign: 'left', width: '100%',
                        transition: 'background 0.12s, border-color 0.12s',
                      }}>
                        <div style={{ width: 32, height: 32, borderRadius: 9, background: v.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={15} strokeWidth={2} style={{ color: v.color }} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: active ? v.color : 'var(--color-text)' }}>{label}</div>
                          <div style={{ fontSize: 10.5, color: 'var(--color-text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hint}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--color-border-soft)', paddingTop: 14 }}>
                <SectionHead>{t('Блоки условия')}</SectionHead>
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
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-text)' }}>{tkImage ? t('Заменить фото') : t('Добавить фото')}</div>
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
                            optimizePhoto(file).then(src => { if (src) setTkImage(src); setCondImgPickerOpen(false) }).catch(e => { if (e instanceof ImageTooLargeError) window.alert(e.message) })
                          }}
                          style={{ padding: '12px 10px', textAlign: 'center', fontSize: 12, color: 'var(--color-text-3)', outline: 'none', cursor: 'default', background: 'var(--color-bg-2)' }}
                        >
                          {t('Нажмите')} <kbd style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border-medium)', borderRadius: 4, padding: '1px 5px', fontFamily: 'inherit', fontSize: 11 }}>Ctrl+V</kbd> {t('чтобы вставить фото')}
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 10px', borderTop: '1px solid var(--color-border-soft)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)', background: 'var(--color-bg-2)' }}>
                          <ImageIcon size={13} />
                          {t('Выбрать файл')}
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
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: tkHasTable ? cfg.color : 'var(--color-text)' }}>{tkHasTable ? t('Таблица добавлена') : t('Добавить таблицу')}</div>
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
  biology:      { label: t('Биология'),          accent: '#22c55e', soft: 'var(--color-green-soft)'  },
  chemistry:    { label: t('Химия'),             accent: '#8B5CF6', soft: 'var(--color-purple-soft)' },
  logic:        { label: t('Скрининг мышления'), accent: '#f59e0b', soft: 'var(--color-yellow-soft)' },
  'ap-chem-ru': { label: 'AP Chemistry (RU)', accent: '#3b82f6', soft: 'rgba(59,130,246,0.12)'   },
  'ap-chem-en': { label: 'AP Chemistry (EN)', accent: '#14b8a6', soft: 'rgba(20,184,166,0.12)'   },
}
const DIAG_SUBJECTS: DiagSubject[] = ['biology', 'chemistry', 'logic', 'ap-chem-ru', 'ap-chem-en']
const SUBJECT_ICON_MAP: Record<DiagSubject, React.ElementType> = {
  biology: Dna,
  chemistry: FlaskConical,
  logic: Target,
  'ap-chem-ru': FlaskConical,
  'ap-chem-en': Globe,
}

// Runtime meta for custom user-created tests
const CUSTOM_META = new Map<string, { label: string; accent: string; soft: string; iconKey?: string }>()
async function loadColorOverridesFromDB(): Promise<Record<string, string>> {
  const { data } = await supabase.from('profiles').select('test_color_overrides').single()
  return (data?.test_color_overrides as Record<string, string>) ?? {}
}
async function saveColorOverrideToDB(subject: string, hex: string) {
  const { data: profileData } = await supabase.from('profiles').select('id, test_color_overrides').single()
  if (!profileData) return
  const current = (profileData.test_color_overrides as Record<string, string>) ?? {}
  current[subject] = hex
  await supabase.from('profiles').update({ test_color_overrides: current }).eq('id', profileData.id)
}
function getSubjectMeta(subject: string) {
  const override = CUSTOM_META.get(subject)
  const base = (SUBJECT_META as Record<string, { label: string; accent: string; soft: string }>)[subject]
    ?? { label: subject, accent: '#8B5CF6', soft: 'var(--color-purple-soft)' }
  if (override) return { label: override.label || base.label, accent: override.accent, soft: override.soft }
  return base
}
function getSubjectIcon(subject: string): React.ElementType {
  const customMeta = CUSTOM_META.get(subject)
  if (customMeta?.iconKey) return getIconByKey(customMeta.iconKey)
  return (SUBJECT_ICON_MAP as Record<string, React.ElementType>)[subject] ?? FileText
}

export type CustomTest = CustomTestMeta
function hydrateCustomMeta(tests: CustomTest[]) {
  tests.forEach(t => CUSTOM_META.set(t.id, { label: t.label, accent: t.accent, soft: t.accent + '22', iconKey: t.iconKey }))
}

const CREATOR_ACCENTS = [
  { hex: '#0d9488', soft: 'rgba(13,148,136,0.12)'    },
  { hex: '#8B5CF6', soft: 'var(--color-purple-soft)' },
  { hex: '#22c55e', soft: 'var(--color-green-soft)'  },
  { hex: '#ef4444', soft: 'rgba(239,68,68,0.1)'      },
  { hex: '#3b82f6', soft: 'rgba(59,130,246,0.12)'    },
  { hex: '#f59e0b', soft: 'rgba(245,158,11,0.11)'    },
]

// All lucide icons for search, computed once at module level.
// Lucide icons are React.forwardRef wrappers: objects with $$typeof === Symbol(react.forward_ref).
const _REACT_FORWARD_REF = Symbol.for('react.forward_ref')
const _REACT_MEMO = Symbol.for('react.memo')
const ALL_LUCIDE_ENTRIES: [string, React.ElementType][] = (
  Object.entries(LucideIcons as Record<string, unknown>)
    .filter(([name, val]) => {
      if (!/^[A-Z][a-zA-Z0-9]+$/.test(name) || name === 'createLucideIcon') return false
      if (typeof val === 'function') return true
      if (typeof val === 'object' && val !== null) {
        const t = (val as { $$typeof?: symbol }).$$typeof
        return t === _REACT_FORWARD_REF || t === _REACT_MEMO
      }
      return false
    })
    .sort(([a], [b]) => a.localeCompare(b))
) as [string, React.ElementType][]

const DEFAULT_ICON_KEYS = [
  'FileText', 'BookOpen', 'Brain', 'FlaskConical', 'Atom', 'Dna', 'Microscope',
  'Calculator', 'Sigma', 'Target', 'Globe', 'Languages', 'GraduationCap', 'Zap',
  'Lightbulb', 'Music', 'Star', 'CircleHelp', 'ListChecks',
]

const LEGACY_ICON_MAP: Record<string, string> = {
  'book': 'BookOpen', 'flask': 'FlaskConical', 'grad': 'GraduationCap',
  'help': 'CircleHelp', 'list': 'ListChecks', 'file-text': 'FileText',
}

function isLucideIcon(val: unknown): val is React.ElementType {
  if (!val) return false
  if (typeof val === 'function') return true
  if (typeof val === 'object') {
    const t = (val as { $$typeof?: symbol }).$$typeof
    return t === Symbol.for('react.forward_ref') || t === Symbol.for('react.memo')
  }
  return false
}
function getIconByKey(key?: string): React.ElementType {
  if (!key) return FileText
  const icons = LucideIcons as Record<string, unknown>
  if (isLucideIcon(icons[key])) return icons[key] as React.ElementType
  const mapped = LEGACY_ICON_MAP[key]
  if (mapped && isLucideIcon(icons[mapped])) return icons[mapped] as React.ElementType
  const pascal = key.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')
  if (isLucideIcon(icons[pascal])) return icons[pascal] as React.ElementType
  return FileText
}

// ─── IconPickerField ──────────────────────────────────────────────────────────
function IconPickerField({ iconKey, onChange, accent }: {
  iconKey: string; onChange: (key: string) => void; accent: string
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const topFadeRef = useRef<HTMLDivElement>(null)
  const botFadeRef = useRef<HTMLDivElement>(null)

  // Fill the row: 8 quick-pick icons (flex: 1 fills width) + chevron
  const quickPick = useMemo(() => {
    const base = DEFAULT_ICON_KEYS.slice(0, 8)
    if (base.includes(iconKey)) return base
    return [iconKey, ...base.slice(0, 7)]
  }, [iconKey])

  // Search results (null = show sections)
  const searchResults = useMemo(() => {
    const q = search.toLowerCase().replace(/[\s\-_]/g, '')
    if (!q) return null
    return ALL_LUCIDE_ENTRIES.filter(([n]) => n.toLowerCase().replace(/[\s\-_]/g, '').includes(q)).slice(0, 60)
  }, [search])

  // "All" section = ALL_LUCIDE_ENTRIES minus the popular 8 (shown in quick row), first 150
  const allIcons = useMemo(() =>
    ALL_LUCIDE_ENTRIES.filter(([n]) => !DEFAULT_ICON_KEYS.slice(0, 8).includes(n)).slice(0, 150)
  , [])

  // Barrel + fades via direct DOM (no re-render on scroll)
  const updateBarrel = useCallback(() => {
    const grid = gridRef.current
    if (!grid) return
    const { scrollTop, clientHeight, scrollHeight } = grid
    const viewCenter = clientHeight / 2
    const gridTop = grid.getBoundingClientRect().top

    grid.querySelectorAll<HTMLElement>('[data-icb]').forEach(btn => {
      const rect = btn.getBoundingClientRect()
      const itemCenter = rect.top - gridTop + rect.height / 2
      const dist = (itemCenter - viewCenter) / viewCenter // -1..1
      const angle = Math.max(-38, Math.min(38, dist * 38))
      const opacity = Math.max(0.12, 1 - Math.abs(dist) * 0.72)
      const scl = Math.max(0.72, 1 - Math.abs(dist) * 0.2)
      btn.style.transform = `perspective(180px) rotateX(${angle}deg) scale(${scl})`
      btn.style.opacity = String(opacity)
    })

    if (topFadeRef.current)
      topFadeRef.current.style.opacity = scrollTop < 4 ? '0' : '1'
    if (botFadeRef.current)
      botFadeRef.current.style.opacity = (scrollHeight <= clientHeight + 4 || scrollTop + clientHeight >= scrollHeight - 4) ? '0' : '1'
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => { searchRef.current?.focus(); updateBarrel() }, 60)
  }, [open, updateBarrel])

  useEffect(() => {
    if (open) setTimeout(updateBarrel, 20)
  }, [searchResults, open, updateBarrel])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false); setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const iconBtn = (name: string, Ic: React.ElementType) => {
    const sel = iconKey === name
    return (
      <button key={name} data-icb onClick={() => { onChange(name); setOpen(false); setSearch('') }} title={name}
        style={{
          width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: sel ? `${accent}28` : 'transparent',
          color: sel ? accent : 'var(--color-text-3)',
          transition: 'background 0.1s, color 0.1s',
        }}>
        <Ic size={14} strokeWidth={2} />
      </button>
    )
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {/* Row: icons fill full width */}
      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        {quickPick.map(k => {
          const Ic = getIconByKey(k)
          const sel = iconKey === k
          return (
            <button key={k} onClick={() => { onChange(k); setOpen(false); setSearch('') }} title={k}
              style={{
                flex: 1, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: sel ? `${accent}28` : 'transparent',
                color: sel ? accent : 'var(--color-text-3)',
                transition: 'background 0.12s, color 0.12s',
              }}>
              <Ic size={14} strokeWidth={2} />
            </button>
          )
        })}
        <button onClick={() => setOpen(o => !o)} title={t("Все иконки")}
          style={{
            width: 28, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', color: open ? accent : 'var(--color-text-3)',
            transition: 'color 0.12s',
          }}>
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* Animated dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}
            style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6, zIndex: 50,
              borderRadius: 14, padding: '8px 8px 6px',
              background: 'rgba(var(--glass-rgb), 0.88)',
              backdropFilter: 'blur(10px) saturate(140%)', WebkitBackdropFilter: 'blur(10px) saturate(140%)',
              border: '1px solid var(--color-border-glass)',
              boxShadow: '0 6px 18px rgba(0,0,0,0.10)',
            }}>
            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)', pointerEvents: 'none' }} />
              <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder={t("Поиск иконки…")}
                style={{ width: '100%', boxSizing: 'border-box', padding: '7px 28px 7px 28px', borderRadius: 9, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
              {search && (
                <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', padding: 0, fontSize: 15, lineHeight: 1 }}>×</button>
              )}
            </div>

            {/* Scrollable icon area with barrel + fades */}
            <div style={{ position: 'relative' }}>
              {/* Top fade */}
              <div ref={topFadeRef} style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 28, zIndex: 2,
                background: 'linear-gradient(to bottom, rgba(var(--glass-rgb), 0.9) 0%, transparent 100%)',
                pointerEvents: 'none', opacity: 0, transition: 'opacity 0.18s',
              }} />
              {/* Bottom fade */}
              <div ref={botFadeRef} style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: 28, zIndex: 2,
                background: 'linear-gradient(to top, rgba(var(--glass-rgb), 0.9) 0%, transparent 100%)',
                pointerEvents: 'none', opacity: 1, transition: 'opacity 0.18s',
              }} />

              <div ref={gridRef} onScroll={updateBarrel}
                style={{ maxHeight: 160, overflowY: 'auto', scrollbarWidth: 'none' as const }}>
                {searchResults ? (
                  /* Search results — flat grid */
                  <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 3 }}>
                    {searchResults.map(([name, Ic]) => iconBtn(name, Ic))}
                  </div>
                ) : (
                  /* Sections: Popular + All */
                  <>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.6, textTransform: 'uppercase', padding: '2px 2px 5px', opacity: 0.6 }}>
                      {t('Популярные')}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 3, marginBottom: 6 }}>
                      {DEFAULT_ICON_KEYS.map(k => {
                        const Ic = (LucideIcons as Record<string, unknown>)[k] as React.ElementType
                        return iconBtn(k, Ic)
                      })}
                    </div>
                    <div style={{ height: 1, background: 'var(--color-border-soft)', margin: '4px 0 6px', opacity: 0.5 }} />
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.6, textTransform: 'uppercase', padding: '0 2px 5px', opacity: 0.6 }}>
                      {t('Все')}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 3 }}>
                      {allIcons.map(([name, Ic]) => iconBtn(name, Ic))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}


// ─── Color utilities ─────────────────────────────────────────────────────────

function hexToHsv(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  let h = 0
  if (d > 0) {
    if (max === r) h = ((g - b) / d + 6) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h = h / 6
  }
  return [h, max > 0 ? d / max : 0, max]
}

function hsvToHex(h: number, s: number, v: number): string {
  const f = (n: number) => {
    const k = (n + h * 6) % 6
    const val = v - v * s * Math.max(0, Math.min(k, 4 - k, 1))
    return Math.round(val * 255).toString(16).padStart(2, '0')
  }
  return `#${f(5)}${f(3)}${f(1)}`
}

// Clamp sat/val so the picker never produces near-black (invisible in dark)
// or near-white grays (invisible in light). Saturated bright colors like yellow are fine.
function clampSV(s: number, v: number): [number, number] {
  const minV = 0.32                           // floor at 32% brightness — nothing near-black
  const maxVGray = s < 0.20 ? 0.84 : 1.0     // low-saturation grays capped at 84%
  return [s, Math.max(minV, Math.min(maxVGray, v))]
}

const accentCircleShadow = getCircleShadow

function ColorPickerPopup({ value, onChange, onClose, anchor }: {
  value: string
  onChange: (hex: string) => void
  onClose: () => void
  anchor: DOMRect | null
}) {
  const [h, s, v] = hexToHsv(value.startsWith('#') && value.length === 7 ? value : '#0d9488')
  const [cs0, cv0] = clampSV(s, v)
  const [hue, setHue] = useState(h)
  const [sat, setSat] = useState(cs0)
  const [val, setVal] = useState(cv0)
  const [hexInput, setHexInput] = useState(value)
  const svRef = useRef<HTMLDivElement>(null)
  const svCanvasRef = useRef<HTMLCanvasElement>(null)
  const hueRef = useRef<HTMLDivElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const hex = hsvToHex(hue, sat, val)
    setHexInput(hex)
    onChange(hex)
  }, [hue, sat, val]) // eslint-disable-line

  useEffect(() => {
    const canvas = svCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const w = canvas.width, h = canvas.height
    const gradH = ctx.createLinearGradient(0, 0, w, 0)
    gradH.addColorStop(0, '#fff')
    gradH.addColorStop(1, `hsl(${Math.round(hue * 360)},100%,50%)`)
    ctx.fillStyle = gradH
    ctx.fillRect(0, 0, w, h)
    const gradV = ctx.createLinearGradient(0, 0, 0, h)
    gradV.addColorStop(0, 'rgba(0,0,0,0)')
    gradV.addColorStop(1, 'rgba(0,0,0,1)')
    ctx.fillStyle = gradV
    ctx.fillRect(0, 0, w, h)
  }, [hue])

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [onClose])

  function dragSV(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    function move(ev: PointerEvent) {
      const rect = svRef.current!.getBoundingClientRect()
      const rawS = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width))
      const rawV = Math.max(0, Math.min(1, 1 - (ev.clientY - rect.top) / rect.height))
      const [cs, cv] = clampSV(rawS, rawV)
      setSat(cs); setVal(cv)
    }
    move(e.nativeEvent as PointerEvent)
    e.currentTarget.addEventListener('pointermove', move as EventListener)
    e.currentTarget.addEventListener('pointerup', () => {
      e.currentTarget.removeEventListener('pointermove', move as EventListener)
    }, { once: true })
  }

  function dragHue(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    function move(ev: PointerEvent) {
      const rect = hueRef.current!.getBoundingClientRect()
      setHue(Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width)))
    }
    move(e.nativeEvent as PointerEvent)
    e.currentTarget.addEventListener('pointermove', move as EventListener)
    e.currentTarget.addEventListener('pointerup', () => {
      e.currentTarget.removeEventListener('pointermove', move as EventListener)
    }, { once: true })
  }

  const pureHue = `hsl(${Math.round(hue * 360)},100%,50%)`
  const currentHex = hsvToHex(hue, sat, val)
  const contrastCheck = getContrastColor(currentHex)

  const top = anchor ? Math.min(anchor.bottom + 8, window.innerHeight - 320) : 100
  const left = anchor ? Math.max(8, Math.min(anchor.left, window.innerWidth - 272)) : 100

  return createPortal(
    <div ref={popupRef} style={{
      position: 'fixed', top, left, zIndex: 99999,
      width: 264, borderRadius: 16, boxSizing: 'border-box',
      background: 'var(--color-bg-2)', border: '1px solid var(--color-border-glass)',
      boxShadow: '0 16px 48px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.18)',
      padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {/* SV canvas */}
      <div ref={svRef} onPointerDown={dragSV}
        style={{
          position: 'relative', height: 160, borderRadius: 10, cursor: 'crosshair', userSelect: 'none',
          overflow: 'hidden',
        }}>
        <canvas ref={svCanvasRef} width={232} height={160}
          style={{ display: 'block', width: '100%', height: '100%', borderRadius: 10, pointerEvents: 'none' }} />
        <div style={{
          position: 'absolute', width: 16, height: 16, borderRadius: '50%',
          border: '2.5px solid #fff', boxShadow: '0 0 0 1.5px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.4)',
          transform: 'translate(-50%,-50%)',
          left: `${sat * 100}%`, top: `${(1 - val) * 100}%`,
          pointerEvents: 'none', background: currentHex,
        }} />
      </div>

      {/* Hue slider + preview */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div ref={hueRef} onPointerDown={dragHue}
          style={{
            flex: 1, height: 20, borderRadius: 999, cursor: 'pointer', userSelect: 'none', position: 'relative',
            background: 'linear-gradient(to right,#ff0000,#ff8800,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff,#ff0000)',
          }}>
          <div style={{
            position: 'absolute', width: 22, height: 22, borderRadius: '50%',
            border: '2.5px solid #fff', boxShadow: '0 0 0 1.5px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.3)',
            background: pureHue,
            top: '50%', left: `${hue * 100}%`,
            transform: 'translate(-50%,-50%)',
            pointerEvents: 'none',
          }} />
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: currentHex,
          border: '2px solid var(--color-border-medium)',
          boxShadow: `0 0 0 3px ${currentHex}33`,
        }} />
      </div>

      {/* Hex input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, boxSizing: 'border-box' }}>
        <div style={{ width: 20, height: 20, borderRadius: 5, background: currentHex, flexShrink: 0, border: '1px solid var(--color-border-medium)' }} />
        <input value={hexInput}
          onChange={e => {
            setHexInput(e.target.value)
            const v = e.target.value
            if (/^#[0-9a-fA-F]{6}$/.test(v)) {
              const [nh, ns, nv] = hexToHsv(v)
              const [cs, cv] = clampSV(ns, nv)
              setHue(nh); setSat(cs); setVal(cv)
            }
          }}
          style={{
            width: 100, minWidth: 0, padding: '6px 8px', borderRadius: 8, border: '1.5px solid var(--color-border-medium)',
            background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 12,
            fontFamily: 'monospace', outline: 'none', letterSpacing: '0.05em', boxSizing: 'border-box',
          }}
          placeholder="#000000" maxLength={7}
          onFocus={e => e.target.select()}
        />
        <button onClick={onClose}
          style={{ width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer', background: currentHex, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Check size={13} strokeWidth={2.5} style={{ color: contrastCheck }} />
        </button>
      </div>
    </div>,
    document.body
  )
}

function DiagnosticSubjectPanel({ subject }: { subject: DiagSubject }) {
  const t = useT()
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
    void copyToClipboard(url).then(ok => {
      if (!ok) return
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
          <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>{questions.length} {t('вопросов')}</div>
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
          {copied ? t('Скопировано!') : t('Скопировать ссылку')}
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
                    onPaste={e => {
                      const text = e.clipboardData.getData('text/plain')
                      const parsed = parseSmartPaste(text)
                      if (parsed) {
                        e.preventDefault()
                        setEditText(parsed.question)
                        setEditOpts(parsed.options.length >= 4 ? parsed.options : [...parsed.options, ...Array(Math.max(0, 4 - parsed.options.length)).fill('')])
                        setEditCorrect(0)
                      }
                    }}
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
                    <button onClick={() => setEditIdx(null)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{t('Отмена')}</button>
                    <button onClick={commitEdit} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: accent, color: getContrastColor(accent), fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}><Check size={12} />{t('Сохранить')}</button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                    background: accent, color: getContrastColor(accent),
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, marginTop: 1,
                  }}>{idx + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text)', marginBottom: 3 }}>{q.text}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>
                      ✓ {q.options[q.correct]}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => startEdit(idx)} style={{ padding: '4px 8px', borderRadius: 7, border: '1px solid var(--color-border)', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{t('Ред.')}</button>
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
              {t('Сбросить к стандарту')}
            </button>
            <div style={{ fontSize: 11, color: 'var(--color-muted)', display: 'flex', alignItems: 'center', paddingLeft: 4 }}>
              {t('Ссылка диагностики:')}<br /><code style={{ fontSize: 10 }}>/#/diagnostic?subject={subject}</code>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StudentPickerModal({ onPick, onClose }: { onPick: (studentId: string, name: string) => void; onClose: () => void }) {
  const t = useT()
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
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>{t('Выбрать ученика')}</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'var(--color-bg-5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)' }}><X size={14} /></button>
        </div>
        <div style={{ padding: '12px 16px 8px' }}>
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("Поиск по имени…")}
            style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 11, border: '1.5px solid var(--color-border-medium)', background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
          />
        </div>
        <div style={{ maxHeight: 300, overflowY: 'auto', padding: '4px 10px 14px' }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 13, color: 'var(--color-muted)' }}>{t('Ученики не найдены')}</div>
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
  const t = useT()
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
            <span style={{ padding: '1px 7px', borderRadius: 6, background: accent, color: getContrastColor(accent), fontSize: 10, fontWeight: 700 }}>{subjectLabel}</span>
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
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 8, letterSpacing: 0.4 }}>{t('РЕЗУЛЬТАТЫ ПО РАЗДЕЛАМ')}</div>
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
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>{t('⚠ Слабые темы для проработки')}</div>
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
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 8, letterSpacing: 0.4 }}>{t('ОТВЕТЫ НА ВОПРОСЫ')}</div>
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
                                    <span style={{ color: 'var(--color-muted)' }}>{t('Верно:')}</span>
                                    <span style={{ fontWeight: 600, color: 'var(--color-text-2)' }}>{q.options[q.correct]}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{t('— нет ответа')}</div>
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
                      <Check size={13} strokeWidth={2.5} /> {linkedStudent?.name ?? t('Привязан')}
                    </div>
                    <button onClick={onUnlink} style={{ padding: '9px 14px', borderRadius: 10, border: 'none', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{t('Отвязать')}</button>
                  </>
                ) : (
                  <button
                    onClick={onLink}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, border: `1.5px solid ${accent}`, background: accent, color: getContrastColor(accent), fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit' }}
                  >
                    <Key size={13} strokeWidth={2.4} /> {t('Выбрать ученика')}
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
  const t = useT()
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
            <ArrowLeft size={15} strokeWidth={2} /> {t('Назад')}
          </motion.button>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--color-purple-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Target size={20} style={{ color: 'var(--color-accent)' }} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text)' }}>{t('Диагностическое тестирование')}</div>
            <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>{t('Скопируй ссылку и отправь ученику — результаты появятся здесь')}</div>
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
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>{t('Как это работает')}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-2)', lineHeight: 1.6 }}>
              {t('1. Скопируй ссылку нужного предмета')}<br />
              {t('2. Отправь ученику в мессенджере или через ДЗ')}<br />
              {t('3. Ученик вводит ФИО и проходит тест без регистрации')}<br />
              {t('4. Результаты появляются ниже — нажми «Выбрать ученика» чтобы привязать к профилю')}
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
            {t('Результаты тестирований')}
            {anonResults.length > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-accent)', background: 'var(--color-purple-soft)', borderRadius: 7, padding: '2px 8px' }}>
                {anonResults.length}
              </span>
            )}
            <button
              onClick={refreshResults}
              title={t("Обновить")}
              style={{
                marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 12px', borderRadius: 999, border: 'none', cursor: 'pointer',
                background: 'var(--color-bg-3)', color: 'var(--color-muted)',
                fontSize: 11, fontWeight: 600,
              }}
            >
              {t('↻ Обновить')}
            </button>
          </div>
          {anonResults.length === 0 ? (
            <div style={{
              padding: '24px', borderRadius: 16, border: '1.5px dashed var(--color-border-medium)',
              textAlign: 'center', color: 'var(--color-muted)', fontSize: 13,
            }}>
              {t('Ещё никто не прошёл тест. Скопируй ссылку выше и отправь ученику.')}
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
  const t = useT()
  const { label, accent, soft } = getSubjectMeta(subject)
  const [copied, setCopied] = useState(false)

  function copyLink() {
    void copyToClipboard(`${BASE_URL}#/diagnostic?subject=${subject}`)
      .then(ok => { if (!ok) return; setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    <div style={{ background: 'rgba(var(--glass-rgb), 0.95)', border: '1px solid var(--color-border)', borderRadius: 22, overflow: 'hidden' }}>
      {/* Table header toolbar */}
      <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--color-border-soft)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{label}</div>
          <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 1 }}>
            {results.length > 0 ? (results.length) + t(' прохождени') + (results.length === 1 ? t('е') : t('й')) : t('Ещё никто не прошёл')}
            &nbsp;·&nbsp;<span style={{ color: accent, fontWeight: 600 }}>{t('Второй клик = редактор')}</span>
          </div>
        </div>
        <button onClick={onRefresh} style={{ padding: '6px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'var(--color-bg-3)', color: 'var(--color-muted)', fontSize: 12, fontWeight: 600 }}>↻</button>
        <button onClick={copyLink} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 12, border: 'none', cursor: 'pointer', background: copied ? 'var(--color-green-soft)' : accent, color: copied ? 'var(--color-green-text)' : getContrastColor(accent), fontSize: 12, fontWeight: 700 }}>
          {copied ? <Check size={13} /> : <Link2 size={13} />}
          {copied ? t('Скопировано!') : t('Ссылка')}
        </button>
        <button onClick={onOpenEditor} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'var(--color-bg-3)', color: 'var(--color-text-2)', fontSize: 12, fontWeight: 700 }}>
          <Pencil size={13} /> {t('Редактор')}
        </button>
      </div>

      {results.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-muted)', fontSize: 13 }}>
          {t('Ещё никто не прошёл. Отправь ссылку ученику.')}
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--color-bg-3)' }}>
              {[t('Ученик'), t('Дата'), t('Результат'), t('Разделы (слабые)'), t('Статус')].map((h, i) => (
                <th key={h} style={{ padding: '9px 16px', textAlign: i >= 2 ? 'center' : 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', whiteSpace: 'nowrap', borderBottom: '1px solid var(--color-border-soft)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => {
              const sections = Object.entries(r.results ?? {})
              const totalC = sections.reduce((s, [, v]) => s + v.correct, 0)
              const totalQ = sections.reduce((s, [, v]) => s + v.total, 0)
              const pct = totalQ ? Math.round((totalC / totalQ) * 100) : 0
              const pctColor = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444'
              const weak = sections.filter(([, v]) => v.total > 0 && v.correct / v.total < 0.5).map(([k]) => k)
              const date = new Date(r.timestamp).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
              const initials = (r.name ?? '').split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
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
                        {r.linkedStudentId && <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}><Check size={9} /> {t('привязан')}</div>}
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
                        ? <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 600 }}>{t('Всё ок')}</span>
                        : weak.slice(0, 3).map(s => (
                            <span key={s} style={{ fontSize: 9, padding: '2px 7px', borderRadius: 6, background: '#ef444420', color: '#ef4444', fontWeight: 600 }}>{s}</span>
                          ))
                      }
                    </div>
                  </td>
                  <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                    {r.linkedStudentId
                      ? <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 7, background: 'var(--color-green-soft)', color: 'var(--color-green-text)', fontWeight: 700 }}>{t('Привязан')}</span>
                      : <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 7, background: 'var(--color-bg-3)', color: 'var(--color-muted)', fontWeight: 600 }}>{t('Аноним')}</span>
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
  const t = useT()
  const { accent, soft } = getSubjectMeta(result.subject)
  const Icon = getSubjectIcon(result.subject)
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
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{t('Общий результат')}</div>
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
              ? t('Уверенный результат') + (best ? t(' — особенно силён в разделе «') + best[0] + '» (' + bestPct + '%)' : '') + '.'
              : pct >= 65
              ? t('Хороший уровень') + (best ? t(', сильнее всего «') + best[0] + '»' : '') + (worst && worstPct < 70 ? t(', стоит подтянуть «') + worst[0] + '» (' + worstPct + '%)' : '') + '.'
              : pct >= 40
              ? t('Средний результат. ') + (worst ? t('Слабее всего показал себя в «') + worst[0] + '» (' + worstPct + t('%) — рекомендуется дополнительная проработка.') : '')
              : t('Низкий результат') + (worst ? t(' — особенно в разделе «') + worst[0] + '» (' + worstPct + '%)' : '') + t('. Нужна серьёзная работа над базой.')
            return (
              <div style={{ padding: '10px 14px', borderRadius: 12, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)', fontSize: 12, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
                {summary}
              </div>
            )
          })()}

          {/* Sections */}
          <div>
            <SectionHead>{t('Разбивка по разделам')}</SectionHead>
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
            <SectionHead>{t('Ученик')}</SectionHead>
            {linkedStudent ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 14, background: 'var(--color-green-soft)', border: '1px solid rgba(34,197,94,0.25)' }}>
                <Check size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{linkedStudent.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-green-text)' }}>{t('Привязан к профилю')}</div>
                </div>
                <button onClick={handleUnlink} style={{ padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.12)', color: '#ef4444', fontSize: 11, fontWeight: 700 }}>{t('Отвязать')}</button>
              </div>
            ) : (
              <button
                onClick={() => setPickerOpen(true)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '12px', borderRadius: 14, border: `1.5px dashed ${accent}55`, cursor: 'pointer', background: accent, color: getContrastColor(accent), fontSize: 13, fontWeight: 700 }}
              >
                <GraduationCap size={15} /> {t('Назначить ученика')}
              </button>
            )}
          </div>

          {/* Delete */}
          <button onClick={handleDelete} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'var(--color-red-soft)', color: 'var(--color-red-text)', fontSize: 12, fontWeight: 700 }}>
            <Trash2 size={13} /> {t('Удалить результат')}
          </button>
        </div>
      </motion.div>
    </>
  )
}

// ─── Date/time picker helpers ─────────────────────────────────────────────────
const RU_MONTHS_SHORT = [t('Янв'),t('Фев'),t('Мар'),t('Апр'),t('Май'),t('Июн'),t('Июл'),t('Авг'),t('Сен'),t('Окт'),t('Ноя'),t('Дек')]
const RU_MONTHS_FULL  = [t('Январь'),t('Февраль'),t('Март'),t('Апрель'),t('Май'),t('Июнь'),t('Июль'),t('Август'),t('Сентябрь'),t('Октябрь'),t('Ноябрь'),t('Декабрь')]
const RU_DAYS_SHORT   = [t('Пн'),t('Вт'),t('Ср'),t('Чт'),t('Пт'),t('Сб'),t('Вс')]

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

function DiagCalendarPicker({ value, onChange, onClose, anchorRef, accent = 'var(--color-accent)', soft = 'var(--color-purple-soft)' }: { value: string; onChange: (v: string) => void; onClose: () => void; anchorRef?: React.RefObject<HTMLElement | null>; accent?: string; soft?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const pos = useAnchoredPos(anchorRef, 252)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && !(anchorRef?.current && anchorRef.current.contains(e.target as Node))) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose, anchorRef])
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

  return createPortal(
    <motion.div ref={ref} initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.15 }}
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 4000, background: 'var(--color-bg-input)', border: '1.5px solid var(--color-border-glass)', borderRadius: 16, boxShadow: '0 12px 40px rgba(0,0,0,0.18)', padding: '12px 14px 14px', minWidth: 238, userSelect: 'none' }}>
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
              style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: sel ? 700 : 500, background: sel ? accent : tod ? soft : 'transparent', color: sel ? '#fff' : tod ? accent : 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.1s' }}>
              {d.getDate()}
            </button>
          )
        })}
      </div>
    </motion.div>,
    document.body
  )
}

function DiagTimePicker({ value, onChange, onClose, anchorRef, accent = 'var(--color-accent)' }: { value: string; onChange: (v: string) => void; onClose: () => void; anchorRef?: React.RefObject<HTMLElement | null>; accent?: string }) {
  const t = useT()
  const listRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pos = useAnchoredPos(anchorRef, 248)
  const [manual, setManual] = useState(value)
  const [fadeTop, setFadeTop] = useState(false)
  const [fadeBottom, setFadeBottom] = useState(true)
  const updateFades = useCallback(() => {
    const el = listRef.current
    if (!el) return
    setFadeTop(el.scrollTop > 2)
    setFadeBottom(el.scrollTop + el.clientHeight < el.scrollHeight - 2)
  }, [])
  useEffect(() => {
    const idx = TIME_SLOTS_DIAG.indexOf(value)
    if (idx !== -1 && listRef.current) (listRef.current.children[idx] as HTMLElement)?.scrollIntoView({ block: 'center' })
    updateFades()
  }, [value, updateFades])
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node) && !(anchorRef?.current && anchorRef.current.contains(e.target as Node))) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose, anchorRef])
  // Normalize loose input ("9", "9:5", "0930") into HH:MM, return null if not a valid time.
  function normalizeTime(raw: string): string | null {
    const s = raw.trim()
    let m = s.match(/^(\d{1,2}):(\d{1,2})$/)
    if (!m) { const d = s.match(/^(\d{2})(\d{2})$/); if (d) m = [d[0], d[1], d[2]] as any }
    if (!m) { const h = s.match(/^(\d{1,2})$/); if (h) m = [h[0], h[1], '00'] as any }
    if (!m) return null
    const hh = parseInt(m[1], 10), mm = parseInt(m[2], 10)
    if (hh > 23 || mm > 59) return null
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  }
  function commitManual() {
    const norm = normalizeTime(manual)
    if (norm) { onChange(norm); onClose() }
  }
  return createPortal(
    <motion.div ref={containerRef} initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.15 }}
      style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 4000, background: 'var(--color-bg-input)', border: '1.5px solid var(--color-border-glass)', borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.18)', overflow: 'hidden' }}>
      <div style={{ padding: 6, borderBottom: '1px solid var(--color-border)' }}>
        <input autoFocus value={manual} onChange={e => { const d = e.target.value.replace(/\D/g, '').slice(0, 4); setManual(d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`) }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitManual() } else if (e.key === 'Escape') onClose() }}
          onBlur={commitManual} placeholder={t("чч:мм")}
          style={{ width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', background: 'var(--color-bg-3)', color: 'var(--color-text)', padding: '7px 10px', borderRadius: 9, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', textAlign: 'center', letterSpacing: 0.5 }} />
      </div>
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        {fadeTop && <div style={{ position: 'absolute', top: -2, left: 0, right: 0, height: 30, zIndex: 1, background: 'linear-gradient(to bottom, var(--color-bg-input), transparent)', pointerEvents: 'none' }} />}
        {fadeBottom && <div style={{ position: 'absolute', bottom: -2, left: 0, right: 0, height: 30, zIndex: 1, background: 'linear-gradient(to top, var(--color-bg-input), transparent)', pointerEvents: 'none' }} />}
        <div ref={listRef} onScroll={updateFades} style={{ maxHeight: 200, overflowY: 'auto', padding: '4px 6px', scrollbarWidth: 'none' }}>
          {TIME_SLOTS_DIAG.map(t => {
            const active = t === value
            return (
              <button key={t} onClick={() => { onChange(t); onClose() }}
                style={{ width: '100%', border: 'none', background: active ? accent : 'transparent', color: active ? '#fff' : 'var(--color-text)', padding: '7px 10px', textAlign: 'left', fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer', display: 'block', borderRadius: 9, transition: 'background 0.18s, color 0.18s' }}>
                {t}
              </button>
            )
          })}
        </div>
      </div>
    </motion.div>,
    document.body
  )
}

// Anchors a fixed/portaled dropdown to a trigger element's rect, flipping up if it would overflow the viewport bottom.
function useAnchoredPos(anchorRef: React.RefObject<HTMLElement | null> | undefined, estHeight: number) {
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({ top: -9999, left: -9999, width: 0 })
  useLayoutEffect(() => {
    const el = anchorRef?.current
    if (!el) return
    const compute = () => {
      const r = el.getBoundingClientRect()
      const below = r.bottom + 6
      const flip = below + estHeight > window.innerHeight && r.top - 6 - estHeight > 0
      setPos({ top: flip ? r.top - 6 - estHeight : below, left: r.left, width: r.width })
    }
    compute()
    window.addEventListener('scroll', compute, true)
    window.addEventListener('resize', compute)
    return () => { window.removeEventListener('scroll', compute, true); window.removeEventListener('resize', compute) }
  }, [anchorRef, estHeight])
  return pos
}

// ─── DiagnosticEditorFullPage — 2-column: left=assignment, right=questions ────
type DiagEditorHandle = { saveDraft: () => void }
const DiagnosticEditorFullPage = forwardRef<DiagEditorHandle, {
  subject: DiagSubject; onClose: () => void
  groups: import('../../data/teacherMockData').Group[]
  allStudents: import('../../data/teacherMockData').Student[]
  assignments: TestAssignment[]
  onAssign: (a: Omit<TestAssignment, 'id' | 'createdAt'>) => void
  onDeleteAssignment: (id: string) => void
  initialChip?: string
  initialLabel?: string
  onColorChange?: (hex: string) => void
  onIconChange?: (iconKey: string) => void
  onLabelChange?: (newLabel: string) => void
  onChipChange?: (chip: string) => void
}>(function DiagnosticEditorFullPage({
  subject, onClose,
  groups, allStudents,
  assignments, onAssign, onDeleteAssignment,
  initialChip, initialLabel,
  onColorChange, onIconChange, onLabelChange, onChipChange,
}, ref) {
  const t = useT()
  const initialMeta = getSubjectMeta(subject)
  const isCustomTest = CUSTOM_META.has(subject)
  const [accentState, setAccentState] = useState(initialMeta.accent)
  const accent = accentState
  // Заливка кружка «верный вариант»: акцент подобран как цвет текста и рамок,
  // под белой галочкой давал 2.3:1 — берём затемнённый вариант.
  const accentFill = fillUnderWhite(accent)
  const soft = CREATOR_ACCENTS.find(a => a.hex === accent)?.soft ?? accent + '22'
  const [labelState, setLabelState] = useState(() =>
    initialLabel ?? (isCustomTest ? initialMeta.label : (loadBuiltinLabel(subject) || initialMeta.label))
  )
  const label = labelState
  const [iconKeyState, setIconKeyState] = useState(CUSTOM_META.get(subject)?.iconKey ?? 'FileText')
  const Icon = getIconByKey(iconKeyState) as React.ElementType
  const [chipState, setChipState] = useState(() =>
    initialChip ?? (isCustomTest ? t('Свой тест') : loadBuiltinChip(subject))
  )

  function handleChipChange(chip: string) {
    setChipState(chip)
    if (isCustomTest) {
      updateCustomTestChip(subject, chip)
    } else {
      saveBuiltinChip(subject, chip)
    }
    onChipChange?.(chip)
  }

  function handleIconChange(key: string) {
    setIconKeyState(key)
    CUSTOM_META.set(subject, { ...(CUSTOM_META.get(subject) ?? { label, accent, soft }), iconKey: key })
    onIconChange?.(key)
  }

  function handleColorChange(hex: string) {
    const hexSoft = CREATOR_ACCENTS.find(a => a.hex === hex)?.soft ?? hex + '22'
    setAccentState(hex)
    CUSTOM_META.set(subject, { label, accent: hex, soft: hexSoft })
    saveColorOverrideToDB(subject, hex)
    onColorChange?.(hex)
  }

  function handleLabelChange(newLabel: string) {
    setLabelState(newLabel)
    const meta = CUSTOM_META.get(subject)
    if (meta) CUSTOM_META.set(subject, { ...meta, label: newLabel })
  }

  function handleLabelBlur() {
    const trimmed = labelState.trim()
    if (!trimmed) { setLabelState(initialMeta.label); return }
    if (isCustomTest) {
      const meta = CUSTOM_META.get(subject)
      saveCustomTestMeta(subject, trimmed, accent, meta?.iconKey)
    } else {
      saveBuiltinLabel(subject, trimmed)
    }
    onLabelChange?.(trimmed)
  }
  const [showPicker, setShowPicker] = useState(false)
  const pickerBtnRef = useRef<HTMLButtonElement>(null)

  const [questions, setQuestions] = useState<DiagQuestion[]>(() => loadDiagQuestions(subject))
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [editOpts, setEditOpts] = useState<string[]>([])
  const [editCorrect, setEditCorrect] = useState(0)
  const [dirty, setDirty] = useState(false)
  const docked = useTeacher(s => s.headerDocked)
  const setDocked = useTeacher(s => s.setHeaderDocked)
  useEffect(() => () => setDocked(false), [])

  const qListRef = useRef<HTMLDivElement>(null)
  const [qListFade, setQListFade] = useState({ top: false, bottom: false })
  function updateQListFade() {
    const el = qListRef.current
    if (!el) return
    setQListFade({ top: el.scrollTop > 4, bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 4 })
  }
  useEffect(() => { updateQListFade() }, [questions.length])

  // ── Assignment panel state ──
  const [assignType, setAssignType] = useState<'test' | 'trial'>('test')
  const [assignRecipientMode, setAssignRecipientMode] = useState<'group' | 'student'>('group')
  const [assignGroupId, setAssignGroupId] = useState('')
  const [assignStudentId, setAssignStudentId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [calOpen, setCalOpen] = useState(false)
  const [timeOpen, setTimeOpen] = useState(false)
  const calAnchorRef = useRef<HTMLDivElement>(null)
  const timeAnchorRef = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [expandedAssignId, setExpandedAssignId] = useState<string | null>(null)
  const [assignResults, setAssignResults] = useState<AnonDiagResult[]>([])

  const thisAssignments = assignments.filter(a => a.subject === subject)

  useEffect(() => {
    if (expandedAssignId) loadAssignmentResults(expandedAssignId).then(setAssignResults)
    else setAssignResults([])
  }, [expandedAssignId])

  async function handleAssign() {
    if (!assignGroupId && !assignStudentId) return
    setSaving(true)
    await onAssign({
      title: (label) + ' · ' + (assignType === 'trial' ? t('Пробник') : t('Тест')),
      subject, assignType,
      groupIds: assignGroupId ? [assignGroupId] : [],
      studentIds: assignStudentId ? [assignStudentId] : [],
      dueDate: dueDate || undefined,
      closed: false,
    })
    setAssignGroupId(''); setAssignStudentId(''); setDueDate('')
    setSaving(false)
  }

  function copyLink() {
    void copyToClipboard(`${BASE_URL}#/diagnostic?subject=${subject}`)
      .then(ok => { if (!ok) return; setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  useEffect(() => { fetchDiagQuestions(subject).then(setQuestions) }, [subject])

  function save(qs: DiagQuestion[]) { setQuestions(qs); saveDiagQuestions(subject, qs); setDirty(false) }
  function startEdit(idx: number) { const q = questions[idx]; setEditIdx(idx); setEditText(q.text); setEditOpts([...q.options]); setEditCorrect(q.correct); setDirty(false) }
  function commitEdit() {
    if (editIdx === null) return
    save(questions.map((q, i) => i === editIdx ? { ...q, text: editText, options: editOpts, correct: editCorrect } : q))
    setEditIdx(null)
  }
  useImperativeHandle(ref, () => ({
    saveDraft() {
      if (editIdx !== null && dirty) {
        save(questions.map((q, i) => i === editIdx ? { ...q, text: editText, options: editOpts, correct: editCorrect } : q))
        setEditIdx(null)
      } else {
        saveDiagQuestions(subject, questions)
      }
    },
  }))
  function removeQuestion(idx: number) { save(questions.filter((_, i) => i !== idx)); if (editIdx === idx) setEditIdx(null) }
  function resetToDefault() { save(DEFAULT_QUESTIONS[subject]); setEditIdx(null) }
  function addQuestion() {
    const newQ: DiagQuestion = { id: `q-${Date.now()}`, section: questions[questions.length - 1]?.section ?? 'Раздел 1', text: '', options: ['', '', '', ''], correct: 0 }
    const next = [...questions, newQ]
    save(next)
    setEditIdx(next.length - 1); setEditText(''); setEditOpts(['', '', '', '']); setEditCorrect(0); setDirty(true)
  }

  const canAssign = !!assignGroupId || !!assignStudentId
  const [distMode, setDistMode] = useState<'assign' | 'link'>('assign')

  return (
    <motion.div
      key={`diag-editor-${subject}`}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onScroll={e => setDocked((e.currentTarget as HTMLElement).scrollTop > 64)}
      style={{ flex: 1, height: '100vh', overflowY: 'auto', scrollbarGutter: 'stable', paddingTop: 100 }}
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
                <ArrowLeft size={15} strokeWidth={2} /> {t('Назад')}
              </motion.button>
              <div style={{ padding: '9px 16px', borderRadius: 999, ...dockGlass, fontSize: 14, fontWeight: 700, color: 'var(--color-text)', pointerEvents: 'auto', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
          <ArrowLeft size={15} strokeWidth={2} /> {t('Назад')}
        </motion.button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: soft, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
            <Icon size={16} style={{ color: accent }} />
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>{label}</span>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={resetToDefault} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--color-border-soft)', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {t('Сбросить к стандарту')}
          </button>
        </div>
      </motion.div>

      {/* ── 2-column body ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, padding: '0 24px 48px' }}>

        {/* ── LEFT: assignment panel ──
             Колонка со своим скроллом (overflow режет), а карточки внутри — с
             тенью. Поэтому по краям запас, а отрицательные поля возвращают
             колонку ровно на место: тень рисуется в запас и не срезается
             линейкой. Сверху запас меньше — тень уходит вверх всего на ~8px, а
             широкая полоса перехватывала бы клики по кнопкам шапки. */}
        <div style={{
          width: 300 + 48, flexShrink: 0, position: 'sticky', top: 20 - 12, alignSelf: 'flex-start',
          margin: '-12px -24px -24px', padding: '12px 24px 24px',
          maxHeight: 'calc(100vh - 154px)', overflowY: 'auto', overscrollBehavior: 'contain',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>

          {/* 3-mode card */}
          <GlassCard style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Name — custom tests only */}
            {isCustomTest && (
              <div>
                <input
                  value={labelState}
                  onChange={e => handleLabelChange(e.target.value)}
                  onBlur={handleLabelBlur}
                  onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 11px', borderRadius: 10, border: `1.5px solid ${accent}66`, background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                />
              </div>
            )}

            {/* Color picker */}
            <div>
              <div style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', justifyContent: 'space-between' }}>
                {CREATOR_ACCENTS.map(a => (
                  <button key={a.hex} onClick={() => handleColorChange(a.hex)} title={a.hex}
                    style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: a.hex, cursor: 'pointer', outline: 'none', transition: 'box-shadow 0.15s', flexShrink: 0, boxShadow: accent === a.hex ? `0 0 0 2.5px var(--color-bg-2), 0 0 0 4.5px ${a.hex}` : 'none' }} />
                ))}
                <button ref={pickerBtnRef} title={t("Свой цвет")} onClick={() => setShowPicker(p => !p)}
                  style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: !CREATOR_ACCENTS.some(a => a.hex === accent) ? accent : 'var(--color-bg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s', boxShadow: !CREATOR_ACCENTS.some(a => a.hex === accent) ? `0 0 0 2.5px var(--color-bg-2), 0 0 0 4.5px ${accent}` : 'none' }}>
                  <Plus size={14} style={{ color: !CREATOR_ACCENTS.some(a => a.hex === accent) ? getContrastColor(accent) : 'var(--color-muted)', pointerEvents: 'none' }} />
                </button>
                {showPicker && (
                  <ColorPickerPopup
                    value={accent}
                    onChange={handleColorChange}
                    onClose={() => setShowPicker(false)}
                    anchor={pickerBtnRef.current?.getBoundingClientRect() ?? null}
                  />
                )}
              </div>
            </div>

            {/* Icon picker */}
            <IconPickerField iconKey={iconKeyState} onChange={handleIconChange} accent={accent} />

            {/* Chip picker — custom tests only */}
            {isCustomTest && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 6 }}>{t('Тип теста')}</div>
                <ChipPicker value={chipState} onChange={handleChipChange} fallbackAccent={accent} />
              </div>
            )}

            {/* Mode tabs */}
            <div style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 12, background: 'var(--color-bg-3)' }}>
              {([
                { id: 'assign', icon: Target, label: t('Назначить') },
                { id: 'link',   icon: Link2,  label: t('По ссылке') },
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
                  {(['test', 'trial'] as const).map(ty => (
                    <button key={ty} onClick={() => setAssignType(ty)}
                      style={{ flex: 1, padding: '7px 0', borderRadius: 9, border: 'none', outline: 'none', background: assignType === ty ? `${accent}20` : 'var(--color-bg-3)', color: assignType === ty ? accent : 'var(--color-text-3)', fontSize: 12, fontWeight: assignType === ty ? 700 : 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.13s' }}>
                      {ty === 'test' ? t('Контрольная') : t('Пробник')}
                    </button>
                  ))}
                </div>

                {/* Separator */}
                <div style={{ height: 1, background: 'var(--color-bg-3)', borderRadius: 1, margin: '2px 0' }} />

                {/* Recipient toggle + search */}
                <div style={{ display: 'flex', gap: 5 }}>
                  {(['group', 'student'] as const).map(m => (
                    <button key={m} onClick={() => { setAssignRecipientMode(m); setAssignGroupId(''); setAssignStudentId('') }}
                      style={{ flex: 1, padding: '7px 0', borderRadius: 9, border: 'none', outline: 'none', cursor: 'pointer', fontSize: 12,
                        fontWeight: assignRecipientMode === m ? 700 : 600,
                        background: assignRecipientMode === m ? `${accent}20` : 'var(--color-bg-3)',
                        color: assignRecipientMode === m ? accent : 'var(--color-muted)',
                        fontFamily: 'inherit', transition: 'all 0.15s' }}>
                      {m === 'group' ? t('Группе') : t('Студенту')}
                    </button>
                  ))}
                </div>
                {assignRecipientMode === 'group' ? (
                  <TeacherSelect value={assignGroupId} onChange={setAssignGroupId} placeholder={t("Выберите группу")}
                    options={groups.map(g => ({ value: g.id, label: g.name }))} />
                ) : (
                  <TeacherSelect value={assignStudentId} onChange={setAssignStudentId} placeholder={t("Выберите студента")}
                    options={allStudents.map(s => ({ value: s.id, label: s.name }))} />
                )}

                {/* Due date + time */}
                <div style={{ display: 'flex', gap: 6 }}>
                    {/* Calendar trigger */}
                    <div ref={calAnchorRef} style={{ position: 'relative', flex: 1 }}>
                      <button onClick={() => { setCalOpen(o => !o); setTimeOpen(false) }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px', borderRadius: 9, border: 'none', outline: 'none', background: calOpen ? `${accent}18` : 'var(--color-bg-input)', color: dueDate ? 'var(--color-text)' : 'var(--color-text-3)', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', fontWeight: dueDate ? 600 : 400, transition: 'background 0.15s' }}>
                        <Calendar size={13} style={{ flexShrink: 0, color: accent }} />
                        <span style={{ flex: 1, textAlign: 'left' }}>{dueDate ? formatDateDisplay(dueDate) : t('Дата')}</span>
                        {dueDate && <button onClick={e => { e.stopPropagation(); setDueDate('') }} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: 'var(--color-text-3)', lineHeight: 1, fontSize: 13, display: 'flex' }}>×</button>}
                      </button>
                      <AnimatePresence>
                        {calOpen && <DiagCalendarPicker value={dueDate} onChange={v => { setDueDate(v); setCalOpen(false) }} onClose={() => setCalOpen(false)} anchorRef={calAnchorRef} accent={accent} soft={soft} />}
                      </AnimatePresence>
                    </div>
                    {/* Time trigger */}
                    <div ref={timeAnchorRef} style={{ position: 'relative', width: 80 }}>
                      <button onClick={() => { setTimeOpen(o => !o); setCalOpen(false) }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 5, padding: '8px 8px', borderRadius: 9, border: 'none', outline: 'none', background: timeOpen ? `${accent}18` : 'var(--color-bg-input)', color: dueTime ? 'var(--color-text)' : 'var(--color-text-3)', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', fontWeight: dueTime ? 600 : 400, transition: 'background 0.15s' }}>
                        <Clock size={13} style={{ flexShrink: 0, color: accent }} />
                        <span>{dueTime || t('Время')}</span>
                      </button>
                      <AnimatePresence>
                        {timeOpen && <DiagTimePicker value={dueTime} onChange={v => { setDueTime(v); setTimeOpen(false) }} onClose={() => setTimeOpen(false)} anchorRef={timeAnchorRef} accent={accent} />}
                      </AnimatePresence>
                    </div>
                  </div>

                <button onClick={handleAssign} disabled={saving || !canAssign}
                  style={{ padding: '10px', borderRadius: 11, border: 'none', background: canAssign ? accent : 'var(--color-bg-5)', color: canAssign ? '#fff' : 'var(--color-text-3)', fontSize: 13, fontWeight: 700, cursor: canAssign ? 'pointer' : 'not-allowed', fontFamily: 'inherit', transition: 'all 0.13s' }}>
                  {saving ? t('Назначаем…') : t('Назначить тест')}
                </button>
              </>
            )}

            {/* ── Mode: По ссылке (новый ученик) ── */}
            {distMode === 'link' && (
              <>
                <div style={{ fontSize: 12, color: 'var(--color-text-3)', lineHeight: 1.5 }}>
                  {t('Человек проходит тест по ссылке, вводит имя и появляется в таблице результатов. Подходит для первичной диагностики.')}
                </div>
                <button onClick={copyLink}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px 14px', borderRadius: 11, cursor: 'pointer', border: 'none', outline: 'none', fontFamily: 'inherit', background: copied ? 'var(--color-green-soft)' : soft, color: copied ? 'var(--color-green-text)' : accent, fontSize: 13, fontWeight: 700, transition: 'all 0.18s' }}>
                  {copied ? <Check size={14} /> : <Link2 size={14} />}
                  {copied ? t('Ссылка скопирована!') : t('Копировать ссылку')}
                </button>
                <div style={{ fontSize: 11, color: 'var(--color-muted)', textAlign: 'center' }}>
                  {t('После прохождения результат появится в таблице ниже')}
                </div>
              </>
            )}

          </GlassCard>

          {/* Existing assignments for this test */}
          {thisAssignments.length > 0 && (
            <GlassCard style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                {t('Назначения (')}{thisAssignments.length})
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
                          {a.dueDate && <span>{t('до')} {a.dueDate}</span>}
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
                          <div style={{ fontSize: 11, color: 'var(--color-muted)', padding: '6px 10px' }}>{t('Никто ещё не сдал')}</div>
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

        {/* ── CENTER+RIGHT: editor + question list ── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 16, alignItems: 'flex-start' }}>

          {/* Question editor */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Ремоунт по key, без AnimatePresence: `mode="wait"` умеет навсегда
                залипнуть (сигнал «выход завершён» теряется — см. onExit в
                AnimatePresence/index.mjs), и редактор вопроса встал бы пустым
                до F5. Анимация только входа — ждать выхода незачем. */}
            <motion.div
              key={editIdx !== null ? `edit-${editIdx}` : 'preview'}
              initial={{ opacity: 0, y: editIdx !== null ? 8 : 0 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              style={editIdx !== null ? undefined : { display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              {editIdx !== null ? (
                <>
                  <GlassCard style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: accent, color: getContrastColor(accent), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{editIdx + 1}</div>
                      <div style={{ flex: 1, fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>{t('Редактирование вопроса')}</div>
                      <button onClick={() => removeQuestion(editIdx)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 9, border: 'none', background: 'var(--color-red-soft)', color: 'var(--color-red-text)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        <X size={13} /> {t('Удалить')}
                      </button>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Текст вопроса')}</div>
                      <textarea
                        value={editText} onChange={e => { setEditText(e.target.value); setDirty(true) }} rows={4}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${accent}55`, background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.5 }}
                        onPaste={e => {
                          const text = e.clipboardData.getData('text/plain')
                          const parsed = parseSmartPaste(text)
                          if (parsed) {
                            e.preventDefault()
                            setEditText(parsed.question)
                            setEditOpts(parsed.options.length >= 4 ? parsed.options : [...parsed.options, ...Array(Math.max(0, 4 - parsed.options.length)).fill('')])
                            setEditCorrect(0)
                            setDirty(true)
                          }
                        }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Варианты ответов')} <span style={{ color: 'var(--color-muted)', fontWeight: 400, textTransform: 'none' }}>{t('— нажми кружок чтобы отметить правильный')}</span></div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {editOpts.map((opt, oi) => (
                          <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <button onClick={() => { setEditCorrect(oi); setDirty(true) }}
                              style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, cursor: 'pointer', border: `2px solid ${editCorrect === oi ? accentFill : 'var(--color-border-medium)'}`, background: editCorrect === oi ? accentFill : 'transparent', transition: 'all 0.14s', position: 'relative', boxShadow: editCorrect === oi ? accentCircleShadow(accentFill) : 'none' }}>
                              {editCorrect === oi && <Check size={13} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff', strokeWidth: 3 }} />}
                            </button>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', borderRadius: 12, border: `1.5px solid ${editCorrect === oi ? accent + '66' : 'var(--color-border-medium)'}`, background: editCorrect === oi ? soft : 'var(--color-bg-input)', overflow: 'hidden', transition: 'all 0.14s' }}>
                              <div style={{ width: 32, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: editCorrect === oi ? accent : 'var(--color-muted)', flexShrink: 0 }}>{String.fromCharCode(65 + oi)}</div>
                              <input value={opt} onChange={e => { const o = [...editOpts]; o[oi] = e.target.value; setEditOpts(o); setDirty(true) }}
                                style={{ flex: 1, padding: '10px 12px 10px 0', border: 'none', background: 'transparent', color: 'var(--color-text)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
                            </div>
                            {editOpts.length > 2 && (
                              <button onClick={() => { const o = editOpts.filter((_, i) => i !== oi); setEditOpts(o); if (editCorrect >= o.length) setEditCorrect(0); setDirty(true) }}
                                style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, cursor: 'pointer', border: 'none', background: 'var(--color-red-soft)', color: 'var(--color-red-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={13} />
                              </button>
                            )}
                          </div>
                        ))}
                        {editOpts.length < 6 && (
                          <button onClick={() => { setEditOpts([...editOpts, '']); setDirty(true) }}
                            style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 9, border: `1px dashed ${accent}66`, background: 'transparent', color: accent, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginTop: 2 }}>
                            <Plus size={13} /> {t('Добавить вариант')}
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
                      <button onClick={() => setEditIdx(null)} style={{ padding: '10px 20px', borderRadius: 12, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{t('Отмена')}</button>
                      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={commitEdit}
                        style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: accent, color: getContrastColor(accent), fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'inherit' }}>
                        <Check size={15} strokeWidth={2.5} /> {t('Сохранить вопрос')}
                      </motion.button>
                    </div>
                  </GlassCard>
                </>
              ) : (
                <>
                  {/* Preview header — full read-only run-through before sending / assigning */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '2px 2px 2px' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: soft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={20} style={{ color: accent }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>{t('Превью теста «')}{label}»</div>
                      <div style={{ fontSize: 12.5, color: 'var(--color-muted)' }}>
                        {questions.length} {t('вопросов · нажми вопрос справа, чтобы редактировать')}
                      </div>
                    </div>
                  </div>

                  {questions.length === 0 ? (
                    <GlassCard style={{ padding: '40px 24px', textAlign: 'center', fontSize: 13, color: 'var(--color-muted)' }}>
                      {t('Пока нет вопросов — добавь первый справа.')}
                    </GlassCard>
                  ) : (
                    questions.map((q, idx) => (
                      <GlassCard key={q.id} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${accent}22`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{idx + 1}</div>
                          <div style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.5, paddingTop: 3 }}>{q.text || t('Без текста')}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 40 }}>
                          {q.options.map((opt, oi) => {
                            const isCorrect = q.correct === oi
                            return (
                              <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 10, borderRadius: 11, border: 'none', background: isCorrect ? soft : 'var(--color-bg-input)', padding: '9px 12px' }}>
                                <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, border: `2px solid ${isCorrect ? accentFill : 'var(--color-border-medium)'}`, background: isCorrect ? accentFill : 'transparent', position: 'relative', boxShadow: isCorrect ? accentCircleShadow(accentFill) : 'none' }}>
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
                </>
              )}
            </motion.div>
          </div>

          {/* Question list — sticky on the right */}
          <div style={{ width: 260, flexShrink: 0, position: 'sticky', top: 20, alignSelf: 'flex-start', height: 'calc(100vh - 190px)' }}>
            <GlassCard style={{ padding: 12, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', gap: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', padding: '2px 4px 8px', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>
                {questions.length} {t('вопросов')}
              </div>

              {/* Scrollable list with fades */}
              <div style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                {/* top fade */}
                <div style={{ position: 'absolute', top: -2, left: 0, right: 0, height: 30, background: 'linear-gradient(to bottom, var(--color-bg-card, var(--color-bg-2)), transparent)', pointerEvents: 'none', zIndex: 2, opacity: qListFade.top ? 1 : 0, transition: 'opacity 0.18s' }} />
                {/* bottom fade */}
                <div style={{ position: 'absolute', bottom: -2, left: 0, right: 0, height: 30, background: 'linear-gradient(to top, var(--color-bg-card, var(--color-bg-2)), transparent)', pointerEvents: 'none', zIndex: 2, opacity: qListFade.bottom ? 1 : 0, transition: 'opacity 0.18s' }} />

                <div ref={qListRef} onScroll={updateQListFade} style={{ height: '100%', overflowY: 'auto', overscrollBehavior: 'contain', display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 2 }}>
                  {questions.map((q, idx) => (
                    <button key={q.id} onClick={() => editIdx === idx ? setEditIdx(null) : startEdit(idx)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 8px', borderRadius: 10, border: 'none', cursor: 'pointer', background: editIdx === idx ? soft : 'transparent', color: editIdx === idx ? accent : 'var(--color-text)', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.12s' }}>
                      <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, background: editIdx === idx ? accent : `${accent}22`, color: editIdx === idx ? getContrastColor(accent) : accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>{idx + 1}</div>
                      <div style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: editIdx === idx ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.text || t('Без текста')}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Always-visible add button */}
              <button onClick={addQuestion}
                style={{ marginTop: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '8px', borderRadius: 10, border: `1.5px dashed ${accent}66`, background: 'transparent', color: accent, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Plus size={13} /> {t('Добавить вопрос')}
              </button>
            </GlassCard>
          </div>
        </div>
      </div>
    </motion.div>
  )
})

// ─── Screening Editor Full Page ───────────────────────────────────────────────
const SCR_ACC = '#f59e0b'
const SCR_SOFT = 'rgba(245,158,11,0.11)'

const RULE_LABELS: Record<MatrixRuleKey, string> = {
  shape: t('Форма'), size: t('Размер'), fill: t('Заливка'),
  rotation: t('Поворот'), count: t('Количество'), distribute3: t('Латинский квадрат'), xor: 'XOR',
}
const ALL_RULES: MatrixRuleKey[] = ['shape','size','fill','rotation','count','distribute3','xor']

const SERIES_LABELS: Record<SeriesType, string> = {
  arithmetic: t('Арифметика'), geometric: t('Геометрия'),
  fibonacci: t('Фибоначчи'), alternating: t('Чередование'), letters: t('Буквы'),
}
const ALL_SERIES: SeriesType[] = ['arithmetic','geometric','fibonacci','alternating','letters']

function ScrToggle({ on, label, onChange }: { on: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '9px 15px',
        borderRadius: 10, border: 'none',
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
        style={{ width: 90, padding: '9px 12px', borderRadius: 10, border: 'none', background: SCR_SOFT, color: 'var(--color-text)', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', outline: 'none' }}
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
              style={{ padding: '6px 13px', borderRadius: 8, border: 'none', background: on ? SCR_SOFT : 'var(--color-bg-3)', color: on ? SCR_ACC : 'var(--color-text-3)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.13s' }}>
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
  const t = useT()
  const dom = cfg[domainKey]
  const p = (patch: Record<string, unknown>) => onPatch(domainKey, patch)
  const row: React.CSSProperties = { display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }

  // common: count + adaptiveStopFails
  const commonCount = (
    <div style={row}>
      {'count' in dom && (
        <ScrNumInput label={t("Кол-во вопросов")} value={(dom as { count: number }).count} min={1} max={40} onChange={v => p({ count: v })} />
      )}
      {dom.adaptive && (
        <ScrNumInput label={t("Стоп после N ошибок")} value={dom.adaptiveStopFails} min={1} max={5} onChange={v => p({ adaptiveStopFails: v })} />
      )}
    </div>
  )

  if (domainKey === 'matrices') {
    const m = cfg.matrices
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {commonCount}
        <div style={row}>
          <ScrNumInput label={t("Мин. уровень")} value={m.minLevel} min={1} max={5} onChange={v => p({ minLevel: v })} />
          <ScrNumInput label={t("Макс. уровень")} value={m.maxLevel} min={1} max={5} onChange={v => p({ maxLevel: v })} />
        </div>
        <ScrPills label={t("Правила генерации")} all={ALL_RULES} active={m.rules} labelMap={RULE_LABELS}
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
          <ScrNumInput label={t("Мин. уровень")} value={s.minLevel} min={1} max={5} onChange={v => p({ minLevel: v })} />
          <ScrNumInput label={t("Макс. уровень")} value={s.maxLevel} min={1} max={5} onChange={v => p({ maxLevel: v })} />
        </div>
        <ScrPills label={t("Типы рядов")} all={ALL_SERIES} active={s.types} labelMap={SERIES_LABELS}
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
          <ScrNumInput label={t("Мин. уровень")} value={ro.minLevel} min={1} max={5} onChange={v => p({ minLevel: v })} />
          <ScrNumInput label={t("Макс. уровень")} value={ro.maxLevel} min={1} max={5} onChange={v => p({ maxLevel: v })} />
        </div>
      </div>
    )
  }

  if (domainKey === 'memory') {
    const mem = cfg.memory
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={row}>
          <ScrNumInput label={t("Мин. спан")} value={mem.minSpan} min={2} max={10} onChange={v => p({ minSpan: v })} />
          <ScrNumInput label={t("Макс. спан")} value={mem.maxSpan} min={2} max={12} onChange={v => p({ maxSpan: v })} />
          <ScrNumInput label={t("Вспышка (мс)")} value={mem.flashMs} min={200} max={2000} step={50} onChange={v => p({ flashMs: v })} />
        </div>
        <ScrToggle on={mem.backward} label={t("Обратный порядок")} onChange={v => p({ backward: v })} />
        {dom.adaptive && (
          <ScrNumInput label={t("Стоп после N ошибок")} value={dom.adaptiveStopFails} min={1} max={5} onChange={v => p({ adaptiveStopFails: v })} />
        )}
      </div>
    )
  }

  if (domainKey === 'stroop') {
    const st = cfg.stroop
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={row}>
          <ScrNumInput label={t("Кол-во попыток")} value={st.trials} min={4} max={40} onChange={v => p({ trials: v })} />
          <ScrNumInput label={t("Дедлайн (мс, 0=нет)")} value={st.deadlineMs} min={0} max={10000} step={100} onChange={v => p({ deadlineMs: v })} />
          <ScrNumInput label={t("Конгруэнтных (%)")} value={Math.round(st.congruentRatio * 100)} min={0} max={100} onChange={v => p({ congruentRatio: v / 100 })} />
        </div>
        <ScrToggle on={st.measureRT} label={t("Измерять время реакции")} onChange={v => p({ measureRT: v })} />
        <ScreeningColorEditor colors={st.colors} onChange={colors => p({ colors })} />
      </div>
    )
  }

  if (domainKey === 'speed') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <ScrNumInput label={t("Длительность (сек)")} value={cfg.speed.durationSec} min={10} max={180} onChange={v => p({ durationSec: v })} />
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
  const t = useT()
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
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{t('Пул аналогий (')}{items.length})</div>
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
                <input value={eans} onChange={e => setEans(e.target.value)} placeholder={t("Ответ")} style={{ ...inputStyle, maxWidth: 120 }} />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input value={edist} onChange={e => setEdist(e.target.value)} placeholder={t("Дистракторы через запятую")} style={{ ...inputStyle }} />
                <div style={{ width: 110, flexShrink: 0 }}>
                  <TeacherSelect
                    value={String(elv)}
                    onChange={v => setElv(Number(v))}
                    options={[1,2,3,4,5].map(l => ({ value: String(l), label: `${t('Ур.')} ${l}` }))}
                    clearable={false}
                    small
                    accent={SCR_ACC}
                    accentBg={SCR_SOFT}
                    triggerStyle={{ padding: '7px 10px', borderRadius: 9, border: `1.5px solid ${SCR_ACC}44`, background: 'var(--color-bg-input)', fontSize: 13 }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setEditId(null)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{t('Отмена')}</button>
                <button onClick={() => onChange(items.filter(i => i.id !== it.id))} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: 'var(--color-red-soft)', color: 'var(--color-red-text)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{t('Удалить')}</button>
                <button onClick={commitEdit} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: SCR_ACC, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{t('Сохранить')}</button>
              </div>
            </div>
          ) : (
            <button onClick={() => startEdit(it)} style={{ width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, background: `${SCR_ACC}22`, color: SCR_ACC, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>{idx + 1}</div>
              <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {it.a} → {it.b} | {it.c} → <b>{it.answer || '?'}</b>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: SCR_ACC, background: SCR_SOFT, borderRadius: 6, padding: '2px 7px', flexShrink: 0 }}>{t('Ур.')} {it.level}</span>
            </button>
          )}
        </div>
      ))}
      <button onClick={addItem} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 10, border: `1.5px dashed ${SCR_ACC}66`, background: 'transparent', color: SCR_ACC, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
        <Plus size={14} /> {t('Добавить аналогию')}
      </button>
    </div>
  )
}

// Stroop color editor
function ScreeningColorEditor({ colors, onChange }: { colors: { name: string; hex: string }[]; onChange: (v: { name: string; hex: string }[]) => void }) {
  const t = useT()
  const inputStyle: React.CSSProperties = { padding: '7px 10px', borderRadius: 9, border: `1.5px solid ${SCR_ACC}44`, background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{t('Цвета Струпа')}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {colors.map((c, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: c.hex, flexShrink: 0, border: '1px solid rgba(0,0,0,0.1)' }} />
            <input value={c.name} onChange={e => { const next = [...colors]; next[i] = { ...c, name: e.target.value }; onChange(next) }}
              placeholder={t("НАЗВАНИЕ")} style={{ ...inputStyle, width: 140 }} />
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
          <Plus size={13} /> {t('Добавить цвет')}
        </button>
      </div>
    </div>
  )
}

// Matching tasks editor
function ScreeningMatchEditor({ tasks, onChange }: { tasks: MatchTask[]; onChange: (v: MatchTask[]) => void }) {
  const t = useT()
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
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{t('Задания на сопоставление (')}{tasks.length})</div>
      {tasks.map((task, ti) => (
        <div key={task.id} style={{ borderRadius: 12, border: `1px solid ${openId === task.id ? SCR_ACC : 'var(--color-border)'}`, background: 'var(--color-bg-2)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer' }} onClick={() => setOpenId(openId === task.id ? null : task.id)}>
            <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, background: `${SCR_ACC}22`, color: SCR_ACC, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>{ti + 1}</div>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title || t('Без названия')}</div>
            <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>{task.pairs.length} {t('пар')}</span>
            {openId === task.id ? <ChevronUp size={15} style={{ color: SCR_ACC, flexShrink: 0 }} /> : <ChevronDown size={15} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />}
          </div>
          {openId === task.id && (
            <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--color-border-soft)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input value={task.title} onChange={e => updateTask(task.id, { title: e.target.value })}
                placeholder={t("Название задания")} style={{ ...inputStyle, marginTop: 10 }} />
              {task.pairs.map((pair, pi) => (
                <div key={pi} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input value={pair.left} onChange={e => updatePair(task.id, pi, 'left', e.target.value)} placeholder={t("Левая часть")} style={inputStyle} />
                  <span style={{ color: 'var(--color-muted)', fontSize: 14, flexShrink: 0 }}>→</span>
                  <input value={pair.right} onChange={e => updatePair(task.id, pi, 'right', e.target.value)} placeholder={t("Правая часть")} style={inputStyle} />
                  {task.pairs.length > 1 && (
                    <button onClick={() => removePair(task.id, pi)} style={{ padding: '5px', borderRadius: 7, border: 'none', background: 'var(--color-red-soft)', color: 'var(--color-red-text)', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                <button onClick={() => addPair(task.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: `1.5px dashed ${SCR_ACC}66`, background: 'transparent', color: SCR_ACC, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Plus size={13} /> {t('Пара')}
                </button>
                <button onClick={() => removeTask(task.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: 'none', background: 'var(--color-red-soft)', color: 'var(--color-red-text)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Trash2 size={13} /> {t('Удалить задание')}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
      <button onClick={addTask} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 10, border: `1.5px dashed ${SCR_ACC}66`, background: 'transparent', color: SCR_ACC, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
        <Plus size={14} /> {t('Добавить задание')}
      </button>
    </div>
  )
}

function ScreeningEditorFullPage({ onClose }: { onClose: () => void }) {
  const t = useT()
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
                <ArrowLeft size={15} strokeWidth={2} /> {t('Назад')}
              </motion.button>
              <div style={{ flexShrink: 1, minWidth: 0, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '9px 16px', borderRadius: 999, ...dg, fontSize: 14, fontWeight: 700, color: 'var(--color-text)', pointerEvents: 'auto' }}>
                {cfg.title || t('Скрининг мышления')}
              </div>
              <div style={{ flexGrow: 1 }} />
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleSave}
                style={{ ...savePillStyle, flexShrink: 0, pointerEvents: 'auto' }}>
                <Check size={14} strokeWidth={2.5} /> {saving ? t('Сохраняю…') : t('Сохранить')}
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
            <ArrowLeft size={15} strokeWidth={2} /> {t('Назад')}
          </motion.button>
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap' }}>
            {cfg.title || t('Скрининг мышления')}
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            <button onClick={resetToDefault} style={{ padding: '9px 16px', borderRadius: 999, border: '1px solid var(--color-border-soft)', background: 'rgba(var(--glass-rgb),0.96)', color: 'var(--color-text-3)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {t('Сбросить к стандарту')}
            </button>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleSave} style={savePillStyle}>
              <Check size={14} strokeWidth={2.5} /> {saving ? t('Сохраняю…') : dirty ? t('Сохранить') : t('Сохранено')}
            </motion.button>
          </div>
        </motion.div>

        {/* Body */}
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>

          {/* LEFT: domain list */}
          <div style={{ padding: '0 0 20px 24px', flexShrink: 0, position: 'sticky', top: 110, alignSelf: 'flex-start' }}>
            <GlassCard style={{ width: 230, boxSizing: 'border-box', padding: 12, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', padding: '2px 4px 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {activeDomains(cfg).length} {t('из')} {cfg.order.length} {t('активных')}
              </div>
              <button onClick={() => setSelectedDomain('meta')}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 10, border: 'none', cursor: 'pointer', background: selectedDomain === 'meta' ? SCR_SOFT : 'transparent', color: selectedDomain === 'meta' ? SCR_ACC : 'var(--color-text)', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.12s', marginBottom: 4 }}>
                <Settings size={17} strokeWidth={2} style={{ flexShrink: 0, color: selectedDomain === 'meta' ? SCR_ACC : 'var(--color-text-2)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: selectedDomain === 'meta' ? 700 : 500 }}>{t('Общие настройки')}</div>
                  <div style={{ fontSize: 10, color: selectedDomain === 'meta' ? SCR_ACC : 'var(--color-muted)', marginTop: 1 }}>{t('Название, описание')}</div>
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
                      <div style={{ fontSize: 10, color: d.enabled ? (isSel ? SCR_ACC : 'var(--color-muted)') : 'var(--color-text-3)', marginTop: 1 }}>{d.enabled ? t('активен') : t('выключен')}</div>
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
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text)' }}>{t('Общие настройки')}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Название теста')}</div>
                      <input
                        value={cfg.title}
                        onChange={e => patchMeta({ title: e.target.value })}
                        placeholder={t("Название скрининга…")}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 12, border: `1.5px solid ${SCR_ACC}66`, background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 15, fontWeight: 600, fontFamily: 'inherit', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Описание')}</div>
                      <textarea
                        value={cfg.description ?? ''}
                        onChange={e => patchMeta({ description: e.target.value })}
                        rows={4}
                        placeholder={t("Краткое описание, для кого и зачем этот тест…")}
                        style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 12, border: `1.5px solid ${SCR_ACC}44`, background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.6 }}
                      />
                    </div>
                    <div style={{ padding: 14, borderRadius: 12, background: SCR_SOFT, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: SCR_ACC }}>{t('Как работает скрининг')}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-2)', lineHeight: 1.6 }}>
                        {t('Включи или выключи нужные домены в списке слева. Для каждого домена настрой количество заданий, адаптивность и диапазон уровней. Порядок доменов в списке — порядок прохождения.')}
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
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Включение')}</div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <ScrToggle on={dom.enabled} label={dom.enabled ? t('Домен включён') : t('Домен выключен')}
                        onChange={v => patchDomain(selectedDomain as DomainKey, { enabled: v })} />
                      <ScrToggle on={dom.adaptive} label={dom.adaptive ? t('Адаптивный') : t('Фиксированный')}
                        onChange={v => patchDomain(selectedDomain as DomainKey, { adaptive: v })} />
                    </div>
                  </div>

                  {/* Domain-specific */}
                  <ScreeningDomainEditor domainKey={selectedDomain as DomainKey} cfg={cfg} onPatch={patchDomain} />

                  {/* Methodology — what this block measures, how it works, what it determines */}
                  <div style={{ borderTop: '1px solid var(--color-border-soft)', paddingTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: '50%', border: `1.5px solid ${SCR_ACC}`, color: SCR_ACC, fontSize: 10, fontStyle: 'italic', fontWeight: 800 }}>i</span>
                      {t('Методология')}
                    </div>
                    {([
                      [t('Как устроено'), info!.how],
                      [t('Что определяет'), info!.determines],
                      [t('Научная основа'), info!.science],
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
  matrices:  { short: t('Матрицы'),   emoji: '🧩' },
  series:    { short: t('Серии'),     emoji: '📈' },
  analogies: { short: t('Аналогии'),  emoji: '🔀' },
  rotation:  { short: t('Вращение'),  emoji: '🔁' },
  memory:    { short: t('Память'),    emoji: '🧠' },
  stroop:    { short: t('Струп'),     emoji: '🎨' },
  speed:     { short: t('Скорость'),  emoji: '⚡' },
  matching:  { short: t('Связи'),     emoji: '🔗' },
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
function DiagnosticTestCreator({ onSave, onCancel, groups, allStudents, onAssign }: {
  onSave: (id: string, label: string, accent: string, iconKey: string) => void
  onCancel: () => void
  groups: import('../../data/teacherMockData').Group[]
  allStudents: import('../../data/teacherMockData').Student[]
  onAssign: (a: Omit<TestAssignment, 'id' | 'createdAt'>) => Promise<void>
}) {
  const t = useT()
  const [title, setTitle] = useState('')
  const [accent, setAccent] = useState(CREATOR_ACCENTS[0].hex)
  const [iconKey, setIconKey] = useState('FileText')
  const [showPicker2, setShowPicker2] = useState(false)
  const pickerBtn2Ref = useRef<HTMLButtonElement>(null)
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
  const [distMode, setDistMode] = useState<'assign' | 'link'>('assign')
  const [assignType, setAssignType] = useState<'test' | 'trial'>('test')
  const [assignRecipientMode, setAssignRecipientMode] = useState<'group' | 'student'>('group')
  const [assignGroupId, setAssignGroupId] = useState('')
  const [assignStudentId, setAssignStudentId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [calOpen2, setCalOpen2] = useState(false)
  const [timeOpen2, setTimeOpen2] = useState(false)
  const calAnchor2Ref = useRef<HTMLDivElement>(null)
  const timeAnchor2Ref = useRef<HTMLDivElement>(null)
  const [copied2, setCopied2] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const canAssignNow = !!assignGroupId || !!assignStudentId

  const soft = CREATOR_ACCENTS.find(a => a.hex === accent)?.soft ?? accent + '22'
  // Заливка кружка «верный вариант» — затемнённый акцент: сам акцент подобран
  // как цвет текста и под белой галочкой давал 2.3:1.
  const accentFill = fillUnderWhite(accent)
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
      ? { ...base, type: 'screening', screeningDomain: 'matrices', screeningCount: 5, text: t('Блок: ') + (SCR_DOMAIN_META.matrices.short) + t(' (5 заданий)') }
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
          text: t('Блок: ') + (SCR_DOMAIN_META[editScrDomain].short) + ' (' + (editScrCount) + t(' заданий)'), options: ['', '', '', ''] as string[], correct: 0 }
      }
      return { ...base, type: 'mc', text: editText, options: editOpts, correct: editCorrect }
    }))
    setEditIdx(null)
  }
  function removeQuestion(idx: number) { setQuestions(prev => prev.filter((_, i) => i !== idx)); if (editIdx === idx) setEditIdx(null) }

  async function handleSave() {
    if (!canSave || saving) return
    setSaving(true)
    setSaveError('')
    const id = 'custom-' + (title.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '-')) + '-' + (Date.now())
    const saved = editIdx !== null
      ? questions.map((q, i) => i === editIdx ? { ...q, text: editText, options: editOpts, correct: editCorrect, section: editSection || q.section } : q)
      : questions
    try {
      await saveDiagQuestions(id as DiagSubject, saved)
      await saveCustomTestMeta(id, title.trim(), accent, iconKey)
    } catch (e) {
      setSaving(false)
      setSaveError(t('Не удалось сохранить тест на сервер. Проверьте соединение и попробуйте снова.'))
      return
    }
    if (canAssignNow) {
      await onAssign({
        title: (title.trim()) + ' · ' + (assignType === 'trial' ? t('Пробник') : t('Тест')),
        subject: id as DiagSubject,
        assignType,
        groupIds: assignGroupId ? [assignGroupId] : [],
        studentIds: assignStudentId ? [assignStudentId] : [],
        dueDate: dueDate || undefined,
        closed: false,
      })
    }
    setSaving(false)
    onSave(id, title.trim(), accent, iconKey)
  }

  const savePillStyle: React.CSSProperties = teacherSaveStyle({ disabled: !canSave || saving })
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
                <ArrowLeft size={15} strokeWidth={2} /> {t('Назад')}
              </motion.button>
              <div style={{ flexShrink: 1, minWidth: 0, maxWidth: 280, padding: '9px 16px', borderRadius: 999, ...dg, fontSize: 14, fontWeight: 700, color: 'var(--color-text)', pointerEvents: 'auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {title || t('Новый тест')}
              </div>
              <div style={{ flexGrow: 1 }} />
              <motion.button whileHover={{ scale: canSave ? 1.03 : 1 }} whileTap={{ scale: canSave ? 0.97 : 1 }} onClick={handleSave}
                style={{ ...savePillStyle, flexShrink: 0, pointerEvents: 'auto' }}>
                <Check size={14} strokeWidth={2.5} /> {t('Создать тест')}
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
            <ArrowLeft size={15} strokeWidth={2} /> {t('Назад')}
          </motion.button>
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none', fontSize: 18, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap' }}>
            {title || t('Новый тест')}
          </div>
          <motion.button whileHover={{ scale: canSave ? 1.03 : 1 }} whileTap={{ scale: canSave ? 0.97 : 1 }} onClick={handleSave} style={savePillStyle}>
            <Check size={14} strokeWidth={2.5} /> {saving ? t('Сохранение…') : t('Создать тест')}
          </motion.button>
        </motion.div>

        {saveError && (
          <div style={{ margin: '0 24px 12px', padding: '10px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13 }}>
            {saveError}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          {/* LEFT: name + color + assignment */}
          <div style={{ padding: '0 0 20px 24px', flexShrink: 0, position: 'sticky', top: 90, alignSelf: 'flex-start' }}>
            <GlassCard style={{ width: 260, boxSizing: 'border-box', padding: 16, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
              <div>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder={t("Физика, Математика…")} autoFocus
                  style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 10, border: `1.5px solid ${canSave ? accent + '66' : 'var(--color-border-medium)'}`, background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 13, fontFamily: 'inherit', outline: 'none', transition: 'border 0.15s' }} />
              </div>
              <div>
                <div style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', justifyContent: 'space-between' }}>
                  {CREATOR_ACCENTS.map(a => (
                    <button key={a.hex} onClick={() => setAccent(a.hex)}
                      style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: a.hex, cursor: 'pointer', outline: 'none', transition: 'box-shadow 0.15s', flexShrink: 0, boxShadow: accent === a.hex ? `0 0 0 2.5px var(--color-bg-2), 0 0 0 4.5px ${a.hex}` : 'none' }} />
                  ))}
                  <button ref={pickerBtn2Ref} title={t("Свой цвет")} onClick={() => setShowPicker2(p => !p)}
                    style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: !CREATOR_ACCENTS.some(a => a.hex === accent) ? accent : 'var(--color-bg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s', boxShadow: !CREATOR_ACCENTS.some(a => a.hex === accent) ? `0 0 0 2.5px var(--color-bg-2), 0 0 0 4.5px ${accent}` : 'none' }}>
                    <Plus size={14} style={{ color: !CREATOR_ACCENTS.some(a => a.hex === accent) ? getContrastColor(accent) : 'var(--color-muted)', pointerEvents: 'none' }} />
                  </button>
                  {showPicker2 && (
                    <ColorPickerPopup
                      value={accent}
                      onChange={setAccent}
                      onClose={() => setShowPicker2(false)}
                      anchor={pickerBtn2Ref.current?.getBoundingClientRect() ?? null}
                    />
                  )}
                </div>
              </div>
              <IconPickerField iconKey={iconKey} onChange={setIconKey} accent={accent} />
              <div style={{ borderTop: '1px solid var(--color-border-soft)' }} />
              {/* Mode tabs */}
              <div style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 12, background: 'var(--color-bg-3)' }}>
                {([
                  { id: 'assign', icon: Target, label: t('Назначить') },
                  { id: 'link',   icon: Link2,  label: t('По ссылке') },
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
              {distMode === 'assign' ? (
                <>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['test', 'trial'] as const).map(ty => (
                      <button key={ty} onClick={() => setAssignType(ty)}
                        style={{ flex: 1, padding: '7px 0', borderRadius: 9, border: 'none', outline: 'none', background: assignType === ty ? `${accent}20` : 'var(--color-bg-3)', color: assignType === ty ? accent : 'var(--color-text-3)', fontSize: 12, fontWeight: assignType === ty ? 700 : 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.13s' }}>
                        {ty === 'test' ? t('Контрольная') : t('Пробник')}
                      </button>
                    ))}
                  </div>
                  <div style={{ height: 1, background: 'var(--color-bg-3)', borderRadius: 1, margin: '2px 0' }} />
                  <div style={{ display: 'flex', gap: 5 }}>
                    {(['group', 'student'] as const).map(m => (
                      <button key={m} onClick={() => { setAssignRecipientMode(m); setAssignGroupId(''); setAssignStudentId('') }}
                        style={{ flex: 1, padding: '7px 0', borderRadius: 9, border: 'none', outline: 'none', cursor: 'pointer', fontSize: 12,
                          fontWeight: assignRecipientMode === m ? 700 : 600,
                          background: assignRecipientMode === m ? `${accent}20` : 'var(--color-bg-3)',
                          color: assignRecipientMode === m ? accent : 'var(--color-muted)',
                          fontFamily: 'inherit', transition: 'all 0.15s' }}>
                        {m === 'group' ? t('Группе') : t('Студенту')}
                      </button>
                    ))}
                  </div>
                  {assignRecipientMode === 'group' ? (
                    <TeacherSelect value={assignGroupId} onChange={setAssignGroupId} placeholder={t("Выберите группу")}
                      options={groups.map(g => ({ value: g.id, label: g.name }))} />
                  ) : (
                    <TeacherSelect value={assignStudentId} onChange={setAssignStudentId} placeholder={t("Выберите студента")}
                      options={allStudents.map(s => ({ value: s.id, label: s.name }))} />
                  )}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>{t('Срок (необязательно)')}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <div ref={calAnchor2Ref} style={{ position: 'relative', flex: 1 }}>
                        <button onClick={() => { setCalOpen2(o => !o); setTimeOpen2(false) }}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px', borderRadius: 9, border: 'none', outline: 'none', background: calOpen2 ? `${accent}18` : 'var(--color-bg-input)', color: dueDate ? 'var(--color-text)' : 'var(--color-text-3)', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', fontWeight: dueDate ? 600 : 400, transition: 'background 0.15s' }}>
                          <Calendar size={13} style={{ flexShrink: 0, color: accent }} />
                          <span style={{ flex: 1, textAlign: 'left' }}>{dueDate ? formatDateDisplay(dueDate) : t('Дата')}</span>
                          {dueDate && <button onClick={e => { e.stopPropagation(); setDueDate('') }} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: 'var(--color-text-3)', lineHeight: 1, fontSize: 13, display: 'flex' }}>×</button>}
                        </button>
                        <AnimatePresence>
                          {calOpen2 && <DiagCalendarPicker value={dueDate} onChange={v => { setDueDate(v); setCalOpen2(false) }} onClose={() => setCalOpen2(false)} anchorRef={calAnchor2Ref} accent={accent} soft={soft} />}
                        </AnimatePresence>
                      </div>
                      <div ref={timeAnchor2Ref} style={{ position: 'relative', width: 80 }}>
                        <button onClick={() => { setTimeOpen2(o => !o); setCalOpen2(false) }}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 5, padding: '8px 8px', borderRadius: 9, border: 'none', outline: 'none', background: timeOpen2 ? `${accent}18` : 'var(--color-bg-input)', color: dueTime ? 'var(--color-text)' : 'var(--color-text-3)', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', fontWeight: dueTime ? 600 : 400, transition: 'background 0.15s' }}>
                          <Clock size={13} style={{ flexShrink: 0, color: accent }} />
                          <span>{dueTime || t('Время')}</span>
                        </button>
                        <AnimatePresence>
                          {timeOpen2 && <DiagTimePicker value={dueTime} onChange={v => { setDueTime(v); setTimeOpen2(false) }} onClose={() => setTimeOpen2(false)} anchorRef={timeAnchor2Ref} accent={accent} />}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                  {canAssignNow && (
                    <div style={{ fontSize: 11, color: accent, padding: '6px 10px', borderRadius: 8, background: `${accent}15`, fontWeight: 600 }}>
                      {t('Назначение сохранится при создании теста')}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: 'var(--color-text-3)', lineHeight: 1.5 }}>
                    {t('Ссылка будет доступна после создания теста.')}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-muted)', padding: '6px 10px', borderRadius: 8, background: 'var(--color-bg-3)' }}>
                    {t('Нажми «Создать тест» — ссылку можно скопировать в редакторе.')}
                  </div>
                </>
              )}
            </GlassCard>
          </div>

          {/* CENTER: question editor */}
          <div style={{ flex: 1, minWidth: 0, padding: '0 16px 0 16px' }}>
            {/* Ремоунт по key, без AnimatePresence — причина та же, что у
                редактора вопросов теста выше: `mode="wait"` умеет залипнуть и
                оставить центр пустым до F5. */}
            <motion.div
              key={editIdx !== null ? `edit-${editIdx}` : 'welcome'}
              initial={{ opacity: 0, y: editIdx !== null ? 8 : 0 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
              {editIdx !== null ? (
                  <GlassCard style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: accent, color: getContrastColor(accent), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{editIdx + 1}</div>
                      <div style={{ flex: 1, fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>{t('Вопрос')} {editIdx + 1}</div>
                      <button onClick={() => removeQuestion(editIdx)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 9, border: 'none', background: 'var(--color-red-soft)', color: 'var(--color-red-text)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        <X size={13} /> {t('Удалить')}
                      </button>
                    </div>
                    {editType === 'screening' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20, borderRadius: 14, background: accent + '18', border: `1.5px solid ${accent}44` }}>
                        {(() => { const DI = DOMAIN_ICONS[editScrDomain]; return <div style={{ width: 52, height: 52, borderRadius: 14, background: accent + '28', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><DI size={26} strokeWidth={2} style={{ color: accent }} /></div> })()}
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>{t('Скрининг-блок:')} {SCR_DOMAIN_META[editScrDomain].short}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-2)', lineHeight: 1.6 }}>
                            {editScrCount} {t('автоматически генерируемых заданий этого типа')}<br />{t('будут вставлены в тест в этом месте.')}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Раздел / тема')}</div>
                          <input value={editSection} onChange={e => setEditSection(e.target.value)} placeholder={t("Например: Механика")}
                            style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 10, border: `1.5px solid ${accent}44`, background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Текст вопроса')}</div>
                          <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={4} placeholder={t("Введите вопрос…")}
                            style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${accent}55`, background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.5 }}
                            onPaste={e => {
                              const text = e.clipboardData.getData('text/plain')
                              const parsed = parseSmartPaste(text)
                              if (parsed) {
                                e.preventDefault()
                                setEditText(parsed.question)
                                setEditOpts(parsed.options.length >= 4 ? parsed.options : [...parsed.options, ...Array(Math.max(0, 4 - parsed.options.length)).fill('')])
                                setEditCorrect(0)
                              }
                            }}
                          />
                        </div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {t('Варианты ответов')} <span style={{ color: 'var(--color-muted)', fontWeight: 400, textTransform: 'none' }}>{t('— нажми кружок чтобы отметить правильный')}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {editOpts.map((opt, oi) => (
                              <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <button onClick={() => setEditCorrect(oi)}
                                  style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, cursor: 'pointer', border: `2px solid ${editCorrect === oi ? accentFill : 'var(--color-border-medium)'}`, background: editCorrect === oi ? accentFill : 'transparent', transition: 'all 0.14s', position: 'relative', boxShadow: editCorrect === oi ? accentCircleShadow(accentFill) : 'none' }}>
                                  {editCorrect === oi && <Check size={13} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff', strokeWidth: 3 }} />}
                                </button>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', borderRadius: 12, border: `2px solid ${editCorrect === oi ? accent : 'var(--color-border-medium)'}`, background: 'var(--color-bg-input)', overflow: 'hidden', transition: 'all 0.14s' }}>
                                  <div style={{ width: 32, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: editCorrect === oi ? accent : 'var(--color-text-2)', flexShrink: 0 }}>{String.fromCharCode(65 + oi)}</div>
                                  <input value={opt} onChange={e => { const o = [...editOpts]; o[oi] = e.target.value; setEditOpts(o) }}
                                    style={{ flex: 1, padding: '10px 12px 10px 0', border: 'none', background: 'transparent', color: 'var(--color-text)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
                                </div>
                                {editOpts.length > 2 && (
                                  <button onClick={() => { const o = editOpts.filter((_, i) => i !== oi); setEditOpts(o); if (editCorrect >= o.length) setEditCorrect(0) }}
                                    style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, cursor: 'pointer', border: 'none', background: 'var(--color-red-soft)', color: 'var(--color-red-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <X size={13} />
                                  </button>
                                )}
                              </div>
                            ))}
                            {editOpts.length < 6 && (
                              <button onClick={() => setEditOpts([...editOpts, ''])}
                                style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 9, border: `1px dashed ${accent}66`, background: 'transparent', color: accent, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginTop: 2 }}>
                                <Plus size={13} /> {t('Добавить вариант')}
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
                      <button onClick={() => setEditIdx(null)} style={{ padding: '10px 20px', borderRadius: 12, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{t('Отмена')}</button>
                      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={commitEdit}
                        style={{ padding: '10px 24px', borderRadius: 12, border: 'none', background: accent, color: getContrastColor(accent), fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'inherit' }}>
                        <Check size={15} strokeWidth={2.5} /> {t('Сохранить вопрос')}
                      </motion.button>
                    </div>
                  </GlassCard>
              ) : (
                  <GlassCard style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center' }}>
                    <div style={{ width: 64, height: 64, borderRadius: 20, background: soft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={30} style={{ color: accent }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text)', marginBottom: 6 }}>{title || t('Назови тест слева')}</div>
                      <div style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.6, maxWidth: 380 }}>
                        {t('Введи название, выбери цвет — потом добавляй вопросы.')}<br />
                        {t('Каждый вопрос: текст + 4 варианта + 1 правильный.')}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('С чего начнём?')}</div>
                    <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 420 }}>
                      <button onClick={() => addQuestion('mc')}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '18px 14px', borderRadius: 16, border: `2px solid ${accent}55`, background: soft, color: 'var(--color-text)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', transition: 'all 0.14s' }}>
                        <FileText size={24} style={{ color: accent }} />
                        <span style={{ fontSize: 14, fontWeight: 700 }}>{t('Обычный вопрос')}</span>
                        <span style={{ fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.4 }}>{t('Текст + 4 варианта,')}<br />{t('один правильный')}</span>
                      </button>
                      <button onClick={() => addQuestion('screening')}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '18px 14px', borderRadius: 16, border: `2px solid ${accent}55`, background: soft, color: 'var(--color-text)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', transition: 'all 0.14s' }}>
                        <Brain size={24} style={{ color: accent }} />
                        <span style={{ fontSize: 14, fontWeight: 700 }}>{t('Скрининг-блок')}</span>
                        <span style={{ fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.4 }}>{t('Авто-генерируемые')}<br />{t('когнитивные задания')}</span>
                      </button>
                    </div>
                  </GlassCard>
              )}
            </motion.div>
          </div>

          {/* RIGHT: questions list + type selector */}
          <div style={{ padding: '0 24px 20px 0', flexShrink: 0, position: 'sticky', top: 90, alignSelf: 'flex-start' }}>
            <GlassCard style={{ width: 220, boxSizing: 'border-box', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
              {/* Questions list */}
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('Вопросы')} {questions.length > 0 && `(${questions.length})`}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {questions.map((q, idx) => (
                  <button key={q.id} onClick={() => editIdx === idx ? setEditIdx(null) : startEdit(idx)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 8px', borderRadius: 8, border: 'none', cursor: 'pointer', background: editIdx === idx ? soft : 'transparent', color: editIdx === idx ? accent : 'var(--color-text)', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.12s' }}>
                    <div style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, background: editIdx === idx ? accent : `${accent}22`, color: editIdx === idx ? getContrastColor(accent) : accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800 }}>{idx + 1}</div>
                    <div style={{ flex: 1, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: editIdx === idx ? 600 : 400 }}>{q.text || t('Без текста')}</div>
                  </button>
                ))}
              </div>
              <button onClick={() => addQuestion()}
                style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '7px 8px', borderRadius: 8, border: `1.5px dashed ${accent}66`, background: 'transparent', color: accent, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Plus size={13} /> {t('Добавить вопрос')}
              </button>
              <div style={{ borderTop: '1px solid var(--color-border-soft)', marginTop: 2 }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{t('Тип вопроса')}</div>
              {(['mc', 'screening'] as const).map(ty => (
                <button key={ty} onClick={() => editIdx !== null && setEditType(ty)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 12, border: `2px solid ${editType === ty && editIdx !== null ? accent : 'var(--color-border-medium)'}`, background: editType === ty && editIdx !== null ? accent : 'var(--color-bg-2)', color: editType === ty && editIdx !== null ? '#fff' : editIdx !== null ? 'var(--color-text-2)' : 'var(--color-muted)', fontWeight: 600, fontSize: 13, cursor: editIdx !== null ? 'pointer' : 'default', fontFamily: 'inherit', transition: 'all 0.14s', textAlign: 'left' }}>
                  {ty === 'mc' ? <><FileText size={14} style={{ flexShrink: 0 }} /> {t('Текст / выбор')}</> : <><Brain size={14} style={{ flexShrink: 0 }} /> {t('Скрининг-блок')}</>}
                </button>
              ))}
              {editType === 'screening' && editIdx !== null && (
                <>
                  <div style={{ borderTop: '1px solid var(--color-border-soft)', marginTop: 4, paddingTop: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Домен')}</div>
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
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Кол-во:')} {editScrCount}</div>
                    <input type="range" min={1} max={20} value={editScrCount} onChange={e => setEditScrCount(Number(e.target.value))}
                      style={{ width: '100%', accentColor: accent }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--color-muted)', marginTop: 2 }}>
                      <span>1</span><span>10</span><span>20</span>
                    </div>
                  </div>
                  <div style={{ padding: 10, borderRadius: 10, background: accent + '18', border: `1px solid ${accent}40`, fontSize: 11, color: 'var(--color-text)', lineHeight: 1.5 }}>
                    {(() => { const DI = DOMAIN_ICONS[editScrDomain]; return <strong style={{ color: accent, display: 'inline-flex', alignItems: 'center', gap: 5 }}><DI size={12} strokeWidth={2.5} /> {SCR_DOMAIN_META[editScrDomain].short}</strong> })()}{' '}— {editScrCount} {t('заданий будут вставлены в этом месте.')}
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

// ─── Chip helpers ─────────────────────────────────────────────────────────────
const PRESET_CHIPS = [
  { label: 'AI',           color: '#0ea5e9', bg: '#e0f2fe', darkColor: '#67CFFF', darkBg: 'rgba(14,165,233,0.20)' },
  { label: t('Диагностика'),  color: '#7B3FCC', bg: '#EEDBFF', darkColor: '#C9A6FF', darkBg: 'rgba(123,63,204,0.26)' },
  { label: t('Тестирование'), color: '#1a6fa8', bg: '#dbeeff', darkColor: '#7BBCED', darkBg: 'rgba(26,111,168,0.26)' },
  { label: t('Пробник'),      color: '#B87A10', bg: '#FFF0CC', darkColor: '#F0C45A', darkBg: 'rgba(184,122,16,0.24)' },
  { label: t('Контрольная'),  color: '#C53030', bg: '#FFE1E4', darkColor: '#FF8A8A', darkBg: 'rgba(197,48,48,0.26)' },
]
function getChipStyle(chip: string, fallbackAccent?: string, dark?: boolean) {
  const p = PRESET_CHIPS.find(c => c.label === chip)
  if (p) return dark ? { color: p.darkColor, bg: p.darkBg } : { color: p.color, bg: p.bg }
  const accent = fallbackAccent ?? '#7B3FCC'
  return { color: accent, bg: accent + (dark ? '33' : '28') }
}

function ChipPicker({ value, onChange, fallbackAccent }: { value: string; onChange: (chip: string) => void; fallbackAccent?: string }) {
  const t = useT()
  const [adding, setAdding] = useState(false)
  const [custom, setCustom] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const dark = useTheme(s => s.dark)
  useEffect(() => { if (adding) inputRef.current?.focus() }, [adding])

  const allChips = [...PRESET_CHIPS.map(c => c.label)]
  if (value && !allChips.includes(value)) allChips.push(value)

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      {allChips.map(chip => {
        const { color, bg } = getChipStyle(chip, fallbackAccent, dark)
        const active = chip === value
        return (
          <button
            key={chip}
            onClick={() => onChange(chip)}
            style={{
              fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 7, cursor: 'pointer', border: 'none',
              background: active ? bg : 'var(--color-bg-3)',
              color: active ? color : 'var(--color-text-3)',
              outline: active ? `2px solid ${color}` : 'none',
              outlineOffset: -1,
              transition: 'all 0.13s',
            }}
          >{chip}</button>
        )
      })}
      {adding ? (
        <input
          ref={inputRef}
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { const t = custom.trim(); if (t) onChange(t); setAdding(false); setCustom('') }
            if (e.key === 'Escape') { setAdding(false); setCustom('') }
          }}
          onBlur={() => { const t = custom.trim(); if (t) onChange(t); setAdding(false); setCustom('') }}
          placeholder={t("Свой чип…")}
          style={{
            fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 7, border: '1.5px solid var(--color-accent)',
            background: 'var(--color-bg-2)', color: 'var(--color-text)', width: 90, outline: 'none', fontFamily: 'inherit',
          }}
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          style={{
            fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 7, cursor: 'pointer',
            border: '1.5px dashed var(--color-border-medium)', background: 'transparent', color: 'var(--color-muted)',
          }}
        >{t('+ свой')}</button>
      )}
    </div>
  )
}

// ─── Diagnostic Card ─────────────────────────────────────────────────────────
function DiagnosticCard({ subject, isSelected, onClick, chipOverride }: { subject: DiagSubject; isSelected: boolean; onClick: () => void; chipOverride?: string }) {
  const t = useT()
  const { label, accent, soft } = getSubjectMeta(subject)
  const Icon = getSubjectIcon(subject)
  const [questions, setQuestions] = useState(() => loadDiagQuestions(subject))
  const [anonCount, setAnonCount] = useState(0)
  const chip = chipOverride ?? loadBuiltinChip(subject)
  const dark = useTheme(s => s.dark)
  const { color: chipColor, bg: chipBg } = getChipStyle(chip, undefined, dark)
  useEffect(() => { fetchDiagQuestions(subject).then(setQuestions) }, [subject])
  useEffect(() => {
    loadAnonResults().then(all => setAnonCount(all.filter(r => r.subject === subject).length))
  }, [subject])
  return (
    <ContentCard
      accentColor={accent} accentBg={accent + '14'} borderColor='var(--color-border-glass)'
      isSelected={isSelected} onClick={onClick}
      icon={<Icon size={17} strokeWidth={2} style={{ color: accent }} />}
      badge={<span style={cardChip(chipColor)}>{chip}</span>}
      title={label}
      subtitle={subject === 'logic' ? (loadScreeningConfig().order.length) + t(' доменов') : (questions.length) + t(' вопросов')}
      footerLeft={<><Database size={13} strokeWidth={1.8} /><span>{anonCount > 0 ? (anonCount) + t(' прошли тест') : t('Нет сдач')}</span></>}
      footerRight={<><Target size={11} strokeWidth={2} />{subject === 'logic' ? t('Скрининг') : t('Тест')}</>}
    />
  )
}

function CustomTestCard({ test, isSelected, onClick }: { test: CustomTest; isSelected: boolean; onClick: () => void }) {
  const t = useT()
  const { label, accent } = test
  const soft = accent + '22'
  const [qCount, setQCount] = useState(() => loadDiagQuestions(test.id as DiagSubject).length)
  const [anonCount, setAnonCount] = useState(0)
  useEffect(() => {
    fetchDiagQuestions(test.id as DiagSubject).then(qs => setQCount(qs.length))
    loadAnonResults().then(all => setAnonCount(all.filter(r => r.subject === test.id).length))
  }, [test.id])
  const CardIcon = (test.iconKey ? getIconByKey(test.iconKey) : null) as React.ElementType | null
  const chip = test.chip ?? t('Диагностика')
  const dark = useTheme(s => s.dark)
  const { color: chipColor, bg: chipBg } = getChipStyle(chip, accent, dark)
  return (
    <ContentCard
      accentColor={accent} accentBg={soft} borderColor='var(--color-border-glass)'
      isSelected={isSelected} onClick={onClick}
      icon={CardIcon ? <CardIcon size={17} strokeWidth={2} style={{ color: accent }} /> : <FileText size={17} strokeWidth={2} style={{ color: accent }} />}
      badge={<span style={cardChip(chipColor)}>{chip}</span>}
      title={label}
      subtitle={qCount > 0 ? (qCount) + t(' вопросов') : t('Нет вопросов')}
      footerLeft={<><Database size={13} strokeWidth={1.8} /><span>{anonCount > 0 ? (anonCount) + t(' прошли тест') : t('Нет сдач')}</span></>}
      footerRight={<><Target size={11} strokeWidth={2} />{t('Тест')}</>}
    />
  )
}

// ─── Diagnostic Selection Panel (right-side: buttons + results table) ────────
function DiagnosticSelectionPanel({ subject, onClose, onEditTest }: {
  subject: DiagSubject
  onClose: () => void
  onEditTest: () => void
}) {
  const t = useT()
  const { label, accent, soft } = getSubjectMeta(subject)
  const Icon = getSubjectIcon(subject)
  const [questions, setQuestions] = useState(() => loadDiagQuestions(subject))
  const [copied, setCopied] = useState(false)
  const [anonResults, setAnonResults] = useState<AnonDiagResult[]>([])
  const [pickerFor, setPickerFor] = useState<string | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [chip, setChip] = useState(() => loadBuiltinChip(subject))
  const allStudents = useAllStudents()
  useEffect(() => { fetchDiagQuestions(subject).then(setQuestions) }, [subject])

  function handleChipChange(newChip: string) {
    setChip(newChip)
    saveBuiltinChip(subject, newChip)
  }

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
    void copyToClipboard(`${BASE_URL}#/diagnostic?subject=${subject}`)
      .then(ok => { if (!ok) return; setCopied(true); setTimeout(() => setCopied(false), 2000) })
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

          {/* Chip picker */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 6 }}>{t('Тип теста')}</div>
            <ChipPicker value={chip} onChange={handleChipChange} />
          </div>

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
              {copied ? t('Скопировано!') : t('Ссылка')}
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
              <Pencil size={14} /> {t('Редактировать')}
            </button>
          </div>

          {/* Sections overview */}
          <div>
            <SectionHead>{sections.length} {t('тем ·')} {questions.length} {t('вопросов')}</SectionHead>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {sections.map(([sectionName, qs]) => {
                const isExp = expandedSection === sectionName
                return (
                  <div key={sectionName} style={{ borderRadius: 12, border: `1px solid ${isExp ? accent : 'var(--color-border)'}`, overflow: 'hidden', transition: 'border-color 0.15s' }}>
                    <button
                      onClick={() => setExpandedSection(prev => prev === sectionName ? null : sectionName)}
                      style={{ width: '100%', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8, background: isExp ? `${accent}10` : 'var(--color-bg-2)', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                    >
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: accent, color: getContrastColor(accent), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{qs.length}</div>
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
              {t('Результаты')}
              {anonResults.length > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: accent, background: soft, borderRadius: 6, padding: '1px 7px' }}>
                  {anonResults.length}
                </span>
              )}
              <button onClick={refreshResults} title={t("Обновить")} style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: 999, border: 'none', cursor: 'pointer', background: 'var(--color-bg-3)', color: 'var(--color-muted)', fontSize: 10, fontWeight: 600 }}>↻</button>
            </div>
            {anonResults.length === 0 ? (
              <div style={{ padding: '24px 16px', borderRadius: 12, border: '1.5px dashed var(--color-border-medium)', textAlign: 'center', color: 'var(--color-muted)', fontSize: 12 }}>
                {t('Ещё никто не прошёл тест')}
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
  const t = useT()
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
      <PanelHeader title={t('Редактор: ') + (label)} accent={accent} accentBg={soft} Icon={Icon} onClose={onClose} />
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', overflowX: 'hidden', scrollbarGutter: 'stable', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SectionHead>{t('Вопросы (')}{questions.length})</SectionHead>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {questions.map((q, idx) => (
            <div key={q.id} style={{ borderRadius: 12, border: `1px solid ${editIdx === idx ? accent : 'var(--color-border)'}`, background: editIdx === idx ? `${accent}08` : 'var(--color-bg-2)', overflow: 'hidden' }}>
              {editIdx === idx ? (
                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={2}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--color-border-medium)', background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none' }}
                    onPaste={e => {
                      const text = e.clipboardData.getData('text/plain')
                      const parsed = parseSmartPaste(text)
                      if (parsed) {
                        e.preventDefault()
                        setEditText(parsed.question)
                        setEditOpts(parsed.options.length >= 4 ? parsed.options : [...parsed.options, ...Array(Math.max(0, 4 - parsed.options.length)).fill('')])
                        setEditCorrect(0)
                      }
                    }}
                  />
                  {editOpts.map((opt, oi) => (
                    <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button onClick={() => setEditCorrect(oi)}
                        style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, cursor: 'pointer', border: `2px solid ${editCorrect === oi ? accent : 'var(--color-border-medium)'}`, background: editCorrect === oi ? accent : 'transparent' }} />
                      <input value={opt} onChange={e => { const o = [...editOpts]; o[oi] = e.target.value; setEditOpts(o) }}
                        style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--color-border-medium)', background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button onClick={() => setEditIdx(null)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{t('Отмена')}</button>
                    <button onClick={commitEdit} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: accent, color: getContrastColor(accent), fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}><Check size={12} />{t('Сохранить')}</button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, background: accent, color: getContrastColor(accent), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, marginTop: 1 }}>{idx + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text)', marginBottom: 3 }}>{q.text}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>✓ {q.options[q.correct]}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => startEdit(idx)} style={{ padding: '4px 8px', borderRadius: 7, border: '1px solid var(--color-border)', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{t('Ред.')}</button>
                    <button onClick={() => removeQuestion(idx)} style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: 'var(--color-red-soft)', color: 'var(--color-red-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={11} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
          <button onClick={resetToDefault} style={{ padding: '8px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {t('Сбросить к стандарту')}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function TeacherConstructorPage() {
  const t = useT()
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
  const [customTests, setCustomTests] = useState<CustomTest[]>([])
  const [builtinChips, setBuiltinChips] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('diagBuiltinChips') ?? '{}') } catch { return {} }
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
      fetchCustomTestsMeta().then(tests => {
        hydrateCustomMeta(tests)
        setCustomTests(tests)
      })

      const channel = supabase
        .channel('diag-results-live')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'diag_results' }, () => {
          loadAnonResults().then(setDiagAnonResults)
        })
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    }
  }, [activeTab])

  useEffect(() => {
    if (selectedAssignmentId) {
      loadAssignmentResults(selectedAssignmentId).then(setAssignmentResults)
    } else {
      setAssignmentResults([])
    }
  }, [selectedAssignmentId])
  // Reopen the trainer task composer after a reload (its field drafts survive
  // in sessionStorage); other creator modes hold object state we can't restore.
  const [creatorMode, setCreatorMode] = useState<Exclude<Tab, 'testing' | 'bank'> | null>(
    () => readDraft<string>('taskctor.open') === 'trainer' ? 'trainer' : null
  )
  const [editCourse, setEditCourse] = useState<Course | null>(null)
  const [editTrainer, setEditTrainer] = useState<Trainer | null>(null)
  const [editWidget, setEditWidget] = useState<Widget | null>(null)
  const [selectedTrainerId, setSelectedTrainerId] = useState<string | null>(null)
  const [courses, setCourses] = useState<Course[]>(_cachedCourses ?? [])
  const [trainers, setTrainers] = useState<Trainer[]>(_cachedTrainers ?? [])
  const [widgets, setWidgets] = useState<Widget[]>(_cachedWidgets ?? [])
  const [dbLoading, setDbLoading] = useState(_cachedCourses === null)
  const [ownerId, setOwnerId] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [flashId, setFlashId] = useState<string | null>(null)
  const diagEditorRef = useRef<DiagEditorHandle>(null)

  useEffect(() => {
    async function loadAll() {
      // Courses are per-teacher: only load the ones this teacher owns, so a new
      // teacher doesn't inherit every course ever created (multi-tenant isolation).
      const uid = await getOwnerId()
      setOwnerId(uid)
      const sharedIds = await fetchSharedCourseIds(uid)
      const courseQuery = sharedIds.length
        ? supabase.from('courses').select('*, lessons(*)').or(`created_by.eq.${uid},id.in.(${sharedIds.join(',')})`).order('created_at')
        : supabase.from('courses').select('*, lessons(*)').eq('created_by', uid).order('created_at')
      const [{ data: cData }, { data: tData }, { data: wData }] = await Promise.all([
        courseQuery,
        supabase.from('trainers').select('*').order('created_at'),
        supabase.from('widgets').select('*').order('created_at'),
      ])
      loadColorOverridesFromDB().then(overrides => {
        Object.entries(overrides).forEach(([subject, hex]) => {
          const existing = CUSTOM_META.get(subject)
          const soft = CREATOR_ACCENTS.find(a => a.hex === hex)?.soft ?? hex + '22'
          CUSTOM_META.set(subject, { label: existing?.label ?? subject, accent: hex, soft })
        })
      })
      const c = cData ? cData.map((x: any) => dbCourseToLocal(x, uid)) : []
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
  const [formImportOpen, setFormImportOpen] = useState(false)
  const [pendingFormQuestions, setPendingFormQuestions] = useState<ImportedQuestion[] | null>(null)
  const [widgetFilters, setWidgetFilters] = useState<WidgetFilters>(emptyWidgetFilters)
  const filteredWidgets = useMemo(() => {
    let ws = widgets
    if (widgetFilters.search) ws = ws.filter(w => w.title.toLowerCase().includes(widgetFilters.search.toLowerCase()))
    if (widgetFilters.type) ws = ws.filter(w => w.type === widgetFilters.type)
    if (widgetFilters.linked === 'linked') ws = ws.filter(w => !!w.linkedTrainerId)
    if (widgetFilters.linked === 'unlinked') ws = ws.filter(w => !w.linkedTrainerId)
    const sorted = [...ws]
    if (widgetFilters.sort === 'az') return sorted.sort((a, b) => a.title.localeCompare(b.title, 'ru'))
    if (widgetFilters.sort === 'items') return sorted.sort((a, b) => b.items.length - a.items.length)
    // По времени создания, а не по позиции в массиве: сохранение виджета
    // переставляет его внутри состояния, и карточка от этого прыгала.
    const dir = widgetFilters.sort === 'newest' ? -1 : 1
    return sorted.sort((a, b) => dir * (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
  }, [widgets, widgetFilters])
  // Фильтры витрины курсов переживают уход в редактор: открытие курса — это смена
  // страницы (activePage: 'course-editor'), конструктор при этом размонтируется.
  // На обычном useState отбор «Английский» слетал на «все предметы» каждый раз,
  // когда учитель заглянул в курс и вернулся.
  const [courseSort, setCourseSort] = usePersistentState<CourseSortMode>('ctor.courseSort', 'newest')
  const [courseStatus, setCourseStatus] = usePersistentState<'' | CourseStatus>('ctor.courseStatus', '')
  const [courseSubject, setCourseSubject] = usePersistentState('ctor.courseSubject', '')
  const [courseLevel, setCourseLevel] = usePersistentState('ctor.courseLevel', '')
  // Отбор «чьи это курсы»: значение — ключ человека, а не строка students.
  // 1:1-ученик живёт отдельной записью на каждый предмет, и по одной из них
  // нашлась бы только часть его курсов.
  const [courseStudent, setCourseStudent] = usePersistentState('ctor.courseStudent', '')
  // Готовые курсы стоят в общем списке обычными плитками — отдельной секции нет.
  // Отличие только внутреннее: курса ещё нет в БД, он соберётся из сида при
  // открытии и станет настоящим после «Сохранить». Поэтому их нет в режиме
  // редактирования (удалять и дублировать нечего) и под фильтром «Опубликован».
  //
  // Видит их ТОЛЬКО админ-босс: базовый контент заводится у него, а учителям
  // раздаётся дальше — копией или шарой через карточку учителя в Админке. Пока
  // доступ не загружен, считаем «не админ»: лучше показать плитки на кадр
  // позже, чем мигнуть ими у обычного учителя.
  const isAdmin = useTeacherAccess(s => s.isAdmin)
  const accessLoaded = useTeacherAccess(s => s.loaded)
  useEffect(() => { if (!accessLoaded) useTeacherAccess.getState().load() }, [accessLoaded])
  const seedById = useMemo(() => {
    const map = new Map<string, CourseSeed>()
    if (!accessLoaded || !isAdmin || editMode) return map
    const taken = new Set(courses.map(c => c.id))
    for (const s of COURSE_SEEDS) {
      const id = seedCourseId(s, ownerId)
      if (!taken.has(id)) map.set(id, s)
    }
    return map
  }, [courses, ownerId, isAdmin, accessLoaded, editMode])
  // Всё, что вообще показывается на вкладке: свои курсы + плитки сидов. Из этого
  // же списка собираются опции фильтров, поэтому пустых вариантов не бывает.
  const allCourses = useMemo(
    () => [...courses, ...[...seedById].map(([id, s]) => seedToCourse(s, id))],
    [courses, seedById],
  )
  // Языки идут своим блоком: их курсов больше всего, и искать «Корейский»
  // среди химий неудобно. Между «все предметы», языками и остальным — черта.
  const subjectOpts = useMemo(() => {
    const all = [...new Set(allCourses.map(c => c.subject.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru'))
    const langs = all.filter(s => isLanguageSubject(s))
    const rest = all.filter(s => !isLanguageSubject(s))
    return langs.length && rest.length ? [...langs, FACET_SEP, ...rest] : all
  }, [allCourses])
  // Уровни считаем уже ПОСЛЕ отбора по предмету — иначе физике предложат ступени
  // языковых курсов, а языкам ЕГЭ.
  const levelOpts = useMemo(
    () => levelOptions(courseSubject ? allCourses.filter(c => c.subject.trim() === courseSubject) : allCourses),
    [allCourses, courseSubject],
  )
  // Сменили предмет — выбранный уровень мог исчезнуть из его списка. Без сброса
  // список курсов молча опустел бы под фильтром, которого уже не видно.
  // Пустой список опций = курсы ещё грузятся; сбрасывать по нему нельзя, иначе
  // восстановленный из сессии уровень стирается на первом кадре после возврата.
  useEffect(() => {
    if (courseLevel && levelOpts.length && !levelOpts.includes(courseLevel)) setCourseLevel('')
  }, [levelOpts, courseLevel, setCourseLevel])
  // Кто стоит на курсе: доступ (группы + поимённо) и уже начатые уроки. Для
  // отбора это одно и то же «курс этого ученика» — карточка показывает обе
  // строки, и разводить их в фильтре было бы лишней тонкостью.
  const personKeyById = useMemo(() => {
    const map: Record<string, string> = {}
    for (const p of groupStudentsByPerson(diagAllStudents)) for (const c of p.cards) map[c.id] = p.key
    return map
  }, [diagAllStudents])
  const personsByCourse = useMemo(() => {
    const map: Record<string, Set<string>> = {}
    for (const [id, people] of [...Object.entries(accessByCourse), ...Object.entries(enrollmentByCourse)])
      for (const p of people) { const k = personKeyById[p.id]; if (k) (map[id] ??= new Set()).add(k) }
    return map
  }, [accessByCourse, enrollmentByCourse, personKeyById])
  const personNameByKey = useMemo(() => {
    const map: Record<string, string> = {}
    for (const p of groupStudentsByPerson(diagAllStudents)) map[p.key] = p.name
    return map
  }, [diagAllStudents])
  // В списке только те, у кого хоть один курс: перебирать весь класс, чтобы
  // раз за разом получить пустую витрину, незачем.
  const studentOpts = useMemo(() => {
    const keys = new Set<string>()
    for (const c of allCourses) for (const k of personsByCourse[c.id] ?? []) keys.add(k)
    return [...keys].sort((a, b) => (personNameByKey[a] ?? '').localeCompare(personNameByKey[b] ?? '', 'ru'))
  }, [allCourses, personsByCourse, personNameByKey])
  // Ученика отчислили (или он ушёл к другому учителю) — фильтр по нему оставил
  // бы пустой экран с невидимой причиной. Пустой список = данные ещё грузятся.
  useEffect(() => {
    if (courseStudent && studentOpts.length && !studentOpts.includes(courseStudent)) setCourseStudent('')
  }, [studentOpts, courseStudent, setCourseStudent])
  const filteredCourses = useMemo(() => {
    let cs = allCourses
    if (courseStatus) cs = cs.filter(c => c.status === courseStatus)
    if (courseSubject) cs = cs.filter(c => c.subject.trim() === courseSubject)
    if (courseLevel) cs = cs.filter(c => matchesLevel(c, courseLevel))
    if (courseStudent) cs = cs.filter(c => personsByCourse[c.id]?.has(courseStudent))
    const sorted = [...cs]
    if (courseSort === 'az') return sorted.sort((a, b) => a.title.localeCompare(b.title, 'ru'))
    // По времени, а не по позиции в массиве: сохранение курса переставляет его
    // внутри списка состояния, и раньше карточка от этого прыгала. Публикация
    // (publishedAt) поднимает курс наверх, обычная правка не двигает вообще.
    const dir = courseSort === 'newest' ? -1 : 1
    return sorted.sort((a, b) => dir * courseSortAt(a).localeCompare(courseSortAt(b)))
  }, [allCourses, courseSort, courseStatus, courseSubject, courseLevel, courseStudent, personsByCourse])
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
  // Persist only the id — the task object itself may hold base64 images; it is
  // re-resolved from the bank once tasks load after a reload.
  const [editingTaskId, setEditingTaskId] = usePersistentState<number | null>('taskctor.editingTaskId', null)
  const editingTask = editingTaskId == null ? null : allTasks.find(t => t.id === editingTaskId) ?? null
  useEffect(() => {
    if (editTaskIntent == null) return
    setActiveTab('trainer')
    setEditCourse(null)
    setCreatorMode('trainer')
    setSelectedId(null)
    setEditingTaskId(editTaskIntent)
    clearEditTaskIntent()
  }, [editTaskIntent, clearEditTaskIntent])
  // Mirror the composer-open flag so a reload can restore it. The trainer-card
  // editor (editTrainer) reuses creatorMode='trainer' but isn't restorable.
  useEffect(() => {
    writeDraft('taskctor.open', creatorMode === 'trainer' && !editTrainer ? 'trainer' : null)
  }, [creatorMode, editTrainer])

  // Back signal: user clicked "Конструктор" nav while already on this page.
  // Auto-save draft (for future expansion) and return to the list with the item highlighted.
  const constructorBackTick = useTeacher(s => s.constructorBackTick)
  useEffect(() => {
    if (constructorBackTick === 0) return
    if (diagEditing) {
      diagEditorRef.current?.saveDraft()
      const id = diagEditing
      setDiagEditing(null)
      setActiveTab('testing')
      setSelectedId(id)
      setFlashId(id)
      setTimeout(() => setFlashId(null), 1800)
      return
    }
    if (diagCreating) {
      setDiagCreating(false)
      return
    }
    if (creatorMode) {
      const itemId = editTrainer ? String(editTrainer.id) : editWidget ? String(editWidget.id) : null
      const tab = creatorMode
      setCreatorMode(null)
      setEditTrainer(null)
      setEditWidget(null)
      setEditCourse(null)
      setEditingTaskId(null)
      setActiveTab(tab)
      if (itemId) {
        setSelectedId(itemId)
        setFlashId(itemId)
        setTimeout(() => setFlashId(null), 1800)
      }
      return
    }
  }, [constructorBackTick])

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
        lessons: Array<{ id: string; title: string; number?: number; videoUrl?: string; description?: string; scheduledDuration?: number; recDuration?: number }>
        modules: Array<{ id: string; label: string; lessonIds: string[] }>
        groupIds?: string[]; studentIds?: string[]
      }
      const updated: Course = {
        id: ed.id, title: ed.title, subject: ed.subject, level: ed.level,
        description: ed.description ?? '', status: ed.status,
        color: ed.color, bg: ed.bg, dbCourseId: ed.dbCourseId,
        lastEdited: new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
        lessons: ed.lessons.map(l => ({
          id: l.id, title: l.title, trainerId: null, widgetId: null,
          minutes: l.scheduledDuration ?? l.recDuration,
        })),
        groupIds: ed.groupIds ?? [], studentIds: ed.studentIds ?? [],
      }
      setCourses(prev => {
        const old = prev.find(c => c.id === updated.id)
        const next = withSortTimes(updated, old)
        return old ? prev.map(c => c.id === updated.id ? next : c) : [next, ...prev]
      })
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
        .select('id, group_ids, student_ids, course_modules(id, label, position), lessons(short_id, title, lesson_number, position, module_id, youtube_url, timecodes, description, kind, test_tasks, content, scheduled_date, scheduled_time, scheduled_duration, rec_date, rec_time, rec_duration, lesson_sched_manual, homework, materials)')
        .eq('short_id', course.dbCourseId)
        .single()
      if (dbCourse) {
        groupIds = (dbCourse as any).group_ids ?? []
        studentIds = (dbCourse as any).student_ids ?? []
        const dbModules = [...((dbCourse as any).course_modules ?? [])].sort((a, b) => a.position - b.position)
        const dbLessons = [...((dbCourse as any).lessons ?? [])].sort((a, b) => (a.lesson_number ?? a.position ?? 0) - (b.lesson_number ?? b.position ?? 0))
        lessons = dbLessons.map((l: any, i: number) => {
        // Конспект: абзацы lessons.content → одна строка редактора, картинки —
        // в отдельный список. Без обратной сборки повторное открытие курса
        // приходило с пустым полем «Конспект», а следующее «Сохранить»
        // затирало конспект в БД.
        const theory = paragraphsToTheory(
          Array.isArray(l.content?.paragraphs) ? l.content.paragraphs : [],
        )
        return {
          id: l.short_id,
          title: l.title,
          number: (l.lesson_number ?? i) + 1,
          kind: l.kind === 'test' ? 'test' : 'lesson',
          testTasks: Array.isArray(l.test_tasks) ? l.test_tasks : [],
          videoUrl: l.youtube_url ?? undefined,
          timecodes: Array.isArray(l.timecodes) ? l.timecodes : [],
          description: l.description ?? undefined,
          // Прикреплённые файлы (lessons.materials). Без обратной сборки
          // следующее «Сохранить» затёрло бы их пустым объектом.
          files: parseLessonFiles(l.materials),
          theory: theory.theory || undefined,
          theoryImages: theory.images,
          scheduledDate: l.scheduled_date ?? undefined,
          scheduledTime: l.scheduled_time ?? undefined,
          scheduledDuration: l.scheduled_duration ?? undefined,
          recDate: l.rec_date ?? undefined,
          recTime: l.rec_time ?? undefined,
          recDuration: l.rec_duration ?? undefined,
          lessonSchedManual: l.lesson_sched_manual ?? false,
          // Homework («Домашки» tab) — restore from the persisted JSONB blob.
          hwTitle: l.homework?.hwTitle ?? undefined,
          hwTarget: l.homework?.hwTarget ?? undefined,
          hwDate: l.homework?.hwDate ?? undefined,
          hwDateManual: l.homework?.hwDateManual ?? false,
          hwTasks: Array.isArray(l.homework?.hwTasks) ? l.homework.hwTasks : [],
          recHwTitle: l.homework?.recHwTitle ?? undefined,
          recHwTarget: l.homework?.recHwTarget ?? undefined,
          recHwDate: l.homework?.recHwDate ?? undefined,
          recHwDateManual: l.homework?.recHwDateManual ?? false,
          recHwTasks: Array.isArray(l.homework?.recHwTasks) ? l.homework.recHwTasks : [],
        }
        })
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
      modules = [{ id: uid(), label: t('Модуль 1'), expanded: true, lessonIds: lessons.map(l => l.id as string) }]
    }

    const edData = {
      id: course.id, title: course.title, subject: course.subject, level: course.level,
      status: course.status, color: course.color, bg: course.bg,
      description: course.description ?? '', dbCourseId: course.dbCourseId,
      groupIds, studentIds, modules, lessons,
    }
    openCourseEditor(JSON.stringify(edData))
  }

  // Готовый курс из сида. Id курса стабилен (`seed-<ключ>`), а не случайный:
  // повторное открытие того же сида ведёт в тот же курс, а не плодит копии.
  async function goToSeedCourseEditor(seed: CourseSeed) {
    // build асинхронный: контент курса приезжает своим чанком по клику, а не
    // лежит в главном бандле у всех (см. courseSeeds.ts).
    openCourseEditor(JSON.stringify(await seed.build(seedCourseId(seed, ownerId ?? await getOwnerId()))))
  }

  function goToNewCourseEditor() {
    const id = uid()
    const edData = {
      id, title: '', subject: 'Химия', level: 'ЕГЭ', status: 'draft',
      color: 'var(--color-purple)', bg: 'var(--color-purple-soft)',
      description: '', groupIds: [], studentIds: [],
      modules: [{ id: uid(), label: t('Модуль 1'), expanded: true, lessonIds: [] }],
      lessons: [],
    }
    openCourseEditor(JSON.stringify(edData))
  }

  const selectedCourse  = courses.find(c => c.id === selectedId) ?? null
  const selectedWidget  = widgets.find(w => w.id === selectedId) ?? null
  // Side panel only for courses now; widgets open full-screen like trainers.
  const panelOpen = !!selectedCourse && activeTab === 'course'

  function openItem(id: string) { setSelectedId(prev => prev === id ? null : id) }
  function selectDiagCard(subject: string) {
    setSelectedId(subject)
    loadAnonResults().then(setDiagAnonResults)
  }
  function openDiagCard(subject: DiagSubject) {
    setDiagEditing(subject)
    setSelectedId(null)
    setSelectedResultId(null)
    loadAnonResults().then(setDiagAnonResults)
  }
  function closeEditor() { setSelectedId(null); setDiagEditing(null); setSelectedResultId(null) }

  function handleTabChange(t: Tab) {
    setActiveTab(t); setSelectedId(null); setDiagEditing(null); setDiagCreating(false); setSelectedResultId(null); setCreatorMode(null); setEditCourse(null); setEditTrainer(null); setEditingTaskId(null); setEditWidget(null); setSelectedTrainerId(null)
    setEditMode(false); setCheckedIds(new Set())
    if (t === 'testing') loadAnonResults().then(setDiagAnonResults)
  }

  function handlePlus() {
    if (activeTab === 'bank') return // the bank tab manages taxonomy inline; nothing to create
    if (activeTab === 'testing') { setDiagCreating(true); return }
    if (activeTab === 'course') { goToNewCourseEditor(); return }
    setEditCourse(null); setEditTrainer(null); setEditingTaskId(null); setEditWidget(null)
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
      await Promise.all([...checkedIds].map(id => deleteCustomTestMeta(id)))
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

  async function duplicateChecked() {
    if (activeTab === 'course') {
      courses.filter(c => checkedIds.has(c.id)).forEach(c => duplicateCourse(c))
    } else if (activeTab === 'widget') {
      widgets.filter(w => checkedIds.has(w.id)).forEach(w => duplicateWidget(w))
    } else if (activeTab === 'trainer') {
      allTasks.filter(t => checkedIds.has(String(t.id))).forEach(tk => {
        const { id: _drop, ...copy } = tk as any
        addBankTask({ ...copy, text: copy.text ? (copy.text) + t(' (копия)') : copy.text })
      })
    } else if (activeTab === 'testing') {
      for (const ct of customTests.filter(ct => checkedIds.has(ct.id))) {
        const copy: typeof ct = { ...ct, id: uid(), label: (ct.label) + t(' (копия)') }
        CUSTOM_META.set(copy.id, { label: copy.label, accent: copy.accent, soft: copy.accent + '22' })
        await saveCustomTestMeta(copy.id, copy.label, copy.accent)
        setCustomTests(prev => [copy, ...prev])
      }
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
    setTrainers(prev => {
      const old = prev.find(x => x.id === t.id)
      const next = withCreatedAt(t, old)
      return old ? prev.map(x => x.id === t.id ? next : x) : [next, ...prev]
    })
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
    const { data, error } = await supabase.from('trainers').upsert(row, { onConflict: 'id' }).select('id, created_at').single()
    if (error) { console.error('[syncTrainerToDb]', error); return }
    if (data) {
      // Время создания берём из БД — оно и задаёт порядок карточек.
      setTrainers(prev => prev.map(x => x.id === t.id
        ? { ...x, id: data.id, createdAt: (data as any).created_at ?? x.createdAt }
        : x))
    }
  }

  async function syncWidgetToDb(w: Widget) {
    const linkedUuid = w.linkedTrainerId && isUUID(w.linkedTrainerId) ? w.linkedTrainerId : null
    const row: any = {
      title: w.title, type: w.type, linked_trainer_id: linkedUuid,
      items: w.items, color: w.color, bg: w.bg,
    }
    if (isUUID(w.id)) row.id = w.id
    const { data, error } = await supabase.from('widgets').upsert(row, { onConflict: 'id' }).select('id, created_at').single()
    if (error) { console.error('[syncWidgetToDb]', error); return }
    if (data) {
      // Время создания берём из БД — оно и задаёт порядок карточек.
      setWidgets(prev => prev.map(x => x.id === w.id
        ? { ...x, id: data.id, createdAt: (data as any).created_at ?? x.createdAt }
        : x))
    }
  }

  async function syncCourseToDb(c: Course) {
    // Shared courses belong to another teacher — never write them (an upsert would
    // reassign created_by and silently steal ownership). Read-only here.
    if (c.shared) return
    const shortId = c.dbCourseId ?? c.id
    try {
      const uid = await getOwnerId()
      const { data: dbCourse, error } = await supabase
        .from('courses')
        .upsert(
          { short_id: shortId, title: c.title, subject: c.subject, level: c.level, description: c.description, status: c.status, color: c.color, bg: c.bg, created_by: uid },
          { onConflict: 'short_id' }
        )
        .select('id, short_id, created_at, published_at')
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

      // Stamp dbCourseId on the local course so enrollment + lesson editor unlock.
      // Заодно забираем отметки времени из БД — там их ставит триггер, и порядок
      // карточек не разъедется после перезагрузки списка.
      setCourses(prev => prev.map(x => x.id === c.id ? {
        ...x, dbCourseId: shortId,
        createdAt: (dbCourse as any).created_at ?? x.createdAt,
        publishedAt: (dbCourse as any).published_at ?? undefined,
      } : x))
      // If the editor is still open for this course, unlock it in-place
      setEditCourse(prev => prev?.id === c.id ? { ...prev, dbCourseId: shortId } : prev)
    } catch (e) {
      console.error('[syncCourseToDb] unexpected error', e)
    }
  }

  function handleSaveCourse(c: Course) {
    // Upsert: update in place when editing an existing course, else prepend.
    // Позиция в массиве на порядок карточек больше не влияет — он по времени.
    setCourses(prev => {
      const old = prev.find(x => x.id === c.id)
      const next = withSortTimes(c, old)
      return old ? prev.map(x => x.id === c.id ? next : x) : [next, ...prev]
    })
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
    setWidgets(prev => {
      const old = prev.find(x => x.id === w.id)
      const next = withCreatedAt(w, old)
      return old ? prev.map(x => x.id === w.id ? next : x) : [next, ...prev]
    })
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
    const copy: Course = {
      ...c, id: uid(), title: (c.title) + t(' (копия)'), status: 'draft',
      lessons: c.lessons.map(l => ({ ...l, id: uid() })), lastEdited: stamp(),
      // Копия — новый курс: своё время создания, чужую публикацию не наследует.
      createdAt: new Date().toISOString(), publishedAt: undefined,
    }
    setCourses(prev => [copy, ...prev])
  }
  async function deleteCourse(c: Course) {
    if (!window.confirm(t('Удалить курс «') + (c.title) + t('»? Это действие необратимо.'))) return
    setCourses(prev => prev.filter(x => x.id !== c.id))
    if (selectedId === c.id) setSelectedId(null)
    const shortId = c.dbCourseId ?? (isUUID(c.id) ? c.id : null)
    if (shortId) await supabase.from('courses').delete().eq('short_id', shortId)
  }
  function duplicateWidget(w: Widget) {
    const copy: Widget = {
      ...w, id: uid(), title: (w.title) + t(' (копия)'),
      items: w.items.map(it => ({ ...it, id: uid() })), lastEdited: stamp(),
      // Копия — новый виджет, со своим временем создания.
      createdAt: new Date().toISOString(),
    }
    setWidgets(prev => [copy, ...prev])
  }
  async function deleteWidget(w: Widget) {
    if (!window.confirm(t('Удалить виджет «') + (w.title) + '»?')) return
    setWidgets(prev => prev.filter(x => x.id !== w.id))
    if (selectedId === w.id) setSelectedId(null)
    if (isUUID(w.id)) await supabase.from('widgets').delete().eq('id', w.id)
  }

  const tabCfg = {
    course:   { label: t('Курс'),        Icon: BookOpen, color: 'var(--color-green-text)',     bg: 'var(--color-green-soft)' },
    trainer:  { label: t('Тренажёр'),    Icon: Zap,      color: 'var(--color-accent)',         bg: 'var(--color-purple-soft)' },
    widget:   { label: t('Виджет'),      Icon: Layers,   color: 'var(--color-blue-pill-text)', bg: 'var(--color-blue-pill-bg)' },
    testing:  { label: t('Тестирование'), Icon: Target,  color: 'var(--color-teal-pill-text,#0d9488)', bg: 'var(--color-teal-pill-bg,rgba(13,148,136,0.12))' },
    bank:     { label: t('Банк заданий'), Icon: Database, color: 'var(--color-peach-text)',     bg: 'var(--color-peach-soft)' },
  }

  return (
    // overflow:visible + marginTop:-100 so both sub-views can lift content under the topbar blur.
    <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'visible', marginTop: -100 }}>
      <AnimatePresence mode="wait" initial={false}>
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
            onCancel={() => { setCreatorMode(null); setEditCourse(null); setEditTrainer(null); setEditingTaskId(null); setEditWidget(null) }}
          />
        ) : diagCreating ? (
          <DiagnosticTestCreator
            groups={diagGroups}
            allStudents={diagAllStudents}
            onAssign={async (a) => {
              const created = await createTestAssignment(a)
              // Не сохранилось — надо сказать. Раньше кнопка «Назначить»
              // просто ничего не делала: ни теста у ученика, ни слова учителю.
              if (created) setAssignments(prev => [created, ...prev])
              else window.alert(t('Не удалось назначить тест — проверьте связь и попробуйте ещё раз.'))
            }}
            onSave={(id, label, accent, iconKey) => {
              const newTest: CustomTest = { id, label, accent, iconKey }
              CUSTOM_META.set(id, { label, accent, soft: accent + '22', iconKey })
              setCustomTests(prev => [newTest, ...prev])
              setDiagCreating(false)
              setDiagEditing(id)
            }}
            onCancel={() => setDiagCreating(false)}
          />
        ) : diagEditing === 'logic' ? (
          <ScreeningEditorFullPage onClose={() => setDiagEditing(null)} />
        ) : diagEditing ? (
          <DiagnosticEditorFullPage
            ref={diagEditorRef}
            key={`diag-editor-${diagEditing}`}
            subject={diagEditing as DiagSubject}
            initialChip={customTests.find(ct => ct.id === diagEditing)?.chip ?? builtinChips[diagEditing] ?? undefined}
            initialLabel={customTests.find(ct => ct.id === diagEditing)?.label ?? undefined}
            onClose={() => setDiagEditing(null)}
            groups={diagGroups}
            allStudents={diagAllStudents}
            assignments={assignments}
            onAssign={async (a) => {
              const created = await createTestAssignment(a)
              // Не сохранилось — надо сказать. Раньше кнопка «Назначить»
              // просто ничего не делала: ни теста у ученика, ни слова учителю.
              if (created) setAssignments(prev => [created, ...prev])
              else window.alert(t('Не удалось назначить тест — проверьте связь и попробуйте ещё раз.'))
            }}
            onDeleteAssignment={async id => {
              await deleteTestAssignment(id)
              setAssignments(prev => prev.filter(a => a.id !== id))
            }}
            onColorChange={(hex) => {
              if (diagEditing) updateCustomTestAccent(diagEditing, hex)
              setCustomTests(prev => prev.map(ct => ct.id === diagEditing ? { ...ct, accent: hex } : ct))
            }}
            onIconChange={(iconKey) => {
              if (diagEditing) updateCustomTestIcon(diagEditing, iconKey)
              setCustomTests(prev => prev.map(ct => ct.id === diagEditing ? { ...ct, iconKey } : ct))
            }}
            onLabelChange={(newLabel) => {
              setCustomTests(prev => prev.map(ct => ct.id === diagEditing ? { ...ct, label: newLabel } : ct))
            }}
            onChipChange={(chip) => {
              if (diagEditing && CUSTOM_META.has(diagEditing)) {
                setCustomTests(prev => prev.map(ct => ct.id === diagEditing ? { ...ct, chip } : ct))
              } else if (diagEditing) {
                setBuiltinChips(prev => ({ ...prev, [diagEditing]: chip }))
              }
            }}
          />
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ flex: 1, display: 'flex', minWidth: 0, overflow: 'hidden', position: 'relative' }}
          >
            <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', scrollbarGutter: 'stable', padding: '100px 32px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                // В режиме редактирования строка прилипает под топбаром: крестик,
                // «Дублировать» и «Удалить» остаются под рукой при прокрутке.
                ...(editMode ? {
                  position: 'sticky', top: -100, zIndex: 20,
                  margin: '-8px -32px -8px', padding: '108px 32px 8px',
                  background: 'rgba(var(--glass-rgb), 0.78)',
                  backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
                } : { position: 'relative' }),
              } as React.CSSProperties}>
                {/* Edit-mode toggle — square button */}
                <motion.button
                  whileTap={{ scale: 0.93 }}
                  onClick={toggleEditMode}
                  title={editMode ? t('Выйти из режима редактирования') : t('Редактировать')}
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

                {activeTab === 'trainer' && !editMode && (
                  <button
                    onClick={() => setFormImportOpen(true)}
                    style={{
                      marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7,
                      padding: '10px 18px', borderRadius: 14, border: '1.5px solid var(--color-border-medium)', cursor: 'pointer',
                      background: 'rgba(var(--glass-rgb),0.9)', color: 'var(--color-text)', fontSize: 13, fontWeight: 700,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)', flexShrink: 0,
                    }}
                  >
                    <Link2 size={14} strokeWidth={2.4} />
                    {t('Импорт из Google Forms')}
                  </button>
                )}

                <GoogleFormImportModal
                  open={formImportOpen}
                  onClose={() => setFormImportOpen(false)}
                  onImport={(form, selectedIds) => {
                    setPendingFormQuestions(form.questions.filter(q => selectedIds.includes(q.id)))
                  }}
                />
                {pendingFormQuestions && (
                  <GoogleFormBankCategoryModal
                    questions={pendingFormQuestions}
                    initialSubject={(bankFilters.subject as Subject) || 'chemistry'}
                    onClose={() => setPendingFormQuestions(null)}
                    onConfirm={async meta => {
                      for (const q of pendingFormQuestions) {
                        await addBankTask(questionToBankTask(q, meta))
                      }
                      setPendingFormQuestions(null)
                    }}
                  />
                )}

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
                          {t('Дублировать')} {checkedIds.size}
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
                        {t('Удалить')} {checkedIds.size}
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
                    accentBg="rgba(120,106,215,0.13)"
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
                          title={t("Карточками")}
                          style={{ padding: '5px 8px', borderRadius: 7, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                            background: widgetFilters.viewMode === 'cards' ? 'var(--color-surface)' : 'transparent',
                            color: widgetFilters.viewMode === 'cards' ? 'var(--color-text)' : 'var(--color-text-3)',
                            boxShadow: widgetFilters.viewMode === 'cards' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.14s' }}>
                          <LayoutGrid size={13} />
                        </button>
                        <button onClick={() => setWidgetFilters(prev => ({ ...prev, viewMode: 'groups' }))}
                          title={t("Группами")}
                          style={{ padding: '5px 8px', borderRadius: 7, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                            background: widgetFilters.viewMode === 'groups' ? 'var(--color-surface)' : 'transparent',
                            color: widgetFilters.viewMode === 'groups' ? 'var(--color-text)' : 'var(--color-text-3)',
                            boxShadow: widgetFilters.viewMode === 'groups' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.14s' }}>
                          <Layers size={13} />
                        </button>
                      </div>
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-3)' }}>{filteredWidgets.length} {t('виджетов')}</span>
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
                                <button onClick={e => { e.stopPropagation(); duplicateWidget(w) }} title={t("Дублировать")}
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
              {activeTab === 'course' && !dbLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: -10 }}>
                  <CourseSortDropdown value={courseSort} onChange={setCourseSort} />
                  <CourseFacetDropdown
                    value={courseSubject} options={subjectOpts} allLabel={t('Все предметы')}
                    icon={<span style={{ fontSize: 12 }}>{courseSubject ? subjectIcon(courseSubject) : '📚'}</span>}
                    onChange={setCourseSubject}
                  />
                  <CourseFacetDropdown
                    value={courseLevel} options={levelOpts} allLabel={t('Все уровни')} minWidth={72} iconGap={9}
                    icon={<TrendingUp size={12} />}
                    onChange={setCourseLevel}
                  />
                  <CourseFacetDropdown
                    value={courseStudent} options={studentOpts} allLabel={t('Все ученики')} minWidth={92}
                    labels={personNameByKey} searchable
                    icon={<Users size={12} />}
                    onChange={setCourseStudent}
                  />
                  <CourseStatusFilter value={courseStatus} onChange={setCourseStatus} />
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-3)' }}>
                    {filteredCourses.length} {t('курсов')}
                  </span>
                </div>
              )}
              <div
                style={{ display: (activeTab === 'trainer' || activeTab === 'widget' || activeTab === 'bank') ? 'none' : 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                {activeTab === 'course' && filteredCourses.map(c => (
                  <div key={c.id} className={flashId === c.id ? 'constructor-card-flash' : undefined}
                    // В футере теперь часы, поэтому дата правки живёт в подсказке.
                    title={seedById.has(c.id) ? seedTooltip(seedById.get(c.id)!) : c.lastEdited ? `${t('Изменён')} ${c.lastEdited}` : undefined}
                    style={{ position: 'relative' }}>
                    <CourseCard course={c} isSelected={false}
                      students={enrollmentByCourse[c.id]}
                      access={accessByCourse[c.id]}
                      // Готовый курс собирается из сида, а не читается из БД, — у него
                      // своя дорога в редактор.
                      onClick={() => editMode
                        ? (c.shared ? undefined : toggleCheck(c.id))
                        : seedById.has(c.id) ? void goToSeedCourseEditor(seedById.get(c.id)!) : handleExpandCourse(c)}
                      actions={undefined} />
                    {editMode && c.shared && (
                      <div title={t("Общий курс — только для чтения")} style={{
                        position: 'absolute', top: 12, left: 12, width: 22, height: 22, borderRadius: 7,
                        border: '1.5px solid var(--color-border-medium)', background: 'var(--color-bg-5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5,
                        boxShadow: '0 1px 6px rgba(0,0,0,0.12)', color: 'var(--color-text-3)',
                      }}>
                        <Lock size={12} strokeWidth={2.2} />
                      </div>
                    )}
                    {editMode && !c.shared && (
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
                        <button onClick={e => { e.stopPropagation(); duplicateCourse(c) }} title={t("Дублировать")}
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
                  <div key={subject} className={flashId === subject ? 'constructor-card-flash' : undefined} style={{ position: 'relative' }}>
                    <DiagnosticCard
                      subject={subject}
                      isSelected={selectedId === subject}
                      onClick={() => editMode ? toggleCheck(subject) : selectedId === subject ? openDiagCard(subject) : selectDiagCard(subject)}
                      chipOverride={builtinChips[subject]}
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
                  <div key={ct.id} className={flashId === ct.id ? 'constructor-card-flash' : undefined} style={{ position: 'relative' }}>
                    <CustomTestCard
                      test={ct}
                      isSelected={selectedId === ct.id}
                      onClick={() => editMode ? toggleCheck(ct.id) : selectedId === ct.id ? openDiagCard(ct.id as DiagSubject) : selectDiagCard(ct.id)}
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

              {dbLoading && (
                <div style={{ padding: '24px 0' }}><Skeleton.Text lines={3} /></div>
              )}

              {/* Inline results table — appears below cards on first click */}
              {/* Ремоунт по key, без AnimatePresence: `mode="wait"` умеет
                  навсегда залипнуть (сигнал «выход завершён» теряется — см.
                  onExit в AnimatePresence/index.mjs), и таблица результатов
                  встала бы пустой до F5 при переключении предмета. */}
                {activeTab === 'testing' && selectedId && (
                  <motion.div
                    key={`table-${selectedId}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, marginRight: selectedResultId ? 368 : 0 }}
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
  const t = useT()
  const [assignType, setAssignType] = useState<'test' | 'trial'>('test')
  const [recipientMode, setRecipientMode] = useState<'group' | 'student'>('group')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)

  const canSave = !!selectedGroupId || !!selectedStudentId

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    await onSave({
      title: (title) + ' · ' + (assignType === 'trial' ? t('Пробник') : t('Тест')),
      subject,
      assignType,
      groupIds: selectedGroupId ? [selectedGroupId] : [],
      studentIds: selectedStudentId ? [selectedStudentId] : [],
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
            <div style={{ fontSize: 16, fontWeight: 750, color: 'var(--color-text)' }}>{t('Назначить тест')}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>{title}</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'var(--color-bg-5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Type */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>{t('Тип')}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['test', 'trial'] as const).map(ty => (
                <button key={ty} onClick={() => setAssignType(ty)}
                  style={{ padding: '7px 16px', borderRadius: 10, border: `1.5px solid ${assignType === ty ? 'var(--color-accent)' : 'var(--color-border-medium)'}`, background: assignType === ty ? 'var(--color-purple-soft)' : 'transparent', color: assignType === ty ? 'var(--color-accent)' : 'var(--color-text-3)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.13s' }}>
                  {ty === 'test' ? t('Контрольная') : t('Пробник (ЕГЭ)')}
                </button>
              ))}
            </div>
          </div>

          {/* Recipient toggle + search */}
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {(['group', 'student'] as const).map(m => (
                <button key={m} onClick={() => { setRecipientMode(m); setSelectedGroupId(''); setSelectedStudentId('') }}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    background: recipientMode === m ? 'var(--color-purple-soft)' : 'var(--color-bg-3)',
                    color: recipientMode === m ? 'var(--color-accent)' : 'var(--color-muted)',
                    fontFamily: 'inherit', transition: 'all 0.15s' }}>
                  {m === 'group' ? t('Группе') : t('Студенту')}
                </button>
              ))}
            </div>
            {recipientMode === 'group' ? (
              <TeacherSelect value={selectedGroupId} onChange={setSelectedGroupId} placeholder={t("Выберите группу")}
                options={groups.map(g => ({ value: g.id, label: g.name }))} />
            ) : (
              <TeacherSelect value={selectedStudentId} onChange={setSelectedStudentId} placeholder={t("Выберите студента")}
                options={allStudents.map(s => ({ value: s.id, label: s.name }))} />
            )}
          </div>

          {/* Due date */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>{t('Дедлайн (необязательно)')}</div>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              style={{ padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--color-border-medium)', background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 13, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }} />
          </div>

          <button onClick={handleSave} disabled={!canSave || saving}
            style={{ padding: '12px', borderRadius: 12, border: 'none', background: canSave ? 'var(--color-purple-soft)' : 'var(--color-bg-5)', color: canSave ? 'var(--color-accent)' : 'var(--color-text-3)', fontSize: 14, fontWeight: 700, cursor: canSave ? 'pointer' : 'not-allowed', fontFamily: 'inherit', transition: 'all 0.13s' }}>
            {saving ? t('Сохраняем…') : t('Назначить тест')}
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
  const t = useT()
  return (
    <div style={{ padding: '24px 32px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Target size={14} style={{ color: 'var(--color-teal-pill-text, #0d9488)' }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-2)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{t('Назначенные тесты')}</span>
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
                    {a.dueDate && <span>{t('до')} {a.dueDate}</span>}
                  </div>
                </div>
                <span style={{ padding: '3px 9px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: a.assignType === 'trial' ? 'rgba(245,166,35,0.12)' : 'var(--color-purple-soft)', color: a.assignType === 'trial' ? '#F5A623' : 'var(--color-purple-text)' }}>
                  {a.assignType === 'trial' ? t('Пробник') : t('Тест')}
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
                    <div style={{ fontSize: 12, color: 'var(--color-muted)', padding: '8px 12px' }}>{t('Никто ещё не сдал')}</div>
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
