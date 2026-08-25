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
import { lessonBody, plainTitle, withNumber } from './lessonKey'
import { normalizeTaskType } from '../data/taskTypes'
import type { CourseEdData, CELesson, CEModule } from '../pages/teacher/TeacherCourseEditorPage'

/**
 * Название урока без номера: номера съезжают при вставке юнита, а у занятий
 * порции их было два подряд («7. 2 Тема»). Обе формы приводит к одной
 * lessonBody — она же и показывается (см. lib/lessonKey).
 */
const norm = (title: string) => lessonBody(title ?? '')

/** Id нового модуля — тот же вид, что у редактора (см. uid там же). */
function uid() { return Math.random().toString(36).slice(2, 8) }

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
  // Поля, БЕЗ КОТОРЫХ ЗАДАНИЕ НЕ РИСУЕТСЯ. Решатель включается по ним, а не по
  // типу (см. authoredTaskToQuestion): обводка — по `chamo`, сборка слога — по
  // `syllable`, диалог — по `dialog`, кроссворд — по `clues`, видео — по
  // `videoUrl`. Пока их тут не было, сверка переписывала формулировку задания и
  // оставляла тело от старой версии: «Обведите букву ㅓ» приезжало без буквы.
  'chamo', 'syllable', 'dialog', 'gaps', 'clues', 'answerSkeleton', 'related',
  'videoUrl', 'videoStart', 'videoWatchSeconds', 'videoCredit',
  'audioUrl', 'ttsVoice', 'allowSlow', 'afterNote',
] as const

export type SeedChangeKind = 'lesson' | 'lesson-gone' | 'task' | 'task-gone' | 'task-fields' | 'theory' | 'video'

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
const isSeedTask = (id: string | undefined, seedKey: string, lessonPrefixes: string[] = []): boolean =>
  !!id && (
    new RegExp(`^${seedKey}-`).test(id) ||
    lessonPrefixes.some(p => id.startsWith(p))
  )

/**
 * Начала id уроков сида — второй признак «это положил сид».
 *
 * ЗАЧЕМ. Раньше сидовым считался id строго вида `<ключ>-<цифры>-<место>`. Для
 * большинства курсов это верно, но не для всех: у хангыля уроки называются
 * `ko-hangul-1`, хотя ключ сида — `kohg`, а у IELTS — `ielt-1p`, с буквой после
 * номера. Оба под шаблон не подходили, и сверка считала ВСЕ их задания
 * ручными: у хангыля — все 736 из 736, у IELTS — 74.
 *
 * Последствие не косметическое. Урок опознаётся как сидовый по своим заданиям,
 * поэтому «урока больше нет в сиде» у этих курсов не срабатывало никогда: в
 * «Кор хангыль» лежат пятнадцать лишних порций от старого дробления, снять их
 * было нечем — кнопка «Из сида» не появлялась вообще, сверка не находила ни
 * одного расхождения.
 *
 * Признаков теперь два, и хватает любого: id начинается с ключа сида — это
 * ловит задания юнитов, убранных из сида целиком (их id урока среди свежих уже
 * нет), — либо с id какого-то урока сида, что ловит курсы с чужим префиксом.
 * Ручное задание не подходит ни под один: редактор выдаёт шесть случайных
 * символов без дефисов (см. uid в TeacherCourseEditorPage).
 */
const seedLessonPrefixes = (fresh: CourseEdData): string[] =>
  fresh.lessons.map(l => `${l.id}-`)

/**
 * Пришёл ли урок из этого сида.
 *
 * ЗАЧЕМ. То же соображение, что и у заданий: предлагать удаление можно только
 * для того, что сид сам и положил. Опознаём по заданиям — у сидовых они несут
 * id вида `<ключ сида>-<номер юнита>-<место>`. Урок, который учитель завёл
 * руками, таких заданий не содержит и под удаление не попадёт. Пустой урок
 * тоже не трогаем: доказательств, что он из сида, нет.
 */
const isSeedLesson = (lesson: CELesson, seedKey: string, lessonPrefixes: string[] = []): boolean =>
  tasksOf(lesson).some(t => isSeedTask(t.id, seedKey, lessonPrefixes))

