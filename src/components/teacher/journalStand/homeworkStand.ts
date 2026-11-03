import type { CourseJournalData } from '../../../lib/courseJournal'
import type { Student } from '../../../data/teacherMockData'
import { parseBasicAnswers } from '../../../lib/basicAnswers'
import { buildStandIndex, sameLearner, studentWorks, type StudentWork, type StandIndex } from './studentWorks'

export interface HomeworkEntry { key: string; student: Student; work: StudentWork }
export interface ReviewDecision { verdict: 'accepted' | 'returned'; score: number; comment: string }
export type SaveReview = (entry: HomeworkEntry, decision: ReviewDecision) => Promise<void>
export function nativeHomeworkReviewId(data: CourseJournalData, entry: HomeworkEntry): string | null {
  const direct = data.assignments.find(a => 'hw-' + a.id === entry.work.slot.ref && a.status !== 'draft')
  if (direct) return direct.id
  const lesson = entry.work.slot.lesson?.lesson
  if (!lesson || entry.work.slot.ref !== lesson.short_id) return null
  const linked = data.assignments.filter(a => a.lesson_id === lesson.id && a.group_id === entry.student.groupId && a.status !== 'draft')
  return linked.length === 1 ? linked[0].id : null
}
export const needsReview = (entry: HomeworkEntry) => entry.work.status === 'На проверке' && !!entry.work.submission
export function workDueLabel(day: string) {
  const date = Date.parse(day)
  return Number.isFinite(date) ? new Intl.DateTimeFormat('ru-RU', {day:'numeric',month:'short',timeZone:'UTC'}).format(date) : day
}

export function homeworkEntries(data: CourseJournalData, today: string, index: StandIndex = buildStandIndex(data)): HomeworkEntry[] {
  const slots = [...index.slots.values()]
  const students = data.students.filter((s, i, all) => all.findIndex(other => sameLearner(other, s)) === i)
  return students.flatMap(student => studentWorks(data, index, student, slots, today)
    .filter(work => work.slot.required || work.submitted)
    .map(work => ({ key: student.id + ':' + work.slot.ref, student: data.students.find(s => s.id === work.studentId) ?? student, work })))
}

export function reviewQueue(items: HomeworkEntry[]) {
  return items.filter(needsReview).sort((a, b) => {
    const date = (entry: HomeworkEntry) => entry.work.attempts?.slice(-1)[0]?.submitted_at ?? entry.work.submission?.updated_at ?? ''
    return date(a).localeCompare(date(b)) || a.key.localeCompare(b.key)
  })
}

/** Used only by the isolated example, and after a successful save by the live stand. */
export function applyStandReview(data: CourseJournalData, entry: HomeworkEntry, decision: ReviewDecision): CourseJournalData {
  const row = entry.work.submission
  if (!row) throw new Error('Ученик ещё не сдал эту работу.')
  if (!Number.isFinite(decision.score) || decision.score < 0 || decision.score > 100) throw new Error('Укажите результат от 0 до 100%.')
  if (decision.verdict === 'returned' && !decision.comment.trim()) throw new Error('Добавьте комментарий для доработки.')
  const current = data.work.find(w => w.id === row.id)
  const payload = parseBasicAnswers(row.attachments)
  const currentPayload = parseBasicAnswers(current?.attachments)
  if (!current || current.status !== row.status || current.updated_at !== row.updated_at || currentPayload?.attemptId !== payload?.attemptId)
    throw new Error('Работа изменилась. Откройте актуальную сдачу заново.')
  const status = decision.verdict === 'accepted' ? 'completed' : 'returned'
  const latest = entry.work.attempts?.filter(a => a.student_id === row.student_id && a.lesson_ref === row.lesson_ref).sort((a, b) => b.number - a.number)[0]
  const attemptId = payload?.attemptId ?? latest?.id
  return {
    ...data,
    work: data.work.map(w => w.id === row.id ? { ...w, status, score: decision.score, review_comment: decision.comment.trim() || null,
      updated_at: new Date().toISOString(), attachments: payload ? { ...payload, reviewedAt: status === 'completed' ? new Date().toISOString() : null } : w.attachments } : w),
    attempts: data.attempts.map(a => a.id === attemptId ? { ...a, status, score: decision.score, review_comment: decision.comment.trim() || null } : a),
  }
}
