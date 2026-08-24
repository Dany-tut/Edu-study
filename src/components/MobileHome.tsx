import { useRef, useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Flame, Zap, Bell, Play, ChevronRight, Dumbbell, BookOpen, Lock, Calendar, ClipboardList, HelpCircle, Atom, Star, CheckCircle2, TrendingUp, Layers } from 'lucide-react'
import NotificationPopup from './NotificationPopup'
import { useNotificationsStore } from '../store/notificationsStore'
import MobileScreen from './MobileScreen'
import MobileBottomNav from './MobileBottomNav'
import MobileDock, { DockSegment } from './MobileDock'
import { stripCommonPrefix } from '../lib/courseLabels'
import MobileHScroll from './MobileHScroll'
import { DynamicIsland, GlassIconButton } from './mobileChrome'
import { getDisplayLessonStatus } from '../lib/lessonStatus'
import { useNow, lessonTimeState } from '../lib/useNow'
import MobileStickersRow from './MobileStickersRow'
import Skeleton from './Skeleton'
import { useStudentData } from '../store/studentDataStore'
import { useDashboard } from '../store/dashboardStore'
import { computeSubjectStats } from '../lib/db'
import { useWidgetRelevance } from '../lib/widgetVisibility'
import { useFeedGlance } from '../lib/feedRead'
import { queueTrainerLink } from '../lib/trainerLink'
import { pickTrainerSubject } from '../lib/trainerSubject'
import { dayLabel } from '../data/feed'
import { FeedPost } from './trainer/FeedPost'
import { tactile } from '../lib/feedback'
import { PAIR } from '../lib/mobileTokens'
import { writeDraft } from '../lib/useDraft'
import { resolveSubjectPalette, getSubject } from '../lib/subjects'
import { useTheme } from '../store/themeStore'
import { useT, t as tt } from '../lib/i18n'
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
  // «Все» в подсчёт общего префикса не входит: это не курс, и срезать у него
  // нечего — иначе одна чужая подпись отменяла бы срез для всех остальных.
  const dockLabels = useMemo(() => stripCommonPrefix(subjects.map(s => s.name)), [subjects])
  const [homeSubjectId, setHomeSubjectId] = useState<string | null>(null)
  const scopedSubject = multiCourse
    ? (subjects.find(s => s.id === homeSubjectId) ?? null)
    : null
  const scanSubjects = scopedSubject ? [scopedSubject] : subjects

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

  const topZone = (
    <div className="flex items-center justify-between" style={{ gap: 8 }}>
      <div style={{ width: 38, flexShrink: 0 }} />
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
      <div ref={bellRef} style={{ display: 'inline-flex' }}>
        <GlassIconButton icon={<Bell size={16} />} dot={notifUnread > 0} ariaLabel={t('Уведомления')} onClick={() => setNotifOpen(o => !o)} />
      </div>
      <NotificationPopup open={notifOpen} anchorRef={bellRef} onClose={() => setNotifOpen(false)} />
    </div>
  )

  return (
    <>
      <MobileScreen topZone={topZone} topPad={72}>
        {!loaded ? <HomeSkeleton /> : (
        <div className="flex flex-col" style={{ gap: 10 }}>
          {/* Кружки-сторис: все переходы экрана одним рядом. Цветное кольцо —
              «там есть дело», серое — просто раздел. Ряд заменяет и плитки
              «Тренажёр»/«Курс», и жёлтую карточку домашки. */}
          <StoriesRow
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
          <div style={{ marginTop: 14 }}>
            <FeedFlow subject={scopedSubject?.subject} onOpen={() => setActivePage('trainer')} />
          </div>
        </div>
        )}
      </MobileScreen>

      {/* В2 — course scope switcher (only with 2–4 courses) */}
      {multiCourse && (
        <MobileDock>
          <DockSegment
            options={[{ id: '__all__', label: t('Все') }, ...subjects.map((s, i) => ({ id: s.id, label: dockLabels[i] }))]}
            value={scopedSubject?.id ?? '__all__'}
            onChange={id => setHomeSubjectId(id === '__all__' ? null : id)}
            accent={scopedSubject ? resolveSubjectPalette(scopedSubject.subject, dark).accent : undefined}
          />
        </MobileDock>
      )}

      <MobileBottomNav />
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
// не потянут (см. lib/bottomSafe.ts).
//
// Поэтому блоки скелетона повторяют РЕАЛЬНЫЕ: те же радиусы, отступы и высоты,
// что у Hero, полосы статистики, «Сегодня» и быстрых действий. Экран сразу
// нужной длины — контент потом встаёт на свои места, ничего не прыгает.
// ─────────────────────────────────────────────────────────────────────────────
function HomeSkeleton() {
  return (
    <div className="flex flex-col" style={{ gap: 10 }} aria-hidden>
      {/* Кружки-сторис: те же 52px, что у StoryCircle */}
      <div className="flex items-start" style={{ gap: 4 }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="flex flex-col items-center" style={{ gap: 4, flex: 1 }}>
            <Skeleton circle w={52} />
            <Skeleton w={30} h={10} radius={6} />
          </div>
        ))}
      </div>

      {/* Hero: те же 20px радиуса и padding 14, что у HeroContinue */}
      <div style={{ borderRadius: 20, padding: 14, background: 'var(--color-bg-3)' }}>
        <Skeleton w={120} h={10} radius={999} />
        <Skeleton w="82%" h={19} style={{ margin: '6px 0 12px' }} />
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
      style={{ borderRadius: 20, padding: 14, color: '#fff', background: 'linear-gradient(135deg, #9B6FE8, #6F3FBF)', boxShadow: '0 12px 28px rgba(123,63,204,0.35)' }}
    >
      <div className="truncate" style={{ fontSize: 10, fontWeight: 700, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label} · {subjectName}
      </div>
      <div style={{
        // На телефоне заголовок занимает ровно столько строк, сколько нужно
        // (без резерва под вторую), длинный — обрезается на двух.
        fontSize: 16, fontWeight: 800, margin: '4px 0 10px', lineHeight: 1.2,
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
          style={{ gap: 6, background: '#fff', color: '#7B3FCC', fontWeight: 800, fontSize: 12.5, padding: '7px 15px', borderRadius: 999, border: 'none' }}
        >
          <Play size={14} fill="#7B3FCC" />
          {label}
        </motion.button>
      </div>
    </motion.div>
  )
}

import type { Subject } from '../data/mockData'

// ─────────────────────────────────────────────────────────────────────────────
// Кружки-сторис
//
// Один ряд — все переходы главной: урок, домашка, тренажёр, слова, курс.
// Язык колец: цветное кольцо зовёт («есть незакрытый урок», «есть домашка»),
// серое — обычный раздел без срочного. Кольцо рисуется рамкой самого кружка,
// но серое НЕ из border-переменных: в тёмной теме они почти невидимы
// (см. память invisible-in-dark), поэтому серый — это --color-text-4.
// ─────────────────────────────────────────────────────────────────────────────
function StoryCircle({ icon, label, ring, tint, badge, onClick }: {
  icon: React.ReactNode
  label: string
  /** Цвет кольца; undefined = серое «просто раздел». */
  ring?: string
  /** Цвет иконки; по умолчанию цвет кольца или приглушённый текст. */
  tint?: string
  badge?: number
  onClick: () => void
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={() => { tactile(); onClick() }}
      className="flex flex-col items-center cursor-pointer"
      style={{ gap: 4, background: 'none', border: 'none', padding: 0, minWidth: 0, flex: 1 }}
    >
      <span style={{
        position: 'relative', width: 52, height: 52, borderRadius: 999,
        border: `2px solid ${ring ?? 'var(--color-text-4)'}`,
        background: 'var(--color-bg-3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: tint ?? ring ?? 'var(--color-text-2)',
      }}>
        {icon}
        {badge != null && badge > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -6,
            minWidth: 17, height: 17, padding: '0 5px', borderRadius: 999,
            background: 'var(--grad-purple)', color: '#fff',
            fontSize: 9, fontWeight: 800, border: '1.5px solid var(--color-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{badge > 99 ? '99+' : badge}</span>
        )}
      </span>
      <span className="truncate" style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-3)', maxWidth: '100%' }}>{label}</span>
    </motion.button>
  )
}

