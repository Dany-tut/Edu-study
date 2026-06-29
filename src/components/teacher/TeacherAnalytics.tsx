import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Activity, Users, CalendarClock, Layers, TrendingUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type Overview = {
  events_total: number
  sessions: number
  dau: number
  wau: number
  mau: number
  students_total: number
  students_active: number
  groups_total: number
}
type HeatCell = { dow: number; hour: number; cnt: number }
type DailyRow = { day: string; events: number; users: number }
type BreakdownRow = { event: string; cnt: number }
type Funnel = { assigned: number; started: number; submitted: number; completed: number }

const ACCENT = '#786AD7'
const DOW_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] // display order (Mon-first)
const DOW_PG = [1, 2, 3, 4, 5, 6, 0] // Postgres extract(dow): 0=Sun … 6=Sat
const EVENT_LABELS: Record<string, string> = {
  session_start: 'Старт сессии',
  page_view: 'Просмотр страницы',
  heartbeat: 'Активность (пульс)',
  action: 'Действие',
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'rgba(var(--glass-rgb), 0.6)', border: '1px solid var(--color-border-medium)', borderRadius: 16, padding: 18, ...style }}>
      {children}
    </div>
  )
}

function Kpi({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string | number; sub?: string }) {
  return (
    <Card style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <Icon size={14} strokeWidth={2} style={{ color: 'var(--color-text-3)' }} />
        <span style={{ fontSize: 11.5, color: 'var(--color-text-3)', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 4 }}>{sub}</div>}
    </Card>
  )
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>{children}</div>
)

