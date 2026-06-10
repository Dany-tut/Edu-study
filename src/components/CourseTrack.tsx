import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, RotateCcw, AlertCircle, Upload, Lock, Play } from 'lucide-react'
import { subjects, type Subject, type Lesson, type LessonStatus } from '../data/mockData'
import { getDisplayLessonStatus } from '../lib/lessonStatus'
import { useNow } from '../lib/useNow'
import { useDashboard } from '../store/dashboardStore'
import CourseNode from './CourseNode'
import { useFloatingPill } from '../lib/useFloatingPill'
import { playTransitionDrop } from '../lib/sound'
import { EMOJI_STEPS } from './HomeworkFlow'
import HardStarLottie from './HardStarLottie'

const NODE_SIZE = 56
const DETAIL_CARD_WIDTH = 460
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
  completed: { bg: '#DFF8D6', badgeBg: '#BDF2A8', badgeText: '#4C804F', badgeLabel: 'выполнено', textColor: '#0B0B0D', icon: CheckCircle2 },
  returned: { bg: '#F7F1B8', badgeBg: '#F2E56F', badgeText: '#9A8E36', badgeLabel: 'возвращено на доработку', textColor: '#0B0B0D', icon: RotateCcw },
  unviewed: { bg: '#F8D2D5', badgeBg: '#F4AAB0', badgeText: '#9E434A', badgeLabel: 'запись урока', textColor: '#0B0B0D', icon: AlertCircle },
  submitted: { bg: '#F2C492', badgeBg: '#F7D9B0', badgeText: '#6E4514', badgeLabel: 'отправлено на проверку', textColor: '#0B0B0D', icon: Upload },
  current: { bg: '#E8D6FA', badgeBg: '#CEB2F4', badgeText: '#6E47A5', badgeLabel: 'текущий урок', textColor: '#0B0B0D', icon: Play },
  locked: { bg: '#ECECEC', badgeBg: '#DBDBDB', badgeText: '#7D7D7D', badgeLabel: 'недоступно', textColor: '#0B0B0D', icon: Lock },
}

function TrackForSubject({ subject }: { subject: Subject }) {
  const { activeModuleId, setActiveModule, setTrackPopoverOpen, openLesson, openHomeworkForLesson, highlightLessonId, lessonAssessments } = useDashboard()
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const now = useNow()
  const modulePill = useFloatingPill(activeModuleId)

  // Mirror popover open state to the store so the layout can lift the track
  // above the quiz overlay (otherwise the quiz card's shadow covers the popover).
  useEffect(() => {
    setTrackPopoverOpen(selectedLessonId != null)
    return () => setTrackPopoverOpen(false)
  }, [selectedLessonId, setTrackPopoverOpen])
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
    if (!selectedLessonId) return
    const onPointerDown = (e: PointerEvent) => {
      if (!trackAreaRef.current?.contains(e.target as Node)) {
        setSelectedLessonId(null)
      }
    }
    // Capture phase: some cards (e.g. the quiz panel) stopPropagation on
    // pointerdown, so a bubble-phase listener would never see those clicks.
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [selectedLessonId])

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

  const selectedIndex = selectedLesson ? allLessons.findIndex(lesson => lesson.id === selectedLesson.id) : -1
  const selectedCenter = selectedIndex >= 0 ? nodeCenter(selectedIndex) : 0
  const detailCardWidth = Math.min(DETAIL_CARD_WIDTH, Math.max(300, containerW - 24))
  const detailLeft = Math.max(0, Math.min(selectedCenter - detailCardWidth / 2, Math.max(0, containerW - detailCardWidth)))
  const arrowX = Math.max(16, Math.min(selectedCenter - detailLeft, detailCardWidth - 16))
  const selectedLessonStatus = selectedLesson ? getDisplayLessonStatus(selectedLesson, now) : null
  const selectedDetail = selectedLessonStatus ? detailStyles[selectedLessonStatus] : null
  const DetailIcon = selectedDetail?.icon

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
                background: 'rgba(255,255,255,0.55)',
                backdropFilter: 'blur(16px) saturate(180%)',
                WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85), 0 2px 10px rgba(0,0,0,0.06)',
                border: '1px solid rgba(255,255,255,0.7)',
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

            const textColor = isFullyDone ? '#2A7A3B' : '#0B0B0D'

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
        <span style={{ fontSize: 18, fontWeight: 650, color: '#0B0B0D', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
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
                  height: NODE_SIZE + 34,
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
                      onSelect={(clickedLesson) =>
                        setSelectedLessonId(prev => prev === clickedLesson.id ? null : clickedLesson.id)
                      }
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
                    border: '1px solid rgba(255,255,255,0.55)',
                    boxShadow: '0 6px 18px rgba(21,18,31,0.10), inset 0 1px 1px rgba(255,255,255,0.65)',
                    padding: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    transformOrigin: `${arrowX}px bottom`,
                    zIndex: 30,
                  }}
                >
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
                          }}
                        >
                          <DetailIcon size={14} />
                          <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1, whiteSpace: 'nowrap' }}>
                            {selectedDetail.badgeLabel}
                          </span>
                        </div>
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
                          Занятие #{selectedLesson.number} {selectedLesson.title}
                        </span>
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
                        {selectedLesson.status === 'locked' ? (
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: '#9A9A9A',
                              background: 'rgba(255,255,255,0.5)',
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
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            <motion.button
                              whileHover={{ scale: 1.04 }}
                              whileTap={{ scale: 0.96 }}
                              onClick={() => { setSelectedLessonId(null); openLesson(selectedLesson.id) }}
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: '#fff',
                                background: '#0B0B0D',
                                borderRadius: 12,
                                padding: '9px 18px',
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                                width: 'fit-content',
                              }}
                            >
                              Открыть урок
                            </motion.button>
                            {(() => {
                              const a = lessonAssessments[selectedLesson.id]
                              const hardAvailable = a?.hardAvailable || (a?.score != null && a.score >= 80)
                              if (!hardAvailable || a?.hardCompleted) return null
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
                                    width: 'fit-content',
                                    display: 'flex',
                                    alignItems: 'center',
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
                      </div>
                      <div className="flex-shrink-0" style={{ marginRight: 12 }}>
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
              background: 'rgba(255,255,255,0.55)',
              backdropFilter: 'blur(16px) saturate(180%)',
              WebkitBackdropFilter: 'blur(16px) saturate(180%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85), 0 2px 10px rgba(0,0,0,0.06)',
              border: '1px solid rgba(255,255,255,0.7)',
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
                color: '#0B0B0D',
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
        subject={subjects.find(s => s.id === activeSubjectId) ?? subjects[0]}
      />
    </div>
  )
}