function StoriesRow({ subjects, onLesson, onHW, onTrainer, onCourses }: {
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
    <div className="flex items-start" style={{ gap: 4 }}>
      <StoryCircle icon={<Play size={21} />} label={t('урок')} ring={onLesson ? 'var(--color-purple-text)' : undefined} onClick={onLesson ?? onCourses} />
      <StoryCircle icon={<ClipboardList size={21} />} label={t('ДЗ')} ring={pending > 0 ? 'var(--color-yellow-text)' : undefined} badge={pending} onClick={onHW} />
      <StoryCircle icon={<Dumbbell size={21} />} label={t('дрилл')} ring="var(--color-green-text)" onClick={onTrainer} />
      {openWords && <StoryCircle icon={<Layers size={21} />} label={t('слова')} onClick={openWords} />}
      <StoryCircle icon={<BookOpen size={21} />} label={t('курс')} onClick={onCourses} />
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

function FeedFlow({ subject, onOpen }: { subject?: string; onOpen: () => void }) {
  const t = useT()
  const { dark } = useTheme()
  const { lang, subjectId, items } = useFeedGlance(0, subject)
  const [shown, setShown] = useState(FEED_CHUNK)
  const moreRef = useRef<HTMLDivElement>(null)

  // Сменился курс (а с ним язык ленты) — начинаем сначала.
  useEffect(() => { setShown(FEED_CHUNK) }, [lang])

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

  const open = () => {
    tactile()
    queueTrainerLink({ kind: 'feed', lang })
    if (subjectId) pickTrainerSubject(subjectId)
    onOpen()
  }

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

      {!hasMore && (
        <button
          onClick={open}
          style={{
            width: '100%', padding: '13px 0 4px', background: 'none',
            border: 'none', borderTop: '1px solid var(--color-border-soft)', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: 'var(--color-accent)',
            textAlign: 'center',
          }}
        >
          {t('Открыть ленту целиком')}
        </button>
      )}
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
