import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { type ScheduleLesson } from '../data/mockData'
import { resolveScheduleLesson, findChemistryLessonByTitle } from '../lib/db'
import type { HardTaskReviewBlock } from '../lib/useHomework'
import { useStudentData } from './studentDataStore'
import { DEFAULT_WIDGET_ORDER } from '../data/widgets'

// The top-level views the navigation switches between. 'home' is the dashboard,
// 'courses' is the lesson catalogue (screen 3), 'lesson' is a single lesson with
// its player + materials (screen 2), 'homework' is the dedicated homework page.
export type AppPage = 'home' | 'courses' | 'lesson' | 'homework' | 'trainer' | 'profile'

export interface HomeworkWidgetFeedback {
  lessonTitle: string
  answered: number
  total: number
  correct: number
  lastQuestionIndex: number
  lastCorrect: boolean
  lastTitle: string
  lastMessage: string
}

interface DashboardState {
  // Which top-level page is showing. Driven by the "Главная" / "Курсы" nav items
  // and by the "Открыть урок" entry points (track popover, schedule card).
  activePage: AppPage
  setActivePage: (p: AppPage) => void
  // When the user opens Courses via a specific lesson (e.g. returning from a
  // lesson) we remember which lesson so the catalogue can preselect that lesson's
  // subject + module and highlight the card. Null = opened as the general list.
  coursesFocusLessonId: string | null
  // Open the Courses page. Pass a lessonId to jump straight to that lesson's
  // subject/module with the card highlighted; omit it for the general list.
  openCourses: (lessonId?: string) => void

  // The lesson currently open on the lesson page (screen 2), or null.
  currentLessonId: string | null
  // Where the lesson page's "Назад" button returns to — the page we came from.
  lessonReturnPage: 'home' | 'courses'
  // Open a lesson on the dedicated lesson page (screen 2). Remembers the current
  // page so "Назад" can return to it.
  openLesson: (lessonId: string) => void
  // Leave the lesson page, returning to wherever it was opened from.
  closeLesson: () => void
  // True once the lesson page has been scrolled past a small threshold. Drives
  // the topbar collapsing into its mini form and the Back/title/date row docking
  // onto the topbar line. Transient (not persisted).
  lessonScrolled: boolean
  setLessonScrolled: (v: boolean) => void
  // Whether the top bar is currently in its mini (icons-only) form. Mirrored
  // from the Sidebar so other surfaces (e.g. the docked lesson date pill) can
  // react to it. Transient (not persisted).
  topBarCompact: boolean
  setTopBarCompact: (v: boolean) => void
  // Viewport-space left/right edges of the centered top bar pill, reported by
  // the Sidebar. Lets the docked lesson title cap its width so it truncates
  // before colliding with the bar. Transient (not persisted).
  topBarBox: { left: number; right: number } | null
  setTopBarBox: (v: { left: number; right: number } | null) => void
  // Open homework as its own page, preserving the current lesson context so the
  // student can return to the same lesson via the top bar.
  openHomework: () => void
  openHomeworkForLesson: (lessonId: string) => void
  closeHomework: () => void
  homeworkWidgetFeedback: HomeworkWidgetFeedback | null
  setHomeworkWidgetFeedback: (feedback: HomeworkWidgetFeedback) => void
  clearHomeworkWidgetFeedback: () => void
  // Transient flight event: a green/red chip animates from the answered question
  // to the compact widget pill so the student knows where feedback lands.
  answerFlight: { id: number; correct: boolean; fromX: number; fromY: number } | null
  setAnswerFlight: (v: { id: number; correct: boolean; fromX: number; fromY: number }) => void
  clearAnswerFlight: () => void
  // Reaction whose paragraph should be highlighted + scrolled into view inside
  // the lesson page's "Конспект". Set when a student opens a lesson from the
  // reactions widget; cleared once the lesson page acknowledges it.
  highlightReactionId: string | null
  openLessonForReaction: (reactionId: string) => void
  clearHighlightReaction: () => void
  // Lesson id to highlight on the course track. Driven by schedule-card
  // selection; the matching CourseNode renders an emphasis ring.
  highlightLessonId: string | null
  // Mirror a schedule selection onto the course track: switch to the lesson's
  // subject + module and persistently highlight its node until cleared. Called
  // when the student picks a lesson row inside a schedule day card.
  previewScheduleLesson: (lesson: ScheduleLesson) => void
  // Drop the schedule-driven highlight (deselected in the schedule, or moved off
  // the centered day).
  clearTrackHighlight: () => void

