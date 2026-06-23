import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  FlaskConical, Star, Bell, Lock, ChevronRight, Zap,
  CheckCircle2, Play, RotateCcw, Clock, Video,
} from 'lucide-react'
import MobileScreen from './MobileScreen'
import MobileBottomNav from './MobileBottomNav'
import MobileHScroll from './MobileHScroll'
import MobilePill from './MobilePill'
import { GlassPill, GlassIconButton } from './mobileChrome'
import { getDisplayLessonStatus } from '../lib/lessonStatus'
import { tactile } from '../lib/feedback'
import { useNow } from '../lib/useNow'
import { useStudentData } from '../store/studentDataStore'
import { useDashboard } from '../store/dashboardStore'
import type { Lesson, LessonStatus } from '../data/mockData'

// MOBILE ONLY course (v2) — premium lesson cards (плашки) + level/XP layer.
// Desktop CoursesPage untouched. Concept: each lesson is a rich card with a
// status thumbnail, title, status chip and reward; a level/XP hero on top.

const ALL = 'all' as const
const XP_PER_LEVEL = 200
const RANKS = ['Старт', 'Атомы', 'Молекулы', 'Реакции', 'Растворы', 'Эксперт', 'Мастер']

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

  const subject = subjects.find(s => s.id === activeSubjectId) ?? subjects[0]

  const lessons = useMemo<Lesson[]>(() => {
    if (!subject) return []
    return moduleTab === ALL
      ? subject.modules.flatMap(m => m.lessons)
      : (subject.modules.find(m => m.id === moduleTab)?.lessons ?? [])
  }, [subject, moduleTab])

  const moduleTabs: Array<{ id: number | typeof ALL; label: string }> = subject
    ? [{ id: ALL, label: 'Все' }, ...subject.modules.map(m => ({ id: m.id, label: m.label }))]
    : []

  // Level / XP from points.
  const level = Math.floor(stats.totalPoints / XP_PER_LEVEL) + 1
  const xpInLevel = stats.totalPoints % XP_PER_LEVEL
  const rank = RANKS[Math.min(level - 1, RANKS.length - 1)]

  const cycleSubject = () => {
    if (subjects.length < 2) return
    const idx = subjects.findIndex(s => s.id === subject?.id)
    const next = subjects[(idx + 1) % subjects.length]
    setActiveSubject(next.id)
  }

  const topZone = (
    <div className="flex items-center justify-between" style={{ gap: 8 }}>
      <GlassPill onClick={subjects.length > 1 ? cycleSubject : undefined}>
        <FlaskConical size={15} style={{ color: 'var(--color-accent)' }} />
        {subject?.name ?? 'Курс'}
      </GlassPill>
      <div className="flex items-center" style={{ gap: 8 }}>
        <GlassPill>
          <Star size={14} style={{ color: '#F8A23B' }} />
          {level} Lvl
        </GlassPill>
        <GlassIconButton icon={<Bell size={16} />} dot ariaLabel="Уведомления" />
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
                <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>Курс ещё не открыт</p>
                <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>Преподаватель откроет доступ к урокам</p>
              </>
            )}
            {!loaded && <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>Загрузка…</p>}
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: 14 }}>
            {/* Level / XP hero */}
            <div style={{ borderRadius: 20, padding: '14px 16px', background: 'var(--color-purple-soft)' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 9 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-purple-text)' }}>Уровень {level} · {rank}</span>
                <span className="flex items-center" style={{ gap: 4, fontSize: 12, fontWeight: 700, color: 'var(--color-purple-text)' }}>
                  <Zap size={13} />{xpInLevel}/{XP_PER_LEVEL} XP
                </span>
              </div>
              <div style={{ height: 8, background: 'rgba(var(--glass-rgb),0.5)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${Math.round((xpInLevel / XP_PER_LEVEL) * 100)}%`, height: '100%', background: 'linear-gradient(90deg,#9B6FE8,#C58BFF)', borderRadius: 99 }} />
              </div>
            </div>

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
                    focused={lesson.id === focusLessonId} onOpen={() => openLesson(lesson.id)} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: 160, color: 'var(--color-muted)', gap: 4 }}>
                <p style={{ fontSize: 14, fontWeight: 650, color: 'var(--color-text)' }}>В модуле пока нет уроков</p>
              </div>
            )}
          </div>
        )}
      </MobileScreen>
      <MobileBottomNav />
    </>
  )
}

function LessonCard({ lesson, status, index, focused, onOpen }: { lesson: Lesson; status: LessonStatus; index: number; focused: boolean; onOpen: () => void }) {
  const v = STATUS_VISUAL[status]
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
        border: isCurrent ? '1.5px solid var(--color-accent)' : '1px solid var(--color-border-glass)',
        boxShadow: isCurrent ? '0 0 0 4px rgba(123,63,204,0.12), var(--shadow-sm)' : 'var(--shadow-sm)',
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
            #{lesson.number} {lesson.title}
          </span>
          {status === 'completed' && lesson.points != null && (
            <span className="flex items-center flex-shrink-0" style={{ gap: 3, fontSize: 11, fontWeight: 700, color: '#B07A00', background: 'var(--color-yellow-soft)', padding: '3px 8px', borderRadius: 999, marginTop: 1 }}>
              <Zap size={11} />+{lesson.points}
            </span>
          )}
        </div>
        <div className="flex items-center" style={{ gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: v.tint }}>{isLocked ? 'Откроется позже' : v.label}</span>
        </div>
      </div>
      {/* trailing */}
      {!isLocked && <ChevronRight size={18} style={{ color: 'var(--color-text-4)', flexShrink: 0 }} />}
    </motion.button>
  )
}
