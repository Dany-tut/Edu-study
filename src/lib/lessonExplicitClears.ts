// Намеренная очистка полей урока (защита данных, инцидент 22.11).
//
// Триггер lessons_preserve_nonempty отклоняет любое опустошение заполненного
// поля: так старые клиенты не затирают незагруженные поля пустыми значениями.
// Учитель, который сам стёр описание или ссылку, упирался в ту же защиту.
// Редактор перечисляет в заголовке X-Iskra-Explicit-Clear пары
// «short_id:поле», которые пользователь опустошил сам; триггер пропускает
// только их. Прежнее значение остаётся в iskra_history.row_versions.
//
// Пары считаются ТОЛЬКО против подтверждённого сервером снимка курса, который
// открыт в редакторе (версия совпадает с базой). Черновик с устройства или
// восстановление сюда не попадают: там пустое поле может значить «не загружено».

export const EXPLICIT_CLEAR_HEADER = 'X-Iskra-Explicit-Clear'

/** Простые текстовые поля, которые пользователь стирает сам. JSON-поля
 * (content, homework, materials, test_tasks, timecodes…) сюда не входят:
 * редактор собирает их из своей проекции, и пустое значение там не доказывает
 * намерения. Тот же список зашит в триггере. */
export const GUARDED_LESSON_FIELDS = ['description', 'youtube_url'] as const

type LessonRow = Record<string, unknown> & { short_id: string }

export function isEmptyLessonValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value as object).length === 0
  return false
}

/** «short_id:поле» для каждого поля, заполненного в базе и пустого в редакторе. */
export function lessonExplicitClears(confirmed: readonly LessonRow[], edited: readonly LessonRow[]): string[] {
  const before = new Map(confirmed.map(row => [row.short_id, row]))
  const clears: string[] = []
  for (const row of edited) {
    const old = before.get(row.short_id)
    if (!old) continue
    for (const field of GUARDED_LESSON_FIELDS) {
      // Поле, которого нет в строке редактора, не загружено — это не очистка.
      if (!Object.prototype.hasOwnProperty.call(row, field)) continue
      if (!isEmptyLessonValue(old[field]) && isEmptyLessonValue(row[field])) clears.push(`${row.short_id}:${field}`)
    }
  }
  return clears
}

/** Значение заголовка или null, если очищать нечего. */
export function explicitClearHeader(clears: readonly string[]): string | null {
  const safe = clears.filter(pair => /^[A-Za-z0-9_-]+:(description|youtube_url)$/.test(pair))
  return safe.length ? safe.join(',') : null
}