  activeSubjectId: string
  setActiveSubject: (id: string) => void
  activeModuleId: number
  setActiveModule: (id: number) => void
  avatarId: string
  setAvatarId: (id: string) => void
  scheduleIndex: number
  setScheduleIndex: (idx: number) => void
  quizDismissed: boolean
  dismissQuiz: () => void
  // Question index to resume the quiz from on the next entry. Set when the user
  // stops mid-quiz so the unanswered question reappears next session instead of
  // being penalised or repeated right away. Reset to 0 once the quiz is finished.
  quizResumeIndex: number
  setQuizResumeIndex: (i: number) => void
  showAllSubjects: boolean
  setShowAllSubjects: (v: boolean) => void
  // How many widget blocks sit side-by-side per row in the widget carousel.
  // Chosen from the avatar → Настройки → Виджеты menu. Default 1 (one wide card).
  widgetColumns: WidgetColumns
  setWidgetColumns: (n: WidgetColumns) => void
  // Display sequence of the carousel widgets, as an array of widget ids. Edited
  // graphically in the avatar → Настройки → "Настроить порядок" modal.
  widgetOrder: number[]
  setWidgetOrder: (order: number[]) => void
  // True while a course-track lesson popover is open. Used to lift the track
  // above the quiz overlay so the quiz card's shadow doesn't fall on the popover.
  trackPopoverOpen: boolean
  setTrackPopoverOpen: (v: boolean) => void

  // Homework self-assessment results, keyed by lessonId.
  lessonAssessments: Record<string, { score: number; emojiIndex: number; hardAvailable?: boolean; hardCompleted?: boolean; hardStatus?: 'submitted' | 'returned' | 'completed'; hardComment?: string; hardReviewPhotos?: string[]; hardReviewBoard?: string | null; hardReviewAnnotation?: { image: string; w: number; h: number } | null; hardReviewBlocks?: HardTaskReviewBlock[] }>
  setLessonAssessment: (lessonId: string, score: number, emojiIndex: number, hardAvailable?: boolean) => void
  setHardCompleted: (lessonId: string) => void
  setHardStatus: (lessonId: string, status: 'submitted' | 'returned' | 'completed', comment?: string, reviewAttachments?: { photos: string[]; board: string | null; annotation?: { image: string; w: number; h: number } | null }, reviewBlocks?: HardTaskReviewBlock[]) => void

  // Pomodoro focus timer. Kept in the store (with a module-level interval) so it
  // keeps ticking even when the widget is swiped off-screen and unmounts.
  pomoMode: PomoMode
  // Which clock is running: a counting-down timer (Pomodoro presets) or a
  // free-running count-up stopwatch ("секундомер").
  pomoTimerMode: PomoTimerMode
  pomoSecondsLeft: number
  // Elapsed seconds for the stopwatch — counts up while running.
  pomoStopwatchSeconds: number
  // The focus length chosen via the preset chips (5/10/15/20/25 min), in
  // seconds. Drives the focus countdown and what "Повторить" resets to.
  pomoFocusDuration: number
  pomoRunning: boolean
  pomoCompleted: number
  pomoStart: () => void
  pomoPause: () => void
  pomoReset: () => void
  pomoSwitchMode: (mode: PomoMode) => void
  // Pick a focus-length preset (minutes); switches to timer mode and re-arms.
  pomoSetPreset: (minutes: number) => void
  // Flip between the countdown timer and the count-up stopwatch.
  pomoSetTimerMode: (mode: PomoTimerMode) => void
}

export type WidgetColumns = 1 | 2 | 3
export type PomoMode = 'focus' | 'break'
export type PomoTimerMode = 'timer' | 'stopwatch'
export const POMO_DURATIONS: Record<PomoMode, number> = { focus: 25 * 60, break: 5 * 60 }

