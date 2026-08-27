import { useState, useEffect, useRef, useMemo, type ReactNode } from 'react'
import Skeleton from '../components/Skeleton'
import { motion } from 'framer-motion'
import { Search, X, SlidersHorizontal, ArrowUpDown, Check } from 'lucide-react'
import { glassCircle, MOBILE_DOCK_EDGE } from '../lib/mobileTokens'
import { useNavCollapse } from '../lib/useNavCollapse'
import { useKeyboardInset } from '../lib/useKeyboardInset'
import { type Lesson, type LessonStatus } from '../data/mockData'
import { getDisplayLessonStatus } from '../lib/lessonStatus'
import { playTransitionDrop } from '../lib/sound'
import { tactile } from '../lib/feedback'
import { useNow } from '../lib/useNow'
import { useIsDesktop } from '../lib/useIsDesktop'
import { useDashboard } from '../store/dashboardStore'
import { useFloatingPill } from '../lib/useFloatingPill'
import { useStudentData } from '../store/studentDataStore'
import MobileSheet from '../components/MobileSheet'
import HScrollFade from '../components/HScrollFade'
import { useT } from '../lib/i18n'

type StatusFilter = 'all' | 'active' | 'done'
const FILTER_OPTIONS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'Все занятия' },
  { id: 'active', label: 'Нужно сделать' },
  { id: 'done', label: 'Выполненные' },
]
const ACTIVE_STATUSES: LessonStatus[] = ['current', 'returned', 'unviewed', 'submitted']

// Soft surface colours per status — mirrors the course-track palette so a lesson
// reads the same here as it does on the track / in the detail popover.
const cardStyle: Record<LessonStatus, { bg: string; ring: string; label: string; subText: string }> = {
  completed: { bg: 'var(--color-green-soft)', ring: '#6EE7A0', label: 'var(--color-text)', subText: 'var(--color-green-text)' },
  returned:  { bg: 'var(--color-yellow-soft)', ring: '#F8EF8C', label: 'var(--color-text)', subText: 'var(--color-yellow-text)' },
  unviewed:  { bg: 'var(--color-red-soft)', ring: '#F48B91', label: 'var(--color-text)', subText: 'var(--color-red-text)' },
  submitted: { bg: 'var(--color-peach-soft)', ring: '#F8C991', label: 'var(--color-text)', subText: 'var(--color-peach-text)' },
  // Плита «сейчас» идёт за цветом курса с уровня «Акцент» (--lesson-card-soft,
  // lib/courseTint.ts): подпись здесь — --color-accent, и фиолетовая карточка
  // под коралловой подписью английского выглядела недокрашенной.
  current:   { bg: 'var(--lesson-card-soft)', ring: 'var(--color-purple)', label: 'var(--color-text)', subText: 'var(--color-accent)' },
  locked:    { bg: 'var(--color-bg-3)', ring: '#E0E0E2', label: 'var(--color-text-3)', subText: 'var(--color-text-5)' },
}

const ALL = 'all' as const

// Shared spring for the search pill morph — matches the trainer dock exactly.
const FIELD_MORPH = { type: 'spring', stiffness: 520, damping: 38, mass: 0.7 } as const
// Collapse tween for the dock shrink/drop on scroll (shared with the bottom nav).
const DOCK_COLLAPSE = { duration: 0.28, ease: [0.32, 0.72, 0, 1] as const }

