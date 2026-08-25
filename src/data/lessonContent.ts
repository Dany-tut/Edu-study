import { type Lesson } from './mockData'
import { normalizeTaskType, type CrosswordClue, type DialogLine, type GapRow, type PatternItem, type StoredTaskType, type TaskPayload } from './taskTypes'
import { useStudentData } from '../store/studentDataStore'
import { AP_LESSON_CONTENT, type ApLessonContent } from './apChemistryLessons'
import { parseVideoSource, type VideoSource } from '../lib/videoSource'
import type { LessonFiles } from '../lib/lessonFiles'
import { isChecklistParagraph } from '../lib/theoryChecklist'

// ── Lesson page (screen 2) content ──────────────────────────────────────────

export interface LessonTimecode { time: string; label: string; seconds: number }

/**
 * Какая глава идёт на секунде `seconds` — последняя, чьё начало уже позади.
 * −1, если глав нет.
 *
 * ЗАЧЕМ ОБЩАЯ ФУНКЦИЯ. Место в ролике показывают два разных элемента: подпись
 * главы в панели управления плеера и подсветка строки в «Таймкодах» справа.
 * Каждый считал её сам, и допуски разошлись (0.5 против 0.25 секунды) — на
 * границе главы подпись и подсветка успевали разъехаться. Считаем один раз.
 */
export function activeTimecodeIndex(codes: LessonTimecode[], seconds: number): number {
  let best = -1
  for (let i = 0; i < codes.length; i++) {
    if (codes[i].seconds <= seconds + 0.5) best = i
  }
  // До первой главы (её начало может быть не на нуле) считаем активной первую:
  // «никакая» глава в списке выглядит как потерянная подсветка.
  return best === -1 && codes.length ? 0 : best
}
export interface HomeworkQuizOption { id: string; text: string }
export interface HomeworkQuizQuestion {
  id: string
  prompt: string
  options: HomeworkQuizOption[]
  correctOptionId: string
  explanation: string
  /** Authored task type. Absent / 'choice' → multiple-choice (default). The
   *  remaining types render a free-text answer, mirroring TestFlow — except
   *  'sequence' and 'table', which render their own interactive solvers. */
  type?: StoredTaskType
  /** Все верные варианты для 'multi'. Для 'single' не заполняется. */
  correctOptionIds?: string[]
  /** Эталон for text/fill — when set, the answer is auto-checked against it. */
  referenceAnswer?: string
  /** fill — скелет ответа, опора ступени 5 (см. TaskPayload.answerSkeleton). */
  answerSkeleton?: string
  /** Pairs for a 'match' task (shown read-only as reference). */
  pairs?: Array<{ left: string; right: string }>
  /** Items in the correct order for a 'sequence' task (shown shuffled). */
  sequenceItems?: string[]
  /** Reference table for a 'table' task; emptyCells «r,c» are the cells the
   *  student fills, checked against the matching reference cell. */
  table?: { headers: string[]; rows: string[][]; emptyCells?: Record<string, boolean>; blankCells?: Record<string, boolean>; cellImages?: Record<string, string>; cellImageSizes?: Record<string, number> }

  // ─── языковые задания ───
  /** videoWatch — ролик задания и условия его зачёта (см. lib/videoAnswer.ts). */
  videoUrl?: string
  videoStart?: number
  videoWatchSeconds?: number
  videoCredit?: string
  /** trace — буква, которую обводят. Черты берутся из data/hangul.ts по ней же. */
  chamo?: string
  /** buildSyllable — эталонный слог; из чего он состоит, считается по нему. */
  syllable?: string
  /** dialogGap — реплики диалога; в одной стоит маркер пропуска «____». */
  dialog?: DialogLine[]
  /** wordDrop — строки с пропуском; банк слов общий на всю пачку. */
  gaps?: GapRow[]
  /** crossword — слова и подсказки; сетка считается по ним. */
  clues?: CrosswordClue[]
  /** wordBank / listenBank — эталонное предложение (режется на плитки по пробелам). */
  sentence?: string
  /** wordBank / listenBank — лишние плитки-обманки. */
  distractors?: string[]
  /** Аудио-стимул: путь в бакете task-media либо текст для синтеза речи. */
  audioUrl?: string
  ttsText?: string
  ttsVoice?: string
  allowSlow?: boolean
  /** Код изучаемого языка (en, ko, ja, pt-BR) — нужен синтезу речи. */
  lang?: string
  /** minimalPair — два похожих варианта и какой прозвучал. */
  pairA?: string
  pairB?: string
  correctPair?: 'A' | 'B'
  /** speaking / imageDescribe — сколько думать и сколько говорить. */
  prepSeconds?: number
  responseSeconds?: number
  /** imageDescribe / imageCompare — картинки и режим ответа. */
  images?: string[]
  /**
   * Картинка условия («Добавить фото к условию» в редакторе) — для любого типа
   * задания, включая словарную карточку, где она рисуется на лицевой стороне.
   *
   * Раньше поле не переносилось в вопрос вовсе: учитель прикладывал фото к
   * заданию курса, сохранял, а ученик видел задание без картинки — и решить
   * «что изображено» было нельзя.
   */
  image?: string
  /** Ширина картинки условия в процентах колонки (по умолчанию 100). */
  imageSize?: number
  responseMode?: 'write' | 'speak'
  /** Комментарий, который открывается после ответа (слова автора работы). */
  afterNote?: string
  /** Дополнительные принимаемые формулировки для свободного ввода. */
  altAnswers?: string[]
  /** Текст для чтения над условием; перевод открывается после ответа. */
  passage?: string
  passageTitle?: string
  passageTranslation?: string
  /** pattern — шаблон конструкции, его перевод и строки подстановки. */
  pattern?: string
  patternGloss?: string
  patternItems?: PatternItem[]

