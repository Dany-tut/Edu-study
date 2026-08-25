// ─────────────────────────────────────────────────────────────────────────────
// Очередь урока: ошибка возвращается в этот же урок
// (docs/MEMORY_STANDARD.md, Р8 — «мастери-цикл»)
//
// ЗАЧЕМ. Домашка ходит по списку заданий: ответил неверно — задание ушло
// навсегда, слово осталось невыученным, урок всё равно «сдан». Промах при этом
// не бесполезен сам по себе: попытка вспомнить укрепляет память СИЛЬНЕЕ
// показа — но только если за ней идут коррекция и повторная попытка
// (Metcalfe 2017; Hays, Kornell & Bjork 2013). Без второй попытки промах просто
// зафиксирован.
//
// ЧТО ДЕЛАЕТ. Держит ПОРЯДОК прохождения — список позиций вместо «индекс + 1».
// Промах вставляет задание ещё раз, через несколько других: не сразу (ответ
// эхом держится в рабочей памяти, и повтор через секунду проверяет эхо, а не
// память) и не в конец (тогда это уже другой урок).
//
// ПОЧЕМУ РАЗРЫВ РАСТЁТ. Landauer & Bjork (1978): повторы с растущим интервалом
// дают больше, чем равномерные. Первый возврат — через два других задания,
// второй — через шесть.
//
// СТУПЕНЬ ВНИЗ. Промах возвращает не только само задание, но и задание ПОПРОЩЕ
// про то же слово (`easier`): не набралось с клавиатуры — сначала собери из
// плиток, потом набирай снова. Какое задание считается более лёгким и про какое
// слово оно вообще, решает lib/lessonLadder.ts; здесь только порядок.
//
// ЭТО НЕ SRS. Здесь минуты и один урок; дни и месяцы считает FSRS
// (lib/fsrs.ts), и смешивать их нельзя: у них разные единицы и разные цели.
// ─────────────────────────────────────────────────────────────────────────────

/** Сдвиг вставки от текущей позиции: +3 — между промахом и повтором пройдут два
 *  других задания, +7 — шесть. Меньше двух брать нельзя: ответ ещё звучит в
 *  голове, и повтор проверял бы эхо, а не память. */
const GAPS = [3, 7] as const

/** Больше двух возвратов одно задание не получает: иначе урок вырождается в
 *  долбёжку одного слова, а на очереди ещё девятнадцать. */
const MAX_RETRIES = GAPS.length

/** Потолок длины урока: полтора списка. Без него серия промахов в конце
 *  превращает домашку в бесконечную — а бросают именно бесконечные. */
const LENGTH_CAP = 1.5

export interface QueueState {
  /** Порядок прохождения: значения — индексы в списке заданий, с повторами. */
  order: number[]
  /** Сколько раз задание уже возвращалось. Ключ — id задания. */
  retries: Record<string, number>
  /** Позиции в `order`, которые являются повтором (на них ответ сбрасывается). */
  repeats: number[]
}

export const initialQueue = (count: number): QueueState => ({
  order: Array.from({ length: count }, (_, i) => i),
  retries: {},
  repeats: [],
})

/**
 * Очередь из сохранённого черновика.
 *
 * Список заданий мог измениться между заходами (учитель поправил домашку), и
 * тогда сохранённый порядок ссылается в пустоту. Проверяем и, если он не бьётся
 * с текущим списком, начинаем заново — это честнее, чем показывать «задание 7»
 * там, где его больше нет.
 */
export function restoreQueue(saved: Partial<QueueState> | undefined, count: number): QueueState {
  const order = saved?.order
  const valid = Array.isArray(order)
    && order.length >= count
    && order.every(i => Number.isInteger(i) && i >= 0 && i < count)
    // Каждое задание списка обязано быть в очереди хотя бы раз.
    && new Set(order).size === count
  if (!valid) return initialQueue(count)
  return {
    order: order!,
    retries: saved?.retries ?? {},
    repeats: Array.isArray(saved?.repeats) ? saved!.repeats! : [],
  }
}

