import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock } from 'lucide-react'
import { dailyQuiz } from '../data/mockData'
import { useDashboard } from '../store/dashboardStore'
import StatsPanel from './StatsPanel'
import { cn } from '../lib/utils'

type QuizState = 'preview' | 'active' | 'answered' | 'timeout' | 'done'

export default function DailyQuiz() {
  const { quizDismissed, dismissQuiz } = useDashboard()
  const [quizState, setQuizState] = useState<QuizState>('preview')
  const [timeLeft, setTimeLeft] = useState(dailyQuiz.timeLimit)
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
    setTimeLeft(dailyQuiz.timeLimit)
  }

  const handleAnswer = useCallback((answerId: string) => {
    if (quizState !== 'active') return
    setSelectedAnswer(answerId)
    setQuizState('answered')
    setTimeout(() => setQuizState('done'), 2000)
  }, [quizState])

  const timerPct = (timeLeft / dailyQuiz.timeLimit) * 100

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
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.65)',
          boxShadow: '0 4px 32px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <span
              className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-2"
              style={{ background: '#EEDBFF', color: '#7B3FCC', fontSize: 12, fontWeight: 600 }}
            >
              Викторина дня
            </span>
            <h2 style={{ fontSize: 22, fontWeight: 650, color: '#0B0B0D', lineHeight: 1.3 }}>
              {dailyQuiz.title}
            </h2>
          </div>
          {quizState === 'preview' && (
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.96 }}
              onClick={dismissQuiz}
              className="ml-4 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
              style={{ background: '#F0F0F2', color: '#6F6F76' }}
              aria-label="Закрыть"
            >
              <X size={14} />
            </motion.button>
          )}
        </div>

        {/* Timer bar (active only) */}
        {quizState === 'active' && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={14} style={{ color: timerPct < 30 ? '#F48B91' : '#6F6F76' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: timerPct < 30 ? '#F48B91' : '#6F6F76' }}>
                {timeLeft} сек
              </span>
            </div>
            <div className="h-2 rounded-full" style={{ background: '#E8E8EA' }}>
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
              className="px-6 py-3 rounded-2xl text-white font-semibold cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #C58BFF, #7B61FF)', fontSize: 15 }}
            >
              Начать
            </motion.button>
            <span style={{ fontSize: 13, color: '#6F6F76' }}>20 секунд на ответ</span>
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
                  background: '#F5F5F6',
                  color: '#0B0B0D',
                  border: '1.5px solid #E8E8EA',
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
            style={{ background: '#DFF8D6' }}
          >
            <span style={{ fontSize: 22 }}>✓</span>
            <div>
              <p style={{ fontSize: 16, fontWeight: 600, color: '#1A5C38' }}>Ответ принят</p>
              <p style={{ fontSize: 13, color: '#2A7D4F' }}>
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
            style={{ background: '#FFE1E4' }}
          >
            <span style={{ fontSize: 22 }}>⏱</span>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#A8282D' }}>Время вышло</p>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
