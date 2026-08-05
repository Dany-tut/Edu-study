// ─────────────────────────────────────────────────────────────────────────────
// Общая модель языкового курса-сида
//
// Пять языковых курсов (английский «Карьера дизайнера», английский IELTS,
// корейский, японский, бразильский португальский) описываются одними и теми же
// сущностями: юнит → урок, задания юнита → ДЗ, словарь → карточки, модули сида
// → модули курса. Раньше эта сборка жила внутри englishDesignCareer.ts; пятая
// копия того же кода — гарантированный дрейф, поэтому модель, хелперы заданий и
// сборщик лежат здесь, а файлы курсов содержат только контент.
//
// ЧТО СИД НЕ ДЕЛАЕТ
// Сид не хранит курс в БД и не является «системным курсом»: конструктор
// переводит его в CourseEdData и открывает в редакторе. После «Сохранить» это
// обычный курс учителя (created_by = он) — резать, дополнять и выдавать
// группам можно как угодно, сид больше не участвует.
//
// АУДИО
// Аудио-типы (диктант, минимальные пары) заполняются полем `ttsText`, а не
// готовым файлом: синтез кэшируется по хешу текста, поэтому сид не тянет за
// собой медиа. Там, где произношение критично как эталон (корейские напряжённые,
// японская долгота), учителю в описании юнита сказано записать свой голос —
// браузерный синтез эталоном произношения быть не может.
//
// КАРТИНКИ
// Типы imageDescribe / imageCompare в сидах не используются: своих картинок с
// понятной лицензией у нас нет, а задание без картинки бессмысленно. Учитель
// добавляет их сам — тип в редакторе доступен.
// ─────────────────────────────────────────────────────────────────────────────

import { TASK_TYPES } from './taskTypes'
import type { TaskPayload, TaskTypeId } from './taskTypes'
import { getSubject } from '../lib/subjects'
import type { CELesson, CEModule, CourseEdData } from '../pages/teacher/TeacherCourseEditorPage'

/** Стандартное занятие — столько же по умолчанию подставляет редактор урока. */
const DEFAULT_LESSON_MINUTES = 90

// ─── Модель ──────────────────────────────────────────────────────────────────

/** Слово словаря юнита. Ложится в карточки и в интервальные повторения. */
export interface VocabItem {
  /** Слово или словосочетание на изучаемом языке. */
  term: string
  /** Русский перевод. */
  ru: string
  /** Чтение: романизация, кана или транскрипция — для языков с чужим письмом. */
  reading?: string
  /** Пример употребления — контекст важнее изолированного слова. */
  example?: string
}

/** Задание в сиде — без id и label, они проставляются при сборке. */
export type SeedTask = Omit<Partial<TaskPayload>, 'type'> & { type: TaskTypeId }

export interface LangUnit {
  /** Порядковый номер, 1-based. */
  n: number
  /** Короткий стабильный id — ключ для lessons.short_id и прогресса. */
  shortId: string
  /** Заголовок для ученика. */
  title: string
  /** Коммуникативная цель — что ученик сможет после юнита. */
  goal: string
  /** Грамматика (или навык — для экзаменационных курсов) юнита. */
  grammar: string
  /** Зачем это именно здесь. */
  grammarWhy: string
  /** Лексическая тема. */
  vocabTheme: string
  /** Что ученик создаёт своими руками к концу юнита. */
  artifact: string
  /** Словарь юнита. */
  vocab: VocabItem[]
  /** Задания домашней работы. */
  tasks: SeedTask[]
}

/** Модуль — группа юнитов с общей задачей. */
export interface LangModule {
  title: string
  subtitle: string
  units: number[]
}