  /** flashcard — лицевая и оборотная сторона карточки. */
  front?: string
  back?: string
  /**
   * flashcard — чтение слова (романизация, кана, транскрипция), отдельным полем.
   *
   * Раньше чтение вклеивалось прямо в лицо карточки строкой «우유 (uyu)», и
   * отключить его было нельзя ничем. Отдельное поле даёт ученику тумблер: пока
   * он не читает хангыль — романизация на месте, дальше она выключается, а
   * несъёмная подсказка рядом со словом ровно это и откладывает.
   */
  reading?: string
  /** flashcard — сочетаемость слова: с чем оно ходит. */
  related?: Array<{ phrase: string; ru: string }>
}

/** One task as persisted by the course editor's «Домашки» tab
 *  (lessons.homework JSONB). Mirrors the teacher editor's HWTask / TestTask. */
/** Поля берутся из TaskPayload (src/data/taskTypes.ts) — единый источник правды.
 *  Здесь union типов был продублирован в четвёртый раз и уже отставал: он не знал
 *  ни одного языкового типа, поэтому аудио и запись голоса до ученика не доходили.
 *  Отличие от TaskPayload одно: label необязателен (старые записи его не имеют). */
export type AuthoredHomeworkTask = Omit<TaskPayload, 'label'> & { label?: string }
/** Teacher-authored homework attached to a lesson (lessons.homework JSONB). */
export interface AuthoredHomework {
  hwTitle?: string | null
  hwTarget?: string | null
  hwDate?: string | null
  hwDateManual?: boolean
  hwTasks?: AuthoredHomeworkTask[]
  recHwTitle?: string | null
  recHwTarget?: string | null
  recHwDate?: string | null
  recHwDateManual?: boolean
  recHwTasks?: AuthoredHomeworkTask[]
}
export interface HomeworkTeacherTask {
  topic: string
  prompt: string
  teacherNote: string
  placeholder: string
  acceptedFormats: string[]
}
export interface HomeworkLevel {
  id: 'basic' | 'hard'
  title: string
  shortLabel: string
  kind: 'quiz' | 'teacher-review'
  optional?: boolean
  unlockScore?: number
  motivation: string
  dueDate: string
  estimatedMinutes: number
  peerCompletionRate: number
  peerAverageScore?: number
  questions?: HomeworkQuizQuestion[]
  teacherTask?: HomeworkTeacherTask
  /** Per-task hard definitions (course-editor «Домашки» + назначенный хард из
   *  банка): each authored hard task becomes its own «Задание N» tab in
   *  HomeworkFlow's HardConversation, instead of being merged into one
   *  teacherTask prompt. */
  authoredHardDefs?: { key: string; statement: string; image?: string | null }[]
}
export interface LessonHomework {
  title: string
  subtitle: string
  recommendationScore: number
  levels: HomeworkLevel[]
  /** Есть ли у ДЗ реальный сложный уровень. false → HomeworkFlow не показывает
   *  вход в хард (нет хард-заданий → нет уровня). Undefined трактуется как true
   *  (обратная совместимость). */
  hasHardLevel?: boolean
}
/** One paragraph of the lesson's written notes. When `reactionId` is set, the
 *  paragraph introduces a specific reaction from `courseReactions` and the
 *  lesson page can scroll to / highlight it on request.
 *
 *  `image` превращает абзац в иллюстрацию: картинка рисуется на месте абзаца, а
 *  `text` становится подписью под ней. Так схема стоит там, где она объясняет
 *  (сразу после правила), а не отдельным блоком в конце урока. */
export interface LessonParagraph { id: string; text: string; reactionId?: string; image?: string }
/** Authored, editable lesson body — konspekt paragraphs + homework. Stored per
 *  lesson in Supabase (`lessons.content`); when empty we fall back to code. */
