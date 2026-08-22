import { useState, useMemo } from 'react'
import Skeleton from './Skeleton'
import { motion } from 'framer-motion'
import {
  Star, Lock, ChevronRight, Zap,
  CheckCircle2, Play, RotateCcw, Clock, Video, LayoutList,
} from 'lucide-react'
import MobileScreen from './MobileScreen'
import MobileBottomNav from './MobileBottomNav'
import MobileDock, { DockSegment, DockCircle } from './MobileDock'
import MobileSheet from './MobileSheet'
import MobileHScroll from './MobileHScroll'
import MobilePill from './MobilePill'
import { GlassPill } from './mobileChrome'
import MobileBell from './MobileBell'
import { getDisplayLessonStatus } from '../lib/lessonStatus'
import { tactile } from '../lib/feedback'
import { useNow } from '../lib/useNow'
import { useStudentData } from '../store/studentDataStore'
import { useDashboard } from '../store/dashboardStore'
import { useT } from '../lib/i18n'
import { subjectIcon, subjectRank, resolveSubjectPalette } from '../lib/subjects'
import type { SubjectPalette } from '../lib/theme'
import { useTheme } from '../store/themeStore'
import type { Lesson, LessonStatus } from '../data/mockData'

// MOBILE ONLY course (v2) — premium lesson cards (плашки) + level/XP layer.
// Desktop CoursesPage untouched. Concept: each lesson is a rich card with a
// status thumbnail, title, status chip and reward; a level/XP hero on top.

const ALL = 'all' as const
const XP_PER_LEVEL = 200

type StatusVisual = { icon: typeof CheckCircle2; tintBg: string; tint: string; label: string }
const STATUS_VISUAL: Record<LessonStatus, StatusVisual> = {
  completed: { icon: CheckCircle2, tintBg: 'var(--color-green-soft)',  tint: 'var(--color-green-text)',  label: 'Выполнено' },
  current:   { icon: Play,         tintBg: 'var(--color-purple-soft)', tint: 'var(--color-purple-text)', label: 'Сейчас' },
  returned:  { icon: RotateCcw,    tintBg: 'var(--color-yellow-soft)', tint: 'var(--color-yellow-text)', label: 'Возврат' },
  submitted: { icon: Clock,        tintBg: 'var(--color-peach-soft)',  tint: 'var(--color-peach-text)',  label: 'Проверка' },
  unviewed:  { icon: Video,        tintBg: 'var(--color-red-soft)',    tint: 'var(--color-red-text)',    label: 'Запись' },
  locked:    { icon: Lock,         tintBg: 'var(--color-bg-3)',        tint: 'var(--color-muted)',       label: 'Закрыт' },
}

