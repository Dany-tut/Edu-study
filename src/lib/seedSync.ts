// ─────────────────────────────────────────────────────────────────────────────
// Сверка сохранённого курса с сидом, из которого он собран
//
// ЗАЧЕМ. Сид отдаёт содержимое ровно один раз — при добавлении курса с карточки
// в Конструкторе. Дальше это обычный курс учителя, и правки сида до него не
// доходят: добавили в юнит новый тип задания, переписали конспект, разнесли
// слово и его чтение по разным полям — сохранённый курс об этом не узнает.
// Пересоздавать его с карточки нельзя: там уже проставлены даты занятий,
// назначены группы и накоплен прогресс учеников.
//
// ЧТО ЗДЕСЬ. Чистое сравнение «курс против свежесобранного сида» и применение
// выбранных изменений к объекту курса. Ни сети, ни записи в БД: результат
// уходит в состояние редактора, а дальше сохраняется обычной кнопкой со всеми
// её проверками. Отдельного пути записи — а значит и отдельного набора багов —
// не появляется.
//
// ГЛАВНОЕ ПРАВИЛО: ПРАВКИ УЧИТЕЛЯ ГЛАВНЕЕ. Поэтому изменения делятся на три
// сорта. Добавления (юнит, которого нет; задание, которого нет) ничего не
// затирают — их предлагаем отмеченными. Перезаписи (конспект разошёлся, поля
// задания разошлись) могут стереть ручную работу — их показываем, но галку
// ставит человек. Удаления (сид выбросил задание, которое сам же и клал) —
// туда же, но отдельной группой: риск у них другой, за ними стоят ответы
// учеников. То же соображение, что и в data/seedTheory.ts, где пустой
// конспект добирается сам, а непустой не трогается никогда.
// ─────────────────────────────────────────────────────────────────────────────

import { COURSE_SEEDS } from '../data/courseSeeds'
import type { CourseEdData, CELesson } from '../pages/teacher/TeacherCourseEditorPage'

/** Название урока без ведущего номера — номера съезжают при вставке юнита. */
const norm = (title: string) => title.replace(/^\d+\.\s*/, '').trim()

/** Задание курса/сида — у редактора это HWTask, здесь нужен только общий минимум. */
type Task = { id?: string; label?: string; type?: string; question?: string } & Record<string, unknown>

/**
 * Поля задания, которые считаются «принадлежащими сиду».
 *
 * Сверяем не всё подряд: у задания в редакторе есть служебные поля (порядок,
 * привязки, флаги показа), расхождение по которым не значит ничего. Здесь —
 * только содержательное, ради чего сверку и затевали.
 */
const OWNED_FIELDS = [
  'question', 'choices', 'correctChoices', 'answer', 'altAnswers',
  'sentence', 'distractors', 'ttsText', 'pairA', 'pairB', 'correctPair',
  'front', 'back', 'reading',
  'pattern', 'patternGloss', 'patternItems',
  'passage', 'passageTitle', 'passageTranslation',
  'image', 'images', 'table', 'sequenceItems', 'pairs',
] as const

export type SeedChangeKind = 'lesson' | 'task' | 'task-gone' | 'task-fields' | 'theory' | 'video'

export interface SeedChange {
  /** Стабильный ключ — по нему UI помнит, что отмечено. */
  key: string
  kind: SeedChangeKind
  /** Урок курса, которого касается изменение (для нового урока — из сида). */
  lessonTitle: string
  /** Что именно произойдёт, человеческим языком. */
  summary: string
  /** Затирает ли ручную работу. Такие по умолчанию НЕ отмечены. */
  overwrites: boolean
  /** Что конкретно меняется — показывается списком под строкой. */
  details?: string[]
}

export interface SeedDiff {
  /** Ключ сида (`kotp`, `jajl`, …) — пусто, если курс не из сида. */
  seedKey: string | null
  changes: SeedChange[]
}

/** Ключ сида, из которого собран курс. */
export function seedKeyOf(course: Pick<CourseEdData, 'id' | 'dbCourseId'>): string | null {
  return [course.id, course.dbCourseId]
    .map(id => id?.match(/^seed-([a-z0-9]+)(?:-|$)/)?.[1])
    .find(Boolean) ?? null
}

