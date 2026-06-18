export type Subject = 'biology' | 'chemistry'

export type QuestionType = 'choice' | 'free'
export type ScoreMode = 'perOption' | 'criteria' | 'whole'

export type AnswerType =
  | 'single' | 'multi' | 'short' | 'matching' | 'sequence' | 'tableFill' | 'extended'

export interface TaskChoice { id: string; text: string; correct: boolean; points?: number }
export interface TaskAnswerKey { id: string; keyword: string; points: number }
export interface TaskCriterion { id: string; text: string; points: number }

export interface Task {
  id: number
  subject: Subject
  section: string
  topic: string
  part: 1 | 2
  line: number
  source: string
  question: string
  questionTable?: { headers: string[]; rows: string[][]; emptyCells?: Record<string, boolean> }
  questionImage?: string
  questionImageSize?: number
  answer: string
  solution: string
  difficulty: 'easy' | 'medium' | 'hard'
  questionType?: QuestionType
  scoreMode?: ScoreMode
  choices?: TaskChoice[]
  answerKeys?: TaskAnswerKey[]
  criteria?: TaskCriterion[]
  criteriaVisibleOnCheck?: boolean
  maxPoints?: number
  answerType?: AnswerType
  matchLeft?: string[]
  matchRight?: string[]
  sequenceItems?: string[]
  allowPhoto?: boolean
  blockOrder?: Array<'image' | 'table'>
}

// ── Chemistry (ЕГЭ 2026) ─────────────────────────────────────────────────────

export const CHEMISTRY_SECTIONS = [
  'Строение вещества',
  'Неорганическая химия',
  'Органическая химия',
  'Химические реакции',
  'Расчётные задачи',
  'Задания части 2',
]

export const CHEMISTRY_TOPICS: Record<string, string[]> = {
  'Строение вещества': [
    'Строение атома',
    'Периодический закон. ПСЭ',
    'Химическая связь и строение молекул',
    'Кристаллические решётки',
    'Валентность. Степень окисления',
  ],
  'Неорганическая химия': [
    'Классификация неорганических веществ',
    'Реакции ионного обмена',
    'Свойства металлов и их соединений',
    'Свойства неметаллов и их соединений',
    'Цепочки превращений (неорганика)',
    'Оксиды. Кислоты. Основания. Соли',
    'Качественные реакции (неорганика)',
  ],
  'Органическая химия': [
    'Классификация органических веществ',
    'Строение органических молекул',
    'Углеводороды (свойства)',
    'Кислородсодержащие органические вещества',
    'Азотсодержащие органические вещества',
    'Биополимеры',
    'Распознавание углеводородов',
    'Распознавание кислородсодержащих',
    'Цепочки превращений (органика)',
    'Полимеры. Пластмассы. Каучуки',
  ],
  'Химические реакции': [
    'Классификация реакций',
    'Скорость химических реакций',
    'Химическое равновесие',
    'Электролиз',
    'Окислительно-восстановительные реакции',
    'Признаки химических реакций',
    'Правила работы с веществами',
  ],
  'Расчётные задачи': [
    'Молярная масса. Массовая доля',
    'Количество вещества. Объём газа',
    'Расчёты по растворам',
    'Тепловой эффект реакций',
    'Выход продукта реакции',
    'Расчёты со смесями',
    'Комбинированные расчёты',
  ],
  'Задания части 2': [
    'Цепочка превращений (6 веществ)',
    'Ионные уравнения (часть 2)',
    'ОВР методом электронного баланса',
    'Электролиз (расширенный)',
    'Расчётная задача (часть 2)',
  ],
}

