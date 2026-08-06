// ─── Единый реестр типов заданий ─────────────────────────────────────────────
//
// ЭТО ЕДИНСТВЕННЫЙ ИСТОЧНИК ПРАВДЫ о типах заданий.
//
// Раньше union типов был продублирован в пяти файлах (mockData, lessonContent
// ×2, TeacherCourseEditorPage, TeacherHomeworkCreatePage) плюс шестой вариант
// в банке заданий и седьмое написание в CHECK-констрейнте БД. Проверка ответов
// была написана дважды и по-разному: `sequence` автопроверялся в домашках, но
// не в тестах, а `multi` на пути домашки не выражался вовсе.
//
// Добавляя новый тип задания, меняй ТОЛЬКО этот файл:
//   1. добавь идентификатор в TaskTypeId
//   2. добавь запись в TASK_TYPES
//   3. добавь цвет в TYPE_VISUALS (src/data/taskTypeVisuals.ts)
//   4. добавь Editor/Solver в соответствующие компоненты по ключу типа
//
// Всё остальное — палитра выбора типа у учителя, фабрика значений по умолчанию,
// автопроверка, признак «нужна проверка учителем» — подтянется само.

import type { ElementType } from 'react'
import {
  AlignLeft, ArrowUpDown, CheckSquare, Image as ImageIcon, Images, Layers,
  Mic, PenLine, Repeat, Shuffle, SpellCheck, Table as TableIcon, Type, Volume2,
} from 'lucide-react'
import { typeVisual, normalizeTaskType as normalizeRaw, type TypeVisual } from './taskTypeVisuals'

// ─── Идентификаторы ──────────────────────────────────────────────────────────

/** Канонические типы заданий. Легаси-псевдонимы приводятся normalizeTaskType(). */
export type TaskTypeId =
  // — базовые (были до языковых курсов) —
  | 'single'        // один верный вариант
  | 'multi'         // несколько верных вариантов
  | 'fill'          // вписать слово/фразу
  | 'extended'      // развёрнутый ответ (проверяет учитель)
  | 'matching'      // сопоставление пар
  | 'sequence'      // расставить по порядку
  | 'tableFill'     // заполнить пропуски в таблице
  | 'whiteboard'    // рисунок на доске
  // — языковые —
  | 'wordBank'      // собрать предложение из плиток-слов
  | 'listenType'    // диктант: услышал → напечатал
  | 'listenBank'    // диктант с банком слов (плитки вместо клавиатуры)
  | 'minimalPair'   // услышал один из двух похожих слогов → какой?
  | 'speaking'      // записать голос (проверяет учитель и/или ИИ)
  | 'imageDescribe' // описать картинку (письменно или устно)
  | 'imageCompare'  // сравнить две-три картинки
  | 'flashcard'     // словарная карточка
  | 'pattern'       // подстановочный дрилл: один шаблон, несколько замен

/**
 * Написания, встречающиеся в данных, записанных до переименования типов:
 * строки из БД и JSONB-домашек. На чтении приводятся normalizeTaskType().
 * Новый код должен писать только TaskTypeId.
 */
export type LegacyTaskType = 'text' | 'choice' | 'match' | 'table' | 'short'

/** Тип, каким он может прийти из данных: канонический либо легаси. */
export type StoredTaskType = TaskTypeId | LegacyTaskType

/** Семейство ответа — определяет цвет и группировку в палитре выбора. */
export type TaskFamily = 'choice' | 'input' | 'order' | 'audio' | 'production' | 'vocab'

// ─── Данные задания ──────────────────────────────────────────────────────────

/**
 * Одна строка подстановочного дрилла.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ ТИП, А НЕ ПЯТЬ ОБЫЧНЫХ «ВПИСАТЬ ОТВЕТ». Дрилл работает
 * только пачкой: смысл в том, что шаблон один, а меняется ровно одно место, и
 * ученик видит это своими глазами — на пятой строке рука уже сама ставит
 * нужную форму. Пять разрозненных заданий этого не дают: между ними теряется
 * то самое «одно и то же, кроме одного».
 */
