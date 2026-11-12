import type { Task } from '../data/taskBankData'
import { makeTask, TASK_TYPES, type TaskPayload, type TaskTypeId } from '../data/taskTypes'

export function importBankTask(task: Task, id: string, isHard = false): TaskPayload & { type: TaskTypeId } {
  const rawType = task.answerType
  const choices = task.choices?.map(option => option.text)
  const correctChoices = task.choices?.flatMap((option, index) => option.correct ? [index] : [])
  const type: TaskTypeId = rawType && Object.prototype.hasOwnProperty.call(TASK_TYPES, rawType) ? rawType
    : task.questionTable ? 'tableFill'
    : task.matchLeft?.length ? 'matching'
    : task.sequenceItems?.length ? 'sequence'
    : choices?.length || task.questionType === 'choice' ? ((correctChoices?.length ?? 0) > 1 ? 'multi' : 'single')
    : task.part === 2 ? 'extended' : 'fill'
  return {
    ...makeTask(type, isHard, id),
    ...structuredClone(task.payload),
    id, type, isHard, label: TASK_TYPES[type].label,
    bankId: task.id,
    question: task.question,
    answer: task.answer,
    image: task.questionImage,
    imageSize: task.questionImageSize,
    afterNote: task.solution || undefined,
    ...(type === 'single' || type === 'multi' ? { choices: choices ?? [], correctChoices: correctChoices ?? [] } : {}),
    ...(task.questionTable ? { table: structuredClone(task.questionTable) } : {}),
    ...(task.matchLeft ? { pairs: task.matchLeft.map((left, index) => ({ left, right: task.matchRight?.[index] ?? '' })) } : {}),
    ...(task.sequenceItems ? { sequenceItems: [...task.sequenceItems] } : {}),
  }
}
