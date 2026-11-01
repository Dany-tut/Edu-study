import type { Subject } from '../data/mockData'

/** Keep the existing nodes; long modules extend the same row beyond the viewport. */
export function courseTrackWidth(viewport: number, count: number): number {
  return Math.max(viewport, count > 1 ? 128 + (count - 1) * 88 : 128,
    count > 15 ? viewport * count / 15 : viewport)
}

export function courseResumeTarget(subject: Subject) {
  const modules = subject.modules
  const module = modules.find(m => m.id === subject.activeModuleId)
    ?? modules.find(m => m.lessons.some(l => l.status === 'current')) ?? modules[0]
  const lessons = module?.lessons ?? []
  const lesson = lessons.find(l => l.status === 'current')
    ?? lessons.find(l => ['unviewed', 'returned', 'submitted'].includes(l.status))
    ?? [...lessons].reverse().find(l => l.status === 'completed') ?? lessons[0]
  return { moduleId: module?.id, lessonId: lesson?.id }
}