/** Полное описание курса-сида. */
export interface LanguageCourseSpec {
  /** Короткий ключ курса — префикс id модулей, должен быть уникален. */
  key: string
  title: string
  /** Русское название предмета — значение courses.subject (см. lib/subjects.ts). */
  subject: string
  /** Уровень строкой, как его увидит ученик: «A1 → A2 (TOPIK I)». */
  level: string
  /** BCP-47 изучаемого языка — идёт в задания для синтеза речи. */
  lang: string
  /** Ориентир по учебным часам — включая самостоятельную работу. */
  guidedHours: string
  /**
   * Длительность одного занятия в минутах. Это НЕ guidedHours / число юнитов:
   * там весь труд ученика, а здесь только время в классе. Не задана — курс
   * считается по стандартным 90 минутам.
   */
  lessonMinutes?: number
  /** Честная граница охвата: что в курсе есть и чего в нём ещё нет. */
  scopeNote?: string
  modules: LangModule[]
  units: LangUnit[]
}

// ─── Хелперы для заданий ─────────────────────────────────────────────────────
//
// Язык в хелперы не передаётся: `lang` штампуется сборщиком на все задания
// курса разом, иначе его пришлось бы указывать в каждой строке контента.

/** Один верный вариант. */
export const one = (question: string, choices: string[], correct: number): SeedTask =>
  ({ type: 'single', question, choices, correctChoices: [correct] })

/** Несколько верных вариантов. */
export const many = (question: string, choices: string[], correct: number[]): SeedTask =>
  ({ type: 'multi', question, choices, correctChoices: correct })

/** Вписать слово или форму — точечная отработка. */
export const fill = (question: string, answer: string, altAnswers?: string[]): SeedTask =>
  ({ type: 'fill', question, answer, altAnswers })

/**
 * Собрать предложение из плиток. Плитки нарезаются по пробелам, поэтому для
 * японского эталон пишется с пробелами между смысловыми группами (бунсэцу) —
 * иначе всё предложение станет одной плиткой.
 */
export const wb = (sentence: string, question: string, distractors: string[] = []): SeedTask =>
  ({ type: 'wordBank', question, sentence, distractors })

/** Расставить по порядку — для шагов, диалогов, структуры текста. */
export const order = (question: string, items: string[]): SeedTask =>
  ({ type: 'sequence', question, sequenceItems: items })

/** Пары слово—перевод (или форма—значение). */
export const pairsOf = (question: string, items: [string, string][]): SeedTask =>
  ({ type: 'matching', question, pairs: items.map(([left, right]) => ({ left, right })) })

/** Таблица форм — спряжения, вежливые уровни, падежи. */
export const grid = (
  question: string,
  headers: string[],
  rows: string[][],
  emptyCells: Record<string, boolean>,
): SeedTask => ({ type: 'tableFill', question, table: { headers, rows, emptyCells } })

/** Свободный письменный ответ — идёт учителю. */
export const write = (question: string): SeedTask => ({ type: 'extended', question })

/**
 * Чтение в экзаменационном формате: один отрывок — несколько вопросов к нему.
 *
 * Нужно потому, что TOPIK I и JLPT состоят из чтения и аудирования, а
 * говорения в них нет вовсе. Курс, который тренирует только грамматику и речь,
 * готовит человека, знающего язык и проваливающего экзамен на чтении.
 *
 * Возвращает массив заданий с общим passage — решатель показывает текст один
 * раз на всю группу подряд идущих заданий с одинаковым отрывком.
 */
export const reading = (
  passage: string,
  questions: SeedTask[],
  opts: { title?: string; translation?: string } = {},
): SeedTask[] =>
  questions.map(q => ({
    ...q,
    passage,
    passageTitle: opts.title,
    passageTranslation: opts.translation,
  }))

/** Записать голос — учитель слушает; при подключённом ИИ добавится разбор. */
export const say = (question: string, responseSeconds = 90): SeedTask =>
  ({ type: 'speaking', question, prepSeconds: 20, responseSeconds })

/** Прочитать вслух заданный текст — эталон есть, вердикт всё равно за учителем. */
export const readAloud = (question: string, targetText: string, responseSeconds = 45): SeedTask =>
  ({ type: 'speaking', question, targetText, prepSeconds: 15, responseSeconds })

