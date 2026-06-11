import { motion } from 'framer-motion'
import { useStudentData } from '../store/studentDataStore'

export default function StatsPanel() {
  const s = useStudentData(d => d.stats)
  const stats = [
    { label: 'Успеваемость', value: `${s.performance}%`, sub: 'Уровень' },
    { label: 'Задания', value: `${s.completedTasks}/${s.totalTasks}`, sub: 'Выполнено' },
    { label: 'Средний балл', value: `${s.avgScore}`, sub: 'За месяц' },
    { label: 'Серия', value: `${s.streak} дн.`, sub: 'Подряд' },
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
