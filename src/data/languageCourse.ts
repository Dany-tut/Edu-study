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
import { nestById } from './soundNests'
import { figureMarker, packTheoryImages, type TheoryImage } from '../lib/theoryImages'
import { checklistBlock } from '../lib/theoryChecklist'
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
  /**
   * Другие верные переводы. Падежи, вид глагола и предлоги машина разбирает
   * сама (lib/answerMatch.ts) — сюда пишутся только СИНОНИМЫ, которые из
   * эталона не выводятся: «моушн-дизайнер» ↔ «анимационный дизайнер».
   */
  alt?: string[]
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
  /**
   * Чек-лист юнита — формы, которые должны остаться в руке к его концу.
   *
   * ЗАЧЕМ ОТДЕЛЬНО ОТ `grammar`. Поле `grammar` описывает грамматику юнита одной
   * фразой для конспекта и карточки урока — прочитать её можно, отметиться по
   * ней нельзя. Чек-лист разбирает ту же грамматику на пункты, каждый из
   * которых ученик либо ставит себе в актив, либо нет; вопрос «я это уже умею»
   * иначе не задаётся вовсе и решается ощущением «вроде проходили».
   *
   * ПУНКТ — ФОРМА, А НЕ ТЕМА. «Отрицания (안 / ~지 않다)» проверяемо, «понимать
   * отрицание» — нет. Поэтому в пункте стоит сама форма и короткая подпись, по
   * которой её узнают.
   *
   * Не задан — чек-листа в конспекте просто нет: списка ради списка (юниты
   * чтения, экзаменационные стратегии) быть не должно.
   */
  checklist?: string[]
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
  /**
   * Курс РОДНОГО языка (русский, литература), а не изучаемого.
   *
   * ЧТО МЕНЯЕТСЯ. Карточка переворачивается. У иностранного языка ученик видит
   * слово и вспоминает перевод; у родного переводить нечего — «досада» и есть
   * «досада». Поэтому здесь на лице карточки стоит ТОЛКОВАНИЕ (поле `ru`), а
   * ответом служит само слово (`term`): человек ищет точное слово по описанию —
   * ровно та операция, ради которой предмет и заведён.
   *
   * Проверка ответа при этом становится честнее, а не мягче: ответ — одно
   * слово, синонимы перечислены в `alt`, и матчинг по смыслу (lib/answerMatch)
   * работает как обычно.
   */
  native?: boolean
  /** Иллюстрации конспекта по shortId юнита — см. CourseFigures. */
  figures?: CourseFigures
  /**
   * Домашние видео по shortId юнита: живая речь (серия, подкаст, стрим) плюс
   * задание на понимание к ней. Лежат отдельным файлом (data/homeworkVideos.ts)
   * по той же причине, что и схемы: юнит — это данные, а подборка материала
   * живёт своей жизнью, у неё свои правила проверки ссылок и своя судьба
   * (ролики умирают, каналы закрываются).
   *
   * Идут ПЕРВЫМИ в домашке: сначала вход — послушал живую речь, — и только
   * потом отработка. В обратном порядке ролик превращается в необязательный
   * хвост, до которого не доходят.
   */
  homeworkVideos?: Record<string, SeedTask[]>
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

/**
 * «Написано неправильно» — слово показано с перепутанными слогами (요하녕세안),
 * ученик пересобирает его правильно из плиток. Неправильное написание считается
 * из ответа детерминированно, руками его не задают.
 */
export const scrambled = (question: string, answer: string): SeedTask =>
  ({ type: 'unscramble', question, answer })

/** Собрать последовательность тапами из банка блоков (реплики диалога, шаги). */
export const blocks = (question: string, items: string[]): SeedTask =>
  ({ type: 'blockOrder', question, sequenceItems: items })

/**
 * Ряд слогов с обманками: собрать слово или фразу тапами, без клавиатуры.
 * Обманки можно задать руками; пусто — подберутся похожие слоги сами
 * (confusable-пары, см. data/hangul.ts).
 */
export const sylBank = (question: string, answer: string, distractors: string[] = []): SeedTask =>
  ({ type: 'charBank', question, answer, distractors })

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