export interface PatternItem {
  /** Что подставляем: слово или форма. Показывается ученику. */
  cue: string
  /** Что должно получиться целиком — эталон строки. */
  answer: string
  /** Другие принимаемые записи (пробелы, синонимичные формы). */
  alt?: string[]
  /** Перевод получившегося предложения — открывается после проверки. */
  gloss?: string
}

export interface TaskTable {
  headers: string[]
  rows: string[][]
  emptyCells?: Record<string, boolean>
  blankCells?: Record<string, boolean>
  cellImages?: Record<string, string>
  cellImageSizes?: Record<string, number>
}

/**
 * Надмножество полей задания. Конкретный тип использует своё подмножество —
 * какое именно, указано в TASK_TYPES[type].fields.
 *
 * Исторически это же надмножество (минус языковые поля) разошлось по трём
 * почти одинаковым интерфейсам: TestTask (mockData), HWTask (редакторы) и
 * AuthoredHomeworkTask (lessonContent). Они постепенно сводятся сюда.
 */
export interface TaskPayload {
  id: string
  /** Может прийти легаси-написанием из старых данных — читать через taskTypeDef(). */
  type: StoredTaskType
  isHard: boolean
  label: string
  question?: string

  // выбор
  choices?: string[]
  correctChoices?: number[]

  // ввод
  answer?: string
  /** Дополнительные принимаемые формулировки — против придирок к синонимам. */
  altAnswers?: string[]

  // пары / порядок / таблица
  pairs?: Array<{ left: string; right: string }>
  sequenceItems?: string[]
  table?: TaskTable

  // условие-картинка (у любого типа)
  image?: string
  imageSize?: number

  // ── языковые поля ──

  /** wordBank / listenBank — эталонное предложение (по пробелам режется на плитки). */
  sentence?: string
  /** wordBank / listenBank — лишние плитки-обманки. */
  distractors?: string[]

  /** Аудио: готовый файл в Storage либо текст для синтеза (кэшируется по хешу). */
  audioUrl?: string
  ttsText?: string
  ttsVoice?: string
  /** Разрешить замедленное воспроизведение (кнопка «черепаха»). */
  allowSlow?: boolean

  /** minimalPair — два похожих варианта и какой из них прозвучал. */
  pairA?: string
  pairB?: string
  correctPair?: 'A' | 'B'

  /** speaking / imageDescribe — сколько секунд смотреть и сколько говорить. */
  prepSeconds?: number
  responseSeconds?: number
  /** speaking — эталонный текст (если задание «прочитай вслух», а не свободное). */
  targetText?: string

  /** imageDescribe / imageCompare — картинки. */
  images?: string[]
  /** Режим ответа. */
  responseMode?: 'write' | 'speak'

  /**
   * Опорные данные для дешёвой проверки описания картинки БЕЗ отправки самой
   * картинки модели на каждой проверке (в 5–50 раз дешевле и без галлюцинаций).
   * Заполняются один раз при создании задания.
   */
  referenceAnswer?: string
  /** Что на картинке действительно есть. */
  facts?: string[]
  /** Чего на картинке нет, но что правдоподобно приписать. Ловит шаблонные ответы. */
  distractorFacts?: string[]
  /** Какие конструкции ожидаем услышать (сравнительные, предлоги места…). */
  expectedStructures?: string[]

  /**
   * Текст для чтения, показывается НАД условием задания.
   *
   * Нужен для экзаменационного чтения (TOPIK, IELTS, JLPT), где к одному
   * объявлению или заметке идёт несколько вопросов: у всех этих заданий
   * passage одинаковый, а решатель показывает его один раз на группу подряд
   * идущих заданий с совпадающим текстом.
   */
  passage?: string
  /** Заголовок отрывка («Объявление», «Расписание»). */
  passageTitle?: string
  /** Перевод отрывка — открывается по кнопке ПОСЛЕ ответа, не до. */
  passageTranslation?: string

