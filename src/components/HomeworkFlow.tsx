import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import {
  BookOpen, CheckCircle2, ChevronLeft, CircleAlert, Clock, GraduationCap,
  Lock, Send, Sparkles, Trophy, Image as ImageIcon, PenLine, X,
  ChevronUp, ChevronDown, Eye, Mic, MicOff, Home, RotateCcw, ArrowRight, Volume2,
} from 'lucide-react'
import type { LessonHomework, HomeworkQuizQuestion } from '../data/lessonContent'
import type { PatternItem } from '../data/taskTypes'
import { normalizeTaskType } from '../data/taskTypeVisuals'
import { matchTranslation } from '../lib/answerMatch'
import { matchesAnyAnswer, sameAnswer } from '../lib/answerForms'
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
import {
  initialQueue, restoreQueue, questionAt, isRepeatAt, requeue, lessonQueueEnabled, hardIds,
  type QueueState,
} from '../lib/lessonQueue'
import { easierSameElement } from '../lib/lessonLadder'
import { okChime, missBlip } from '../lib/feedback'
import StarBurst from './StarBurst'
import ScriptHint from './ScriptHint'
import { useDashboard } from '../store/dashboardStore'
import { useStudentData, ownerStudentIdFor, subjectSlugFor } from '../store/studentDataStore'
import { useIsDesktop } from '../lib/useIsDesktop'
import { useSwipeBack } from '../lib/useSwipeBack'
import { useNavCollapse } from '../lib/useNavCollapse'
import { useT, t as tStatic } from '../lib/i18n'
import { setVoiceScene, clearVoiceScene, speak, stopSpeech, hasVoiceFor } from '../lib/speech'
import { bindShortWords, proseWrap, balancedWrap, splitLeadIn } from '../lib/typography'
import GrowTextarea, { growMinHeight } from './GrowTextarea'
import ScriptKeyboard, { needsScriptKeyboard, scriptKeyboardCovers } from './ScriptKeyboard'
import QuestionTable from './QuestionTable'
import WordBankSolver from './WordBankSolver'
import MatchingSolver, {
  parseMatchingCsv, matchingCsv, matchingIsComplete, matchingIsCorrect, formatMatching,
} from './MatchingSolver'
import AudioPlayer from './AudioPlayer'
import TaskVideo from './TaskVideo'
import { videoAnswerDone, parseVideoAnswer, videoRequiredSeconds } from '../lib/videoAnswer'
import { parseVoiceAnswer, formatVoiceAnswer } from '../lib/voiceAnswer'
import { heardCovers, isAsrAvailable } from '../lib/asr'
import { formatClock } from '../lib/videoProgress'
import { homeworkStorageKey } from '../lib/homeworkReset'
import VoiceRecorder from './VoiceRecorder'
import SpeechHeard from './SpeechHeard'
import { charUnits, sentenceTokens } from '../data/taskTypes'
import CharTilesSolver from './CharTilesSolver'
import BlockOrderSolver from './BlockOrderSolver'
import JamoTypeSolver from './JamoTypeSolver'
import WordDropSolver, { parseDrops } from './WordDropSolver'
import CrosswordSolver, { parseCells } from './CrosswordSolver'
import { buildCrossword } from '../lib/crossword'
import DialogGapSolver from './DialogGapSolver'
import { addCards, deckOwner } from '../data/reviewDeck'
import { cardsFromHomework } from '../lib/reviewCapture'
import VocabIntro from './VocabIntro'
import HomeworkFlowBar from './HomeworkFlowBar'
import ChamoTrace from './ChamoTrace'
import SyllableBuilder from './SyllableBuilder'
import { getSubject, isLanguageSubject } from '../lib/subjects'
import { chamoOf, composeKeys, keysOf } from '../data/hangul'
import TheorySheet from './TheorySheet'
import { useReadingVisible } from '../store/readingStore'
import { findLessonById, getLessonDetail } from '../data/lessonContent'
import HardStarLottie from './HardStarLottie'
import PartyPopperLottie from './PartyPopperLottie'
import {
  shortPrompt,
  type BasicAnswerRow, type BasicAnswerVerdict, type BasicAnswersPayload,
} from '../lib/basicAnswers'
import { DEFAULT_IMAGE_SIZE } from '../data/taskTypes'
import { MOBILE_TOP_INSET } from '../lib/mobileTokens'
import { useKeyboardOpen } from '../lib/useKeyboardInset'

/**
 * Поле ответа в домашке обнимает текст: высота = содержимому, внутреннего
 * скролла нет. Соответствия и развёрнутые ответы уезжали под нижний край
 * поля — чтобы перечитать свой же ответ, приходилось скроллить внутри него.
 * Дно — четыре строки: пустое поле должно выглядеть как место под ответ, а не
 * как строчка. Уголок ручного ресайза убран (resize внутри GrowTextarea).
 */
const HW_ANSWER_MIN_H = growMinHeight(4, 14, 12, 1)

/** Высота плашки вердикта («Верно»/«Неверно»): 9+9 паддинга и строка 13×1.4.
    Строка заголовка вопроса держит её всегда, чтобы ответ не скакал. */