export default function TeacherAnalytics() {
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [heat, setHeat] = useState<HeatCell[]>([])
  const [daily, setDaily] = useState<DailyRow[]>([])
  const [breakdown, setBreakdown] = useState<BreakdownRow[]>([])
  const [funnel, setFunnel] = useState<Funnel | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function load() {
    setLoading(true); setErr(null)
    const [ov, hm, dl, bd, fn] = await Promise.all([
      supabase.rpc('admin_analytics_overview', { p_days: days }),
      supabase.rpc('admin_activity_heatmap', { p_days: days }),
      supabase.rpc('admin_daily_activity', { p_days: days }),
      supabase.rpc('admin_event_breakdown', { p_days: days }),
      supabase.rpc('admin_progress_funnel'),
    ])
    if (ov.error && /function|does not exist|schema/i.test(ov.error.message)) {
      setErr('Миграция аналитики ещё не применена к базе.')
    }
    setOverview((ov.data as Overview) ?? null)
    setHeat((hm.data as HeatCell[]) ?? [])
    setDaily((dl.data as DailyRow[]) ?? [])
    setBreakdown((bd.data as BreakdownRow[]) ?? [])
    setFunnel((fn.data as Funnel) ?? null)
    setLoading(false)
  }

  useEffect(() => { load() }, [days]) // eslint-disable-line react-hooks/exhaustive-deps

  // Heatmap lookup + max for colour scaling
  const heatMap = new Map<string, number>()
  let heatMax = 0
  for (const c of heat) { heatMap.set(`${c.dow}-${c.hour}`, c.cnt); if (c.cnt > heatMax) heatMax = c.cnt }
  const cellColor = (cnt: number) => {
    if (!cnt) return 'var(--color-bg-3)'
    const a = 0.12 + 0.88 * (cnt / heatMax)
    return `rgba(120, 106, 215, ${a.toFixed(3)})`
  }

  const dailyMax = Math.max(1, ...daily.map(d => d.events))
  const fSteps = funnel
    ? [
        { label: 'Назначено', v: funnel.assigned },
        { label: 'Открыли', v: funnel.started },
        { label: 'Сдали', v: funnel.submitted },
        { label: 'Принято', v: funnel.completed },
      ]
    : []
  const fMax = Math.max(1, ...fSteps.map(s => s.v))
  const breakdownMax = Math.max(1, ...breakdown.map(b => b.cnt))

  return (
    <div>
      {/* Period toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--color-bg-3)', borderRadius: 12, padding: 3 }}>
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              style={{
                padding: '6px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontSize: 12.5, fontWeight: 600,
                background: days === d ? ACCENT : 'transparent',
                color: days === d ? '#fff' : 'var(--color-text-3)',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {d} дней
            </button>
          ))}
        </div>
        {loading && <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>Загрузка…</span>}
      </div>

      {err && (
        <Card style={{ marginBottom: 18, borderColor: 'rgba(224,72,72,0.4)' }}>
          <div style={{ fontSize: 13, color: '#E04848', fontWeight: 600 }}>{err}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>
            Применить <code>supabase/migrations/0011_analytics.sql</code> — после этого данные начнут собираться автоматически.
          </div>
        </Card>
      )}

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
        <Kpi icon={Activity} label="DAU" value={overview?.dau ?? '—'} sub="активны за сутки" />
        <Kpi icon={Users} label="WAU" value={overview?.wau ?? '—'} sub="за 7 дней" />
        <Kpi icon={CalendarClock} label="MAU" value={overview?.mau ?? '—'} sub="за 30 дней" />
        <Kpi icon={TrendingUp} label="Stickiness" value={overview && overview.mau ? `${Math.round((overview.dau / overview.mau) * 100)}%` : '—'} sub="DAU / MAU" />
        <Kpi icon={Layers} label="Сессии" value={overview?.sessions ?? '—'} sub={`за ${days} дн.`} />
        <Kpi icon={Activity} label="События" value={overview?.events_total ?? '—'} sub={`за ${days} дн.`} />
        <Kpi icon={Users} label="Активные ученики" value={overview ? `${overview.students_active}/${overview.students_total}` : '—'} sub="за 7 дней" />
        <Kpi icon={Layers} label="Групп" value={overview?.groups_total ?? '—'} sub="всего" />
      </div>

      {/* Heatmap */}
      <SectionTitle>Тепловая карта активности · МСК</SectionTitle>
      <Card style={{ marginBottom: 24, overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 6, paddingLeft: 30 }}>
          {Array.from({ length: 24 }).map((_, h) => (
            <div key={h} style={{ width: 18, fontSize: 8.5, color: 'var(--color-text-3)', textAlign: 'center' }}>
              {h % 3 === 0 ? h : ''}
            </div>
          ))}
        </div>
        {DOW_LABELS.map((label, di) => (
          <div key={label} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
            <div style={{ width: 24, fontSize: 10.5, color: 'var(--color-text-3)', fontWeight: 600 }}>{label}</div>
            {Array.from({ length: 24 }).map((_, h) => {
              const cnt = heatMap.get(`${DOW_PG[di]}-${h}`) ?? 0
              return (
                <div
                  key={h}
                  title={`${label} ${h}:00 — ${cnt} событий`}
                  style={{ width: 18, height: 18, borderRadius: 4, background: cellColor(cnt), flexShrink: 0 }}
                />
              )
            })}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 10.5, color: 'var(--color-text-3)' }}>
          меньше
          {[0, 0.25, 0.5, 0.75, 1].map(a => (
            <div key={a} style={{ width: 14, height: 14, borderRadius: 3, background: a === 0 ? 'var(--color-bg-3)' : `rgba(120,106,215,${0.12 + 0.88 * a})` }} />
          ))}
          больше
        </div>
      </Card>

      {/* Daily activity */}
      <SectionTitle>Активность по дням</SectionTitle>
      <Card style={{ marginBottom: 24 }}>
        {daily.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>Пока нет данных.</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120 }}>
            {daily.map(d => (
              <div
                key={d.day}
                title={`${d.day} — ${d.events} событий, ${d.users} польз.`}
                style={{ flex: 1, minWidth: 2, height: `${Math.max(2, (d.events / dailyMax) * 100)}%`, background: ACCENT, borderRadius: '3px 3px 0 0', opacity: 0.85 }}
              />
            ))}
          </div>
        )}
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Funnel */}
        <div>
          <SectionTitle>Воронка прогресса</SectionTitle>
          <Card>
            {fSteps.map((s, i) => (
              <div key={s.label} style={{ marginBottom: i < fSteps.length - 1 ? 12 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{s.label}</span>
                  <span style={{ color: 'var(--color-text-3)' }}>
                    {s.v}{i > 0 && fSteps[0].v > 0 ? ` · ${Math.round((s.v / fSteps[0].v) * 100)}%` : ''}
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: 'var(--color-bg-3)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(s.v / fMax) * 100}%` }}
                    transition={{ duration: 0.5, delay: i * 0.06 }}
                    style={{ height: '100%', borderRadius: 4, background: ACCENT }}
                  />
                </div>
              </div>
            ))}
          </Card>
        </div>

        {/* Event breakdown */}
        <div>
          <SectionTitle>Типы событий</SectionTitle>
          <Card>
            {breakdown.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>Пока нет данных.</div>
            ) : breakdown.map((b, i) => (
              <div key={b.event} style={{ marginBottom: i < breakdown.length - 1 ? 10 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: 'var(--color-text)' }}>{EVENT_LABELS[b.event] ?? b.event}</span>
                  <span style={{ color: 'var(--color-text-3)' }}>{b.cnt}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--color-bg-3)' }}>
                  <div style={{ width: `${(b.cnt / breakdownMax) * 100}%`, height: '100%', borderRadius: 3, background: ACCENT, opacity: 0.7 }} />
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  )
}
