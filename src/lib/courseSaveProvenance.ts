/** The stamp belongs to the snapshot that was read, never to the time a draft
 * was reopened. Unknown/failed versions cannot authorize a write.
 * A supposedly new seed must also check for an existing stable course ID. */
export function courseSaveProvenance(baseline: string | null, current: string | null): 'save' | 'review' | 'unverified' {
  if (!current) return 'unverified'
  if (!baseline || current !== baseline) return 'review'
  return 'save'
}

export function courseSnapshotStamp(courseStamp: string, lessonStamps: Array<string | null | undefined>): string {
  return lessonStamps.reduce<string>((latest, stamp) => stamp && stamp > latest ? stamp : latest, courseStamp)
}
