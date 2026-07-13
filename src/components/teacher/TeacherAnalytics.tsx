import { useState, useEffect, useCallback, useRef } from 'react'
import Skeleton from '../Skeleton'
import { motion } from 'framer-motion'
import {
  Activity, Users, CalendarClock, Layers, TrendingUp,
  AlertTriangle, MousePointerClick, Clock, BookOpen, ChevronDown, ChevronUp,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useT, t as tGlobal } from '../../lib/i18n'
import { tzToCountry } from '../../lib/tzCountry'

// ── types ──────────────────────────────────────────────────────────────────
type Overview = {
  events_total: number; sessions: number
  dau: number; wau: number; mau: number
  students_total: number; students_active: number; groups_total: number
}
type HeatCell = { dow: number; hour: number; cnt: number }
type DailyRow  = { day: string; events: number; users: number }
type BreakdownRow = { event: string; cnt: number }
type Funnel    = { assigned: number; started: number; submitted: number; completed: number }
type PageStat  = { path: string; role: string; visits: number; avg_dwell_sec: number | null; errors: number; rage_clicks: number }
type ErrorRow  = { created_at: string; role: string; path: string; event: string; msg: string; src: string; line: number; session_id: string }
type RageHot   = { path: string; element: string; cnt: number }
type ClickPath = { path: string; teacher_clicks: number; student_clicks: number; total: number }
type ClickCell = { gx: number; gy: number; cnt: number }
type GeoRow = { code: string; name: string; flag: string; teachers: number; students: number; total: number }

// ── constants ──────────────────────────────────────────────────────────────
const ACCENT   = '#786AD7'
const ACCENT_S = '#2E8F76'  // student colour (deep teal)
// hex → rgba string; lets accent-tinted fills follow the selected role colour.
const withAlpha = (hex: string, a: number) => {
  const h = hex.replace('#','')
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16)
  return `rgba(${r},${g},${b},${a})`
}
const GRID_W = 48, GRID_H = 30  // must match admin_click_heatmap() in 0014
const DOW_LABELS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
const DOW_PG     = [1,2,3,4,5,6,0] // pg extract(dow): 0=Sun
const EVENT_LABELS: Record<string,string> = {
  session_start: 'Старт сессии', page_view: 'Страница', heartbeat: 'Пульс',
  page_leave: 'Уход', js_error: 'JS ошибка', promise_rejection: 'Promise rejection',
  rage_click: 'Rage-click', action: 'Действие',
}
const PATH_LABELS: Record<string,string> = {
  '#/': 'Главная (студент)', '#/teacher': 'Дашборд учителя',
  '#/teacher/homework': 'ДЗ', '#/teacher/gradebook': 'Журнал',
  '#/teacher/groups': 'Группы', '#/teacher/constructor': 'Конструктор',
  '#/teacher/admin': 'Админка',
}
function pLabel(p: string) { return tGlobal(PATH_LABELS[p] ?? p) }

// ── sub-components ─────────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 18, ...style }}>
      {children}
    </div>
  )
}

function Kpi({ icon: Icon, label, value, sub, accent, loading }: {
  icon: React.ElementType; label: string; value: string|number; sub?: string; accent?: string; loading?: boolean
}) {
  return (
    <Card style={{ padding: '14px 16px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
        <Icon size={14} strokeWidth={2} style={{ color: accent ?? 'var(--color-text-3)' }} />
        <span style={{ fontSize:11.5, color:'var(--color-text-3)', fontWeight:500 }}>{label}</span>
      </div>
      <div style={{ fontSize:24, fontWeight:800, color: accent ?? 'var(--color-text)', letterSpacing:'-0.5px', lineHeight:1, height:24, display:'flex', alignItems:'center' }}>
        {loading ? <Skeleton w={44} h={20} /> : value}
      </div>
      {sub && <div style={{ fontSize:11, color:'var(--color-text-3)', marginTop:4 }}>{sub}</div>}
    </Card>
  )
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
      <div style={{ fontSize:13, fontWeight:700, color:'var(--color-text-3)', letterSpacing:0.5, textTransform:'uppercase' }}>{children}</div>
      {action}
    </div>
  )
}

// A tab that smoothly collapses its label and splits into Учителя / Ученики
// sub-pills when active, and grows the word back when another tab is selected.
function Heatmap({ cells, color }: { cells: HeatCell[]; color: string }) {
  const t = useT()
  const heatMap = new Map<string,number>()
  let heatMax = 0
  for (const c of cells) { heatMap.set(`${c.dow}-${c.hour}`,c.cnt); if (c.cnt>heatMax) heatMax=c.cnt }

  const cellColor = (cnt: number) => {
    if (!cnt) return 'var(--color-bg-3)'
    const a = 0.12 + 0.88*(cnt/heatMax)
    // parse hex color into r,g,b
    const hex = color.replace('#','')
    const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16)
    return `rgba(${r},${g},${b},${a.toFixed(3)})`
  }

  const peakHour = (() => {
    const totals = new Map<number,number>()
    for (const c of cells) { totals.set(c.hour,(totals.get(c.hour)??0)+c.cnt) }
    let max=0, best=-1
    for (const [h,v] of totals) { if (v>max){max=v;best=h} }
    return best
  })()

  if (cells.length === 0) return (
    <div style={{ fontSize:12, color:'var(--color-text-3)', padding:'20px 0' }}>
      {t('Нет данных — данные появятся после первых посещений.')}
    </div>
  )

  return (
    <div>
      {peakHour >= 0 && (
        <div style={{ fontSize:12, color:'var(--color-text-3)', marginBottom:12 }}>
          {t('Пик активности:')} <b style={{ color:'var(--color-text)' }}>{peakHour}:00–{peakHour+1}:00 {t('МСК')}</b>
        </div>
      )}
      <div style={{ overflowX:'auto' }}>
        <div style={{ display:'flex', gap:4, marginBottom:4, paddingLeft:28 }}>
          {Array.from({length:24}).map((_,h) => (
            <div key={h} style={{ width:16, fontSize:8, color:'var(--color-text-3)', textAlign:'center', flexShrink:0 }}>
              {h%4===0 ? h : ''}
            </div>
          ))}
        </div>
        {DOW_LABELS.map((label,di) => (
          <div key={label} style={{ display:'flex', gap:4, alignItems:'center', marginBottom:3 }}>
            <div style={{ width:24, fontSize:10, color:'var(--color-text-3)', fontWeight:600 }}>{t(label)}</div>
            {Array.from({length:24}).map((_,h) => {
              const cnt = heatMap.get(`${DOW_PG[di]}-${h}`) ?? 0
              return (
                <div key={h} title={`${t(label)} ${h}:00 — ${cnt} ${t('событий')}`}
                  style={{ width:16, height:16, borderRadius:3, background:cellColor(cnt), flexShrink:0 }} />
              )
            })}
          </div>
        ))}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:10, fontSize:10, color:'var(--color-text-3)' }}>
        {t('меньше')}
        {[0,0.25,0.5,0.75,1].map(a => {
          const hex=color.replace('#',''); const r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16)
          return <div key={a} style={{ width:12, height:12, borderRadius:2, background: a===0?'var(--color-bg-3)':`rgba(${r},${g},${b},${(0.12+0.88*a).toFixed(2)})` }} />
        })}
        {t('больше')}
      </div>
    </div>
  )
}

