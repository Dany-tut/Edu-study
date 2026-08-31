import { useRef, useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Flame, Zap, Bell, SlidersHorizontal, Play, ChevronRight, Dumbbell, BookOpen, Lock, Calendar, ClipboardList, HelpCircle, Atom, Star, CheckCircle2, TrendingUp, Layers } from 'lucide-react'
import NotificationPopup from './NotificationPopup'
import { useNotificationsStore } from '../store/notificationsStore'
import MobileScreen from './MobileScreen'
import MobileBottomNav from './MobileBottomNav'
import MobileDock, { DockSegment } from './MobileDock'
import { stripCommonPrefix } from '../lib/courseLabels'
import MobileHScroll from './MobileHScroll'
import UpdateDockPill from './UpdateDockPill'
import { useAppUpdate, watchForUpdates } from '../lib/appUpdate'
import { DynamicIsland, GlassIconButton } from './mobileChrome'
import { getDisplayLessonStatus } from '../lib/lessonStatus'
import { useNow, lessonTimeState } from '../lib/useNow'
import MobileStickersRow from './MobileStickersRow'
import Skeleton from './Skeleton'
import { useStudentData } from '../store/studentDataStore'
import { useDashboard } from '../store/dashboardStore'
import { computeSubjectStats } from '../lib/db'
import { useWidgetRelevance } from '../lib/widgetVisibility'
import { useFeedGlance, feedReload } from '../lib/feedRead'
import { pickTrainerSubject } from '../lib/trainerSubject'
import { dayLabel, feedFilters, matchesFilter, type FeedFilter, type FeedItem } from '../data/feed'
import { FeedPost } from './trainer/FeedPost'
import { RubricBar, useRubricSwipe } from './MobileFeedRubrics'
import FeedContentSheet from './FeedContentSheet'
import { useFeedPrefs, applyFeedPrefs, prefsTouched } from '../store/feedPrefsStore'
import { tactile } from '../lib/feedback'
import { PAIR, type PairName } from '../lib/mobileTokens'
import { writeDraft } from '../lib/useDraft'
import { resolveSubjectPalette, getSubject } from '../lib/subjects'
import { useTheme } from '../store/themeStore'
import { useTint } from '../store/tintStore'
import { useT, t as tt, useLang } from '../lib/i18n'
import type { LucideIcon } from 'lucide-react'
import type { Lesson } from '../data/mockData'

// MOBILE ONLY home (v2). Desktop layout in DashboardPage is untouched.
// Concept: not a dashboard — a "today + continue" screen.
//   · Dynamic Island pill (streak + live info)
//   · Hero "Продолжить" — the one primary action
//   · "Сегодня" — compact schedule list
//   · Quick actions — trainer / courses
// Desktop widgets (StatsWidget/CourseTrack/WidgetCarousel) are
// no longer crammed in here.

/**
 * Линия, на которой шапка переключается со стрика на рубрики.
 *
 * Это низ плавающей шапки: вырез (safe-area) плюс её собственная высота с
 * зазором. Считаем от верха окна, а не от панели прокрутки: getBoundingClientRect
 * у ленты тоже оконный.
 */
const FEED_BAR_LINE = 104