export default function MobileCourses() {
  const t = useT()
  const { dark } = useTheme()
  const subjects = useStudentData(s => s.subjects)
  const loaded = useStudentData(s => s.loaded)
  const stats = useStudentData(s => s.stats)
  const activeSubjectId = useDashboard(s => s.activeSubjectId)
  const setActiveSubject = useDashboard(s => s.setActiveSubject)
  const activeModuleId = useDashboard(s => s.activeModuleId)
  const setActiveModule = useDashboard(s => s.setActiveModule)
  const focusLessonId = useDashboard(s => s.coursesFocusLessonId)
  const openLesson = useDashboard(s => s.openLesson)
  const now = useNow()

  const [moduleTab, setModuleTab] = useState<number | typeof ALL>(activeModuleId)
  const [moduleSheet, setModuleSheet] = useState(false)

  const subject = subjects.find(s => s.id === activeSubjectId) ?? subjects[0]
  // Экран курса красится палитрой предмета, а не общим брендовым фиолетом:
  // корейский — индиго, японский — красный (lib/subjects.ts).
  const pal = resolveSubjectPalette(subject?.subject, dark)
  // «Сейчас» — статус текущего урока — тоже предметный, иначе на корейском
  // курсе половина экрана фиолетовая ни от чего.
  const statusVisual = (st: LessonStatus): StatusVisual =>
    st === 'current' ? { ...STATUS_VISUAL.current, tintBg: pal.soft, tint: pal.text } : STATUS_VISUAL[st]

  const lessons = useMemo<Lesson[]>(() => {
    if (!subject) return []
    return moduleTab === ALL
      ? subject.modules.flatMap(m => m.lessons)
      : (subject.modules.find(m => m.id === moduleTab)?.lessons ?? [])
  }, [subject, moduleTab])

  // Course-level stats surfaced under the XP hero (пройдено / средний балл /
  // прогресс) so progress is visible without opening the profile.
  const courseStats = useMemo(() => {
    if (!subject) return null
    const all = subject.modules.flatMap(m => m.lessons)
    const done = all.filter(l => l.status === 'completed').length
    const graded = all.filter(l => typeof l.points === 'number')
    const avg = graded.length ? Math.round(graded.reduce((s, l) => s + (l.points ?? 0), 0) / graded.length) : 0
    return { done, total: all.length, avg, progress: subject.progress }
  }, [subject])

  const moduleTabs: Array<{ id: number | typeof ALL; label: string }> = subject
    ? [{ id: ALL, label: t('Все') }, ...subject.modules.map(m => ({ id: m.id, label: m.label }))]
    : []

  // Level / XP from points.
  const level = Math.floor(stats.totalPoints / XP_PER_LEVEL) + 1
  const xpInLevel = stats.totalPoints % XP_PER_LEVEL
  // Звание — из лестницы предмета: у языка «Слова · Фразы · Диалоги», а не
  // химические «Молекулы» (lib/subjects.ts).
  const rank = subjectRank(subject?.subject, level)

  const selectSubject = (id: string) => {
    setActiveSubject(id)
    // Module ids are per-course positions — a tab from the old subject would
    // point at nothing (or the wrong module) in the new one.
    setModuleTab(ALL)
  }

  // Adaptive dock (В2 + В3): course switcher appears when the student has ≥2
  // courses; the module-index jump appears when a course has enough modules
  // that the horizontal chip row stops fitting. Neither → no dock.
  const showCourseSwitcher = subjects.length >= 2
  const showModuleIndex = !!subject && subject.modules.length > 6
  const showDock = showCourseSwitcher || showModuleIndex

  const topZone = (
    <div className="flex items-center justify-between" style={{ gap: 8 }}>
      <GlassPill>
        <span aria-hidden style={{ fontSize: 13, lineHeight: 1 }}>{subject ? subjectIcon(subject.subject) : '📚'}</span>
        {subject?.name ?? t('Курс')}
      </GlassPill>
      <div className="flex items-center" style={{ gap: 8 }}>
        <GlassPill>
          <Star size={14} style={{ color: '#F8A23B' }} />
          {level} Lvl
        </GlassPill>
        <MobileBell />
      </div>
    </div>
  )

  return (
    <>
      <MobileScreen topZone={topZone} topPad={72} topRaise={0} scrollKey={`${activeSubjectId}-${moduleTab}`}>
        {!subject ? (
          <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: 240, gap: 6 }}>
            {loaded && (
              <>
                <Lock size={22} style={{ color: 'var(--color-muted)', marginBottom: 4 }} />
                <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>{t('Курс ещё не открыт')}</p>
                <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>{t('Преподаватель откроет доступ к урокам')}</p>
              </>
            )}
            {!loaded && <Skeleton.Text lines={3} style={{ width: '100%', maxWidth: 280 }} />}
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: 14 }}>
            {/* Level / XP hero */}
            <div style={{ borderRadius: 20, padding: '14px 16px', background: pal.soft }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 9 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: pal.text }}>{t('Уровень')} {level} · {t(rank)}</span>
                <span className="flex items-center" style={{ gap: 4, fontSize: 12, fontWeight: 700, color: pal.text }}>
                  <Zap size={13} />{xpInLevel}/{XP_PER_LEVEL} XP
                </span>
              </div>
              <div style={{ height: 8, background: 'rgba(var(--glass-rgb),0.5)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${Math.round((xpInLevel / XP_PER_LEVEL) * 100)}%`, height: '100%', background: `linear-gradient(90deg, ${pal.accent}, color-mix(in srgb, ${pal.accent} 55%, #FFFFFF))`, borderRadius: 99 }} />
              </div>
            </div>

            {/* Course stats strip — progress visible at a glance */}
            {courseStats && (
              <div className="flex" style={{ gap: 8 }}>
                <CourseStat value={`${courseStats.done}/${courseStats.total}`} label={t('Уроков')} pair={STATUS_VISUAL.completed} />
                <CourseStat value={`${courseStats.progress}%`} label={t('Пройдено')} pair={statusVisual('current')} />
                <CourseStat value={courseStats.avg ? `${courseStats.avg}%` : '—'} label={t('Ср. балл')} pair={STATUS_VISUAL.submitted} />
              </div>
            )}

            {/* Module chips */}
            <div style={{ marginLeft: -16, marginRight: -16 }}>
              <MobileHScroll>
                {moduleTabs.map(tab => {
                  const module = typeof tab.id === 'number' ? subject.modules.find(m => m.id === tab.id) : null
                  const total = module?.lessons.length ?? 0
                  const done = module?.lessons.filter(l => l.status === 'completed').length ?? 0
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0
                  return (
                    <MobilePill key={tab.id} size="sm" active={moduleTab === tab.id}
                      onClick={() => { setModuleTab(tab.id); if (tab.id !== ALL) setActiveModule(tab.id) }}>
                      {tab.label}
                      {module && pct > 0 && (
                        <span style={{ marginLeft: 5, fontSize: 11, fontWeight: 600, color: pct === 100 ? 'var(--color-green-text)' : 'var(--color-muted)' }}>{pct}%</span>
                      )}
                    </MobilePill>
                  )
                })}
              </MobileHScroll>
            </div>

            {/* Lesson cards */}
            {lessons.length > 0 ? (
              <div className="flex flex-col" style={{ gap: 10 }}>
                {lessons.map((lesson, i) => (
                  <LessonCard key={lesson.id} lesson={lesson} status={getDisplayLessonStatus(lesson, now)} index={i}
                    pal={pal} focused={lesson.id === focusLessonId} onOpen={() => openLesson(lesson.id)} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: 160, color: 'var(--color-muted)', gap: 4 }}>
                <p style={{ fontSize: 14, fontWeight: 650, color: 'var(--color-text)' }}>{t('В модуле пока нет уроков')}</p>
              </div>
            )}
          </div>
        )}
      </MobileScreen>

      {/* Adaptive control dock — course switcher + module index */}
      {showDock && subject && (
        <MobileDock>
          {showCourseSwitcher && (
            <DockSegment
              options={subjects.map(s => ({ id: s.id, label: s.name }))}
              value={subject.id}
              onChange={selectSubject}
              accent={pal.accent}
            />
          )}
          {showModuleIndex && (
            <DockCircle icon={<LayoutList size={20} />} ariaLabel={t('Модули')} onClick={() => setModuleSheet(true)} />
          )}
        </MobileDock>
      )}

      {/* Module index — jump to any module without scrolling the chip row */}
      <MobileSheet open={moduleSheet} onClose={() => setModuleSheet(false)} title={t('Модули')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <ModuleRow pal={pal} label={t('Все уроки')} total={subject?.modules.flatMap(m => m.lessons).length ?? 0}
            done={subject?.modules.flatMap(m => m.lessons).filter(l => l.status === 'completed').length ?? 0}
            active={moduleTab === ALL}
            onClick={() => { setModuleTab(ALL); setModuleSheet(false) }} />
          {subject?.modules.map(m => {
            const total = m.lessons.length
            const done = m.lessons.filter(l => l.status === 'completed').length
            return (
              <ModuleRow key={m.id} pal={pal} label={m.label} total={total} done={done}
                active={moduleTab === m.id}
                onClick={() => { setModuleTab(m.id); setActiveModule(m.id); setModuleSheet(false) }} />
            )
          })}
        </div>
      </MobileSheet>

      <MobileBottomNav />
    </>
  )
}