// Per-screen reference screenshots — the Hotjar/Clarity backing plate. Keyed by
// the raw analytics_events.path; each 1100×693 (16:10) dark-theme capture lives
// in public/heatmap-shots/. Recapture from a logged-in teacher session when the
// UI changes. Paths with no entry fall back to a neutral labelled frame.
const REFERENCE_SHOTS: Record<string,string> = {
  '#/teacher':             '/heatmap-shots/home.png',
  '#/teacher/groups':      '/heatmap-shots/groups.png',
  '#/teacher/homework':    '/heatmap-shots/homework.png',
  '#/teacher/gradebook':   '/heatmap-shots/gradebook.png',
  '#/teacher/constructor': '/heatmap-shots/constructor.png',
  '#/teacher/admin':       '/heatmap-shots/admin.png',
}

// blue → cyan → green → yellow → red density ramp (industry-standard heatmap)
function heatColor(t: number): [number,number,number] {
  const stops: [number, [number,number,number]][] = [
    [0.0,[46,64,180]],[0.35,[40,182,192]],[0.55,[70,200,96]],[0.78,[240,208,58]],[1.0,[228,60,48]],
  ]
  for (let i=0;i<stops.length-1;i++) {
    const [a,ca]=stops[i], [b,cb]=stops[i+1]
    if (t<=b) { const f=(t-a)/((b-a)||1); return [ca[0]+(cb[0]-ca[0])*f, ca[1]+(cb[1]-ca[1])*f, ca[2]+(cb[2]-ca[2])*f] }
  }
  return stops[stops.length-1][1]
}

function ClickHeatmap({ cells, label, total }: { cells: ClickCell[]; label: string; total: number }) {
  const t = useT()
  const ref = useRef<HTMLCanvasElement|null>(null)
  const shot = REFERENCE_SHOTS[label] // label is the raw path key

  useEffect(() => {
    const cv = ref.current; if (!cv) return
    const CW = 720, CH = 450
    cv.width = CW; cv.height = CH
    const ctx = cv.getContext('2d'); if (!ctx) return
    ctx.clearRect(0,0,CW,CH)
    if (cells.length === 0) return
    const intensity = new Float32Array(CW*CH)
    const R = 46, twoSig2 = 2*(R/2)*(R/2)
    for (const c of cells) {
      const px = Math.round((c.gx+0.5)/GRID_W*CW)
      const py = Math.round((c.gy+0.5)/GRID_H*CH)
      for (let dy=-R; dy<=R; dy++) {
        const y=py+dy; if (y<0||y>=CH) continue
        for (let dx=-R; dx<=R; dx++) {
          const x=px+dx; if (x<0||x>=CW) continue
          intensity[y*CW+x] += c.cnt*Math.exp(-(dx*dx+dy*dy)/twoSig2)
        }
      }
    }
    let max=0; for (let i=0;i<intensity.length;i++) if (intensity[i]>max) max=intensity[i]
    if (max<=0) return
    const img = ctx.createImageData(CW,CH)
    for (let i=0;i<intensity.length;i++) {
      const t = intensity[i]/max
      if (t<0.02) continue
      const [r,g,b] = heatColor(Math.min(1,t))
      const o=i*4
      img.data[o]=r; img.data[o+1]=g; img.data[o+2]=b
      img.data[o+3]=Math.round(Math.min(0.82, 0.12+0.88*t)*255)
    }
    ctx.putImageData(img,0,0)
  }, [cells])

  return (
    <div>
      <div style={{ position:'relative', width:'100%', aspectRatio:'16 / 10', borderRadius:12,
        overflow:'hidden', border:'1px solid var(--color-border)',
        background: shot ? '#000' : 'var(--color-bg-3)' }}>
        {shot
          ? <img src={shot} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', opacity:0.55 }} />
          : (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
              flexDirection:'column', gap:6, color:'var(--color-text-3)', pointerEvents:'none' }}>
              <div style={{ fontSize:13, fontWeight:600, opacity:0.5 }}>{pLabel(label)}</div>
              <div style={{ fontSize:10.5, opacity:0.4 }}>{t('клики по нормализованным координатам экрана')}</div>
            </div>
          )}
        <canvas ref={ref} style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }} />
        {cells.length===0 && (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:12, color:'var(--color-text-3)' }}>
            {t('Нет кликов на этом экране за период')}
          </div>
        )}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:10, fontSize:10.5, color:'var(--color-text-3)' }}>
        <span>{t('реже')}</span>
        <div style={{ width:120, height:8, borderRadius:4, background:'linear-gradient(to right, rgba(46,64,180,0.5), #28b6c0, #46c860, #f0d03a, #e43c30)' }} />
        <span>{t('чаще')}</span>
        <span style={{ marginLeft:'auto' }}>{total.toLocaleString('ru-RU')} {t('кликов')}</span>
      </div>
    </div>
  )
}

