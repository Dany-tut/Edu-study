// ─────────────────────────────────────────────────────────────────────────────
// Ступень задания и его цена во времени
//
// ЗАЧЕМ ЭТОТ ФАЙЛ. Лестница из шести касаний (docs/MEMORY_STANDARD.md, Р2)
// описана в документе таблицей, а в коде жила только комментариями у
// генераторов. Проверить, доходит ли урок до припоминания или замирает на
// узнавании, было нечем: посчитать типы заданий можно, но тип ≠ ступень.
// `single` из двух вариантов — ступень 1, `single` из четырёх — ступень 4, а
// `fill` со скелетом и без скелета отличаются на целую ступень.
//
// ПОЧЕМУ ЕЩЁ И СЕКУНДЫ. Считать распределение урока в ШТУКАХ заданий —
// значит мерить не то. Замер 26.08.2026 по тринадцати сидам: по счёту заданий
// узнавание выглядело как 52–58% урока, по времени — 17–27%. Разница вся в
// том, что тап по варианту стоит восемь секунд, а развёрнутый ответ — три
// минуты. Ученик живёт во времени, поэтому доли считаются по времени.
//
// ЧЕГО ЗДЕСЬ НЕТ. Точного хронометража. Числа ниже — типичная цена задания, и
// нужны они для ДОЛЕЙ, а не для обещания «урок займёт 24 минуты». Там, где
// настоящая длительность лежит в самом задании (речь, видео), берётся она.
// ─────────────────────────────────────────────────────────────────────────────

import type { TaskPayload } from './taskTypes'

/** Ступень лестницы Р2. */
export type Stage = 0 | 1 | 2 | 3 | 4 | 5 | 6

export const STAGE_NAMES: Record<Stage, string> = {
  0: 'знакомство',
  1: 'узнавание значения',
  2: 'узнавание на слух',
  3: 'сборка',
  4: 'припоминание значения',
  5: 'припоминание формы',
  6: 'продукция',
}

type AnyTask = Partial<TaskPayload> & { type: string }

/**
 * Ступень задания по таблице Р2.
 *
 * Три места, где ступень определяет не тип, а поле задания:
 *
 * • `single` — число вариантов. Выбор из двух это узнавание (ступень 1), выбор
 *   из четырёх с освоенными обманками — припоминание значения (ступень 4),
 *   целевая ступень урока. С `ttsText` вопрос звучит, а не читается, и это
 *   узнавание на слух (ступень 2).
 *
 * • `fill` — скелет ответа. Со скелетом это припоминание с опорой (5), без
 *   него — чистая продукция (6). Ровно ради этого различия и заведено поле
 *   `answerSkeleton` (см. его комментарий в taskTypes.ts).
 *
 * • `jamoType` — экранная клавиатура из букв слова. Формально это набор, по
 *   сути — ступень 5: опора здесь суженный алфавит, как у скелета опора длина.
 *   Развёрнуто объяснено в languageCourse.ts, блок «Припоминание».
 */
export function taskStage(t: AnyTask): Stage {
  switch (t.type) {
    // Показали и рассказали — отвечать не надо. Внешнее упражнение сюда же:
    // что там происходило, мы не знаем, и делать вид, что знаем, не станем.
    case 'flashcard':
    case 'videoWatch':
    case 'embed':
      return 0

    case 'single':
    case 'multi':
      if (t.ttsText) return 2
      return (t.choices?.length ?? 4) <= 2 ? 1 : 4

    case 'minimalPair':
    case 'listenBank':
      return 2

    // Выбор готового из короткого списка — узнавание, но с опорой на соседей
    // по строке и по тексту: между «показали» и «собери сам».
    case 'trueFalse':
    case 'dropdownGap':
      return 2

    // Генерация с опорой: ответ собирается из выданных плиток.
    case 'buildSyllable':
    case 'wordBank':
    case 'trace':
    case 'charBank':
    case 'blockOrder':
    case 'unscramble':
    case 'sequence':
    case 'columnSort':
      return 3

    case 'fill':
      return t.answerSkeleton ? 5 : 6

    case 'jamoType':
    case 'listenType':
    case 'tableFill':
    case 'wordDrop':
    case 'dialogGap':
      return 5

    case 'matching':
    case 'pattern':
    case 'crossword':
    case 'speaking':
    case 'extended':
    case 'imageDescribe':
    case 'imageCompare':
    case 'whiteboard':
      return 6

    // Незнакомый тип не должен тихо улучшать статистику: считаем его целевой
    // ступенью урока, то есть серединой, — так он не выглядит ни продукцией,
    // ни знакомством.
    default:
      return 4
  }
}

