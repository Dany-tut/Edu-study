import { useRef, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Flame, Zap, Bell, Play, ChevronRight, Dumbbell, BookOpen, Lock, Calendar, ClipboardList, HelpCircle, Atom, Star, CheckCircle2, TrendingUp } from 'lucide-react'
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
import { dayLabel, outletById } from '../data/feed'
import { tactile } from '../lib/feedback'
import { PAIR } from '../lib/mobileTokens'
import { resolveSubjectPalette } from '../lib/subjects'
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

          {/* Домашнее задание */}
          <PendingHWCard subjects={scanSubjects} onOpenHW={() => setActivePage('homeworkList')} />

          {/* Быстрые действия */}
          <div className="flex" style={{ gap: 8 }}>
            <QuickTile icon={<Dumbbell size={18} />} title={t('Тренажёр')} sub={t('Решай задания')} bg="var(--color-green-soft)" fg="var(--color-green-text)" onClick={() => setActivePage('trainer')} />
            <QuickTile icon={<BookOpen size={18} />} title={t('Курс')} sub={t('Уроки и путь')} bg="var(--color-purple-soft)" fg="var(--color-purple-text)" onClick={() => openCourses()} />
          </div>

          {/* Лента: единственное, что назавтра другое */}
          <FeedStrip subject={scopedSubject?.subject} onOpen={() => setActivePage('trainer')} />

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

      {/* Быстрые действия — те же две плитки */}
      <div className="flex" style={{ gap: 8 }}>
        {[0, 1].map(i => (
          <div key={i} className="flex items-center" style={{ flex: 1, minWidth: 0, gap: 9, padding: '10px 12px', borderRadius: 14, background: 'var(--color-bg-3)' }}>
            <Skeleton circle w={18} />
            <span className="flex flex-col min-w-0" style={{ gap: 3, flex: 1 }}>
              <Skeleton w="58%" h={13} radius={6} />
              <Skeleton w="80%" h={10} radius={6} />
            </span>
          </div>
        ))}
      </div>

      {/* Лента: горизонтальная полоса карточек */}
      <div className="flex" style={{ gap: 10, overflow: 'hidden' }}>
        {[0, 1].map(i => (
          <Skeleton key={i} w={232} h={96} radius={16} style={{ flexShrink: 0 }} />
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

function QuickTile({ icon, title, sub, bg, fg, onClick }: { icon: React.ReactNode; title: string; sub: string; bg: string; fg: string; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={() => { tactile(); onClick() }}
      className="flex items-center text-left cursor-pointer"
      style={{ flex: 1, minWidth: 0, gap: 9, padding: '10px 12px', borderRadius: 14, background: bg, border: 'none' }}
    >
      <span className="flex items-center" style={{ color: fg, flexShrink: 0 }}>{icon}</span>
      <span className="flex flex-col min-w-0" style={{ gap: 1 }}>
        <span className="truncate" style={{ fontSize: 13, fontWeight: 800, color: fg }}>{title}</span>
        <span className="truncate" style={{ fontSize: 10.5, fontWeight: 500, color: fg, opacity: 0.8 }}>{sub}</span>
      </span>
    </motion.button>
  )
}

import type { Subject } from '../data/mockData'

function PendingHWCard({ subjects, onOpenHW }: { subjects: Subject[]; onOpenHW: () => void }) {
  const t = useT()
  const pending = subjects.flatMap(s =>
    s.modules.flatMap(m => m.lessons
      .filter(l => l.status === 'current' || l.status === 'returned')
      .map(l => ({ lesson: l, subjectName: s.name }))
    )
  )
  if (pending.length === 0) return null
  const first = pending[0]
  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      onClick={() => { tactile(); onOpenHW() }}
      className="flex items-center text-left cursor-pointer"
      style={{
        gap: 10, padding: '9px 11px', borderRadius: 14, border: '1px solid rgba(248,200,50,0.3)', width: '100%',
        background: 'var(--color-yellow-soft)',
      }}
    >
      <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(248,162,59,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <ClipboardList size={17} style={{ color: '#B07A00' }} />
      </div>
      <div className="flex-1 min-w-0">
        <div style={{ fontSize: 11, fontWeight: 700, color: '#B07A00' }}>{t('Домашнее задание')}</div>
        <div className="truncate" style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
          {first.lesson.title} · {first.subjectName}
        </div>
        {pending.length > 1 && (
          <div style={{ fontSize: 10.5, color: '#B07A00' }}>+{pending.length - 1} {t('ещё')}</div>
        )}
      </div>
      <ChevronRight size={16} style={{ color: '#B07A00', flexShrink: 0 }} />
    </motion.button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Лента на мобильной главной
//
// Ряд постов, а не карточка-список: на телефоне лента и листается пальцем, так
// что горизонтальный ряд — это она сама в миниатюре, а не оглавление к ней.
// Непрочитанное идёт первым и подсвечено; когда нового нет, ряд не исчезает —
// показывает свежее из уже виденного, иначе раздел мигал бы через день.
//
// Тап по любой карточке открывает ленту целиком: адресуемых постов у ленты нет
// и не будет (см. data/feed), её открывают сверху.
// ─────────────────────────────────────────────────────────────────────────────
function FeedStrip({ subject, onOpen }: { subject?: string; onOpen: () => void }) {
  const t = useT()
  const { lang, subjectId, items, unread } = useFeedGlance(0, subject)
  if (!lang || items.length === 0) return null

  const shown = [...unread, ...items.filter(x => !unread.includes(x))].slice(0, 8)

  const open = () => {
    tactile()
    queueTrainerLink({ kind: 'feed', lang })
    if (subjectId) pickTrainerSubject(subjectId)
    onOpen()
  }

  return (
    <div>
      <div className="flex items-center" style={{ gap: 6, marginBottom: 6 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
          {t('Лента')}
        </p>
        {unread.length > 0 && (
          <span style={{
            padding: '1px 7px', borderRadius: 999, background: 'var(--grad-purple)',
            color: '#fff', fontSize: 10, fontWeight: 800, lineHeight: '16px',
          }}>
            {unread.length}
          </span>
        )}
        <button
          onClick={open}
          style={{
            marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 2,
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 11.5, fontWeight: 700, color: 'var(--color-accent)',
          }}
        >
          {t('Открыть')} <ChevronRight size={13} />
        </button>
      </div>
      <div style={{ marginLeft: -16, marginRight: -16 }}>
        <MobileHScroll padX={16} gap={10}>
          {shown.map(item => {
            const outlet = outletById(item.outletId)
            const fresh = unread.includes(item)
            return (
              <button
                key={item.id}
                onClick={open}
                style={{
                  width: 168, flexShrink: 0, padding: 12, borderRadius: 18, textAlign: 'left',
                  background: fresh ? 'var(--color-purple-soft)' : 'var(--color-bg-3)',
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', flexDirection: 'column', gap: 7,
                }}
              >
                <span className="flex items-center" style={{ gap: 6, minWidth: 0 }}>
                  {/* Тот же знак источника, что в шапке поста: по нему видно,
                      чей материал, без второй строки с подписью. */}
                  <span aria-hidden style={{
                    flexShrink: 0, width: 20, height: 20, borderRadius: 999,
                    background: outlet?.tint ?? 'var(--color-accent)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: (outlet?.mark.length ?? 1) > 2 ? 7.5 : 9, fontWeight: 800, lineHeight: 1,
                  }}>
                    {outlet?.mark ?? '·'}
                  </span>
                  <span className="truncate" style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--color-text-3)' }}>
                    {dayLabel(item.date)}
                  </span>
                </span>
                <span style={{
                  fontSize: 12, lineHeight: 1.45, fontWeight: fresh ? 700 : 600,
                  color: fresh ? 'var(--color-text)' : 'var(--color-text-2)',
                  display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {item.title}
                </span>
              </button>
            )
          })}
        </MobileHScroll>
      </div>
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
