import type { CourseJournalData, JournalWork } from '../../../lib/courseJournal'
import type { HomeworkItem } from '../../../data/teacherMockData'
import type { HwSubmission } from '../../../lib/useHomework'
import { parseBasicAnswers } from '../../../lib/basicAnswers'
import { applyStandReview, homeworkEntries } from './homeworkStand'
import type { AiGrade } from '../../../lib/useAiGrades'

export const FULL_REVIEW_EXAMPLE_ID = 'example-full-review'
export const FULL_REVIEW_EXAMPLE_TITLE = 'ОВР · проверка с фото и доской'
type Attachments = { photos: string[]; board: string | null }
type ExampleWork = JournalWork & { review_attachments?: Attachments }

/** Development-only fixture. The stand owns the snapshot; this module performs no remote writes. */
export function addFullReviewExample(data: CourseJournalData, today: string): CourseJournalData {
  const group = data.groups[0]
  const lesson = data.lessons.find(l => l.course_id === 'demo-chem' && l.position === 1)!
  const ref = 'hw-' + FULL_REVIEW_EXAMPLE_ID
  const submittedAt = today + 'T08:00:00Z'
  const work: ExampleWork[] = data.students.filter(s => s.groupId === group.id).slice(0, 3).map((student, i) => ({
    id: 'example-full-submission-' + i, student_id: student.id, lesson_ref: ref,
    status: i === 2 ? 'completed' : 'submitted', score: i === 2 ? 90 : 75, updated_at: submittedAt,
    review_comment: i === 2 ? 'Верное объяснение переноса электронов.' : null,
    attachments: { v: 'basic-1', attemptId: 'example-full-attempt-' + i, recommendationScore: 80,
      reviewRequired: i !== 2, gradable: 0, correct: 0,
      rows: [{ n: 1, type: 'write', prompt: 'Объясните восстановление железа в реакции Fe₂O₃ + CO → Fe + CO₂.',
        answer: ['Железо получает электроны и восстанавливается.', 'Fe: +3 → 0. Железо принимает 3 электрона; CO — восстановитель.', 'Fe₂O₃ + 3CO → 2Fe + 3CO₂. Железо восстанавливается, углерод окисляется.'][i],
        correct: 'Fe³⁺ + 3e⁻ → Fe⁰. Железо восстанавливается.', verdict: i === 2 ? 'correct' : 'review' },
        { n: 2, type: 'write', prompt: 'Расставьте коэффициенты в реакции Fe₂O₃ + CO → Fe + CO₂.',
          answer: i === 1 ? 'Fe₂O₃ + 3CO → 2Fe + CO₂' : 'Fe₂O₃ + 3CO → 2Fe + 3CO₂',
          correct: 'Fe₂O₃ + 3CO → 2Fe + 3CO₂', verdict: i === 2 ? 'correct' : 'review' }] },
  }))
  return { ...data,
    assignments: [...data.assignments, { id: FULL_REVIEW_EXAMPLE_ID, lesson_id: lesson.id, group_id: group.id,
      title: FULL_REVIEW_EXAMPLE_TITLE, status: 'active', assignedAt: today, due_date: today, basicTasks: [{ type: 'write' }] }],
    work: [...data.work, ...work],
    attempts: [...data.attempts, ...work.map((row, i) => ({ id: 'example-full-attempt-' + i, student_id: row.student_id,
      lesson_ref: ref, number: 1, status: row.status, score: row.status === 'completed' ? row.score : null,
      passing_score: 80, submitted_at: submittedAt, review_comment: row.review_comment ?? null }))],
  }
}

