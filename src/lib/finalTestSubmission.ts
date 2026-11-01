import type { Lesson, TestTask } from '../data/mockData'
import { gradeTask, isAutoGradable, normalizeTaskType, type TaskAnswer } from '../data/taskTypes'
import { shortPrompt, type BasicAnswersPayload } from './basicAnswers'
import { upsertLessonProgress } from './db'
import { homeworkResult } from './homeworkResult'

function answerText(task: TestTask, answer: TaskAnswer | undefined): string {
  if (answer == null) return ''
  if (typeof answer === 'number') return task.choices?.[answer] ?? String(answer)
  if (typeof answer === 'string') return answer
  if (Array.isArray(answer)) {
    const values = task.choices ?? task.sequenceItems
    return answer.map(a => typeof a === 'number' ? values?.[a] ?? String(a) : a).join(' · ')
  }
  return Object.entries(answer).map(([key, value]) => `${key}: ${value}`).join('; ')
}

export function buildFinalTestSubmission(tasks: TestTask[], answers: Record<string, TaskAnswer>) {
  const gradable = tasks.filter(isAutoGradable)
  const correct = gradable.filter(task => gradeTask(task, answers[task.id] ?? null).correct).length
  const score = gradable.length > 0 ? Math.round(correct / gradable.length * 100) : 0
  const attachments: BasicAnswersPayload & {
    test: { tasks: TestTask[]; answers: Record<string, TaskAnswer> }
  } = {
    v: 'basic-1', gradable: gradable.length, correct,
    reviewRequired: tasks.some(task => !isAutoGradable(task)),
    recommendationScore: 80,
    // Keep the complete task and raw answer as well as the existing teacher-facing rows.
    test: { tasks, answers },
    rows: tasks.map((task, i) => {
      const answer = answerText(task, answers[task.id])
      const auto = isAutoGradable(task)
      const type = normalizeTaskType(task.type)
      return {
        n: i + 1, prompt: shortPrompt(task.question ?? task.label), type, answer,
        verdict: !answer.trim() ? 'empty' : !auto ? 'review'
          : gradeTask(task, answers[task.id] ?? null).correct ? 'correct' : 'wrong',
        ...(type === 'speaking' || task.responseMode === 'speak' ? { voice: !!answer } : {}),
        ...(auto && task.answer ? { correct: task.answer } : {}),
      }
    }),
  }
  return { score, correct, gradable: gradable.length, attachments }
}

/** A rejected write must reach the UI; only the caller's success path may clear its draft. */
export async function saveFinalTestSubmission(studentId: string, lesson: Lesson, answers: Record<string, TaskAnswer>, attemptId?: string) {
  const { attachments, ...result } = buildFinalTestSubmission(lesson.testTasks ?? [], answers)
  await upsertLessonProgress(studentId, lesson.id, lesson.subject, {
    status: 'submitted', score: attachments.reviewRequired ? null : result.score, attachments: { ...attachments, attemptId },
  })
  return { ...result, homework: homeworkResult(attachments, result.score, 'submitted') }
}