/**
 * Посмотреть ролик — серию мультика, подкаст, отрывок фильма.
 *
 * ЗАЧЕМ ВИДЕО В ДОМАШКЕ, ЕСЛИ ОНО УЖЕ ЕСТЬ У УРОКА. Видео урока — это
 * объяснение правила: там носитель разбирает конструкцию по-русски или
 * медленно и специально для учебника. Домашнее видео — противоположное:
 * живая речь на скорости, ради которой язык и учат. Одно не заменяет другое,
 * и первое без второго даёт человека, знающего правила и не понимающего
 * ни слова в сериале.
 *
 * ПОЧЕМУ ЭТО ОТДЕЛЬНОЕ ЗАДАНИЕ, А НЕ ССЫЛКА В ТЕКСТЕ. Ссылку в формулировке
 * ученик открывает в новой вкладке — там YouTube с рекомендациями, и домашка
 * заканчивается. Задание держит ролик внутри домашки, считает реально
 * отсмотренное (перемотка не в счёт) и само закрывается по порогу.
 *
 * `watchMinutes` — для длинного: серию, стрим и фильм целиком в домашку на
 * вечер не ставят, ставят двадцать минут. Не задано — девять десятых ролика.
 */
export const watch = (
  question: string,
  videoUrl: string,
  opts: { credit?: string; startMinutes?: number; watchMinutes?: number } = {},
): SeedTask => ({
  type: 'videoWatch',
  question,
  videoUrl,
  videoCredit: opts.credit,
  videoStart: opts.startMinutes ? Math.round(opts.startMinutes * 60) : undefined,
  videoWatchSeconds: opts.watchMinutes ? Math.round(opts.watchMinutes * 60) : undefined,
})

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

/** Обводка буквы: черты берутся по самой букве из data/hangul.ts. */
export const traceChamo = (question: string, chamo: string): SeedTask =>
  ({ type: 'trace', question, chamo, ttsText: chamo, allowSlow: false })

/** Сборка слога из букв: ㄱ + ㅣ + ㅁ → 김. */
export const buildSyl = (question: string, syllable: string): SeedTask =>
  ({ type: 'buildSyllable', question, syllable, ttsText: syllable, allowSlow: true })

/** Минимальные пары: прозвучал один из двух похожих — какой? */
export const minPair = (question: string, a: string, b: string, correct: 'A' | 'B'): SeedTask =>
  ({ type: 'minimalPair', question, pairA: a, pairB: b, correctPair: correct, ttsText: correct === 'A' ? a : b, allowSlow: true })

/**
 * Задания по гнезду созвучий — различение на слух плюс сцепка со смыслом.
 *
 * ЗАЧЕМ ГЕНЕРАТОР, А НЕ РУКИ. Гнездо из пяти слов даёт четыре пары соседей;
 * писать их руками — это четыре почти одинаковых блока на гнездо и двенадцать
 * правок при добавлении одного слова. Здесь же гнездо остаётся единственным
 * источником: дописали 뿔 в soundNests — задание появилось само.
 *
 * ПОЧЕМУ ПАРЫ БЕРУТСЯ ВСТЫК, А НЕ СКОЛЬЗЯЩИМ ОКНОМ. Слова в гнезде стоят
 * ОСМЫСЛЕННЫМИ ДВОЙКАМИ: 밥–밤, потом 방–빵; 사다–싸다, потом 살–쌀. Скользящее
 * окно резало их поперёк и выдавало пары вроде 싸다–살, где различие сразу в
 * двух признаках, — такое задание проверяет не признак, а везение. Поэтому
 * берём (0,1), (2,3), (4,5) и не перекрываемся.
 *
 * ПОЧЕМУ БЕЗ СЛУЧАЙНОСТИ. Сид обязан собираться одинаково каждый раз, поэтому
 * сторона верного ответа выводится из номера пары, а не из Math.random.
 *
 * `limit` — сколько пар взять. Ноль осмыслен и нужен: в юните, где пары уже
 * написаны руками, генератор выдал бы их второй раз подряд, а сцепка гнезда со
 * значениями всё равно добавляет слова, которых в юните нет.
 */
