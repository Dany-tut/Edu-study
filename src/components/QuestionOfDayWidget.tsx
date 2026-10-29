import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Check, Sparkles } from 'lucide-react'
import { useStudentData } from '../store/studentDataStore'
import { useT, tc } from '../lib/i18n'

type Props = {
  /** carousel passes this; unused here (no timer/rotation) */
  active?: boolean
  /** how many widget blocks share the row — scales the type down when >1 */
  columns?: number
}

export default function QuestionOfDayWidget({ columns = 1 }: Props) {
  const t = useT()
  const [revealed, setRevealed] = useState(false)
  const quizQuestions = useStudentData(s => s.quizQuestions)
  // One question per calendar day, picked deterministically.
  const day = new Date().getDate()
  const q = quizQuestions[day % Math.max(quizQuestions.length, 1)]
    ?? quizQuestions[0]
    ?? { id: 'q1', title: '…', subject: 'Химия', answers: [] }
  const correct = q.answers.find(a => a.correct)

  const scale = columns >= 3 ? 0.82 : columns >= 2 ? 0.9 : 1
  const padX = 22 * scale
  const padY = 18 * scale

  return (
    <div
      className="flex h-full w-full flex-col rounded-[24px]"
      style={{
        padding: `${padY}px ${padX}px`,
        background: 'rgba(var(--glass-rgb), 0.9)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--color-border-glass)',
        boxShadow: 'var(--shadow-3)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2" style={{ marginBottom: 10 * scale }}>
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12 * scale, fontWeight: 600, lineHeight: 1,
            padding: '6px 12px', borderRadius: 999,
            color: 'var(--color-teal-pill-text)', background: 'var(--color-teal-pill-bg)',
          }}
        >
          <Sparkles size={12 * scale} strokeWidth={2} />
          {t('Вопрос дня')}
        </span>
        <span style={{ fontSize: 12 * scale, fontWeight: 500, color: 'var(--color-muted)' }}>{tc(q.subject)}</span>
      </div>

      {/* Question */}
      <div className="flex flex-1 items-center" style={{ minHeight: 0 }}>
        <h3 style={{ fontSize: 20 * scale, fontWeight: 700, lineHeight: 1.2, color: 'var(--color-text)' }}>
          {q.title}
        </h3>
      </div>

      {/* Footer: reveal button → correct answer. Fixed height so the centered
          question above doesn't jump when the two states swap. */}
      <div style={{ marginTop: 10 * scale, minHeight: 44 * scale, display: 'flex', alignItems: 'center' }}>
        <AnimatePresence mode="wait" initial={false}>
          {!revealed ? (
            <motion.button
              key="reveal"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setRevealed(true)}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                height: 44 * scale, padding: `0 ${22 * scale}px`, borderRadius: 24,
                border: 'none', cursor: 'pointer',
                background: 'var(--grad-teal)',
                color: '#fff', fontSize: 14 * scale, fontWeight: 600,
              }}
            >
              {t('Показать ответ')}
            </motion.button>
          ) : (
            <motion.div
              key="answer"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22 }}
              className="flex items-center gap-2"
            >
              <div
                className="flex items-center gap-2"
                style={{
                  padding: `${8 * scale}px ${14 * scale}px`, borderRadius: 14,
                  background: 'var(--color-green-soft)', color: 'var(--color-green-text)',
                  fontSize: 14 * scale, fontWeight: 600, lineHeight: 1.2,
                }}
              >
                <Check size={16 * scale} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                <span>{correct?.text}</span>
              </div>
              <button
                onClick={() => setRevealed(false)}
                style={{
                  flexShrink: 0, border: 'none', cursor: 'pointer', background: 'none',
                  color: 'var(--color-muted)', fontSize: 13 * scale, fontWeight: 600,
                }}
              >
                {t('Скрыть')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