  /**
   * pattern — шаблон предложения, место подстановки отмечено многоточием «…».
   *
   * Например «저는 …이에요» или «Eu … todos os dias». Показывается ученику
   * шапкой задания: дрилл тренирует не отдельное предложение, а конструкцию.
   */
  pattern?: string
  /** pattern — перевод шаблона: без него конструкция остаётся набором знаков. */
  patternGloss?: string
  /** pattern — строки дрилла: что подставляем и что должно получиться. */
  patternItems?: PatternItem[]

  /** flashcard — лицевая и оборотная сторона. */
  front?: string
  back?: string
  /**
   * flashcard — чтение слова (романизация, кана, транскрипция).
   *
   * Хранится отдельно от лица карточки, а не склеивается с ним: ученику нужен
   * тумблер «показывать чтение», а из строки «우유 (uyu)» его уже не вынуть.
   */
  reading?: string

  /** Для языковых заданий: код изучаемого языка (ko, ja, pt-BR, en). */
  lang?: string

  /** id исходного задания в банке. */
  bankId?: number
}

/** Ответ ученика. Сериализуемый, одна форма на тип. */
export type TaskAnswer =
  | string                    // fill / extended / listenType / speaking (путь к аудио)
  | number                    // single (индекс варианта)
  | number[]                  // multi (индексы) / sequence, wordBank (порядок)
  | string[]                  // listenBank (слова в порядке)
  | Record<string, string>    // tableFill (ключ ячейки → значение), matching (левое → правое)
  | null

export interface GradeResult {
  /** Удалось ли проверить автоматически. */
  auto: boolean
  /** Верно ли (имеет смысл только при auto === true). */
  correct: boolean
}

const NOT_AUTO: GradeResult = { auto: false, correct: false }

// ─── Нормализация ответов ────────────────────────────────────────────────────

/** Сравнение свободного ответа: регистр, лишние пробелы и хвостовая пунктуация не важны. */
export function normAnswer(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.!?。！？]+$/u, '')
}

/** Совпал ли ответ с эталоном или с одним из альтернативных вариантов. */
function matchesText(given: string, t: TaskPayload): boolean {
  const target = normAnswer(given)
  if (t.answer && normAnswer(t.answer) === target) return true
  return (t.altAnswers ?? []).some(a => normAnswer(a) === target)
}

/**
 * Ячейки таблицы, которые заполняет ученик, — ключи «строка,столбец».
 * Пропуск считается проверяемым только если в эталонной строке для него есть
 * непустое значение: иначе сверять не с чем.
 */
function fillableCellKeys(t: TaskPayload): string[] {
  const rows = t.table?.rows ?? []
  const empty = t.table?.emptyCells ?? {}
  return Object.keys(empty).filter(key => {
    if (!empty[key]) return false
    const [r, c] = key.split(',').map(Number)
    return !!rows[r]?.[c]?.trim()
  })
}

/** Слова эталонного предложения — плитки для сборки. */
export function sentenceTokens(sentence: string): string[] {
  return sentence.trim().split(/\s+/).filter(Boolean)
}

// ─── Определение типа ────────────────────────────────────────────────────────

export interface TaskTypeDef {
  id: TaskTypeId
  family: TaskFamily
  /** Подпись в палитре выбора у учителя. Оборачивать в t() на месте показа. */
  label: string
  hint: string
  Icon: ElementType
  visual: TypeVisual
  /** Пустая заготовка при добавлении задания. */
  makeDefault(): Partial<TaskPayload>
  /** Можно ли это задание проверить машиной (при текущем содержимом). */
  isGradable(t: TaskPayload): boolean
  /** Проверка. Возвращает auto: false, если тип или содержимое не проверяемы. */
  grade(t: TaskPayload, a: TaskAnswer): GradeResult
  /** Требует глаз учителя (свободная продукция). */
  needsTeacherReview: boolean
  /** Нужен ли звук — чтобы редактор показал поле аудио. */
  needsAudio: boolean
  /** Доступен ли как «сложное» задание (раунды с учителем). */
  allowedAsHard: boolean
  /** Только для языковых курсов — не засорять палитру у предметников. */
  languageOnly: boolean
}

