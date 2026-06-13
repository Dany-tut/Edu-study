import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp } from 'lucide-react'
import { useTrainerProgress } from '../store/trainerProgressStore'

export default function TrainerProgressPill() {
  const { doneCount, wrongCount, totalCount, favCount, todayCorrect, todayWrong, setOpenModal } = useTrainerProgress()

  const pct = totalCount ? (doneCount / totalCount) * 100 : 0
  const wrongPct = totalCount ? (wrongCount / totalCount) * 100 : 0

  return (
    <motion.button
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: [0, -7, 4, -2, 0.8, 0] }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.38, ease: [0.34, 1.56, 0.64, 1] }}
      onClick={() => setOpenModal(true)}
      style={{
        all: 'unset',
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
        padding: '10px 14px',
        borderRadius: 18,
        background: 'rgba(var(--glass-rgb), 0.94)',
        border: '1px solid var(--color-border-soft)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        cursor: 'pointer',
        width: 260,
        boxSizing: 'border-box',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        textAlign: 'left',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'var(--color-green-accent)'
        el.style.boxShadow = '0 6px 24px rgba(0,0,0,0.11)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'var(--color-border-soft)'
        el.style.boxShadow = '0 4px 20px rgba(0,0,0,0.07)'
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <TrendingUp size={13} style={{ color: 'var(--color-green-accent)' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>Прогресс</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text)' }}>
            {doneCount}
            <span style={{ color: 'var(--color-muted)', fontWeight: 500 }}> / {totalCount}</span>
          </span>
          {wrongCount > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-red-text)' }}>
              {wrongCount} ош.
            </span>
          )}
          {favCount > 0 && (
            <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>★ {favCount}</span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, borderRadius: 999, background: 'var(--color-bg-5)', overflow: 'hidden', display: 'flex' }}>
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ height: '100%', background: 'var(--color-green-accent)', flexShrink: 0 }}
        />
        <motion.div
          animate={{ width: `${wrongPct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ height: '100%', background: '#F48B91', flexShrink: 0 }}
        />
      </div>

      {/* Today stats */}
      <AnimatePresence>
        {(todayCorrect > 0 || todayWrong > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}
          >
            <span style={{ fontSize: 10, color: 'var(--color-muted)' }}>Сегодня</span>
            {todayCorrect > 0 && (
              <span style={{ padding: '1px 7px', borderRadius: 999, background: 'var(--color-green-soft)', color: 'var(--color-green-text)', fontSize: 10, fontWeight: 700 }}>✓ {todayCorrect}</span>
            )}
            {todayWrong > 0 && (
              <span style={{ padding: '1px 7px', borderRadius: 999, background: 'var(--color-red-soft)', color: 'var(--color-red-text)', fontSize: 10, fontWeight: 700 }}>✗ {todayWrong}</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
