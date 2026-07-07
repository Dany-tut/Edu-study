import { useState, useRef, useEffect, useCallback } from 'react'
import Skeleton from './Skeleton'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, RotateCcw, Upload, Lock, Play, Star, Clock } from 'lucide-react'
import { IconLessonRecording } from './icons'
import { type Subject, type Lesson, type LessonStatus } from '../data/mockData'
import { useStudentData } from '../store/studentDataStore'
import { HARD_STYLE } from './CourseNode'
import { getDisplayLessonStatus } from '../lib/lessonStatus'
import { useNow } from '../lib/useNow'
import { useDashboard } from '../store/dashboardStore'
import CourseNode from './CourseNode'
import { useFloatingPill } from '../lib/useFloatingPill'
import { playTransitionDrop } from '../lib/sound'
import { EMOJI_STEPS } from './HomeworkFlow'
import HardStarLottie from './HardStarLottie'

const NODE_SIZE = 56
const DETAIL_CARD_WIDTH = 340
const HARD_CARD_WIDTH = 320
const TRACK_SIDE_PADDING = 36
// Vertical breathing room above the row so the selected node's glow ring isn't clipped.
const GLOW_PAD = 24

// Format a lesson's scheduled date as "18 июня" to match the schedule calendar.
// The DB stores dates as "DD.MM.YYYY" text; also tolerate ISO "YYYY-MM-DD".
const LESSON_DATE_FMT = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })
function fmtLessonDate(raw?: string): string | null {
  if (!raw) return null
  const dmy = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  const d = dmy
    ? new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]))
    : new Date(`${raw}T00:00:00`)
  return isNaN(d.getTime()) ? null : LESSON_DATE_FMT.format(d)
}

function withAlpha(hex: string, alpha: number) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const detailStyles: Record<LessonStatus, { bg: string; badgeBg: string; badgeText: string; badgeLabel: string; textColor: string; icon: React.ElementType; custom?: boolean }> = {
  completed: { bg: 'var(--color-green-soft)', badgeBg: 'var(--color-green-soft)', badgeText: 'var(--color-green-text)', badgeLabel: 'выполнено', textColor: 'var(--color-text)', icon: CheckCircle2 },
  returned: { bg: 'var(--color-yellow-soft)', badgeBg: 'var(--color-yellow-soft)', badgeText: 'var(--color-yellow-text)', badgeLabel: 'возвращено на доработку', textColor: 'var(--color-text)', icon: RotateCcw },
  unviewed: { bg: 'var(--color-red-soft)', badgeBg: 'var(--color-red-soft)', badgeText: 'var(--color-red-text)', badgeLabel: 'запись урока', textColor: 'var(--color-text)', icon: IconLessonRecording, custom: true },
  submitted: { bg: 'var(--color-peach-soft)', badgeBg: 'var(--color-peach-soft)', badgeText: 'var(--color-peach-text)', badgeLabel: 'отправлено на проверку', textColor: 'var(--color-text)', icon: Upload },
  current: { bg: 'var(--color-purple-soft)', badgeBg: 'var(--color-purple-soft)', badgeText: 'var(--color-accent)', badgeLabel: 'текущий урок', textColor: 'var(--color-text)', icon: Play },
  locked: { bg: 'var(--color-bg-4)', badgeBg: 'var(--color-bg-5)', badgeText: 'var(--color-muted)', badgeLabel: 'недоступно', textColor: 'var(--color-text)', icon: Lock },
}

