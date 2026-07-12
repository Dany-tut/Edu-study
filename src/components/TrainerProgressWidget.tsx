import { motion } from 'framer-motion'
import { TrendingUp, Star } from 'lucide-react'
import { useTrainerProgress } from '../store/trainerProgressStore'
import { useDashboard } from '../store/dashboardStore'
import { useT } from '../lib/i18n'

export default function TrainerProgressWidget({ columns }: { columns: number }) {
  const t = useT()
  const { doneCount, wrongCount, totalCount, favCount, todayCorrect, todayWrong, setOpenModal } = useTrainerProgress()
  const activePage = useDashboard(s => s.activePage)

  const pct = totalCount ? (doneCount / totalCount) * 100 : 0
  const wrongPct = totalCount ? (wrongCount / totalCount) * 100 : 0
  const wide = columns >= 2

  if (activePage !== 'trainer') {
    return (
      <div style={{ width: '100%', height: '100%', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={16} style={{ color: 'var(--color-green-accent)' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{t('Прогресс тренажёра')}</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.5, margin: 0 }}>
          {t('Перейди в Тренажёр, чтобы увидеть свой прогресс по решённым заданиям.')}
        </p>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', padding: wide ? '20px 28px' : '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={15} style={{ color: 'var(--color-green-accent)' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{t('Прогресс')}</span>
        </div>
        <button
          onClick={() => setOpenModal(true)}
          style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-green-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          {t('Детали →')}
        </button>
      </div>

      {/* Big stat row */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, padding: '12px 14px', borderRadius: 14, background: 'var(--color-green-soft)', textAlign: 'center' }}>
          <div style={{ fontSize: wide ? 28 : 22, fontWeight: 750, color: 'var(--color-green-text)', lineHeight: 1 }}>{doneCount}</div>
          <div style={{ fontSize: 10, color: 'var(--color-green-text)', opacity: 0.75, marginTop: 4 }}>{t('Верно')}</div>
        </div>
        <div style={{ flex: 1, padding: '12px 14px', borderRadius: 14, background: 'var(--color-red-soft)', textAlign: 'center' }}>
          <div style={{ fontSize: wide ? 28 : 22, fontWeight: 750, color: 'var(--color-red-text)', lineHeight: 1 }}>{wrongCount}</div>
          <div style={{ fontSize: 10, color: 'var(--color-red-text)', opacity: 0.75, marginTop: 4 }}>{t('Ошибок')}</div>
        </div>
        <div style={{ flex: 1, padding: '12px 14px', borderRadius: 14, background: 'var(--color-bg)', textAlign: 'center' }}>
          <div style={{ fontSize: wide ? 28 : 22, fontWeight: 750, color: 'var(--color-text)', lineHeight: 1 }}>{totalCount}</div>
          <div style={{ fontSize: 10, color: 'var(--color-muted)', marginTop: 4 }}>{t('Всего')}</div>
        </div>
        {wide && (
          <div style={{ flex: 1, padding: '12px 14px', borderRadius: 14, background: 'var(--color-bg)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Star size={16} style={{ color: 'var(--color-muted)' }} />
            <div style={{ fontSize: 22, fontWeight: 750, color: 'var(--color-text)', lineHeight: 1 }}>{favCount}</div>
            <div style={{ fontSize: 10, color: 'var(--color-muted)' }}>{t('Избр.')}</div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>{t('Решено верно')}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text)' }}>{Math.round(pct)}%</span>
        </div>
        <div style={{ height: 7, borderRadius: 999, background: 'var(--color-bg-5)', overflow: 'hidden', display: 'flex' }}>
          <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ height: '100%', background: 'var(--color-green-accent)', flexShrink: 0 }} />
          <motion.div animate={{ width: `${wrongPct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ height: '100%', background: '#F48B91', flexShrink: 0 }} />
        </div>
      </div>

      {/* Today row */}
      {(todayCorrect > 0 || todayWrong > 0) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>{t('Сегодня')}</span>
          {todayCorrect > 0 && (
            <span style={{ padding: '3px 9px', borderRadius: 999, background: 'var(--color-green-soft)', color: 'var(--color-green-text)', fontSize: 11, fontWeight: 700 }}>✓ {todayCorrect}</span>
          )}
          {todayWrong > 0 && (
            <span style={{ padding: '3px 9px', borderRadius: 999, background: 'var(--color-red-soft)', color: 'var(--color-red-text)', fontSize: 11, fontWeight: 700 }}>✗ {todayWrong}</span>
          )}
        </div>
      )}
    </div>
  )
}
