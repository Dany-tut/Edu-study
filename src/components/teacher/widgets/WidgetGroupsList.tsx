import { Users, ChevronRight } from 'lucide-react'
import { useGroups } from '../../../lib/useGroups'
import { useTeacher } from '../../../store/teacherStore'

export default function WidgetGroupsList() {
  const { groups } = useGroups()
  const setActivePage = useTeacher(s => s.setActivePage)

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
            background: 'var(--color-purple-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Users size={14} strokeWidth={2.2} style={{ color: 'var(--color-accent)' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Группы</span>
          <span style={{
            fontSize: 11, fontWeight: 700, color: 'var(--color-accent)',
            background: 'var(--color-purple-soft)', borderRadius: 20, padding: '1px 7px',
          }}>
            {groups.length}
          </span>
        </div>
        <button
          onClick={() => setActivePage('groups')}
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
        {groups.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '100%', gap: 8, color: 'var(--color-text-4)',
          }}>
            <Users size={28} strokeWidth={1.5} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Групп пока нет</span>
          </div>
        ) : (
          groups.map((g, i) => (
            <div
              key={g.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 16px',
                borderBottom: i < groups.length - 1 ? '1px solid var(--color-border)' : 'none',
                cursor: 'pointer', transition: 'background 0.15s',
              }}
              onClick={() => setActivePage('groups')}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-3)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              {/* Group chip */}
              <div style={{
                width: 36, height: 36, borderRadius: 12, flexShrink: 0,
                background: `${g.color}22`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 17,
              }}>
                {g.icon ?? '📚'}
              </div>

              {/* Name */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 650, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {g.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 1 }}>
                  {g.subject ?? ''}
                </div>
              </div>

              {/* Student count */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 12, fontWeight: 700,
                color: g.color ?? 'var(--color-accent)',
                background: `${g.color}18`,
                borderRadius: 8, padding: '3px 9px', flexShrink: 0,
              }}>
                <Users size={11} strokeWidth={2.2} />
                {g.studentCount}
              </div>

              <ChevronRight size={14} strokeWidth={2} style={{ color: 'var(--color-text-4)', flexShrink: 0 }} />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
