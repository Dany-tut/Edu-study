import Sidebar from '../components/Sidebar'
import ScheduleCarousel from '../components/ScheduleCarousel'
import WidgetCarousel from '../components/WidgetCarousel'
import CompactWidgetPill from '../components/CompactWidgetPill'
import CourseTrack from '../components/CourseTrack'
import MobileBottomNav from '../components/MobileBottomNav'
import MobileHome from '../components/MobileHome'
import MobileCourses from '../components/MobileCourses'
import MobileProfilePage from '../components/MobileProfilePage'
import CoursesPage from './CoursesPage'
import LessonPage from './LessonPage'
import TestFlow from '../components/TestFlow'
import AnswerFlightLayer from '../components/AnswerFlightLayer'
import NotificationToastContainer from '../components/NotificationToast'
import { useNotificationsInit } from '../lib/notificationsSync'
import { useDashboard } from '../store/dashboardStore'
import { LayoutGroup, motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import Skeleton from '../components/Skeleton'
import { findLessonById, getLessonDetail } from '../data/lessonContent'
import { useStudentData } from '../store/studentDataStore'
import { useStudentPrefsSync } from '../lib/useStudentPrefsSync'
import { useCourseTint, useTint } from '../store/tintStore'
import { getStudentSession } from '../lib/studentSession'
import { fetchStudentAssignments, checkAssignmentSubmitted, type TestAssignment } from '../data/diagnosticData'
import { ClipboardList, ChevronRight } from 'lucide-react'
import { useT } from '../lib/i18n'
import { MOBILE_TOP_INSET } from '../lib/mobileTokens'

// ── Тренажёр — отдельным чанком ──────────────────────────────────────────────
//
// TaskBankPage тянет за собой весь каталог тренажёра: LanguageTrainer, папку
// components/trainer и словарь формулировок questionRu.ts — вместе около
// мегабайта. Всё это ехало в главном чанке, хотя вкладка открывается по клику
// и до неё доходят не все и не сразу. Монтируется страница и так только при
// activePage === 'trainer', так что ленивый импорт ничего не меняет по
// поведению — только переносит вес за пределы первой загрузки.
const TaskBankPage = lazy(() => import('./TaskBankPage'))

// Домашка — тоже отдельным чанком (196 КБ): монтируется только при
// activePage === 'homework', то есть после клика по уроку. Шкала самооценки,
// которую рисуют узлы маршрута, вынесена в homeworkSteps.ts — иначе они тянули
// бы весь модуль домашки обратно в главный чанк.
const HomeworkFlow = lazy(() => import('../components/HomeworkFlow'))

// Пока чанк тренажёра едет — фон, а не белый провал: TaskBankPage дальше сам
// показывает свой скелет.
function TrainerChunk() {
  return (
    <Suspense fallback={<div style={{ minHeight: '60vh', background: 'var(--color-bg)' }} />}>
      <TaskBankPage />
    </Suspense>
  )
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isDesktop
}

const HASH_TO_PAGE: Record<string, 'home' | 'courses' | 'trainer' | 'profile' | 'homeworkList'> = {
  '#/': 'home',
  '#': 'home',
  '': 'home',
  '#/courses': 'courses',
  '#/trainer': 'trainer',
  '#/profile': 'profile',
  // Вкладка «ДЗ» (каталог занятий). Без слэша и без id — «#/homework/<id>»
  // ниже разбирает LESSON_HASH_RE, это сама домашка конкретного урока.
  '#/homework': 'homeworkList',
}
const PAGE_TO_HASH: Record<string, string> = {
  home: '#/',
  courses: '#/courses',
  trainer: '#/trainer',
  profile: '#/profile',
  homeworkList: '#/homework',
}
// Lesson & homework encode the lesson id in the hash so a hard refresh (F5)
// restores the exact view instead of dropping the student back on Home.
const LESSON_HASH_RE = /^#\/(lesson|homework)\/(.+)$/
// Присланный рассказ («#/trainer/work/hyun-unsu/sc-unsu-1») — это тот же
// тренажёр: что именно в нём открыть, разбирает сам тренажёр (lib/trainerLink),
// кабинету достаточно не считать такой адрес неизвестным и не увести на главную.
const TRAINER_HASH_RE = /^#\/trainer\//

export default function DashboardPage() {
  useStudentPrefsSync()
  // Оттенок курса: пишет переменные на <html>, снимает их при выходе.
  useCourseTint()
  // Правка цвета в настройках меняет карту предметов, а её читают не только
  // переменные (карточки курсов, чипсы). Подписка на version перерисовывает
  // кабинет целиком — иначе новый цвет доезжал бы до них лишь при следующем
  // рендере по другой причине.
  useTint(s => s.version)
  useNotificationsInit(getStudentSession()?.id)
  const isDesktop = useIsDesktop()
  const trackPopoverOpen = useDashboard(s => s.trackPopoverOpen)
  const activePage = useDashboard(s => s.activePage)
  const setActivePage = useDashboard(s => s.setActivePage)
  const currentLessonId = useDashboard(s => s.currentLessonId)
  const openLesson = useDashboard(s => s.openLesson)
  const openHomeworkForLesson = useDashboard(s => s.openHomeworkForLesson)
  const setLessonScrolled = useDashboard(s => s.setLessonScrolled)
  const closeHomework = useDashboard(s => s.closeHomework)
  const closeLesson = useDashboard(s => s.closeLesson)
  const lesson = currentLessonId ? findLessonById(currentLessonId) : null
  const homework = lesson ? getLessonDetail(lesson).homework : null
  // Конспект и домашка урока едут вторым запросом (см. heavyPending в
  // data/mockData.ts). Пока они в пути, «домашки нет» ещё не значит, что её
  // нет, — и урок нельзя ни показывать пустым, ни отбивать назад. Узел-тест
  // исключение: его задания лежат в лёгкой половине.
  const lessonPending = !!lesson?.heavyPending && lesson.kind !== 'test'
  // Курсы приходят из Supabase; до этого искать в них урок бессмысленно.
  const dataLoaded = useStudentData(s => s.loaded)
  const ensureLessonHeavy = useStudentData(s => s.ensureLessonHeavy)
  const prefetchCourseHeavy = useStudentData(s => s.prefetchCourseHeavy)
  const openCourseId = useDashboard(s => s.activeSubjectId)

  // Открыли урок — спрашиваем его конспект и домашку. Здесь, а не в openLesson:
  // в урок попадают и мимо него — восстановлением из адреса после F5, ссылкой,
  // переходом из виджета, — а этот эффект видит ЛЮБОЙ способ, каким id оказался
  // текущим. Повторные вызовы безвредны: стор сам отсекает уже приехавшее и уже
  // летящее.
  useEffect(() => {
    if (currentLessonId) ensureLessonHeavy(currentLessonId)
  }, [currentLessonId, ensureLessonHeavy])

  // Сменили курс — тянем окно уроков вокруг места ученика уже в нём. На входе
  // префетчится только открытый курс (см. studentDataStore): у аккаунта с семью
  // курсами «все сразу» стоили 48 уроков и секунду сети ради экранов, которые в
  // этот заход никто не откроет.
  useEffect(() => {
    if (dataLoaded) prefetchCourseHeavy(openCourseId)
  }, [dataLoaded, openCourseId, prefetchCourseHeavy])

  // Restore the exact view from the hash on mount — including lesson/homework
  // (with the lesson id) so a hard refresh never dumps the student back on Home.
  //
  // Адрес читаем ОДИН раз, при монтировании, и держим в ref: пока курс едет из
  // Supabase, эффект синхронизации ниже не должен успеть его переписать.
  //
  // ВАЖНО: урок открывается СРАЗУ, не дожидаясь курсов. Раньше здесь стояла
  // проверка «а существует ли такой урок», и она проваливалась всегда: уроки
  // живут в загруженных курсах, а на монтировании их ещё нет — findLessonById
  // не находит НИ ОДИН урок и честный адрес улетал на главную. Это и есть тот
  // самый «нажал F5 в уроке — выбросило». Проверка переехала в эффект ниже, где
  // ей есть на чём работать; до загрузки урок показывает «Загрузка…».
  // Вне главной оттенок ведёт открытый курс: на «Курсах», в уроке и в домашке
  // контекст задаёт он, а не чипс дока (тот живёт только на главной).
  const activeCourseId = useDashboard(s => s.activeSubjectId)
  const allCourses = useStudentData(s => s.subjects)
  const setTintSubject = useTint(s => s.setActiveSubject)
  useEffect(() => {
    if (activePage === 'home') return
    // В ТРЕНАЖЁРЕ оттенок ставит он сам (TaskBankPage): выбор языка обычно
    // переводит и курс, но предмет может прийти ссылкой или из банка заданий —
    // курса под ним нет вовсе, и тон брал бы чужой язык. Уход с тренажёра
    // перезапускает этот эффект и возвращает цвет открытого курса.
    if (activePage === 'trainer') return
    // Только УСТАНОВКА, без сброса: у части курсов предмета нет вовсе
    // (отдельная домашка, сборный «Все курсы»), и `?? null` на них гасил
    // оттенок целиком — экран прыгал в фиолетовый на ровном месте. Снимает
    // оттенок только явный выбор «Все» на главной.
    const course = allCourses.find(c => c.id === activeCourseId)
    if (course?.subject) setTintSubject(course.subject)
  }, [activePage, activeCourseId, allCourses, setTintSubject])

  const bootHash = useRef(window.location.hash)
  const [restored, setRestored] = useState(false)
  useEffect(() => {
    const m = bootHash.current.match(LESSON_HASH_RE)
    if (m) {
      const id = decodeURIComponent(m[2])
      if (m[1] === 'homework') openHomeworkForLesson(id)
      else openLesson(id)
    } else if (TRAINER_HASH_RE.test(bootHash.current)) {
      if (activePage !== 'trainer') setActivePage('trainer')
    } else {
      const page = HASH_TO_PAGE[bootHash.current]
      if (page && page !== activePage) setActivePage(page)
    }
    setRestored(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Урок из адреса мог и правда исчезнуть: курс сняли, ссылку прислали чужую.
  // Проверяем это ПОСЛЕ загрузки курсов — до неё пусто вообще всё, и любая
  // проверка врёт.
  useEffect(() => {
    if (!dataLoaded) return
    if (currentLessonId && !findLessonById(currentLessonId)) { setActivePage('home'); return }
    // Домашки у урока может не быть вовсе. Тогда «#/homework/…» вёл в пустоту:
    // на экране каталог курсов, а адрес продолжает утверждать, что мы в
    // домашке. Открываем сам урок — это ближайшее, что имелось в виду.
    if (activePage === 'homework' && currentLessonId && !homework && !lessonPending) closeHomework()
  }, [dataLoaded, currentLessonId, activePage, homework, lessonPending, setActivePage, closeHomework])

  // Sync the hash whenever the view changes so it's always refresh-restorable.
  useEffect(() => {
    // На первом кадре в адресе лежит ещё не применённый урок: восстановление
    // уже позвало openLesson, но этот эффект видит старую activePage='home' и
    // успел бы записать «#/» поверх. Ждём следующий кадр.
    if (!restored) return
    let hash: string | null = null
    if (activePage === 'lesson' && currentLessonId) hash = `#/lesson/${encodeURIComponent(currentLessonId)}`
    else if (activePage === 'homework' && currentLessonId) hash = `#/homework/${encodeURIComponent(currentLessonId)}`
    // Внутри тренажёра адрес ведёт он сам — и ведёт подробнее (язык, экран,
    // открытый материал; см. lib/trainerLink). Ровное «#/trainer» отсюда
    // затирало бы присланную ссылку ровно в тот момент, когда её открыли:
    // восстановление выше как раз переключило вкладку, а тренажёр применить
    // ссылку ещё не успел.
    else if (activePage === 'trainer' && TRAINER_HASH_RE.test(window.location.hash)) hash = null
    else hash = PAGE_TO_HASH[activePage] ?? null
    if (hash && window.location.hash !== hash) {
      window.history.replaceState(null, '', hash)
    }
  }, [activePage, currentLessonId, restored])

  // Sidebar is centered in the topbar via flex; the mini widget pill is
  // overlaid absolutely beside it so its presence never shifts the sidebar.
  // We rAF-poll the sidebar's right edge and write directly to the pill
  // wrapper's style — avoiding React re-renders that would trip the inner
  // motion.div's layoutId animation into re-projecting its transform.
  const sidebarWrapRef = useRef<HTMLDivElement>(null)
  const pillWrapRef = useRef<HTMLDivElement>(null)
  const [pillMounted, setPillMounted] = useState(false)
  useEffect(() => {
    let raf = 0
    let last = -1
    const tick = () => {
      const el = sidebarWrapRef.current
      const parent = el?.parentElement
      const pill = pillWrapRef.current
      if (el && parent) {
        const sb = el.getBoundingClientRect()
        const row = parent.getBoundingClientRect()
        const next = Math.round(sb.right - row.left)
        if (next !== last) {
          last = next
          if (pill) pill.style.left = next + 20 + 'px'
          if (!pillMounted) setPillMounted(true)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [pillMounted])

  return (
    <>
      <AnswerFlightLayer />
      {/* Desktop live notifications surface inside CompactWidgetPill (beside the
          topbar); the standalone toast is only kept for mobile where there's no pill. */}
      {!isDesktop && <NotificationToastContainer />}
      {/* Desktop no-scroll layout */}
      <LayoutGroup>
      <div className="dashboard-root" style={{ display: isDesktop ? 'flex' : 'none' }}>
        {/* Full-width progressive blur+fade strip pinned to the top, behind the
            floating topbar pill — content scrolls up under a soft blurred band so
            it never bleeds through the gaps around the pills. */}
        <div aria-hidden className="edge-progressive-blur--top" />

        {/* Top bar — Sidebar pill is centered; on non-home pages the widget
            carousel collapses into a pill that flies up beside the topbar. */}
        <div className="topbar-row">
          {/* `.topbar-row` is pointer-events:none so clicks fall through its
              empty area to the docked lesson pills; the interactive wrappers
              must explicitly re-enable pointer events or the bar goes dead. */}
          <div />
          <div ref={sidebarWrapRef} style={{ display: 'inline-flex', pointerEvents: 'auto' }}>
            <Sidebar />
          </div>
          <div
            id="widget-pill-target"
            ref={pillWrapRef}
            style={{
              position: 'absolute',
              left: 0,
              top: 20,
              zIndex: 70,
              pointerEvents: 'auto',
              visibility: pillMounted ? 'visible' : 'hidden',
            }}
          >
            <AnimatePresence>
              {activePage !== 'home' && (
                <motion.div
                  key="compact-widget-pill"
                  // Plain fade+slide entrance — the previous layoutId-shared
                  // morph from the big WidgetCarousel got stuck mid-FLIP when
                  // the pill's internal expand/collapse changed its size, so
                  // we drop the shared layout in favour of a self-contained
                  // entrance that doesn't fight the expand animation.
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: [0, -7, 4, -2, 0.8, 0] }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.38, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  <CompactWidgetPill />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {activePage === 'home' ? (
          <>
            {/* Row 1: Schedule — pill + 4-card carousel */}
            <section className="dashboard-schedule">
              <ScheduleCarousel />
            </section>

            {/* Full-width content below */}
            <main className="dashboard-main">
              {/* Row 2: Widget carousel (stats / science facts / focus timer). */}
              <section style={{ flexShrink: 0, position: 'relative', zIndex: 20 }}>
                <WidgetCarousel />
              </section>

              {/* Row 3: Course track — natural height, no flex-grow */}
              <section style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: trackPopoverOpen ? 30 : 5 }}>
                <CourseTrack />
              </section>

              {/* Row 4: Assigned tests */}
              <section style={{ flexShrink: 0 }}>
                <AssignedTestsBlock />
              </section>
            </main>
          </>
        ) : activePage === 'lesson' ? (
          /* Single lesson — player + materials (screen 2). The page
             extends past the viewport (homework levels, transcript, etc.),
             so we override the dashboard's no-scroll layout and let this
             pane scroll vertically on its own. */
          <main
            className="dashboard-main"
            onScroll={e => setLessonScrolled((e.currentTarget as HTMLElement).scrollTop > 64)}
            style={{
              overflowY: 'auto',
              minHeight: 0,
              // Extend the scroll pane up to the very top (cancel the root's
              // 100px topbar reservation), then re-inset content with an equal
              // padding so it still starts below the topbar — but now scrolls
              // UP under the floating topbar + progressive-blur strip.
              marginTop: -100,
              paddingTop: 100,
            }}
          >
            {(!lesson && !dataLoaded) || lessonPending
              ? <LessonLoading />
              : lesson?.kind === 'test'
                ? <TestFlow lesson={lesson} onBack={closeLesson} />
                : <LessonPage />}
          </main>
        ) : activePage === 'homework' && ((!lesson && !dataLoaded) || lessonPending) ? (
          <main className="dashboard-main" style={{ overflowY: 'auto', minHeight: 0, marginTop: -100, paddingTop: 100 }}>
            <LessonLoading />
          </main>
        ) : activePage === 'homework' && lesson && homework ? (
          /* Homework — mirrors the lesson pane: the page scrolls up under the
             floating topbar + progressive-blur strip, and its Back/title row
             docks onto the topbar line on scroll. */
          <main
            key="homework"
            className="dashboard-main"
            onScroll={e => setLessonScrolled((e.currentTarget as HTMLElement).scrollTop > 64)}
            style={{ overflowY: 'auto', minHeight: 0, marginTop: -100, paddingTop: 100 }}
          >
            <Suspense fallback={<LessonLoading />}>
              <HomeworkFlow
                lessonId={lesson.id}
                lessonTitle={lesson.title}
                subject={lesson.subject}
                homework={homework}
                onBack={closeHomework}
              />
            </Suspense>
          </main>
        ) : activePage === 'trainer' ? (
          <main
            className="dashboard-main"
            onScroll={e => setLessonScrolled((e.currentTarget as HTMLElement).scrollTop > 64)}
            style={{ overflowY: 'auto', minHeight: 0, marginTop: -100, paddingTop: 100, scrollbarGutter: 'stable' }}
          >
            <TrainerChunk />
          </main>
        ) : (
          /* Courses catalogue (screen 3) */
          <main
            className="dashboard-main"
            style={{ overflowY: 'auto', minHeight: 0, marginTop: -100, paddingTop: 100 }}
          >
            <CoursesPage />
          </main>
        )}
      </div>
      </LayoutGroup>

      {/* Mobile layout (separate). Screens that own a MobileScreen shell
          (Home/Courses/Profile/Trainer) render standalone — they bring their own
          safe-area, top chrome and bottom nav. Lesson/ДЗ flows keep a padded
          scroll wrapper with safe-area top + bottom-nav clearance. */}
      <div style={{ display: isDesktop ? 'none' : 'block' }}>
        {activePage === 'home' ? (
          <MobileHome />
        ) : activePage === 'courses' ? (
          <MobileCourses />
        ) : activePage === 'profile' ? (
          <MobileProfilePage />
        ) : activePage === 'trainer' ? (
          <TrainerChunk />
        ) : activePage === 'homeworkList' ? (
          /* Вкладка «ДЗ» — каталог занятий со статусами (свой поиск/фильтр/
             сортировка в нижнем доке). Отдельная страница, а не 'homework':
             та открывает домашку текущего урока и без неё отбивает назад. */
          <div style={{
            minHeight: '100dvh', background: 'var(--color-bg)',
            paddingTop: MOBILE_TOP_INSET,
            paddingLeft: 16, paddingRight: 16,
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 110px)',
            overflowX: 'clip', overscrollBehavior: 'contain',
          }}>
            <CoursesPage />
            <MobileBottomNav />
          </div>
        ) : (
          <div style={{
            minHeight: '100dvh', background: 'var(--color-bg)',
            paddingTop: MOBILE_TOP_INSET,
            paddingLeft: 16, paddingRight: 16,
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 110px)',
            overflowX: 'clip', overscrollBehavior: 'contain',
          }}>
            {activePage === 'lesson' ? (
              (!lesson && !dataLoaded) || lessonPending
                ? <LessonLoading />
                : lesson?.kind === 'test'
                  ? <TestFlow lesson={lesson} onBack={closeLesson} />
                  : <LessonPage />
            ) : activePage === 'homework' && ((!lesson && !dataLoaded) || lessonPending) ? (
              <LessonLoading />
            ) : activePage === 'homework' && lesson && homework ? (
              <Suspense fallback={<LessonLoading />}>
                <HomeworkFlow
                  lessonId={lesson.id}
                  lessonTitle={lesson.title}
                  subject={lesson.subject}
                  homework={homework}
                  onBack={closeHomework}
                />
              </Suspense>
            ) : (
              <CoursesPage />
            )}
            <MobileBottomNav />
          </div>
        )}
      </div>
    </>
  )
}

/**
 * Заглушка на время, пока курсы едут из Supabase.
 *
 * После F5 адрес урока уже известен, а самого урока ещё нет ни у кого: уроки
 * лежат в загруженных курсах. Страницу урока в этот момент НЕ монтируем — у неё
 * есть хуки ниже раннего возврата «урок не найден», и появление урока посреди
 * жизни компонента ломает порядок хуков (React падает в ErrorBoundary). Проще и
 * честнее подождать здесь.
 */
function LessonLoading() {
  const t = useT()
  // Скелетон, а не слово «Загрузка…»: ожидание должно быть формой того, что
  // сейчас появится, — заголовок, строка-подпись и абзацы конспекта. Слово в
  // центре пустого экрана не говорит ученику ничего о том, чего он ждёт, и
  // читается как сбой, а не как пауза.
  return (
    <div role="status" aria-busy="true" aria-label={t('Загрузка…')}
      style={{ minHeight: 300, display: 'flex', flexDirection: 'column', gap: 18, padding: '8px 0' }}>
      <Skeleton w="62%" h={26} radius={10} />
      <Skeleton w="34%" h={13} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, marginTop: 6 }}>
        <Skeleton.Text lines={4} />
        <Skeleton.Text lines={3} />
      </div>
    </div>
  )
}

// ─── Assigned tests block ─────────────────────────────────────────────────────
const SUBJECT_LABEL: Record<string, string> = {
  biology: 'Биология', chemistry: 'Химия', logic: 'Мышление',
  'ap-chem-ru': 'AP Химия RU', 'ap-chem-en': 'AP Chemistry EN',
  'eng-placement': 'Английский — уровень', 'kor-placement': 'Корейский — уровень',
}

function AssignedTestsBlock() {
  const t = useT()
  const session = getStudentSession()
  const [assignments, setAssignments] = useState<(TestAssignment & { done: boolean })[]>([])

  useEffect(() => {
    if (!session?.id || !session?.groupId) return
    let alive = true
    ;(async () => {
      try {
        const list = await fetchStudentAssignments(session.id, session.groupId)
        const withDone = await Promise.all(
          list.map(async a => ({ ...a, done: await checkAssignmentSubmitted(session.id, a.id) }))
        )
        if (alive) setAssignments(withDone)
      } catch {
        // Assigned-tests are non-critical: on failure keep the block hidden
        // rather than throwing an unhandled rejection. (Real errors from the
        // underlying db.ts calls are already reported to analytics.)
        if (alive) setAssignments([])
      }
    })()
    return () => { alive = false }
  }, [session?.id, session?.groupId])

  const pending = assignments.filter(a => !a.done)
  if (pending.length === 0) return null

  function openTest(a: TestAssignment) {
    const name = encodeURIComponent(session?.name ?? 'Аноним')
    window.location.hash = `#/diagnostic?subject=${a.subject}&assignment=${a.id}&sid=${session?.id}&sname=${name}`
  }

  return (
    <div style={{ padding: '12px 0 4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        <ClipboardList size={14} style={{ color: 'var(--color-accent)' }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-2)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
          {t('Назначенные тесты')}
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-accent)', background: 'var(--color-purple-soft)', borderRadius: 6, padding: '1px 7px' }}>
          {pending.length}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {pending.map(a => (
          <motion.div
            key={a.id}
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            onClick={() => openTest(a)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 14, background: 'var(--color-bg-card)', border: '1.5px solid var(--color-accent)', cursor: 'pointer', boxShadow: '0 2px 12px rgba(99,84,207,0.08)' }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{a.title}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 2 }}>
                {t(SUBJECT_LABEL[a.subject] ?? a.subject)}
                {a.dueDate && <span style={{ marginLeft: 8, color: 'var(--color-peach-text)' }}>{t('до')} {a.dueDate}</span>}
              </div>
            </div>
            <span style={{ padding: '3px 9px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: a.assignType === 'trial' ? 'rgba(245,166,35,0.12)' : 'var(--color-purple-soft)', color: a.assignType === 'trial' ? '#F5A623' : 'var(--color-purple-text)' }}>
              {a.assignType === 'trial' ? t('Пробник') : t('Тест')}
            </span>
            <ChevronRight size={15} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
          </motion.div>
        ))}
      </div>
    </div>
  )
}
