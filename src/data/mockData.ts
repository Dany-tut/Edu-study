export type LessonStatus = 'completed' | 'returned' | 'unviewed' | 'submitted' | 'current' | 'locked'
export type LessonShape = 'circle' | 'square' | 'diamond'

export interface Lesson {
  id: string
  title: string
  number: number
  status: LessonStatus
  shape: LessonShape
  points?: number
  comment?: string
  subject: string
  /** DB-authored konspekt + homework override (from lessons.content). */
  content?: import('./lessonContent').LessonContentData
  /** "Запись" tab — recording video (RuTube embed id parsed from the URL). */
  videoId?: string
  /** "Запись" tab — video chapter timecodes. */
  timecodes?: import('./lessonContent').LessonTimecode[]
}

export interface Module {
  id: number
  label: string
  lessons: Lesson[]
}

export interface Subject {
  id: string
  name: string
  progress: number
  modules: Module[]
  activeModuleId: number
}

export type ScheduleLesson = {
  id: string
  subject: string
  lessonTitle: string
  lessonNumber: number
  time: string
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
