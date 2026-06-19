import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, Play, ListVideo, NotebookPen, FileText,
  FolderOpen, GraduationCap, Download, ChevronDown, Calendar,
  ChevronRight, Clock, Lock, CheckCircle2, RotateCcw, Star,
} from 'lucide-react'
import { useDashboard } from '../store/dashboardStore'
import { findLessonById, getLessonDetail, type LessonMaterial, type LessonHomework } from '../data/lessonContent'
import { useStudentData } from '../store/studentDataStore'
import { useIsDesktop } from '../lib/useIsDesktop'
import type { CourseReaction } from '../data/mockData'
import { EMOJI_STEPS } from '../components/HomeworkFlow'

type Tint = 'bw' | 'color'

function renderHighlightedParagraph(text: string, reactionId?: string, activeReactionId?: string | null, reactions: CourseReaction[] = []) {
  // No reaction tag — render plain text, no wrapper. Other paragraphs in the
  // conspect never need the inline-flex pill, so they stay unchanged.
  if (!reactionId) return text

  const reaction = reactions.find(item => item.id === reactionId)
  if (!reaction) return text

  const highlightText = reaction.equation
  const matchIndex = text.indexOf(highlightText)
  if (matchIndex === -1) return text

  const before = text.slice(0, matchIndex)
  const after = text.slice(matchIndex + highlightText.length)
  const isActive = reactionId === activeReactionId

  // The wrapper span is ALWAYS rendered (with the same inline-flex + padding)
  // regardless of `isActive`. Toggling its presence used to grow/shrink the
  // line height and visibly jerk the paragraph when the highlight faded. Now
  // only the background overlay's opacity animates.
  return (
    <>
      {before}
      <span
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 10px',
          borderRadius: 12,
          overflow: 'hidden',
          isolation: 'isolate',
          verticalAlign: 'baseline',
        }}
      >
        <motion.span
          // Key off isActive so re-opening the reaction restarts the fade-in.
          key={`${reactionId}-${isActive ? 'on' : 'off'}`}
          initial={{ opacity: isActive ? 0 : 1, scaleX: isActive ? 0.1 : 1 }}
          animate={{ opacity: isActive ? 1 : 0, scaleX: 1 }}
          transition={{
            opacity: { duration: isActive ? 0.4 : 1.2, ease: [0.22, 1, 0.36, 1] },
            scaleX: { duration: isActive ? 0.6 : 0, ease: [0.22, 1, 0.36, 1] },
          }}
          style={{
            position: 'absolute',
            inset: 0,
            transformOrigin: 'left center',
            borderRadius: 12,
            background: 'rgba(156,140,240,0.42)',
            boxShadow: 'inset 0 0 0 1px rgba(99,84,207,0.18)',
            zIndex: 0,
          }}
        />
        <span
          style={{
            position: 'relative',
            zIndex: 1,
          }}
        >
          {highlightText}
        </span>
      </span>
      {after}
    </>
  )
}

