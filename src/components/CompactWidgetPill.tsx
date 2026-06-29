import { motion, AnimatePresence, type PanInfo } from 'framer-motion'
import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import {
  Play, Pause, ChevronLeft, ChevronRight, RotateCcw, Timer, Watch, TrendingUp,
  X, ArrowRight, UserPlus, CheckCircle2, FileText, Brain, Banknote, NotebookPen,
  Bell, Clock, BookOpen, ClipboardList,
} from 'lucide-react'
import { useNotificationsStore, type Notification } from '../store/notificationsStore'
import { getContrastColor } from '../lib/utils'
import {
  scienceFactInterval,
  scienceMemeInterval,
  courseReactionInterval,
} from '../data/mockData'
import { useDashboard } from '../store/dashboardStore'
import { useStudentData } from '../store/studentDataStore'
import { useTrainerProgress } from '../store/trainerProgressStore'
import { useTeacher } from '../store/teacherStore'
import { tactile } from '../lib/feedback'

/**
 * The minimalist "pill" the WidgetCarousel morphs into when the user leaves the
 * home dashboard for Курсы / Тренажер. Sits beside the top bar, one widget at
 * a time, round image on the left, one-line preview on the right.
 *
 * Behaviour:
 * - Collapsed (top-bar height): horizontal swipe / chevron-less nav cycles
 *   widgets. Tap expands.
 * - Expanded (~3x top-bar height): shows a richer preview. Swipes are intercepted
 *   here — they don't change the visible widget. Tap collapses again.
 */

const TOPBAR_H = 60
const COLLAPSED_H = TOPBAR_H
const PILL_WIDTH = 320

// One-line "kicker" tags + accent colours per widget id.
const META: Record<number, { kicker: string; accent: string }> = {
  0: { kicker: 'Сегодня', accent: 'var(--color-accent)' },
  1: { kicker: 'Научный факт', accent: '#2D6BE0' },
  2: { kicker: 'Реакция курса', accent: '#1E9E63' },
  3: { kicker: 'Фокус', accent: 'var(--color-accent)' },
  4: { kicker: 'Мем', accent: '#E0852D' },
  5: { kicker: 'Вопрос дня', accent: '#0E7A6F' },
}

// Compact previews per widget id. `expanded` toggles the longer copy that
// shows up when the pill grows. Each preview returns: an avatar (round
// circle on the left) + a tight text block (1 line collapsed, 2–3 expanded).
function useRotatingIndex(length: number, intervalSec: number, paused: boolean) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (paused) return
    const t = setTimeout(() => setI(x => (x + 1) % length), intervalSec * 1000)
    return () => clearTimeout(t)
  }, [i, paused, length, intervalSec])
  return i
}

