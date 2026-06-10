import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Zap, Layers, Plus, Clock,
  GraduationCap, FileText, X, Check,
  Trash2, Link2, Database, Sparkles, ArrowUp, ArrowDown,
  CircleHelp, FlaskConical, Atom, Timer, Laugh,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'course' | 'trainer' | 'widget'
type CourseStatus = 'published' | 'draft'
type Difficulty = 'easy' | 'medium' | 'hard'
type WidgetType = 'quiz' | 'facts' | 'reactions' | 'pomodoro' | 'memes' | 'qod'

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

interface TrainerAnswer { id: string; text: string; correct?: boolean }

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
}

interface Trainer {
  id: string; title: string; topic: string; difficulty: Difficulty
  timePerQuestion: number; questions: TrainerQ[]
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
    color: '#B98FFF', bg: '#EFE0FF', status: 'published', lastEdited: '09.06',
    lessons: [
      { id: 'l1', title: 'Периодический закон', trainerId: 't3', widgetId: 'w2' },
      { id: 'l2', title: 'Гидролиз солей',      trainerId: 't1', widgetId: null  },
      { id: 'l3', title: 'Органические реакции', trainerId: null, widgetId: 'w1' },
    ],
  },
  {
    id: 'c2', title: 'ОГЭ по Химии — Базовый', subject: 'Химия', level: 'ОГЭ',
    description: 'Базовая подготовка к ОГЭ',
    color: '#9B6DFF', bg: '#E4D9FF', status: 'published', lastEdited: '07.06',
    lessons: [
      { id: 'l4', title: 'Кислоты и основания', trainerId: 't5', widgetId: 'w2' },
      { id: 'l5', title: 'Соли и реакции',      trainerId: null, widgetId: null  },
    ],
  },
  {
    id: 'c3', title: 'ЕГЭ по Биологии — 2025', subject: 'Биология', level: 'ЕГЭ',
    description: 'Актуальная программа ЕГЭ 2025',
    color: '#5FD68A', bg: '#D6F5E3', status: 'draft', lastEdited: '05.06',
    lessons: [
      { id: 'l6', title: 'Фотосинтез', trainerId: 't4', widgetId: 'w1' },
    ],
  },
  {
    id: 'c4', title: 'Биохимия — Дополнительный', subject: 'Биология', level: 'ЕГЭ',
    description: 'Углублённый модуль по биохимии',
    color: '#3EC87A', bg: '#C8F0D9', status: 'draft', lastEdited: '01.06',
    lessons: [],
  },
]

const TRAINERS_INIT: Trainer[] = [
  {
    id: 't1', title: 'Гидролиз солей', topic: 'Неорганика', difficulty: 'hard',
    timePerQuestion: 2, color: '#B98FFF', bg: '#EFE0FF', lastEdited: '10.06',
    questions: TASK_BANK.filter(q => q.topic === 'Неорганика').slice(0, 4).map(q => ({ id: q.id, text: q.text, answer: q.answer, source: 'bank' as const })),
  },
  {
    id: 't2', title: 'ОВР — окисление и восстановление', topic: 'Неорганика', difficulty: 'medium',
    timePerQuestion: 3, color: '#9B6DFF', bg: '#E4D9FF', lastEdited: '08.06',
    questions: TASK_BANK.filter(q => q.topic === 'Неорганика').map(q => ({ id: q.id, text: q.text, answer: q.answer, source: 'bank' as const })),
  },
  {
    id: 't3', title: 'Периодический закон', topic: 'Общая', difficulty: 'easy',
    timePerQuestion: 1, color: '#C58BFF', bg: '#EEDBFF', lastEdited: '06.06',
    questions: TASK_BANK.filter(q => q.topic === 'Общая').map(q => ({ id: q.id, text: q.text, answer: q.answer, source: 'bank' as const })),
  },
  {
    id: 't4', title: 'Фотосинтез и дыхание растений', topic: 'Биология', difficulty: 'medium',
    timePerQuestion: 2, color: '#5FD68A', bg: '#D6F5E3', lastEdited: '04.06',
    questions: TASK_BANK.filter(q => q.topic === 'Биология').map(q => ({ id: q.id, text: q.text, answer: q.answer, source: 'bank' as const })),
  },
  {
    id: 't5', title: 'Кислоты и основания', topic: 'Неорганика', difficulty: 'easy',
    timePerQuestion: 1, color: '#3EC87A', bg: '#C8F0D9', lastEdited: '02.06',
    questions: TASK_BANK.filter(q => q.topic === 'Неорганика').slice(1, 3).map(q => ({ id: q.id, text: q.text, answer: q.answer, source: 'bank' as const })),
  },
]