function def(d: Omit<TaskTypeDef, 'visual'>): TaskTypeDef {
  return { ...d, visual: typeVisual(d.id) }
}

// ─── Реестр ──────────────────────────────────────────────────────────────────

export const TASK_TYPES: Record<TaskTypeId, TaskTypeDef> = {
  // ── базовые ──

  single: def({
    id: 'single', family: 'choice',
    label: 'Один ответ', hint: 'Один верный вариант',
    Icon: CheckSquare,
    makeDefault: () => ({ choices: ['', '', '', ''], correctChoices: [0] }),
    isGradable: t => (t.choices?.length ?? 0) > 0 && (t.correctChoices?.length ?? 0) > 0,
    grade: (t, a) => {
      if (!TASK_TYPES.single.isGradable(t)) return NOT_AUTO
      return { auto: true, correct: typeof a === 'number' && (t.correctChoices ?? []).includes(a) }
    },
    needsTeacherReview: false, needsAudio: false, allowedAsHard: true, languageOnly: false,
  }),

  multi: def({
    id: 'multi', family: 'choice',
    label: 'Несколько верных', hint: 'Несколько вариантов',
    Icon: CheckSquare,
    makeDefault: () => ({ choices: ['', '', '', ''], correctChoices: [0] }),
    isGradable: t => (t.correctChoices?.length ?? 0) > 0,
    grade: (t, a) => {
      if (!TASK_TYPES.multi.isGradable(t)) return NOT_AUTO
      if (!Array.isArray(a)) return { auto: true, correct: false }
      const want = [...(t.correctChoices ?? [])].sort((x, y) => x - y)
      const got = [...(a as number[])].sort((x, y) => x - y)
      return { auto: true, correct: want.length === got.length && want.every((v, i) => v === got[i]) }
    },
    needsTeacherReview: false, needsAudio: false, allowedAsHard: true, languageOnly: false,
  }),

  fill: def({
    id: 'fill', family: 'input',
    label: 'Вписать ответ', hint: 'Слово / фраза',
    Icon: Type,
    makeDefault: () => ({}),
    isGradable: t => !!t.answer?.trim(),
    grade: (t, a) => {
      if (!TASK_TYPES.fill.isGradable(t)) return NOT_AUTO
      return { auto: true, correct: typeof a === 'string' && matchesText(a, t) }
    },
    needsTeacherReview: false, needsAudio: false, allowedAsHard: false, languageOnly: false,
  }),

  extended: def({
    id: 'extended', family: 'production',
    label: 'Развёрнутый ответ', hint: 'Текст, рассуждение',
    Icon: AlignLeft,
    makeDefault: () => ({}),
    // Автопроверка только если учитель задал эталон; иначе идёт к учителю.
    isGradable: t => !!t.answer?.trim(),
    grade: (t, a) => {
      if (!TASK_TYPES.extended.isGradable(t)) return NOT_AUTO
      return { auto: true, correct: typeof a === 'string' && matchesText(a, t) }
    },
    needsTeacherReview: true, needsAudio: false, allowedAsHard: true, languageOnly: false,
  }),

  matching: def({
    id: 'matching', family: 'order',
    label: 'Сопоставление', hint: 'Соединить пары',
    Icon: Shuffle,
    makeDefault: () => ({ pairs: [{ left: '', right: '' }, { left: '', right: '' }] }),
    isGradable: t => (t.pairs?.length ?? 0) >= 2,
    grade: (t, a) => {
      if (!TASK_TYPES.matching.isGradable(t)) return NOT_AUTO
      if (!a || typeof a !== 'object' || Array.isArray(a)) return { auto: true, correct: false }
      const map = a as Record<string, string>
      const pairs = t.pairs ?? []
      return {
        auto: true,
        correct: pairs.every(p => normAnswer(map[p.left] ?? '') === normAnswer(p.right)),
      }
    },
    needsTeacherReview: false, needsAudio: false, allowedAsHard: false, languageOnly: false,
  }),

  sequence: def({
    id: 'sequence', family: 'order',
    label: 'Последовательность', hint: 'Расставить порядок',
    Icon: ArrowUpDown,
    makeDefault: () => ({ sequenceItems: ['', ''] }),
    isGradable: t => (t.sequenceItems?.length ?? 0) >= 2,
    grade: (t, a) => {
      if (!TASK_TYPES.sequence.isGradable(t)) return NOT_AUTO
      const items = t.sequenceItems ?? []
      const order = toOrder(a)
      if (!order || order.length !== items.length) return { auto: true, correct: false }
      // Эталон задан порядком [0,1,2,…]: ответ верен, когда индексы по возрастанию.
      return { auto: true, correct: order.every((v, i) => v === i) }
    },
    needsTeacherReview: false, needsAudio: false, allowedAsHard: false, languageOnly: false,
  }),

  tableFill: def({
    id: 'tableFill', family: 'input',
    label: 'Заполнить таблицу', hint: 'Ячейки с пропусками',
    Icon: TableIcon,
    makeDefault: () => ({ table: { headers: ['Заголовок 1', 'Заголовок 2'], rows: [['', ''], ['', '']] } }),
    // Проверяются ячейки из emptyCells — именно они рисуются полем ввода
    // (QuestionTable) и именно их редактор помечает как «пропуск». blankCells —
    // это ячейка-прочерк «—» в условии, у неё нет эталонного значения, поэтому
    // в проверку она не входит. Ключ ячейки — «строка,столбец».
    isGradable: t => fillableCellKeys(t).length > 0,
    grade: (t, a) => {
      const keys = fillableCellKeys(t)
      if (keys.length === 0) return NOT_AUTO
      if (!a || typeof a !== 'object' || Array.isArray(a)) return { auto: true, correct: false }
      const given = a as Record<string, string>
      const rows = t.table?.rows ?? []
      const correct = keys.every(key => {
        const [r, c] = key.split(',').map(Number)
        const want = rows[r]?.[c] ?? ''
        return normAnswer(given[key] ?? '') === normAnswer(want)
      })
      return { auto: true, correct }
    },
    needsTeacherReview: false, needsAudio: false, allowedAsHard: false, languageOnly: false,
  }),

  whiteboard: def({
    id: 'whiteboard', family: 'production',
    label: 'Доска', hint: 'Рисунок на доске',
    Icon: PenLine,
    makeDefault: () => ({}),
    isGradable: () => false,
    grade: () => NOT_AUTO,
    needsTeacherReview: true, needsAudio: false, allowedAsHard: true, languageOnly: false,
  }),

  // ── языковые ──

  wordBank: def({
    id: 'wordBank', family: 'order',
    label: 'Собрать предложение', hint: 'Из плиток-слов',
    Icon: SpellCheck,
    makeDefault: () => ({ sentence: '', distractors: [] }),
    isGradable: t => sentenceTokens(t.sentence ?? '').length >= 2,
    grade: (t, a) => {
      if (!TASK_TYPES.wordBank.isGradable(t)) return NOT_AUTO
      const want = sentenceTokens(t.sentence ?? '')
      const got = toWords(a)
      if (!got) return { auto: true, correct: false }
      return {
        auto: true,
        correct: got.length === want.length && got.every((w, i) => normAnswer(w) === normAnswer(want[i])),
      }
    },
    needsTeacherReview: false, needsAudio: false, allowedAsHard: false, languageOnly: true,
  }),

  listenType: def({
    id: 'listenType', family: 'audio',
    label: 'Диктант', hint: 'Услышал — напечатал',
    Icon: Volume2,
    makeDefault: () => ({ allowSlow: true }),
    isGradable: t => !!t.answer?.trim(),
    grade: (t, a) => {
      if (!TASK_TYPES.listenType.isGradable(t)) return NOT_AUTO
      return { auto: true, correct: typeof a === 'string' && matchesText(a, t) }
    },
    needsTeacherReview: false, needsAudio: true, allowedAsHard: false, languageOnly: true,
  }),

  listenBank: def({
    id: 'listenBank', family: 'audio',
    label: 'Диктант с подсказкой', hint: 'Собрать услышанное из плиток',
    Icon: Volume2,
    makeDefault: () => ({ sentence: '', distractors: [], allowSlow: true }),
    isGradable: t => sentenceTokens(t.sentence ?? '').length >= 2,
    grade: (t, a) => TASK_TYPES.wordBank.grade(t, a),
    needsTeacherReview: false, needsAudio: true, allowedAsHard: false, languageOnly: true,
  }),

  minimalPair: def({
    id: 'minimalPair', family: 'audio',
    label: 'Похожие звуки', hint: 'Какой из двух прозвучал',
    Icon: Volume2,
    makeDefault: () => ({ pairA: '', pairB: '', correctPair: 'A' }),
    isGradable: t => !!t.pairA?.trim() && !!t.pairB?.trim() && !!t.correctPair,
    grade: (t, a) => {
      if (!TASK_TYPES.minimalPair.isGradable(t)) return NOT_AUTO
      return { auto: true, correct: a === t.correctPair }
    },
    needsTeacherReview: false, needsAudio: true, allowedAsHard: false, languageOnly: true,
  }),

  speaking: def({
    id: 'speaking', family: 'production',
    label: 'Записать голос', hint: 'Ученик говорит, учитель слушает',
    Icon: Mic,
    makeDefault: () => ({ prepSeconds: 20, responseSeconds: 90 }),
    // Машина может оценить произношение, но вердикт всегда за учителем.
    isGradable: () => false,
    grade: () => NOT_AUTO,
    needsTeacherReview: true, needsAudio: false, allowedAsHard: true, languageOnly: true,
  }),

  imageDescribe: def({
    id: 'imageDescribe', family: 'production',
    label: 'Описать картинку', hint: 'Письменно или устно',
    Icon: ImageIcon,
    makeDefault: () => ({
      responseMode: 'write', prepSeconds: 0, responseSeconds: 60,
      facts: [], distractorFacts: [], expectedStructures: [],
    }),
    isGradable: () => false,
    grade: () => NOT_AUTO,
    needsTeacherReview: true, needsAudio: false, allowedAsHard: true, languageOnly: true,
  }),

  imageCompare: def({
    id: 'imageCompare', family: 'production',
    label: 'Сравнить картинки', hint: 'Две-три картинки, найти общее и разное',
    Icon: Images,
    makeDefault: () => ({
      images: ['', ''], responseMode: 'speak', prepSeconds: 20, responseSeconds: 60,
      facts: [], distractorFacts: [], expectedStructures: [],
    }),
    isGradable: () => false,
    grade: () => NOT_AUTO,
    needsTeacherReview: true, needsAudio: false, allowedAsHard: true, languageOnly: true,
  }),

  pattern: def({
    id: 'pattern', family: 'input',
    label: 'Дрилл по шаблону', hint: 'Одна конструкция, несколько подстановок',
    Icon: Repeat,
    makeDefault: () => ({ pattern: '', patternGloss: '', patternItems: [{ cue: '', answer: '' }] }),
    isGradable: t => (t.patternItems ?? []).some(i => !!i.answer?.trim()),
    grade: (t, a) => {
      const items = (t.patternItems ?? []).filter(i => !!i.answer?.trim())
      if (items.length === 0) return NOT_AUTO
      if (!a || typeof a !== 'object' || Array.isArray(a)) return { auto: true, correct: false }
      const given = a as Record<string, string>
      // Дрилл засчитывается целиком: пропущенная строка — это незакрытая форма,
      // а половина конструкции автоматизма не даёт.
      const correct = items.every((item, i) => {
        const got = normAnswer(given[String(i)] ?? '')
        if (!got) return false
        return normAnswer(item.answer) === got || (item.alt ?? []).some(x => normAnswer(x) === got)
      })
      return { auto: true, correct }
    },
    needsTeacherReview: false, needsAudio: false, allowedAsHard: false, languageOnly: true,
  }),

  flashcard: def({
    id: 'flashcard', family: 'vocab',
    label: 'Карточка', hint: 'Слово и перевод',
    Icon: Layers,
    makeDefault: () => ({ front: '', back: '' }),
    isGradable: t => !!t.front?.trim() && !!t.back?.trim(),
    grade: (t, a) => {
      if (!TASK_TYPES.flashcard.isGradable(t)) return NOT_AUTO
      return { auto: true, correct: typeof a === 'string' && normAnswer(a) === normAnswer(t.back ?? '') }
    },
    needsTeacherReview: false, needsAudio: false, allowedAsHard: false, languageOnly: true,
  }),
}

