import type { Subject } from '../data/mockData'
import { supabase } from './supabase'

export interface LessonParticipation {
  lesson_ref: string
  delivery_mode: 'live' | 'recording'
  attended: boolean
}
export type ParticipationMap = Map<string, LessonParticipation>
const key = (studentId: string, lessonRef: string) => `${studentId}:${lessonRef}`

/** Includes old lessons outside the short calendar window; scoped to each course owner. */
export async function fetchLessonParticipation(subjects: Subject[]): Promise<ParticipationMap> {
  const refsByStudent = new Map<string, Set<string>>()
  for (const subject of subjects) {
    const studentId = subject.ownerStudentId
    if (!studentId) continue
    const refs = refsByStudent.get(studentId) ?? new Set<string>()
    for (const module of subject.modules) for (const lesson of module.lessons) {
      if (lesson.kind !== 'test') refs.add(lesson.id.replace(/~rec$/, ''))
    }
    refsByStudent.set(studentId, refs)
  }
  const result: ParticipationMap = new Map()
  const requests: Promise<void>[] = []
  for (const [studentId, refs] of refsByStudent) {
    const all = [...refs]
    for (let offset = 0; offset < all.length; offset += 250) {
      requests.push((async () => {
        const { data, error } = await supabase.rpc('student_lesson_participation', {
          p_student: studentId, p_refs: all.slice(offset, offset + 250),
        })
        if (error) throw error
        for (const row of (Array.isArray(data) ? data : []) as LessonParticipation[]) {
          result.set(key(studentId, row.lesson_ref), row)
        }
      })())
    }
  }
  for (const response of await Promise.allSettled(requests)) {
    if (response.status === 'rejected') console.error('[lesson participation]', response.reason)
  }
  return result
}

/** Missing/failed responses preserve the previous state; an explicit false clears it. */
export function applyLessonParticipation(subjects: Subject[], participation: ParticipationMap): Subject[] {
  return subjects.map(subject => ({ ...subject, modules: subject.modules.map(module => ({
    ...module, lessons: module.lessons.map(lesson => {
      const row = participation.get(key(subject.ownerStudentId ?? '', lesson.id))
      return row ? { ...lesson, deliveryMode: row.delivery_mode, attended: row.attended } : lesson
    }),
  })) }))
}