/** Line number → topic name (ЕГЭ 2026, 34 задания) */
export const CHEMISTRY_LINES: Record<number, string> = {
  1:  'Строение атома',
  2:  'Периодический закон. ПСЭ',
  3:  'Строение вещества. Кристаллические решётки',
  4:  'Химическая связь',
  5:  'Классификация неорганических веществ',
  6:  'Реакции ионного обмена',
  7:  'Свойства металлов и их соединений',
  8:  'Свойства неметаллов и их соединений',
  9:  'Цепочки превращений (неорганика)',
  10: 'Классификация органических веществ',
  11: 'Строение органических молекул',
  12: 'Углеводороды и кислородсодержащие (свойства)',
  13: 'Азотсодержащие вещества. Биополимеры',
  14: 'Углеводороды (распознавание и применение)',
  15: 'Кислородсодержащие (распознавание и применение)',
  16: 'Цепочки превращений (органика)',
  17: 'Классификация химических реакций',
  18: 'Скорость химических реакций',
  19: 'Химическое равновесие',
  20: 'Электрохимия. Электролиз',
  21: 'Признаки химических реакций',
  22: 'Правила безопасности. Экология',
  23: 'Расчёты: молярная масса, доля',
  24: 'Расчёты: количество вещества, объём',
  25: 'Расчёты: растворы',
  26: 'Расчёты: тепловой эффект',
  27: 'Расчёты: выход продукта',
  28: 'Расчёты: смеси',
  29: 'Расчёты: комбинированные',
  30: 'Цепочка превращений (часть 2)',
  31: 'Ионные уравнения (часть 2)',
  32: 'ОВР (электронный баланс)',
  33: 'Электролиз (часть 2)',
  34: 'Расчётная задача (часть 2)',
}

// ── Biology (ЕГЭ 2026) ───────────────────────────────────────────────────────

export const BIOLOGY_SECTIONS = [
  'Биология как наука',
  'Клетка',
  'Организм',
  'Многообразие организмов',
  'Человек',
  'Экосистемы',
  'Эволюция и антропогенез',
  'Задания части 2',
]

export const BIOLOGY_TOPICS: Record<string, string[]> = {
  'Биология как наука': [
    'Разделы биологии',
    'Методы биологии',
    'Уровни организации живого',
    'Признаки живого',
  ],
  'Клетка': [
    'Химические элементы. Неорганические вещества клетки',
    'Органические вещества клетки',
    'ДНК. РНК. АТФ',
    'Строение клетки. Органоиды',
    'Прокариоты и эукариоты',
    'Сравнение клеток разных царств',
    'Фотосинтез. Хемосинтез',
    'Энергетический обмен',
    'Биосинтез белка',
    'Клеточный цикл. Митоз',
    'Мейоз',
  ],
  'Организм': [
    'Размножение организмов',
    'Гаметогенез',
    'Онтогенез',
    'Хромосомы и кариотип',
    'Законы Менделя',
    'Сцепленное наследование',
    'Генетика пола',
    'Взаимодействие генов',
    'Изменчивость',
    'Основы селекции',
    'Биотехнология',
  ],
  'Многообразие организмов': [
    'Вирусы',
    'Бактерии',
    'Грибы. Лишайники',
    'Растения (систематика и строение)',
    'Животные (систематика и строение)',
    'Сравнение разных царств',
  ],
  'Человек': [
    'Опорно-двигательная система',
    'Сердечно-сосудистая система',
    'Дыхательная система',
    'Пищеварительная система',
    'Выделительная система',
    'Нервная система',
    'Высшая нервная деятельность',
    'Эндокринная система',
    'Органы чувств',
    'Размножение и развитие человека',
    'Гигиена и здоровье',
  ],
  'Экосистемы': [
    'Пищевые цепи',
    'Экологические факторы',
    'Биогеоценоз и экосистема',
    'Круговорот веществ и поток энергии',
    'Биосфера',
    'Антропогенное воздействие',
    'Агроэкосистемы',
  ],
  'Эволюция и антропогенез': [
    'Теории эволюции',
    'Движущие силы эволюции',
    'Видообразование',
    'Доказательства эволюции',
    'Антропогенез',
    'Систематические категории',
  ],
  'Задания части 2': [
    'Анализ биологического текста',
    'Задания с рисунком',
    'Задача по генетике',
    'Задача по цитологии',
    'Сравнение биологических объектов',
    'Задача по экологии',
    'Общебиологическая задача',
  ],
}