function CourseStat({ value, label, pair }: { value: string; label: string; pair: StatusVisual }) {
  return (
    <div style={{ flex: 1, minWidth: 0, borderRadius: 14, padding: '11px 12px', background: pair.tintBg }}>
      <div style={{ fontSize: 17, fontWeight: 800, color: pair.tint, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: pair.tint, opacity: 0.85, marginTop: 4 }}>{label}</div>
    </div>
  )
}

function ModuleRow({ label, total, done, active, onClick, pal }: { label: string; total: number; done: number; active: boolean; onClick: () => void; pal: SubjectPalette }) {
  const t = useT()
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <motion.button
      whileTap={{ scale: 0.99 }}
      onClick={() => { tactile(); onClick() }}
      className="flex items-center text-left"
      style={{ gap: 12, width: '100%', padding: '12px 14px', borderRadius: 13, border: 'none', cursor: 'pointer',
        background: active ? pal.soft : 'transparent' }}
    >
      <div className="flex-1 min-w-0">
        <div className="truncate" style={{ fontSize: 14.5, fontWeight: 700, color: active ? pal.text : 'var(--color-text)' }}>{label}</div>
        <div style={{ fontSize: 11.5, color: 'var(--color-muted)', marginTop: 3 }}>{done} {t('из')} {total} · {pct}%</div>
      </div>
      <div style={{ width: 40, height: 6, borderRadius: 99, background: 'var(--color-bg-3)', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: pct === 100 ? 'var(--color-green-accent)' : pal.accent }} />
      </div>
    </motion.button>
  )
}

