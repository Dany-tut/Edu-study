import type { LucideIcon } from 'lucide-react'

type Props = {
  icon: LucideIcon
  label: string
  value: string | number
  sub: string
  accentBg: string
  accentColor: string
  dimmed?: boolean
}

export default function MiniStatCard({ icon: Icon, label, value, sub, accentBg, accentColor, dimmed }: Props) {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'rgba(var(--glass-rgb), 0.88)',
      backdropFilter: 'blur(16px) saturate(180%)',
      WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      border: '1px solid var(--color-border-medium)',
      borderRadius: 24,
      boxShadow: '0 4px 24px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.15)',
      padding: '16px 20px',
      display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {label}
        </span>
        <div style={{
          width: 30, height: 30, borderRadius: 10,
          background: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={14} strokeWidth={2.2} style={{ color: accentColor }} />
        </div>
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color: dimmed ? 'var(--color-text-3)' : 'var(--color-text)', lineHeight: 1, letterSpacing: '-0.5px' }}>
        {value}
      </div>
      <div style={{
        fontSize: 11, fontWeight: 600, color: dimmed ? 'var(--color-text-3)' : accentColor,
        background: dimmed ? 'var(--color-bg-4)' : accentBg,
        borderRadius: 8, padding: '3px 8px', alignSelf: 'flex-start',
      }}>
        {sub}
      </div>
    </div>
  )
}
