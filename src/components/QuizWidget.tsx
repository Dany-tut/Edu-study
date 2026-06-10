import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, ChevronLeft, ChevronRight, Pause, Trophy } from 'lucide-react'
import { quizQuestions, quizTimeLimit, type QuizAnswer } from '../data/mockData'
import { useDashboard } from '../store/dashboardStore'
import SpoilerText from './SpoilerText'

function shuffleAnswers(id: string, answers: QuizAnswer[]): QuizAnswer[] {
  let seed = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    seed ^= id.charCodeAt(i)
    seed = Math.imul(seed, 0x01000193)
  }
  const rand = () => {
    seed = Math.imul(seed ^ (seed >>> 15), 0x85ebca6b)
    seed = Math.imul(seed ^ (seed >>> 13), 0xc2b2ae35)
    seed ^= seed >>> 16
    return ((seed >>> 0) % 100000) / 100000
  }
  const out = answers.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

type QuizState = 'preview' | 'active' | 'answered' | 'timeout' | 'done'
type Result = 'correct' | 'wrong' | 'timeout'

const TOTAL = quizQuestions.length
const RESULT_DELAY = 1600

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.92)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.65)',
  boxShadow: '0 4px 32px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
}

type Props = { active?: boolean; columns?: number }

export default function QuizWidget({ active = true, columns = 1 }: Props) {
  const scale = columns >= 3 ? 0.82 : columns >= 2 ? 0.9 : 1
  const padX = 22 * scale
  const padY = 18 * scale
  const { quizResumeIndex, setQuizResumeIndex } = useDashboard()
  const [quizState, setQuizState] = useState<QuizState>('preview')
  const [current, setCurrent] = useState(quizResumeIndex)
  const [timeLeft, setTimeLeft] = useState(quizTimeLimit)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [results, setResults] = useState<(Result | undefined)[]>(() => Array(TOTAL).fill(undefined))

  const question = quizQuestions[current]
  const shuffledAnswers = useMemo(
    () => shuffleAnswers(question.id + '|' + question.title, question.answers),
    [question.id, question.title, question.answers],
  )

  useEffect(() => {
    if (quizState !== 'active' || !active) return
    if (timeLeft <= 0) {
      setResults(r => { const n = [...r]; n[current] = 'timeout'; return n })
      setQuizState('timeout')
      return
    }
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(id)
  }, [quizState, timeLeft, active, current])

  useEffect(() => {
    if (quizState !== 'answered' && quizState !== 'timeout') return
    const id = setTimeout(() => {
      if (current + 1 >= TOTAL) {
        setQuizResumeIndex(0)
        setQuizState('done')
      } else {
        setCurrent(c => c + 1)
        setSelectedAnswer(null)
        setTimeLeft(quizTimeLimit)
        setQuizState('active')
      }
    }, RESULT_DELAY)
    return () => clearTimeout(id)
  }, [quizState, current, setQuizResumeIndex])

  const handleStart = () => {
    if (quizResumeIndex === 0) setResults(Array(TOTAL).fill(undefined))
    setCurrent(quizResumeIndex)
    setSelectedAnswer(null)
    setTimeLeft(quizTimeLimit)
    setQuizState('active')
  }

  const handleStop = useCallback(() => {
    setQuizResumeIndex(current)
    setSelectedAnswer(null)
    setQuizState('preview')
  }, [current, setQuizResumeIndex])

  const handleAnswer = useCallback((answerId: string) => {
    if (quizState !== 'active') return
    setSelectedAnswer(answerId)
    setResults(r => {
      const n = [...r]
      n[current] = quizQuestions[current].answers.find(a => a.id === answerId)?.correct ? 'correct' : 'wrong'
      return n
    })
    setQuizState('answered')
  }, [quizState, current])

  const goToQuestion = useCallback((index: number) => {
    if (index < 0 || index >= TOTAL) return
    setCurrent(index)
    setSelectedAnswer(null)
    setTimeLeft(quizTimeLimit)
    setQuizState('active')
  }, [])

  const handleRestart = () => {
    setResults(Array(TOTAL).fill(undefined))
    setQuizResumeIndex(0)
    setCurrent(0)
    setSelectedAnswer(null)
    setTimeLeft(quizTimeLimit)
    setQuizState('preview')
  }

  const timerPct = (timeLeft / quizTimeLimit) * 100
  const compact = quizState !== 'preview'

  const dotColor = (i: number) => {
    if (i === current && quizState === 'active') return '#7B61FF'
    if (results[i] === 'correct') return '#3FCC8A'
    if (results[i] === 'wrong' || results[i] === 'timeout') return '#F48B91'
    return '#CFCFD4'
  }

  // Done state — score summary
  if (quizState === 'done') {
    const correct = results.filter(r => r === 'correct').length
    const pct = Math.round((correct / TOTAL) * 100)
    return (
      <div
        className="h-full w-full rounded-[24px] flex flex-col items-center justify-center gap-3"
        style={{ ...cardStyle, padding: '18px 22px', containerType: 'inline-size' }}
      >
        <div
          style={{
            width: 44, height: 44, borderRadius: 14, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: pct >= 60 ? '#DFF8D6' : '#FFE1E4',
            color: pct >= 60 ? '#1A5C38' : '#A8282D',
          }}
        >
          <Trophy size={22} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#0B0B0D', lineHeight: 1 }}>
            {correct}/{TOTAL}
          </div>
          <div style={{ fontSize: 12, color: '#6F6F76', marginTop: 4 }}>правильных ответов</div>
        </div>
        {/* Result dots row */}
        <div className="flex items-center gap-1 flex-wrap justify-center" style={{ maxWidth: 260 }}>
          {results.map((r, i) => (
            <div
              key={i}
              style={{
                width: 8, height: 8, borderRadius: 999,
                background: r === 'correct' ? '#3FCC8A' : r === 'wrong' || r === 'timeout' ? '#F48B91' : '#E0E0E4',
              }}
            />
          ))}
        </div>
        <motion.button
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleRestart}
          style={{
            height: 40, padding: '0 20px', borderRadius: 14, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #C58BFF, #7B61FF)',
            color: '#fff', fontSize: 13.5, fontWeight: 650, lineHeight: 1,
          }}
        >
          Начать заново
        </motion.button>
      </div>
    )
  }

  return (
    <div
      className="h-full w-full rounded-[24px] flex flex-col"
      style={{ ...cardStyle, padding: compact ? `${12 * scale}px ${18 * scale}px` : `${padY}px ${padX}px`, overflow: 'hidden', containerType: 'inline-size' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4" style={{ marginBottom: compact ? 8 : 0, flexShrink: 0 }}>
        <div className="flex min-w-0 flex-1 flex-col items-start" style={{ gap: compact ? 6 : 8 }}>
          {!compact && (
            <span style={{ fontSize: 12, fontWeight: 650, color: '#7B3FCC', background: '#EEDBFF', padding: '5px 12px', borderRadius: 999, lineHeight: 1, flexShrink: 0 }}>
              Викторина дня
            </span>
          )}
          <h3
            style={{
              fontSize: compact ? 15 : 20,
              fontWeight: 700,
              color: '#0B0B0D',
              lineHeight: 1.2,
              ...(compact && {
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical' as const,
                WebkitLineClamp: 3,
                maxHeight: '3.6em',
                overflow: 'hidden',
              }),
            }}
          >
            {compact ? question.title : (
              <SpoilerText revealed={false}>{question.title}</SpoilerText>
            )}
          </h3>
        </div>

        {quizState === 'active' && (
          <div className="flex-shrink-0 flex items-center gap-2">
            <Clock size={16} style={{ color: timerPct < 30 ? '#F48B91' : '#6F6F76' }} />
            <span style={{ fontSize: 14, fontWeight: 650, color: timerPct < 30 ? '#F48B91' : '#6F6F76', minWidth: 46 }}>
              {timeLeft} сек
            </span>
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleStop}
              style={{ width: 30, height: 30, borderRadius: 999, flexShrink: 0, background: '#F0F0F2', color: '#6F6F76', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              aria-label="Остановить"
            >
              <Pause size={15} fill="currentColor" />
            </motion.button>
          </div>
        )}
      </div>

      {/* Preview: start */}
      {quizState === 'preview' && (
        <div className="flex items-center gap-3 flex-wrap" style={{ marginTop: 'auto' }}>
          <motion.button
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStart}
            style={{
              height: 44 * scale, padding: `0 ${22 * scale}px`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, #C58BFF, #7B61FF)',
              borderRadius: 16, color: '#fff', fontSize: 14 * scale, fontWeight: 650, lineHeight: 1, cursor: 'pointer',
            }}
          >
            {quizResumeIndex > 0 ? 'Продолжить' : 'Начать'}
          </motion.button>
          <span style={{ fontSize: 14, color: '#6F6F76' }}>
            {quizResumeIndex > 0
              ? `Остановлено на вопросе ${quizResumeIndex + 1} из ${TOTAL}`
              : `${TOTAL} вопросов · ${quizTimeLimit} сек на каждый`}
          </span>
        </div>
      )}

      {/* Active: answers + pagination */}
      {quizState === 'active' && (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="quiz-answers" style={{ flex: 1, minHeight: 0 }}>
            {shuffledAnswers.map(ans => (
              <motion.button
                key={ans.id}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => handleAnswer(ans.id)}
                className="rounded-2xl text-left cursor-pointer"
                style={{
                  padding: '4px 12px', fontSize: 12.5, fontWeight: 500,
                  background: '#F5F5F6', color: '#0B0B0D', border: '1.5px solid #E8E8EA',
                  minHeight: 0, lineHeight: 1.2, display: 'flex', alignItems: 'center', overflow: 'hidden',
                }}
              >
                <span style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical' as const, WebkitLineClamp: 2, maxHeight: '2.4em', overflow: 'hidden' }}>
                  {ans.text}
                </span>
              </motion.button>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between" style={{ flexShrink: 0 }}>
            <motion.button
              whileHover={{ scale: current === 0 ? 1 : 1.1 }}
              whileTap={{ scale: current === 0 ? 1 : 0.9 }}
              onClick={() => goToQuestion(current - 1)}
              disabled={current === 0}
              style={{ width: 26, height: 26, borderRadius: 999, flexShrink: 0, background: '#F0F0F2', color: '#6F6F76', cursor: current === 0 ? 'default' : 'pointer', opacity: current === 0 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="Предыдущий вопрос"
            >
              <ChevronLeft size={16} />
            </motion.button>

            <div className="flex items-center gap-1.5">
              {quizQuestions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => goToQuestion(i)}
                  aria-label={`Вопрос ${i + 1}`}
                  className="cursor-pointer"
                  style={{ width: i === current ? 18 : 7, height: 7, borderRadius: 999, background: dotColor(i), transition: 'width 0.3s ease, background 0.3s ease' }}
                />
              ))}
            </div>

            <motion.button
              whileHover={{ scale: current === TOTAL - 1 ? 1 : 1.1 }}
              whileTap={{ scale: current === TOTAL - 1 ? 1 : 0.9 }}
              onClick={() => goToQuestion(current + 1)}
              disabled={current === TOTAL - 1}
              style={{ width: 26, height: 26, borderRadius: 999, flexShrink: 0, background: '#F0F0F2', color: '#6F6F76', cursor: current === TOTAL - 1 ? 'default' : 'pointer', opacity: current === TOTAL - 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="Следующий вопрос"
            >
              <ChevronRight size={16} />
            </motion.button>
          </div>
        </div>
      )}

      {/* Result flash states */}
      <AnimatePresence mode="wait">
        {(quizState === 'answered' || quizState === 'timeout') && (
          <motion.div
            key={quizState}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 rounded-2xl"
            style={{
              padding: '12px 20px',
              marginTop: 'auto', marginBottom: 'auto',
              background: quizState === 'answered'
                ? (results[current] === 'correct' ? '#DFF8D6' : '#FFE1E4')
                : '#FFE1E4',
              borderRadius: 16,
            }}
          >
            <span style={{ fontSize: 18, flexShrink: 0, color: quizState === 'timeout' ? '#A8282D' : results[current] === 'correct' ? '#1A5C38' : '#A8282D' }}>
              {quizState === 'timeout' ? '⏱' : results[current] === 'correct' ? '✓' : '✕'}
            </span>
            <p style={{ fontSize: 15, fontWeight: 650, lineHeight: 1.35, color: quizState === 'timeout' ? '#A8282D' : results[current] === 'correct' ? '#1A5C38' : '#A8282D' }}>
              {quizState === 'timeout'
                ? 'Время вышло'
                : results[current] === 'correct'
                  ? `Верно: ${shuffledAnswers.find(a => a.id === selectedAnswer)?.text ?? ''}`
                  : `Неверно: ${shuffledAnswers.find(a => a.id === selectedAnswer)?.text ?? ''}`}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
