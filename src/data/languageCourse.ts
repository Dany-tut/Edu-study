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
// Чужих изображений с понятной лицензией у нас нет, поэтому всё, что рисуется в
// курсе, рисуется нами векторно и лежит строкой data-URI: иллюстрации конспекта
// (spec.figures → lessonFigures.ts) и картинки заданий «опишите / сравните»
// (seedImages.ts). Фотографий в сидах нет — их учитель добавляет сам.
// ─────────────────────────────────────────────────────────────────────────────

import { TASK_TYPES } from './taskTypes'
import type { PatternItem, TaskPayload, TaskTypeId } from './taskTypes'
import { getSubject } from '../lib/subjects'
import { figureMarker, packTheoryImages, type TheoryImage } from '../lib/theoryImages'
import { vocabImage } from './vocabImages'
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
  /**
   * Конспект урока — то, что ученик читает перед домашкой.
   *
   * Это главная содержательная часть языкового урока: правило, таблица форм,
   * разбор типичной ошибки. Абзацы разделяются пустой строкой. Пока не задан,
   * конспект собирается из полей выше (см. composeTheory) — но это заглушка,
   * а не замена написанному тексту.
   */
  theory?: string
  /**
   * Ссылка на видео к уроку — обычно YouTube.
   *
   * Встраивание чужого ролика по ссылке законно (это делает сам YouTube своим
   * плеером), в отличие от скачивания и перезалива. Поэтому в сиде лежит именно
   * ссылка, а не файл: мы ничего не копируем и не размещаем у себя.
   *
   * Берутся ролики каналов, которые сами разрешают встраивание и держат
   * стабильный уровень: для языка это объяснения носителей, для карьерных тем —
   * доклады и разборы.
   */
  videoUrl?: string
  /**
   * Шаблон конструкции юнита — то, что отрабатывается подстановкой.
   *
   * ЗАЧЕМ ОТДЕЛЬНОЕ ПОЛЕ, А НЕ ЕЩЁ ОДНО ЗАДАНИЕ В `tasks`. Грамматика юнита у
   * нас была описана человеческим текстом (`grammar`) — для конспекта это
   * правильно, но отработать по нему нечего. Дрилл требует машинно-пригодной
   * формы: шаблон, его перевод и ряд подстановок. Отдельным полем он ещё и
   * попадает в домашку первым, до россыпи упражнений, — конструкция сначала
   * ставится в руку, а потом уже проверяется вразбивку.
   *
   * Не задан — дрилла в юните просто нет. Так и должно быть в юнитах, где
   * отрабатывать нечего: письмо, чтение правил, экзаменационные стратегии.
   */
  pattern?: UnitPattern
  /** Словарь юнита. */
  vocab: VocabItem[]
  /** Задания домашней работы. */
  tasks: SeedTask[]
}

/** Конструкция юнита и подстановки к ней. */
export interface UnitPattern {
  /** Шаблон, место подстановки — многоточие: «저는 …이에요». */
  template: string
  /** Перевод шаблона: без него конструкция остаётся набором знаков. */
  gloss: string
  /** Формулировка задания. Не задана — берётся общая. */
  question?: string
  /** Строки подстановки: что подставляем и что должно получиться. */
  items: PatternItem[]
}

/** Иллюстрация конспекта: картинка (data-URI из lessonFigures.ts) и подпись. */
export interface UnitFigure {
  src: string
  caption: string
  /**
   * После какого абзаца конспекта встаёт картинка (1 — после первого).
   *
   * Схема объясняет конкретное место в тексте, и место это не всегда второе:
   * строение слога нужно показать после правила сборки, а не после вводного
   * абзаца. Не задано — картинка встаёт сразу после правила (в собранном
   * конспекте это третий абзац), иначе после первого.
   */
  after?: number
}

/**
 * Иллюстрации курса: shortId юнита → его схемы.
 *
 * Лежат отдельно от юнитов, а не полем внутри каждого. Юнит — это данные
 * (слова, задания, формулировки), а схема — вызов рисовалки из
 * lessonFigures.ts; вперемешку они превращают массив контента в код. Ключ —
 * shortId, поэтому схема не «съезжает» при вставке юнита в середину курса.
 */
