import type { courseAtomicRows } from './courseAtomicRows'

type LessonWrite = ReturnType<typeof courseAtomicRows>['lessonRows'][number]
export type StoredLessonMetadata = Pick<LessonWrite, 'short_id' | 'timecodes' | 'description'>
  & { updated_at: string; chapter_variants: LessonWrite['chapter_variants'] | null }

/** A whole-course draft without a verified field baseline cannot prove a
 * destructive edit. Omit ambiguous fields from a guarded UPDATE of the
 * existing row; an upsert could substitute defaults or recreate the row. */
export function planLegacyLessonWrites(rows: LessonWrite[], stored: StoredLessonMetadata[]) {
  const byRef = new Map(stored.map(row => [row.short_id, row]))
  const upserts: LessonWrite[] = []
  const updates: Array<{
    stored: StoredLessonMetadata
    values: Omit<LessonWrite, 'timecodes' | 'description'> & Partial<Pick<LessonWrite, 'timecodes' | 'description'>>
    keepTimecodes: boolean
    keepChapterVariants: boolean
    keepDescription: boolean
  }> = []
  for (const row of rows) {
    const previous = byRef.get(row.short_id)
    const keepTimecodes = !row.timecodes.length && !!previous?.timecodes?.length
    const keepChapterVariants = keepTimecodes || (!row.chapter_variants && !!previous?.chapter_variants)
    const keepDescription = !row.description?.trim() && !!previous?.description?.trim()
    if (!previous || (!keepTimecodes && !keepChapterVariants && !keepDescription)) {
      upserts.push(row)
      continue
    }
    const { timecodes, chapter_variants, description, ...rest } = row
    updates.push({
      stored: previous,
      values: {
        ...rest,
        ...(keepTimecodes ? {} : { timecodes }),
        ...(!keepChapterVariants && chapter_variants ? { chapter_variants } : {}),
        ...(keepDescription ? {} : { description }),
      },
      keepTimecodes,
      keepChapterVariants,
      keepDescription,
    })
  }
  return { upserts, updates }
}
