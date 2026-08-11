export type LessonStatus = 'completed' | 'returned' | 'unviewed' | 'submitted' | 'current' | 'locked'
export type LessonShape = 'circle' | 'square' | 'diamond'

import type { StoredTaskType, TaskPayload } from './taskTypes'

/** @deprecated Используй StoredTaskType из ./taskTypes — там единственный union. */
export type TestTaskType = StoredTaskType

/** A single quiz task on a course test node. Mirrors the teacher editor's HWTask.
 *  Поля описаны в TaskPayload (src/data/taskTypes.ts) — единый источник правды. */
export type TestTask = TaskPayload

export interface Lesson {
  id: string
  title: string
  number: number
  status: LessonStatus
  shape: LessonShape
  points?: number
  comment?: string
  subject: string
  /** Node kind: a normal lesson or a final test that opens a quiz. */
  kind?: 'lesson' | 'test'
  /**
   * Track node type. When a lesson's recording date diverges from its lesson
   * date it splits into two track nodes: 'rec' (live session) and 'lesson'.
   * Undefined = a single combined node (default).
   */
  nodeType?: 'rec' | 'lesson'
  /** Quiz tasks for a test node (kind === 'test'). */
  testTasks?: TestTask[]
  /** DB-authored konspekt + homework override (from lessons.content). */
  content?: import('./lessonContent').LessonContentData
  /** Teacher-authored homework from the course editor's «Домашки» tab
   *  (lessons.homework JSONB). When set with tasks, the student homework page
   *  renders these instead of the generic placeholder homework. */
  homework?: import('./lessonContent').AuthoredHomework
  /** Short lesson description from the teacher editor (lessons.description). */
  description?: string
  /** "Запись" tab — raw recording URL as pasted by the teacher: RuTube,
   *  YouTube, or the school's own link (teachstream /watch/<id>, direct
   *  .webm/.mp4, …). Parsed into a playable source at render time. */
  videoUrl?: string
  /** "Запись" tab — video chapter timecodes. */
  timecodes?: import('./lessonContent').LessonTimecode[]
  /** Прикреплённые файлы урока (lessons.materials): рабочая тетрадь, конспект-PDF,
   *  справочные материалы. Пусто, пока учитель ничего не загрузил. */
  files?: import('../lib/lessonFiles').LessonFiles
  /** Scheduled calendar date (ISO "YYYY-MM-DD") — shown on the track to match the schedule. */
  scheduledDate?: string
}

export interface Module {
  id: number
  label: string
  lessons: Lesson[]
}

export interface Subject {
  id: string
  name: string
  /**
   * Предмет курса — русское название из реестра (lib/subjects.ts): «Корейский»,
   * «Химия». Это НЕ `name`: там заголовок курса («ВРЕМЕННЫЙ ТЕСТ — Корейский»),
   * и `id` тоже не годится — это short_id курса.
   *
   * Нужен, чтобы экран знал, какой предмет открыт, а не только какой курс. Без
   * него тренажёр резолвил предмет по short_id курса, никогда не попадал в
   * реестр и ученику-языковику показывал банк заданий ЕГЭ.
   */
  subject?: string
  progress: number
  modules: Module[]
  activeModuleId: number
  // How lessons open for the viewing student (from course_enrollments):
  //   'custom'  — only teacher-unlocked lessons open (default)
  //   'full'    — every lesson open
  //   'by_date' — lessons open once their scheduled date has passed
  accessMode?: 'full' | 'custom' | 'by_date'
  // Which of the viewing person's student rows owns THIS course's enrollment —
  // the row the teacher grades against (matched via student_ids, else the row in
  // the course's group). Progress writes for this course must use this id, not
  // the active session row, so a multi-subject/multi-group person's submissions
  // land under the row the teacher actually reads. Undefined → use session.id.
  ownerStudentId?: string
}

export type ScheduleLesson = {
  id: string
  subject: string
  lessonTitle: string
  lessonNumber: number
  time: string
  /** 'rec' = live session / recording, 'lesson' = lesson opening. */
  kind?: 'rec' | 'lesson'
  upcoming?: boolean
  minutesUntil?: number
  passed?: boolean
}

export type ScheduleDay = {
  date: string
  label: string
  isToday: boolean
  lessons: ScheduleLesson[]
}

export interface ScienceFact {
  id: string
  subject: 'Химия' | 'Биология'
  emoji: string
  text: string
  gradient: string
  image: string
}

export const scienceFactInterval = 20

export interface ScienceMeme {
  id: string
  subject: 'Химия' | 'Биология'
  emoji: string
  setup: string
  punchline: string
  gradient: string
}

export const scienceMemeInterval = 16

export interface CourseReaction {
  id: string
  equation: string
  name: string
  lesson: string
  module?: string
  emoji: string
  gradient: string
  paragraph: string
}

export const courseReactionInterval = 14

export const quizTimeLimit = 20

export type QuizAnswer = { id: string; text: string; correct?: boolean }
export type QuizQuestion = { id: string; title: string; subject: string; answers: QuizAnswer[] }