export interface LessonContentData {
  paragraphs: LessonParagraph[]
  quiz: HomeworkQuizQuestion[]
  hardTask: HomeworkTeacherTask
}
export interface LessonDetail {
  /** formatted lesson date, e.g. "06.05" */
  date: string
  /** Длительность записи, «24:18». Пусто, когда её никто не измерял: раньше
   *  здесь стояло зашитое «25:12» и оно врало поверх любого чужого ролика.
   *  Реальную длину знает только сам плеер — он и подписывает её, когда
   *  запущен (см. LessonVideoPlayer). */
  duration?: string
  /** Parsed recording source (RuTube / YouTube / own link) — undefined when
   *  no recording has been attached yet. */
  videoSource?: VideoSource
  timecodes: LessonTimecode[]
  /** Прикреплённые учителем файлы: рабочая тетрадь, конспект-PDF, материалы.
   *  Пусто, пока ничего не загружено — плитки на экране урока в этом случае
   *  неактивны, а не притворяются рабочими. */
  files: LessonFiles
  /** Body of the lesson's "Конспект" — a handful of paragraphs, with any
   *  reactions from `courseReactions` woven in as their own paragraphs. */
  paragraphs: LessonParagraph[]
  homework?: LessonHomework
}

/** Файлы урока приходят из lessons.materials (см. lib/lessonFiles) — их
 *  загружает учитель в Конструкторе. Раньше здесь лежал зашитый набор по
 *  предметам с фолбэком на химию, и урок английского предлагал скачать таблицу
 *  Менделеева и таблицу растворимостей. */