/** Диктант: услышал — напечатал. */
export const dictation = (question: string, text: string, altAnswers?: string[]): SeedTask =>
  ({ type: 'listenType', question, ttsText: text, answer: text, altAnswers, allowSlow: true })

/** Диктант с подсказкой: услышал — собрал из плиток. */
export const dictationBank = (question: string, sentence: string, distractors: string[] = []): SeedTask =>
  ({ type: 'listenBank', question, sentence, ttsText: sentence, distractors, allowSlow: true })

/** Минимальные пары: прозвучал один из двух похожих — какой? */
export const minPair = (question: string, a: string, b: string, correct: 'A' | 'B'): SeedTask =>
  ({ type: 'minimalPair', question, pairA: a, pairB: b, correctPair: correct, ttsText: correct === 'A' ? a : b, allowSlow: true })

/**
 * Опоры для проверки описания картинки. Вердикт всегда за учителем, но эти поля
 * позволяют проверять ответ, не отправляя саму картинку модели: `facts` — что на
 * ней есть, `distractorFacts` — чего нет (ловит шаблонные ответы «по мотивам
 * темы»), `expectedStructures` — какие конструкции задание должно вытянуть.
 */
export interface ImageTaskHints {
  facts?: string[]
  distractorFacts?: string[]
  expectedStructures?: string[]
  responseMode?: 'write' | 'speak'
  responseSeconds?: number
}

/** Описать одну картинку — письменно или голосом. */
export const describeImage = (question: string, image: string, hints: ImageTaskHints = {}): SeedTask => ({
  type: 'imageDescribe', question, images: [image],
  responseMode: hints.responseMode ?? 'write',
  prepSeconds: hints.responseMode === 'speak' ? 20 : 0,
  responseSeconds: hints.responseSeconds ?? 90,
  facts: hints.facts ?? [], distractorFacts: hints.distractorFacts ?? [],
  expectedStructures: hints.expectedStructures ?? [],
})

/** Сравнить две картинки — «было / стало», «здесь / там». */
export const compareImages = (question: string, images: string[], hints: ImageTaskHints = {}): SeedTask => ({
  type: 'imageCompare', question, images,
  responseMode: hints.responseMode ?? 'write',
  prepSeconds: hints.responseMode === 'speak' ? 20 : 0,
  responseSeconds: hints.responseSeconds ?? 90,
  facts: hints.facts ?? [], distractorFacts: hints.distractorFacts ?? [],
  expectedStructures: hints.expectedStructures ?? [],
})

// ─── Сборка курса для конструктора ───────────────────────────────────────────

/**
 * Задание сида → задание редактора. Дефолты типа кладутся первыми, поля сида
 * их перекрывают: так задание не приезжает в редактор с пустыми обязательными
 * полями (например, `allowSlow` у аудио-типов), но и не теряет своё содержимое.
 */
function editorTask(seed: SeedTask, id: string, lang: string) {
  const def = TASK_TYPES[seed.type]
  return { isHard: false, label: def.label, lang, ...def.makeDefault(), ...seed, id }
}

/**
 * Слово словаря → карточка «лицо/оборот». Чтение приписывается к лицевой стороне.
 *
 * `question` заполняется обязательно: и редактор, и списки заданий показывают
 * именно его. Без него десятки словарных карточек выглядели в редакторе
 * одинаковыми пустыми блоками «без текста», и понять, какое слово в какой,
 * было нельзя.
 */
function vocabCard(word: VocabItem, id: string, lang: string) {
  const front = word.reading ? `${word.term} (${word.reading})` : word.term
  return editorTask(
    { type: 'flashcard', question: front, front, back: word.ru },
    id, lang,
  )
}

/** Сводка курса — для карточки курса, кнопки сида и страницы описания. */
export interface CourseSummary {
  title: string
  level: string
  units: number
  vocabCount: number
  taskCount: number
  guidedHours: string
  /** Длительность занятия в минутах — из неё считаются часы курса в списке. */
  lessonMinutes: number
  scopeNote?: string
}