export const useDashboard = create<DashboardState>()(persist((set) => ({
  activePage: 'home',
  setActivePage: (p) => set({ activePage: p }),
  coursesFocusLessonId: null,
  openCourses: (lessonId) => {
    if (!lessonId) {
      set({ activePage: 'courses', coursesFocusLessonId: null })
      return
    }
    // Preselect the subject (and its active module) that owns the lesson so the
    // catalogue lands on the right tab; the page itself handles the highlight.
    const liveSubjects = useStudentData.getState().subjects
    const subj = liveSubjects.find(s => s.modules.some(m => m.lessons.some(l => l.id === lessonId)))
    const mod = subj?.modules.find(m => m.lessons.some(l => l.id === lessonId))
    set({
      activePage: 'courses',
      coursesFocusLessonId: lessonId,
      ...(subj ? { activeSubjectId: subj.id, activeModuleId: mod?.id ?? subj.activeModuleId } : {}),
    })
  },

  currentLessonId: null,
  lessonReturnPage: 'home',
  openLesson: (lessonId) => set((s) => {
    // Preselect the lesson's subject/module so returning to the catalogue lands
    // on the right tab. Remember the current page for the "Назад" button (a
    // lesson opened from another lesson keeps the original return target).
    const liveSubjects = useStudentData.getState().subjects
    const subj = liveSubjects.find(su => su.modules.some(m => m.lessons.some(l => l.id === lessonId)))
    const mod = subj?.modules.find(m => m.lessons.some(l => l.id === lessonId))
    return {
      activePage: 'lesson',
      currentLessonId: lessonId,
      lessonScrolled: false,
      lessonReturnPage: s.activePage === 'lesson' ? s.lessonReturnPage : (s.activePage === 'courses' ? 'courses' : 'home'),
      ...(subj ? { activeSubjectId: subj.id, activeModuleId: mod?.id ?? subj.activeModuleId } : {}),
    }
  }),
  lessonScrolled: false,
  setLessonScrolled: (v) => set((s) => (s.lessonScrolled === v ? {} : { lessonScrolled: v })),
  topBarCompact: false,
  setTopBarCompact: (v) => set((s) => (s.topBarCompact === v ? {} : { topBarCompact: v })),
  topBarBox: null,
  setTopBarBox: (v) => set((s) => (
    s.topBarBox?.left === v?.left && s.topBarBox?.right === v?.right ? {} : { topBarBox: v }
  )),
  closeLesson: () => set((s) =>
    s.lessonReturnPage === 'courses'
      ? { activePage: 'courses', coursesFocusLessonId: s.currentLessonId, highlightReactionId: null, homeworkWidgetFeedback: null, lessonScrolled: false }
      : { activePage: 'home', highlightReactionId: null, homeworkWidgetFeedback: null, lessonScrolled: false },
  ),
  openHomework: () => set((s) => (
    s.currentLessonId
      ? { activePage: 'homework', lessonScrolled: false }
      : { activePage: s.activePage }
  )),
  openHomeworkForLesson: (lessonId) => {
    useDashboard.getState().openLesson(lessonId)
    set({ activePage: 'homework', lessonScrolled: false })
  },
  closeHomework: () => set((s) => (
    s.currentLessonId
      ? { activePage: 'lesson', lessonScrolled: false }
      : { activePage: s.lessonReturnPage === 'courses' ? 'courses' : 'home', lessonScrolled: false }
  )),
  homeworkWidgetFeedback: null,
  setHomeworkWidgetFeedback: (feedback) => set({ homeworkWidgetFeedback: feedback }),
  clearHomeworkWidgetFeedback: () => set({ homeworkWidgetFeedback: null }),
  answerFlight: null,
  setAnswerFlight: (v) => set({ answerFlight: v }),
  clearAnswerFlight: () => set({ answerFlight: null }),

  highlightReactionId: null,
  openLessonForReaction: (reactionId) => {
    const reactions = useStudentData.getState().courseReactions
    const reaction = reactions.find(r => r.id === reactionId)
    if (!reaction) return
    const found = findChemistryLessonByTitle(reaction.lesson, useStudentData.getState().subjects)
    if (!found) return
    // Reuse openLesson so we get the same return-page bookkeeping + subject/module
    // preselection. Open at the top without any paragraph highlight.
    useDashboard.getState().openLesson(found.lesson.id)
  },
  clearHighlightReaction: () => set({ highlightReactionId: null }),

  highlightLessonId: null,
  previewScheduleLesson: (lesson) => {
    const liveSubjects = useStudentData.getState().subjects
    const { subjectId, lesson: match } = resolveScheduleLesson(lesson, liveSubjects)
    if (!subjectId) return
    const subj = liveSubjects.find(s => s.id === subjectId)
    if (!subj) return
    const mod = match
      ? subj.modules.find(m => m.lessons.some(l => l.id === match.id))
      : null
    set({
      activeSubjectId: subjectId,
      activeModuleId: mod?.id ?? subj.activeModuleId,
      highlightLessonId: match?.id ?? null,
    })
  },
  clearTrackHighlight: () => set({ highlightLessonId: null }),

  activeSubjectId: 'chemistry',
  setActiveSubject: (id) => {
    const subj = useStudentData.getState().subjects.find(s => s.id === id)
    set({ activeSubjectId: id, activeModuleId: subj?.activeModuleId ?? 1 })
  },
  activeModuleId: 1,
  setActiveModule: (id) => set({ activeModuleId: id }),
  avatarId: 'flower',
  setAvatarId: (id) => set({ avatarId: id }),
  scheduleIndex: 3,
  setScheduleIndex: (idx) => set({ scheduleIndex: idx }),
  quizDismissed: false,
  dismissQuiz: () => set({ quizDismissed: true }),
  quizResumeIndex: 0,
  setQuizResumeIndex: (i) => set({ quizResumeIndex: i }),
  showAllSubjects: false,
  setShowAllSubjects: (v) => set({ showAllSubjects: v }),
  widgetColumns: 2,
  setWidgetColumns: (n) => set({ widgetColumns: n }),
  widgetOrder: DEFAULT_WIDGET_ORDER,
  setWidgetOrder: (order) => set({ widgetOrder: order }),
  trackPopoverOpen: false,
  setTrackPopoverOpen: (v) => set({ trackPopoverOpen: v }),

  lessonAssessments: {} as Record<string, { score: number; emojiIndex: number; hardAvailable?: boolean; hardCompleted?: boolean; hardStatus?: 'submitted' | 'returned' | 'completed'; hardComment?: string; hardReviewPhotos?: string[]; hardReviewBoard?: string | null; hardReviewAnnotation?: { image: string; w: number; h: number } | null; hardReviewBlocks?: HardTaskReviewBlock[] }>,
  setLessonAssessment: (lessonId, score, emojiIndex, hardAvailable) =>
    set((s) => ({ lessonAssessments: { ...s.lessonAssessments, [lessonId]: { ...s.lessonAssessments[lessonId], score, emojiIndex, hardAvailable } } })),
  setHardCompleted: (lessonId) =>
    set((s) => ({ lessonAssessments: { ...s.lessonAssessments, [lessonId]: { ...s.lessonAssessments[lessonId], hardCompleted: true, hardStatus: 'submitted' as const } } })),
  setHardStatus: (lessonId, status, comment, reviewAttachments, reviewBlocks) =>
    set((s) => ({ lessonAssessments: { ...s.lessonAssessments, [lessonId]: {
      ...s.lessonAssessments[lessonId],
      hardStatus: status,
      hardCompleted: status === 'completed',
      hardComment: comment ?? s.lessonAssessments[lessonId]?.hardComment,
      hardReviewPhotos: reviewAttachments ? reviewAttachments.photos : s.lessonAssessments[lessonId]?.hardReviewPhotos,
      hardReviewBoard: reviewAttachments ? reviewAttachments.board : s.lessonAssessments[lessonId]?.hardReviewBoard,
      hardReviewAnnotation: reviewAttachments ? (reviewAttachments.annotation ?? null) : s.lessonAssessments[lessonId]?.hardReviewAnnotation,
      hardReviewBlocks: reviewBlocks && reviewBlocks.length ? reviewBlocks : s.lessonAssessments[lessonId]?.hardReviewBlocks,
    } } })),

  pomoMode: 'focus',
  pomoTimerMode: 'timer',
  pomoSecondsLeft: POMO_DURATIONS.focus,
  pomoStopwatchSeconds: 0,
  pomoFocusDuration: POMO_DURATIONS.focus,
  pomoRunning: false,
  pomoCompleted: 0,
  pomoStart: () => {
    if (useDashboard.getState().pomoRunning) return
    set({ pomoRunning: true })
    startPomoTimer()
  },
  pomoPause: () => {
    stopPomoTimer()
    set({ pomoRunning: false })
  },
  pomoReset: () => {
    stopPomoTimer()
    const { pomoMode, pomoTimerMode, pomoFocusDuration } = useDashboard.getState()
    if (pomoTimerMode === 'stopwatch') {
      set({ pomoRunning: false, pomoStopwatchSeconds: 0 })
      return
    }
    const target = pomoMode === 'focus' ? pomoFocusDuration : POMO_DURATIONS.break
    set({ pomoRunning: false, pomoSecondsLeft: target })
  },
  pomoSwitchMode: (mode) => {
    stopPomoTimer()
    const { pomoFocusDuration } = useDashboard.getState()
    const target = mode === 'focus' ? pomoFocusDuration : POMO_DURATIONS.break
    set({ pomoMode: mode, pomoRunning: false, pomoSecondsLeft: target })
  },
  pomoSetPreset: (minutes) => {
    stopPomoTimer()
    const secs = minutes * 60
    set({
      pomoTimerMode: 'timer',
      pomoMode: 'focus',
      pomoFocusDuration: secs,
      pomoSecondsLeft: secs,
      pomoRunning: false,
    })
  },
  pomoSetTimerMode: (mode) => {
    stopPomoTimer()
    set({ pomoTimerMode: mode, pomoRunning: false })
  },
}), {
  name: 'student-dashboard-preferences',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    avatarId: state.avatarId,
    widgetColumns: state.widgetColumns,
    widgetOrder: state.widgetOrder,
    pomoTimerMode: state.pomoTimerMode,
    pomoFocusDuration: state.pomoFocusDuration,
    lessonAssessments: state.lessonAssessments,
  }),
  merge: (persisted: unknown, current) => {
    const p = persisted as Partial<DashboardState>
    const saved = p?.widgetOrder ?? DEFAULT_WIDGET_ORDER
    // Append any widget IDs added since the user's stored order was saved
    const missing = DEFAULT_WIDGET_ORDER.filter(id => !saved.includes(id))
    return { ...current, ...p, widgetOrder: [...saved, ...missing] }
  },
}))