export type CourseFigures = Record<string, UnitFigure[]>

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
  /**
   * Уровень строкой, как его увидит ученик: «A2 → B1», «TOPIK I → TOPIK II
   * (3급–4급)». У языков со своей шкалой (корейский, японский, китайский)
   * пишем её, а не CEFR: официальных A1–C2 у них нет, и фильтр «Уровень» в
   * Конструкторе разбирает строку именно по родной шкале (lib/courseLevels.ts).
   */
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
  /** Иллюстрации конспекта по shortId юнита — см. CourseFigures. */
  figures?: CourseFigures
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
 * Подстановочный дрилл: одна конструкция, ряд замен.
 *
 * Пишется парами «что подставляем → что получилось». Именно целое предложение,
 * а не одну форму: у корейского и японского выбор формы зависит от того, чем
 * кончается подставляемое слово (이에요/예요, 을/를, 은/는), и ученик обязан
 * собрать всю строку, иначе алломорф остаётся невыученным.
 */
export const drill = (
  template: string,
  gloss: string,
  items: Array<[cue: string, answer: string] | [cue: string, answer: string, gloss: string]>,
  question?: string,
): UnitPattern => ({
  template,
  gloss,
  question,
  items: items.map(([cue, answer, itemGloss]) => ({ cue, answer, gloss: itemGloss })),
})

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
 * Слово словаря → карточка «лицо/оборот». Чтение идёт отдельным полем.
 *
 * ЧТЕНИЕ. Раньше оно вклеивалось в лицо карточки строкой «우유 (uyu)». Так
 * романизация оказывалась несъёмной: ученик, уже разобравший хангыль, всё равно
 * читал подсказку — а она ровно на этом шаге и мешает. Теперь `front` — само
 * слово, `reading` — отдельно, и решатель показывает его по тумблеру.
 *
 * `question` заполняется обязательно и уже СО чтением: и редактор, и списки
 * заданий показывают именно его. Без него десятки словарных карточек выглядели
 * в редакторе одинаковыми пустыми блоками «без текста», и понять, какое слово в
 * какой, было нельзя.
 */
function vocabCard(word: VocabItem, id: string, lang: string) {
  const label = word.reading ? `${word.term} (${word.reading})` : word.term
  // Картинка ищется по русскому значению, поэтому один рисунок обслуживает все
  // языки курса-сида (см. vocabImages.ts). У абстрактных слов её нет — и это
  // норма, карточка остаётся текстовой.
  const image = vocabImage(word.ru)
  return editorTask(
    { type: 'flashcard', question: label, front: word.term, reading: word.reading, back: word.ru, image },
    id, lang,
  )
}

/**
 * Дрилл юнита как задание домашки — ноль или одно.
 *
 * Возвращает массив, а не «задание либо undefined», чтобы в списке заданий он
 * раскрывался спредом наравне с остальными группами и в юнитах без конструкции
 * не оставлял дырки.
 */
function patternTask(unit: LangUnit, id: string, lang: string) {
  const p = unit.pattern
  if (!p || p.items.length === 0) return []
  return [editorTask(
    {
      type: 'pattern',
      question: p.question ?? 'Отработайте конструкцию: подставьте слово и запишите предложение целиком.',
      pattern: p.template,
      patternGloss: p.gloss,
      patternItems: p.items,
    },
    id, lang,
  )]
}

/**
 * Задания «что на картинке» из словаря юнита.
 *
 * Единственный тип задания, который проверяет знание слова без русского
 * посредника: ученик видит предмет и выбирает слово на изучаемом языке.
 * Собирается автоматически там, где в юните набирается хотя бы четыре
 * нарисованных слова (см. vocabImages.ts) — в юнитах с абстрактной лексикой
 * задания просто не будет.
 *
 * Всё детерминировано: и слово-ответ, и позиция верного варианта выводятся из
 * номера юнита. Случайность сломала бы стабильность сида — при каждой сборке
 * курс получался бы другим.
 */