/** Authored visual fixtures: no model calls and no database writes. */
export function fullReviewAiExample(submissions: HwSubmission[]): Map<string, AiGrade> {
  return new Map(submissions.map((submission, i) => {
    const issue = i === 1
    const tasks: AiGrade['tasks'] = [
      { n: 1, kim_n: null, max_points: 2, points: 2,
        comment: 'Восстановление объяснено верно: степень окисления железа уменьшается с +3 до 0, железо принимает электроны.',
        note: '', elements: [
          { text: 'Верно объяснено восстановление железа', verdict: 'yes', quote: submission.answers?.rows[0]?.answer ?? '', ref: 'Эталон преподавателя · учебный пример', counted: true },
        ] },
      { n: 2, kim_n: null, max_points: 2, points: issue ? 1 : 2,
        comment: issue ? 'Перед CO₂ пропущен коэффициент 3. Слева три атома углерода, справа один. Правильно: Fe₂O₃ + 3CO → 2Fe + 3CO₂.' : 'Коэффициенты расставлены верно. Число атомов каждого элемента слева и справа совпадает.',
        note: issue ? 'В этом примере за верный ход решения сохранён 1 из 2 баллов. Проверьте, допускают ли ваши критерии частичный балл.' : '',
        elements: [
          { text: 'Коэффициенты перед CO и Fe верные', verdict: 'yes', quote: submission.answers?.rows[1]?.answer ?? '', ref: 'Учебная шкала · 1 балл', counted: true },
          { text: 'Коэффициент перед CO₂ равен 3', verdict: issue ? 'no' : 'yes', quote: issue ? 'CO₂' : '3CO₂', ref: 'Учебная шкала · 1 балл', counted: !issue },
        ] },
    ]
    return [submission.id, { id: 'example-ai-' + i, progressId: submission.id,
      status: i === 0 ? 'working' : submission.verdict === 'pending' ? 'graded' : 'confirmed',
      score: i === 0 ? null : issue ? 75 : 100, primary: i === 0 ? null : issue ? 3 : 4, max: 4,
      comment: issue ? 'Иван, восстановление железа ты объяснил верно. В уравнении реакции перед CO₂ нужен коэффициент 3. Исправь его и проверь число атомов каждого элемента с обеих сторон.' : 'Восстановление железа объяснено верно, коэффициенты в уравнении расставлены правильно. Хорошая работа!',
      teacherNote: '', tasks: i === 0 ? [] : tasks, error: '',
    } satisfies AiGrade]
  }))
}

export function fullReviewExample(data: CourseJournalData) {
  const assignment = data.assignments.find(a => a.id === FULL_REVIEW_EXAMPLE_ID)!
  const group = data.groups.find(g => g.id === assignment.group_id)!
  const submissions: HwSubmission[] = data.work.filter(w => w.lesson_ref === 'hw-' + assignment.id).map((row: ExampleWork) => ({
    id: row.id, hwId: assignment.id, studentId: row.student_id,
    studentName: data.students.find(s => s.id === row.student_id)!.name, submittedAt: row.updated_at,
    verdict: row.status === 'completed' ? 'accepted' : row.status === 'returned' ? 'returned' : 'pending',
    score: row.score ?? 0, comment: '', reviewComment: row.review_comment ?? '',
    reviewPhotos: row.review_attachments?.photos ?? [], reviewBoard: row.review_attachments?.board ?? null,
    answers: parseBasicAnswers(row.attachments),
  }))
  const submitters = data.students.filter(s => submissions.some(row => row.studentId === s.id))
  const hw: HomeworkItem = { id: assignment.id, groupId: group.id, groupName: group.name, title: assignment.title,
    assignedAt: assignment.assignedAt!, dueDate: assignment.due_date!, color: group.color,
    submittedCount: submissions.length, totalCount: group.studentCount,
    reviewedCount: submissions.filter(s => s.verdict !== 'pending').length, basicTasks: assignment.basicTasks as unknown[],
  }
  return { hw, group, submitters, submissions }
}

export function saveFullReviewExample(data: CourseJournalData, today: string, id: string, verdict: 'accepted' | 'returned',
  score: number, comment: string, attachments: Attachments, expectedAttemptId?: string) {
  const entry = homeworkEntries(data, today).find(e => e.work.submission?.id === id && e.work.slot.ref === 'hw-' + FULL_REVIEW_EXAMPLE_ID)
  if (!entry || (expectedAttemptId && parseBasicAnswers(entry.work.submission?.attachments)?.attemptId !== expectedAttemptId))
    throw new Error('Тестовая сдача изменилась. Откройте её заново.')
  const updated = applyStandReview(data, entry, { verdict, score, comment })
  return { ...updated, work: updated.work.map(w => w.id === id ? { ...w, review_attachments: attachments } : w) }
}