// ── main component ─────────────────────────────────────────────────────────
export default function TeacherAnalytics() {
  const t = useT()
  const [days, setDays]                   = useState(30)
  const [loading, setLoading]             = useState(true)
  const [heatRole, setHeatRole]           = useState<'teacher'|'student'>('teacher')
  const [activeTab, setActiveTab]         = useState<'activity'|'issues'|'heatmap'>('activity')
  const [overviewT, setOverviewT]         = useState<Overview|null>(null)
  const [overviewS, setOverviewS]         = useState<Overview|null>(null)
  const [teacherHeat, setTeacherHeat]     = useState<HeatCell[]>([])
  const [studentHeat, setStudentHeat]     = useState<HeatCell[]>([])
  const [daily, setDaily]                 = useState<DailyRow[]>([])
  const [breakdown, setBreakdown]         = useState<BreakdownRow[]>([])
  const [funnel, setFunnel]               = useState<Funnel|null>(null)
  const [pageStats, setPageStats]         = useState<PageStat[]>([])
  const [recentErrors, setRecentErrors]   = useState<ErrorRow[]>([])
  const [rageHots, setRageHots]           = useState<RageHot[]>([])
  const [geo, setGeo]                     = useState<GeoRow[]>([])
  const [errExpanded, setErrExpanded]     = useState(false)
  const [err, setErr]                     = useState<string|null>(null)
  // spatial click heatmaps
  const [clickPaths, setClickPaths]       = useState<ClickPath[]>([])
  const [clickPath, setClickPath]         = useState<string|null>(null)
  const [clickGrid, setClickGrid]         = useState<ClickCell[]>([])
  const [clickLoading, setClickLoading]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setErr(null)
    const [ovT, ovS, th, sh, dl, bd, fn, ps, re, rh] = await Promise.all([
      supabase.rpc('admin_analytics_overview_by_role', { p_role:'teacher', p_days: days }),
      supabase.rpc('admin_analytics_overview_by_role', { p_role:'student', p_days: days }),
      supabase.rpc('admin_activity_heatmap_by_role',  { p_role:'teacher', p_days: days }),
      supabase.rpc('admin_activity_heatmap_by_role',  { p_role:'student', p_days: days }),
      supabase.rpc('admin_daily_activity',            { p_days: days }),
      supabase.rpc('admin_event_breakdown',           { p_days: days }),
      supabase.rpc('admin_progress_funnel'),
      supabase.rpc('admin_page_stats',                { p_days: days }),
      supabase.rpc('admin_recent_errors',             { p_limit: 50 }),
      supabase.rpc('admin_rage_hotspots',             { p_days: days }),
    ])
    if (ovT.error && /does not exist|forbidden/i.test(ovT.error.message ?? ''))
      setErr(t('Ошибка загрузки:') + ' ' + ovT.error.message)
    setOverviewT((ovT.data as Overview) ?? null)
    setOverviewS((ovS.data as Overview) ?? null)
    setTeacherHeat((th.data as HeatCell[]) ?? [])
    setStudentHeat((sh.data as HeatCell[]) ?? [])
    setDaily((dl.data as DailyRow[]) ?? [])
    setBreakdown((bd.data as BreakdownRow[]) ?? [])
    setFunnel((fn.data as Funnel) ?? null)
    setPageStats((ps.data as PageStat[]) ?? [])
    setRecentErrors((re.data as ErrorRow[]) ?? [])
    setRageHots((rh.data as RageHot[]) ?? [])

    // Geo breakdown by browser timezone. Each session emits one session_start
    // carrying meta.tz — we count distinct sessions per country/role.
    try {
      const since = new Date(Date.now() - days * 86_400_000).toISOString()
      const { data: geoRows } = await supabase
        .from('analytics_events')
        .select('role, session_id, meta')
        .eq('event', 'session_start')
        .gte('created_at', since)
        .limit(20_000)
      const seen = new Set<string>()
      const acc = new Map<string, GeoRow>()
      for (const r of (geoRows as { role: string; session_id: string; meta: Record<string, unknown> | null }[]) ?? []) {
        if (r.session_id) { if (seen.has(r.session_id)) continue; seen.add(r.session_id) }
        const c = tzToCountry(r.meta?.tz as string | undefined)
        const isTeacher = r.role === 'teacher' || r.role === 'admin'
        const isStudent = r.role === 'student'
        if (!isTeacher && !isStudent) continue
        const row = acc.get(c.code) ?? { code: c.code, name: c.name, flag: c.flag, teachers: 0, students: 0, total: 0 }
        if (isTeacher) row.teachers++; else row.students++
        row.total++
        acc.set(c.code, row)
      }
      setGeo([...acc.values()].sort((a, b) => b.total - a.total))
    } catch { setGeo([]) }

    setLoading(false)
  }, [days])

  useEffect(() => { void load() }, [load])

  // Screen list for the heatmap selector — auto-built from captured click paths.
  useEffect(() => {
    if (activeTab !== 'heatmap') return
    let alive = true
    void (async () => {
      const { data } = await supabase.rpc('admin_click_paths', { p_days: days })
      if (!alive) return
      const paths = (data as ClickPath[]) ?? []
      setClickPaths(paths)
      setClickPath(prev => (prev && paths.some(p => p.path === prev)) ? prev : (paths[0]?.path ?? null))
    })()
    return () => { alive = false }
  }, [activeTab, days])

  // Density grid for the selected screen + role.
  useEffect(() => {
    if (activeTab !== 'heatmap' || !clickPath) { setClickGrid([]); return }
    let alive = true
    setClickLoading(true)
    void (async () => {
      const { data } = await supabase.rpc('admin_click_heatmap', { p_path: clickPath, p_role: heatRole, p_days: days })
      if (!alive) return
      setClickGrid((data as ClickCell[]) ?? [])
      setClickLoading(false)
    })()
    return () => { alive = false }
  }, [activeTab, clickPath, heatRole, days])

  // ── derived ──────────────────────────────────────────────────────────────
  const dailyMax   = Math.max(1, ...daily.map(d => d.events))
  const fSteps     = funnel ? [
    { label:t('Назначено'), v:funnel.assigned },
    { label:t('Открыли'),   v:funnel.started  },
    { label:t('Сдали'),     v:funnel.submitted },
    { label:t('Принято'),   v:funnel.completed },
  ] : []
  const fMax       = Math.max(1, ...fSteps.map(s => s.v))
  const bdMax      = Math.max(1, ...breakdown.map(b => b.cnt))

  // issues analysis
  const totalErrors  = recentErrors.filter(e => e.event !== 'rage_click').length
  const totalRage    = recentErrors.filter(e => e.event === 'rage_click').length
  const problemPages = pageStats.filter(p => (p.errors > 0 || p.rage_clicks > 0)).slice(0,8)
  const slowPages    = [...pageStats]
    .filter(p => p.avg_dwell_sec !== null && p.avg_dwell_sec < 5 && p.visits > 1)
    .sort((a,b) => (a.avg_dwell_sec??99)-(b.avg_dwell_sec??99))
    .slice(0,5)
  const bounceRisk   = slowPages.length
  const issueScore   = totalErrors + totalRage*0.5 + bounceRisk*2

  // severity badge
  function severity(n: number): { label:string; bg:string; color:string } {
    if (n===0) return { label:'OK', bg:'rgba(63,168,103,0.15)', color:'#2a8a55' }
    if (n<3)   return { label:t('Внимание'), bg:'rgba(208,112,32,0.15)', color:'#b05a00' }
    return        { label:t('Проблема'), bg:'rgba(224,72,72,0.15)', color:'#c0282a' }
  }

  const errorSev = severity(totalErrors)
  const rageSev  = severity(totalRage)
  const bounceSev = severity(bounceRisk)

  const currentHeat = heatRole === 'teacher' ? teacherHeat : studentHeat
  const currentColor = heatRole === 'teacher' ? ACCENT : ACCENT_S
  const overview = heatRole === 'teacher' ? overviewT : overviewS

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Period + main tabs */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:4, background:'var(--color-bg-3)', borderRadius:12, padding:3 }}>
          {[7,30,90].map(d => (
            <button key={d} onClick={() => setDays(d)} style={{
              padding:'6px 14px', borderRadius:9, border:'none', cursor:'pointer',
              fontSize:12.5, fontWeight:600,
              background: days===d ? 'var(--color-purple-soft)' : 'transparent',
              color: days===d ? 'var(--color-purple)' : 'var(--color-text-3)',
              transition:'background 0.15s, color 0.15s',
            }}>{d} {t('дней')}</button>
          ))}
        </div>
        {/* Static tabs — no width/content morphing, so the bar never twitches
            when switching. The Учителя/Ученики role split lives in its own
            stable segmented control below (see next row). */}
        <div style={{ display:'flex', gap:4, marginLeft:'auto', background:'var(--color-bg-3)', borderRadius:12, padding:3 }}>
          {([['activity', t('Активность')], ['issues', t('Проблемы')], ['heatmap', t('Тепловые карты')]] as const).map(([id,label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              display:'flex', alignItems:'center', gap:7, whiteSpace:'nowrap',
              padding:'6px 14px', borderRadius:9, border:'none', cursor:'pointer',
              fontSize:12.5, fontWeight:600,
              background: activeTab===id ? 'var(--color-purple-soft)' : 'transparent',
              color: activeTab===id ? 'var(--color-purple)' : 'var(--color-text-3)',
              transition:'background 0.15s, color 0.15s',
            }}>
              {label}
              {id==='issues' && totalErrors>0 && (
                <span style={{
                  borderRadius:9, padding:'1px 7px',
                  fontSize:11.5, fontWeight:700, lineHeight:'16px',
                  background:'rgba(224,72,72,0.18)', color:'#E86A6A',
                }}>{totalErrors}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Role split for the activity & heatmap tabs — a stable segmented control
          that never reflows the tab bar above it. */}
      {activeTab !== 'issues' && (
        <div style={{ display:'flex', gap:4, background:'var(--color-bg-3)', borderRadius:12, padding:3, width:'fit-content', marginBottom:20 }}>
          {([['teacher', t('Учителя'), ACCENT], ['student', t('Ученики'), ACCENT_S]] as const).map(([id,label,color]) => (
            <button key={id} onClick={() => setHeatRole(id)} style={{
              padding:'6px 14px', borderRadius:9, border:'none', cursor:'pointer',
              fontSize:12.5, fontWeight:600,
              background: heatRole===id ? 'var(--color-bg-2)' : 'transparent',
              color: heatRole===id ? color : 'var(--color-text-3)',
              transition:'background 0.15s, color 0.15s',
            }}>{label}</button>
          ))}
        </div>
      )}

      {err && (
        <Card style={{ marginBottom:18, borderColor:'rgba(224,72,72,0.4)' }}>
          <div style={{ fontSize:13, color:'#E04848', fontWeight:600 }}>{err}</div>
        </Card>
      )}

      {/* ── TAB: ACTIVITY ── */}
      {activeTab === 'activity' && (
        <>
          {/* KPI grid — accented by the selected role */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:24 }}>
            <Kpi icon={Activity}      label="DAU"              accent={currentColor} loading={loading} value={overview?.dau ?? '—'}      sub={t('активны за сутки')} />
            <Kpi icon={Users}         label="WAU"              accent={currentColor} loading={loading} value={overview?.wau ?? '—'}      sub={t('за 7 дней')} />
            <Kpi icon={CalendarClock} label="MAU"              accent={currentColor} loading={loading} value={overview?.mau ?? '—'}      sub={t('за 30 дней')} />
            <Kpi icon={TrendingUp}    label="Stickiness"       accent={currentColor} loading={loading}
              value={overview && overview.mau ? `${Math.round((overview.dau/overview.mau)*100)}%` : '—'}
              sub="DAU / MAU" />
            <Kpi icon={Layers}        label={t('Сессии')}           accent={currentColor} loading={loading} value={overview?.sessions ?? '—'} sub={`${t('за')} ${days} ${t('дн.')}`} />
            <Kpi icon={Activity}      label={t('События')}          accent={currentColor} loading={loading} value={overview?.events_total ?? '—'} sub={`${t('за')} ${days} ${t('дн.')}`} />
            <Kpi icon={Users}         label={t('Активные ученики')} accent={currentColor} loading={loading}
              value={overview ? `${overview.students_active}/${overview.students_total}` : '—'}
              sub={t('за 7 дней')} />
            <Kpi icon={BookOpen}      label={t('Групп')}            accent={currentColor} loading={loading} value={overview?.groups_total ?? '—'} sub={t('всего')} />
          </div>

          {/* Role heatmaps — role is chosen via the Учителя/Ученики control above */}
          <SectionTitle>
            {(heatRole==='teacher' ? t('Учителя') : t('Ученики'))} · {t('Тепловая карта активности · МСК')}
          </SectionTitle>
          <Card style={{ marginBottom:24 }}>
            <Heatmap cells={currentHeat} color={currentColor} />
          </Card>

          {/* Summary for the selected role only */}
          <div style={{ marginBottom:24 }}>
            <Card>
              <div style={{ fontSize:12, fontWeight:700, color:currentColor, marginBottom:10 }}>
                {heatRole==='teacher' ? t('Учителя') : t('Ученики')}
              </div>
              <div style={{ fontSize:11, color:'var(--color-text-3)', lineHeight:1.7 }}>
                {currentHeat.length === 0
                  ? (heatRole==='teacher' ? t('Нет данных') : t('Нет данных — ученики ещё не заходили'))
                  : (() => {
                      const totH = new Map<number,number>()
                      for (const c of currentHeat) totH.set(c.hour,(totH.get(c.hour)??0)+c.cnt)
                      let max=0,best=-1; for (const [h,v] of totH) { if(v>max){max=v;best=h} }
                      const totD = new Map<number,number>()
                      for (const c of currentHeat) totD.set(c.dow,(totD.get(c.dow)??0)+c.cnt)
                      let dmax=0,dbest=-1; for (const [d,v] of totD) { if(v>dmax){dmax=v;dbest=d} }
                      const dNames = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб']
                      return <>
                        <div>{t('Пик часа:')} <b style={{color:'var(--color-text)'}}>{best}:00–{best+1}:00</b></div>
                        <div>{t('Пик дня:')} <b style={{color:'var(--color-text)'}}>{t(dNames[dbest])}</b></div>
                        <div>{t('Всего событий:')} <b style={{color:'var(--color-text)'}}>{currentHeat.reduce((a,c)=>a+c.cnt,0)}</b></div>
                      </>
                    })()
                }
              </div>
            </Card>
          </div>

          {/* Daily bars */}
          <SectionTitle>{t('Активность по дням')}</SectionTitle>
          <Card style={{ marginBottom:24 }}>
            {daily.length === 0
              ? <div style={{ fontSize:12, color:'var(--color-text-3)' }}>{t('Данные появятся после первых посещений.')}</div>
              : <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:100 }}>
                  {daily.map(d => (
                    <div key={d.day} title={`${d.day} — ${d.events} ${t('событий')}, ${d.users} ${t('польз.')}`}
                      style={{ flex:1, minWidth:2, height:`${Math.max(2,(d.events/dailyMax)*100)}%`, background:currentColor, borderRadius:'3px 3px 0 0', opacity:0.8 }} />
                  ))}
                </div>
            }
          </Card>

          {/* Funnel + Breakdown */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div>
              <SectionTitle>{t('Воронка прогресса')}</SectionTitle>
              <Card>
                {fSteps.map((s,i) => (
                  <div key={s.label} style={{ marginBottom:i<fSteps.length-1?12:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                      <span style={{ color:'var(--color-text)', fontWeight:600 }}>{s.label}</span>
                      <span style={{ color:'var(--color-text-3)' }}>
                        {s.v}{i>0 && fSteps[0].v>0 ? ` · ${Math.round((s.v/fSteps[0].v)*100)}%` : ''}
                      </span>
                    </div>
                    <div style={{ height:8, borderRadius:4, background:'var(--color-bg-3)' }}>
                      <motion.div initial={{width:0}} animate={{width:`${(s.v/fMax)*100}%`}}
                        transition={{duration:0.5,delay:i*0.06}}
                        style={{ height:'100%', borderRadius:4, background:currentColor }} />
                    </div>
                  </div>
                ))}
              </Card>
            </div>
            <div>
              <SectionTitle>{t('Типы событий')}</SectionTitle>
              <Card>
                {breakdown.length===0
                  ? <div style={{ fontSize:12, color:'var(--color-text-3)' }}>{t('Нет данных.')}</div>
                  : breakdown.map((b,i) => (
                      <div key={b.event} style={{ marginBottom:i<breakdown.length-1?10:0 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                          <span style={{ color:'var(--color-text)' }}>{t(EVENT_LABELS[b.event] ?? b.event)}</span>
                          <span style={{ color:'var(--color-text-3)' }}>{b.cnt}</span>
                        </div>
                        <div style={{ height:6, borderRadius:3, background:'var(--color-bg-3)' }}>
                          <div style={{ width:`${(b.cnt/bdMax)*100}%`, height:'100%', borderRadius:3,
                            background: b.event.includes('error')||b.event.includes('rejection') ? '#E04848'
                              : b.event==='rage_click' ? '#D07020' : currentColor, opacity:0.75 }} />
                        </div>
                      </div>
                    ))
                }
              </Card>
            </div>
          </div>

          {/* Geography by browser timezone */}
          <SectionTitle>{t('География (по таймзоне браузера)')}</SectionTitle>
          <Card style={{ marginBottom:24 }}>
            {loading
              ? <Skeleton w={200} h={16} />
              : geo.length===0
              ? <div style={{ fontSize:12, color:'var(--color-text-3)' }}>{t('Нет данных — определяется по часовому поясу браузера при старте сессии.')}</div>
              : (
                <>
                  <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr 1fr 1fr', fontSize:11, color:'var(--color-text-3)', fontWeight:600, textTransform:'uppercase', letterSpacing:0.4, paddingBottom:8, borderBottom:'1px solid var(--color-border)' }}>
                    <span>{t('Страна')}</span>
                    <span style={{ textAlign:'right', color:ACCENT }}>{t('Учителя')}</span>
                    <span style={{ textAlign:'right', color:ACCENT_S }}>{t('Ученики')}</span>
                    <span style={{ textAlign:'right' }}>{t('Всего')}</span>
                  </div>
                  {geo.map((g,i) => (
                    <div key={g.code} style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr 1fr 1fr', alignItems:'center', fontSize:13, padding:'9px 0', borderBottom:i<geo.length-1?'1px solid var(--color-border)':'none' }}>
                      <span style={{ color:'var(--color-text)', display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:16 }}>{g.flag}</span>{t(g.name)}
                      </span>
                      <span style={{ textAlign:'right', color:'var(--color-text-2)' }}>{g.teachers || '—'}</span>
                      <span style={{ textAlign:'right', color:'var(--color-text-2)' }}>{g.students || '—'}</span>
                      <span style={{ textAlign:'right', color:'var(--color-text)', fontWeight:700 }}>{g.total}</span>
                    </div>
                  ))}
                  <div style={{ fontSize:10.5, color:'var(--color-text-3)', marginTop:10 }}>
                    {t('Приблизительно: таймзона — грубый гео-прокси, не GeoIP. Счёт по сессиям.')}
                  </div>
                </>
              )}
          </Card>
        </>
      )}

      {/* ── TAB: ISSUES ── */}
      {activeTab === 'issues' && (
        <>
          {/* Health overview */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:24 }}>
            <Kpi icon={AlertTriangle} label={t('JS ошибок')}
              value={totalErrors}
              sub={totalErrors===0 ? t('Всё чисто') : t('за выбранный период')}
              accent={totalErrors>0 ? '#E04848' : undefined} />
            <Kpi icon={MousePointerClick} label={t('Rage-клики')}
              value={totalRage}
              sub={totalRage===0 ? t('Пользователи не злятся') : t('места путаницы')}
              accent={totalRage>2 ? '#D07020' : undefined} />
            <Kpi icon={Clock} label={t('Bounce-риск')}
              value={bounceRisk}
              sub={bounceRisk===0 ? t('Страниц с коротким dwell нет') : t('страниц с dwell<5с')}
              accent={bounceRisk>0 ? '#D07020' : undefined} />
          </div>

          {/* Issue score */}
          <Card style={{ marginBottom:24, display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ fontSize:36, fontWeight:900, color: issueScore===0?'#3FA867':issueScore<5?'#D07020':'#E04848', lineHeight:1 }}>
              {issueScore===0 ? '✓' : Math.round(issueScore)}
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--color-text)' }}>
                {issueScore===0 ? t('Платформа работает без видимых проблем') : issueScore<5 ? t('Есть незначительные сигналы') : t('Требует внимания')}
              </div>
              <div style={{ fontSize:12, color:'var(--color-text-3)', marginTop:2 }}>
                {t('Комбинированный индекс: ошибки × 1 + rage × 0.5 + bounce-страницы × 2')}
              </div>
            </div>
          </Card>

          {/* Problem pages */}
          <SectionTitle>{t('Страницы с проблемами')}</SectionTitle>
          <Card style={{ marginBottom:24 }}>
            {problemPages.length===0
              ? <div style={{ fontSize:12, color:'var(--color-text-3)' }}>{t('Проблемных страниц не найдено.')}</div>
              : (
                <div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px 80px 80px', gap:8,
                    fontSize:11, color:'var(--color-text-3)', fontWeight:600, paddingBottom:8,
                    borderBottom:'1px solid var(--color-border)', marginBottom:8 }}>
                    <span>{t('Страница / роль')}</span><span style={{textAlign:'center'}}>{t('Визитов')}</span>
                    <span style={{textAlign:'center'}}>Dwell</span>
                    <span style={{textAlign:'center', color:'#E04848'}}>{t('Ошибки')}</span>
                    <span style={{textAlign:'center', color:'#D07020'}}>Rage</span>
                  </div>
                  {problemPages.map((p,i) => (
                    <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px 80px 80px', gap:8,
                      fontSize:12, padding:'6px 0', borderBottom: i<problemPages.length-1 ? '1px solid var(--color-border)':undefined,
                      alignItems:'center' }}>
                      <div>
                        <div style={{ color:'var(--color-text)', fontWeight:500 }}>{pLabel(p.path)}</div>
                        <div style={{ fontSize:10, color:'var(--color-text-3)' }}>{p.role}</div>
                      </div>
                      <div style={{ textAlign:'center', color:'var(--color-text-3)' }}>{p.visits}</div>
                      <div style={{ textAlign:'center', color: p.avg_dwell_sec!==null && p.avg_dwell_sec<5?'#D07020':'var(--color-text-3)' }}>
                        {p.avg_dwell_sec!==null ? `${p.avg_dwell_sec}${t('с')}` : '—'}
                      </div>
                      <div style={{ textAlign:'center', color:p.errors>0?'#E04848':'var(--color-text-3)', fontWeight:p.errors>0?700:400 }}>{p.errors||'—'}</div>
                      <div style={{ textAlign:'center', color:p.rage_clicks>0?'#D07020':'var(--color-text-3)', fontWeight:p.rage_clicks>0?700:400 }}>{p.rage_clicks||'—'}</div>
                    </div>
                  ))}
                </div>
              )
            }
          </Card>

          {/* Bounce / short dwell */}
          {slowPages.length > 0 && (
            <>
              <SectionTitle>{t('Страницы с коротким временем (bounce-риск)')}</SectionTitle>
              <Card style={{ marginBottom:24 }}>
                <div style={{ fontSize:12, color:'var(--color-text-3)', marginBottom:10 }}>
                  {t('Среднее время до ухода <5 с — возможно пользователи не находят нужное или получают ошибку.')}
                </div>
                {slowPages.map((p,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0',
                    borderBottom:i<slowPages.length-1?'1px solid var(--color-border)':undefined, fontSize:12 }}>
                    <Clock size={12} style={{ color:'#D07020', flexShrink:0 }} />
                    <div style={{ flex:1, color:'var(--color-text)' }}>{pLabel(p.path)}</div>
                    <div style={{ color:'var(--color-text-3)', fontSize:11 }}>{p.role}</div>
                    <div style={{ fontWeight:700, color:'#D07020', minWidth:40, textAlign:'right' }}>{p.avg_dwell_sec}{t('с')}</div>
                  </div>
                ))}
              </Card>
            </>
          )}

          {/* Rage hotspots */}
          {rageHots.length > 0 && (
            <>
              <SectionTitle>{t('Rage-click точки (где кликают в злости)')}</SectionTitle>
              <Card style={{ marginBottom:24 }}>
                <div style={{ fontSize:12, color:'var(--color-text-3)', marginBottom:10 }}>
                  {t('Многократные быстрые клики — признак нерабочего элемента или непонятного UX.')}
                </div>
                {rageHots.slice(0,8).map((r,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0',
                    borderBottom:i<Math.min(7,rageHots.length-1)?'1px solid var(--color-border)':undefined, fontSize:12 }}>
                    <MousePointerClick size={12} style={{ color:'#D07020', flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <div style={{ color:'var(--color-text)', fontWeight:500 }}>{r.element}</div>
                      <div style={{ fontSize:10, color:'var(--color-text-3)' }}>{pLabel(r.path)}</div>
                    </div>
                    <div style={{ fontWeight:700, color:'#D07020' }}>{r.cnt}×</div>
                  </div>
                ))}
              </Card>
            </>
          )}

          {/* Error log */}
          <SectionTitle action={
            <button onClick={() => setErrExpanded(e=>!e)} style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'var(--color-text-3)', background:'none', border:'none', cursor:'pointer' }}>
              {errExpanded ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
              {errExpanded ? t('Свернуть') : t('Все ошибки')}
            </button>
          }>
            {t('Лог ошибок (последние)')}
          </SectionTitle>
          <Card>
            {recentErrors.length===0
              ? <div style={{ fontSize:12, color:'var(--color-text-3)' }}>{t('Ошибок нет — отлично!')}</div>
              : (recentErrors.slice(0, errExpanded ? 50 : 8)).map((e,i) => {
                  const isError = e.event !== 'rage_click'
                  const color = isError ? '#E04848' : '#D07020'
                  const evLabel = t(EVENT_LABELS[e.event] ?? e.event)
                  return (
                    <div key={i} style={{ padding:'8px 0', borderBottom:i<recentErrors.length-1?'1px solid var(--color-border)':undefined, fontSize:11, lineHeight:1.5 }}>
                      <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                        <span style={{ background: isError?'rgba(224,72,72,0.12)':'rgba(208,112,32,0.12)',
                          color, fontSize:10, fontWeight:600, padding:'2px 6px', borderRadius:5, flexShrink:0, marginTop:1 }}>
                          {evLabel}
                        </span>
                        <div style={{ flex:1 }}>
                          <span style={{ color:'var(--color-text)', fontWeight:500 }}>{e.msg || '—'}</span>
                          {e.src && <span style={{ color:'var(--color-text-3)', marginLeft:6 }}>{e.src}{e.line?`:${e.line}`:''}</span>}
                        </div>
                        <div style={{ flexShrink:0, color:'var(--color-text-3)', fontSize:10 }}>
                          {e.role} · {e.path ? pLabel(e.path) : '—'}
                        </div>
                      </div>
                      <div style={{ color:'var(--color-text-3)', marginTop:2, marginLeft:4 }}>
                        {new Date(e.created_at).toLocaleString('ru-RU')}
                      </div>
                    </div>
                  )
                })
            }
          </Card>
        </>
      )}

      {/* ── TAB: HEATMAP (spatial click maps per screen) ── */}
      {activeTab === 'heatmap' && (
        <>
          {/* Role is chosen via the Учителя/Ученики control above */}
          <SectionTitle>
            {(heatRole==='teacher' ? t('Учителя') : t('Ученики'))} · {t('Тепловые карты кликов · по экранам')}
          </SectionTitle>

          {/* Screen selector — auto-built from captured click paths */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:16 }}>
            {clickPaths.length === 0
              ? <div style={{ fontSize:12, color:'var(--color-text-3)' }}>
                  {t('Нет данных о кликах за период. Данные начнут собираться после обновления — каждый клик записывает нормализованные координаты по экрану.')}
                </div>
              : clickPaths.map(p => {
                  const active = p.path === clickPath
                  const roleCnt = heatRole === 'teacher' ? p.teacher_clicks : p.student_clicks
                  return (
                    <button key={p.path} onClick={() => setClickPath(p.path)} style={{
                      display:'flex', alignItems:'center', gap:7, padding:'7px 12px', borderRadius:10,
                      border:'1px solid', borderColor: active ? currentColor : 'var(--color-border)',
                      background: active ? withAlpha(currentColor,0.12) : 'var(--color-bg-2)',
                      color: active ? 'var(--color-text)' : 'var(--color-text-3)',
                      fontSize:12, fontWeight:600, cursor:'pointer', transition:'border-color .15s, background .15s',
                    }}>
                      {pLabel(p.path)}
                      <span style={{ fontSize:10.5, fontWeight:500, color:'var(--color-text-3)',
                        background:'var(--color-bg-3)', borderRadius:7, padding:'1px 6px' }}>{roleCnt}</span>
                    </button>
                  )
                })
            }
          </div>

          {clickPath && (
            <Card style={{ marginBottom:24 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--color-text)' }}>{pLabel(clickPath)}</div>
                <div style={{ fontSize:11, color:'var(--color-text-3)' }}>
                  {clickLoading ? t('Загрузка…') : `${heatRole==='teacher'?t('Учителя'):t('Ученики')} · ${days} ${t('дней')}`}
                </div>
              </div>
              <ClickHeatmap
                cells={clickGrid}
                label={clickPath}
                total={clickGrid.reduce((a,c)=>a+c.cnt,0)}
              />
              <div style={{ fontSize:11, color:'var(--color-text-3)', marginTop:12, lineHeight:1.6 }}>
                {t('Пятна показывают, куда чаще всего кликают на этом экране. Красное — горячие зоны, синее — редкие. Помогает тестировщикам и админу видеть, что реально жмут, а что игнорят.')}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
