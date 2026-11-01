import { supabase } from './supabase'
import type { BasicAnswersPayload } from './basicAnswers'
import type { HomeworkAttempt } from './homeworkResult'

export async function startHomeworkRetake(studentId: string, lessonRef: string, expectedId: string | null) {
  const args = { p_student: studentId, p_ref: lessonRef }
  const { data, error } = expectedId === null
    ? await supabase.rpc('start_legacy_homework_retake', args)
    : await supabase.rpc('start_homework_retake', { ...args, p_expected: expectedId })
  if (error) throw error
  return data as BasicAnswersPayload & { archivedAttempt?: HomeworkAttempt }
}
