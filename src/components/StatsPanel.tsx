import { motion } from 'framer-motion'
import { useStudentData } from '../store/studentDataStore'
import { useT } from '../lib/i18n'

export default function StatsPanel() {
  const t = useT()
  const s = useStudentData(d => d.stats)
  const stats = [
    { label: t('Успеваемость'), value: `${s.performance}%`, sub: t('Уровень') },
    { label: t('Задания'), value: `${s.completedTasks}/${s.totalTasks}`, sub: t('Выполнено') },
    { label: t('Средний балл'), value: `${s.avgScore}`, sub: t('За месяц') },
    { label: t('Серия'), value: `${s.streak} ${t('дн.')}`, sub: t('Подряд') },
  ]
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      className="rounded-[32px] p-8 grid grid-cols-2 gap-4 lg:grid-cols-4"
      style={{
        background: 'rgba(var(--glass-rgb), 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--color-border-glass)',
        boxShadow: '0 4px 32px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      {stats.map((s) => (
        <div key={s.label} className="flex flex-col gap-1">
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {s.sub}
          </span>
          <span style={{ fontSize: 36, fontWeight: 650, color: 'var(--color-text)', lineHeight: 1 }}>
            {s.value}
          </span>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-muted)' }}>
            {s.label}
          </span>
        </div>
      ))}
    </motion.div>
  )
}
