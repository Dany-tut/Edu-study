import { useState, useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { type Lesson, type LessonStatus } from '../data/mockData'
import { getDisplayLessonStatus } from '../lib/lessonStatus'
import { playTransitionDrop } from '../lib/sound'
import { useNow } from '../lib/useNow'
import { useDashboard } from '../store/dashboardStore'
import { useFloatingPill } from '../lib/useFloatingPill'
import { useStudentData } from '../store/studentDataStore'

// Soft surface colours per status — mirrors the course-track palette so a lesson
// reads the same here as it does on the track / in the detail popover.
const cardStyle: Record<LessonStatus, { bg: string; ring: string; label: string; subText: string }> = {
  completed: { bg: 'var(--color-green-soft)', ring: '#6EE7A0', label: 'var(--color-text)', subText: '#4C804F' },
  returned:  { bg: 'var(--color-yellow-soft)', ring: '#F8EF8C', label: 'var(--color-text)', subText: 'var(--color-yellow-text)' },
  unviewed:  { bg: 'var(--color-red-soft)', ring: '#F48B91', label: 'var(--color-text)', subText: 'var(--color-red-text)' },
  submitted: { bg: 'var(--color-peach-soft)', ring: '#F8C991', label: 'var(--color-text)', subText: 'var(--color-peach-text)' },
  current:   { bg: 'var(--color-purple-soft)', ring: 'var(--color-purple)', label: 'var(--color-text)', subText: 'var(--color-accent)' },
  locked:    { bg: 'var(--color-bg-3)', ring: '#E0E0E2', label: 'var(--color-text-3)', subText: 'var(--color-text-5)' },
}

const ALL = 'all' as const

export default function CoursesPage() {
  const activeSubjectId = useDashboard(s => s.activeSubjectId)
  const setActiveSubject = useDashboard(s => s.setActiveSubject)
  const activeModuleId = useDashboard(s => s.activeModuleId)
  const setActiveModule = useDashboard(s => s.setActiveModule)
  const focusLessonId = useDashboard(s => s.coursesFocusLessonId)
  const openLesson = useDashboard(s => s.openLesson)
  const now = useNow()

  // "Все" (all modules) vs a single module. Local — defaults to the subject's
  // active module so a focused lesson lands on its own section.
  const [moduleTab, setModuleTab] = useState<number | typeof ALL>(activeModuleId)
  const [search, setSearch] = useState('')
  const subjects = useStudentData(s => s.subjects)
  const loaded = useStudentData(s => s.loaded)
  const subjectPill = useFloatingPill(activeSubjectId)
  const modulePill = useFloatingPill(moduleTab)

  const subject = subjects.find(s => s.id === activeSubjectId) ?? subjects[0]

  // Keep the module tab in sync when the active module changes from outside
  // (e.g. opening Courses focused on a specific lesson, or switching subject).
  useEffect(() => { setModuleTab(activeModuleId) }, [activeModuleId, activeSubjectId])

  // The lessons to show: a single module, or every lesson in the subject when
  // "Все" is selected. Search narrows by title or lesson number.
  const lessons = useMemo(() => {
    if (!subject) return []
    const base: Lesson[] = moduleTab === ALL
      ? subject.modules.flatMap(m => m.lessons)
      : (subject.modules.find(m => m.id === moduleTab)?.lessons ?? [])
    const q = search.trim().toLowerCase()
    if (!q) return base
    return base.filter(l =>
      l.title.toLowerCase().includes(q) || String(l.number).includes(q),
    )
  }, [subject, moduleTab, search])

  // Scroll the focused lesson into view + briefly ring it when arriving from a
  // specific entry point (track "Открыть урок", schedule card).
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  useEffect(() => {
    if (!focusLessonId) return
    const el = cardRefs.current[focusLessonId]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [focusLessonId, lessons])

  const moduleTabs: Array<{ id: number | typeof ALL; label: string }> = subject ? [
    { id: ALL, label: 'Все' },
    ...subject.modules.map(m => ({ id: m.id, label: m.label })),
  ] : []

  if (!subject) {
    return (
      <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: 300, gap: 8 }}>
        {loaded ? (
          <>
            <p style={{ fontSize: 16, fontWeight: 650, color: 'var(--color-text)' }}>Курсы ещё не добавлены</p>
            <p style={{ fontSize: 13, marginTop: 4, color: 'var(--color-muted)' }}>Преподаватель откроет доступ к урокам</p>
          </>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>Загрузка…</p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ gap: 18 }}>
      {/* ── Row 1: search + subject pills ── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search field */}
        <div
          className="flex items-center"
          style={{
            gap: 8,
            height: 40,
            padding: '0 16px',
            borderRadius: 999,
            background: 'rgba(var(--glass-rgb), 0.95)',
            border: '1px solid var(--color-border-soft)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
            flex: '1 1 220px',
            maxWidth: 320,
          }}
        >
          <Search size={16} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск"
            style={{
              flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 14, fontWeight: 500, color: 'var(--color-text)',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--color-text-3)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Subject pills */}
        <div
          ref={subjectPill.containerRef}
          className="flex items-center gap-2"
          style={{ position: 'relative', isolation: 'isolate' }}
        >
        {subjectPill.pillRect && (
          <motion.span
            animate={subjectPill.pillRect}
            transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.7 }}
            style={{
              position: 'absolute',
              borderRadius: 999,
              background: 'rgba(var(--glass-rgb), 0.55)',
              backdropFilter: 'blur(16px) saturate(180%)',
              WebkitBackdropFilter: 'blur(16px) saturate(180%)',
              boxShadow: 'var(--shadow-xs)',
              border: '1px solid var(--color-border-glass)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
        )}
          {subjects.map(s => {
            const isActive = s.id === activeSubjectId
            return (
              <motion.button
                key={s.id}
                ref={subjectPill.registerItem(s.id)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  if (s.id === activeSubjectId) return
                  playTransitionDrop()
                  setActiveSubject(s.id)
                }}
                style={{
                  position: 'relative',
                  zIndex: isActive ? 3 : 1,
                  padding: '8px 22px',
                  borderRadius: 999,
                  fontSize: 14,
                  fontWeight: 600,
                  background: 'transparent',
                  color: 'var(--color-text)',
                  border: isActive ? '1px solid transparent' : '1px solid var(--color-border-medium)',
                  outline: 'none',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  boxShadow: 'none',
                  backgroundClip: 'padding-box',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'color 0.16s ease',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span style={{ position: 'relative', zIndex: 1 }}>{s.name}</span>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* ── Row 2: module tabs ── */}
      <div
        ref={modulePill.containerRef}
        className="flex items-center gap-1 flex-wrap"
        style={{ position: 'relative', isolation: 'isolate' }}
      >
        {modulePill.pillRect && (
          <motion.span
            animate={modulePill.pillRect}
            transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.7 }}
            style={{
              position: 'absolute',
              borderRadius: 999,
              background: 'rgba(var(--glass-rgb), 0.55)',
              backdropFilter: 'blur(16px) saturate(180%)',
              WebkitBackdropFilter: 'blur(16px) saturate(180%)',
              boxShadow: 'var(--shadow-xs)',
              border: '1px solid var(--color-border-glass)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
        )}
        {moduleTabs.map(tab => {
          const isActive = moduleTab === tab.id
          const module = typeof tab.id === 'number'
            ? subject.modules.find(m => m.id === tab.id)
            : null
          const totalLessons = module?.lessons.length ?? 0
          const completedLessons = module?.lessons.filter(l => l.status === 'completed').length ?? 0
          const pct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
          return (
            <motion.button
              key={tab.id}
              ref={modulePill.registerItem(tab.id)}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                if (moduleTab === tab.id) return
                playTransitionDrop()
                setModuleTab(tab.id)
                if (tab.id !== ALL) setActiveModule(tab.id)
              }}
              style={{
                position: 'relative',
                zIndex: isActive ? 3 : 1,
                padding: '7px 16px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 650,
                background: 'transparent',
                color: module && pct === 100 ? 'var(--color-green-text)' : 'var(--color-text)',
                border: '1px solid transparent',
                outline: 'none',
                appearance: 'none',
                WebkitAppearance: 'none',
                boxShadow: 'none',
                backgroundClip: 'padding-box',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'color 0.16s ease',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {!isActive && (
                <motion.span
                  aria-hidden
                  initial={false}
                  whileHover={{ opacity: 1 }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 999,
                    background: 'rgba(240,240,242,0.92)',
                    opacity: 0,
                    pointerEvents: 'none',
                    zIndex: 0,
                  }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                />
              )}
              <span style={{ position: 'relative', zIndex: 1 }}>{tab.label}</span>
              {module && pct > 0 && (
                <span
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    marginLeft: 6,
                    fontSize: 11,
                    fontWeight: 500,
                    color: pct === 100 ? 'var(--color-green-text)' : (isActive ? 'var(--color-muted)' : 'var(--color-text-3)'),
                  }}
                >
                  {pct}%
                </span>
              )}
            </motion.button>
          )
        })}
      </div>

      {/* ── Lesson grid ── */}
      {lessons.length > 0 ? (
        <div
          className="grid"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 14,
          }}
        >
          {lessons.map((lesson, i) => {
            const displayStatus = getDisplayLessonStatus(lesson, now)
            const st = cardStyle[displayStatus]
            const isFocused = lesson.id === focusLessonId
            const isLocked = displayStatus === 'locked'
            return (
              <motion.button
                key={lesson.id}
                ref={el => { cardRefs.current[lesson.id] = el }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1], delay: Math.min(i * 0.02, 0.3) }}
                whileHover={isLocked ? undefined : { scale: 1.02 }}
                whileTap={isLocked ? undefined : { scale: 0.98 }}
                onClick={() => { if (!isLocked) openLesson(lesson.id) }}
                className="flex flex-col items-center justify-center text-center"
                style={{
                  position: 'relative',
                  minHeight: 86,
                  padding: '16px 18px',
                  gap: 4,
                  borderRadius: 18,
                  background: st.bg,
                  border: '1px solid transparent',
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  boxShadow: isFocused
                    ? `0 0 0 2px #fff, 0 0 0 4px ${st.ring}, 0 6px 20px ${st.ring}66`
                    : 'none',
                  transition: 'box-shadow 0.2s ease',
                }}
              >
                {lesson.points !== undefined && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      minWidth: 34,
                      padding: '3px 8px',
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.68)',
                      color: st.subText,
                      fontSize: 11,
                      fontWeight: 750,
                      lineHeight: 1,
                      boxShadow: 'var(--shadow-inset)',
                    }}
                  >
                    {lesson.points}
                  </span>
                )}
                <span style={{ fontSize: 15, fontWeight: 650, color: st.label, lineHeight: 1.2 }}>
                  Занятие №{lesson.number}
                </span>
                <span
                  className="line-clamp-2"
                  style={{ fontSize: 12.5, fontWeight: 500, color: st.subText, lineHeight: 1.25 }}
                >
                  {lesson.title}
                </span>
              </motion.button>
            )
          })}
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center text-center"
          style={{
            minHeight: 200, borderRadius: 24, background: 'var(--color-bg-3)', color: 'var(--color-muted)',
          }}
        >
          <Search size={22} style={{ marginBottom: 8 }} />
          <p style={{ fontSize: 15, fontWeight: 650, color: 'var(--color-text)' }}>Ничего не найдено</p>
          <p style={{ fontSize: 13, marginTop: 3 }}>Попробуйте изменить запрос или модуль</p>
        </div>
      )}
    </div>
  )
}
