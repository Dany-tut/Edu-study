import type { Lesson, Subject } from '../data/mockData'

export function isCourseModuleLocked(
  subject: Subject,
  index: number,
  isAvailable: (lesson: Lesson) => boolean = lesson => lesson.status !== 'locked',
): boolean {
  const module = subject.modules[index]
  if (!module || index === 0 || subject.accessMode === 'full') return false
  // A teacher or the date-based mode may have already opened lessons in this module.
  if (module.lessons.some(isAvailable)) return false
  const prev = subject.modules[index - 1]
  return prev.lessons.length > 0 && prev.lessons[prev.lessons.length - 1].status !== 'completed'
}