export const nestTasks = (nestId: string, limit = 3): SeedTask[] => {
  const nest = nestById(nestId)
  if (!nest || nest.words.length < 2) return []

  // Гнездо, которое на слух не различается (омонимы, слившиеся ㅐ/ㅔ), задания
  // «какое прозвучало» не даёт: у него нет верного ответа. Остаётся сцепка со
  // значением — она у таких гнёзд и есть вся работа.
  const audible = nest.axis !== 'homonym' && nest.audible !== false

  // Сторона верного ответа выводится из ИМЕНИ гнезда, а не из номера пары
  // внутри вызова. Со счётчиком от нуля каждый вызов начинался с «A», и юнит,
  // собранный из пяти гнёзд по одной паре, давал пять вопросов подряд с ответом
  // на первом месте — такое задание проходится по позиции, не слушая.
  const seed = [...nest.id].reduce((n, c) => n + c.charCodeAt(0), 0)

  const pairs: SeedTask[] = []
  if (audible) {
    for (let i = 0; i + 1 < nest.words.length && pairs.length < limit; i += 2) {
      const correct = (seed + pairs.length) % 2 === 0 ? 'A' : 'B'
      pairs.push(minPair('Какое слово прозвучало?', nest.words[i].term, nest.words[i + 1].term, correct))
    }
  }

  const match = pairsOf(
    audible
      ? `Соедините слово и перевод: ${nest.title} различаются одним признаком.`
      : `Соедините слово и перевод: ${nest.title} звучат одинаково — значение вытаскивается из фразы.`,
    nest.words.slice(0, 4).map(w => [w.term, w.ru] as [string, string]),
  )

  return [...pairs, match]
}

/**
 * Слова гнезда как словарь юнита — с подписью различия в примере.
 *
 * Нужно там, где гнездо и есть тема урока: тогда его слова должны попасть в
 * карточки и в интервальные повторения обычным путём, а не остаться внутри
 * заданий. В юнитах, где гнездо — только упражнение, словарь трогать не надо:
 * двадцать слов в одном уроке ученик не унесёт.
 */
export const nestVocab = (nestId: string): VocabItem[] => {
  const nest = nestById(nestId)
  if (!nest) return []
  return nest.words.map(w => ({ term: w.term, reading: w.reading, ru: w.ru, example: w.tip }))
}

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
  /** Что открыть после ответа: слова автора о работе, разбор, комментарий. */
  afterNote?: string
}