const WIDGETS_INIT: Widget[] = [
  {
    id: 'w1', title: 'Викторина: ЕГЭ Химия', type: 'quiz',
    linkedTrainerId: 't1', color: '#7B3FCC', bg: '#EEDBFF', lastEdited: '10.06',
    items: [
      { id: 'i1', question: 'Что происходит при гидролизе соли слабой кислоты?', options: ['pH > 7', 'pH < 7', 'pH = 7', 'Реакция не идёт'], correct: 0 },
      { id: 'i2', question: 'Сильный электролит — это?', options: ['Уксусная кислота', 'HCl', 'NH₃', 'Вода'], correct: 1 },
    ],
  },
  {
    id: 'w2', title: 'Факты: Строение атома', type: 'facts',
    linkedTrainerId: null, color: '#1E9E63', bg: '#DCF6E7', lastEdited: '09.06',
    items: [
      { id: 'i3', factTitle: 'Ядро атома', factText: 'Протоны (+) и нейтроны, несёт 99,9% массы атома' },
      { id: 'i4', factTitle: 'Электроны', factText: 'Отрицательно заряженные частицы на орбиталях вокруг ядра' },
      { id: 'i5', factTitle: 'Орбитали', factText: 's, p, d, f — уровни энергии электронов' },
    ],
  },
  {
    id: 'w3', title: 'Реакции: Органическая химия', type: 'reactions',
    linkedTrainerId: null, color: '#1F6FB8', bg: '#DCEEFB', lastEdited: '07.06',
    items: [
      { id: 'i6', emoji: '🔥', quote: 'Реакция горения — самая экзотермическая!', lesson: 'Алканы' },
      { id: 'i7', emoji: '⚗️', quote: 'Полимеризация меняет всё вокруг нас', lesson: 'Полимеры' },
    ],
  },
  {
    id: 'w4', title: 'Фокус: Подготовка к ЕГЭ', type: 'pomodoro',
    linkedTrainerId: null, color: '#E0794B', bg: '#FFE4BD', lastEdited: '05.06',
    items: [
      { id: 'i8', focusMin: 25, breakMin: 5 },
    ],
  },
]

// ─── Constants ────────────────────────────────────────────────────────────────
const DIFF_LABEL: Record<Difficulty, string> = { easy: 'Лёгкий', medium: 'Средний', hard: 'Сложный' }
const DIFF_COLOR: Record<Difficulty, string> = { easy: '#1a7a3f', medium: '#8B4900', hard: '#c0303a' }
const DIFF_BG:    Record<Difficulty, string> = { easy: '#DFF8D6', medium: '#FFE4BD', hard: '#FFE1E4' }
const WTYPE_LABEL: Record<WidgetType, string> = { quiz: 'Викторина', facts: 'Научные факты', reactions: 'Реакции', pomodoro: 'Фокус', memes: 'Мемы', qod: 'Вопрос дня' }
const WTYPE_ICON:  Record<WidgetType, React.ElementType> = { quiz: CircleHelp, facts: FlaskConical, reactions: Atom, pomodoro: Timer, memes: Laugh, qod: Sparkles }
const WTYPE_COLOR: Record<WidgetType, string> = { quiz: '#7B3FCC', facts: '#1E9E63', reactions: '#1F6FB8', pomodoro: '#E0794B', memes: '#C58BFF', qod: '#0E7A6F' }
const WTYPE_BG:    Record<WidgetType, string> = { quiz: '#EEDBFF', facts: '#DCF6E7', reactions: '#DCEEFB', pomodoro: '#FFE4BD', memes: '#F1E3FF', qod: '#CFF3EE' }
const STATUS_LABEL: Record<CourseStatus, string> = { published: 'Опубликован', draft: 'Черновик' }
const STATUS_COLOR: Record<CourseStatus, string> = { published: '#1a7a3f', draft: '#8B4900' }
const STATUS_BG:   Record<CourseStatus, string> = { published: '#DFF8D6', draft: '#FFE4BD' }

// ─── Shared UI ────────────────────────────────────────────────────────────────
const inputSt: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '9px 12px',
  borderRadius: 11, border: '1.5px solid rgba(0,0,0,0.1)',
  fontSize: 13, color: '#0B0B0D', background: '#F9F9FB',
  outline: 'none', fontFamily: 'inherit',
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: '#9A9AA2', letterSpacing: 0.4, marginBottom: 4, textTransform: 'uppercase' }}>{children}</div>
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: '#6F6F76', marginBottom: 8 }}>{children}</div>
}

function SegBtn({ label, active, color, bg, onClick }: { label: string; active: boolean; color: string; bg: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: '7px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
      fontSize: 12, fontWeight: 600,
      background: active ? bg : '#F5F5F6',
      color: active ? color : '#6F6F76',
      transition: 'all 0.15s',
    }}>{label}</button>
  )
}