/** Line number → topic name (ЕГЭ 2026, 29 заданий) */
export const BIOLOGY_LINES: Record<number, string> = {
  1:  'Биология как наука. Методы исследования',
  2:  'Уровни организации. Признаки живого',
  3:  'Химический состав клетки',
  4:  'Строение клетки. Органоиды',
  5:  'Обмен веществ. Фотосинтез',
  6:  'Деление клетки. Жизненный цикл',
  7:  'Размножение организмов',
  8:  'Онтогенез. Индивидуальное развитие',
  9:  'Генетика: законы Менделя',
  10: 'Генетика: сцепленное наследование и пол',
  11: 'Генетика: решение задач',
  12: 'Изменчивость',
  13: 'Основы селекции. Биотехнология',
  14: 'Многообразие организмов',
  15: 'Вирусы. Бактерии. Грибы',
  16: 'Растения',
  17: 'Животные',
  18: 'Человек: опора, движение, кровообращение',
  19: 'Человек: дыхание, пищеварение, нервная система',
  20: 'Экосистемы. Пищевые цепи',
  21: 'Биосфера. Круговорот веществ',
  22: 'Эволюция. Антропогенез',
  23: 'Задание с текстом (часть 2)',
  24: 'Задание с рисунком (часть 2)',
  25: 'Сравнение биологических объектов (часть 2)',
  26: 'Задача по генетике (часть 2)',
  27: 'Задача по цитологии (часть 2)',
  28: 'Задача по экологии (часть 2)',
  29: 'Общебиологическая задача (часть 2)',
}

export const SOURCES = ['ЕГЭ 2023', 'ЕГЭ 2024', 'ЕГЭ 2025', 'Досрочный 2024', 'Досрочный 2025', 'Пробный 2025', 'Пробный 2026', 'Авторский']

// ── Smart filter: section → recommended lines (primary first) ────────────────
export const BIOLOGY_SECTION_LINE_MAP: Record<string, { lines: number[]; part2Lines: number[] }> = {
  'Биология как наука':        { lines: [1, 2],                    part2Lines: [] },
  'Клетка':                    { lines: [3, 4, 5, 6],              part2Lines: [27] },
  'Организм':                  { lines: [7, 8, 9, 10, 11, 12, 13], part2Lines: [26] },
  'Многообразие организмов':   { lines: [14, 15, 16, 17],          part2Lines: [24, 25] },
  'Человек':                   { lines: [18, 19],                  part2Lines: [25] },
  'Экосистемы':                { lines: [20, 21],                  part2Lines: [28] },
  'Эволюция и антропогенез':   { lines: [22],                      part2Lines: [29] },
  'Задания части 2':           { lines: [],                        part2Lines: [23, 24, 25, 26, 27, 28, 29] },
}

// ── Smart filter: chemistry section → lines (mirrors biology) ────────────────
export const CHEMISTRY_SECTION_LINE_MAP: Record<string, { lines: number[]; part2Lines: number[] }> = {
  'Строение вещества':    { lines: [1, 2, 3, 4],                 part2Lines: [] },
  'Неорганическая химия': { lines: [5, 6, 7, 8, 9],              part2Lines: [31] },
  'Органическая химия':   { lines: [10, 11, 12, 13, 14, 15, 16], part2Lines: [30] },
  'Химические реакции':   { lines: [17, 18, 19, 20, 21, 22],     part2Lines: [32, 33] },
  'Расчётные задачи':     { lines: [23, 24, 25, 26, 27, 28, 29], part2Lines: [34] },
  'Задания части 2':      { lines: [],                           part2Lines: [30, 31, 32, 33, 34] },
}

// ── Curriculum registry — the live taxonomy behind every trainer filter ──────
// Seeded from the static maps above, but the teacher's "Банк заданий" tab can
// override it at runtime (persisted in curriculumStore). Every cascade helper
// and option list reads through here, so edits propagate to both trainers.
export type SubjectCurriculum = {
  sections: string[]
  topics: Record<string, string[]>
  lineNames: Record<number, string>
  sectionLineMap: Record<string, { lines: number[]; part2Lines: number[] }>
}

