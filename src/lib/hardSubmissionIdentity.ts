/** Explicit hard refs are authoritative; basic snapshots with a comment are not legacy hard answers. */
export function isHardSubmissionRow(row: { lesson_ref: string; attachments?: unknown }): boolean {
  if (row.lesson_ref.endsWith('-hard')) return true
  const version = (row.attachments as { v?: unknown } | null)?.v
  return typeof version !== 'string' || !/^basic-\d+$/.test(version)
}

/** Standalone assignments use UUID ids; never send course refs to a UUID column. */
export function standaloneHomeworkId(baseRef: string): string | null {
  return /^hw-([\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12})$/i.exec(baseRef)?.[1] ?? null
}

export function hardSubmissionTitle(baseRef: string, lessonTitles: Record<string, string>, homeworkTitles: Record<string, string>): string {
  const id = standaloneHomeworkId(baseRef)
  return (id ? homeworkTitles[id] : undefined) ?? lessonTitles[baseRef] ?? baseRef
}