const VERDICT_PILL_H = 36

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
          boxShadow: '0 2px 12px rgba(var(--accent-rgb), 0.45)',
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
        {/* Шапка итогов. Заливка семантическим цветом на всю ширину модалки
            давала то же, что и в плашке итогов: жёлтый на графите — оливковая
            грязь, purple-soft 0.46 — тяжёлая плита под самым крупным текстом.
            Поверхность нейтральная, статус несут иконка, полоса и хлопушка. */}
        <div ref={bannerRef} style={{
          padding: '28px 28px 24px',
          background: 'var(--color-bg-3)',
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
                ? 'var(--color-green-soft)'
                : 'var(--color-amber-soft)',
              color: context === 'hard' ? 'var(--color-green-text)' : 'var(--color-amber)',
            }}>
              {context === 'hard' ? <Send size={24} /> : <CircleAlert size={24} />}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: 12, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase',
              color: context === 'hard' ? 'var(--color-green-text)' : passed ? 'var(--color-accent)' : 'var(--color-amber)',
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
                  /* «нужно 80+» ушло в полосу порога ниже — та же логика, что в
                     плашке итогов на странице: цифра нагляднее повтора в тексте. */
                  : t('Можно вернуться к конспекту и попробовать снова.')
                }
              </p>
            )}
          </div>
          {context === 'basic' && score !== undefined && (
            <div style={{ flexShrink: 0, textAlign: 'right' }}>
              <span style={{
                fontSize: 42, fontWeight: 760, lineHeight: 1, color: 'var(--color-text)',
              }}>{score}</span>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', marginTop: 2 }}>{t('баллов')}</p>
            </div>
          )}
          {passed && context === 'basic' && (
            <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--color-text-2)', width: '100%', marginTop: -8 }}>
              {t('База закрыта уверенно. Открылся необязательный хард-уровень с разбором от преподавателя.')}
            </p>
          )}
          {/* Та же полоса порога, что и в плашке итогов: ученик видит одну и ту
              же картину и в модалке сразу после сдачи, и на странице под ней. */}
          {context === 'basic' && score !== undefined && recommendationScore !== undefined && (
            <div className="flex flex-col" style={{ gap: 7, width: '100%' }}>
              <div style={{
                position: 'relative', height: 8, borderRadius: 999,
                background: 'rgba(var(--spoiler-dot-rgb), 0.12)',
              }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: `${Math.min(100, score)}%`, borderRadius: 999,
                  background: passed ? 'var(--color-green-accent)' : 'var(--color-amber)',
                }} />
                <div style={{
                  position: 'absolute', left: `${Math.min(100, recommendationScore)}%`,
                  top: -4, bottom: -4, width: 2, borderRadius: 2,
                  background: 'var(--color-text)',
                }} />
              </div>
              <div className="flex items-center justify-between" style={{ gap: 12, fontSize: 12 }}>
                <span style={{ color: 'var(--color-muted)' }}>
                  {passed
                    ? t('порог пройден')
                    : `${Math.max(0, recommendationScore - score)} ${t('до открытия харда')}`}
                </span>
                <span style={{ color: 'var(--color-text-2)', fontWeight: 700 }}>
                  {t('порог')} {recommendationScore}
                </span>
              </div>
            </div>
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
                  boxShadow: '0 12px 32px rgba(var(--accent-rgb), 0.32)',
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
                boxShadow: '0 12px 32px rgba(var(--accent-rgb), 0.32)',
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
  /**
   * Когда домашку сдали, ISO. Нужна сверке с базой (lib/homeworkReset.ts):
   * свежая сдача могла не дойти по сети — на экране висит «Отправить ещё раз»,
   * и стирать в этот момент ответы как «сдачи в базе нет» нельзя.
   */
  submittedAt?: string
  /**
   * Когда черновик последний раз меняли, ISO. Пишется при сохранении, не в
   * состояние. По нему сверка отличает работу, сделанную ДО обнуления курса
   * (стереть), от начатой после (оставить).
   */
  touchedAt?: string
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
  /**
   * Шаг языковой домашки, где на экране ровно одно задание.
   *
   * 0 — знакомство со словами, дальше по одному номеру на задание, последний
   * шаг — сдача. Лежит в том же черновике, что и ответы: после перезагрузки
   * ученик обязан вернуться на то же задание, а не в начало (у списка это
   * решала прокрутка, здесь прокручивать нечего).
   */
  flowStep?: number
  /**
   * Очередь урока: порядок прохождения с возвратами ошибок (Р8).
   *
   * Живёт в черновике рядом с шагом: после перезагрузки ученик обязан попасть
   * не только на тот же номер, но и в тот же порядок — иначе возвращённое
   * задание пропадает вместе с очередью. Поля нет у старых черновиков и нет,
   * пока режим выключен флагом (lib/lessonQueue.ts).
   */
  flowQueue?: QueueState
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
// Сверка со строгим эталоном (диктант, подстановка, дрилл, сборка предложения)
// идёт по общим правилам форм ответа — lib/answerForms.ts. Своей нормализации
// здесь быть не должно: у экрана домашки она была беднее, чем в банке заданий,
// и один и тот же ответ получал разный вердикт в зависимости от того, где его
// проверяли.
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
/** Строки с пропуском, у которых задан ответ, — только они и спрашиваются. */
function dropRows(q: HomeworkQuizQuestion) {
  return (q.gaps ?? []).filter(g => !!g.answer?.trim())
}
/** Верна ли одна строка пропусков. Нужно и проверке, и подсветке строк. */
export function dropRowCorrect(row: { answer: string; alt?: string[] }, given: string | undefined) {
  return matchesAnyAnswer(given, [row.answer, ...(row.alt ?? [])])
}
/** Заполненные подсказки кроссворда. */
function crosswordRows(q: HomeworkQuizQuestion) {
  return (q.clues ?? []).filter(c => !!c.answer?.trim() && !!c.clue?.trim())
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
  return matchesAnyAnswer(given, [item.answer, ...(item.alt ?? [])])
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
  // Видео: сделано, когда просмотрено сколько просили. Непустая строка ответа
  // тут ничего не значит — плеер пишет её с первой же секунды.
  if (qType(q) === 'videoWatch') return videoAnswerDone(ans, q.videoWatchSeconds)
  // Устное: отвечено, когда есть ЗАПИСЬ. Строка ответа непуста и между
  // попытками — она несёт счётчик, — но попытка без записи это не ответ.
  if (qType(q) === 'speaking' && ans !== NO_VOICE) return !!parseVoiceAnswer(ans).path
  // Сопоставление — то же правило: пара строк без пары не ответ.
  if (qType(q) === 'matching' && (q.pairs?.length ?? 0) >= 2) {
    return matchingIsComplete(parseMatchingCsv(ans, q.pairs!.length))
  }
  // Сборка тапами — отвечено, когда собрано целиком: три плитки из пяти —
  // это брошенная на середине сборка, а не ответ.
  if (qType(q) === 'unscramble' || qType(q) === 'charBank') {
    const need = charUnits(q.referenceAnswer ?? '')
    return need.length >= 2 && Array.from(ans ?? '').length >= need.length
  }
  if (qType(q) === 'blockOrder') {
    const items = q.sequenceItems ?? []
    return items.length >= 2 && (ans ?? '').split(',').filter(Boolean).length >= items.length
  }
  // Пропуски по банку: наполовину разложенный банк — не ответ.
  if (qType(q) === 'wordDrop') {
    const rows = dropRows(q)
    if (rows.length === 0) return !!(ans && ans.trim())
    const given = parseDrops(ans)
    return rows.every((_, i) => !!given[String(i)]?.trim())
  }
  // Кроссворд: отвечено, когда заполнены все клетки сетки.
  if (qType(q) === 'crossword') {
    const clues = crosswordRows(q)
    if (clues.length < 2) return !!(ans && ans.trim())
    const cells = Object.keys(buildCrossword(clues).cells)
    const given = parseCells(ans)
    return cells.length > 0 && cells.every(k => !!given[k]?.trim())
  }
  // Набор по буквам: отвечено, когда нажатий столько, сколько нужно слову.
  if (qType(q) === 'jamoType') {
    const need = charUnits(q.referenceAnswer ?? '').flatMap(keysOf).length
    return need >= 2 && (ans ?? '').split(',').filter(Boolean).length >= need
  }
  return !!(ans && ans.trim())
}
/**
 * Задание проверяет себя само по ходу решения — «Проверить» ему не нужно.
 *
 * Одиночный выбор фиксируется самим нажатием. Сопоставление в мгновенном режиме
 * красит каждую пару в момент связи (Р10): к тому, как последняя пара позеленела,
 * весь ответ уже проверен, и кнопка «Проверить» просила бы подтвердить увиденное.
 */
function questionSelfChecks(q: HomeworkQuizQuestion) {
  if (questionIsChoice(q)) return !questionIsMulti(q)
  // Устное с эталоном отвечает само в момент, когда запись легла: сверка идёт
  // по расшифровке, и «Проверить» просило бы подтвердить уже увиденное — а на
  // незачтённой попытке ещё и печатало бы «Пока мимо» там, где машина всего
  // лишь не расслышала. Ученику вместо этого предлагается сказать ещё раз.
  if (qType(q) === 'speaking') return !!q.targetText?.trim()
  return qType(q) === 'matching' && (q.pairs?.length ?? 0) >= 2
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
  // Видео: проверяет плеер — засчитан просмотр или нет.
  if (langTp === 'videoWatch') return !!q.videoUrl?.trim()
  // Обводка: проверяет сам холст — он и есть эталон, сверять нечего.
  if (langTp === 'trace') return !!q.chamo
  if (langTp === 'buildSyllable') return chamoOf(q.syllable ?? '').length >= 2
  // Сборка тапами: эталон — само слово/фраза (unscramble, charBank) либо
  // авторский порядок блоков (blockOrder).
  if (langTp === 'unscramble' || langTp === 'charBank') return charUnits(q.referenceAnswer ?? '').length >= 2
  if (langTp === 'blockOrder') return (q.sequenceItems?.length ?? 0) >= 2
  if (langTp === 'jamoType') return charUnits(q.referenceAnswer ?? '').flatMap(keysOf).length >= 2
  if (langTp === 'dialogGap') return !!q.referenceAnswer?.trim() && (q.dialog?.length ?? 0) >= 2
  if (langTp === 'wordDrop') return dropRows(q).length > 0
  if (langTp === 'crossword') return crosswordRows(q).length >= 2
  // Устное задание проверяет себя само ТОЛЬКО там, где автор задал эталон
  // («прочитайте вслух»). Свободный устный ответ и описание картинки эталона
  // не имеют — они по-прежнему целиком у преподавателя.
  if (langTp === 'speaking') return !!q.targetText?.trim()
  // imageDescribe / imageCompare — только учителем.
  const tp = qType(q)
  if (tp === 'fill' || tp === 'extended') return !!q.referenceAnswer?.trim()
  if (tp === 'sequence') return (q.sequenceItems?.length ?? 0) >= 2
  // Сопоставление проверяется машиной: ответ — выбор пар, а не свободный текст.
  if (tp === 'matching') return (q.pairs?.length ?? 0) >= 2
  // tableFill/whiteboard — teacher review only, not auto-graded.
  return false
}

/**
 * У задания нет ТЕЛА — решать нечего.
 *
 * ЗАЧЕМ. Решатель включается по данным, а не по типу: сборка — по эталону,
 * обводка — по букве, выбор — по вариантам. Когда данных нет, ветка не
 * срабатывает, и ученик видит формулировку и пустоту под ней. Так выглядел
 * живой урок хангыля после половинчатой сверки с сидом: «Соберите слово
 * „огурец“ из слогов» с типом `single` и без единого варианта — экран, на
 * котором нечего нажать и непонятно, ждать ли.
 *
 * Здесь мы это называем вслух (плашка вместо пустоты) и не считаем пропуском:
 * такое задание не идёт ни в «Дописать», ни в ошибки.
 *
 * Список типов — только те, чей решатель ТРЕБУЕТ данных. Свободный ответ,
 * устный ответ и доска тела не имеют по определению: там достаточно вопроса.
 */
function taskBodyMissing(q: HomeworkQuizQuestion): boolean {
  const tp = qType(q)
  if (tp === 'single' || tp === 'multi') return q.options.length === 0
  switch (tp) {
    case 'trace': return !q.chamo
    case 'buildSyllable': return chamoOf(q.syllable ?? '').length < 2
    case 'unscramble':
    case 'charBank': return charUnits(q.referenceAnswer ?? '').length < 2
    case 'jamoType': return charUnits(q.referenceAnswer ?? '').flatMap(keysOf).length < 2
    case 'wordBank':
    case 'listenBank': return !(q.sentence ?? '').trim()
    case 'blockOrder':
    case 'sequence': return (q.sequenceItems ?? []).length < 2
    case 'matching': return (q.pairs?.length ?? 0) < 2
    case 'wordDrop': return dropRows(q).length === 0
    case 'crossword': return crosswordRows(q).length < 2
    case 'dialogGap': return (q.dialog?.length ?? 0) < 2 || !q.referenceAnswer
    case 'pattern': return drillItems(q).length === 0
    case 'videoWatch': return !q.videoUrl
    case 'minimalPair': return !q.pairA || !q.pairB
    case 'tableFill': return !q.table
    case 'flashcard': return !(q.front ?? q.prompt ?? '').trim()
    default: return false
  }
}

/**
 * Идёт ли задание в балл домашки.
 *
 * Устное проверяет себя само, но балла не стоит — и это не осторожность, а
 * единственная честная позиция. Распознавалка возвращает текст, а не оценку
 * произношения (lib/asr.ts): исправно сказанное она не расслышит запросто, а на
 * дрилле минимальных пар (think–sink) слепа почти всегда. Ставить за это балл
 * значит оценивать ученика качеством чужого микрофона и чужой модели.
 *
 * Что автопроверка устного даёт взамен: ученику — ответ сразу, пока эталон ещё
 * в ушах; преподавателю — снятые с ленты записи, где сверка сошлась.
 */
function questionScored(q: HomeworkQuizQuestion) {
  return questionAutoGradable(q) && qType(q) !== 'speaking'
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
        && got.every((w, i) => sameAnswer(w, want[i]))
    }
    if (langTp === 'listenType') {
      if (!questionAutoGradable(q)) return false
      return matchesAnyAnswer(ans, [q.referenceAnswer, ...(q.altAnswers ?? [])])
    }
    if (langTp === 'videoWatch') return videoAnswerDone(ans, q.videoWatchSeconds)
    // Устное: сверяется РАСШИФРОВКА записи с эталоном. Машина знает только,
    // прозвучали ли нужные слова, — произношение она не оценивает вовсе
    // (см. lib/asr.ts). Лишнее сверх эталона ошибкой не считается.
    if (langTp === 'speaking') {
      const want = q.targetText?.trim()
      return !!want && heardCovers(parseVoiceAnswer(ans).heard, want)
    }
    if (langTp === 'minimalPair') return ans === q.correctPair
    if (langTp === 'trace') return ans === 'done'
    if (langTp === 'buildSyllable') {
      const want = chamoOf(q.syllable ?? '')
      const got = ans.split(',').filter(Boolean)
      return want.length >= 2 && got.length === want.length && got.every((c, i) => c === want[i])
    }
    // Сборка тапами: ответ — склейка выбранных плиток, сверка точная посимвольно
    // (пробелы не в счёт: их не тапают). Обманки ложного «верно» дать не могут.
    if (langTp === 'unscramble' || langTp === 'charBank') {
      const want = charUnits(q.referenceAnswer ?? '')
      return want.length >= 2 && ans.replace(/\s+/g, '') === want.join('')
    }
    if (langTp === 'blockOrder') {
      const items = q.sequenceItems ?? []
      const order = ans.split(',').map(Number)
      if (items.length < 2 || order.length !== items.length || order.some(n => Number.isNaN(n))) return false
      // Формат ответа общий с sequence: авторские индексы в порядке тапов.
      return order.every((v, i) => v === i)
    }
    // Набор по буквам: сверяется собранный текст, а не путь нажатий —
    // составную гласную можно набрать двумя способами, оба верные.
    if (langTp === 'jamoType') {
      const want = charUnits(q.referenceAnswer ?? '')
      return want.length >= 1 && composeKeys(ans.split(',').filter(Boolean)) === want.join('')
    }
    // Пропуски по банку: задание засчитывается целиком — банк общий, и одна
    // перепутанная строка означает, что вторая тоже стоит не на месте.
    if (langTp === 'wordDrop') {
      const rows = dropRows(q)
      if (rows.length === 0) return false
      const given = parseDrops(ans)
      return rows.every((row, i) => dropRowCorrect(row, given[String(i)]))
    }
    // Кроссворд сверяется клетками, а не словами: пересечения проверяются сами.
    if (langTp === 'crossword') {
      const clues = crosswordRows(q)
      if (clues.length < 2) return false
      const grid = buildCrossword(clues)
      const given = parseCells(ans)
      const keys = Object.keys(grid.cells)
      return keys.length > 0 && keys.every(k => (given[k] ?? '').trim() === grid.cells[k])
    }
    // Пропуск в диалоге — диктант с контекстом: эталон плюс альтернативы.
    if (langTp === 'dialogGap') {
      if (!questionAutoGradable(q)) return false
      return matchesAnyAnswer(ans, [q.referenceAnswer, ...(q.altAnswers ?? [])])
    }
    if (langTp === 'flashcard') {
      if (!q.back?.trim()) return false
      // Карточка проверяет значение, а не форму: падеж, вид глагола, предлог и
      // дефис ошибкой не считаются («в агентстве» = «агентство»). Разбор
      // формулировки — в lib/answerMatch.ts, синонимы приходят в altAnswers.
      return matchTranslation(ans, q.back, q.altAnswers)
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
    // altAnswers учитываются и здесь: раньше их читал только диктант, и заданное
    // учителем «принимается ещё и так» молча пропадало во «Вписать ответ».
    return questionAutoGradable(q) && matchesAnyAnswer(ans, [q.referenceAnswer, ...(q.altAnswers ?? [])])
  }
  if (tp === 'sequence') {
    const items = q.sequenceItems ?? []
    const order = ans.split(',').map(Number)
    if (order.length !== items.length || order.some(n => Number.isNaN(n))) return false
    // The authored order is [0,1,2,…]; the answer holds the student's arrangement
    // as a list of authored indices, so it's correct when already in that order.
    return order.every((v, i) => v === i)
  }
  if (tp === 'matching') {
    const pairs = q.pairs ?? []
    if (pairs.length < 2) return false
    // Ответ хранит авторский индекс правой части на каждую строку — верно, когда
    // каждая строка соединена со «своей».
    return matchingIsCorrect(parseMatchingCsv(ans, pairs.length))
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
//
// ВЕРДИКТ НА МЕСТЕ (target). У «прочитайте вслух» эталон есть — и ответ приходит
// не через неделю, а сразу: пока ученик говорил, ту же речь слушала
// распознавалка, и её текст сверяется с эталоном тут же, пока образец ещё в
// ушах. Это не оценка произношения: машина её не умеет и уметь не начнёт
// (см. lib/asr.ts). Это ответ на один вопрос — прозвучали ли нужные слова.
//
// ПОЭТОМУ ВЕРДИКТ МЯГКИЙ. Не расслышать исправно сказанное распознавалка может
// запросто, а на дрилле минимальных пар (think–sink–three–tree) она слепа почти
// всегда. Значит «не сошлось» — это не «неверно», а приглашение сказать ещё раз:
// сколько угодно и без штрафа. Запись при этом остаётся в ответе в любом случае,
// и незачтённую преподаватель услышит.
//
// БЕЗ РАСПОЗНАВАЛКИ ЭКРАН ПРЕЖНИЙ. Firefox, приложение на айфоне, задание без
// эталона — всё это прежняя ветка «записал и отправил», без единого нового
// элемента: isAsrAvailable() спрашивается до отрисовки, а не после.
function VoiceAnswer({ value, maxSeconds, disabled, onChange, target, lang }: {
  value: string | undefined
  maxSeconds: number
  disabled: boolean
  onChange: (v: string) => void
  /** Эталон «прочитайте вслух». Задан — задание проверяет себя само. */
  target?: string
  /** Язык эталона: на нём слушает распознавалка и говорит образец. */
  lang?: string
}) {
  const t = useT()
  const skipped = value === NO_VOICE
  const want = target?.trim() ?? ''
  const checks = !!want && isAsrAvailable()
  const answer = parseVoiceAnswer(skipped ? '' : value)
  const ok = checks && !!answer.heard && heardCovers(answer.heard, want)

  if (skipped) {
    // Отказ от записи — это состояние поля, а не предупреждение: жёлтая плашка
    // во всю ширину кричала об ошибке там, где ошибки нет. Осталась одна тихая
    // строка в тон остальным полям ответа и ссылка вернуться к записи.
    return (
      <div className="flex items-center" style={{
        gap: 9, padding: '10px 12px', borderRadius: 14,
        background: 'var(--color-bg-input)', border: '1px solid var(--color-border-soft)',
      }}>
        <MicOff size={15} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)' }}>
          {t('Без записи')}
        </span>
        {!disabled && (
          <button
            onClick={() => onChange('')}
            className="cursor-pointer"
            style={{
              marginLeft: 'auto', border: 'none', background: 'transparent', padding: 0,
              fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700,
              color: 'var(--color-accent)',
            }}
          >
            {t('Записать')}
          </button>
        )}
      </div>
    )
  }

  /** Стереть запись, сохранив счётчик попыток: «сошлось с третьей» — это факт. */
  const retry = () => onChange(formatVoiceAnswer({ path: '', heard: '', attempts: answer.attempts }))

  const sampleBtn = lang && hasVoiceFor(lang) && (
    <button
      onClick={() => speak(want, { lang })}
      className="flex items-center cursor-pointer"
      style={{
        gap: 7, padding: '7px 14px', borderRadius: 999,
        border: '1px solid var(--color-border)', background: 'transparent',
        color: 'var(--color-text-2)', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700,
      }}
    >
      <Volume2 size={14} />
      {t('Послушать эталон')}
    </button>
  )

  return (
    <div className="flex flex-col" style={{ gap: 10 }}>
      <VoiceRecorder
        value={answer.path || null}
        maxSeconds={maxSeconds}
        listenLang={checks ? lang : undefined}
        onChange={(path, heard) => onChange(path
          ? formatVoiceAnswer({ path, heard: heard ?? '', attempts: answer.attempts + 1 })
          : formatVoiceAnswer({ path: '', heard: '', attempts: answer.attempts }))}
      />

      {/* Сверка. Пустая расшифровка при работающей распознавалке — это тишина,
          далёкий микрофон или отвалившаяся сеть у облачного распознавателя;
          выглядит она иначе, чем «сказал не то», и говорить должна другое. */}
      {checks && answer.path && (answer.heard ? (
        <SpeechHeard
          heard={answer.heard}
          target={want}
          ok={ok}
          title={ok ? t('Засчитано — прозвучало всё') : t('Услышано')}
        />
      ) : (
        <div style={{
          padding: '10px 14px', borderRadius: 14, fontSize: 13, lineHeight: 1.5,
          background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)',
          color: 'var(--color-text-2)',
        }}>
          {t('Не расслышал. Скажи ещё раз — ближе к микрофону и чуть громче.')}
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {/* Незачтённая попытка ведёт не к «неверно», а обратно к микрофону. */}
        {checks && answer.path && !ok && !disabled && (
          <button
            onClick={retry}
            className="flex items-center cursor-pointer"
            style={{
              gap: 7, padding: '7px 14px', borderRadius: 999, border: 'none',
              background: 'var(--color-purple-soft)', color: 'var(--color-accent)',
              fontFamily: 'inherit', fontSize: 12.5, fontWeight: 750,
            }}
          >
            <Mic size={14} />
            {t('Ещё раз')}
          </button>
        )}

        {/* Образец нужен и до попытки, и после неудачной — но не после зачёта:
            там он уже прозвучал голосом самого ученика. */}
        {checks && !ok && !disabled && sampleBtn}

        {!answer.path && !disabled && (
          <button
            onClick={() => onChange(NO_VOICE)}
            className="flex items-center cursor-pointer"
            style={{
              gap: 7, padding: '7px 14px', borderRadius: 999,
              border: '1px solid var(--color-border)', background: 'transparent',
              color: 'var(--color-muted)', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700,
            }}
          >
            <MicOff size={14} />
            {t('Не могу записать сейчас')}
          </button>
        )}
      </div>
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
 *
 * Подсказка здесь построчная, а не на всё задание: застревают на одном слове из
 * пяти, и общая подсказка в такой ситуации либо не открывается вовсе (пока не
 * заполнены все строки, «Проверить» не появляется), либо вываливает разом все
 * пять эталонов — отработке это конец. Открытая строка стоит балла за задание,
 * как и любая другая подсказка.
 */
function DrillSolver({ pattern, gloss, items, value, disabled, showVerdict, revealed, accent, soft, onChange, onReveal }: {
  pattern?: string
  gloss?: string
  items: PatternItem[]
  value: string | undefined
  disabled: boolean
  showVerdict: boolean
  /** Номера строк (строкой), эталон которых ученик уже открыл. */
  revealed: Record<string, true>
  accent: string
  soft: string
  onChange: (v: string) => void
  onReveal: (index: number) => void
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
          const shown = !!revealed[String(i)]
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
                    border: `1px solid ${
                      showVerdict ? (ok ? '#6EE7A0' : '#F48B91')
                        : shown ? 'rgba(248,201,145,0.55)'
                        : 'var(--color-border)'
                    }`,
                    opacity: disabled ? 0.85 : 1,
                  }}
                />
                {/* Глазок строки. Место под него держится, пока дрилл живой:
                    иначе открытая строка становится шире соседних и колонка
                    полей едет. После проверки эталоны открыты и так — колонка
                    смыкается целиком, ровно. */}
                {!disabled && !showVerdict && (
                  <span style={{ flexShrink: 0, width: 34, height: 34 }}>
                    {!shown && (
                      <button
                        onClick={() => onReveal(i)}
                        title={t('Показать ответ')}
                        aria-label={t('Показать ответ')}
                        className="flex items-center justify-center cursor-pointer"
                        style={{
                          width: '100%', height: '100%', borderRadius: 12,
                          border: '1px solid var(--color-border)', background: 'transparent',
                          color: 'var(--color-muted)', padding: 0,
                        }}
                      >
                        <Eye size={15} />
                      </button>
                    )}
                  </span>
                )}
              </div>
              {/* Открытая строка: эталон с переводом и цена подсказки. */}
              {shown && !showVerdict && (
                <div className="flex items-start" style={{ gap: 7, paddingLeft: 88, paddingRight: 44 }}>
                  <Eye size={14} style={{ color: 'var(--color-yellow-text)', flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--color-text-2)' }}>
                    <b style={{ color: 'var(--color-text)' }}>{item.answer}</b>
                    {item.gloss ? ` — ${item.gloss}` : ''}
                    <span style={{ color: 'var(--color-muted)' }}> · {t('балл за это задание не начисляется')}</span>
                  </span>
                </div>
              )}
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
    flowStep: 0,
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
  // `subject` здесь — short_id курса («kohg»), а не слаг предмета: реестр о нём
  // не знает и ЛЮБАЯ домашка получала палитру запасного предмета — фиолетовую.
  // Отсюда «1 уровень», «Правило», «Дальше» и карточки слов оставались
  // брендовыми на коралловом английском. Курс → предмет, как во flowSubject.
  const palette = subjectTheme(subjectSlugFor(subject) ?? subject, dark)
  const readingVisible = useReadingVisible(s => s.visible)
  const setHomeworkWidgetFeedback = useDashboard(s => s.setHomeworkWidgetFeedback)
  const clearHomeworkWidgetFeedback = useDashboard(s => s.clearHomeworkWidgetFeedback)
  // Свайп от левого края = кнопка «Назад» в шапке домашки.
  useSwipeBack(() => { clearHomeworkWidgetFeedback(); onBack() }, isMobile)
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
    const raw = window.localStorage.getItem(homeworkStorageKey(lessonId))
    if (!raw) return getInitialState()
    try {
      return { ...getInitialState(), ...(JSON.parse(raw) as Partial<PersistedHomeworkState>) }
    } catch {
      return getInitialState()
    }
  })
  const [showResultModal, setShowResultModal] = useState<'basic' | 'hard' | null>(null)
  /**
   * Отправка, которая не дошла до базы.
   *
   * Раньше `upsert` шёл без проверки ошибки, а модалка «Домашка сдана»
   * показывалась сразу и безусловно: при отвалившейся сети или истёкшей сессии
   * ученик видел «сдано», учитель не видел ничего, а ответы пропадали. Теперь
   * неудача остаётся на экране до тех пор, пока запись не пройдёт: текст плюс
   * «Повторить», который отправляет ровно то же самое.
   */
  const [submitFailed, setSubmitFailed] = useState<{ text: string; retry: () => void } | null>(null)
  // Сдача недоделанной домашки спрашивает подтверждение прямо в кнопке:
  // пропущенные пойдут в ошибки, и отменить это ученик уже не сможет.
  const [confirmSubmitAsIs, setConfirmSubmitAsIs] = useState(false)
  const [showTheory, setShowTheory] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [showBoard, setShowBoard] = useState(false)
  const [openBoards, setOpenBoards] = useState<Set<string>>(new Set())

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
  // Диктор этой домашки. Пока голос не закреплён в пикере, каждое занятие
  // читается своим человеком — понимать одного диктора и понимать язык это
  // разные умения (см. setVoiceScene в lib/speech.ts).
  useEffect(() => {
    const scene = `hw:${lessonId}`
    setVoiceScene(scene)
    return () => clearVoiceScene(scene)
  }, [lessonId])
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
  /**
   * Разлёт звёздочек на верный ответ (docs/MEMORY_STANDARD.md, Р10).
   *
   * Это СОБЫТИЕ, а не состояние задания: зелёная рамка держится, пока открыт
   * разбор, а звёздочки летят один раз, в момент попадания. Поэтому ключ живёт
   * отдельно от ответов — иначе после F5 или возврата к разобранному заданию
   * они вспыхивали бы заново на каждом рендере.
   */
  const [burst, setBurst] = useState<{ id: string; n: number } | null>(null)
  const fireBurst = (id: string) => setBurst(b => ({ id, n: (b?.n ?? 0) + 1 }))
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
  // Сверка с базой стёрла результат этого урока — учитель обнулил курс, сдачи
  // больше нет ни у кого (lib/homeworkReset.ts). Перечитываем себя с нуля: без
  // этого экран остался бы на «Домашка сдана», а автосейв ниже вернул бы
  // стёртое в localStorage через долю секунды.
  const homeworkResetTick = useDashboard(s => s.homeworkResetTick)
  useEffect(() => {
    if (!homeworkResetTick?.ids.includes(lessonId)) return
    setState(getInitialState())
    setShowResultModal(null)
    setSubmitFailed(null)
  }, [homeworkResetTick, lessonId])

  // Первый прогон пропускаем: на монтировании состояние ещё то же, что в
  // localStorage, а вот `touchedAt` обновился бы — и черновик, сделанный ДО
  // обнуления курса, притворился бы свежей работой просто потому, что урок
  // открыли посмотреть.
  const savedOnce = useRef(false)
  useEffect(() => {
    if (!savedOnce.current) { savedOnce.current = true; return }
    window.localStorage.setItem(
      homeworkStorageKey(lessonId),
      JSON.stringify({ ...state, touchedAt: new Date().toISOString() }),
    )
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
  // Задание без тела считаем закрытым: ответить на него нельзя, и держать из-за
  // него всю домашку в «не доделано» — значит запереть ученика (см. taskBodyMissing).
  const answeredCount = basicQuestions.filter(question =>
    taskBodyMissing(question) || questionAnswered(question, state.basicAnswers[question.id])).length
  const basicCompleted = basicQuestions.length > 0 && answeredCount === basicQuestions.length

  // Подсмотренное подсказкой не идёт в балл: ученик увидел ответ до того, как
  // вспомнил его сам, и засчитывать это как знание — врать в первую очередь ему.
  const basicCorrectCount = useMemo(() => {
    return basicQuestions.filter(question =>
      questionScored(question)
      && !state.basicHints[question.id]
      && questionCorrect(question, state.basicAnswers[question.id])
    ).length
  }, [basicQuestions, state.basicAnswers, state.basicHints])
  // Score over the auto-gradable subset (choice + text/fill with an эталон),
  // mirroring TestFlow. When nothing is auto-gradable (all teacher-reviewed),
  // submitting the answers counts as a full pass so the hard level can open.
  const basicGradableCount = useMemo(
    () => basicQuestions.filter(questionScored).length,
    [basicQuestions],
  )
  const basicScore = basicGradableCount > 0
    ? Math.round((basicCorrectCount / basicGradableCount) * 100)
    : (basicCompleted ? 100 : 0)
  const basicPassed = basicScore >= homework.recommendationScore
  // Сколько баллов не хватает до харда. Раньше это было только текстом
  // «нужен результат 80+», и ученик считал разницу сам.
  const basicGapToHard = Math.max(0, homework.recommendationScore - basicScore)
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
  /**
   * Задания без ответа — с их номерами. Нужны и для напоминания в конце
   * списка, и для чипсов-навигации: «осталось 1» без указания, какое именно,
   * заставляло ученика листать всю домашку заново.
   */
  const basicUnanswered = useMemo(
    () => basicQuestions
      .map((q, i) => ({ q, number: i + 1 }))
      // Задание без тела в «Дописать» не зовём: возвращаться к нему некуда,
      // решать там нечего (см. taskBodyMissing).
      .filter(({ q }) => !taskBodyMissing(q) && !questionAnswered(q, state.basicAnswers[q.id])),
    [basicQuestions, state.basicAnswers],
  )
  // Ответил ещё на одно — подтверждение сдачи снимается: речь уже про другое
  // число пропусков, и «да» из прошлого состояния к нему не относится.
  useEffect(() => { setConfirmSubmitAsIs(false) }, [answeredCount])
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

  /**
   * Снимок работы для преподавателя: что спрашивали, что ответил ученик, как
   * это оценила машина. Собирается на клиенте, потому что только здесь известны
   * и определения заданий, и подписи вариантов, и подсказки, которыми ученик
   * пользовался. Уходит в lesson_progress.attachments базовой строки.
   */
  function buildBasicSnapshot(): BasicAnswersPayload {
    const rows: BasicAnswerRow[] = basicQuestions.map((question, index) => {
      const raw = state.basicAnswers[question.id]
      const tp = qType(question)
      const autoGradable = questionAutoGradable(question)
      const hinted = !!state.basicHints[question.id]
      const answered = questionAnswered(question, raw)
      // Устный ответ хранится кодеком (путь + расшифровка + попытки), описание
      // картинки голосом — по-прежнему голым путём. Плеер витрины играет
      // row.answer напрямую, поэтому наружу отдаём именно путь.
      const voicePath = tp === 'speaking' ? parseVoiceAnswer(raw).path : (raw ?? '')
      const voice = (tp === 'speaking' || question.responseMode === 'speak')
        && !!voicePath && voicePath !== NO_VOICE

      // Ответ в читаемом виде. Выбор хранится id-шниками, сборка предложения —
      // словами через пробел, порядок — индексами: преподавателю нужно то, что
      // видел ученик, а не внутреннее представление.
      let answer = raw ?? ''
      if (questionIsMulti(question)) {
        answer = parseIds(raw)
          .map(id => question.options.find(o => o.id === id)?.text ?? id)
          .join(', ')
      } else if (questionIsChoice(question)) {
        answer = question.options.find(o => o.id === raw)?.text ?? (raw ?? '')
      } else if (tp === 'sequence') {
        const items = question.sequenceItems ?? []
        answer = (raw ?? '').split(',')
          .map(n => items[Number(n)])
          .filter(Boolean)
          .join(' → ')
      } else if (tp === 'matching' && (question.pairs?.length ?? 0) >= 2) {
        answer = formatMatching(question.pairs!, parseMatchingCsv(raw, question.pairs!.length))
      } else if (tp === 'minimalPair') {
        answer = (raw === 'B' ? question.pairB : raw === 'A' ? question.pairA : '') ?? ''
      } else if (tp === 'videoWatch') {
        // Ответ на видео — служебная строка плеера. Преподавателю нужен не
        // «w=372;p=150», а сколько ученик реально отсмотрел.
        const v = parseVideoAnswer(raw)
        const need = videoRequiredSeconds(question.videoWatchSeconds, v.duration)
        answer = v.watched > 0
          ? `${formatClock(v.watched)}${need > 0 ? ` ${tStatic('из')} ${formatClock(need)}` : ''}`
          : ''
      } else if (tp === 'pattern') {
        // Дрилл хранится JSON-картой «строка → что вписали»: преподавателю она
        // нечитаема, разворачиваем в те же строки, что видел ученик.
        const given = parseDrillAnswer(raw)
        answer = drillItems(question)
          .map((item, i) => `${item.cue} → ${given[String(i)]?.trim() || '—'}`)
          .join('; ')
      } else if (tp === 'speaking' && raw !== NO_VOICE) {
        answer = voicePath
      } else if (raw === NO_VOICE) {
        answer = ''
      }

      // Эталон — тем же способом, что и подсказка ученику, плюс варианты выбора.
      let correct = hintFor(question)
      if (questionIsMulti(question)) {
        correct = (question.correctOptionIds ?? [])
          .map(id => question.options.find(o => o.id === id)?.text ?? id)
          .join(', ')
      } else if (questionIsChoice(question)) {
        correct = question.options.find(o => o.id === question.correctOptionId)?.text ?? ''
      } else if (tp === 'sequence') {
        correct = (question.sequenceItems ?? []).join(' → ')
      } else if (tp === 'matching') {
        correct = (question.pairs ?? []).map(p => `${p.left} → ${p.right}`).join('; ')
      } else if (tp === 'pattern') {
        correct = drillItems(question).map(item => item.answer).join('; ')
      } else if (tp === 'videoWatch') {
        const need = videoRequiredSeconds(
          question.videoWatchSeconds, parseVideoAnswer(raw).duration,
        )
        correct = need > 0 ? `${tStatic('нужно')} ${formatClock(need)}` : ''
      } else if (tp === 'speaking') {
        correct = question.targetText?.trim() ?? ''
      }

      const verdict: BasicAnswerVerdict =
        raw === NO_VOICE ? 'skip'
          : !answered ? 'empty'
          // «Подглядел» — только про ответ, открытый ДО проверки. Подсказка
          // теперь и появляется-то после ошибки, и если пометить такую работу
          // «подсказкой», преподаватель прочтёт «сдался, не пробуя» там, где
          // ученик честно ответил и не угадал.
          : hinted && !state.basicChecked[question.id] ? 'hint'
          : !autoGradable ? 'review'
          : questionCorrect(question, raw) ? 'correct'
          // Устное, где сверка НЕ сошлась, — это не «неверно»: машина не
          // подтвердила, а не опровергла. Отличить «сказал не то» от «не
          // расслышала» может только ухо, поэтому такая запись идёт
          // преподавателю с расшифровкой рядом. Зачтённые к нему не попадают
          // вовсе — см. BasicAnswersList.
          : tp === 'speaking' ? 'review'
          : 'wrong'

      return {
        n: index + 1,
        prompt: shortPrompt(question.front ? `${question.front} — ${question.prompt}` : question.prompt),
        type: tp,
        answer,
        ...(correct ? { correct } : {}),
        verdict,
        ...(voice ? { voice: true } : {}),
        // Что услышала распознавалка — преподавателю в незачтённых: по нему
        // сразу видно, ученик сказал не то или машина не расслышала.
        ...(tp === 'speaking' && parseVoiceAnswer(raw).heard
          ? { heard: parseVoiceAnswer(raw).heard, attempts: parseVoiceAnswer(raw).attempts }
          : {}),
      }
    })
    return {
      v: 'basic-1',
      gradable: basicGradableCount,
      correct: basicCorrectCount,
      rows,
    }
  }

  async function submitToSupabase(
    level: 'basic' | 'hard',
    score: number,
    comment: string,
    attachments?:
      | { photos: string[]; board: string | null }
      | { v: 2; tasks: HardTaskStudentBlock[] }
      | BasicAnswersPayload,
  ) {
    const session = getStudentSession()
    if (!session?.id) return
    // Basic level is auto-graded — mark completed immediately if score meets threshold.
    // Hard level (essay) always goes to submitted and awaits teacher review.
    //
    // Исключение: если в базе есть задания без автопроверки (устное, описание
    // картинки, доска), закрывать её баллом нельзя. Балл считается только по
    // автопроверяемым, и ученик мог набрать 100, пока его запись никто не
    // слушал: домашка вставала «выполнена», а у преподавателя в очереди
    // числилась проверенной. Такая сдача ждёт преподавателя.
    const needsTeacher = level === 'basic' && basicReviewCount > 0
    const status = level === 'basic' && score >= homework.recommendationScore && !needsTeacher
      ? 'completed'
      : 'submitted'
    const ref = level === 'hard' ? `${lessonId}-hard` : lessonId
    const { error } = await supabase.from('lesson_progress').upsert({
      student_id: ownerStudentIdFor(subject),
      lesson_ref: ref,
      subject,
      status,
      score,
      comment,
      attachments: attachments ?? {},
    }, { onConflict: 'student_id,lesson_ref' })
    if (error) {
      // Сдача — единственная запись, ради которой ученик делал домашку. Молча
      // проглотить её ошибку нельзя: экран покажет «сдано», а работы не будет
      // ни у кого. Событие уходит и в аналитику — иначе в проде такие потери
      // видны только по жалобе.
      console.error('[homework submit]', error)
      trackEvent('homework_submit_failed', {
        lesson_ref: ref, kind: level,
        code: error.code ?? '', msg: String(error.message ?? '').slice(0, 120),
      })
      setSubmitFailed({
        text: tStatic('Ответы не отправлены — проверьте связь и повторите.'),
        retry: () => { void submitToSupabase(level, score, comment, attachments) },
      })
      return false
    }
    setSubmitFailed(null)
    trackEvent('homework_submit', { lesson_ref: ref, kind: level })
    if (level === 'basic') void captureBasicToDeck()
    useStudentData.getState().load()
    return true
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
    // Задания, которые очередь возвращала до упора (Р8): к концу урока ученик
    // мог их дожать, и в последнем ответе они верны — но верны с третьего раза,
    // а это ровно то, что назавтра забывается первым. Такое задание идёт в
    // колоду наравне с ошибкой, иначе «трудное» остаётся отмеченным только
    // внутри урока и умирает вместе с ним.
    if (queueOn) for (const id of hardIds(queue)) wrongIds.add(id)
    // В колоду пишем слаг предмета, а не short_id курса: тренажёр фильтрует
    // карточки по предмету, и курсовой id для него — чужое слово (подробности
    // в subjectSlugFor). Курс без предмета из реестра остаётся как есть — так
    // карточка хотя бы не теряет привязку совсем.
    const cards = cardsFromHomework({ questions: basicQuestions, wrongIds, subject: subjectSlugFor(subject) ?? subject })
    if (cards.length === 0) return
    try {
      await addCards(deckOwner(), cards)
    } catch (e) {
      console.error('captureBasicToDeck:', e)
    }
  }

  // Все хард-задания — единый per-task/раунд-формат. Источник один: задания ДЗ
  // урока с isHard. Туда же на загрузке вливается хард из банка, назначенный на
  // урок через «Создать домашку» (fetchLessonHardTasks в db.ts) — поэтому
  // отдельного запроса к `homework` здесь нет. Нет ни одного определения →
  // синтезируем ОДНУ вкладку из задания урока (teacherTask), чтобы тред
  // (решение → комментарий → …) существовал и у legacy-ДЗ.
  const effectiveDefs: HardTaskDef[] = hardLevel.authoredHardDefs?.length
    ? hardLevel.authoredHardDefs.map(d => ({ key: d.key, source: 'custom' as const, statement: d.statement, image: d.image }))
    : [{ key: LEGACY_HARD_KEY, source: 'custom', statement: hardLevel.teacherTask?.prompt ?? hardLevel.teacherTask?.topic ?? '' }]
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
    const { error } = await supabase.from('lesson_progress').upsert({
      student_id: ownerStudentIdFor(subject),
      lesson_ref: ref,
      subject,
      status: 'submitted',
      comment: summary,
      attachments: { v: 2, tasks },
    }, { onConflict: 'student_id,lesson_ref' })
    if (error) {
      // Круг переписки не дошёл до базы: вкладку НЕ помечаем сданной, иначе
      // ученик закроет урок, а решения этого раунда не существует.
      console.error('[hard submit]', error)
      trackEvent('homework_submit_failed', {
        lesson_ref: ref, kind: 'hard',
        code: error.code ?? '', msg: String(error.message ?? '').slice(0, 120),
      })
      setSubmitFailed({
        text: tStatic('Решение не отправлено — проверьте связь и повторите.'),
        retry: () => { void submitTabSolution(key, payload) },
      })
      setHardBusy(false)
      return
    }
    setSubmitFailed(null)
    setState(current => ({ ...current, hardSubmitted: true, submittedAt: new Date().toISOString() }))
    setHardCompleted(lessonId)
    await reloadHardRow()
    useStudentData.getState().load()
    setHardBusy(false)
  }


  /**
   * Промах: вернуть задание в очередь урока (Р8).
   *
   * Тихо ничего не делает, когда очередь выключена флагом или урок идёт
   * списком, — там возвращать некуда, порядок задан вёрсткой страницы.
   */
  const requeueMiss = (questionId: string) => {
    if (!queueOn || !flowMode) return
    const index = basicQuestions.findIndex(q => q.id === questionId)
    if (index < 0) return
    // Ступень вниз (Р8): к повтору добавляем задание попроще про то же слово —
    // не набралось с клавиатуры, значит сначала собери из плиток. Нет такого в
    // уроке — вернётся один повтор, как и раньше.
    const easier = easierSameElement(basicQuestions, index)
    setState(current => ({
      ...current,
      flowQueue: requeue(restoreQueue(current.flowQueue, basicQuestions.length), {
        id: questionId,
        index,
        position: flowPosition,
        baseCount: basicQuestions.length,
        easier,
      }),
    }))
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

    // Множественный выбор вердикта ещё не имеет (он придёт по «Проверить»),
    // поэтому звучит нейтрально: канонический звук здесь сообщал бы ответ.
    if (multi) { playPop(); vibrate(22) }
    else if (correct) { okChime(); fireBurst(questionId) }
    else { missBlip(); requeueMiss(questionId) }
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

    // Кружок с галочкой/крестиком летит в виджет-пилюлю сводки. Если пилюли на
    // экране нет (телефон, режим одного задания), лететь ему некуда: он вспыхивал
    // на месте и гас за полсекунды — прочитать нельзя, а вердикт он перекрывал.
    // Вместо него на телефоне работают цвет, звук и звёздочки (Р10).
    const el = document.getElementById('widget-pill-target')
      ? questionSectionRefs.current[questionId]
      : null
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
   * Самоочевидное задание закрывается само, без «Проверить».
   *
   * У обводки нечего сверять: холст пускает палец только по самой черте, и
   * «буква написана» — это уже верный ответ. Лишний шаг «Проверить» после неё
   * спрашивал ученика о том, что он и так видит на экране, и отодвигал вердикт
   * на одно нажатие. Поэтому ответ и отметка о проверке ставятся одним
   * движением: сразу зелёное «Верно», звёздочки и «Далее».
   *
   * Звук успеха играет сам холст (см. ChamoTrace) — в тесте, где этой отметки
   * нет, буква тоже должна звучать законченной.
   */
  const completeSelfEvident = (questionId: string, value: string) => {
    if (state.basicSubmitted || state.basicChecked[questionId]) return
    fireBurst(questionId)
    setState(current => ({
      ...current,
      basicAnswers: { ...current.basicAnswers, [questionId]: value },
      basicChecked: { ...current.basicChecked, [questionId]: true },
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
    if (correct) { okChime(); fireBurst(questionId) }
    else { missBlip(); requeueMiss(questionId) }
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

  // ─── Языковая домашка: одно задание — один экран ───────────────────────────
  //
  // ПОЧЕМУ ТОЛЬКО ЯЗЫКИ. Длинный список с прокруткой правильно работает там, где
  // задание само по себе длинное и его перечитывают: разбор текста, задача с
  // условием. Языковой дрилл устроен наоборот — задание в одну строку, зато их
  // много, и каждое следующее должно начинаться с чистого экрана. В общем списке
  // глаз цепляет соседнее задание и его ответ, а прокрутка между ними стоит
  // дороже самого ответа.
  //
  // ПОЧЕМУ РЕЖИМ ГАСНЕТ ПОСЛЕ СДАЧИ. Сданная домашка — это разбор, и вот там
  // список как раз нужен: пройти глазами по всем ошибкам сразу, не листая.
  //
  // ВНИМАНИЕ К ПРЕДМЕТУ. `subject` здесь — short_id курса («kohg»), а не слаг
  // предмета: реестр SUBJECTS о нём не знает и любой курс выглядел бы неязыковым
  // (режим не включался ни в одной настоящей домашке — только на dev-стенде, где
  // предмет передают напрямую). Поэтому сначала курс → предмет, как в карточках
  // повторения ниже.
  const flowSubject = subjectSlugFor(subject) ?? subject
  const flowMode = isLanguageSubject(flowSubject) && basicQuestions.length > 0 && !state.basicSubmitted
  // Язык материала для разбора слов в шторке правила. Родные предметы (русский,
  // литература) не разбираются: там переводить нечего.
  const theoryDef = getSubject(flowSubject)
  const theoryLang = theoryDef?.isLanguage && !theoryDef.native ? theoryDef.langCode : undefined
  /** Есть ли нулевой шаг — знакомство со словами урока. */
  const flowIntro = vocabWords.length > 0
  const flowFirst = flowIntro ? 1 : 0

  /**
   * Очередь урока (Р8) — под флагом, см. lib/lessonQueue.ts.
   *
   * Выключенная очередь — это ровно прежний порядок 0,1,2…: ни одной ветки «если
   * флаг» ниже по коду нет, разница целиком в содержимом `order`.
   */
  const queueOn = useMemo(() => lessonQueueEnabled(), [])
  const queue: QueueState = useMemo(
    () => (queueOn
      ? restoreQueue(state.flowQueue, basicQuestions.length)
      : initialQueue(basicQuestions.length)),
    [queueOn, state.flowQueue, basicQuestions.length],
  )

  const flowTotal = flowFirst + queue.order.length
  const flowStep = Math.min(Math.max(state.flowStep ?? 0, 0), flowTotal)
  const flowOnIntro = flowIntro && flowStep === 0
  /** Задания кончились — дальше сдача, и хвост страницы снова виден целиком. */
  const flowFinished = flowStep >= flowTotal
  const flowPosition = flowStep - flowFirst

  // ─── Клавиатура на экране одного задания ─────────────────────────────────
  //
  // Пока клавиатура открыта, экран стоит. iOS, показывая поле ввода, сдвигает
  // видимую область вверх — и стоит тронуть страницу пальцем, как из-под
  // клавиатуры выезжает нижняя навигация, а задание уползает за верхний край.
  // Листать в этом режиме всё равно нечего: задание на экране одно, кнопка
  // «Проверить» и так поднята над клавиатурой.
  //
  // Прокрутку глушим у контейнера страницы (overflow), запомнив положение:
  // без этого браузер при снятии блокировки ставит список в начало.
  const keyboardOpen = useKeyboardOpen()
  useEffect(() => {
    if (!isMobile || !keyboardOpen || !flowMode || flowFinished) return
    const el = document.querySelector('.dashboard-main') as HTMLElement | null
    if (!el) return
    const top = el.scrollTop
    const prev = el.style.overflowY
    el.style.overflowY = 'hidden'
    return () => { el.style.overflowY = prev; el.scrollTop = top }
  }, [isMobile, keyboardOpen, flowMode, flowFinished])

  // Клавиатура ушла — просим Safari вернуть видимую область на место. Сам он
  // оставляет её сдвинутой вверх до следующего касания, и док с кнопкой стоят
  // над пустой полосой там, где только что была клавиатура.
  const hadKeyboard = useRef(false)
  useEffect(() => {
    if (keyboardOpen) { hadKeyboard.current = true; return }
    if (!hadKeyboard.current) return
    hadKeyboard.current = false
    window.scrollTo(0, 0)
  }, [keyboardOpen])
  const flowQuestionIndex = questionAt(queue, flowPosition)
  const flowQuestion = flowMode && !flowOnIntro && !flowFinished && flowQuestionIndex >= 0
    ? basicQuestions[flowQuestionIndex]
    : undefined

  /**
   * Повторный показ начинается с чистого листа.
   *
   * Задание, вернувшееся после промаха, иначе открылось бы с прошлым (неверным)
   * ответом и уже показанным разбором — то есть не как вопрос, а как страница
   * с ответом. Стираем ровно ответ и отметку проверки; подсказка остаётся
   * открытой (её уже видели, и балла за это задание всё равно нет).
   */
  useEffect(() => {
    if (!queueOn || !flowMode || !flowQuestion) return
    if (!isRepeatAt(queue, flowPosition)) return
    const id = flowQuestion.id
    if (state.basicAnswers[id] === undefined && !state.basicChecked[id]) return
    setState(current => {
      const answers = { ...current.basicAnswers }
      const checked = { ...current.basicChecked }
      delete answers[id]
      delete checked[id]
      return { ...current, basicAnswers: answers, basicChecked: checked }
    })
    // Сброс привязан к позиции в очереди, а не к ответу: иначе он сработал бы
    // ещё раз сразу после нового ответа на том же экране.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueOn, flowMode, flowPosition, flowQuestion?.id])

  const flowGiven = flowQuestion ? state.basicAnswers[flowQuestion.id] : undefined
  const flowAnswered = !!flowQuestion && questionAnswered(flowQuestion, flowGiven)
  const flowAuto = !!flowQuestion && questionAutoGradable(flowQuestion)
  const flowHinted = !!flowQuestion && !!state.basicHints[flowQuestion.id]
  // Задания, проверяющие себя сами (одиночный выбор, сопоставление), считаются
  // проверенными в момент ответа — кнопка сразу говорит «Далее».
  const flowChecked = !!flowQuestion && (
    !!state.basicChecked[flowQuestion.id]
    || (questionSelfChecks(flowQuestion) && flowAnswered)
  )
  /** Проверять нечего — ответ уже открыт или машина его не сверяет. */
  const flowDone = !!flowQuestion && (flowChecked || flowHinted || (!flowAuto && flowAnswered))

  const goToFlowStep = (next: number) => {
    setState(current => ({ ...current, flowStep: Math.max(0, Math.min(next, flowTotal)) }))
  }

  /**
   * Новый шаг начинается с начала экрана.
   *
   * ЗАЧЕМ. Короткое задание помещается целиком, и прокручивать нечего. Но стоит
   * заданию вырасти — отрывок для чтения, дрилл на пять строк, разбор ошибки под
   * ответом, — и человек дочитывает его внизу страницы. Следующее задание
   * рисуется на том же месте, а страница остаётся прокрученной: экран открывается
   * с середины нового задания, и его начало приходится искать вверх. В ленте, где
   * заданий не видно вообще, это выглядит как потерянный вопрос.
   *
   * ПОЧЕМУ НЕ scrollIntoView. Он целится в элемент и заводит его под липкую шапку.
   * Здесь на экране всё равно одно задание, поэтому правильное место — самый верх
   * прокрутки, а не верх карточки.
   *
   * ПОЧЕМУ РЫВКОМ, А НЕ ПЛАВНО. Плавную прокрутку глушат и `prefers-reduced-motion`,
   * и часть вебвью — и глушат молча: прокрутка просто не происходит, а понять это
   * можно только измерив (в нашем же стенде `behavior: 'smooth'` не сдвигал
   * страницу вовсе). Прыжок работает везде одинаково, и здесь он ещё и уместнее:
   * содержимое уже сменилось, и плавный проезд выглядел бы так, будто страница
   * едет под новым заданием.
   */
  useEffect(() => {
    if (!flowMode) return
    const card = flowQuestion ? questionSectionRefs.current[flowQuestion.id] : null
    // Прокручивается не окно, а ближайший предок с собственной прокруткой
    // (панель урока), поэтому ищем его от самой карточки, а не гадаем.
    let node: HTMLElement | null = card?.parentElement ?? null
    while (node) {
      if (node.scrollHeight > node.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(node).overflowY)) {
        node.scrollTo({ top: 0 })
        return
      }
      node = node.parentElement
    }
    window.scrollTo({ top: 0 })
    // Шаг — единственное, что должно двигать прокрутку: на ответ внутри задания
    // она реагировать не обязана.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowStep, flowMode])

  /** Закончено ли задание на этом шаге ленты — на него уже ответили и проверили. */
  const flowStepDone = (step: number): boolean => {
    const pos = step - flowFirst
    if (pos < 0) return false
    // Повтор спрашивает то же задание ЗАНОВО (Р8): пропускать его нельзя, даже
    // если ответ с прошлого показа ещё лежит в состоянии.
    if (isRepeatAt(queue, pos)) return false
    const q = basicQuestions[questionAt(queue, pos)]
    if (!q) return true
    if (taskBodyMissing(q)) return true
    const given = state.basicAnswers[q.id]
    return !!state.basicChecked[q.id]
      || !!state.basicHints[q.id]
      || (questionSelfChecks(q) && questionAnswered(q, given))
      || (!questionAutoGradable(q) && questionAnswered(q, given))
  }

  /**
   * Следующий шаг — ближайшее НЕЗАКОНЧЕННОЕ задание, а не соседняя строка.
   *
   * ЗАЧЕМ. Дойдя до конца, ученик возвращается дописать пропущенное — из
   * плашки «Список закончился, домашка — нет». Дописал первое, нажал «Далее» —
   * и попадал на задание, которое сделал полчаса назад, потом на следующее
   * сделанное, и так до конца списка. Пропущенные при этом оставались
   * пропущенными: единственным способом добраться до второго было пролистать
   * всё заново и снова найти плашку.
   *
   * На прямом проходе поведение прежнее: впереди все задания незакончены, и
   * ближайшее незаконченное — это и есть соседнее.
   */
  const nextFlowStep = (from: number): number => {
    for (let step = from + 1; step < flowTotal; step++) {
      if (!flowStepDone(step)) return step
    }
    return flowTotal
  }

  /**
   * Единственная кнопка экрана: «Понятно» → «Проверить» → «Далее».
   *
   * Она не переезжает и не раздваивается — за один шаг делается ровно одно
   * действие, и какое именно, видно по надписи.
   */
  const flowPrimary = () => {
    if (flowOnIntro) { goToFlowStep(flowStep + 1); return }
    if (flowQuestion && flowAuto && !flowChecked && !flowHinted && flowAnswered) {
      checkQuestion(flowQuestion.id)
      return
    }
    goToFlowStep(nextFlowStep(flowStep))
  }

  const flowLabel = flowOnIntro
    ? t('Понятно')
    : flowDone
      ? (nextFlowStep(flowStep) >= flowTotal ? t('Закончить') : t('Далее'))
      : flowAuto
        ? t('Проверить')
        : t('Далее')

  /**
   * Подсказка по одной строке дрилла.
   *
   * Ключ строки — `id#номер`: подсказки лежат в той же карте, что и обычные,
   * и открытая строка сразу помечает всё задание подсказанным (балла за него
   * уже нет). Одним значением тут не обойтись: нужно и «за это задание
   * подглядывали», и «какие именно строки открыты».
   */
  const drillHintKey = (questionId: string, index: number) => `${questionId}#${index}`
  const revealDrillRow = (questionId: string, index: number) => {
    if (state.basicSubmitted || state.basicHints[drillHintKey(questionId, index)]) return
    vibrate(14)
    setState(current => ({
      ...current,
      basicHints: {
        ...current.basicHints,
        [questionId]: true,
        [drillHintKey(questionId, index)]: true,
      },
    }))
  }
  /** Открытые строки конкретного дрилла — в виде, который ждёт DrillSolver. */
  const drillRevealed = (question: HomeworkQuizQuestion): Record<string, true> => {
    const out: Record<string, true> = {}
    drillItems(question).forEach((_, i) => {
      if (state.basicHints[drillHintKey(question.id, i)]) out[String(i)] = true
    })
    return out
  }

  /** Текст подсказки/эталона — то же, с чем сверяется автопроверка. */
  const hintFor = (question: HomeworkQuizQuestion): string => {
    const tp = qType(question)
    if (tp === 'flashcard') return question.back?.trim() ?? ''
    if (tp === 'listenType') return question.referenceAnswer?.trim() ?? ''
    if (tp === 'wordBank' || tp === 'listenBank') return question.sentence?.trim() ?? ''
    if (tp === 'minimalPair') return (question.correctPair === 'B' ? question.pairB : question.pairA) ?? ''
    if (tp === 'fill' || tp === 'extended') return question.referenceAnswer?.trim() ?? ''
    // Сборка тапами (слоги, буквы, перепутанное слово) хранит эталон там же, где
    // и вписанный ответ, — значит и подсказке есть что показать.
    return question.referenceAnswer?.trim() ?? ''
  }

  /** Прокрутка к заданию — из итогов и из чипсов с номерами ошибок. */
  const jumpToQuestion = (questionId: string) => {
    // В режиме одного экрана прокручивать не к чему: нужного задания в разметке
    // нет, пока на него не переключишься. Поэтому «вернуться к заданию» здесь —
    // это шаг ленты, а не прокрутка.
    if (flowMode) {
      const at = basicQuestions.findIndex(q => q.id === questionId)
      // Шаг ленты — это МЕСТО В ОЧЕРЕДИ, а не номер задания в списке. Очередь
      // возвращает промахи (Р8), и после первого же возврата её длина и порядок
      // расходятся со списком: «вернуться к заданию 8» уводило на восьмое место
      // очереди, то есть на чужое задание.
      const pos = at >= 0 ? queue.order.indexOf(at) : -1
      if (pos >= 0) { goToFlowStep(flowFirst + pos); return }
      if (at >= 0) { goToFlowStep(flowFirst + at); return }
    }
    questionSectionRefs.current[questionId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  /**
   * «Что дальше» — один и тот же набор действий в итогах наверху и в карточке
   * под последним заданием. Ученик, дочитавший разбор до конца, оказывается
   * именно там, и подниматься за кнопкой обратно наверх ему незачем.
   */
  const nextStepButtons = () => (
    // Кнопки делят строку поровну и, когда не помещаются, переносятся во всю
    // ширину блока: ряд из «полторы кнопки и дырка справа» читался как обрезок.
    <div className="flex flex-wrap items-stretch" style={{ gap: 10 }}>
      {basicWrong.length > 0 && (
        <motion.button
          whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
          onClick={() => jumpToQuestion(basicWrong[0].q.id)}
          className="flex items-center justify-center cursor-pointer"
          style={{
            flex: '1 1 190px', minWidth: 0, gap: 8, padding: '12px 18px', borderRadius: 16,
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
          className="flex items-center justify-center cursor-pointer"
          style={{
            flex: '1 1 190px', minWidth: 0, gap: 8, padding: '12px 18px', borderRadius: 16, border: 'none',
            background: PURPLE.gradient, color: '#fff', fontFamily: 'inherit',
            fontSize: 14, fontWeight: 700, boxShadow: '0 12px 28px rgba(var(--accent-rgb), 0.2)',
          }}
        >
          {t('Открыть хард')}
          <ArrowRight size={15} />
        </motion.button>
      )}
      <motion.button
        whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
        onClick={onBack}
        className="flex items-center justify-center cursor-pointer"
        style={{
          flex: '1 1 190px', minWidth: 0, gap: 8, padding: '12px 18px', borderRadius: 16,
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
        className="flex items-center justify-center cursor-pointer"
        style={{
          flex: '1 1 190px', minWidth: 0, gap: 8, padding: '12px 18px', borderRadius: 16,
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
    {/* Неотправленная сдача. Поверх всего и с кнопкой: тупика «ошибка есть,
        деться некуда» быть не должно. */}
    {submitFailed && (
      <div style={{
        position: 'fixed', left: 12, right: 12, zIndex: 6000,
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        padding: '12px 14px', borderRadius: 16,
        background: 'var(--color-red-soft)', color: 'var(--color-red-text)',
        border: '1px solid var(--color-red-fill)',
        boxShadow: '0 12px 34px rgba(0,0,0,0.18)',
        fontSize: 13, lineHeight: 1.4,
      }}>
        <span style={{ flex: 1, minWidth: 180 }}>{submitFailed.text}</span>
        <button
          onClick={() => { const r = submitFailed.retry; setSubmitFailed(null); r() }}
          style={{
            padding: '8px 16px', borderRadius: 12, border: 'none',
            background: 'var(--grad-purple, #786AD7)', color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          {t('Отправить ещё раз')}
        </button>
      </div>
    )}
    <AnimatePresence>
      {showResultModal && (
        <ResultModal
          context={showResultModal}
          score={showResultModal === 'basic' ? basicScore : undefined}
          recommendationScore={homework.recommendationScore}
          showHard={showHard}
          onContinue={(emojiIndex, goToHard) => {
            const hardAvailable = showHard && basicScore >= homework.recommendationScore
            setState(current => ({ ...current, basicSubmitted: true, submittedAt: new Date().toISOString(), selfAssessmentValue: emojiIndex, ...(goToHard ? { selectedLevel: 'hard' } : {}) }))
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
      lessonId={lessonId}
      lessonTitle={lessonTitle}
      paragraphs={theoryParagraphs}
      accent={palette.accent}
      soft={palette.soft}
      // Правило разбирается по словам — тем же разбором, что и конспект урока:
      // форма, о которой правило, должна читаться и переводиться на месте.
      lang={theoryLang}
      glossSubject={flowSubject}
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
      <div className="docked-pills-row" style={{ position: 'fixed', top: isMobile ? MOBILE_TOP_INSET : 30, left: isMobile ? 16 : 32, right: isMobile ? 16 : 32, zIndex: 80, pointerEvents: 'none' }}>
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
        {/* На телефоне рейл со структурой домашки стоит НАД заданием и занимает
            весь первый экран: дедлайн, «~6 мин», «как это работает». В обычной
            домашке это уместно — её открывают и читают. В режиме одного задания
            это ровно то, что «сбивает»: между кнопкой «начать» и первым словом
            оказывается экран текста, который читают один раз в жизни. На
            мониторе рейл остаётся сбоку и заданию не мешает. */}
        {(!flowMode || flowFinished || !isMobile) && (
        <aside
          className="flex flex-col"
          style={isMobile ? {
            // На мобилке рейл идёт не сбоку, а сверху во всю ширину: коробка
            // вокруг коробок только съедала поля и растила отступ до первого
            // задания. Карточки внутри и так отделены друг от друга.
            padding: 0,
            gap: 10,
          } : {
            padding: 16,
            gap: 12,
            borderRadius: 28,
            background: 'rgba(var(--glass-rgb), 0.98)',
            border: '1px solid var(--color-border-glass)',
            boxShadow: '0 8px 32px rgba(17, 12, 34, 0.08)',
          }}
        >
          {/* На мобилке та же плашка занимала треть экрана до первого задания,
              хотя несёт одну строку смысла — поэтому там она сворачивается в
              шапку: подпись и уровень в одну строку, мотивация мелким текстом. */}
          <div
            style={{
              padding: isMobile ? '12px 14px' : 16,
              borderRadius: 16,
              background: PURPLE.gradient,
              color: '#fff',
              boxShadow: isMobile ? '0 10px 24px rgba(var(--accent-rgb), 0.18)' : '0 18px 44px rgba(var(--accent-rgb), 0.24)',
            }}
          >
            <div className="flex items-center" style={{ gap: 10, marginBottom: isMobile ? 4 : 12 }}>
              <GraduationCap size={isMobile ? 16 : 18} />
              <span style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, opacity: isMobile ? 0.86 : 1 }}>
                {t('Структура домашки')}
              </span>
              {isMobile && (
                <span style={{ marginLeft: 'auto', fontSize: 16, fontWeight: 800 }}>
                  {selectedLevel === 'basic' ? basicLevel.shortLabel : hardLevel.shortLabel}
                </span>
              )}
            </div>
            {!isMobile && (
              <p style={{ fontSize: 21, lineHeight: 1.15, fontWeight: 750, marginBottom: 8 }}>
                {selectedLevel === 'basic' ? basicLevel.shortLabel : hardLevel.shortLabel}
              </p>
            )}
            <p style={{ fontSize: isMobile ? 12.5 : 13, lineHeight: 1.45, color: 'rgba(255,255,255,0.86)' }}>
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
                border: '1px solid rgba(var(--accent-rgb), 0.14)',
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
        )}

        {/* Полоса режима одного экрана выше точек прогресса (в ней вердикт и
            кнопка во всю ширину), поэтому и запас под ней больше. */}
        <main
          className="flex flex-col"
          style={{ gap: 16, paddingBottom: flowMode && !flowFinished ? 210 : 100 }}
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
                      onClick={() => { submitToSupabase('basic', basicScore, '', buildBasicSnapshot()); setShowResultModal('basic') }}
                      className="cursor-pointer"
                      style={{
                        padding: '13px 22px', borderRadius: 16, border: 'none',
                        background: PURPLE.gradient, color: '#fff', fontSize: 14, fontWeight: 750,
                        boxShadow: '0 12px 28px rgba(var(--accent-rgb), 0.28)',
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
                    background: 'rgba(var(--glass-rgb), 0.96)',
                    border: '1px solid var(--color-border-medium)',
                  }}
                >
                  <div className="flex flex-wrap items-start justify-between" style={{ gap: 14 }}>
                    <div className="flex items-start" style={{ gap: 12, flex: '1 1 260px', minWidth: 0 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: basicPassed ? 'var(--color-green-soft)' : 'var(--color-amber-soft)',
                        color: basicPassed ? 'var(--color-green-text)' : 'var(--color-amber)',
                      }}>
                        {basicPassed ? <Trophy size={20} /> : <CircleAlert size={20} />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center flex-wrap" style={{ gap: 8, marginBottom: 4 }}>
                          <p style={{ fontSize: 17, fontWeight: 760, color: 'var(--color-text)' }}>
                            {t('Домашка сдана')}
                          </p>
                          {!basicPassed && showHard && (
                            <span style={{
                              padding: '2px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 700,
                              background: 'var(--color-amber-soft)', color: 'var(--color-amber)',
                            }}>
                              {t('до порога')} {basicGapToHard}
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--color-muted)' }}>
                          {basicPassed
                            ? (showHard
                              ? t('База закрыта уверенно. Доступен необязательный хард-уровень с разбором от преподавателя.')
                              : t('База закрыта уверенно.'))
                            /* «нужен результат 80+» ушло в полосу порога ниже: цифра
                               там нагляднее, а в тексте она только дублировалась. */
                            : t('Можно вернуться к конспекту и попробовать снова.')
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
                      {/* Балл нейтральный: он факт, а не тревога. Статус несут
                          иконка, чип «до порога» и полоса — точечно, а не
                          заливкой всей карточки. */}
                      <span style={{
                        fontSize: 38, fontWeight: 760, lineHeight: 1, color: 'var(--color-text)',
                      }}>{basicScore}</span>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', marginTop: 2 }}>
                        {t('из 100')}
                      </p>
                    </div>
                  </div>

                  {/* Полоса порога: «сколько до харда» вместо абстрактной оценки. */}
                  {showHard && (
                    <div className="flex flex-col" style={{ gap: 7 }}>
                      <div style={{
                        position: 'relative', height: 8, borderRadius: 999,
                        background: 'var(--color-bg-3)',
                      }}>
                        <div style={{
                          position: 'absolute', left: 0, top: 0, bottom: 0,
                          width: `${Math.min(100, basicScore)}%`, borderRadius: 999,
                          background: basicPassed ? 'var(--color-green-accent)' : 'var(--color-amber)',
                        }} />
                        <div style={{
                          position: 'absolute', left: `${Math.min(100, homework.recommendationScore)}%`,
                          top: -4, bottom: -4, width: 2, borderRadius: 2,
                          background: 'var(--color-text)',
                        }} />
                      </div>
                      <div className="flex items-center justify-between" style={{ gap: 12, fontSize: 12 }}>
                        <span style={{ color: 'var(--color-muted)' }}>
                          {basicPassed
                            ? t('порог пройден')
                            : `${basicGapToHard} ${t('до открытия харда')}`}
                        </span>
                        <span style={{ color: 'var(--color-text-2)', fontWeight: 700 }}>
                          {t('порог')} {homework.recommendationScore}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap" style={{ gap: 10 }}>
                    <MetricPill label={t('Верно')} value={`${basicCorrectCount}`} />
                    <MetricPill
                      label={t('Ошибок')}
                      value={`${basicWrong.length}`}
                      tone={basicWrong.length > 0 ? 'amber' : undefined}
                    />
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
                          /* Не красный: это «разобрать», а не ошибка системы —
                             красный в продукте остаётся за деструктивным. */
                          style={{
                            minWidth: 34, height: 30, padding: '0 10px', borderRadius: 10,
                            border: '1px solid var(--color-border-strong)', background: 'var(--color-bg-3)',
                            color: 'var(--color-text)', fontFamily: 'inherit',
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
              {/* В режиме одного экрана знакомство — это отдельный нулевой шаг,
                  а не блок над списком: иначе на первом же экране рядом с
                  заданием лежали бы все ответы. */}
              {(!flowMode || flowOnIntro) && (
                <VocabIntro
                  words={vocabWords}
                  accent={palette.accent}
                  soft={palette.soft}
                  defaultOpen={flowMode || (!state.basicSubmitted && answeredCount === 0)}
                  started={!flowMode && answeredCount > 0}
                />
              )}

              {/* Возврат на место. Ответы переживают закрытие вкладки, но ученик
                  всё равно приземлялся в начало списка и искал, докуда дошёл. */}
              {!flowMode && !state.basicSubmitted && answeredCount > 0 && !basicCompleted && (
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
                // Режим одного экрана: всё, кроме текущего задания, не рисуется.
                // Отсечка стоит до вычислений, но после входа в map — так номера
                // заданий и границы частей считаются от полного списка и не
                // разъезжаются.
                if (flowMode && index !== flowQuestionIndex) return null
                const selectedAnswer = state.basicAnswers[question.id]
                const isChoice = questionIsChoice(question)
                // Задание без тела — не «пустой экран», а сломанное задание.
                const broken = taskBodyMissing(question)
                const answered = questionAnswered(question, selectedAnswer)
                const autoGradable = questionAutoGradable(question)
                // Одиночный выбор и сопоставление проверяются по ходу решения
                // (ответ фиксируется сразу), всё остальное — кнопкой «Проверить»
                // или сдачей домашки.
                const selfChecks = questionSelfChecks(question)
                const hinted = !!state.basicHints[question.id]
                const checked = !!state.basicChecked[question.id]
                  || (selfChecks && answered)
                  || state.basicSubmitted
                // Пока задание не проверено — поле остаётся редактируемым.
                const locked = checked
                const graded = answered && checked
                const isCorrect = !hinted && questionCorrect(question, selectedAnswer)
                const showVerdict = graded && autoGradable && !hinted
                const showReview = graded && !autoGradable
                // Дрилл — задание из пяти строк, и подсказка по одной из них не
                // должна закрывать разбор остальных четырёх. Балл за задание уже
                // потерян, так что подбирать «до зелёной рамки» тут нечего.
                const isDrill = qType(question) === 'pattern'
                const drillVerdict = graded && autoGradable && isDrill
                // «Проверить» появляется, когда есть что проверять: ответ введён,
                // машина умеет его сверить, разбор ещё не открыт.
                // После подсказки проверять нечего — ответ уже открыт; поле при
                // этом остаётся живым, чтобы слово можно было вписать рукой.
                const canCheck = autoGradable && answered && !checked
                  && (!hinted || isDrill) && !state.basicSubmitted
                const hintText = hintFor(question)
                // ПОДСКАЗКА ПОЯВЛЯЕТСЯ ТОЛЬКО ПОСЛЕ ОШИБКИ. Кнопка «Подсказка»
                // висела у каждого задания с самого начала — то есть предлагала
                // сдаться раньше, чем ученик успевал попробовать, и заодно
                // занимала строку под ответом (а появляясь и исчезая, ещё и
                // двигала всё остальное). Правило до ответа читается кнопкой
                // «Правило» в шапке — там конспект урока целиком; решение же
                // открывается здесь и только тогда, когда ответ не сошёлся.
                const canHint = !!hintText && autoGradable && !hinted && !state.basicSubmitted
                  && checked && !isCorrect

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
                // Шапка части и чекпоинт между частями — навигация по списку:
                // они говорят «ты в начале второй части из трёх» тому, кто этот
                // список видит. В режиме одного экрана списка нет, а прогресс
                // показывает нижняя полоса, и вторая шкала рядом с ней только
                // спорит с первой.
                const opensPart = !flowMode && partIdx >= 0 && index === partStart
                const closesPart = !flowMode && partIdx >= 0 && index === partEnd
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
                    style={isMobile ? {
                      // На узком экране карточка занимает его целиком, и коробка
                      // вокруг неё ничего не отделяет — зато её рамка и тень
                      // переезжают на каждом ответе, и экран «скачет». Поэтому
                      // на мобилке задание рисуется прямо на фоне страницы.
                      gap: 14,
                      padding: '4px 0 8px',
                    } : {
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

                    <div
                      className="flex flex-wrap items-start justify-between"
                      style={{ gap: 12, minHeight: isMobile ? undefined : VERDICT_PILL_H }}
                    >
                      {/* Колонка вопроса тянется и сжимается, плашка справа —
                          нет: без этого длинная формулировка выталкивала плашку
                          на свою строку, а короткая оставляла посреди карточки
                          дыру. Высота строки зарезервирована всегда: иначе
                          «Верно» появлялось из ниоткуда и сдвигало вниз всю
                          карточку — ученик читал вердикт уже на новом месте. */}
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
                              width: `${question.imageSize ?? DEFAULT_IMAGE_SIZE}%`, maxWidth: '100%',
                              // Потолок по высоте: ширина задана в процентах от
                              // колонки, и высокая картинка в узком экране всё
                              // равно выталкивала варианты под сгиб. contain —
                              // чтобы упереться в потолок, а не сплющиться.
                              maxHeight: '32vh', objectFit: 'contain', objectPosition: 'left top',
                              border: '1px solid var(--color-border)', background: '#fff',
                            }}
                          />
                        )}
                      </div>

                      {hinted && !isMobile && (
                        <div
                          className="flex items-start"
                          style={{
                            gap: 8, padding: '9px 12px', borderRadius: 14,
                            background: 'var(--color-amber-soft)', color: 'var(--color-amber)',
                            fontSize: 13, fontWeight: 700, maxWidth: 220, lineHeight: 1.4,
                            flexShrink: 0,
                          }}
                        >
                          <Eye size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                          <span style={balancedWrap}>{t('Подсказка')}</span>
                        </div>
                      )}
                      {/* «Верно/Неверно» стоит на самой карточке — там, где
                          ученик смотрит на ответ. Нижняя полоса вердикт не
                          дублирует: в режиме одного экрана она оставляет себе
                          только разбор («Правильный ответ: …»).
                          На телефоне плашки нет совсем: она появлялась из
                          ниоткуда и сдвигала ответ вниз, а сам вердикт и так
                          виден — рамка карточки и рамка поля ответа зеленеют
                          или краснеют. Салют перевешен на поле ответа. */}
                      {showVerdict && !isMobile && (
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
                            position: 'relative',
                          }}
                        >
                          <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                          <span style={balancedWrap}>
                            {isCorrect ? t('Верно') : t('Неверно')}
                          </span>
                        </div>
                      )}
                      {showReview && (
                        // Просто подпись: это не действие и не вердикт, а
                        // состояние ожидания. Плашка в две строки с иконкой
                        // читалась кнопкой и перевешивала соседние «Верно».
                        <div style={{
                          color: 'var(--color-accent)',
                          fontSize: 12.5, fontWeight: 650, lineHeight: 1.3,
                          whiteSpace: 'nowrap', flexShrink: 0,
                        }}>
                          {t('На проверке')}
                        </div>
                      )}
                    </div>

                    <div style={{ position: 'relative' }}>
                    {broken ? (
                    /* Пустой экран вместо задания — то же самое, что молчание:
                       ученик сидит и ждёт, что сейчас дорисуется. Говорим прямо
                       и не держим на нём: кнопка внизу пропускает задание. */
                    <div className="flex items-start" style={{
                      gap: 10, padding: '14px 16px', borderRadius: 18,
                      background: 'var(--color-amber-soft)', border: '1px solid var(--color-amber-border)',
                    }}>
                      <CircleAlert size={17} style={{ color: 'var(--color-amber)', flexShrink: 0, marginTop: 1 }} />
                      <span style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--color-text-2)' }}>
                        {t('Это задание приехало без содержимого — решать нечего. Пропусти его, оно не пойдёт в ошибки.')}
                      </span>
                    </div>
                    ) : isChoice ? (
                    <div className="grid" style={{ gap: 10 }}>
                      {/* Стимул — звук, а не текст: «что вы услышали?» (ступень 2,
                          Р2). Без плеера такое задание нечем решить — варианты
                          подписаны по-русски, и слушать было бы нечего. У
                          обычного выбора ttsText не задан, и строки здесь нет. */}
                      {!!question.ttsText && (
                        <AudioPlayer
                          audioUrl={question.audioUrl}
                          ttsText={question.ttsText}
                          ttsVoice={question.ttsVoice}
                          allowSlow={question.allowSlow}
                          lang={question.lang}
                        />
                      )}
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
                                  : active ? 'rgba(var(--accent-rgb), 0.38)'
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
                              position: 'relative',
                              ...proseWrap,
                            }}
                          >
                            {bindShortWords(option.text)}
                            {/* Незнакомое письмо в варианте — с транскрипцией и
                                озвучкой (Р14): выбор между четырьмя строками,
                                которые ещё не читаются, — это выбор картинок. */}
                            <ScriptHint text={option.text} lang={question.lang} />
                            {active && correctSelected && burst?.id === question.id && (
                              <StarBurst key={burst.n} />
                            )}
                          </button>
                        )
                      })}
                    </div>
                    /* Письменность: обводка буквы и сборка слога из букв. */
                    ) : qType(question) === 'trace' && question.chamo ? (
                    <ChamoTrace
                      chamo={question.chamo}
                      value={selectedAnswer}
                      disabled={locked}
                      onChange={v => (v === 'done'
                        ? completeSelfEvident(question.id, v)
                        : setFreeAnswer(question.id, v))}
                    />
                    ) : qType(question) === 'buildSyllable' && question.syllable ? (
                    <SyllableBuilder
                      syllable={question.syllable}
                      value={selectedAnswer}
                      disabled={locked}
                      showVerdict={showVerdict}
                      onChange={v => setFreeAnswer(question.id, v)}
                    />
                    ) : qType(question) === 'sequence' && (question.sequenceItems?.length ?? 0) > 0 ? (
                    <SequenceSolver
                      items={question.sequenceItems!}
                      value={selectedAnswer}
                      disabled={locked}
                      showVerdict={showVerdict}
                      onChange={v => setFreeAnswer(question.id, v)}
                    />
                    /* Сборка последовательности тапами: блоки берут из банка. */
                    ) : qType(question) === 'blockOrder' && (question.sequenceItems?.length ?? 0) > 0 ? (
                    <BlockOrderSolver
                      items={question.sequenceItems!}
                      value={selectedAnswer}
                      disabled={locked}
                      showVerdict={showVerdict}
                      onChange={v => setFreeAnswer(question.id, v)}
                    />
                    /* Пересобрать неправильно написанное слово / собрать слово
                       из ряда слогов с обманками — сборка тапами по плиткам. */
                    ) : (qType(question) === 'unscramble' || qType(question) === 'charBank')
                        && charUnits(question.referenceAnswer ?? '').length >= 2 ? (
                    <CharTilesSolver
                      mode={qType(question) === 'unscramble' ? 'unscramble' : 'bank'}
                      answer={question.referenceAnswer!}
                      distractors={question.distractors}
                      value={selectedAnswer}
                      disabled={locked}
                      showVerdict={showVerdict}
                      onChange={v => setFreeAnswer(question.id, v)}
                    />
                    /* Набор по буквам: экранная клавиатура, слоги складываются
                       на глазах — ㅇ+ㅏ+ㄴ → 안. */
                    ) : qType(question) === 'jamoType'
                        && charUnits(question.referenceAnswer ?? '').flatMap(keysOf).length >= 2 ? (
                    <JamoTypeSolver
                      answer={question.referenceAnswer!}
                      value={selectedAnswer}
                      disabled={locked}
                      showVerdict={showVerdict}
                      onChange={v => setFreeAnswer(question.id, v)}
                    />
                    /* Пропуски по банку слов: одна пачка строк, один банк. */
                    ) : qType(question) === 'wordDrop' && dropRows(question).length > 0 ? (
                    <WordDropSolver
                      rows={dropRows(question)}
                      distractors={question.distractors}
                      value={selectedAnswer}
                      disabled={locked}
                      showVerdict={showVerdict}
                      rowCorrect={(i, given) => dropRowCorrect(dropRows(question)[i], given)}
                      onChange={v => setFreeAnswer(question.id, v)}
                    />
                    /* Кроссворд: слово вспоминается по значению. */
                    ) : qType(question) === 'crossword' && crosswordRows(question).length >= 2 ? (
                    <CrosswordSolver
                      clues={crosswordRows(question)}
                      value={selectedAnswer}
                      disabled={locked}
                      showVerdict={showVerdict}
                      onChange={v => setFreeAnswer(question.id, v)}
                    />
                    /* Пропуск в диалоге: реплики озвучены разными голосами,
                       недостающее вставляет ученик. */
                    ) : qType(question) === 'dialogGap'
                        && (question.dialog?.length ?? 0) >= 2 && question.referenceAnswer ? (
                    <DialogGapSolver
                      dialog={question.dialog!}
                      answer={question.referenceAnswer}
                      distractors={question.distractors}
                      lang={question.lang}
                      value={selectedAnswer}
                      disabled={locked}
                      showVerdict={showVerdict}
                      correct={isCorrect}
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
                      showVerdict={drillVerdict}
                      revealed={drillRevealed(question)}
                      accent={palette.accent}
                      soft={palette.soft}
                      onChange={v => setFreeAnswer(question.id, v)}
                      onReveal={i => revealDrillRow(question.id, i)}
                    />

                    ) : qType(question) === 'tableFill' && question.table ? (
                    <TableSolver
                      table={question.table}
                      value={selectedAnswer}
                      disabled={locked}
                      onChange={v => setFreeAnswer(question.id, v)}
                    />

                    /* Сопоставление: правые части перемешаны в банке — ученик
                       соединяет пары сам, а не переписывает готовый ответ. */
                    ) : qType(question) === 'matching' && (question.pairs?.length ?? 0) >= 2 ? (
                    <MatchingSolver
                      pairs={question.pairs!}
                      value={parseMatchingCsv(selectedAnswer, question.pairs!.length)}
                      disabled={locked}
                      showVerdict={showVerdict}
                      // Пока задание решается — вердикт по каждой паре сразу
                      // (Р10). После сдачи/разбора включается обычный показ
                      // эталона, иначе распавшаяся пара осталась бы без ответа.
                      instant={!showVerdict && !locked}
                      lang={question.lang}
                      onChange={next => setFreeAnswer(question.id, matchingCsv(next))}
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

                    /* Видео: ролик, серия, фильм. Ответ набирает плеер —
                       засчитанный просмотр и есть выполненное задание. */
                    ) : qType(question) === 'videoWatch' && question.videoUrl ? (
                    <TaskVideo
                      url={question.videoUrl}
                      title={question.prompt}
                      credit={question.videoCredit}
                      startSeconds={question.videoStart}
                      watchSeconds={question.videoWatchSeconds}
                      value={selectedAnswer}
                      disabled={locked}
                      onChange={v => setFreeAnswer(question.id, v)}
                    />

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
                        inputMode={scriptKeyboardCovers(question.referenceAnswer) ? 'none' : undefined}
                        style={{
                          width: '100%', boxSizing: 'border-box', padding: '12px 14px',
                          borderRadius: 16, fontFamily: 'inherit', fontSize: 14,
                          color: 'var(--color-text)', background: 'var(--color-bg-input)', outline: 'none',
                          border: `1px solid ${showVerdict ? (isCorrect ? '#6EE7A0' : '#F48B91') : 'var(--color-border)'}`,
                          opacity: locked ? 0.85 : 1,
                        }}
                      />
                      {/* Раскладку выбирает САМ ЭТАЛОН: своей у ученика нет, а
                          буквы диктанту не подсказывают ничего — они одни и те
                          же в каждом задании. */}
                      {needsScriptKeyboard(question.referenceAnswer) && !locked && (
                        <ScriptKeyboard
                          answer={question.referenceAnswer}
                          value={selectedAnswer}
                          onChange={v => setFreeAnswer(question.id, v)}
                        />
                      )}
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
                                    : active ? 'rgba(var(--accent-rgb), 0.38)' : 'var(--color-border)'
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
                        inputMode={scriptKeyboardCovers(question.back) ? 'none' : undefined}
                        style={{
                          width: '100%', boxSizing: 'border-box', padding: '12px 14px',
                          borderRadius: 16, fontFamily: 'inherit', fontSize: 14,
                          color: 'var(--color-text)', background: 'var(--color-bg-input)', outline: 'none',
                          border: `1px solid ${showVerdict ? (isCorrect ? '#6EE7A0' : '#F48B91') : 'var(--color-border)'}`,
                          opacity: locked ? 0.85 : 1,
                        }}
                      />
                      {needsScriptKeyboard(question.back) && !locked && (
                        <ScriptKeyboard
                          answer={question.back}
                          value={selectedAnswer}
                          onChange={v => setFreeAnswer(question.id, v)}
                        />
                      )}
                      {showVerdict && !isCorrect && question.back && (
                        <div style={{ fontSize: 13, color: 'var(--color-green-text)', fontWeight: 600 }}>
                          {t('Правильно')}: {question.back}
                        </div>
                      )}
                    </div>

                    /* Устный ответ. «Прочитайте вслух» (есть targetText) проверяет
                       себя сам и отвечает сразу; свободный устный — у преподавателя. */
                    ) : qType(question) === 'speaking' ? (
                    <VoiceAnswer
                      value={selectedAnswer}
                      maxSeconds={question.responseSeconds ?? 120}
                      disabled={state.basicSubmitted}
                      onChange={v => setFreeAnswer(question.id, v)}
                      target={question.targetText}
                      lang={question.lang}
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
                      {/* Слова автора о работе. Только после отправки: прочитав
                          трактовку раньше, ученик опишет её, а не то, что видит
                          сам, — и задание перестанет быть описанием. */}
                      {question.afterNote && state.basicSubmitted && (
                        <div style={{
                          padding: '14px 16px', borderRadius: 18,
                          background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)',
                        }}>
                          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.3, textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: 8 }}>
                            {t('Что говорил автор')}
                          </p>
                          <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-text-2)', whiteSpace: 'pre-wrap', ...proseWrap }}>
                            {question.afterNote}
                          </div>
                        </div>
                      )}
                    </div>
                    ) : (
                    <div className="flex flex-col" style={{ gap: 10 }}>
                      {/* Ступень 5 (Р7): припоминание с опорой. Скелет показывает
                          длину и начало, динамик даёт звук — этого хватает,
                          чтобы достать слово из памяти, и не хватает, чтобы его
                          не вспоминать. Пустое поле без скелета — уже ступень 6. */}
                      {qType(question) === 'fill' && !!question.answerSkeleton && (
                        <div className="flex items-center" style={{
                          gap: 10, padding: '9px 14px', borderRadius: 14, alignSelf: 'flex-start',
                          background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)',
                        }}>
                          <span style={{
                            fontSize: 15, fontWeight: 700, letterSpacing: 0.5,
                            color: 'var(--color-text-2)', whiteSpace: 'pre',
                          }}>
                            {question.answerSkeleton}
                          </span>
                          {!!question.ttsText && !!question.lang && hasVoiceFor(question.lang) && (
                            <span
                              role="button"
                              tabIndex={-1}
                              aria-label={t('Озвучить')}
                              onClick={e => {
                                e.preventDefault()
                                e.stopPropagation()
                                stopSpeech()
                                speak(question.ttsText!, { lang: question.lang })
                              }}
                              style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: 24, height: 24, borderRadius: 9, flexShrink: 0,
                                color: 'var(--color-accent)', background: 'var(--color-purple-soft)',
                                cursor: 'pointer',
                              }}
                            >
                              <Volume2 size={14} />
                            </span>
                          )}
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
                            : t('Развёрнутый ответ…')
                        }
                        inputMode={scriptKeyboardCovers(question.referenceAnswer) ? 'none' : undefined}
                        style={{
                          width: '100%', boxSizing: 'border-box', padding: '12px 14px',
                          borderRadius: 16, fontFamily: 'inherit',
                          fontSize: 14, color: 'var(--color-text)',
                          background: 'var(--color-bg-input)', outline: 'none',
                          border: `1px solid ${showVerdict ? (isCorrect ? '#6EE7A0' : '#F48B91') : 'var(--color-border)'}`,
                          opacity: locked ? 0.85 : 1,
                        }}
                      />
                      {/* Ответ ждут письмом, которого нет на клавиатуре ученика
                          (см. ScriptKeyboard). */}
                      {needsScriptKeyboard(question.referenceAnswer) && !locked && (
                        <ScriptKeyboard
                          answer={question.referenceAnswer}
                          value={selectedAnswer}
                          onChange={v => setFreeAnswer(question.id, v)}
                        />
                      )}
                    </div>
                    )}
                    {/* Салют разлетается вокруг самого ответа — холста, поля,
                        собранной фразы, — там, куда смотрит ученик. У выбора он
                        уже на нажатой плитке. На плашке «Верно» он стоял в
                        стороне от ответа, у верхнего края карточки: вспышка
                        читалась как «где-то там», а не «вот это верно». */}
                    {isCorrect && !isChoice && burst?.id === question.id && (
                      <StarBurst key={burst.n} radius={64} />
                    )}
                    </div>

                    {/* Подсказка — ответ здесь же, не в словаре наверху. */}
                    {hinted && !!hintText && (
                      <div className="flex items-center" style={{
                        gap: 10, padding: '11px 14px', borderRadius: 16,
                        background: 'var(--color-amber-soft)', border: '1px solid var(--color-amber-border)',
                      }}>
                        <Eye size={15} style={{ color: 'var(--color-amber)', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--color-text-2)' }}>
                          {t('Ответ')}: <b style={{ color: 'var(--color-text)' }}>{hintText}</b>
                          {!checked && (
                            <span style={{ color: 'var(--color-muted)' }}> · {t('балл за это задание не начисляется, слово уйдёт на повторение')}</span>
                          )}
                        </span>
                      </div>
                    )}

                    {/* Проверка на месте: разбор сразу после ответа, а не через
                        двадцать заданий, когда своё рассуждение уже не вспомнить. */}
                    {/* В режиме одного экрана «Проверить» уезжает в нижнюю
                        полосу — там она одна на весь экран и не переезжает.
                        «Подсказка» остаётся здесь, у задания. */}
                    {((canCheck && !flowMode) || canHint) && (
                      <div className="flex items-center flex-wrap" style={{ gap: 10 }}>
                        {canCheck && !flowMode && (
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
                        <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-green-text)', marginBottom: 4 }}>{t('Правильный ответ')}</p>
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
                        <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--color-text-2)', ...proseWrap }}>
                          {bindShortWords(isCorrect
                            ? `${t('Пояснение:')} ${question.explanation}`
                            : question.explanation)}
                        </p>
                      </div>
                    )}
                  </section>
                  {showCheckpoint && <SectionCheckpoint part={partIdx + 1} />}
                  </React.Fragment>
                )
              })}

              {/* Конец списка, а домашка не доделана — раньше здесь был тупик:
                  нижняя полоса показывала «18 / 19» и молчала, кнопки сдачи не
                  было (она приходит только на полном списке), и ученик не знал
                  ни что осталось, ни как закончить. Теперь и то, и другое. */}
              {(!flowMode || flowFinished) && !state.basicSubmitted && !basicCompleted && basicUnanswered.length > 0 && (
                <section
                  className="flex flex-col"
                  style={{
                    gap: 14, padding: 20, borderRadius: 26,
                    background: 'rgba(var(--glass-rgb), 0.96)',
                    border: '1px solid var(--color-amber-border)',
                  }}
                >
                  <div className="flex items-start" style={{ gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'var(--color-amber-soft)', color: 'var(--color-amber)',
                    }}>
                      <CircleAlert size={20} />
                    </div>
                    <div>
                      <p style={{ fontSize: 17, fontWeight: 760, color: 'var(--color-text)', marginBottom: 4 }}>
                        {t('Список закончился, домашка — нет')}
                      </p>
                      <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--color-muted)' }}>
                        {t('Без ответа')}: {basicUnanswered.length} {t('из')} {basicQuestions.length}.{' '}
                        {t('Можно вернуться к ним — или сдать как есть: пропущенные пойдут в ошибки.')}
                      </p>
                    </div>
                  </div>

                  {/* Номера пропущенных — сразу и список, и навигация. */}
                  <div className="flex flex-wrap items-center" style={{ gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-2)' }}>
                      {t('Дописать')}:
                    </span>
                    {basicUnanswered.map(({ q, number }) => (
                      <button
                        key={q.id}
                        onClick={() => jumpToQuestion(q.id)}
                        className="cursor-pointer"
                        style={{
                          minWidth: 34, height: 30, padding: '0 10px', borderRadius: 10,
                          border: '1px solid var(--color-border-strong)', background: 'var(--color-bg-3)',
                          color: 'var(--color-text)', fontFamily: 'inherit',
                          fontSize: 13, fontWeight: 750,
                        }}
                      >
                        {number}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-stretch" style={{ gap: 10 }}>
                    <motion.button
                      whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
                      onClick={() => jumpToQuestion(basicUnanswered[0].q.id)}
                      className="flex items-center justify-center cursor-pointer"
                      style={{
                        flex: '1 1 200px', minWidth: 0,
                        gap: 8, padding: '13px 22px', borderRadius: 16, border: 'none',
                        background: PURPLE.gradient, color: '#fff', fontFamily: 'inherit',
                        fontSize: 14, fontWeight: 750, boxShadow: '0 12px 28px rgba(var(--accent-rgb), 0.28)',
                      }}
                    >
                      {t('К заданию')} {basicUnanswered[0].number}
                      <ArrowRight size={15} />
                    </motion.button>
                    <motion.button
                      whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (!confirmSubmitAsIs) { setConfirmSubmitAsIs(true); return }
                        submitToSupabase('basic', basicScore, '', buildBasicSnapshot())
                        setShowResultModal('basic')
                      }}
                      className="flex items-center justify-center cursor-pointer"
                      style={{
                        flex: '1 1 200px', minWidth: 0,
                        gap: 8, padding: '13px 20px', borderRadius: 16,
                        border: `1px solid ${confirmSubmitAsIs ? 'var(--color-amber)' : 'var(--color-border-medium)'}`,
                        background: confirmSubmitAsIs ? 'var(--color-amber-soft)' : 'var(--color-bg-input)',
                        color: confirmSubmitAsIs ? 'var(--color-amber)' : 'var(--color-text)',
                        fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                      }}
                    >
                      <Send size={15} style={{ flexShrink: 0 }} />
                      {/* Подтверждение длиннее обычной подписи, и по умолчанию
                          оно разрывалось на вторую строку — кнопка прыгала в
                          высоту прямо под пальцем. Держим в одну строку. */}
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {confirmSubmitAsIs
                          ? `${t('Точно сдать?')} ${basicUnanswered.length} ${t('без ответа')}`
                          : t('Сдать как есть')}
                      </span>
                    </motion.button>
                  </div>
                </section>
              )}

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
                    <p style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--color-muted)', ...proseWrap }}>
                      {bindShortWords(basicWrong.length > 0
                        ? `${t('Ошибок:')} ${basicWrong.length}. ${t('Их слова уже в колоде повторения — вернуться к ним можно в тренажёре.')}`
                        : t('Ошибок нет. Домашка закрыта — результат уже у преподавателя.'))
                      }
                    </p>
                  </div>
                  {nextStepButtons()}
                </section>
              )}

              {/* Одна полоса на экран. В режиме одного задания это лента с
                  единственной кнопкой, в списке — точки прогресса с переходами:
                  вместе они спорили бы за один и тот же низ экрана. */}
              {flowMode && !flowFinished && (
                <HomeworkFlowBar
                  step={flowStep}
                  total={flowTotal}
                  label={flowLabel}
                  disabled={!flowOnIntro && !flowAnswered && !flowDone}
                  isMobile={isMobile}
                  navCollapsed={navCollapsed}
                  onPrimary={flowPrimary}
                  onSkip={flowQuestion && !flowAnswered ? () => goToFlowStep(nextFlowStep(flowStep)) : undefined}
                />
              )}

              <motion.div
                initial={false}
                animate={isMobile
                  ? { bottom: navCollapsed ? 92 : 104, scale: navCollapsed ? 0.94 : 1 }
                  : { bottom: 24, scale: 1 }}
                transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                style={{
                  position: 'fixed',
                  display: flowMode && !flowFinished ? 'none' : undefined,
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
                  onSubmit={() => { submitToSupabase('basic', basicScore, '', buildBasicSnapshot()); setShowResultModal('basic') }}
                  onShowSummary={() => summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  onJump={jumpToQuestion}
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

/**
 * Плитка метрики итогов. Все три одинаковой плотности: залитая «Верно» на
 * --color-purple-soft читалась как «выбрано», а не как «хорошо», и была самым
 * тяжёлым элементом карточки под наименее важным числом. Цвет остался только
 * у числа и только там, где он что-то значит (tone).
 */
function MetricPill({ label, value, tone }: { label: string; value: string; tone?: 'amber' }) {
  return (
    <div
      style={{
        flex: '1 1 120px',
        padding: '10px 12px',
        borderRadius: 16,
        background: 'var(--color-bg-3)',
        border: '1px solid var(--color-border-soft)',
        minWidth: 92,
      }}
    >
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', marginBottom: 4 }}>
        {label}
      </p>
      <p style={{ fontSize: 18, fontWeight: 760, color: tone === 'amber' ? 'var(--color-amber)' : 'var(--color-text)' }}>
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
                      : '0 4px 14px rgba(var(--accent-rgb), 0.35)',
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

/** Геометрия штриха нижней полосы: меньше — уже не палец и не читается. */
const TICK_GAP = 2
const TICK_MIN = 5
const TICK_ACTIVE = 20
type TickState = 'correct' | 'wrong' | 'plain'
const TICK_COLOR: Record<TickState, string> = {
  correct: '#6EE7A0',
  wrong: '#F48B91',
  plain: 'var(--color-border-strong)',
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
  onJump,
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
  /** Прокрутка к заданию по клику в полосу — полоса и есть карта домашки. */
  onJump: (questionId: string) => void
}) {
  const t = useT()
  const [hovered, setHovered] = useState<number | null>(null)
  const active = activeIndex === -1 ? total - 1 : activeIndex
  const answeredCount = questions.filter(q => questionAnswered(q, answers[q.id])).length
  const basicCompleted = answeredCount === total && total > 0
  // Первое задание без ответа — цель клика по счётчику «18 / 19».
  const firstUnanswered = questions.find(q => !questionAnswered(q, answers[q.id]))

  // Полоса не резиновая. 48 заданий на телефоне — это 48 штрихов по два
  // пикселя: каша, в которую не попасть пальцем и по которой ничего не
  // прочитать. Меряем ширину дорожки и рисуем ровно столько штрихов, сколько
  // помещается: если заданий больше, один штрих берёт на себя пачку подряд
  // идущих и красится долями их цветов — сколько внутри верного и неверного,
  // столько зелёного и красного в самом штрихе. Помещается всё (обычно ПК) —
  // рисуем один к одному, как раньше.
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [trackWidth, setTrackWidth] = useState(0)
  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const measure = () => setTrackWidth(el.clientWidth)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const capacity = trackWidth > 0
    ? Math.max(1, 1 + Math.floor((trackWidth - TICK_ACTIVE) / (TICK_MIN + TICK_GAP)))
    : total
  const groups = useMemo<number[][]>(() => {
    if (total <= capacity) return Array.from({ length: total }, (_, index) => [index])
    return Array.from({ length: capacity }, (_, slot) => {
      const from = Math.floor((slot * total) / capacity)
      const to = Math.floor(((slot + 1) * total) / capacity)
      return Array.from({ length: to - from }, (_, k) => from + k)
    }).filter(group => group.length > 0)
  }, [total, capacity])

  // Цвет одного задания. Полоса красится только по проверенному: раньше она
  // подсвечивала печатный ответ красным сразу после ввода — вердикт без
  // разбора, ученик видел, что ошибся, и не мог узнать, в чём.
  const stateOf = (index: number): TickState => {
    const question = questions[index]
    if (!question) return 'plain'
    const answer = answers[question.id]
    const gradable = questionAutoGradable(question)
    const revealed = submitted
      || !!checked[question.id]
      || (questionIsChoice(question) && !questionIsMulti(question) && questionAnswered(question, answer))
    if (!revealed || !gradable) return 'plain'
    const hinted = !!hints[question.id]
    if (!hinted && questionCorrect(question, answer)) return 'correct'
    if (questionAnswered(question, answer) && (hinted || !questionCorrect(question, answer))) return 'wrong'
    return 'plain'
  }

  /** Заливка штриха: один цвет на однородной пачке, доли — на смешанной. */
  const tickBackground = (group: number[]) => {
    const states = group.map(stateOf)
    const correct = states.filter(state => state === 'correct').length
    const wrong = states.filter(state => state === 'wrong').length
    const plain = states.length - correct - wrong
    if (correct === states.length) return TICK_COLOR.correct
    if (wrong === states.length) return TICK_COLOR.wrong
    if (plain === states.length) return TICK_COLOR.plain
    const stops: string[] = []
    let filled = 0
    const push = (color: string, count: number) => {
      if (!count) return
      const from = (filled / states.length) * 100
      filled += count
      stops.push(`${color} ${from}% ${(filled / states.length) * 100}%`)
    }
    push(TICK_COLOR.correct, correct)
    push(TICK_COLOR.wrong, wrong)
    push(TICK_COLOR.plain, plain)
    return `linear-gradient(90deg, ${stops.join(', ')})`
  }

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
        <div ref={trackRef} style={{ display: 'flex', alignItems: 'center', gap: TICK_GAP, flex: 1, minWidth: 0, height: 20 }}>
          {groups.map((group, slot) => {
            const first = group[0]
            const last = group[group.length - 1]
            const state = tickBackground(group)
            const isActive = active >= first && active <= last
            // Штрих — карта домашки, а не индикатор: по клику он везёт к
            // заданию (к первому без ответа в пачке — туда и надо). Кликабельная
            // зона на всю высоту строки, чтобы попадать пальцем не в 4 пикселя.
            const targetIndex = group.find(index => {
              const question = questions[index]
              return !!question && !questionAnswered(question, answers[question.id])
            }) ?? first
            const target = questions[targetIndex]
            const jump = target ? () => onJump(target.id) : undefined
            const label = group.length === 1
              ? `${t('Задание')} ${first + 1}`
              : `${t('Задания')} ${first + 1}–${last + 1}`

            if (isActive) {
              const activeState = stateOf(active)
              const isCorrect = activeState === 'correct'
              const isWrong = activeState === 'wrong'
              return (
                <button
                  key={slot}
                  onClick={jump}
                  title={label}
                  aria-label={label}
                  className={jump ? 'cursor-pointer' : undefined}
                  style={{
                    width: TICK_ACTIVE, height: TICK_ACTIVE, borderRadius: '50%', flexShrink: 0,
                    padding: 0, border: 'none', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isCorrect ? TICK_COLOR.correct : isWrong ? TICK_COLOR.wrong : PURPLE.gradient,
                    color: isCorrect ? '#0B4020' : isWrong ? '#6B0007' : '#fff',
                    fontSize: 9, fontWeight: 800,
                    boxShadow: isCorrect
                      ? '0 2px 8px rgba(110,231,160,0.4)'
                      : isWrong
                        ? '0 2px 8px rgba(244,139,145,0.4)'
                        : '0 2px 10px rgba(var(--accent-rgb), 0.35)',
                  }}
                >
                  {active + 1}
                </button>
              )
            }

            const isHovered = hovered === slot
            return (
              <button
                key={slot}
                onClick={jump}
                onMouseEnter={() => setHovered(slot)}
                onMouseLeave={() => setHovered(current => (current === slot ? null : current))}
                title={label}
                aria-label={label}
                className={jump ? 'cursor-pointer' : undefined}
                style={{
                  flex: 1, minWidth: TICK_MIN, height: 20, padding: 0,
                  border: 'none', background: 'transparent',
                  display: 'flex', alignItems: 'center',
                }}
              >
                <span style={{
                  width: '100%', height: isHovered ? 10 : last < active ? 6 : 4,
                  borderRadius: 3, background: state,
                  transition: 'height 0.2s ease',
                }} />
              </button>
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
        // Счётчик «18 / 19» сам по себе только констатировал недоделанное.
        // Теперь он ведёт к ближайшему заданию без ответа.
        const isJumpButton = !submitted && !basicCompleted && !!firstUnanswered
        const clickable = isSubmitButton || isSummaryButton || isJumpButton
        return (
          <motion.div
            whileHover={clickable ? { y: -1 } : undefined}
            whileTap={clickable ? { scale: 0.97 } : undefined}
            title={isJumpButton ? t('Перейти к заданию без ответа') : undefined}
            onClick={isSubmitButton ? onSubmit : isSummaryButton ? onShowSummary : isJumpButton ? () => onJump(firstUnanswered.id) : undefined}
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
