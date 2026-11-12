import type { ExamCatalog, ExamLine, ExamSubtype } from '../data/examPresets'
import { makeTask, type TaskPayload, type TaskTypeId } from '../data/taskTypes'

export function makeExamTaskDraft(subtype: ExamSubtype, line: ExamLine, catalog: ExamCatalog, id?: string): TaskPayload & { type: TaskTypeId } {
  return {
    ...makeTask(subtype.type, false, id),
    type: subtype.type,
    question: subtype.prompt,
    cells: subtype.cells,
    ...(subtype.type === 'single' || subtype.type === 'multi' ? { correctChoices: [] } : {}),
    ...(subtype.type === 'matching' && subtype.entries
      ? { pairs: Array.from({ length: subtype.entries }, () => ({ left: '', right: '' })) } : {}),
    examTag: {
      exam: catalog.exam, subject: catalog.subject, year: catalog.year, line: line.number,
      subtype: subtype.title, points: line.points, criteria: subtype.criteria,
      templatePrompt: subtype.prompt,
    },
  }
}

export function needsExamCondition(task: Pick<TaskPayload, 'question' | 'examTag'>): boolean {
  const template = task.examTag?.templatePrompt
  if (!template) return false
  const text = (task.question ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
  return !text || text === template
}
