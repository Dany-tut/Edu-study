import { useStudentData } from '../store/studentDataStore'
import StarStickerLottie from './StarStickerLottie'

export default function StatsWidget({ columns = 1 }: { columns?: number }) {
  const dbStats = useStudentData(s => s.stats)
  const loaded = useStudentData(s => s.loaded)

  const hasData = loaded && dbStats.totalTasks > 0
  const dash = '—'

  const stats = [
    { label: 'Успеваемость', value: hasData ? `${dbStats.performance}%` : dash },
    { label: 'Средний балл', value: hasData ? `${dbStats.avgScore}` : dash },
    { label: 'Общий балл',   value: hasData ? dbStats.totalPoints.toLocaleString('ru-RU') : dash },
  ]

  const cardStyle: React.CSSProperties = {
    minWidth: 0,
    background: 'rgba(var(--glass-rgb), 0.88)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid var(--color-border-glass)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
  }

  // ≤2 widgets per row → single row of 4; ≥3 → 2×2
  const gridCols = columns >= 3 ? 2 : 4

  return (
    <div className="relative h-full w-full">
      <div
        className="stats-grid h-full"
        data-testid="stats-grid"
        style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`, gridTemplateRows: columns >= 3 ? 'repeat(2, minmax(0, 1fr))' : 'minmax(0, 1fr)' }}
      >
        {stats.map(s => (
          <div key={s.label} className="stat-card flex flex-col justify-between rounded-[24px]" style={cardStyle}>
            <span className="stat-value" style={{ fontWeight: 650, color: 'var(--color-text)', lineHeight: 1 }}>
              {s.value}
            </span>
            <span className="stat-label" style={{ fontWeight: 500, color: 'var(--color-muted)' }}>
              {s.label}
            </span>
          </div>
        ))}

        {/* Stars card */}
        <div className="stat-card flex flex-col justify-between rounded-[24px]" style={cardStyle}>
          <span className="stat-value" style={{ fontWeight: 650, color: 'var(--color-text)', lineHeight: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'flex', transform: 'translateY(-6px)' }}><StarStickerLottie size={36} /></span>
            <span style={{ display: 'block', lineHeight: 1, transform: 'translateY(-1px)' }}>{hasData ? dbStats.stars : dash}</span>
          </span>
          <span className="stat-label" style={{ fontWeight: 500, color: 'var(--color-muted)' }}>
            Звёзды
          </span>
        </div>
      </div>
    </div>
  )
}
