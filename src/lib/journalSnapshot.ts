import type { CourseJournalData } from './courseJournal'

const fields = {
  courses: ['id','short_id','title','subject','kind','group_ids','student_ids'],
  lessons: ['id','short_id','course_id','module_id','title','kind','position','lesson_number','scheduled_date','scheduled_time','rec_date','rec_time','lesson_sched_manual','delivery_mode','youtube_url','hwTask','recTask','hwDate','recHwDate','extraHw'],
  modules: ['id','course_id','label','position'],
  work: ['id','student_id','lesson_ref','status','score','attachments','updated_at','review_comment'],
  events: ['id','lesson_id','node_type','group_id','student_id','date','time_start','time_end','lesson_title','subject','status'],
  assignments: ['id','lesson_id','group_id','title','due_date','status','basicTask','assignedAt','basicTasks'],
  legacy: ['id','student_id','lesson_date','lesson_title','present','grade'],
  attempts: ['id','student_id','lesson_ref','number','status','score','passing_score','submitted_at','review_comment'],
  marks: ['schedule_id','attendance'],
}

/** Names travel once per collection. Strict shape checks reject a truncated or
 * incompatible response before it can replace the current journal. Values,
 * including nulls, drafts, answer payloads and attempt order, are lossless. */
function decode(data: unknown): unknown {
  if (!data || typeof data !== 'object' || !('encoding' in data)) return data
  const { encoding, ...payload } = data as Record<string, unknown>
  if (encoding !== 'columns-v1') throw new Error('Формат журнала изменился. Обновите страницу.')
  for (const [key, columns] of Object.entries(fields)) {
    const table = payload[key] as { columns?: unknown; rows?: unknown } | undefined
    if (!table || !Array.isArray(table.columns) || table.columns.length !== columns.length
      || !columns.every((name, i) => (table.columns as unknown[])[i] === name) || !Array.isArray(table.rows)) {
      throw new Error('Снимок журнала неполон. Обновите журнал.')
    }
    payload[key] = table.rows.map((row: unknown) => {
      if (!Array.isArray(row) || row.length !== columns.length) throw new Error('Снимок журнала неполон. Обновите журнал.')
      return Object.fromEntries(columns.map((name, i) => [name, row[i]]))
    })
  }
  return payload
}

/** A rolling deployment may have an older DB. Every other failure is final:
 * never amplify a slow/denied snapshot into the legacy request fan-out. */
export function journalSnapshotResult({ data, error }: { data: unknown; error: { code: string; message: string } | null }): CourseJournalData | null {
  if (error) {
    if (['PGRST202', '42883'].includes(error.code)) return null
    throw new Error(error.message)
  }
  const next = decode(data) as CourseJournalData | null
  if (!next || !['courses', 'lessons', 'modules', 'work', 'events', 'assignments', 'legacy', 'attempts', 'marks', 'warnings']
    .every(key => Array.isArray((next as unknown as Record<string, unknown>)[key]))) {
    throw new Error('Снимок журнала неполон. Обновите журнал.')
  }
  return next
}
