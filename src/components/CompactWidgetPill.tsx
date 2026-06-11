import { motion, AnimatePresence, type PanInfo } from 'framer-motion'
import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { Play, Pause, ChevronLeft, ChevronRight, RotateCcw, Timer, Watch } from 'lucide-react'
import {
  scienceFactInterval,
  scienceMemeInterval,
  courseReactionInterval,
} from '../data/mockData'
import { useDashboard } from '../store/dashboardStore'
import { useStudentData } from '../store/studentDataStore'
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
  0: { kicker: 'Сегодня', accent: '#7B3FCC' },
  1: { kicker: 'Научный факт', accent: '#2D6BE0' },
  2: { kicker: 'Реакция курса', accent: '#1E9E63' },
  3: { kicker: 'Фокус', accent: '#7B61FF' },
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
              ? 'linear-gradient(135deg, #6EE7A0, #2A7D4F)'
              : 'linear-gradient(135deg, #F48B91, #A8282D)',
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
                color: pct >= 60 ? '#2A7D4F' : '#A8282D',
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
                    ? 'linear-gradient(90deg, #6EE7A0, #3FCC8A)'
                    : 'linear-gradient(90deg, #F48B91, #F06070)',
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
        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #B98BFF, #6B3FD6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20 }}>
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

const POMO_ACCENT = '#7B61FF'
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
      <div style={{ display: 'flex', alignSelf: 'flex-start', background: 'var(--color-bg-3)', borderRadius: 999, padding: 3 }}>
        {([['timer', 'Таймер'], ['stopwatch', 'Секундомер']] as const).map(([mode, label]) => {
          const active = pomoTimerMode === mode
          return (
            <button
              key={mode}
              onClick={e => { stop(e); pomoSetTimerMode(mode) }}
              style={{
                fontSize: 11.5, fontWeight: 650, lineHeight: 1, padding: '5px 12px', borderRadius: 999,
                border: 'none', cursor: 'pointer',
                color: active ? 'var(--color-text)' : '#9A9AA0',
                background: active ? '#FFFFFF' : 'transparent',
                boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'color 0.2s, background 0.2s',
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
              : 'linear-gradient(135deg, #CDB8FF, #9A7BFF)',
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
      avatar={<div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #F0A83F, #C58BFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20 }}>😄</div>}
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
            background: 'linear-gradient(135deg, #5AD4C5, #14A695)',
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

// Single shared spring so the avatar, padding, height, width, and text
// gap all glide to the new size in lockstep instead of each running its own
// timing curve (which was the source of the visible "jitter" on collapse).
const MORPH = { type: 'spring' as const, stiffness: 360, damping: 32, mass: 0.7 }

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

function PreviewById({ widgetId, expanded }: { widgetId: number; expanded: boolean }) {
  const paused = false

  switch (widgetId) {
    case 0: return <StatsPreview expanded={expanded} />
    case 1: return <ScienceFactPreview expanded={expanded} paused={paused} />
    case 2: return <ReactionPreview expanded={expanded} paused={paused} />
    case 3: return <PomoPreview expanded={expanded} />
    case 4: return <MemePreview expanded={expanded} paused={paused} />
    case 5: return <QuestionOfDayPreview expanded={expanded} />
    case 6: return (
      <PillContent
        avatar={
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #C79BFF, #7B3FCC)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20 }}>
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
  const accent = META[widgetId]?.accent ?? '#7B61FF'
  // The Pomodoro widget gets a bare play/pause glyph on the right of the mini
  // capsule so the timer can be started without expanding the pill first.
  const showMiniPlay = !expanded && widgetId === 3

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
  }, [widgetId, expanded])

  return (
    <motion.div
      ref={rootRef}
      onClick={handleClick}
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
      animate={{ height: expanded ? expandedH : COLLAPSED_H }}
      transition={MORPH}
      style={{
        position: 'relative',
        width: PILL_WIDTH,
        // Same corner radius in both states — at collapsed height (60) the
        // 30px radius reads as a full capsule (= height / 2), and at the
        // taller expanded heights the same value reads as a soft rounded
        // card. The shape feels continuous between modes; only the bottom
        // detail text fades in/out beneath the unchanged mini layout.
        borderRadius: 30,
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
          ? 'inset 0 1px 0 rgba(255,255,255,0.07), 0 8px 28px rgba(21,18,31,0.26), 0 2px 8px rgba(21,18,31,0.10)'
          : 'inset 0 1px 0 rgba(255,255,255,0.07), 0 6px 24px rgba(21,18,31,0.22), 0 2px 6px rgba(21,18,31,0.08)',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Measurement layer — its natural height (driven by PillContent's
          actual flow) is what we animate the outer pill to. */}
      <div ref={measureRef} style={{ width: '100%', position: 'relative' }}>
        {/* Hidden sizer keeps the pill height driven by real content while the
            visible layer uses absolutely-positioned slides for true carousel motion. */}
        <div style={{ visibility: 'hidden', pointerEvents: 'none' }}>
          <PreviewById widgetId={widgetId} expanded={expanded} />
        </div>

        {/* Swipeable layer — drag only enabled when collapsed. */}
        <motion.div
          drag={expanded ? false : 'x'}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragStart={revealDots}
          onDragEnd={onDragEnd}
          style={{ position: 'absolute', inset: 0, width: '100%', overflow: 'hidden' }}
        >
          <AnimatePresence custom={dir} initial={false}>
            <motion.div
              key={widgetId}
              custom={dir}
              variants={swipeVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ x: { type: 'spring', stiffness: 520, damping: 38 }, opacity: { duration: 0.14, ease: 'easeOut' } }}
              style={{ position: 'absolute', inset: 0, width: '100%' }}
            >
              <PreviewById widgetId={widgetId} expanded={expanded} />
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Hover chevrons — give users a deterministic way to flip widgets when
          they don't want to risk a swipe that gets interpreted as a tap. Only
          shown while the pill is collapsed and the pointer is over it. */}
      {!expanded && total > 1 && (
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

      {/* Dots — only meaningful while collapsed (swipe navigates between widgets). */}
      {!expanded && (
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
                background: i === idx ? accent : '#CFCFD4',
                transition: 'width 0.3s ease, background 0.3s ease',
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}
