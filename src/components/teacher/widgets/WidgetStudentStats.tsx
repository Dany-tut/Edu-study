import { Users, Layers, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAllStudents, useGroups } from '../../../lib/useGroups'
import { useT } from '../../../lib/i18n'

type StatCardProps = {
  icon: React.ElementType
  label: string
  value: number
  sub: string
  accentBg: string
  accentColor: string
}

function StatCard({ icon: Icon, label, value, sub, accentBg, accentColor }: StatCardProps) {
  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: 'rgba(var(--glass-rgb), 0.88)',
      backdropFilter: 'blur(16px) saturate(180%)',
      WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      border: '1px solid var(--color-border-medium)',
      borderRadius: 24,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
      padding: '16px 18px',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {label}
        </span>
        <div style={{
          width: 30, height: 30, borderRadius: 10,
          background: accentBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={14} strokeWidth={2.2} style={{ color: accentColor }} />
        </div>
      </div>

      <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1, letterSpacing: '-1px' }}>
        {value}
      </div>

      <div style={{
        fontSize: 11, fontWeight: 600, color: accentColor,
        background: accentBg, borderRadius: 8, padding: '3px 8px',
        alignSelf: 'flex-start',
      }}>
        {sub}
      </div>
    </div>
  )
}

export default function WidgetStudentStats() {
  const t = useT()
  const students = useAllStudents()
  const { groups } = useGroups()

  const totalStudents  = students.length
  const totalGroups    = groups.length
  const activeStudents = students.filter(s => (s.lessonBalance ?? 0) >= 0).length
  const debtStudents   = students.filter(s => (s.lessonBalance ?? 0) < 0).length

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <StatCard
        icon={Users}
        label={t('Учеников')}
        value={totalStudents}
        sub={`${t('в')} ${totalGroups} ${t('группах')}`}
        accentBg="var(--color-purple-soft)"
        accentColor="var(--color-accent)"
      />
      <StatCard
        icon={Layers}
        label={t('Групп')}
        value={totalGroups}
        sub={t('активных')}
        accentBg="var(--color-blue-pill-bg, rgba(59,91,219,0.12))"
        accentColor="#3B5BDB"
      />
      <StatCard
        icon={CheckCircle2}
        label={t('Активных')}
        value={activeStudents}
        sub={t('без задолженностей')}
        accentBg="var(--color-green-soft)"
        accentColor="var(--color-green-text)"
      />
      <StatCard
        icon={AlertCircle}
        label={t('Должников')}
        value={debtStudents}
        sub={debtStudents > 0 ? t('требуют внимания') : t('всё в порядке')}
        accentBg={debtStudents > 0 ? 'var(--color-red-soft)' : 'var(--color-green-soft)'}
        accentColor={debtStudents > 0 ? 'var(--color-red-text)' : 'var(--color-green-text)'}
      />
    </div>
  )
}
