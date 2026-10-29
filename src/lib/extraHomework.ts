/**
 * Доп. домашки урока.
 *
 * У урока одна основная домашка (lessons.homework.hwTasks) и сколько угодно
 * дополнительных (lessons.homework.extraHw). Ученик решает каждую отдельно, и
 * всё, что у основной привязано к id урока — сдача в lesson_progress, черновик
 * в localStorage, оценка на треке, адрес «#/homework/<id>», — у доп. домашки
 * привязано к составному ключу `<урок>~<id доп. домашки>`. Поэтому сдачи разных
 * домашек одного урока не затирают друг друга, а `-hard` ложится в конец как
 * обычно: `<урок>~<id>-hard`.
 *
 * Id у доп. домашки постоянный, а подпись — по месту в списке: удалили «Доп 1» —
 * сдачи бывшей «Доп 2» остаются при ней, хотя она теперь называется «Доп».
 */

export const EXTRA_HW_SEP = '~'

/** Ключ домашки: id урока для основной, `<урок>~<id>` для доп. */
export function hwRef(lessonId: string, extraId?: string | null): string {
  return extraId ? `${lessonId}${EXTRA_HW_SEP}${extraId}` : lessonId
}

/** Обратно: из ключа домашки (без `-hard`) — урок и доп. домашка, если она есть. */
export function splitHwRef(ref: string): { lessonId: string; extraId: string | null } {
  const i = ref.indexOf(EXTRA_HW_SEP)
  return i === -1 ? { lessonId: ref, extraId: null } : { lessonId: ref.slice(0, i), extraId: ref.slice(i + 1) }
}

/** Урок, к которому относится запись lesson_progress: без `-hard` и без доп. домашки. */
export function baseLessonRef(ref: string): string {
  const noHard = ref.endsWith('-hard') ? ref.slice(0, -5) : ref
  return splitHwRef(noHard).lessonId
}

/** Одна доп. домашка — «Доп», несколько — «Доп 1», «Доп 2»… */
export function extraHwLabel(index: number, total: number, tr: (s: string) => string): string {
  return total <= 1 ? tr('Доп') : `${tr('Доп')} ${index + 1}`
}

export function newExtraHwId(): string {
  return Math.random().toString(36).slice(2, 8)
}