function StatsPreview({ expanded }: { expanded: boolean }) {
  const homeworkFeedback = useDashboard(s => s.homeworkWidgetFeedback)
  const answerFlight = useDashboard(s => s.answerFlight)
  // Pulse the pill avatar once when a new answer lands (flight cleared → feedback updated).
  const prevAnswered = useRef(homeworkFeedback?.answered ?? 0)
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    const next = homeworkFeedback?.answered ?? 0
    if (next > prevAnswered.current) {
      setPulse(true)
      const t = setTimeout(() => setPulse(false), 600)
      prevAnswered.current = next
      return () => clearTimeout(t)
    }
    prevAnswered.current = next
  }, [homeworkFeedback?.answered])

  if (homeworkFeedback) {
    const { lastCorrect, lastQuestionIndex, correct, total, lessonTitle, lastMessage } = homeworkFeedback
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0
    const correctColor = '#2A7D4F'
    const wrongColor = '#A8282D'
    const accentColor = lastCorrect ? correctColor : wrongColor

    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 14px 14px 9px', width: '100%', boxSizing: 'border-box' }}>
        {/* Avatar — question number badge with correct/wrong ring + pulse */}
        <motion.div
          animate={pulse && !answerFlight ? { scale: [1, 1.22, 1] } : { scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{
            width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
            background: lastCorrect
              ? 'var(--grad-green)'
              : 'var(--grad-red)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 15, fontWeight: 800,
            boxShadow: lastCorrect
              ? '0 2px 10px rgba(63,204,138,0.45)'
              : '0 2px 10px rgba(244,139,145,0.45)',
            position: 'relative', overflow: 'visible',
          }}
        >
          {lastCorrect ? '✓' : '✗'}
          {/* question number */}
          <div style={{
            position: 'absolute', bottom: -3, right: -3,
            width: 15, height: 15, borderRadius: '50%',
            background: 'var(--color-bg-input)',
            color: accentColor,
            fontSize: 8, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
            lineHeight: 1,
          }}>
            {lastQuestionIndex + 1}
          </div>
        </motion.div>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 2 }}>
          {/* Kicker */}
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
            textTransform: 'uppercase', color: 'var(--color-text-3)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            Домашка · {lessonTitle}
          </span>

          {/* Title row: status + score pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <span style={{
              fontSize: 13, fontWeight: 700, color: accentColor,
              whiteSpace: 'nowrap',
            }}>
              {lastCorrect ? 'Верно' : 'Пока мимо'}
            </span>
            <span style={{ fontSize: 11.5, color: 'var(--color-text-3)', fontWeight: 500 }}>·</span>
            <span style={{
              fontSize: 11.5, fontWeight: 600, color: 'var(--color-text-2)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              вопрос {lastQuestionIndex + 1} из {total}
            </span>
            {/* score pill — only after ≥1 answered */}
            {correct > 0 && (
              <span style={{
                marginLeft: 'auto', flexShrink: 0,
                fontSize: 10.5, fontWeight: 750,
                padding: '2px 7px', borderRadius: 999,
                background: pct >= 60 ? 'var(--color-green-soft)' : 'var(--color-red-soft)',
                color: pct >= 60 ? 'var(--color-green-text)' : 'var(--color-red-text)',
              }}>
                {correct}/{total}
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div style={{ paddingRight: 12, marginTop: 3 }}>
            <motion.div
              style={{
                height: 3,
                borderRadius: 999,
                background: 'var(--color-bg-5)',
                overflow: 'hidden',
              }}
            >
              <motion.div
                animate={{ width: `${(homeworkFeedback.answered / total) * 100}%` }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  height: '100%', borderRadius: 999,
                  background: lastCorrect
                    ? 'var(--grad-green-bar)'
                    : 'var(--grad-red-bar)',
                }}
              />
            </motion.div>
          </div>

          {/* Detail — only visible when expanded */}
          <motion.div
            animate={{ opacity: expanded ? 1 : 0 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            style={{
              marginTop: 5,
              fontSize: 12, fontWeight: 450, color: 'var(--color-text-2)',
              lineHeight: 1.45, overflow: 'hidden', willChange: 'opacity',
            }}
          >
            {lastMessage}
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <PillContent
      avatar={
        <div style={{ width: '100%', height: '100%', background: 'var(--grad-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20 }}>
          📊
        </div>
      }
      kicker={META[0].kicker}
      title="Пока недостаточно данных"
      expanded={expanded}
      detail="Данные появятся после первых занятий."
    />
  )
}

function ScienceFactPreview({ expanded, paused }: { expanded: boolean; paused: boolean }) {
  const scienceFacts = useStudentData(s => s.scienceFacts)
  const i = useRotatingIndex(scienceFacts.length || 1, scienceFactInterval, paused)
  const fact = scienceFacts[i]
  if (!fact) return (
    <PillContent
      avatar={<div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #3FCB8A, #1E9E63)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20 }}>🔬</div>}
      kicker="Научный факт"
      title="—"
      expanded={expanded}
      detail="Загружаем интересные факты…"
    />
  )
  return (
    <PillContent
      avatar={
        <div
          style={{
            width: '100%',
            height: '100%',
            background: fact.gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 22,
          }}
        >
          {fact.emoji}
        </div>
      }
      kicker={`${fact.subject} · факт`}
      title={fact.text.split('—')[0].trim().replace(/[.,]$/, '')}
      expanded={expanded}
      detail={fact.text}
    />
  )
}

function ReactionPreview({ expanded, paused }: { expanded: boolean; paused: boolean }) {
  const courseReactions = useStudentData(s => s.courseReactions)
  const i = useRotatingIndex(courseReactions.length || 1, courseReactionInterval, paused)
  const r = courseReactions[i]
  if (!r) return (
    <PillContent
      avatar={<div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #5A9BF0, #1F6FB8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20 }}>⚗️</div>}
      kicker="Химия · Реакция"
      title="—"
      expanded={expanded}
      detail="Загружаем реакции курса…"
    />
  )
  return (
    <PillContent
      avatar={
        <div
          style={{
            width: '100%',
            height: '100%',
            background: r.gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 22,
          }}
        >
          {r.emoji}
        </div>
      }
      kicker={`Химия · ${r.name}`}
      title={r.equation}
      expanded={expanded}
      detail={`${r.name} · Урок «${r.lesson}»`}
    />
  )
}

const POMO_ACCENT = 'var(--color-accent)'
const POMO_PRESETS = [5, 10, 15, 20, 25]

function fmtClock(total: number) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// The expanded control panel: timer/stopwatch toggle, focus-length presets,
// and the play + repeat actions. Rendered inside the pill's detail slot so it
// only becomes interactive once the pill grows.
function PomoControls() {
  const {
    pomoTimerMode, pomoMode, pomoRunning, pomoFocusDuration,
    pomoStart, pomoPause, pomoReset, pomoSetPreset, pomoSetTimerMode,
  } = useDashboard()
  const currentMin = Math.round(pomoFocusDuration / 60)
  // Swallow the click so it doesn't bubble up and collapse the pill, and give
  // every control press the same sound + haptic tick.
  const stop = (e: React.MouseEvent) => { e.stopPropagation(); tactile() }

  return (
    <div onClick={stop} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 2 }}>
      {/* Timer ↔ Stopwatch segmented control */}
      <div style={{ display: 'flex', alignSelf: 'flex-start', background: 'rgba(0,0,0,0.18)', borderRadius: 999, padding: 3, gap: 2 }}>
        {([['timer', 'Таймер'], ['stopwatch', 'Секундомер']] as const).map(([mode, label]) => {
          const active = pomoTimerMode === mode
          return (
            <button
              key={mode}
              onClick={e => { stop(e); pomoSetTimerMode(mode) }}
              style={{
                fontSize: 11.5, fontWeight: 650, lineHeight: 1, padding: '5px 14px', borderRadius: 999,
                border: 'none', cursor: 'pointer', outline: 'none',
                color: active ? 'var(--color-text)' : 'rgba(255,255,255,0.38)',
                background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                boxShadow: active ? 'inset 0 0 0 1px rgba(255,255,255,0.14)' : 'none',
                transition: 'color 0.18s, background 0.18s, box-shadow 0.18s',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Focus-length presets — only relevant in timer mode */}
      {pomoTimerMode === 'timer' && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {POMO_PRESETS.map(p => {
            const active = pomoMode === 'focus' && currentMin === p
            return (
              <button
                key={p}
                onClick={e => { stop(e); pomoSetPreset(p) }}
                style={{
                  minWidth: 38, padding: '5px 0', borderRadius: 10, cursor: 'pointer',
                  fontSize: 12.5, fontWeight: 650, lineHeight: 1,
                  border: active ? `1px solid ${POMO_ACCENT}` : '1px solid transparent',
                  color: active ? POMO_ACCENT : 'var(--color-text-2)',
                  background: active ? 'rgba(123,97,255,0.10)' : 'var(--color-bg-3)',
                  transition: 'all 0.18s ease',
                }}
              >
                {p}
              </button>
            )
          })}
        </div>
      )}

      {/* Play / pause + repeat */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={e => { stop(e); pomoRunning ? pomoPause() : pomoStart() }}
          aria-label={pomoRunning ? 'Пауза' : 'Старт'}
          style={{
            flex: 1, height: 38, borderRadius: 12, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontSize: 13, fontWeight: 650,
            color: pomoRunning ? 'var(--color-text)' : '#FFFFFF',
            background: pomoRunning ? 'var(--color-bg-3)' : `linear-gradient(135deg, #B98BFF, ${POMO_ACCENT})`,
          }}
        >
          {pomoRunning ? <Pause size={15} /> : <Play size={15} />}
          {pomoRunning ? 'Пауза' : 'Старт'}
        </button>
        <button
          onClick={e => { stop(e); pomoReset() }}
          aria-label="Повторить"
          style={{
            width: 38, height: 38, borderRadius: 12, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-muted)', background: 'var(--color-bg-3)',
          }}
        >
          <RotateCcw size={15} />
        </button>
      </div>
    </div>
  )
}

function PomoPreview({ expanded }: { expanded: boolean }) {
  const pomoMode = useDashboard(s => s.pomoMode)
  const pomoTimerMode = useDashboard(s => s.pomoTimerMode)
  const pomoSecondsLeft = useDashboard(s => s.pomoSecondsLeft)
  const pomoStopwatchSeconds = useDashboard(s => s.pomoStopwatchSeconds)
  const pomoRunning = useDashboard(s => s.pomoRunning)

  const isStopwatch = pomoTimerMode === 'stopwatch'
  const seconds = isStopwatch ? pomoStopwatchSeconds : pomoSecondsLeft
  const kicker = isStopwatch ? 'Секундомер' : pomoMode === 'focus' ? 'Фокус' : 'Перерыв'
  const title = isStopwatch
    ? `${fmtClock(seconds)} прошло`
    : `${fmtClock(seconds)} осталось`

  return (
    <PillContent
      avatar={
        // Decorative — the controls now live in the expanded panel, so the
        // avatar no longer competes with the nav chevrons for the tap.
        <div
          style={{
            width: '100%', height: '100%',
            background: pomoRunning
              ? `linear-gradient(135deg, #B98BFF, ${POMO_ACCENT})`
              : 'var(--grad-purple)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}
        >
          {isStopwatch ? <Watch size={18} /> : <Timer size={18} />}
        </div>
      }
      kicker={kicker}
      title={title}
      expanded={expanded}
      detail={<PomoControls />}
    />
  )
}

function MemePreview({ expanded, paused }: { expanded: boolean; paused: boolean }) {
  const scienceMemes = useStudentData(s => s.scienceMemes)
  const i = useRotatingIndex(scienceMemes.length || 1, scienceMemeInterval, paused)
  const m = scienceMemes[i]
  if (!m) return (
    <PillContent
      avatar={<div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #F0A83F, var(--color-purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20 }}>😄</div>}
      kicker="Мем"
      title="—"
      expanded={expanded}
      detail="Загружаем мемы курса…"
    />
  )
  return (
    <PillContent
      avatar={
        <div
          style={{
            width: '100%',
            height: '100%',
            background: m.gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 22,
          }}
        >
          {m.emoji}
        </div>
      }
      kicker={`${m.subject} · мем`}
      title={m.setup}
      expanded={expanded}
      detail={m.punchline}
    />
  )
}

// Until tapped, the answer is hidden behind a single grey bar that fills the
// rest of the line — so it never hints at how many letters/words the answer is.
// The whole bar is the hit area. Re-hides whenever the pill collapses, so the
// next expand starts hidden again.
function AnswerSpoiler({ text, expanded }: { text: string; expanded: boolean }) {
  const [phase, setPhase] = useState<'hidden' | 'dissolving' | 'shown'>('hidden')
  const barRef = useRef<HTMLButtonElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => { if (!expanded) setPhase('hidden') }, [expanded])
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }, [])

  const dissolve = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    tactile()
    const bar = barRef.current
    if (!bar) { setPhase('shown'); return }
    const W = bar.offsetWidth
    const H = bar.offsetHeight
    setPhase('dissolving')

    requestAnimationFrame(() => {
      const canvas = canvasRef.current
      if (!canvas) { setPhase('shown'); return }
      const ctx = canvas.getContext('2d')
      if (!ctx) { setPhase('shown'); return }
      canvas.width = W
      canvas.height = H

      type P = { x: number; y: number; w: number; h: number; vx: number; vy: number; a: number }
      const pts: P[] = Array.from({ length: Math.floor(W / 4.5) }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        w: 2 + Math.random() * 6,
        h: 2 + Math.random() * 3,
        vx: (Math.random() - 0.5) * 3,
        vy: -0.3 - Math.random() * 2.2,
        a: 0.65 + Math.random() * 0.35,
      }))

      const start = performance.now()
      const DURATION = 540

      function tick(now: number) {
        const t = Math.min((now - start) / DURATION, 1)
        ctx!.clearRect(0, 0, W, H)
        for (const p of pts) {
          p.x += p.vx
          p.y += p.vy
          p.vy += 0.05
          const alpha = p.a * (1 - t) * (1 - t)
          if (alpha < 0.01) continue
          ctx!.globalAlpha = alpha
          ctx!.fillStyle = 'rgba(11,11,13,0.7)'
          ctx!.beginPath()
          ctx!.roundRect(p.x, p.y, p.w, p.h, 2)
          ctx!.fill()
        }
        if (t < 1) { rafRef.current = requestAnimationFrame(tick) }
        else { setPhase('shown') }
      }
      rafRef.current = requestAnimationFrame(tick)
    })
  }, [])

  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
      <span style={{ flexShrink: 0 }}>Ответ:</span>
      {phase === 'shown' ? (
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.28 }}>
          {text}
        </motion.span>
      ) : (
        <span style={{ flex: 1, position: 'relative', height: 14 }}>
          <button
            ref={barRef}
            type="button"
            onClick={dissolve}
            aria-label="Показать ответ"
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              border: 'none', padding: 0, borderRadius: 999,
              background: phase === 'dissolving' ? 'transparent' : 'rgba(11,11,13,0.16)',
              cursor: 'pointer', overflow: 'hidden',
            }}
          >
            {phase === 'hidden' && (
              <span style={{
                position: 'absolute', inset: 0, borderRadius: 999,
                background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%)',
                filter: 'blur(3px)',
                animation: 'shimmer-bar 2.2s ease-in-out infinite',
                pointerEvents: 'none',
              }} />
            )}
          </button>
          {phase === 'dissolving' && (
            <canvas
              ref={canvasRef}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
            />
          )}
        </span>
      )}
    </span>
  )
}

