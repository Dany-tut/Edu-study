import type { BasicAnswersPayload } from './basicAnswers'

/** «…+00:00» и «…Z» — одно и то же время сдачи. */
function sameMoment(a: unknown, b: unknown): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false
  const x = Date.parse(a), y = Date.parse(b)
  return Number.isFinite(x) && x === y
}

/** A trusted Testly webhook may finish the same attempt before the browser saves.
 *
 * The server can open that attempt under its own id (the status poll persists
 * the result first), so a browser id that differs is still the same work when
 * every test carries the same Testly submission time. A genuinely stale retry
 * has no or another submission time and is still rejected. */
export function isStoredTestlySubmission(snapshot: BasicAnswersPayload, stored: {
  status: string; attachments: BasicAnswersPayload
} | null): boolean {
  const saved = stored?.attachments
  const sameAttempt = !!snapshot.attemptId && snapshot.attemptId === saved?.attemptId
  const sameRun = !!saved?.attemptId && snapshot.rows.length > 0 && saved.rows?.length === snapshot.rows.length
    && snapshot.rows.every((row, index) => sameMoment(row.testly?.submittedAt, saved.rows[index]?.testly?.submittedAt))
  return (sameAttempt || sameRun)
    && (stored?.status === 'submitted' || stored?.status === 'completed') && !saved.draft
    && snapshot.rows.length > 0 && snapshot.rows.every(row => row.type === 'testly')
    && saved.rows?.length === snapshot.rows.length && saved.rows.every((row, index) =>
      row.type === 'testly' && !!row.testly?.submittedAt && !row.testly.returned
      && row.testly.testId === snapshot.rows[index].testly?.testId)
}
