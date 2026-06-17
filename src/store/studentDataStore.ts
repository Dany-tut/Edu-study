import { create } from 'zustand'
import {
  fetchScheduleDays,
  fetchLessonProgress,
  fetchCourseStructure,
  mergeSubjectsWithProgress,
  computeStats,
  fetchQuizQuestions,
  fetchScienceFacts,
  fetchScienceMemes,
  fetchCourseReactions,
  type StudentStats,
} from '../lib/db'
import { getStudentSession } from '../lib/studentSession'
import {
  type Subject,
  type ScheduleDay,
  type QuizQuestion,
  type ScienceFact,
  type ScienceMeme,
  type CourseReaction,
} from '../data/mockData'

interface StudentDataState {
  loaded: boolean
  subjects: Subject[]
  scheduleDays: ScheduleDay[]
  scheduleTodayIndex: number
  stats: StudentStats
  quizQuestions: QuizQuestion[]
  scienceFacts: ScienceFact[]
  scienceMemes: ScienceMeme[]
  courseReactions: CourseReaction[]
  load: () => Promise<void>
}

const defaultStats: StudentStats = {
  performance: 0,
  completedTasks: 0,
  totalTasks: 0,
  avgScore: 0,
  streak: 0,
  totalPoints: 0,
  stars: 0,
}

export const useStudentData = create<StudentDataState>((set) => ({
  loaded: false,
  subjects: [],
  scheduleDays: [],
  scheduleTodayIndex: 3,
  stats: defaultStats,
  quizQuestions: [],
  scienceFacts: [],
  scienceMemes: [],
  courseReactions: [],

  load: async () => {
    const session = getStudentSession()
    if (!session) return

    const [progress, schedule, catalog, quizQ, facts, memes, reactions] = await Promise.all([
      fetchLessonProgress(session.id),
      fetchScheduleDays(session.groupId),
      fetchCourseStructure(session.id, session.groupId),
      fetchQuizQuestions(),
      fetchScienceFacts(),
      fetchScienceMemes(),
      fetchCourseReactions(),
    ])

    const mergedSubjects = mergeSubjectsWithProgress(catalog, progress)
    const stats = computeStats(progress)
    const todayIdx = schedule.findIndex(d => d.isToday)

    set({
      loaded: true,
      subjects: mergedSubjects,
      scheduleDays: schedule,
      scheduleTodayIndex: todayIdx >= 0 ? todayIdx : 3,
      stats,
      quizQuestions: quizQ,
      scienceFacts: facts,
      scienceMemes: memes,
      courseReactions: reactions,
    })
  },
}))
