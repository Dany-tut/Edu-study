import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useCallback } from 'react'
import { Clock, X } from 'lucide-react'
import { quizTimeLimit } from '../data/mockData'
import { useDashboard } from '../store/dashboardStore'
import { useStudentData } from '../store/studentDataStore'
import SpoilerText from './SpoilerText'
import { useT } from '../lib/i18n'

type QuizState = 'preview' | 'active' | 'answered' | 'timeout' | 'done'

export default function StatsQuizRow() {
  const t = useT()
  const { quizDismissed, dismissQuiz } = useDashboard()
  const dbStats = useStudentData(s => s.stats)
  const quizQuestions = useStudentData(s => s.quizQuestions)
  const dailyQuiz = quizQuestions[0] ?? { id: 'q1', title: '…', subject: 'Химия', answers: [], timeLimit: quizTimeLimit }
  const stats = [
    { label: t('Успеваемость'), value: `${dbStats.performance}%`, sub: t('Уровень успеваемости\nпо программе') },
    { label: t('Задания'), value: `${dbStats.completedTasks}/${dbStats.totalTasks}`, sub: t('Выполнено заданий') },
    { label: t('Средний балл'), value: `${dbStats.avgScore}`, sub: t('За месяц') },
    { label: t('Серия'), value: `${dbStats.streak} ${t('дн.')}`, sub: t('Подряд') },
  ]
  const [quizState, setQuizState] = useState<QuizState>('preview')
  const [timeLeft, setTimeLeft] = useState(quizTimeLimit)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)

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

  const showQuiz = !quizDismissed && quizState !== 'done'
  const timerPct = (timeLeft / quizTimeLimit) * 100
  const selectedAnswerText = dailyQuiz.answers.find(a => a.id === selectedAnswer)?.text

  return (
    <div
      className="stats-quiz-row relative"
      data-quiz-open={showQuiz}
      data-quiz-state={quizState}
      data-testid="stats-quiz-row"
    >
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 h-full"
        data-testid="stats-grid"
        animate={{
          opacity: showQuiz ? 0.58 : 1,
          filter: showQuiz ? 'blur(1px)' : 'blur(0px)',
          scale: showQuiz ? 0.992 : 1,
        }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        style={{ gap: 16 }}
      >
        {stats.map(s => (
          <div
            key={s.label}
            className="flex flex-col justify-center rounded-[24px]"
            style={{
              padding: '18px 22px',
              background: 'rgba(var(--glass-rgb), 0.88)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid var(--color-border-glass)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1 }}>
              {s.sub.split('\n')[0]}
            </span>
            <span style={{ fontSize: 28, fontWeight: 650, color: 'var(--color-text)', lineHeight: 1.1 }}>
              {s.value}
            </span>
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-muted)' }}>
              {s.label}
            </span>
          </div>
        ))}
      </motion.div>

      <AnimatePresence>
        {showQuiz && (
          <>
            <motion.div
              key="quiz-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24 }}
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 10,
                borderRadius: 28,
                background: 'rgba(245,245,246,0.62)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <motion.div
                key="quiz"
                data-testid="daily-quiz-overlay"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-[28px]"
                style={{
                  width: '100%',
                  minHeight: quizState === 'preview' ? '100%' : 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: quizState === 'active' ? '28px 28px 28px 28px' : '26px 34px 26px 26px',
                  background: 'rgba(var(--glass-rgb), 0.98)',
                  backdropFilter: 'blur(28px)',
                  WebkitBackdropFilter: 'blur(28px)',
                  border: '1px solid var(--color-border-glass)',
                  boxShadow: '0 18px 54px rgba(21,18,31,0.16), 0 2px 10px rgba(21,18,31,0.08)',
                  pointerEvents: 'auto',
                }}
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
                    <span
                      className="flex-shrink-0"
                      style={{ fontSize: 12, fontWeight: 650, color: 'var(--color-accent)', background: 'var(--color-purple-soft)', padding: '5px 12px', borderRadius: 999, lineHeight: 1 }}
                    >
                      {t('Викторина дня')}
                    </span>
                    <h3 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.12 }}>
                      <SpoilerText revealed={quizState !== 'preview'}>
                        {dailyQuiz.title}
                      </SpoilerText>
                    </h3>
                  </div>
                  {quizState === 'preview' && (
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={dismissQuiz}
                      className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
                      style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-3)', color: 'var(--color-muted)', borderRadius: 999 }}
                      aria-label={t('Закрыть викторину')}
                    >
                      <X size={16} />
                    </motion.button>
                  )}
                  {quizState === 'active' && (
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <Clock size={16} style={{ color: timerPct < 30 ? '#F48B91' : 'var(--color-muted)' }} />
                      <span style={{ fontSize: 14, fontWeight: 650, color: timerPct < 30 ? '#F48B91' : 'var(--color-muted)', minWidth: 46 }}>
                        {timeLeft} {t('сек')}
                      </span>
                      <div style={{ width: 112, height: 6, background: 'var(--color-bg-5)', borderRadius: 999, overflow: 'hidden' }}>
                        <motion.div
                          style={{ height: '100%', borderRadius: 999, background: timerPct < 30 ? '#F48B91' : '#6EE7A0' }}
                          animate={{ width: `${timerPct}%` }}
                          transition={{ duration: 0.5, ease: 'linear' }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {quizState === 'preview' && (
                  <div className="flex items-center gap-3 flex-wrap" style={{ marginTop: 'auto' }}>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleStart}
                      className="px-6 py-3 rounded-2xl text-white font-semibold cursor-pointer flex-shrink-0"
                      style={{
                        minHeight: 44,
                        padding: '0 24px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--grad-purple)',
                        borderRadius: 16,
                        color: '#FFFFFF',
                        fontSize: 15,
                        fontWeight: 650,
                        lineHeight: 1,
                      }}
                    >
                      {t('Начать')}
                    </motion.button>
                    <span style={{ fontSize: 14, color: 'var(--color-muted)' }}>{t('20 секунд на ответ')}</span>
                  </div>
                )}

                {quizState === 'active' && (
                  <div className="grid grid-cols-2 gap-3" style={{ marginTop: 28 }}>
                    {dailyQuiz.answers.map(ans => (
                      <motion.button
                        key={ans.id}
                        whileHover={{ scale: 1.015 }}
                        whileTap={{ scale: 0.985 }}
                        onClick={() => handleAnswer(ans.id)}
                        className="py-3 px-4 rounded-2xl text-left cursor-pointer"
                        style={{
                          padding: '12px 16px',
                          fontSize: 14,
                          fontWeight: 500,
                          background: 'var(--color-bg)',
                          color: 'var(--color-text)',
                          border: '1.5px solid var(--color-border)',
                          minHeight: 54,
                          lineHeight: 1.25,
                        }}
                      >
                        {ans.text}
                      </motion.button>
                    ))}
                  </div>
                )}

                {quizState === 'answered' && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 px-5 py-3 rounded-2xl"
                    style={{ padding: '12px 20px', background: 'var(--color-green-soft)', borderRadius: 16 }}
                  >
                    <span style={{ fontSize: 18, color: 'var(--color-green-text)' }}>✓</span>
                    <p className="truncate" style={{ fontSize: 15, fontWeight: 650, color: 'var(--color-green-text)' }}>
                      {t('Ответ принят')}{selectedAnswerText ? `: ${selectedAnswerText}` : ''}
                    </p>
                  </motion.div>
                )}

                {quizState === 'timeout' && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 px-5 py-3 rounded-2xl"
                    style={{ padding: '12px 20px', background: 'var(--color-red-soft)', borderRadius: 16 }}
                  >
                    <span style={{ fontSize: 18, color: '#A8282D' }}>⏱</span>
                    <p style={{ fontSize: 15, fontWeight: 650, color: '#A8282D' }}>{t('Время вышло')}</p>
                  </motion.div>
                )}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
