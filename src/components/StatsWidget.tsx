import { student } from '../data/mockData'

const stats = [
  { label: 'Успеваемость', value: `${student.stats.performance}%` },
  { label: 'Средний балл', value: `${student.stats.avgScore}` },
  { label: 'Общий балл', value: student.stats.totalPoints.toLocaleString('ru-RU') },
]

export default function StatsWidget() {
  return (
    <div className="relative h-full w-full" style={{ containerType: 'inline-size' }}>
      <div className="stats-grid h-full" data-testid="stats-grid">
        {stats.map(s => (
          <div
            key={s.label}
            className="stat-card flex flex-col justify-center gap-1.5 rounded-[24px]"
            style={{
              minWidth: 0,
              background: 'rgba(255,255,255,0.88)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.62)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            }}
          >
            <span className="stat-value" style={{ fontWeight: 650, color: '#0B0B0D', lineHeight: 1 }}>
              {s.value}
            </span>
            <span className="stat-label" style={{ fontWeight: 500, color: '#6F6F76' }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
