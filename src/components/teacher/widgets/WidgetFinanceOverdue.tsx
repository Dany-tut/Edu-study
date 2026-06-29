import { useState } from 'react'
import { AlertCircle, Clock, Check } from 'lucide-react'
import { useAllStudents, useGroups } from '../../../lib/useGroups'
import { useTeacher } from '../../../store/teacherStore'
import { addPayment } from '../../../lib/useFinances'

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function diffDays(iso: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due   = new Date(iso); due.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / 86_400_000)
}

type StatusMeta = { color: string; bg: string; label: string; icon: React.ElementType }

function getStatusMeta(paymentDue?: string): StatusMeta {
  if (!paymentDue) return { color: 'var(--color-text-3)', bg: 'var(--color-bg-3)', label: 'нет данных', icon: Clock }
  const d = diffDays(paymentDue)
  if (d < 0)  return { color: 'var(--color-red-text)', bg: 'var(--color-red-soft)', label: `просрочено ${Math.abs(d)} дн.`, icon: AlertCircle }
  if (d <= 3) return { color: '#C07020', bg: 'var(--color-peach-soft)', label: `через ${d} дн.`, icon: Clock }
  return { color: '#C07020', bg: 'var(--color-peach-soft)', label: `до ${new Date(paymentDue).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`, icon: Clock }
}

export default function WidgetFinanceOverdue() {
  const students = useAllStudents()
  const { groups } = useGroups()
  const setActivePage = useTeacher(s => s.setActivePage)
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set())
  const [paying, setPaying] = useState<string | null>(null)

  const sorted = [...students]
    .filter(s => (s.lessonBalance ?? 0) < 0 || (s.debt ?? 0) > 0 || s.paymentDue)
    .sort((a, b) => {
      const da = a.paymentDue ? diffDays(a.paymentDue) : 999
      const db = b.paymentDue ? diffDays(b.paymentDue) : 999
      return da - db
    })
    .slice(0, 8)

  async function handlePay(studentId: string, amount?: number) {
    if (paying) return
    setPaying(studentId)
    try {
      await addPayment({ studentId, amount: amount ?? 0, lessonsPaid: 1 })
      setPaidIds(prev => new Set([...prev, studentId]))
    } catch {
      // ignore
    }
    setPaying(null)
  }

  if (sorted.length === 0) {
    return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(var(--glass-rgb), 0.88)',
        backdropFilter: 'blur(16px)',
        borderRadius: 24,
        border: '1px solid var(--color-border-medium)',
        gap: 10,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 16,
          background: 'var(--color-green-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Check size={22} strokeWidth={2.5} style={{ color: 'var(--color-green-text)' }} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-2)' }}>Задолженностей нет</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-4)' }}>все ученики в порядке</div>
      </div>
    )
  }

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      background: 'rgba(var(--glass-rgb), 0.88)',
      backdropFilter: 'blur(16px) saturate(180%)',
      WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      borderRadius: 24,
      border: '1px solid var(--color-border-medium)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px 10px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 9,
            background: 'var(--color-red-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertCircle size={14} strokeWidth={2.2} style={{ color: 'var(--color-red-text)' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Должники</span>
          <span style={{
            fontSize: 11, fontWeight: 700, color: 'var(--color-red-text)',
            background: 'var(--color-red-soft)', borderRadius: 20, padding: '1px 7px',
          }}>
            {sorted.length}
          </span>
        </div>
        <button
          onClick={() => setActivePage('finances')}
          style={{
            fontSize: 12, fontWeight: 600, color: 'var(--color-accent)',
            background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px',
            opacity: 0.85,
          }}
        >
          Все →
        </button>
      </div>

      {/* List */}
      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        {sorted.map(s => {
          const group = groups.find(g => g.id === s.groupId)
          const meta = getStatusMeta(s.paymentDue)
          const StatusIcon = meta.icon
          const isPaid = paidIds.has(s.id)

          return (
            <div
              key={s.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 16px',
                transition: 'background 0.15s',
                opacity: isPaid ? 0.5 : 1,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-3)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              {/* Avatar */}
              <div style={{
                width: 34, height: 34, borderRadius: 11, flexShrink: 0,
                background: meta.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: meta.color,
              }}>
                {initials(s.name)}
              </div>

              {/* Name + group */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 650, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.name.split(' ').slice(0, 2).join(' ')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 1 }}>
                  {group?.name ?? ''}
                </div>
              </div>

              {/* Status chip */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                fontSize: 11, fontWeight: 600, color: meta.color,
                background: meta.bg, borderRadius: 8, padding: '3px 8px',
              }}>
                <StatusIcon size={10} strokeWidth={2.5} />
                {meta.label}
              </div>

              {/* Amount */}
              {s.paymentAmount ? (
                <div style={{ fontSize: 12, fontWeight: 700, color: meta.color, flexShrink: 0, minWidth: 60, textAlign: 'right' }}>
                  {s.paymentAmount.toLocaleString('ru-RU')} ₽
                </div>
              ) : null}

              {/* Pay button */}
              <button
                onClick={() => handlePay(s.id, s.paymentAmount)}
                disabled={isPaid || paying === s.id}
                style={{
                  padding: '5px 10px', borderRadius: 8, flexShrink: 0,
                  background: isPaid ? 'var(--color-green-soft)' : 'var(--grad-purple)',
                  border: 'none', cursor: isPaid ? 'default' : 'pointer',
                  color: isPaid ? 'var(--color-green-text)' : '#fff',
                  fontSize: 11, fontWeight: 700,
                  transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: 4,
                } as React.CSSProperties}
              >
                {isPaid ? <><Check size={11} /> Готово</> : 'Оплачено'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
