import { CheckCircle2, Wallet } from 'lucide-react'
import { usePayments } from '../../../lib/useFinances'
import { useAllStudents } from '../../../lib/useGroups'
import Skeleton from '../../Skeleton'
import { t, useT } from '../../../lib/i18n'

function fmtDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)
  if (diffDays === 0) return t('сегодня')
  if (diffDays === 1) return t('вчера')
  if (diffDays < 7)  return `${diffDays} ${t('дн. назад')}`
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function WidgetFinanceActivity() {
  const t = useT()
  const { payments, loading } = usePayments()
  const students = useAllStudents()

  const recent = payments.slice(0, 8)

  const getStudent = (id: string) => students.find(s => s.id === id)

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
          background: 'var(--color-green-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Wallet size={14} strokeWidth={2.2} style={{ color: 'var(--color-green-text)' }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
          {t('История платежей')}
        </span>
      </div>

      {/* List */}
      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        {loading ? (
          <div style={{ padding: '4px 2px' }} aria-busy="true"><Skeleton.List rows={3} gap={14} /></div>
        ) : recent.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '100%', gap: 8, color: 'var(--color-text-4)',
          }}>
            <Wallet size={28} strokeWidth={1.5} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>{t('Платежей ещё нет')}</span>
          </div>
        ) : (
          recent.map((p, i) => {
            const student = getStudent(p.studentId)
            return (
              <div
                key={p.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 16px',
                  borderBottom: i < recent.length - 1 ? '1px solid var(--color-border)' : 'none',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-3)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                {/* Icon / avatar */}
                <div style={{
                  width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                  background: 'var(--color-green-soft)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, color: 'var(--color-green-text)',
                }}>
                  {student ? initials(student.name) : <CheckCircle2 size={14} strokeWidth={2.2} />}
                </div>

                {/* Name + note */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {student?.name.split(' ').slice(0, 2).join(' ') ?? t('Ученик')}
                  </div>
                  {(p.note || p.lessonsPaid > 0) && (
                    <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 1 }}>
                      {[p.note, p.lessonsPaid > 0 ? `${p.lessonsPaid} ${t('зан.')}` : ''].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>

                {/* Amount */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-green-text)' }}>
                    +{p.amount.toLocaleString('ru-RU')} ₽
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-4)', marginTop: 1 }}>
                    {fmtDate(p.paidAt)}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