// ─── Вспомогательное ─────────────────────────────────────────────────────────

/** Ответ на «порядок» приходит массивом чисел либо строкой "2,0,1" (легаси). */
function toOrder(a: TaskAnswer): number[] | null {
  if (Array.isArray(a) && a.every(v => typeof v === 'number')) return a as number[]
  if (typeof a === 'string' && a.trim()) {
    const parts = a.split(',').map(Number)
    if (parts.every(n => Number.isFinite(n))) return parts
  }
  return null
}

/** Ответ на «собрать предложение» приходит массивом слов либо строкой. */
function toWords(a: TaskAnswer): string[] | null {
  if (Array.isArray(a) && a.every(v => typeof v === 'string')) return a as string[]
  if (typeof a === 'string' && a.trim()) return sentenceTokens(a)
  return null
}

// ─── Публичный API ───────────────────────────────────────────────────────────

export const ALL_TASK_TYPE_IDS = Object.keys(TASK_TYPES) as TaskTypeId[]

/**
 * Приведение легаси-написаний к каноническому идентификатору, с типом.
 * Неизвестное значение схлопывается в 'single' — рендер не должен падать
 * из-за мусора в старом JSONB.
 */
export function normalizeTaskType(type: string | undefined): TaskTypeId {
  const id = normalizeRaw(type ?? 'single')
  return (id in TASK_TYPES ? id : 'single') as TaskTypeId
}

