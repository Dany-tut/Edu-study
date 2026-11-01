import { supabase } from './supabase'
import { isSelfAssessmentValue, parseLessonSelfAssessment } from './lessonSelfAssessment'

export async function saveLessonSelfAssessment(studentId: string, lessonRef: string, attemptId: string, value: number) {
  if (!isSelfAssessmentValue(value)) throw new Error('Invalid self-assessment')
  const { data, error } = await supabase.rpc('save_lesson_self_assessment', {
    p_student: studentId, p_ref: lessonRef, p_attempt: attemptId, p_value: value,
  })
  if (error) throw error
  const assessment = parseLessonSelfAssessment(data)
  if (!assessment) throw new Error('Self-assessment was not saved')
  return assessment
}