function tasksOf(l: CELesson): Task[] {
  return (l.hwTasks ?? []) as Task[]
}

/**
 * Ключ задания внутри урока — id без префикса юнита.
 *
 * СРАВНИВАТЬ ПО СЫРОМУ id НЕЛЬЗЯ. Он собирается как `<ключ сида>-<номер
 * юнита>-<место в юните>`, и номер юнита в сиде НЕ вечен: когда в середину
 * программы добавляют юнит, всё, что ниже, сдвигается. В сохранённом корейском
 * курсе «Китайские числительные» несут `kotp-14-*`, а в нынешнем сиде тот же
 * юнит уже `kotp-17-*`. По сырому id совпадений не нашлось бы вовсе, и сверка
 * предложила бы «добавить» все задания заново — то есть удвоить их.
 *
 * Уроки к этому моменту уже сопоставлены по названию, поэтому хватает хвоста:
 * `t3`, `v10`, `p`, `pic1` — он и означает место задания внутри юнита.
 * Задание, добавленное учителем вручную, под шаблон не подходит и остаётся со
 * своим id: с сидом оно не сопоставится, и трогать его никто не станет.
 */
function taskKey(id: string | undefined): string {
  if (!id) return ''
  return id.match(/^[a-z0-9]+-\d+-(.+)$/)?.[1] ?? id
}

/**
 * Пришло ли задание из этого сида.
 *
 * ЗАЧЕМ. Удалять можно только то, что сид когда-то и положил. Задание, которое
 * учитель добавил руками, в сиде отсутствует по определению — если считать его
 * «пропавшим», сверка предложит стереть как раз ту работу, ради сохранности
 * которой всё это окно и написано. Различить их просто: сборщик выдаёт id вида
 * `<ключ сида>-<номер юнита>-<место>`, а редактор — шесть случайных символов
 * без дефисов (см. uid в TeacherCourseEditorPage).
 */
const isSeedTask = (id: string | undefined, seedKey: string): boolean =>
  !!id && new RegExp(`^${seedKey}-\\d+-`).test(id)

/** Отличаются ли значения поля. Сравниваем по JSON: значения простые либо массивы. */
function differs(a: unknown, b: unknown): boolean {
  if (a === b) return false
  // Пусто с обеих сторон — не расхождение: '' и undefined приходят вперемешку.
  const empty = (v: unknown) => v === undefined || v === null || v === '' ||
    (Array.isArray(v) && v.length === 0)
  if (empty(a) && empty(b)) return false
  return JSON.stringify(a) !== JSON.stringify(b)
}

/**
 * Сравнить курс со свежесобранным сидом.
 *
 * Уроки сопоставляются по названию, а не по id: id урока выдаётся при создании
 * и с юнитом сида не связан, а номер в названии съезжает, когда в сид добавляют
 * юнит в середину. Задания внутри урока — по хвосту id (см. taskKey): номер
 * юнита в id тоже съезжает, и сырой id сравнивать нельзя.
 */
