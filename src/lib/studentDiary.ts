import type { Lesson, Subject } from '../data/mockData'
import type { ProgressMap } from './db'
import { getTrackLessonStatus, type TrackLessonStatus } from './lessonStatus'
import { gradedTrackResult } from './homeworkResult'
import { hwRef } from './extraHomework'
import { isCourseModuleLocked } from './moduleAccess'

export type DiaryMetadata = {
  hasMain: boolean
  mainDate: string | null
  hasRecording: boolean
  recordingDate: string | null
  extras: { id: string; date: string | null; index: number; total: number }[]
}
export type StudentDiaryEntry = {
  id: string
  lesson: Lesson
  course: Subject
  module: string
  moduleOrder: number
  extraId?: string
  suffix?: string
  due: string | null
  status: TrackLessonStatus
}
export function diaryDay(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const raw = value.trim()
  const dot = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  const day = dot ? `${dot[3]}-${dot[2]}-${dot[1]}` : raw.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null
  const date = new Date(`${day}T12:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day ? day : null
}
export function metadataFromHomework(homework: Lesson['homework']): DiaryMetadata {
  const extras = homework?.extraHw ?? []
  return {
    hasMain: !!homework?.hwTasks?.length,
    mainDate: diaryDay(homework?.hwDate),
    hasRecording: !!homework?.recHwTasks?.length,
    recordingDate: diaryDay(homework?.recHwDate),
    extras: extras.flatMap((extra, index) =>
      extra?.id && extra.tasks?.length
        ? [{ id: extra.id, date: diaryDay(extra.date), index, total: extras.length }]
        : [],
    ),
  }
}
export function buildStudentDiary(
  subjects: Subject[],
  metadata: Map<string, DiaryMetadata>,
  progress: ProgressMap,
  now: Date,
): StudentDiaryEntry[] {
  const entries: StudentDiaryEntry[] = []
  for (const course of subjects)
    for (const [moduleOrder, module] of course.modules.entries()) {
      if (isCourseModuleLocked(course, moduleOrder)) continue
      for (const lesson of module.lessons) {
        if (lesson.status === 'locked') continue
        const base = lesson.id.replace(/~rec$/, '')
        const info =
          metadata.get(base) ?? (!lesson.heavyPending ? metadataFromHomework(lesson.homework) : null)
        const recording = lesson.nodeType === 'rec'
        const hasMain =
          lesson.kind === 'test' ||
          !!lesson.bankHard?.length ||
          (recording ? info?.hasRecording : info?.hasMain)
        const visual = gradedTrackResult(lesson)?.status ?? getTrackLessonStatus(lesson, now)
        if (hasMain)
          entries.push({
            id: lesson.id,
            lesson,
            course,
            module: module.label,
            moduleOrder,
            due: recording ? (info?.recordingDate ?? null) : (info?.mainDate ?? null),
            status: visual,
          })
        if (recording) continue
        for (const extra of info?.extras ?? []) {
          const id = hwRef(lesson.id, extra.id),
            saved = progress[id]
          // Each additional assignment has its own result; the main lesson's grade must not leak into it.
          const extraLesson: Lesson = {
            ...lesson,
            status: saved?.status ?? 'current',
            result: saved?.result,
            points: saved?.score ?? undefined,
          }
          entries.push({
            id,
            lesson: extraLesson,
            course,
            module: module.label,
            moduleOrder,
            extraId: extra.id,
            suffix: extra.total > 1 ? `Доп ${extra.index + 1}` : 'Доп',
            due: extra.date,
            status: gradedTrackResult(extraLesson)?.status ?? getTrackLessonStatus(extraLesson, now),
          })
        }
      }
    }
  return entries
}
export const diaryNeedsAction = (entry: StudentDiaryEntry) =>
  ['current', 'today', 'returned', 'test_low', 'unviewed'].includes(entry.status)
export const diaryOverdue = (entry: StudentDiaryEntry, today: string) =>
  !!entry.due && entry.due < today && diaryNeedsAction(entry)
export function diaryPriority(entry: StudentDiaryEntry, today: string) {
  return diaryOverdue(entry, today)
    ? 0
    : entry.due === today && diaryNeedsAction(entry)
      ? 1
      : entry.status === 'returned'
        ? 2
        : entry.status === 'test_low'
          ? 3
          : diaryNeedsAction(entry)
            ? 4
            : 5
}
export function diaryWorkLabel(entry: StudentDiaryEntry) {
  return `${entry.lesson.kind === 'test' ? 'Тест' : 'ДЗ'} №${entry.lesson.number + 1}${entry.suffix ? ` · ${entry.suffix}` : ''}`
}
export const diaryStatusText = (entry: StudentDiaryEntry) =>
  entry.status === 'current' || entry.status === 'today'
    ? 'К выполнению'
    : entry.status === 'returned'
      ? 'На доработку'
      : entry.status === 'test_low'
        ? 'Ниже порога'
        : entry.status === 'test_passed' || entry.status === 'completed'
          ? 'Зачтено'
          : entry.status === 'submitted'
            ? 'На проверке'
            : entry.status === 'unviewed'
              ? 'Запись доступна'
              : entry.status === 'submitted_unknown'
                ? 'Работа отправлена'
                : 'Недоступно'
export function sortStudentDiary(
  entries: StudentDiaryEntry[],
  sort: string,
  descending: boolean,
  today: string,
) {
  const compare = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' }).compare
  return [...entries].sort((a, b) => {
    let order = 0
    if (sort === 'due') {
      if ((a.due === null) !== (b.due === null)) return a.due === null ? 1 : -1
      order = compare(a.due ?? '', b.due ?? '')
    } else if (sort === 'number') order = a.lesson.number - b.lesson.number
    else if (sort === 'subject') order = compare(a.course.subject ?? '', b.course.subject ?? '')
    else if (sort === 'course') order = compare(a.course.name, b.course.name)
    else order = diaryPriority(a, today) - diaryPriority(b, today)
    return (
      (descending ? -1 : 1) * order ||
      compare(a.course.id, b.course.id) ||
      a.moduleOrder - b.moduleOrder ||
      a.lesson.number - b.lesson.number ||
      compare(a.id, b.id)
    )
  })
}
