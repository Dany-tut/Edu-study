import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, RotateCcw, AlertCircle, Upload, Lock, Play, Star, Clock } from 'lucide-react'
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

function withAlpha(hex: string, alpha: number) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const detailStyles: Record<LessonStatus, { bg: string; badgeBg: string; badgeText: string; badgeLabel: string; textColor: string; icon: React.ElementType }> = {
  completed: { bg: 'var(--color-green-soft)', badgeBg: '#BDF2A8', badgeText: '#4C804F', badgeLabel: 'выполнено', textColor: 'var(--color-text)', icon: CheckCircle2 },
  returned: { bg: '#F7F1B8', badgeBg: '#F2E56F', badgeText: '#9A8E36', badgeLabel: 'возвращено на доработку', textColor: 'var(--color-text)', icon: RotateCcw },
  unviewed: { bg: '#F8D2D5', badgeBg: '#F4AAB0', badgeText: '#9E434A', badgeLabel: 'запись урока', textColor: 'var(--color-text)', icon: AlertCircle },
  submitted: { bg: '#F2C492', badgeBg: '#F7D9B0', badgeText: '#6E4514', badgeLabel: 'отправлено на проверку', textColor: 'var(--color-text)', icon: Upload },
  current: { bg: '#E8D6FA', badgeBg: '#CEB2F4', badgeText: '#6E47A5', badgeLabel: 'текущий урок', textColor: 'var(--color-text)', icon: Play },
  locked: { bg: '#ECECEC', badgeBg: '#DBDBDB', badgeText: '#7D7D7D', badgeLabel: 'недоступно', textColor: 'var(--color-text)', icon: Lock },
}

