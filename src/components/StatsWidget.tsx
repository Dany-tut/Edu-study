import { useStudentData } from '../store/studentDataStore'
import StarStickerLottie from './StarStickerLottie'

const STAT_ICONS: Record<string, string> = {
  'Успеваемость': '📈',
  'Средний балл': '🎯',
  'Общий балл':   '💎',
}

function EmptyValue({ icon }: { icon: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 28, opacity: 0.25, filter: 'grayscale(1)' }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-4)', letterSpacing: 0.2 }}>
        нет данных
      </span>
    </div>
  )
}

export default function StatsWidget({ columns = 1 }: { columns?: number }) {
  const dbStats = useStudentData(s => s.stats)
  const loaded = useStudentData(s => s.loaded)

  const hasData = loaded && dbStats.totalTasks > 0

  const stats = [
    { label: 'Успеваемость', value: hasData ? `${dbStats.performance}%` : null },
    { label: 'Средний балл', value: hasData ? `${dbStats.avgScore}` : null },
    { label: 'Общий балл',   value: hasData ? dbStats.totalPoints.toLocaleString('ru-RU') : null },
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
        data-triple={columns >= 3 ? 'true' : undefined}
        style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`, gridTemplateRows: columns >= 3 ? 'repeat(2, minmax(0, 1fr))' : 'minmax(0, 1fr)' }}
      >
        {stats.map(s => (
          <div key={s.label} className="stat-card flex flex-col items-center justify-center rounded-[24px]" style={{ ...cardStyle, textAlign: 'center', gap: 8 }}>
            <span className="stat-value" style={{ fontWeight: 650, color: 'var(--color-text)', lineHeight: 1 }}>
              {s.value ?? <EmptyValue icon={STAT_ICONS[s.label]} />}
            </span>
            <span className="stat-label" style={{ fontWeight: 500, color: 'var(--color-muted)' }}>
              {s.label}
            </span>
          </div>
        ))}

        {/* Stars card */}
        <div className="stat-card flex flex-col items-center justify-center rounded-[24px]" style={{ ...cardStyle, textAlign: 'center', gap: 8 }}>
          <span className="stat-value" style={{ fontWeight: 650, color: 'var(--color-text)', lineHeight: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
            {hasData ? (
              <>
                <span style={{ display: 'flex', transform: 'translateY(-1px)' }}><StarStickerLottie size={36} /></span>
                <span style={{ display: 'block', lineHeight: 1, transform: 'translateY(-1px)' }}>{dbStats.stars}</span>
              </>
            ) : (
              <EmptyValue icon="⭐" />
            )}
          </span>
          <span className="stat-label" style={{ fontWeight: 500, color: 'var(--color-muted)' }}>
            Звёзды
          </span>
        </div>
      </div>
    </div>
  )
}