/** Типичная цена задания в секундах — для долей, не для расписания. */
const SECONDS: Record<string, number> = {
  flashcard: 12,
  minimalPair: 10,
  multi: 18,
  fill: 20,
  buildSyllable: 20,
  listenBank: 25,
  charBank: 25,
  jamoType: 25,
  unscramble: 25,
  listenType: 30,
  wordBank: 30,
  blockOrder: 30,
  trace: 30,
  sequence: 30,
  pattern: 30,
  dialogGap: 40,
  matching: 45,
  trueFalse: 60,
  dropdownGap: 40,
  embed: 120,
  columnSort: 60,
  tableFill: 45,
  wordDrop: 90,
  crossword: 120,
  imageDescribe: 150,
  extended: 180,
  imageCompare: 180,
}

/** Сколько секунд стоит задание. */
export function taskSeconds(t: AnyTask): number {
  // Вопрос из двух вариантов читается вдвое быстрее вопроса из четырёх.
  if (t.type === 'single') return 6 + 3 * (t.choices?.length ?? 4)
  // Речь и видео носят своё время в себе — гадать не нужно.
  if (t.type === 'speaking') return (t.prepSeconds ?? 20) + (t.responseSeconds ?? 45)
  if (t.type === 'videoWatch') return t.videoWatchSeconds ?? 120
  return SECONDS[t.type] ?? 20
}

/**
 * Задания ВНЕ лестницы: слушать живую речь — это не ступень, а другой род
 * работы (у Нейшена — meaning-focused input).
 *
 * ЗАЧЕМ ИСКЛЮЧЕНИЕ. Ролик живой речи стоит десять–двадцать минут и по времени
 * перевешивает всё занятие. Считая его нижней ступенью, сторож объявлял
 * перекошенными ровно те уроки, которые сделаны правильнее прочих: занятие с
 * двадцатиминутным подкастом и развёрнутым пересказом выглядело как «71%
 * узнавания». Мерить долю лестницы нужно по заданиям лестницы.
 */
const OUTSIDE_LADDER = new Set(['videoWatch'])

/**
 * Доли времени урока по трём ярусам лестницы: низ (0–2), цель (3–4), верх (5–6).
 *
 * Живая речь (см. OUTSIDE_LADDER) в доли не входит и возвращается отдельным
 * полем `inputSeconds` — чтобы её было видно, но она ничего не перевешивала.
 */
export function stageMix(tasks: AnyTask[]): {
  low: number; mid: number; top: number; seconds: number; inputSeconds: number
} {
  let low = 0, mid = 0, top = 0, seconds = 0, inputSeconds = 0
  for (const t of tasks) {
    const s = taskSeconds(t)
    if (OUTSIDE_LADDER.has(t.type)) { inputSeconds += s; continue }
    const stage = taskStage(t)
    seconds += s
    if (stage <= 2) low += s
    else if (stage <= 4) mid += s
    else top += s
  }
  if (seconds === 0) return { low: 0, mid: 0, top: 0, seconds: 0, inputSeconds }
  return { low: low / seconds, mid: mid / seconds, top: top / seconds, seconds, inputSeconds }
}