function TrackForSubject({ subject }: { subject: Subject }) {
  const { activeModuleId, setActiveModule, setTrackPopoverOpen, openLesson, openHomeworkForLesson, highlightLessonId, lessonAssessments } = useDashboard()
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [selectedHardLessonId, setSelectedHardLessonId] = useState<string | null>(null)
  const now = useNow()
  // activeModuleId from the store may not match a real module id on first paint,
  // so resolve to an actually-rendered module — lets the pill appear without a click.
  const effectiveModuleId =
    subject.modules.find(m => m.id === activeModuleId)?.id ?? subject.modules[0]?.id
  const modulePill = useFloatingPill(effectiveModuleId ?? '')

  // Mirror popover open state to the store so the layout can lift the track
  // above the quiz overlay (otherwise the quiz card's shadow covers the popover).
  useEffect(() => {
    setTrackPopoverOpen(selectedLessonId != null || selectedHardLessonId != null)
    return () => setTrackPopoverOpen(false)
  }, [selectedLessonId, selectedHardLessonId, setTrackPopoverOpen])
  const scrollRef = useRef<HTMLDivElement>(null)
  const trackAreaRef = useRef<HTMLDivElement>(null)
  const [viewW, setViewW] = useState(0)

  const measure = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setViewW(el.clientWidth)
  }, [])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  // Dismiss the detail popover on any click that isn't on a node (which toggles
  // selection) or inside the popover card itself. Checking trackAreaRef
  // containment isn't enough: the empty track space around and below the nodes
  // lives inside trackAreaRef too, so clicks just under a circle used to land in
  // a dead zone that never dismissed.
  useEffect(() => {
    if (!selectedLessonId && !selectedHardLessonId) return
    const onPointerDown = (e: PointerEvent) => {
      const el = e.target as Element | null
      if (el?.closest('[data-course-node]') || el?.closest('[data-lesson-popover]')) return
      setSelectedLessonId(null)
      setSelectedHardLessonId(null)
    }
    // Capture phase: some cards (e.g. the quiz panel) stopPropagation on
    // pointerdown, so a bubble-phase listener would never see those clicks.
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [selectedLessonId, selectedHardLessonId])

  // Scope the track to the active module — clicking a module tab reveals how
  // much of *that* module is completed ("закрыто").
  const activeModule = subject.modules.find(m => m.id === effectiveModuleId) ?? subject.modules[0]
  const allLessons = activeModule?.lessons ?? []
  const selectedLesson = allLessons.find(lesson => lesson.id === selectedLessonId) ?? null

  // Progress: proportion of this module's lessons that are completed
  const completedCount = allLessons.filter(l => l.status === 'completed').length
  const progressPct = allLessons.length > 0 ? (completedCount / allLessons.length) * 100 : 0

  // Full-width track: nodes are distributed evenly across the available width so
  // the line always reaches the end of the row. A 100%-complete module therefore
  // fills green all the way to the last node at the right edge.
  const nodeCount = allLessons.length
  const padCenter = TRACK_SIDE_PADDING + NODE_SIZE / 2          // first / last node center inset
  const containerW = viewW || 900                              // measured row width (fallback pre-measure)
  const span = Math.max(0, containerW - padCenter * 2)         // distance between first & last node centers
  const nodeCenter = (i: number) => nodeCount <= 1 ? padCenter : padCenter + (span * i) / (nodeCount - 1)

  const selectedHardLesson = allLessons.find(lesson => lesson.id === selectedHardLessonId) ?? null

  const selectedIndex = selectedLesson ? allLessons.findIndex(lesson => lesson.id === selectedLesson.id) : -1
  const selectedCenter = selectedIndex >= 0 ? nodeCenter(selectedIndex) : 0
  const detailCardWidth = Math.min(DETAIL_CARD_WIDTH, Math.max(240, containerW - 24))
  const detailLeft = Math.max(0, Math.min(selectedCenter - detailCardWidth / 2, Math.max(0, containerW - detailCardWidth)))
  const arrowX = Math.max(16, Math.min(selectedCenter - detailLeft, detailCardWidth - 16))
  const selectedLessonStatus = selectedLesson ? getDisplayLessonStatus(selectedLesson, now) : null
  const selectedDetail = selectedLessonStatus ? detailStyles[selectedLessonStatus] : null
  const DetailIcon = selectedDetail?.icon

  const hardIndex = selectedHardLesson ? allLessons.findIndex(l => l.id === selectedHardLesson.id) : -1
  const hardCenter = hardIndex >= 0 ? nodeCenter(hardIndex) : 0
  const hardCardWidth = Math.min(HARD_CARD_WIDTH, Math.max(240, containerW - 24))
  const hardDetailLeft = Math.max(0, Math.min(hardCenter - hardCardWidth / 2, Math.max(0, containerW - hardCardWidth)))
  const hardArrowX = Math.max(16, Math.min(hardCenter - hardDetailLeft, hardCardWidth - 16))
  const hardAssessment = selectedHardLesson ? lessonAssessments[selectedHardLesson.id] : null
  const hardUnlocked = hardAssessment?.hardAvailable || (hardAssessment?.score != null && hardAssessment.score >= 80)
  // Basic submitted below the threshold → hard is locked, overriding any stale status.
  const hardLockedPopover = hardAssessment?.score != null && !hardUnlocked
  const hardStatus: 'submitted' | 'returned' | 'completed' | 'available' | 'locked' = hardLockedPopover
    ? 'locked'
    : ((hardAssessment?.hardStatus as 'submitted' | 'returned' | 'completed' | undefined) ?? 'available')
  const hardStyleData = HARD_STYLE[hardStatus]

  return (
    <div className="flex-1 min-h-0 flex flex-col" style={{ padding: '8px 0 0' }}>
      {/* ── Top row: Module tabs (left) + Subject label (right) ── */}
      <div className="flex items-center justify-between gap-6 flex-shrink-0 flex-wrap" style={{ padding: '0 32px' }}>
        <div
          ref={modulePill.containerRef}
          className="flex items-center gap-2 flex-wrap"
          style={{ position: 'relative' }}
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
          {subject.modules.map((mod, modIndex) => {
            const isActive = mod.id === effectiveModuleId
            const totalLessons = mod.lessons.length
            const completedLessons = mod.lessons.filter(l => l.status === 'completed').length
            const isFullyDone = totalLessons > 0 && completedLessons === totalLessons
            const pct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

            // A module is locked until the previous module's last lesson is completed
            const prevMod = modIndex > 0 ? subject.modules[modIndex - 1] : null
            const isLocked = prevMod != null && prevMod.lessons.length > 0
              && prevMod.lessons[prevMod.lessons.length - 1].status !== 'completed'

            const textColor = isLocked
              ? 'var(--color-muted)'
              : isFullyDone
                ? 'var(--color-green-text)'
                : 'var(--color-text)'

            return (
              <motion.button
                key={mod.id}
                ref={isLocked ? undefined : modulePill.registerItem(mod.id)}
                whileHover={isLocked ? {} : { scale: 1.04 }}
                whileTap={isLocked ? {} : { scale: 0.96 }}
                onClick={() => {
                  if (isLocked || mod.id === activeModuleId) return
                  playTransitionDrop()
                  setActiveModule(mod.id)
                }}
                className="inline-flex items-center gap-1.5"
                style={{
                  position: 'relative',
                  zIndex: 1,
                  padding: '7px 20px',
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 600,
                  background: 'transparent',
                  color: textColor,
                  border: '1px solid transparent',
                  cursor: isLocked ? 'default' : 'pointer',
                  opacity: isLocked ? 0.7 : 1,
                  transition: 'color 0.16s ease, opacity 0.16s ease',
                }}
              >
                {isLocked && <Lock size={11} style={{ position: 'relative', zIndex: 1 }} />}
                <span style={{ position: 'relative', zIndex: 1 }}>{mod.label}</span>
                {pct > 0 && !isLocked && (
                  <span
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      fontSize: 11,
                      fontWeight: 500,
                      color: isFullyDone ? 'var(--color-green-text)' : 'var(--color-text-3)',
                    }}
                  >
                    {pct}%
                  </span>
                )}
              </motion.button>
            )
          })}
        </div>

      </div>

      {/* ── Track body: auto height, centered content ── */}
      <div className="flex items-center" style={{ paddingTop: 22, paddingBottom: 12 }}>
        <div className="flex items-center gap-6 w-full">

          {/* Full-width track — nodes distributed across the whole row */}
          <div ref={trackAreaRef} className="flex-1 min-w-0 relative">
            <div
              ref={scrollRef}
              style={{
                paddingTop: GLOW_PAD,
                paddingBottom: 14,
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: NODE_SIZE + 50,
                  overflow: 'visible',
                }}
              >
                {/* Base track line — spans the full width between first & last node */}
                <div
                  style={{
                    position: 'absolute',
                    left: padCenter,
                    right: padCenter,
                    top: NODE_SIZE / 2,
                    transform: 'translateY(-50%)',
                    height: 16,
                    background: 'var(--color-bg-5)',
                    borderRadius: 999,
                  }}
                />

                {/* Completed progress fill — at 100% it reaches the last node at
                    the right edge of the row. */}
                <motion.div
                  style={{
                    position: 'absolute',
                    left: padCenter,
                    top: NODE_SIZE / 2,
                    transform: 'translateY(-50%)',
                    height: 16,
                    borderRadius: 999,
                    background: 'var(--grad-green-bar)',
                    transformOrigin: 'left center',
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: (span * progressPct) / 100 }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                />

                {/* Nodes — absolutely positioned at evenly distributed centers */}
                {allLessons.map((lesson, i) => (
                  <div
                    key={lesson.id}
                    data-course-node
                    style={{ position: 'absolute', top: 0, left: nodeCenter(i) - NODE_SIZE / 2 }}
                  >
                    <CourseNode
                      lesson={lesson}
                      index={i}
                      isSelected={selectedLesson?.id === lesson.id}
                      isHighlighted={highlightLessonId === lesson.id}
                      onSelect={(clickedLesson) => {
                        setSelectedHardLessonId(null)
                        setSelectedLessonId(prev => prev === clickedLesson.id ? null : clickedLesson.id)
                      }}
                      onHardSelect={(clickedLesson) => {
                        setSelectedLessonId(null)
                        setSelectedHardLessonId(prev => prev === clickedLesson.id ? null : clickedLesson.id)
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* ── Detail popover — overlay anchored to the selected node, rendered
                 OUTSIDE the scroll viewport so it's never clipped and never shifts
                 the track layout. ── */}
            <AnimatePresence>
              {selectedLesson && selectedDetail && DetailIcon && (
                <motion.div
                  key={selectedLesson.id}
                  data-lesson-popover
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 420,
                    damping: 26,
                    mass: 0.7,
                    opacity: { duration: 0.15 },
                  }}
                  style={{
                    position: 'absolute',
                    bottom: `calc(100% - ${GLOW_PAD - 14}px)`,
                    left: detailLeft,
                    width: detailCardWidth,
                    borderRadius: 20,
                    // Layered: (1) very light radial glow rising from the bottom,
                    // tinted to the node's circle colour and centred horizontally
                    // OVER the selected node (arrowX) so it sits above the circle,
                    // not the card centre; (2) vertical glass gradient — 80% opaque
                    // at the bottom fading to 40% at the top. Blur stays 18px.
                    background: [
                      `radial-gradient(130% 85% at ${arrowX}px 112%, color-mix(in srgb, ${selectedDetail.badgeText} 16%, transparent), transparent 62%)`,
                      `linear-gradient(to top, rgba(var(--glass-rgb), 0.40), rgba(var(--glass-rgb), 0.20))`,
                    ].join(', '),
                    backdropFilter: 'blur(10px) saturate(150%)',
                    WebkitBackdropFilter: 'blur(10px) saturate(150%)',
                    border: '1px solid var(--color-border-glass)',
                    boxShadow: 'var(--shadow-md)',
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    transformOrigin: `${arrowX}px bottom`,
                    zIndex: 30,
                  }}
                >
                  {/* Top row: content + points */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    <div className="flex flex-col flex-1 min-w-0" style={{ gap: 12 }}>
                        <div
                          className="inline-flex items-center gap-1.5"
                          style={{
                            color: selectedDetail.badgeText,
                            padding: '2px 0',
                            width: 'fit-content',
                          }}
                        >
                          {selectedDetail.custom
                            ? <DetailIcon size={14} color={selectedDetail.badgeText} />
                            : <DetailIcon size={14} />
                          }
                          <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1, whiteSpace: 'nowrap' }}>
                            {selectedLesson.kind === 'test' ? 'финальный тест' : selectedDetail.badgeLabel}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 12, fontWeight: 500, color: selectedDetail.badgeText, lineHeight: 1 }}>
                            Занятие #{selectedLesson.number + 1}
                            {fmtLessonDate(selectedLesson.scheduledDate) && (
                              <span style={{ color: 'var(--color-muted)', fontWeight: 500 }}> · {fmtLessonDate(selectedLesson.scheduledDate)}</span>
                            )}
                          </span>
                          <span
                            style={{
                              fontSize: 15,
                              fontWeight: 600,
                              color: selectedDetail.textColor,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              lineHeight: 1.25,
                            }}
                          >
                            {selectedLesson.title}
                          </span>
                        </div>
                        {lessonAssessments[selectedLesson.id] && EMOJI_STEPS[lessonAssessments[selectedLesson.id].emojiIndex] && (() => {
                          const a = lessonAssessments[selectedLesson.id]
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 18 }}>{EMOJI_STEPS[a.emojiIndex].emoji}</span>
                              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-accent)' }}>{a.score} баллов</span>
                              <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>· {EMOJI_STEPS[a.emojiIndex].label}</span>
                            </div>
                          )
                        })()}
                      </div>
                      <div className="flex-shrink-0">
                        {selectedLesson.points != null ? (
                          <div className="flex flex-col items-end">
                            <span style={{ fontSize: 40, fontWeight: 700, lineHeight: 1, color: selectedDetail.textColor }}>
                              {selectedLesson.points}
                            </span>
                            <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1, color: selectedDetail.textColor, marginTop: 4 }}>
                              баллов
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-muted)' }}>
                            Нет оценки
                          </span>
                        )}
                      </div>
                    </div>
                  {/* Bottom row: full-width buttons */}
                  {selectedLessonStatus === 'locked' ? (
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--color-muted)',
                        background: 'rgba(var(--glass-rgb), 0.5)',
                        borderRadius: 12,
                        padding: '9px 18px',
                        whiteSpace: 'nowrap',
                        cursor: 'not-allowed',
                        width: 'fit-content',
                      }}
                    >
                      Недоступно
                    </span>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 8, width: '100%' }}>
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => { setSelectedLessonId(null); openLesson(selectedLesson.id) }}
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#fff',
                          background: selectedLesson.kind === 'test'
                            ? 'linear-gradient(135deg, #34C877, #2A7D4F)'
                            : 'var(--grad-purple)',
                          borderRadius: 12,
                          padding: '9px 18px',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                          flex: 1,
                        }}
                      >
                        {selectedLesson.kind === 'test' ? 'Пройти тест' : 'Открыть урок'}
                      </motion.button>
                      {(() => {
                        const a = lessonAssessments[selectedLesson.id]
                        const hardAvailable = a?.hardAvailable || (a?.score != null && a.score >= 80)
                        if (!hardAvailable || a?.hardCompleted || a?.hardStatus) return null
                        return (
                          <motion.button
                            whileHover={{ scale: 1.03, y: -1 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => { setSelectedLessonId(null); openHomeworkForLesson(selectedLesson.id) }}
                            style={{
                              fontSize: 13,
                              fontWeight: 750,
                              color: '#fff',
                              background: 'var(--grad-purple)',
                              border: 'none',
                              borderRadius: 14,
                              padding: '8px 16px 8px 8px',
                              whiteSpace: 'nowrap',
                              cursor: 'pointer',
                              flex: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 4,
                              boxShadow: '0 6px 20px rgba(99,84,207,0.38), inset 0 1px 0 rgba(255,255,255,0.18)',
                            }}
                          >
                            <HardStarLottie size={26} />
                            Хард-уровень
                          </motion.button>
                        )
                      })()}
                    </div>
                  )}
                    </motion.div>
                  )}
                </AnimatePresence>

            {/* ── Hard star popover — same glass-card style as main popover ── */}
            <AnimatePresence>
              {selectedHardLesson && hardStyleData && (
                <motion.div
                  key={`hard-${selectedHardLesson.id}`}
                  data-lesson-popover
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 420,
                    damping: 26,
                    mass: 0.7,
                    opacity: { duration: 0.15 },
                  }}
                  style={{
                    position: 'absolute',
                    bottom: `calc(100% - ${GLOW_PAD - 14}px)`,
                    left: hardDetailLeft,
                    width: hardCardWidth,
                    borderRadius: 20,
                    // Same as the lesson card: light radial glow (tinted to the hard
                    // node's colour) over a 80%→40% vertical glass gradient. Blur 18px.
                    background: [
                      `radial-gradient(130% 85% at 50% 112%, color-mix(in srgb, ${hardStyleData.border} 16%, transparent), transparent 62%)`,
                      `linear-gradient(to top, rgba(var(--glass-rgb), 0.40), rgba(var(--glass-rgb), 0.20))`,
                    ].join(', '),
                    backdropFilter: 'blur(10px) saturate(150%)',
                    WebkitBackdropFilter: 'blur(10px) saturate(150%)',
                    border: '1px solid var(--color-border-glass)',
                    boxShadow: 'var(--shadow-md)',
                    padding: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    transformOrigin: `${hardArrowX}px bottom`,
                    zIndex: 30,
                  }}
                >
                  <div className="flex flex-col flex-1 min-w-0" style={{ gap: 12 }}>
                    {/* Status badge */}
                    <div
                      className="inline-flex items-center gap-1.5"
                      style={{
                        color: hardStyleData.iconColor,
                        padding: '2px 0',
                        width: 'fit-content',
                      }}
                    >
                      {hardStatus === 'completed' ? <Star size={14} fill="currentColor" /> :
                       hardStatus === 'returned'  ? <RotateCcw size={14} /> :
                       hardStatus === 'submitted' ? <Clock size={14} /> :
                       hardStatus === 'locked'    ? <Lock size={14} /> :
                                                    <HardStarLottie size={20} />}
                      <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1, whiteSpace: 'nowrap' }}>
                        {hardStyleData.label}
                      </span>
                    </div>

                    {/* Title */}
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: 'var(--color-text)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.25,
                      }}
                    >
                      Сложный уровень · {selectedHardLesson.title}
                    </span>

                    {/* Score row — оценка 1–5, которую учитель выставил при приёмке хард-задания.
                        Берём hardAssessment.hardScore (score строки `${ref}-hard`), а НЕ
                        hardAssessment.score (авто-процент за основной тест). */}
                    {hardStatus === 'completed' && hardAssessment?.hardScore != null && hardAssessment.hardScore > 0 && (
                      <div className="inline-flex items-center" style={{ gap: 6, width: 'fit-content' }}>
                        <div className="inline-flex items-center" style={{ gap: 2 }}>
                          {[1, 2, 3, 4, 5].map(i => (
                            <Star
                              key={i}
                              size={15}
                              fill={i <= hardAssessment.hardScore! ? '#F5C842' : 'transparent'}
                              color={i <= hardAssessment.hardScore! ? '#F5C842' : 'var(--color-border-medium)'}
                            />
                          ))}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#F5C842' }}>
                          {hardAssessment.hardScore}/5
                        </span>
                      </div>
                    )}

                    {/* Description */}
                    <span style={{ fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.5 }}>
                      {hardStatus === 'available' && 'Ты набрал достаточно баллов, чтобы попробовать сложный уровень. Это необязательное задание, но оно принесёт тебе звезду.'}
                      {hardStatus === 'submitted' && 'Работа отправлена на проверку. Преподаватель проверит её и даст обратную связь.'}
                      {hardStatus === 'returned' && 'Преподаватель вернул работу на доработку. Открой урок, чтобы прочитать комментарии и исправить ошибки.'}
                      {hardStatus === 'completed' && 'Сложный уровень принят! Ты отлично справился с заданием повышенной сложности.'}
                      {hardStatus === 'locked' && 'Сложный уровень откроется, когда ты сдашь базовую домашку на 80 баллов или выше. Пересдай основное задание, чтобы разблокировать хард.'}
                    </span>

                    {/* Action button — скрыт для locked: хард недоступен, пока базовая < 80 */}
                    {hardStatus !== 'locked' && (
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => { setSelectedHardLessonId(null); openHomeworkForLesson(selectedHardLesson.id, 'hard') }}
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#fff',
                        background: 'var(--grad-purple)',
                        borderRadius: 12,
                        padding: '9px 18px',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        width: '100%',
                        boxShadow: '0 4px 14px rgba(99,84,207,0.35), inset 0 1px 0 rgba(255,255,255,0.18)',
                      }}
                    >
                      Открыть урок
                    </motion.button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

    </div>
  )
}