function QuestionOfDayPreview({ expanded }: { expanded: boolean }) {
  const quizQuestions = useStudentData(s => s.quizQuestions)
  const day = new Date().getDate()
  const q = quizQuestions[day % Math.max(quizQuestions.length, 1)] ?? quizQuestions[0] ?? { id: 'q1', title: '…', subject: 'Химия', answers: [] }
  const correct = q.answers.find(a => a.correct)

  return (
    <PillContent
      avatar={
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'var(--grad-teal)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 20,
          }}
        >
          ✨
        </div>
      }
      kicker={`${q.subject} · вопрос`}
      title={q.title}
      expanded={expanded}
      detail={correct ? <AnswerSpoiler text={correct.text} expanded={expanded} /> : 'Открой виджет, чтобы посмотреть ответ.'}
    />
  )
}

function TrainerProgressPreview({ expanded }: { expanded: boolean }) {
  const { doneCount, wrongCount, totalCount, todayCorrect, setOpenModal } = useTrainerProgress()
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0

  const R = 11
  const circ = 2 * Math.PI * R
  const dash = circ * (pct / 100)

  const PILL_T = { type: 'spring' as const, stiffness: 220, damping: 28, mass: 1.1 }

  const avatarR = 16
  const avatarCirc = 2 * Math.PI * avatarR
  const avatarDash = avatarCirc * (pct / 100)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 14px 14px 9px', width: '100%', boxSizing: 'border-box' }}>
      {/* Avatar — donut progress ring */}
      <div style={{
        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
        background: 'rgba(52,200,119,0.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        <svg width="40" height="40" viewBox="0 0 40 40" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
          <circle cx="20" cy="20" r={avatarR} fill="none" stroke="rgba(52,200,119,0.2)" strokeWidth="3.5" />
          <circle cx="20" cy="20" r={avatarR} fill="none" stroke="#34C877" strokeWidth="3.5"
            strokeDasharray={`${avatarDash} ${avatarCirc}`} strokeLinecap="round" />
        </svg>
        <span style={{ fontSize: 9.5, fontWeight: 750, color: '#34C877', position: 'relative', lineHeight: 1 }}>
          {pct}%
        </span>
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 2 }}>
        {/* Kicker */}
        <span style={{
          fontSize: 10.5, fontWeight: 600, letterSpacing: 0.3,
          textTransform: 'uppercase', color: 'var(--color-text-3)',
        }}>
          Тренажёр · прогресс
        </span>

        {/* Pills — smoothly morph between collapsed capsule and expanded tile */}
        {doneCount > 0 ? (
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 6, marginTop: 2 }}>

            {/* Green: correct */}
            <motion.div
              initial={false}
              animate={{ padding: expanded ? '8px 6px' : '3px 8px', borderRadius: expanded ? 26 : 999, flexGrow: expanded ? 1 : 0 }}
              transition={PILL_T}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, background: 'rgba(110,231,160,0.22)', color: '#27A85A', fontWeight: 700, lineHeight: 1 }}
            >
              <motion.span initial={false} animate={{ fontSize: expanded ? 18 : 12 }} transition={PILL_T} style={{ whiteSpace: 'nowrap' }}>✓ {doneCount}</motion.span>
              <motion.span initial={false} animate={{ opacity: expanded ? 0.75 : 0, maxHeight: expanded ? 16 : 0 }} transition={PILL_T} style={{ fontSize: 9.5, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {totalCount > 0 ? `Верно из ${totalCount}` : 'Верно'}
              </motion.span>
            </motion.div>

            {/* Purple: today */}
            {todayCorrect > 0 && (
              <motion.div
                initial={false}
                animate={{ padding: expanded ? '8px 6px' : '3px 8px', borderRadius: expanded ? 26 : 999, flexGrow: expanded ? 1 : 0 }}
                transition={PILL_T}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, background: 'rgba(139,92,246,0.18)', color: 'var(--color-accent)', fontWeight: 700, lineHeight: 1 }}
              >
                <motion.span initial={false} animate={{ fontSize: expanded ? 18 : 12 }} transition={PILL_T} style={{ whiteSpace: 'nowrap' }}>+{todayCorrect}</motion.span>
                <motion.span initial={false} animate={{ opacity: expanded ? 0.85 : 0, maxHeight: expanded ? 16 : 0 }} transition={PILL_T} style={{ fontSize: 9.5, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  Сегодня
                </motion.span>
              </motion.div>
            )}

            {/* Red: wrong */}
            {wrongCount > 0 && (
              <motion.div
                initial={false}
                animate={{ padding: expanded ? '8px 6px' : '3px 8px', borderRadius: expanded ? 26 : 999, flexGrow: expanded ? 1 : 0 }}
                transition={PILL_T}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, background: 'rgba(220,50,60,0.26)', color: '#F04858', fontWeight: 700, lineHeight: 1 }}
              >
                <motion.span initial={false} animate={{ fontSize: expanded ? 18 : 12 }} transition={PILL_T} style={{ whiteSpace: 'nowrap' }}>✗ {wrongCount}</motion.span>
                <motion.span initial={false} animate={{ opacity: expanded ? 0.85 : 0, maxHeight: expanded ? 16 : 0 }} transition={PILL_T} style={{ fontSize: 9.5, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  Ошибок
                </motion.span>
              </motion.div>
            )}
          </div>
        ) : (
          <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--color-text-3)' }}>
            Начни решать задания
          </span>
        )}

        {/* Expanded extras: progress bar + link */}
        <motion.div
          animate={{ opacity: expanded ? 1 : 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          style={{ overflow: 'hidden', willChange: 'opacity' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            {totalCount > 0 && (
              <div style={{ flex: 1, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', display: 'flex' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'rgba(110,231,160,0.55)', flexShrink: 0, transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)' }} />
                <div style={{ height: '100%', width: `${totalCount ? Math.round((wrongCount / totalCount) * 100) : 0}%`, background: 'rgba(240,96,112,0.45)', flexShrink: 0 }} />
              </div>
            )}
            <button onClick={e => { e.stopPropagation(); setOpenModal(true) }}
              style={{ flexShrink: 0, padding: '3px 8px', borderRadius: 999, border: 'none', background: 'rgba(52,200,119,0.15)', color: '#27A85A', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
              Подробнее →
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// Single shared spring so the avatar, padding, height, width, and text
// gap all glide to the new size in lockstep instead of each running its own
// timing curve (which was the source of the visible "jitter" on collapse).
const MORPH = { type: 'spring' as const, stiffness: 220, damping: 28, mass: 1.1 }

function PillContent({
  avatar,
  kicker,
  title,
  detail,
  expanded,
}: {
  avatar: React.ReactNode
  kicker: string
  title: string
  detail: React.ReactNode
  expanded: boolean
}) {
  // INVARIANT layout: avatar size, padding, gap, title clamp — all FIXED.
  // Nothing inside the content moves when `expanded` flips. The outer
  // pill's animated height simply clips the lower portion (where the
  // detail text lives) when collapsed. Detail opacity cross-fades on the
  // same curve as the outer height. One animation, one timing curve, no
  // jitter from competing layout changes.
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        // Collapsed content box is 58px (60 − 2×1px border); a 40px avatar
        // centres at 9px top/bottom. 9px left matches, so the mini pill reads
        // with equal gaps on top, bottom and left. The 14px right/bottom give
        // the expanded detail text its breathing room.
        padding: '9px 14px 14px 9px',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          overflow: 'hidden',
          flexShrink: 0,
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.4)',
        }}
      >
        {avatar}
      </div>

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          paddingTop: 2,
        }}
      >
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: 0.3,
            textTransform: 'uppercase',
            color: 'var(--color-text-3)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {kicker}
        </span>
        <span
          style={{
            fontSize: 13.5,
            fontWeight: 600,
            color: 'var(--color-text)',
            lineHeight: 1.25,
            display: '-webkit-box',
            // Collapsed: clamp to one line so the mini pill stays a capsule.
            // Expanded: drop the clamp so the full question is revealed (the
            // pill's measured height grows to fit the extra lines).
            WebkitLineClamp: expanded ? 'unset' : 1,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {title}
        </span>
        {/* Detail text is ALWAYS rendered (so the measured natural height
            of this block is the expanded height); it just fades opacity
            in and out. The outer pill height clips it when collapsed. */}
        <motion.div
          animate={{ opacity: expanded ? 1 : 0 }}
          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          style={{
            marginTop: 4,
            fontSize: 12.5,
            fontWeight: 450,
            color: 'var(--color-text-2)',
            lineHeight: 1.4,
            overflow: 'hidden',
            willChange: 'opacity',
          }}
        >
          {detail}
        </motion.div>
      </div>
    </div>
  )
}

const swipeVariants = {
  // Short slide distance + fast spring → the new widget is already
  // mostly in view by the time the old one leaves, so the user never
  // sees an empty pill mid-swipe.
  enter: (dir: number) => ({ x: dir > 0 ? '40%' : '-40%', opacity: 0 }),
  center: { x: '0%', opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? '-40%' : '40%', opacity: 0 }),
}

// ── Live-notification card ─────────────────────────────────────────────────
const NOTIF_ICON_S: Record<string, React.ReactNode> = {
  homework_assigned:    <ClipboardList size={18} />,
  homework_graded:      <CheckCircle2  size={18} />,
  homework_submitted:   <FileText      size={18} />,
  lesson_unlocked:      <BookOpen      size={18} />,
  quiz_available:       <Brain         size={18} />,
  student_joined:       <UserPlus      size={18} />,
  deadline_approaching: <Clock         size={18} />,
  hw_returned:          <Clock         size={18} />,
  hw_graded:            <CheckCircle2  size={18} />,
  hw_submitted:         <FileText      size={18} />,
  test_assigned:        <Brain         size={18} />,
  test_completed:       <CheckCircle2  size={18} />,
  payment_due:          <Banknote      size={18} />,
  fill_journal:         <NotebookPen   size={18} />,
}
const NOTIF_COLOR_S: Record<string, string> = {
  student_joined: '#786AD7', lesson_unlocked: '#786AD7', quiz_available: '#786AD7',
  test_assigned: '#786AD7',
  homework_assigned: '#F59E0B', deadline_approaching: '#F59E0B', payment_due: '#F59E0B',
  hw_returned: '#F59E0B', fill_journal: '#F59E0B',
  homework_graded: '#3FCC8A', homework_submitted: '#3FCC8A', hw_graded: '#3FCC8A',
  hw_submitted: '#3FCC8A', test_completed: '#3FCC8A',
}
const sNotifIcon  = (t: string) => NOTIF_ICON_S[t]  ?? <Bell size={18} />
const sNotifColor = (t: string) => NOTIF_COLOR_S[t] ?? 'var(--color-accent)'

function dedupBodyS(body: string): string {
  const parts = body.split(' · ')
  if (parts.length === 2 && parts[0].trim() === parts[1].trim()) return parts[0].trim()
  return body
}

function StudentNotifPreview({ latest, extra, onAction, onClose }: {
  latest: Notification
  extra: number
  onAction: () => void
  onClose: () => void
}) {
  const accent = sNotifColor(latest.type)
  const hexAccent = accent.startsWith('#') ? accent : '#786AD7'
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '9px 12px 14px 9px', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{
          width: '100%', height: '100%', background: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
        }}>
          {sNotifIcon(latest.type)}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 2 }}>
        <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase', color: 'var(--color-text-3)' }}>
          Уведомление
        </span>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.25 }}>
          {latest.title}
        </span>
        <div style={{ marginTop: 4 }}>
          <span style={{
            fontSize: 12.5, fontWeight: 450, color: 'var(--color-text-2)', lineHeight: 1.4,
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          } as React.CSSProperties}>
            {dedupBodyS(latest.body)}
          </span>
          {latest.action && (
            <button onClick={onAction} style={{
              marginTop: 7, display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 9, border: 'none', cursor: 'pointer',
              background: `${hexAccent}22`, color: accent, fontSize: 11.5, fontWeight: 700,
            }}>
              {latest.action.label} <ArrowRight size={11} />
            </button>
          )}
        </div>
      </div>

      <div style={{ flexShrink: 0, alignSelf: 'flex-start', paddingTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
        {extra > 0 && (
          <span style={{
            fontSize: 10, fontWeight: 700, color: getContrastColor(hexAccent),
            background: accent, borderRadius: 99, padding: '2px 6px',
          }}>
            +{extra}
          </span>
        )}
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--color-text-3)', display: 'flex', padding: 2,
        }}>
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

