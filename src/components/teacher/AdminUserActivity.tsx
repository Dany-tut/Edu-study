import { useEffect, useMemo, useState } from 'react'
import { Users, GraduationCap, Clock, RefreshCw } from 'lucide-react'
import {
  fetchUserActivity, fetchTeacherUsage,
  type UserActivityRow, type TeacherUsageRow,
} from '../../lib/plan'

// Админский экран «По пользователям»: активное время, last seen, сессии по
// каждому пользователю + per-teacher usage (активные ученики = будущий счётчик
// тарифного лимита). Данные из analytics_events (миграция 0039).

const PLAN_LABEL: Record<string, string> = {
  free: 'Бесплатный', solo: 'Соло', pro: 'Про', school: 'Школа',
}

function fmtMin(min: number): string {
  if (min < 60) return `${min} мин`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} ч ${m} мин` : `${h} ч`
}

function fmtWhen(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = Date.now()
  const diffH = (now - d.getTime()) / 3_600_000
  if (diffH < 1) return 'только что'
  if (diffH < 24) return `${Math.floor(diffH)} ч назад`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 30) return `${diffD} дн назад`
  return d.toLocaleDateString('ru-RU')
}

const KIND_LABEL: Record<string, { label: string; color: string }> = {
  teacher: { label: 'Учитель', color: 'var(--color-purple)' },
  admin: { label: 'Админ', color: '#D07020' },
  student: { label: 'Ученик', color: '#2E8F76' },
  anon: { label: 'Гость', color: 'var(--color-text-3)' },
}

const DAYS = [7, 30, 90] as const

export default function AdminUserActivity() {
  const [days, setDays] = useState<(typeof DAYS)[number]>(30)
  const [view, setView] = useState<'people' | 'teachers'>('people')
  const [people, setPeople] = useState<UserActivityRow[]>([])
  const [teachers, setTeachers] = useState<TeacherUsageRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    Promise.all([fetchUserActivity(days), fetchTeacherUsage(days)]).then(([p, t]) => {
      if (!alive) return
      setPeople(p); setTeachers(t); setLoading(false)
    })
    return () => { alive = false }
  }, [days])

  const totals = useMemo(() => ({
    people: people.length,
    activeMin: people.reduce((s, r) => s + r.active_min, 0),
    students: people.filter(p => p.actor_kind === 'student').length,
    teachers: teachers.length,
  }), [people, teachers])

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--color-bg-3)', borderRadius: 10, padding: 3 }}>
          {(['people', 'teachers'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                background: view === v ? 'var(--color-purple-soft)' : 'transparent',
                color: view === v ? 'var(--color-purple)' : 'var(--color-text-3)',
              }}
            >
              {v === 'people' ? 'Все пользователи' : 'По учителям'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto', background: 'var(--color-bg-3)', borderRadius: 10, padding: 3 }}>
          {DAYS.map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              style={{
                padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 12.5, fontWeight: 600,
                background: days === d ? 'var(--color-purple-soft)' : 'transparent',
                color: days === d ? 'var(--color-purple)' : 'var(--color-text-3)',
              }}
            >
              {d} дн
            </button>
          ))}
        </div>
        {loading && <RefreshCw size={14} style={{ color: 'var(--color-text-3)', animation: 'spin 1s linear infinite' }} />}
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 18 }}>
        <Kpi icon={Users} label="Пользователей" value={String(totals.people)} />
        <Kpi icon={GraduationCap} label="Учеников активно" value={String(totals.students)} />
        <Kpi icon={Users} label="Учителей" value={String(totals.teachers)} />
        <Kpi icon={Clock} label="Активное время" value={fmtMin(totals.activeMin)} />
      </div>

      {view === 'people' ? (
        <PeopleTable rows={people} />
      ) : (
        <TeachersTable rows={teachers} />
      )}

      <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 12, lineHeight: 1.5 }}>
        «Активное время» ≈ минуты с открытой вкладкой (heartbeat раз в минуту), а не строго активные действия. «Активные ученики» — те, кто заходил за период; это будущий счётчик тарифного лимита.
      </div>
    </div>
  )
}

function Kpi({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)', borderRadius: 14, padding: '13px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <Icon size={14} strokeWidth={2} style={{ color: 'var(--color-text-3)' }} />
        <span style={{ fontSize: 11.5, color: 'var(--color-text-3)', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.4px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase',
  color: 'var(--color-text-3)', textAlign: 'left', fontWeight: 600, padding: '9px 12px',
}
const tdStyle: React.CSSProperties = { padding: '10px 12px', fontSize: 13.5, color: 'var(--color-text-2)', borderTop: '1px solid var(--color-border)' }
const numTd: React.CSSProperties = { ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }

function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--color-border-medium)', borderRadius: 14, background: 'var(--color-bg-2)' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 620 }}>{children}</table>
    </div>
  )
}

function PeopleTable({ rows }: { rows: UserActivityRow[] }) {
  if (rows.length === 0) return <Empty />
  return (
    <TableShell>
      <thead>
        <tr>
          <th style={thStyle}>Пользователь</th>
          <th style={thStyle}>Роль</th>
          <th style={{ ...thStyle, textAlign: 'right' }}>Время</th>
          <th style={{ ...thStyle, textAlign: 'right' }}>Сессий</th>
          <th style={{ ...thStyle, textAlign: 'right' }}>Входов</th>
          <th style={{ ...thStyle, textAlign: 'right' }}>Был(а)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => {
          const k = KIND_LABEL[r.actor_kind] ?? KIND_LABEL.anon
          return (
            <tr key={r.actor_id}>
              <td style={{ ...tdStyle, color: 'var(--color-text)', fontWeight: 600 }}>{r.name}</td>
              <td style={tdStyle}><span style={{ color: k.color, fontWeight: 600, fontSize: 12.5 }}>{k.label}</span></td>
              <td style={numTd}>{fmtMin(r.active_min)}</td>
              <td style={numTd}>{r.sessions}</td>
              <td style={numTd}>{r.logins || '—'}</td>
              <td style={numTd}>{fmtWhen(r.last_seen)}</td>
            </tr>
          )
        })}
      </tbody>
    </TableShell>
  )
}

function TeachersTable({ rows }: { rows: TeacherUsageRow[] }) {
  if (rows.length === 0) return <Empty />
  return (
    <TableShell>
      <thead>
        <tr>
          <th style={thStyle}>Учитель</th>
          <th style={thStyle}>Тариф</th>
          <th style={{ ...thStyle, textAlign: 'right' }}>Ученики (актив/всего)</th>
          <th style={{ ...thStyle, textAlign: 'right' }}>Время</th>
          <th style={{ ...thStyle, textAlign: 'right' }}>Сессий</th>
          <th style={{ ...thStyle, textAlign: 'right' }}>Был(а)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.teacher_id}>
            <td style={{ ...tdStyle, color: 'var(--color-text)', fontWeight: 600 }}>{r.name}</td>
            <td style={tdStyle}>{r.plan_code ? (PLAN_LABEL[r.plan_code] ?? r.plan_code) : <span style={{ color: 'var(--color-text-3)' }}>без тарифа</span>}</td>
            <td style={numTd}><b style={{ color: 'var(--color-text)' }}>{r.active_students}</b> / {r.total_students}</td>
            <td style={numTd}>{fmtMin(r.active_min)}</td>
            <td style={numTd}>{r.sessions}</td>
            <td style={numTd}>{fmtWhen(r.last_seen)}</td>
          </tr>
        ))}
      </tbody>
    </TableShell>
  )
}

function Empty() {
  return (
    <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--color-text-3)', fontSize: 13 }}>
      Нет данных за выбранный период.
    </div>
  )
}