function PanelHeader({ title, accent, accentBg, Icon, onClose }: {
  title: string; accent: string; accentBg: string; Icon: React.ElementType; onClose: () => void
}) {
  return (
    <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 11, background: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={15} strokeWidth={2} style={{ color: accent }} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0B0B0D' }}>{title}</div>
      </div>
      <button onClick={onClose} style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6F6F76', flexShrink: 0 }}>
        <X size={13} />
      </button>
    </div>
  )
}

function SaveBtn({ accent, accentBg, onClick }: { accent: string; accentBg: string; onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{
        width: '100%', padding: '11px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
        background: accentBg, color: accent, fontSize: 13, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}
    >
      <Check size={14} strokeWidth={2.5} />
      Сохранить
    </motion.button>
  )
}

function uid() { return Math.random().toString(36).slice(2, 8) }

// ─── Course Editor ────────────────────────────────────────────────────────────
function CourseEditor({
  course, trainers, widgets, onSave, onClose,
}: {
  course: Course
  trainers: Trainer[]
  widgets: Widget[]
  onSave: (c: Course) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(course.title)
  const [subject, setSubject] = useState(course.subject)
  const [level, setLevel] = useState(course.level)
  const [description, setDescription] = useState(course.description)
  const [status, setStatus] = useState<CourseStatus>(course.status)
  const [lessons, setLessons] = useState<Lesson[]>(course.lessons)
  const [newLessonTitle, setNewLessonTitle] = useState('')
  const [saved, setSaved] = useState(false)

  function addLesson() {
    if (!newLessonTitle.trim()) return
    setLessons(prev => [...prev, { id: uid(), title: newLessonTitle.trim(), trainerId: null, widgetId: null }])
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
      transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.8 }}
      style={{ width: 360, flexShrink: 0, background: 'rgba(255,255,255,0.97)', borderLeft: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <PanelHeader title="Редактор курса" accent="#7B3FCC" accentBg="#EEDBFF" Icon={BookOpen} onClose={onClose} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Title */}
        <div><Label>Название</Label>
          <input value={title} onChange={e => setTitle(e.target.value)} style={inputSt} />
        </div>

        {/* Subject + Level */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div><Label>Предмет</Label>
            <select value={subject} onChange={e => setSubject(e.target.value)} style={{ ...inputSt, appearance: 'none', cursor: 'pointer' }}>
              <option>Химия</option><option>Биология</option>
            </select>
          </div>
          <div><Label>Уровень</Label>
            <select value={level} onChange={e => setLevel(e.target.value)} style={{ ...inputSt, appearance: 'none', cursor: 'pointer' }}>
              <option>ЕГЭ</option><option>ОГЭ</option><option>Углублённый</option>
            </select>
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
            <SegBtn label="Черновик"    active={status === 'draft'}     color="#8B4900" bg="#FFE4BD" onClick={() => setStatus('draft')} />
            <SegBtn label="Опубликован" active={status === 'published'} color="#1a7a3f" bg="#DFF8D6" onClick={() => setStatus('published')} />
          </div>
        </div>

        {/* Lessons */}
        <div>
          <SectionHead>Уроки ({lessons.length})</SectionHead>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
            {lessons.map((lesson, idx) => (
              <div key={lesson.id} style={{ background: '#F9F9FB', borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#0B0B0D' }}>{lesson.title}</div>
                  <button onClick={() => moveLesson(idx, -1)} disabled={idx === 0}
                    style={{ width: 22, height: 22, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6F6F76', opacity: idx === 0 ? 0.3 : 1 }}>
                    <ArrowUp size={11} />
                  </button>
                  <button onClick={() => moveLesson(idx, 1)} disabled={idx === lessons.length - 1}
                    style={{ width: 22, height: 22, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6F6F76', opacity: idx === lessons.length - 1 ? 0.3 : 1 }}>
                    <ArrowDown size={11} />
                  </button>
                  <button onClick={() => removeLesson(lesson.id)}
                    style={{ width: 22, height: 22, borderRadius: 6, border: 'none', cursor: 'pointer', background: '#FFE1E4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c0303a' }}>
                    <Trash2 size={11} />
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#9A9AA2', marginBottom: 2 }}>ТРЕНАЖЁР</div>
                    <select value={lesson.trainerId ?? ''} onChange={e => setLessonLink(lesson.id, 'trainerId', e.target.value || null)}
                      style={{ ...inputSt, padding: '5px 8px', fontSize: 11, appearance: 'none' }}>
                      <option value="">— нет —</option>
                      {trainers.map(t => <option key={t.id} value={t.id}>{t.title.slice(0, 22)}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#9A9AA2', marginBottom: 2 }}>ВИДЖЕТ</div>
                    <select value={lesson.widgetId ?? ''} onChange={e => setLessonLink(lesson.id, 'widgetId', e.target.value || null)}
                      style={{ ...inputSt, padding: '5px 8px', fontSize: 11, appearance: 'none' }}>
                      <option value="">— нет —</option>
                      {widgets.map(w => <option key={w.id} value={w.id}>{w.title.slice(0, 22)}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add lesson */}
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={newLessonTitle} onChange={e => setNewLessonTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addLesson()}
              placeholder="Название урока…" style={{ ...inputSt, flex: 1 }} />
            <motion.button whileTap={{ scale: 0.95 }} onClick={addLesson}
              style={{ width: 36, height: 36, borderRadius: 11, border: 'none', cursor: 'pointer', background: '#EEDBFF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7B3FCC', flexShrink: 0 }}>
              <Plus size={16} strokeWidth={2.4} />
            </motion.button>
          </div>
        </div>

        <AnimatePresence>
          {saved && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#DFF8D6', borderRadius: 12, fontSize: 13, fontWeight: 600, color: '#1a7a3f' }}>
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
      transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.8 }}
      style={{ width: 360, flexShrink: 0, background: 'rgba(255,255,255,0.97)', borderLeft: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <PanelHeader title="Редактор тренажёра" accent="#8B4900" accentBg="#FFE4BD" Icon={Zap} onClose={onClose} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Title + topic */}
        <div><Label>Название</Label><input value={title} onChange={e => setTitle(e.target.value)} style={inputSt} /></div>
        <div><Label>Тема</Label>
          <select value={topic} onChange={e => setTopic(e.target.value)} style={{ ...inputSt, appearance: 'none', cursor: 'pointer' }}>
            {TOPICS.map(t => <option key={t}>{t}</option>)}
            <option>Смешанный</option>
          </select>
        </div>

        {/* Difficulty + time */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div><Label>Сложность</Label>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty)} style={{ ...inputSt, appearance: 'none', cursor: 'pointer' }}>
              <option value="easy">Лёгкий</option><option value="medium">Средний</option><option value="hard">Сложный</option>
            </select>
          </div>
          <div><Label>Минут / вопрос</Label>
            <input type="number" min={1} max={10} value={timePerQ} onChange={e => setTimePerQ(Number(e.target.value))} style={inputSt} />
          </div>
        </div>

        {/* Source */}
        <div><Label>Источник вопросов</Label>
          <div style={{ display: 'flex', gap: 6 }}>
            <SegBtn label="Из банка заданий" active={source === 'bank'}   color="#7B3FCC" bg="#EEDBFF" onClick={() => setSource('bank')} />
            <SegBtn label="Вручную"          active={source === 'manual'} color="#8B4900" bg="#FFE4BD" onClick={() => setSource('manual')} />
          </div>
        </div>

        {source === 'bank' && (
          <div style={{ background: '#F9F9FB', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SectionHead>Параметры банка</SectionHead>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 8 }}>
              <div><Label>Тема банка</Label>
                <select value={bankTopic} onChange={e => setBankTopic(e.target.value)} style={{ ...inputSt, appearance: 'none', cursor: 'pointer' }}>
                  {TOPICS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div><Label>Кол-во</Label>
                <input type="number" min={1} max={TASK_BANK.filter(q => q.topic === bankTopic).length}
                  value={bankCount} onChange={e => setBankCount(Number(e.target.value))} style={inputSt} />
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#9A9AA2' }}>
              Доступно: {TASK_BANK.filter(q => q.topic === bankTopic).length} вопросов
            </div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={loadFromBank}
              style={{ padding: '9px 0', borderRadius: 12, border: 'none', cursor: 'pointer', background: '#EEDBFF', color: '#7B3FCC', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Database size={13} strokeWidth={2} /> Загрузить из банка
            </motion.button>
          </div>
        )}

        {source === 'manual' && (
          <div style={{ background: '#F9F9FB', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SectionHead>Добавить вопрос</SectionHead>
            <input value={manQ} onChange={e => setManQ(e.target.value)} placeholder="Текст вопроса…" style={inputSt} />
            <input value={manA} onChange={e => setManA(e.target.value)} placeholder="Правильный ответ…" style={inputSt} />
            <motion.button whileTap={{ scale: 0.97 }} onClick={addManual}
              style={{ padding: '8px 0', borderRadius: 11, border: 'none', cursor: 'pointer', background: '#FFE4BD', color: '#8B4900', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <Plus size={13} /> Добавить
            </motion.button>
          </div>
        )}

        {/* Questions list */}
        <div>
          <SectionHead>Вопросы ({questions.length})</SectionHead>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {questions.length === 0 && (
              <div style={{ fontSize: 12, color: '#9A9AA2', textAlign: 'center', padding: '12px 0' }}>
                Нет вопросов — загрузите из банка или добавьте вручную
              </div>
            )}
            {questions.map((q, i) => (
              <div key={q.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', background: '#F9F9FB', borderRadius: 10 }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, background: q.source === 'bank' ? '#EEDBFF' : '#FFE4BD', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: q.source === 'bank' ? '#7B3FCC' : '#8B4900', flexShrink: 0, marginTop: 1 }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0B0B0D', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.text}</div>
                  <div style={{ fontSize: 11, color: '#6F6F76', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.answer}</div>
                </div>
                <button onClick={() => removeQ(q.id)} style={{ width: 20, height: 20, borderRadius: 6, border: 'none', cursor: 'pointer', background: '#FFE1E4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c0303a', flexShrink: 0 }}>
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {saved && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#DFF8D6', borderRadius: 12, fontSize: 13, fontWeight: 600, color: '#1a7a3f' }}>
              <Check size={14} strokeWidth={2.5} /> Сохранено
            </motion.div>
          )}
        </AnimatePresence>
        <SaveBtn accent="#8B4900" accentBg="#FFE4BD" onClick={handleSave} />
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
      transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.8 }}
      style={{ width: 360, flexShrink: 0, background: 'rgba(255,255,255,0.97)', borderLeft: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <PanelHeader title="Редактор виджета" accent="#1a7a3f" accentBg="#DFF8D6" Icon={Layers} onClose={onClose} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                  background: isActive ? WTYPE_BG[wt] : '#F5F5F6', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600,
                  color: isActive ? WTYPE_COLOR[wt] : '#6F6F76', transition: 'all 0.15s',
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
          <div style={{ background: '#F0FBF4', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SectionHead>Автонаполнение из тренажёра</SectionHead>
            <select value={linkedId} onChange={e => setLinkedId(e.target.value)} style={{ ...inputSt, appearance: 'none', cursor: 'pointer' }}>
              <option value="">— выберите тренажёр —</option>
              {trainers.map(t => <option key={t.id} value={t.id}>{t.title} ({t.questions.length} вопр.)</option>)}
            </select>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={autoPopulate} disabled={!linkedId}
              style={{
                padding: '9px 0', borderRadius: 12, border: 'none', cursor: linkedId ? 'pointer' : 'not-allowed',
                background: linkedId ? '#DFF8D6' : '#F5F5F6', color: linkedId ? '#1a7a3f' : '#9A9AA2',
                fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
              <Sparkles size={13} strokeWidth={2} />
              Наполнить автоматически
            </motion.button>
          </div>
        )}

        {/* Manual content builder */}
        <div style={{ background: '#F9F9FB', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                    borderColor: qCorr === oi ? WTYPE_COLOR[type] : '#C2C2C8',
                    background: qCorr === oi ? WTYPE_COLOR[type] : 'transparent', cursor: 'pointer',
                  }} />
                  <input value={opt} onChange={e => { const o = [...qOpts]; o[oi] = e.target.value; setQOpts(o) }}
                    placeholder={`Вариант ${oi + 1}…`} style={{ ...inputSt, flex: 1 }} />
                </div>
              ))}
              <div style={{ fontSize: 10, color: '#9A9AA2' }}>● — правильный ответ</div>
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
              <div style={{ fontSize: 11, color: '#9A9AA2' }}>
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
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#F9F9FB', borderRadius: 9 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 5, background: WTYPE_BG[type], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: WTYPE_COLOR[type], flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1, fontSize: 11, color: '#0B0B0D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.question ?? item.factTitle ?? item.emoji ?? item.memeEmoji ?? '—'}
                    {(item.factTitle || item.emoji || item.memeTitle) && (
                      <span style={{ color: '#9A9AA2' }}> · {item.factText?.slice(0, 30) ?? item.quote?.slice(0, 30) ?? item.memeTitle?.slice(0, 30)}</span>
                    )}
                  </div>
                  <button onClick={() => removeItem(item.id)} style={{ width: 18, height: 18, borderRadius: 5, border: 'none', cursor: 'pointer', background: '#FFE1E4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c0303a', flexShrink: 0 }}>
                    <X size={9} />
                  </button>
                </div>
              ))}
              {items.length > 6 && (
                <div style={{ fontSize: 11, color: '#9A9AA2', textAlign: 'center', padding: '4px 0' }}>
                  +{items.length - 6} ещё
                </div>
              )}
              {items.length === 0 && (
                <div style={{ fontSize: 12, color: '#9A9AA2', textAlign: 'center', padding: '10px 0' }}>
                  Нет элементов — добавьте вручную или из тренажёра
                </div>
              )}
            </div>
          </div>
        )}

        <AnimatePresence>
          {saved && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#DFF8D6', borderRadius: 12, fontSize: 13, fontWeight: 600, color: '#1a7a3f' }}>
              <Check size={14} strokeWidth={2.5} /> Сохранено
            </motion.div>
          )}
        </AnimatePresence>
        <SaveBtn accent="#1a7a3f" accentBg="#DFF8D6" onClick={handleSave} />
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
        background: isSelected ? course.bg : 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(16px) saturate(180%)', WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: isSelected ? `1.5px solid ${course.color}` : '1px solid rgba(255,255,255,0.9)',
        borderRadius: 20, padding: 18, cursor: 'pointer',
        boxShadow: isSelected ? `0 0 0 3px ${course.color}22, 0 6px 24px rgba(0,0,0,0.08)` : '0 3px 16px rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column', gap: 10, transition: 'all 0.18s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: course.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <BookOpen size={17} strokeWidth={2} style={{ color: course.color }} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: STATUS_COLOR[course.status], background: STATUS_BG[course.status], borderRadius: 7, padding: '2px 8px' }}>
          {STATUS_LABEL[course.status]}
        </span>
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0B0B0D', lineHeight: 1.3, marginBottom: 4 }}>{course.title}</div>
        <div style={{ fontSize: 11, color: '#9A9AA2' }}>{course.subject} · {course.level}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#6F6F76', fontSize: 12 }}>
          <GraduationCap size={13} strokeWidth={1.8} />
          <span>{course.lessons.length} уроков</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#9A9AA2', fontSize: 11 }}>
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
        background: isSelected ? trainer.bg : 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(16px) saturate(180%)', WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: isSelected ? `1.5px solid ${trainer.color}` : '1px solid rgba(255,255,255,0.9)',
        borderRadius: 20, padding: 18, cursor: 'pointer',
        boxShadow: isSelected ? `0 0 0 3px ${trainer.color}22, 0 6px 24px rgba(0,0,0,0.08)` : '0 3px 16px rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column', gap: 10, transition: 'all 0.18s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: trainer.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Zap size={17} strokeWidth={2} style={{ color: trainer.color }} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: DIFF_COLOR[trainer.difficulty], background: DIFF_BG[trainer.difficulty], borderRadius: 6, padding: '2px 7px' }}>
          {DIFF_LABEL[trainer.difficulty]}
        </span>
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0B0B0D', lineHeight: 1.3, marginBottom: 4 }}>{trainer.title}</div>
        <div style={{ fontSize: 11, color: '#9A9AA2' }}>{trainer.topic} · {trainer.timePerQuestion} мин/вопрос</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#6F6F76', fontSize: 12 }}>
          <FileText size={13} strokeWidth={1.8} />
          <span>{trainer.questions.length} вопросов</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#9A9AA2', fontSize: 11 }}>
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
        background: isSelected ? WTYPE_BG[widget.type] : 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(16px) saturate(180%)', WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: isSelected ? `1.5px solid ${WTYPE_COLOR[widget.type]}` : '1px solid rgba(255,255,255,0.9)',
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
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0B0B0D', lineHeight: 1.3, marginBottom: 4 }}>{widget.title}</div>
        <div style={{ fontSize: 11, color: '#9A9AA2' }}>{widget.items.length} элементов</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#6F6F76', fontSize: 12 }}>
          <Layers size={13} strokeWidth={1.8} />
          {widget.linkedTrainerId
            ? <span style={{ color: '#7B3FCC' }}><Link2 size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />Из тренажёра</span>
            : <span>Вручную</span>
          }
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#9A9AA2', fontSize: 11 }}>
          <Clock size={11} strokeWidth={2} />{widget.lastEdited}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Tab + create button ──────────────────────────────────────────────────────
function TabBtn({ tab, activeTab, label, icon: Icon, color, bg, onClick, onPlus }: {
  tab: Tab; activeTab: Tab; label: string; icon: React.ElementType
  color: string; bg: string; onClick: () => void; onPlus: () => void
}) {
  const isActive = tab === activeTab
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <motion.button
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onClick}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', borderRadius: isActive ? '16px 0 0 16px' : 16,
          border: 'none', cursor: 'pointer',
          background: isActive ? bg : 'rgba(255,255,255,0.6)',
          color: isActive ? color : '#6F6F76', fontSize: 14, fontWeight: 600,
          boxShadow: isActive ? `0 0 0 1.5px ${color}44, 0 4px 14px rgba(0,0,0,0.06)` : '0 2px 8px rgba(0,0,0,0.04)',
          transition: 'all 0.15s',
        }}>
        <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />{label}
      </motion.button>
      <AnimatePresence>
        {isActive && (
          <motion.button
            key="plus"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 36, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.9 }}
            onClick={e => { e.stopPropagation(); onPlus() }}
            style={{
              height: 40, borderRadius: '0 14px 14px 0', border: 'none', cursor: 'pointer',
              background: color, color: '#fff', overflow: 'hidden', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 12px ${color}55`,
            }}
          >
            <Plus size={15} strokeWidth={2.6} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Inline question creation card ────────────────────────────────────────────
function NewQuestionCard({ onSave, onCancel }: {
  onSave: (q: TrainerQ) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('Химия')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [part, setPart] = useState<1 | 2>(1)
  const [answers, setAnswers] = useState(['', '', '', ''])
  const [correctIdx, setCorrectIdx] = useState(0)
  const [explanation, setExplanation] = useState('')

  function handleSave() {
    if (!title.trim()) return
    const q: TrainerQ = {
      id: uid(),
      text: title.trim(),
      answer: answers[correctIdx] || '',
      subject,
      answers: answers.map((text, i) => ({ id: `a${i + 1}`, text, correct: i === correctIdx })),
      explanation: explanation.trim(),
      difficulty,
      part,
      source: 'manual',
    }
    onSave(q)
  }

  const accentColor = '#8B4900'
  const accentBg = '#FFE4BD'

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      style={{
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: `1.5px solid rgba(139,73,0,0.18)`,
        borderRadius: 20, padding: '18px 20px',
        display: 'flex', flexDirection: 'column', gap: 14,
        boxShadow: '0 6px 28px rgba(139,73,0,0.1), 0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 9, background: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={13} strokeWidth={2.3} style={{ color: accentColor }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: accentColor }}>Новый вопрос</span>
        </div>
        <button onClick={onCancel}
          style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6F6F76' }}>
          <X size={12} />
        </button>
      </div>

      {/* Meta: subject / difficulty / part */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 72px', gap: 8 }}>
        <div><Label>Предмет</Label>
          <select value={subject} onChange={e => setSubject(e.target.value)} style={{ ...inputSt, appearance: 'none', cursor: 'pointer' }}>
            <option>Химия</option><option>Биология</option>
          </select>
        </div>
        <div><Label>Сложность</Label>
          <select value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty)} style={{ ...inputSt, appearance: 'none', cursor: 'pointer' }}>
            <option value="easy">Лёгкий</option>
            <option value="medium">Средний</option>
            <option value="hard">Сложный</option>
          </select>
        </div>
        <div><Label>Часть</Label>
          <select value={part} onChange={e => setPart(Number(e.target.value) as 1 | 2)} style={{ ...inputSt, appearance: 'none', cursor: 'pointer' }}>
            <option value={1}>1</option>
            <option value={2}>2</option>
          </select>
        </div>
      </div>

      {/* Question text */}
      <div><Label>Вопрос</Label>
        <textarea value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Введите текст вопроса…" rows={3}
          style={{ ...inputSt, resize: 'vertical', minHeight: 68 }} />
      </div>

      {/* 4 answer options */}
      <div>
        <Label>Варианты ответа — отметьте верный</Label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
          {answers.map((ans, i) => {
            const isCorrect = correctIdx === i
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => setCorrectIdx(i)}
                  style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    border: isCorrect ? 'none' : '2px solid #C2C2C8',
                    background: isCorrect ? accentColor : 'transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  {isCorrect && <Check size={10} strokeWidth={3} style={{ color: '#fff' }} />}
                </button>
                <span style={{
                  width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                  background: isCorrect ? accentBg : '#F0F0F2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700,
                  color: isCorrect ? accentColor : '#9A9AA2',
                }}>{String.fromCharCode(65 + i)}</span>
                <input
                  value={ans}
                  onChange={e => setAnswers(prev => prev.map((a, j) => j === i ? e.target.value : a))}
                  placeholder={`Вариант ${String.fromCharCode(65 + i)}…`}
                  style={{
                    ...inputSt, flex: 1,
                    border: isCorrect ? `1.5px solid rgba(139,73,0,0.35)` : '1.5px solid rgba(0,0,0,0.1)',
                    background: isCorrect ? '#FFF8F0' : '#F9F9FB',
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Explanation */}
      <div><Label>Объяснение (показывается студенту после ответа)</Label>
        <textarea value={explanation} onChange={e => setExplanation(e.target.value)}
          placeholder="Почему этот ответ верный…" rows={2}
          style={{ ...inputSt, resize: 'vertical', minHeight: 52, background: '#F0FBF4' }} />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel}
          style={{ flex: 1, padding: '10px 0', borderRadius: 14, border: '1.5px solid rgba(0,0,0,0.1)', cursor: 'pointer', background: 'transparent', fontSize: 13, fontWeight: 600, color: '#6F6F76' }}>
          Отмена
        </button>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleSave}
          style={{ flex: 2, padding: '10px 0', borderRadius: 14, border: 'none', cursor: title.trim() ? 'pointer' : 'not-allowed', background: title.trim() ? accentBg : '#F5F5F6', color: title.trim() ? accentColor : '#9A9AA2', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s' }}>
          <Check size={14} strokeWidth={2.5} />
          Сохранить вопрос
        </motion.button>
      </div>
    </motion.div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function TeacherConstructorPage() {
  const [activeTab, setActiveTab] = useState<Tab>('course')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showNewCard, setShowNewCard] = useState(false)
  const [courses, setCourses] = useState<Course[]>(COURSES_INIT)
  const [trainers, setTrainers] = useState<Trainer[]>(TRAINERS_INIT)
  const [widgets, setWidgets] = useState<Widget[]>(WIDGETS_INIT)

  const selectedCourse  = courses.find(c => c.id === selectedId) ?? null
  const selectedTrainer = trainers.find(t => t.id === selectedId) ?? null
  const selectedWidget  = widgets.find(w => w.id === selectedId) ?? null

  function openItem(id: string) { setSelectedId(prev => prev === id ? null : id) }
  function closeEditor() { setSelectedId(null) }

  function handleTabChange(t: Tab) {
    setActiveTab(t); setSelectedId(null); setShowNewCard(false)
  }

  function handlePlus() {
    if (activeTab === 'trainer') {
      setShowNewCard(true)
      setSelectedId(null)
    } else if (activeTab === 'course') {
      const c: Course = { id: uid(), title: 'Новый курс', subject: 'Химия', level: 'ЕГЭ', description: '', lessons: [], color: '#B98FFF', bg: '#EFE0FF', status: 'draft', lastEdited: new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) }
      setCourses(prev => [c, ...prev]); setSelectedId(c.id)
    } else {
      const w: Widget = { id: uid(), title: 'Новый виджет', type: 'quiz', linkedTrainerId: null, items: [], color: WTYPE_COLOR.quiz, bg: WTYPE_BG.quiz, lastEdited: new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) }
      setWidgets(prev => [w, ...prev]); setSelectedId(w.id)
    }
  }

  function saveNewQuestion(q: TrainerQ) {
    const dateStr = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
    if (selectedTrainer) {
      const updated = { ...selectedTrainer, questions: [q, ...selectedTrainer.questions], lastEdited: dateStr }
      setTrainers(prev => prev.map(t => t.id === updated.id ? updated : t))
    } else {
      const t: Trainer = {
        id: uid(), title: q.text.slice(0, 50), topic: TOPICS[0],
        difficulty: q.difficulty ?? 'medium', timePerQuestion: 2,
        questions: [q], color: '#9B6DFF', bg: '#E4D9FF', lastEdited: dateStr,
      }
      setTrainers(prev => [t, ...prev])
      setSelectedId(t.id)
    }
    setShowNewCard(false)
  }

  const tabCfg = {
    course:  { label: 'Курс',     Icon: BookOpen, color: '#7B3FCC', bg: '#EEDBFF' },
    trainer: { label: 'Тренажёр', Icon: Zap,      color: '#8B4900', bg: '#FFE4BD' },
    widget:  { label: 'Виджет',   Icon: Layers,   color: '#1a7a3f', bg: '#DFF8D6' },
  }

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {/* Main scrollable area */}
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '0 32px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Tab selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {(['course', 'trainer', 'widget'] as Tab[]).map(t => {
            const cfg = tabCfg[t]
            return <TabBtn key={t} tab={t} activeTab={activeTab} label={cfg.label} icon={cfg.Icon} color={cfg.color} bg={cfg.bg}
              onClick={() => handleTabChange(t)} onPlus={handlePlus} />
          })}
        </div>

        {/* Inline new question form (trainer tab only) */}
        <AnimatePresence>
          {showNewCard && activeTab === 'trainer' && (
            <NewQuestionCard key="new-question" onSave={saveNewQuestion} onCancel={() => setShowNewCard(false)} />
          )}
        </AnimatePresence>

        {/* Card grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {activeTab === 'course' && courses.map(c => (
            <CourseCard key={c.id} course={c} isSelected={selectedId === c.id} onClick={() => openItem(c.id)} />
          ))}
          {activeTab === 'trainer' && trainers.map(t => (
            <TrainerCard key={t.id} trainer={t} isSelected={selectedId === t.id} onClick={() => openItem(t.id)} />
          ))}
          {activeTab === 'widget' && widgets.map(w => (
            <WidgetCard key={w.id} widget={w} isSelected={selectedId === w.id} onClick={() => openItem(w.id)} />
          ))}
        </div>
      </div>

      {/* Editor panel */}
      <AnimatePresence>
        {selectedCourse && activeTab === 'course' && (
          <CourseEditor key={selectedCourse.id} course={selectedCourse} trainers={trainers} widgets={widgets}
            onSave={c => setCourses(prev => prev.map(x => x.id === c.id ? c : x))} onClose={closeEditor} />
        )}
        {selectedTrainer && activeTab === 'trainer' && (
          <TrainerEditor key={selectedTrainer.id} trainer={selectedTrainer}
            onSave={t => setTrainers(prev => prev.map(x => x.id === t.id ? t : x))} onClose={closeEditor} />
        )}
        {selectedWidget && activeTab === 'widget' && (
          <WidgetEditor key={selectedWidget.id} widget={selectedWidget} trainers={trainers}
            onSave={w => setWidgets(prev => prev.map(x => x.id === w.id ? w : x))} onClose={closeEditor} />
        )}
      </AnimatePresence>
    </div>
  )
}