// Module-level interval so the countdown survives the widget unmounting when the
// user swipes to another widget.
let pomoInterval: ReturnType<typeof setInterval> | null = null

function stopPomoTimer() {
  if (pomoInterval !== null) {
    clearInterval(pomoInterval)
    pomoInterval = null
  }
}

function startPomoTimer() {
  stopPomoTimer()
  pomoInterval = setInterval(() => {
    const state = useDashboard.getState()
    // Stopwatch simply counts up with no terminal condition.
    if (state.pomoTimerMode === 'stopwatch') {
      useDashboard.setState({ pomoStopwatchSeconds: state.pomoStopwatchSeconds + 1 })
      return
    }
    const { pomoSecondsLeft, pomoMode, pomoCompleted, pomoFocusDuration } = state
    if (pomoSecondsLeft <= 1) {
      // Session finished — auto-switch mode and wait for the user to start it.
      stopPomoTimer()
      const nextMode: PomoMode = pomoMode === 'focus' ? 'break' : 'focus'
      useDashboard.setState({
        pomoRunning: false,
        pomoMode: nextMode,
        pomoSecondsLeft: nextMode === 'focus' ? pomoFocusDuration : POMO_DURATIONS.break,
        pomoCompleted: pomoMode === 'focus' ? pomoCompleted + 1 : pomoCompleted,
      })
      return
    }
    useDashboard.setState({ pomoSecondsLeft: pomoSecondsLeft - 1 })
  }, 1000)
}
