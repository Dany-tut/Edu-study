import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import {
  CheckCircle2, ChevronLeft, CircleAlert, Clock, GraduationCap,
  Lock, Send, Sparkles, Trophy, Image as ImageIcon, PenLine, X,
  ChevronUp, ChevronDown,
} from 'lucide-react'
import type { LessonHomework, HomeworkQuizQuestion } from '../data/lessonContent'
import { normalizeTaskType } from '../data/taskTypeVisuals'
import { PURPLE, subjectTheme } from '../lib/theme'
import { useTheme } from '../store/themeStore'
import { supabase } from '../lib/supabase'
import { getStudentSession } from '../lib/studentSession'
import type {
  HardTaskDef, HardTaskStudentBlock, HardTaskReviewBlock, HardSolution, HardAttachmentsNew, HardReviewNew,
} from '../lib/useHomework'
import { isNewHard, hardId, studentSolutions, legacyHardToBlocks, LEGACY_HARD_KEY } from '../lib/useHomework'
import { optimizePhoto } from '../lib/imageOptim'
import HardConversation, { type HardTabVM } from './teacher/HardConversation'
import { playUnlock, playPop, vibrate } from '../lib/sound'
import { useDashboard } from '../store/dashboardStore'
import { useStudentData, ownerStudentIdFor } from '../store/studentDataStore'
import { useIsDesktop } from '../lib/useIsDesktop'
import HardStarLottie from './HardStarLottie'
import PartyPopperLottie from './PartyPopperLottie'

// ─── Emoji self-assessment ────────────────────────────────────────────────

export const EMOJI_STEPS = [
  { emoji: '😞', label: 'Совсем непонятно' },
  { emoji: '😕', label: 'Многое неясно' },
  { emoji: '😐', label: 'Кое-что усвоил' },
  { emoji: '🙂', label: 'Понял хорошо' },
  { emoji: '🤩', label: 'Всё чётко!' },
]

function playSliderTick() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(180, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.06)
    gain.gain.setValueAtTime(0.18, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.07)
    osc.onended = () => ctx.close()
  } catch {}
}

function EmojiSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const step = EMOJI_STEPS[value]
  const prevValue = React.useRef(value)
  const controls = useAnimationControls()

  function handleChange(v: number) {
    if (v !== prevValue.current) {
      playSliderTick()
      prevValue.current = v
      controls.start({
        scaleX: [1, 1.03, 0.982, 1.012, 1],
        scaleY: [1, 0.97, 1.018, 0.988, 1],
        transition: { duration: 0.4, ease: 'easeOut' },
      })
    }
    onChange(v)
  }

  return (
    <motion.div
      animate={controls}
      style={{ display: 'flex', flexDirection: 'column', gap: 14, transformOrigin: 'center center' }}
    >
      {/* Big emoji */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <motion.div
          key={value}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          style={{ fontSize: 56, lineHeight: 1, userSelect: 'none' }}
        >
          {step.emoji}
        </motion.div>
        <motion.p
          key={step.label}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', textAlign: 'center' }}
        >
          {step.label}
        </motion.p>
      </div>

      {/* Labels row */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--color-muted)', fontWeight: 600 }}>Сложно</span>
        <span style={{ fontSize: 11, color: 'var(--color-muted)', fontWeight: 600 }}>Легко</span>
      </div>

      {/* Slider track */}
      <div style={{ position: 'relative', height: 40, display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: 6, borderRadius: 999, background: 'var(--color-bg-5)' }} />
        <div style={{
          position: 'absolute', left: 0, height: 6, borderRadius: 999,
          width: `${(value / (EMOJI_STEPS.length - 1)) * 100}%`,
          background: 'var(--grad-purple-bar)',
          transition: 'width 0.16s ease',
        }} />
        {EMOJI_STEPS.map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${(i / (EMOJI_STEPS.length - 1)) * 100}%`,
            transform: 'translateX(-50%)',
            width: i === value ? 0 : 7, height: i === value ? 0 : 7,
            borderRadius: '50%',
            background: i <= value ? 'var(--color-purple)' : 'var(--color-text-4)',
            transition: 'all 0.14s ease',
            pointerEvents: 'none',
          }} />
        ))}
        <input
          type="range" min={0} max={EMOJI_STEPS.length - 1} step={1} value={value}
          onChange={e => handleChange(Number(e.target.value))}
          style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', margin: 0, padding: 0 }}
        />
        <div style={{
          position: 'absolute',
          left: `${(value / (EMOJI_STEPS.length - 1)) * 100}%`,
          transform: 'translateX(-50%)',
          width: 26, height: 26, borderRadius: '50%',
          background: 'var(--grad-purple)',
          border: '3px solid var(--color-bg)',
          boxShadow: '0 2px 12px rgba(99,84,207,0.45)',
          transition: 'left 0.16s ease',
          pointerEvents: 'none',
        }} />
      </div>

      {/* Quick-tap emoji row */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {EMOJI_STEPS.map((s, i) => (
          <button key={i} onClick={() => handleChange(i)} style={{
            fontSize: i === value ? 20 : 15,
            background: 'none', border: 'none', cursor: 'pointer',
            transition: 'all 0.14s ease',
            transform: i === value ? 'translateY(-3px)' : 'none',
            opacity: Math.abs(i - value) > 1 ? 0.3 : 1,
            padding: '2px 4px',
          }}>
            {s.emoji}
          </button>
        ))}
      </div>
    </motion.div>
  )
}

// ─── Result modal (light theme) ────────────────────────────────────────────

function playVictorySound() {
  try {
    const ac = new AudioContext()
    // Ascending fanfare: C5 E5 G5 C6, then a sustained chord
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((freq, i) => {
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.connect(gain)
      gain.connect(ac.destination)
      osc.type = i === notes.length - 1 ? 'sine' : 'triangle'
      osc.frequency.value = freq
      const t0 = ac.currentTime + i * 0.13
      gain.gain.setValueAtTime(0, t0)
      gain.gain.linearRampToValueAtTime(0.22, t0 + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + (i === notes.length - 1 ? 0.9 : 0.28))
      osc.start(t0)
      osc.stop(t0 + 1.2)
    })
    // Shimmer: a quick high tinkle
    const shimmer = ac.createOscillator()
    const sGain = ac.createGain()
    shimmer.connect(sGain)
    sGain.connect(ac.destination)
    shimmer.type = 'sine'
    shimmer.frequency.setValueAtTime(2093, ac.currentTime + 0.42)
    shimmer.frequency.linearRampToValueAtTime(2637, ac.currentTime + 0.55)
    sGain.gain.setValueAtTime(0, ac.currentTime + 0.42)
    sGain.gain.linearRampToValueAtTime(0.12, ac.currentTime + 0.44)
    sGain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.75)
    shimmer.start(ac.currentTime + 0.42)
    shimmer.stop(ac.currentTime + 0.8)
  } catch {
    // AudioContext not available
  }
}

function ConfettiCanvas({ active, bannerRef }: { active: boolean; bannerRef: React.RefObject<HTMLDivElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = window.innerWidth
    const H = window.innerHeight
    canvas.width = W
    canvas.height = H

    // Origin: bottom edge of the purple banner, spread across its width
    const rect = bannerRef.current?.getBoundingClientRect()
    const originY = rect ? rect.bottom : H * 0.45
    const originXMin = rect ? rect.left + rect.width * 0.1 : W * 0.2
    const originXMax = rect ? rect.right - rect.width * 0.1 : W * 0.8

    playVictorySound()

    const COLORS = ['var(--color-accent)', '#B98BFF', '#3FCC8A', '#F8A000', '#F06070', '#5AD4C5', '#FFD700', '#FF6B9D']
    type Piece = {
      x: number; y: number; vx: number; vy: number
      w: number; h: number; angle: number; spin: number
      color: string; shape: 'rect' | 'circle'
    }
    const pieces: Piece[] = Array.from({ length: 160 }, () => ({
      x: originXMin + Math.random() * (originXMax - originXMin),
      y: originY,
      // Burst mostly upward, fan out sideways
      vx: (Math.random() - 0.5) * 22,
      vy: -(9 + Math.random() * 16),
      w: 6 + Math.random() * 9,
      h: 4 + Math.random() * 6,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.28,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: Math.random() > 0.38 ? 'rect' : 'circle',
    }))

    const startTime = performance.now()
    const DURATION = 4000

    function tick(now: number) {
      const t = Math.min((now - startTime) / DURATION, 1)
      ctx!.clearRect(0, 0, W, H)
      for (const p of pieces) {
        p.x += p.vx
        p.vx *= 0.985          // air drag
        p.vy += 0.45           // gravity
        p.y += p.vy
        p.angle += p.spin
        const alpha = t > 0.65 ? 1 - (t - 0.65) / 0.35 : 1
        ctx!.globalAlpha = alpha
        ctx!.fillStyle = p.color
        ctx!.save()
        ctx!.translate(p.x, p.y)
        ctx!.rotate(p.angle)
        if (p.shape === 'circle') {
          ctx!.beginPath()
          ctx!.ellipse(0, 0, p.w / 2, p.h / 2, 0, 0, Math.PI * 2)
          ctx!.fill()
        } else {
          ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        }
        ctx!.restore()
      }
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        ctx!.clearRect(0, 0, W, H)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [active, bannerRef])

  if (!active) return null
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0,
        width: '100vw', height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  )
}

function ResultModal({
  context,
  score,
  recommendationScore,
  showHard = true,
  onContinue,
}: {
  context: 'basic' | 'hard'
  score?: number
  recommendationScore?: number
  showHard?: boolean
  onContinue: (emojiIndex: number, goToHard?: boolean) => void
}) {
  const [emojiValue, setEmojiValue] = useState(() =>
    score !== undefined ? Math.round((score / 100) * (EMOJI_STEPS.length - 1)) : 2
  )
  const bannerRef = useRef<HTMLDivElement>(null)
  // «passed» открывает CTA к харду. Если хард-уровня нет (showHard=false), даже
  // отличный балс базы не показывает переход к харду — обычная кнопка «Продолжить».
  const passed = showHard && context === 'basic' && score !== undefined && recommendationScore !== undefined
    ? score >= recommendationScore
    : null

  return (
    <>
      <ConfettiCanvas active={!!passed} bannerRef={bannerRef} />
    <motion.div
      key="result-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(11,11,18,0.48)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        padding: 20,
      }}
    >
      <motion.div
        initial={{ scale: 0.88, opacity: 0, y: 28 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 16 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        style={{
          width: '100%', maxWidth: 480,
          borderRadius: 36,
          background: 'var(--color-bg-input)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Colored top banner */}
        <div ref={bannerRef} style={{
          padding: '28px 28px 24px',
          background: context === 'hard'
            ? 'var(--color-green-soft)'
            : passed
              ? 'var(--color-purple-soft)'
              : 'var(--color-yellow-soft)',
          display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 16,
        }}>
          {passed ? (
            <div style={{ flexShrink: 0, marginTop: -6, marginBottom: -6 }}>
              <PartyPopperLottie size={66} />
            </div>
          ) : (
            <div style={{
              width: 54, height: 54, borderRadius: 18, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: context === 'hard'
                ? 'rgba(42,125,79,0.14)'
                : 'rgba(248,160,0,0.14)',
              color: context === 'hard' ? 'var(--color-green-text)' : 'var(--color-yellow-text)',
            }}>
              {context === 'hard' ? <Send size={24} /> : <CircleAlert size={24} />}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: 12, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase',
              color: context === 'hard' ? 'var(--color-green-text)' : passed ? 'var(--color-accent)' : 'var(--color-yellow-text)',
              marginBottom: 6,
            }}>
              {context === 'hard' ? 'Работа отправлена' : 'Тест сдан'}
            </p>
            <h2 style={{ fontSize: 22, fontWeight: 760, color: 'var(--color-text)', lineHeight: 1.18, marginBottom: 8 }}>
              {context === 'hard'
                ? 'Отправлено на проверку!'
                : passed
                  ? `Отлично, ${score} из 100!`
                  : `Пока ${score} из 100 баллов`
              }
            </h2>
            {!(passed && context === 'basic') && (
              <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--color-text-2)' }}>
                {context === 'hard'
                  ? 'Преподаватель посмотрит твою работу и даст обратную связь. Обычно это занимает до 24 часов.'
                  : `До открытия сложного уровня нужно ${recommendationScore}+. Можно вернуться к конспекту и попробовать снова.`
                }
              </p>
            )}
          </div>
          {context === 'basic' && score !== undefined && (
            <div style={{ flexShrink: 0, textAlign: 'right' }}>
              <span style={{
                fontSize: 42, fontWeight: 760, lineHeight: 1,
                color: passed ? 'var(--color-accent)' : 'var(--color-yellow-text)',
              }}>{score}</span>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', marginTop: 2 }}>баллов</p>
            </div>
          )}
          {passed && context === 'basic' && (
            <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--color-text-2)', width: '100%', marginTop: -8 }}>
              База закрыта уверенно. Открылся необязательный хард-уровень с разбором от преподавателя.
            </p>
          )}
        </div>

        {/* Emoji assessment section */}
        <div style={{ padding: '24px 28px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 760, color: 'var(--color-text)', marginBottom: 4 }}>
              Оставь свою оценку
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>
              Насколько понятным оказался материал? Это помогает нам улучшать уроки.
            </p>
          </div>

          <div style={{
            padding: '18px 20px',
            borderRadius: 22,
            background: 'var(--color-bg-3)',
            border: '1px solid var(--color-border-soft)',
          }}>
            <EmojiSlider value={emojiValue} onChange={setEmojiValue} />
          </div>

          {passed ? (
            <div style={{ display: 'flex', gap: 10 }}>
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onContinue(emojiValue, false)}
                style={{
                  flex: 1, padding: '15px 16px',
                  borderRadius: 18, border: '1px solid var(--color-border-medium)',
                  background: 'var(--color-bg-3)',
                  color: 'var(--color-text)', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Позже
              </motion.button>
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { playUnlock(); vibrate([12, 40, 18]); onContinue(emojiValue, true) }}
                style={{
                  flex: 2, padding: '15px 20px 15px 10px',
                  borderRadius: 18, border: 'none',
                  background: PURPLE.gradient,
                  color: '#fff', fontSize: 15, fontWeight: 750,
                  cursor: 'pointer',
                  boxShadow: '0 12px 32px rgba(99,84,207,0.32)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
                  overflow: 'visible',
                }}
              >
                <div style={{ flexShrink: 0 }}>
                  <HardStarLottie size={28} />
                </div>
                Приступить к харду
              </motion.button>
            </div>
          ) : (
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onContinue(emojiValue)}
              style={{
                width: '100%', padding: '15px 20px',
                borderRadius: 18, border: 'none',
                background: PURPLE.gradient,
                color: '#fff', fontSize: 15, fontWeight: 750,
                cursor: 'pointer',
                boxShadow: '0 12px 32px rgba(99,84,207,0.32)',
              }}
            >
              Продолжить
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
    </>
  )
}

type HomeworkLevelId = 'basic' | 'hard'

interface HomeworkFlowProps {
  lessonId: string
  lessonTitle: string
  subject: string
  homework: LessonHomework
  onBack: () => void
}

// Ответ ученика по одному сложному заданию (per-task).
interface HardTaskDraft {
  answer: string
  photos: string[]
  board: string | null
}

interface PersistedHomeworkState {
  selectedLevel: HomeworkLevelId
  basicAnswers: Record<string, string>
  hardDraft: string
  hardSubmitted: boolean
  hardFiles: string[]
  hardPhotos: string[]       // attached photos as data URLs (legacy single-essay)
  hardBoard: string | null   // whiteboard drawing as a PNG data URL (legacy)
  // Новый per-task формат: ответ + фото + доска по каждому заданию, ключ = HardTaskDef.key.
  hardTaskDrafts: Record<string, HardTaskDraft>
  basicSubmitted: boolean
  selfAssessmentValue: number | null
}

const emptyDraft = (): HardTaskDraft => ({ answer: '', photos: [], board: null })

// Сырая строка lesson_progress `${lessonId}-hard` — для миграции legacy одиночного
// харда в раунд-модель (см. legacyHardToBlocks).
type LegacyHardRow = {
  comment?: string | null
  attachments?: { photos?: string[]; board?: string | null; v?: number; tasks?: HardTaskStudentBlock[] } | null
  review_comment?: string | null
  review_attachments?: { photos?: string[]; board?: string | null; annotation?: { image: string; w: number; h: number } | null; v?: number; tasks?: HardTaskReviewBlock[] } | null
  status?: string | null
  updated_at?: string | null
}

const SPRING = { type: 'spring', stiffness: 240, damping: 26 } as const

const formatEstimatedTime = (minutes: number) => `~${minutes} мин`

function getStorageKey(lessonId: string) {
  return `student-dashboard:homework:${lessonId}`
}

// ─── Generalized basic-level grading ─────────────────────────────────────────
// The basic level historically held only auto-graded multiple-choice. Teacher-
// authored homework (course editor «Домашки» tab) can also carry text / fill /
// match / whiteboard tasks, so grading mirrors TestFlow: choice and text/fill
// auto-check, the rest are recorded for teacher review.
const normAnswer = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')
function qType(q: HomeworkQuizQuestion) { return normalizeTaskType(q.type ?? 'single') }
function questionIsChoice(q: HomeworkQuizQuestion) {
  const tp = qType(q)
  return !q.type || tp === 'single' || tp === 'multi'
}
function questionAnswered(q: HomeworkQuizQuestion, ans: string | undefined) {
  return questionIsChoice(q) ? !!ans : !!(ans && ans.trim())
}
function questionAutoGradable(q: HomeworkQuizQuestion) {
  if (questionIsChoice(q)) return q.options.length > 0 && !!q.correctOptionId
  const tp = qType(q)
  if (tp === 'fill' || tp === 'extended') return !!q.referenceAnswer?.trim()
  if (tp === 'sequence') return (q.sequenceItems?.length ?? 0) >= 2
  // tableFill/matching/whiteboard — teacher review only, not auto-graded.
  return false
}
function questionCorrect(q: HomeworkQuizQuestion, ans: string | undefined) {
  if (!ans) return false
  if (questionIsChoice(q)) return ans === q.correctOptionId
  const tp = qType(q)
  if (tp === 'fill' || tp === 'extended') {
    return questionAutoGradable(q) && normAnswer(ans) === normAnswer(q.referenceAnswer!)
  }
  if (tp === 'sequence') {
    const items = q.sequenceItems ?? []
    const order = ans.split(',').map(Number)
    if (order.length !== items.length || order.some(n => Number.isNaN(n))) return false
    // The authored order is [0,1,2,…]; the answer holds the student's arrangement
    // as a list of authored indices, so it's correct when already in that order.
    return order.every((v, i) => v === i)
  }
  return false
}

// ─── Sequence solver ─────────────────────────────────────────────────────────
// Items are presented shuffled (deterministic alphabetical order) and the student
// reorders them. The answer is the current arrangement as a list of authored
// indices — correct when it equals [0,1,2,…] (the authored order).
function SequenceSolver({ items, value, disabled, showVerdict, onChange }: {
  items: string[]
  value: string | undefined
  disabled: boolean
  showVerdict: boolean
  onChange: (v: string) => void
}) {
  const initial = useMemo(
    () => items.map((_, i) => i).sort((a, b) => items[a].localeCompare(items[b], 'ru')),
    [items],
  )
  // Seed the stored answer with the initial arrangement so the question reads as
  // "answered" (the shown order IS a valid answer the student can keep or change).
  useEffect(() => {
    if (!value) onChange(initial.join(','))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const parsed = value ? value.split(',').map(Number) : initial
  const order = parsed.length === items.length && !parsed.some(Number.isNaN) ? parsed : initial

  const move = (pos: number, dir: -1 | 1) => {
    const to = pos + dir
    if (to < 0 || to >= order.length) return
    const n = [...order];[n[pos], n[to]] = [n[to], n[pos]]
    onChange(n.join(','))
  }
  const arrowBtn = (off: boolean): React.CSSProperties => ({
    width: 26, height: 22, borderRadius: 7, border: 'none', cursor: off ? 'default' : 'pointer',
    background: 'var(--color-bg-3)', color: 'var(--color-text-3)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', opacity: off ? 0.4 : 1,
  })
  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      {order.map((itemIdx, pos) => {
        const rightSpot = showVerdict && itemIdx === pos
        return (
          <div key={itemIdx} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 14,
            border: `1px solid ${showVerdict ? (rightSpot ? '#6EE7A0' : '#F48B91') : 'var(--color-border)'}`,
            background: showVerdict ? (rightSpot ? 'var(--color-green-soft)' : 'var(--color-red-soft)') : 'var(--color-bg-input)',
          }}>
            <span style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: 'var(--color-purple-soft)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>{pos + 1}</span>
            <span style={{ flex: 1, fontSize: 14, lineHeight: 1.4, color: 'var(--color-text)' }}>{items[itemIdx]}</span>
            {!disabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <button onClick={() => move(pos, -1)} disabled={pos === 0} style={arrowBtn(pos === 0)}><ChevronUp size={14} /></button>
                <button onClick={() => move(pos, 1)} disabled={pos === order.length - 1} style={arrowBtn(pos === order.length - 1)}><ChevronDown size={14} /></button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Table solver ────────────────────────────────────────────────────────────
// Renders the reference table; cells marked «пусто» become inputs the student
// fills. Answers are stored as a JSON map "r,c" → value (teacher-reviewed).
function TableSolver({ table, value, disabled, onChange }: {
  table: NonNullable<HomeworkQuizQuestion['table']>
  value: string | undefined
  disabled: boolean
  onChange: (v: string) => void
}) {
  let vals: Record<string, string> = {}
  try { if (value) vals = JSON.parse(value) } catch { vals = {} }
  const setCell = (key: string, v: string) => onChange(JSON.stringify({ ...vals, [key]: v }))
  const isEmpty = (r: number, c: number) => !!table.emptyCells?.[`${r},${c}`]
  const isBlank = (r: number, c: number) => !!table.blankCells?.[`${r},${c}`]
  return (
    <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--color-border)' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13, tableLayout: 'fixed' }}>
        <thead><tr>{table.headers.map((h, c) => (
          <th key={c} style={{ borderRight: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-2)', padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--color-text)', minWidth: 90 }}>{h}</th>
        ))}</tr></thead>
        <tbody>{table.rows.map((row, r) => (
          <tr key={r}>{row.map((cell, c) => {
            const key = `${r},${c}`
            const cellImg = table.cellImages?.[key]
            const cellImgSize = table.cellImageSizes?.[key] ?? 50
            return (
              <td key={c} style={{ borderRight: '1px solid var(--color-border)', borderTop: '1px solid var(--color-border)', padding: 0, background: isEmpty(r, c) ? 'var(--color-bg-input)' : 'transparent' }}>
                {isEmpty(r, c) ? (
                  <input
                    value={vals[key] ?? ''}
                    onChange={e => setCell(key, e.target.value)}
                    disabled={disabled}
                    placeholder="Впиши…"
                    style={{ width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', background: 'transparent', padding: '8px 10px', fontFamily: 'inherit', fontSize: 13, color: 'var(--color-accent)', fontWeight: 600 }}
                  />
                ) : isBlank(r, c) ? (
                  <div style={{ padding: '8px 10px', color: 'var(--color-text-4)' }}>—</div>
                ) : cellImg ? (
                  <div style={{ padding: '6px 8px' }}>
                    <img src={cellImg} alt="" style={{ display: 'block', width: `${cellImgSize}%`, borderRadius: 6 }} />
                    {cell && <div style={{ padding: '4px 2px', color: 'var(--color-text-2)', fontSize: 13 }}>{cell}</div>}
                  </div>
                ) : (
                  <div style={{ padding: '8px 10px', color: 'var(--color-text-2)' }}>{cell || '—'}</div>
                )}
              </td>
            )
          })}</tr>
        ))}</tbody>
      </table>
    </div>
  )
}

function getInitialState(): PersistedHomeworkState {
  return {
    selectedLevel: 'basic',
    basicAnswers: {},
    hardDraft: '',
    hardSubmitted: false,
    hardFiles: [],
    hardPhotos: [],
    hardBoard: null,
    hardTaskDrafts: {},
    basicSubmitted: false,
    selfAssessmentValue: null,
  }
}

export default function HomeworkFlow({
  lessonId,
  lessonTitle,
  subject,
  homework,
  onBack,
}: HomeworkFlowProps) {
  const isMobile = !useIsDesktop()
  const { dark } = useTheme()
  const palette = subjectTheme(subject, dark)
  const setHomeworkWidgetFeedback = useDashboard(s => s.setHomeworkWidgetFeedback)
  const clearHomeworkWidgetFeedback = useDashboard(s => s.clearHomeworkWidgetFeedback)
  const setAnswerFlight = useDashboard(s => s.setAnswerFlight)
  const questionSectionRefs = useRef<Record<string, HTMLElement | null>>({})
  // Same scroll-dock logic as the lesson page: when the pane scrolls, the
  // Back/title row docks onto the topbar line (a fixed twin), the topbar
  // auto-compacts, and the rest-state row fades out.
  const docked = useDashboard(s => s.lessonScrolled)
  const topBarCompact = useDashboard(s => s.topBarCompact)
  const topBarBox = useDashboard(s => s.topBarBox)
  const dockTitleRef = useRef<HTMLDivElement>(null)
  const [dockTitleMax, setDockTitleMax] = useState<number | undefined>(undefined)
  const basicLevel = homework.levels.find(level => level.id === 'basic')
  const hardLevel = homework.levels.find(level => level.id === 'hard')
  // Нет реального сложного уровня → не показываем вход в хард (кнопки/CTA/карточка).
  const showHard = homework.hasHardLevel !== false
  const [state, setState] = useState<PersistedHomeworkState>(() => {
    const raw = window.localStorage.getItem(getStorageKey(lessonId))
    if (!raw) return getInitialState()
    try {
      return { ...getInitialState(), ...(JSON.parse(raw) as Partial<PersistedHomeworkState>) }
    } catch {
      return getInitialState()
    }
  })
  const [showResultModal, setShowResultModal] = useState<'basic' | 'hard' | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [showBoard, setShowBoard] = useState(false)
  // Определения сложных заданий (per-task), назначенных на этот урок группе ученика.
  // Пусто → нет назначенного ДЗ или старый формат → используем legacy teacherTask.
  const [hardDefs, setHardDefs] = useState<HardTaskDef[]>([])
  const [openBoards, setOpenBoards] = useState<Set<string>>(new Set())
  useEffect(() => {
    let cancelled = false
    const session = getStudentSession()
    supabase
      .from('homework')
      .select('hard_tasks, group_id, created_at')
      .eq('lesson_id', lessonId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (cancelled || !data) return
        const rows = data as { hard_tasks?: HardTaskDef[]; group_id?: string }[]
        const withDefs = rows.filter(r => Array.isArray(r.hard_tasks) && r.hard_tasks.length > 0)
        const mine = withDefs.find(r => r.group_id === session?.groupId) ?? withDefs[0]
        setHardDefs(mine?.hard_tasks ?? [])
      })
    return () => { cancelled = true }
  }, [lessonId])

  // Серверная переписка по сложным заданиям: решения ученика (attachments.tasks)
  // + комментарии преподавателя (review_attachments.tasks). Тянем строку
  // `${lessonId}-hard` и слушаем её изменения — чтобы вердикт учителя появлялся
  // у ученика сразу, а история раундов не терялась.
  const [hardRow, setHardRow] = useState<LegacyHardRow | null>(null)
  const [hardBusy, setHardBusy] = useState(false)
  const [hardActiveKey, setHardActiveKey] = useState('')
  const reloadHardRow = React.useCallback(async () => {
    const session = getStudentSession()
    if (!session?.id) return
    const { data } = await supabase
      .from('lesson_progress')
      // comment/review_comment/status/updated_at нужны для миграции legacy-харда в раунды.
      .select('comment, attachments, review_comment, review_attachments, status, updated_at')
      .eq('student_id', ownerStudentIdFor(subject))
      .eq('lesson_ref', `${lessonId}-hard`)
      .maybeSingle()
    setHardRow((data as LegacyHardRow) ?? null)
  }, [lessonId, subject])
  useEffect(() => {
    reloadHardRow()
    const session = getStudentSession()
    if (!session?.id) return
    // Unique channel name per mount — Supabase caches channels by name and throws
    // if `.on()` is called on an already-subscribed instance (React StrictMode
    // double-invokes effects). Mirrors useHardSubmissions' per-instance naming.
    const channelName = `hw-hard-${lessonId}-${session.id}-${Math.random().toString(36).slice(2)}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lesson_progress', filter: `student_id=eq.${ownerStudentIdFor(subject)}` }, payload => {
        const ref = (payload.new as { lesson_ref?: string } | null)?.lesson_ref
        if (ref === `${lessonId}-hard`) reloadHardRow()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [lessonId, reloadHardRow])

  // Full-screen image viewer. A base64 data URL can't be opened in a new tab —
  // browsers block top-level navigation to data: URLs — so we show it inline.
  const [lightbox, setLightbox] = useState<string | null>(null)
  const setLessonAssessment = useDashboard(s => s.setLessonAssessment)
  const setHardCompleted = useDashboard(s => s.setHardCompleted)
  // Teacher's verdict on the hard essay, synced from `lesson_progress` on load.
  // Drives the submitted-panel badge so an accept/return actually shows here.
  const hardVerdict = useDashboard(s => s.lessonAssessments[lessonId]?.hardStatus)
  // Какой уровень открыть при входе (карточка «Сложный уровень» открывает хард).
  const homeworkInitialLevel = useDashboard(s => s.homeworkInitialLevel)
  const clearHomeworkInitialLevel = useDashboard(s => s.clearHomeworkInitialLevel)
  // Открытие домашки на конкретном уровне (хард-карточка → сразу хард).
  useEffect(() => {
    if (!homeworkInitialLevel) return
    // Хард-уровня нет → игнорируем запрос открыть его сразу, остаёмся на базе.
    const target = homeworkInitialLevel === 'hard' && !showHard ? 'basic' : homeworkInitialLevel
    setState(current => (current.selectedLevel === target ? current : { ...current, selectedLevel: target }))
    clearHomeworkInitialLevel()
  }, [homeworkInitialLevel, clearHomeworkInitialLevel, showHard])
  useEffect(() => {
    window.localStorage.setItem(getStorageKey(lessonId), JSON.stringify(state))
  }, [lessonId, state])

  // Cap the docked title so its right edge stays 10px clear of the centred top
  // bar (mirrors the lesson page). Left-anchored after the fixed Back button, so
  // the measurement converges in one pass.
  useLayoutEffect(() => {
    if (!docked || !topBarBox) { setDockTitleMax(undefined); return }
    const el = dockTitleRef.current
    if (!el) return
    const GAP = 10
    const left = el.getBoundingClientRect().left
    setDockTitleMax(Math.max(0, topBarBox.left - GAP - left))
  }, [docked, topBarBox, state.selectedLevel])

  const basicQuestions = basicLevel?.questions ?? []
  const answeredCount = basicQuestions.filter(question => questionAnswered(question, state.basicAnswers[question.id])).length
  const basicCompleted = basicQuestions.length > 0 && answeredCount === basicQuestions.length

  const basicCorrectCount = useMemo(() => {
    return basicQuestions.filter(question => questionCorrect(question, state.basicAnswers[question.id])).length
  }, [basicQuestions, state.basicAnswers])
  // Score over the auto-gradable subset (choice + text/fill with an эталон),
  // mirroring TestFlow. When nothing is auto-gradable (all teacher-reviewed),
  // submitting the answers counts as a full pass so the hard level can open.
  const basicGradableCount = useMemo(
    () => basicQuestions.filter(questionAutoGradable).length,
    [basicQuestions],
  )
  const basicScore = basicGradableCount > 0
    ? Math.round((basicCorrectCount / basicGradableCount) * 100)
    : (basicCompleted ? 100 : 0)
  // Хард открыт, если база сдана на нужный балл ЛИБО на сервере уже есть статус
  // хард-работы (submitted/returned/completed) — иначе после возврата на другом
  // устройстве (нет локальных ответов) хард показался бы «закрытым».
  const hardUnlocked = (basicCompleted && basicScore >= homework.recommendationScore) || !!hardVerdict
  const selectedLevel = state.selectedLevel

  if (!basicLevel || !hardLevel) return null

  const selectedEstimatedTime = formatEstimatedTime(
    selectedLevel === 'basic' ? basicLevel.estimatedMinutes : hardLevel.estimatedMinutes
  )

  async function submitToSupabase(
    level: 'basic' | 'hard',
    score: number,
    comment: string,
    attachments?: { photos: string[]; board: string | null } | { v: 2; tasks: HardTaskStudentBlock[] },
  ) {
    const session = getStudentSession()
    if (!session?.id) return
    // Basic level is auto-graded — mark completed immediately if score meets threshold.
    // Hard level (essay) always goes to submitted and awaits teacher review.
    const status = level === 'basic' && score >= homework.recommendationScore
      ? 'completed'
      : 'submitted'
    const ref = level === 'hard' ? `${lessonId}-hard` : lessonId
    await supabase.from('lesson_progress').upsert({
      student_id: ownerStudentIdFor(subject),
      lesson_ref: ref,
      subject,
      status,
      score,
      comment,
      attachments: attachments ?? {},
    }, { onConflict: 'student_id,lesson_ref' })
    useStudentData.getState().load()
  }

  // Все хард-задания — единый per-task/раунд-формат. Если учитель назначил
  // banked hard_tasks — берём их; иначе синтезируем ОДНУ вкладку из задания урока
  // (hardLevel.teacherTask), чтобы тред (решение → комментарий → …) был везде.
  const effectiveDefs: HardTaskDef[] = hardDefs.length > 0
    ? hardDefs
    // Course-editor «Домашки» homework has no `homework` table row, so fall back
    // to its per-task authored defs (one «Задание N» tab each); only when there
    // are none do we synthesize a single legacy tab from teacherTask.
    : (hardLevel.authoredHardDefs?.length
        ? hardLevel.authoredHardDefs.map(d => ({ key: d.key, source: 'custom' as const, statement: d.statement }))
        : [{ key: LEGACY_HARD_KEY, source: 'custom', statement: hardLevel.teacherTask?.prompt ?? hardLevel.teacherTask?.topic ?? '' }])
  // Хард всегда идёт через тред-вид (effectiveDefs не пуст), legacy-ветки мертвы.
  const isMultiHard = effectiveDefs.length > 0

  // Переписка по заданиям (с сервера): v2 — как есть; legacy одиночный — синтез
  // в одну вкладку с одним раундом (старое решение + комментарий учителя).
  const hardLegacy = hardRow ? legacyHardToBlocks(hardRow) : { taskBlocks: [], reviewBlocks: [] }
  const studentBlocks: HardTaskStudentBlock[] = isNewHard(hardRow?.attachments)
    ? (hardRow!.attachments as HardAttachmentsNew).tasks : hardLegacy.taskBlocks
  const reviewBlocks: HardTaskReviewBlock[] = isNewHard(hardRow?.review_attachments)
    ? (hardRow!.review_attachments as HardReviewNew).tasks : hardLegacy.reviewBlocks
  const hardTabs: HardTabVM[] = effectiveDefs.map((d, i) => ({
    key: d.key, title: `Задание ${i + 1}`, statement: d.statement, image: d.image,
  }))

  // Отправка решения по одной вкладке: дописываем НОВЫЙ круг в её историю,
  // сохраняя предыдущие решения и не трогая остальные задания / ревью учителя.
  async function submitTabSolution(key: string, payload: { answer: string; photos: string[]; board: string | null }) {
    const session = getStudentSession()
    if (!session?.id) return
    setHardBusy(true)
    const ref = `${lessonId}-hard`
    const { data } = await supabase
      .from('lesson_progress')
      // comment/review/status нужны, чтобы при первой пере-отправке мигрировать
      // legacy одиночное решение в первый раунд (не потерять прошлый ответ).
      .select('comment, attachments, review_attachments, status, updated_at')
      .eq('student_id', ownerStudentIdFor(subject))
      .eq('lesson_ref', ref)
      .maybeSingle()
    const prevTasks: HardTaskStudentBlock[] = isNewHard(data?.attachments)
      ? (data!.attachments as HardAttachmentsNew).tasks
      : (data ? legacyHardToBlocks(data as LegacyHardRow).taskBlocks : [])
    const prevByKey = new Map(prevTasks.map(t => [t.key, t]))
    const round: HardSolution = { id: hardId('sol'), at: new Date().toISOString(), ...payload }
    const tasks: HardTaskStudentBlock[] = effectiveDefs.map(d => {
      const sols = studentSolutions(prevByKey.get(d.key))
      return { key: d.key, statement: d.statement, solutions: d.key === key ? [...sols, round] : sols }
    })
    const summary = tasks
      .map(t => (studentSolutions(t).slice(-1)[0]?.answer || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim())
      .filter(Boolean).join('\n\n')
    // score / review_attachments не трогаем — сохраняем накопленную оценку учителя.
    await supabase.from('lesson_progress').upsert({
      student_id: ownerStudentIdFor(subject),
      lesson_ref: ref,
      subject,
      status: 'submitted',
      comment: summary,
      attachments: { v: 2, tasks },
    }, { onConflict: 'student_id,lesson_ref' })
    setState(current => ({ ...current, hardSubmitted: true }))
    setHardCompleted(lessonId)
    await reloadHardRow()
    useStudentData.getState().load()
    setHardBusy(false)
  }


  const answerQuestion = (questionIndex: number, questionId: string, optionId: string) => {
    const question = basicQuestions.find(item => item.id === questionId)
    if (!question) return
    if (state.basicAnswers[questionId]) return

    const correct = optionId === question.correctOptionId
    const nextAnswers = { ...state.basicAnswers, [questionId]: optionId }
    const nextAnswered = basicQuestions.filter(item => questionAnswered(item, nextAnswers[item.id])).length
    const nextCorrect = basicQuestions.filter(item => questionCorrect(item, nextAnswers[item.id])).length

    playPop()
    vibrate(correct ? [10, 30, 10] : 22)
    setState(current => ({
      ...current,
      basicAnswers: nextAnswers,
    }))
    setHomeworkWidgetFeedback({
      lessonTitle,
      answered: nextAnswered,
      total: basicQuestions.length,
      correct: nextCorrect,
      lastQuestionIndex: questionIndex,
      lastCorrect: correct,
      lastTitle: correct ? 'Справился' : 'Пока мимо',
      lastMessage: correct
        ? 'Ответ верный, задание засчитано и сохранено в прогрессе.'
        : question.explanation,
    })

    // Fire flying chip animation from the question card to the widget pill.
    const el = questionSectionRefs.current[questionId]
    if (el) {
      const rect = el.getBoundingClientRect()
      setAnswerFlight({
        id: questionIndex,
        correct,
        fromX: rect.left + rect.width * 0.75,
        fromY: rect.top + rect.height * 0.35,
      })
    }
  }

  // Free-text answer (text / fill / match / whiteboard authored tasks). Unlike
  // choice, these stay editable until the homework is submitted.
  const setFreeAnswer = (questionId: string, value: string) => {
    if (state.basicSubmitted) return
    setState(current => ({
      ...current,
      basicAnswers: { ...current.basicAnswers, [questionId]: value },
    }))
  }

  const levelLabel = selectedLevel === 'basic' ? basicLevel.title : hardLevel.title

  // Glass recipe for the docked top-line pills — matched to the lesson page so
  // the floating Back/title pills read as the same piece of glass as the topbar.
  const dockGlass = {
    border: '1px solid var(--color-border-glass)',
    background: 'rgba(var(--glass-rgb), 0.86)',
    backdropFilter: 'blur(14px) saturate(180%)',
    WebkitBackdropFilter: 'blur(14px) saturate(180%)',
    boxShadow: 'var(--shadow-lg)',
  } as const

  const levelPill = (compact: boolean) => (
    <span
      className="flex-shrink-0"
      style={{
        // Same outer height as before (vertical total kept), but 1px shifted
        // off the bottom onto the top so the label reads optically centred;
        // inline-flex centring keeps the right gap equal to the left.
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: compact ? '2px 8px 4px' : '3px 10px 5px',
        borderRadius: 999,
        border: `1px solid ${palette.accent}`,
        background: palette.soft,
        color: palette.text,
        fontSize: compact ? 11 : 12,
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {levelLabel}
    </span>
  )

  return (
    <>
    <AnimatePresence>
      {showResultModal && (
        <ResultModal
          context={showResultModal}
          score={showResultModal === 'basic' ? basicScore : undefined}
          recommendationScore={homework.recommendationScore}
          showHard={showHard}
          onContinue={(emojiIndex, goToHard) => {
            const hardAvailable = showHard && basicScore >= homework.recommendationScore
            setState(current => ({ ...current, basicSubmitted: true, selfAssessmentValue: emojiIndex, ...(goToHard ? { selectedLevel: 'hard' } : {}) }))
            if (goToHard) clearHomeworkWidgetFeedback()
            setLessonAssessment(lessonId, basicScore, emojiIndex, hardAvailable)
            setShowResultModal(null)
          }}
        />
      )}
    </AnimatePresence>
    <div className="flex flex-col" style={{ gap: 18 }}>
      {/* Rest-state Back / title / level row — in the scroll flow; fades out as
          the page docks onto the topbar line. */}
      <motion.div
        className="flex items-center"
        style={{ gap: 16 }}
        animate={{ opacity: docked ? 0 : 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => { clearHomeworkWidgetFeedback(); onBack() }}
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
          className="flex-1 min-w-0 text-center flex items-center justify-center"
          style={{ gap: 10, fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}
        >
          <span className="truncate">{homework.title}</span>
          {levelPill(false)}
        </h1>

        <div className="flex-shrink-0" style={{ width: 92 }} />
      </motion.div>

      {/* Docked twin — fixed at the topbar line so the Back/title pills sit ON
          the topbar row (mini topbar centred between them and the widget pill). */}
      <div className="docked-pills-row" style={{ position: 'fixed', top: isMobile ? 'calc(env(safe-area-inset-top, 0px) + 14px)' : 30, left: isMobile ? 16 : 32, right: isMobile ? 16 : 32, zIndex: 80, pointerEvents: 'none' }}>
      <AnimatePresence>
        {docked && (
          <motion.div
            key="homework-dock"
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
              onClick={() => { clearHomeworkWidgetFeedback(); onBack() }}
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
              className="min-w-0 flex items-center"
              style={{
                fontSize: 14, fontWeight: 700, color: 'var(--color-text)', flexShrink: 1,
                maxWidth: dockTitleMax, gap: 8,
                padding: '9px 10px 9px 16px', borderRadius: 999,
                ...dockGlass, pointerEvents: 'auto',
              }}
            >
              <span className="truncate" style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                <motion.span
                  initial={false}
                  animate={{ maxWidth: topBarCompact ? 200 : 0, opacity: topBarCompact ? 1 : 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  style={{ display: 'inline-block', overflow: 'hidden', whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  Домашка по теме&nbsp;«
                </motion.span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {homework.title.replace(/^Домашка по теме\s*«(.+)»$/, '$1')}
                </span>
                <motion.span
                  initial={false}
                  animate={{ maxWidth: topBarCompact ? 20 : 0, opacity: topBarCompact ? 1 : 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  style={{ display: 'inline-block', overflow: 'hidden', whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  »
                </motion.span>
              </span>
              {levelPill(true)}
            </div>

            <div style={{ flexGrow: 1, flexBasis: 0 }} />
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* The homework card scrolls in the flow, up under the topbar + blur. */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
        className="grid grid-cols-1 lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)] items-start"
        style={{ gap: 16 }}
      >
        <aside
          className="flex flex-col"
          style={{
            padding: 16,
            gap: 12,
            borderRadius: 28,
            background: 'rgba(var(--glass-rgb), 0.98)',
            border: '1px solid var(--color-border-glass)',
            boxShadow: '0 8px 32px rgba(17, 12, 34, 0.08)',
          }}
        >
          <div
            style={{
              padding: 16,
              borderRadius: 16,
              background: PURPLE.gradient,
              color: '#fff',
              boxShadow: '0 18px 44px rgba(123, 63, 204, 0.24)',
            }}
          >
            <div className="flex items-center" style={{ gap: 10, marginBottom: 12 }}>
              <GraduationCap size={18} />
              <span style={{ fontSize: 13, fontWeight: 700 }}>Структура домашки</span>
            </div>
            <p style={{ fontSize: 21, lineHeight: 1.15, fontWeight: 750, marginBottom: 8 }}>
              {selectedLevel === 'basic' ? basicLevel.shortLabel : hardLevel.shortLabel}
            </p>
            <p style={{ fontSize: 13, lineHeight: 1.5, color: 'rgba(255,255,255,0.86)' }}>
              {selectedLevel === 'basic' ? basicLevel.motivation : hardLevel.motivation}
            </p>
          </div>

          <div
            className="flex flex-col"
            style={{
              padding: 16,
              borderRadius: 16,
              background: 'rgba(var(--glass-rgb), 0.94)',
              border: '1px solid var(--color-border-soft)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
              gap: 12,
            }}
          >
            <InfoRow label="Дедлайн" value={basicLevel.dueDate} />
            <InfoRow label="Время" value={selectedEstimatedTime} />
            <InfoRow label="Формат" value={selectedLevel === 'basic' ? 'Тест с автопроверкой' : 'Проверка преподавателем'} />
            <InfoRow
              label="% справившихся"
              value={`${selectedLevel === 'basic' ? basicLevel.peerCompletionRate : hardLevel.peerCompletionRate}%`}
            />
            {selectedLevel === 'basic' && basicLevel.peerAverageScore != null && (
              <InfoRow label="Средний балл" value={`${basicLevel.peerAverageScore}`} />
            )}
          </div>

          <div
            className="flex flex-col"
            style={{
              padding: 16,
              borderRadius: 16,
              background: 'rgba(var(--glass-rgb), 0.94)',
              border: '1px solid var(--color-border-soft)',
              gap: 12,
            }}
          >
            <div className="flex items-center" style={{ gap: 8 }}>
              <Sparkles size={16} style={{ color: 'var(--color-accent)' }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Как это работает</p>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--color-muted)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 700, color: 'var(--color-text)' }}>
                <Clock size={13} />
                Обычно занимает {selectedEstimatedTime}.
              </span>{' '}
              Базовый уровень обязателен и проверяется сразу. Если набираешь {homework.recommendationScore}+ баллов,
              открывается необязательный хард-уровень с проверкой преподавателем.
            </p>
          </div>

          {selectedLevel === 'hard' && hardLevel.teacherTask?.acceptedFormats && (
            <div
              style={{
                padding: 16,
                borderRadius: 16,
                background: 'var(--color-purple-soft)',
                border: '1px solid rgba(99,84,207,0.14)',
                gap: 10,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-accent)' }}>Что можно приложить</p>
              <div className="flex flex-wrap" style={{ gap: 8 }}>
                {hardLevel.teacherTask.acceptedFormats.map(item => (
                  <span
                    key={item}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 999,
                      background: 'rgba(var(--glass-rgb), 0.82)',
                      color: 'var(--color-accent)',
                      fontSize: 11,
                      fontWeight: 650,
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

        </aside>

        <main
          className="flex flex-col"
          style={{ gap: 16, paddingBottom: 100 }}
        >
          {selectedLevel === 'basic' ? (
            <div className="flex flex-col" style={{ gap: 18 }}>

              {basicCompleted && (
                <div
                  className="flex flex-wrap items-center justify-between"
                  style={{
                    gap: 14, padding: 18, borderRadius: 24,
                    background: state.basicSubmitted
                      ? (basicScore >= homework.recommendationScore ? 'var(--color-purple-soft)' : 'var(--color-yellow-soft)')
                      : 'var(--color-bg-input)',
                    border: state.basicSubmitted
                      ? `1px solid ${basicScore >= homework.recommendationScore ? 'rgba(99,84,207,0.18)' : 'rgba(248,201,145,0.42)'}`
                      : '1px solid var(--color-border-medium)',
                    boxShadow: state.basicSubmitted ? 'none' : '0 8px 24px rgba(0,0,0,0.05)',
                  }}
                >
                  <div className="flex items-start" style={{ gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: state.basicSubmitted
                        ? (basicScore >= homework.recommendationScore ? 'rgba(99,84,207,0.12)' : 'rgba(248,201,145,0.26)')
                        : 'rgba(0,0,0,0.05)',
                      color: state.basicSubmitted
                        ? (basicScore >= homework.recommendationScore ? 'var(--color-accent)' : 'var(--color-yellow-text)')
                        : 'var(--color-muted)',
                    }}>
                      {state.basicSubmitted
                        ? (basicScore >= homework.recommendationScore ? <Trophy size={20} /> : <CircleAlert size={20} />)
                        : <CheckCircle2 size={20} />
                      }
                    </div>
                    <div>
                      <p style={{ fontSize: 17, fontWeight: 760, color: 'var(--color-text)', marginBottom: 4 }}>
                        {state.basicSubmitted
                          ? (basicScore >= homework.recommendationScore ? `Тест сдан на ${basicScore} баллов` : `Результат: ${basicScore} из 100`)
                          : 'Все вопросы отвечены!'
                        }
                      </p>
                      <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--color-muted)' }}>
                        {state.basicSubmitted
                          ? (basicScore >= homework.recommendationScore
                            ? 'База закрыта уверенно. Доступен необязательный хард-уровень с разбором от преподавателя.'
                            : `До открытия харда нужен результат ${homework.recommendationScore}+. Можно вернуться к конспекту и попробовать снова.`)
                          : 'Проверь ответы и сдай домашку, чтобы зафиксировать результат.'
                        }
                      </p>
                      {state.basicSubmitted && state.selfAssessmentValue !== null && (
                        <div className="flex items-center" style={{ gap: 8, marginTop: 8 }}>
                          <span style={{ fontSize: 20 }}>{EMOJI_STEPS[state.selfAssessmentValue].emoji}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-muted)' }}>
                            Самооценка: {EMOJI_STEPS[state.selfAssessmentValue].label}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center flex-wrap" style={{ gap: 10 }}>
                    {showHard && state.basicSubmitted && basicScore >= homework.recommendationScore && (
                      <motion.button
                        whileHover={{ y: -1 }} whileTap={{ scale: 0.99 }}
                        onClick={() => { setState(current => ({ ...current, selectedLevel: 'hard' })); clearHomeworkWidgetFeedback() }}
                        className="cursor-pointer"
                        style={{
                          padding: '12px 18px', borderRadius: 16, border: 'none',
                          background: PURPLE.gradient, color: '#fff', fontSize: 14, fontWeight: 700,
                          boxShadow: '0 12px 28px rgba(99,84,207,0.2)',
                        }}
                      >
                        Открыть хард
                      </motion.button>
                    )}
                    {!state.basicSubmitted && (
                      <motion.button
                        whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
                        onClick={() => { submitToSupabase('basic', basicScore, ''); setShowResultModal('basic') }}
                        className="cursor-pointer"
                        style={{
                          padding: '13px 22px', borderRadius: 16, border: 'none',
                          background: PURPLE.gradient, color: '#fff', fontSize: 14, fontWeight: 750,
                          boxShadow: '0 12px 28px rgba(99,84,207,0.28)',
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}
                      >
                        <Send size={16} />
                        Сдать домашку
                      </motion.button>
                    )}
                  </div>
                </div>
              )}

              {basicQuestions.map((question, index) => {
                const selectedAnswer = state.basicAnswers[question.id]
                const isChoice = questionIsChoice(question)
                const answered = questionAnswered(question, selectedAnswer)
                const autoGradable = questionAutoGradable(question)
                // Choice locks + grades on click; free-text reveals its verdict
                // only after the whole homework is submitted.
                const graded = answered && (isChoice || state.basicSubmitted)
                const isCorrect = questionCorrect(question, selectedAnswer)
                const showVerdict = graded && autoGradable
                const showReview = graded && !autoGradable
                return (
                  <section
                    key={question.id}
                    ref={el => { questionSectionRefs.current[question.id] = el }}
                    className="flex flex-col"
                    style={{
                      gap: 14,
                      padding: 20,
                      borderRadius: 26,
                      background: 'rgba(var(--glass-rgb), 0.96)',
                      border: showVerdict
                        ? `1px solid ${isCorrect ? 'rgba(110,231,160,0.58)' : 'rgba(244,139,145,0.5)'}`
                        : '1px solid var(--color-border-soft)',
                      boxShadow: showVerdict
                        ? `0 12px 34px ${isCorrect ? 'rgba(110,231,160,0.14)' : 'rgba(244,139,145,0.12)'}`
                        : '0 8px 24px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div className="flex flex-wrap items-start justify-between" style={{ gap: 12 }}>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent)', marginBottom: 6 }}>
                          Вопрос {index + 1}
                        </p>
                        <h4 style={{ fontSize: 18, lineHeight: 1.35, fontWeight: 720, color: 'var(--color-text)' }}>
                          {question.prompt}
                        </h4>
                      </div>

                      {showVerdict && (
                        <div
                          className="flex items-start"
                          style={{
                            gap: 8,
                            padding: '9px 12px',
                            borderRadius: 14,
                            background: isCorrect ? 'var(--color-green-soft)' : 'var(--color-red-soft)',
                            color: isCorrect ? 'var(--color-green-text)' : 'var(--color-red-text)',
                            fontSize: 13,
                            fontWeight: 700,
                            maxWidth: 220,
                            lineHeight: 1.4,
                          }}
                        >
                          <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                          <span>
                            {isCorrect ? 'Верно' : 'Неверно'}
                          </span>
                        </div>
                      )}
                      {showReview && (
                        <div
                          className="flex items-start"
                          style={{
                            gap: 8, padding: '9px 12px', borderRadius: 14,
                            background: 'var(--color-purple-soft)', color: 'var(--color-accent)',
                            fontSize: 13, fontWeight: 700, maxWidth: 220, lineHeight: 1.4,
                          }}
                        >
                          <Send size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                          <span>На проверке у преподавателя</span>
                        </div>
                      )}
                    </div>

                    {isChoice ? (
                    <div className="grid" style={{ gap: 10 }}>
                      {question.options.map(option => {
                        const active = selectedAnswer === option.id
                        const correct = option.id === question.correctOptionId
                        const wrongSelected = answered && active && !correct
                        const correctSelected = answered && correct
                        return (
                          <button
                            key={option.id}
                            disabled={answered}
                            onClick={() => answerQuestion(index, question.id, option.id)}
                            className="cursor-pointer text-left"
                            style={{
                              padding: '14px 16px',
                              borderRadius: 18,
                              border: `1px solid ${
                                correctSelected ? '#6EE7A0'
                                  : wrongSelected ? '#F48B91'
                                  : active ? 'rgba(99,84,207,0.38)'
                                  : 'var(--color-border)'
                              }`,
                              background: correctSelected ? 'var(--color-green-soft)'
                                : wrongSelected ? 'var(--color-red-soft)'
                                : active ? 'var(--color-purple-soft)'
                                : 'var(--color-bg-input)',
                              color: 'var(--color-text)',
                              fontSize: 14,
                              lineHeight: 1.45,
                              fontWeight: 600,
                              transition: 'all 0.18s ease',
                              opacity: answered && !correctSelected && !wrongSelected && !active ? 0.84 : 1,
                            }}
                          >
                            {option.text}
                          </button>
                        )
                      })}
                    </div>
                    ) : qType(question) === 'sequence' && (question.sequenceItems?.length ?? 0) > 0 ? (
                    <SequenceSolver
                      items={question.sequenceItems!}
                      value={selectedAnswer}
                      disabled={state.basicSubmitted}
                      showVerdict={showVerdict}
                      onChange={v => setFreeAnswer(question.id, v)}
                    />
                    ) : qType(question) === 'tableFill' && question.table ? (
                    <TableSolver
                      table={question.table}
                      value={selectedAnswer}
                      disabled={state.basicSubmitted}
                      onChange={v => setFreeAnswer(question.id, v)}
                    />
                    ) : (
                    <div className="flex flex-col" style={{ gap: 10 }}>
                      {qType(question) === 'matching' && (question.pairs?.length ?? 0) > 0 && (
                        <div className="flex flex-col" style={{ gap: 6 }}>
                          {question.pairs!.map((pair, pi) => (
                            <div key={pi} className="flex items-center" style={{ gap: 8, fontSize: 13, color: 'var(--color-text-2)' }}>
                              <span style={{ fontWeight: 600 }}>{pair.left}</span>
                              <span style={{ color: 'var(--color-muted)' }}>→</span>
                              <span>{pair.right}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <textarea
                        value={selectedAnswer ?? ''}
                        onChange={e => setFreeAnswer(question.id, e.target.value)}
                        disabled={state.basicSubmitted}
                        rows={qType(question) === 'fill' ? 2 : 4}
                        placeholder={
                          qType(question) === 'fill' ? 'Впиши слово или фразу…'
                            : qType(question) === 'whiteboard' ? 'Опиши решение (рисунок на доске приложишь учителю)…'
                            : qType(question) === 'matching' ? 'Запиши соответствия…'
                            : 'Развёрнутый ответ…'
                        }
                        style={{
                          width: '100%', boxSizing: 'border-box', padding: '12px 14px',
                          borderRadius: 16, resize: 'vertical', fontFamily: 'inherit',
                          fontSize: 14, lineHeight: 1.5, color: 'var(--color-text)',
                          background: 'var(--color-bg-input)', outline: 'none',
                          border: `1px solid ${showVerdict ? (isCorrect ? '#6EE7A0' : '#F48B91') : 'var(--color-border)'}`,
                          opacity: state.basicSubmitted ? 0.85 : 1,
                        }}
                      />
                    </div>
                    )}

                    {showVerdict && !isChoice && !isCorrect && question.referenceAnswer && (
                      <div style={{ padding: '12px 14px', borderRadius: 16, background: 'var(--color-green-soft)', border: '1px solid rgba(110,231,160,0.38)' }}>
                        <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-green-text)', marginBottom: 4 }}>Эталонный ответ</p>
                        <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--color-text-2)' }}>{question.referenceAnswer}</p>
                      </div>
                    )}

                    {showVerdict && question.explanation && (
                      <div
                        style={{
                          padding: '14px 16px',
                          borderRadius: 18,
                          background: isCorrect ? 'var(--color-green-soft)' : 'var(--color-red-soft)',
                          border: `1px solid ${isCorrect ? 'rgba(110,231,160,0.38)' : 'rgba(244,139,145,0.38)'}`,
                        }}
                      >
                        <p
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            color: isCorrect ? 'var(--color-green-text)' : 'var(--color-red-text)',
                            marginBottom: 6,
                          }}
                        >
                          {isCorrect ? 'Справился с заданием' : 'Разберём ошибку'}
                        </p>
                        <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--color-text-2)' }}>
                          {isCorrect
                            ? `Пояснение: ${question.explanation}`
                            : question.explanation}
                        </p>
                      </div>
                    )}
                  </section>
                )
              })}
              <div style={{ position: 'fixed', bottom: isMobile ? 'calc(env(safe-area-inset-bottom, 0px) + 104px)' : 24, left: '50%', transform: 'translateX(-50%)', zIndex: 100, width: 'min(560px, calc(100vw - 48px))' }}>
                <BottomProgressBar
                  total={basicQuestions.length}
                  answers={state.basicAnswers}
                  questions={basicQuestions}
                  activeIndex={basicQuestions.findIndex(q => !questionAnswered(q, state.basicAnswers[q.id]))}
                  submitted={state.basicSubmitted}
                  score={basicScore}
                  recommendationScore={homework.recommendationScore}
                  onSubmit={() => { submitToSupabase('basic', basicScore, ''); setShowResultModal('basic') }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: 18 }}>

              {!hardUnlocked ? (
                <section
                  className="flex flex-col items-center justify-center"
                  style={{
                    minHeight: 420,
                    padding: 28,
                    borderRadius: 28,
                    border: '1px dashed rgba(0,0,0,0.12)',
                    background: 'rgba(var(--glass-rgb), 0.78)',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 24,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--color-purple-soft)',
                      color: 'var(--color-accent)',
                      marginBottom: 18,
                    }}
                  >
                    <Lock size={28} />
                  </div>
                  <h4 style={{ fontSize: 22, fontWeight: 760, color: 'var(--color-text)', marginBottom: 10 }}>
                    Сначала закрываем базовый уровень
                  </h4>
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--color-muted)', maxWidth: 520 }}>
                    Хард открывается только после уверенного результата на тесте. Это оставляет его добровольным
                    и отправляет на проверку только тем, кто уже хорошо справился с базой.
                  </p>
                </section>
              ) : (
                /* Сложные задания — вкладки + датированная переписка (решение →
                   комментарий → … → принято) с полем для нового решения. */
                <section
                  className="flex flex-col"
                  style={{
                    gap: 18,
                    padding: 22,
                    borderRadius: 28,
                    background: 'rgba(var(--glass-rgb), 0.96)',
                    border: '1px solid var(--color-border-soft)',
                  }}
                >
                  <HardConversation
                    tabs={hardTabs}
                    studentBlocks={studentBlocks}
                    reviewBlocks={reviewBlocks}
                    role="student"
                    activeKey={hardActiveKey || hardTabs[0]?.key || ''}
                    onSelectTab={setHardActiveKey}
                    onZoomPhoto={setLightbox}
                    onSubmitSolution={submitTabSolution}
                    busy={hardBusy}
                    palette={{ accent: palette.accent, soft: palette.soft, text: palette.text, ring: palette.ring }}
                  />
                </section>
              )}
            </div>
          )}
        </main>
      </motion.div>
    </div>

    {/* Full-screen image viewer for teacher's attached photos */}
    <AnimatePresence>
      {lightbox && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
            cursor: 'zoom-out', backdropFilter: 'blur(4px)',
          }}
        >
          <button
            onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: 20, right: 20, width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.14)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={20} />
          </button>
          <motion.img
            src={lightbox}
            alt=""
            initial={{ scale: 0.92 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.92 }}
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 12, cursor: 'default', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
    </>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between" style={{ gap: 12 }}>
      <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

function MetricPill({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      style={{
        padding: '10px 12px',
        borderRadius: 16,
        background: accent ? 'var(--color-purple-soft)' : 'var(--color-bg-3)',
        border: accent ? '1px solid rgba(99,84,207,0.18)' : '1px solid var(--color-border-soft)',
        minWidth: 92,
      }}
    >
      <p style={{ fontSize: 11, fontWeight: 700, color: accent ? 'var(--color-accent)' : 'var(--color-muted)', marginBottom: 4 }}>
        {label}
      </p>
      <p style={{ fontSize: 18, fontWeight: 760, color: 'var(--color-text)' }}>
        {value}
      </p>
    </div>
  )
}

function ProgressStrip({
  total,
  answers,
  questions,
  activeIndex,
}: {
  total: number
  answers: Record<string, string>
  questions: HomeworkQuizQuestion[]
  activeIndex: number
}) {
  if (total === 0) return null
  // -1 means all answered; treat last question as "active" display position
  const active = activeIndex === -1 ? total - 1 : activeIndex
  const answeredCount = questions.filter(q => questionAnswered(q, answers[q.id])).length
  const correctCount = questions.filter(q => questionCorrect(q, answers[q.id])).length
  // Auto-gradable answered questions — only these can read "wrong"; free-text
  // pending teacher review is neither correct nor wrong.
  const gradedCount = questions.filter(q => questionAnswered(q, answers[q.id]) && questionAutoGradable(q)).length

  return (
    <div
      className="flex flex-col"
      style={{
        gap: 10,
        marginTop: 'auto',
        padding: 16,
        borderRadius: 22,
        background: 'rgba(var(--glass-rgb), 0.94)',
        border: '1px solid var(--color-border-soft)',
      }}
    >
      <div className="flex items-center justify-between">
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Прогресс</p>
        {answeredCount > 0 && (
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent)' }}>
            {answeredCount}/{total}
          </span>
        )}
      </div>

      {/* bar + circle track */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 28 }}>
        {Array.from({ length: total }).map((_, index) => {
          const question = questions[index]
          const answer = question ? answers[question.id] : undefined
          const gradable = !!question && questionAutoGradable(question)
          const isCorrect = !!question && gradable && questionCorrect(question, answer)
          const isWrong = !!question && gradable && questionAnswered(question, answer) && !questionCorrect(question, answer)
          const isActive = index === active

          if (isActive) {
            return (
              <motion.div
                key={index}
                layout
                style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isCorrect ? '#6EE7A0' : isWrong ? '#F48B91' : PURPLE.gradient,
                  color: isCorrect ? '#0B4020' : isWrong ? '#6B0007' : '#fff',
                  fontSize: 11, fontWeight: 800,
                  boxShadow: isCorrect
                    ? '0 4px 12px rgba(110,231,160,0.4)'
                    : isWrong
                      ? '0 4px 12px rgba(244,139,145,0.4)'
                      : '0 4px 14px rgba(99,84,207,0.35)',
                }}
              >
                {index + 1}
              </motion.div>
            )
          }

          const bg = isCorrect ? '#6EE7A0' : isWrong ? '#F48B91' : '#E4E4E9'
          return (
            <div
              key={index}
              style={{
                flex: 1, height: index < active ? 8 : 5,
                borderRadius: 4, background: bg,
                minWidth: 3, transition: 'height 0.2s ease',
              }}
            />
          )
        })}
      </div>

      {/* micro stats row */}
      {answeredCount > 0 && (
        <div className="flex items-center" style={{ gap: 8 }}>
          {correctCount > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 700, color: 'var(--color-green-text)',
              background: 'var(--color-green-soft)', padding: '3px 8px', borderRadius: 999,
            }}>
              ✓ {correctCount} верно
            </span>
          )}
          {(gradedCount - correctCount) > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 700, color: '#A8282D',
              background: 'var(--color-red-soft)', padding: '3px 8px', borderRadius: 999,
            }}>
              ✗ {gradedCount - correctCount} нет
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function BottomProgressBar({
  total,
  answers,
  questions,
  activeIndex,
  submitted,
  score,
  recommendationScore,
  onSubmit,
}: {
  total: number
  answers: Record<string, string>
  questions: HomeworkQuizQuestion[]
  activeIndex: number
  submitted: boolean
  score: number
  recommendationScore: number
  onSubmit: () => void
}) {
  const active = activeIndex === -1 ? total - 1 : activeIndex
  const answeredCount = questions.filter(q => questionAnswered(q, answers[q.id])).length
  const basicCompleted = answeredCount === total && total > 0

  return (
    <div
      className="flex items-center"
      style={{
        gap: 20,
      }}
    >
      {/* mini track */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flex: 1,
          minWidth: 0,
          height: 44,
          padding: '12px 16px',
          borderRadius: 18,
          background: 'rgba(var(--glass-rgb), 0.62)',
          border: '1px solid var(--color-border-glass)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0, height: 20 }}>
          {Array.from({ length: total }).map((_, index) => {
            const question = questions[index]
            const answer = question ? answers[question.id] : undefined
            const gradable = !!question && questionAutoGradable(question)
            const isCorrect = !!question && gradable && questionCorrect(question, answer)
            const isWrong = !!question && gradable && questionAnswered(question, answer) && !questionCorrect(question, answer)
            const isActive = index === active

            if (isActive) {
              return (
                <div key={index} style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isCorrect ? '#6EE7A0' : isWrong ? '#F48B91' : PURPLE.gradient,
                  color: isCorrect ? '#0B4020' : isWrong ? '#6B0007' : '#fff',
                  fontSize: 9, fontWeight: 800,
                  boxShadow: isCorrect
                    ? '0 2px 8px rgba(110,231,160,0.4)'
                    : isWrong
                      ? '0 2px 8px rgba(244,139,145,0.4)'
                      : '0 2px 10px rgba(99,84,207,0.35)',
                }}>
                  {index + 1}
                </div>
              )
            }

            const bg = isCorrect ? '#6EE7A0' : isWrong ? '#F48B91' : 'var(--color-border-strong)'
            return (
              <div key={index} style={{
                flex: 1, height: index < active ? 6 : 4,
                borderRadius: 3, background: bg, minWidth: 2,
                transition: 'height 0.2s ease',
              }} />
            )
          })}
        </div>
      </div>

      {/* right side */}
      {(() => {
        const isSubmitButton = basicCompleted && !submitted
        return (
          <motion.div
            whileHover={isSubmitButton ? { y: -1 } : undefined}
            whileTap={isSubmitButton ? { scale: 0.97 } : undefined}
            onClick={isSubmitButton ? onSubmit : undefined}
            role={isSubmitButton ? 'button' : undefined}
            className={isSubmitButton ? 'cursor-pointer' : undefined}
            style={{
              flexShrink: 0,
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 16px',
              borderRadius: 18,
              background: 'rgba(var(--glass-rgb), 0.62)',
              border: '1px solid var(--color-border-glass)',
              backdropFilter: 'blur(16px) saturate(180%)',
              WebkitBackdropFilter: 'blur(16px) saturate(180%)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {basicCompleted && submitted ? (
              <span style={{
                fontSize: 12, fontWeight: 800,
                color: score >= recommendationScore ? 'var(--color-accent)' : '#9A6000',
              }}>
                {score >= recommendationScore ? 'Сдано ✓' : `${score} / 100`}
              </span>
            ) : basicCompleted ? (
              <span
                className="flex items-center"
                style={{ gap: 7, color: 'var(--color-accent)', fontSize: 13, fontWeight: 750 }}
              >
                <Send size={13} />
                Сдать домашку
              </span>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--color-muted)', fontWeight: 600 }}>
                {answeredCount} / {total}
              </span>
            )}
          </motion.div>
        )
      })()}
    </div>
  )
}
