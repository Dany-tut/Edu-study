// ─────────────────────────────────────────────────────────────────────────────
// Курс «Бухгалтерия» (acc-ru) — сборка уроков и short_id
//
// Путь подключения тот же, что у AP-химии и биологии: строки каталога в БД
// (courses / course_modules / lessons по short_id) + авторский конспект и
// домашка в коде, которые подставляются, пока lessons.content пуст. Чанк
// грузится лениво по префиксу short_id (см. apLessonChunk.ts).
//
// НУМЕРАЦИЯ С НУЛЯ И ПОДРЯД: short_id = `acc-ru-<индекс>`, где индекс — место
// урока в курсе. Так считает интерфейс («Занятие №{n + 1}») и редактор
// конспекта в Конструкторе. После заведения курса в базу порядок уроков менять
// нельзя без переноса lessons.content — иначе правки учителя уедут в соседний
// урок. Новые уроки — только в конец модуля с переносом хвоста отдельной
// миграцией.
//
// Второй урок вводного модуля — справочник: он собирается здесь из рабочих
// вопросов (`queries`) всех уроков, поэтому никогда не отстаёт от курса.
// ─────────────────────────────────────────────────────────────────────────────
import { p, qmatch, hard, type AuthoredLessonContent } from '../lessonAuthoring'
import { MODULES } from './modules'
import { accLessonFiles } from './accFiles'
import type { AccLesson, AccModule } from './types'

export const ACC_COURSE_ID = 'acc-ru'
export const ACC_COURSE_TITLE = 'Бухгалтерия: Excel, 1С и закон на практике'

function handbook(modules: AccModule[], numberOf: (key: string) => number): AccLesson {
  const rows = modules.filter(m => m.id !== 'EXP00').map(m => {
    const lines = m.lessons.flatMap(l => l.queries.map(q => `— ${q} → №${numberOf(l.key) + 1} «${l.title}»`))
    return p(`h-${m.id}`, `**${m.title}**\n${lines.join('\n')}`)
  })
  // Вопросы домашки — сопоставление «рабочий вопрос → урок» по четырём
  // модулям за раз, детерминированно: тот же курс — те же задания.
  const picks = modules.filter(m => m.id !== 'EXP00').map(m => m.lessons.find(l => l.queries.length))
    .filter((l): l is AccLesson => !!l)
  const groups: AccLesson[][] = []
  for (let i = 0; i + 4 <= picks.length && groups.length < 5; i += 4) groups.push(picks.slice(i, i + 4))
  return {
    key: 'm00-02',
    title: 'Справочник: найти урок по рабочему вопросу',
    topics: [],
    origin: [],
    minutes: 5,
    practice: 'Держите урок открытым во время работы; поиск по странице — Ctrl+F (на Mac — Cmd+F)',
    software: '',
    sources: [],
    queries: ['справочник', 'где найти ответ'],
    content: {
      paragraphs: [
        p('i', '**Как пользоваться.** Найдите свой вопрос в списке ниже (поиск по странице — Ctrl+F, на Mac — Cmd+F) и откройте урок с указанным номером. Уроки можно проходить в любом порядке.'),
        p('t', '**Если вопроса нет в списке.** Сформулируйте его одним предложением, как для Алисы: что есть («выгрузка из 1С, столбец ФИО с лишними пробелами»), что нужно получить и в какой программе. С такой формулировкой ищите по ключевому слову или задайте вопрос ИИ — готовые промпты есть в модуле про искусственный интеллект.'),
        ...rows,
        p('src', 'Источники: справочник собран из уроков курса; нормативные источники и даты проверки — в каждом уроке.'),
      ],
      quiz: groups.map((g, i) => qmatch(`acc-m00-02-q${i + 1}`, 'Сопоставьте рабочий вопрос и урок, где ответ.',
        g.map(l => [l.queries[0], l.title] as [string, string]),
        'Каждый урок отвечает на свой рабочий вопрос; полный список — в этом справочнике.')),
      hardTask: hard('Моя шпаргалка', 'Выберите пять вопросов из справочника, которые возникают у вас чаще всего, пройдите соответствующие уроки и выпишите для каждого одну формулу или одно действие, которое решает задачу.',
        'Проверяем, что для каждого вопроса есть конкретная формула/путь и указан урок-источник.', 'Вопрос → урок → формула/действие: …'),
    },
  }
}

/**
 * В конце каждого конспекта — куда написать вопрос или комментарий со
 * скриншотом. Отдельного поля в уроке нет: используется существующая
 * «Обратная связь» (feedback_requests: текст, свой раздел, скриншоты; видит
 * админ). В домашку базового уровня фото не прикладываются, а практическое
 * задание открывается только после теста — поэтому путь один для всех уроков.
 * Номер урока в разделе связывает сообщение с уроком.
 */
