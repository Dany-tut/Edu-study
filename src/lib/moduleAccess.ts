import type { Subject } from '../data/mockData'

export function isCourseModuleLocked(
  subject: Subject,
  index: number,
): boolean {
  const module = subject.modules[index]
  return !!module && !module.lessons.some(lesson => lesson.status !== 'locked')
}