function lessonFiles(lesson: Lesson): LessonFiles {
  return lesson.files ?? {}
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/** Deterministic mock detail for a catalogue lesson — date, duration, timecodes
 *  and downloadable materials — so the lesson page (screen 2) is data-driven. */
export function getLessonDetail(lesson: Lesson): LessonDetail {
  // Deterministic + stable per lesson number (no Date.now()/random).
  const day = (lesson.number % 28) + 1
  const month = ((lesson.number * 3) % 12) + 1
  const dateStr = `${pad2(day)}.${pad2(month)}`

  // Только видео и таймкоды из БД, без подставного набора.
  //
  // Раньше урок без своих таймкодов получал общий список («Введение», «Основные
  // понятия», «Разбор примеров»…), сверстанный под 25-минутный ролик о
  // биосинтезе белка. В языковых курсах он вставал поверх часовой лекции: главы
  // заканчивались на 21:05 при длительности 1:03:43, а подписи не имели к
  // содержанию никакого отношения. Список глав, который не отвечает видео, хуже
  // отсутствующего — панель просто не показывается, пока глав нет.
  const videoSource = parseVideoSource(lesson.videoUrl)
  const timecodes = lesson.timecodes?.length ? lesson.timecodes : []

  // Homework priority: teacher-authored homework from the course editor's
  // «Домашки» tab (lessons.homework JSONB) → AP/generic fallback. Authored
  // homework always wins so the student sees the real tasks, not a placeholder.
  const authoredHw = lesson.homework?.hwTasks?.length
    ? buildAuthoredHomework(lesson, dateStr)
    : null

  // Priority: DB-authored content (teacher edits in Конструктор) → code default
  // (AP authored) → generic generator.
  const ap = (lesson.content && lesson.content.paragraphs?.length ? lesson.content : null) ?? AP_LESSON_CONTENT[lesson.id]
  if (ap) {
    return {
      date: dateStr,
      videoSource,
      timecodes,
      files: lessonFiles(lesson),
      // Старый чек-лист «что должно остаться в руке» выброшен: блок убран,
      // но в уже сохранённых курсах он лежит абзацем — и без фильтра ученик
      // увидел бы сырую разметку «- [ ] …» (см. lib/theoryChecklist).
      paragraphs: ap.paragraphs.filter(p => !isChecklistParagraph(p.text)),
      homework: authoredHw ?? buildApHomework(lesson, dateStr, ap),
    }
  }

  // Use teacher-authored description if available; otherwise hide the section.
  const descParagraphs: LessonParagraph[] = lesson.description?.trim()
    ? [{ id: 'description', text: lesson.description.trim() }]
    : []

  return {
    date: dateStr,
    videoSource,
    timecodes,
    files: lessonFiles(lesson),
    paragraphs: descParagraphs,
    homework: authoredHw ?? undefined,
  }
}

/** Map one persisted authored task → a homework question. Choice tasks become
 *  auto-graded multiple-choice; the rest become free-text answers (text/fill
 *  auto-check against the эталон, match/whiteboard are teacher-reviewed). */
export function authoredTaskToQuestion(t: AuthoredHomeworkTask, i: number): HomeworkQuizQuestion {
  const prompt = t.question?.trim() || t.label || `Задание ${i + 1}`
  // ВАЖНО: тип приводим к каноническому. Редактор курса пишет 'single'/'multi'/
  // 'matching'/'tableFill', а раньше здесь проверялись только легаси-написания
  // ('choice'/'match'/'table') — из-за чего задание с выбором ответа уезжало в
  // ветку свободного текста, получало options: [] и показывалось ученику вообще
  // без вариантов ответа. Решить такое задание было нельзя.
  const tp = normalizeTaskType(t.type)

  if (tp === 'single' || tp === 'multi') {
    const options = (t.choices ?? []).map((text, ci) => ({ id: String(ci), text: text || `Вариант ${ci + 1}` }))
    const correctIdx = (t.correctChoices ?? [])
    return {
      id: t.id, prompt, options,
      correctOptionId: correctIdx[0] != null ? String(correctIdx[0]) : '',
      // Для multi нужны все верные варианты, а не только первый.
      correctOptionIds: tp === 'multi' ? correctIdx.map(String) : undefined,
      explanation: '', type: tp,
      image: t.image,
      imageSize: t.imageSize,
      // Язык задания нужен и ветке выбора: по нему вариант на незнакомом письме
      // получает транскрипцию и озвучку (ScriptHint, Р14). Без него ученик
      // выбирал между четырьмя строками хангыля, которые ещё не читаются.
      lang: t.lang,
      ttsText: t.ttsText,
      ttsVoice: t.ttsVoice,
      // Экзаменационное чтение — это почти всегда выбор ответа к отрывку,
      // поэтому passage обязан переноситься и в этой ветке тоже.
      passage: t.passage,
      passageTitle: t.passageTitle,
      passageTranslation: t.passageTranslation,
    }
  }

  return {
    id: t.id, prompt, options: [], correctOptionId: '', explanation: '',
    type: tp,
    referenceAnswer: t.answer?.trim() || undefined,
    altAnswers: t.altAnswers,
    answerSkeleton: t.answerSkeleton,
    pairs: tp === 'matching' ? t.pairs : undefined,
    // blockOrder собирается из тех же авторских блоков, что и sequence, — без
    // переноса задание доезжало бы до ученика пустым полем текста.
    sequenceItems: (tp === 'sequence' || tp === 'blockOrder') ? (t.sequenceItems ?? []).filter(s => s.trim()) : undefined,
    table: tp === 'tableFill' ? t.table : undefined,

    // Языковые поля переносятся как есть — решатели сами берут нужное по типу.
    dialog: t.dialog,
    gaps: t.gaps,
    clues: t.clues,
    sentence: t.sentence,
    distractors: t.distractors,
    audioUrl: t.audioUrl,
    ttsText: t.ttsText,
    ttsVoice: t.ttsVoice,
    allowSlow: t.allowSlow,
    lang: t.lang,
    pairA: t.pairA,
    pairB: t.pairB,
    correctPair: t.correctPair,
    prepSeconds: t.prepSeconds,
    responseSeconds: t.responseSeconds,
    images: t.images,
    image: t.image,
    imageSize: t.imageSize,
    responseMode: t.responseMode,
    afterNote: t.afterNote,
    passage: t.passage,
    passageTitle: t.passageTitle,
    passageTranslation: t.passageTranslation,
    front: t.front,
    back: t.back,
    reading: t.reading,
    related: t.related,
    pattern: t.pattern,
    patternGloss: t.patternGloss,
    patternItems: t.patternItems,
    // Письменность: буква для обводки и эталонный слог. Решатели включаются
    // именно по ним, а не по типу — без переноса задание доезжало до ученика
    // с пустым chamo/syllable и показывалось полем «Развёрнутый ответ».
    chamo: t.chamo,
    syllable: t.syllable,
    // Видео: ссылка и порог просмотра. Без переноса задание доезжало бы до
    // ученика пустым — плееру нечего открыть.
    videoUrl: t.videoUrl,
    videoStart: t.videoStart,
    videoWatchSeconds: t.videoWatchSeconds,
    videoCredit: t.videoCredit,
  }
}

/** Есть ли у урока реальный сложный уровень. Урок с авторскими заданиями
 *  (Конструктор → «Домашки») даёт хард ТОЛЬКО если среди них есть isHard —
 *  иначе внутри хард-уровня пусто, и показывать вход в него (спутник-звезду на
 *  треке, кнопку «Хард-уровень», строку в карточке ДЗ) не нужно. У старых
 *  сгенерированных ДЗ (химия/биология/AP) хард есть всегда. */
export function lessonHasHardLevel(lesson: Lesson): boolean {
  const authored = lesson.homework?.hwTasks
  if (authored?.length) return authored.some(task => task.isHard)
  return true
}

/** Build the student's LessonHomework from teacher-authored tasks. The basic
 *  level holds the non-hard tasks; hard tasks (isHard) feed the teacher-review
 *  level. HomeworkFlow requires both a basic and a hard level, so the hard
 *  level always exists (falling back to a generic prompt when none authored). */
function buildAuthoredHomework(lesson: Lesson, fallbackDate: string): LessonHomework {
  const hw = lesson.homework!
  const all = hw.hwTasks ?? []
  const basicTasks = all.filter(t => !t.isHard)
  const hardTasks = all.filter(t => t.isHard)
  const dueDate = hw.hwDate?.trim() || fallbackDate
  const recommendationScore = 80

  // Each authored hard task → its own «Задание N» tab (NOT merged into one
  // prompt). teacherTask stays only for the aside (formats / topic).
  const authoredHardDefs = hardTasks.map((t, i) => ({
    key: t.id,
    statement: t.question?.trim() || t.label || `Сложное задание ${i + 1}`,
    image: t.image ?? null,
  }))

  const hardTeacherTask: HomeworkTeacherTask = hardTasks.length > 0
    ? {
        topic: 'Сложные задания',
        prompt: authoredHardDefs[0]?.statement ?? '',
        teacherNote: 'Преподаватель проверит решение и оставит развёрнутый комментарий.',
        placeholder: 'Запиши решение здесь…',
        acceptedFormats: ['текст', 'фото', 'доска'],
      }
    : getChemistryHardTask(lesson.title)

  return {
    title: hw.hwTitle?.trim() || `Домашка по теме «${lesson.title}»`,
    subtitle: 'Базовый уровень — задания от преподавателя; хард уходит на проверку.',
    recommendationScore,
    // Нет авторских хард-заданий → скрываем вход в хард (уровень остаётся в
    // данных как заглушка, но HomeworkFlow его не показывает).
    hasHardLevel: hardTasks.length > 0,
    levels: [
      {
        id: 'basic',
        title: '1 уровень',
        shortLabel: 'База',
        kind: 'quiz',
        motivation: 'Проверим, насколько тема уложилась после урока, без лишней перегрузки.',
        dueDate,
        estimatedMinutes: Math.max(5, basicTasks.length * 3),
        peerCompletionRate: 78,
        questions: basicTasks.map(authoredTaskToQuestion),
      },
      {
        id: 'hard',
        title: '2 уровень',
        shortLabel: 'Хард',
        kind: 'teacher-review',
        optional: true,
        unlockScore: recommendationScore,
        motivation: 'Необязательный уровень с проверкой преподавателем — для тех, кто уверенно прошёл базу.',
        dueDate,
        estimatedMinutes: Math.max(10, Math.max(hardTasks.length, 1) * 8),
        peerCompletionRate: 31,
        teacherTask: hardTeacherTask,
        authoredHardDefs: authoredHardDefs.length > 0 ? authoredHardDefs : undefined,
      },
    ],
  }
}

/** Wrap authored AP quiz + hard task into the full LessonHomework scaffold,
 *  reusing the same level structure as the generic homework. */
function buildApHomework(lesson: Lesson, dueDate: string, ap: ApLessonContent): LessonHomework {
  const recommendationScore = 80
  return {
    title: `Домашка по теме «${lesson.title}»`,
    subtitle: 'Базовый уровень проверяется сразу по ключам, хард уходит преподавателю на проверку.',
    recommendationScore,
    levels: [
      {
        id: 'basic',
        title: '1 уровень',
        shortLabel: 'База',
        kind: 'quiz',
        motivation: 'Проверим, насколько тема уложилась после урока, без лишней перегрузки.',
        dueDate,
        estimatedMinutes: 10,
        peerCompletionRate: 78,
        peerAverageScore: 74,
        questions: ap.quiz,
      },
      {
        id: 'hard',
        title: '2 уровень',
        shortLabel: 'Хард',
        kind: 'teacher-review',
        optional: true,
        unlockScore: recommendationScore,
        motivation: 'Хард не обязателен, но отлично подойдёт тем, кто хочет добрать глубину и получить комментарий преподавателя.',
        dueDate,
        estimatedMinutes: 20,
        peerCompletionRate: 31,
        teacherTask: ap.hardTask,
      },
    ],
  }
}

// Static intro / outro snippets to wrap the dynamic reaction paragraphs in,
// so a lesson with one reaction still reads like a small chapter rather than a
// single quote. Keyed by subject — falls back to chemistry copy.
const introBySubject: Record<string, string> = {
  chemistry: 'На этом занятии мы разберём ключевые понятия темы и посмотрим, как они работают на конкретных реакциях. Сначала — короткая теория с опорными определениями и схемами, затем — примеры, которые встречаются в задачах ЕГЭ и в реальной жизни. По ходу будем разбирать, почему реакция идёт именно так, какие условия на это влияют и как предсказать продукты, не заучивая каждый случай отдельно. Особое внимание уделим типичным ошибкам: где школьники чаще всего «теряют» коэффициенты, путают степени окисления или забывают про среду раствора. Параллельно будем тренировать химический «глаз»: учиться видеть в формуле не набор букв, а характер вещества — его кислотно-основные свойства, окислительно-восстановительный потенциал, склонность к гидролизу или к комплексообразованию. Это та самая интуиция, которая на экзамене позволяет за секунды отбросить заведомо неверные варианты ответа, а в задачах второй части — выстроить цепочку превращений, даже если ни одно из её звеньев вы раньше не видели в готовом виде.',
  biology: 'На этом занятии мы соберём ключевые понятия темы и посмотрим, как они проявляются в живых организмах. Сначала — короткая теория с ключевыми терминами и схемами процессов, затем — примеры из природы и из задач ЕГЭ. Мы разберём, как одни и те же механизмы работают на разных уровнях организации — от молекулы до экосистемы, — и почему важно видеть эти связи, а не запоминать факты по отдельности. Отдельно остановимся на формулировках, которые часто встречаются в экзаменационных заданиях: какие слова сигнализируют о том, что именно от вас хотят услышать. По ходу занятия будем сравнивать сходные процессы и структуры — где они дополняют друг друга, а где, наоборот, противопоставлены, — чтобы у вас сложилась цельная картина, а не россыпь разрозненных определений. Такой подход экономит время на повторении: вместо того чтобы перечитывать десятки страниц перед экзаменом, вы будете опираться на несколько ключевых схем, из которых легко вывести частные случаи.',
}
const outroBySubject: Record<string, string> = {
  chemistry: 'В домашнем задании потребуется применить эти уравнения к новым условиям: уравнять реакции, рассчитать количество вещества и определить продукты. Часть задач будет похожа на разобранные на занятии, а часть — заставит соединить сегодняшнюю тему с тем, что вы уже проходили раньше, поэтому не торопитесь и проверяйте каждый шаг. Если уравнение «не идёт», возвращайтесь к теории и к разобранным примерам — обычно ответ скрывается именно там, в условиях проведения реакции или в свойствах конкретного вещества. Записывайте ход решения подробно: так будет легче найти ошибку и закрепить логику рассуждений. Не бойтесь делать пометки на полях — стрелки между формулами, короткие комментарии «почему именно так», подсчёт степеней окисления карандашом над атомами — всё это превращает решение из набора формальных строк в осмысленный рассказ, который вы сможете воспроизвести и через неделю, и через месяц. И помните: одна по-настоящему понятая задача даёт больше, чем десять решённых наугад, поэтому лучше разобрать меньше, но до конца, чем закрыть весь список с пробелами в понимании.',
  biology: 'В домашнем задании предстоит применить эти понятия к новым ситуациям и связать их с уже пройденными темами. Некоторые вопросы будут на узнавание и определение, другие — на объяснение причинно-следственных связей, поэтому отвечайте развёрнуто и опирайтесь на конкретные примеры. Если что-то «не сходится», возвращайтесь к иллюстрациям и схемам из конспекта — обычно ответ виден прямо там, стоит только проследить процесс шаг за шагом. Старайтесь формулировать мысли биологически точно: используйте термины из занятия, а не бытовые синонимы, — это именно то, что ценится в ответах ЕГЭ. Полезно проговаривать ответ вслух или объяснять его воображаемому собеседнику: если вы можете изложить тему своими словами, не подсматривая в конспект, значит, она действительно усвоена, а не просто прочитана. И последнее: не оставляйте сложные вопросы «на потом» — выписывайте их сразу и приносите на следующую встречу, потому что именно из таких неясных мест и складывается понимание целого, а не из тех тем, где всё и так очевидно.',
}

/** Assemble the lesson's written notes: an intro, one paragraph per reaction
 *  studied in this lesson, and a closing remark. Reactions are matched by
 *  case-insensitive lesson title — same rule the widget uses to navigate here. */
function buildParagraphs(lesson: Lesson): LessonParagraph[] {
  const title = lesson.title.trim().toLowerCase()
  const courseReactions = useStudentData.getState().courseReactions
  const reactions = courseReactions.filter(r => r.lesson.trim().toLowerCase() === title)

  const intro = introBySubject[lesson.subject] ?? introBySubject.chemistry
  const outro = outroBySubject[lesson.subject] ?? outroBySubject.chemistry

  const out: LessonParagraph[] = [{ id: 'intro', text: intro }]
  for (const r of reactions) {
    out.push({ id: `reaction-${r.id}`, text: r.paragraph, reactionId: r.id })
  }
  out.push({ id: 'outro', text: outro })
  return out
}

function getChemistryHardTask(title: string): HomeworkTeacherTask {
  const t = title.trim().toLowerCase()

  if (t.includes('строение атома') || t.includes('атом')) {
    return {
      topic: 'Задача на строение атома',
      prompt: 'Выбери любые три элемента из разных периодов таблицы Менделеева (один из периода 2, один из периода 3, один из периода 4). Для каждого: запиши электронную конфигурацию, нарисуй схему расположения электронов по уровням, укажи число протонов, нейтронов и электронов. Затем объясни: почему у этих элементов разная химическая активность? Что именно в строении атома это определяет?',
      teacherNote: 'Преподаватель проверит правильность электронных конфигураций, схем строения и качество объяснения связи «строение → свойства».',
      placeholder: 'Например: Na (Z=11) — конфигурация 2,8,1 — на внешнем уровне 1 электрон, поэтому ...',
      acceptedFormats: ['текст', 'схемы', 'фото решения'],
    }
  }

  if (t.includes('периодический закон') || t.includes('периодическая система')) {
    return {
      topic: 'Анализ периодических закономерностей',
      prompt: 'Возьми любую группу (столбец) таблицы Менделеева. Проследи, как меняются: радиус атома, электроотрицательность, металлические/неметаллические свойства при движении сверху вниз. Объясни причину каждой закономерности через строение атома. Приведи конкретные пример из жизни или химии, где это проявляется.',
      teacherNote: 'Преподаватель оценит точность формулировок, правильность тенденций и глубину объяснения через электронное строение.',
      placeholder: 'Группа 1 (щелочные металлы): Li → Na → K → ... Радиус растёт, потому что ...',
      acceptedFormats: ['текст', 'таблица', 'фото конспекта'],
    }
  }

  if (t.includes('химическая связь') || t.includes('ковалентная') || t.includes('ионная')) {
    return {
      topic: 'Разбор химических связей',
      prompt: 'Выбери три вещества: одно с ионной связью, одно с ковалентной полярной, одно с ковалентной неполярной. Для каждого нарисуй схему образования связи (электронные точки), укажи разницу электроотрицательностей и объясни, как тип связи влияет на физические свойства вещества (температура кипения, растворимость в воде).',
      teacherNote: 'Преподаватель проверит корректность схем, логику рассуждений и связь между типом связи и свойствами.',
      placeholder: 'NaCl — ионная: Na отдаёт электрон, Cl принимает. ΔЭО = 2,1. Это объясняет ...',
      acceptedFormats: ['текст', 'схемы', 'формулы', 'фото решения'],
    }
  }

  if (t.includes('окислительно-восстановительн') || t.includes('овр')) {
    return {
      topic: 'ОВР: разбор механизма',
      prompt: 'Составь и уравняй методом электронного баланса одну окислительно-восстановительную реакцию. Укажи степени окисления всех элементов до и после реакции, выдели окислитель и восстановитель, объясни, почему именно эти вещества играют эти роли в данных условиях.',
      teacherNote: 'Преподаватель проверит правильность расстановки степеней окисления, баланс электронов и обоснование ролей.',
      placeholder: 'Реакция: ... + ... → ... Степень окисления X меняется с ... на ..., значит X — это ...',
      acceptedFormats: ['текст', 'формулы', 'фото решения'],
    }
  }

  // generic chemistry fallback
  return {
    topic: 'Разбор задачи по теме урока',
    prompt: 'Реши расчётную задачу по теме урока с полным оформлением: запиши уравнение реакции, обозначь дано/найти, покажи все вычисления с единицами измерения. После решения объясни своими словами: какой химический смысл стоит за числами и почему реакция идёт именно так.',
    teacherNote: 'Преподаватель проверит корректность уравнения, правильность расчётов и качество химического объяснения.',
    placeholder: 'Дано: m(вещества) = ... г, M = ... г/моль. Нахожу n = m/M = ...',
    acceptedFormats: ['текст', 'формулы', 'фото решения'],
  }
}

function buildHomework(lesson: Lesson, dueDate: string): LessonHomework {
  const recommendationScore = 80
  const isBiology = lesson.subject === 'biology'
  const basics = isBiology
    ? buildBiologyQuiz()
    : buildChemistryQuiz()

  return {
    title: `Домашка по теме «${lesson.title}»`,
    subtitle: isBiology
      ? 'Сначала короткий базовый тест, потом по желанию хард с разбором кейса.'
      : 'Базовый уровень проверяется сразу по ключам, хард уходит преподавателю на проверку.',
    recommendationScore,
    levels: [
      {
        id: 'basic',
        title: '1 уровень',
        shortLabel: 'База',
        kind: 'quiz',
        motivation: isBiology
          ? 'Соберём опорные понятия и быстро поймём, что уже держится уверенно.'
          : 'Проверим, насколько тема уложилась после урока, без лишней перегрузки.',
        dueDate,
        estimatedMinutes: 10,
        peerCompletionRate: 78,
        peerAverageScore: 74,
        questions: basics,
      },
      {
        id: 'hard',
        title: '2 уровень',
        shortLabel: 'Хард',
        kind: 'teacher-review',
        optional: true,
        unlockScore: recommendationScore,
        motivation: isBiology
          ? 'Этот уровень для тех, кто уверенно прошёл базу и хочет получить развёрнутый фидбек от преподавателя.'
          : 'Хард не обязателен, но отлично подойдёт тем, кто хочет добрать глубину и получить комментарий преподавателя.',
        dueDate,
        estimatedMinutes: 20,
        peerCompletionRate: 31,
        teacherTask: isBiology
          ? {
              topic: 'Мини-кейс: адаптация вида',
              prompt: 'Опиши, какие признаки помогут виду выжить при смене условий среды. Дай 2-3 аргумента и приведи один пример естественного отбора.',
              teacherNote: 'Преподаватель проверит логику аргументов, корректность терминов и то, как ты связываешь пример с теорией.',
              placeholder: 'Например: при похолодании преимущество получат особи с ...',
              acceptedFormats: ['текст', 'таблица', 'фото конспекта'],
            }
          : getChemistryHardTask(lesson.title),
      },
    ],
  }
}

function buildChemistryQuiz(): HomeworkQuizQuestion[] {
  return [
    {
      id: 'q1',
      prompt: 'Что происходит при растворении электролита в воде?',
      options: [
        { id: 'a', text: 'Молекулы распадаются на ионы' },
        { id: 'b', text: 'Все частицы превращаются в атомы' },
        { id: 'c', text: 'Реакция обязательно прекращается' },
      ],
      correctOptionId: 'a',
      explanation: 'Электролиты диссоциируют на ионы, поэтому раствор начинает проводить ток.',
    },
    {
      id: 'q2',
      prompt: 'Какой ион определяет кислотные свойства раствора?',
      options: [
        { id: 'a', text: 'OH−' },
        { id: 'b', text: 'H+' },
        { id: 'c', text: 'Na+' },
      ],
      correctOptionId: 'b',
      explanation: 'Кислотные свойства связаны с присутствием ионов водорода.',
    },
    {
      id: 'q3',
      prompt: 'Какой процесс соответствует нейтрализации?',
      options: [
        { id: 'a', text: 'Кислота + основание -> соль + вода' },
        { id: 'b', text: 'Соль + вода -> металл + газ' },
        { id: 'c', text: 'Металл + металл -> сплав' },
      ],
      correctOptionId: 'a',
      explanation: 'Нейтрализация — это реакция кислоты и основания с образованием соли и воды.',
    },
    {
      id: 'q4',
      prompt: 'Какая среда будет у раствора щёлочи?',
      options: [
        { id: 'a', text: 'Кислая' },
        { id: 'b', text: 'Нейтральная' },
        { id: 'c', text: 'Щелочная' },
      ],
      correctOptionId: 'c',
      explanation: 'Щёлочи создают избыток OH−, поэтому среда щелочная.',
    },
    {
      id: 'q5',
      prompt: 'Что помогает определить продукты реакции в теме урока?',
      options: [
        { id: 'a', text: 'Только цвет раствора' },
        { id: 'b', text: 'Свойства реагентов и таблица растворимости' },
        { id: 'c', text: 'Порядковый номер урока' },
      ],
      correctOptionId: 'b',
      explanation: 'Свойства веществ и таблица растворимости помогают предсказать продукты и осадок.',
    },
    {
      id: 'q6',
      prompt: 'Зачем после расстановки коэффициентов ещё раз проверять уравнение?',
      options: [
        { id: 'a', text: 'Чтобы убедиться в сохранении числа атомов и заряда' },
        { id: 'b', text: 'Чтобы изменить тему урока' },
        { id: 'c', text: 'Потому что так красивее выглядит запись' },
      ],
      correctOptionId: 'a',
      explanation: 'Проверка нужна, чтобы число атомов и общий заряд совпадали в обеих частях уравнения.',
    },
  ]
}

function buildBiologyQuiz(): HomeworkQuizQuestion[] {
  return [
    {
      id: 'q1',
      prompt: 'Что лучше всего описывает экологическую нишу?',
      options: [
        { id: 'a', text: 'Только место обитания организма' },
        { id: 'b', text: 'Роль вида в экосистеме и условия его существования' },
        { id: 'c', text: 'Список всех хищников вида' },
      ],
      correctOptionId: 'b',
      explanation: 'Экологическая ниша включает и условия среды, и роль вида в экосистеме.',
    },
    {
      id: 'q2',
      prompt: 'Кто является производителем в пищевой цепи?',
      options: [
        { id: 'a', text: 'Зелёные растения' },
        { id: 'b', text: 'Хищные птицы' },
        { id: 'c', text: 'Грибы-разрушители' },
      ],
      correctOptionId: 'a',
      explanation: 'Производители создают органическое вещество из неорганического, чаще всего это растения.',
    },
    {
      id: 'q3',
      prompt: 'Что происходит при выпадении одного звена из пищевой цепи?',
      options: [
        { id: 'a', text: 'Ничего не меняется' },
        { id: 'b', text: 'Нарушаются связи между остальными организмами' },
        { id: 'c', text: 'Экосистема сразу исчезает' },
      ],
      correctOptionId: 'b',
      explanation: 'Пищевые связи связаны между собой, поэтому исчезновение одного звена влияет на другие.',
    },
    {
      id: 'q4',
      prompt: 'Какой фактор относится к абиотическим?',
      options: [
        { id: 'a', text: 'Температура воздуха' },
        { id: 'b', text: 'Конкуренция между видами' },
        { id: 'c', text: 'Хищничество' },
      ],
      correctOptionId: 'a',
      explanation: 'Абиотические факторы — это неживые условия среды: температура, свет, влажность.',
    },
    {
      id: 'q5',
      prompt: 'Почему биоразнообразие важно для устойчивости экосистемы?',
      options: [
        { id: 'a', text: 'Потому что так красивее выглядит лес' },
        { id: 'b', text: 'Разнообразие связей помогает системе легче переживать изменения' },
        { id: 'c', text: 'Оно полностью исключает конкуренцию' },
      ],
      correctOptionId: 'b',
      explanation: 'Чем больше связей и форм жизни, тем больше у экосистемы устойчивых сценариев адаптации.',
    },
    {
      id: 'q6',
      prompt: 'Что верно для круговорота веществ?',
      options: [
        { id: 'a', text: 'Вещества исчезают после прохождения по цепи питания' },
        { id: 'b', text: 'Вещества переходят от одних организмов к другим и возвращаются в среду' },
        { id: 'c', text: 'Он существует только в водных экосистемах' },
      ],
      correctOptionId: 'b',
      explanation: 'Вещества не исчезают, а переходят между организмами и окружающей средой.',
    },
  ]
}

/** Find a catalogue lesson by id across every subject/module. */
export function findLessonById(id: string): Lesson | null {
  const subjects = useStudentData.getState().subjects
  for (const s of subjects) {
    for (const m of s.modules) {
      const l = m.lessons.find(les => les.id === id)
      if (l) return l
    }
  }
  return null
}