/** Задание на позиции: -1, когда урок кончился. */
export const questionAt = (queue: QueueState, position: number): number =>
  position >= 0 && position < queue.order.length ? queue.order[position] : -1

/** Позиция — повторный показ (ответ на ней надо очистить). */
export const isRepeatAt = (queue: QueueState, position: number): boolean =>
  queue.repeats.includes(position)

/**
 * Промах: вернуть задание в очередь.
 *
 * Возвращает НОВОЕ состояние (или то же самое, если возвращать нельзя: лимит
 * повторов, потолок длины). `position` — где ученик стоит сейчас; вставка идёт
 * относительно неё, а не относительно конца.
 */
export function requeue(
  queue: QueueState,
  opts: { id: string; index: number; position: number; baseCount: number; easier?: number },
): QueueState {
  const { id, index, position, baseCount, easier } = opts
  const used = queue.retries[id] ?? 0
  if (used >= MAX_RETRIES) return queue
  const cap = Math.ceil(baseCount * LENGTH_CAP)
  if (queue.order.length >= cap) return queue

  const gap = GAPS[used]
  // Ступень вниз (Р8): перед повтором того же задания ставим задание попроще
  // про то же слово — собрать из плиток то, что не набралось с клавиатуры.
  // Ближе, чем сам повтор: это не проверка, а починка, и ждать её шесть экранов
  // незачем. Места на два вставки нет — идёт один повтор, как раньше.
  const withEasier = easier !== undefined && easier >= 0 && queue.order.length + 2 <= cap

  const order = [...queue.order]
  const repeats = [...queue.repeats]
  const insert = (at: number, value: number) => {
    const pos = Math.min(Math.max(at, 0), order.length)
    order.splice(pos, 0, value)
    for (let i = 0; i < repeats.length; i++) if (repeats[i] >= pos) repeats[i]++
    repeats.push(pos)
  }

  if (withEasier) insert(position + 2, easier!)
  insert(position + gap + (withEasier ? 1 : 0), index)

  return { order, retries: { ...queue.retries, [id]: used + 1 }, repeats }
}

/**
 * Задания, которые так и не сдались: возвращались максимальное число раз и
 * последний ответ снова неверный. Их место — в колоде повторений (Р8, Р12).
 */
export function hardIds(queue: QueueState): string[] {
  return Object.entries(queue.retries)
    .filter(([, times]) => times >= MAX_RETRIES)
    .map(([id]) => id)
}

/**
 * Включён ли режим очереди. ПО УМОЛЧАНИЮ — ДА.
 *
 * ПОЧЕМУ ВКЛЮЧЁН. Обкатка кончилась. Пока флаг стоял выключенным, вся вторая
 * половина стандарта не работала ни в одном курсе: ошибка уходила навсегда,
 * слово оставалось невыученным, а урок всё равно засчитывался. Промах без
 * второй попытки — это просто зафиксированная ошибка (Metcalfe 2017), и
 * держать такое поведение по умолчанию значит держать по умолчанию то,
 * ради исправления чего писался весь документ.
 *
 * ВЫКЛЮЧАЕТСЯ руками — на случай, если у конкретного ученика или на разборе
 * нужен ровно прежний линейный порядок:
 *
 *   • адрес: ?queue=0 (и ?queue=1, чтобы включить обратно);
 *   • localStorage: `lesson-queue-v1 = off`.
 */
const FLAG_KEY = 'lesson-queue-v1'

export function lessonQueueEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const url = new URLSearchParams(window.location.search).get('queue')
    if (url === '1' || url === 'on') { localStorage.setItem(FLAG_KEY, 'on'); return true }
    if (url === '0' || url === 'off') { localStorage.setItem(FLAG_KEY, 'off'); return false }
    return localStorage.getItem(FLAG_KEY) !== 'off'
  } catch {
    // Хранилище недоступно (приватный режим, запрет куки) — работаем как
    // обычно, то есть с очередью: она и есть обычный режим.
    return true
  }
}
