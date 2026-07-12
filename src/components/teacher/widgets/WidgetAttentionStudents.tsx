import { AlertCircle, ChevronRight, Clock } from 'lucide-react'
import { useAllStudents, useGroups } from '../../../lib/useGroups'
import { useTeacher } from '../../../store/teacherStore'
import { t, useT } from '../../../lib/i18n'

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function diffDays(iso: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due   = new Date(iso); due.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / 86_400_000)
}

type Reason = { label: string; color: string; bg: string; icon: React.ElementType }

function getReason(s: ReturnType<typeof useAllStudents>[number]): Reason {
  const balance = s.lessonBalance ?? 0
  if (s.paymentDue && diffDays(s.paymentDue) < 0) {
    return { label: t('просрочена оплата'), color: 'var(--color-red-text)', bg: 'var(--color-red-soft)', icon: AlertCircle }
  }
  if (balance < -1) {
    return { label: `${t('баланс')} ${balance} ${t('зан.')}`, color: 'var(--color-red-text)', bg: 'var(--color-red-soft)', icon: AlertCircle }
  }
  if (s.paymentDue && diffDays(s.paymentDue) <= 3) {
    return { label: `${t('оплата через')} ${diffDays(s.paymentDue)} ${t('дн.')}`, color: '#C07020', bg: 'var(--color-peach-soft)', icon: Clock }
  }
  return { label: `${t('баланс')} 0 ${t('зан.')}`, color: '#C07020', bg: 'var(--color-peach-soft)', icon: Clock }
}

export default function WidgetAttentionStudents() {
  const t = useT()
  const students = useAllStudents()
  const { groups } = useGroups()
  const openStudentDashboard = useTeacher(s => s.openStudentDashboard)

  const atRisk = students
    .filter(s => {
      const balance = s.lessonBalance ?? 0
      if (balance < 0) return true
      if (s.paymentDue && diffDays(s.paymentDue) <= 3) return true
      return false
    })
    .sort((a, b) => {
      const da = a.paymentDue ? diffDays(a.paymentDue) : 99
      const db = b.paymentDue ? diffDays(b.paymentDue) : 99
      return da - db
    })
    .slice(0, 8)

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      background: 'rgba(var(--glass-rgb), 0.88)',
      backdropFilter: 'blur(16px) saturate(180%)',
      WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      borderRadius: 24,
      border: '1px solid var(--color-border-medium)',
      // shadow on wrapper
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px 10px',
        display: 'flex', alignItems: 'center', gap: 8,
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 9,
          background: atRisk.length > 0 ? 'var(--color-peach-soft)' : 'var(--color-green-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AlertCircle size={14} strokeWidth={2.2} style={{ color: atRisk.length > 0 ? '#C07020' : 'var(--color-green-text)' }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{t('Требуют внимания')}</span>
        {atRisk.length > 0 && (
          <span style={{
            fontSize: 11, fontWeight: 700, color: '#C07020',
            background: 'var(--color-peach-soft)', borderRadius: 20, padding: '1px 7px',
          }}>
            {atRisk.length}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        {atRisk.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '100%', gap: 8, color: 'var(--color-text-4)',
          }}>
            <div style={{ fontSize: 28 }}>🎉</div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-green-text)' }}>{t('Все ученики в норме')}</span>
            <span style={{ fontSize: 11, color: 'var(--color-text-4)' }}>{t('никаких срочных вопросов')}</span>
          </div>
        ) : (
          atRisk.map((s, i) => {
            const group = groups.find(g => g.id === s.groupId)
            const reason = getReason(s)
            const ReasonIcon = reason.icon

            return (
              <div
                key={s.id}
                onClick={() => openStudentDashboard(s.id, s.groupId)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 16px',
                  borderBottom: i < atRisk.length - 1 ? '1px solid var(--color-border)' : 'none',
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-3)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                {/* Avatar */}
                <div style={{
                  width: 34, height: 34, borderRadius: 11, flexShrink: 0,
                  background: reason.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: reason.color,
                }}>
                  {initials(s.name)}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 650, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.name.split(' ').slice(0, 2).join(' ')}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 1 }}>
                    {group?.name ?? ''}
                  </div>
                </div>

                {/* Reason chip */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                  fontSize: 11, fontWeight: 600, color: reason.color,
                  background: reason.bg, borderRadius: 8, padding: '3px 8px',
                }}>
                  <ReasonIcon size={10} strokeWidth={2.5} />
                  {reason.label}
                </div>

                <ChevronRight size={14} strokeWidth={2} style={{ color: 'var(--color-text-4)', flexShrink: 0 }} />
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