function TrackForSubject({ subject }: { subject: Subject }) {
  const { activeModuleId, setActiveModule, setTrackPopoverOpen, openLesson, openHomeworkForLesson, highlightLessonId, lessonAssessments } = useDashboard()
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [selectedHardLessonId, setSelectedHardLessonId] = useState<string | null>(null)
  const now = useNow()
  const modulePill = useFloatingPill(activeModuleId)

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

  // Dismiss the detail popover when clicking anywhere outside the track area.
  // Node clicks live inside trackAreaRef, so they toggle selection as usual.
  useEffect(() => {
    if (!selectedLessonId && !selectedHardLessonId) return
    const onPointerDown = (e: PointerEvent) => {
      if (!trackAreaRef.current?.contains(e.target as Node)) {
        setSelectedLessonId(null)
        setSelectedHardLessonId(null)
      }
    }
    // Capture phase: some cards (e.g. the quiz panel) stopPropagation on
    // pointerdown, so a bubble-phase listener would never see those clicks.
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [selectedLessonId, selectedHardLessonId])

  // Scope the track to the active module — clicking a module tab reveals how
  // much of *that* module is completed ("закрыто").
  const activeModule = subject.modules.find(m => m.id === activeModuleId) ?? subject.modules[0]
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
  const hardStatus = (hardAssessment?.hardStatus as 'submitted' | 'returned' | 'completed' | undefined) ?? 'available'
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
                background: 'rgba(var(--glass-rgb), 0.55)',
                backdropFilter: 'blur(16px) saturate(180%)',
                WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85), 0 2px 10px rgba(0,0,0,0.06)',
                border: '1px solid var(--color-border-glass)',
                pointerEvents: 'none',
                zIndex: 0,
              }}
            />
          )}
          {subject.modules.map(mod => {
            const isActive = mod.id === activeModuleId
            const totalLessons = mod.lessons.length
            const completedLessons = mod.lessons.filter(l => l.status === 'completed').length
            const isFullyDone = totalLessons > 0 && completedLessons === totalLessons
            const pct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

            const textColor = isFullyDone ? '#2A7A3B' : 'var(--color-text)'

            return (
              <motion.button
                key={mod.id}
                ref={modulePill.registerItem(mod.id)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  if (mod.id === activeModuleId) return
                  playTransitionDrop()
                  setActiveModule(mod.id)
                }}
                className="cursor-pointer inline-flex items-center gap-1.5"
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
                  transition: 'color 0.16s ease, font-weight 0.16s ease',
                }}
              >
                <span style={{ position: 'relative', zIndex: 1 }}>{mod.label}</span>
                {pct > 0 && (
                  <span
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      fontSize: 11,
                      fontWeight: 500,
                      color: isFullyDone ? '#2A7A3B' : '#A0A0A8',
                    }}
                  >
                    {pct}%
                  </span>
                )}
              </motion.button>
            )
          })}
        </div>

        {/* Subject name + progress */}
        <span style={{ fontSize: 18, fontWeight: 650, color: 'var(--color-text)', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
          {subject.name}{' '}
          <span style={{ color: '#C58BFF' }}>{subject.progress}%</span>
        </span>
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
                    background: '#E8E8EA',
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
                    background: 'linear-gradient(to right, #6EE7A0, #3FCC8A)',
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
                    // Softer glass — lower alpha + lighter blur so the
                    // course track underneath shows through with visible
                    // refraction, reading as real glass rather than frosted
                    // plastic.
                    background: `linear-gradient(to bottom, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.22) 55%, ${withAlpha(selectedDetail.bg, 0.32)} 100%)`,
                    backdropFilter: 'blur(8px) saturate(150%)',
                    WebkitBackdropFilter: 'blur(8px) saturate(150%)',
                    border: '1px solid var(--color-border-glass)',
                    boxShadow: '0 6px 18px rgba(21,18,31,0.10), inset 0 1px 1px rgba(255,255,255,0.65)',
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
                            borderRadius: 999,
                            background: withAlpha(selectedDetail.badgeBg, 0.32),
                            backdropFilter: 'blur(6px) saturate(140%)',
                            WebkitBackdropFilter: 'blur(6px) saturate(140%)',
                            color: selectedDetail.badgeText,
                            padding: '5px 12px',
                            width: 'fit-content',
                            border: `1px solid ${withAlpha(selectedDetail.badgeBg, 0.6)}`,
                          }}
                        >
                          <DetailIcon size={14} />
                          <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1, whiteSpace: 'nowrap' }}>
                            {selectedDetail.badgeLabel}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 12, fontWeight: 500, color: selectedDetail.badgeText, lineHeight: 1 }}>
                            Занятие #{selectedLesson.number}
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
                        {lessonAssessments[selectedLesson.id] && (() => {
                          const a = lessonAssessments[selectedLesson.id]
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 18 }}>{EMOJI_STEPS[a.emojiIndex].emoji}</span>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#7B3FCC' }}>{a.score} баллов</span>
                              <span style={{ fontSize: 12, color: '#9090A0' }}>· {EMOJI_STEPS[a.emojiIndex].label}</span>
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
                          <span style={{ fontSize: 13, fontWeight: 500, color: '#8D8D8D' }}>
                            Нет оценки
                          </span>
                        )}
                      </div>
                    </div>
                  {/* Bottom row: full-width buttons */}
                  {selectedLesson.status === 'locked' ? (
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#9A9A9A',
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
                          background: 'var(--color-text)',
                          borderRadius: 12,
                          padding: '9px 18px',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                          flex: 1,
                        }}
                      >
                        Открыть урок
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
                              background: 'linear-gradient(135deg, #9B5FE8 0%, #7B3FCC 100%)',
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
                              boxShadow: '0 6px 20px rgba(123,63,204,0.38), inset 0 1px 0 rgba(255,255,255,0.18)',
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
                    background: `linear-gradient(to bottom, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.22) 55%, rgba(243,234,255,0.32) 100%)`,
                    backdropFilter: 'blur(8px) saturate(150%)',
                    WebkitBackdropFilter: 'blur(8px) saturate(150%)',
                    border: '1px solid var(--color-border-glass)',
                    boxShadow: '0 6px 18px rgba(21,18,31,0.10), inset 0 1px 1px rgba(255,255,255,0.65)',
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
                        borderRadius: 999,
                        background: `${hardStyleData.bg}88`,
                        backdropFilter: 'blur(6px) saturate(140%)',
                        WebkitBackdropFilter: 'blur(6px) saturate(140%)',
                        color: hardStyleData.iconColor,
                        padding: '5px 12px',
                        width: 'fit-content',
                        border: `1px solid ${hardStyleData.border}66`,
                      }}
                    >
                      {hardStatus === 'completed' ? <Star size={14} fill="currentColor" /> :
                       hardStatus === 'returned'  ? <RotateCcw size={14} /> :
                       hardStatus === 'submitted' ? <Clock size={14} /> :
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

                    {/* Score row if available */}
                    {hardAssessment && hardStatus !== 'available' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 18 }}>{EMOJI_STEPS[hardAssessment.emojiIndex].emoji}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#7B3FCC' }}>{hardAssessment.score} баллов</span>
                        <span style={{ fontSize: 12, color: '#9090A0' }}>· {EMOJI_STEPS[hardAssessment.emojiIndex].label}</span>
                        {hardStatus === 'completed' && <span style={{ marginLeft: 4, fontSize: 16 }}>🌟</span>}
                      </div>
                    )}

                    {/* Description */}
                    <span style={{ fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.5 }}>
                      {hardStatus === 'available' && 'Ты набрал достаточно баллов, чтобы попробовать сложный уровень. Это необязательное задание, но оно принесёт тебе звезду.'}
                      {hardStatus === 'submitted' && 'Работа отправлена на проверку. Преподаватель проверит её и даст обратную связь.'}
                      {hardStatus === 'returned' && 'Преподаватель вернул работу на доработку. Открой урок, чтобы прочитать комментарии и исправить ошибки.'}
                      {hardStatus === 'completed' && 'Сложный уровень принят! Ты отлично справился с заданием повышенной сложности.'}
                    </span>

                    {/* Action button */}
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => { setSelectedHardLessonId(null); openLesson(selectedHardLesson.id) }}
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#fff',
                        background: 'linear-gradient(135deg, #9B5FE8 0%, #7B3FCC 100%)',
                        borderRadius: 12,
                        padding: '9px 18px',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        width: '100%',
                        boxShadow: '0 4px 14px rgba(123,63,204,0.35), inset 0 1px 0 rgba(255,255,255,0.18)',
                      }}
                    >
                      Открыть урок
                    </motion.button>
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
  const subjectPill = useFloatingPill(activeSubjectId)

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Subject switcher tabs */}
      <div
        ref={subjectPill.containerRef}
        className="inline-flex items-center gap-2 flex-shrink-0"
        style={{ maxWidth: '100%', justifyContent: 'flex-start', paddingLeft: 32, paddingRight: 32, position: 'relative' }}
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
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85), 0 2px 10px rgba(0,0,0,0.06)',
              border: '1px solid var(--color-border-glass)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
        )}
        {subjects.map(s => {
          const isActive = activeSubjectId === s.id
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