function PreviewById({ widgetId, expanded }: { widgetId: number; expanded: boolean }) {
  const paused = false

  switch (widgetId) {
    case 0: return <StatsPreview expanded={expanded} />
    case 1: return <ScienceFactPreview expanded={expanded} paused={paused} />
    case 2: return <ReactionPreview expanded={expanded} paused={paused} />
    case 3: return <PomoPreview expanded={expanded} />
    case 4: return <MemePreview expanded={expanded} paused={paused} />
    case 5: return <QuestionOfDayPreview expanded={expanded} />
    case 7: return <TrainerProgressPreview expanded={expanded} />
    case 6: return (
      <PillContent
        avatar={
          <div style={{ width: '100%', height: '100%', background: 'var(--grad-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20 }}>
            🧠
          </div>
        }
        kicker="Викторина"
        title="Викторина ждёт на главной"
        expanded={expanded}
        detail="Вернись на главную страницу, чтобы пройти викторину."
      />
    )
    default: return <StatsPreview expanded={expanded} />
  }
}

export default function CompactWidgetPill() {
  const widgetOrder = useDashboard(s => s.widgetOrder)
  // On a scrolled lesson the whole top line docks over the dark video and the
  // top bar switches to its more opaque glass; the pill matches it so every
  // floating surface up there reads as one consistent piece of glass.
  const overDarkDock = useDashboard(s => s.activePage === 'lesson' && s.lessonScrolled)
  const activePage = useDashboard(s => s.activePage)
  const homeworkAnswered = useDashboard(s => s.homeworkWidgetFeedback?.answered ?? 0)
  // Pomodoro controls surfaced straight onto the collapsed pill (mini play).
  const pomoRunning = useDashboard(s => s.pomoRunning)
  const pomoStart = useDashboard(s => s.pomoStart)
  const pomoPause = useDashboard(s => s.pomoPause)
  const { lastAnswerAt } = useTrainerProgress()
  const saveStudentTrainerStats = useTeacher(s => s.saveStudentTrainerStats)
  const [trainerWaveActive, setTrainerWaveActive] = useState(false)
  const [[idx, dir], setIdx] = useState<[number, number]>([0, 0])
  const [expanded, setExpanded] = useState(false)
  const [dotsVisible, setDotsVisible] = useState(false)
  const [hovering, setHovering] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Once expanded, the pill folds itself back to the mini capsule after a few
  // idle seconds. Any interaction (hover move / tap) restarts the countdown.
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  // Tracks whether the last pointer interaction was a drag. A swipe ends with
  // both `dragEnd` and a synthetic `click`; without this flag the pill would
  // expand every time the user swipes through widgets.
  const draggedRef = useRef(false)

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current) }, [])

  // Trainer idle detection: wave is active for 40s after the last answer
  useEffect(() => {
    if (lastAnswerAt === 0) { setTrainerWaveActive(false); return }
    setTrainerWaveActive(Date.now() - lastAnswerAt < 40000)
    const iv = setInterval(() => {
      setTrainerWaveActive(Date.now() - lastAnswerAt < 40000)
    }, 1000)
    return () => clearInterval(iv)
  }, [lastAnswerAt])

  // When a homework answer lands and the pill is not already showing the Stats
  // (homework feedback) widget, snap back to it automatically.
  const prevAnsweredRef = useRef(homeworkAnswered)
  useEffect(() => {
    if (activePage === 'homework' && homeworkAnswered > prevAnsweredRef.current) {
      const statsPos = widgetOrder.indexOf(0)
      if (statsPos >= 0 && statsPos !== idx) {
        setIdx([statsPos, statsPos > idx ? 1 : -1])
      }
    }
    prevAnsweredRef.current = homeworkAnswered
  }, [homeworkAnswered, activePage, widgetOrder, idx])

  // When entering the trainer page (including initial load), snap to widget 7.
  // When leaving the trainer page, persist the session stats to teacherStore.
  const prevPageRef = useRef<string | null>(null)
  useEffect(() => {
    if (activePage === 'trainer' && prevPageRef.current !== 'trainer') {
      const pos = widgetOrder.indexOf(7)
      if (pos >= 0) setIdx([pos, pos > idx ? 1 : -1])
    }
    if (prevPageRef.current === 'trainer' && activePage !== 'trainer') {
      const { doneCount, wrongCount, totalCount, favCount, todayCorrect, todayWrong, subject } = useTrainerProgress.getState()
      saveStudentTrainerStats({ doneCount, wrongCount, totalCount, favCount, todayCorrect, todayWrong, subject })
    }
    prevPageRef.current = activePage
  }, [activePage, widgetOrder, idx, saveStudentTrainerStats])

  useEffect(() => {
    if (!expanded) return

    const onPointerDown = (event: PointerEvent) => {
      const root = rootRef.current
      if (!root) return
      if (root.contains(event.target as Node)) return
      setExpanded(false)
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [expanded])

  // (Re)arm the idle auto-collapse. No-op while collapsed.
  const AUTO_COLLAPSE_MS = 5000
  const bumpCollapse = () => {
    if (!expanded) return
    if (collapseTimer.current) clearTimeout(collapseTimer.current)
    collapseTimer.current = setTimeout(() => setExpanded(false), AUTO_COLLAPSE_MS)
  }

  // Start the countdown the moment the pill opens; clear it on collapse/unmount.
  useEffect(() => {
    if (!expanded) {
      if (collapseTimer.current) clearTimeout(collapseTimer.current)
      return
    }
    bumpCollapse()
    return () => { if (collapseTimer.current) clearTimeout(collapseTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded])

  const revealDots = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setDotsVisible(true)
  }
  const scheduleHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setDotsVisible(false), 1100)
  }

  if (widgetOrder.length === 0) return null

  const total = widgetOrder.length
  const widgetId = widgetOrder[idx] ?? 0
  const accent = META[widgetId]?.accent ?? 'var(--color-accent)'
  // The Pomodoro widget gets a bare play/pause glyph on the right of the mini
  // capsule so the timer can be started without expanding the pill first.
  const showMiniPlay = !expanded && widgetId === 3

  // ── Live notifications: take over the pill, then auto-expire ──────────────
  const notifications = useNotificationsStore(s => s.notifications)
  const dismissLive   = useNotificationsStore(s => s.dismissLive)
  const markRead      = useNotificationsStore(s => s.markRead)
  const live   = notifications.filter(n => n.live)
  const latest = live[0]
  const [showNotif, setShowNotif] = useState(false)
  const notifTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevLiveLen = useRef(0)
  const notifActive = showNotif && !!latest

  useEffect(() => {
    if (live.length > prevLiveLen.current) setShowNotif(true)
    if (live.length === 0) setShowNotif(false)
    prevLiveLen.current = live.length
  }, [live.length])

  const clearLive = () => { live.forEach(n => { dismissLive(n.id); markRead(n.id) }) }

  useEffect(() => {
    if (!notifActive) return
    notifTimer.current = setTimeout(() => { clearLive(); setShowNotif(false) }, 30_000)
    return () => { if (notifTimer.current) clearTimeout(notifTimer.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifActive, live.length])

  const dismissNotif = () => { clearLive(); setShowNotif(false) }
  const handleNotifAction = () => {
    const page = latest?.action?.page
    dismissNotif()
    if (page) window.location.hash = page.startsWith('#') ? page : `#/${page}`
  }

  const goTo = (next: number, direction: number) => {
    if (expanded) return // expanded mode: swipes / arrows do NOT change widget
    const wrapped = ((next % total) + total) % total
    if (wrapped === idx) return
    setIdx([wrapped, direction])
    revealDots()
    scheduleHide()
  }

  const onDragEnd = (_e: unknown, info: PanInfo) => {
    if (expanded) return
    const swipe = info.offset.x + info.velocity.x * 120
    const moved = Math.abs(info.offset.x) > 4
    if (moved) {
      draggedRef.current = true
      // Reset just after this turn's synthetic click would have fired.
      setTimeout(() => { draggedRef.current = false }, 0)
    }
    if (swipe < -60) goTo(idx + 1, 1)
    else if (swipe > 60) goTo(idx - 1, -1)
    scheduleHide()
  }

  const handleClick = () => {
    if (draggedRef.current) return
    setExpanded(e => {
      // Sound + vibro on every opening (and on collapse too — same tick).
      tactile()
      return !e
    })
  }

  // Measure the natural height of the expanded content so the pill grows to
  // fit the actual text (instead of a hard-coded 180px that could clip long
  // memes or leave dead space on short facts). We measure off the same
  // PillContent node we render, just hidden in a clone wouldn't be needed —
  // ResizeObserver on the live content tracks both expand-state changes and
  // any text reflow from rotating widgets.
  const measureRef = useRef<HTMLDivElement>(null)
  const [expandedH, setExpandedH] = useState(COLLAPSED_H * 3)
  useLayoutEffect(() => {
    const el = measureRef.current
    if (!el) return
    const update = () => {
      // scrollHeight reflects the natural laid-out height regardless of the
      // outer animated height clipping the view.
      const h = el.scrollHeight
      if (h > 0) setExpandedH(h)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [widgetId, expanded, notifActive])

  return (
    <motion.div
      ref={rootRef}
      data-widget-pill
      onClick={notifActive ? handleNotifAction : handleClick}
      // Capture phase so interactions still reset the idle timer even when an
      // inner control stops propagation; mousemove keeps it alive on hover.
      onPointerDownCapture={bumpCollapse}
      onMouseMove={bumpCollapse}
      onMouseEnter={() => { setHovering(true); revealDots() }}
      onMouseLeave={() => { setHovering(false); scheduleHide() }}
      // Explicit, measured height — no `layout` here. The wrapper around
      // <CompactWidgetPill /> already owns the layoutId morph for the
      // home→courses transition; running `layout` simultaneously inside
      // the pill made framer re-project the pill's box against the (old,
      // huge) WidgetCarousel bounds, which is what caused the jitter on
      // expand/collapse.
      animate={{ height: (expanded || notifActive) ? expandedH : COLLAPSED_H, borderRadius: (expanded || notifActive) ? 26 : 30 }}
      transition={MORPH}
      style={{
        position: 'relative',
        width: PILL_WIDTH,
        cursor: 'pointer',
        // Expanded: white at top fading into a frosted-glass bottom (backdrop
        // blur is what gives the lower portion its "стекло" quality — the
        // gradient just lets the background bleed through more toward the
        // bottom edge). Collapsed: solid white pill.
        // Over the dark lesson dock the pill switches to the compact top bar's
        // more opaque recipe (same opacity / border / shadow); elsewhere it
        // keeps the lighter glass that mirrors the bar's non-compact state.
        background: overDarkDock ? 'rgba(var(--glass-rgb), 0.92)' : 'rgba(var(--glass-rgb), 0.72)',
        backdropFilter: 'blur(14px) saturate(180%)',
        WebkitBackdropFilter: 'blur(14px) saturate(180%)',
        border: overDarkDock ? '1px solid var(--color-border-glass)' : '1px solid var(--color-border-glass)',
        boxShadow: overDarkDock
          ? 'var(--shadow-lg)'
          : 'var(--shadow-pill)',
        overflow: 'hidden',
        boxSizing: 'border-box',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Measurement layer — its natural height (driven by PillContent's
          actual flow) is what we animate the outer pill to. */}
      <div ref={measureRef} style={{ width: '100%', position: 'relative' }}>
        {/* Hidden sizer keeps the pill height driven by real content while the
            visible layer uses absolutely-positioned slides for true carousel motion. */}
        <div style={{ visibility: 'hidden', pointerEvents: 'none' }}>
          {notifActive
            ? <StudentNotifPreview latest={latest} extra={live.length - 1} onAction={() => {}} onClose={() => {}} />
            : <PreviewById widgetId={widgetId} expanded={expanded} />}
        </div>

        {/* Swipeable layer — drag only enabled when collapsed. */}
        <motion.div
          drag={(expanded || notifActive) ? false : 'x'}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragStart={revealDots}
          onDragEnd={onDragEnd}
          style={{ position: 'absolute', inset: 0, width: '100%', overflow: 'hidden' }}
        >
          <AnimatePresence custom={dir} initial={false}>
            <motion.div
              key={notifActive ? 'notif' : widgetId}
              custom={dir}
              variants={swipeVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ x: { type: 'spring', stiffness: 520, damping: 38 }, opacity: { duration: 0.14, ease: 'easeOut' } }}
              style={{ position: 'absolute', inset: 0, width: '100%' }}
            >
              {notifActive
                ? <StudentNotifPreview latest={latest} extra={live.length - 1} onAction={handleNotifAction} onClose={dismissNotif} />
                : <PreviewById widgetId={widgetId} expanded={expanded} />}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Hover chevrons — give users a deterministic way to flip widgets when
          they don't want to risk a swipe that gets interpreted as a tap. Only
          shown while the pill is collapsed and the pointer is over it. */}
      {!expanded && !notifActive && total > 1 && (
        <>
          <button
            type="button"
            aria-label="Предыдущий виджет"
            onClick={e => { e.stopPropagation(); goTo(idx - 1, -1) }}
            style={{
              position: 'absolute',
              left: 4,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(var(--glass-rgb), 0.85)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-2)',
              cursor: 'pointer',
              opacity: hovering ? 1 : 0,
              transition: 'opacity 0.18s ease',
              pointerEvents: hovering ? 'auto' : 'none',
            }}
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            aria-label="Следующий виджет"
            onClick={e => { e.stopPropagation(); goTo(idx + 1, 1) }}
            style={{
              position: 'absolute',
              // Chevron stays pinned to the right edge; the mini play glyph sits
              // to its left (see below), so this no longer shifts for Pomodoro.
              right: 4,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(var(--glass-rgb), 0.85)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-2)',
              cursor: 'pointer',
              opacity: hovering ? 1 : 0,
              transition: 'opacity 0.18s ease',
              pointerEvents: hovering ? 'auto' : 'none',
            }}
          >
            <ChevronRight size={14} />
          </button>
        </>
      )}

      {/* Bare play/pause for the Pomodoro mini capsule — no circle, just the
          glyph, sitting at the right edge so it never collides with the
          left/right nav chevrons. */}
      {showMiniPlay && (
        <button
          type="button"
          aria-label={pomoRunning ? 'Пауза' : 'Старт'}
          onClick={e => { e.stopPropagation(); tactile(); pomoRunning ? pomoPause() : pomoStart() }}
          style={{
            position: 'absolute',
            right: 32,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 24,
            height: 24,
            padding: 0,
            border: 'none',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: accent,
            cursor: 'pointer',
          }}
        >
          {pomoRunning ? <Pause size={20} fill={accent} /> : <Play size={20} fill={accent} />}
        </button>
      )}


      {/* Organic wave strip — trainer widget only, active while answering */}
      <AnimatePresence>
        {widgetId === 7 && trainerWaveActive && (
          <motion.div
            key="trainer-wave"
            initial={{ height: 0 }}
            animate={{ height: 10 }}
            exit={{ height: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              overflow: 'hidden', borderRadius: '0 0 30px 30px',
              pointerEvents: 'none',
            }}
          >
            {/* Green wave */}
            <motion.svg viewBox="0 0 320 10" preserveAspectRatio="none"
              style={{ position: 'absolute', bottom: 0, width: '100%', height: '100%' }}>
              <motion.path
                animate={{
                  d: [
                    'M0,7 C60,1 130,10 200,5 C260,1 295,8 320,6 L320,10 L0,10 Z',
                    'M0,4 C70,9 140,2 210,8 C270,11 300,4 320,7 L320,10 L0,10 Z',
                    'M0,8 C50,3 120,10 190,4 C255,0 290,9 320,5 L320,10 L0,10 Z',
                    'M0,7 C60,1 130,10 200,5 C260,1 295,8 320,6 L320,10 L0,10 Z',
                  ],
                  opacity: [0.85, 0.45, 0.9, 0.85],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                fill="#34C877"
              />
            </motion.svg>
            {/* Orange wave */}
            <motion.svg viewBox="0 0 320 10" preserveAspectRatio="none"
              style={{ position: 'absolute', bottom: 0, width: '100%', height: '100%' }}>
              <motion.path
                animate={{
                  d: [
                    'M0,9 C80,3 150,8 220,2 C275,0 305,7 320,4 L320,10 L0,10 Z',
                    'M0,3 C90,8 160,3 230,9 C280,12 305,5 320,8 L320,10 L0,10 Z',
                    'M0,6 C70,1 145,9 215,4 C270,0 300,8 320,3 L320,10 L0,10 Z',
                    'M0,9 C80,3 150,8 220,2 C275,0 305,7 320,4 L320,10 L0,10 Z',
                  ],
                  opacity: [0.5, 0.85, 0.35, 0.5],
                }}
                transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
                fill="#F0A030"
              />
            </motion.svg>
            {/* Red wave */}
            <motion.svg viewBox="0 0 320 10" preserveAspectRatio="none"
              style={{ position: 'absolute', bottom: 0, width: '100%', height: '100%' }}>
              <motion.path
                animate={{
                  d: [
                    'M0,5 C65,10 140,3 205,8 C260,12 300,4 320,9 L320,10 L0,10 Z',
                    'M0,9 C75,4 145,10 210,3 C265,0 295,8 320,5 L320,10 L0,10 Z',
                    'M0,3 C85,8 150,2 220,9 C270,13 305,5 320,7 L320,10 L0,10 Z',
                    'M0,5 C65,10 140,3 205,8 C260,12 300,4 320,9 L320,10 L0,10 Z',
                  ],
                  opacity: [0.6, 0.25, 0.75, 0.6],
                }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2.5 }}
                fill="#F04858"
              />
            </motion.svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Purple wave strip — stopwatch/timer when running */}
      <AnimatePresence>
        {widgetId === 3 && pomoRunning && (
          <motion.div
            key="pomo-wave"
            initial={{ height: 0 }}
            animate={{ height: 10 }}
            exit={{ height: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              overflow: 'hidden', borderRadius: '0 0 30px 30px',
              pointerEvents: 'none',
            }}
          >
            {/* Light violet wave */}
            <motion.svg viewBox="0 0 320 10" preserveAspectRatio="none"
              style={{ position: 'absolute', bottom: 0, width: '100%', height: '100%' }}>
              <motion.path
                animate={{
                  d: [
                    'M0,6 C65,1 135,10 205,4 C265,0 300,8 320,5 L320,10 L0,10 Z',
                    'M0,3 C70,9 140,2 210,8 C268,12 298,4 320,7 L320,10 L0,10 Z',
                    'M0,8 C55,2 125,10 195,3 C258,0 292,9 320,4 L320,10 L0,10 Z',
                    'M0,6 C65,1 135,10 205,4 C265,0 300,8 320,5 L320,10 L0,10 Z',
                  ],
                  opacity: [0.9, 0.45, 0.85, 0.9],
                }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                fill="#C4B5FD"
              />
            </motion.svg>
            {/* Mid purple wave */}
            <motion.svg viewBox="0 0 320 10" preserveAspectRatio="none"
              style={{ position: 'absolute', bottom: 0, width: '100%', height: '100%' }}>
              <motion.path
                animate={{
                  d: [
                    'M0,9 C75,2 150,9 220,3 C272,0 302,7 320,4 L320,10 L0,10 Z',
                    'M0,4 C85,10 155,3 225,9 C278,13 305,5 320,8 L320,10 L0,10 Z',
                    'M0,7 C65,1 140,9 210,4 C268,0 298,8 320,3 L320,10 L0,10 Z',
                    'M0,9 C75,2 150,9 220,3 C272,0 302,7 320,4 L320,10 L0,10 Z',
                  ],
                  opacity: [0.55, 0.9, 0.35, 0.55],
                }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1.4 }}
                fill="#7C3AED"
              />
            </motion.svg>
            {/* Deep indigo wave */}
            <motion.svg viewBox="0 0 320 10" preserveAspectRatio="none"
              style={{ position: 'absolute', bottom: 0, width: '100%', height: '100%' }}>
              <motion.path
                animate={{
                  d: [
                    'M0,4 C60,10 135,2 200,8 C258,13 295,4 320,9 L320,10 L0,10 Z',
                    'M0,8 C70,3 140,9 208,2 C262,0 292,8 320,4 L320,10 L0,10 Z',
                    'M0,2 C80,8 148,2 218,9 C268,13 300,5 320,7 L320,10 L0,10 Z',
                    'M0,4 C60,10 135,2 200,8 C258,13 295,4 320,9 L320,10 L0,10 Z',
                  ],
                  opacity: [0.65, 0.3, 0.8, 0.65],
                }}
                transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut', delay: 2.8 }}
                fill="#4C1D95"
              />
            </motion.svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live-notification 30 s drain bar */}
      {notifActive && (
        <motion.div
          key={`drain-${live.length}`}
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: 30, ease: 'linear' }}
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, height: 2,
            background: `${sNotifColor(latest.type)}80`, transformOrigin: 'left',
          }}
        />
      )}

      {/* Dots — only meaningful while collapsed (swipe navigates between widgets). */}
      {!expanded && !notifActive && (
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5"
          style={{
            bottom: 4,
            opacity: dotsVisible ? 1 : 0,
            transition: 'opacity 0.25s ease',
          }}
        >
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              style={{
                width: i === idx ? 14 : 4,
                height: 4,
                borderRadius: 999,
                background: i === idx ? accent : 'var(--color-text-4)',
                transition: 'width 0.3s ease, background 0.3s ease',
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}