export function courseSummary(spec: LanguageCourseSpec): CourseSummary {
  return {
    title: spec.title,
    level: spec.level,
    units: spec.units.length,
    vocabCount: spec.units.reduce((sum, u) => sum + u.vocab.length, 0),
    taskCount: spec.units.reduce((sum, u) => sum + u.tasks.length, 0),
    guidedHours: spec.guidedHours,
    lessonMinutes: spec.lessonMinutes ?? DEFAULT_LESSON_MINUTES,
    scopeNote: spec.scopeNote,
  }
}

/** Все слова курса — основа словарной колоды и интервальных повторений. */
export function allVocab(spec: LanguageCourseSpec): VocabItem[] {
  return spec.units.flatMap(u => u.vocab)
}

/** Юнит по короткому id. */
export function unitByShortId(spec: LanguageCourseSpec, shortId: string): LangUnit | undefined {
  return spec.units.find(u => u.shortId === shortId)
}

/** Модуль, которому принадлежит юнит. */
export function moduleOfUnit(spec: LanguageCourseSpec, n: number): LangModule | undefined {
  return spec.modules.find(m => m.units.includes(n))
}

/**
 * Собрать курс для редактора. `courseId` приходит снаружи (конструктор выдаёт
 * свежий), поэтому два добавления сида дают два независимых курса, а не
 * перезапись первого. Идентификаторы уроков внутри курса стабильны — short_id
 * в БД всё равно выводится от id курса (см. lessonShortIdMap).
 */
export function buildLanguageCourse(spec: LanguageCourseSpec, courseId: string): CourseEdData {
  const palette = getSubject(spec.subject)?.light
  const accent = palette?.accent ?? '#6354CF'
  const accentSoft = palette?.soft ?? 'rgba(99,84,207,0.14)'

  const byN = new Map(spec.units.map(u => [u.n, u]))

  const lessons: CELesson[] = spec.units.map(unit => ({
    id: unit.shortId,
    title: `${unit.n}. ${unit.title}`,
    number: unit.n,
    kind: 'lesson',
    // Дата занятия у сида не проставлена (её ставит учитель под свою группу),
    // а длительность известна заранее — из неё считаются часы курса в списке
    // и длина события в расписании, когда дата появится.
    scheduledDuration: spec.lessonMinutes ?? DEFAULT_LESSON_MINUTES,
    description: [
      `Цель: ${unit.goal}`,
      `Грамматика: ${unit.grammar}`,
      `Почему здесь: ${unit.grammarWhy}`,
      `Лексика: ${unit.vocabTheme}`,
      `Артефакт: ${unit.artifact}`,
    ].join('\n'),
    hwTitle: `Юнит ${unit.n}. ${unit.title}`,
    hwTarget: unit.artifact,
    hwTasks: [
      ...unit.tasks.map((task, i) => editorTask(task, `${unit.shortId}-t${i + 1}`, spec.lang)),
      ...unit.vocab.map((word, i) => vocabCard(word, `${unit.shortId}-v${i + 1}`, spec.lang)),
    ],
  }))

  const modules: CEModule[] = spec.modules.map((m, i) => ({
    id: `${spec.key}-m${i + 1}`,
    label: m.title,
    expanded: i === 0,
    lessonIds: m.units.map(n => byN.get(n)?.shortId).filter((id): id is string => !!id),
  }))

  const s = courseSummary(spec)
  return {
    id: courseId,
    title: spec.title,
    subject: spec.subject,
    level: spec.level,
    status: 'draft',
    color: accent,
    bg: accentSoft,
    groupIds: [],
    studentIds: [],
    modules,
    lessons,
    description: [
      `${s.units} юнитов, ${s.vocabCount} слов, ${s.taskCount} заданий. ` +
        `Ориентир — ${s.guidedHours} учебных часов.`,
      s.scopeNote,
    ].filter(Boolean).join(' '),
  }
}
