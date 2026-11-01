import { readDraft, writeDraft } from '../../../lib/useDraft'

export type ReviewHandoff = { score: string; comment: string; edited?: boolean }

/** Keep attachments and per-task marks when moving from the journal to the full editor. */
export function handoffHomeworkReview(hwId: string, studentId: string, draft: ReviewHandoff) {
  const key = `hwReview:${hwId}:${studentId}`
  const previous = readDraft<{ score: string; comment: string; taskScores?: Record<string, string>; photos?: string[]; board?: string | null }>(key)
  writeDraft(key, {
    ...previous,
    score: draft.edited ? draft.score : previous?.score ?? draft.score,
    comment: draft.edited ? draft.comment : previous?.comment ?? draft.comment,
  })
}