function fmtUntil(mins: number) {
  if (mins <= 0) return tt('идёт сейчас')
  if (mins < 60) return `${tt('через')} ${mins} ${tt('мин')}`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${tt('через')} ${h} ${tt('ч')} ${m} ${tt('мин')}` : `${tt('через')} ${h} ${tt('ч')}`
}

export default function MobileHome() {
  const t = useT()
  const loaded = useStudentData(s => s.loaded)
  const subjects = useStudentData(s => s.subjects)
  const scheduleDays = useStudentData(s => s.scheduleDays)
  const stats = useStudentData(s => s.stats)
  const progress = useStudentData(s => s.progress)
  const quizQuestions = useStudentData(s => s.quizQuestions)
  const scienceFacts = useStudentData(s => s.scienceFacts)
  const scienceMemes = useStudentData(s => s.scienceMemes)
  const openLesson = useDashboard(s => s.openLesson)
  const openCourses = useDashboard(s => s.openCourses)
  const setActivePage = useDashboard(s => s.setActivePage)
  const now = useNow(30_000)
  const { dark } = useTheme()
  const notifUnread = useNotificationsStore(s => s.notifications.filter(n => !n.read).length)
  const [notifOpen, setNotifOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  // В2: at 2–4 courses a bottom segment scopes the home content to one course.
  // Single course → no dock (В1). Default follows whichever course has the
  // active lesson so "Продолжить" lands where the student left off.
  const multiCourse = subjects.length >= 2

  // Обновление: общий стор (lib/appUpdate.ts) — та же правда, что и в строке
  // версии в профиле. Сторож запускается один раз и сам перепроверяет при
  // возвращении в приложение.
  const updatePhase = useAppUpdate(s => s.phase)
  const updateReady = updatePhase === 'stale' || updatePhase === 'updating'
  useEffect(() => { watchForUpdates() }, [])
  // «Все» в подсчёт общего префикса не входит: это не курс, и срезать у него
  // нечего — иначе одна чужая подпись отменяла бы срез для всех остальных.
  const dockLabels = useMemo(() => stripCommonPrefix(subjects.map(s => s.name)), [subjects])
  // Выбор курса — ОДИН на телефон: тот же activeSubjectId, что и в «Курсах».
  // Выбрал англ на главной — англ и в курсах, поменял на кор в курсах —
  // главная тоже кор. Локально живёт только «Все» (в сторе такого курса нет);
  // как только курс переключили снаружи, «Все» снимается — иначе главная
  // молча игнорировала бы выбор, сделанный в «Курсах».
  const activeSubjectId = useDashboard(s => s.activeSubjectId)
  const setActiveSubject = useDashboard(s => s.setActiveSubject)
  const [homeAll, setHomeAll] = useState(false)
  const prevActiveId = useRef(activeSubjectId)
  useEffect(() => {
    if (prevActiveId.current !== activeSubjectId) {
      prevActiveId.current = activeSubjectId
      setHomeAll(false)
    }
  }, [activeSubjectId])
  const scopedSubject = multiCourse && !homeAll
    ? (subjects.find(s => s.id === activeSubjectId) ?? null)
    : null
  const scanSubjects = scopedSubject ? [scopedSubject] : subjects

  // Оттенок интерфейса под выбранный курс. У одного курса выбирать нечего —
  // он и есть контекст, поэтому кабинет красится им сразу, без чипса.
  const setTintSubject = useTint(s => s.setActiveSubject)
  const tintSubject = scopedSubject?.subject ?? (subjects.length === 1 ? subjects[0].subject : null)
  useEffect(() => { setTintSubject(tintSubject ?? null) }, [tintSubject, setTintSubject])

  // ── Лента и её рубрики ───────────────────────────────────────────────────
  //
  // Данные живут ЗДЕСЬ, а не внутри FeedFlow: рубрики показывает шапка экрана,
  // и собрать ряд она может только по тому, что реально приехало. Отбор тоже
  // здесь — иначе шапка и лента разошлись бы в том, что считать выбранным.
  const feedGlance = useFeedGlance(0, scopedSubject?.subject)
  const feedRef = useRef<HTMLDivElement>(null)

  // ── Состав ленты: настройка фильтра из шапки ──────────────────────────────
  //
  // Отбор по темам и типу материала стоит ПЕРЕД всем остальным: рубрики
  // собираются по тому, что осталось (чипс темы, выключенной в настройках, —
  // обещание пустого экрана), и лента листается по нему же.
  const prefs = useFeedPrefs()
  const [prefsOpen, setPrefsOpen] = useState(false)
  const shownItems = useMemo(
    () => applyFeedPrefs(feedGlance.items, prefs),
    [feedGlance.items, prefs],
  )

  const rubrics = useMemo(() => feedFilters(shownItems), [shownItems])
  const [rubricPick, setRubricPick] = useState<FeedFilter>('all')
  // Рубрика могла исчезнуть вместе со сменой курса: у корейской ленты своё
  // «Здоровье», у португальской его нет вовсе.
  const rubric: FeedFilter = rubrics.some(r => r.id === rubricPick) ? rubricPick : 'all'
  const feedItems = useMemo(
    () => shownItems.filter(x => matchesFilter(x, rubric)),
    [shownItems, rubric],
  )
  const feedAccent = resolveSubjectPalette(feedGlance.subjectId, dark).accent

  // ТЯГА СВЕРХУ ОБНОВЛЯЕТ ЛЕНТУ. Обновлять на главной больше нечего: и
  // «Продолжить», и «Сегодня» приходят из стора и живут сами. Нет языка —
  // нечего и тянуть, жест выключен целиком (MobileScreen без onRefresh).
  const refreshFeed = feedGlance.lang
    ? () => feedReload(feedGlance.lang!).then(() => undefined)
    : undefined

  // ГДЕ КОНЧАЕТСЯ ГЛАВНАЯ И НАЧИНАЕТСЯ ЛЕНТА. Шапка меняет содержимое ровно на
  // этом рубеже: пока видно «Продолжить» и «Сегодня», наверху стрик и XP; как
  // только под шапку ушёл верх ленты — рубрики.
  //
  // Гистерезис не для красоты: без него на границе шапка мигала бы туда-сюда
  // от каждого пикселя прокрутки (смена содержимого сама двигает раскладку).
  const [atFeed, setAtFeed] = useState(false)
  useEffect(() => {
    const check = () => {
      const el = feedRef.current
      if (!el) { setAtFeed(false); return }
      // Линию берём у самой шапки (колокольчик — её правый край): высота
      // выреза у моделей разная, и зашитое число промахивалось бы на
      // полсантиметра то в одну, то в другую сторону.
      const bar = bellRef.current?.getBoundingClientRect().bottom
      const line = (bar ?? FEED_BAR_LINE) + 8
      const top = el.getBoundingClientRect().top
      setAtFeed(was => (was ? top > line + 40 ? false : true : top <= line))
    }
    check()
    window.addEventListener('scroll', check, { capture: true, passive: true })
    window.addEventListener('resize', check)
    return () => {
      window.removeEventListener('scroll', check, { capture: true } as EventListenerOptions)
      window.removeEventListener('resize', check)
    }
    // `rubric` в зависимостях — из-за pickRubric: он двигает прокрутку сам, а
    // событие scroll от программной прокрутки приходит не всегда. Перемер после
    // смены рубрики гарантирует, что шапка не останется в чужом виде.
  }, [loaded, feedItems.length, rubric])

  // СМЕНА РУБРИКИ НАЧИНАЕТ ЛЕНТУ СВЕРХУ. Без этого человек, ушедший на десятый
  // пост, после свайпа оказывался в середине другой рубрики — а то и ниже её
  // конца, если постов там меньше. Прокручиваем к началу ленты, а не к началу
  // экрана: шапка остаётся рубриками, из ленты никуда не выкидывает.
  const pickRubric = (id: FeedFilter) => {
    setRubricPick(id)
    const el = feedRef.current
    const box = el?.closest('.no-scrollbar') as HTMLElement | null
    if (!el || !box) return
    const line = (bellRef.current?.getBoundingClientRect().bottom ?? FEED_BAR_LINE) + 8
    const delta = el.getBoundingClientRect().top - line
    if (delta < -1) box.scrollTop += delta
  }

  // Свайп по ленте водит по рубрикам — только пока шапка ими и занята: выше по
  // экрану тот же жест ничего бы не значил, а прокрутку бы перехватывал.
  useRubricSwipe(feedRef, {
    chips: rubrics, value: rubric, onChange: pickRubric,
    enabled: atFeed && rubrics.length > 1,
  })

  // Continue target: the current lesson, else first unlocked-incomplete lesson.
  const continueInfo = (() => {
    for (const subj of scanSubjects) {
      const lessons = subj.modules.flatMap(m => m.lessons)
      const cur = lessons.find(l => l.status === 'current')
      if (cur) return { lesson: cur, subject: subj }
    }
    for (const subj of scanSubjects) {
      const lessons = subj.modules.flatMap(m => m.lessons)
      const next = lessons.find(l => l.status !== 'locked' && l.status !== 'completed')
      if (next) return { lesson: next, subject: subj }
    }
    return null
  })()

  // Stats strip — account-wide totals, or the scoped course's own numbers.
  const homeStats = useMemo(() => {
    if (scopedSubject) {
      // Тот же расчёт, что у десктопного виджета статистики, — чтобы «уроков» и
      // «ср. балл» на двух платформах не разъезжались.
      const s = computeSubjectStats(scopedSubject, progress)
      return [
        { icon: Flame, value: stats.streak, label: t('дней'), pair: PAIR.warning },
        { icon: CheckCircle2, value: s.completedTasks, label: t('уроков'), pair: PAIR.success },
        { icon: TrendingUp, value: s.avgScore ? `${s.avgScore}%` : '—', label: t('ср. балл'), pair: PAIR.info },
        { icon: BookOpen, value: `${scopedSubject.progress}%`, label: t('курс'), pair: PAIR.focus },
      ]
    }
    return [
      { icon: Flame, value: stats.streak, label: t('дней'), pair: PAIR.warning },
      { icon: CheckCircle2, value: stats.completedTasks, label: t('заданий'), pair: PAIR.success },
      { icon: TrendingUp, value: `${stats.avgScore}%`, label: t('ср. балл'), pair: PAIR.info },
      { icon: Zap, value: stats.totalPoints, label: t('XP'), pair: PAIR.focus },
    ]
  }, [scopedSubject, progress, stats, t])

  // Карточки «виджетов дня» — по тем же правилам, что и десктопная карусель
  // (предмет курса + непустой контент), см. lib/widgetVisibility.ts.
  const relevant = useWidgetRelevance()
  const dayCards = {
    quiz: relevant(5) ? quizQuestions[0] : undefined,
    facts: relevant(1) ? scienceFacts[0] : undefined,
    memes: relevant(4) ? scienceMemes[0] : undefined,
  }

  const todayLessons = scheduleDays.find(d => d.isToday)?.lessons ?? []

  // Dynamic Island: soonest upcoming lesson today, else streak summary.
  const nextToday = todayLessons
    .map(l => ({ l, st: lessonTimeState(scheduleDays.find(d => d.isToday)!.date, l.time, now) }))
    .filter(x => !x.st.passed)
    .sort((a, b) => a.st.minutesUntil - b.st.minutesUntil)[0]

  // Рубрики занимают место острова, только когда они есть и есть что листать:
  // одна рубрика — это не выбор, а подпись, и ради неё стрик уводить незачем.
  const barOnFeed = atFeed && rubrics.length > 1

  const topZone = (
    <div className="flex items-center justify-between" style={{ gap: 8 }}>
      {/* Место под колокольчиком слева — оно центрует остров. Рубрикам центр не
          нужен, они панель во всю ширину, и распорка уезжает вместе с ними. */}
      <motion.div
        animate={{ width: barOnFeed ? 0 : 44 }}
        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        style={{ flexShrink: 0 }}
      />
      {/* ОБЕ ШАПКИ ЖИВУТ В ОДНОМ СЛОЕ И ПЕРЕЛИВАЮТСЯ ДРУГ В ДРУГА. Не
          AnimatePresence: обёртке нужен только вход, а presence на React 19
          теряет сигнал выхода и оставляет пустое место до F5. Обе смонтированы
          всегда, гасшая не ловит касания. */}
      <div style={{ position: 'relative', flex: 1, minWidth: 0, height: 44 }}>
        <motion.div
          animate={{ opacity: barOnFeed ? 0 : 1, y: barOnFeed ? -6 : 0, scale: barOnFeed ? 0.94 : 1 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            pointerEvents: barOnFeed ? 'none' : 'auto',
          }}
        >
          <DynamicIsland>
        {nextToday ? (
          <>
            <Calendar size={15} style={{ color: 'var(--color-accent)' }} />
            <span>{t('Урок')} {fmtUntil(nextToday.st.minutesUntil)}</span>
          </>
        ) : !loaded ? (
          // Пока данные едут, ноль — это не «ноль дней», а «мы ещё не знаем».
          <Skeleton w={92} h={13} radius={999} />
        ) : (
          <>
            <Flame size={15} style={{ color: '#F8A23B' }} />
            <span>{stats.streak} {t('дней')}</span>
            <span style={{ opacity: 0.35 }}>·</span>
            <Zap size={14} style={{ color: 'var(--color-accent)' }} />
            <span>{stats.totalPoints}</span>
          </>
        )}
          </DynamicIsland>
        </motion.div>

        <motion.div
          animate={{ opacity: barOnFeed ? 1 : 0, y: barOnFeed ? 0 : 6, scale: barOnFeed ? 1 : 0.94 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            pointerEvents: barOnFeed ? 'auto' : 'none',
          }}
        >
          <div style={{ width: '100%' }}>
            <RubricBar chips={rubrics} value={rubric} onChange={pickRubric} accent={feedAccent} />
          </div>
        </motion.div>
      </div>
      {/* ПРАВЫЙ КРАЙ ШАПКИ РАБОТАЕТ НА ТО, ЧТО ПОД НЕЙ.
          Наверху главной это колокольчик: там читают «что нового у меня». В
          ленте новое — сама лента, а нужен ей отбор, и колокольчик уступает
          место фильтру ровно вместе с шапкой, одним переливом. Обе кнопки
          смонтированы всегда: гаснущая не ловит касания, а якорь всплывающих
          уведомлений не должен исчезать из дерева. */}
      {/* Коробка ровно по кнопке (44 = её тап-зона), иначе 44-пиксельная кнопка
          свисала вниз из 38-пиксельной коробки и кружок стоял на 3 px ниже
          острова и ряда рубрик. */}
      <div ref={bellRef} style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
        <motion.div
          animate={{ opacity: barOnFeed ? 0 : 1, scale: barOnFeed ? 0.88 : 1 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: barOnFeed ? 'none' : 'auto' }}
        >
          <GlassIconButton icon={<Bell size={17} />} size={42} dot={notifUnread > 0} ariaLabel={t('Уведомления')} onClick={() => setNotifOpen(o => !o)} />
        </motion.div>
        <motion.div
          animate={{ opacity: barOnFeed ? 1 : 0, scale: barOnFeed ? 1 : 0.88 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: barOnFeed ? 'auto' : 'none' }}
        >
          <GlassIconButton
            icon={<SlidersHorizontal size={17} />}
            size={42}
            // Точка — не «новое», а «лента показана не целиком»: по ней видно,
            // что пустоватая лента это ваш же отбор, а не поломка.
            dot={prefsTouched(prefs)}
            ariaLabel={t('Настройки ленты')}
            onClick={() => { tactile(); setPrefsOpen(true) }}
          />
        </motion.div>
      </div>
      <NotificationPopup open={notifOpen} anchorRef={bellRef} onClose={() => setNotifOpen(false)} />
    </div>
  )

  return (
    <>
      <MobileScreen topZone={topZone} topPad={72} restoreKey="home" onRefresh={refreshFeed}>
        {!loaded ? <HomeSkeleton /> : (
        <div className="flex flex-col" style={{ gap: 10 }}>
          {/* Плитки переходов: все переходы экрана одним рядом. Цветная
              заливка — «там есть дело», нейтральная — просто раздел. Ряд
              заменяет и плитки «Тренажёр»/«Курс», и жёлтую карточку домашки. */}
          <QuickRow
            subjects={scanSubjects}
            onLesson={continueInfo ? () => openLesson(continueInfo.lesson.id) : undefined}
            onHW={() => setActivePage('homeworkList')}
            onTrainer={() => setActivePage('trainer')}
            onCourses={() => openCourses()}
          />

          {/* Hero — Продолжить */}
          {continueInfo ? (
            <HeroContinue lesson={continueInfo.lesson} subjectName={continueInfo.subject.name} progress={continueInfo.subject.progress} onContinue={() => openLesson(continueInfo.lesson.id)} />
          ) : (
            <div className="flex flex-col items-center justify-center text-center" style={{ gap: 6, padding: '26px 16px', borderRadius: 20, background: 'var(--color-bg-3)' }}>
              <Lock size={22} style={{ color: 'var(--color-muted)' }} />
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>{t('Курс ещё не открыт')}</p>
              <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>{t('Преподаватель скоро добавит уроки')}</p>
            </div>
          )}

          {/* Статистика — компактная полоса, всегда на виду */}
          <div className="flex" style={{ gap: 6 }}>
            {homeStats.map((s, i) => (
              <MiniStat key={i} icon={s.icon} value={s.value} label={s.label} pair={s.pair} />
            ))}
          </div>

          {/* Сегодня */}
          {todayLessons.length > 0 && (
            <div style={{ borderRadius: 16, background: 'var(--color-surface)', border: '1px solid var(--color-border-glass)', boxShadow: 'var(--shadow-sm)', padding: 12 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)' }}>{t('Сегодня')}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-accent)' }}>{todayLessons.length} {t('занятия')}</span>
              </div>
              <div className="flex flex-col">
                {todayLessons.map((l, i) => (
                  <button
                    key={l.id}
                    onClick={() => { tactile(); openCourses() }}
                    className="flex items-center text-left"
                    style={{ gap: 10, padding: '7px 0', borderTop: i === 0 ? 'none' : '1px solid var(--color-border-soft)', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-accent)', minWidth: 44 }}>{l.time}</span>
                    <span className="flex-1 min-w-0 truncate" style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{l.lessonTitle}</span>
                    <ChevronRight size={16} style={{ color: 'var(--color-text-4)', flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Стикеры за принятые задания */}
          <MobileStickersRow />

          {/* Виджеты дня — те же правила уместности, что у десктопной карусели:
              химический факт на корейском курсе не нужен и здесь. */}
          {(dayCards.quiz || dayCards.facts || dayCards.memes) && (
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Виджеты дня')}</p>
              <div style={{ marginLeft: -16, marginRight: -16 }}>
                <MobileHScroll padX={16} gap={10}>
                  {dayCards.quiz && (
                    <WidgetCard
                      tag={t('Вопрос дня')} icon={<HelpCircle size={15} />}
                      accent="var(--color-purple-text)" bg="var(--color-purple-soft)"
                      text={dayCards.quiz.title}
                    />
                  )}
                  {dayCards.facts && (
                    <WidgetCard
                      tag={t('Факт дня')} icon={<Atom size={15} />}
                      accent="var(--color-green-text)" bg="var(--color-green-soft)"
                      text={dayCards.facts.text}
                    />
                  )}
                  {dayCards.memes && (
                    <WidgetCard
                      tag={t('Мем дня')} icon={<Star size={15} />}
                      accent="#B07A00" bg="var(--color-yellow-soft)"
                      text={dayCards.memes.setup}
                    />
                  )}
                </MobileHScroll>
              </div>
            </div>
          )}

          {/* Лента — хвост экрана. Верх главной — «что делать сейчас», и он
              кончается; дальше начинается то, что можно листать сколько
              захочется. Отступ здесь заметно больше остальных: это стык двух
              разных половин экрана, а не соседние блоки одного списка. */}
          <div ref={feedRef} style={{ marginTop: 14 }}>
            <FeedFlow
              lang={feedGlance.lang}
              subjectId={feedGlance.subjectId}
              items={feedItems}
              rubric={rubric}
            />
          </div>

          {/* Конец экрана вместо пустоты.
              Хвост главной складывается из четырёх необязательных блоков:
              занятия сегодня, стикеры, виджеты дня и лента. У ученика
              неязыкового предмета ленты нет вовсе, а в свободный день нет и
              первых трёх — и экран обрывался сразу после полосы статистики,
              оставляя две трети высоты пустыми. Пустота читается как
              «не загрузилось», хотя загружать было нечего. */}
          {todayLessons.length === 0
            && !dayCards.quiz && !dayCards.facts && !dayCards.memes
            && feedItems.length === 0 && (
            <button
              onClick={() => { tactile(); setActivePage('trainer') }}
              style={{
                marginTop: 6, width: '100%', textAlign: 'left', cursor: 'pointer',
                borderRadius: 16, padding: '14px 16px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border-glass)',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 12, flexShrink: 0,
                background: 'var(--color-bg-3)', display: 'grid', placeItems: 'center',
              }}>
                <Dumbbell size={17} strokeWidth={2.2} style={{ color: 'var(--color-text-2)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
                  {t('На сегодня всё')}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 1 }}>
                  {t('Занятий нет и лента пуста — можно позаниматься в тренажёре')}
                </div>
              </div>
              <ChevronRight size={17} style={{ color: 'var(--color-text-4)', flexShrink: 0 }} />
            </button>
          )}
        </div>
        )}
      </MobileScreen>

      {/* Обновление вытесняет переключатель курсов: пока оно есть, док занят им
          (и показывается даже при одном курсе, когда переключателя нет вовсе).
          Ушло обновление — треки курсов возвращаются на своё место. */}
      {updateReady ? (
        <MobileDock>
          <UpdateDockPill />
        </MobileDock>
      ) : multiCourse && (
        <MobileDock>
          <DockSegment
            options={[{ id: '__all__', label: t('Все') }, ...subjects.map((s, i) => ({ id: s.id, label: dockLabels[i] }))]}
            value={scopedSubject?.id ?? '__all__'}
            onChange={id => {
              if (id === '__all__') { setHomeAll(true); return }
              prevActiveId.current = id
              setHomeAll(false)
              setActiveSubject(id)
            }}
            accent={scopedSubject ? resolveSubjectPalette(scopedSubject.subject, dark).accent : undefined}
          />
        </MobileDock>
      )}

      <MobileBottomNav />

      {/* Настройки ленты — из фильтра в шапке. Список тем и типов собирается по
          ВСЕЙ ленте языка (до отбора): у выключенной темы иначе всегда стоял бы
          ноль, и включать её пришлось бы вслепую. */}
      <FeedContentSheet open={prefsOpen} onClose={() => setPrefsOpen(false)} items={feedGlance.items} />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Скелетон «Главной»
//
// ЗАЧЕМ ОН ИМЕННО ТАКОЙ. До прихода данных экран рисовал НАСТОЯЩИЙ пустой
// экран: «Курс ещё не открыт» и нули в статистике. Это враньё двух сортов.
// Смысловое — ученик читает «курса нет», хотя курс есть и сейчас появится.
// И механическое: пустой экран короче настоящего, он не прокручивается, а на
// нелистающейся странице и Safari, и WKWebView держат в safe-area-inset-bottom
// свою нижнюю панель — из-за чего док стоял выше домашней полосы, пока экран
// не потянут. Сам отступ дока с тех пор прибит константой
// MOBILE_DOCK_EDGE (lib/mobileTokens.ts), но длина скелетона важна и сама по
// себе: короткий экран не прокручивается и прыгает при подстановке данных.
//
// Поэтому блоки скелетона повторяют РЕАЛЬНЫЕ: те же радиусы, отступы и высоты,
// что у Hero, полосы статистики, «Сегодня» и быстрых действий. Экран сразу
// нужной длины — контент потом встаёт на свои места, ничего не прыгает.
// ─────────────────────────────────────────────────────────────────────────────
function HomeSkeleton() {
  return (
    <div className="flex flex-col" style={{ gap: 10 }} aria-hidden>
      {/* Плитки переходов: те же 48px и радиус 15, что у QuickTile */}
      <div className="flex items-start" style={{ gap: 6 }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="flex flex-col items-center" style={{ gap: 5, flex: 1 }}>
            <Skeleton w={48} h={48} radius={15} />
            <Skeleton w={32} h={11} radius={6} />
          </div>
        ))}
      </div>

      {/* Hero: те же 20px радиуса и padding 14, что у HeroContinue */}
      <div style={{ borderRadius: 20, padding: 14, background: 'var(--color-bg-3)' }}>
        <Skeleton w={120} h={10} radius={999} />
        {/* Заголовок скелета — тоже в две строки: в карточке под него
            зарезервирована постоянная высота, и одна полоска здесь означала бы
            прыжок ровно в момент, когда данные доехали. */}
        <Skeleton w="82%" h={19} style={{ margin: '5px 0 4px' }} />
        <Skeleton w="56%" h={19} style={{ marginBottom: 13 }} />
        <Skeleton w="100%" h={5} radius={99} style={{ marginBottom: 10 }} />
        <div className="flex items-center justify-between">
          <Skeleton w={78} h={11} radius={999} />
          <Skeleton w={104} h={30} radius={999} />
        </div>
      </div>

      {/* Полоса статистики: четыре плитки той же высоты, что MiniStat */}
      <div className="flex" style={{ gap: 6 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ flex: 1, minWidth: 0, borderRadius: 12, padding: '7px 8px', background: 'var(--color-bg-3)' }}>
            <Skeleton w="70%" h={15} radius={6} />
            <Skeleton w="52%" h={10} radius={6} style={{ marginTop: 3 }} />
          </div>
        ))}
      </div>

      {/* «Сегодня»: карточка со строками расписания */}
      <div style={{ borderRadius: 16, background: 'var(--color-surface)', border: '1px solid var(--color-border-glass)', boxShadow: 'var(--shadow-sm)', padding: 12 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
          <Skeleton w={62} h={13} radius={6} />
          <Skeleton w={54} h={11} radius={6} />
        </div>
        {[0, 1].map(i => (
          <div key={i} className="flex items-center" style={{ gap: 10, padding: '7px 0', borderTop: i === 0 ? 'none' : '1px solid var(--color-border-soft)' }}>
            <Skeleton w={44} h={13} radius={6} />
            <Skeleton w="62%" h={13} radius={6} />
          </div>
        ))}
      </div>

      {/* Лента: журнальные строки через разделители, как у настоящих постов */}
      <div style={{ marginTop: 14 }}>
        {[0, 1, 2].map(i => (
          <div key={i} className="flex flex-col" style={{ gap: 7, padding: '13px 0', borderTop: '1px solid var(--color-border-soft)' }}>
            <div className="flex items-center" style={{ gap: 7 }}>
              <Skeleton circle w={22} />
              <Skeleton w={110} h={11} radius={6} />
            </div>
            <Skeleton w="92%" h={16} radius={6} />
            <Skeleton w="70%" h={11} radius={6} />
          </div>
        ))}
      </div>
    </div>
  )
}

function MiniStat({ icon: Icon, value, label, pair }: { icon: LucideIcon; value: string | number; label: string; pair: { bg: string; text: string } }) {
  return (
    <div style={{ flex: 1, minWidth: 0, borderRadius: 12, padding: '7px 8px', background: pair.bg, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <div className="flex items-center" style={{ gap: 4 }}>
        <Icon size={13} style={{ color: pair.text, flexShrink: 0 }} />
        <div className="truncate" style={{ fontSize: 15, fontWeight: 800, color: pair.text, lineHeight: 1.1 }}>{value}</div>
      </div>
      <div className="truncate" style={{ fontSize: 10, fontWeight: 600, color: pair.text, opacity: 0.82 }}>{label}</div>
    </div>
  )
}

function HeroContinue({ lesson, subjectName, progress, onContinue }: { lesson: Lesson; subjectName: string; progress: number; onContinue: () => void }) {
  const t = useT()
  const status = getDisplayLessonStatus(lesson)
  const label = status === 'current' ? t('Продолжить') : t('Начать')
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      // Заливка и ореол — токенами, а не хексом: главная карточка красится в
      // цвет открытого курса (lib/courseTint.ts), и захардкоженный фиолетовый
      // оставлял бы её единственным фиолетовым пятном на перекрашенном экране.
      style={{ borderRadius: 20, padding: 14, color: '#fff', background: 'var(--grad-purple)', boxShadow: 'var(--glow-accent)' }}
    >
      <div className="truncate" style={{ fontSize: 10, fontWeight: 700, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label} · {subjectName}
      </div>
      <div style={{
        // ПОД ЗАГОЛОВОК ВСЕГДА ДВЕ СТРОКИ, сколько бы он ни занимал.
        // Курс переключается лентой прямо под карточкой, и названия занятий у
        // разных курсов разной длины: карточка то в одну строку, то в две — и
        // на каждом переключении вся главная под ней прыгала на двадцать
        // пикселей. Резерв дороже пустой строки: место постоянное, глаз держит
        // и кнопку «Продолжить», и первый пост ленты там, где их оставил.
        // Длинный заголовок по-прежнему обрезается на второй строке.
        fontSize: 16, fontWeight: 800, margin: '4px 0 10px', lineHeight: 1.2,
        minHeight: '2.4em',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {t('Занятие')} #{lesson.number + 1} · {lesson.title}
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.25)', borderRadius: 99, overflow: 'hidden', marginBottom: 10 }}>
        <div style={{ width: `${Math.max(4, progress)}%`, height: '100%', background: '#fff', borderRadius: 99 }} />
      </div>
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 11, opacity: 0.85 }}>{progress}% {t('пройдено')}</span>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => { tactile(); onContinue() }}
          className="flex items-center cursor-pointer"
          // Текст и стрелка на БЕЛОЙ таблетке, поэтому --color-control-accent,
          // а не --color-purple-text: последний в тёмной теме — светлая сирень
          // (он для текста на мягкой ЗАЛИВКЕ), и на белом «Продолжить» блёкло
          // выцветало. control-accent затемнён до читаемого с белым в обеих
          // темах и так же уходит в цвет открытого курса.
          style={{ gap: 6, background: '#fff', color: 'var(--color-control-accent)', fontWeight: 800, fontSize: 12.5, padding: '7px 15px', borderRadius: 999, border: 'none' }}
        >
          <Play size={14} fill="var(--color-control-accent)" />
          {label}
        </motion.button>
      </div>
    </motion.div>
  )
}

import type { Subject } from '../data/mockData'

// ─────────────────────────────────────────────────────────────────────────────
// Плитки переходов
//
// Один ряд — все переходы главной: урок, домашка, практика, слова, курс.
// Не кружки-сторис: скруглённый квадрат с мягкой заливкой, как иконка
// приложения, — ряд читается набором разделов, а не непросмотренными историями.
//
// Язык заливки: цветная пара зовёт («есть незакрытый урок», «есть домашка»),
// нейтральная — обычный раздел без срочного. Цвета берём парами из PAIR
// (mobileTokens) — заливка и текст на ней калиброваны под обе темы; нейтральная
// плитка — --color-bg-5, а НЕ border-переменные: в тёмной теме они почти
// невидимы (см. память invisible-in-dark).
// ─────────────────────────────────────────────────────────────────────────────
function QuickTile({ icon, label, pair, badge, onClick }: {
  icon: React.ReactNode
  label: string
  /** Цветная пара = «здесь есть дело»; undefined = обычный раздел. */
  pair?: PairName
  badge?: number
  onClick: () => void
}) {
  const p = pair ? PAIR[pair] : null
  // Подписи ряда — строчными, весь ряд одним регистром. В русском регистр берём
  // как есть: «ДЗ» — аббревиатура, строчными она читается опечаткой. В переводе
  // такой оговорки нет, а словарь отдаёт «Homework» с большой (в таблицах
  // учителя это верно) — и в ряду одна плитка торчала заглавной среди
  // lesson/practice/words/course. Здесь приводим к строчным сами.
  const lang = useLang(s => s.lang)
  const text = lang === 'ru' ? label : label.toLowerCase()
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={() => { tactile(); onClick() }}
      className="flex flex-col items-center cursor-pointer"
      style={{ gap: 5, background: 'none', border: 'none', padding: 0, minWidth: 0, flex: 1 }}
    >
      <span style={{
        position: 'relative', width: 48, height: 48, borderRadius: 15,
        background: p ? p.bg : 'var(--color-bg-5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: p ? p.text : 'var(--color-text-2)',
      }}>
        {icon}
        {badge != null && badge > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 17, height: 17, padding: '0 5px', borderRadius: 999,
            background: 'var(--grad-purple)', color: '#fff',
            fontSize: 9, fontWeight: 800, border: '1.5px solid var(--color-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{badge > 99 ? '99+' : badge}</span>
        )}
      </span>
      <span className="truncate" style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-2)', maxWidth: '100%' }}>{text}</span>
    </motion.button>
  )
}

function QuickRow({ subjects, onLesson, onHW, onTrainer, onCourses }: {
  subjects: Subject[]
  onLesson?: () => void
  onHW: () => void
  onTrainer: () => void
  onCourses: () => void
}) {
  const t = useT()
  const pending = subjects.flatMap(s => s.modules.flatMap(m => m.lessons))
    .filter(l => l.status === 'current' || l.status === 'returned').length

  // «Слова» ведут прямо в колоду повторения языкового тренажёра: кружок пишет
  // черновики режима ДО перехода — usePersistentState прочтёт их на маунте.
  const langDef = subjects.map(s => getSubject(s.subject)).find(d => d?.langCode && !d.native)
  const openWords = langDef ? () => {
    writeDraft(`trainer.${langDef.langCode}.mode`, 'vocab')
    writeDraft(`trainer.${langDef.langCode}.vocabView`, 'due')
    pickTrainerSubject(langDef.id)
    onTrainer()
  } : undefined

  return (
    <div className="flex items-start" style={{ gap: 6 }}>
      <QuickTile icon={<Play size={20} />} label={t('урок')} pair={onLesson ? 'focus' : undefined} onClick={onLesson ?? onCourses} />
      <QuickTile icon={<ClipboardList size={20} />} label={t('ДЗ')} pair={pending > 0 ? 'warning' : undefined} badge={pending} onClick={onHW} />
      <QuickTile icon={<Dumbbell size={20} />} label={t('практика')} pair="success" onClick={onTrainer} />
      {openWords && <QuickTile icon={<Layers size={20} />} label={t('слова')} onClick={openWords} />}
      <QuickTile icon={<BookOpen size={20} />} label={t('курс')} onClick={onCourses} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Лента на мобильной главной — НАСТОЯЩАЯ лента
//
// Верх главной кончился — дальше идёт сама лента, а не её анонс: те же посты,
// что в тренажёре (FeedPost), в оформлении flat — во всю ширину через волосяные
// разделители, как X/Threads на телефоне. Всё происходит на месте: ролик играет
// в посте, перевод раскрывается под текстом, сердце и тред — тапом. Тап по телу
// поста никуда не ведёт.
//
// БЕЗ ЧИПСЫ «НОВОЕ» И БЕЗ ПЕРЕСОРТИРОВКИ НЕПРОЧИТАННОГО НАВЕРХ: лента идёт
// свежим вниз, как везде, свежесть видна по времени в шапке поста, а счётчик
// нового остаётся бейджем в навбаре. Пост, побывший на экране, гасит его сам
// (useSeen внутри FeedPost) — здесь читают по-настоящему, а не подглядывают.
//
// ВЕРТИКАЛЬНАЯ И БЕСКОНЕЧНАЯ. Порции по 6; следующая приезжает, когда граница
// показалась на экране. Прокрутка живёт во внутреннем контейнере MobileScreen,
// поэтому слушаем scroll в фазе перехвата (IntersectionObserver — запасным).
// ─────────────────────────────────────────────────────────────────────────────

/** Сколько постов показываем сразу и сколько добавляем за одну подгрузку. */
const FEED_CHUNK = 6

function FeedFlow({ lang, subjectId, items, rubric }: {
  lang?: string
  subjectId?: string
  /** Уже отобранные рубрикой материалы — отбор живёт в шапке. */
  items: FeedItem[]
  /** Выбранная рубрика: сменилась — лента начинается заново, с первой порции. */
  rubric: FeedFilter
}) {
  const { dark } = useTheme()
  const [shown, setShown] = useState(FEED_CHUNK)
  const moreRef = useRef<HTMLDivElement>(null)

  // Сменился курс (а с ним язык ленты) или рубрика — начинаем сначала.
  useEffect(() => { setShown(FEED_CHUNK) }, [lang, rubric])

  useEffect(() => {
    const check = () => {
      const el = moreRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      if (r.top < window.innerHeight + 400) setShown(n => n + FEED_CHUNK)
    }
    check()
    window.addEventListener('scroll', check, { capture: true, passive: true })
    window.addEventListener('resize', check)
    const io = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(e => { if (e.some(x => x.isIntersecting)) check() }, { rootMargin: '400px 0px' })
      : null
    if (io && moreRef.current) io.observe(moreRef.current)
    return () => {
      window.removeEventListener('scroll', check, { capture: true } as EventListenerOptions)
      window.removeEventListener('resize', check)
      io?.disconnect()
    }
  }, [shown, items.length])

  if (!lang || items.length === 0) return null

  // Акцент ленты — цвет её предмета: им красятся глоссы, перевод и сердце.
  const accent = resolveSubjectPalette(subjectId, dark).accent

  const list = items.slice(0, shown)
  const hasMore = shown < items.length

  return (
    <div>
      {list.map(item => (
        <FeedPost
          key={item.id}
          item={item}
          lang={lang}
          accent={accent}
          subjectId={subjectId}
          variant="flat"
          when={dayLabel(item.date)}
        />
      ))}

      {/* Граница подгрузки: показалась — приезжает следующая порция. */}
      {hasMore && <div ref={moreRef} style={{ height: 1 }} aria-hidden />}
    </div>
  )
}

function WidgetCard({ tag, icon, accent, bg, text }: { tag: string; icon: React.ReactNode; accent: string; bg: string; text: string }) {
  return (
    <div style={{
      width: 150, flexShrink: 0, padding: 14, borderRadius: 18,
      background: bg, border: '1px solid transparent',
    }}>
      <div className="flex items-center" style={{ gap: 5, marginBottom: 7, color: accent }}>
        {icon}
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{tag}</span>
      </div>
      <p style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--color-text)', margin: 0, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {text}
      </p>
    </div>
  )
}
