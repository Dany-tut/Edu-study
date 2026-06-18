import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Search, X, Lock } from 'lucide-react'
import MobileScreen from './MobileScreen'
import MobileBottomNav from './MobileBottomNav'
import MobileHScroll from './MobileHScroll'
import MobilePill from './MobilePill'
import { getDisplayLessonStatus } from '../lib/lessonStatus'
import { STATUS_PAIR } from '../lib/mobileTokens'
import { tactile } from '../lib/feedback'
import { useNow } from '../lib/useNow'
import { useStudentData } from '../store/studentDataStore'
import { useDashboard } from '../store/dashboardStore'
import type { Lesson, LessonStatus } from '../data/mockData'

// MOBILE ONLY courses catalogue. Desktop CoursesPage stays untouched.
// Top: glass search + subject chips. Body: module chips (h-scroll, fades) +
// lesson list (1 column, full width). Tap → openLesson (existing flow).

const ALL = 'all' as const

const LOCKED_PAIR = { bg: 'var(--color-bg-3)', text: 'var(--color-muted)' }
const STATUS_LABEL: Record<LessonStatus, string> = {
  completed: 'Выполнено',
  returned: 'Возврат',
  unviewed: 'Запись',
  submitted: 'Проверка',
  current: 'Текущий',
  locked: 'Закрыт',
}

function pairFor(status: LessonStatus) {
  return status === 'locked' ? LOCKED_PAIR : STATUS_PAIR[status]
}