export async function diffAgainstSeed(course: CourseEdData): Promise<SeedDiff> {
  const seedKey = seedKeyOf(course)
  const seed = seedKey ? COURSE_SEEDS.find(s => s.key === seedKey) : undefined
  if (!seed) return { seedKey: null, changes: [] }

  const fresh = await seed.build(course.id)
  const byTitle = new Map(course.lessons.map(l => [norm(l.title ?? ''), l]))
  const changes: SeedChange[] = []

  fresh.lessons.forEach(unit => {
    const title = norm(unit.title)
    const mine = byTitle.get(title)

    if (!mine) {
      changes.push({
        key: `lesson:${title}`,
        kind: 'lesson',
        lessonTitle: unit.title,
        summary: `Новый урок · ${(unit.hwTasks ?? []).length} заданий`,
        overwrites: false,
      })
      return
    }

    // ── задания, которых в уроке нет ──
    const mineByKey = new Map(tasksOf(mine).filter(t => t.id).map(t => [taskKey(t.id), t]))
    const freshKeys = new Set((unit.hwTasks ?? []).map(t => taskKey(t.id)))
    const added = (unit.hwTasks ?? []).filter(t => t.id && !mineByKey.has(taskKey(t.id)))
    if (added.length) {
      changes.push({
        key: `tasks:${title}`,
        kind: 'task',
        lessonTitle: mine.title,
        summary: `Новых заданий: ${added.length}`,
        overwrites: false,
        details: added.map(t => `${t.label ?? t.type} — ${String(t.question ?? '').slice(0, 70)}`),
      })
    }

    // ── задания, которые сид положил, а потом убрал ──
    //
    // ЗАЧЕМ. Сид умеет не только расти. Корейский разговорник давал в урок всю
    // тему целиком — сорок карточек, из которых десять переводились словом
    // «спасибо»; теперь в уроке остаётся ядро, по одной фразе на смысл. Без
    // этой ветки правка доезжала бы только до заново созданных курсов, а живой
    // курс навсегда оставался бы с прежними сорока.
    //
    // Отмечать по умолчанию нельзя: у выброшенных заданий могут быть ответы
    // учеников. Сами ответы лежат в lesson_progress по id задания и удалением
    // не затрагиваются — они просто перестают показываться, поэтому решение
    // обратимо через отмену сверки, но не через «вернуть как было» после
    // сохранения.
    const gone = tasksOf(mine).filter(t => isSeedTask(t.id, seed.key) && !freshKeys.has(taskKey(t.id)))
    if (gone.length) {
      changes.push({
        key: `gone:${title}`,
        kind: 'task-gone',
        lessonTitle: mine.title,
        summary: `Заданий убрано из сида: ${gone.length}`,
        overwrites: true,
        details: gone.map(t => `${t.label ?? t.type} — ${String(t.question ?? '').slice(0, 70)}`),
      })
    }

    // ── задания, у которых разошлись содержательные поля ──
    const drifted: string[] = []
    ;(unit.hwTasks ?? []).forEach(t => {
      const my = t.id ? mineByKey.get(taskKey(t.id)) : undefined
      if (!my) return
      const fields = OWNED_FIELDS.filter(f => differs(my[f], (t as Task)[f]))
      if (fields.length) drifted.push(`${t.label ?? t.type}: ${fields.join(', ')}`)
    })
    if (drifted.length) {
      changes.push({
        key: `fields:${title}`,
        kind: 'task-fields',
        lessonTitle: mine.title,
        summary: `Заданий с расхождением: ${drifted.length}`,
        overwrites: true,
        details: drifted,
      })
    }

    // ── видео ──
    //
    // Отдельным видом расхождения, а не полем внутри урока: у сохранённых
    // курсов ссылки на видео не было вовсе (их добрали позже), и без этой
    // ветки триста роликов остались бы только в коде. Пустую ссылку добираем
    // как обычное добавление, чужую — только по галке: учитель мог поставить
    // свою запись занятия, и затирать её молча нельзя.
    if (differs((mine.videoUrl ?? '').trim(), (unit.videoUrl ?? '').trim()) && unit.videoUrl) {
      changes.push({
        key: `video:${title}`,
        kind: 'video',
        lessonTitle: mine.title,
        summary: mine.videoUrl?.trim() ? 'Ссылка на видео отличается от сида' : 'Видео нет — есть в сиде',
        overwrites: !!mine.videoUrl?.trim(),
        details: [unit.videoUrl],
      })
    }

    // ── конспект ──
    if (differs((mine.theory ?? '').trim(), (unit.theory ?? '').trim())) {
      changes.push({
        key: `theory:${title}`,
        kind: 'theory',
        lessonTitle: mine.title,
        summary: mine.theory?.trim() ? 'Конспект отличается от сида' : 'Конспект пуст — есть в сиде',
        overwrites: !!mine.theory?.trim(),
      })
    }
  })

  return { seedKey, changes }
}

/**
 * Применить выбранные изменения к курсу.
 *
 * Новый урок встаёт на своё место по порядку сида, а не в конец: юнит про
 * неправильные глаголы должен идти сразу за отрицанием, иначе смысл его места
 * в программе теряется. Модуль подбирается по соседу — тому уроку, за которым
 * новый идёт в сиде; так урок попадает в ту же группу, где лежат его соседи.
 */