function withComment(lesson: AccLesson, index: number): AccLesson {
  return {
    ...lesson,
    content: {
      ...lesson.content,
      // Источники норм ученику не показываются (на них держится сверка), а
      // вопрос рисуется карточкой с кнопкой — LessonAskCard. Текст абзаца —
      // запасной вид для мест, которые kind не знают.
      paragraphs: [
        ...lesson.content.paragraphs.map(par => (par.id === 'src' ? { ...par, kind: 'sources' as const } : par)),
        { ...p('comment',
          `**Вопрос или комментарий к уроку.** Если что-то непонятно или у вас на работе устроено иначе — меню профиля → «Обратная связь», раздел «Бухгалтерия, урок №${index + 1}». Напишите, как у вас, и вставьте скриншот (Ctrl+V, на Mac — Cmd+V) без ФИО, ИНН и счетов. Практическое задание урока тоже принимает фото.`),
          kind: 'ask' as const, section: `Бухгалтерия, урок №${index + 1}` },
      ],
    },
  }
}

/** Уроки курса по порядку, с модулем — для каталога, отчёта и стенда. */
export const ACC_LESSONS: Array<{ shortId: string; index: number; module: AccModule; lesson: AccLesson }> = (() => {
  const order: Array<{ module: AccModule; lesson: AccLesson }> = []
  for (const m of MODULES) {
    for (const l of m.lessons) order.push({ module: m, lesson: l })
    // Справочник — сразу после вводного урока.
    if (m.id === 'EXP00') order.push({ module: m, lesson: undefined as unknown as AccLesson })
  }
  const keys = order.map(o => o.lesson?.key ?? 'm00-02')
  const numberOf = (key: string) => keys.indexOf(key)
  // Авторы ссылаются на соседние уроки внутренними ключами («см. m13-07»).
  // Ученик видит номера занятий, поэтому ключ заменяется на «№N «название»».
  // Ключи внутри id вопросов (acc-m13-07-q1) не трогаем — перед ними дефис.
  const titles = new Map(order.map(o => [o.lesson?.key ?? 'm00-02', o.lesson?.title ?? 'Справочник']))
  // Полное «№N «название»» — при первом упоминании в абзаце, дальше — только «№N»:
  // иначе длинное название повторяется по пять раз подряд. Ключи EXT-модулей
  // (x02-10) раскрываются так же, как m13-07.
  const relinkText = (t: string) => {
    const seen = new Set<string>()
    return t.replace(/(?<![\w-])[mx]\d\d-\d\d(?![\w-])/g, (k: string) => {
      const n = numberOf(k)
      if (n < 0) return k
      if (seen.has(k)) return `№${n + 1}`
      seen.add(k)
      return `№${n + 1} «${titles.get(k)}»`
    })
  }
  const relink = (l: AccLesson): AccLesson => ({
    ...l,
    content: {
      paragraphs: l.content.paragraphs.map(par => ({ ...par, text: relinkText(par.text) })),
      quiz: l.content.quiz.map(q => ({
        ...q,
        prompt: relinkText(q.prompt),
        explanation: relinkText(q.explanation),
        options: q.options.map(o => ({ ...o, text: relinkText(o.text) })),
      })),
      hardTask: { ...l.content.hardTask, prompt: relinkText(l.content.hardTask.prompt), teacherNote: relinkText(l.content.hardTask.teacherNote), placeholder: relinkText(l.content.hardTask.placeholder) },
    },
  })
  const intro = MODULES.find(m => m.id === 'EXP00')
  return order.map((o, index) => ({
    shortId: `${ACC_COURSE_ID}-${index}`,
    index,
    module: o.module,
    lesson: withComment(relink(o.lesson ?? handbook(MODULES, numberOf)), index),
  })).map(x => (x.lesson.key === 'm00-02' && intro ? { ...x, module: intro } : x))
})()

/** Конспект + домашка по short_id — то, что читает apLessonChunk. */
export const ACC_LESSON_CONTENT: Record<string, AuthoredLessonContent> =
  Object.fromEntries(ACC_LESSONS.map(x => [x.shortId, {
    ...x.lesson.content,
    // «Скачайте … из материалов урока» — файл обязан быть в «Материалах».
    files: accLessonFiles([x.lesson.practice, ...x.lesson.content.paragraphs.map(par => par.text), x.lesson.content.hardTask.prompt]),
  }]))