export default function MobileCourses() {
  const subjects = useStudentData(s => s.subjects)
  const loaded = useStudentData(s => s.loaded)
  const activeSubjectId = useDashboard(s => s.activeSubjectId)
  const setActiveSubject = useDashboard(s => s.setActiveSubject)
  const activeModuleId = useDashboard(s => s.activeModuleId)
  const setActiveModule = useDashboard(s => s.setActiveModule)
  const focusLessonId = useDashboard(s => s.coursesFocusLessonId)
  const openLesson = useDashboard(s => s.openLesson)
  const now = useNow()

  const [moduleTab, setModuleTab] = useState<number | typeof ALL>(activeModuleId)
  const [search, setSearch] = useState('')

  const subject = subjects.find(s => s.id === activeSubjectId) ?? subjects[0]

  const lessons = useMemo<Lesson[]>(() => {
    if (!subject) return []
    const base = moduleTab === ALL
      ? subject.modules.flatMap(m => m.lessons)
      : (subject.modules.find(m => m.id === moduleTab)?.lessons ?? [])
    const q = search.trim().toLowerCase()
    if (!q) return base
    return base.filter(l => l.title.toLowerCase().includes(q) || String(l.number).includes(q))
  }, [subject, moduleTab, search])

  const moduleTabs: Array<{ id: number | typeof ALL; label: string }> = subject
    ? [{ id: ALL, label: 'Все' }, ...subject.modules.map(m => ({ id: m.id, label: m.label }))]
    : []

  // ── Top zone: glass search + subject chips ──────────────────────────────────
  const topZone = (
    <div
      style={{
        borderRadius: 22,
        background: 'rgba(var(--glass-rgb), 0.72)',
        backdropFilter: 'blur(18px) saturate(180%)',
        WebkitBackdropFilter: 'blur(18px) saturate(180%)',
        border: '1px solid var(--color-border-glass)',
        boxShadow: 'var(--shadow-bar)',
        padding: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div
        className="flex items-center"
        style={{
          gap: 8, height: 38, padding: '0 14px', borderRadius: 999,
          background: 'var(--color-bg-input)', border: '1px solid var(--color-border-soft)',
        }}
      >
        <Search size={16} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск урока"
          style={{
            flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
            fontSize: 14, fontWeight: 500, color: 'var(--color-text)',
          }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--color-text-3)', display: 'flex', flexShrink: 0 }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {subjects.length > 1 && (
        <MobileHScroll padX={2} fade="rgba(var(--glass-rgb), 0.95)">
          {subjects.map(s => (
            <MobilePill
              key={s.id}
              size="sm"
              active={s.id === activeSubjectId}
              onClick={() => setActiveSubject(s.id)}
            >
              {s.name}
            </MobilePill>
          ))}
        </MobileHScroll>
      )}
    </div>
  )

  // topPad: search row (38) + subject row (~34) + paddings ≈ 110; +8 if single subject.
  const topPad = subjects.length > 1 ? 116 : 78

  return (
    <>
      <MobileScreen topZone={topZone} topPad={topPad} scrollKey={`${activeSubjectId}-${moduleTab}`}>
        {!subject ? (
          <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: 240, gap: 6 }}>
            {loaded ? (
              <>
                <Lock size={22} style={{ color: 'var(--color-muted)', marginBottom: 4 }} />
                <p style={{ fontSize: 16, fontWeight: 650, color: 'var(--color-text)' }}>Курсы ещё не добавлены</p>
                <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>Преподаватель откроет доступ к урокам</p>
              </>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>Загрузка…</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: 14 }}>
            {/* Module chips — horizontal scroll with edge fades */}
            <div style={{ marginLeft: -16, marginRight: -16 }}>
              <MobileHScroll>
                {moduleTabs.map(tab => {
                  const module = typeof tab.id === 'number' ? subject.modules.find(m => m.id === tab.id) : null
                  const total = module?.lessons.length ?? 0
                  const done = module?.lessons.filter(l => l.status === 'completed').length ?? 0
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0
                  return (
                    <MobilePill
                      key={tab.id}
                      size="sm"
                      active={moduleTab === tab.id}
                      onClick={() => {
                        setModuleTab(tab.id)
                        if (tab.id !== ALL) setActiveModule(tab.id)
                      }}
                    >
                      {tab.label}
                      {module && pct > 0 && (
                        <span style={{ marginLeft: 5, fontSize: 11, fontWeight: 600, color: pct === 100 ? 'var(--color-green-text)' : 'var(--color-muted)' }}>
                          {pct}%
                        </span>
                      )}
                    </MobilePill>
                  )
                })}
              </MobileHScroll>
            </div>

            {/* Lesson list — one column, full width */}
            {lessons.length > 0 ? (
              <div className="flex flex-col" style={{ gap: 10 }}>
                {lessons.map((lesson, i) => {
                  const status = getDisplayLessonStatus(lesson, now)
                  const isLocked = status === 'locked'
                  const pair = pairFor(status)
                  const isFocused = lesson.id === focusLessonId
                  return (
                    <motion.button
                      key={lesson.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1], delay: Math.min(i * 0.02, 0.25) }}
                      whileTap={isLocked ? undefined : { scale: 0.985 }}
                      onClick={() => {
                        if (isLocked) return
                        tactile()
                        openLesson(lesson.id)
                      }}
                      className="flex items-center text-left"
                      style={{
                        gap: 12,
                        width: '100%',
                        padding: '14px 16px',
                        borderRadius: 18,
                        background: pair.bg,
                        border: '1px solid transparent',
                        cursor: isLocked ? 'not-allowed' : 'pointer',
                        boxShadow: isFocused ? '0 0 0 2px var(--color-accent)' : 'none',
                        opacity: isLocked ? 0.6 : 1,
                      }}
                    >
                      <div className="flex flex-col min-w-0" style={{ flex: 1, gap: 3 }}>
                        <span style={{ fontSize: 15, fontWeight: 650, color: 'var(--color-text)', lineHeight: 1.15 }}>
                          Занятие №{lesson.number + 1}
                        </span>
                        <span className="line-clamp-1" style={{ fontSize: 13, fontWeight: 500, color: pair.text, lineHeight: 1.2 }}>
                          {lesson.title}
                        </span>
                      </div>
                      {lesson.points !== undefined && !isLocked && (
                        <span style={{ flexShrink: 0, fontSize: 16, fontWeight: 750, color: pair.text }}>
                          {lesson.points}
                        </span>
                      )}
                      <span
                        style={{
                          flexShrink: 0, fontSize: 11, fontWeight: 650, color: pair.text,
                          padding: '4px 10px', borderRadius: 999,
                          background: 'rgba(var(--glass-rgb), 0.5)',
                        }}
                      >
                        {STATUS_LABEL[status]}
                      </span>
                    </motion.button>
                  )
                })}
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center text-center"
                style={{ minHeight: 180, borderRadius: 20, background: 'var(--color-bg-3)', color: 'var(--color-muted)', gap: 4 }}
              >
                <Search size={20} style={{ marginBottom: 4 }} />
                <p style={{ fontSize: 15, fontWeight: 650, color: 'var(--color-text)' }}>Ничего не найдено</p>
                <p style={{ fontSize: 13 }}>Измените запрос или модуль</p>
              </div>
            )}
          </div>
        )}
      </MobileScreen>
      <MobileBottomNav />
    </>
  )
}
