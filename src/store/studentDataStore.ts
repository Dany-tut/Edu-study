import { create } from 'zustand'
import {
  fetchScheduleDays,
  fetchLessonProgress,
  fetchCourseStructure,
  fetchLessonsHeavy,
  withBankHard,
  type LessonHeavy,
  fetchPersonScope,
  mergeSubjectsWithProgress,
  computeStats,
  fetchQuizQuestions,
  fetchScienceFacts,
  fetchScienceMemes,
  fetchCourseReactions,
  type StudentStats,
  type ProgressMap,
} from '../lib/db'
import { fetchStandaloneSubject, HW_SUBJECT_ID } from '../lib/standaloneHomework'
import { getStudentSession } from '../lib/studentSession'
import { loadApLessons } from '../data/apLessonChunk'
import { getSubject } from '../lib/subjects'
import { reconcileLocalHomework, reconcileCourseReset, courseResetRef } from '../lib/homeworkReset'
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
  /**
   * Сырая карта прогресса по всем строкам ученика — нужна для статистики по
   * одному курсу (`computeSubjectStats`): звёзды живут в отдельных строках
   * `${lessonId}-hard`, до уроков курса они не доезжают.
   */
  progress: ProgressMap
  quizQuestions: QuizQuestion[]
  scienceFacts: ScienceFact[]
  scienceMemes: ScienceMeme[]
  courseReactions: CourseReaction[]
  load: () => Promise<void>
  /**
   * Догрузить конспект и домашку конкретного урока — вызывается при его
   * открытии. Идемпотентно: уже приехавший или уже летящий урок второго
   * запроса не порождает.
   */
  ensureLessonHeavy: (lessonId: string) => void
  /**
   * Префетч окна вокруг места ученика в ОДНОМ курсе — том, что открыт. Зовётся
   * на загрузке и при смене курса.
   */
  prefetchCourseHeavy: (subjectId: string | undefined) => void
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
  progress: {},
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

    // Шесть из восьми запросов кабинета охвата НЕ ждут: расписание и внекурсовое
    // ДЗ знают группу из сессии, а викторина, факты, мемы и реакции вообще ничьи.
    // Раньше они всё равно стояли за `await fetchPersonScope` — в таймингах это
    // было видно двумя волнами, 395 мс и 700 мс. Запускаем их СРАЗУ, а охвата
    // ждут только те двое, кому он правда нужен.
    const scopeP = fetchPersonScope({ id: session.id, groupId: session.groupId })
    const scheduleP = fetchScheduleDays(session.groupId, session.id)
    const quizP = fetchQuizQuestions()
    const factsP = fetchScienceFacts()
    const memesP = fetchScienceMemes()
    const reactionsP = fetchCourseReactions()
    const hwP = fetchStandaloneSubject(session.groupId)

    // Охват — все строки ученика и его группы: трек должен показать ВСЕ его
    // курсы, включая назначенные группе, в которую его записали позже, а не
    // только курс активной сессии.
    const scope = await scopeP

    // allSettled (not Promise.all): one failing request must NOT reject the whole
    // load and leave `loaded:false` forever — that strands the dashboard on an
    // infinite "Загрузка…" spinner (a dead white screen for the student). Each
    // slice falls back to an empty value so the UI renders whatever succeeded.
    const results = await Promise.allSettled([
      fetchLessonProgress(scope.studentIds),
      scheduleP,
      fetchCourseStructure(scope.rows),
      quizP,
      factsP,
      memesP,
      reactionsP,
      hwP,
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

    // Учитель обнулил курс → строк прогресса в базе нет, но домашка ученика
    // живёт ещё и в браузере (ответы, балл, самооценка, просмотр записи), и
    // экран продолжал показывать «Домашка сдана · 25 из 100» поверх пустого
    // курса. Сверяем: нет строки — нет и сдачи (подробности и оговорки в
    // lib/homeworkReset.ts). Только когда база РЕАЛЬНО ответила: упавший запрос
    // даёт ту же пустую карту, и стирать по ней ответы нельзя.
    if (results[0].status === 'fulfilled') {
      const wiped: string[] = []
      // 1. Прямая отметка учителя «курс обнулён такого-то числа». Она говорит то,
      // чего не выведешь из отсутствия строк, поэтому стирает и НЕДОДЕЛАННЫЕ
      // черновики: курс начат заново целиком.
      for (const subj of fullCatalog) {
        const at = Date.parse(progress[courseResetRef(subj.id)]?.comment ?? '')
        if (!Number.isFinite(at)) continue
        wiped.push(...reconcileCourseReset(subj.modules.flatMap(m => m.lessons.map(l => l.id)), at))
      }
      // 2. Сброс без отметки (сделанный до этой правки или чужой рукой): локально
      // «сдано», а в базе следов сдачи нет. Не всякая строка — сдача: у открытого
      // учителем урока она есть со статусом 'current' и пустым баллом.
      const lessonIds = fullCatalog.flatMap(s => s.modules.flatMap(m => m.lessons.map(l => l.id)))
      const submittedRefs = new Set(
        Object.entries(progress)
          .filter(([, p]) => p.status === 'submitted' || p.status === 'returned'
            || p.status === 'completed' || (p.score ?? 0) > 0)
          .map(([ref]) => ref),
      )
      wiped.push(...reconcileLocalHomework(lessonIds, submittedRefs))
      if (wiped.length > 0) useDashboard.getState().forgetLessons([...new Set(wiped)])
    }

    // Demo data so the UI can be reviewed without a teacher-authored course.
    // Local dev only — OR a production build explicitly forced with ?demo=1.
    // A bare ?demo no longer triggers it in prod, so a real student with an
    // empty course never sees demo content mistaken for a bug.
    const demoFlag = (() => {
      try { return new URLSearchParams(window.location.search).get('demo') === '1' } catch { return false }
    })()
    // Local review toggle: `localStorage.dev_demo_data = '1'` (DEV only) FORCES
    // the demo dataset even when a real (but e.g. all-locked, so visually empty)
    // course exists — so the whole student UI can be populated locally without
    // seeding the DB. Purely client-side, off by default, ignored in prod.
    const demoForce = demoFlag || (import.meta.env.DEV && (() => {
      try { return localStorage.getItem('dev_demo_data') === '1' } catch { return false }
    })())
    // Auto-fallback: trigger when there are no real LESSONS to show — not just
    // when the subjects array is empty. A real student can be enrolled in a
    // course that has no opened lessons yet (empty modules), which locally reads
    // as a bare "Курс ещё не открыт". In DEV that should still fall back to demo.
    // Exclude the synthetic standalone-ДЗ track (hw-inbox) — a group can have
    // loose homework but still no actual course, which should read as "empty".
    const hasRealLessons = mergedSubjects.some(s => s.id !== HW_SUBJECT_ID && s.modules.some(m => m.lessons.length > 0))
    if (demoForce || ((import.meta.env.DEV || demoFlag) && !hasRealLessons)) {
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

    // Уроки, тяжёлую половину которых уже приносили на этой странице, отдаём
    // сразу собранными. Иначе повторный load() (realtime после проверки ДЗ,
    // возврат на вкладку) на кадр показал бы открытый урок как «Загрузка…» —
    // данные-то в кеше, ждать нечего. Синхронно, ДО set(): между ними не должно
    // быть кадра.
    const withHeavy = applyHeavy(mergedSubjects)

    set({
      loaded: true,
      subjects: withHeavy,
      scheduleDays,
      scheduleTodayIndex: todayIdx >= 0 ? todayIdx : 3,
      stats,
      progress,
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

    // ── Тяжёлая половина уроков — по требованию ──────────────────────────────
    //
    // Трек уже нарисован: выше стоял set(), и экран показывает курс. Конспекты
    // и домашки к нему не едут вовсе — их спрашивают поурочно при открытии
    // (ensureLessonHeavy). Здесь только префетч вокруг места ученика — и лишь в
    // ОТКРЫТОМ курсе, а не во всех сразу: на аккаунте с семью курсами «все»
    // означало 48 уроков и секунду сети (замер на проде) ради экранов, которых
    // ученик в этот заход не увидит. Смена курса тянет своё окно сама
    // (prefetchCourseHeavy). Не await: кабинет не ждёт.
    const openSubject = useDashboard.getState().activeSubjectId
    const target = withHeavy.find(s => s.id === openSubject) ?? withHeavy[0]
    if (target) void ensureLessonsHeavy(prefetchTargets([target]))
  },

  ensureLessonHeavy: (lessonId) => { void ensureLessonsHeavy([lessonId]) },

  prefetchCourseHeavy: (subjectId) => {
    const subj = get().subjects.find(s => s.id === subjectId)
    if (subj) void ensureLessonsHeavy(prefetchTargets([subj]))
  },
}))

// ─── Тяжёлая половина уроков ─────────────────────────────────────────────────
//
// Конспекты и домашки спрашиваются ПОУРОЧНО, в момент открытия урока. На
// ученике с пятью курсами эти две колонки — 6 МБ ответа и полсекунды работы
// Postgres против 459 КБ и 2,6 мс у скелета, а за сеанс он открывает один-два
// урока: возить остальные триста незачем ни фоном, ни тем более на входе.
//
// Кеш на всю жизнь страницы, а не на один load(). load() зовут заново и
// realtime (учитель проверил домашку), и возврат на вкладку — второй раз
// спрашивать уже приехавший урок незачем.
//
// Цена: конспект, поправленный учителем во время сеанса ученика, доедет только
// после перезагрузки страницы. Это осознанный размен — realtime и раньше звал
// load() ради прогресса, а не ради текста урока.
const heavyCache = new Map<string, LessonHeavy>()
/** Уроки, про которые база уже ответила, — включая ответ «пусто» и провал
 *  запроса. Отдельно от кеша именно поэтому: пустой урок не должен спрашиваться
 *  снова и снова. */
const heavyDone = new Set<string>()
/** Уроки, запрос по которым сейчас летит: два тапа подряд не должны слать два. */
const heavyInflight = new Set<string>()
/** Уроки, чей запрос провалился. Флаг с них снят (экран живой), но второй
 *  заход разрешён: при догрузке по требованию неудача — это чей-то открытый
 *  прямо сейчас урок, и молча оставлять его пустым до перезагрузки нельзя. */
const heavyFailed = new Set<string>()

/** Урок, которому принадлежит тяжёлая половина: узел записи живёт под
 *  синтетическим id `<урок>~rec` и берёт её у своего урока. */
function heavyKey(lessonId: string): string {
  return lessonId.endsWith('~rec') ? lessonId.slice(0, -'~rec'.length) : lessonId
}

/** Влить приехавшие конспекты и домашки в уроки. Чистая функция от кеша. */
function applyHeavy(subjects: Subject[]): Subject[] {
  if (heavyDone.size === 0) return subjects
  return subjects.map(subj => ({
    ...subj,
    modules: subj.modules.map(mod => ({
      ...mod,
      lessons: mod.lessons.map(l => {
        if (!l.heavyPending) return l
        const key = heavyKey(l.id)
        // Про этот урок ещё не спрашивали — пусть так и остаётся «не знаю».
        if (!heavyDone.has(key)) return l
        const found = heavyCache.get(key)
        // Конспект принадлежит уроку, а запись — отдельный узел трека.
        const rec = l.nodeType === 'rec'
        return {
          ...l,
          heavyPending: false,
          content: rec ? undefined : found?.content,
          homework: withBankHard(found?.homework, l.bankHard),
          // Описание тоже едет тяжёлой половиной: на треке его не показывают, а
          // в скелете оно весило больше всего остального вместе взятого.
          description: found?.description,
        }
      }),
    })),
  }))
}

/**
 * Догрузить конспекты и домашки перечисленных уроков.
 *
 * Состояние читаем заново, а не склеиваем с копией `subjects`: пока ехал
 * запрос, ученик мог сдать домашку и realtime мог перезапустить load() — своя
 * копия массива затёрла бы свежие статусы.
 *
 * Провал запроса тоже снимает `heavyPending`. Урок без конспекта — плохо, но
 * это живой экран; урок, навсегда застрявший в «Загрузка…», — тупик, из
 * которого ученик выйдет только перезагрузкой, о которой не догадается. При
 * догрузке по требованию это тем более важно: запросов больше, и каждый из них
 * — чей-то открытый экран.
 */
async function ensureLessonsHeavy(lessonIds: string[]) {
  const want = [...new Set(lessonIds.map(heavyKey))]
    .filter(id => id && !heavyInflight.has(id) && (!heavyDone.has(id) || heavyFailed.has(id)))
  if (want.length === 0) return

  for (const id of want) { heavyInflight.add(id); heavyFailed.delete(id) }
  try {
    // Заодно чанк запасных конспектов AP — см. loadApLessons(): он читается
    // синхронно из рендера, и приехать обязан не позже самих уроков.
    const [heavy] = await Promise.all([fetchLessonsHeavy(want), loadApLessons()])
    for (const [k, v] of heavy) heavyCache.set(k, v)
  } catch (e) {
    // Снимаем флаг всё равно — см. комментарий выше, — но помечаем на повтор.
    console.error('[studentData.ensureLessonsHeavy]', e)
    for (const id of want) heavyFailed.add(id)
  } finally {
    for (const id of want) { heavyDone.add(id); heavyInflight.delete(id) }
  }

  useStudentData.setState(state => ({ subjects: applyHeavy(state.subjects) }))
}

/**
 * Что догрузить заранее — чтобы клик по уроку не ждал сети.
 *
 * Берём место ученика в курсе: последний урок, до которого он дошёл, и окно
 * вперёд от него. Не «первые N»: в курсе на триста уроков ученик середины
 * стоит не в начале. И не «все незалоченные»: у курса с доступом `full`
 * незалочено всё, а это ровно тот мегабайт, от которого мы уходили.
 *
 * Щедро, но конечно: PREFETCH_AHEAD вперёд и PREFETCH_BACK назад по каждому
 * курсу. Урок тянет примерно 7 КБ, то есть окно — около 70 КБ на курс: у
 * обычного ученика с одним-двумя курсами это меньше самого скелета, у
 * демо-аккаунта с семью — полмегабайта, всё равно на порядок меньше пяти
 * мегабайт и, в отличие от них, мимо критического пути.
 *
 * Уходит ОДНИМ запросом на все курсы разом: ensureLessonsHeavy спрашивает
 * список short_id, а не курс.
 */
const PREFETCH_AHEAD = 6
const PREFETCH_BACK = 3
function prefetchTargets(subjects: Subject[]): string[] {
  const out: string[] = []
  for (const subj of subjects) {
    const lessons = subj.modules.flatMap(m => m.lessons)
    if (lessons.length === 0) continue
    // Фронт работы: последний урок со следом прогресса. Ни одного — ученик
    // только пришёл, фронт в начале курса.
    let front = 0
    lessons.forEach((l, i) => {
      if (l.status !== 'locked' || l.points !== undefined) front = i
    })
    const from = Math.max(0, front - PREFETCH_BACK)
    // Только те, у кого тяжёлой половины и вправду нет: у синтетического трека
    // «Домашние задания» (standaloneHomework) задания лежат прямо в узле, и его
    // id — не `lessons.short_id`, спрашивать его в базе бессмысленно.
    out.push(...lessons.slice(from, front + PREFETCH_AHEAD + 1).filter(l => l.heavyPending).map(l => l.id))
  }
  return out
}

// Which student row a progress write for `subjectId` (a course short_id) must
// use: the course's owning enrollment row (so a multi-subject/multi-group person's
// submissions land under the row the teacher grades), else the active session row.
// Every student-side lesson_progress read/write scoped to a course must use this.
export function ownerStudentIdFor(subjectId: string | undefined): string {
  const fallback = getStudentSession()?.id ?? ''
  if (!subjectId) return fallback
  return useStudentData.getState().subjects.find(s => s.id === subjectId)?.ownerStudentId ?? fallback
}

/**
 * Слаг предмета из реестра по short_id курса: 'seed-kotp-84fe210b' → 'korean'.
 *
 * Урок знает только свой курс (`Lesson.subject` — это short_id, см. lib/db.ts),
 * а всё, что пишется «про предмет» — карточки повторения, например — должно
 * говорить на языке реестра, иначе одна и та же корейская домашка окажется в
 * колоде под id курса, а тренажёр будет искать её под 'korean'.
 *
 * Возвращает undefined, если курс не найден или его предмет не из реестра, —
 * вызывающий сам решает, писать ли исходное значение как есть.
 */
export function subjectSlugFor(courseId: string | undefined): string | undefined {
  if (!courseId) return undefined
  const course = useStudentData.getState().subjects.find(s => s.id === courseId)
  return getSubject(course?.subject)?.id
}

/**
 * Все написания предмета, которые могут стоять в `review_cards.subject`.
 *
 * Колонка исторически заполнялась тремя разными словарями: слаг реестра
 * ('korean') из тренажёра, русское имя ('Корейский') с курсов и short_id курса
 * ('seed-kotp-84fe210b') из домашки — последнее чинится на записи
 * (subjectSlugFor), но уже накопленные карточки никуда не делись. Поэтому
 * фильтр читает по списку синонимов, а не по одному значению: иначе у ученика,
 * который сдал десять слов до этой правки, колода стала бы пустой.
 *
 * Курсы берутся из тех, куда ученик записан, — чужие short_id в список не
 * попадают, и подмешать соседний язык этим нельзя.
 */
export function subjectAliases(idOrName: string | undefined): string[] {
  const def = getSubject(idOrName)
  if (!def) return idOrName ? [idOrName] : []
  const courseIds = useStudentData.getState().subjects
    .filter(s => getSubject(s.subject)?.id === def.id)
    .map(s => s.id)
  return [...new Set([def.id, def.name, ...courseIds])]
}
