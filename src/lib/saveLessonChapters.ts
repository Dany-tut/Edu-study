import { supabase } from './supabase'
import type { LessonTimecode } from '../data/lessonContent'
import { publishedChapters, chapterPayload, type ChapterVariants } from './chapterVariants'

/** A single-row optimistic write. A lost response is reconciled by reading back;
 * neither an empty RLS response nor a timeout is reported as success. */
export async function saveLessonChapters(shortId: string, variants: ChapterVariants, expectedCodes: LessonTimecode[], expectedVariants?: ChapterVariants, client: Pick<typeof supabase, 'from'> = supabase): Promise<string> {
  const read = () => client.from('lessons').select('updated_at, youtube_url, timecodes, chapter_variants')
    .eq('short_id', shortId).abortSignal(AbortSignal.timeout(8000)).single()
  const before = await read()
  if (before.error || !before.data) throw new Error('Не удалось проверить сохранённые главы. Повторите сохранение.')
  if ((before.data.youtube_url ?? '').trim() !== variants.source) throw new Error('Запись урока изменилась. Черновик глав сохранён в этом браузере.')
  const payload = chapterPayload(variants)
  const same = (row: typeof before.data) => row && canonical(row.chapter_variants) === canonical(payload.chapter_variants) && canonical(row.timecodes) === canonical(payload.timecodes)
  if (same(before.data)) return before.data.updated_at
  if (canonical(before.data.timecodes ?? []) !== canonical(publishedChapters(expectedCodes)) ||
      canonical(before.data.chapter_variants ?? null) !== canonical(expectedVariants ?? null)) {
    throw new Error('Главы изменены в другой вкладке. Ваш черновик сохранён. Обновите урок и сравните изменения.')
  }
  const result = await client.from('lessons').update(payload).eq('short_id', shortId)
    .eq('updated_at', before.data.updated_at)
    .select('updated_at, youtube_url, timecodes, chapter_variants')
    .abortSignal(AbortSignal.timeout(12000)).maybeSingle()
  if (!result.error && result.data && same(result.data)) return result.data.updated_at
  const after = await read()
  if (!after.error && after.data && same(after.data)) return after.data.updated_at
  throw new Error('Сохранение не подтверждено. Черновик остался в браузере. Повторите сохранение; если урок меняли в другой вкладке — сначала проверьте её.')
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']'
  if (value && typeof value === 'object') return '{' + Object.entries(value).filter(([,v]) => v !== undefined).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => JSON.stringify(k)+':'+canonical(v)).join(',') + '}'
  return JSON.stringify(value)
}