export default function CoursesPage() {
  const t = useT()
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
  const isDesktop = useIsDesktop()
  // Mobile «ДЗ» dock state: the search collapses to a circle, and filter/sort
  // ride alongside it above the bottom nav (mirrors the trainer dock). On
  // desktop the dock is hidden and the classic top search field is used.
  const [searchExpanded, setSearchExpanded] = useState(false)
  // Тот же морф на десктопе: поле лежит кружком и раскрывается по клику, отдавая
  // ширину ряду курсов. Состояние отдельное от мобильного — ветки живут в DOM
  // одновременно, и общий флаг наводил бы фокус на скрытый инпут соседней вёрстки.
  const [deskSearchOpen, setDeskSearchOpen] = useState(false)
  const dSearchRef = useRef<HTMLInputElement>(null)
  const dSearchPillRef = useRef<HTMLDivElement>(null)
  const [sortDesc, setSortDesc] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [filterSheet, setFilterSheet] = useState(false)
  const mSearchRef = useRef<HTMLInputElement>(null)
  // Dock morph refs/metrics — the search pill grows to fill the dock's width,
  // and the sibling circles shrink + fade under it (trainer-identical).
  const [dockW, setDockW] = useState(0)
  const dockRef = useRef<HTMLDivElement>(null)
  const searchPillRef = useRef<HTMLDivElement>(null)
  // Scroll-driven shrink (shared with the bottom nav) + keyboard lift.
  const navCollapsed = useNavCollapse()
  const kbInset = useKeyboardInset()
  // Тот же разрешённый отступ, что у навигации и дока тренажёра: сырой env()
  // какое-то время врёт вверх, и док «ДЗ» висел выше, чем на других экранах.
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
    let base: Lesson[] = moduleTab === ALL
      ? subject.modules.flatMap(m => m.lessons)
      : (subject.modules.find(m => m.id === moduleTab)?.lessons ?? [])
    const q = search.trim().toLowerCase()
    if (q) base = base.filter(l =>
      l.title.toLowerCase().includes(q) || String(l.number).includes(q),
    )
    if (statusFilter !== 'all') base = base.filter(l => {
      const ds = getDisplayLessonStatus(l, now)
      return statusFilter === 'done' ? ds === 'completed' : ACTIVE_STATUSES.includes(ds)
    })
    // Copy before sorting — never mutate the module's lesson array in place.
    if (sortDesc) base = [...base].sort((a, b) => b.number - a.number)
    return base
  }, [subject, moduleTab, search, statusFilter, sortDesc, now])

  // Scroll the focused lesson into view + briefly ring it when arriving from a
  // specific entry point (track "Открыть урок", schedule card).
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  useEffect(() => {
    if (!focusLessonId) return
    const el = cardRefs.current[focusLessonId]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [focusLessonId, lessons])

  // Search pill focus/blur + tap-outside-to-collapse (mirrors the trainer dock).
  useEffect(() => {
    if (searchExpanded) mSearchRef.current?.focus({ preventScroll: true })
    else mSearchRef.current?.blur()
  }, [searchExpanded])
  useEffect(() => {
    if (!searchExpanded) return
    const onDown = (e: PointerEvent) => {
      if (!searchPillRef.current?.contains(e.target as Node)) setSearchExpanded(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [searchExpanded])

  // Десктопный кружок: фокус на раскрытии, схлопывание по клику мимо и по Esc.
  // Запрос при схлопывании сохраняется — кружок красится акцентом, чтобы «занятия
  // отфильтрованы» не превратилось в невидимое состояние.
  useEffect(() => {
    if (deskSearchOpen) dSearchRef.current?.focus({ preventScroll: true })
    // Схлопнули — снимаем фокус: иначе набор продолжал бы улетать в поле нулевой
    // ширины, и буквы фильтровали бы занятия невидимо для глаза.
    else dSearchRef.current?.blur()
  }, [deskSearchOpen])
  useEffect(() => {
    if (!deskSearchOpen) return
    const onDown = (e: PointerEvent) => {
      if (!dSearchPillRef.current?.contains(e.target as Node)) setDeskSearchOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDeskSearchOpen(false) }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [deskSearchOpen])

  const moduleTabs: Array<{ id: number | typeof ALL; label: string }> = subject ? [
    { id: ALL, label: t('Все') },
    ...subject.modules.map(m => ({ id: m.id, label: m.label })),
  ] : []

  if (!subject) {
    return (
      <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: 300, gap: 8 }}>
        {loaded && (
          <>
            <p style={{ fontSize: 16, fontWeight: 650, color: 'var(--color-text)' }}>{t('Курсы ещё не добавлены')}</p>
            <p style={{ fontSize: 13, marginTop: 4, color: 'var(--color-muted)' }}>{t('Преподаватель откроет доступ к урокам')}</p>
          </>
        )}
        {!loaded && <Skeleton.Text lines={3} style={{ width: '100%', maxWidth: 320 }} />}
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ gap: 18 }}>
      {/* ── Row 1: search (desktop only) + subject pills ── */}
      <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
        {/* Search field — desktop only; on mobile it lives in the bottom dock.
            Свёрнут в кружок: морфится только ШИРИНА (как в доке), поэтому иконка
            не прыгает, а фон с размытием не мигает. */}
        {isDesktop && (
        <motion.div
          ref={dSearchPillRef}
          className="flex items-center"
          initial={false}
          animate={{ width: deskSearchOpen ? 320 : 40 }}
          transition={FIELD_MORPH}
          onClick={() => { if (!deskSearchOpen) setDeskSearchOpen(true) }}
          aria-label={t('Поиск')}
          style={{
            gap: deskSearchOpen ? 8 : 0,
            height: 40,
            flex: '0 0 auto',
            padding: '0 11px',
            overflow: 'hidden',
            borderRadius: 999,
            background: 'rgba(var(--glass-rgb), 0.95)',
            border: '1px solid var(--color-border-soft)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
            color: search ? 'var(--color-accent)' : 'var(--color-text-3)',
            cursor: deskSearchOpen ? 'text' : 'pointer',
          }}
        >
          <Search size={16} style={{ flexShrink: 0 }} />
          <input
            ref={dSearchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('Поиск')}
            style={{
              flex: deskSearchOpen ? 1 : 0, width: deskSearchOpen ? undefined : 0,
              minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 14, fontWeight: 500, color: 'var(--color-text)',
              opacity: deskSearchOpen ? 1 : 0,
              pointerEvents: deskSearchOpen ? 'auto' : 'none',
            }}
          />
          {deskSearchOpen && (
            <button
              onClick={e => { e.stopPropagation(); setSearch(''); setDeskSearchOpen(false) }}
              aria-label={t('Закрыть поиск')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--color-text-3)', display: 'flex', alignItems: 'center', flexShrink: 0 }}
            >
              <X size={14} />
            </button>
          )}
        </motion.div>
        )}

        {/* Subject pills — одна строка со скроллом: курсов много, и перенос
            ронял бы сетку занятий на вторую-третью строку вниз. */}
        <HScrollFade gap={0} fadeWidth={40} style={{ flex: '1 1 0', minWidth: 0 }} scrollStyle={{ alignItems: 'center' }}>
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
              background: 'linear-gradient(var(--tab-pill-active), var(--tab-pill-active)), rgba(var(--glass-rgb), 0.55)',
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
                  flexShrink: 0,
                  // Длинное название курса ломается на вторую строку, а не тянет
                  // таблетку через пол-экрана: узкий столбик читается быстрее
                  // длинной строки, и соседние курсы остаются в поле зрения.
                  whiteSpace: 'normal',
                  maxWidth: 190,
                  textAlign: 'center',
                  lineHeight: 1.2,
                  padding: '8px 22px',
                  borderRadius: 999,
                  fontSize: 14,
                  fontWeight: 600,
                  background: 'transparent',
                  color: 'var(--color-text)',
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
                <span
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 2,
                    overflow: 'hidden',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {s.name}
                </span>
              </motion.button>
            )
          })}
        </div>
        </HScrollFade>
      </div>

      {/* ── Row 2: module tabs ── */}
      <HScrollFade gap={0} fadeWidth={40} scrollStyle={{ alignItems: 'center' }}>
      <div
        ref={modulePill.containerRef}
        className="flex items-center gap-1"
        style={{ position: 'relative', isolation: 'isolate' }}
      >
        {modulePill.pillRect && (
          <motion.span
            animate={modulePill.pillRect}
            transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.7 }}
            style={{
              position: 'absolute',
              borderRadius: 999,
              background: 'linear-gradient(var(--tab-pill-active), var(--tab-pill-active)), rgba(var(--glass-rgb), 0.55)',
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
                flexShrink: 0,
                whiteSpace: 'nowrap',
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
      </HScrollFade>

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
                    ? `0 0 0 2px var(--color-bg), 0 0 0 4px ${st.ring}, 0 6px 20px ${st.ring}66`
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
                      background: 'var(--lesson-badge-bg)',
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
                  {t('Занятие №')}{lesson.number + 1}
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
          <p style={{ fontSize: 15, fontWeight: 650, color: 'var(--color-text)' }}>{t('Ничего не найдено')}</p>
          <p style={{ fontSize: 13, marginTop: 3 }}>{t('Попробуйте изменить запрос или модуль')}</p>
        </div>
      )}

      {/* Clearance so the last lessons scroll clear of the floating dock. */}
      {!isDesktop && <div style={{ height: 44 }} />}

      {/* ── Mobile control dock — glass circles that drop + shrink with the nav
          on scroll; the search morphs from a circle into the full-width pill,
          the sibling circles sliding under it (trainer-identical). Desktop uses
          the top search field instead. ── */}
      {!isDesktop && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: MOBILE_DOCK_EDGE, zIndex: 65, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          <motion.div
            ref={dockRef}
            initial={false}
            // Keyboard up → lift just above it (the nav has slid away); otherwise
            // ride over the bottom nav, settling lower when the nav collapses.
            animate={{ marginBottom: kbInset > 0 ? kbInset + 12 : (navCollapsed ? 74 : 86) }}
            transition={DOCK_COLLAPSE}
            // gap 10 и круги 46px — как в доке тренажёра (MobileDock): раньше
            // здесь были свои 12 и 50/42, и «ДЗ» выглядел крупнее соседей.
            style={{ position: 'relative', display: 'flex', gap: 10, alignItems: 'center', pointerEvents: 'auto' }}
          >
            {/* Invisible spacer holding the search slot; the always-mounted pill
                (below) renders the visuals so opacity is never animated on a
                blurred element — the backdrop-blur never blinks off. */}
            <div style={{ width: 46, height: 46, flexShrink: 0, pointerEvents: 'none' }} />

            {/* Filter / sort — on expand they scale down, blur and drift right
                while fading, staggered left→right. */}
            {[
              { k: 'filter', icon: <SlidersHorizontal size={20} />, onClick: () => setFilterSheet(true), opts: { label: t('Фильтр'), active: statusFilter !== 'all' } },
              { k: 'sort', icon: <ArrowUpDown size={20} />, onClick: () => setSortDesc(v => !v), opts: { label: sortDesc ? t('Сначала новые') : t('Сначала старые'), active: sortDesc } },
            ].map((c, idx) => (
              <motion.div
                key={c.k}
                initial={false}
                animate={searchExpanded
                  ? { opacity: 0, scale: 0.5, x: 22 }
                  : { opacity: 1, scale: 1, x: 0 }}
                // Never tween opacity through the <1 zone (it suspends the child
                // circle's backdrop-filter → a 1-frame frost blink). Snap opacity
                // while the circle is HIDDEN under the pill; scale+x carry the
                // visible motion so the blur stays live the whole time.
                transition={{
                  ...FIELD_MORPH,
                  delay: searchExpanded ? idx * 0.04 : (1 - idx) * 0.04,
                  opacity: searchExpanded
                    ? { delay: 0.12 + idx * 0.05, duration: 0 }
                    : { duration: 0 },
                }}
                // NO `filter` on this wrapper — ever. A `filter` (even blur(0))
                // suppresses the child circle's `backdrop-filter`.
                style={{ pointerEvents: searchExpanded ? 'none' : 'auto' }}
              >
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { tactile(); c.onClick() }}
                  aria-label={c.opts.label}
                  style={{
                    ...glassCircle, position: 'relative', width: 46, height: 46,
                    background: 'rgba(var(--glass-rgb), var(--glass-fill))',
                    backdropFilter: 'blur(28px) saturate(200%)', WebkitBackdropFilter: 'blur(28px) saturate(200%)',
                    // Без своего белого inset — glassCircle уже несёт --shadow-pill,
                    // а inset в тёмной теме рисовал резкий контур (не как у соседей).
                    color: c.opts.active ? 'var(--color-accent)' : 'var(--color-text-2)',
                  }}
                >
                  {c.icon}
                  {c.opts.active && (
                    <span style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 999, background: 'var(--color-accent)' }} />
                  )}
                </motion.button>
              </motion.div>
            ))}

            {/* Search control — ALWAYS mounted at opacity 1; only its WIDTH morphs
                (circle → full dock). Fixed opacity means Chromium never suspends
                the backdrop-filter, so the frosted blur stays put through the
                whole expand/collapse instead of blinking. */}
            <motion.div
              ref={searchPillRef}
              initial={false}
              animate={{ width: searchExpanded ? dockW : 46, paddingLeft: 13 }}
              transition={FIELD_MORPH}
              onClick={() => { if (!searchExpanded) { tactile(); setDockW(dockRef.current?.offsetWidth ?? 0); setSearchExpanded(true) } }}
              aria-label={t('Поиск')}
              style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
                gap: searchExpanded ? 8 : 0,
                paddingRight: 15,
                borderRadius: 999, overflow: 'hidden',
                background: 'rgba(var(--glass-rgb), var(--glass-fill))',
                backdropFilter: 'blur(28px) saturate(200%)', WebkitBackdropFilter: 'blur(28px) saturate(200%)',
                border: '1px solid var(--color-border-glass)',
                boxShadow: 'var(--shadow-pill)',
                cursor: searchExpanded ? 'text' : 'pointer', pointerEvents: 'auto',
                color: search ? 'var(--color-accent)' : 'var(--color-text-2)',
              }}
            >
              <Search size={20} style={{ flexShrink: 0 }} />
              <input ref={mSearchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder={t('Поиск по занятиям')}
                style={{ flex: searchExpanded ? 1 : 0, width: searchExpanded ? undefined : 0, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: 16, color: 'var(--color-text)', opacity: searchExpanded ? 1 : 0, pointerEvents: searchExpanded ? 'auto' : 'none',
                  maskImage: 'linear-gradient(to right, #000 calc(100% - 18px), transparent)', WebkitMaskImage: 'linear-gradient(to right, #000 calc(100% - 18px), transparent)' }} />
              {searchExpanded && (
                <button onClick={e => { e.stopPropagation(); setSearch(''); setSearchExpanded(false) }} aria-label={t('Закрыть поиск')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', display: 'flex', flexShrink: 0, padding: 0 }}>
                  <X size={18} />
                </button>
              )}
            </motion.div>
          </motion.div>
        </div>
      )}

      {/* ── Filter sheet (mobile) ── */}
      <MobileSheet open={filterSheet} onClose={() => setFilterSheet(false)} title={t('Показывать')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {FILTER_OPTIONS.map(o => {
            const active = statusFilter === o.id
            return (
              <button
                key={o.id}
                onClick={() => { tactile(); setStatusFilter(o.id); setFilterSheet(false) }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '13px 15px', borderRadius: 14, cursor: 'pointer',
                  background: active ? 'var(--color-purple-soft)' : 'var(--color-bg-input)',
                  border: 'none', textAlign: 'left',
                  color: active ? 'var(--color-accent)' : 'var(--color-text)',
                  fontSize: 15, fontWeight: active ? 650 : 500,
                }}
              >
                {t(o.label)}
                {active && <Check size={18} />}
              </button>
            )
          })}
        </div>
      </MobileSheet>
    </div>
  )
}