function pictureTasks(unit: LangUnit, idBase: string, lang: string) {
  const drawn = unit.vocab.filter(w => vocabImage(w.ru))
  // Обманки берутся из того же юнита: выбирать между словами одного урока —
  // это проверка слова, а между словами разных уроков — проверка памяти о том,
  // какой урок вообще шёл.
  if (!drawn.length || unit.vocab.length < 4) return []

  // Два задания там, где нарисованного хватает; иначе одно. Больше двух —
  // это уже не отработка, а перебор картинок.
  const count = drawn.length >= 5 ? 2 : 1
  const tasks = []
  for (let k = 0; k < count; k++) {
    const target = drawn[(unit.n + k) % drawn.length]
    // Обманка не должна иметь ту же картинку, что и ответ: «кот» и «кошка»
    // рисуются одинаково, и такое задание нерешаемо.
    const targetImage = vocabImage(target.ru)
    const others = unit.vocab
      .filter(w => w.term !== target.term && vocabImage(w.ru) !== targetImage)
      .slice(k, k + 3)
    if (others.length < 3) break
    const choices = others.map(w => w.term)
    const correct = (unit.n + k) % 4
    choices.splice(correct, 0, target.term)
    tasks.push(editorTask(
      {
        type: 'single',
        question: 'Что на картинке? Выберите слово.',
        image: vocabImage(target.ru),
        imageSize: 40,
        choices,
        correctChoices: [correct],
      },
      `${idBase}${k + 1}`, lang,
    ))
  }
  return tasks
}

/**
 * Запасной конспект для юнитов, где текст ещё не написан руками.
 *
 * Собирается из уже заданных полей, чтобы урок не был пустым. Это заглушка:
 * настоящий конспект пишется в unit.theory и объясняет правило, а не
 * перечисляет его название.
 */
function composeTheory(unit: LangUnit): string {
  const words = unit.vocab
    .map(w => `• ${w.reading ? `${w.term} (${w.reading})` : w.term} — ${w.ru}${w.example ? `\n   ${w.example}` : ''}`)
    .join('\n')
  return [
    `Что вы сможете после урока: ${unit.goal}.`,
    `Правило: ${unit.grammar}`,
    unit.grammarWhy,
    `Слова урока (${unit.vocabTheme}):\n${words}`,
    `К концу урока вы сделаете: ${unit.artifact}.`,
  ].join('\n\n')
}

/**
 * Конспект юнита для редактора: текст плюс иллюстрации.
 *
 * Картинки встают строкой-маркером после первого абзаца — то есть сразу за
 * правилом, которое они показывают. Сам data-URI уезжает в theoryImages: в
 * поле «Конспект» учитель должен видеть свой текст, а не километр base64
 * (разбор маркеров — в lib/theoryImages.ts).
 */
function theoryOf(unit: LangUnit, figures: UnitFigure[] = []): { theory: string; theoryImages: TheoryImage[] } {
  const text = unit.theory?.trim() || composeTheory(unit)
  if (!figures.length) return { theory: text, theoryImages: [] }

  const paras = text.split(/\n\s*\n/)
  // Якорь по умолчанию: в собранном конспекте (composeTheory) второй абзац —
  // правило, третий объясняет, зачем оно здесь, поэтому картинка идёт за ними и
  // до списка слов. В написанном руками конспекте такого якоря нет — там
  // картинка встаёт после первого абзаца, а точное место задаёт figure.after.
  const ruleAt = paras.findIndex(p => p.startsWith('Правило:'))
  const fallback = ruleAt >= 0 ? ruleAt + 2 : 1

  const out: string[] = []
  paras.forEach((para, i) => {
    out.push(para)
    const here = figures.filter(f => Math.min(f.after ?? fallback, paras.length) === i + 1)
    here.forEach(f => out.push(figureMarker(f.caption, f.src)))
  })
  const packed = packTheoryImages(out.join('\n\n'))
  return { theory: packed.theory, theoryImages: packed.images }
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
    ...theoryOf(unit, spec.figures?.[unit.shortId]),
    videoUrl: unit.videoUrl,
    hwTitle: `Юнит ${unit.n}. ${unit.title}`,
    hwTarget: unit.artifact,
    hwTasks: [
      // Дрилл идёт первым: конструкция сначала ставится в руку подстановкой, и
      // только потом проверяется вразбивку остальными заданиями. В обратном
      // порядке первые упражнения проверяли бы то, что ещё не отработано.
      ...patternTask(unit, `${unit.shortId}-p`, spec.lang),
      ...unit.tasks.map((task, i) => editorTask(task, `${unit.shortId}-t${i + 1}`, spec.lang)),
      // Задание по картинке идёт перед карточками: сначала узнать предмет,
      // потом отрабатывать слово.
      ...pictureTasks(unit, `${unit.shortId}-pic`, spec.lang),
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