/** Описать одну картинку — письменно или голосом. */
export const describeImage = (question: string, image: string, hints: ImageTaskHints = {}): SeedTask => ({
  type: 'imageDescribe', question, images: [image],
  responseMode: hints.responseMode ?? 'write',
  prepSeconds: hints.responseMode === 'speak' ? 20 : 0,
  responseSeconds: hints.responseSeconds ?? 90,
  facts: hints.facts ?? [], distractorFacts: hints.distractorFacts ?? [],
  expectedStructures: hints.expectedStructures ?? [],
  afterNote: hints.afterNote,
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
function vocabCard(word: VocabItem, id: string, lang: string, native = false) {
  const label = word.reading ? `${word.term} (${word.reading})` : word.term
  // Картинка ищется по русскому значению, поэтому один рисунок обслуживает все
  // языки курса-сида (см. vocabImages.ts). У абстрактных слов её нет — и это
  // норма, карточка остаётся текстовой.
  const image = vocabImage(word.ru)
  // У родного языка карточка перевёрнута: на лице толкование, в ответе — само
  // слово (см. LanguageCourseSpec.native). Чтение при этом становится
  // подсказкой ударения и уходит на оборот, к слову, а не к описанию.
  return editorTask(
    native
      ? { type: 'flashcard', question: label, front: word.ru, back: word.term, reading: word.reading, image, altAnswers: word.alt }
      : { type: 'flashcard', question: label, front: word.term, reading: word.reading, back: word.ru, image, altAnswers: word.alt },
    id, lang,
  )
}

/**
 * Узнавание слова перед вводом перевода.
 *
 * ЗАЧЕМ. Словарь юнита превращался в карточки один к одному: десять слов —
 * десять одинаковых вопросов «впиши перевод». На них приходилось 47% всех
 * заданий курса, и это была не только скука. Ввод перевода — это ПРИПОМИНАНИЕ,
 * самый тяжёлый вид проверки, а до него слово встречалось ровно один раз, на
 * показе словаря. Человек честно смотрел карточки, доходил до шестнадцатого
 * вопроса и не мог вспомнить слово, которое видел десять минут назад один раз.
 *
 * ЧТО ЗДЕСЬ. Из того же словаря собирается ступенька между показом и вводом:
 * сопоставление (узнать пару среди пяти) и выбор в обе стороны — «что значит
 * это слово» и «как сказать это». Узнавание легче припоминания, и к карточке
 * ученик приходит, увидев слово третий раз, а не первый.
 *
 * ПОЧЕМУ СОПОСТАВЛЕНИЕ, А НЕ ПЯТЬ ОТДЕЛЬНЫХ ВОПРОСОВ. Оно закрывает пять слов
 * одним заданием: разнообразие растёт, а домашка не удлиняется. При десяти
 * словах это два задания вместо пяти.
 *
 * ОБМАНКИ БЕРУТСЯ ИЗ ЭТОГО ЖЕ ЮНИТА — выбирать между словом урока и словом из
 * другой темы не тренирует ничего: там разводит контекст, а не значение.
 */
// Возвращаемый тип НЕ аннотируем SeedTask[]: наружу уходит уже готовое задание
// редактора (editorTask проставляет id, label и язык), а SeedTask — это сид без
// id, и с ним весь список hwTasks переставал собираться.
function vocabRecognition(unit: LangUnit, idBase: string, lang: string, native = false) {
  const words = unit.vocab.filter(w => w.term?.trim() && w.ru?.trim())
  // Меньше четырёх слов — обманок не набрать, узнавание вырождается в подсказку.
  if (words.length < 4) return []

  const label = (w: VocabItem) => (w.reading ? `${w.term} (${w.reading})` : w.term)
  const out: SeedTask[] = []

  // ── сопоставление: не больше двух блоков ──
  //
  // Соблазн покрыть сопоставлением весь словарь есть, но домашка и так идёт
  // около часа. Два блока — это до десяти слов, узнанных четырьмя минутами;
  // остальные закрывают карточки и интервальные повторения.
  //
  // Слово, чей перевод уже есть в блоке, пропускается: obrigado и obrigada оба
  // «спасибо», и пара становится неугадываемой — не потому, что ученик не знает
  // языка, а потому, что верных ответов два. Такие слова остаются карточкам,
  // где сравнение идёт по значению и обе формы засчитываются.
  const usedRu = new Set<string>()
  const pairPool = words.filter(w => {
    const ru = w.ru.trim().toLowerCase()
    if (usedRu.has(ru)) return false
    usedRu.add(ru)
    return true
  })
  for (let i = 0; i + 2 < pairPool.length && out.length < 2; i += 5) {
    const block = pairPool.slice(i, i + 5)
    if (block.length < 3) break
    out.push(pairsOf(
      native ? 'Соедините слово и толкование.' : 'Соедините слово и перевод.',
      block.map(w => [label(w), w.ru] as [string, string]),
    ))
  }

  /**
   * Три обманки, взятые вокруг самого слова.
   *
   * Брать первые три слова списка нельзя: они оказывались обманками в каждом
   * вопросе юнита, и к третьему ученик отвечал, вычёркивая знакомые варианты,
   * а не узнавая нужный. Смещение от позиции слова даёт каждому вопросу свой
   * набор.
   */
  const wrongFor = (idx: number, of: (w: VocabItem) => string): string[] => {
    const right = of(words[idx])
    const picked: string[] = []
    for (let k = 1; k < words.length && picked.length < 3; k++) {
      const cand = of(words[(idx + k * 2) % words.length])
      if (cand !== right && !picked.includes(cand)) picked.push(cand)
    }
    return picked
  }

  // По одному вопросу в каждую сторону: узнать значение и вспомнить слово.
  // Слова разные и не из начала списка — там уже прошло сопоставление.
  const ask = (idx: number, reverse: boolean) => {
    const w = words[idx]
    const wrong = wrongFor(idx, x => (reverse ? x.term : x.ru))
    if (wrong.length < 2) return
    // Формулировки родного языка спрашивают не о переводе, а о точности слова:
    // «какое слово это описывает» и «что именно значит это слово».
    out.push(reverse
      ? one(native ? `Какое слово это описывает: «${w.ru}»?` : `Как будет «${w.ru}»?`, [w.term, ...wrong], 0)
      : one(native ? `Что точно значит «${label(w)}»?` : `Что значит ${label(w)}?`, [w.ru, ...wrong], 0))
  }
  ask(Math.floor(words.length / 2), false)
  ask(words.length - 1, true)

  return out.map((task, i) => editorTask(task, `${idBase}${i + 1}`, lang))
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
        // Размер S (25%): при 40% картинка съедала экран и четыре варианта
        // уходили под сгиб — задание переставало быть «одним экраном».
        // Рисунки простые (силуэт предмета), в четверть колонки они читаются.
        imageSize: 25,
        choices,
        correctChoices: [correct],
      },
      `${idBase}${k + 1}`, lang,
    ))
  }
  return tasks
}