export default function CourseTrack() {
  const { activeSubjectId, setActiveSubject } = useDashboard()
  const subjects = useStudentData(s => s.subjects)
  const loaded = useStudentData(s => s.loaded)
  // The store's default activeSubjectId may not match a real (DB) subject id yet,
  // so resolve to the actually-rendered subject — this lets the pill appear on
  // first paint without requiring a click.
  const effectiveActiveId =
    subjects.find(s => s.id === activeSubjectId)?.id ?? subjects[0]?.id ?? ''
  const subjectPill = useFloatingPill(effectiveActiveId)
  // Only show the switcher pill when there's more than one course to switch between.
  const showPill = subjects.length > 1

  if (subjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ minHeight: 160, gap: 8 }}>
        {loaded && (
          <>
            <Lock size={22} style={{ opacity: 0.35, color: 'var(--color-muted)' }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-3)' }}>Курсы ещё не добавлены</p>
            <p style={{ fontSize: 12, color: 'var(--color-muted)' }}>Преподаватель откроет доступ к урокам</p>
          </>
        )}
        {!loaded && <Skeleton.Text lines={3} style={{ width: '100%', maxWidth: 280 }} />}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Subject switcher tabs */}
      <div
        ref={subjectPill.containerRef}
        className="inline-flex items-center gap-2 flex-shrink-0"
        style={{ maxWidth: '100%', justifyContent: 'flex-start', paddingLeft: 32, paddingRight: 32, position: 'relative' }}
      >
        {showPill && subjectPill.pillRect && (
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
          const isActive = effectiveActiveId === s.id
          const allLessons = s.modules.flatMap(m => m.lessons)
          const completedAll = allLessons.filter(l => l.status === 'completed').length
          const subjectPct = allLessons.length > 0 ? Math.round((completedAll / allLessons.length) * 100) : 0
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
              className="inline-flex items-center gap-1.5"
              style={{
                position: 'relative',
                zIndex: 1,
                padding: '6px 20px',
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 600,
                background: 'transparent',
                color: 'var(--color-text)',
                border: '1px solid transparent',
                cursor: 'pointer',
                transition: 'color 0.16s ease, font-weight 0.16s ease',
              }}
            >
              <span style={{ position: 'relative', zIndex: 1 }}>{s.name}</span>
              <span style={{ position: 'relative', zIndex: 1, fontSize: 12, fontWeight: 500, color: 'var(--color-purple)' }}>
                {subjectPct}%
              </span>
            </motion.button>
          )
        })}
      </div>

      <TrackForSubject
        subject={subjects.find(s => s.id === activeSubjectId) ?? subjects[0] ?? null}
      />
    </div>
  )
}
