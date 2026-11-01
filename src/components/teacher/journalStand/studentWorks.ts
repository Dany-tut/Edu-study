import type { Student } from '../../../data/teacherMockData'
import {
  buildJournalIndex,
  courseRoster,
  eventReaches,
  journalCell,
  journalColumns,
  journalDate,
  OUTSIDE_COURSES,
  type CourseJournalData,
  type JournalColumn,
  type JournalWork,
} from '../../../lib/courseJournal'
import { baseLessonRef, splitHwRef } from '../../../lib/extraHomework'
import { homeworkResult, isHomeworkSubmissionStatus } from '../../../lib/homeworkResult'

export const ALL_COURSES = '*'
export type Scope = { course: string; module: string }
export type WorkSource = 'Искра' | 'Тестли' | 'Искра + Тестли' | 'Источник не указан'
export interface WorkSlot {
  ref: string
  title: string
  course: string
  module: string | null
  date: string | null
  due: string | null
  group?: string | null
  types: string[]
  required: boolean
  lesson?: JournalColumn
}
export interface StudentWork {
  slot: WorkSlot
  source: WorkSource
  status: string
  score: number | null
  threshold: number
  submitted: boolean
  dates: string[]
  returned: boolean
  resubmitted: boolean
  present: boolean | null
  watched: boolean
  studied: boolean
  points: string[]
}
export function sameLearner(a: Student, b: Student) {
  if (a.id === b.id) return true
  if (a.personId && b.personId) return a.personId === b.personId
  return !!a.authUserId && a.authUserId === b.authUserId
}
function typesOf(tasks: unknown): string[] {
  return (Array.isArray(tasks) ? tasks : tasks ? [tasks] : []).flatMap((task) =>
    task && typeof task === 'object' && !task.isHard && typeof task.type === 'string' ? [task.type] : []
  )
}
function sourceOf(types: string[]): WorkSource {
  if (!types.length) return 'Источник не указан'
  if (!types.includes('testly')) return 'Искра'
  return types.every((type) => type === 'testly') ? 'Тестли' : 'Искра + Тестли'
}
export function buildStandIndex(data: CourseJournalData) {
  const journal = buildJournalIndex(data)
  const slots = new Map<string, WorkSlot>()
  const roster = new Map(data.courses.map((c) => [c.id, new Set(courseRoster(data, c.id).map((s) => s.id))]))
  roster.set(OUTSIDE_COURSES, new Set(courseRoster(data, OUTSIDE_COURSES).map((s) => s.id)))
  const lessons = new Map(data.lessons.map((l) => [l.id, l]))
  for (const course of data.courses) {
    for (const column of journalColumns(data, course.id)) {
      const l = column.lesson!
      const base = {
        ref: column.id,
        title: l.title,
        course: course.id,
        module: l.module_id,
        date: column.date,
        due: column.due,
      }
      slots.set(column.id, {
        ...base,
        required: column.required,
        lesson: column,
        types: typesOf(column.recording ? l.recTask : l.hwTask),
      })
      if (column.recording) continue
      for (const [i, extra] of (Array.isArray(l.extraHw) ? l.extraHw : []).entries()) {
        if (!extra?.id) continue
        const ref = l.short_id + '~' + extra.id
        slots.set(ref, {
          ...base,
          ref,
          title: l.title + ' · Доп. ДЗ ' + (i + 1),
          due: journalDate(extra.date),
          types: typesOf(extra.tasks),
          required: !!extra.tasks?.length,
        })
      }
    }
  }
  // Lessons held outside a course still belong in a learner's attendance total.
  for (const column of journalColumns(data, OUTSIDE_COURSES)) {
    if (column.assignment) continue
    slots.set(column.id, {
      ref: column.id,
      title: column.title,
      course: OUTSIDE_COURSES,
      module: null,
      date: column.date,
      due: null,
      types: [],
      required: false,
      lesson: column,
    })
  }
  for (const a of data.assignments) {
    if (a.status === 'draft') continue
    const l = a.lesson_id ? lessons.get(a.lesson_id) : undefined
    const ref = 'hw-' + a.id
    slots.set(ref, {
      ref,
      title: a.title,
      course: l?.course_id ?? OUTSIDE_COURSES,
      module: l?.module_id ?? null,
      group: a.group_id,
      date: journalDate(a.assignedAt) ?? l?.scheduled_date ?? null,
      due: journalDate(a.due_date),
      types: typesOf(a.basicTasks ?? a.basicTask),
      required: a.status !== 'archived' && (!!a.basicTask || !l),
    })
  }
  for (const row of data.work) {
    if (
      slots.has(row.lesson_ref) ||
      row.lesson_ref.endsWith('-hard') ||
      /^(video-|course-reset:|trainer-)/.test(row.lesson_ref)
    )
      continue
    const base = slots.get(baseLessonRef(row.lesson_ref))
    const hasAnswers = (row.attachments as { v?: string } | null)?.v === 'basic-1'
    if (!base && !hasAnswers && !row.lesson_ref.startsWith('hw-')) continue
    const extra = splitHwRef(row.lesson_ref)
    slots.set(row.lesson_ref, {
      ref: row.lesson_ref,
      title: base ? base.title + (extra.extraId ? ' · Доп. ДЗ' : ' · Запись') : 'Домашняя работа · ' + row.lesson_ref,
      course: base?.course ?? OUTSIDE_COURSES,
      module: base?.module ?? null,
      date: base?.date ?? null,
      due: null,
      types: [],
      required: false,
    })
  }
  return { journal, slots, roster }
}
export type StandIndex = ReturnType<typeof buildStandIndex>
export function scopeSlots(index: StandIndex, scope: Scope) {
  return [...index.slots.values()].filter(
    (s) => (scope.course === ALL_COURSES || s.course === scope.course) && (!scope.module || s.module === scope.module)
  )
}
function dayOf(iso: string) {
  const epoch = Date.parse(iso)
  return Number.isFinite(epoch) ? new Date(epoch + 3 * 3600000).toISOString().slice(0, 10) : ''
}
function weekOf(day: string) {
  const d = new Date(day + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}
export function studentWorks(
  data: CourseJournalData,
  index: StandIndex,
  student: Student,
  slots: WorkSlot[],
  today: string
): StudentWork[] {
  const members = data.students.filter((other) => sameLearner(student, other))
  return slots.flatMap((slot) => {
    const assigned = members.filter((member) => {
      if (slot.group !== undefined) return !!slot.group && slot.group === member.groupId
      if (slot.course === OUTSIDE_COURSES) return slot.lesson?.events.some((e) => eventReaches(e, member))
      return index.roster.get(slot.course)?.has(member.id)
    })
    const history = members.flatMap((m) => {
      const row = index.journal.work.get(m.id + ':' + slot.ref)
      return row ? [row] : []
    })
    if (!assigned.length && !history.length) return []
    // An enrollment may move between student cards. Keep one result per assignment.
    const row = history.sort(
      (a, b) =>
        Number(isHomeworkSubmissionStatus(b.status)) - Number(isHomeworkSubmissionStatus(a.status)) ||
        b.updated_at.localeCompare(a.updated_at)
    )[0] as JournalWork | undefined
    const attempts = members.flatMap((m) => index.journal.attempts.get(m.id + ':' + slot.ref) ?? [])
    const owner = members.find((m) => m.id === row?.student_id) ?? assigned[0]
    const cell = slot.lesson && owner ? journalCell(data, index.journal, owner, slot.lesson, today) : null
    if (cell?.cancelled && !row) return []
    const result = row ? homeworkResult(row.attachments, row.score, row.status, attempts) : null
    const payload = row?.attachments as {
      rows?: {
        type?: string
        testly?: { got?: number; max?: number; submittedAt?: string; pending?: boolean; returned?: boolean }
      }[]
    } | null
    const rows = Array.isArray(payload?.rows) ? payload.rows.filter(Boolean) : []
    const types = typesOf(rows)
    const source = sourceOf(types.length ? types : slot.types)
    const currentSubmitted = !!row && isHomeworkSubmissionStatus(row.status) && !result?.draft
    const submitted = currentSubmitted || attempts.length > 0
    const finalScores = attempts.flatMap((a) =>
      a.status === 'completed' && a.score !== null && Number.isFinite(a.score) ? [a.score] : []
    )
    const externalComplete = rows
      .filter((r) => r.type === 'testly')
      .every(
        (r) =>
          r.testly &&
          !r.testly.pending &&
          Number.isFinite(r.testly.got) &&
          typeof r.testly.max === 'number' &&
          r.testly.max > 0 &&
          !r.testly.returned
      )
    if (
      currentSubmitted &&
      row?.status !== 'returned' &&
      externalComplete &&
      result?.percent != null &&
      !result.pending
    )
      finalScores.push(result.percent)
    const scored = finalScores.length ? Math.max(...finalScores) : null
    const returnedAttempts = attempts.filter((a) => a.status === 'returned')
    const resubmitted = returnedAttempts.some((a) =>
      attempts.some((b) => b.student_id === a.student_id && b.number > a.number)
    )
    const dates = attempts.map((a) => dayOf(a.submitted_at)).filter(Boolean)
    // Only an all-Testly submission can use the component timestamp for the whole work.
    if (
      !dates.length &&
      currentSubmitted &&
      source === 'Тестли' &&
      rows.length &&
      rows.every((r) => r.testly?.submittedAt)
    ) {
      const days = rows.map((r) => r.testly!.submittedAt!).sort()
      const last = days[days.length - 1]
      const day = dayOf(last)
      if (day) dates.push(day)
    }
    let status = 'Без ДЗ'
    if (slot.required)
      status = slot.date && slot.date > today ? 'Впереди' : slot.due && slot.due < today ? 'Просрочено' : 'Не сдано'
    if (slot.required && row?.status === 'locked') status = 'Впереди'
    if (result?.draft || (slot.required && row?.status === 'current'))
      status = attempts.length ? 'Пересдача' : slot.due && slot.due < today ? 'Просрочено' : 'В процессе'
    if (currentSubmitted)
      status =
        row?.status === 'returned'
          ? 'На доработке'
          : result?.pending
          ? 'На проверке'
          : scored === null
          ? 'Сдано без балла'
          : result?.passed
          ? 'Зачтено'
          : 'Ниже порога'
    const points = rows.flatMap((r) =>
      r.type === 'testly' &&
      !r.testly?.pending &&
      typeof r.testly?.got === 'number' &&
      typeof r.testly.max === 'number' &&
      r.testly.max > 0
        ? [r.testly.got + ' / ' + r.testly.max]
        : []
    )
    return [
      {
        slot,
        source,
        status,
        score: scored,
        threshold: result?.passingScore ?? 80,
        submitted,
        dates: dates.sort(),
        returned: returnedAttempts.length > 0 || status === 'На доработке',
        resubmitted,
        present: cell?.present ?? null,
        watched: cell?.watched ?? false,
        studied: cell?.studied ?? false,
        points,
      },
    ]
  })
}
export function workStats(works: StudentWork[], today: string) {
  const graded = works.filter((w) => w.score !== null)
  const due = works.filter(
    (w) => w.slot.due && w.slot.due <= today && w.status !== 'Впереди' && w.status !== 'Без ДЗ'
  )
  const dated = due.filter((w) => w.dates.length || !w.submitted)
  const weeks = new Set<string>(),
    active = new Set<string>(),
    unknown = new Set<string>()
  for (const w of works) {
    if ((!w.slot.required && !w.submitted) || w.status === 'Впереди' || w.status === 'Без ДЗ') continue
    const anchor = w.slot.date ?? w.slot.due
    if (anchor && anchor <= today) {
      const week = weekOf(anchor)
      weeks.add(week)
      if (w.submitted && !w.dates.length) unknown.add(week)
    }
    for (const d of w.dates) if (d <= today) active.add(weekOf(d))
  }
  const knownWeeks = [...weeks].filter((k) => !unknown.has(k) || active.has(k))
  return {
    graded: graded.length,
    passed: graded.filter((w) => w.score! >= w.threshold).length,
    average: graded.length ? Math.round(graded.reduce((v, w) => v + w.score!, 0) / graded.length) : null,
    active: knownWeeks.filter((k) => active.has(k)).length,
    weeks: knownWeeks.length,
    returned: works.filter((w) => w.returned).length,
    resubmitted: works.filter((w) => w.resubmitted).length,
    timely: dated.filter((w) => w.dates.length && w.dates[0] <= w.slot.due!).length,
    due: dated.length,
    submitted: works.filter((w) => w.submitted).length,
    unknownDates: works.some((w) => w.submitted && !w.dates.length),
    attended: works.filter((w) => w.present === true).length,
    marked: works.filter((w) => w.present !== null).length,
  }
}
