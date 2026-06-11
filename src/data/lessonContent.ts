import { type Lesson } from './mockData'
import { useStudentData } from '../store/studentDataStore'

// ── Lesson page (screen 2) content ──────────────────────────────────────────

export interface LessonTimecode { time: string; label: string; seconds: number }
export interface LessonMaterial { id: string; name: string; emoji: string; gradient: string }
export interface HomeworkQuizOption { id: string; text: string }
export interface HomeworkQuizQuestion {
  id: string
  prompt: string
  options: HomeworkQuizOption[]
  correctOptionId: string
  explanation: string
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
}
export interface LessonHomework {
  title: string
  subtitle: string
  recommendationScore: number
  levels: HomeworkLevel[]
}
/** One paragraph of the lesson's written notes. When `reactionId` is set, the
 *  paragraph introduces a specific reaction from `courseReactions` and the
 *  lesson page can scroll to / highlight it on request. */
export interface LessonParagraph { id: string; text: string; reactionId?: string }
export interface LessonDetail {
  /** formatted lesson date, e.g. "06.05" */
  date: string
  /** total runtime, e.g. "24:18" */
  duration: string
  /** RuTube video id for the embedded player (rutube.ru/play/embed/<id>) */
  videoId: string
  timecodes: LessonTimecode[]
  materials: LessonMaterial[]
  /** Body of the lesson's "Конспект" — a handful of paragraphs, with any
   *  reactions from `courseReactions` woven in as their own paragraphs. */
  paragraphs: LessonParagraph[]
  homework: LessonHomework
}

// Reference downloadable materials, keyed by subject id. Mirrors the prototype's
// Материалы dropdown (Таблица Менделеева, Таблица растворимостей for chemistry).
const materialsBySubject: Record<string, LessonMaterial[]> = {
  chemistry: [
    { id: 'mendeleev', name: 'Таблица Менделеева', emoji: '🧪', gradient: 'linear-gradient(135deg, #6EC6FF, #2D6BE0)' },
    { id: 'solubility', name: 'Таблица растворимостей', emoji: '💧', gradient: 'linear-gradient(135deg, #6EE7A0, #1E9E63)' },
  ],
  biology: [
    { id: 'taxonomy', name: 'Систематика растений', emoji: '🌿', gradient: 'linear-gradient(135deg, #8FE06E, #2D9A45)' },
    { id: 'cell', name: 'Строение клетки', emoji: '🔬', gradient: 'linear-gradient(135deg, #B98BFF, #6B3FD6)' },
  ],
}

// Real RuTube video powering the player — «Биосинтез белка | Полный урок»
// (25:12). The embed supports ?t=<seconds> for the start offset and the
// player:setCurrentTime postMessage API for seeking, so the timecodes below
// jump to real positions in this clip.
const LESSON_VIDEO_ID = 'af3785d57099685bc3be290075998d40'

// Chapter timecodes mapped to real positions in the video above (time string +
// matching offset in seconds) so the player's "Таймкоды" panel actually seeks.
const baseTimecodes: LessonTimecode[] = [
  { time: '00:00', label: 'Введение', seconds: 0 },
  { time: '03:40', label: 'Основные понятия', seconds: 220 },
  { time: '09:15', label: 'Разбор примеров', seconds: 555 },
  { time: '16:30', label: 'Частые ошибки', seconds: 990 },
  { time: '21:05', label: 'Итоги и домашнее задание', seconds: 1265 },
]

const pad2 = (n: number) => String(n).padStart(2, '0')

/** Deterministic mock detail for a catalogue lesson — date, duration, timecodes
 *  and downloadable materials — so the lesson page (screen 2) is data-driven. */
export function getLessonDetail(lesson: Lesson): LessonDetail {
  // Deterministic + stable per lesson number (no Date.now()/random).
  const day = (lesson.number % 28) + 1
  const month = ((lesson.number * 3) % 12) + 1
  return {
    date: `${pad2(day)}.${pad2(month)}`,
    // Real runtime of LESSON_VIDEO_ID (25:12).
    duration: '25:12',
    videoId: LESSON_VIDEO_ID,
    timecodes: baseTimecodes,
    materials: materialsBySubject[lesson.subject] ?? materialsBySubject.chemistry,
    paragraphs: buildParagraphs(lesson),
    homework: buildHomework(lesson, `${pad2(day)}.${pad2(month)}`),
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
