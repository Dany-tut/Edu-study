import type { CourseJournalData } from './courseJournal'
import { baseLessonRef } from './extraHomework'

/** Keep all lesson metadata, but only fetch rich task JSON that can contribute
 * to this roster. Historical references survive removal from an enrollment. */
export function journalLessonDetailIds(data: {
  courses: CourseJournalData['courses']
  lessons: Pick<CourseJournalData['lessons'][number], 'id' | 'short_id' | 'course_id'>[]
  studentIds: string[]; groupIds: string[]
  work: Pick<CourseJournalData['work'][number], 'lesson_ref'>[]
  attempts: Pick<CourseJournalData['attempts'][number], 'lesson_ref'>[]
  events: Pick<CourseJournalData['events'][number], 'lesson_id'>[]
  assignments: Pick<CourseJournalData['assignments'][number], 'lesson_id'>[]
}): string[] {
  const students = new Set(data.studentIds), groups = new Set(data.groupIds)
  const enrolled = new Set(data.courses.filter(course =>
    course.student_ids?.some(id => students.has(id)) || course.group_ids?.some(id => groups.has(id))
  ).map(course => course.id))
  const history = new Set([...data.work, ...data.attempts].map(row => baseLessonRef(row.lesson_ref.replace(/^video-/, ''))))
  const assigned = new Set([...data.events, ...data.assignments].map(row => row.lesson_id).filter(Boolean))
  return data.lessons.filter(lesson => enrolled.has(lesson.course_id) || assigned.has(lesson.id)
    || history.has(lesson.id) || history.has(lesson.short_id)).map(lesson => lesson.id)
}