/** Определение типа с приведением легаси-псевдонимов. Никогда не бросает. */
export function taskTypeDef(type: string | undefined): TaskTypeDef {
  return TASK_TYPES[normalizeTaskType(type)]
}

/** Единая точка проверки — используют и тесты, и домашки. */
export function gradeTask(t: TaskPayload, a: TaskAnswer): GradeResult {
  return taskTypeDef(t.type).grade(t, a)
}

/** Проверяемо ли задание машиной. */
export function isAutoGradable(t: TaskPayload): boolean {
  return taskTypeDef(t.type).isGradable(t)
}

/** Заготовка нового задания выбранного типа. */
export function makeTask(type: TaskTypeId, isHard = false, id = cryptoId()): TaskPayload {
  const d = TASK_TYPES[type]
  return { id, type, isHard, label: d.label, ...d.makeDefault() }
}

/** Палитра выбора типа у учителя. */
export function taskTypesFor(opts: { language?: boolean; hardOnly?: boolean } = {}): TaskTypeDef[] {
  return ALL_TASK_TYPE_IDS
    .map(id => TASK_TYPES[id])
    .filter(d => (opts.language ? true : !d.languageOnly))
    .filter(d => (opts.hardOnly ? d.allowedAsHard : true))
}

function cryptoId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
}