/**
 * Значение с ключами объектов в одном и том же порядке.
 *
 * ЗАЧЕМ. Задания уезжают в БД в колонку `lessons.homework` типа jsonb, а jsonb
 * порядок ключей НЕ хранит: он раскладывает их по длине, а при равной длине
 * побайтово. Подстановка дрилла `{cue, answer, gloss}` возвращается из базы как
 * `{cue, gloss, answer}`, таблица `{headers, rows, emptyCells}` — как
 * `{rows, headers, emptyCells}`. Значения при этом те же самые.
 *
 * Сравнение по голому JSON.stringify такую перестановку считало расхождением, и
 * получался вечный двигатель: сверка находила 24 «разошедшихся» задания,
 * применение записывало в них ровно те же значения, сохранение снова
 * переставляло ключи, а после перезагрузки кнопка показывала те же 24. Пройти
 * этот цикл до конца было нельзя ни разу.
 *
 * Порядок элементов МАССИВА при этом сохраняется как есть — там он значит
 * ровно то, что значит: варианты ответа не переставляются.
 */
function canon(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canon)
  if (value && typeof value === 'object') {
    const src = value as Record<string, unknown>
    return Object.fromEntries(Object.keys(src).sort().map(k => [k, canon(src[k])]))
  }
  return value
}

/**
 * Разошёлся ли ТИП задания — и почему это отдельный вид расхождения.
 *
 * ЗАЧЕМ. Тип не поле среди полей: он решает, каким решателем задание вообще
 * рисуется. Пока сверка его не знала, она переписывала формулировку и оставляла
 * тело от прежней версии — получался кентавр. Живой курс «Корейский с нуля»
 * дошёл до ученика ровно таким: «Соберите слово „огурец“ из слогов» с типом
 * `single` и без единого варианта (пустой экран), «Наберите по буквам» с рядом
 * плиток, «написано с перепутанными слогами» с экранной клавиатурой и
 * «Обведите букву ㅓ» вообще без буквы. Ни одно из этих заданий решить нельзя,
 * и виновата не опечатка автора, а сверка, применившая половину правки.
 *
 * ПОЧЕМУ ЦЕЛИКОМ, А НЕ ПОЛЕ ЗА ПОЛЕМ. У каждого типа своё тело: у обводки
 * `chamo`, у сборки слога `syllable`, у выбора `choices`. Сменившийся тип — это
 * другое задание на том же месте, и переносить в него куски прежнего нечего.
 *
 * Легаси-написания (`choice`/`match`/`table`) приводим к каноническим: иначе
 * старый курс показывал бы расхождение на каждом задании выбора.
 */
function typeDiffers(mine: Task, seedTask: Task): boolean {
  const a = (mine.type ?? '').trim()
  const b = (seedTask.type ?? '').trim()
  if (!a || !b) return false
  return normalizeTaskType(a) !== normalizeTaskType(b)
}

