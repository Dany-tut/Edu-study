import { motion } from 'framer-motion'
import { TrendingUp, Star, Clock } from 'lucide-react'
import { useTrainerProgress } from '../store/trainerProgressStore'
import { useDashboard } from '../store/dashboardStore'
import { useTheme } from '../store/themeStore'
import { getSubject, resolveSubjectPalette } from '../lib/subjects'
import { formatDur } from '../lib/trainerDay'
import { useT } from '../lib/i18n'

export default function TrainerProgressWidget({ columns }: { columns: number }) {
  const t = useT()
  const { dark } = useTheme()
  const {
    doneCount, wrongCount, totalCount, favCount, todayCorrect, todayWrong,
    subject, subjectId, kind, todayMs, weekMs, counting, setOpenModal,
  } = useTrainerProgress()
  const activePage = useDashboard(s => s.activePage)

  // Тот же предметный цвет, что и в пилюле верхней строки: два виджета про одно
  // и то же не должны быть разного цвета.
  const palette = resolveSubjectPalette(subjectId || subject, dark)
  const accent = palette.accent
  const def = getSubject(subjectId || subject)

  const pct = totalCount ? (doneCount / totalCount) * 100 : 0
  const wrongPct = totalCount ? (wrongCount / totalCount) * 100 : 0
  const wide = columns >= 2

  if (activePage !== 'trainer') {
    return (
      <div style={{ width: '100%', height: '100%', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={16} style={{ color: accent }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{t('Прогресс тренажёра')}</span>
        </div>
        {todayMs > 0 ? (
          <p style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.5, margin: 0 }}>
            {t('Сегодня в тренажёре:')} <b style={{ color: palette.text }}>{formatDur(todayMs)}</b>
            {weekMs > todayMs ? ` · ${t('за неделю')} ${formatDur(weekMs)}` : ''}
          </p>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.5, margin: 0 }}>
            {t('Перейди в Тренажёр, чтобы увидеть свой прогресс по решённым заданиям.')}
          </p>
        )}
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', padding: wide ? '20px 28px' : '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={15} style={{ color: accent }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
            {t(def?.name ?? 'Прогресс')}
          </span>
        </div>
        {kind === 'bank' && (
          <button
            onClick={() => setOpenModal(true)}
            style={{ fontSize: 11, fontWeight: 600, color: palette.text, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {t('Детали →')}
          </button>
        )}
      </div>

      {/* Big stat row. Время стоит первым: это единственная цифра, которая
          растёт на любом предмете и в любом режиме. */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, padding: '12px 14px', borderRadius: 14, background: `${accent}1F`, textAlign: 'center' }}>
          <div style={{ fontSize: wide ? 28 : 22, fontWeight: 750, color: palette.text, lineHeight: 1 }}>
            {Math.floor(todayMs / 60000)}
          </div>
          <div style={{ fontSize: 10, color: palette.text, opacity: 0.75, marginTop: 4 }}>{t('Мин сегодня')}</div>
        </div>
        <div style={{ flex: 1, padding: '12px 14px', borderRadius: 14, background: 'var(--color-green-soft)', textAlign: 'center' }}>
          <div style={{ fontSize: wide ? 28 : 22, fontWeight: 750, color: 'var(--color-green-text)', lineHeight: 1 }}>{doneCount}</div>
          <div style={{ fontSize: 10, color: 'var(--color-green-text)', opacity: 0.75, marginTop: 4 }}>
            {kind === 'lang' ? t('Выучено') : t('Верно')}
          </div>
        </div>
        <div style={{ flex: 1, padding: '12px 14px', borderRadius: 14, background: 'var(--color-bg)', textAlign: 'center' }}>
          <div style={{ fontSize: wide ? 28 : 22, fontWeight: 750, color: 'var(--color-text)', lineHeight: 1 }}>{totalCount}</div>
          <div style={{ fontSize: 10, color: 'var(--color-muted)', marginTop: 4 }}>{t('Всего')}</div>
        </div>
        {wide && kind === 'bank' && (
          <div style={{ flex: 1, padding: '12px 14px', borderRadius: 14, background: 'var(--color-bg)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Star size={16} style={{ color: 'var(--color-muted)' }} />
            <div style={{ fontSize: 22, fontWeight: 750, color: 'var(--color-text)', lineHeight: 1 }}>{favCount}</div>
            <div style={{ fontSize: 10, color: 'var(--color-muted)' }}>{t('Избр.')}</div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>
              {kind === 'lang' ? t('Выучено из разговорника') : t('Решено верно')}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text)' }}>{Math.round(pct)}%</span>
          </div>
          <div style={{ height: 7, borderRadius: 999, background: 'var(--color-bg-5)', overflow: 'hidden', display: 'flex' }}>
            <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ height: '100%', background: accent, flexShrink: 0 }} />
            <motion.div animate={{ width: `${wrongPct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ height: '100%', background: '#F48B91', flexShrink: 0 }} />
          </div>
        </div>
      )}

      {/* Today row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Clock size={11} /> {t('Сегодня')}
        </span>
        {/* Та же точка, что в пилюле верхней строки: идёт счёт или пауза. */}
        <span style={{ padding: '3px 9px', borderRadius: 999, background: `${accent}1F`, color: palette.text, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <motion.span
            aria-label={counting ? t('Время идёт') : t('Пауза')}
            animate={counting ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
            transition={counting ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
            style={{
              width: 6, height: 6, borderRadius: '50%', display: 'block', flexShrink: 0,
              background: counting ? accent : 'transparent',
              border: counting ? 'none' : '1px solid var(--color-text-3)',
            }}
          />
          {formatDur(todayMs)}
        </span>
        {todayCorrect > 0 && (
          <span style={{ padding: '3px 9px', borderRadius: 999, background: 'var(--color-green-soft)', color: 'var(--color-green-text)', fontSize: 11, fontWeight: 700 }}>✓ {todayCorrect}</span>
        )}
        {todayWrong > 0 && (
          <span style={{ padding: '3px 9px', borderRadius: 999, background: 'var(--color-red-soft)', color: 'var(--color-red-text)', fontSize: 11, fontWeight: 700 }}>✗ {todayWrong}</span>
        )}
      </div>
    </div>
  )
}
