import type { Subject } from '../data/mockData'
import { supabase } from './supabase'

export interface LessonParticipation {
  lesson_ref: string
  delivery_mode: 'live' | 'recording'
  attended: boolean
  /** Нет у старой версии функции — тогда пропуск не показываем. */
  missed?: boolean
}
export type ParticipationMap = Map<string, LessonParticipation>
const key = (studentId: string, lessonRef: string) => `${studentId}:${lessonRef}`

/** Includes old lessons outside the short calendar window; scoped to each course owner.
 * A person may have several student rows with access to one course (assigned
 * personally and through a group). The journal marks «Был» on whichever row the
 * teacher sees, so every such row is asked and a mark on any of them counts. */
export async function fetchLessonParticipation(subjects: Subject[]): Promise<ParticipationMap> {
  const refsByStudent = new Map<string, Set<string>>()
  const ownersByStudent = new Map<string, Set<string>>()
  for (const subject of subjects) {
    const owner = subject.ownerStudentId
    if (!owner) continue
    const refs = [...new Set(subject.modules.flatMap(module => module.lessons
      .filter(lesson => lesson.kind !== 'test').map(lesson => lesson.id.replace(/~rec$/, ''))))]
    for (const studentId of new Set([owner, ...(subject.attendanceStudentIds ?? [])])) {
      const set = refsByStudent.get(studentId) ?? new Set<string>()
      for (const ref of refs) set.add(ref)
      refsByStudent.set(studentId, set)
      const owners = ownersByStudent.get(studentId) ?? new Set<string>()
      owners.add(owner)
      ownersByStudent.set(studentId, owners)
    }
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
          for (const owner of ownersByStudent.get(studentId) ?? []) {
            const k = key(owner, row.lesson_ref)
            const prev = result.get(k)
            const attended = (prev?.attended ?? false) || row.attended
            result.set(k, { ...row, attended, missed: !attended && (prev?.missed === true || row.missed === true) })
          }
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
      return row ? { ...lesson, deliveryMode: row.delivery_mode, attended: row.attended, missed: row.missed === true } : lesson
    }),
  })) }))
}
