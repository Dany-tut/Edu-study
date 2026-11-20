// ─────────────────────────────────────────────────────────────────────────────
// Номер урока на экране
//
// lesson.number — позиция урока в курсе с нуля, её пересчитывает сохранение.
// Курс можно начать с середины года: учитель ставит «Нумерация с 63», и первый
// урок показывается как «#63». Сдвиг только для показа — прогресс, ДЗ и
// расписание держатся за short_id / uuid урока. Дописали первые 62 урока —
// ставят «с 1», и номера сходятся сами.
// ─────────────────────────────────────────────────────────────────────────────

export const NUMBER_START_MAX = 9999

/** courses.number_start → сдвиг. Мусор и пустое — без сдвига. */
export function lessonNumberShift(numberStart: unknown): number {
  const n = Math.floor(Number(numberStart))
  return Number.isFinite(n) && n >= 1 && n <= NUMBER_START_MAX ? n - 1 : 0
}

/** Номер, который видит человек: «Занятие #N». */
export function lessonNo(lesson: { number: number; numberShift?: number }): number {
  return lesson.number + 1 + (lesson.numberShift ?? 0)
}
