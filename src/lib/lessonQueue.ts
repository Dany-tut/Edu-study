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
// ЧЕГО ЗДЕСЬ НЕТ. Ступеней лестницы (элемент × ступень, Р2): повтор пока
// возвращает ТО ЖЕ задание, а не более лёгкое по тому же слову. Лёгкая ступень
// рождается из данных юнита, а их даёт блок C (генератор сида). Планировщик
// написан так, чтобы ступень легла сюда же: в очереди лежат позиции, а не
// вопросы, и подменить вопрос на позиции — это одно поле.
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
  opts: { id: string; index: number; position: number; baseCount: number },
): QueueState {
  const { id, index, position, baseCount } = opts
  const used = queue.retries[id] ?? 0
  if (used >= MAX_RETRIES) return queue
  if (queue.order.length >= Math.ceil(baseCount * LENGTH_CAP)) return queue

  const gap = GAPS[used]
  // Дальше конца очереди вставлять некуда — тогда задание встаёт последним.
  const at = Math.min(position + gap, queue.order.length)
  const order = [...queue.order.slice(0, at), index, ...queue.order.slice(at)]
  // Вставка сдвигает все отметки повторов правее неё.
  const repeats = queue.repeats.map(p => (p >= at ? p + 1 : p)).concat(at)
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
 * Включён ли режим очереди.
 *
 * ПОД ФЛАГОМ, потому что меняет поведение ВСЕХ домашек сразу: список заданий
 * перестаёт быть списком, «Вопрос 5 из 12» перестаёт быть правдой, а
 * сохранённые черновики получают новое поле. Пока обкатывается — включается
 * руками:
 *
 *   • адрес: ?queue=1 (и ?queue=0, чтобы выключить и запомнить);
 *   • localStorage: `lesson-queue-v1 = on`.
 */
const FLAG_KEY = 'lesson-queue-v1'

export function lessonQueueEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const url = new URLSearchParams(window.location.search).get('queue')
    if (url === '1' || url === 'on') { localStorage.setItem(FLAG_KEY, 'on'); return true }
    if (url === '0' || url === 'off') { localStorage.setItem(FLAG_KEY, 'off'); return false }
    return localStorage.getItem(FLAG_KEY) === 'on'
  } catch {
    return false
  }
}
