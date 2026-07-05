import { create } from 'zustand'
import {
  fetchScheduleDays,
  fetchLessonProgress,
  fetchCourseStructure,
  fetchPersonScope,
  mergeSubjectsWithProgress,
  computeStats,
  fetchQuizQuestions,
  fetchScienceFacts,
  fetchScienceMemes,
  fetchCourseReactions,
  type StudentStats,
} from '../lib/db'
import { fetchStandaloneSubject } from '../lib/standaloneHomework'
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

    // allSettled (not Promise.all): one failing request must NOT reject the whole
    // load and leave `loaded:false` forever — that strands the dashboard on an
    // infinite "Загрузка…" spinner (a dead white screen for the student). Each
    // slice falls back to an empty value so the UI renders whatever succeeded.
    // Resolve the person's full scope (all their student rows + groups) so the
    // track shows every course they have — including ones assigned to a group
    // they were later enrolled into — not just the active subject session.
    const scope = await fetchPersonScope({ id: session.id, groupId: session.groupId })

    const results = await Promise.allSettled([
      fetchLessonProgress(scope.studentIds),
      fetchScheduleDays(session.groupId, session.id),
      fetchCourseStructure(scope.studentIds, scope.groupIds),
      fetchQuizQuestions(),
      fetchScienceFacts(),
      fetchScienceMemes(),
      fetchCourseReactions(),
      fetchStandaloneSubject(session.groupId),
    ])
    const val = <T,>(i: number, fallback: T): T =>
      results[i].status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<T>).value : fallback
    const progress  = val(0, {} as Awaited<ReturnType<typeof fetchLessonProgress>>)
    const schedule  = val(1, [] as Awaited<ReturnType<typeof fetchScheduleDays>>)
    const catalog   = val(2, [] as Awaited<ReturnType<typeof fetchCourseStructure>>)
    const quizQ     = val(3, [] as Awaited<ReturnType<typeof fetchQuizQuestions>>)
    const facts     = val(4, [] as Awaited<ReturnType<typeof fetchScienceFacts>>)
    const memes     = val(5, [] as Awaited<ReturnType<typeof fetchScienceMemes>>)
    const reactions = val(6, [] as Awaited<ReturnType<typeof fetchCourseReactions>>)
    const hwSubject = val(7, null as Awaited<ReturnType<typeof fetchStandaloneSubject>>)

    // Standalone-ДЗ (вне курса) — отдельный предмет-трек «Домашние задания» со
    // своей нумерацией. Кладём в каталог ДО merge, чтобы прогресс/статусы
    // (в т.ч. сдано/возвращено) применились к его нодам так же, как к курсовым.
    const fullCatalog = hwSubject ? [...catalog, hwSubject] : catalog

    let mergedSubjects = mergeSubjectsWithProgress(fullCatalog, progress)
    let stats = computeStats(progress)
    let scheduleDays = schedule

    // Demo data so the UI can be reviewed without a teacher-authored course.
    // Local dev only — OR a production build explicitly forced with ?demo=1.
    // A bare ?demo no longer triggers it in prod, so a real student with an
    // empty course never sees demo content mistaken for a bug.
    const demoFlag = (() => {
      try { return new URLSearchParams(window.location.search).get('demo') === '1' } catch { return false }
    })()
    if ((import.meta.env.DEV || demoFlag) && mergedSubjects.length === 0) {
      // Guard the dynamic import: a stale chunk hash after a deploy makes this
      // reject ("Failed to fetch dynamically imported module"). Swallow it so
      // the student still gets a rendered (empty-state) dashboard, not a crash.
      try {
        const { DEMO_SUBJECTS, DEMO_SCHEDULE, DEMO_STATS } = await import('../data/devStudentDemo')
        mergedSubjects = DEMO_SUBJECTS
        scheduleDays = DEMO_SCHEDULE
        stats = DEMO_STATS
      } catch { /* demo data unavailable — render empty state */ }
    }

    const todayIdx = scheduleDays.findIndex(d => d.isToday)

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
          dash.setHardStatus(ref.slice(0, -'-hard'.length), p.status, p.reviewComment, p.reviewAttachments, p.hardReviewBlocks, p.score)
        }
      }
    }

    set({
      loaded: true,
      subjects: mergedSubjects,
      scheduleDays,
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
