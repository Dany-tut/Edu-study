import { student } from '../data/mockData'
import { useDashboard } from '../store/dashboardStore'
import StarStickerLottie from './StarStickerLottie'

export default function StatsWidget() {
  const lessonAssessments = useDashboard(s => s.lessonAssessments)
  const starCount = Object.values(lessonAssessments).filter(a => a.hardCompleted).length

  const stats = [
    { label: 'Успеваемость', value: `${student.stats.performance}%` },
    { label: 'Средний балл', value: `${student.stats.avgScore}` },
    { label: 'Общий балл', value: student.stats.totalPoints.toLocaleString('ru-RU') },
  ]

  const cardStyle: React.CSSProperties = {
    minWidth: 0,
    background: 'rgba(255,255,255,0.88)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.62)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
  }

  return (
    <div className="relative h-full w-full" style={{ containerType: 'inline-size' }}>
      <div className="stats-grid h-full" data-testid="stats-grid">
        {stats.map(s => (
          <div key={s.label} className="stat-card flex flex-col justify-between rounded-[24px]" style={cardStyle}>
            <span className="stat-value" style={{ fontWeight: 650, color: '#0B0B0D', lineHeight: 1 }}>
              {s.value}
            </span>
            <span className="stat-label" style={{ fontWeight: 500, color: '#6F6F76' }}>
              {s.label}
            </span>
          </div>
        ))}

        {/* Stars card */}
        <div className="stat-card flex flex-col justify-between rounded-[24px]" style={cardStyle}>
          <span className="stat-value" style={{ fontWeight: 650, color: '#0B0B0D', lineHeight: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'flex', transform: 'translateY(-6px)' }}><StarStickerLottie size={36} /></span>
            <span style={{ display: 'block', lineHeight: 1, transform: 'translateY(-1px)' }}>{starCount}</span>
          </span>
          <span className="stat-label" style={{ fontWeight: 500, color: '#6F6F76' }}>
            Звёзды
          </span>
        </div>
      </div>
    </div>
  )
}
