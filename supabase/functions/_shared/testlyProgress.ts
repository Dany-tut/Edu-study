/** Apply a trusted Testly result without treating a zero score as an empty answer. */
export function applyTestlyResult(attachments: any, testId: string, result: any, status?: string) {
  if (attachments?.reviewedAt || attachments?.v !== 'basic-1' || !Array.isArray(attachments.rows) || !['submitted', 'started'].includes(result.state)) return null
  let changed = false
  let returned = false
  const credit = (x: any) => x?.max > 0 ? Math.max(0, Math.min(1, x.got / x.max)) : 0
  const rows = attachments.rows.map((row: any) => {
    if (row.type !== 'testly' || row.testly?.testId !== testId) return row
    if (row.testly?.updatedAt && result.updatedAt && Date.parse(result.updatedAt) < Date.parse(row.testly.updatedAt)) return row
    if (result.state === 'started') {
      if (!row.testly.submittedAt || row.testly.returned) return row
      changed = true
      returned = true
      return { ...row, answer: '', verdict: 'review', testly: { ...row.testly, returned: true,
        returnedAt: result.updatedAt ?? new Date().toISOString() } }
    }
    // An in-flight response from before the return must not close the homework again.
    if (row.testly.returnedAt && Date.parse(result.submittedAt) <= Date.parse(row.testly.returnedAt)) return row
    const testly = { ...row.testly, ...(result.updatedAt ? { updatedAt: result.updatedAt } : {}), ...(row.testly.returned ? { returned: false } : {}), got: result.got, max: result.max, pending: !!result.pending, submittedAt: result.submittedAt }
    const next = { ...row, answer: 'сдал тест в Тестли', testly, verdict: result.pending ? 'review' : credit(testly) === 1 ? 'correct' : 'wrong' }
    if (JSON.stringify(next) === JSON.stringify(row)) return row
    changed = true
    return next
  })
  if (!changed) return null
  // The browser rounds snapshot.correct to two decimals. Recompute the Testly
  // contribution rather than accumulating that rounding error across returns.
  const priorTestly = attachments.rows.reduce((sum: number, row: any) => sum + (row.type === 'testly' ? credit(row.testly) : 0), 0)
  const autoCorrect = Math.max(0, Math.round(((Number(attachments.correct) || 0) - priorTestly) * 100) / 100)
  const correct = autoCorrect + rows.reduce((sum: number, row: any) => sum + (row.type === 'testly' ? credit(row.testly) : 0), 0)
  const next = { ...attachments, rows, correct: Math.round(correct * 10000) / 10000 }
  if (attachments.draft) {
    const allTestsSubmitted = rows.length > 0 && rows.every((row: any) => row.type === 'testly' && row.testly?.submittedAt && !row.testly?.returned)
    return { attachments: { ...next, draft: !allTestsSubmitted }, score: next.gradable > 0 ? Math.round(100 * correct / next.gradable) : 0, status: allTestsSubmitted ? 'submitted' : 'current' }
  }
  const stillReturned = returned || rows.some((row: any) => row.testly?.returned)
  return { attachments: next, score: next.gradable > 0 ? Math.round(100 * correct / next.gradable) : 0,
    ...(stillReturned ? { status: 'returned' } : status === 'returned' ? { status: 'submitted' } : {}) }

}

/**
 * Testly-only homework the student finished without coming back to Iskra:
 * build the snapshot the homework screen would have saved. Mixed homework is
 * left to the screen — the server cannot answer the other tasks.
 */
export function testlySnapshotFor(tasks: any, testId: string, result: any, recommendationScore = 80) {
  if (result?.state !== 'submitted') return null
  const basic = (Array.isArray(tasks) ? tasks : []).filter((task: any) => !task?.isHard)
  if (!basic.length || basic.some((task: any) => task?.type !== 'testly' || !task?.testly?.id)) return null
  if (!basic.some((task: any) => task.testly.id === testId)) return null
  const empty = {
    v: 'basic-1', recommendationScore, reviewRequired: false, gradable: basic.length, correct: 0, draft: true,
    rows: basic.map((task: any, index: number) => ({
      n: index + 1, prompt: String(task.question ?? task.testly.title ?? ''), type: 'testly', answer: '', verdict: 'empty',
      testly: { testId: task.testly.id },
    })),
  }
  return applyTestlyResult(empty, testId, result, 'current')
}

type Person = { id: string; group_id: string | null; auth_user_id: string | null }

/** The enrollment row a course writes to — same rule as ownerFor in src/lib/db.ts. */
export function courseOwnerRow(rows: Person[], course: { student_ids?: string[] | null; group_ids?: string[] | null }) {
  return rows.find(row => (course.student_ids ?? []).includes(row.id))
    ?? rows.find(row => !!row.group_id && (course.group_ids ?? []).includes(row.group_id))
}