const STATIC_CURRICULUM: Record<Subject, SubjectCurriculum> = {
  biology:   { sections: BIOLOGY_SECTIONS,   topics: BIOLOGY_TOPICS,   lineNames: BIOLOGY_LINES,   sectionLineMap: BIOLOGY_SECTION_LINE_MAP },
  chemistry: { sections: CHEMISTRY_SECTIONS, topics: CHEMISTRY_TOPICS, lineNames: CHEMISTRY_LINES, sectionLineMap: CHEMISTRY_SECTION_LINE_MAP },
}
const runtimeCurriculum: Record<Subject, SubjectCurriculum> = {
  biology:   STATIC_CURRICULUM.biology,
  chemistry: STATIC_CURRICULUM.chemistry,
}
/** Replace the live taxonomy for a subject (called by curriculumStore). */
export function setRuntimeCurriculum(subject: Subject, c: SubjectCurriculum) { runtimeCurriculum[subject] = c }
export function getStaticCurriculum(subject: Subject): SubjectCurriculum { return STATIC_CURRICULUM[subject] }

// ── Cascade helpers — shared by the student & teacher trainers ───────────────
// All selection arrays use "empty = no constraint" semantics.
export function sectionsForSubject(subject: Subject): string[] {
  return runtimeCurriculum[subject].sections
}
export function sectionLineMap(subject: Subject): Record<string, { lines: number[]; part2Lines: number[] }> {
  return runtimeCurriculum[subject].sectionLineMap
}
export function topicsForSubject(subject: Subject): Record<string, string[]> {
  return runtimeCurriculum[subject].topics
}
export function lineNamesForSubject(subject: Subject): Record<number, string> {
  return runtimeCurriculum[subject].lineNames
}

/** Line numbers implied by the chosen sections + parts. Empty selection = unconstrained. */
export function linesForSelection(subject: Subject, sections: string[], parts: string[]): number[] {
  const map = sectionLineMap(subject)
  const want1 = parts.length === 0 || parts.includes('1')
  const want2 = parts.length === 0 || parts.includes('2')
  const entries = sections.length ? sections.map(s => map[s]).filter(Boolean) : Object.values(map)
  const set = new Set<number>()
  for (const e of entries) {
    if (want1) e.lines.forEach(n => set.add(n))
    if (want2) e.part2Lines.forEach(n => set.add(n))
  }
  return [...set].sort((a, b) => a - b)
}

/** Topics implied by the chosen sections (union). Empty selection = all topics. */
export function topicsForSelection(subject: Subject, sections: string[]): string[] {
  const map = topicsForSubject(subject)
  const src = sections.length ? sections.flatMap(s => map[s] ?? []) : Object.values(map).flat()
  return [...new Set(src)]
}

/** Which exam part (1 or 2) a line belongs to, per the curriculum map. */
export function partOfLine(subject: Subject, line: number): 1 | 2 {
  for (const e of Object.values(sectionLineMap(subject))) {
    if (e.part2Lines.includes(line)) return 2
  }
  return 1
}

// Lines to sample for diagnostic (one rep per major topic cluster)
export const BIOLOGY_DIAGNOSTIC_SAMPLE_LINES = [1, 3, 5, 7, 9, 14, 16, 18, 20, 22]

// Learning route: ordered from foundational to complex
export const BIOLOGY_ROUTE: Array<{ lines: number[]; label: string; section: string }> = [
  { lines: [1, 2],    label: 'Биология как наука',   section: 'Биология как наука' },
  { lines: [3, 4],    label: 'Состав и строение клетки', section: 'Клетка' },
  { lines: [5, 6],    label: 'Метаболизм и деление', section: 'Клетка' },
  { lines: [7, 8],    label: 'Размножение и развитие', section: 'Организм' },
  { lines: [9, 10, 11], label: 'Генетика',           section: 'Организм' },
  { lines: [12, 13],  label: 'Изменчивость и селекция', section: 'Организм' },
  { lines: [14, 15],  label: 'Многообразие организмов', section: 'Многообразие организмов' },
  { lines: [16, 17],  label: 'Растения и животные',  section: 'Многообразие организмов' },
  { lines: [18, 19],  label: 'Человек',              section: 'Человек' },
  { lines: [20, 21],  label: 'Экосистемы',           section: 'Экосистемы' },
  { lines: [22],      label: 'Эволюция',             section: 'Эволюция и антропогенез' },
  { lines: [26, 27],  label: 'Задачи Ч2: генетика и цитология', section: 'Задания части 2' },
  { lines: [23, 24, 25, 28, 29], label: 'Остальные задания Ч2', section: 'Задания части 2' },
]

export const tasks: Task[] = []
