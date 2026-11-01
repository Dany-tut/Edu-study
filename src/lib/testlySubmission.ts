import type { BasicAnswersPayload } from './basicAnswers'

/** A trusted Testly webhook may finish the same attempt before the browser saves. */
export function isStoredTestlySubmission(snapshot: BasicAnswersPayload, stored: {
  status: string; attachments: BasicAnswersPayload
} | null): boolean {
  const saved = stored?.attachments
  return !!snapshot.attemptId && snapshot.attemptId === saved?.attemptId
    && (stored?.status === 'submitted' || stored?.status === 'completed') && !saved.draft
    && snapshot.rows.length > 0 && snapshot.rows.every(row => row.type === 'testly')
    && saved.rows?.length === snapshot.rows.length && saved.rows.every((row, index) =>
      row.type === 'testly' && !!row.testly?.submittedAt && !row.testly.returned
      && row.testly.testId === snapshot.rows[index].testly?.testId)
}
