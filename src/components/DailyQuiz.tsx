import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock } from 'lucide-react'
import { quizTimeLimit } from '../data/mockData'
import { useDashboard } from '../store/dashboardStore'
import { useStudentData } from '../store/studentDataStore'
import StatsPanel from './StatsPanel'
import { cn } from '../lib/utils'

type QuizState = 'preview' | 'active' | 'answered' | 'timeout' | 'done'

function SpoilerQuestion({ text }: { text: string }) {
  const [revealed, setRevealed] = useState(false)
  return (
    <div
      className="flex items-center justify-center my-5 px-2 py-4 rounded-2xl cursor-pointer select-none"
      style={{ minHeight: 64, background: 'var(--color-purple-soft)', position: 'relative', overflow: 'hidden' }}
      onClick={() => setRevealed(r => !r)}
      title={revealed ? 'Скрыть' : 'Показать вопрос'}
    >
      <p
        style={{
          fontSize: 18,
          fontWeight: 650,
          color: 'var(--color-text)',
          lineHeight: 1.3,
          textAlign: 'center',
          transition: 'filter 0.25s ease, opacity 0.25s ease',
          filter: revealed ? 'none' : 'blur(7px)',
          opacity: revealed ? 1 : 0.55,
          userSelect: revealed ? 'text' : 'none',
        }}
      >
        {text}
      </p>
      {!revealed && (
        <span
          style={{
            position: 'absolute',
            fontSize: 12,
            fontWeight: 600,
            color: '#7B3FCC',
            background: 'var(--color-purple-soft)',
            borderRadius: 999,
            padding: '3px 10px',
            pointerEvents: 'none',
          }}
        >
          спойлер
        </span>
      )}
    </div>
  )
}

export default function DailyQuiz() {
  const { quizDismissed, dismissQuiz } = useDashboard()
  const quizQuestions = useStudentData(s => s.quizQuestions)
  const dailyQuiz = { ...(quizQuestions[0] ?? { id: 'q1', title: '…', subject: 'Химия', answers: [] }), timeLimit: quizTimeLimit }
  const [quizState, setQuizState] = useState<QuizState>('preview')
  const [timeLeft, setTimeLeft] = useState(quizTimeLimit)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)

  // Timer
  useEffect(() => {
    if (quizState !== 'active') return
    if (timeLeft <= 0) {
      setQuizState('timeout')
      setTimeout(() => setQuizState('done'), 2000)
      return
    }
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(id)
  }, [quizState, timeLeft])

  const handleStart = () => {
    setQuizState('active')
    setTimeLeft(quizTimeLimit)
  }

  const handleAnswer = useCallback((answerId: string) => {
    if (quizState !== 'active') return
    setSelectedAnswer(answerId)
    setQuizState('answered')
    setTimeout(() => setQuizState('done'), 2000)
  }, [quizState])

  const timerPct = (timeLeft / quizTimeLimit) * 100

  if (quizDismissed || quizState === 'done') {
    return <StatsPanel />
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="quiz"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8, transition: { duration: 0.3 } }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-[32px] p-8"
        style={{
          background: 'rgba(var(--glass-rgb), 0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--color-border-glass)',
          boxShadow: '0 4px 32px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <span
              className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: 'var(--color-purple-soft)', color: '#7B3FCC', fontSize: 12, fontWeight: 600 }}
            >
              Викторина дня
            </span>
          </div>
          {quizState === 'preview' && (
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.96 }}
              onClick={dismissQuiz}
              className="ml-4 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
              style={{ background: 'var(--color-bg-3)', color: 'var(--color-muted)' }}
              aria-label="Закрыть"
            >
              <X size={14} />
            </motion.button>
          )}
        </div>

        {/* Question — spoiler in preview, plain in active/answered/timeout */}
        {quizState === 'preview'
          ? <SpoilerQuestion text={dailyQuiz.title} />
          : <h2 style={{ fontSize: 22, fontWeight: 650, color: 'var(--color-text)', lineHeight: 1.3, marginBottom: 20 }}>
              {dailyQuiz.title}
            </h2>
        }

        {/* Timer bar (active only) */}
        {quizState === 'active' && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={14} style={{ color: timerPct < 30 ? '#F48B91' : 'var(--color-muted)' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: timerPct < 30 ? '#F48B91' : 'var(--color-muted)' }}>
                {timeLeft} сек
              </span>
            </div>
            <div className="h-2 rounded-full" style={{ background: 'var(--color-bg-5)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: timerPct < 30
                    ? 'linear-gradient(to right, #F48B91, #FF6B6B)'
                    : 'linear-gradient(to right, #6EE7A0, #3FCC8A)',
                }}
                animate={{ width: `${timerPct}%` }}
                transition={{ duration: 0.5, ease: 'linear' }}
              />
            </div>
          </div>
        )}

        {/* Preview state */}
        {quizState === 'preview' && (
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStart}
              className="px-6 py-3 rounded-[32px] text-white font-semibold cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #C58BFF, #7B61FF)', fontSize: 15 }}
            >
              Начать
            </motion.button>
            <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>20 секунд на ответ</span>
          </div>
        )}

        {/* Active: answers */}
        {quizState === 'active' && (
          <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2')}>
            {dailyQuiz.answers.map((ans) => (
              <motion.button
                key={ans.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleAnswer(ans.id)}
                className="px-6 py-4 rounded-2xl text-left font-medium cursor-pointer transition-colors"
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  border: '1.5px solid var(--color-border)',
                  minHeight: 56,
                }}
              >
                {ans.text}
              </motion.button>
            ))}
          </div>
        )}

        {/* Answered state */}
        {quizState === 'answered' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-6 py-4 rounded-2xl"
            style={{ background: 'var(--color-green-soft)' }}
          >
            <span style={{ fontSize: 22 }}>✓</span>
            <div>
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-green-text)' }}>Ответ принят</p>
              <p style={{ fontSize: 13, color: 'var(--color-green-text)' }}>
                {dailyQuiz.answers.find(a => a.id === selectedAnswer)?.text}
              </p>
            </div>
          </motion.div>
        )}

        {/* Timeout */}
        {quizState === 'timeout' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-6 py-4 rounded-2xl"
            style={{ background: 'var(--color-red-soft)' }}
          >
            <span style={{ fontSize: 22 }}>⏱</span>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#A8282D' }}>Время вышло</p>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