/** Stored answers of any kind win over a server-built snapshot. */
const hasAnswers = (a: any) => !!a && typeof a === 'object' && (a.v || a.rows || a.photos || a.tasks || a.board)

/**
 * A submitted Testly attempt with a personal Iskra link lands in every lesson
 * of the person's courses that assigns this test, even when Iskra has no
 * snapshot yet. Existing answers and grades are never replaced.
 */
/** Write a server-built snapshot unless the student already has answers there. */
async function upsertSnapshot(db: any, studentId: string, lessonRef: string, subject: string, snapshot: any) {
  const { data: existing, error: readError } = await db.from('lesson_progress').select('id, attachments, updated_at, status')
    .eq('student_id', studentId).eq('lesson_ref', lessonRef).maybeSingle()
  if (readError) throw readError
  if (existing) {
    if (hasAnswers(existing.attachments) || !['current', 'unviewed'].includes(existing.status)) return
    const attachments = { ...(existing.attachments ?? {}), ...snapshot.attachments }
    const { error: saveError } = await db.from('lesson_progress').update({ ...snapshot, attachments, updated_at: new Date().toISOString() })
      .eq('id', existing.id).eq('updated_at', existing.updated_at)
    if (saveError) throw saveError
  } else {
    const { error: saveError } = await db.from('lesson_progress')
      .insert({ student_id: studentId, lesson_ref: lessonRef, subject, ...snapshot })
    if (saveError && saveError.code !== '23505') throw saveError
  }
}

/**
 * Homework assigned outside a course (the `homework` table: a group's or a
 * single student's «ДЗ допом» in their 1:1 group). The student screen saves it
 * under `hw-<id>` with the group's subject (src/lib/standaloneHomework.ts);
 * the server builds the same snapshot when the student finished in Testly
 * without coming back to Iskra.
 */
export async function ensureStandaloneTestlySnapshots(db: any, own: Person[], testId: string, result: any) {
  const groupIds = [...new Set(own.map(row => row.group_id).filter(Boolean))] as string[]
  if (!groupIds.length) return
  const { data: rows, error } = await db.from('homework').select('id, group_id, status, basic_tasks')
    .in('group_id', groupIds).is('lesson_id', null).contains('basic_tasks', [{ testly: { id: testId } }])
  if (error) throw error
  const live = (rows ?? []).filter((hw: any) => hw.status !== 'draft' && hw.status !== 'archived')
  if (!live.length) return
  const { data: groups, error: groupError } = await db.from('groups').select('id, subject').in('id', [...new Set(live.map((hw: any) => hw.group_id))])
  if (groupError) throw groupError
  for (const hw of live) {
    const owner = own.find(row => row.group_id === hw.group_id)
    const snapshot = owner ? testlySnapshotFor(hw.basic_tasks, testId, result) : null
    if (!owner || !snapshot) continue
    const subject = String((groups ?? []).find((g: any) => g.id === hw.group_id)?.subject ?? '').trim()
    await upsertSnapshot(db, owner.id, `hw-${hw.id}`, subject, snapshot)
  }
}

export async function ensureTestlySnapshots(db: any, people: Person[], testId: string, key: string, result: any) {
  if (result?.state !== 'submitted' || !people.length) return
  const own = people.filter(row => row.auth_user_id && `iskra:${row.auth_user_id}`.toLowerCase() === String(key).toLowerCase())
  if (!own.length) return
  await ensureStandaloneTestlySnapshots(db, own, testId, result)
  const { data: lessons, error } = await db.from('lessons').select('short_id, course_id, homework')
    .contains('homework', { hwTasks: [{ testly: { id: testId } }] })
  if (error) throw error
  if (!lessons?.length) return
  const { data: courses, error: courseError } = await db.from('courses').select('id, short_id, status, student_ids, group_ids')
    .in('id', [...new Set(lessons.map((lesson: any) => lesson.course_id))])
  if (courseError) throw courseError
  for (const lesson of lessons) {
    const course = (courses ?? []).find((c: any) => c.id === lesson.course_id)
    // A draft course is not visible to students: nothing there was assigned yet.
    const owner = course && lesson.short_id && course.status !== 'draft' ? courseOwnerRow(own, course) : undefined
    const snapshot = owner ? testlySnapshotFor(lesson.homework?.hwTasks, testId, result) : null
    if (!owner || !snapshot) continue
    await upsertSnapshot(db, owner.id, lesson.short_id, course.short_id, snapshot)
  }
}