function LessonCard({ lesson, status, index, focused, onOpen, pal }: { lesson: Lesson; status: LessonStatus; index: number; focused: boolean; onOpen: () => void; pal: SubjectPalette }) {
  const t = useT()
  const v: StatusVisual = status === 'current' ? { ...STATUS_VISUAL.current, tintBg: pal.soft, tint: pal.text } : STATUS_VISUAL[status]
  const Icon = v.icon
  const isLocked = status === 'locked'
  const isCurrent = status === 'current'

  return (
    <motion.button
      whileTap={isLocked ? undefined : { scale: 0.985 }}
      onClick={() => { if (!isLocked) { tactile(); onOpen() } }}
      className="flex items-center text-left"
      style={{
        gap: 12, width: '100%', padding: 12, borderRadius: 20,
        background: 'var(--color-surface)',
        border: isCurrent ? `1.5px solid ${pal.accent}` : '1px solid var(--color-border-glass)',
        boxShadow: isCurrent ? `0 0 0 4px ${pal.ring}, var(--shadow-sm)` : 'var(--shadow-sm)',
        cursor: isLocked ? 'not-allowed' : 'pointer',
        opacity: isLocked ? 0.6 : 1,
      }}
    >
      {/* thumbnail */}
      <div className="flex items-center justify-center flex-shrink-0" style={{ width: 52, height: 52, borderRadius: 14, background: v.tintBg }}>
        <Icon size={22} style={{ color: v.tint }} {...(isCurrent ? { fill: v.tint } : {})} />
      </div>
      {/* body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start" style={{ gap: 6, marginBottom: 4 }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {lesson.title}
          </span>
          {status === 'completed' && lesson.points != null && (
            <span className="flex items-center flex-shrink-0" style={{ gap: 3, fontSize: 11, fontWeight: 700, color: '#B07A00', background: 'var(--color-yellow-soft)', padding: '3px 8px', borderRadius: 999, marginTop: 1 }}>
              <Zap size={11} />+{lesson.points}
            </span>
          )}
        </div>
        <div className="flex items-center" style={{ gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: v.tint }}>{isLocked ? t('Откроется позже') : t(v.label)}</span>
        </div>
      </div>
      {/* trailing */}
      {!isLocked && <ChevronRight size={18} style={{ color: 'var(--color-text-4)', flexShrink: 0 }} />}
    </motion.button>
  )
}
