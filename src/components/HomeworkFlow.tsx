import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import {
  BookOpen, CheckCircle2, ChevronLeft, CircleAlert, Clock, GraduationCap,
  Lock, Send, Sparkles, Trophy, Image as ImageIcon, PenLine, X,
  ChevronUp, ChevronDown, Eye, MicOff, Home, RotateCcw, ArrowRight,
} from 'lucide-react'
import type { LessonHomework, HomeworkQuizQuestion } from '../data/lessonContent'
import type { PatternItem } from '../data/taskTypes'
import { normalizeTaskType } from '../data/taskTypeVisuals'
import { PURPLE, subjectTheme } from '../lib/theme'
import { useTheme } from '../store/themeStore'
import { supabase } from '../lib/supabase'
import { trackEvent } from '../lib/analytics'
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
import { useNavCollapse } from '../lib/useNavCollapse'
import { useT, t as tStatic } from '../lib/i18n'
import { bindShortWords, proseWrap, balancedWrap, splitLeadIn } from '../lib/typography'
import GrowTextarea, { growMinHeight } from './GrowTextarea'
import QuestionTable from './QuestionTable'
import WordBankSolver from './WordBankSolver'
import AudioPlayer from './AudioPlayer'
import VoiceRecorder from './VoiceRecorder'
import { sentenceTokens } from '../data/taskTypes'
import { addCards, deckOwner } from '../data/reviewDeck'
import { cardsFromHomework } from '../lib/reviewCapture'
import VocabIntro from './VocabIntro'
import TheorySheet from './TheorySheet'
import { useReadingVisible } from '../store/readingStore'
import { findLessonById, getLessonDetail } from '../data/lessonContent'
import HardStarLottie from './HardStarLottie'
import PartyPopperLottie from './PartyPopperLottie'

/**
 * Поле ответа в домашке обнимает текст: высота = содержимому, внутреннего
 * скролла нет. Соответствия и развёрнутые ответы уезжали под нижний край
 * поля — чтобы перечитать свой же ответ, приходилось скроллить внутри него.
 * Дно — четыре строки: пустое поле должно выглядеть как место под ответ, а не
 * как строчка. Уголок ручного ресайза убран (resize внутри GrowTextarea).
 */