/**
 * Возврат к пройденному — блок повторения в начале домашки.
 *
 * ЗАЧЕМ. Курс был лестницей без перил: юнит вводил десять слов, проверял их в
 * тот же вечер и больше не возвращался к ним никогда. Замер по корейским
 * курсам показал, во что это выливается: в «Разговорнике» слово всплывало в
 * заданиях другого юнита в 13% случаев, в курсе TOPIK II — в 15%. То есть
 * сорок восемь уроков подряд — это сорок восемь непересекающихся островов, и
 * забывание между ними ничем не прервано.
 *
 * Интервальные повторения у нас есть (lib/srs.ts + колода), но они живут
 * СНАРУЖИ курса: ученик должен сам открыть виджет. Тот, кто честно делает
 * домашку и не открывает, не повторяет ничего. Здесь повторение возвращается
 * в саму домашку — туда, куда ученик и так пришёл.
 *
 * ПОЧЕМУ ИМЕННО ЭТИ ИНТЕРВАЛЫ. Юниты 1, 2, 4, 7 и 12 шагов назад — это
 * расширяющаяся лестница: вчерашнее, позавчерашнее, недельной давности.
 * Ровный шаг («три прошлых юнита») даёт частое повторение свежего и полный
 * провал старого, а именно старое и забывается.
 *
 * ПОЧЕМУ ТРИ РАЗНЫХ ЗАДАНИЯ, А НЕ ТРИ КАРТОЧКИ. Повторение одним типом — это
 * повторение одного навыка. Здесь три ступени сразу: узнать пару среди
 * пяти (самое лёгкое), вспомнить слово по смыслу (тяжелее) и заново решить
 * упражнение прошлого юнита (перенос в работу).
 *
 * Блок стоит ПЕРВЫМ — до дрилла нового юнита. Разминка на знакомом материале
 * дешевле в начале, чем хвостом после часа работы, до которого не доходят.
 */
const REVIEW_OFFSETS = [1, 2, 4, 7, 12]

/** Типы, которые можно перенести в другой юнит, не потеряв смысла. */
const CARRYABLE_TYPES = new Set<TaskTypeId>([
  'single', 'multi', 'fill', 'wordBank', 'sequence', 'matching', 'tableFill',
  'listenType', 'listenBank',
])