// Mock "download": there's no backend yet, so we hand the browser a small
// generated PDF blob named after the file. Swap this for a real fetch later.
function downloadFile(filename: string) {
  const body = `%PDF-1.1\n% ${filename}\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF`
  const url = URL.createObjectURL(new Blob([body], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// A downloadable-material tile (Рабочая тетрадь / Конспект): icon + title in a
// single row with a chevron. The chevron opens a glass dropdown with two
// download actions — ч/б or цвет — each downloading the file in that variant,
// mirroring the "Материалы" tile so all three line up at one height.
function DownloadTile({ icon: Icon, label }: { icon: typeof NotebookPen; label: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const opts: Array<{ id: Tint; label: string }> = [
    { id: 'bw', label: 'ч/б' },
    { id: 'color', label: 'цвет' },
  ]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <motion.button
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => setOpen(o => !o)}
        className="flex items-center w-full cursor-pointer"
        style={{
          gap: 12,
          padding: 16,
          borderRadius: 18,
          background: 'rgba(var(--glass-rgb), 0.96)',
          border: open ? '1px solid rgba(99,84,207,0.4)' : '1px solid var(--color-border-soft)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
          minHeight: 92,
        }}
      >
        <div
          style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--color-purple-soft)', color: 'var(--color-accent)',
          }}
        >
          <Icon size={20} strokeWidth={1.9} />
        </div>
        <div className="flex-1 min-w-0" style={{ textAlign: 'left' }}>
          <p style={{ fontSize: 14, fontWeight: 650, color: 'var(--color-text)', lineHeight: 1.2 }}>{label}</p>
          <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>PDF · скачать</p>
        </div>
        <ChevronDown
          size={16}
          style={{ color: 'var(--color-text-4)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s ease' }}
        />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              right: 0,
              zIndex: 50,
              padding: 8,
              borderRadius: 16,
              background: 'rgba(var(--glass-rgb), 0.92)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              border: '1px solid var(--color-border-glass)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.16), 0 2px 6px rgba(0,0,0,0.06)',
            }}
          >
            {opts.map(o => (
              <button
                key={o.id}
                onClick={() => { downloadFile(`${label} (${o.label}).pdf`); setOpen(false) }}
                className="flex items-center w-full cursor-pointer"
                style={{ gap: 10, padding: 10, borderRadius: 12, border: 'none', background: 'transparent', textAlign: 'left' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              >
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 550, color: 'var(--color-text)' }}>{o.label}</span>
                <Download size={15} style={{ color: 'var(--color-text-4)', flexShrink: 0 }} />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// "Материалы" tile with a dropdown of reference files.
function MaterialsTile({ materials }: { materials: LessonMaterial[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <motion.button
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => setOpen(o => !o)}
        className="flex items-center w-full cursor-pointer"
        style={{
          gap: 12,
          padding: 16,
          borderRadius: 18,
          background: 'rgba(var(--glass-rgb), 0.96)',
          border: open ? '1px solid rgba(99,84,207,0.4)' : '1px solid var(--color-border-soft)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
          minHeight: 92,
        }}
      >
        <div
          style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--color-purple-soft)', color: 'var(--color-accent)',
          }}
        >
          <FolderOpen size={20} strokeWidth={1.9} />
        </div>
        <div className="flex-1 min-w-0" style={{ textAlign: 'left' }}>
          <p style={{ fontSize: 14, fontWeight: 650, color: 'var(--color-text)', lineHeight: 1.2 }}>Материалы</p>
          <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>{materials.length} файла</p>
        </div>
        <ChevronDown
          size={16}
          style={{ color: 'var(--color-text-4)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s ease' }}
        />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              right: 0,
              zIndex: 50,
              padding: 8,
              borderRadius: 16,
              background: 'rgba(var(--glass-rgb), 0.92)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              border: '1px solid var(--color-border-glass)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.16), 0 2px 6px rgba(0,0,0,0.06)',
            }}
          >
            {materials.map(m => (
              <button
                key={m.id}
                onClick={() => { downloadFile(`${m.name}.pdf`); setOpen(false) }}
                className="flex items-center w-full cursor-pointer"
                style={{ gap: 10, padding: 10, borderRadius: 12, border: 'none', background: 'transparent', textAlign: 'left' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              >
                <div
                  style={{
                    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: m.gradient, fontSize: 9, fontWeight: 800,
                    letterSpacing: '0.04em', color: '#fff',
                  }}
                >
                  PDF
                </div>
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 550, color: 'var(--color-text)' }}>{m.name}</span>
                <Download size={15} style={{ color: 'var(--color-text-4)', flexShrink: 0 }} />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Reads persisted homework progress to decide whether the hard level is
// unlocked. Mirrors the score logic in HomeworkFlow (basic completed + score
// at or above the recommendation threshold).
function readBasicProgress(lessonId: string, homework: LessonHomework): { unlocked: boolean; score: number } {
  const questions = homework.levels.find(l => l.id === 'basic')?.questions ?? []
  if (questions.length === 0) return { unlocked: false, score: 0 }
  try {
    const raw = window.localStorage.getItem(`student-dashboard:homework:${lessonId}`)
    if (!raw) return { unlocked: false, score: 0 }
    const answers = (JSON.parse(raw)?.basicAnswers ?? {}) as Record<string, string>
    const answered = questions.filter(q => answers[q.id]).length
    const correct = questions.filter(q => answers[q.id] === q.correctOptionId).length
    const score = Math.round((correct / questions.length) * 100)
    const completed = answered === questions.length
    return { unlocked: completed && score >= homework.recommendationScore, score }
  } catch {
    return { unlocked: false, score: 0 }
  }
}

function HomeworkCard({ lessonId, homework, onOpen }: { lessonId: string; homework: LessonHomework; onOpen: () => void }) {
  const [{ unlocked, score }, setProgress] = useState(() => readBasicProgress(lessonId, homework))
  const assessment = useDashboard(s => s.lessonAssessments[lessonId])
  // Which row is hovered, if any. The hovered row becomes the highlighted white
  // card and the other collapses to a purple strip.
  const [hovered, setHovered] = useState<'base' | 'hard' | null>(null)

  // Re-read progress whenever the card is shown for a (possibly) different
  // lesson — the score lives in localStorage, updated by HomeworkFlow.
  useEffect(() => {
    setProgress(readBasicProgress(lessonId, homework))
  }, [lessonId, homework])

  // "Домашка" is always the default highlighted row — the hard level only
  // becomes available (unlocked) after 80+, but never auto-steals the highlight.
  // Hovering an openable row promotes it to the white card, except hovering a
  // locked hard row leaves the homework highlight untouched.
  const basicSubmitted = !!assessment
  const hardUnlocked = unlocked || (assessment?.score != null && assessment.score >= 80) || !!assessment?.hardAvailable

  const defaultActive: 'base' | 'hard' | null = basicSubmitted
    ? (hardUnlocked ? 'hard' : null)
    : 'base'
  const active: 'base' | 'hard' | null =
    hovered && !(hovered === 'hard' && !hardUnlocked) ? hovered : defaultActive
  const hardStatus = assessment?.hardStatus

  const hardIcon = hardStatus === 'completed' ? CheckCircle2
    : hardStatus ? GraduationCap
    : hardUnlocked ? GraduationCap : Lock
  const hardIconSize = (!hardUnlocked && !hardStatus) ? 18 : 20

  const rows = [
    { id: 'base' as const, icon: GraduationCap, iconSize: 20, title: 'Домашка' },
    ...(hardUnlocked || hardStatus ? [{ id: 'hard' as const, icon: hardIcon, iconSize: hardIconSize, title: 'Сложный уровень' }] : []),
  ]
  const basicEstimatedTime = homework.levels.find(level => level.id === 'basic')?.estimatedMinutes

  const hardStatusLabel =
    hardStatus === 'submitted' ? { icon: Clock,     text: 'На проверке', color: 'var(--color-peach-text)' } :
    hardStatus === 'returned'  ? { icon: RotateCcw, text: 'Возвращён',   color: 'var(--color-yellow-text)' } :
    hardStatus === 'completed' ? { icon: Star,      text: 'Сдан',        color: 'var(--color-green-text)' } :
    null

  return (
    <div
      className="flex flex-col"
      style={{
        position: 'relative',
        minHeight: 92,
        padding: 8,
        gap: 6,
        borderRadius: 20,
        background: 'var(--grad-purple)',
        boxShadow: '0 12px 28px rgba(123,97,255,0.28)',
      }}
    >
      {rows.map(({ id, icon: Icon, iconSize, title }) => {
        const isActive = active === id
        const locked = id === 'hard' && !hardUnlocked && !hardStatus
        const solidWhite = isActive && !locked
        const faintWash = (locked && hovered === id) || (id === 'base' && (unlocked || basicSubmitted) && hovered === 'base')
        const hasExtra = (id === 'base' && basicSubmitted) || (id === 'hard' && !!hardStatusLabel)
        return (
          <motion.button
            key={id}
            whileTap={locked ? undefined : { scale: 0.99 }}
            onClick={() => { if (!locked) onOpen() }}
            onMouseEnter={() => setHovered(id)}
            onMouseLeave={() => setHovered(null)}
            className="flex items-center w-full"
            style={{
              height: isActive ? 46 : hasExtra ? 40 : 24,
              flexShrink: 0,
              gap: 12,
              padding: '0 16px',
              borderRadius: 12,
              border: 'none',
              textAlign: 'left',
              cursor: locked ? 'not-allowed' : 'pointer',
              background: solidWhite ? 'var(--color-surface)' : faintWash ? 'rgba(255,255,255,0.12)' : 'transparent',
              color: solidWhite ? 'var(--color-text)' : '#fff',
              boxShadow: solidWhite ? '0 2px 12px rgba(0,0,0,0.10)' : 'none',
              transition: 'background 0.22s ease, box-shadow 0.22s ease, color 0.22s ease, height 0.22s ease',
            }}
          >
            <Icon size={iconSize} strokeWidth={1.9} style={{ flexShrink: 0 }} />
            <span className="flex-1 min-w-0" style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>
              {title}
            </span>
            {id === 'base' && basicSubmitted && (
              <span
                className="inline-flex items-center"
                style={{
                  gap: 4,
                  flexShrink: 0,
                  fontSize: 12,
                  fontWeight: 700,
                  color: solidWhite ? 'var(--color-accent)' : 'rgba(255,255,255,0.92)',
                  background: solidWhite ? 'rgba(99,84,207,0.10)' : 'rgba(255,255,255,0.18)',
                  borderRadius: 8,
                  padding: '2px 7px',
                }}
              >
                {assessment.score}
              </span>
            )}
            {id === 'base' && !basicSubmitted && basicEstimatedTime != null && solidWhite && (
              <span
                className="inline-flex items-center"
                style={{ gap: 4, flexShrink: 0, fontSize: 12, fontWeight: 700, color: 'var(--color-accent)' }}
              >
                <Clock size={13} />
                ~{basicEstimatedTime} мин
              </span>
            )}
            {id === 'base' && !basicSubmitted && (unlocked || basicSubmitted) && !isActive && (
              <CheckCircle2 size={16} strokeWidth={2} style={{ flexShrink: 0, opacity: 0.85 }} />
            )}
            {id === 'hard' && hardStatusLabel && (
              <span
                className="inline-flex items-center"
                style={{
                  gap: 4,
                  flexShrink: 0,
                  fontSize: 12,
                  fontWeight: 700,
                  color: solidWhite ? hardStatusLabel.color : 'rgba(255,255,255,0.92)',
                  background: solidWhite ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.18)',
                  borderRadius: 8,
                  padding: '2px 7px',
                }}
              >
                <hardStatusLabel.icon size={13} strokeWidth={2.2} style={{ flexShrink: 0 }} />
                {hardStatusLabel.text}
              </span>
            )}
            {isActive && !locked && <ChevronRight size={20} style={{ flexShrink: 0 }} />}
          </motion.button>
        )
      })}

      <AnimatePresence>
        {!unlocked && hovered === 'hard' && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none"
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              right: 0,
              zIndex: 60,
              padding: '12px 14px',
              borderRadius: 14,
              background: 'rgba(22,14,44,0.94)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              boxShadow: '0 14px 34px rgba(0,0,0,0.30)',
              color: '#fff',
            }}
          >
            <div className="flex items-center" style={{ gap: 8, marginBottom: 4 }}>
              <Lock size={14} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700 }}>Сложный уровень</span>
            </div>
            <p style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.45, color: 'rgba(255,255,255,0.82)' }}>
              Задание с проверкой преподавателем. Откроется, когда сдашь базовый уровень на {homework.recommendationScore}+ баллов.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function LessonPage() {
  const isDesktop = useIsDesktop()
  const courseReactions = useStudentData(s => s.courseReactions)
  const currentLessonId = useDashboard(s => s.currentLessonId)
  const closeLesson = useDashboard(s => s.closeLesson)
  const openHomework = useDashboard(s => s.openHomework)
  const highlightReactionId = useDashboard(s => s.highlightReactionId)
  const clearHighlightReaction = useDashboard(s => s.clearHighlightReaction)
  // When the page is scrolled, the Back/title/date row docks onto the topbar
  // line (sticky), the title slides left next to Back, the date stays right.
  const docked = useDashboard(s => s.lessonScrolled)
  // When the top bar is mini there's room for the full date + icon; when it's
  // expanded the row is tight, so the docked date collapses to just the day.
  const topBarCompact = useDashboard(s => s.topBarCompact)
  // Viewport edges of the centred top bar, reported by the Sidebar — lets the
  // docked title cap its width so it keeps a gap to the bar instead of sliding
  // under it.
  const topBarBox = useDashboard(s => s.topBarBox)

  const [playing, setPlaying] = useState(false)
  const [activeChapter, setActiveChapter] = useState(0)
  // Start offset (seconds) baked into the iframe src when the player first
  // mounts. Once mounted we seek via the postMessage API instead of remounting.
  const [startSeconds, setStartSeconds] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  // Queue a one-shot reaction highlight locally so it survives clearing the
  // global navigation flag in the store.
  const [queuedHighlight, setQueuedHighlight] = useState<string | null>(null)
  const [pendingHighlight, setPendingHighlight] = useState<string | null>(null)
  const paragraphRefs = useRef<Record<string, HTMLDivElement | null>>({})
  // The docked title pill caps its width to stop 20px short of the centred top
  // bar's left edge — the same gap the widget pill keeps on the bar's right.
  const dockTitleRef = useRef<HTMLDivElement>(null)
  const [dockTitleMax, setDockTitleMax] = useState<number | undefined>(undefined)

  const lesson = currentLessonId ? findLessonById(currentLessonId) : null

  useEffect(() => {
    if (!highlightReactionId) return
    setQueuedHighlight(highlightReactionId)
    clearHighlightReaction()
  }, [highlightReactionId, clearHighlightReaction])

  // When the page opens from the reactions widget, first scroll the paragraph
  // into view, then run a short 2s inline highlight animation on the formula.
  useEffect(() => {
    if (!queuedHighlight) return
    const id = queuedHighlight
    const scroll = setTimeout(() => {
      const el = paragraphRefs.current[id]
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 60)

    // Let smooth scrolling settle, then start the fill animation. Remove the
    // highlight completely right after the 2s animation ends.
    const show = setTimeout(() => setPendingHighlight(id), 420)
    const hide = setTimeout(() => {
      setPendingHighlight(null)
      setQueuedHighlight(null)
    }, 2420)
    return () => {
      clearTimeout(scroll)
      clearTimeout(show)
      clearTimeout(hide)
    }
  }, [queuedHighlight, currentLessonId])
  // Cap the docked title so its right edge stays 20px clear of the top bar. The
  // pill is left-anchored (after the fixed-width Back button), so its left edge
  // doesn't move when the width is clamped — the measurement converges in one
  // pass. Recomputed whenever the bar's box, title, or dock state changes.
  useLayoutEffect(() => {
    if (!docked || !topBarBox) { setDockTitleMax(undefined); return }
    const el = dockTitleRef.current
    if (!el) return
    const GAP = 10 // keep the truncated title ~10px clear of the expanded bar
    const left = el.getBoundingClientRect().left
    setDockTitleMax(Math.max(0, topBarBox.left - GAP - left))
  }, [docked, topBarBox, topBarCompact, currentLessonId])

  if (!lesson) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ minHeight: 300, color: 'var(--color-muted)' }}>
        <p style={{ fontSize: 15, fontWeight: 650, color: 'var(--color-text)' }}>Урок не найден</p>
        <button
          onClick={closeLesson}
          style={{ marginTop: 12, padding: '8px 18px', borderRadius: 999, border: 'none', cursor: 'pointer', background: 'var(--color-text)', color: '#fff', fontSize: 13, fontWeight: 600 }}
        >
          Назад
        </button>
      </div>
    )
  }

  const detail = getLessonDetail(lesson)

  // RuTube player API: send a command to the embed iframe over postMessage.
  const sendPlayerCommand = (type: string, data: Record<string, unknown> = {}) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ type, data }), '*')
  }

  // Open the player at `seconds`, or — if it's already open — seek there via the
  // postMessage API (no remount). The play button and every timecode use this.
  const playFrom = (seconds: number) => {
    if (playing) {
      sendPlayerCommand('player:setCurrentTime', { time: seconds })
      sendPlayerCommand('player:play')
    } else {
      setStartSeconds(seconds)
      setPlaying(true)
    }
  }

  // The embed doesn't always honour autoplay from the ?t= URL alone, so once the
  // RuTube player reports it's ready we nudge it to start.
  useEffect(() => {
    if (!playing) return
    const onMessage = (e: MessageEvent) => {
      if (typeof e.data !== 'string') return
      let msg: { type?: string }
      try { msg = JSON.parse(e.data) } catch { return }
      if (msg.type === 'player:ready') sendPlayerCommand('player:play')
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [playing])

  // Easing for the date chip's icon/month collapse — matches the top bar's own
  // expand/collapse curve so the two move in sync.
  const dateMorph = { duration: 0.32, ease: [0.32, 0.72, 0, 1] as const }

  // Shared glass recipe for the docked top-line pills — matched exactly to the
  // compact top bar (same opacity, border, shadow) so every floating surface on
  // the scrolled lesson reads as one consistent piece of glass.
  const dockGlass = {
    border: '1px solid var(--color-border-glass)',
    background: 'rgba(var(--glass-rgb), 0.86)',
    backdropFilter: 'blur(14px) saturate(180%)',
    WebkitBackdropFilter: 'blur(14px) saturate(180%)',
    boxShadow: 'var(--shadow-lg)',
  } as const

  return (
    <div className="flex flex-col" style={{ gap: 18 }}>
      {/* Rest-state Back / title / date row — in the scroll flow below the
          topbar. Fades out as the page docks; its docked twin is the fixed bar
          below, which sits ON the topbar line so nothing slides under blur. */}
      <motion.div
        className="flex items-center"
        style={{ gap: 16 }}
        animate={{ opacity: docked ? 0 : 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={closeLesson}
          className="flex items-center cursor-pointer flex-shrink-0"
          style={{
            gap: 4, padding: '9px 16px 9px 12px', borderRadius: 999, border: '1px solid var(--color-border-soft)',
            background: 'rgba(var(--glass-rgb), 0.96)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
            color: 'var(--color-text)', fontSize: 14, fontWeight: 600,
          }}
        >
          <ChevronLeft size={18} />
          Назад
        </motion.button>

        <h1
          className="flex-1 min-w-0 truncate text-center"
          style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}
        >
          Занятие #{lesson.number + 1} {lesson.title}
        </h1>

        <div
          className="flex items-center flex-shrink-0"
          style={{
            gap: 6, padding: '9px 16px', borderRadius: 999, border: '1px solid var(--color-border-soft)',
            background: 'rgba(var(--glass-rgb), 0.96)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
            color: 'var(--color-muted)', fontSize: 14, fontWeight: 600,
          }}
        >
          <Calendar size={15} />
          {detail.date}
        </div>
      </motion.div>

      {/* Docked twin — fixed at the topbar line, escaping the scroll
          container's top padding so it sits ON the topbar row (mini topbar
          centred between Back+title on the left and the date on the right).
          Glass pills to match the topbar; fades / slides in on scroll. */}
      <div className="docked-pills-row" style={{ position: 'fixed', top: isDesktop ? 30 : 'calc(0px + 14px)', left: isDesktop ? 32 : 16, right: isDesktop ? 32 : 16, zIndex: 80, pointerEvents: 'none' }}>
      <AnimatePresence>
        {docked && (
          <motion.div
            key="lesson-dock"
            className="flex items-center"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: [0, 6, -3.5, 1.5, -0.5, 0] }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.38, ease: [0.34, 1.56, 0.64, 1] }}
            style={{ gap: 12, pointerEvents: 'none' }}
          >
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={closeLesson}
              className="flex items-center cursor-pointer flex-shrink-0"
              style={{
                gap: 4, padding: '9px 16px 9px 12px', borderRadius: 999,
                ...dockGlass,
                color: 'var(--color-text)', fontSize: 14, fontWeight: 600, pointerEvents: 'auto',
              }}
            >
              <ChevronLeft size={18} />
              Назад
            </motion.button>

            <div
              ref={dockTitleRef}
              className="min-w-0 truncate"
              style={{
                fontSize: 14, fontWeight: 700, color: 'var(--color-text)', flexShrink: 1,
                maxWidth: dockTitleMax,
                padding: '9px 16px', borderRadius: 999,
                ...dockGlass, pointerEvents: 'auto',
              }}
            >
              {lesson.title}
            </div>

            <div style={{ flexGrow: 1, flexBasis: 0 }} />

            {/* Mini top bar → full date + calendar icon. Expanded top bar →
                the row is tight, so the icon and ".month" smoothly collapse to
                zero width, leaving just the day number. The chip's own width
                follows its content per-frame, so it glides between the two. */}
            <div
              className="flex items-center flex-shrink-0"
              style={{
                overflow: 'hidden',
                padding: '9px 14px', borderRadius: 999,
                ...dockGlass,
                color: 'var(--color-muted)', fontSize: 14, fontWeight: 600, pointerEvents: 'auto',
              }}
            >
              <motion.span
                initial={false}
                animate={{ width: topBarCompact ? 15 : 0, marginRight: topBarCompact ? 6 : 0, opacity: topBarCompact ? 1 : 0 }}
                transition={dateMorph}
                style={{ display: 'inline-flex', overflow: 'hidden', flexShrink: 0 }}
              >
                <Calendar size={15} />
              </motion.span>
              <span style={{ whiteSpace: 'nowrap' }}>{detail.date.split('.')[0]}</span>
              <motion.span
                initial={false}
                animate={{ width: topBarCompact ? 'auto' : 0, opacity: topBarCompact ? 1 : 0 }}
                transition={dateMorph}
                style={{ display: 'inline-block', overflow: 'hidden', whiteSpace: 'nowrap' }}
              >
                .{detail.date.split('.')[1]}
              </motion.span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* ── Row 1: video + timecodes — only when recording exists ── */}
      {detail.videoId && (
        <div
          className="grid lg:grid-cols-[minmax(0,1fr)_320px] items-stretch"
          style={{ gap: 16 }}
        >
          {/* Video player */}
          <div
            className="relative min-w-0"
            style={{
              width: '100%',
              height: '54vh',
              borderRadius: 24,
              overflow: 'hidden',
              background: 'linear-gradient(135deg, #2A2A2C, #111113)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
            }}
          >
            {playing ? (
              <iframe
                ref={iframeRef}
                src={`https://rutube.ru/play/embed/${detail.videoId}?t=${startSeconds}`}
                title={`Видео урока: ${lesson.title}`}
                allow="clipboard-write; autoplay; fullscreen; encrypted-media; picture-in-picture"
                allowFullScreen
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
              />
            ) : (
              <>
                <span
                  style={{
                    position: 'absolute', top: 16, left: 16, zIndex: 2,
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.14)',
                    padding: '5px 12px', borderRadius: 999, backdropFilter: 'blur(8px)',
                  }}
                >
                  {lesson.subject === 'biology' ? 'Биология' : 'Химия'}
                </span>

                <button
                  onClick={() => playFrom(detail.timecodes[activeChapter]?.seconds ?? 0)}
                  aria-label="Смотреть"
                  className="absolute inset-0 flex items-center justify-center cursor-pointer"
                  style={{ border: 'none', background: 'transparent' }}
                >
                  <motion.div
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.94 }}
                    style={{
                      width: 76, height: 76, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(var(--glass-rgb), 0.95)', color: 'var(--color-purple)',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                    }}
                  >
                    <Play size={30} fill="var(--color-purple)" style={{ marginLeft: 4 }} />
                  </motion.div>
                </button>

                <span
                  style={{
                    position: 'absolute', bottom: 16, right: 16, zIndex: 2,
                    fontSize: 12, fontWeight: 600, color: '#fff',
                    background: 'rgba(0,0,0,0.5)', padding: '4px 10px', borderRadius: 8,
                  }}
                >
                  {detail.duration}
                </span>
              </>
            )}
          </div>

          {/* Timecodes panel */}
          <div
            className="flex flex-col h-full"
            style={{
              borderRadius: 24,
              background: 'rgba(var(--glass-rgb), 0.96)',
              border: '1px solid var(--color-border-soft)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
              padding: 16,
              gap: 6,
              maxHeight: '54vh',
            }}
          >
            <div className="flex items-center" style={{ gap: 8, marginBottom: 6 }}>
              <ListVideo size={17} style={{ color: 'var(--color-accent)' }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>Таймкоды</span>
            </div>
            <div className="flex flex-col flex-1" style={{ gap: 2, overflowY: 'auto' }}>
              {detail.timecodes.map((tc, i) => {
                const active = i === activeChapter
                return (
                  <button
                    key={tc.time}
                    onClick={() => { setActiveChapter(i); playFrom(tc.seconds) }}
                    className="flex items-center cursor-pointer text-left"
                    style={{
                      gap: 10, padding: '9px 10px', borderRadius: 12, border: 'none',
                      background: active ? 'var(--color-purple-soft)' : 'transparent',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg)' }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                  >
                    <span
                      style={{
                        fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                        color: active ? 'var(--color-accent)' : 'var(--color-text-3)', minWidth: 42, flexShrink: 0,
                      }}
                    >
                      {tc.time}
                    </span>
                    <span style={{ fontSize: 13.5, fontWeight: active ? 600 : 500, color: active ? 'var(--color-text)' : '#4A4A52' }}>
                      {tc.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Row 2: worksheet / notes / materials in a row, homeworks stacked in the 4th column ── */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 14,
          alignItems: 'start',
        }}
      >
        <DownloadTile icon={NotebookPen} label="Рабочая тетрадь" />
        <DownloadTile icon={FileText} label="Конспект" />
        <MaterialsTile materials={detail.materials} />
        <HomeworkCard lessonId={lesson.id} homework={detail.homework} onOpen={openHomework} />
      </div>

      {/* ── Конспект: lesson notes, with reaction paragraphs highlighted on
          arrival from the reactions widget. ── */}
      {detail.paragraphs.length > 0 && (
        <section
          className="flex flex-col"
          style={{
            gap: 14,
            padding: 24,
            borderRadius: 24,
            background: 'rgba(var(--glass-rgb), 0.96)',
            border: '1px solid var(--color-border-soft)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
          }}
        >
          <div className="flex items-center" style={{ gap: 8 }}>
            <FileText size={17} style={{ color: 'var(--color-accent)' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>Описание</span>
          </div>
          {detail.paragraphs.map(p => (
            <div
              key={p.id}
              ref={el => { if (p.reactionId) paragraphRefs.current[p.reactionId] = el }}
            >
              {/* Keep fontWeight constant — toggling weight on highlight in/out
                  reflows the text and visibly jerks the line. The equation gets
                  its own background highlight via renderHighlightedParagraph,
                  which is the actual emphasis cue. */}
              <p
                style={{
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: 'var(--color-text)',
                  fontWeight: 450,
                }}
              >
                {renderHighlightedParagraph(p.text, p.reactionId, pendingHighlight, courseReactions)}
              </p>
            </div>
          ))}
        </section>
      )}

    </div>
  )
}