const HW_ANSWER_MIN_H = growMinHeight(4, 14, 12, 1)

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
  const t = useT()
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
          {t(step.label)}
        </motion.p>
      </div>

      {/* Labels row */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--color-muted)', fontWeight: 600 }}>{t('Сложно')}</span>
        <span style={{ fontSize: 11, color: 'var(--color-muted)', fontWeight: 600 }}>{t('Легко')}</span>
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
  const t = useT()
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
              {context === 'hard' ? t('Работа отправлена') : t('Тест сдан')}
            </p>
            <h2 style={{ fontSize: 22, fontWeight: 760, color: 'var(--color-text)', lineHeight: 1.18, marginBottom: 8 }}>
              {context === 'hard'
                ? t('Отправлено на проверку!')
                : passed
                  ? `${t('Отлично')}, ${score} ${t('из 100!')}`
                  : `${t('Пока')} ${score} ${t('из 100 баллов')}`
              }
            </h2>
            {!(passed && context === 'basic') && (
              <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--color-text-2)' }}>
                {context === 'hard'
                  ? t('Преподаватель посмотрит твою работу и даст обратную связь. Обычно это занимает до 24 часов.')
                  : `${t('До открытия сложного уровня нужно')} ${recommendationScore}+. ${t('Можно вернуться к конспекту и попробовать снова.')}`
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
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', marginTop: 2 }}>{t('баллов')}</p>
            </div>
          )}
          {passed && context === 'basic' && (
            <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--color-text-2)', width: '100%', marginTop: -8 }}>
              {t('База закрыта уверенно. Открылся необязательный хард-уровень с разбором от преподавателя.')}
            </p>
          )}
        </div>

        {/* Emoji assessment section */}
        <div style={{ padding: '24px 28px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 760, color: 'var(--color-text)', marginBottom: 4 }}>
              {t('Оставь свою оценку')}
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>
              {t('Насколько понятным оказался материал? Это помогает нам улучшать уроки.')}
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
                {t('Позже')}
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
                {t('Приступить к харду')}
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
              {t('Продолжить')}
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
  /**
   * Задания, проверенные по кнопке «Проверить» — до сдачи всей домашки.
   *
   * Одиночный выбор проверялся мгновенно с самого начала, а всё, что печатается
   * (карточка, диктант, сборка предложения), молчало до конца домашки: ученик
   * узнавал про ошибку через двадцать заданий, когда вспомнить своё рассуждение
   * уже нельзя. Здесь лежат id заданий, по которым разбор открыт досрочно.
   */
  basicChecked: Record<string, true>
  /**
   * Задания, где ученик открыл ответ подсказкой. Считаются как незнание: балл
   * не начисляется, слово уезжает в колоду повторения.
   */
  basicHints: Record<string, true>
}

/**
 * Ответ на устное задание, когда записать голос негде (нет микрофона, ночь,
 * общий кабинет). Не пустая строка — иначе задание висит неотвеченным и не
 * даёт сдать домашку; отдельный маркер — чтобы отличать от настоящей записи.
 */
const NO_VOICE = '__novoice__'

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

const formatEstimatedTime = (minutes: number) => `~${minutes} ${tStatic('мин')}`

function getStorageKey(lessonId: string) {
  return `student-dashboard:homework:${lessonId}`
}

// ─── Части домашки ───────────────────────────────────────────────────────────
//
// Домашка языкового юнита — это семь заданий плюс десять словарных карточек, и
// сплошной простынёй она читается как сорок минут работы, которых у ученика
// между парами нет. Части — это не новая механика, а видимые точки остановки:
// ответы и так сохраняются на каждом клике, но пока список был неразмеченным,
// понять «докуда я дошёл и где можно закончить» было нельзя.
const SECTION_SIZE = 5

/** Заголовок части: номер, объём и сколько в ней уже сделано. */
function SectionHeader({ part, count, done, accent }: {
  part: number
  count: number
  done: number
  accent: string
}) {
  const t = useT()
  const complete = done === count
  return (
    <div className="flex items-center" style={{ gap: 10, padding: '2px 6px' }}>
      <span style={{ fontSize: 13, fontWeight: 800, color: accent, letterSpacing: 0.2 }}>
        {t('Часть')} {part}
      </span>
      <span style={{ flex: 1, height: 1, background: 'var(--color-border-soft)' }} />
      <span style={{
        fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
        color: complete ? 'var(--color-green-text)' : 'var(--color-muted)',
      }}>
        {done} / {count}
      </span>
    </div>
  )
}

/** Полоса-чекпоинт после пройденной части — явное разрешение остановиться. */
function SectionCheckpoint({ part }: { part: number }) {
  const t = useT()
  return (
    <div
      className="flex items-center"
      style={{
        gap: 10, padding: '12px 16px', borderRadius: 18,
        background: 'var(--color-green-soft)', border: '1px solid rgba(110,231,160,0.42)',
      }}
    >
      <CheckCircle2 size={16} style={{ color: 'var(--color-green-text)', flexShrink: 0 }} />
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)', lineHeight: 1.45 }}>
        {t('Часть')} {part} {t('пройдена. Ответы сохранены — можно закрыть и вернуться позже.')}
      </span>
    </div>
  )
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
// Ответ на «собрать предложение» хранится строкой (как и все ответы базового
// уровня), а решателю нужен массив. Плитки получены разбиением по пробелам, так
// что склейка через пробел разбирается обратно один в один.
const parseWords = (s: string | undefined) => (s ?? '').split(' ').filter(Boolean)
const joinWords = (w: string[]) => w.join(' ')

/** Множественный выбор — ответ хранится как отсортированный список id через запятую. */
function questionIsMulti(q: HomeworkQuizQuestion) {
  return qType(q) === 'multi'
}
const parseIds = (s: string | undefined) => (s ?? '').split(',').filter(Boolean).sort()
const joinIds = (ids: string[]) => [...ids].sort().join(',')
/** Переключить вариант в множественном выборе. */
function toggleId(current: string | undefined, id: string) {
  const set = parseIds(current)
  return joinIds(set.includes(id) ? set.filter(x => x !== id) : [...set, id])
}
/** Строки подстановочного дрилла, у которых есть эталон, — только они и спрашиваются. */
function drillItems(q: HomeworkQuizQuestion) {
  return (q.patternItems ?? []).filter(i => !!i.answer?.trim())
}

/** Ответы дрилла хранятся одной строкой-JSON «номер строки → что вписали». */
export function parseDrillAnswer(ans: string | undefined): Record<string, string> {
  if (!ans) return {}
  try {
    const parsed = JSON.parse(ans)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, string> : {}
  } catch { return {} }
}

/** Верна ли одна строка дрилла. Вынесено: нужно и проверке, и подсветке строк. */
export function drillRowCorrect(item: PatternItem, given: string | undefined) {
  const got = normAnswer(given ?? '')
  if (!got) return false
  return normAnswer(item.answer) === got || (item.alt ?? []).some(x => normAnswer(x) === got)
}

function questionAnswered(q: HomeworkQuizQuestion, ans: string | undefined) {
  if (questionIsChoice(q)) return !!ans
  // Дрилл считается отвеченным, только когда заполнены ВСЕ строки: наполовину
  // заполненный дрилл — это не ответ, а брошенная на середине отработка, и
  // засчитывать его как сделанное задание значит врать счётчику прогресса.
  if (qType(q) === 'pattern') {
    const items = drillItems(q)
    if (items.length === 0) return !!(ans && ans.trim())
    const given = parseDrillAnswer(ans)
    return items.every((_, i) => !!given[String(i)]?.trim())
  }
  return !!(ans && ans.trim())
}
function questionAutoGradable(q: HomeworkQuizQuestion) {
  if (questionIsMulti(q)) return q.options.length > 0 && (q.correctOptionIds?.length ?? 0) > 0
  if (questionIsChoice(q)) return q.options.length > 0 && !!q.correctOptionId
  const langTp = qType(q)
  // Языковые типы: проверяются машиной, если задан эталон.
  if (langTp === 'wordBank' || langTp === 'listenBank') return sentenceTokens(q.sentence ?? '').length >= 2
  if (langTp === 'listenType') return !!q.referenceAnswer?.trim()
  if (langTp === 'minimalPair') return !!q.pairA && !!q.pairB && !!q.correctPair
  if (langTp === 'flashcard') return !!q.back?.trim()
  if (langTp === 'pattern') return drillItems(q).length > 0
  // speaking / imageDescribe / imageCompare — только учителем.
  const tp = qType(q)
  if (tp === 'fill' || tp === 'extended') return !!q.referenceAnswer?.trim()
  if (tp === 'sequence') return (q.sequenceItems?.length ?? 0) >= 2
  // tableFill/matching/whiteboard — teacher review only, not auto-graded.
  return false
}
function questionCorrect(q: HomeworkQuizQuestion, ans: string | undefined) {
  if (!ans) return false
  if (questionIsMulti(q)) return joinIds(parseIds(ans)) === joinIds(q.correctOptionIds ?? [])
  if (questionIsChoice(q)) return ans === q.correctOptionId
  {
    const langTp = qType(q)
    if (langTp === 'wordBank' || langTp === 'listenBank') {
      if (!questionAutoGradable(q)) return false
      const want = sentenceTokens(q.sentence ?? '')
      const got = parseWords(ans)
      return got.length === want.length
        && got.every((w, i) => normAnswer(w) === normAnswer(want[i]))
    }
    if (langTp === 'listenType') {
      if (!questionAutoGradable(q)) return false
      const target = normAnswer(ans)
      return normAnswer(q.referenceAnswer!) === target
        || (q.altAnswers ?? []).some(a => normAnswer(a) === target)
    }
    if (langTp === 'minimalPair') return ans === q.correctPair
    if (langTp === 'flashcard') {
      if (!q.back?.trim()) return false
      // Перевод часто даётся с уточнением в скобках («идти, ехать») — принимаем
      // и полный вариант, и любую из перечисленных через запятую частей.
      const target = normAnswer(ans)
      const variants = q.back.split(/[,;]/).map(s => normAnswer(s.replace(/\([^)]*\)/g, '')))
      return normAnswer(q.back) === target || variants.some(v => v && v === target)
    }
    if (langTp === 'pattern') {
      const items = drillItems(q)
      if (items.length === 0) return false
      const given = parseDrillAnswer(ans)
      // Дрилл верен целиком: одна незакрытая форма — и конструкция не отработана.
      return items.every((item, i) => drillRowCorrect(item, given[String(i)]))
    }
  }
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

// ─── Формулировка вопроса ────────────────────────────────────────────────────
//
// «Прочитайте вслух: 아이, 우유, 나무» — инструкция и материал набраны одним
// кеглем и весом, и глаз не отличает, что делать, от того, с чем это делать.
// Инструкция уходит наверх мелкой строкой, материал остаётся крупным: читать
// его, а не задание. Если двоеточия нет — обычный заголовок, без выдумок.
function QuestionPrompt({ prompt }: { prompt: string }) {
  const parts = useMemo(() => splitLeadIn(prompt), [prompt])
  const bodyStyle: React.CSSProperties = {
    fontSize: 18, lineHeight: 1.35, fontWeight: 720, color: 'var(--color-text)', ...proseWrap,
  }
  if (!parts) return <h4 style={bodyStyle}>{bindShortWords(prompt)}</h4>
  return (
    <h4 style={bodyStyle}>
      <span style={{
        display: 'block', fontSize: 13, fontWeight: 650, lineHeight: 1.4,
        color: 'var(--color-text-2)', marginBottom: 3, ...balancedWrap,
      }}>
        {bindShortWords(parts.lead)}
      </span>
      {bindShortWords(parts.body)}
    </h4>
  )
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

// ─── Устный ответ ────────────────────────────────────────────────────────────
//
// Запись голоса плюс честный выход из неё. Микрофона может не быть вовсе (чужой
// компьютер, запрет в браузере), а домашка при этом не сдавалась: устное задание
// оставалось неотвеченным и держало кнопку «Сдать». Отказ пишется в ответ
// отдельным маркером — задание уходит преподавателю с пометкой «без записи», а
// не притворяется выполненным.
function VoiceAnswer({ value, maxSeconds, disabled, onChange }: {
  value: string | undefined
  maxSeconds: number
  disabled: boolean
  onChange: (v: string) => void
}) {
  const t = useT()
  const skipped = value === NO_VOICE

  if (skipped) {
    return (
      <div className="flex items-center flex-wrap" style={{
        gap: 10, padding: '12px 14px', borderRadius: 16,
        background: 'var(--color-yellow-soft)', border: '1px solid rgba(248,201,145,0.42)',
      }}>
        <MicOff size={16} style={{ color: 'var(--color-yellow-text)', flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)', lineHeight: 1.45 }}>
          {t('Записи не будет — преподаватель увидит пометку и спросит это на уроке.')}
        </span>
        {!disabled && (
          <button
            onClick={() => onChange('')}
            className="cursor-pointer"
            style={{
              marginLeft: 'auto', border: 'none', background: 'var(--color-bg-3)', borderRadius: 999,
              height: 30, padding: '0 14px', fontFamily: 'inherit', fontSize: 12.5,
              fontWeight: 700, color: 'var(--color-muted)',
            }}
          >
            {t('Всё-таки записать')}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ gap: 10 }}>
      <VoiceRecorder
        value={value || null}
        maxSeconds={maxSeconds}
        onChange={path => onChange(path ?? '')}
      />
      {!value && !disabled && (
        <button
          onClick={() => onChange(NO_VOICE)}
          className="flex items-center cursor-pointer"
          style={{
            alignSelf: 'flex-start', gap: 7, padding: '7px 14px', borderRadius: 999,
            border: '1px solid var(--color-border)', background: 'transparent',
            color: 'var(--color-muted)', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700,
          }}
        >
          <MicOff size={14} />
          {t('Не могу записать сейчас')}
        </button>
      )}
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
  // Unified table renderer, interactive mode (fill-in cells → inputs). Same look
  // as the trainer / tests; on the phone it gets the fit ↔ zoom toggle for free.
  const isDesktop = useIsDesktop()
  return <QuestionTable table={table} mobile={!isDesktop} interactive value={value} onChange={onChange} disabled={disabled} />
}

/**
 * Подстановочный дрилл: одна конструкция, несколько подстановок.
 *
 * Шаблон висит шапкой и не уезжает — в этом весь смысл упражнения: ученик
 * видит, что меняется ровно одно место, и к пятой строке форма ставится уже
 * рукой, а не рассуждением. Строки идут вместе, одним заданием, потому что
 * порознь этот эффект пропадает.
 *
 * Ответы уходят наружу одной строкой-JSON — так же, как у таблицы: хранилище
 * домашки держит на вопрос ровно одну строку.
 */
function DrillSolver({ pattern, gloss, items, value, disabled, showVerdict, accent, soft, onChange }: {
  pattern?: string
  gloss?: string
  items: PatternItem[]
  value: string | undefined
  disabled: boolean
  showVerdict: boolean
  accent: string
  soft: string
  onChange: (v: string) => void
}) {
  const t = useT()
  const given = parseDrillAnswer(value)
  const put = (i: number, v: string) => onChange(JSON.stringify({ ...given, [String(i)]: v }))

  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      {pattern && (
        <div style={{
          padding: '14px 16px', borderRadius: 16,
          background: soft, border: `1px solid ${accent}`,
        }}>
          <div style={{ fontSize: 19, fontWeight: 750, color: 'var(--color-text)', lineHeight: 1.35 }}>
            {pattern}
          </div>
          {gloss && (
            <div style={{ fontSize: 13, color: 'var(--color-text-2)', marginTop: 4 }}>{gloss}</div>
          )}
        </div>
      )}

      <div className="flex flex-col" style={{ gap: 8 }}>
        {items.map((item, i) => {
          const mine = given[String(i)] ?? ''
          const ok = drillRowCorrect(item, mine)
          return (
            <div key={i} className="flex flex-col" style={{ gap: 4 }}>
              <div className="flex items-center" style={{ gap: 10 }}>
                <span style={{
                  flexShrink: 0, minWidth: 78, padding: '7px 12px', borderRadius: 12,
                  background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)',
                  fontSize: 14, fontWeight: 700, color: 'var(--color-text)', textAlign: 'center',
                }}>
                  {item.cue}
                </span>
                <span style={{ color: 'var(--color-muted)', flexShrink: 0 }}>→</span>
                <input
                  value={mine}
                  onChange={e => put(i, e.target.value)}
                  disabled={disabled}
                  placeholder={t('Всё предложение целиком…')}
                  style={{
                    flex: 1, minWidth: 0, boxSizing: 'border-box', padding: '10px 14px',
                    borderRadius: 14, fontFamily: 'inherit', fontSize: 15,
                    color: 'var(--color-text)', background: 'var(--color-bg-input)', outline: 'none',
                    border: `1px solid ${showVerdict ? (ok ? '#6EE7A0' : '#F48B91') : 'var(--color-border)'}`,
                    opacity: disabled ? 0.85 : 1,
                  }}
                />
              </div>
              {/* Эталон и перевод — только после проверки: до неё они и есть ответ. */}
              {showVerdict && !ok && (
                <div style={{ fontSize: 13, color: 'var(--color-green-text)', fontWeight: 600, paddingLeft: 88 }}>
                  {item.answer}{item.gloss ? ` — ${item.gloss}` : ''}
                </div>
              )}
            </div>
          )
        })}
      </div>
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
    basicChecked: {},
    basicHints: {},
  }
}

export default function HomeworkFlow({
  lessonId,
  lessonTitle,
  subject,
  homework,
  onBack,
}: HomeworkFlowProps) {
  const t = useT()
  const isMobile = !useIsDesktop()
  const { dark } = useTheme()
  const palette = subjectTheme(subject, dark)
  const readingVisible = useReadingVisible(s => s.visible)
  const setHomeworkWidgetFeedback = useDashboard(s => s.setHomeworkWidgetFeedback)
  const clearHomeworkWidgetFeedback = useDashboard(s => s.clearHomeworkWidgetFeedback)
  const setAnswerFlight = useDashboard(s => s.setAnswerFlight)
  const setActivePage = useDashboard(s => s.setActivePage)
  const questionSectionRefs = useRef<Record<string, HTMLElement | null>>({})
  // Итоги сдачи — цель прокрутки из нижней полосы («Сдано ✓»).
  const summaryRef = useRef<HTMLElement | null>(null)
  // Same scroll-dock logic as the lesson page: when the pane scrolls, the
  // Back/title row docks onto the topbar line (a fixed twin), the topbar
  // auto-compacts, and the rest-state row fades out.
  const navCollapsed = useNavCollapse()
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
  const [showTheory, setShowTheory] = useState(false)
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
  // Словарь урока — это сами flashcard-задания домашки, показанные лицом и
  // оборотом до начала решения (см. VocabIntro). Отдельного списка слов у урока
  // нет, и заводить его значило бы держать одно слово в двух местах.
  const vocabWords = useMemo(
    () => basicQuestions.filter(q => qType(q) === 'flashcard' && !!q.back?.trim()),
    [basicQuestions],
  )
  /**
   * Индексы, с которых начинается новая часть домашки.
   *
   * Шаг ровный (SECTION_SIZE), но граница сдвигается вперёд, если попала внутрь
   * группы вопросов к одному отрывку: текст показывается один раз на группу, и
   * разрез оставил бы отрывок в предыдущей части, а вопросы к нему — в
   * следующей. Короткая домашка на части не режется вовсе.
   */
  const sectionStarts = useMemo(() => {
    if (basicQuestions.length <= SECTION_SIZE) return []
    const starts = [0]
    for (let i = SECTION_SIZE; i < basicQuestions.length; i += SECTION_SIZE) {
      let at = i
      while (
        at < basicQuestions.length
        && !!basicQuestions[at].passage
        && basicQuestions[at].passage === basicQuestions[at - 1]?.passage
      ) at++
      if (at < basicQuestions.length && at !== starts[starts.length - 1]) starts.push(at)
    }
    return starts
  }, [basicQuestions])

  // Конспект урока для шторки «Правило». Берётся из того же источника, что и
  // страница урока, поэтому второй копии текста не появляется. Урока может не
  // быть в каталоге (назначенное ДЗ вне курса) — тогда кнопки просто нет.
  const theoryParagraphs = useMemo(() => {
    const lesson = findLessonById(lessonId)
    return lesson ? getLessonDetail(lesson).paragraphs : []
  }, [lessonId])
  const answeredCount = basicQuestions.filter(question => questionAnswered(question, state.basicAnswers[question.id])).length
  const basicCompleted = basicQuestions.length > 0 && answeredCount === basicQuestions.length

  // Подсмотренное подсказкой не идёт в балл: ученик увидел ответ до того, как
  // вспомнил его сам, и засчитывать это как знание — врать в первую очередь ему.
  const basicCorrectCount = useMemo(() => {
    return basicQuestions.filter(question =>
      !state.basicHints[question.id] && questionCorrect(question, state.basicAnswers[question.id])
    ).length
  }, [basicQuestions, state.basicAnswers, state.basicHints])
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
  const basicPassed = basicScore >= homework.recommendationScore
  /**
   * Разбор итогов: задания, которые после сдачи нужно пересмотреть.
   *
   * Сюда попадает и неотвеченное: домашку можно сдать, не дойдя до конца, и
   * «просто пропустил» в итогах должно быть видно наравне с ошибкой.
   */
  const basicWrong = useMemo(
    () => basicQuestions
      .map((q, i) => ({ q, number: i + 1 }))
      .filter(({ q }) => questionAutoGradable(q)
        && (!!state.basicHints[q.id] || !questionCorrect(q, state.basicAnswers[q.id]))),
    [basicQuestions, state.basicAnswers, state.basicHints],
  )
  // Задания без автопроверки (устные, описание картинки, доска) — их смотрит
  // преподаватель, и в «ошибки» они не идут.
  const basicReviewCount = useMemo(
    () => basicQuestions.filter(q => !questionAutoGradable(q)).length,
    [basicQuestions],
  )
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
    trackEvent('homework_submit', { lesson_ref: ref, kind: level })
    if (level === 'basic') void captureBasicToDeck()
    useStudentData.getState().load()
  }

  /**
   * Сданная домашка → колода интервального повторения.
   *
   * Слова урока идут в колоду всегда, ошибки — только там, где ученик ответил и
   * ответил неверно. Пропущенное задание сознательно не считается ошибкой:
   * брошенная на середине домашка иначе высыпала бы в колоду десяток карточек
   * разом, и повторение из помощи превратилось бы в наказание за то, что ученик
   * не доделал. Что именно из ошибок доходит до колоды — в lib/reviewCapture.ts.
   *
   * Не блокирует сдачу: домашка уже сохранена, и упавшая колода не повод
   * показать ученику ошибку отправки.
   */
  async function captureBasicToDeck() {
    const wrongIds = new Set(
      basicQuestions
        .filter(q => {
          const ans = state.basicAnswers[q.id]
          // Подсмотренное подсказкой — тоже «не знал», и в колоду идёт наравне
          // с ошибкой: именно эти слова и нужно повторить.
          if (state.basicHints[q.id]) return true
          return questionAnswered(q, ans) && questionAutoGradable(q) && !questionCorrect(q, ans)
        })
        .map(q => q.id),
    )
    const cards = cardsFromHomework({ questions: basicQuestions, wrongIds, subject })
    if (cards.length === 0) return
    try {
      await addCards(deckOwner(), cards)
    } catch (e) {
      console.error('captureBasicToDeck:', e)
    }
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
    key: d.key, title: `${t('Задание')} ${i + 1}`, statement: d.statement, image: d.image,
  }))

  // Отправка решения по одной вкладке: дописываем НОВЫЙ круг в её историю,
  // сохраняя предыдущие решения и не трогая остальные задания / ревью учителя.
  async function submitTabSolution(key: string, payload: { answer: string; photos: string[]; board: string | null; voice: string | null }) {
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
    const multi = questionIsMulti(question)
    // Одиночный выбор фиксируется первым же нажатием; множественный можно
    // переключать, пока базовый уровень не отправлен.
    if (multi ? state.basicSubmitted : !!state.basicAnswers[questionId]) return

    const value = multi ? toggleId(state.basicAnswers[questionId], optionId) : optionId
    const nextAnswers = { ...state.basicAnswers, [questionId]: value }
    const correct = questionCorrect(question, value)
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
      lastTitle: correct ? t('Справился') : t('Пока мимо'),
      lastMessage: correct
        ? t('Ответ верный, задание засчитано и сохранено в прогрессе.')
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

  /**
   * Досрочная проверка одного задания.
   *
   * Разбор открывается там же, где ученик только что печатал ответ, — вместе с
   * эталоном и пояснением. Ответ после этого фиксируется: иначе «Проверить»
   * превращается в подбор до зелёной рамки.
   */
  const checkQuestion = (questionId: string) => {
    const question = basicQuestions.find(item => item.id === questionId)
    if (!question || state.basicSubmitted || state.basicChecked[questionId]) return
    const correct = questionCorrect(question, state.basicAnswers[questionId])
    playPop()
    vibrate(correct ? [10, 30, 10] : 22)
    setState(current => ({
      ...current,
      basicChecked: { ...current.basicChecked, [questionId]: true },
    }))
  }

  /**
   * Подсказка по заданию — ответ открывается прямо здесь, а не в словаре наверху.
   *
   * До этого единственным способом вспомнить слово было пролистать домашку к
   * блоку «Слова урока», где лежат все переводы разом: подглядывание ничего не
   * стоило и не оставляло следа. Здесь оно стоит балла (см. basicCorrectCount) и
   * отправляет слово в колоду повторения.
   */
  const revealHint = (questionId: string) => {
    if (state.basicSubmitted || state.basicHints[questionId]) return
    vibrate(14)
    setState(current => ({
      ...current,
      basicHints: { ...current.basicHints, [questionId]: true },
    }))
  }

  /** Текст подсказки/эталона — то же, с чем сверяется автопроверка. */
  const hintFor = (question: HomeworkQuizQuestion): string => {
    const tp = qType(question)
    if (tp === 'flashcard') return question.back?.trim() ?? ''
    if (tp === 'listenType') return question.referenceAnswer?.trim() ?? ''
    if (tp === 'wordBank' || tp === 'listenBank') return question.sentence?.trim() ?? ''
    if (tp === 'minimalPair') return (question.correctPair === 'B' ? question.pairB : question.pairA) ?? ''
    if (tp === 'fill' || tp === 'extended') return question.referenceAnswer?.trim() ?? ''
    return ''
  }

  /** Прокрутка к заданию — из итогов и из чипсов с номерами ошибок. */
  const jumpToQuestion = (questionId: string) => {
    questionSectionRefs.current[questionId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  /**
   * «Что дальше» — один и тот же набор действий в итогах наверху и в карточке
   * под последним заданием. Ученик, дочитавший разбор до конца, оказывается
   * именно там, и подниматься за кнопкой обратно наверх ему незачем.
   */
  const nextStepButtons = () => (
    <div className="flex flex-wrap items-center" style={{ gap: 10 }}>
      {basicWrong.length > 0 && (
        <motion.button
          whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
          onClick={() => jumpToQuestion(basicWrong[0].q.id)}
          className="flex items-center cursor-pointer"
          style={{
            gap: 8, padding: '12px 18px', borderRadius: 16,
            border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-input)',
            color: 'var(--color-text)', fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
          }}
        >
          <RotateCcw size={15} />
          {t('Разобрать ошибки')}
        </motion.button>
      )}
      {showHard && hardUnlocked && (
        <motion.button
          whileHover={{ y: -1 }} whileTap={{ scale: 0.99 }}
          onClick={() => { setState(current => ({ ...current, selectedLevel: 'hard' })); clearHomeworkWidgetFeedback() }}
          className="flex items-center cursor-pointer"
          style={{
            gap: 8, padding: '12px 18px', borderRadius: 16, border: 'none',
            background: PURPLE.gradient, color: '#fff', fontFamily: 'inherit',
            fontSize: 14, fontWeight: 700, boxShadow: '0 12px 28px rgba(99,84,207,0.2)',
          }}
        >
          {t('Открыть хард')}
          <ArrowRight size={15} />
        </motion.button>
      )}
      <motion.button
        whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
        onClick={onBack}
        className="flex items-center cursor-pointer"
        style={{
          gap: 8, padding: '12px 18px', borderRadius: 16,
          border: '1px solid var(--color-border-medium)', background: 'transparent',
          color: 'var(--color-text-2)', fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
        }}
      >
        <ChevronLeft size={15} />
        {t('Вернуться к уроку')}
      </motion.button>
      <motion.button
        whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
        onClick={() => { onBack(); setActivePage('home') }}
        className="flex items-center cursor-pointer"
        style={{
          gap: 8, padding: '12px 18px', borderRadius: 16,
          border: '1px solid var(--color-border-medium)', background: 'transparent',
          color: 'var(--color-text-2)', fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
        }}
      >
        <Home size={15} />
        {t('На главную')}
      </motion.button>
    </div>
  )

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

  /**
   * Кнопка «Правило» — вход в конспект, не выходя из заданий.
   *
   * Рисуется и в обычной строке шапки, и в приклеенной: ученик спотыкается на
   * середине списка, когда обычная строка уже уехала вверх, и именно там кнопка
   * нужнее всего. Нет конспекта — нет и кнопки, пустая шторка бесполезна.
   */
  const theoryButton = (docked: boolean) => theoryParagraphs.length > 0 && (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.96 }}
      onClick={() => setShowTheory(true)}
      className="flex items-center justify-center cursor-pointer flex-shrink-0"
      style={{
        gap: 6, padding: isMobile ? 9 : '9px 16px 9px 12px', borderRadius: 999,
        ...(docked ? dockGlass : { border: '1px solid var(--color-border-soft)', background: 'rgba(var(--glass-rgb), 0.96)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }),
        color: palette.text, fontSize: 14, fontWeight: 600,
        ...(docked ? { pointerEvents: 'auto' as const } : {}),
      }}
    >
      <BookOpen size={17} />
      {!isMobile && t('Правило')}
    </motion.button>
  )

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
            // Из модалки — сразу в итоги: разбор ошибок и «что дальше» там.
            if (!goToHard) {
              window.setTimeout(
                () => summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
                80,
              )
            }
          }}
        />
      )}
    </AnimatePresence>
    <TheorySheet
      open={showTheory}
      onClose={() => setShowTheory(false)}
      lessonTitle={lessonTitle}
      paragraphs={theoryParagraphs}
      accent={palette.accent}
      soft={palette.soft}
    />
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
          aria-label={t('Назад')}
          className="flex items-center justify-center cursor-pointer flex-shrink-0"
          style={{
            gap: 4, padding: isMobile ? 9 : '9px 16px 9px 12px', borderRadius: 999, border: '1px solid var(--color-border-soft)',
            background: 'rgba(var(--glass-rgb), 0.96)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
            color: 'var(--color-text)', fontSize: 14, fontWeight: 600,
          }}
        >
          <ChevronLeft size={18} />
          {!isMobile && t('Назад')}
        </motion.button>

        <h1
          className={`flex-1 min-w-0 flex items-center ${isMobile ? '' : 'text-center justify-center'}`}
          style={{ gap: 10, fontSize: isMobile ? 17 : 18, fontWeight: 700, color: 'var(--color-text)' }}
        >
          <span className="truncate">{homework.title}</span>
          {!isMobile && levelPill(false)}
        </h1>

        {theoryButton(false)}
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
              aria-label={t('Назад')}
              className="flex items-center justify-center cursor-pointer flex-shrink-0"
              style={{
                gap: 4, padding: isMobile ? 9 : '9px 16px 9px 12px', borderRadius: 999,
                ...dockGlass,
                color: 'var(--color-text)', fontSize: 14, fontWeight: 600, pointerEvents: 'auto',
              }}
            >
              <ChevronLeft size={18} />
              {!isMobile && t('Назад')}
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
                  {t('Домашка по теме')}&nbsp;«
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
              {!isMobile && levelPill(true)}
            </div>

            {theoryButton(true)}

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
              <span style={{ fontSize: 13, fontWeight: 700 }}>{t('Структура домашки')}</span>
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
            <InfoRow label={t('Дедлайн')} value={basicLevel.dueDate} />
            <InfoRow label={t('Время')} value={selectedEstimatedTime} />
            <InfoRow label={t('Формат')} value={selectedLevel === 'basic' ? t('Тест с автопроверкой') : t('Проверка преподавателем')} />
            <InfoRow
              label={t('% справившихся')}
              value={`${selectedLevel === 'basic' ? basicLevel.peerCompletionRate : hardLevel.peerCompletionRate}%`}
            />
            {selectedLevel === 'basic' && basicLevel.peerAverageScore != null && (
              <InfoRow label={t('Средний балл')} value={`${basicLevel.peerAverageScore}`} />
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
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{t('Как это работает')}</p>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--color-muted)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 700, color: 'var(--color-text)' }}>
                <Clock size={13} />
                {t('Обычно занимает')} {selectedEstimatedTime}.
              </span>{' '}
              {t('Базовый уровень обязателен и проверяется сразу. Если набираешь')} {homework.recommendationScore}+ {t('баллов, открывается необязательный хард-уровень с проверкой преподавателем.')}
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
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-accent)' }}>{t('Что можно приложить')}</p>
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

              {basicCompleted && !state.basicSubmitted && (
                <div
                  className="flex flex-wrap items-center justify-between"
                  style={{
                    gap: 14, padding: 18, borderRadius: 24,
                    background: 'var(--color-bg-input)',
                    border: '1px solid var(--color-border-medium)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
                  }}
                >
                  <div className="flex items-start" style={{ gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(0,0,0,0.05)', color: 'var(--color-muted)',
                    }}>
                      <CheckCircle2 size={20} />
                    </div>
                    <div>
                      <p style={{ fontSize: 17, fontWeight: 760, color: 'var(--color-text)', marginBottom: 4 }}>
                        {t('Все вопросы отвечены!')}
                      </p>
                      <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--color-muted)' }}>
                        {t('Проверь ответы и сдай домашку, чтобы зафиксировать результат.')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center flex-wrap" style={{ gap: 10 }}>
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
                      {t('Сдать домашку')}
                    </motion.button>
                  </div>
                </div>
              )}

              {/* Итоги сдачи. До этого сданная домашка оставляла ученика в том же
                  списке заданий: балл был, а «сколько ошибок, каких именно и что
                  делать дальше» — нет, и он просто закрывал вкладку. */}
              {state.basicSubmitted && (
                <section
                  ref={summaryRef}
                  className="flex flex-col"
                  style={{
                    gap: 16, padding: 20, borderRadius: 26,
                    background: basicPassed ? 'var(--color-purple-soft)' : 'var(--color-yellow-soft)',
                    border: `1px solid ${basicPassed ? 'rgba(99,84,207,0.18)' : 'rgba(248,201,145,0.42)'}`,
                  }}
                >
                  <div className="flex flex-wrap items-start justify-between" style={{ gap: 14 }}>
                    <div className="flex items-start" style={{ gap: 12, flex: '1 1 260px', minWidth: 0 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: basicPassed ? 'rgba(99,84,207,0.12)' : 'rgba(248,201,145,0.26)',
                        color: basicPassed ? 'var(--color-accent)' : 'var(--color-yellow-text)',
                      }}>
                        {basicPassed ? <Trophy size={20} /> : <CircleAlert size={20} />}
                      </div>
                      <div className="min-w-0">
                        <p style={{ fontSize: 17, fontWeight: 760, color: 'var(--color-text)', marginBottom: 4 }}>
                          {t('Домашка сдана')}
                        </p>
                        <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--color-muted)' }}>
                          {basicPassed
                            ? (showHard
                              ? t('База закрыта уверенно. Доступен необязательный хард-уровень с разбором от преподавателя.')
                              : t('База закрыта уверенно.'))
                            : `${t('До открытия харда нужен результат')} ${homework.recommendationScore}+. ${t('Можно вернуться к конспекту и попробовать снова.')}`
                          }
                        </p>
                        {state.selfAssessmentValue !== null && (
                          <div className="flex items-center" style={{ gap: 8, marginTop: 8 }}>
                            <span style={{ fontSize: 20 }}>{EMOJI_STEPS[state.selfAssessmentValue].emoji}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-muted)' }}>
                              {t('Самооценка:')} {t(EMOJI_STEPS[state.selfAssessmentValue].label)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <span style={{
                        fontSize: 38, fontWeight: 760, lineHeight: 1,
                        color: basicPassed ? 'var(--color-accent)' : 'var(--color-yellow-text)',
                      }}>{basicScore}</span>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', marginTop: 2 }}>
                        {t('из 100')}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap" style={{ gap: 10 }}>
                    <MetricPill label={t('Верно')} value={`${basicCorrectCount}`} accent />
                    <MetricPill label={t('Ошибок')} value={`${basicWrong.length}`} />
                    {basicReviewCount > 0 && (
                      <MetricPill label={t('У преподавателя')} value={`${basicReviewCount}`} />
                    )}
                  </div>

                  {/* Номера заданий с ошибками — сразу и список, и навигация. */}
                  {basicWrong.length > 0 && (
                    <div className="flex flex-wrap items-center" style={{ gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-2)' }}>
                        {t('Разобрать')}:
                      </span>
                      {basicWrong.map(({ q, number }) => (
                        <button
                          key={q.id}
                          onClick={() => jumpToQuestion(q.id)}
                          className="cursor-pointer"
                          style={{
                            minWidth: 34, height: 30, padding: '0 10px', borderRadius: 999,
                            border: '1px solid rgba(244,139,145,0.5)', background: 'var(--color-red-soft)',
                            color: 'var(--color-red-text)', fontFamily: 'inherit',
                            fontSize: 13, fontWeight: 750,
                          }}
                        >
                          {number}
                        </button>
                      ))}
                      <span style={{ fontSize: 12.5, color: 'var(--color-muted)', lineHeight: 1.45 }}>
                        · {t('слова из ошибок уже в колоде повторения')}
                      </span>
                    </div>
                  )}

                  {nextStepButtons()}
                </section>
              )}

              {/* Знакомство со словами — до заданий, а не после них. Карточки
                  внизу домашки остаются проверкой; здесь слово вводится. */}
              {/* Открыт, пока идёт знакомство, и свёрнут, как только начаты
                  задания: открытый список со всеми переводами превращал домашку
                  в переписывание — ученик листал наверх за каждым словом. Теперь
                  подсказка живёт в самом задании и стоит балла. */}
              <VocabIntro
                words={vocabWords}
                accent={palette.accent}
                soft={palette.soft}
                defaultOpen={!state.basicSubmitted && answeredCount === 0}
                started={answeredCount > 0}
              />

              {/* Возврат на место. Ответы переживают закрытие вкладки, но ученик
                  всё равно приземлялся в начало списка и искал, докуда дошёл. */}
              {!state.basicSubmitted && answeredCount > 0 && !basicCompleted && (
                <button
                  onClick={() => {
                    const next = basicQuestions.find(q => !questionAnswered(q, state.basicAnswers[q.id]))
                    questionSectionRefs.current[next?.id ?? '']?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }}
                  className="flex items-center cursor-pointer"
                  style={{
                    gap: 10, padding: '13px 18px', borderRadius: 18, textAlign: 'left',
                    border: `1px solid ${palette.accent}`, background: palette.soft,
                    color: palette.text, fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                  }}
                >
                  <Clock size={16} style={{ flexShrink: 0 }} />
                  {t('Продолжить с задания')} {basicQuestions.findIndex(q => !questionAnswered(q, state.basicAnswers[q.id])) + 1}
                  <span style={{ fontWeight: 500, opacity: 0.75 }}>
                    · {answeredCount} {t('из')} {basicQuestions.length} {t('сделано')}
                  </span>
                </button>
              )}

              {basicQuestions.map((question, index) => {
                const selectedAnswer = state.basicAnswers[question.id]
                const isChoice = questionIsChoice(question)
                const answered = questionAnswered(question, selectedAnswer)
                const autoGradable = questionAutoGradable(question)
                // Одиночный выбор проверяется самим нажатием (ответ фиксируется
                // сразу), всё остальное — кнопкой «Проверить» или сдачей домашки.
                const singleChoice = isChoice && !questionIsMulti(question)
                const hinted = !!state.basicHints[question.id]
                const checked = !!state.basicChecked[question.id]
                  || (singleChoice && answered)
                  || state.basicSubmitted
                // Пока задание не проверено — поле остаётся редактируемым.
                const locked = checked
                const graded = answered && checked
                const isCorrect = !hinted && questionCorrect(question, selectedAnswer)
                const showVerdict = graded && autoGradable && !hinted
                const showReview = graded && !autoGradable
                // «Проверить» появляется, когда есть что проверять: ответ введён,
                // машина умеет его сверить, разбор ещё не открыт.
                // После подсказки проверять нечего — ответ уже открыт; поле при
                // этом остаётся живым, чтобы слово можно было вписать рукой.
                const canCheck = autoGradable && answered && !checked && !hinted && !state.basicSubmitted
                const hintText = hintFor(question)
                const canHint = !!hintText && autoGradable && !hinted && !checked && !state.basicSubmitted

                // Разметка частей. `partAt` — порядковый номер части, если этот
                // вопрос её открывает; `partEnd` — индекс последнего вопроса
                // части, по нему решается, ставить ли чекпоинт.
                const partIdx = sectionStarts.length
                  ? sectionStarts.filter(s => s <= index).length - 1
                  : -1
                const partStart = partIdx >= 0 ? sectionStarts[partIdx] : 0
                const partEnd = partIdx >= 0
                  ? (sectionStarts[partIdx + 1] ?? basicQuestions.length) - 1
                  : basicQuestions.length - 1
                const partQuestions = basicQuestions.slice(partStart, partEnd + 1)
                const partDone = partQuestions.filter(q => questionAnswered(q, state.basicAnswers[q.id])).length
                const opensPart = partIdx >= 0 && index === partStart
                const closesPart = partIdx >= 0 && index === partEnd
                // Чекпоинт только между частями и только до сдачи: после сдачи
                // ученик читает разбор, и «можно вернуться позже» ему уже врёт.
                const showCheckpoint = closesPart
                  && partDone === partQuestions.length
                  && partIdx < sectionStarts.length - 1
                  && !state.basicSubmitted

                return (
                  <React.Fragment key={question.id}>
                  {opensPart && (
                    <SectionHeader
                      part={partIdx + 1}
                      count={partQuestions.length}
                      done={partDone}
                      accent={palette.accent}
                    />
                  )}
                  <section
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
                    {/* Текст для чтения. К одному отрывку обычно идёт несколько
                        вопросов подряд — показываем его один раз на группу, иначе
                        экран занят повторами одного и того же объявления. */}
                    {question.passage && question.passage !== basicQuestions[index - 1]?.passage && (
                      <div style={{
                        padding: '14px 16px', borderRadius: 16, marginBottom: 4,
                        background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)',
                      }}>
                        {question.passageTitle && (
                          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.3, textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: 8 }}>
                            {question.passageTitle}
                          </p>
                        )}
                        <div style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--color-text)', whiteSpace: 'pre-wrap', ...proseWrap }}>
                          {bindShortWords(question.passage)}
                        </div>
                        {/* Перевод — только после ответа, иначе читать оригинал незачем. */}
                        {question.passageTranslation && state.basicSubmitted && (
                          <details style={{ marginTop: 10 }}>
                            <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--color-accent)' }}>
                              {t('Перевод')}
                            </summary>
                            <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-2)', marginTop: 6, whiteSpace: 'pre-wrap' }}>
                              {question.passageTranslation}
                            </div>
                          </details>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-start justify-between" style={{ gap: 12 }}>
                      {/* Колонка вопроса тянется и сжимается, плашка справа —
                          нет: без этого длинная формулировка выталкивала плашку
                          на свою строку, а короткая оставляла посреди карточки
                          дыру. */}
                      <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent)', marginBottom: 6 }}>
                          {t('Вопрос')} {index + 1}
                        </p>
                        {/* У словарной карточки формулировка вопроса — это само
                            слово (оно же подпись задания в редакторе), а слово
                            печатается ещё раз на карточке. Второй раз не нужен.
                            Сверяем по началу строки, а не по равенству: в
                            подписи задания к слову приписано чтение — «우유
                            (uyu)», — и точное сравнение с ним не сходится. */}
                        {!(qType(question) === 'flashcard' && !!question.front && question.prompt.startsWith(question.front)) && (
                          <QuestionPrompt prompt={question.prompt} />
                        )}
                        {/* Картинка условия. У словарной карточки она рисуется
                            на самой карточке (ниже), поэтому здесь пропускается —
                            иначе одно и то же изображение показывалось дважды. */}
                        {question.image && qType(question) !== 'flashcard' && (
                          <img
                            src={question.image}
                            alt=""
                            style={{
                              display: 'block', marginTop: 10, borderRadius: 14,
                              width: `${question.imageSize ?? 100}%`, maxWidth: '100%',
                              border: '1px solid var(--color-border)', background: '#fff',
                            }}
                          />
                        )}
                      </div>

                      {hinted && (
                        <div
                          className="flex items-start"
                          style={{
                            gap: 8, padding: '9px 12px', borderRadius: 14,
                            background: 'var(--color-yellow-soft)', color: 'var(--color-yellow-text)',
                            fontSize: 13, fontWeight: 700, maxWidth: 220, lineHeight: 1.4,
                            flexShrink: 0,
                          }}
                        >
                          <Eye size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                          <span style={balancedWrap}>{t('Подсказка')}</span>
                        </div>
                      )}
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
                            flexShrink: 0,
                          }}
                        >
                          <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                          <span style={balancedWrap}>
                            {isCorrect ? t('Верно') : t('Неверно')}
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
                            flexShrink: 0,
                          }}
                        >
                          <Send size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                          {/* «На проверке у / преподавателя» с одиноким словом
                              во второй строке — приклеиваем предлог и делим
                              строки поровну. */}
                          <span style={balancedWrap}>{bindShortWords(t('На проверке у преподавателя'))}</span>
                        </div>
                      )}
                    </div>

                    {isChoice ? (
                    <div className="grid" style={{ gap: 10 }}>
                      {question.options.map(option => {
                        const multi = questionIsMulti(question)
                        const active = multi
                          ? parseIds(selectedAnswer).includes(option.id)
                          : selectedAnswer === option.id
                        const correct = multi
                          ? (question.correctOptionIds ?? []).includes(option.id)
                          : option.id === question.correctOptionId
                        // Разбор верных/неверных у множественного выбора — только
                        // по «Проверить» или после сдачи: иначе он подсвечивал бы
                        // ответ на лету, пока набирается комбинация.
                        const reveal = multi ? checked : answered
                        const wrongSelected = reveal && active && !correct
                        const correctSelected = reveal && correct
                        return (
                          <button
                            key={option.id}
                            disabled={multi ? locked : answered}
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
                              ...proseWrap,
                            }}
                          >
                            {bindShortWords(option.text)}
                          </button>
                        )
                      })}
                    </div>
                    ) : qType(question) === 'sequence' && (question.sequenceItems?.length ?? 0) > 0 ? (
                    <SequenceSolver
                      items={question.sequenceItems!}
                      value={selectedAnswer}
                      disabled={locked}
                      showVerdict={showVerdict}
                      onChange={v => setFreeAnswer(question.id, v)}
                    />
                    /* Подстановочный дрилл — шаблон сверху, строки замен ниже. */
                    ) : qType(question) === 'pattern' && drillItems(question).length > 0 ? (
                    <DrillSolver
                      pattern={question.pattern}
                      gloss={question.patternGloss}
                      items={drillItems(question)}
                      value={selectedAnswer}
                      disabled={locked}
                      showVerdict={showVerdict}
                      accent={palette.accent}
                      soft={palette.soft}
                      onChange={v => setFreeAnswer(question.id, v)}
                    />

                    ) : qType(question) === 'tableFill' && question.table ? (
                    <TableSolver
                      table={question.table}
                      value={selectedAnswer}
                      disabled={locked}
                      onChange={v => setFreeAnswer(question.id, v)}
                    />

                    /* ── языковые задания ── */

                    /* Собрать предложение из плиток. listenBank — то же самое,
                       но сверху плеер: сначала слушаешь, потом собираешь. */
                    ) : (qType(question) === 'wordBank' || qType(question) === 'listenBank')
                        && (question.sentence ?? '').trim() ? (
                    <div className="flex flex-col" style={{ gap: 12 }}>
                      {qType(question) === 'listenBank' && (
                        <AudioPlayer
                          audioUrl={question.audioUrl}
                          ttsText={question.ttsText || question.sentence}
                          ttsVoice={question.ttsVoice}
                          allowSlow={question.allowSlow}
                          lang={question.lang}
                        />
                      )}
                      <WordBankSolver
                        tokens={sentenceTokens(question.sentence!)}
                        distractors={question.distractors ?? []}
                        value={parseWords(selectedAnswer)}
                        disabled={locked}
                        onChange={words => setFreeAnswer(question.id, joinWords(words))}
                      />
                    </div>

                    /* Диктант: слушаешь и печатаешь. */
                    ) : qType(question) === 'listenType' ? (
                    <div className="flex flex-col" style={{ gap: 12 }}>
                      <AudioPlayer
                        audioUrl={question.audioUrl}
                        ttsText={question.ttsText || question.referenceAnswer}
                        ttsVoice={question.ttsVoice}
                        allowSlow={question.allowSlow}
                        lang={question.lang}
                      />
                      <GrowTextarea
                        value={selectedAnswer ?? ''}
                        onChange={v => setFreeAnswer(question.id, v)}
                        disabled={locked}
                        minHeight={HW_ANSWER_MIN_H}
                        placeholder={t('Запиши, что услышал…')}
                        style={{
                          width: '100%', boxSizing: 'border-box', padding: '12px 14px',
                          borderRadius: 16, fontFamily: 'inherit', fontSize: 14,
                          color: 'var(--color-text)', background: 'var(--color-bg-input)', outline: 'none',
                          border: `1px solid ${showVerdict ? (isCorrect ? '#6EE7A0' : '#F48B91') : 'var(--color-border)'}`,
                          opacity: locked ? 0.85 : 1,
                        }}
                      />
                    </div>

                    /* Похожие звуки: прозвучал один из двух — какой? */
                    ) : qType(question) === 'minimalPair' && question.pairA && question.pairB ? (
                    <div className="flex flex-col" style={{ gap: 12 }}>
                      <AudioPlayer
                        audioUrl={question.audioUrl}
                        ttsText={question.ttsText || (question.correctPair === 'B' ? question.pairB : question.pairA)}
                        ttsVoice={question.ttsVoice}
                        allowSlow={question.allowSlow}
                        lang={question.lang}
                      />
                      <div className="grid" style={{ gap: 10, gridTemplateColumns: '1fr 1fr' }}>
                        {(['A', 'B'] as const).map(side => {
                          const text = side === 'A' ? question.pairA! : question.pairB!
                          const active = selectedAnswer === side
                          const right = question.correctPair === side
                          return (
                            <button
                              key={side}
                              disabled={locked}
                              onClick={() => setFreeAnswer(question.id, side)}
                              className="cursor-pointer"
                              style={{
                                padding: '16px 14px', borderRadius: 18, fontFamily: 'inherit',
                                fontSize: 17, fontWeight: 700, color: 'var(--color-text)',
                                border: `1px solid ${
                                  showVerdict && right ? '#6EE7A0'
                                    : showVerdict && active ? '#F48B91'
                                    : active ? 'rgba(99,84,207,0.38)' : 'var(--color-border)'
                                }`,
                                background: showVerdict && right ? 'var(--color-green-soft)'
                                  : showVerdict && active ? 'var(--color-red-soft)'
                                  : active ? 'var(--color-purple-soft)' : 'var(--color-bg-input)',
                              }}
                            >
                              {text}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    /* Словарная карточка: показываем лицо, ученик вписывает перевод.
                       Без этой ветки карточка проваливалась в общий текстареа с
                       подписью «развёрнутый ответ» — то есть выглядела как эссе. */
                    ) : qType(question) === 'flashcard' ? (
                    <div className="flex flex-col" style={{ gap: 10 }}>
                      <div style={{
                        padding: '18px 16px', borderRadius: 16, textAlign: 'center',
                        background: 'var(--color-teal-pill-bg)', color: 'var(--color-teal-pill-text)',
                        fontSize: 22, fontWeight: 700, lineHeight: 1.3,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                      }}>
                        {/* Картинка на лицевой стороне: слово вспоминается от
                            предмета, а не от русского перевода — перевод ученик
                            как раз и вписывает. */}
                        {question.image && (
                          <img
                            src={question.image}
                            alt=""
                            style={{ display: 'block', width: 148, maxWidth: '70%', borderRadius: 12, background: '#fff' }}
                          />
                        )}
                        <span style={proseWrap}>{question.front || bindShortWords(question.prompt)}</span>
                        {/* Чтение — по тумблеру из блока «Слова урока»: пока
                            ученик не читает письмо, оно опора, дальше помеха. */}
                        {readingVisible && question.reading && (
                          <span style={{ fontSize: 14, fontWeight: 600, opacity: 0.75, marginTop: -6 }}>
                            {question.reading}
                          </span>
                        )}
                      </div>
                      <GrowTextarea
                        value={selectedAnswer ?? ''}
                        onChange={v => setFreeAnswer(question.id, v)}
                        disabled={locked}
                        minHeight={HW_ANSWER_MIN_H}
                        placeholder={t('Перевод…')}
                        style={{
                          width: '100%', boxSizing: 'border-box', padding: '12px 14px',
                          borderRadius: 16, fontFamily: 'inherit', fontSize: 14,
                          color: 'var(--color-text)', background: 'var(--color-bg-input)', outline: 'none',
                          border: `1px solid ${showVerdict ? (isCorrect ? '#6EE7A0' : '#F48B91') : 'var(--color-border)'}`,
                          opacity: locked ? 0.85 : 1,
                        }}
                      />
                      {showVerdict && !isCorrect && question.back && (
                        <div style={{ fontSize: 13, color: 'var(--color-green-text)', fontWeight: 600 }}>
                          {t('Правильно')}: {question.back}
                        </div>
                      )}
                    </div>

                    /* Устный ответ: запись голоса. Проверяет учитель. */
                    ) : qType(question) === 'speaking' ? (
                    <VoiceAnswer
                      value={selectedAnswer}
                      maxSeconds={question.responseSeconds ?? 120}
                      disabled={state.basicSubmitted}
                      onChange={v => setFreeAnswer(question.id, v)}
                    />

                    /* Описать картинку — письменно или голосом. */
                    ) : (qType(question) === 'imageDescribe' || qType(question) === 'imageCompare') ? (
                    <div className="flex flex-col" style={{ gap: 12 }}>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {(question.images ?? []).filter(Boolean).map((src, ii) => (
                          <img
                            key={ii} src={src} alt=""
                            style={{
                              maxWidth: (question.images ?? []).length > 1 ? 'calc(50% - 5px)' : '100%',
                              borderRadius: 16, border: '1px solid var(--color-border)',
                            }}
                          />
                        ))}
                      </div>
                      {question.responseMode === 'speak' ? (
                        <VoiceAnswer
                          value={selectedAnswer}
                          maxSeconds={question.responseSeconds ?? 90}
                          disabled={state.basicSubmitted}
                          onChange={v => setFreeAnswer(question.id, v)}
                        />
                      ) : (
                        <GrowTextarea
                          value={selectedAnswer ?? ''}
                          onChange={v => setFreeAnswer(question.id, v)}
                          disabled={locked}
                          minHeight={HW_ANSWER_MIN_H}
                          placeholder={t('Опиши, что видишь…')}
                          style={{
                            width: '100%', boxSizing: 'border-box', padding: '12px 14px',
                            borderRadius: 16, fontFamily: 'inherit',
                            fontSize: 14, color: 'var(--color-text)',
                            background: 'var(--color-bg-input)', outline: 'none',
                            border: '1px solid var(--color-border)',
                            opacity: locked ? 0.85 : 1,
                          }}
                        />
                      )}
                    </div>
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
                      <GrowTextarea
                        value={selectedAnswer ?? ''}
                        onChange={v => setFreeAnswer(question.id, v)}
                        disabled={locked}
                        minHeight={HW_ANSWER_MIN_H}
                        placeholder={
                          qType(question) === 'fill' ? t('Впиши слово или фразу…')
                            : qType(question) === 'whiteboard' ? t('Опиши решение (рисунок на доске приложишь учителю)…')
                            : qType(question) === 'matching' ? t('Запиши соответствия…')
                            : t('Развёрнутый ответ…')
                        }
                        style={{
                          width: '100%', boxSizing: 'border-box', padding: '12px 14px',
                          borderRadius: 16, fontFamily: 'inherit',
                          fontSize: 14, color: 'var(--color-text)',
                          background: 'var(--color-bg-input)', outline: 'none',
                          border: `1px solid ${showVerdict ? (isCorrect ? '#6EE7A0' : '#F48B91') : 'var(--color-border)'}`,
                          opacity: locked ? 0.85 : 1,
                        }}
                      />
                    </div>
                    )}

                    {/* Подсказка — ответ здесь же, не в словаре наверху. */}
                    {hinted && !!hintText && (
                      <div className="flex items-center" style={{
                        gap: 10, padding: '11px 14px', borderRadius: 16,
                        background: 'var(--color-yellow-soft)', border: '1px solid rgba(248,201,145,0.42)',
                      }}>
                        <Eye size={15} style={{ color: 'var(--color-yellow-text)', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--color-text-2)' }}>
                          {t('Ответ')}: <b style={{ color: 'var(--color-text)' }}>{hintText}</b>
                          <span style={{ color: 'var(--color-muted)' }}> · {t('балл за это задание не начисляется, слово уйдёт на повторение')}</span>
                        </span>
                      </div>
                    )}

                    {/* Проверка на месте: разбор сразу после ответа, а не через
                        двадцать заданий, когда своё рассуждение уже не вспомнить. */}
                    {(canCheck || canHint) && (
                      <div className="flex items-center flex-wrap" style={{ gap: 10 }}>
                        {canCheck && (
                          <motion.button
                            whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
                            onClick={() => checkQuestion(question.id)}
                            className="flex items-center cursor-pointer"
                            style={{
                              gap: 8, padding: '10px 18px', borderRadius: 999, border: 'none',
                              background: palette.accent, color: '#fff',
                              fontFamily: 'inherit', fontSize: 13.5, fontWeight: 750,
                            }}
                          >
                            <CheckCircle2 size={15} />
                            {t('Проверить')}
                          </motion.button>
                        )}
                        {canHint && (
                          <button
                            onClick={() => revealHint(question.id)}
                            className="flex items-center cursor-pointer"
                            style={{
                              gap: 7, padding: '9px 15px', borderRadius: 999,
                              border: '1px solid var(--color-border)', background: 'transparent',
                              color: 'var(--color-muted)', fontFamily: 'inherit',
                              fontSize: 12.5, fontWeight: 700,
                            }}
                          >
                            <Eye size={14} />
                            {t('Подсказка')}
                          </button>
                        )}
                      </div>
                    )}

                    {showVerdict && !isChoice && !isCorrect && question.referenceAnswer && (
                      <div style={{ padding: '12px 14px', borderRadius: 16, background: 'var(--color-green-soft)', border: '1px solid rgba(110,231,160,0.38)' }}>
                        <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-green-text)', marginBottom: 4 }}>{t('Эталонный ответ')}</p>
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
                          {isCorrect ? t('Справился с заданием') : t('Разберём ошибку')}
                        </p>
                        <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--color-text-2)' }}>
                          {isCorrect
                            ? `${t('Пояснение:')} ${question.explanation}`
                            : question.explanation}
                        </p>
                      </div>
                    )}
                  </section>
                  {showCheckpoint && <SectionCheckpoint part={partIdx + 1} />}
                  </React.Fragment>
                )
              })}

              {/* Конец разбора — тупик, если не сказать, куда идти дальше. */}
              {state.basicSubmitted && (
                <section
                  className="flex flex-col"
                  style={{
                    gap: 14, padding: 20, borderRadius: 26,
                    background: 'rgba(var(--glass-rgb), 0.96)',
                    border: '1px solid var(--color-border-soft)',
                  }}
                >
                  <div>
                    <p style={{ fontSize: 16, fontWeight: 760, color: 'var(--color-text)', marginBottom: 4 }}>
                      {t('Что дальше')}
                    </p>
                    <p style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--color-muted)' }}>
                      {basicWrong.length > 0
                        ? `${t('Ошибок:')} ${basicWrong.length}. ${t('Их слова уже в колоде повторения — вернуться к ним можно в тренажёре.')}`
                        : t('Ошибок нет. Домашка закрыта — результат уже у преподавателя.')
                      }
                    </p>
                  </div>
                  {nextStepButtons()}
                </section>
              )}

              <motion.div
                initial={false}
                animate={isMobile
                  ? { bottom: navCollapsed ? 92 : 104, scale: navCollapsed ? 0.94 : 1 }
                  : { bottom: 24, scale: 1 }}
                transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                style={{
                  position: 'fixed',
                  // env() safe-area is folded into the animated `bottom` via marginBottom
                  // so framer can tween the numeric part while the inset stays applied.
                  marginBottom: isMobile ? 'env(safe-area-inset-bottom, 0px)' : 0,
                  left: '50%', x: '-50%', transformOrigin: 'bottom center',
                  zIndex: 100, width: 'min(560px, calc(100vw - 48px))',
                }}
              >
                <BottomProgressBar
                  total={basicQuestions.length}
                  answers={state.basicAnswers}
                  questions={basicQuestions}
                  activeIndex={basicQuestions.findIndex(q => !questionAnswered(q, state.basicAnswers[q.id]))}
                  submitted={state.basicSubmitted}
                  checked={state.basicChecked}
                  hints={state.basicHints}
                  score={basicScore}
                  recommendationScore={homework.recommendationScore}
                  onSubmit={() => { submitToSupabase('basic', basicScore, ''); setShowResultModal('basic') }}
                  onShowSummary={() => summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                />
              </motion.div>
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
                    {t('Сначала закрываем базовый уровень')}
                  </h4>
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--color-muted)', maxWidth: 520 }}>
                    {t('Хард открывается только после уверенного результата на тесте. Это оставляет его добровольным и отправляет на проверку только тем, кто уже хорошо справился с базой.')}
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
  const t = useT()
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
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{t('Прогресс')}</p>
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
              ✓ {correctCount} {t('верно')}
            </span>
          )}
          {(gradedCount - correctCount) > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 700, color: '#A8282D',
              background: 'var(--color-red-soft)', padding: '3px 8px', borderRadius: 999,
            }}>
              ✗ {gradedCount - correctCount} {t('нет')}
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
  checked,
  hints,
  score,
  recommendationScore,
  onSubmit,
  onShowSummary,
}: {
  total: number
  answers: Record<string, string>
  questions: HomeworkQuizQuestion[]
  activeIndex: number
  submitted: boolean
  /** Задания, проверенные досрочно, — только их полоса красит в зелёный/красный. */
  checked: Record<string, true>
  hints: Record<string, true>
  score: number
  recommendationScore: number
  onSubmit: () => void
  onShowSummary: () => void
}) {
  const t = useT()
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
            // Полоса красится только по проверенному. Раньше она подсвечивала
            // печатный ответ красным сразу после ввода — вердикт без разбора:
            // ученик видел, что ошибся, и не мог узнать, в чём.
            const revealed = !!question && (
              submitted
              || !!checked[question.id]
              || (questionIsChoice(question) && !questionIsMulti(question) && questionAnswered(question, answer))
            )
            const hinted = !!question && !!hints[question.id]
            const isCorrect = revealed && gradable && !hinted && questionCorrect(question, answer)
            const isWrong = revealed && gradable && questionAnswered(question, answer)
              && (hinted || !questionCorrect(question, answer))
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
        // После сдачи полоса ведёт к итогам: сама по себе надпись «Сдано ✓»
        // ученику ничего не отвечала на вопрос «и что теперь».
        const isSummaryButton = submitted
        const clickable = isSubmitButton || isSummaryButton
        return (
          <motion.div
            whileHover={clickable ? { y: -1 } : undefined}
            whileTap={clickable ? { scale: 0.97 } : undefined}
            onClick={isSubmitButton ? onSubmit : isSummaryButton ? onShowSummary : undefined}
            role={clickable ? 'button' : undefined}
            className={clickable ? 'cursor-pointer' : undefined}
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
            {submitted ? (
              <span
                className="flex items-center"
                style={{
                  gap: 7, fontSize: 12, fontWeight: 800,
                  color: score >= recommendationScore ? 'var(--color-accent)' : '#9A6000',
                }}
              >
                {score >= recommendationScore ? t('Сдано ✓') : `${score} / 100`}
                <span style={{ fontWeight: 700, opacity: 0.75 }}>· {t('итоги')}</span>
              </span>
            ) : basicCompleted ? (
              <span
                className="flex items-center"
                style={{ gap: 7, color: 'var(--color-accent)', fontSize: 13, fontWeight: 750 }}
              >
                <Send size={13} />
                {t('Сдать домашку')}
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