function reviewTasks(
  unit: LangUnit,
  byN: Map<number, LangUnit>,
  idBase: string,
  lang: string,
  native = false,
) {
  const prev = REVIEW_OFFSETS
    .map(o => byN.get(unit.n - o))
    .filter((u): u is LangUnit => !!u)
  if (prev.length === 0) return []

  const label = (w: VocabItem) => (w.reading ? `${w.term} (${w.reading})` : w.term)
  const wordOf = (u: LangUnit, shift: number): VocabItem | null => {
    const words = u.vocab.filter(w => w.term?.trim() && w.ru?.trim())
    return words.length ? words[(unit.n + shift) % words.length] : null
  }
  /**
   * Слово, чей перевод в своём юните единственный.
   *
   * ЗАЧЕМ. Задание «как будет …» даёт русский смысл и ждёт ровно одну форму.
   * В юните отрицания рядом стоят 아니요 и 없어요, и оба честно переводятся
   * «нет»: вопрос «как будет „нет“?» не имеет единственного верного ответа, и
   * ученик получает ошибку за корректное слово. Та же защита, что у
   * разговорника (см. askable в survivalPhrases.ts), — только там она нужна
   * внутри темы, а здесь внутри юнита-источника.
   */
  const unambiguousOf = (u: LangUnit, shift: number): VocabItem | null => {
    const words = u.vocab.filter(w => w.term?.trim() && w.ru?.trim())
    const times = new Map<string, number>()
    for (const w of words) {
      const ru = w.ru.trim().toLowerCase()
      times.set(ru, (times.get(ru) ?? 0) + 1)
    }
    const pool = words.filter(w => times.get(w.ru.trim().toLowerCase()) === 1)
    const from = pool.length ? pool : words
    return from.length ? from[(unit.n + shift) % from.length] : null
  }
  const out: SeedTask[] = []

  // ── 1. Узнавание: по слову из каждого прошлого юнита ──
  //
  // Слова с одинаковым переводом в один блок не ставятся: пара становится
  // неугадываемой не потому, что ученик не знает языка, а потому что верных
  // ответов два (та же причина, что и в vocabRecognition).
  const seenRu = new Set<string>()
  const pool = prev
    .map((u, i) => wordOf(u, i))
    .filter((w): w is VocabItem => !!w)
    .filter(w => {
      const ru = w.ru.trim().toLowerCase()
      if (seenRu.has(ru)) return false
      seenRu.add(ru)
      return true
    })
  if (pool.length >= 3) {
    out.push(pairsOf(
      native
        ? 'Повторение: соедините слово и толкование — из прошлых уроков.'
        : 'Повторение: соедините слово и перевод — из прошлых уроков.',
      pool.map(w => (native ? [w.ru, w.term] : [label(w), w.ru]) as [string, string]),
    ))
  }

  // ── 2. Припоминание: вписать слово без вариантов ──
  //
  // Берётся из юнита позапрошлого, а не вчерашнего: вчерашнее ученик помнит
  // ещё «эхом», и такая проверка ничего не показывает.
  const recallFrom = prev[1] ?? prev[0]
  const recall = unambiguousOf(recallFrom, 3)
  if (recall) {
    out.push(fill(
      native
        ? `Повторение: какое слово это описывает — «${recall.ru}»?`
        : `Повторение: как будет «${recall.ru}»?`,
      native ? recall.term : recall.term,
      recall.alt,
    ))
  }

  // ── 3. Перенос: задание прошлого юнита целиком ──
  //
  // Задание с отрывком не переносится: отрывок в блоке повторения — это
  // страница текста перед разминкой, а группа вопросов к нему всё равно
  // осталась бы в своём юните.
  const carryFrom = prev[2] ?? prev[1] ?? prev[0]
  const carryable = carryFrom.tasks.filter(t => CARRYABLE_TYPES.has(t.type) && !t.passage)
  if (carryable.length > 0) {
    const src = carryable[unit.n % carryable.length]
    out.push({
      ...src,
      question: src.question ? `Повторение. ${src.question}` : 'Повторение.',
    })
  }

  return out.map((task, i) => editorTask(task, `${idBase}${i + 1}`, lang))
}

/**
 * Карточки слов — вперемешку с работой, а не хвостом в конце.
 *
 * ЗАЧЕМ. Словарь юнита превращался в карточки один к одному и ложился в конец
 * сплошным блоком: десять слов — десять подряд идущих «впиши перевод». В
 * корейских курсах это 39–41% всех заданий домашки, и последняя её треть
 * состояла из них одних. Ученик доходил до этого места и делал десять
 * одинаковых экранов подряд — ровно то, ради чего люди бросают Duolingo.
 *
 * Само количество карточек при этом уменьшать нельзя: из них строится
 * «Слова урока» (VocabIntro) и из них же наполняется колода интервальных
 * повторений (lib/reviewCapture.ts). Выкинутое из домашки слово исчезло бы
 * из обоих мест. Поэтому меняется не число, а РАСПОЛОЖЕНИЕ: карточки
 * распределяются по всей домашке, и подряд их идёт одна-две, а не десять.
 *
 * ГРУППА ВОПРОСОВ К ОТРЫВКУ НЕДЕЛИМА. Решатель показывает текст один раз на
 * всю группу подряд идущих заданий с одинаковым passage; карточка, вставшая
 * в середину, разорвала бы группу и заставила показать отрывок дважды.
 * Поэтому такие серии склеиваются в один неделимый блок.
 */
/**
 * Слова юнита, которые пойдут в домашку КАРТОЧКАМИ. Мягкий кап: больше
 * HW_CARD_CAP карточек на юнит не выдаём.
 *
 * ЗАЧЕМ. Карточка на каждое слово (~10 на юнит) давала карточкам 34–38% всей
 * домашки — треть работы одним и тем же жестом. Кап возвращает разнообразие,
 * при этом НИ ОДНО слово не выпадает из обучения: все слова юнита остаются в
 * его словаре и теории, проходят через vocabRecognition (сопоставление и выбор
 * строятся по ПОЛНОМУ unit.vocab) и целиком уходят в колоду интервальных
 * повторений через allVocab — тот путь с hwTasks не связан.
 *
 * ВЫБОР ДЕТЕРМИНИРОВАН по unit.n: одна и та же сборка сида в любой день даёт
 * те же карточки с теми же id (индекс слова сохраняется, id `-v${i+1}` не
 * плавают). Окно едет по кругу от n — чтобы под кап у всех юнитов не попадал
 * один и тот же хвост списка.
 */
