import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useDashboard } from '../store/dashboardStore'

export default function AnswerFlightLayer() {
  const flight = useDashboard(s => s.answerFlight)
  const clearAnswerFlight = useDashboard(s => s.clearAnswerFlight)

  return createPortal(
    <AnimatePresence>
      {flight && (
        <FlightChip
          key={`${flight.id}-${flight.correct}`}
          correct={flight.correct}
          questionIndex={flight.id}
          fromX={flight.fromX}
          fromY={flight.fromY}
          onDone={clearAnswerFlight}
        />
      )}
    </AnimatePresence>,
    document.body,
  )
}

function FlightChip({
  correct,
  questionIndex,
  fromX,
  fromY,
  onDone,
}: {
  correct: boolean
  questionIndex: number
  fromX: number
  fromY: number
  onDone: () => void
}) {
  // Find the widget pill's center as the landing target.
  const toRef = useRef({ x: fromX, y: fromY })
  useEffect(() => {
    const pill = document.getElementById('widget-pill-target')
    if (pill) {
      const r = pill.getBoundingClientRect()
      toRef.current = { x: r.left + r.width * 0.5, y: r.top + r.height * 0.5 }
    }
  }, [])

  const bg = correct
    ? 'linear-gradient(135deg, #3FCC8A, #2A7D4F)'
    : 'linear-gradient(135deg, #F48B91, #A8282D)'
  const label = correct ? '✓' : '✗'
  const to = toRef.current

  return (
    <motion.div
      initial={{
        x: fromX - 22,
        y: fromY - 22,
        scale: 1,
        opacity: 1,
      }}
      animate={{
        x: to.x - 22,
        y: to.y - 22,
        scale: 0.45,
        opacity: 0,
      }}
      transition={{
        duration: 0.55,
        ease: [0.22, 1, 0.36, 1],
      }}
      onAnimationComplete={onDone}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: 18,
        fontWeight: 800,
        boxShadow: correct
          ? '0 4px 20px rgba(63,204,138,0.6)'
          : '0 4px 20px rgba(244,139,145,0.6)',
        zIndex: 9999,
        pointerEvents: 'none',
        willChange: 'transform, opacity',
        lineHeight: 1,
      }}
    >
      {label}
      {/* Question number badge */}
      <div style={{
        position: 'absolute',
        top: -4,
        right: -4,
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: 'var(--color-bg-input)',
        color: correct ? '#2A7D4F' : '#A8282D',
        fontSize: 8.5,
        fontWeight: 800,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
      }}>
        {questionIndex + 1}
      </div>
    </motion.div>
  )
}