export async function applySeedChanges(course: CourseEdData, keys: Set<string>): Promise<CourseEdData> {
  const seedKey = seedKeyOf(course)
  const seed = seedKey ? COURSE_SEEDS.find(s => s.key === seedKey) : undefined
  if (!seed || keys.size === 0) return course

  const fresh = await seed.build(course.id)
  const freshByTitle = new Map(fresh.lessons.map(l => [norm(l.title), l]))

  let lessons = course.lessons.map(lesson => {
    const title = norm(lesson.title ?? '')
    const unit = freshByTitle.get(title)
    if (!unit) return lesson
    let next = lesson

    if (keys.has(`tasks:${title}`)) {
      const mineKeys = new Set(tasksOf(next).map(t => taskKey(t.id)))
      const add = (unit.hwTasks ?? []).filter(t => t.id && !mineKeys.has(taskKey(t.id)))
      // Порядок берём из сида: дрилл обязан оказаться перед отработкой, а не
      // приклеиться в хвост за словарными карточками.
      const order = new Map((unit.hwTasks ?? []).map((t, i) => [taskKey(t.id), i]))
      // Задание, которого в сиде нет (учитель добавил своё), порядка не имеет и
      // уходит в конец — трогать его место мы не вправе.
      const at = (t: Task) => order.get(taskKey(t.id)) ?? Number.MAX_SAFE_INTEGER
      const merged = [...tasksOf(next), ...(add as Task[])].sort((a, b) => at(a) - at(b))
      next = { ...next, hwTasks: merged as CELesson['hwTasks'] }
    }

    // Убранное сидом выбрасывается до сверки полей: чинить формулировку
    // задания, которое в этой же сверке удаляется, незачем.
    if (keys.has(`gone:${title}`)) {
      const freshKeys = new Set((unit.hwTasks ?? []).map(t => taskKey(t.id)))
      next = {
        ...next,
        hwTasks: tasksOf(next).filter(
          t => !isSeedTask(t.id, seed.key) || freshKeys.has(taskKey(t.id)),
        ) as CELesson['hwTasks'],
      }
    }

    if (keys.has(`fields:${title}`)) {
      const fromSeed = new Map((unit.hwTasks ?? []).map(t => [taskKey(t.id), t as Task]))
      next = {
        ...next,
        hwTasks: tasksOf(next).map(t => {
          const src = t.id ? fromSeed.get(taskKey(t.id)) : undefined
          if (!src) return t
          const patch: Record<string, unknown> = {}
          OWNED_FIELDS.forEach(f => { if (differs(t[f], src[f])) patch[f] = src[f] })
          return { ...t, ...patch }
        }) as CELesson['hwTasks'],
      }
    }

    if (keys.has(`theory:${title}`)) {
      next = { ...next, theory: unit.theory, theoryImages: unit.theoryImages ?? [] }
    }

    if (keys.has(`video:${title}`)) {
      next = { ...next, videoUrl: unit.videoUrl }
    }

    return next
  })

  // ── новые уроки ──
  const modules = course.modules.map(m => ({ ...m, lessonIds: [...m.lessonIds] }))
  fresh.lessons.forEach((unit, unitIdx) => {
    const title = norm(unit.title)
    if (!keys.has(`lesson:${title}`)) return
    if (lessons.some(l => norm(l.title ?? '') === title)) return

    // Сосед — ближайший предыдущий юнит сида, который в курсе уже есть.
    let anchor: CELesson | undefined
    for (let i = unitIdx - 1; i >= 0 && !anchor; i--) {
      const t = norm(fresh.lessons[i].title)
      anchor = lessons.find(l => norm(l.title ?? '') === t)
    }
    const at = anchor ? lessons.indexOf(anchor) + 1 : lessons.length
    lessons = [...lessons.slice(0, at), unit, ...lessons.slice(at)]

    const mod = modules.find(m => anchor && m.lessonIds.includes(anchor.id)) ?? modules[modules.length - 1]
    if (mod) {
      const pos = anchor ? mod.lessonIds.indexOf(anchor.id) + 1 : mod.lessonIds.length
      mod.lessonIds = [...mod.lessonIds.slice(0, pos), unit.id, ...mod.lessonIds.slice(pos)]
    }
  })

  // Номер урока и номер в его названии — сквозные по курсу, иначе после вставки
  // в середину курс читается как «11, 14, 12, 13».
  lessons = lessons.map((l, i) => ({
    ...l,
    number: i + 1,
    title: `${i + 1}. ${norm(l.title ?? '')}`,
  }))

  return { ...course, lessons, modules }
}