const HW_CARD_CAP = 8
function hwVocabPick(unit: LangUnit): Array<{ word: VocabItem; i: number }> {
  const all = unit.vocab.map((word, i) => ({ word, i }))
  if (all.length <= HW_CARD_CAP) return all
  const start = unit.n % all.length
  return Array.from({ length: HW_CARD_CAP }, (_, k) => all[(start + k) % all.length])
    .sort((a, b) => a.i - b.i)
}

function interleaveCards<T extends { passage?: string }>(work: T[], cards: T[]): T[] {
  if (cards.length === 0) return work
  if (work.length === 0) return cards

  // Неделимые блоки: подряд идущие задания с одним и тем же отрывком.
  const blocks: T[][] = []
  for (const task of work) {
    const last = blocks[blocks.length - 1]
    const samePassage = !!task.passage && last?.[0]?.passage === task.passage
    if (samePassage) last.push(task)
    else blocks.push([task])
  }

  const out: T[] = []
  let ci = 0
  blocks.forEach((block, bi) => {
    out.push(...block)
    // Сколько карточек должно быть выдано к этому месту, чтобы к концу
    // работы кончились и они. Round, а не floor: при равном числе карточек и
    // блоков получается ровное чередование «работа — карточка».
    const want = Math.round((cards.length * (bi + 1)) / blocks.length)
    while (ci < want && ci < cards.length) out.push(cards[ci++])
  })
  while (ci < cards.length) out.push(cards[ci++])
  return out
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

/** Заголовок чек-листа — один на все курсы: ученик узнаёт блок в лицо. */
const CHECKLIST_TITLE = 'Чек-лист: что должно остаться в руке'

/**
 * Конспект юнита для редактора: текст плюс иллюстрации.
 *
 * Картинки встают строкой-маркером после первого абзаца — то есть сразу за
 * правилом, которое они показывают. Сам data-URI уезжает в theoryImages: в
 * поле «Конспект» учитель должен видеть свой текст, а не километр base64
 * (разбор маркеров — в lib/theoryImages.ts).
 */
function theoryOf(unit: LangUnit, figures: UnitFigure[] = []): { theory: string; theoryImages: TheoryImage[] } {
  const body = unit.theory?.trim() || composeTheory(unit)
  // Чек-лист всегда последним абзацем: это не часть объяснения, а то, с чем
  // ученик к объяснению возвращается. Стоя в середине, он разрывал бы правило.
  const text = unit.checklist?.length
    ? `${body}\n\n${checklistBlock(CHECKLIST_TITLE, unit.checklist)}`
    : body
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
      // Живая речь — до отработки: см. homeworkVideos в LanguageCourseSpec.
      ...(spec.homeworkVideos?.[unit.shortId] ?? [])
        .map((task, i) => editorTask(task, `${unit.shortId}-hv${i + 1}`, spec.lang)),
      // Возврат к пройденному — до нового материала (см. reviewTasks).
      ...reviewTasks(unit, byN, `${unit.shortId}-rv`, spec.lang, spec.native),
      // Работа юнита и карточки его слов идут вперемешку: подряд идущих
      // карточек больше двух не бывает (см. interleaveCards).
      ...interleaveCards(
        [
          // Дрилл идёт первым: конструкция сначала ставится в руку
          // подстановкой, и только потом проверяется вразбивку остальными
          // заданиями. В обратном порядке первые упражнения проверяли бы то,
          // что ещё не отработано.
          ...patternTask(unit, `${unit.shortId}-p`, spec.lang),
          ...unit.tasks.map((task, i) => editorTask(task, `${unit.shortId}-t${i + 1}`, spec.lang)),
          ...pictureTasks(unit, `${unit.shortId}-pic`, spec.lang),
          // Узнавание идёт до карточек по тому же слову: к вводу перевода
          // ученик приходит, увидев слово третий раз (см. vocabRecognition).
          ...vocabRecognition(unit, `${unit.shortId}-r`, spec.lang, spec.native),
        ],
        hwVocabPick(unit).map(({ word, i }) => vocabCard(word, `${unit.shortId}-v${i + 1}`, spec.lang, spec.native)),
      ),
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
