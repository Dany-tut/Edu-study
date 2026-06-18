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
import { useDashboard } from './dashboardStore'
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

export const useStudentData = create<StudentDataState>((set, get) => ({
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

    // First load after a (re)mount — used to seed the active subject/module from
    // the freshly-loaded data. Realtime re-syncs leave the user's current tab put.
    const firstLoad = !get().loaded

    const [progress, schedule, catalog, quizQ, facts, memes, reactions] = await Promise.all([
      fetchLessonProgress(session.id),
      fetchScheduleDays(session.groupId, session.id),
      fetchCourseStructure(session.id, session.groupId),
      fetchQuizQuestions(),
      fetchScienceFacts(),
      fetchScienceMemes(),
      fetchCourseReactions(),
    ])

    const mergedSubjects = mergeSubjectsWithProgress(catalog, progress)
    const stats = computeStats(progress)
    const todayIdx = schedule.findIndex(d => d.isToday)

    // Reconcile hard-level (essay) verdicts from `lesson_progress` into the
    // dashboard store. The hard status (satellite badge + homework screen) is
    // otherwise local-only — set to 'submitted' when the student submits — so
    // the teacher's accept/return (which updates the `${ref}-hard` row) would
    // never reach the student without this sync.
    {
      const dash = useDashboard.getState()
      for (const [ref, p] of Object.entries(progress)) {
        if (!ref.endsWith('-hard')) continue
        if (p.status === 'submitted' || p.status === 'returned' || p.status === 'completed') {
          dash.setHardStatus(ref.slice(0, -'-hard'.length), p.status)
        }
      }
    }

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

    // The dashboard store's active subject/module aren't persisted, so on every
    // refresh they reset to placeholder defaults (`activeModuleId: 1`, which —
    // since module ids are positions — always points at the FIRST module). Seed
    // them from the loaded data so the track lands on the module that actually
    // holds the current lesson instead of always snapping back to Module 1.
    if (firstLoad && mergedSubjects.length > 0) {
      const dash = useDashboard.getState()
      const target = mergedSubjects.find(s => s.id === dash.activeSubjectId) ?? mergedSubjects[0]
      dash.setActiveSubject(target.id)
    }
  },
}))
