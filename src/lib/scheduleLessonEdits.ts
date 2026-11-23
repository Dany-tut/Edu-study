import type { LessonFiles } from './lessonFiles'

export type ScheduleLessonField = 'title' | 'videoUrl' | 'description' | 'timecodes' | 'files'
export type ScheduleLessonIntent = { lessonId: string; stamp: string; fields: ScheduleLessonField[] }
type JsonObject = Record<string, unknown>

function object(value: unknown): value is JsonObject {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

// The attachment picker only understands three slots. Leave other keys and the
// complete raw records of surviving files intact, including old-format entries.
export function patchScheduleMaterials(raw: unknown, before: LessonFiles, after: LessonFiles): JsonObject {
  if (raw != null && !object(raw)) throw new Error('Неизвестный формат материалов урока')
  const result: JsonObject = { ...raw }
  for (const slot of ['workbook', 'notebook', 'materials'] as const) {
    if (JSON.stringify(before[slot]) === JSON.stringify(after[slot])) continue
    if (slot !== 'materials') {
      if (result[slot] != null && !before[slot]) throw new Error('Сначала проверьте материал в редакторе курса')
      if (after[slot]) result[slot] = after[slot]
      else delete result[slot]
      continue
    }
    const original = result.materials ?? []
    if (!Array.isArray(original)) throw new Error('Неизвестный формат списка материалов')
    const prior = new Set((before.materials ?? []).map(file => file.path))
    const next = new Set((after.materials ?? []).map(file => file.path))
    const kept = original.filter(row => !object(row) || !prior.has(String(row.path)) || next.has(String(row.path)))
    const added = (after.materials ?? []).filter(file => !prior.has(file.path))
    result.materials = [...kept, ...added]
  }
  return result
}

export type ScheduleTimecode = { time: string; label: string; seconds?: number; [key: string]: unknown }
export function patchScheduleChapters(codes: ScheduleTimecode[], variants: unknown) {
  const normalized = codes.map(code => {
    const parts = code.time.trim().split(':')
    if (!parts.length || !parts.every(part => /^\d+$/.test(part)) || parts.length > 3 ||
        parts.slice(1).some(part => Number(part) >= 60)) throw new Error('Проверьте время главы')
    return { ...code, seconds: parts.reduce((total, part) => total * 60 + Number(part), 0) }
  })
  if (variants == null || (object(variants) && !Object.keys(variants).length)) return { timecodes: normalized }
  if (!object(variants) || (variants.active !== 'slides' && variants.active !== 'text') ||
      !Array.isArray(variants[variants.active]) || !Number.isSafeInteger(variants.revision))
    throw new Error('Откройте варианты глав в редакторе курса')
  return {
    timecodes: normalized.map(({ time, label, seconds }) => ({ time, label, seconds })),
    chapter_variants: { ...variants, [variants.active]: normalized, revision: Number(variants.revision) + 1 },
  }
}