/** Отличаются ли значения поля. Сравниваем по JSON: значения простые либо массивы. */
function differs(a: unknown, b: unknown): boolean {
  if (a === b) return false
  // Пусто с обеих сторон — не расхождение: '' и undefined приходят вперемешку.
  const empty = (v: unknown) => v === undefined || v === null || v === '' ||
    (Array.isArray(v) && v.length === 0)
  if (empty(a) && empty(b)) return false
  return JSON.stringify(canon(a)) !== JSON.stringify(canon(b))
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
  const prefixes = seedLessonPrefixes(fresh)
  const byTitle = new Map(course.lessons.map(l => [norm(l.title ?? ''), l]))
  const changes: SeedChange[] = []

  // ── уроки, которые сид положил, а потом убрал ──
  //
  // ЗАЧЕМ. Сид умеет не только расти. Три юнита алфавита в «Корейский с нуля»
  // заменены одной проверкой — сам алфавит уехал в отдельный курс. Без этой
  // ветки правка доезжала бы только до заново созданных курсов, а живой курс
  // навсегда оставался бы с тремя лишними уроками: сверка умела добавлять и
  // перезаписывать, но не удалять, и перестройку программы приходилось
  // повторять руками в редакторе.
  //
  // Отмечать по умолчанию нельзя, как и у заданий: в уроке могут лежать ответы
  // учеников и правки учителя. Урок, которого сид не клал вовсе (учитель завёл
  // его сам), сюда не попадает — иначе сверка предлагала бы стереть как раз ту
  // работу, ради сохранности которой она и написана.
  const freshTitles = new Set(fresh.lessons.map(l => norm(l.title)))
  course.lessons.forEach(mine => {
    const title = norm(mine.title ?? '')
    if (freshTitles.has(title)) return
    if (!isSeedLesson(mine, seed.key, prefixes)) return
    changes.push({
      key: `lesson-gone:${title}`,
      kind: 'lesson-gone',
      lessonTitle: mine.title ?? title,
      summary: `Урока больше нет в сиде · ${tasksOf(mine).length} заданий`,
      overwrites: true,
    })
  })

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
    const gone = tasksOf(mine).filter(t => isSeedTask(t.id, seed.key, prefixes) && !freshKeys.has(taskKey(t.id)))
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
      const fields: string[] = OWNED_FIELDS.filter(f => differs(my[f], (t as Task)[f]))
      if (typeDiffers(my, t as Task)) fields.unshift(`тип: ${my.type} → ${(t as Task).type}`)
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
  const prefixes = seedLessonPrefixes(fresh)
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
          t => !isSeedTask(t.id, seed.key, prefixes) || freshKeys.has(taskKey(t.id)),
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
          // Сменился ТИП — задание берётся из сида целиком (см. typeDiffers).
          // Своим остаётся только id: по нему лежат ответы учеников.
          if (typeDiffers(t, src)) return { ...src, id: t.id }
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

  // ── уроки, убранные из сида ──
  //
  // Снимаем ДО вставки новых: иначе новый урок мог бы встать рядом с тем, на
  // место которого он и пришёл, и в курсе оказались бы оба.
  const dropped = new Set(
    course.lessons
      .filter(l => keys.has(`lesson-gone:${norm(l.title ?? '')}`))
      .map(l => l.id),
  )
  if (dropped.size) lessons = lessons.filter(l => !dropped.has(l.id))

  // ── новые уроки ──
  const modules: CEModule[] = course.modules
    .map(m => ({ ...m, lessonIds: m.lessonIds.filter(id => !dropped.has(id)) }))

  // Модуль, в котором урок стоит У САМОГО СИДА.
  //
  // ЗАЧЕМ. Раньше новый урок клали в модуль соседа, а соседа не нашлось — в
  // ПОСЛЕДНИЙ модуль курса. На обычном добавлении юнита это незаметно. Но стоит
  // смениться формату названий — а он менялся при вводе порций, когда «1. Юнит»
  // стало «1.1 Юнит», — как несовпавшими оказываются сразу ВСЕ уроки: первый
  // падает в хвост, второй цепляется за первый, третий за второй, и весь курс
  // съезжает в последний модуль, а остальные пустеют. Так и случилось с тремя
  // корейскими курсами: 132, 102 и 197 уроков одной кучей в конце.
  //
  // Сосед остаётся, но только для МЕСТА ВНУТРИ модуля. Сам модуль берётся из
  // сида — он там задан явно и от названий не зависит.
  const freshModuleOf = new Map<string, number>()
  fresh.modules.forEach((m, i) => m.lessonIds.forEach(id => freshModuleOf.set(id, i)))
  const freshById = new Map(fresh.lessons.map(l => [l.id, l]))

  /**
   * Модуль курса под модуль сида №i, или -1, если такого в курсе нет.
   *
   * Сопоставляем ПО СОДЕРЖИМОМУ, а не по подписи: учитель переименовывает
   * модули (в живом курсе «Чтение и первые фразы» значится как «Хангыль и
   * первые фразы»), и матчинг по названию завёл бы этому курсу второй модуль с
   * тем же смыслом. Голосуют уроки: где лежит больше уроков этого модуля сида,
   * тот модуль и наш. Подпись — запасной признак, для модуля, из которого в
   * курсе пока нет ни одного урока.
   */
  const courseModuleOf = new Map<string, number>()
  modules.forEach((m, mi) => m.lessonIds.forEach(id => {
    const l = lessons.find(x => x.id === id)
    if (l) courseModuleOf.set(norm(l.title ?? ''), mi)
  }))
  const modIndexOfFresh = new Map<number, number>()
  const claimed = new Set<number>()

  // ВСЕ модули курса опустели — из сида пришла новая программа целиком. Так и
  // выглядит смена формата названий: ни один урок не совпал, все старые ушли в
  // «урока больше нет в сиде», все новые пришли из сида. В пустом модуле работы
  // учителя нет по определению, поэтому берём разбивку сида как есть — иначе к
  // его пяти модулям добавились бы пять старых пустых, и курс открывался бы с
  // пятью строчками «Нет уроков». Id переиспользуем по местам: сохранение
  // сопоставляет модули с базой по позиции, лишних вставок и удалений не будет.
  const allEmpty = modules.length > 0 && modules.every(m => m.lessonIds.length === 0)
  if (allEmpty) {
    const reused = modules.map(m => ({ id: m.id, expanded: m.expanded }))
    modules.length = 0
    fresh.modules.forEach((fm, i) => {
      modules.push({ id: reused[i]?.id ?? uid(), label: fm.label, expanded: reused[i]?.expanded ?? false, lessonIds: [] })
      modIndexOfFresh.set(i, i)
      claimed.add(i)
    })
  } else fresh.modules.forEach((fm, i) => {
    const votes = new Map<number, number>()
    fm.lessonIds.forEach(id => {
      const fl = freshById.get(id)
      const mi = fl ? courseModuleOf.get(norm(fl.title)) : undefined
      if (mi !== undefined && !claimed.has(mi)) votes.set(mi, (votes.get(mi) ?? 0) + 1)
    })
    let best = -1
    let bestN = 0
    votes.forEach((n, mi) => { if (n > bestN) { best = mi; bestN = n } })
    if (best < 0) best = modules.findIndex((m, mi) => !claimed.has(mi) && m.label.trim() === fm.label.trim())
    if (best >= 0) { claimed.add(best); modIndexOfFresh.set(i, best) }
  })

  /** Модуль курса под модуль сида №i; нет такого — заводим на своём месте. */
  function moduleFor(i: number): CEModule {
    const at = modIndexOfFresh.get(i)
    if (at !== undefined) return modules[at]
    // Модуля в курсе нет — сид завёл новый раздел (так в «Корейский к TOPIK II»
    // появилась «Матчасть: глаголы и звучание»). Ставим его между соседями по
    // порядку сида, а не в конец: раздел про неправильные глаголы обязан стоять
    // там, где он задуман, иначе программа читается задом наперёд.
    const created: CEModule = { id: uid(), label: fresh.modules[i].label, expanded: false, lessonIds: [] }
    let pos = -1
    for (let j = i - 1; j >= 0 && pos < 0; j--) {
      const k = modIndexOfFresh.get(j)
      if (k !== undefined) pos = k + 1
    }
    for (let j = i + 1; j < fresh.modules.length && pos < 0; j++) {
      const k = modIndexOfFresh.get(j)
      if (k !== undefined) pos = k
    }
    if (pos < 0) pos = modules.length
    modules.splice(pos, 0, created)
    modIndexOfFresh.forEach((v, k) => { if (v >= pos) modIndexOfFresh.set(k, v + 1) })
    modIndexOfFresh.set(i, pos)
    return created
  }

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

    const fi = freshModuleOf.get(unit.id)
    if (fi === undefined) return
    const mod = moduleFor(fi)
    // Место внутри модуля — по порядку сида: встаём сразу за ближайшим
    // предыдущим уроком ЭТОГО ЖЕ модуля, который в курсе уже есть. Никого перед
    // нами нет — значит, мы в модуле первые.
    const sibs = fresh.modules[fi].lessonIds
    let pos = 0
    for (let j = sibs.indexOf(unit.id) - 1; j >= 0 && pos === 0; j--) {
      const sib = freshById.get(sibs[j])
      const mine = sib ? lessons.find(l => norm(l.title ?? '') === norm(sib.title)) : undefined
      const k = mine ? mod.lessonIds.indexOf(mine.id) : -1
      if (k >= 0) pos = k + 1
    }
    mod.lessonIds = [...mod.lessonIds.slice(0, pos), unit.id, ...mod.lessonIds.slice(pos)]
  })

  // Номер урока и номер в его названии — сквозные по курсу, иначе после вставки
  // в середину курс читается как «11, 14, 12, 13».
  //
  // Порцию, записанную старым способом («7. 2 Тема»), переписываем словами
  // («7. Тема · часть 2») — но только урокам сида: у урока, заведённого
  // учителем, цифра в начале названия может быть его частью («5 минут
  // разговора»), и трогать её нельзя.
  const freshBodies = new Set(fresh.lessons.map(l => lessonBody(l.title)))
  lessons = lessons.map((l, i) => {
    const body = lessonBody(l.title ?? '')
    return {
      ...l,
      number: i + 1,
      title: withNumber(freshBodies.has(body) ? body : plainTitle(l.title ?? ''), i + 1),
    }
  })

  return { ...course, lessons, modules }
}
