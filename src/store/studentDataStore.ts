import { create } from 'zustand'
import {
  fetchScheduleDays,
  fetchLessonProgress,
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
  student as mockStudent,
  scheduleDays as mockScheduleDays,
  scheduleTodayIndex as mockTodayIndex,
  subjects as mockSubjects,
  quizQuestions as mockQuizQuestions,
  scienceFacts as mockFacts,
  scienceMemes as mockMemes,
  courseReactions as mockReactions,
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
  performance: mockStudent.stats.performance,
  completedTasks: mockStudent.stats.completedTasks,
  totalTasks: mockStudent.stats.totalTasks,
  avgScore: mockStudent.stats.avgScore,
  streak: mockStudent.stats.streak,
  totalPoints: mockStudent.stats.totalPoints,
  stars: 2,
}

export const useStudentData = create<StudentDataState>((set) => ({
  loaded: false,
  subjects: mockSubjects,
  scheduleDays: mockScheduleDays,
  scheduleTodayIndex: mockTodayIndex,
  stats: defaultStats,
  quizQuestions: mockQuizQuestions,
  scienceFacts: mockFacts,
  scienceMemes: mockMemes,
  courseReactions: mockReactions,

  load: async () => {
    const session = getStudentSession()
    if (!session) return

    const [progress, schedule, quizQ, facts, memes, reactions] = await Promise.all([
      fetchLessonProgress(session.id),
      fetchScheduleDays(session.groupId),
      fetchQuizQuestions(),
      fetchScienceFacts(),
      fetchScienceMemes(),
      fetchCourseReactions(),
    ])

    const mergedSubjects = mergeSubjectsWithProgress(progress)
    const stats = computeStats(progress)
    const todayIdx = schedule.findIndex(d => d.isToday)

    set({
      loaded: true,
      subjects: mergedSubjects,
      scheduleDays: schedule.length > 0 ? schedule : mockScheduleDays,
      scheduleTodayIndex: schedule.length > 0 ? (todayIdx >= 0 ? todayIdx : mockTodayIndex) : mockTodayIndex,
      stats: Object.keys(progress).length > 0 ? stats : defaultStats,
      quizQuestions: quizQ.length > 0 ? quizQ : mockQuizQuestions,
      scienceFacts: facts.length > 0 ? facts : mockFacts,
      scienceMemes: memes.length > 0 ? memes : mockMemes,
      courseReactions: reactions.length > 0 ? reactions : mockReactions,
    })
  },
}))
